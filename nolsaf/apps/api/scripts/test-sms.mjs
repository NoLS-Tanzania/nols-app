/**
 * Africa's Talking SMS test
 *
 * Usage:
 *   node scripts/test-sms.mjs +255712345678 "Hello from NoLSAF"
 *
 * Requires these env vars (or a .env file at the project root):
 *   AFRICASTALKING_USERNAME=<your AT account username>
 *   AFRICASTALKING_API_KEY=<your AT API key>
 *   AFRICASTALKING_SENDER_ID=NoLSAF   (optional; must be approved/registered in live mode)
 *
 * Note: with live credentials this sends real SMS (may incur costs).
 */

import { createRequire } from 'module';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);

// ── Load .env — try api-level first, then repo root ────────────────────────
const envPath =
  existsSync(resolve(__dirname, '..', '.env'))
    ? resolve(__dirname, '..', '.env')
    : resolve(__dirname, '../../..', '.env');

if (existsSync(envPath)) {
  const dotenv = _require('dotenv');
  dotenv.config({ path: envPath });
  console.log('[test-sms] Loaded .env from', envPath);
}

// ── Validate args ───────────────────────────────────────────────────────────
const rawArgs = process.argv.slice(2);
const flags = new Set(rawArgs.filter((a) => a.startsWith('--')));
const args = rawArgs.filter((a) => !a.startsWith('--'));
const [toArg, ...msgParts] = args;

if (!toArg) {
  console.error('Usage: node scripts/test-sms.mjs <phone> [message] [--dry-run] [--no-from]');
  console.error('  e.g: node scripts/test-sms.mjs +255712345678 "Hello!"');
  process.exit(1);
}

const dryRun = flags.has('--dry-run');
const noFrom = flags.has('--no-from');

// Keep default message plain ASCII to avoid encoding surprises.
const message = msgParts.join(' ') || 'Test SMS from NoLSAF powered by Africa\'s Talking';

// ── Validate env ────────────────────────────────────────────────────────────
const username = process.env.AFRICASTALKING_USERNAME;
const apiKey   = process.env.AFRICASTALKING_API_KEY;
const senderId = process.env.AFRICASTALKING_SENDER_ID;

if (!username || !apiKey) {
  console.error('❌  Missing env vars. Set AFRICASTALKING_USERNAME and AFRICASTALKING_API_KEY.');
  process.exit(1);
}

console.log(`\n📱 Africa's Talking SMS Test`);
console.log(`   Username : ${username}`);
console.log(`   Sender ID: ${senderId || '(default shortcode)'}`);
console.log(`   To       : ${toArg}`);
console.log(`   Message  : ${message}\n`);

// ── Send ────────────────────────────────────────────────────────────────────
const AfricasTalking = _require('africastalking');
const at  = AfricasTalking({ username, apiKey });
const sms = at.SMS;

const opts = { to: [toArg], message };
if (!noFrom && senderId) opts.from = senderId;

if (dryRun) {
  console.log('[test-sms] DRY RUN — not sending. Payload:');
  console.log(JSON.stringify(opts, null, 2));
  process.exit(0);
}

try {
  const result = await sms.send(opts);
  const recipients = result?.SMSMessageData?.Recipients ?? [];
  const first = recipients[0];

  if (first && (first.statusCode === 101 || first.status === 'Success')) {
    console.log('✅  SMS queued successfully!');
    console.log(`   Message ID : ${first.messageId}`);
    console.log(`   Cost       : ${first.cost}`);
  } else {
    console.error('❌  AT returned unexpected response:');
    console.error(JSON.stringify(result, null, 2));
  }
} catch (err) {
  console.error('❌  Error:', err?.message ?? err);
  process.exit(1);
}
