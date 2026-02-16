-- Add requiredEducationLevel to Job
ALTER TABLE `Job`
  ADD COLUMN `requiredEducationLevel` VARCHAR(100) NULL;
