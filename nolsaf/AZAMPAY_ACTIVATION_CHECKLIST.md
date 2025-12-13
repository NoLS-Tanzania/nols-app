# AzamPay Integration Activation Checklist

Follow these steps to activate and test your AzamPay payment integration.

## ✅ Step 1: Database Setup

### 1.1 Add Missing Models to Prisma Schema
- [x] `PropertyImage` model added
- [x] `PaymentEvent` model added

### 1.2 Generate Prisma Client
```bash
cd nolsaf
npm run prisma:generate
```

### 1.3 Run Database Migration
```bash
# Create migration for new models
npx prisma migrate dev --name add_property_image_and_payment_event

# Or if using raw SQL
# Check if tables exist, create if needed
```

## ✅ Step 2: Environment Configuration

### 2.1 Copy Template to .env
```bash
# Copy variables from env.azampay.template to your .env file
# Or manually add the variables below
```

### 2.2 Add AzamPay Credentials to .env
```bash
# Required - Get from AzamPay Dashboard
AZAMPAY_API_URL=https://api.azampay.co.tz
AZAMPAY_API_KEY=your_actual_api_key_here
AZAMPAY_CLIENT_ID=your_actual_client_id_here
AZAMPAY_CLIENT_SECRET=your_actual_client_secret_here
AZAMPAY_WEBHOOK_SECRET=your_actual_webhook_secret_here
```

### 2.3 Configure SMS Provider (Optional)
```bash
# Choose one:
SMS_PROVIDER=console  # For development (logs only)
# OR
SMS_PROVIDER=africastalking
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_API_KEY=your_api_key
AFRICASTALKING_SENDER_ID=NoLSAF
```

## ✅ Step 3: Verify Code Integration

### 3.1 Check Routes Are Registered
- [x] `payments.azampay.ts` route file exists
- [x] Route registered in `index.ts`: `/api/payments/azampay`
- [x] Webhook route registered: `/webhooks/azampay`

### 3.2 Verify Dependencies
```bash
# Check if all required packages are installed
cd nolsaf/apps/api
npm list crypto  # Should be built-in Node.js
npm list @aws-sdk/client-s3  # For image processing (if needed)
```

## ✅ Step 4: AzamPay Dashboard Configuration

### 4.1 Get Your Credentials
1. Log into: https://merchant.azampay.co.tz
2. Navigate to **Settings** → **API Credentials**
3. Copy:
   - API Key → `AZAMPAY_API_KEY`
   - Client ID → `AZAMPAY_CLIENT_ID`
   - Client Secret → `AZAMPAY_CLIENT_SECRET`

### 4.2 Configure Webhook URL

#### For Local Development:
1. Install ngrok: `npm install -g ngrok`
2. Start your API: `npm run dev`
3. Start ngrok: `ngrok http 4000`
4. Copy ngrok URL (e.g., `https://abc123.ngrok.io`)
5. In AzamPay Dashboard → **Settings** → **Webhooks**:
   - Add URL: `https://abc123.ngrok.io/webhooks/azampay`
   - Copy Webhook Secret → `AZAMPAY_WEBHOOK_SECRET`

#### For Production:
1. In AzamPay Dashboard → **Settings** → **Webhooks**:
   - Add URL: `https://api.yourdomain.com/webhooks/azampay`
   - Copy Webhook Secret → `AZAMPAY_WEBHOOK_SECRET`

## ✅ Step 5: Test the Integration

### 5.1 Start Development Servers
```bash
cd nolsaf
npm run dev
```

### 5.2 Test Payment Initiation Endpoint
```bash
# Using curl or Postman
curl -X POST http://localhost:4000/api/payments/azampay/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "invoiceId": 1,
    "phoneNumber": "+255123456789"
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "idempotencyKey": "azampay-1-1234567890-abc123",
  "transactionId": "TXN-123456",
  "paymentRef": "INV-1-1234567890",
  "status": "PENDING",
  "message": "Payment initiated successfully"
}
```

### 5.3 Test Payment Status Check
```bash
curl http://localhost:4000/api/payments/azampay/status/INV-1-1234567890 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.4 Test Webhook (Local with ngrok)
1. Use AzamPay's webhook testing tool
2. Or send test webhook to your ngrok URL
3. Check server logs for webhook reception

## ✅ Step 6: Frontend Integration

### 6.1 Use AzamPayButton Component
```tsx
import AzamPayButton from '@/components/AzamPayButton';

