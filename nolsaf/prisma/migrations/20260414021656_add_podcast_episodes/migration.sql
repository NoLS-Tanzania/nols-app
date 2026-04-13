-- CreateTable
CREATE TABLE `podcast_episodes` (
    `id` VARCHAR(64) NOT NULL,
    `title` VARCHAR(300) NOT NULL,
    `description` TEXT NOT NULL,
    `youtubeUrl` VARCHAR(500) NOT NULL,
    `thumbnailUrl` VARCHAR(500) NULL,
    `guestName` VARCHAR(200) NULL,
    `guestRole` VARCHAR(200) NULL,
    `tags` JSON NULL,
    `duration` VARCHAR(20) NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `podcast_episodes_published_publishedAt_idx`(`published`, `publishedAt`),
    INDEX `podcast_episodes_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
