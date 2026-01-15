-- Adds profile columns used by the newer web UI (driver + owner/customer)
-- Target DB: MySQL 8+
-- Table is mapped from Prisma model User via @@map("User")

-- IMPORTANT:
-- 1) Review before running in production.
-- 2) If your table name casing differs (e.g. `user`), adjust accordingly.

ALTER TABLE `User`
  ADD COLUMN `fullName` VARCHAR(160) NULL AFTER `name`,
  ADD COLUMN `avatarUrl` VARCHAR(500) NULL AFTER `passwordHash`,
  ADD COLUMN `timezone` VARCHAR(80) NULL AFTER `avatarUrl`,
  ADD COLUMN `dateOfBirth` DATE NULL AFTER `timezone`,
  ADD COLUMN `region` VARCHAR(120) NULL AFTER `dateOfBirth`,
  ADD COLUMN `district` VARCHAR(120) NULL AFTER `region`;

-- Optional: add indexes if you will query by these often
-- CREATE INDEX `User_region_idx` ON `User` (`region`);
-- CREATE INDEX `User_district_idx` ON `User` (`district`);
