-- Migration: Add PropertyImage and PaymentEvent models
-- Created: 2025-01-XX
-- Description: Adds property image management and payment event tracking functionality

-- Create property_images table
CREATE TABLE IF NOT EXISTS `property_images` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `propertyId` INT NOT NULL,
  `storageKey` VARCHAR(255) NULL UNIQUE COMMENT 'S3 key or file identifier',
  `url` TEXT NULL COMMENT 'Original image URL',
  `thumbnailKey` VARCHAR(255) NULL COMMENT 'Thumbnail storage key',
  `thumbnailUrl` TEXT NULL COMMENT 'Thumbnail URL',
  `width` INT NULL COMMENT 'Image width in pixels',
  `height` INT NULL COMMENT 'Image height in pixels',
  `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING, PROCESSING, READY, REJECTED',
  `moderationNote` TEXT NULL COMMENT 'Moderation note if rejected or needs review',
  `moderatedAt` DATETIME NULL COMMENT 'Timestamp when image was moderated',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `property_images_propertyId_idx` (`propertyId`),
  INDEX `property_images_status_idx` (`status`),
  INDEX `property_images_storageKey_idx` (`storageKey`),
  INDEX `property_images_createdAt_idx` (`createdAt`),
  
  CONSTRAINT `property_images_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create payment_events table
CREATE TABLE IF NOT EXISTS `payment_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `provider` VARCHAR(50) NOT NULL COMMENT 'AZAMPAY, MPESA, TIGOPESA, etc.',
  `eventId` VARCHAR(255) NOT NULL UNIQUE COMMENT 'Unique event ID from the payment provider',
  `invoiceId` INT NULL COMMENT 'Invoice this payment event is associated with',
  `amount` DECIMAL(12, 2) NOT NULL COMMENT 'Payment amount',
  `currency` VARCHAR(10) NOT NULL DEFAULT 'TZS' COMMENT 'Currency code',
  `status` VARCHAR(50) NOT NULL DEFAULT 'PENDING' COMMENT 'SUCCESS, FAILED, PENDING',
  `payload` JSON NULL COMMENT 'Raw payload from payment provider',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `payment_events_provider_idx` (`provider`),
  INDEX `payment_events_eventId_idx` (`eventId`),
  INDEX `payment_events_invoiceId_idx` (`invoiceId`),
  INDEX `payment_events_status_idx` (`status`),
  INDEX `payment_events_createdAt_idx` (`createdAt`),
  
  CONSTRAINT `payment_events_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
