-- AlterTable
ALTER TABLE `user`
    ADD COLUMN `languages` JSON NULL;

-- AlterTable
-- Note: TransportBooking maps to table `transportbooking` (@@map). Use the mapped
-- name so this works on case-sensitive MySQL (e.g. Aiven), not just case-insensitive local.
ALTER TABLE `transportbooking`
    ADD COLUMN `requiredLanguage` VARCHAR(40) NULL;
