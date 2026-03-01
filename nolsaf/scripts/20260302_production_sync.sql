-- =============================================================
-- PRODUCTION SYNC MIGRATION  –  2026-03-02
-- Safe to run multiple times (all ADD COLUMN IF NOT EXISTS).
-- Covers all columns added since the initial schema was deployed.
--
-- Tables affected:
--   User  – profile columns (fullName, avatarUrl, timezone,
--            dateOfBirth, region, district, nationality)
--   agent – suspension metadata (suspendedAt, suspensionReason,
--            suspendedBy)
-- =============================================================

-- --------------------------------------------------------------
-- 1.  User profile columns
--     (added by prior feature work – autofill + agent profile)
-- --------------------------------------------------------------
ALTER TABLE `user`
  ADD COLUMN IF NOT EXISTS `fullName`     VARCHAR(160) NULL AFTER `name`,
  ADD COLUMN IF NOT EXISTS `avatarUrl`    VARCHAR(500) NULL AFTER `passwordHash`,
  ADD COLUMN IF NOT EXISTS `timezone`     VARCHAR(80)  NULL AFTER `avatarUrl`,
  ADD COLUMN IF NOT EXISTS `dateOfBirth`  DATE         NULL AFTER `timezone`,
  ADD COLUMN IF NOT EXISTS `region`       VARCHAR(120) NULL AFTER `dateOfBirth`,
  ADD COLUMN IF NOT EXISTS `district`     VARCHAR(120) NULL AFTER `region`,
  ADD COLUMN IF NOT EXISTS `nationality`  VARCHAR(80)  NULL AFTER `gender`;

-- Indexes (ignored if already present – MySQL silently skips duplicate index names)
CREATE INDEX IF NOT EXISTS `user_region_idx`      ON `user` (`region`);
CREATE INDEX IF NOT EXISTS `user_district_idx`    ON `user` (`district`);
CREATE INDEX IF NOT EXISTS `user_nationality_idx` ON `user` (`nationality`);

-- --------------------------------------------------------------
-- 2.  Agent suspension metadata
--     (added for the temporary-suspension / restore feature)
-- --------------------------------------------------------------
ALTER TABLE `agent`
  ADD COLUMN IF NOT EXISTS `suspendedAt`      DATETIME(3) NULL AFTER `totalRevenueGenerated`,
  ADD COLUMN IF NOT EXISTS `suspensionReason` LONGTEXT    NULL AFTER `suspendedAt`,
  ADD COLUMN IF NOT EXISTS `suspendedBy`      INT         NULL AFTER `suspensionReason`;

-- Verify
SELECT 'user columns' AS section,
       SUM(COLUMN_NAME IN ('fullName','avatarUrl','timezone','dateOfBirth','region','district','nationality')) AS present,
       7 AS expected
FROM   INFORMATION_SCHEMA.COLUMNS
WHERE  TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user'
UNION ALL
SELECT 'agent columns',
       SUM(COLUMN_NAME IN ('suspendedAt','suspensionReason','suspendedBy')),
       3
FROM   INFORMATION_SCHEMA.COLUMNS
WHERE  TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent';
