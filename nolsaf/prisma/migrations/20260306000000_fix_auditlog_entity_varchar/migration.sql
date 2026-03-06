-- Migration: fix_auditlog_entity_varchar
-- The `entity` column was VARCHAR(80) which is too short for OTP entity keys.
-- OTP keys follow the pattern: OTP:PHONE:+255XXXXXXXXX:sha256hex (88+ chars).
-- MySQL rejected inserts silently (error was swallowed), causing the No4P OTP
-- admin page to show no records even when OTPs were successfully sent.
-- Fix: widen entity to VARCHAR(200).

ALTER TABLE `auditlog` MODIFY COLUMN `entity` VARCHAR(200) NOT NULL;
