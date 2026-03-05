-- AlterTable: add kycFieldApprovals column for per-field admin review
ALTER TABLE `user` ADD COLUMN `kycFieldApprovals` JSON NULL;
