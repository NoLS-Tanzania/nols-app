/**
 * SMS service — Africa's Talking (primary) → Twilio (fallback) → console (dev)
 *
 * Required env vars for Africa's Talking:
 *   AFRICASTALKING_USERNAME   — your AT username (use "sandbox" for testing)
 *   AFRICASTALKING_API_KEY    — your AT API key (from africastalking.com dashboard)
 *   AFRICASTALKING_SENDER_ID  — (optional) shortcode / alphanumeric sender, e.g. "NoLSAF"
 *
 * Optional Twilio fallback:
 *   TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER
 */

import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

// ─── Types ────────────────────────────────────────────────────────────────────
interface ATRecipient {
  statusCode: number;
  number: string;
  status: string;
  messageId?: string;
  cost?: string;
}
interface ATSendResponse {
  SMSMessageData: { Message: string; Recipients: ATRecipient[] };
}
export interface SmsResult {
  success: boolean;
  messageId?: string;
  provider?: string;
  error?: string;
}

// ─── Phone normalisation ──────────────────────────────────────────────────────
function normaliseTo255(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+'))   return digits;
  if (digits.startsWith('255')) return `+${digits}`;
  return `+255${digits}`;
}

// ─── Africa's Talking ─────────────────────────────────────────────────────────
async function sendViaAfricasTalking(to: string, message: string): Promise<SmsResult> {
  const username = process.env.AFRICASTALKING_USERNAME;
  const apiKey   = process.env.AFRICASTALKING_API_KEY;
  const senderId = process.env.AFRICASTALKING_SENDER_ID; // optional

  if (!username || !apiKey) {
    return { success: false, error: 'Africa\'s Talking credentials missing (AFRICASTALKING_USERNAME / AFRICASTALKING_API_KEY)' };
  }

  // The package is CommonJS — use createRequire for ESM interop
  const AfricasTalking = _require('africastalking') as
    (cfg: { username: string; apiKey: string }) => {
      SMS: { send(opts: { to: string[]; message: string; from?: string }): Promise<ATSendResponse> };
    };

  const at  = AfricasTalking({ username, apiKey });
  const sms = at.SMS;

  const opts: { to: string[]; message: string; from?: string } = { to: [to], message };
  if (senderId) opts.from = senderId;

  const result = await sms.send(opts);
  const first  = result?.SMSMessageData?.Recipients?.[0];

  // AT returns statusCode 101 for a queued/accepted message
  if (first && (first.statusCode === 101 || first.status === 'Success')) {
    return { success: true, messageId: first.messageId ?? 'unknown', provider: 'africastalking' };
  }

  throw new Error(`Africa's Talking rejected: ${first?.status ?? result?.SMSMessageData?.Message ?? 'unknown error'}`);
}

// ─── Twilio (optional fallback) ───────────────────────────────────────────────
async function sendViaTwilio(to: string, message: string): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;
  const from       = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    return { success: false, error: 'Twilio credentials not set' };
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: new URLSearchParams({ From: from, To: to, Body: message }),
    },
  );

  const data = await response.json() as { sid?: string; message?: string };
  if (!response.ok) throw new Error(`Twilio error: ${data.message ?? response.statusText}`);
  return { success: true, messageId: data.sid, provider: 'twilio' };
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Send an SMS.  Priority chain:
 *   1. Africa's Talking  (set AFRICASTALKING_API_KEY)
 *   2. Twilio            (set TWILIO_ACCOUNT_SID)
 *   3. Console log       (dev / staging only — never blocks OTP flows)
 */
export async function sendSms(to: string, text: string): Promise<SmsResult> {
  const phone = normaliseTo255(to);

  // 1 — Africa's Talking
  if (process.env.AFRICASTALKING_API_KEY) {
    try {
      const r = await sendViaAfricasTalking(phone, text);
      if (r.success) {
        console.log(`[SMS] Sent via Africa's Talking → ${phone}`);
        return r;
      }
      console.warn('[SMS] Africa\'s Talking returned failure:', r.error);
    } catch (err: any) {
      console.error('[SMS] Africa\'s Talking threw:', err?.message ?? err);
    }
  }

  // 2 — Twilio
  if (process.env.TWILIO_ACCOUNT_SID) {
    try {
      const r = await sendViaTwilio(phone, text);
      if (r.success) {
        console.log(`[SMS] Sent via Twilio → ${phone}`);
        return r;
      }
    } catch (err: any) {
      console.error('[SMS] Twilio threw:', err?.message ?? err);
    }
  }

  // 3 — Dev console fallback
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SMS DEV] → ${phone}: ${text}`);
    return { success: true, messageId: `dev-${Date.now()}`, provider: 'console' };
  }

  return { success: false, error: 'No SMS provider delivered the message' };
}
