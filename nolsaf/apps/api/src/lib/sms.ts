/**
 * Send SMS notification
 * Integrate with your SMS provider (e.g., Twilio, Africa's Talking, etc.)
 */
export async function sendSms(to: string, text: string) {
  try {
    // Remove any non-digit characters except +
    const phone = to.replace(/[^\d+]/g, '');
    
    // Ensure phone starts with country code (Tanzania: +255)
    const normalizedPhone = phone.startsWith('+') ? phone : 
                           phone.startsWith('255') ? `+${phone}` : 
                           `+255${phone}`;

    // Track last error so we can return something useful
    let lastError: string | null = null;

    async function readJsonOrText(response: Response): Promise<{ json: any | null; text: string } > {
      const contentType = response.headers.get('content-type') || '';
      const raw = await response.text();
      if (contentType.toLowerCase().includes('application/json')) {
        try {
          return { json: raw ? JSON.parse(raw) : null, text: raw };
        } catch {
          return { json: null, text: raw };
        }
      }
      // Some providers return text/plain even on errors
      try {
        return { json: raw ? JSON.parse(raw) : null, text: raw };
      } catch {
        return { json: null, text: raw };
      }
    }

    // Check if SMS provider is configured
    // Priority: Africa's Talking (for East Africa) > Twilio > Generic API > Console
    const smsProvider = process.env.SMS_PROVIDER || 
                       (process.env.AFRICASTALKING_API_KEY ? 'africastalking' : 'console');
    const smsApiKey = process.env.SMS_API_KEY;
    const smsApiUrl = process.env.SMS_API_URL;

    // Africa's Talking integration (preferred for Tanzania/East Africa)
    if (smsProvider === 'africastalking' || process.env.AFRICASTALKING_API_KEY) {
      const username = process.env.AFRICASTALKING_USERNAME;
      const apiKey = process.env.AFRICASTALKING_API_KEY;
      const fromNumber = process.env.AFRICASTALKING_SENDER_ID || 'NoLSAF';

      if (username && apiKey) {
        try {
          const response = await fetch(
            'https://api.africastalking.com/version1/messaging',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'apiKey': apiKey,
              },
              body: new URLSearchParams({
                username: username,
                to: normalizedPhone,
                message: text,
                from: fromNumber,
              }),
            }
          );

          const { json, text: rawText } = await readJsonOrText(response);
          const data = json;
          if (!response.ok) {
            const msg =
              data?.errorMessage ||
              data?.message ||
              (rawText ? String(rawText).slice(0, 300) : '') ||
              response.statusText ||
              'Unknown error';
            throw new Error(`Africa's Talking error: ${msg}`);
          }

          return { 
            success: true, 
            messageId: data.SMSMessageData?.Recipients?.[0]?.messageId || 'unknown',
            provider: 'africastalking'
          };
        } catch (error: any) {
          lastError = error?.message || 'Africa\'s Talking failed';
          console.error('[SMS] Africa\'s Talking failed:', lastError);
          // Fall through to next provider
        }
      }
    }

    // Twilio integration (fallback)
    if (smsProvider === 'twilio') {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        console.warn('[SMS] Twilio not fully configured, logging instead');
        console.log(`[SMS] -> ${normalizedPhone}: ${text}`);
        return { success: true, messageId: `log-${Date.now()}` };
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
          body: new URLSearchParams({
            From: fromNumber,
            To: normalizedPhone,
            Body: text,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`Twilio error: ${data.message || 'Unknown error'}`);
      }

      return { success: true, messageId: data.sid, provider: 'twilio' };
    }

    // Generic HTTP API integration
    if (smsApiUrl) {
      // Avoid noisy failures when a placeholder is accidentally configured.
      const isPlaceholderUrl = /your-sms-api\.com|example\.com/i.test(String(smsApiUrl));
      if (isPlaceholderUrl && process.env.NODE_ENV !== 'production') {
        lastError = `SMS_API_URL is set to a placeholder (${smsApiUrl}); using console SMS in non-production.`;
      } else {
      const response = await fetch(smsApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${smsApiKey}`,
        },
        body: JSON.stringify({
          to: normalizedPhone,
          message: text,
        }),
      });

      if (!response.ok) {
        const { text: rawText } = await readJsonOrText(response);
        throw new Error(`SMS API error: ${rawText ? String(rawText).slice(0, 300) : response.statusText}`);
      }

      const { json } = await readJsonOrText(response);
      const data = json || {};
      return { success: true, messageId: data.messageId || data.id || 'unknown', provider: 'generic' };
      }
    }

    // Fallback: log (non-production)
    if (process.env.NODE_ENV !== 'production') {
      if (lastError) console.warn('[SMS] Falling back to console SMS:', lastError);
      console.log(`[SMS] -> ${normalizedPhone}: ${text}`);
      return { success: true, messageId: `log-${Date.now()}`, provider: 'console' };
    }

    // Production mode without provider: return error
    return { success: false, error: lastError || 'No SMS provider configured' };
  } catch (error: any) {
    const msg = error?.message || 'Failed to send SMS';
    console.error('[SMS] Failed to send SMS:', msg);
    // In non-production, don't break flows (OTP/payment) because of SMS provider config.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[SMS] Using console SMS in non-production due to provider failure.');
      console.log(`[SMS] -> ${to}: ${text}`);
      return { success: true, messageId: `log-${Date.now()}`, provider: 'console' };
    }
    return { success: false, error: msg };
  }
}
