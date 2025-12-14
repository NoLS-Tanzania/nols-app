-- Migration: Add PlanRequest model
-- Created: 2025-01-XX
-- Description: Adds plan_requests table for "Plan With Us" custom trip planning requests

-- Create plan_requests table
CREATE TABLE IF NOT EXISTS `plan_requests` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Role and trip type
  `role` VARCHAR(100) NOT NULL,
  `tripType` VARCHAR(100) NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'NEW',
  
  -- Customer contact information
  `fullName` VARCHAR(200) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(40) NULL,
  
  -- Trip details
  `destinations` VARCHAR(500) NULL,
  `dateFrom` DATETIME NULL,
  `dateTo` DATETIME NULL,
  `groupSize` INT NULL,
  `budget` DECIMAL(12, 2) NULL,
  `notes` TEXT NULL,
  
  -- Transport requirements
  `transportRequired` BOOLEAN NULL DEFAULT FALSE,
  `vehicleType` VARCHAR(100) NULL,
  `pickupLocation` VARCHAR(500) NULL,
  `dropoffLocation` VARCHAR(500) NULL,
  `vehiclesNeeded` INT NULL,
  `passengerCount` INT NULL,
  `vehicleRequirements` TEXT NULL,
  
  -- Role-specific data stored as JSON
  `roleSpecificData` JSON NULL,
  
  -- Admin response fields
  `adminResponse` TEXT NULL,
  `suggestedItineraries` TEXT NULL,
  `requiredPermits` TEXT NULL,
  `estimatedTimeline` TEXT NULL,
  `assignedAgent` VARCHAR(200) NULL,
  `respondedAt` DATETIME NULL,
  
  -- Timestamps
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes
  INDEX `plan_requests_role_idx` (`role`),
  INDEX `plan_requests_tripType_idx` (`tripType`),
  INDEX `plan_requests_status_idx` (`status`),
  INDEX `plan_requests_email_idx` (`email`),
  INDEX `plan_requests_phone_idx` (`phone`),
  INDEX `plan_requests_createdAt_idx` (`createdAt`),
  INDEX `plan_requests_status_createdAt_idx` (`status`, `createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
