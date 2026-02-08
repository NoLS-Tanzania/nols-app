-- CreateTable
CREATE TABLE `transport_booking_offers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `bookingId` INT NOT NULL,
  `driverId` INT NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'OFFERED',
  `radiusKm` DECIMAL(5,2) NULL,
  `distanceKm` DECIMAL(6,3) NULL,
  `score` DECIMAL(8,2) NULL,
  `offeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `expiresAt` DATETIME(3) NOT NULL,
  `respondedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `transport_booking_offers_bookingId_status_expiresAt_idx` (`bookingId`, `status`, `expiresAt`),
  INDEX `transport_booking_offers_driverId_status_expiresAt_idx` (`driverId`, `status`, `expiresAt`),
  CONSTRAINT `transport_booking_offers_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `TransportBooking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `transport_booking_offers_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
