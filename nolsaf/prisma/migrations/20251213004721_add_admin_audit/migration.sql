-- CreateTable
CREATE TABLE `AdminAudit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `adminId` INTEGER NOT NULL,
    `targetUserId` INTEGER NULL,
    `performedBy` INTEGER NULL,
    `action` VARCHAR(80) NOT NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AdminAudit_adminId_idx`(`adminId`),
    INDEX `AdminAudit_targetUserId_idx`(`targetUserId`),
    INDEX `AdminAudit_action_idx`(`action`),
    INDEX `AdminAudit_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdminAudit` ADD CONSTRAINT `AdminAudit_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
