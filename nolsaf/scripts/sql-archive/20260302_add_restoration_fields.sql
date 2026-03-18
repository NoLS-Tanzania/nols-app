-- Migration: 20260302_add_restoration_fields
-- Purpose:
--   1. Tighten suspensionReason column from TEXT to VARCHAR(1000) — enforces
--      a server-side max-length at the storage layer to match API validation.
--   2. Add restoredAt / restoredBy columns so every reinstatement is
--      permanently recorded (who restored, when) — completes the audit trail.
--
-- Safe to run on live data: VARCHAR narrowing is non-destructive when existing
-- values are all ≤1000 chars; the two new columns are nullable with no default.
-- ============================================================================

ALTER TABLE `agent`
  MODIFY COLUMN `suspensionReason` VARCHAR(1000) NULL COMMENT 'Reason recorded by the admin (max 1000 chars)',
  ADD COLUMN `restoredAt`         DATETIME(3) NULL COMMENT 'Timestamp when access was reinstated' AFTER `suspendedBy`,
  ADD COLUMN `restoredBy`         INT         NULL COMMENT 'Admin user ID who reinstated the agent' AFTER `restoredAt`;
