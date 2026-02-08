-- Add transport payouts table for driver reconciliation.
-- MySQL-safe: create table only if it does not exist.

SET @table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'transport_payouts'
);

SET @sql := IF(
  @table_exists = 0,
  'CREATE TABLE transport_payouts (
    id INT NOT NULL AUTO_INCREMENT,
    transportBookingId INT NOT NULL,
    driverId INT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT "TZS",
    grossAmount DECIMAL(12,2) NOT NULL,
    commissionPercent DECIMAL(5,2) NOT NULL,
    commissionAmount DECIMAL(12,2) NOT NULL,
    netPaid DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT "PENDING",
    approvedAt DATETIME(3) NULL,
    approvedBy INT NULL,
    paidAt DATETIME(3) NULL,
    paidBy INT NULL,
    paymentMethod VARCHAR(40) NULL,
    paymentRef VARCHAR(80) NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    UNIQUE KEY transport_payouts_transportBookingId_key (transportBookingId),
    KEY transport_payouts_driverId_idx (driverId),
    KEY transport_payouts_status_idx (status),
    KEY transport_payouts_approvedAt_idx (approvedAt),
    KEY transport_payouts_paidAt_idx (paidAt),
    CONSTRAINT transport_payouts_transportBookingId_fkey FOREIGN KEY (transportBookingId) REFERENCES TransportBooking(id) ON DELETE CASCADE,
    CONSTRAINT transport_payouts_driverId_fkey FOREIGN KEY (driverId) REFERENCES User(id) ON DELETE CASCADE,
    CONSTRAINT transport_payouts_approvedBy_fkey FOREIGN KEY (approvedBy) REFERENCES User(id) ON DELETE SET NULL,
    CONSTRAINT transport_payouts_paidBy_fkey FOREIGN KEY (paidBy) REFERENCES User(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;'
  ,
  'SELECT 1;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
