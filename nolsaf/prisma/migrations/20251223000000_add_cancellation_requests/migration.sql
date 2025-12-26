-- Add cancellation requests table
-- MySQL 8+

CREATE TABLE `cancellation_requests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `bookingId` INT NOT NULL,
  `userId` INT NOT NULL,
  `bookingCode` VARCHAR(32) NOT NULL,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  `reason` TEXT NULL,
  `reviewedAt` DATETIME NULL,
  `reviewedBy` INT NULL,
  `decisionNote` TEXT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `cancellation_requests_bookingId_idx` (`bookingId`),
  INDEX `cancellation_requests_userId_idx` (`userId`),
  INDEX `cancellation_requests_bookingCode_idx` (`bookingCode`),
  INDEX `cancellation_requests_status_idx` (`status`),
  INDEX `cancellation_requests_reviewedBy_idx` (`reviewedBy`),
  CONSTRAINT `cancellation_requests_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cancellation_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cancellation_requests_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `User` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
);


