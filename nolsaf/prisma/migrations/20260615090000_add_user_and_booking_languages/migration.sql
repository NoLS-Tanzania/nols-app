-- AlterTable
ALTER TABLE `user`
    ADD COLUMN `languages` JSON NULL;

-- AlterTable
ALTER TABLE `TransportBooking`
    ADD COLUMN `requiredLanguage` VARCHAR(40) NULL;
