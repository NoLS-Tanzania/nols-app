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

          const data = await response.json();
          if (!response.ok) {
            throw new Error(`Africa's Talking error: ${data.errorMessage || data.message || 'Unknown error'}`);
          }

          return { 
            success: true, 
            messageId: data.SMSMessageData?.Recipients?.[0]?.messageId || 'unknown',
            provider: 'africastalking'
          };
        } catch (error: any) {
          console.error('[SMS] Africa\'s Talking failed:', error.message);
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
        throw new Error(`SMS API error: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, messageId: data.messageId || data.id || 'unknown', provider: 'generic' };
    }

    // Fallback: log (development mode)
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[SMS] -> ${normalizedPhone}: ${text}`);
      return { success: true, messageId: `log-${Date.now()}`, provider: 'console' };
    }

    // Production mode without provider: return error
    return { success: false, error: 'No SMS provider configured' };
  } catch (error: any) {
    console.error('[SMS] Failed to send SMS:', error);
    // Don't throw - SMS failure shouldn't break the payment flow
    return { success: false, error: error.message };
  }
}
