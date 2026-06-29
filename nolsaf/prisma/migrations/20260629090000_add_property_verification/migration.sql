CREATE TABLE IF NOT EXISTS `property_verification` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `propertyId` INT NOT NULL,
  `status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  `verifiedAt` DATETIME(3) NULL,
  `verifiedBy` INT NULL,
  `method` VARCHAR(120) NULL,
  `note` TEXT NULL,
  `checklist` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `property_verification_propertyId_key` (`propertyId`),
  KEY `property_verification_status_idx` (`status`),
  KEY `property_verification_verifiedAt_idx` (`verifiedAt`),
  KEY `property_verification_verifiedBy_idx` (`verifiedBy`),
  CONSTRAINT `property_verification_propertyId_fkey`
    FOREIGN KEY (`propertyId`) REFERENCES `property` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `property_verification_verifiedBy_fkey`
    FOREIGN KEY (`verifiedBy`) REFERENCES `user` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO `property_verification` (
  `propertyId`,
  `status`,
  `verifiedAt`,
  `verifiedBy`,
  `method`,
  `note`,
  `checklist`,
  `createdAt`,
  `updatedAt`
)
SELECT
  p.`id`,
  'VERIFIED',
  COALESCE(a.`createdAt`, p.`updatedAt`, p.`createdAt`),
  a.`actorId`,
  'Site visit and listing review',
  'This stay is listed publicly only after NoLSAF verification and approval.',
  JSON_ARRAY(
    'Property details reviewed',
    'Location and listing information checked',
    'Photos and stay information reviewed',
    'Host listing approved'
  ),
  COALESCE(a.`createdAt`, p.`updatedAt`, p.`createdAt`),
  CURRENT_TIMESTAMP(3)
FROM `property` p
LEFT JOIN (
  SELECT al.*
  FROM `auditlog` al
  INNER JOIN (
    SELECT `entityId`, MAX(`id`) AS `id`
    FROM `auditlog`
    WHERE `entity` = 'PROPERTY'
      AND `action` IN ('PROPERTY_APPROVE', 'PROPERTY_UNSUSPEND')
      AND `entityId` IS NOT NULL
    GROUP BY `entityId`
  ) latest ON latest.`id` = al.`id`
) a ON a.`entityId` = p.`id`
WHERE p.`status` = 'APPROVED'
ON DUPLICATE KEY UPDATE
  `status` = 'VERIFIED',
  `verifiedAt` = COALESCE(`property_verification`.`verifiedAt`, VALUES(`verifiedAt`)),
  `verifiedBy` = COALESCE(`property_verification`.`verifiedBy`, VALUES(`verifiedBy`)),
  `method` = COALESCE(`property_verification`.`method`, VALUES(`method`)),
  `note` = COALESCE(`property_verification`.`note`, VALUES(`note`)),
  `checklist` = COALESCE(`property_verification`.`checklist`, VALUES(`checklist`));
