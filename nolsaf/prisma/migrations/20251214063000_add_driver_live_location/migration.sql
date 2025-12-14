-- Add DriverLiveLocation + DriverLocationPing for live map operations
-- MySQL 8+ (Prisma)

-- CreateTable
CREATE TABLE `driver_live_locations` (
  `driverId` INTEGER NOT NULL,
  `lat` DECIMAL(10, 6) NOT NULL,
  `lng` DECIMAL(10, 6) NOT NULL,
  `headingDeg` INTEGER NULL,
  `speedMps` DECIMAL(7, 2) NULL,
  `accuracyM` DECIMAL(7, 2) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `driver_live_locations_updatedAt_idx`(`updatedAt`),
  INDEX `driver_live_locations_lat_lng_idx`(`lat`, `lng`),
  PRIMARY KEY (`driverId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `driver_location_pings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `driverId` INTEGER NOT NULL,
  `transportBookingId` INTEGER NULL,
  `lat` DECIMAL(10, 6) NOT NULL,
  `lng` DECIMAL(10, 6) NOT NULL,
  `headingDeg` INTEGER NULL,
  `speedMps` DECIMAL(7, 2) NULL,
  `accuracyM` DECIMAL(7, 2) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `driver_location_pings_driverId_createdAt_idx`(`driverId`, `createdAt`),
  INDEX `driver_location_pings_transportBookingId_createdAt_idx`(`transportBookingId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `driver_live_locations`
  ADD CONSTRAINT `driver_live_locations_driverId_fkey`
  FOREIGN KEY (`driverId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_location_pings`
  ADD CONSTRAINT `driver_location_pings_driverId_fkey`
  FOREIGN KEY (`driverId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `driver_location_pings`
  ADD CONSTRAINT `driver_location_pings_transportBookingId_fkey`
  FOREIGN KEY (`transportBookingId`) REFERENCES `TransportBooking`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

