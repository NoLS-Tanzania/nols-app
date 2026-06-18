-- AlterTable
ALTER TABLE `group_bookings`
    ADD COLUMN `paymentRef` VARCHAR(80) NULL,
    ADD COLUMN `checkoutSessionId` VARCHAR(120) NULL,
    ADD COLUMN `payerPhone` VARCHAR(40) NULL,
    ADD COLUMN `paymentProvider` VARCHAR(40) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `group_bookings_paymentRef_key` ON `group_bookings`(`paymentRef`);

-- CreateIndex
CREATE UNIQUE INDEX `group_bookings_checkoutSessionId_key` ON `group_bookings`(`checkoutSessionId`);

-- AlterTable
ALTER TABLE `payment_events`
    ADD COLUMN `groupBookingId` INTEGER NULL,
    ADD INDEX `payment_events_groupBookingId_idx`(`groupBookingId`);

-- AddForeignKey
ALTER TABLE `payment_events`
  ADD CONSTRAINT `payment_events_groupBookingId_fkey`
  FOREIGN KEY (`groupBookingId`) REFERENCES `group_bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
