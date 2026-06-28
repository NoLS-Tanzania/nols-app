-- Link agent reviews to the tour booking they're for (current operator flow).
-- tourBookingId is UNIQUE so a completed booking can be reviewed at most once.

-- AlterTable (idempotent): add column
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_reviews' AND COLUMN_NAME = 'tourBookingId') = 0,
  'ALTER TABLE `agent_reviews` ADD COLUMN `tourBookingId` INTEGER NULL',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- CreateIndex (idempotent): unique constraint on tourBookingId
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_reviews' AND INDEX_NAME = 'agent_reviews_tourBookingId_key') = 0,
  'CREATE UNIQUE INDEX `agent_reviews_tourBookingId_key` ON `agent_reviews`(`tourBookingId`)',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- CreateIndex (idempotent): lookup index
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_reviews' AND INDEX_NAME = 'agent_reviews_tourBookingId_idx') = 0,
  'CREATE INDEX `agent_reviews_tourBookingId_idx` ON `agent_reviews`(`tourBookingId`)',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;

-- AddForeignKey (idempotent)
SET @stmt := IF(
  (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_reviews' AND CONSTRAINT_NAME = 'agent_reviews_tourBookingId_fkey') = 0,
  'ALTER TABLE `agent_reviews` ADD CONSTRAINT `agent_reviews_tourBookingId_fkey` FOREIGN KEY (`tourBookingId`) REFERENCES `tour_bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE',
  'SELECT 1'
);
PREPARE s FROM @stmt; EXECUTE s; DEALLOCATE PREPARE s;
