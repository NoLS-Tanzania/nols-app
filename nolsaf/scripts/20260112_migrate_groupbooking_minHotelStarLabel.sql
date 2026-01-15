-- Adds GroupBooking.minHotelStarLabel and migrates existing numeric minHotelStar values.
-- Safe to run once on a dev DB.

-- 1) Add the new column
ALTER TABLE `GroupBooking`
  ADD COLUMN `minHotelStarLabel` VARCHAR(20) NULL;

-- 2) Backfill from old numeric column
UPDATE `GroupBooking`
SET `minHotelStarLabel` = CASE `minHotelStar`
  WHEN 1 THEN 'basic'
  WHEN 2 THEN 'simple'
  WHEN 3 THEN 'moderate'
  WHEN 4 THEN 'high'
  WHEN 5 THEN 'luxury'
  ELSE NULL
END
WHERE `minHotelStarLabel` IS NULL
  AND `minHotelStar` IS NOT NULL;

-- 3) Drop the old column
ALTER TABLE `GroupBooking`
  DROP COLUMN `minHotelStar`;
