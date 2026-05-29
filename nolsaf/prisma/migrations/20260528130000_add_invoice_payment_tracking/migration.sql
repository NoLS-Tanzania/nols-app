-- Add AzamPay transaction tracking columns to invoice table
-- checkoutSessionId: stores AzamPay transactionId (mirrors TourBooking.checkoutSessionId)
-- payerPhone: phone number used for MNO payments

ALTER TABLE `invoice`
  ADD COLUMN `checkoutSessionId` VARCHAR(120) NULL,
  ADD COLUMN `payerPhone`        VARCHAR(40)  NULL;

-- Unique index so we can look up an invoice by AzamPay transactionId
CREATE UNIQUE INDEX `invoice_checkoutSessionId_key`
  ON `invoice` (`checkoutSessionId`);
