-- Add ward field to Property
-- MySQL 8+

ALTER TABLE `Property`
  ADD COLUMN `ward` VARCHAR(120) NULL AFTER `district`;

CREATE INDEX `Property_ward_idx` ON `Property`(`ward`);
