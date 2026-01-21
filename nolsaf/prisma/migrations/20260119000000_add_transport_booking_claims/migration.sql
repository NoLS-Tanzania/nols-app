-- Add VIP driver flag and transport booking claims table

-- 1) VIP driver flag
SET @__nolsaf_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'User'
    AND COLUMN_NAME = 'isVipDriver'
);

SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `User` ADD COLUMN `isVipDriver` TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT "skip: User.isVipDriver already exists"'
);

PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

-- 2) Competitive claims table (max 5 claims enforced in API)
CREATE TABLE IF NOT EXISTS `transport_booking_claims` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `bookingId` INT NOT NULL,
  `driverId` INT NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `reviewedAt` DATETIME(3) NULL,
  `reviewedBy` INT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),

  UNIQUE KEY `transport_booking_claims_bookingId_driverId_key` (`bookingId`, `driverId`),
  KEY `transport_booking_claims_bookingId_idx` (`bookingId`),
  KEY `transport_booking_claims_driverId_idx` (`driverId`),
  KEY `transport_booking_claims_status_idx` (`status`),
  KEY `transport_booking_claims_createdAt_idx` (`createdAt`),

  CONSTRAINT `transport_booking_claims_bookingId_fkey`
    FOREIGN KEY (`bookingId`) REFERENCES `TransportBooking`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `transport_booking_claims_driverId_fkey`
    FOREIGN KEY (`driverId`) REFERENCES `User`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `transport_booking_claims_reviewedBy_fkey`
    FOREIGN KEY (`reviewedBy`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
