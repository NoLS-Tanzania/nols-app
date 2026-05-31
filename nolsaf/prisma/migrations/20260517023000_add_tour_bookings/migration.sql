CREATE TABLE `tour_bookings` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `bookingCode` VARCHAR(40) NOT NULL,
  `operatorAgentId` INTEGER NOT NULL,
  `customerId` INTEGER NULL,
  `packageId` VARCHAR(120) NULL,
  `packageSnapshot` JSON NULL,
  `operatorSnapshot` JSON NULL,
  `title` VARCHAR(200) NOT NULL,
  `destination` VARCHAR(200) NULL,
  `category` VARCHAR(80) NULL,
  `startDate` DATETIME(3) NULL,
  `endDate` DATETIME(3) NULL,
  `guestName` VARCHAR(160) NULL,
  `guestEmail` VARCHAR(160) NULL,
  `guestPhone` VARCHAR(40) NULL,
  `nationality` VARCHAR(80) NULL,
  `travelerCount` INTEGER NOT NULL DEFAULT 1,
  `status` VARCHAR(40) NOT NULL DEFAULT 'PENDING_PAYMENT',
  `paymentStatus` VARCHAR(40) NOT NULL DEFAULT 'UNPAID',
  `payoutStatus` VARCHAR(40) NOT NULL DEFAULT 'NOT_READY',
  `currency` VARCHAR(3) NOT NULL DEFAULT 'TZS',
  `unitPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `grossAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `commissionPercent` DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  `commissionAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `operatorPayoutAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `paymentProvider` VARCHAR(40) NULL,
  `paymentRef` VARCHAR(100) NULL,
  `checkoutSessionId` VARCHAR(120) NULL,
  `payerPhone` VARCHAR(40) NULL,
  `paidAt` DATETIME(3) NULL,
  `confirmedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `canceledAt` DATETIME(3) NULL,
  `payoutRequestedAt` DATETIME(3) NULL,
  `payoutApprovedAt` DATETIME(3) NULL,
  `payoutPaidAt` DATETIME(3) NULL,
  `notes` TEXT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `tour_bookings_bookingCode_key`(`bookingCode`),
  UNIQUE INDEX `tour_bookings_paymentRef_key`(`paymentRef`),
  UNIQUE INDEX `tour_bookings_checkoutSessionId_key`(`checkoutSessionId`),
  INDEX `tour_bookings_operatorAgentId_idx`(`operatorAgentId`),
  INDEX `tour_bookings_customerId_idx`(`customerId`),
  INDEX `tour_bookings_packageId_idx`(`packageId`),
  INDEX `tour_bookings_status_idx`(`status`),
  INDEX `tour_bookings_paymentStatus_idx`(`paymentStatus`),
  INDEX `tour_bookings_payoutStatus_idx`(`payoutStatus`),
  INDEX `tour_bookings_startDate_idx`(`startDate`),
  INDEX `tour_bookings_createdAt_idx`(`createdAt`),
  INDEX `tour_bookings_paidAt_idx`(`paidAt`),
  INDEX `tour_bookings_operator_status_created_idx`(`operatorAgentId`, `status`, `createdAt`),
  INDEX `tour_bookings_payment_status_created_idx`(`paymentStatus`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `tour_bookings`
  ADD CONSTRAINT `tour_bookings_operatorAgentId_fkey`
  FOREIGN KEY (`operatorAgentId`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `tour_bookings`
  ADD CONSTRAINT `tour_bookings_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `payment_events`
  ADD COLUMN `tourBookingId` INTEGER NULL,
  ADD INDEX `payment_events_tourBookingId_idx`(`tourBookingId`);

ALTER TABLE `payment_events`
  ADD CONSTRAINT `payment_events_tourBookingId_fkey`
  FOREIGN KEY (`tourBookingId`) REFERENCES `tour_bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
