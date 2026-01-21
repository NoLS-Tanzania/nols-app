-- Add SystemSetting currency + support contact fields (idempotent)
-- Safe to run multiple times.

-- 1) Add currency (VARCHAR(3))
SET @__nolsaf_has_currency := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'SystemSetting'
    AND COLUMN_NAME = 'currency'
);

SET @__nolsaf_sql_currency := IF(
  @__nolsaf_has_currency = 0,
  'ALTER TABLE `SystemSetting` ADD COLUMN `currency` VARCHAR(3) NULL DEFAULT ''TZS''',
  'SELECT "skip: SystemSetting.currency already exists"'
);

PREPARE __nolsaf_stmt_currency FROM @__nolsaf_sql_currency;
EXECUTE __nolsaf_stmt_currency;
DEALLOCATE PREPARE __nolsaf_stmt_currency;

-- Backfill null currency to default
UPDATE `SystemSetting` SET `currency` = 'TZS' WHERE `currency` IS NULL;


-- 2) Add supportEmail (VARCHAR(191))
SET @__nolsaf_has_supportEmail := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'SystemSetting'
    AND COLUMN_NAME = 'supportEmail'
);

SET @__nolsaf_sql_supportEmail := IF(
  @__nolsaf_has_supportEmail = 0,
  'ALTER TABLE `SystemSetting` ADD COLUMN `supportEmail` VARCHAR(191) NULL',
  'SELECT "skip: SystemSetting.supportEmail already exists"'
);

PREPARE __nolsaf_stmt_supportEmail FROM @__nolsaf_sql_supportEmail;
EXECUTE __nolsaf_stmt_supportEmail;
DEALLOCATE PREPARE __nolsaf_stmt_supportEmail;


-- 3) Add supportPhone (VARCHAR(40))
SET @__nolsaf_has_supportPhone := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'SystemSetting'
    AND COLUMN_NAME = 'supportPhone'
);

SET @__nolsaf_sql_supportPhone := IF(
  @__nolsaf_has_supportPhone = 0,
  'ALTER TABLE `SystemSetting` ADD COLUMN `supportPhone` VARCHAR(40) NULL',
  'SELECT "skip: SystemSetting.supportPhone already exists"'
);

PREPARE __nolsaf_stmt_supportPhone FROM @__nolsaf_sql_supportPhone;
EXECUTE __nolsaf_stmt_supportPhone;
DEALLOCATE PREPARE __nolsaf_stmt_supportPhone;
