-- Keep group_booking_claims normalized:
-- - offeredPricePerNight is the owner/base nightly offer before discount.
-- - discountPercent is the only discount rule.
-- - totalAmount is the final owner offer total after discount.
-- The other snapshot columns duplicate values derivable from those fields plus
-- the linked group booking's rooms/dates.

-- Preserve the corrected discounted total before dropping the temporary ownerAmount column.
SET @__nolsaf_col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_booking_claims'
    AND COLUMN_NAME = 'ownerAmount'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 1,
  'UPDATE `group_booking_claims` SET `totalAmount` = `ownerAmount` WHERE `ownerAmount` IS NOT NULL',
  'SELECT "skip: group_booking_claims.ownerAmount backfill source absent"'
);
PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_booking_claims'
    AND COLUMN_NAME = 'basePricePerNight'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 1,
  'ALTER TABLE `group_booking_claims` DROP COLUMN `basePricePerNight`',
  'SELECT "skip: group_booking_claims.basePricePerNight already absent"'
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
  @__nolsaf_col_exists = 1,
  'ALTER TABLE `group_booking_claims` DROP COLUMN `discountAmountPerNight`',
  'SELECT "skip: group_booking_claims.discountAmountPerNight already absent"'
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
  @__nolsaf_col_exists = 1,
  'ALTER TABLE `group_booking_claims` DROP COLUMN `finalPricePerNight`',
  'SELECT "skip: group_booking_claims.finalPricePerNight already absent"'
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
  @__nolsaf_col_exists = 1,
  'ALTER TABLE `group_booking_claims` DROP COLUMN `ownerAmount`',
  'SELECT "skip: group_booking_claims.ownerAmount already absent"'
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
  @__nolsaf_col_exists = 1,
  'ALTER TABLE `group_booking_claims` DROP COLUMN `roomsSnapshot`',
  'SELECT "skip: group_booking_claims.roomsSnapshot already absent"'
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
  @__nolsaf_col_exists = 1,
  'ALTER TABLE `group_booking_claims` DROP COLUMN `nightsSnapshot`',
  'SELECT "skip: group_booking_claims.nightsSnapshot already absent"'
);
PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;
