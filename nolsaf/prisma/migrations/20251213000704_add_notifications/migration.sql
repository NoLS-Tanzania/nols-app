-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `ownerId` INTEGER NULL,
    `title` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `unread` BOOLEAN NOT NULL DEFAULT true,
    `meta` JSON NULL,
    `type` VARCHAR(50) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Notification_userId_idx`(`userId`),
    INDEX `Notification_ownerId_idx`(`ownerId`),
    INDEX `Notification_unread_idx`(`unread`),
    INDEX `Notification_type_idx`(`type`),
    INDEX `Notification_createdAt_idx`(`createdAt`),
    INDEX `Notification_userId_unread_idx`(`userId`, `unread`),
    INDEX `Notification_ownerId_unread_idx`(`ownerId`, `unread`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

