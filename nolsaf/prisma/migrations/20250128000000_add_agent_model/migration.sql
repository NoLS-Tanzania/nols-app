-- Migration: Add Agent model for agent workflow management
-- Created: 2025-01-28
-- Description: Adds Agent table and updates PlanRequest to support agent assignment

-- Create Agent table
CREATE TABLE IF NOT EXISTS `Agent` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  
  -- Reference to User account
  `userId` INT NOT NULL UNIQUE,
  
  -- Agent status
  `status` VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  
  -- Education and qualifications
  `educationLevel` VARCHAR(100) NULL,
  `certifications` JSON NULL,
  `languages` JSON NULL,
  `yearsOfExperience` INT NULL,
  `specializations` JSON NULL,
  `bio` TEXT NULL,
  
  -- Area of operations (JSON array of regions/districts)
  `areasOfOperation` JSON NULL,
  
  -- Availability and workload
  `isAvailable` BOOLEAN NOT NULL DEFAULT TRUE,
  `maxActiveRequests` INT NOT NULL DEFAULT 10,
  `currentActiveRequests` INT NOT NULL DEFAULT 0,
  
  -- Performance metrics
  `performanceMetrics` JSON NULL,
  
  -- Timestamps
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign key constraint
  CONSTRAINT `Agent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  
  -- Indexes
  INDEX `Agent_status_idx` (`status`),
  INDEX `Agent_isAvailable_idx` (`isAvailable`),
  INDEX `Agent_userId_idx` (`userId`),
  INDEX `Agent_status_isAvailable_idx` (`status`, `isAvailable`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add assignedAgentId column to plan_requests table
ALTER TABLE `plan_requests`
ADD COLUMN `assignedAgentId` INT NULL AFTER `assignedAgent`,
ADD CONSTRAINT `plan_requests_assignedAgentId_fkey` FOREIGN KEY (`assignedAgentId`) REFERENCES `Agent` (`id`) ON DELETE SET NULL,
ADD INDEX `plan_requests_assignedAgentId_idx` (`assignedAgentId`);

