-- Add performance indexes for Property and Booking models
-- These indexes optimize queries that filter/sort by createdAt and status

-- Add createdAt index to Property table for time-based queries
CREATE INDEX `Property_createdAt_idx` ON `Property`(`createdAt`);

-- Add createdAt index to Booking table for time-based queries
CREATE INDEX `Booking_createdAt_idx` ON `Booking`(`createdAt`);

-- Add composite index (status, createdAt) to Booking table for filtered and sorted queries
CREATE INDEX `Booking_status_createdAt_idx` ON `Booking`(`status`, `createdAt`);

