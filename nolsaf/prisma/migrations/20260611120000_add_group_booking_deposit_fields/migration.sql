-- AlterTable
ALTER TABLE `group_bookings`
    ADD COLUMN `depositAmount` DECIMAL(12, 2) NULL,
    ADD COLUMN `depositPaid` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `depositPaidAt` DATETIME(3) NULL;
