-- Add display-currency support.
--   systemsetting.fxRates       : JSON store of manual/auto display FX rates
--   user.preferredCurrency      : a user's chosen display currency (ISO 4217)
--
-- Presentation only. TZS remains the money of record; these columns never
-- affect a charge, payout, invoice total, or anything the payment processor
-- sees. Written idempotently so staging/prod re-runs are safe.

-- systemsetting.fxRates (JSON, nullable)
SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'systemsetting' AND COLUMN_NAME = 'fxRates'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `fxRates` JSON NULL', 'SELECT ''skip: systemsetting.fxRates''');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

-- user.preferredCurrency (VARCHAR(3), nullable, default 'TZS')
SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'preferredCurrency'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `user` ADD COLUMN `preferredCurrency` VARCHAR(3) NULL DEFAULT ''TZS''', 'SELECT ''skip: user.preferredCurrency''');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;
