-- AddColumn kycNote to User
-- Admin note stored when action = request_info
ALTER TABLE `User` ADD COLUMN `kycNote` VARCHAR(1000) NULL;
