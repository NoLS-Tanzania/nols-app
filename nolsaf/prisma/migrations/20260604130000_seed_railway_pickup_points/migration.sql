-- Seed railway/train station pickup points so the "train_station" category has
-- content and appears in the pickup picker. Dar stations confirmed on OSM
-- (verified = 1); Morogoro is a nearby place node (verified = 0).
INSERT INTO `transport_pickup_points`
  (`code`,`name`,`shortLabel`,`city`,`category`,`arrivalType`,`latitude`,`longitude`,`iataCode`,`verified`,`updatedAt`) VALUES
  ('TRAIN_TAZARA_DAR','TAZARA Railway Station (Dar es Salaam)','TAZARA, Dar es Salaam','Dar es Salaam','train_station','TRAIN',-6.846408,39.245033,NULL,1,CURRENT_TIMESTAMP(3)),
  ('TRAIN_DAR_CENTRAL','Dar es Salaam Central Railway Station','Central Station, Dar es Salaam','Dar es Salaam','train_station','TRAIN',-6.824880,39.283029,NULL,1,CURRENT_TIMESTAMP(3)),
  ('TRAIN_MOROGORO','Morogoro Railway Station','Morogoro Station','Morogoro','train_station','TRAIN',-6.822352,37.672432,NULL,0,CURRENT_TIMESTAMP(3));
