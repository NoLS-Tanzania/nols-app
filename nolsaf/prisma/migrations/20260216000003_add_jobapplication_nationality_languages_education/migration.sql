-- Add direct columns for nationality / education / languages on JobApplication
-- These are captured from the public careers application form.

ALTER TABLE `JobApplication`
  ADD COLUMN `nationality` VARCHAR(100) NULL,
  ADD COLUMN `educationLevel` VARCHAR(40) NULL,
  ADD COLUMN `languages` JSON NULL;
