-- Add applicant region/district to JobApplication
ALTER TABLE `JobApplication`
  ADD COLUMN `region` VARCHAR(100) NULL,
  ADD COLUMN `district` VARCHAR(100) NULL;
