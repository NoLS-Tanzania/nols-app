-- Migration: add_azampay_full_channels
-- Adds paymentChannel, phone, rawStatus, and checkoutUrl to payment_events
-- to support Bank and Card checkout flows alongside existing MNO (mobile money).
-- All columns are nullable so existing MNO inserts require no changes.

ALTER TABLE `payment_events`
  ADD COLUMN `payment_channel` VARCHAR(10)   NULL AFTER `status`,
  ADD COLUMN `phone`           VARCHAR(20)   NULL AFTER `payment_channel`,
  ADD COLUMN `raw_status`      VARCHAR(80)   NULL AFTER `phone`,
  ADD COLUMN `checkout_url`    VARCHAR(2048) NULL AFTER `raw_status`;

CREATE INDEX `payment_events_payment_channel_idx`
  ON `payment_events` (`payment_channel`);

CREATE INDEX `payment_events_payment_channel_status_created_at_idx`
  ON `payment_events` (`payment_channel`, `status`, `createdAt`);
