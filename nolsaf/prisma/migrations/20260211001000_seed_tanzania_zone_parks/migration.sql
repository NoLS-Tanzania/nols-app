-- Seed additional Tanzania parks grouped by zones (idempotent)

INSERT INTO `TourismSite` (`slug`, `name`, `country`, `description`) VALUES
  ('katavi-national-park', 'Katavi National Park', 'Tanzania', NULL),
  ('kitulo-national-park', 'Kitulo National Park', 'Tanzania', NULL),

  ('saanane-island-national-park', 'Saanane Island National Park', 'Tanzania', NULL),
  ('burigi-chato-national-park', 'Burigi-Chato National Park', 'Tanzania', NULL),
  ('rubondo-national-park', 'Rubondo National Park', 'Tanzania', NULL),
  ('gombe-national-park', 'Gombe National Park', 'Tanzania', NULL),
  ('mahale-mountains-national-park', 'Mahale Mountains National Park', 'Tanzania', NULL),
  ('ibanda-kyerwa-national-park', 'Ibanda-Kyerwa National Park', 'Tanzania', NULL),
  ('rumanyika-karagwe-national-park', 'Rumanyika-Karagwe National Park', 'Tanzania', NULL),
  ('ugalla-river-national-park', 'Ugalla River National Park', 'Tanzania', NULL),

  ('arusha-national-park', 'Arusha National Park', 'Tanzania', NULL),
  ('mkomazi-national-park', 'Mkomazi National Park', 'Tanzania', NULL),
  ('kilimanjaro-national-park', 'Kilimanjaro National Park', 'Tanzania', NULL),

  ('saadani-national-park', 'Saadani National Park', 'Tanzania', NULL),
  ('mikumi-national-park', 'Mikumi National Park', 'Tanzania', NULL),
  ('udzungwa-mountains-national-park', 'Udzungwa Mountains National Park', 'Tanzania', NULL)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `country` = VALUES(`country`);
