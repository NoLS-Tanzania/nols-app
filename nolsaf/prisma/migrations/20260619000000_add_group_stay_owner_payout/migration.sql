-- Group stay owner payout tracking (manual admin disbursement after owner-marked check-in)

-- AlterTable (idempotent)
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND COLUMN_NAME = 'checkedInAt') = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `checkedInAt` DATETIME(3) NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND COLUMN_NAME = 'ownerPayoutAmount') = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `ownerPayoutAmount` DECIMAL(12, 2) NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND COLUMN_NAME = 'ownerPayoutStatus') = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `ownerPayoutStatus` VARCHAR(20) NOT NULL DEFAULT ''NONE''',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND COLUMN_NAME = 'ownerPayoutPaidAt') = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `ownerPayoutPaidAt` DATETIME(3) NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND COLUMN_NAME = 'ownerPayoutRef') = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `ownerPayoutRef` VARCHAR(120) NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- CreateIndex (idempotent)
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND INDEX_NAME = 'group_bookings_ownerPayoutStatus_idx') = 0,
  'CREATE INDEX `group_bookings_ownerPayoutStatus_idx` ON `group_bookings`(`ownerPayoutStatus`)',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;
