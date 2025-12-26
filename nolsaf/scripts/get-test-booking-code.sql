-- Get valid booking codes for cancellation testing
-- This query returns booking codes that are:
-- 1. Active (status = 'ACTIVE')
-- 2. Associated with confirmed bookings
-- 3. Not already canceled
-- 4. Have future check-in dates (for eligibility testing)

SELECT 
    cc.id AS checkin_code_id,
    cc.code AS booking_code,
    cc.codeVisible AS booking_code_visible,
    cc.status AS code_status,
    b.id AS booking_id,
    b.status AS booking_status,
    b.userId AS user_id,
    b.checkIn,
    b.checkOut,
    b.totalAmount,
    b.createdAt AS booking_created_at,
    p.title AS property_title,
    u.email AS user_email,
    u.phone AS user_phone,
    u.name AS user_name,
    -- Calculate eligibility info
    TIMESTAMPDIFF(HOUR, b.createdAt, NOW()) AS hours_since_booking,
    TIMESTAMPDIFF(HOUR, NOW(), b.checkIn) AS hours_before_checkin,
    CASE
        WHEN b.status = 'CANCELED' THEN 'Already canceled'
        WHEN cc.status != 'ACTIVE' THEN 'Code not active'
        WHEN NOW() >= b.checkIn THEN 'After check-in'
        WHEN TIMESTAMPDIFF(HOUR, b.createdAt, NOW()) <= 24 
             AND TIMESTAMPDIFF(HOUR, NOW(), b.checkIn) >= 72 THEN 'Eligible: Free cancellation (100%)'
        WHEN TIMESTAMPDIFF(HOUR, NOW(), b.checkIn) >= 96 THEN 'Eligible: Partial refund (50%)'
        ELSE 'Not eligible (contact admin)'
    END AS eligibility_status
FROM CheckinCode cc
JOIN Booking b ON cc.bookingId = b.id
JOIN Property p ON b.propertyId = p.id
LEFT JOIN User u ON b.userId = u.id
WHERE 
    cc.status = 'ACTIVE'
    AND b.status IN ('CONFIRMED', 'PENDING_CHECKIN')
    AND b.checkIn > NOW()  -- Future check-in
ORDER BY 
    b.checkIn ASC  -- Show nearest check-ins first
LIMIT 10;

