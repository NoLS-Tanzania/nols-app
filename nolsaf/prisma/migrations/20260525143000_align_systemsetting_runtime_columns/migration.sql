-- Align lowercase systemsetting table with the current Prisma SystemSetting model.
-- This is intentionally idempotent for staging/prod databases that may already
-- have some of these columns from older manual or casing-sensitive migrations.

SET @__nolsaf_table := 'systemsetting';

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'commissionCurrency'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `commissionCurrency` VARCHAR(3) NULL DEFAULT ''TZS''', 'SELECT "skip: systemsetting.commissionCurrency"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'driverCommissionPercent'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `driverCommissionPercent` DECIMAL(5,2) NULL DEFAULT 10.00', 'SELECT "skip: systemsetting.driverCommissionPercent"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'driverCommissionCurrency'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `driverCommissionCurrency` VARCHAR(3) NULL DEFAULT ''TZS''', 'SELECT "skip: systemsetting.driverCommissionCurrency"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'currency'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `currency` VARCHAR(3) NULL DEFAULT ''TZS''', 'SELECT "skip: systemsetting.currency"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;
UPDATE `systemsetting` SET `currency` = 'TZS' WHERE `currency` IS NULL;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'supportEmail'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `supportEmail` VARCHAR(191) NULL', 'SELECT "skip: systemsetting.supportEmail"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'supportPhone'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `supportPhone` VARCHAR(40) NULL', 'SELECT "skip: systemsetting.supportPhone"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'sessionMaxMinutesAdmin'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `sessionMaxMinutesAdmin` INT NULL', 'SELECT "skip: systemsetting.sessionMaxMinutesAdmin"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'requireAdmin2FA'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `requireAdmin2FA` TINYINT(1) NULL DEFAULT 0', 'SELECT "skip: systemsetting.requireAdmin2FA"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'minPasswordLength'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `minPasswordLength` INT NULL DEFAULT 8', 'SELECT "skip: systemsetting.minPasswordLength"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'requirePasswordUppercase'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `requirePasswordUppercase` TINYINT(1) NULL DEFAULT 0', 'SELECT "skip: systemsetting.requirePasswordUppercase"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'requirePasswordLowercase'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `requirePasswordLowercase` TINYINT(1) NULL DEFAULT 0', 'SELECT "skip: systemsetting.requirePasswordLowercase"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'requirePasswordNumber'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `requirePasswordNumber` TINYINT(1) NULL DEFAULT 0', 'SELECT "skip: systemsetting.requirePasswordNumber"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'requirePasswordSpecial'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `requirePasswordSpecial` TINYINT(1) NULL DEFAULT 0', 'SELECT "skip: systemsetting.requirePasswordSpecial"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'sessionIdleMinutes'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `sessionIdleMinutes` INT NULL DEFAULT 30', 'SELECT "skip: systemsetting.sessionIdleMinutes"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'sessionMaxMinutesOwner'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `sessionMaxMinutesOwner` INT NULL', 'SELECT "skip: systemsetting.sessionMaxMinutesOwner"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'sessionMaxMinutesDriver'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `sessionMaxMinutesDriver` INT NULL', 'SELECT "skip: systemsetting.sessionMaxMinutesDriver"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'sessionMaxMinutesCustomer'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `sessionMaxMinutesCustomer` INT NULL', 'SELECT "skip: systemsetting.sessionMaxMinutesCustomer"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'maxSessionDurationHours'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `maxSessionDurationHours` INT NULL DEFAULT 24', 'SELECT "skip: systemsetting.maxSessionDurationHours"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'forceLogoutOnPasswordChange'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `forceLogoutOnPasswordChange` TINYINT(1) NULL DEFAULT 1', 'SELECT "skip: systemsetting.forceLogoutOnPasswordChange"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'ipAllowlist'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `ipAllowlist` VARCHAR(1000) NULL', 'SELECT "skip: systemsetting.ipAllowlist"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'enableIpAllowlist'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `enableIpAllowlist` TINYINT(1) NULL DEFAULT 0', 'SELECT "skip: systemsetting.enableIpAllowlist"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'apiRateLimitPerMinute'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `apiRateLimitPerMinute` INT NULL DEFAULT 100', 'SELECT "skip: systemsetting.apiRateLimitPerMinute"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'maxLoginAttempts'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `maxLoginAttempts` INT NULL DEFAULT 5', 'SELECT "skip: systemsetting.maxLoginAttempts"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'accountLockoutDurationMinutes'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `accountLockoutDurationMinutes` INT NULL DEFAULT 30', 'SELECT "skip: systemsetting.accountLockoutDurationMinutes"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'enableSecurityAuditLogging'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `enableSecurityAuditLogging` TINYINT(1) NULL DEFAULT 1', 'SELECT "skip: systemsetting.enableSecurityAuditLogging"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'logFailedLoginAttempts'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `logFailedLoginAttempts` TINYINT(1) NULL DEFAULT 1', 'SELECT "skip: systemsetting.logFailedLoginAttempts"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'alertOnSuspiciousActivity'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `alertOnSuspiciousActivity` TINYINT(1) NULL DEFAULT 0', 'SELECT "skip: systemsetting.alertOnSuspiciousActivity"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'agentPromotionMinTrips'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `agentPromotionMinTrips` INT NULL DEFAULT 30', 'SELECT "skip: systemsetting.agentPromotionMinTrips"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'agentPromotionMaxTrips'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `agentPromotionMaxTrips` INT NULL DEFAULT 50', 'SELECT "skip: systemsetting.agentPromotionMaxTrips"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'agentPromotionMinRevenue'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `agentPromotionMinRevenue` INT NULL DEFAULT 20000000', 'SELECT "skip: systemsetting.agentPromotionMinRevenue"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'agentCommissionPercent'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `agentCommissionPercent` DECIMAL(5,2) NULL DEFAULT 15.00', 'SELECT "skip: systemsetting.agentCommissionPercent"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'agentCommissionCurrency'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `agentCommissionCurrency` VARCHAR(3) NULL DEFAULT ''USD''', 'SELECT "skip: systemsetting.agentCommissionCurrency"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'nolScopeDefaultCurrency'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `nolScopeDefaultCurrency` VARCHAR(3) NULL DEFAULT ''USD''', 'SELECT "skip: systemsetting.nolScopeDefaultCurrency"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'nolScopeServiceChargePercent'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `nolScopeServiceChargePercent` DECIMAL(5,2) NULL DEFAULT 5.00', 'SELECT "skip: systemsetting.nolScopeServiceChargePercent"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'nolScopeEstimateValidDays'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `nolScopeEstimateValidDays` INT NULL DEFAULT 7', 'SELECT "skip: systemsetting.nolScopeEstimateValidDays"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'nolScopeBaseConfidence'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `nolScopeBaseConfidence` DECIMAL(3,2) NULL DEFAULT 0.70', 'SELECT "skip: systemsetting.nolScopeBaseConfidence"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'nolScopeCostVariancePercent'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `nolScopeCostVariancePercent` DECIMAL(5,2) NULL DEFAULT 10.00', 'SELECT "skip: systemsetting.nolScopeCostVariancePercent"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_has_column := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = @__nolsaf_table AND COLUMN_NAME = 'nolScopeEnabled'
);
SET @__nolsaf_sql := IF(@__nolsaf_has_column = 0, 'ALTER TABLE `systemsetting` ADD COLUMN `nolScopeEnabled` TINYINT(1) NULL DEFAULT 1', 'SELECT "skip: systemsetting.nolScopeEnabled"');
PREPARE __nolsaf_stmt FROM @__nolsaf_sql; EXECUTE __nolsaf_stmt; DEALLOCATE PREPARE __nolsaf_stmt;
