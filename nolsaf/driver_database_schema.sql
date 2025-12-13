-- =========================================================
--  NoLSAF: Driver Database Schema
--  Comprehensive MySQL schema for all driver functionality
--  Target: MySQL 8+ (works on 5.7+)
-- =========================================================

USE nolsaf;

-- ---------- Driver Location (Real-time GPS tracking) ----------
DROP TABLE IF EXISTS `DriverLocation`;
CREATE TABLE `DriverLocation` (
  `driverId`      INT NOT NULL PRIMARY KEY,
  `lat`           DECIMAL(10,7) NOT NULL,
  `lng`           DECIMAL(10,7) NOT NULL,
  `available`     TINYINT(1) NOT NULL DEFAULT 1,
  `heading`       DECIMAL(5,2) NULL,              -- Direction in degrees (0-360)
  `speed`         DECIMAL(5,2) NULL,               -- Speed in km/h
  `updatedAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `DriverLocation_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  INDEX (`lat`, `lng`),                           -- For proximity searches
  INDEX (`available`),
  INDEX (`updatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Driver Availability (Online/Offline status) ----------
DROP TABLE IF EXISTS `DriverAvailability`;
CREATE TABLE `DriverAvailability` (
  `driverId`      INT NOT NULL PRIMARY KEY,
  `available`     TINYINT(1) NOT NULL DEFAULT 0,
  `lastSeenAt`    DATETIME NULL,
  `updatedAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `DriverAvailability_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  INDEX (`available`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Driver Documents (License, Insurance, etc.) ----------
DROP TABLE IF EXISTS `DriverDocument`;
CREATE TABLE `DriverDocument` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `driverId`      INT NOT NULL,
  `type`          ENUM('LICENSE','INSURANCE','REGISTRATION','PERMIT','OTHER') NOT NULL,
  `documentNumber` VARCHAR(100) NULL,
  `documentUrl`   VARCHAR(500) NULL,              -- URL to uploaded document
  `expiryDate`    DATE NULL,
  `status`        ENUM('PENDING','APPROVED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `rejectionReason` TEXT NULL,
  `approvedBy`    INT NULL,                       -- Admin user ID
  `approvedAt`    DATETIME NULL,
  `createdAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `DriverDocument_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `DriverDocument_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  INDEX (`driverId`),
  INDEX (`type`),
  INDEX (`status`),
  INDEX (`expiryDate`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Driver Sessions (Track online hours) ----------
DROP TABLE IF EXISTS `DriverSession`;
CREATE TABLE `DriverSession` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `driverId`      INT NOT NULL,
  `startedAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `endedAt`       DATETIME NULL,
  `durationMinutes` INT NULL,                     -- Calculated duration
  `createdAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT `DriverSession_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  INDEX (`driverId`),
  INDEX (`startedAt`),
  INDEX (`endedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Trips (Ride bookings for drivers) ----------
DROP TABLE IF EXISTS `Trip`;
CREATE TABLE `Trip` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `driverId`      INT NULL,                       -- Assigned driver
  `bookingId`     INT NULL,                       -- Link to Booking if exists
  `passengerId`   INT NULL,                        -- Customer/User ID
  `passengerName` VARCHAR(160) NULL,
  `passengerPhone` VARCHAR(40) NULL,
  `passengerPhoto` VARCHAR(500) NULL,
  `passengerRating` DECIMAL(3,2) NULL,            -- Passenger's rating
  
  -- Trip details
  `tripCode`      VARCHAR(60) NULL UNIQUE,        -- Unique trip reference
  `tripType`      ENUM('STANDARD','PREMIUM','EMERGENCY','SCHEDULED') NOT NULL DEFAULT 'STANDARD',
  `status`        ENUM('PENDING','ASSIGNED','ACCEPTED','ARRIVED_PICKUP','PICKED_UP','IN_TRANSIT','ARRIVED_DESTINATION','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  
  -- Pickup location
  `pickupAddress` VARCHAR(500) NULL,
  `pickupLat`     DECIMAL(10,7) NULL,
  `pickupLng`     DECIMAL(10,7) NULL,
  `pickupNotes`   TEXT NULL,
  
  -- Dropoff location
  `dropoffAddress` VARCHAR(500) NULL,
  `dropoffLat`    DECIMAL(10,7) NULL,
  `dropoffLng`    DECIMAL(10,7) NULL,
  `dropoffNotes`  TEXT NULL,
  
  -- Trip metrics
  `distance`      DECIMAL(8,2) NULL,               -- Distance in km
  `duration`      INT NULL,                        -- Duration in minutes
  `scheduledAt`   DATETIME NULL,                   -- Scheduled pickup time
  `pickedUpAt`    DATETIME NULL,
  `completedAt`   DATETIME NULL,
  
  -- Pricing
  `baseFare`      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `distanceFare`  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `timeFare`      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `surgeMultiplier` DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  `tip`           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `bonus`         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `totalFare`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `paymentMethod` ENUM('CASH','CARD','MOBILE_MONEY','WALLET') NULL,
  `paymentStatus` ENUM('PENDING','PAID','FAILED','REFUNDED') NOT NULL DEFAULT 'PENDING',
  
  -- Ratings and reviews
  `driverRating`  DECIMAL(3,2) NULL,               -- Driver's rating of passenger
  `passengerRating` DECIMAL(3,2) NULL,             -- Passenger's rating of driver
  `driverReview`  TEXT NULL,
  `passengerReview` TEXT NULL,
  
  -- Cancellation
  `cancelledBy`   ENUM('DRIVER','PASSENGER','SYSTEM') NULL,
  `cancellationReason` TEXT NULL,
  `cancelledAt`   DATETIME NULL,
  
  `createdAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `Trip_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `Trip_passengerId_fkey` FOREIGN KEY (`passengerId`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `Trip_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL,
  INDEX (`driverId`),
  INDEX (`passengerId`),
  INDEX (`status`),
  INDEX (`tripType`),
  INDEX (`scheduledAt`),
  INDEX (`createdAt`),
  INDEX (`tripCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Update Booking table to support driver trips ----------
-- Add driver-related fields to existing Booking table
-- Note: Run these ALTER statements only if Booking table already exists without these fields
-- If column already exists, you'll get an error - that's okay, just skip that line

-- Uncomment and run these one by one, checking for errors:
-- ALTER TABLE `Booking` ADD COLUMN `driverId` INT NULL;
-- ALTER TABLE `Booking` ADD COLUMN `pickupLat` DECIMAL(10,7) NULL;
-- ALTER TABLE `Booking` ADD COLUMN `pickupLng` DECIMAL(10,7) NULL;
-- ALTER TABLE `Booking` ADD COLUMN `dropoffLat` DECIMAL(10,7) NULL;
-- ALTER TABLE `Booking` ADD COLUMN `dropoffLng` DECIMAL(10,7) NULL;
-- ALTER TABLE `Booking` ADD COLUMN `pickupAddress` VARCHAR(500) NULL;
-- ALTER TABLE `Booking` ADD COLUMN `dropoffAddress` VARCHAR(500) NULL;
-- ALTER TABLE `Booking` ADD COLUMN `passengerName` VARCHAR(160) NULL;
-- ALTER TABLE `Booking` ADD COLUMN `price` DECIMAL(10,2) NULL;
-- ALTER TABLE `Booking` ADD COLUMN `fare` DECIMAL(10,2) NULL;
-- ALTER TABLE `Booking` ADD COLUMN `distance` DECIMAL(8,2) NULL;
-- ALTER TABLE `Booking` ADD COLUMN `scheduledAt` DATETIME NULL;
-- ALTER TABLE `Booking` ADD INDEX `idx_driverId` (`driverId`);
-- ALTER TABLE `Booking` ADD CONSTRAINT `Booking_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE SET NULL;

-- ---------- Driver Reviews (Ratings and feedback) ----------
DROP TABLE IF EXISTS `DriverReview`;
CREATE TABLE `DriverReview` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `driverId`      INT NOT NULL,
  `tripId`        INT NULL,
  `reviewerId`    INT NULL,                       -- User who gave the review
  `reviewerName`  VARCHAR(160) NULL,
  `rating`        TINYINT NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `comment`       TEXT NULL,
  `createdAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT `DriverReview_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `DriverReview_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE SET NULL,
  CONSTRAINT `DriverReview_reviewerId_fkey` FOREIGN KEY (`reviewerId`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  INDEX (`driverId`),
  INDEX (`tripId`),
  INDEX (`rating`),
  INDEX (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Driver Payouts (Earnings and payments) ----------
DROP TABLE IF EXISTS `DriverPayout`;
CREATE TABLE `DriverPayout` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `driverId`      INT NOT NULL,
  `tripId`        INT NULL,
  `invoiceId`     INT NULL,
  `payoutNumber` VARCHAR(60) NULL UNIQUE,
  `amount`       DECIMAL(10,2) NOT NULL,
  `commission`   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `netAmount`    DECIMAL(10,2) NOT NULL,
  `paymentMethod` ENUM('BANK_TRANSFER','MOBILE_MONEY','CASH','WALLET') NULL,
  `paymentRef`   VARCHAR(200) NULL,               -- Transaction reference
  `status`       ENUM('PENDING','PROCESSING','PAID','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `paidAt`       DATETIME NULL,
  `processedBy`  INT NULL,                        -- Admin user ID
  `notes`        TEXT NULL,
  `createdAt`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `DriverPayout_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `DriverPayout_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE SET NULL,
  CONSTRAINT `DriverPayout_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL,
  CONSTRAINT `DriverPayout_processedBy_fkey` FOREIGN KEY (`processedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  INDEX (`driverId`),
  INDEX (`status`),
  INDEX (`paidAt`),
  INDEX (`payoutNumber`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Driver Safety Events ----------
DROP TABLE IF EXISTS `DriverSafety`;
CREATE TABLE `DriverSafety` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `driverId`      INT NOT NULL,
  `tripId`        INT NULL,
  `eventType`     ENUM('SOS','ACCIDENT','BREAKDOWN','HARASSMENT','OTHER') NOT NULL,
  `description`   TEXT NULL,
  `location`      VARCHAR(500) NULL,
  `lat`           DECIMAL(10,7) NULL,
  `lng`           DECIMAL(10,7) NULL,
  `status`        ENUM('REPORTED','INVESTIGATING','RESOLVED','FALSE_ALARM') NOT NULL DEFAULT 'REPORTED',
  `reportedAt`    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolvedAt`    DATETIME NULL,
  `resolvedBy`    INT NULL,                       -- Admin user ID
  `notes`         TEXT NULL,
  
  CONSTRAINT `DriverSafety_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `DriverSafety_tripId_fkey` FOREIGN KEY (`tripId`) REFERENCES `Trip`(`id`) ON DELETE SET NULL,
  CONSTRAINT `DriverSafety_resolvedBy_fkey` FOREIGN KEY (`resolvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  INDEX (`driverId`),
  INDEX (`eventType`),
  INDEX (`status`),
  INDEX (`reportedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Driver Reminders ----------
DROP TABLE IF EXISTS `DriverReminder`;
CREATE TABLE `DriverReminder` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `driverId`      INT NOT NULL,
  `type`          ENUM('info','warning','error','success') NOT NULL DEFAULT 'info',
  `message`       VARCHAR(500) NOT NULL,
  `action`        VARCHAR(100) NULL,                 -- Action button text
  `actionLink`    VARCHAR(500) NULL,               -- Link to action
  `expiresAt`     DATETIME NULL,                   -- Auto-dismiss after this time
  `read`          TINYINT(1) NOT NULL DEFAULT 0,
  `readAt`        DATETIME NULL,
  `meta`          JSON NULL,                       -- Additional metadata
  `createdAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT `DriverReminder_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  INDEX (`driverId`),
  INDEX (`type`),
  INDEX (`read`),
  INDEX (`expiresAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Driver Bonuses ----------
DROP TABLE IF EXISTS `DriverBonus`;
CREATE TABLE `DriverBonus` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `driverId`      INT NOT NULL,
  `amount`       DECIMAL(10,2) NOT NULL,
  `period`       VARCHAR(50) NULL,                -- e.g., "January 2024"
  `reason`        VARCHAR(500) NULL,
  `status`        ENUM('PENDING','APPROVED','PAID','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `approvedBy`    INT NULL,                        -- Admin user ID
  `approvedAt`    DATETIME NULL,
  `paidAt`        DATETIME NULL,
  `payoutId`     INT NULL,                        -- Link to payout if paid
  `createdAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT `DriverBonus_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `DriverBonus_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `DriverBonus_payoutId_fkey` FOREIGN KEY (`payoutId`) REFERENCES `DriverPayout`(`id`) ON DELETE SET NULL,
  INDEX (`driverId`),
  INDEX (`status`),
  INDEX (`period`),
  INDEX (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Update User table for driver-specific fields ----------
-- Add driver-specific fields to User table
-- Note: Run these ALTER statements one by one, checking for errors
-- If column already exists, you'll get an error - that's okay, just skip that line

-- Uncomment and run these one by one:
-- ALTER TABLE `User` ADD COLUMN `rating` DECIMAL(3,2) NULL;
-- ALTER TABLE `User` ADD COLUMN `totalTrips` INT NOT NULL DEFAULT 0;
-- ALTER TABLE `User` ADD COLUMN `totalEarnings` DECIMAL(12,2) NOT NULL DEFAULT 0.00;
-- ALTER TABLE `User` ADD COLUMN `acceptanceRate` DECIMAL(5,2) NULL;
-- ALTER TABLE `User` ADD COLUMN `vehicleType` VARCHAR(50) NULL;
-- ALTER TABLE `User` ADD COLUMN `vehicleModel` VARCHAR(100) NULL;
-- ALTER TABLE `User` ADD COLUMN `vehiclePlate` VARCHAR(20) NULL;
-- ALTER TABLE `User` ADD COLUMN `licenseNumber` VARCHAR(100) NULL;
-- ALTER TABLE `User` ADD COLUMN `avatarUrl` VARCHAR(500) NULL;
-- ALTER TABLE `User` ADD COLUMN `dateOfBirth` DATE NULL;
-- ALTER TABLE `User` ADD COLUMN `gender` ENUM('MALE','FEMALE','OTHER') NULL;
-- ALTER TABLE `User` ADD COLUMN `nationality` VARCHAR(80) NULL;
-- ALTER TABLE `User` ADD COLUMN `timezone` VARCHAR(50) NULL DEFAULT 'Africa/Dar_es_Salaam';
-- ALTER TABLE `User` ADD INDEX `idx_rating` (`rating`);
-- ALTER TABLE `User` ADD INDEX `idx_totalTrips` (`totalTrips`);

-- ---------- Demand Zones (For map display) ----------
DROP TABLE IF EXISTS `DemandZone`;
CREATE TABLE `DemandZone` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `name`          VARCHAR(200) NOT NULL,
  `level`         ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  `region`        VARCHAR(120) NULL,
  `district`      VARCHAR(120) NULL,
  `centerLat`     DECIMAL(10,7) NULL,
  `centerLng`     DECIMAL(10,7) NULL,
  `radius`        DECIMAL(8,2) NULL,               -- Radius in km
  `active`        TINYINT(1) NOT NULL DEFAULT 1,
  `updatedAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX (`level`),
  INDEX (`active`),
  INDEX (`region`, `district`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================================
--  Sample Data (Optional - for testing)
-- =========================================================

-- Sample demand zones
INSERT INTO `DemandZone` (`name`, `level`, `region`, `district`, `centerLat`, `centerLng`, `radius`) VALUES
('City Center', 'high', 'Dar es Salaam', 'Kinondoni', -6.7924, 39.2083, 5.0),
('Airport Rd', 'medium', 'Dar es Salaam', 'Kinondoni', -6.8024, 39.2183, 3.0),
('Masaki', 'high', 'Dar es Salaam', 'Kinondoni', -6.7800, 39.2500, 2.5),
('Mikocheni', 'medium', 'Dar es Salaam', 'Kinondoni', -6.7900, 39.2300, 2.0),
('Sinza', 'low', 'Dar es Salaam', 'Kinondoni', -6.8000, 39.2200, 2.0)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- =========================================================
--  Notes:
--  1. All tables use InnoDB engine for foreign key support
--  2. All timestamps use DATETIME with automatic updates
--  3. Decimal fields use appropriate precision for coordinates and money
--  4. Indexes are optimized for common queries (driverId, status, dates)
--  5. Foreign keys ensure data integrity with CASCADE/SET NULL as appropriate
--  6. The Booking table ALTER statements should be run carefully if table already exists
-- =========================================================

