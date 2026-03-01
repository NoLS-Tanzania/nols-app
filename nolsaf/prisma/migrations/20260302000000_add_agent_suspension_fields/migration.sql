-- Migration: add_agent_suspension_fields
-- Adds three columns to the `agent` table to support temporary suspensions.

ALTER TABLE `agent`
  ADD COLUMN `suspendedAt`      DATETIME(3) NULL AFTER `totalRevenueGenerated`,
  ADD COLUMN `suspensionReason` LONGTEXT    NULL AFTER `suspendedAt`,
  ADD COLUMN `suspendedBy`      INT         NULL AFTER `suspensionReason`;
