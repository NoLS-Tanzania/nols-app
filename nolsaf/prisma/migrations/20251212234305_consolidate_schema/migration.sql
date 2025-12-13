-- DropForeignKey
ALTER TABLE `auditlog` DROP FOREIGN KEY `AuditLog_actorId_fkey`;

-- DropForeignKey
ALTER TABLE `booking` DROP FOREIGN KEY `Booking_propertyId_fkey`;

-- DropForeignKey
ALTER TABLE `booking` DROP FOREIGN KEY `Booking_userId_fkey`;

-- DropForeignKey
ALTER TABLE `checkincode` DROP FOREIGN KEY `CheckinCode_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `checkincode` DROP FOREIGN KEY `CheckinCode_usedByOwner_fkey`;

-- DropForeignKey
ALTER TABLE `driveravailability` DROP FOREIGN KEY `DriverAvailability_driverId_fkey`;

-- DropForeignKey
ALTER TABLE `driverdocument` DROP FOREIGN KEY `DriverDocument_approvedBy_fkey`;

-- DropForeignKey
ALTER TABLE `driverdocument` DROP FOREIGN KEY `DriverDocument_driverId_fkey`;

-- DropForeignKey
ALTER TABLE `driverlocation` DROP FOREIGN KEY `DriverLocation_driverId_fkey`;

-- DropForeignKey
ALTER TABLE `driversession` DROP FOREIGN KEY `DriverSession_driverId_fkey`;

-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_approvedBy_fkey`;

-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_ownerId_fkey`;

-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_paidBy_fkey`;

-- DropForeignKey
ALTER TABLE `invoice` DROP FOREIGN KEY `Invoice_verifiedBy_fkey`;

-- DropForeignKey
ALTER TABLE `invoice_items` DROP FOREIGN KEY `fk_items_invoice`;

-- DropForeignKey
ALTER TABLE `invoices` DROP FOREIGN KEY `fk_invoices_driver`;

-- DropForeignKey
ALTER TABLE `invoices` DROP FOREIGN KEY `fk_invoices_trip`;

-- DropForeignKey
ALTER TABLE `payment_events` DROP FOREIGN KEY `payment_events_invoiceId_fkey`;

-- DropForeignKey
ALTER TABLE `property` DROP FOREIGN KEY `Property_ownerId_fkey`;

-- DropForeignKey
ALTER TABLE `property_images` DROP FOREIGN KEY `property_images_propertyId_fkey`;

-- DropForeignKey
ALTER TABLE `property_reviews` DROP FOREIGN KEY `property_reviews_bookingId_fkey`;

-- DropForeignKey
ALTER TABLE `property_reviews` DROP FOREIGN KEY `property_reviews_propertyId_fkey`;

-- DropForeignKey
ALTER TABLE `property_reviews` DROP FOREIGN KEY `property_reviews_userId_fkey`;

-- DropForeignKey
ALTER TABLE `trips` DROP FOREIGN KEY `fk_trips_driver`;

-- DropIndex
DROP INDEX `idx_passkey_user` ON `passkey`;

-- DropIndex
DROP INDEX `u_passkey_credential` ON `passkey`;

