-- Add roomsQty to Booking to support multi-room bookings.

SET @col_roomsQty_count := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Booking'
    AND COLUMN_NAME = 'roomsQty'
);

SET @sql := IF(
  @col_roomsQty_count = 0,
  'ALTER TABLE `Booking` ADD COLUMN `roomsQty` INT NOT NULL DEFAULT 1',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
