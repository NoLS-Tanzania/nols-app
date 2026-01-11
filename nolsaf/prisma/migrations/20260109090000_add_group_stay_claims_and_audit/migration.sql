-- Add missing Group Stay claims + audit tables and required group_bookings columns
--
-- NOTE: This migration is written to be resilient to partially-updated databases.
-- It uses INFORMATION_SCHEMA checks so it can apply even if some columns/keys already exist.

-- AlterTable (idempotent)
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND COLUMN_NAME = 'confirmedPropertyId') = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `confirmedPropertyId` INTEGER NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND COLUMN_NAME = 'propertyConfirmedAt') = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `propertyConfirmedAt` DATETIME(3) NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND COLUMN_NAME = 'assignedOwnerId') = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `assignedOwnerId` INTEGER NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND COLUMN_NAME = 'ownerAssignedAt') = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `ownerAssignedAt` DATETIME(3) NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND COLUMN_NAME = 'isOpenForClaims') = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `isOpenForClaims` BOOLEAN NOT NULL DEFAULT false',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND COLUMN_NAME = 'openedForClaimsAt') = 0,
  'ALTER TABLE `group_bookings` ADD COLUMN `openedForClaimsAt` DATETIME(3) NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- CreateIndex (idempotent)
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND INDEX_NAME = 'group_bookings_assignedOwnerId_idx') = 0,
  'CREATE INDEX `group_bookings_assignedOwnerId_idx` ON `group_bookings`(`assignedOwnerId`)',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND INDEX_NAME = 'group_bookings_confirmedPropertyId_idx') = 0,
  'CREATE INDEX `group_bookings_confirmedPropertyId_idx` ON `group_bookings`(`confirmedPropertyId`)',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- AddForeignKey (idempotent)
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND CONSTRAINT_NAME = 'group_bookings_assignedOwnerId_fkey') = 0,
  'ALTER TABLE `group_bookings` ADD CONSTRAINT `group_bookings_assignedOwnerId_fkey` FOREIGN KEY (`assignedOwnerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'group_bookings' AND CONSTRAINT_NAME = 'group_bookings_confirmedPropertyId_fkey') = 0,
  'ALTER TABLE `group_bookings` ADD CONSTRAINT `group_bookings_confirmedPropertyId_fkey` FOREIGN KEY (`confirmedPropertyId`) REFERENCES `Property`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- CreateTable
CREATE TABLE IF NOT EXISTS `GroupBookingAudit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupBookingId` INTEGER NOT NULL,
    `adminId` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GroupBookingAudit_groupBookingId_idx`(`groupBookingId`),
    INDEX `GroupBookingAudit_adminId_idx`(`adminId`),
    INDEX `GroupBookingAudit_action_idx`(`action`),
    INDEX `GroupBookingAudit_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'GroupBookingAudit' AND CONSTRAINT_NAME = 'GroupBookingAudit_groupBookingId_fkey') = 0,
  'ALTER TABLE `GroupBookingAudit` ADD CONSTRAINT `GroupBookingAudit_groupBookingId_fkey` FOREIGN KEY (`groupBookingId`) REFERENCES `group_bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- AddForeignKey
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'GroupBookingAudit' AND CONSTRAINT_NAME = 'GroupBookingAudit_adminId_fkey') = 0,
  'ALTER TABLE `GroupBookingAudit` ADD CONSTRAINT `GroupBookingAudit_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- CreateTable
CREATE TABLE IF NOT EXISTS `group_booking_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupBookingId` INTEGER NOT NULL,
    `senderId` INTEGER NULL,
    `senderRole` VARCHAR(20) NOT NULL,
    `senderName` VARCHAR(200) NULL,
    `messageType` VARCHAR(50) NULL,
    `body` TEXT NOT NULL,
    `isInternal` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `group_booking_messages_groupBookingId_idx`(`groupBookingId`),
    INDEX `group_booking_messages_senderId_idx`(`senderId`),
    INDEX `group_booking_messages_senderRole_idx`(`senderRole`),
    INDEX `group_booking_messages_createdAt_idx`(`createdAt`),
    INDEX `group_booking_messages_groupBookingId_createdAt_idx`(`groupBookingId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'group_booking_messages' AND CONSTRAINT_NAME = 'group_booking_messages_groupBookingId_fkey') = 0,
  'ALTER TABLE `group_booking_messages` ADD CONSTRAINT `group_booking_messages_groupBookingId_fkey` FOREIGN KEY (`groupBookingId`) REFERENCES `group_bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- AddForeignKey
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'group_booking_messages' AND CONSTRAINT_NAME = 'group_booking_messages_senderId_fkey') = 0,
  'ALTER TABLE `group_booking_messages` ADD CONSTRAINT `group_booking_messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- CreateTable
CREATE TABLE IF NOT EXISTS `group_booking_claims` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupBookingId` INTEGER NOT NULL,
    `ownerId` INTEGER NOT NULL,
    `propertyId` INTEGER NOT NULL,
    `offeredPricePerNight` DECIMAL(12, 2) NOT NULL,
    `discountPercent` DECIMAL(5, 2) NULL,
    `specialOffers` TEXT NULL,
    `notes` TEXT NULL,
    `totalAmount` DECIMAL(12, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'TZS',
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `group_booking_claims_groupBookingId_ownerId_key`(`groupBookingId`, `ownerId`),
    INDEX `group_booking_claims_groupBookingId_idx`(`groupBookingId`),
    INDEX `group_booking_claims_ownerId_idx`(`ownerId`),
    INDEX `group_booking_claims_status_idx`(`status`),
    INDEX `group_booking_claims_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'group_booking_claims' AND CONSTRAINT_NAME = 'group_booking_claims_groupBookingId_fkey') = 0,
  'ALTER TABLE `group_booking_claims` ADD CONSTRAINT `group_booking_claims_groupBookingId_fkey` FOREIGN KEY (`groupBookingId`) REFERENCES `group_bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- AddForeignKey
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'group_booking_claims' AND CONSTRAINT_NAME = 'group_booking_claims_ownerId_fkey') = 0,
  'ALTER TABLE `group_booking_claims` ADD CONSTRAINT `group_booking_claims_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- AddForeignKey
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'group_booking_claims' AND CONSTRAINT_NAME = 'group_booking_claims_propertyId_fkey') = 0,
  'ALTER TABLE `group_booking_claims` ADD CONSTRAINT `group_booking_claims_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- AddForeignKey
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'group_booking_claims' AND CONSTRAINT_NAME = 'group_booking_claims_reviewedBy_fkey') = 0,
  'ALTER TABLE `group_booking_claims` ADD CONSTRAINT `group_booking_claims_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;
