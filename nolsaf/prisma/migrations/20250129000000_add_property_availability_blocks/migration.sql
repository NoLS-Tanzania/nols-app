-- CreateTable
CREATE TABLE `PropertyAvailabilityBlock` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `propertyId` INTEGER NOT NULL,
    `ownerId` INTEGER NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `roomCode` VARCHAR(60) NULL,
    `source` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `bedsBlocked` INTEGER NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PropertyAvailabilityBlock_propertyId_idx`(`propertyId`),
    INDEX `PropertyAvailabilityBlock_ownerId_idx`(`ownerId`),
    INDEX `PropertyAvailabilityBlock_startDate_endDate_idx`(`startDate`, `endDate`),
    INDEX `PropertyAvailabilityBlock_propertyId_startDate_endDate_idx`(`propertyId`, `startDate`, `endDate`),
    INDEX `PropertyAvailabilityBlock_roomCode_idx`(`roomCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PropertyAvailabilityBlock` ADD CONSTRAINT `PropertyAvailabilityBlock_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PropertyAvailabilityBlock` ADD CONSTRAINT `PropertyAvailabilityBlock_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


