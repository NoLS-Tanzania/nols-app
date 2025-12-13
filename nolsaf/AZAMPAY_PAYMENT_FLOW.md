# AzamPay Payment Integration Guide

This document describes the complete AzamPay payment flow implementation with safeguards against double-clicking and SMS notifications.

## Overview

The AzamPay integration includes:
1. **Payment Initiation API** - Secure payment initiation with idempotency
2. **Webhook Handler** - Processes AzamPay payment callbacks
3. **Payment Status Checking** - Real-time payment status verification
4. **Protected Payment Button** - React component with double-click prevention
5. **SMS Notifications** - Automatic SMS confirmation on successful payment

## Features

### 1. Idempotency Protection
- Each payment request uses a unique idempotency key
- Prevents duplicate payments from double-clicks
- Idempotency keys are cached for 10 minutes
- Same key returns cached result instead of creating new payment

### 2. Double-Click Prevention
- Button is disabled immediately on click
- 500ms debounce between clicks
- Prevents multiple simultaneous submissions
- Visual feedback during processing

### 3. Payment Status Polling
- Automatic status checking every 3 seconds
- Polls for up to 2 minutes (40 attempts)
- Stops automatically when payment succeeds or fails
- Real-time UI updates

### 4. SMS Notifications
- Automatic SMS sent on successful payment
- Includes receipt number and amount
- Supports multiple SMS providers (Twilio, Africa's Talking, custom)
- Graceful fallback if SMS fails

### 5. Webhook Security
- HMAC SHA-256 signature verification
- Validates webhook authenticity
- Idempotent event processing
- Amount verification before marking invoice as paid

## API Endpoints

### POST `/api/payments/azampay/initiate`
Initiates a payment with AzamPay.

**Request Body:**
```json
{
  "invoiceId": 123,
  "idempotencyKey": "optional-key", // Auto-generated if not provided
  "phoneNumber": "+255123456789" // Optional, uses invoice user's phone if not provided
}
```

**Response:**
```json
{
  "ok": true,
  "idempotencyKey": "azampay-123-1234567890-abc123",
  "transactionId": "TXN-123456",
  "paymentRef": "INV-123-1234567890",
  "status": "PENDING",
  "message": "Payment initiated successfully",
  "checkoutUrl": "https://checkout.azampay.co.tz/..." // Optional
}
```

### GET `/api/payments/azampay/status/:paymentRef`
Check payment status by payment reference.

**Response:**
```json
{
  "ok": true,
  "invoiceId": 123,
  "invoiceStatus": "PAID",
  "paymentRef": "INV-123-1234567890",
  "paymentStatus": "SUCCESS",
  "amount": 50000,
  "currency": "TZS",
  "lastEvent": {
    "status": "SUCCESS",
    "amount": 50000,
    "createdAt": "2024-01-01T12:00:00Z"
  }
}
```

### POST `/webhooks/azampay`
AzamPay webhook endpoint (called by AzamPay).

**Headers:**
- `X-Azampay-Signature`: HMAC SHA-256 signature

**Body:** AzamPay webhook payload

## Environment Variables

Add these to your `.env` file:

```bash
# AzamPay Configuration
AZAMPAY_API_URL=https://api.azampay.co.tz
AZAMPAY_API_KEY=your_api_key
AZAMPAY_CLIENT_ID=your_client_id
AZAMPAY_CLIENT_SECRET=your_client_secret
AZAMPAY_WEBHOOK_SECRET=your_webhook_secret

# SMS Configuration (choose one provider)
SMS_PROVIDER=console # Options: console, twilio, africastalking, or custom
SMS_API_KEY=your_sms_api_key # For custom provider
SMS_API_URL=https://your-sms-api.com/send # For custom provider

# Twilio (if using Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+255123456789

# Africa's Talking (if using Africa's Talking)
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_API_KEY=your_api_key
AFRICASTALKING_SENDER_ID=NoLSAF
```

## Usage Example

### Using the AzamPayButton Component

```tsx
import AzamPayButton from '@/components/AzamPayButton';

function PaymentPage({ invoice }) {
  const handlePaymentSuccess = (data) => {
    console.log('Payment successful!', data);
    // Redirect to success page or show success message
  };

  const handlePaymentError = (error) => {
    console.error('Payment failed:', error);
    // Show error message to user
  };

  return (
    <div>
      <h2>Pay Invoice #{invoice.id}</h2>
      <p>Amount: {invoice.netPayable} {invoice.currency}</p>
      
      <AzamPayButton
        invoiceId={invoice.id}
        amount={invoice.netPayable}
        currency={invoice.currency}
        phoneNumber={invoice.booking?.user?.phone}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
        className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
      >
        Pay with AzamPay
      </AzamPayButton>
    </div>
  );
}
```

### Direct API Usage

```typescript
async function initiatePayment(invoiceId: number) {
  try {
    const response = await fetch('/api/payments/azampay/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        invoiceId,
        idempotencyKey: `my-key-${Date.now()}`, // Optional
      }),
    });

    const data = await response.json();
    
    if (data.ok) {
      // Payment initiated successfully
      if (data.checkoutUrl) {
        // Redirect to checkout
        window.location.href = data.checkoutUrl;
      } else {
        // Poll for status
        pollPaymentStatus(data.paymentRef);
      }
    }
  } catch (error) {
    console.error('Payment initiation failed:', error);
  }
}
```

## Payment Flow

1. **User clicks payment button**
   - Button is immediately disabled
   - Idempotency key is generated
   - Request sent to `/api/payments/azampay/initiate`

2. **Payment initiation**
   - Invoice is validated
   - Payment reference is created/verified
   - AzamPay API is called
   - Payment event is recorded in database

3. **Payment processing**
   - If checkout URL provided: user is redirected
   - Otherwise: status polling begins
   - Polls every 3 seconds for up to 2 minutes

4. **Webhook callback**
   - AzamPay sends webhook to `/webhooks/azampay`
   - Signature is verified
   - Payment event is recorded
   - If successful:
     - Invoice is marked as PAID
     - Receipt is generated
     - SMS notification is sent
     - Real-time updates are emitted

5. **Completion**
   - Payment status is updated
   - User receives confirmation
   - Polling stops

## Security Features

1. **Idempotency Keys**: Prevent duplicate payments
2. **Signature Verification**: Webhook authenticity verified
3. **Amount Verification**: Payment amount must match invoice
4. **Status Checks**: Invoice status validated before processing
5. **Rate Limiting**: Built-in protection against abuse

## Error Handling

- Network errors: Retry with exponential backoff
- API errors: User-friendly error messages
- Webhook failures: Logged but don't break payment flow
- SMS failures: Logged but don't prevent payment completion

## Testing

1. **Development Mode**: SMS logs to console
2. **Test Payments**: Use AzamPay sandbox environment
3. **Webhook Testing**: Use tools like ngrok for local testing
4. **Idempotency Testing**: Send same request twice, verify single payment

## Troubleshooting

### Payment not initiating
- Check AzamPay API credentials
- Verify invoice exists and is not already paid
- Check network connectivity

### Webhook not receiving
- Verify webhook URL is accessible
- Check signature verification
- Review AzamPay webhook configuration

### SMS not sending
- Check SMS provider configuration
- Verify phone number format
- Review SMS provider logs

## Support

For issues or questions:
1. Check logs in `nolsaf/apps/api/src/routes/payments.azampay.ts`
2. Review webhook logs in `nolsaf/apps/api/src/routes/webhooks.payments.ts`
3. Check SMS logs in `nolsaf/apps/api/src/lib/sms.ts`


