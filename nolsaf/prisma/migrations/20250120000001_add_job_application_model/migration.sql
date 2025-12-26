-- CreateTable
CREATE TABLE `JobApplication` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `jobId` INTEGER NOT NULL,
    `fullName` VARCHAR(200) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(40) NOT NULL,
    `coverLetter` TEXT NOT NULL,
    `portfolio` VARCHAR(500) NULL,
    `linkedIn` VARCHAR(500) NULL,
    `referredBy` VARCHAR(200) NULL,
    `resumeFileName` VARCHAR(255) NULL,
    `resumeStorageKey` VARCHAR(500) NULL,
    `resumeUrl` TEXT NULL,
    `resumeSize` INTEGER NULL,
    `resumeType` VARCHAR(100) NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `adminNotes` TEXT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewedBy` INTEGER NULL,
    `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `JobApplication_jobId_idx`(`jobId`),
    INDEX `JobApplication_email_idx`(`email`),
    INDEX `JobApplication_status_idx`(`status`),
    INDEX `JobApplication_submittedAt_idx`(`submittedAt`),
    INDEX `JobApplication_status_submittedAt_idx`(`status`, `submittedAt`),
    INDEX `JobApplication_reviewedBy_idx`(`reviewedBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `JobApplication` ADD CONSTRAINT `JobApplication_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobApplication` ADD CONSTRAINT `JobApplication_reviewedBy_fkey` FOREIGN KEY (`reviewedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
