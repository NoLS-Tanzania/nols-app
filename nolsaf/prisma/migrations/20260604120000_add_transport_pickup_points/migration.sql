-- CreateTable
CREATE TABLE `transport_pickup_points` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(64) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `shortLabel` VARCHAR(120) NOT NULL,
    `city` VARCHAR(120) NOT NULL,
    `category` VARCHAR(20) NOT NULL,
    `arrivalType` VARCHAR(20) NOT NULL,
    `latitude` DECIMAL(10, 6) NOT NULL,
    `longitude` DECIMAL(10, 6) NOT NULL,
    `iataCode` VARCHAR(8) NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transport_pickup_points_code_key`(`code`),
    INDEX `transport_pickup_points_isActive_category_idx`(`isActive`, `category`),
    INDEX `transport_pickup_points_city_idx`(`city`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed: airports use published/surveyed coordinates (verified = 1).
INSERT INTO `transport_pickup_points`
  (`code`,`name`,`shortLabel`,`city`,`category`,`arrivalType`,`latitude`,`longitude`,`iataCode`,`verified`,`updatedAt`) VALUES
  ('JNIA','Julius Nyerere International Airport (DAR)','JNIA, Dar es Salaam','Dar es Salaam','airport','FLIGHT',-6.878111,39.202625,'DAR',1,CURRENT_TIMESTAMP(3)),
  ('ZNZ','Abeid Amani Karume International Airport (ZNZ)','Karume, Zanzibar','Zanzibar (Unguja)','airport','FLIGHT',-6.222025,39.224886,'ZNZ',1,CURRENT_TIMESTAMP(3)),
  ('JRO','Kilimanjaro International Airport (JRO)','KIA, Kilimanjaro','Arusha and Moshi','airport','FLIGHT',-3.429390,37.074540,'JRO',1,CURRENT_TIMESTAMP(3)),
  ('MWZ','Mwanza Airport (MWZ)','Mwanza Airport','Mwanza','airport','FLIGHT',-2.444530,32.932740,'MWZ',1,CURRENT_TIMESTAMP(3)),
  ('MBI','Songwe Airport (MBI), Mbeya','Songwe, Mbeya','Mbeya','airport','FLIGHT',-8.919180,33.273490,'MBI',1,CURRENT_TIMESTAMP(3)),
  ('DOD','Dodoma Airport (DOD)','Dodoma Airport','Dodoma','airport','FLIGHT',-6.170410,35.752650,'DOD',1,CURRENT_TIMESTAMP(3)),
  ('MYW','Mtwara Airport (MYW)','Mtwara Airport','Mtwara','airport','FLIGHT',-10.339100,40.181830,'MYW',1,CURRENT_TIMESTAMP(3)),
  ('TBO','Tabora Airport (TBO)','Tabora Airport','Tabora','airport','FLIGHT',-5.076430,32.833300,'TBO',1,CURRENT_TIMESTAMP(3)),
  ('TKQ','Kigoma Airport (TKQ)','Kigoma Airport','Kigoma','airport','FLIGHT',-4.886200,29.629000,'TKQ',1,CURRENT_TIMESTAMP(3)),
  ('PMA','Pemba Airport (PMA)','Pemba Airport','Pemba Island','airport','FLIGHT',-5.257300,39.811400,'PMA',1,CURRENT_TIMESTAMP(3)),
  ('MFA','Mafia Airport (MFA)','Mafia Airport','Mafia Island','airport','FLIGHT',-7.917000,39.668500,'MFA',1,CURRENT_TIMESTAMP(3)),
  ('TGT','Tanga Airport (TGT)','Tanga Airport','Tanga','airport','FLIGHT',-5.092400,39.071200,'TGT',1,CURRENT_TIMESTAMP(3)),
  ('LKY','Lake Manyara Airport (LKY)','Manyara Airport','Manyara','airport','FLIGHT',-3.376300,35.818200,'LKY',1,CURRENT_TIMESTAMP(3)),
  ('SHY','Shinyanga Airport (SHY)','Shinyanga Airport','Shinyanga','airport','FLIGHT',-3.609300,33.500300,'SHY',1,CURRENT_TIMESTAMP(3)),
  ('IRI','Iringa Airport (IRI)','Iringa Airport','Iringa','airport','FLIGHT',-7.668800,35.752300,'IRI',1,CURRENT_TIMESTAMP(3)),
  ('MUZ','Musoma Airport (MUZ)','Musoma Airport','Musoma','airport','FLIGHT',-1.503000,33.800900,'MUZ',1,CURRENT_TIMESTAMP(3)),
  ('BKZ','Bukoba Airport (BKZ)','Bukoba Airport','Bukoba','airport','FLIGHT',-1.332200,31.821200,'BKZ',1,CURRENT_TIMESTAMP(3));

-- Seed: bus terminals. Verified ones were confirmed on OpenStreetMap; the rest
-- carry approximate city coordinates (verified = 0) for an admin to correct.
INSERT INTO `transport_pickup_points`
  (`code`,`name`,`shortLabel`,`city`,`category`,`arrivalType`,`latitude`,`longitude`,`iataCode`,`verified`,`updatedAt`) VALUES
  ('BUS_MAGUFULI','John Magufuli Bus Terminal (Mbezi)','Magufuli, Dar es Salaam','Dar es Salaam','bus_terminal','BUS',-6.784629,39.108920,NULL,1,CURRENT_TIMESTAMP(3)),
  ('BUS_UBUNGO','Ubungo International Bus Terminal','Ubungo, Dar es Salaam','Dar es Salaam','bus_terminal','BUS',-6.791800,39.211216,NULL,1,CURRENT_TIMESTAMP(3)),
  ('BUS_ARUSHA','Arusha City Bus Terminal','Arusha Bus Terminal','Arusha','bus_terminal','BUS',-3.371093,36.685215,NULL,1,CURRENT_TIMESTAMP(3)),
  ('BUS_MSAMVU','Msamvu Bus Terminal','Msamvu, Morogoro','Morogoro','bus_terminal','BUS',-6.804239,37.664606,NULL,1,CURRENT_TIMESTAMP(3)),
  ('BUS_NYEGEZI','Nyegezi Bus Terminal','Nyegezi, Mwanza','Mwanza','bus_terminal','BUS',-2.584858,32.920228,NULL,1,CURRENT_TIMESTAMP(3)),
  ('BUS_BUZURUGA','Buzuruga Bus Terminal (Nyakato)','Buzuruga, Mwanza','Mwanza','bus_terminal','BUS',-2.514591,32.935247,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_MOSHI','Moshi Bus Stand','Moshi Bus Stand','Moshi','bus_terminal','BUS',-3.350000,37.333300,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_DODOMA','Dodoma Bus Stand','Dodoma Bus Stand','Dodoma','bus_terminal','BUS',-6.173100,35.739400,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_TANGA','Tanga Bus Stand','Tanga Bus Stand','Tanga','bus_terminal','BUS',-5.066700,39.100000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_MBEYA','Mbeya Bus Stand','Mbeya Bus Stand','Mbeya','bus_terminal','BUS',-8.900000,33.450000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_IRINGA','Iringa Bus Stand','Iringa Bus Stand','Iringa','bus_terminal','BUS',-7.766700,35.700000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_KIGOMA','Kigoma Bus Stand','Kigoma Bus Stand','Kigoma','bus_terminal','BUS',-4.883300,29.633300,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_TABORA','Tabora Bus Stand','Tabora Bus Stand','Tabora','bus_terminal','BUS',-5.066700,32.800000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_SONGEA','Songea Bus Stand','Songea Bus Stand','Songea','bus_terminal','BUS',-10.683300,35.650000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_MTWARA','Mtwara Bus Stand','Mtwara Bus Stand','Mtwara','bus_terminal','BUS',-10.266700,40.183300,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_LINDI','Lindi Bus Stand','Lindi Bus Stand','Lindi','bus_terminal','BUS',-9.950000,39.716700,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_MUSOMA','Musoma Bus Stand','Musoma Bus Stand','Musoma','bus_terminal','BUS',-1.500000,33.800000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_BUKOBA','Bukoba Bus Stand','Bukoba Bus Stand','Bukoba','bus_terminal','BUS',-1.333300,31.816700,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_NJOMBE','Njombe Bus Stand','Njombe Bus Stand','Njombe','bus_terminal','BUS',-9.333300,34.766700,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_SHINYANGA','Shinyanga Bus Stand','Shinyanga Bus Stand','Shinyanga','bus_terminal','BUS',-3.660000,33.430000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('BUS_MWANAKWEREKWE','Mwanakwerekwe Bus Terminal','Mwanakwerekwe, Zanzibar','Zanzibar (Unguja)','bus_terminal','BUS',-6.176900,39.227500,NULL,0,CURRENT_TIMESTAMP(3));

-- Seed: ferry ports. Kivukoni verified; the rest are approximate (verified = 0).
INSERT INTO `transport_pickup_points`
  (`code`,`name`,`shortLabel`,`city`,`category`,`arrivalType`,`latitude`,`longitude`,`iataCode`,`verified`,`updatedAt`) VALUES
  ('FERRY_KIVUKONI','Kivukoni Ferry Terminal, Dar es Salaam','Kivukoni, Dar es Salaam','Dar es Salaam','ferry_port','FERRY',-6.818970,39.298510,NULL,1,CURRENT_TIMESTAMP(3)),
  ('FERRY_STONETOWN','Malindi Port (Stone Town), Zanzibar','Stone Town Ferry, Zanzibar','Zanzibar (Unguja)','ferry_port','FERRY',-6.162200,39.188000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('FERRY_MKOANI','Mkoani Jetty, Pemba Island','Mkoani, Pemba','Pemba Island','ferry_port','FERRY',-5.316700,39.716700,NULL,0,CURRENT_TIMESTAMP(3)),
  ('FERRY_CHAKE_CHAKE','Chake Chake Port, Pemba Island','Chake Chake, Pemba','Pemba Island','ferry_port','FERRY',-5.250000,39.766700,NULL,0,CURRENT_TIMESTAMP(3)),
  ('FERRY_MAFIA','Mafia Island Jetty','Mafia Jetty','Mafia Island','ferry_port','FERRY',-7.900000,39.650000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('FERRY_TANGA','Tanga Port','Tanga Port','Tanga','ferry_port','FERRY',-5.066700,39.100000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('FERRY_MWANZA','Mwanza Port, Lake Victoria','Mwanza Port','Mwanza','ferry_port','FERRY',-2.516700,32.900000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('FERRY_BUKOBA','Bukoba Port, Lake Victoria','Bukoba Port','Bukoba','ferry_port','FERRY',-1.333300,31.816700,NULL,0,CURRENT_TIMESTAMP(3)),
  ('FERRY_MUSOMA','Musoma Port, Lake Victoria','Musoma Port','Musoma','ferry_port','FERRY',-1.500000,33.800000,NULL,0,CURRENT_TIMESTAMP(3)),
  ('FERRY_KIGOMA','Kigoma Port, Lake Tanganyika','Kigoma Port','Kigoma','ferry_port','FERRY',-4.883300,29.633300,NULL,0,CURRENT_TIMESTAMP(3)),
  ('FERRY_ITUNGI','Itungi Port (Kyela), Lake Nyasa','Itungi, Kyela','Kyela, Mbeya','ferry_port','FERRY',-9.583300,33.983300,NULL,0,CURRENT_TIMESTAMP(3));
