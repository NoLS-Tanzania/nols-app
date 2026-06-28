-- Align unpaid selected group-stay bookings with the selected owner's final
-- claim total. New confirmations already do this in the API; this repairs
-- existing AWAITING_DEPOSIT rows created before the pricing cleanup.

UPDATE `group_bookings` b
JOIN `group_booking_claims` c
  ON c.`groupBookingId` = b.`id`
 AND c.`propertyId` = b.`confirmedPropertyId`
SET
  b.`ownerAmount` = c.`totalAmount`,
  b.`depositAmount` = ROUND(c.`totalAmount` * (COALESCE(b.`commissionPercent`, 0) / 100), 2),
  b.`totalAmount` = ROUND(c.`totalAmount` + (c.`totalAmount` * (COALESCE(b.`commissionPercent`, 0) / 100)), 2)
WHERE b.`confirmedPropertyId` IS NOT NULL
  AND b.`depositPaid` = false
  AND b.`status` = 'AWAITING_DEPOSIT'
  AND c.`status` NOT IN ('WITHDRAWN', 'REJECTED');
