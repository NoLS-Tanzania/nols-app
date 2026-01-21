-- Add an index that supports: WHERE entity = ? AND entityId = ? ORDER BY id DESC
-- This avoids MariaDB/MySQL "Out of sort memory" errors on large AuditLog tables.

SET @idx_count := (
  SELECT COUNT(1)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'AuditLog'
    AND INDEX_NAME = 'idx_AuditLog_entity_entityId_id'
);

SET @sql := IF(
  @idx_count = 0,
  'CREATE INDEX idx_AuditLog_entity_entityId_id ON `AuditLog` (`entity`, `entityId`, `id`)',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
