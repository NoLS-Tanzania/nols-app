-- Idempotent add of driver-profile columns on `user`.
--
-- These columns (`driverGoals`, `languages`) may already exist on some databases
-- because they were applied out-of-band (raw SQL / a lost migration file) during
-- development. MySQL 8 / Aiven has no `ADD COLUMN IF NOT EXISTS`, so we guard each
-- ALTER with an INFORMATION_SCHEMA check via a prepared statement. This makes the
-- migration safe to `migrate deploy` whether or not the column is already present.

-- user.driverGoals (weekly goals set by the driver, synced across devices)
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'driverGoals'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE `user` ADD COLUMN `driverGoals` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- user.languages (languages the driver can speak; JSON array of strings)
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = 'languages'
);
SET @ddl := IF(@col_exists = 0, 'ALTER TABLE `user` ADD COLUMN `languages` JSON NULL', 'SELECT 1');
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
