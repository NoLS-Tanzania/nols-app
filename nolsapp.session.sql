-- =========================================================
--  NoLSAF: Core schema (owners, properties, bookings, codes, invoices)
--  Target: MySQL 8+ (works on 5.7+ for JSON too)
-- =========================================================

USE nolsaf;

-- ---------- Helpers ----------
SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ---------- Users ----------
-- One table for admins, owners, and customers.
DROP TABLE IF EXISTS `User`;
CREATE TABLE `User` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `role`            ENUM('ADMIN','OWNER','DRIVER','CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
  `name`            VARCHAR(160) NULL,
  `email`           VARCHAR(190) NULL UNIQUE,
  `phone`           VARCHAR(40)  NULL UNIQUE,
  `passwordHash`    VARCHAR(255) NULL,

  `emailVerifiedAt` DATETIME NULL,
  `phoneVerifiedAt` DATETIME NULL,

  `twoFactorEnabled` TINYINT(1) NOT NULL DEFAULT 0,
  `twoFactorSecret`  VARCHAR(255) NULL,

  -- payout/banking details for owners (JSON lets us store momo/bank variants)
  `payout`          JSON NULL,

  `createdAt`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Properties ----------
DROP TABLE IF EXISTS `Property`;
CREATE TABLE `Property` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `ownerId`         INT NOT NULL,
  `status`          ENUM('DRAFT','PENDING','APPROVED','REJECTED','SUSPENDED') NOT NULL DEFAULT 'DRAFT',
  `title`           VARCHAR(200) NOT NULL,
  `type`            ENUM('VILLA','APARTMENT','HOTEL','LODGE','CONDO','GUEST_HOUSE','BUNGALOW','CABIN','HOMESTAY','TOWNHOUSE','HOUSE','OTHER') NOT NULL,

  -- Location
  `regionId`        VARCHAR(50)  NULL,
  `regionName`      VARCHAR(120) NULL,
  `district`        VARCHAR(120) NULL,
  `street`          VARCHAR(200) NULL,
  `apartment`       VARCHAR(120) NULL,
  `city`            VARCHAR(120) NULL,
  `zip`             VARCHAR(30)  NULL,
  `country`         VARCHAR(120) NULL DEFAULT 'Tanzania',
  `latitude`        DECIMAL(10,6) NULL,
  `longitude`       DECIMAL(10,6) NULL,

  -- Media & details
  `description`     TEXT NULL,
  `photos`          JSON NULL,           -- array of URLs
  `hotelStar`       ENUM('basic','simple','moderate','high','luxury') NULL,
  `roomsSpec`       JSON NULL,           -- room types, beds, price/night, images...
  `services`        JSON NULL,           -- parking/breakfast/etc + nearbyFacilities[]
  `layout`          JSON NULL,           -- auto-generated SVG/plan metadata

  -- Aggregates / pricing
  `basePrice`       DECIMAL(12,2) NULL,
  `currency`        VARCHAR(3) NULL DEFAULT 'TZS',
  `totalBedrooms`   INT NULL,
  `totalBathrooms`  INT NULL,
  `maxGuests`       INT NULL,

  -- Moderation history
  `lastSubmittedAt` DATETIME NULL,
  `rejectionReasons` JSON NULL,          -- array of strings

  `createdAt`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT `Property_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE,
  INDEX (`ownerId`),
  INDEX (`status`),
  INDEX (`type`),
  INDEX (`regionId`),
  INDEX (`regionName`),
  INDEX (`district`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Bookings ----------
DROP TABLE IF EXISTS `Booking`;
CREATE TABLE `Booking` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `propertyId`    INT NOT NULL,
  `userId`        INT NULL,              -- customer account (optional if walk-in)
  `status`        ENUM('NEW','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELED')
                   NOT NULL DEFAULT 'NEW',

  `checkIn`       DATETIME NOT NULL,
  `checkOut`      DATETIME NOT NULL,
  `totalAmount`   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `roomCode`      VARCHAR(60) NULL,      -- optional internal code/unit

  -- guest snapshot (for owners scanning codes)
  `guestName`     VARCHAR(160) NULL,
  `guestPhone`    VARCHAR(40)  NULL,
  `nationality`   VARCHAR(80)  NULL,
  `sex`           VARCHAR(20)  NULL,
  `ageGroup`      VARCHAR(20)  NULL,

  `createdAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT `Booking_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE,
  CONSTRAINT `Booking_userId_fkey`     FOREIGN KEY (`userId`)     REFERENCES `User`(`id`)     ON DELETE SET NULL,

  INDEX (`propertyId`),
  INDEX (`userId`),
  INDEX (`status`),
  INDEX (`checkIn`),
  INDEX (`checkOut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Single-use Check-in Codes (one per booking) ----------
DROP TABLE IF EXISTS `CheckinCode`;
CREATE TABLE `CheckinCode` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `bookingId`     INT NOT NULL UNIQUE,   -- 1:1 booking→code
  `codeHash`      VARCHAR(128) NOT NULL, -- SHA-256 or similar
  `codeVisible`   VARCHAR(32)  NULL,     -- optional (for sending to guest)
  `status`        ENUM('ACTIVE','USED','VOID') NOT NULL DEFAULT 'ACTIVE',
  `generatedAt`   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `usedAt`        DATETIME NULL,
  `usedByOwner`   INT NULL,              -- owner userId who validated

  CONSTRAINT `CheckinCode_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE,
  CONSTRAINT `CheckinCode_usedByOwner_fkey` FOREIGN KEY (`usedByOwner`) REFERENCES `User`(`id`) ON DELETE SET NULL,

  UNIQUE KEY `CheckinCode_codeHash_key` (`codeHash`),
  INDEX (`status`),
  INDEX (`generatedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Invoices / Payouts ----------
DROP TABLE IF EXISTS `Invoice`;
CREATE TABLE `Invoice` (
  `id`                 INT AUTO_INCREMENT PRIMARY KEY,
  `ownerId`            INT NOT NULL,     -- owner to be paid
  `bookingId`          INT NOT NULL,     -- source booking
  `status`             ENUM('REQUESTED','VERIFIED','APPROVED','PAID','REJECTED') NOT NULL DEFAULT 'REQUESTED',

  `total`              DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `commissionPercent`  DECIMAL(5,2)  NULL,
  `commissionAmount`   DECIMAL(12,2) NULL,
  `taxPercent`         DECIMAL(5,2)  NULL,
  `netPayable`         DECIMAL(12,2) NULL,

  `invoiceNumber`      VARCHAR(50)  NULL UNIQUE,
  `receiptNumber`      VARCHAR(50)  NULL UNIQUE,

  `issuedAt`           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `verifiedAt`         DATETIME NULL,
  `approvedAt`         DATETIME NULL,
  `paidAt`             DATETIME NULL,

  `verifiedBy`         INT NULL,
  `approvedBy`         INT NULL,
  `paidBy`             INT NULL,

  `paymentMethod`      VARCHAR(40)  NULL,   -- BANK, MPESA, TIGOPESA...
  `paymentRef`         VARCHAR(80)  NULL,   -- gateway ref / merchant ref (set at APPROVED)
  `notes`              TEXT NULL,

  `receiptQrPayload`   TEXT NULL,
  `receiptQrPng`       LONGBLOB NULL,       -- PNG bytes

  `createdAt`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT `Invoice_ownerId_fkey`   FOREIGN KEY (`ownerId`)  REFERENCES `User`(`id`) ON DELETE CASCADE,
  CONSTRAINT `Invoice_bookingId_fkey` FOREIGN KEY (`bookingId`)REFERENCES `Booking`(`id`) ON DELETE CASCADE,
  CONSTRAINT `Invoice_verifiedBy_fkey`FOREIGN KEY (`verifiedBy`)REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `Invoice_approvedBy_fkey`FOREIGN KEY (`approvedBy`)REFERENCES `User`(`id`) ON DELETE SET NULL,
  CONSTRAINT `Invoice_paidBy_fkey`    FOREIGN KEY (`paidBy`)    REFERENCES `User`(`id`) ON DELETE SET NULL,

  INDEX (`status`),
  INDEX (`ownerId`),
  INDEX (`bookingId`),
  INDEX (`issuedAt`),
  INDEX (`paidAt`),
  UNIQUE KEY `Invoice_paymentRef_key` (`paymentRef`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- System settings (singleton row) ----------
DROP TABLE IF EXISTS `SystemSetting`;
CREATE TABLE `SystemSetting` (
  `id`                INT PRIMARY KEY CHECK (id = 1),
  `commissionPercent` DECIMAL(5,2)  NOT NULL DEFAULT 10.00,
  `taxPercent`        DECIMAL(5,2)  NOT NULL DEFAULT 0.00,
  `invoicePrefix`     VARCHAR(10)   NOT NULL DEFAULT 'INV',
  `receiptPrefix`     VARCHAR(10)   NOT NULL DEFAULT 'RCPT',
  `branding`          JSON NULL,              -- {logoUrl, primaryColor, ...}
  `emailEnabled`      TINYINT(1) NOT NULL DEFAULT 1,
  `smsEnabled`        TINYINT(1) NOT NULL DEFAULT 1,
  `createdAt`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- seed singleton if missing
INSERT INTO `SystemSetting` (`id`) VALUES (1)
  ON DUPLICATE KEY UPDATE `updatedAt` = `updatedAt`;

-- ---------- Admin IP allowlist ----------
DROP TABLE IF EXISTS `AdminIpAllow`;
CREATE TABLE `AdminIpAllow` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `cidr`      VARCHAR(64) NOT NULL,    -- e.g., '197.250.10.20/32' or '10.10.0.0/16'
  `note`      VARCHAR(200) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Audit log ----------
DROP TABLE IF EXISTS `AuditLog`;
CREATE TABLE `AuditLog` (
  `id`         BIGINT AUTO_INCREMENT PRIMARY KEY,
  `actorId`    INT NULL,
  `actorRole`  ENUM('ADMIN','OWNER','CUSTOMER') NULL,
  `action`     VARCHAR(80) NOT NULL,     -- e.g., PROPERTY_APPROVE
  `entity`     VARCHAR(80) NOT NULL,     -- e.g., PROPERTY, BOOKING, INVOICE
  `entityId`   INT NULL,
  `beforeJson` JSON NULL,
  `afterJson`  JSON NULL,
  `ip`         VARCHAR(64) NULL,
  `ua`         VARCHAR(255) NULL,
  `createdAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX (`actorId`),
  INDEX (`entity`,`entityId`),
  CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Useful views (optional) ----------
DROP VIEW IF EXISTS `v_invoices_owner_summary`;
CREATE VIEW `v_invoices_owner_summary` AS
SELECT
  ownerId,
  COUNT(*)                    AS invoices,
  SUM(CASE WHEN status='PAID' THEN 1 ELSE 0 END) AS paidInvoices,
  SUM(total)                  AS gross,
  SUM(commissionAmount)       AS commission,
  SUM(netPayable)             AS net
FROM `Invoice`
GROUP BY ownerId;

INSERT INTO `User` (`role`,`name`,`email`,`phone`,`passwordHash`)
VALUES ('ADMIN','System Admin','admin@example.com',NULL,NULL)
ON DUPLICATE KEY UPDATE `updatedAt` = `updatedAt`;

-- Seed a Public User (id = 2) for testing logins as a CUSTOMER
-- Adjust the `id` if it conflicts with existing rows in your DB.
INSERT INTO `User` (`id`,`role`,`name`,`email`,`phone`,`passwordHash`,`createdAt`,`updatedAt`)
VALUES (2, 'CUSTOMER', 'Public User', 'user@example.com', NULL, NULL, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `role` = VALUES(`role`),
  `name` = VALUES(`name`),
  `email` = VALUES(`email`),
  `updatedAt` = NOW();


-- ==========================
-- Admin stats: useful queries
-- Replace the example ISO datetimes and optional regionId value before running
-- ==========================

-- 1) Daily approved properties (grouped by local EAT date)
-- Replace '2025-10-01T00:00:00Z' and '2025-10-31T23:59:59Z' with your from/to UTC bounds
-- Optionally uncomment the region predicate and set regionId to your region value
SELECT
  DATE(CONVERT_TZ(createdAt, '+00:00', '+03:00')) AS day,
  COUNT(*) AS cnt
FROM `Property`
WHERE status = 'APPROVED'
  AND createdAt BETWEEN '2025-10-01T00:00:00Z' AND '2025-10-31T23:59:59Z'
  -- AND regionId = '42'
GROUP BY day
ORDER BY day;

-- 2) Base count: approved properties before a from-date (seed for cumulative)
SELECT COUNT(*) AS cnt
FROM `Property`
WHERE status = 'APPROVED'
  AND createdAt < '2025-10-01T00:00:00Z'
  -- AND regionId = '42';

-- 3) Revenue by property type (join invoices -> booking -> property)
SELECT
  COALESCE(p.type, 'Other') AS property_type,
  SUM(i.total) AS revenue
FROM `Invoice` i
JOIN `Booking` b ON b.id = i.bookingId
JOIN `Property` p ON p.id = b.propertyId
WHERE i.issuedAt BETWEEN '2025-01-01T00:00:00Z' AND '2025-12-31T23:59:59Z'
  AND i.status IN ('APPROVED','PAID')
  -- AND p.regionId = '42'
GROUP BY property_type
ORDER BY revenue DESC;

-- 4) Invoice status counts in a period
SELECT i.status, COUNT(*) AS cnt
FROM `Invoice` i
WHERE i.issuedAt BETWEEN '2025-01-01T00:00:00Z' AND '2025-12-31T23:59:59Z'
GROUP BY i.status;

-- 5) Overview aggregates (grossAmount, companyRevenue, propertiesCount, ownersCount)
SELECT
  SUM(CASE WHEN i.status IN ('APPROVED','PAID') THEN i.total ELSE 0 END) AS grossAmount,
  SUM(CASE WHEN i.status = 'PAID' THEN i.commissionAmount ELSE 0 END) AS companyRevenue
FROM `Invoice` i;

SELECT COUNT(*) AS propertiesCount FROM `Property` WHERE status = 'APPROVED';

SELECT COUNT(DISTINCT ownerId) AS ownersCount FROM `Property` WHERE status = 'APPROVED';

-- ==========================
-- Suggested indexes / Prisma schema snippet
-- Add an index to speed range + status + region queries
-- SQL (run as migration or in Workbench):
CREATE INDEX IF NOT EXISTS property_status_createdAt_region_idx ON `Property` (status, createdAt, regionId);

-- For invoices, ensure issuedAt and status are indexed (already present in schema above but here's a reminder):
CREATE INDEX IF NOT EXISTS invoice_status_issuedAt_idx ON `Invoice` (status, issuedAt);

-- Prisma schema snippet (add to your Property model):
-- @@index([status, createdAt, regionId], name: "property_status_createdAt_region_idx")

-- ==========================
-- Notes:
-- - The daily aggregation uses CONVERT_TZ(createdAt, '+00:00', '+03:00') to group by EAT local date.
--   If your createdAt is not stored in UTC, adjust the source timezone accordingly.
-- - Replace example timestamps with actual ISO UTC strings before running.
-- - If your MySQL server does not have timezone tables, using fixed offsets ('+00:00' -> '+03:00') is safe for EAT (no DST).
-- - If you want me to add a migration file or a small script to run these queries and save results to a reporting table, tell me and I will add it.