-- AlterTable
ALTER TABLE `adminipallow` MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `auditlog` MODIFY `actorRole` VARCHAR(191) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `booking` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'NEW',
    MODIFY `checkIn` DATETIME(3) NOT NULL,
    MODIFY `checkOut` DATETIME(3) NOT NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `checkincode` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    MODIFY `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `usedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `invoice` DROP COLUMN `rejectionReason`,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'REQUESTED',
    MODIFY `issuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `verifiedAt` DATETIME(3) NULL,
    MODIFY `approvedAt` DATETIME(3) NULL,
    MODIFY `paidAt` DATETIME(3) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `passkey` DROP PRIMARY KEY,
    DROP COLUMN `created_at`,
    DROP COLUMN `credential_id`,
    DROP COLUMN `name`,
    DROP COLUMN `public_key`,
    DROP COLUMN `sign_count`,
    DROP COLUMN `updated_at`,
    DROP COLUMN `user_id`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `credentialId` VARCHAR(191) NOT NULL,
    ADD COLUMN `publicKey` TEXT NOT NULL,
    ADD COLUMN `signCount` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    ADD COLUMN `userId` INTEGER NOT NULL,
    MODIFY `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `payment_events` MODIFY `provider` VARCHAR(191) NOT NULL,
    MODIFY `eventId` VARCHAR(191) NOT NULL,
    MODIFY `currency` VARCHAR(191) NOT NULL DEFAULT 'TZS',
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `property` MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    MODIFY `type` VARCHAR(191) NOT NULL,
    MODIFY `hotelStar` VARCHAR(191) NULL,
    MODIFY `lastSubmittedAt` DATETIME(3) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `property_images` MODIFY `storageKey` VARCHAR(191) NULL,
    MODIFY `thumbnailKey` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    MODIFY `moderatedAt` DATETIME(3) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `property_reviews` MODIFY `ownerResponseAt` DATETIME(3) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `referral_earnings` ALTER COLUMN `amount` DROP DEFAULT,
    MODIFY `currency` VARCHAR(191) NOT NULL DEFAULT 'TZS',
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    MODIFY `bonusPaymentRef` VARCHAR(191) NULL,
    MODIFY `paidAsBonusAt` DATETIME(3) NULL,
    MODIFY `availableAt` DATETIME(3) NULL,
    MODIFY `withdrawnAt` DATETIME(3) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `referral_withdrawals` ALTER COLUMN `totalAmount` DROP DEFAULT,
    MODIFY `currency` VARCHAR(191) NOT NULL DEFAULT 'TZS',
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    MODIFY `paymentMethod` VARCHAR(191) NULL,
    MODIFY `paymentRef` VARCHAR(191) NULL,
    MODIFY `approvedAt` DATETIME(3) NULL,
    MODIFY `rejectedAt` DATETIME(3) NULL,
    MODIFY `paidAt` DATETIME(3) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `systemsetting` ADD COLUMN `driverLevelGoldThreshold` INTEGER NULL DEFAULT 500000,
    ADD COLUMN `goalMultiplier` DECIMAL(5, 2) NULL DEFAULT 1.1,
    ADD COLUMN `referralCreditPercent` DECIMAL(10, 6) NULL DEFAULT 0.0035,
    MODIFY `id` INTEGER NOT NULL DEFAULT 1,
    MODIFY `commissionPercent` DECIMAL(5, 2) NULL DEFAULT 10.00,
    MODIFY `taxPercent` DECIMAL(5, 2) NULL DEFAULT 0.00,
    MODIFY `invoicePrefix` VARCHAR(191) NULL DEFAULT 'INV',
    MODIFY `receiptPrefix` VARCHAR(191) NULL DEFAULT 'RCPT',
    MODIFY `emailEnabled` BOOLEAN NULL DEFAULT true,
    MODIFY `smsEnabled` BOOLEAN NULL DEFAULT true,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `available` BOOLEAN NULL DEFAULT true,
    ADD COLUMN `backupCodesHash` JSON NULL,
    ADD COLUMN `isAvailable` BOOLEAN NULL DEFAULT true,
    ADD COLUMN `isDisabled` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `kycStatus` VARCHAR(191) NULL,
    ADD COLUMN `previousPasswordHashes` JSON NULL,
    ADD COLUMN `previousPasswords` JSON NULL,
    ADD COLUMN `rating` DECIMAL(3, 2) NULL,
    ADD COLUMN `referralCode` VARCHAR(191) NULL,
    ADD COLUMN `referredBy` INTEGER NULL,
    ADD COLUMN `resetPasswordExpires` DATETIME(3) NULL,
    ADD COLUMN `resetPasswordToken` VARCHAR(191) NULL,
    ADD COLUMN `sms2faEnabled` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `totpSecretEnc` VARCHAR(191) NULL,
    ADD COLUMN `twoFactorMethod` VARCHAR(191) NULL,
    MODIFY `role` VARCHAR(191) NOT NULL DEFAULT 'CUSTOMER',
    MODIFY `name` VARCHAR(191) NULL,
    MODIFY `email` VARCHAR(191) NULL,
    MODIFY `phone` VARCHAR(191) NULL,
    MODIFY `passwordHash` VARCHAR(191) NULL,
    MODIFY `emailVerifiedAt` DATETIME(3) NULL,
    MODIFY `phoneVerifiedAt` DATETIME(3) NULL,
    MODIFY `twoFactorSecret` VARCHAR(191) NULL,
    MODIFY `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `updatedAt` DATETIME(3) NOT NULL;

-- DropTable
DROP TABLE `adminaudit`;

-- DropTable
DROP TABLE `booking_checkin_confirmations`;

-- DropTable
DROP TABLE `driveravailability`;

-- DropTable
DROP TABLE `driverdocument`;

-- DropTable
DROP TABLE `driverlocation`;

-- DropTable
DROP TABLE `drivers`;

-- DropTable
DROP TABLE `driversession`;

-- DropTable
DROP TABLE `invoice_items`;

-- DropTable
DROP TABLE `invoices`;

-- DropTable
DROP TABLE `login_attempt`;

-- DropTable
DROP TABLE `notification`;

-- DropTable
DROP TABLE `password_history`;

-- DropTable
DROP TABLE `password_reset`;

-- DropTable
DROP TABLE `payouts`;

-- DropTable
DROP TABLE `trips`;

-- CreateTable
CREATE TABLE `UserDocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `type` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `reason` TEXT NULL,
    `url` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `UserDocument_userId_idx`(`userId`),
    INDEX `UserDocument_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `groupType` VARCHAR(191) NOT NULL,
    `fromRegion` VARCHAR(191) NULL,
    `fromDistrict` VARCHAR(191) NULL,
    `fromWard` VARCHAR(191) NULL,
    `fromLocation` VARCHAR(191) NULL,
    `toRegion` VARCHAR(191) NOT NULL,
    `toDistrict` VARCHAR(191) NULL,
    `toWard` VARCHAR(191) NULL,
    `toLocation` VARCHAR(191) NULL,
    `accommodationType` VARCHAR(191) NOT NULL,
    `headcount` INTEGER NOT NULL,
    `roomSize` INTEGER NOT NULL,
    `roomsNeeded` INTEGER NOT NULL,
    `needsPrivateRoom` BOOLEAN NOT NULL DEFAULT false,
    `privateRoomCount` INTEGER NOT NULL DEFAULT 0,
    `checkIn` DATETIME(3) NULL,
    `checkOut` DATETIME(3) NULL,
    `useDates` BOOLEAN NOT NULL DEFAULT true,
    `arrPickup` BOOLEAN NOT NULL DEFAULT false,
    `arrTransport` BOOLEAN NOT NULL DEFAULT false,
    `arrMeals` BOOLEAN NOT NULL DEFAULT false,
    `arrGuide` BOOLEAN NOT NULL DEFAULT false,
    `arrEquipment` BOOLEAN NOT NULL DEFAULT false,
    `pickupLocation` TEXT NULL,
    `pickupTime` VARCHAR(191) NULL,
    `arrangementNotes` TEXT NULL,
    `roster` JSON NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `totalAmount` DECIMAL(12, 2) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'TZS',
    `adminNotes` TEXT NULL,
    `cancelReason` TEXT NULL,
    `canceledAt` DATETIME(3) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `group_bookings_userId_idx`(`userId`),
    INDEX `group_bookings_status_idx`(`status`),
    INDEX `group_bookings_groupType_idx`(`groupType`),
    INDEX `group_bookings_toRegion_idx`(`toRegion`),
    INDEX `group_bookings_checkIn_checkOut_idx`(`checkIn`, `checkOut`),
    INDEX `group_bookings_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_booking_passengers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `groupBookingId` INTEGER NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `age` INTEGER NULL,
    `gender` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `sequenceNumber` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `group_booking_passengers_groupBookingId_idx`(`groupBookingId`),
    INDEX `group_booking_passengers_lastName_firstName_idx`(`lastName`, `firstName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trust_partners` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `href` VARCHAR(191) NULL,
    `displayOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `trust_partners_isActive_idx`(`isActive`),
    INDEX `trust_partners_displayOrder_idx`(`displayOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `AuditLog_createdAt_idx` ON `AuditLog`(`createdAt`);

-- CreateIndex
CREATE INDEX `Booking_status_checkIn_idx` ON `Booking`(`status`, `checkIn`);

-- CreateIndex
CREATE INDEX `Invoice_status_issuedAt_idx` ON `Invoice`(`status`, `issuedAt`);

-- CreateIndex
CREATE UNIQUE INDEX `Passkey_credentialId_key` ON `Passkey`(`credentialId`);

-- CreateIndex
CREATE INDEX `Passkey_userId_idx` ON `Passkey`(`userId`);

-- CreateIndex
CREATE INDEX `Passkey_credentialId_idx` ON `Passkey`(`credentialId`);

-- CreateIndex
CREATE INDEX `Property_status_createdAt_regionId_idx` ON `Property`(`status`, `createdAt`, `regionId`);

-- CreateIndex
CREATE INDEX `User_email_idx` ON `User`(`email`);

-- CreateIndex
CREATE INDEX `User_phone_idx` ON `User`(`phone`);

-- CreateIndex
CREATE INDEX `User_suspendedAt_idx` ON `User`(`suspendedAt`);

-- CreateIndex
CREATE INDEX `User_kycStatus_idx` ON `User`(`kycStatus`);

-- CreateIndex
CREATE INDEX `User_referredBy_idx` ON `User`(`referredBy`);

-- AddForeignKey
ALTER TABLE `Property` ADD CONSTRAINT `Property_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckinCode` ADD CONSTRAINT `CheckinCode_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckinCode` ADD CONSTRAINT `CheckinCode_usedByOwner_fkey` FOREIGN KEY (`usedByOwner`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_verifiedBy_fkey` FOREIGN KEY (`verifiedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_approvedBy_fkey` FOREIGN KEY (`approvedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_paidBy_fkey` FOREIGN KEY (`paidBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `UserDocument` ADD CONSTRAINT `UserDocument_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Passkey` ADD CONSTRAINT `Passkey_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_bookings` ADD CONSTRAINT `group_bookings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_booking_passengers` ADD CONSTRAINT `group_booking_passengers_groupBookingId_fkey` FOREIGN KEY (`groupBookingId`) REFERENCES `group_bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_earnings` ADD CONSTRAINT `referral_earnings_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_earnings` ADD CONSTRAINT `referral_earnings_referredUserId_fkey` FOREIGN KEY (`referredUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_earnings` ADD CONSTRAINT `referral_earnings_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_earnings` ADD CONSTRAINT `referral_earnings_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_earnings` ADD CONSTRAINT `referral_earnings_withdrawalId_fkey` FOREIGN KEY (`withdrawalId`) REFERENCES `referral_withdrawals`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_withdrawals` ADD CONSTRAINT `referral_withdrawals_driverId_fkey` FOREIGN KEY (`driverId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `referral_withdrawals` ADD CONSTRAINT `referral_withdrawals_processedBy_fkey` FOREIGN KEY (`processedBy`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_reviews` ADD CONSTRAINT `property_reviews_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_reviews` ADD CONSTRAINT `property_reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_reviews` ADD CONSTRAINT `property_reviews_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `property_images` ADD CONSTRAINT `property_images_propertyId_fkey` FOREIGN KEY (`propertyId`) REFERENCES `Property`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_events` ADD CONSTRAINT `payment_events_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `auditlog` RENAME INDEX `actorId` TO `AuditLog_actorId_idx`;

-- RenameIndex
ALTER TABLE `auditlog` RENAME INDEX `entity` TO `AuditLog_entity_entityId_idx`;

-- RenameIndex
ALTER TABLE `booking` RENAME INDEX `checkIn` TO `Booking_checkIn_idx`;

-- RenameIndex
ALTER TABLE `booking` RENAME INDEX `checkOut` TO `Booking_checkOut_idx`;

-- RenameIndex
ALTER TABLE `booking` RENAME INDEX `propertyId` TO `Booking_propertyId_idx`;

-- RenameIndex
ALTER TABLE `booking` RENAME INDEX `status` TO `Booking_status_idx`;

-- RenameIndex
ALTER TABLE `booking` RENAME INDEX `userId` TO `Booking_userId_idx`;

-- RenameIndex
ALTER TABLE `checkincode` RENAME INDEX `bookingId` TO `CheckinCode_bookingId_key`;

-- RenameIndex
ALTER TABLE `checkincode` RENAME INDEX `generatedAt` TO `CheckinCode_generatedAt_idx`;

-- RenameIndex
ALTER TABLE `checkincode` RENAME INDEX `status` TO `CheckinCode_status_idx`;

-- RenameIndex
ALTER TABLE `invoice` RENAME INDEX `bookingId` TO `Invoice_bookingId_idx`;

-- RenameIndex
ALTER TABLE `invoice` RENAME INDEX `invoiceNumber` TO `Invoice_invoiceNumber_key`;

-- RenameIndex
ALTER TABLE `invoice` RENAME INDEX `issuedAt` TO `Invoice_issuedAt_idx`;

-- RenameIndex
ALTER TABLE `invoice` RENAME INDEX `ownerId` TO `Invoice_ownerId_idx`;

-- RenameIndex
ALTER TABLE `invoice` RENAME INDEX `paidAt` TO `Invoice_paidAt_idx`;

-- RenameIndex
ALTER TABLE `invoice` RENAME INDEX `receiptNumber` TO `Invoice_receiptNumber_key`;

-- RenameIndex
ALTER TABLE `invoice` RENAME INDEX `status` TO `Invoice_status_idx`;

-- RenameIndex
ALTER TABLE `payment_events` RENAME INDEX `eventId` TO `payment_events_eventId_key`;

-- RenameIndex
ALTER TABLE `property` RENAME INDEX `district` TO `Property_district_idx`;

-- RenameIndex
ALTER TABLE `property` RENAME INDEX `ownerId` TO `Property_ownerId_idx`;

-- RenameIndex
ALTER TABLE `property` RENAME INDEX `regionId` TO `Property_regionId_idx`;

-- RenameIndex
ALTER TABLE `property` RENAME INDEX `regionName` TO `Property_regionName_idx`;

-- RenameIndex
ALTER TABLE `property` RENAME INDEX `status` TO `Property_status_idx`;

-- RenameIndex
ALTER TABLE `property` RENAME INDEX `type` TO `Property_type_idx`;

-- RenameIndex
ALTER TABLE `property_images` RENAME INDEX `storageKey` TO `property_images_storageKey_key`;

-- RenameIndex
ALTER TABLE `referral_earnings` RENAME INDEX `bookingId` TO `referral_earnings_bookingId_idx`;

-- RenameIndex
ALTER TABLE `referral_earnings` RENAME INDEX `createdAt` TO `referral_earnings_createdAt_idx`;

-- RenameIndex
ALTER TABLE `referral_earnings` RENAME INDEX `driverId` TO `referral_earnings_driverId_idx`;

-- RenameIndex
ALTER TABLE `referral_earnings` RENAME INDEX `invoiceId` TO `referral_earnings_invoiceId_idx`;

-- RenameIndex
ALTER TABLE `referral_earnings` RENAME INDEX `referredUserId` TO `referral_earnings_referredUserId_idx`;

-- RenameIndex
ALTER TABLE `referral_earnings` RENAME INDEX `status` TO `referral_earnings_status_idx`;

-- RenameIndex
ALTER TABLE `referral_earnings` RENAME INDEX `withdrawalId` TO `referral_earnings_withdrawalId_idx`;

-- RenameIndex
ALTER TABLE `referral_withdrawals` RENAME INDEX `createdAt` TO `referral_withdrawals_createdAt_idx`;

-- RenameIndex
ALTER TABLE `referral_withdrawals` RENAME INDEX `driverId` TO `referral_withdrawals_driverId_idx`;

-- RenameIndex
ALTER TABLE `referral_withdrawals` RENAME INDEX `status` TO `referral_withdrawals_status_idx`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `email` TO `User_email_key`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `phone` TO `User_phone_key`;

-- RenameIndex
ALTER TABLE `user` RENAME INDEX `role` TO `User_role_idx`;

