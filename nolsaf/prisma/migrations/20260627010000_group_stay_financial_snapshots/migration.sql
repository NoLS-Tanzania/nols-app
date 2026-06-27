-- Make group stay auction pricing explicit and auditable.
-- Existing columns stay in place for compatibility; new nullable snapshots are
-- populated by the server for all new claims and confirmed offers.

SET @__nolsaf_col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_booking_claims'
    AND COLUMN_NAME = 'basePricePerNight'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `group_booking_claims` ADD COLUMN `basePricePerNight` DECIMAL(12,2) NULL',
  'SELECT "skip: group_booking_claims.basePricePerNight already exists"'
);
PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_booking_claims'
    AND COLUMN_NAME = 'discountAmountPerNight'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `group_booking_claims` ADD COLUMN `discountAmountPerNight` DECIMAL(12,2) NULL',
  'SELECT "skip: group_booking_claims.discountAmountPerNight already exists"'
);
PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_booking_claims'
    AND COLUMN_NAME = 'finalPricePerNight'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `group_booking_claims` ADD COLUMN `finalPricePerNight` DECIMAL(12,2) NULL',
  'SELECT "skip: group_booking_claims.finalPricePerNight already exists"'
);
PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_booking_claims'
    AND COLUMN_NAME = 'ownerAmount'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `group_booking_claims` ADD COLUMN `ownerAmount` DECIMAL(12,2) NULL',
  'SELECT "skip: group_booking_claims.ownerAmount already exists"'
);
PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_booking_claims'
    AND COLUMN_NAME = 'roomsSnapshot'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `group_booking_claims` ADD COLUMN `roomsSnapshot` INTEGER NULL',
  'SELECT "skip: group_booking_claims.roomsSnapshot already exists"'
);
PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_booking_claims'
    AND COLUMN_NAME = 'nightsSnapshot'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `group_booking_claims` ADD COLUMN `nightsSnapshot` INTEGER NULL',
  'SELECT "skip: group_booking_claims.nightsSnapshot already exists"'
);
PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_bookings'
    AND COLUMN_NAME = 'commissionAmount'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `commissionAmount` DECIMAL(12,2) NULL',
  'SELECT "skip: group_bookings.commissionAmount already exists"'
);
PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_bookings'
    AND COLUMN_NAME = 'balanceAmount'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `balanceAmount` DECIMAL(12,2) NULL',
  'SELECT "skip: group_bookings.balanceAmount already exists"'
);
PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

-- Backfill claim snapshots from existing data. This makes historical rows
-- readable under the new contract without changing payment state.
UPDATE `group_booking_claims` c
JOIN `group_bookings` b ON b.`id` = c.`groupBookingId`
SET
  c.`basePricePerNight` = COALESCE(c.`basePricePerNight`, c.`offeredPricePerNight`),
  c.`discountAmountPerNight` = COALESCE(
    c.`discountAmountPerNight`,
    ROUND(c.`offeredPricePerNight` * (COALESCE(c.`discountPercent`, 0) / 100), 2)
  ),
  c.`finalPricePerNight` = COALESCE(
    c.`finalPricePerNight`,
    GREATEST(0, ROUND(c.`offeredPricePerNight` - (c.`offeredPricePerNight` * (COALESCE(c.`discountPercent`, 0) / 100)), 2))
  ),
  c.`roomsSnapshot` = COALESCE(c.`roomsSnapshot`, GREATEST(1, COALESCE(b.`roomsNeeded`, 1))),
  c.`nightsSnapshot` = COALESCE(c.`nightsSnapshot`, GREATEST(1, COALESCE(DATEDIFF(b.`checkOut`, b.`checkIn`), 1))),
  c.`ownerAmount` = COALESCE(
    c.`ownerAmount`,
    ROUND(
      GREATEST(0, c.`offeredPricePerNight` - (c.`offeredPricePerNight` * (COALESCE(c.`discountPercent`, 0) / 100))) *
      GREATEST(1, COALESCE(b.`roomsNeeded`, 1)) *
      GREATEST(1, COALESCE(DATEDIFF(b.`checkOut`, b.`checkIn`), 1)),
      2
    )
  );

-- Snapshot booking commission/balance where enough financial data already exists.
UPDATE `group_bookings`
SET
  `commissionAmount` = COALESCE(
    `commissionAmount`,
    CASE
      WHEN `ownerAmount` IS NOT NULL AND `commissionPercent` IS NOT NULL
        THEN ROUND(`ownerAmount` * (`commissionPercent` / 100), 2)
      WHEN `totalAmount` IS NOT NULL AND `ownerAmount` IS NOT NULL
        THEN GREATEST(0, ROUND(`totalAmount` - `ownerAmount`, 2))
      ELSE NULL
    END
  ),
  `balanceAmount` = COALESCE(
    `balanceAmount`,
    CASE
      WHEN `ownerAmount` IS NOT NULL THEN `ownerAmount`
      WHEN `totalAmount` IS NOT NULL AND `depositAmount` IS NOT NULL
        THEN GREATEST(0, ROUND(`totalAmount` - `depositAmount`, 2))
      ELSE NULL
    END
  )
WHERE `totalAmount` IS NOT NULL OR `ownerAmount` IS NOT NULL OR `depositAmount` IS NOT NULL;
