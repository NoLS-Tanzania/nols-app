-- Ensure latest-updates queries can use an index when sorting/filtering by createdAt.
CREATE INDEX `site_updates_createdAt_idx` ON `site_updates`(`createdAt`);
