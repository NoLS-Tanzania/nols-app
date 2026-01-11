-- Manual schema patch: add Booking.driverId (column + index + FK)
-- Safe to re-run: uses information_schema checks.
-- Target: MySQL 8+ / MariaDB
--
-- Run this against your development DB (the one your API points at).
-- Example (MySQL client):
--   mysql -u root -p -h 127.0.0.1 nolsaf < scripts/manual_add_booking_driverId.sql

SET @db := DATABASE();

-- 1) Add column Booking.driverId
SELECT COUNT(*) INTO @has_driverId_col
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Booking' AND COLUMN_NAME = 'driverId';

SET @sql := IF(
  @has_driverId_col = 0,
  'ALTER TABLE `Booking` ADD COLUMN `driverId` INT NULL;',
  'SELECT "Booking.driverId already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) Add index on Booking(driverId)
SELECT COUNT(*) INTO @has_driverId_index
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'Booking' AND INDEX_NAME = 'Booking_driverId_idx';

SET @sql := IF(
  @has_driverId_index = 0,
  'ALTER TABLE `Booking` ADD INDEX `Booking_driverId_idx` (`driverId`);',
  'SELECT "Booking_driverId_idx already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3) Add FK Booking(driverId) -> User(id)
-- Note: constraint name chosen to match Prisma naming style.
SELECT COUNT(*) INTO @has_driverId_fk
FROM information_schema.TABLE_CONSTRAINTS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'Booking'
  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
  AND CONSTRAINT_NAME = 'Booking_driverId_fkey';

SET @sql := IF(
  @has_driverId_fk = 0,
  'ALTER TABLE `Booking` ADD CONSTRAINT `Booking_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;',
  'SELECT "Booking_driverId_fkey already exists" AS info;'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
