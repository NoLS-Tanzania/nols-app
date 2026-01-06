# Email & SMS Provider Setup Guide

This document explains how to configure email and SMS providers for the NoLSAF platform.

## Email Provider: Resend (Recommended)

### Setup Steps

1. **Create a Resend account**
   - Visit [resend.com](https://resend.com)
   - Sign up for a free account (3,000 emails/month free)

2. **Get your API key**
   - Go to API Keys section in Resend dashboard
   - Create a new API key
   - Copy the API key (starts with `re_`)

3. **Verify your domain** (for production)
   - Add your domain in Resend dashboard
   - Add DNS records (SPF, DKIM) as instructed
   - Wait for verification (usually a few minutes)

4. **Set environment variables**
   ```bash
   # Required for Resend
   RESEND_API_KEY=re_your_api_key_here
   
   # Optional: Use verified domain (e.g., no-reply@yourdomain.com)
   # If not set, will use default Resend domain
   RESEND_FROM_DOMAIN=no-reply@yourdomain.com
   
   # Optional: Fallback sender (used if RESEND_FROM_DOMAIN not set)
   EMAIL_FROM=no-reply@nolsapp.com
   ```

### SMTP Fallback

If Resend is not configured, the system will fall back to SMTP. Configure these variables:

```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
EMAIL_FROM=no-reply@nolsapp.com
```

## SMS Provider: Africa's Talking (Recommended for Tanzania/East Africa)

### Setup Steps

1. **Create an Africa's Talking account**
   - Visit [africastalking.com](https://africastalking.com)
   - Sign up for an account
   - Select Tanzania (or your country)

2. **Get your credentials**
   - Go to Settings > API
   - Copy your Username and API Key
   - Note your Sender ID (or request one)

3. **Top up your wallet**
   - Go to Billing section
   - Add funds to your wallet (pay-as-you-go)
   - Pricing: ~$0.02-0.05 per SMS in Tanzania

4. **Set environment variables**
   ```bash
   # Set provider (optional, defaults to africastalking if API key is set)
   SMS_PROVIDER=africastalking
   
   # Required for Africa's Talking
   AFRICASTALKING_USERNAME=your_username
   AFRICASTALKING_API_KEY=your_api_key
   
   # Optional: Sender ID (default: 'NoLSAF')
   AFRICASTALKING_SENDER_ID=NoLSAF
   ```

### Twilio Alternative

If you prefer Twilio (more expensive but global coverage):

```bash
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Provider Priority

### Email Priority
1. **Resend** (if `RESEND_API_KEY` is set)
2. **SMTP** (if `SMTP_HOST` is set)
3. **Console logging** (development mode only)

### SMS Priority
1. **Africa's Talking** (if `AFRICASTALKING_API_KEY` is set, or `SMS_PROVIDER=africastalking`)
2. **Twilio** (if `SMS_PROVIDER=twilio` and credentials are set)
3. **Generic API** (if `SMS_API_URL` is set)
4. **Console logging** (development mode only)

## Testing

### Test Email
The system will automatically use the configured provider. Check logs for:
- `[Resend]` - Using Resend
- `[SMTP]` - Using SMTP fallback
- `[Email]` - Development mode (logging only)

### Test SMS
Check logs for:
- `[SMS] Africa's Talking` - Using Africa's Talking
- `[SMS] Twilio` - Using Twilio
- `[SMS]` - Development mode (logging only)

## Pricing

### Resend
- **Free tier**: 3,000 emails/month
- **Paid**: $20/month for 50,000 emails
- **Overage**: ~$0.90 per 1,000 additional emails

### Africa's Talking
- **Pay-as-you-go**: Top up wallet, no monthly fees
- **Tanzania**: ~$0.02-0.05 per SMS
- **Volume discounts**: Better rates with higher top-ups

### Twilio
- **Pay-as-you-go**: ~$0.05-0.10 per SMS in Tanzania
- **No monthly fees**: Pay only for what you use

## Troubleshooting

### Email not sending
1. Check `RESEND_API_KEY` is set correctly
2. Verify domain in Resend dashboard (if using custom domain)
3. Check Resend dashboard for delivery logs
4. Review application logs for error messages

### SMS not sending
1. Verify `AFRICASTALKING_USERNAME` and `AFRICASTALKING_API_KEY` are correct
2. Check wallet balance in Africa's Talking dashboard
3. Verify phone number format (should include country code: +255...)
4. Check Africa's Talking dashboard for delivery status

## Support

- **Resend**: [docs.resend.com](https://docs.resend.com)
- **Africa's Talking**: [docs.africastalking.com](https://docs.africastalking.com)
- **Twilio**: [twilio.com/docs](https://www.twilio.com/docs)



