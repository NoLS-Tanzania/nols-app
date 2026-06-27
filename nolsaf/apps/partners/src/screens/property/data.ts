// ── Tanzania regions + districts (compact form from tzRegions.ts) ──────────

export const TZ_REGIONS: Record<string, string[]> = {
  "ARUSHA":          ["ARUSHA CBD","ARUSHA","ARUMERU","MONDULI","LONGIDO","KARATU","NGORONGORO"],
  "DAR-ES-SALAAM":   ["ILALA CBD","ILALA","KINONDONI","TEMEKE","UBUNGO","KIGAMBONI"],
  "DODOMA":          ["DODOMA","BAHI","CHAMWINO","KONGWA","MPWAPWA","KONDOA","CHEMBA"],
  "GEITA":           ["GEITA","NYANG'HWALE","CHATO","MBOGWE","BUKOMBE"],
  "IRINGA":          ["IRINGA CBD","IRINGA","KILOLO","MUFINDI"],
  "KAGERA":          ["BUKOBA CBD","BUKOBA","MISSENYI","KARAGWE","MULEBA","BIHARAMULO","NGARA","KYERWA"],
  "KATAVI":          ["MPANDA -CBD","TANGANYIKA","MLELE"],
  "KIGOMA":          ["KIGOMA","KASULU","KIBONDO","BUHIGWE","UVINZA","KAKONKO"],
  "KILIMANJARO":     ["MOSHI CBD","MOSHI","HAI","SIHA","MWANGA","SAME","ROMBO"],
  "LINDI":           ["LINDI CBD","LINDI","NACHINGWEA","KILWA","LIWALE","RUANGWA"],
  "MANYARA":         ["BABATI CBD","BABATI","HANANG'","MBULU","KITETO","SIMANJIRO"],
  "MARA":            ["MUSOMA CBD","BUTIAMA","RORYA","TARIME","BUNDA","SERENGETI"],
  "MBEYA":           ["MBEYA CBD","MBEYA","RUNGWE","MBARALI","KYELA","CHUNYA"],
  "MOROGORO":        ["MOROGORO","MVOMERO","KILOSA","KILOMBERO","ULANGA","GAIRO","MALINYI"],
  "MTWARA":          ["MTWARA CBD","MTWARA","TANDAHIMBA","NEWALA","MASASI","NANYUMBU"],
  "MWANZA":          ["NYAMAGANA","ILEMELA","SENGEREMA","MAGU","MISUNGWI","UKEREWE","KWIMBA"],
  "NJOMBE":          ["NJOMBE CBD","NJOMBE","LUDEWA","MAKETE"],
  "PWANI":           ["KIBAHA CBD","KIBAHA","BAGAMOYO","KISARAWE","MKURANGA","RUFIJI","MAFIA","KIBITI"],
  "RUKWA":           ["SUMBAWANGA","NKASI","KALAMBO"],
  "RUVUMA":          ["SONGEA CBD","SONGEA","NAMTUMBO","MBINGA","NYASA","TUNDURU"],
  "SHINYANGA":       ["SHINYANGA","KAHAMA","KISHAPU"],
  "SIMIYU":          ["BARIADI","ITILIMA","MASWA","MEATU","BUSEGA"],
  "SINGIDA":         ["SINGIDA CBD","SINGIDA","IRAMBA","MANYONI","MKALAMA","IKUNGI"],
  "SONGWE":          ["SONGWE","MBOZI","ILEJE","MOMBA"],
  "TABORA":          ["TABORA CBD","UYUI","SIKONGE","NZEGA","URAMBO","IGUNGA","KALIUA"],
  "TANGA":           ["TANGA CBD","TANGA","PANGANI","MUHEZA","MKINGA","KOROGWE","LUSHOTO","HANDENI","KILINDI"],
  "MJINI MAGHARIBI": ["MJINI","MAGHARIBI"],
  "PEMBA KASKAZINI": ["MICHEWENI","WETE"],
  "PEMBA KUSINI":    ["CHAKECHAKE","MKOANI"],
  "UNGUJA KASKAZINI":["KASKAZINI A","KASKAZINI B"],
  "UNGUJA KUSINI":   ["KATI","KUSINI"],
};

export const REGION_NAMES = Object.keys(TZ_REGIONS).sort();

// ── Property types ─────────────────────────────────────────────────────────

export const PROPERTY_TYPES = [
  { key: "VILLA",       label: "Villa" },
  { key: "APARTMENT",   label: "Apartment" },
  { key: "HOTEL",       label: "Hotel" },
  { key: "LODGE",       label: "Lodge" },
  { key: "CONDO",       label: "Condo" },
  { key: "GUEST_HOUSE", label: "Guest House" },
  { key: "BUNGALOW",    label: "Bungalow" },
  { key: "CABIN",       label: "Cabin" },
  { key: "HOMESTAY",    label: "Homestay" },
  { key: "TOWNHOUSE",   label: "Townhouse" },
  { key: "HOUSE",       label: "House" },
  { key: "OTHER",       label: "Other" },
] as const;

