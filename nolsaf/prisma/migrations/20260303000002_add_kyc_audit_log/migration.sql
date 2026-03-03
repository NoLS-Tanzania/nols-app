-- AlterTable: add kycAuditLogs relation column prerequisite (none needed on User, it's a relation)
-- Create kyc_audit_log table for per-driver admin action history
CREATE TABLE `kyc_audit_log` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `driverId`       INT NOT NULL,
  `adminId`        INT NULL,
  `action`         VARCHAR(32) NOT NULL,
  `note`           TEXT NULL,
  `fieldApprovals` JSON NULL,
  `createdAt`      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `kyc_audit_log_driverId_idx` (`driverId`),
  INDEX `kyc_audit_log_driverId_createdAt_idx` (`driverId`, `createdAt`),
  CONSTRAINT `kyc_audit_log_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `user` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
