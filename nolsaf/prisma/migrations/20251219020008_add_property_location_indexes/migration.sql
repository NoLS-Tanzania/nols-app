-- Add location indexes to Property table for map functionality
-- MySQL 8+
-- These indexes support efficient location-based queries and map rendering

-- Individual indexes for latitude and longitude
CREATE INDEX `Property_latitude_idx` ON `Property`(`latitude`);
CREATE INDEX `Property_longitude_idx` ON `Property`(`longitude`);

-- Composite index for location-based queries (finding properties by coordinates)
CREATE INDEX `Property_latitude_longitude_idx` ON `Property`(`latitude`, `longitude`);

-- Composite index for filtering approved properties with locations (common map query)
CREATE INDEX `Property_status_latitude_longitude_idx` ON `Property`(`status`, `latitude`, `longitude`);