export const HOTEL_STARS = [
  { key: "basic",    label: "1 Star",  desc: "Basic accommodations" },
  { key: "simple",   label: "2 Stars", desc: "Simple and affordable" },
  { key: "moderate", label: "3 Stars", desc: "Moderate quality" },
  { key: "high",     label: "4 Stars", desc: "High-end comfort" },
  { key: "luxury",   label: "5 Stars", desc: "Luxury and exceptional" },
] as const;

export const BUILDING_TYPES = [
  { key: "single_storey",  label: "Single storey" },
  { key: "multi_storey",   label: "Multi storey" },
  { key: "separate_units", label: "Separate units" },
] as const;

// ── Room data ──────────────────────────────────────────────────────────────

export const ROOM_TYPES = [
  "Single", "Double", "Studio", "Suite", "Family", "Other"
] as const;

export const BED_TYPES = [
  { key: "twin",  label: "Twin",  dim: "96 × 190 cm",  desc: "Single sleeper"          },
  { key: "full",  label: "Full",  dim: "137 × 190 cm", desc: "Fits 1 to 2 sleepers"    },
  { key: "queen", label: "Queen", dim: "152 × 203 cm", desc: "Most popular, fits 2"     },
  { key: "king",  label: "King",  dim: "193 × 203 cm", desc: "Maximum space for 2"      },
] as const;

export const BATHROOM_ITEMS = [
  "Free toiletries", "Toilet paper", "Shower",    "Water Heater",
  "Toilet",          "Hairdryer",    "Trash Bin",  "Toilet Brush",
  "Mirror",          "Slippers",     "Bathrobe",   "Bath Mat",
  "Towel",
] as const;

export const ROOM_AMENITIES = [
  "Free Wi-Fi",      "Table",          "Chair",         "Iron",
  "TV",              "Flat Screen TV", "PS Station",    "Wardrobe",
  "Air Conditioning","Mini Fridge",    "Coffee Maker",  "Phone",
  "Mirror",          "Bedside Lamps",  "Heating",       "Desk",
  "Safe",            "Clothes Rack",   "Blackout Curtains", "Couches",
] as const;

// ── Services ───────────────────────────────────────────────────────────────

export const PARKING_OPTIONS = [
  { key: "no",   label: "No parking" },
  { key: "free", label: "Free parking" },
  { key: "paid", label: "Paid parking" },
] as const;

export const SERVICE_TOGGLES = [
  { key: "restaurant",      label: "Restaurant" },
  { key: "bar",             label: "Bar / Lounge" },
  { key: "pool",            label: "Swimming pool" },
  { key: "sauna",           label: "Sauna / Steam room" },
  { key: "laundry",         label: "Laundry service" },
  { key: "roomService",     label: "Room service" },
  { key: "security24",      label: "Security (24/7)" },
  { key: "firstAid",        label: "First aid / Medical" },
  { key: "fireExtinguisher",label: "Fire extinguisher" },
  { key: "onSiteShop",      label: "On-site shop" },
  { key: "nearbyMall",      label: "Nearby mall" },
  { key: "socialHall",      label: "Social hall / Events" },
  { key: "sportsGames",     label: "Sports / Games" },
  { key: "gym",             label: "Gym / Fitness" },
] as const;

export const FACILITY_TYPES = [
  "Hospital", "Pharmacy", "Polyclinic", "Clinic",
  "Airport", "Bus station", "Petrol station",
  "Police station", "Conference center", "Stadium", "Main road",
] as const;

export const REACH_MODES = ["Walking", "Boda", "Public Transport", "Car/Taxi"] as const;

// ── House rules / payment ──────────────────────────────────────────────────

export const PAYMENT_MODES = [
  { key: "CASH",         label: "Cash" },
  { key: "CARD",         label: "Card" },
  { key: "MOBILE_MONEY", label: "Mobile Money" },
] as const;

// ── Full location hierarchy (ward / street cascade + postcode autofill) ─────

import { REGIONS_FULL_DATA } from "../../../../web/lib/tzRegionsFull";

export type WardInfo = { name: string; postcode: string };

export function getWards(regionName: string, districtName: string): WardInfo[] {
  const region   = REGIONS_FULL_DATA.find(r => r.name === regionName);
  const district = region?.districts?.find(d => d.name === districtName);
  return (district?.wards ?? []).map(w => ({ name: w.name ?? "", postcode: w.postcode ?? "" }));
}

export function getStreets(regionName: string, districtName: string, wardName: string): string[] {
  const region   = REGIONS_FULL_DATA.find(r => r.name === regionName);
  const district = region?.districts?.find(d => d.name === districtName);
  const ward     = district?.wards?.find(w => w.name === wardName);
  return ward?.streets ?? [];
}

export function getRegionCode(regionName: string): string | undefined {
  return REGIONS_FULL_DATA.find(r => r.name === regionName)?.code;
}

// ── Status display ─────────────────────────────────────────────────────────

export const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED:  { label: "Approved",  color: "#15803d", bg: "#dcfce7" },
  PENDING:   { label: "Pending",   color: "#b45309", bg: "#fef3c7" },
  DRAFT:     { label: "Draft",     color: "#6b7280", bg: "#f3f4f6" },
  REJECTED:  { label: "Rejected",  color: "#b91c1c", bg: "#fee2e2" },
  SUSPENDED: { label: "Suspended", color: "#7c3aed", bg: "#ede9fe" },
};
