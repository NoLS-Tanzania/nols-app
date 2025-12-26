-- CreateTable
CREATE TABLE `Job` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `location` VARCHAR(50) NOT NULL,
    `locationDetail` VARCHAR(200) NULL,
    `department` VARCHAR(100) NOT NULL,
    `description` TEXT NOT NULL,
    `responsibilities` JSON NOT NULL,
    `requirements` JSON NOT NULL,
    `benefits` JSON NOT NULL,
    `experienceLevel` VARCHAR(20) NOT NULL,
    `salary` JSON NULL,
    `postedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `applicationDeadline` DATETIME(3) NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `createdBy` INTEGER NULL,
    `updatedBy` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Job_category_idx`(`category`),
    INDEX `Job_type_idx`(`type`),
    INDEX `Job_location_idx`(`location`),
    INDEX `Job_status_idx`(`status`),
    INDEX `Job_featured_idx`(`featured`),
    INDEX `Job_postedDate_idx`(`postedDate`),
    INDEX `Job_applicationDeadline_idx`(`applicationDeadline`),
    INDEX `Job_status_applicationDeadline_idx`(`status`, `applicationDeadline`),
    INDEX `Job_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
