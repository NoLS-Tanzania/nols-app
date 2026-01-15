-- Adds per-role session TTL columns (minutes) to SystemSetting
-- Target DB: MySQL 8+
-- Table is mapped from Prisma model SystemSetting via @@map("SystemSetting")

-- IMPORTANT:
-- 1) Review before running in production.
-- 2) Existing global fallback is `sessionIdleMinutes`.

ALTER TABLE `SystemSetting`
  ADD COLUMN `sessionMaxMinutesAdmin` INT NULL AFTER `sessionIdleMinutes`,
  ADD COLUMN `sessionMaxMinutesOwner` INT NULL AFTER `sessionMaxMinutesAdmin`,
  ADD COLUMN `sessionMaxMinutesDriver` INT NULL AFTER `sessionMaxMinutesOwner`,
  ADD COLUMN `sessionMaxMinutesCustomer` INT NULL AFTER `sessionMaxMinutesDriver`;
