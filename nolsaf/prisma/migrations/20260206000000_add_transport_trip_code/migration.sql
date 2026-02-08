-- Add strong transport trip code fields (stable, non-predictable)

-- 1) Add TransportBooking.tripCode
SET @__nolsaf_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'TransportBooking'
    AND COLUMN_NAME = 'tripCode'
);

SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `TransportBooking` ADD COLUMN `tripCode` VARCHAR(64) NULL',
  'SELECT "skip: TransportBooking.tripCode already exists"'
);

PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

-- 2) Add TransportBooking.tripCodeHash
SET @__nolsaf_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'TransportBooking'
    AND COLUMN_NAME = 'tripCodeHash'
);

SET @__nolsaf_sql := IF(
  @__nolsaf_col_exists = 0,
  'ALTER TABLE `TransportBooking` ADD COLUMN `tripCodeHash` VARCHAR(64) NULL',
  'SELECT "skip: TransportBooking.tripCodeHash already exists"'
);

PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

-- 3) Unique index on tripCode (allows multiple NULLs)
SET @__nolsaf_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'TransportBooking'
    AND INDEX_NAME = 'TransportBooking_tripCode_key'
);

SET @__nolsaf_sql := IF(
  @__nolsaf_idx_exists = 0,
  'CREATE UNIQUE INDEX `TransportBooking_tripCode_key` ON `TransportBooking`(`tripCode`)',
  'SELECT "skip: TransportBooking_tripCode_key already exists"'
);

PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

-- 4) Unique index on tripCodeHash (allows multiple NULLs)
SET @__nolsaf_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'TransportBooking'
    AND INDEX_NAME = 'TransportBooking_tripCodeHash_key'
);

SET @__nolsaf_sql := IF(
  @__nolsaf_idx_exists = 0,
  'CREATE UNIQUE INDEX `TransportBooking_tripCodeHash_key` ON `TransportBooking`(`tripCodeHash`)',
  'SELECT "skip: TransportBooking_tripCodeHash_key already exists"'
);

PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

-- 5) Non-unique helper indexes (safe to skip if already present)
SET @__nolsaf_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'TransportBooking'
    AND INDEX_NAME = 'TransportBooking_tripCode_idx'
);

SET @__nolsaf_sql := IF(
  @__nolsaf_idx_exists = 0,
  'CREATE INDEX `TransportBooking_tripCode_idx` ON `TransportBooking`(`tripCode`)',
  'SELECT "skip: TransportBooking_tripCode_idx already exists"'
);

PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;

SET @__nolsaf_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'TransportBooking'
    AND INDEX_NAME = 'TransportBooking_tripCodeHash_idx'
);

SET @__nolsaf_sql := IF(
  @__nolsaf_idx_exists = 0,
  'CREATE INDEX `TransportBooking_tripCodeHash_idx` ON `TransportBooking`(`tripCodeHash`)',
  'SELECT "skip: TransportBooking_tripCodeHash_idx already exists"'
);

PREPARE __nolsaf_stmt FROM @__nolsaf_sql;
EXECUTE __nolsaf_stmt;
DEALLOCATE PREPARE __nolsaf_stmt;
