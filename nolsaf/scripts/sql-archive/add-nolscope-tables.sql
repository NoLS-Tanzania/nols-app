-- =========================================================
--  NoLScope – Add Smart Travel Cost Estimation tables
--  Run once against the target database.
--  Safe to re-run: all statements use IF NOT EXISTS.
-- =========================================================

-- 1. TripEstimate ─ one row per cost-estimate request
CREATE TABLE IF NOT EXISTS `trip_estimates` (
  `id`                  INT            NOT NULL AUTO_INCREMENT,
  -- request parameters
  `destination`         VARCHAR(120)   NOT NULL,
  `destinationType`     VARCHAR(40)    NULL,
  `startDate`           DATE           NOT NULL,
  `endDate`             DATE           NOT NULL,
  `travelers`           INT            NOT NULL DEFAULT 1,
  `accommodationLevel`  VARCHAR(20)    NOT NULL,
  `transportPreference` VARCHAR(30)    NULL,
  `nationality`         VARCHAR(5)     NOT NULL DEFAULT 'US',
  `currency`            VARCHAR(3)     NOT NULL DEFAULT 'USD',
  `requestedActivities` JSON           NULL,
  -- results
  `totalCost`           DECIMAL(12,2)  NOT NULL,
  `confidence`          DECIMAL(3,2)   NOT NULL,
  `breakdown`           JSON           NOT NULL,
  `minCost`             DECIMAL(12,2)  NULL,
  `maxCost`             DECIMAL(12,2)  NULL,
  -- seasonality
  `currentSeason`       VARCHAR(20)    NULL,
  `offPeakCost`         DECIMAL(12,2)  NULL,
  `offPeakSavings`      DECIMAL(12,2)  NULL,
  `suggestions`         JSON           NULL,
  -- validity
  `validUntil`          DATETIME(3)    NOT NULL,
  `dataSourcesUsed`     JSON           NULL,
  -- user tracking
  `userId`              INT            NULL,
  `sessionId`           VARCHAR(128)   NULL,
  `ipAddress`           VARCHAR(45)    NULL,
  -- conversion
  `convertedToBooking`  TINYINT(1)     NOT NULL DEFAULT 0,
  `bookingId`           INT            NULL,
  -- analytics
  `viewCount`           INT            NOT NULL DEFAULT 1,
  `lastViewedAt`        DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `createdAt`           DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`           DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `trip_estimates_destination_startDate_idx` (`destination`, `startDate`),
  INDEX `trip_estimates_userId_idx`                (`userId`),
  INDEX `trip_estimates_sessionId_idx`             (`sessionId`),
  INDEX `trip_estimates_convertedToBooking_idx`    (`convertedToBooking`),
  INDEX `trip_estimates_createdAt_idx`             (`createdAt`),

  CONSTRAINT `trip_estimates_userId_fkey`
    FOREIGN KEY (`userId`)   REFERENCES `user`    (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `trip_estimates_bookingId_fkey`
    FOREIGN KEY (`bookingId`) REFERENCES `booking` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. VisaFee ─ Tanzania tourist visa costs by nationality
CREATE TABLE IF NOT EXISTS `visa_fees` (
  `id`             INT            NOT NULL AUTO_INCREMENT,
  `nationality`    VARCHAR(5)     NOT NULL,
  `visaType`       VARCHAR(30)    NOT NULL DEFAULT 'tourist',
  `entries`        VARCHAR(20)    NOT NULL DEFAULT 'single',
  `durationDays`   INT            NOT NULL DEFAULT 90,
  `amount`         DECIMAL(10,2)  NOT NULL,
  `currency`       VARCHAR(3)     NOT NULL DEFAULT 'USD',
  `description`    VARCHAR(500)   NULL,
  `processingTime` VARCHAR(80)    NULL,
  `requirements`   JSON           NULL,
  `validFrom`      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `validUntil`     DATETIME(3)    NULL,
  `lastVerified`   DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `isActive`       TINYINT(1)     NOT NULL DEFAULT 1,
  `createdAt`      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `visa_fees_nationality_visaType_entries_key` (`nationality`, `visaType`, `entries`),
  INDEX `visa_fees_nationality_idx` (`nationality`),
  INDEX `visa_fees_isActive_idx`    (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ParkFee ─ Tanzania national park / attraction entry fees
CREATE TABLE IF NOT EXISTS `park_fees` (
  `id`                INT            NOT NULL AUTO_INCREMENT,
  `parkName`          VARCHAR(200)   NOT NULL,
  `parkCode`          VARCHAR(30)    NOT NULL,
  `category`          VARCHAR(40)    NOT NULL,
  `region`            VARCHAR(100)   NOT NULL,
  `adultForeignerFee` DECIMAL(10,2)  NOT NULL,
  `adultResidentFee`  DECIMAL(10,2)  NULL,
  `childForeignerFee` DECIMAL(10,2)  NULL,
  `childResidentFee`  DECIMAL(10,2)  NULL,
  `currency`          VARCHAR(3)     NOT NULL DEFAULT 'USD',
  `vehicleFee`        DECIMAL(10,2)  NULL,
  `guideFee`          DECIMAL(10,2)  NULL,
  `campingFee`        DECIMAL(10,2)  NULL,
  `requiresGuide`     TINYINT(1)     NOT NULL DEFAULT 0,
  `minimumDays`       INT            NULL,
  `description`       TEXT           NULL,
  `officialWebsite`   VARCHAR(300)   NULL,
  `lastVerified`      DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `isActive`          TINYINT(1)     NOT NULL DEFAULT 1,
  `createdAt`         DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `park_fees_parkCode_key` (`parkCode`),
  INDEX `park_fees_region_idx`   (`region`),
  INDEX `park_fees_isActive_idx` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TransportCostAverage ─ average route costs between destinations
CREATE TABLE IF NOT EXISTS `transport_cost_averages` (
  `id`                INT            NOT NULL AUTO_INCREMENT,
  `fromLocation`      VARCHAR(120)   NOT NULL,
  `toLocation`        VARCHAR(120)   NOT NULL,
  `transportType`     VARCHAR(30)    NOT NULL,
  `minCost`           DECIMAL(10,2)  NOT NULL,
  `maxCost`           DECIMAL(10,2)  NOT NULL,
  `averageCost`       DECIMAL(10,2)  NOT NULL,
  `currency`          VARCHAR(3)     NOT NULL DEFAULT 'USD',
  `durationHours`     DECIMAL(5,1)   NULL,
  `distanceKm`        INT            NULL,
  `frequency`         VARCHAR(60)    NULL,
  `peakMultiplier`    DECIMAL(3,2)   NOT NULL DEFAULT 1.00,
  `offPeakMultiplier` DECIMAL(3,2)   NOT NULL DEFAULT 1.00,
  `description`       VARCHAR(500)   NULL,
  `provider`          VARCHAR(200)   NULL,
  `requiresBooking`   TINYINT(1)     NOT NULL DEFAULT 0,
  `bookingLeadDays`   INT            NULL,
  `confidence`        DECIMAL(3,2)   NOT NULL DEFAULT 0.80,
  `dataSource`        VARCHAR(60)    NULL,
  `lastUpdated`       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `isActive`          TINYINT(1)     NOT NULL DEFAULT 1,
  `createdAt`         DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`         DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `transport_cost_averages_from_to_type_key` (`fromLocation`, `toLocation`, `transportType`),
  INDEX `transport_cost_averages_from_to_idx`  (`fromLocation`, `toLocation`),
  INDEX `transport_cost_averages_type_idx`     (`transportType`),
  INDEX `transport_cost_averages_isActive_idx` (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. ActivityCost ─ safaris, diving, cultural tours, adventure
CREATE TABLE IF NOT EXISTS `activity_costs` (
  `id`               INT            NOT NULL AUTO_INCREMENT,
  `activityCode`     VARCHAR(80)    NOT NULL,
  `activityName`     VARCHAR(200)   NOT NULL,
  `category`         VARCHAR(40)    NOT NULL,
  `destination`      VARCHAR(120)   NOT NULL,
  `minCost`          DECIMAL(10,2)  NOT NULL,
  `maxCost`          DECIMAL(10,2)  NOT NULL,
  `averageCost`      DECIMAL(10,2)  NOT NULL,
  `currency`         VARCHAR(3)     NOT NULL DEFAULT 'USD',
  `priceUnit`        VARCHAR(30)    NOT NULL DEFAULT 'per-person',
  `duration`         VARCHAR(40)    NULL,
  `durationHours`    DECIMAL(4,1)   NULL,
  `groupSize`        VARCHAR(60)    NULL,
  `difficulty`       VARCHAR(20)    NULL,
  `includes`         JSON           NULL,
  `excludes`         JSON           NULL,
  `requirements`     JSON           NULL,
  `seasonalActivity` TINYINT(1)     NOT NULL DEFAULT 0,
  `availableMonths`  JSON           NULL,
  `requiresBooking`  TINYINT(1)     NOT NULL DEFAULT 1,
  `bookingLeadDays`  INT            NULL DEFAULT 3,
  `peakMultiplier`   DECIMAL(3,2)   NOT NULL DEFAULT 1.00,
  `offPeakMultiplier` DECIMAL(3,2)  NOT NULL DEFAULT 1.00,
  `description`      TEXT           NULL,
  `provider`         VARCHAR(200)   NULL,
  `website`          VARCHAR(300)   NULL,
  `popularity`       INT            NOT NULL DEFAULT 50,
  `isActive`         TINYINT(1)     NOT NULL DEFAULT 1,
  `createdAt`        DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`        DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `activity_costs_activityCode_key` (`activityCode`),
  INDEX `activity_costs_destination_category_idx` (`destination`, `category`),
  INDEX `activity_costs_category_idx`             (`category`),
  INDEX `activity_costs_isActive_idx`             (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. PricingRule ─ seasonal multipliers and demand adjustments
CREATE TABLE IF NOT EXISTS `pricing_rules` (
  `id`              INT            NOT NULL AUTO_INCREMENT,
  `ruleName`        VARCHAR(120)   NOT NULL,
  `ruleType`        VARCHAR(30)    NOT NULL,
  `destination`     VARCHAR(120)   NULL,
  `category`        VARCHAR(40)    NULL,
  `seasonName`      VARCHAR(30)    NULL,
  `startMonth`      INT            NULL,
  `endMonth`        INT            NULL,
  `specificDates`   JSON           NULL,
  `priceMultiplier` DECIMAL(4,2)   NOT NULL,
  `minTravelers`    INT            NULL,
  `maxTravelers`    INT            NULL,
  `daysInAdvance`   INT            NULL,
  `priority`        INT            NOT NULL DEFAULT 100,
  `isActive`        TINYINT(1)     NOT NULL DEFAULT 1,
  `validFrom`       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `validUntil`      DATETIME(3)    NULL,
  `description`     TEXT           NULL,
  `createdBy`       VARCHAR(80)    NULL,
  `createdAt`       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`       DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `pricing_rules_ruleName_key`             (`ruleName`),
  INDEX `pricing_rules_destination_seasonName_idx` (`destination`, `seasonName`),
  INDEX `pricing_rules_isActive_priority_idx`      (`isActive`, `priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TripDestination ─ master reference list for destinations
CREATE TABLE IF NOT EXISTS `trip_destinations` (
  `id`                      INT            NOT NULL AUTO_INCREMENT,
  `destinationCode`         VARCHAR(30)    NOT NULL,
  `destinationName`         VARCHAR(120)   NOT NULL,
  `displayName`             VARCHAR(200)   NULL,
  `destinationType`         VARCHAR(30)    NOT NULL,
  `country`                 VARCHAR(80)    NOT NULL DEFAULT 'Tanzania',
  `region`                  VARCHAR(100)   NOT NULL,
  `coordinates`             JSON           NULL,
  `timezone`                VARCHAR(60)    NOT NULL DEFAULT 'Africa/Dar_es_Salaam',
  `mainAirport`             VARCHAR(100)   NULL,
  `nearestCity`             VARCHAR(80)    NULL,
  `accessDifficulty`        VARCHAR(20)    NOT NULL DEFAULT 'moderate',
  `bestMonths`              JSON           NULL,
  `rainyMonths`             JSON           NULL,
  `peakMonths`              JSON           NULL,
  `offPeakMonths`           JSON           NULL,
  `accommodationMultiplier` DECIMAL(3,2)   NOT NULL DEFAULT 1.00,
  `transportBaseUsd`        DECIMAL(10,2)  NULL,
  `avgStayDays`             INT            NULL,
  `description`             TEXT           NULL,
  `imageUrl`                VARCHAR(500)   NULL,
  `officialWebsite`         VARCHAR(300)   NULL,
  `popularity`              INT            NOT NULL DEFAULT 50,
  `isActive`                TINYINT(1)     NOT NULL DEFAULT 1,
  `createdAt`               DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt`               DATETIME(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `trip_destinations_destinationCode_key` (`destinationCode`),
  INDEX `trip_destinations_destinationType_idx`       (`destinationType`),
  INDEX `trip_destinations_region_idx`                (`region`),
  INDEX `trip_destinations_isActive_popularity_idx`   (`isActive`, `popularity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Add NoLScope config columns to systemsetting
--    Each ALTER is wrapped so duplicates are silently ignored on re-run
DROP PROCEDURE IF EXISTS _AddColIfMissing;
DELIMITER //
CREATE PROCEDURE _AddColIfMissing()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'systemsetting' AND COLUMN_NAME = 'nolScopeEnabled'
  ) THEN
    ALTER TABLE `systemsetting`
      ADD COLUMN `nolScopeDefaultCurrency`      VARCHAR(3)   NULL DEFAULT 'USD',
      ADD COLUMN `nolScopeServiceChargePercent` DECIMAL(5,2) NULL DEFAULT 5.00,
      ADD COLUMN `nolScopeEstimateValidDays`    INT          NULL DEFAULT 7,
      ADD COLUMN `nolScopeBaseConfidence`       DECIMAL(3,2) NULL DEFAULT 0.70,
      ADD COLUMN `nolScopeCostVariancePercent`  DECIMAL(5,2) NULL DEFAULT 10.00,
      ADD COLUMN `nolScopeEnabled`              TINYINT(1)   NULL DEFAULT 1;
  END IF;
END //
DELIMITER ;
CALL _AddColIfMissing();
DROP PROCEDURE IF EXISTS _AddColIfMissing;
