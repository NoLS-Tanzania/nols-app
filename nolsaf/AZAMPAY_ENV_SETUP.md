# AzamPay Environment Variables Setup Guide

This guide will help you configure all the necessary environment variables for AzamPay payment integration.

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your AzamPay credentials** (see below for where to find them)

3. **Configure your SMS provider** (optional, for payment confirmations)

4. **Set up webhook URL** in AzamPay dashboard

## Where to Find AzamPay Credentials

### Step 1: Log into AzamPay Merchant Dashboard
- Go to: https://merchant.azampay.co.tz
- Log in with your merchant account credentials

### Step 2: Get API Credentials
1. Navigate to **Settings** → **API Credentials** or **API Keys**
2. You'll find:
   - **API Key** (Public Key) → `AZAMPAY_API_KEY`
   - **Client ID** → `AZAMPAY_CLIENT_ID`
   - **Client Secret** (Private Key) → `AZAMPAY_CLIENT_SECRET`

### Step 3: Get Webhook Secret
1. Navigate to **Settings** → **Webhooks**
2. Create a webhook endpoint (see Webhook Setup below)
3. Copy the **Webhook Secret** → `AZAMPAY_WEBHOOK_SECRET`

## Environment Variables Explained

### Required AzamPay Variables

```bash
# Base API URL (usually doesn't change)
AZAMPAY_API_URL=https://api.azampay.co.tz

# Your public API key (safe to expose in frontend if needed)
AZAMPAY_API_KEY=ak_live_xxxxxxxxxxxxxxxxxxxxx

# Your client ID (identifies your merchant account)
AZAMPAY_CLIENT_ID=client_xxxxxxxxxxxxxxxxxxxxx

# Your client secret (KEEP SECRET - never expose!)
AZAMPAY_CLIENT_SECRET=sk_live_xxxxxxxxxxxxxxxxxxxxx

# Webhook secret for verifying webhook signatures
AZAMPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
```

### SMS Configuration (Optional but Recommended)

Choose one SMS provider:

#### Option 1: Console (Development - Logs Only)
```bash
SMS_PROVIDER=console
# No additional configuration needed
```

#### Option 2: Twilio
```bash
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+255123456789
```

#### Option 3: Africa's Talking
```bash
SMS_PROVIDER=africastalking
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_API_KEY=your_api_key_here
AFRICASTALKING_SENDER_ID=NoLSAF
```

#### Option 4: Custom SMS Provider
```bash
SMS_PROVIDER=custom
SMS_API_KEY=your_custom_api_key
SMS_API_URL=https://your-sms-api.com/send
```

## Webhook Setup

### For Local Development

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   # or download from https://ngrok.com/
   ```

2. **Start your API server:**
   ```bash
   npm run dev
   ```

3. **Start ngrok tunnel:**
   ```bash
   ngrok http 4000
   ```

4. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

5. **Configure in AzamPay Dashboard:**
   - Go to **Settings** → **Webhooks**
   - Add webhook URL: `https://abc123.ngrok.io/webhooks/azampay`
   - Copy the webhook secret to your `.env` file

### For Production

1. **Set your production domain:**
   ```bash
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

2. **Configure in AzamPay Dashboard:**
   - Webhook URL: `https://api.yourdomain.com/webhooks/azampay`
   - Copy the webhook secret to your production `.env`

## Complete .env Example

```bash
# ============================================
# AzamPay Configuration
# ============================================
AZAMPAY_API_URL=https://api.azampay.co.tz
AZAMPAY_API_KEY=ak_live_abc123xyz789
AZAMPAY_CLIENT_ID=client_abc123xyz789
AZAMPAY_CLIENT_SECRET=sk_live_abc123xyz789
AZAMPAY_WEBHOOK_SECRET=whsec_abc123xyz789

# ============================================
# SMS Configuration
# ============================================
SMS_PROVIDER=africastalking
AFRICASTALKING_USERNAME=nolsaf
AFRICASTALKING_API_KEY=abc123xyz789
AFRICASTALKING_SENDER_ID=NoLSAF

# ============================================
# Application URLs
# ============================================
NEXT_PUBLIC_API_URL=http://localhost:4000
WEB_ORIGIN=http://localhost:3000
PORT=4000
```

## Security Best Practices

1. **Never commit `.env` to version control**
   - Already in `.gitignore`
   - Use `.env.example` for templates

2. **Use different credentials for development and production**
   - Development: Sandbox/test credentials
   - Production: Live credentials

3. **Rotate secrets regularly**
   - Change API keys every 90 days
   - Update webhook secrets if compromised

4. **Use environment-specific files**
   - `.env.development`
   - `.env.production`
   - `.env.local` (for local overrides)

## Testing Your Configuration

### 1. Test API Connection
```bash
# Check if API server starts without errors
npm run dev
```

### 2. Test Payment Initiation
```bash
# Use the AzamPayButton component or test endpoint
curl -X POST http://localhost:4000/api/payments/azampay/initiate \
  -H "Content-Type: application/json" \
  -d '{"invoiceId": 1}'
```

### 3. Test Webhook (Local)
```bash
# Use ngrok webhook testing or AzamPay test webhook
# Check server logs for webhook reception
```

## Troubleshooting

### "API Key Invalid" Error
- Verify `AZAMPAY_API_KEY` is correct
- Check if you're using the right environment (sandbox vs live)
- Ensure no extra spaces in `.env` file

### "Webhook Signature Invalid" Error
- Verify `AZAMPAY_WEBHOOK_SECRET` matches dashboard
- Check webhook URL is correctly configured
- Ensure webhook endpoint is accessible

### "SMS Not Sending" Error
- Check SMS provider credentials
- Verify phone number format (+255XXXXXXXXX)
- Review SMS provider logs/console

### "Payment Initiation Failed" Error
- Verify all AzamPay credentials are set
- Check invoice exists and is not already paid
- Review API logs for detailed error messages

## Support

- **AzamPay Documentation:** https://docs.azampay.co.tz
- **AzamPay Support:** support@azampay.co.tz
- **Check logs:** `nolsaf/apps/api/src/routes/payments.azampay.ts`
