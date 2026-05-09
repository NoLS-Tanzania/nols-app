-- Speeds No4P OTP CSV export and 30-day retention cleanup.
CREATE INDEX `AuditLog_action_createdAt_idx` ON `auditlog`(`action`, `createdAt`);
