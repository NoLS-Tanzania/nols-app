# How to Get Valid Booking Codes for Testing

## Method 1: Using the Node.js Script (Recommended)

```bash
cd nolsaf
npm run test:booking-codes
```

This will show you:
- Valid booking codes
- User information (so you know which account to log in with)
- Eligibility status (whether it qualifies for cancellation)
- Check-in dates and amounts

## Method 2: Using SQL Query Directly

If you have direct database access, run the SQL query:

```bash
# Using MySQL command line
mysql -u your_user -p your_database < scripts/get-test-booking-code.sql

# Or copy the query from scripts/get-test-booking-code.sql and run it in your database client
```

## Method 3: Using Admin Panel

1. Log in to the admin panel
2. Go to `/admin/bookings`
3. Look for bookings with:
   - Status: `CONFIRMED` or `PENDING_CHECKIN`
   - Future check-in dates
   - Active check-in codes
4. Copy the booking code from the booking details

## Method 4: Check Your Database Directly

Run this query in your database:

```sql
SELECT 
    cc.code AS booking_code,
    cc.codeVisible AS booking_code_visible,
    b.id AS booking_id,
    b.userId AS user_id,
    b.checkIn,
    b.status AS booking_status,
    p.title AS property_title
FROM CheckinCode cc
JOIN Booking b ON cc.bookingId = b.id
JOIN Property p ON b.propertyId = p.id
WHERE 
    cc.status = 'ACTIVE'
    AND b.status IN ('CONFIRMED', 'PENDING_CHECKIN')
    AND b.checkIn > NOW()
ORDER BY b.checkIn ASC
LIMIT 5;
```

## What You Need for Testing

1. **Booking Code**: The code to enter in the cancellation form
2. **User ID**: The userId of the booking owner (you need to be logged in as this user)
3. **Eligibility**: 
   - ✅ **Eligible codes** will show the submission form
   - ❌ **Non-eligible codes** will show a message to contact admin

## Testing Different Scenarios

### Test Eligible Cancellation (100% refund)
- Look for codes where booking was created < 24 hours ago
- AND check-in is > 72 hours away

### Test Eligible Cancellation (50% refund)
- Look for codes where check-in is > 96 hours away
- But booking was created > 24 hours ago

### Test Non-Eligible Cancellation
- Look for codes where check-in is < 96 hours away
- These will show "Not eligible" message

## Quick Test Steps

1. Get a booking code using one of the methods above
2. Note the `userId` from the results
3. Log in to the app as that user (or create a test user with that ID)
4. Navigate to `/account/cancellations`
5. Enter the booking code
6. Test the cancellation flow

