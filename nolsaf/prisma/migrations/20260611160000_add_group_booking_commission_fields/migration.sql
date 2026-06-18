-- AlterTable
ALTER TABLE `group_bookings`
    ADD COLUMN `ownerAmount` DECIMAL(12, 2) NULL,
    ADD COLUMN `commissionPercent` DECIMAL(5, 2) NULL;
