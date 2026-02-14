-- Add TourismSite table + Property tourism placement fields
-- This migration is written defensively to be safe if some environments already have parts of this schema.

-- CreateTable
CREATE TABLE IF NOT EXISTS `TourismSite` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(160) NOT NULL,
  `name` VARCHAR(200) NOT NULL,
  `country` VARCHAR(120) NOT NULL DEFAULT 'Tanzania',
  `description` TEXT NULL,
  `latitude` DECIMAL(10,6) NULL,
  `longitude` DECIMAL(10,6) NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `TourismSite_slug_key` (`slug`),
  INDEX `TourismSite_country_idx` (`country`),
  INDEX `TourismSite_slug_idx` (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddColumn Property.tourismSiteId (nullable)
SET @__nolsaf_has_prop_tourismSiteId := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Property' AND COLUMN_NAME = 'tourismSiteId'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_has_prop_tourismSiteId = 0,
  'ALTER TABLE `Property` ADD COLUMN `tourismSiteId` INT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @__nolsaf_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- AddColumn Property.parkPlacement (nullable)
SET @__nolsaf_has_prop_parkPlacement := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Property' AND COLUMN_NAME = 'parkPlacement'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_has_prop_parkPlacement = 0,
  'ALTER TABLE `Property` ADD COLUMN `parkPlacement` VARCHAR(20) NULL',
  'SELECT 1'
);
PREPARE stmt FROM @__nolsaf_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- CreateIndex Property(tourismSiteId)
SET @__nolsaf_has_prop_tourism_idx := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Property' AND INDEX_NAME = 'Property_tourismSiteId_idx'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_has_prop_tourism_idx = 0,
  'CREATE INDEX `Property_tourismSiteId_idx` ON `Property`(`tourismSiteId`)',
  'SELECT 1'
);
PREPARE stmt FROM @__nolsaf_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- CreateIndex idx_Property_status_tourismSite_placement_id
SET @__nolsaf_has_prop_combo_idx := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Property' AND INDEX_NAME = 'idx_Property_status_tourismSite_placement_id'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_has_prop_combo_idx = 0,
  'CREATE INDEX `idx_Property_status_tourismSite_placement_id` ON `Property`(`status`, `tourismSiteId`, `parkPlacement`, `id`)',
  'SELECT 1'
);
PREPARE stmt FROM @__nolsaf_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- AddForeignKey Property.tourismSiteId -> TourismSite.id
SET @__nolsaf_has_fk := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Property'
    AND CONSTRAINT_NAME = 'Property_tourismSiteId_fkey'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
SET @__nolsaf_sql := IF(
  @__nolsaf_has_fk = 0,
  'ALTER TABLE `Property` ADD CONSTRAINT `Property_tourismSiteId_fkey` FOREIGN KEY (`tourismSiteId`) REFERENCES `TourismSite`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @__nolsaf_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Seed baseline tourism sites (idempotent via unique slug)
INSERT INTO `TourismSite` (`slug`, `name`, `country`, `description`) VALUES
  -- Tanzania
  ('serengeti-national-park', 'Serengeti National Park', 'Tanzania', NULL),
  ('ngorongoro-crater', 'Ngorongoro Crater', 'Tanzania', NULL),
  ('mount-kilimanjaro', 'Mount Kilimanjaro', 'Tanzania', NULL),
  ('zanzibar', 'Zanzibar (Stone Town + beaches)', 'Tanzania', NULL),
  ('tarangire-national-park', 'Tarangire National Park', 'Tanzania', NULL),
  ('lake-manyara', 'Lake Manyara', 'Tanzania', NULL),
  ('nyerere-national-park', 'Nyerere (Selous)', 'Tanzania', NULL),
  ('ruaha-national-park', 'Ruaha National Park', 'Tanzania', NULL),
  ('mafia-island', 'Mafia Island', 'Tanzania', NULL),
  ('gombe-mahale', 'Gombe / Mahale', 'Tanzania', NULL),

  -- Kenya
  ('maasai-mara', 'Maasai Mara', 'Kenya', NULL),
  ('amboseli-national-park', 'Amboseli National Park', 'Kenya', NULL),
  ('tsavo', 'Tsavo (East & West)', 'Kenya', NULL),
  ('diani-beach', 'Diani Beach', 'Kenya', NULL),
  ('nairobi-national-park', 'Nairobi (city + Nairobi National Park)', 'Kenya', NULL),
  ('lake-nakuru', 'Lake Nakuru', 'Kenya', NULL),
  ('samburu', 'Samburu', 'Kenya', NULL),
  ('mount-kenya', 'Mount Kenya', 'Kenya', NULL),
  ('lamu', 'Lamu', 'Kenya', NULL),
  ('hells-gate', 'Hell’s Gate', 'Kenya', NULL),

  -- Uganda
  ('bwindi-impenetrable', 'Bwindi Impenetrable (Gorilla trekking)', 'Uganda', NULL),
  ('queen-elizabeth-national-park', 'Queen Elizabeth National Park', 'Uganda', NULL),
  ('murchison-falls-national-park', 'Murchison Falls National Park', 'Uganda', NULL),
  ('kibale-forest', 'Kibale Forest (Chimp trekking)', 'Uganda', NULL),
  ('jinja', 'Jinja (Source of the Nile)', 'Uganda', NULL),
  ('rwenzori-mountains', 'Rwenzori Mountains', 'Uganda', NULL),
  ('lake-bunyonyi', 'Lake Bunyonyi', 'Uganda', NULL),
  ('kidepo-valley', 'Kidepo Valley', 'Uganda', NULL),
  ('lake-mburo', 'Lake Mburo', 'Uganda', NULL),
  ('sipi-falls', 'Sipi Falls', 'Uganda', NULL)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `country` = VALUES(`country`);
