-- Migration: Add PropertyReview model
-- Created: 2025-12-11
-- Description: Adds property reviews and ratings functionality

-- Create property_reviews table
CREATE TABLE IF NOT EXISTS `property_reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `propertyId` INT NOT NULL,
  `userId` INT NOT NULL,
  `rating` INT NOT NULL COMMENT '1-5 stars',
  `title` VARCHAR(200) NULL,
  `comment` TEXT NULL,
  `categoryRatings` JSON NULL COMMENT 'e.g., { cleanliness: 5, location: 4, value: 5, service: 4 }',
  `isVerified` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Guest actually stayed',
  `isPublished` BOOLEAN NOT NULL DEFAULT TRUE,
  `isHidden` BOOLEAN NOT NULL DEFAULT FALSE,
  `bookingId` INT NULL,
  `ownerResponse` TEXT NULL,
  `ownerResponseAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `property_reviews_propertyId_idx` (`propertyId`),
  INDEX `property_reviews_userId_idx` (`userId`),
  INDEX `property_reviews_bookingId_idx` (`bookingId`),
  INDEX `property_reviews_rating_idx` (`rating`),
  INDEX `property_reviews_isPublished_isHidden_idx` (`isPublished`, `isHidden`),
  INDEX `property_reviews_createdAt_idx` (`createdAt`),
  
  CONSTRAINT `property_reviews_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE,
  CONSTRAINT `property_reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `property_reviews_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL,
  
  CHECK (`rating` >= 1 AND `rating` <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
