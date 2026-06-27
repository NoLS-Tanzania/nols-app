-- Keep group stay auction finances normalized:
-- - depositAmount is the NoLSAF commission payment snapshot.
-- - ownerAmount is the owner balance.
-- - totalAmount is the customer total.
-- commissionAmount and balanceAmount duplicate those values and are derived.

SET @__nolsaf_col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'group_bookings'
    AND COLUMN_NAME = 'commissionAmount'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 1,
  'ALTER TABLE `group_bookings` DROP COLUMN `commissionAmount`',
  'SELECT "skip: group_bookings.commissionAmount already absent"'
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
  @__nolsaf_col_exists = 1,
  'ALTER TABLE `group_bookings` DROP COLUMN `balanceAmount`',
  'SELECT "skip: group_bookings.balanceAmount already absent"'
);
PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;
