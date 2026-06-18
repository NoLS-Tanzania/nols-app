-- Idempotent add of the driver-goals column on `user`.
--
-- `user.languages` is already added by migration
-- 20260615090000_add_user_and_booking_languages, so this migration only adds
-- `driverGoals`. The column may already exist on some databases (applied
-- out-of-band during development). MySQL 8 / Aiven has no `ADD COLUMN IF NOT
-- EXISTS`, so we guard the ALTER with an INFORMATION_SCHEMA check via a prepared
-- statement. This makes the migration safe to `migrate deploy` whether or not
-- the column is already present.

-- user.driverGoals (weekly goals set by the driver, synced across devices)
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'driverGoals'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE `user` ADD COLUMN `driverGoals` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
