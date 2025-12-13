-- Migration: Add business configuration fields to SystemSetting table
-- Run this SQL script to add the new configurable business logic fields

-- Add referral credit percentage (0.35% = 0.0035 as decimal)
ALTER TABLE `SystemSetting` 
ADD COLUMN `referralCreditPercent` DECIMAL(10, 6) DEFAULT 0.0035 COMMENT 'Referral credit percentage as decimal (e.g., 0.0035 for 0.35%)';

-- Add driver level thresholds (in TZS)
ALTER TABLE `SystemSetting` 
ADD COLUMN `driverLevelGoldThreshold` INT DEFAULT 500000 COMMENT 'Driver level threshold for Gold (in TZS)';

ALTER TABLE `SystemSetting` 
ADD COLUMN `driverLevelDiamondThreshold` INT DEFAULT 2000000 COMMENT 'Driver level threshold for Diamond (in TZS)';

-- Add goal calculation parameters
ALTER TABLE `SystemSetting` 
ADD COLUMN `goalMultiplier` DECIMAL(5, 2) DEFAULT 1.1 COMMENT 'Goal calculation multiplier (e.g., 1.1 for 10% above average)';

ALTER TABLE `SystemSetting` 
ADD COLUMN `goalMinimumMonthly` INT DEFAULT 3000000 COMMENT 'Minimum monthly earnings goal (in TZS)';

-- Update existing row (id = 1) with default values if it exists
UPDATE `SystemSetting` 
SET 
  `referralCreditPercent` = 0.0035,
  `driverLevelGoldThreshold` = 500000,
  `driverLevelDiamondThreshold` = 2000000,
  `goalMultiplier` = 1.1,
  `goalMinimumMonthly` = 3000000
WHERE `id` = 1;


