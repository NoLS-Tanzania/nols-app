import type { REACH_MODES } from "./data";

// ── Primitives ─────────────────────────────────────────────────────────────

export type ReachMode = typeof REACH_MODES[number];

export type RoomBeds = {
  twin: number;
  full: number;
  queen: number;
  king: number;
};

export type RoomSpec = {
  _localId: string;        // uuid for list key
  type: string;            // "Single" | "Double" | ...
  otherType: string;
  count: string;
  beds: RoomBeds;
  pricePerNight: string;
  bathroomPrivate: boolean;
  smokingAllowed: boolean;
  bathroomItems: string[];
  amenities: string[];
  description: string;
  photos: string[];        // Cloudinary URLs
};

export type Facility = {
  _localId: string;
  type: string;
  name: string;
  ownership: string;       // "Public/Government" | "Private" | ""
  distanceKm: string;
  reachableBy: ReachMode[];
  url: string;
};

export type ServicesData = {
  parking: "no" | "free" | "paid" | "";
  parkingPrice: string;
  breakfastIncluded: boolean;
  breakfastAvailable: boolean;
  restaurant: boolean;
  bar: boolean;
  pool: boolean;
  sauna: boolean;
  laundry: boolean;
  roomService: boolean;
  security24: boolean;
  firstAid: boolean;
  fireExtinguisher: boolean;
  onSiteShop: boolean;
  nearbyMall: boolean;
  socialHall: boolean;
  sportsGames: boolean;
  gym: boolean;
  nearbyFacilities: Facility[];
};

export type HouseRules = {
  checkInFrom: string;
  checkOutFrom: string;
  petsAllowed: boolean | null;
  petsNote: string;
  smokingNotAllowed: boolean | null;
  other: string;
};

// ── Main draft shape ───────────────────────────────────────────────────────

export type PropertyDraft = {
  // Step 1 — Basics
  title: string;
  type: string;
  otherType: string;
  hotelStar: string;
  buildingType: string;
  totalFloors: string;
  regionName: string;
  district: string;
  ward: string;
  street: string;
  city: string;
  zip: string;
  country: string;
  latitude: string;
  longitude: string;
  tourismSiteId:   number | null;
  tourismSiteName: string;
  parkPlacement:   "INSIDE" | "NEARBY" | "";

  // Step 2 — Rooms
  roomsSpec: RoomSpec[];

  // Step 3 — Services
  services: ServicesData;

  // Step 4 — Totals
  totalBedrooms: string;
  totalBathrooms: string;
  maxGuests: string;
  description: string;
  acceptGroupBookings: boolean;
  houseRules: HouseRules;
  freeCancellation: boolean;
  paymentModes: string[];

  // Step 5 — Photos
  photos: string[];
};

export const EMPTY_SERVICES: ServicesData = {
  parking: "",
  parkingPrice: "",
  breakfastIncluded: false,
  breakfastAvailable: false,
  restaurant: false,
  bar: false,
  pool: false,
  sauna: false,
  laundry: false,
  roomService: false,
  security24: false,
  firstAid: false,
  fireExtinguisher: false,
  onSiteShop: false,
  nearbyMall: false,
  socialHall: false,
  sportsGames: false,
  gym: false,
  nearbyFacilities: [],
};

export const EMPTY_HOUSE_RULES: HouseRules = {
  checkInFrom: "",
  checkOutFrom: "",
  petsAllowed: null,
  petsNote: "",
  smokingNotAllowed: null,
  other: "",
};

export const EMPTY_DRAFT: PropertyDraft = {
  title: "",
  type: "",
  otherType: "",
  hotelStar: "",
  buildingType: "single_storey",
  totalFloors: "",
  regionName: "",
  district: "",
  ward: "",
  street: "",
  city: "",
  zip: "",
  country: "Tanzania",
  latitude: "",
  longitude: "",
  tourismSiteId:   null,
  tourismSiteName: "",
  parkPlacement:   "",
  roomsSpec: [],
  services: EMPTY_SERVICES,
  totalBedrooms: "",
  totalBathrooms: "",
  maxGuests: "",
  description: "",
  acceptGroupBookings: false,
  houseRules: EMPTY_HOUSE_RULES,
  freeCancellation: false,
  paymentModes: [],
  photos: [],
};

// ── API shapes ─────────────────────────────────────────────────────────────

export type TourismSite = {
  id: number;
  slug: string;
  name: string;
  country: string;
};

export type ListProperty = {
  id: number;
  status: string;
  title: string;
  type: string;
  photos: string[] | null;
  regionName: string | null;
  district: string | null;
  city: string | null;
  basePrice: number | null;
  currency: string | null;
  _count: { bookings: number };
  rejectionReasons: string[] | null;
  suspensionReason?: string | null;
  lastSubmittedAt: string | null;
  createdAt: string;
};
