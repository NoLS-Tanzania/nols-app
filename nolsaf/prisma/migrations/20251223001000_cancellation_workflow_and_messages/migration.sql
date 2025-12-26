-- Extend cancellation_requests workflow fields and add cancellation_messages table
-- MySQL 8+

-- 1) Add policy snapshot fields + default status update
ALTER TABLE `cancellation_requests`
  MODIFY COLUMN `status` VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED',
  ADD COLUMN `policyEligible` BOOLEAN NOT NULL DEFAULT FALSE AFTER `reason`,
  ADD COLUMN `policyRefundPercent` INT NULL AFTER `policyEligible`,
  ADD COLUMN `policyRule` VARCHAR(40) NULL AFTER `policyRefundPercent`;

-- 2) Backfill existing rows (older default was PENDING)
UPDATE `cancellation_requests`
SET `status` = 'SUBMITTED'
WHERE `status` = 'PENDING';

-- 3) Create messages table for admin<->customer communication
CREATE TABLE `cancellation_messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cancellationRequestId` INT NOT NULL,
  `senderId` INT NOT NULL,
  `senderRole` VARCHAR(20) NOT NULL,
  `body` TEXT NOT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `cancellation_messages_cancellationRequestId_idx` (`cancellationRequestId`),
  INDEX `cancellation_messages_senderId_idx` (`senderId`),
  INDEX `cancellation_messages_createdAt_idx` (`createdAt`),
  CONSTRAINT `cancellation_messages_request_fkey` FOREIGN KEY (`cancellationRequestId`) REFERENCES `cancellation_requests` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cancellation_messages_sender_fkey` FOREIGN KEY (`senderId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
);


