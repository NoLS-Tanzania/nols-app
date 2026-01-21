-- Add MySQL-friendly indexes for owner property listing.
-- Supports:
-- 1) WHERE ownerId = ? ORDER BY id DESC
-- 2) WHERE ownerId = ? AND status = ? ORDER BY id DESC

SET @idx_owner_id_count := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Property'
    AND INDEX_NAME = 'idx_Property_ownerId_id'
);

SET @sql := IF(
  @idx_owner_id_count = 0,
  'CREATE INDEX idx_Property_ownerId_id ON `Property` (`ownerId`, `id`)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_owner_status_id_count := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'Property'
    AND INDEX_NAME = 'idx_Property_ownerId_status_id'
);

SET @sql2 := IF(
  @idx_owner_status_id_count = 0,
  'CREATE INDEX idx_Property_ownerId_status_id ON `Property` (`ownerId`, `status`, `id`)',
  'SELECT 1'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;