<AzamPayButton
  invoiceId={invoice.id}
  amount={invoice.netPayable}
  currency={invoice.currency}
  phoneNumber={user.phone}
  onSuccess={(data) => {
    console.log('Payment successful!', data);
    // Redirect or show success message
  }}
  onError={(error) => {
    console.error('Payment failed:', error);
    // Show error message
  }}
  className="px-6 py-3 bg-emerald-600 text-white rounded-lg"
>
  Pay with AzamPay
</AzamPayButton>
```

## ✅ Step 7: Verify Communication Flow

### 7.1 Payment Flow Test
1. **Initiate Payment** → Should return transaction ID
2. **Check Status** → Should show PENDING initially
3. **Complete Payment** → Via AzamPay app/portal
4. **Webhook Received** → Check server logs
5. **Invoice Updated** → Should be marked as PAID
6. **SMS Sent** → Check SMS logs/console

### 7.2 Verify Database Records
```sql
-- Check payment events were created
SELECT * FROM payment_events WHERE provider = 'AZAMPAY' ORDER BY createdAt DESC LIMIT 10;

-- Check invoices were marked as paid
SELECT id, invoiceNumber, status, paymentMethod, paymentRef 
FROM Invoice 
WHERE paymentMethod = 'AZAMPAY' 
ORDER BY paidAt DESC LIMIT 10;
```

## ✅ Step 8: Common Issues & Fixes

### Issue: "Property 'propertyImage' does not exist"
**Fix:**
```bash
npm run prisma:generate
# Restart your dev server
```

### Issue: "Property 'paymentEvent' does not exist"
**Fix:**
```bash
npm run prisma:generate
# Restart your dev server
```

### Issue: "AZAMPAY_API_KEY is not defined"
**Fix:**
- Check `.env` file exists in `nolsaf/apps/api/` or root
- Verify variable names match exactly (case-sensitive)
- Restart dev server after adding variables

### Issue: "Webhook signature invalid"
**Fix:**
- Verify `AZAMPAY_WEBHOOK_SECRET` matches dashboard
- Check webhook URL is correct
- Ensure raw body parsing is working

### Issue: "Payment initiation failed"
**Fix:**
- Verify all AzamPay credentials are correct
- Check invoice exists and is not already paid
- Review API response in server logs
- Verify phone number format (+255XXXXXXXXX)

## ✅ Step 9: Production Deployment

### 9.1 Update Environment Variables
- Use production AzamPay credentials
- Set production webhook URL
- Configure production SMS provider

### 9.2 Security Checklist
- [ ] All secrets in environment variables (not in code)
- [ ] `.env` file in `.gitignore`
- [ ] Webhook secret matches dashboard
- [ ] HTTPS enabled for webhook endpoint
- [ ] Rate limiting configured

### 9.3 Monitoring
- [ ] Set up logging for payment events
- [ ] Monitor webhook delivery
- [ ] Track failed payments
- [ ] Set up alerts for payment issues

## Quick Test Command

```bash
# Test complete flow (replace with actual values)
curl -X POST http://localhost:4000/api/payments/azampay/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"invoiceId": 1}' \
  && echo "\n✅ Payment initiated"

# Check status
curl http://localhost:4000/api/payments/azampay/status/INV-1-1234567890 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  && echo "\n✅ Status checked"
```

## Next Steps After Activation

1. **Test with real invoice** - Use a test invoice ID
2. **Monitor webhooks** - Check logs for incoming webhooks
3. **Verify SMS** - Confirm SMS notifications are sent
4. **Test double-click protection** - Verify button disables
5. **Test idempotency** - Send same request twice, verify single payment

## Support Resources

- **AzamPay Docs:** https://docs.azampay.co.tz
- **AzamPay Support:** support@azampay.co.tz
- **Code Files:**
  - Payment API: `nolsaf/apps/api/src/routes/payments.azampay.ts`
  - Webhook: `nolsaf/apps/api/src/routes/webhooks.payments.ts`
  - Button Component: `nolsaf/apps/web/components/AzamPayButton.tsx`


