-- Ensure databases that drifted past 20260615090000 have the mapped
-- TransportBooking.requiredLanguage column Prisma now expects.

SET @__nolsaf_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'transportbooking'
    AND COLUMN_NAME = 'requiredLanguage'
);

SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `transportbooking` ADD COLUMN `requiredLanguage` VARCHAR(40) NULL',
  'SELECT "skip: transportbooking.requiredLanguage already exists"'
);

PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;
