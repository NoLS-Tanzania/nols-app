-- Admin-configurable operator tier ladder overrides (per-tier thresholds).
-- Null falls back to the hardcoded defaults in lib/agentLevel.ts.

-- AlterTable (idempotent): add JSON column
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'systemsetting' AND COLUMN_NAME = 'agentTierLadder') = 0,
  'ALTER TABLE `systemsetting` ADD COLUMN `agentTierLadder` JSON NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;
