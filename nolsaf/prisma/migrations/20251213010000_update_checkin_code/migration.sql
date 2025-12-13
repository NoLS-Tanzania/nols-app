-- AlterTable: Add missing fields to CheckinCode
ALTER TABLE `CheckinCode` 
  ADD COLUMN `code` VARCHAR(32) NULL AFTER `bookingId`,
  ADD COLUMN `issuedAt` DATETIME(3) NULL AFTER `generatedAt`,
  ADD COLUMN `voidReason` VARCHAR(255) NULL AFTER `usedByOwner`,
  ADD COLUMN `voidedAt` DATETIME(3) NULL AFTER `voidReason`;

-- Create unique index on code
CREATE UNIQUE INDEX `CheckinCode_code_key` ON `CheckinCode`(`code`);

-- Create index on code for faster lookups
CREATE INDEX `CheckinCode_code_idx` ON `CheckinCode`(`code`);

-- Update existing records: set code = codeVisible if codeVisible exists and code is null
UPDATE `CheckinCode` SET `code` = `codeVisible` WHERE `codeVisible` IS NOT NULL AND `code` IS NULL;

-- Update existing records: set codeVisible = code if codeVisible is null and code exists
UPDATE `CheckinCode` SET `codeVisible` = `code` WHERE `code` IS NOT NULL AND `codeVisible` IS NULL;
