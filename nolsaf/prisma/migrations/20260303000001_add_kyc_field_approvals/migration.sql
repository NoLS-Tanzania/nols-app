-- AlterTable: add kycFieldApprovals column for per-field admin review
ALTER TABLE `User` ADD COLUMN `kycFieldApprovals` JSON NULL;
