-- Migration: add suspension fields to agent table
-- Run once against your MySQL database.
-- These columns track temporary suspension state applied by admins.

ALTER TABLE `agent`
  ADD COLUMN `suspendedAt`      DATETIME(3)  NULL     AFTER `totalRevenueGenerated`,
  ADD COLUMN `suspensionReason` LONGTEXT     NULL     AFTER `suspendedAt`,
  ADD COLUMN `suspendedBy`      INT          NULL     AFTER `suspensionReason`;
