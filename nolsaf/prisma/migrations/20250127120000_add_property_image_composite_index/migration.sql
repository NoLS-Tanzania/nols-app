-- Add composite index for PropertyImage to optimize queries filtering by propertyId, status, and ordering by createdAt
-- This significantly improves performance of the public.properties.get endpoint

CREATE INDEX `PropertyImage_propertyId_status_createdAt_idx` ON `property_images`(`propertyId`, `status`, `createdAt`);
