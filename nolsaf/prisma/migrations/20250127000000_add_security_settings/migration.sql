-- Add Security & Cybersecurity fields to SystemSetting table
ALTER TABLE `SystemSetting` 
  ADD COLUMN `requireAdmin2FA` TINYINT(1) NULL DEFAULT 0,
  ADD COLUMN `minPasswordLength` INT NULL DEFAULT 8,
  ADD COLUMN `requirePasswordUppercase` TINYINT(1) NULL DEFAULT 0,
  ADD COLUMN `requirePasswordLowercase` TINYINT(1) NULL DEFAULT 0,
  ADD COLUMN `requirePasswordNumber` TINYINT(1) NULL DEFAULT 0,
  ADD COLUMN `requirePasswordSpecial` TINYINT(1) NULL DEFAULT 0,
  ADD COLUMN `sessionIdleMinutes` INT NULL DEFAULT 30,
  ADD COLUMN `maxSessionDurationHours` INT NULL DEFAULT 24,
  ADD COLUMN `forceLogoutOnPasswordChange` TINYINT(1) NULL DEFAULT 1,
  ADD COLUMN `ipAllowlist` VARCHAR(1000) NULL,
  ADD COLUMN `enableIpAllowlist` TINYINT(1) NULL DEFAULT 0,
  ADD COLUMN `apiRateLimitPerMinute` INT NULL DEFAULT 100,
  ADD COLUMN `maxLoginAttempts` INT NULL DEFAULT 5,
  ADD COLUMN `accountLockoutDurationMinutes` INT NULL DEFAULT 30,
  ADD COLUMN `enableSecurityAuditLogging` TINYINT(1) NULL DEFAULT 1,
  ADD COLUMN `logFailedLoginAttempts` TINYINT(1) NULL DEFAULT 1,
  ADD COLUMN `alertOnSuspiciousActivity` TINYINT(1) NULL DEFAULT 0;

