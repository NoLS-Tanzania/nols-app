import { SITE_URL, seoKeywords } from "@/lib/seo";

export type SeoLandingPage = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  heroImage: string;
  keywords: string[];
  intro: string;
  focus: string[];
  nolsafValue: string[];
  faqs: Array<{ question: string; answer: string }>;
  links?: Array<{ label: string; href: string }>;
};

export const paymentTrust = {
  title: "Friendly payment methods for local and international travelers",
  description:
    "NoLSAF supports traveler-friendly payment flows across mobile money/MNO channels, bank transfers and card payments so bookings can work for local guests, diaspora travelers and international visitors.",
  methods: [
    "Mobile money and MNO payments such as M-Pesa, Airtel Money, Mixx by Yas, HaloPesa and T-Kash where supported",
    "Bank transfer options for guests, operators and property partners",
    "Card payments including Visa and Mastercard where available",
    "Transparent payment records for accommodation, tour, transport and group booking flows",
  ],
};

export const tanzaniaDestinations: SeoLandingPage[] = [
  {
    slug: "zanzibar",
    title: "Zanzibar Accommodation, Beach Holidays & Tanzania Island Travel",
    shortTitle: "Zanzibar",
    description:
      "Find verified Zanzibar stays, beach holiday support, Stone Town access, airport transfers and Tanzania island travel planning with NoLSAF.",
    heroImage: "/assets/Toursite.jpeg",
    keywords: ["Zanzibar accommodation", "Zanzibar beach holidays", "Stone Town hotels", "Zanzibar airport transfer", ...seoKeywords],
    intro:
      "Zanzibar is one of Tanzania's strongest tourism searches, combining beach stays, Stone Town culture, spice routes and island transfers. NoLSAF helps travelers compare verified accommodation and coordinate the practical parts of the journey.",
    focus: ["Beach accommodation and island stays", "Stone Town and cultural access", "Airport and ferry transfers", "Family, group and couple travel"],
    nolsafValue: [
      "Verified properties suitable for beach, city and island stays",
      "Transport coordination from airport, ferry or city pickup points",
      "Custom trip planning for beach, cultural and short-stay itineraries",
      "Payment options through mobile money, bank and cards where available",
    ],
    faqs: [
      { question: "Can NoLSAF help with Zanzibar accommodation?", answer: "Yes. NoLSAF focuses on verified stays and helps connect accommodation with transport and payment support." },
      { question: "Can visitors arrange transfers?", answer: "Travelers can use NoLSAF transport flows for airport, ferry and local pickup/drop-off coordination where available." },
    ],
  },
  {
    slug: "serengeti",
    title: "Serengeti Safari Packages, Lodges & Tanzania Wildlife Travel",
    shortTitle: "Serengeti",
    description:
      "Plan Serengeti safari travel with verified stays, approved tour operators, driver transport and transparent payment options on NoLSAF.",
    heroImage: "/assets/Serengeti National Park.jpg",
    keywords: ["Serengeti safari", "Serengeti lodges", "Tanzania safari packages", "Great Migration Tanzania", ...seoKeywords],
    intro:
      "Serengeti is a core Tanzania tourism destination for wildlife, game drives and migration experiences. The journey needs trusted operators, clear accommodation options and transport coordination.",
    focus: ["Safari package comparison", "Lodges and stays near routes", "Game drive planning", "Transport and timing coordination"],
    nolsafValue: [
      "Approved tour operator discovery",
      "Verified accommodation search for safari routes",
      "Trip cost estimation through NoLScope",
      "Secure payment records for tour and accommodation flows",
    ],
    faqs: [
      { question: "Does NoLSAF list Serengeti safari packages?", answer: "NoLSAF supports tour package discovery from approved operators and connects travelers to related accommodation and transport flows." },
      { question: "Can I estimate Serengeti trip costs?", answer: "NoLScope helps estimate costs such as park fees, transport, activities and accommodation for Tanzania trips." },
    ],
  },
  {
    slug: "ngorongoro",
    title: "Ngorongoro Safari, Crater Tours & Tanzania Accommodation",
    shortTitle: "Ngorongoro",
    description:
      "Explore Ngorongoro crater tourism with verified stays, safari operators, route planning and payment support through NoLSAF.",
    heroImage: "/assets/Ngorongoro.jpg",
    keywords: ["Ngorongoro safari", "Ngorongoro crater tours", "Tanzania crater safari", "Arusha to Ngorongoro", ...seoKeywords],
    intro:
      "Ngorongoro is one of Tanzania's highest-value safari destinations. Travelers need clarity on route timing, nearby stays, operator quality and total cost.",
    focus: ["Crater safari planning", "Nearby lodges and route stays", "Arusha gateway transport", "Park and activity cost awareness"],
    nolsafValue: [
      "Verified stay discovery around northern Tanzania routes",
      "Approved operator visibility for tour bookings",
      "NoLScope estimates for fees, transport and accommodation",
      "Mobile money, bank and card payment friendliness",
    ],
    faqs: [
      { question: "Can NoLSAF support Ngorongoro travel planning?", answer: "Yes. NoLSAF connects verified stays, tour packages, transport and cost estimation for Tanzania tourism routes." },
      { question: "Is Ngorongoro connected with Arusha trips?", answer: "Arusha is a common gateway, and NoLSAF pages connect travelers to Arusha and northern circuit planning." },
    ],
  },
  {
    slug: "kilimanjaro",
    title: "Mount Kilimanjaro Travel, Trekking Stays & Tanzania Transport",
    shortTitle: "Kilimanjaro",
    description:
      "Prepare Mount Kilimanjaro travel with verified accommodation, transport, route planning and Tanzania travel cost support on NoLSAF.",
    heroImage: "/assets/Mount Kilimanjaro.jpg",
    keywords: ["Mount Kilimanjaro travel", "Kilimanjaro accommodation", "Kilimanjaro transport", "Tanzania hiking travel", ...seoKeywords],
    intro:
      "Kilimanjaro searches often start with trekking, airport arrival, Moshi/Arusha stays and transport. NoLSAF helps visitors organize verified stays and logistics around the route.",
    focus: ["Pre-trek and post-trek stays", "Airport and town transfers", "Hiking route preparation", "Cost and payment clarity"],
    nolsafValue: [
      "Verified hotel, lodge and guest house options",
      "Transport support around airport and town routes",
      "Custom trip planning for hiking and recovery days",
      "Friendly payment options for local and international travelers",
    ],
    faqs: [
      { question: "Can NoLSAF help with Kilimanjaro stays?", answer: "Yes. The platform supports verified accommodation discovery and transport coordination around Tanzania travel routes." },
      { question: "Does NoLSAF replace licensed trekking operators?", answer: "No. NoLSAF helps with travel logistics, verified stays and approved package discovery where available." },
    ],
  },
  {
    slug: "dar-es-salaam",
    title: "Dar es Salaam Hotels, Airport Transfers & Business Travel",
    shortTitle: "Dar es Salaam",
    description:
      "Book verified Dar es Salaam accommodation, airport transfers, business stays and city travel support through NoLSAF.",
    heroImage: "/assets/hotel.jpg",
    keywords: ["Dar es Salaam hotels", "Dar es Salaam airport transfer", "business travel Tanzania", "Dar es Salaam accommodation", ...seoKeywords],
    intro:
      "Dar es Salaam is a major arrival point, business city and coastal travel gateway. Travelers often need a trusted stay, clear payment method and reliable pickup or drop-off.",
    focus: ["Hotels and apartments", "Airport transfers", "Business and short stays", "Coastal and ferry connections"],
    nolsafValue: [
      "Verified city accommodation",
      "Driver transport and route coordination",
      "Mobile money, bank and card payment support",
      "Group and business stay support",
    ],
    faqs: [
      { question: "Can NoLSAF support Dar es Salaam airport transfers?", answer: "Yes. NoLSAF includes transport flows that support pickup and drop-off coordination where available." },
      { question: "Can businesses use NoLSAF for stays?", answer: "Yes. NoLSAF supports verified accommodation, group stays and payment records useful for business travel." },
    ],
  },
  {
    slug: "arusha",
    title: "Arusha Accommodation, Safari Gateway Travel & Tanzania Tours",
    shortTitle: "Arusha",
    description:
      "Use NoLSAF to find verified Arusha accommodation, safari gateway transport, tour packages and northern Tanzania travel support.",
    heroImage: "/assets/Welcome.jpg",
    keywords: ["Arusha accommodation", "Arusha safari gateway", "Arusha tours", "northern Tanzania safari", ...seoKeywords],
    intro:
      "Arusha is a key gateway to Serengeti, Ngorongoro, Tarangire, Manyara and Kilimanjaro. It needs strong accommodation, tour and transport coordination.",
    focus: ["Safari gateway stays", "Tour package comparison", "Airport and city transfers", "Northern circuit planning"],
    nolsafValue: [
      "Verified stays before and after safari routes",
      "Approved tour package visibility",
      "Driver transport coordination",
      "Cost estimation and payment flexibility",
    ],
    faqs: [
      { question: "Why is Arusha important for Tanzania tourism?", answer: "Arusha is a common base for northern Tanzania safaris and Kilimanjaro travel." },
      { question: "Can NoLSAF connect Arusha with safari planning?", answer: "Yes. NoLSAF links accommodation, tour package discovery, transport and cost estimation." },
    ],
  },
  {
    slug: "ruaha",
    title: "Ruaha National Park Safari, Southern Tanzania Stays & Travel",
    shortTitle: "Ruaha",
    description:
      "Discover Ruaha safari travel support, southern Tanzania accommodation, transport planning and payment-friendly booking flows with NoLSAF.",
    heroImage: "/assets/Big Five.jpg",
    keywords: ["Ruaha National Park", "southern Tanzania safari", "Ruaha safari accommodation", "Tanzania wildlife travel", ...seoKeywords],
    intro:
      "Ruaha gives Tanzania another strong safari search path beyond the northern circuit. Travelers need clear route planning, stays and transport support.",
    focus: ["Southern Tanzania safari planning", "Wildlife travel routes", "Verified nearby stays", "Transport and payment coordination"],
    nolsafValue: [
      "Accommodation discovery for southern routes",
      "Custom trip planning for longer itineraries",
      "Payment support through mobile money, banks and cards",
      "NoLScope cost awareness for trip budgeting",
    ],
    faqs: [
      { question: "Is Ruaha included in NoLSAF Tanzania tourism coverage?", answer: "Yes. Ruaha is included as part of the Tanzania-first tourism SEO and planning layer." },
      { question: "Can NoLSAF help with southern circuit planning?", answer: "NoLSAF supports custom trip planning, accommodation discovery and transport coordination for Tanzania routes." },
    ],
  },
];

export const servicePages: SeoLandingPage[] = [
  {
    slug: "verified-accommodation-tanzania",
    title: "Verified Accommodation Booking in Tanzania",
    shortTitle: "Verified accommodation",
    description:
      "Book verified hotels, lodges, apartments, villas and guest houses in Tanzania with NoLSAF's trust-first accommodation platform.",
    heroImage: "/assets/Apartments.jpg",
    keywords: ["verified accommodation Tanzania", "hotel booking Tanzania", "Tanzania guest houses", "Tanzania lodges", ...seoKeywords],
    intro:
      "Verified accommodation is the center of NoLSAF. Travelers should be able to compare real places, understand payment options and connect stays with transport and trip needs.",
    focus: ["Hotels, lodges and apartments", "Guest houses and villas", "Location, price and amenity comparison", "Owner and listing verification"],
    nolsafValue: ["Verification-first listings", "Travel-friendly payments", "Transport connection after booking", "Group stay and long-stay support"],
    faqs: [
      { question: "What makes NoLSAF accommodation verified?", answer: "NoLSAF is designed around trust, listing review and clear booking/payment records." },
      { question: "Can I pay using local methods?", answer: "NoLSAF supports mobile money/MNO, bank and card payment flows where available." },
    ],
  },
  {
    slug: "tanzania-tour-packages",
    title: "Tanzania Tour Packages from Approved Operators",
    shortTitle: "Tour packages",
    description:
      "Compare Tanzania tour packages for safari, culture, beach, hiking and local tourism from approved operators on NoLSAF.",
    heroImage: "/assets/Toursite.jpeg",
    keywords: ["Tanzania tour packages", "Tanzania safari packages", "approved tour operators Tanzania", "East Africa tour packages", ...seoKeywords],
    intro:
      "Tour packages need trust, price clarity and operator readiness. NoLSAF helps travelers compare approved operators and package details in one tourism flow.",
    focus: ["Safari packages", "Cultural and local tourism", "Beach and island trips", "Hiking and adventure experiences"],
    nolsafValue: ["Approved operator discovery", "Package comparison", "Transparent booking records", "Payment-friendly tour flows"],
    faqs: [
      { question: "Are tour operators approved?", answer: "NoLSAF tour package flows are built around approved operators and visible package details." },
      { question: "Can I combine tours with accommodation?", answer: "Yes. NoLSAF connects tour discovery with verified stays and transport support." },
    ],
  },
  {
    slug: "airport-transfer-tanzania",
    title: "Airport Transfers and Driver Transport in Tanzania",
    shortTitle: "Airport transfers",
    description:
      "Arrange Tanzania airport transfers, city pickup, route transport and driver-supported travel through NoLSAF.",
    heroImage: "/assets/nolsaf_driver.jpg",
    keywords: ["airport transfer Tanzania", "Dar es Salaam airport transfer", "driver transport Tanzania", "Tanzania pickup dropoff", ...seoKeywords],
    intro:
      "Transport is part of the travel experience. NoLSAF connects rides, drivers, routes and payout records so airport and city movement can support verified stays and trips.",
    focus: ["Airport pickup and drop-off", "City and route transport", "Trip-linked driver records", "Scheduled and auto-dispatched rides"],
    nolsafValue: ["Driver transport workflows", "Route and booking coordination", "Payment and payout traceability", "Useful for accommodation and tour guests"],
    faqs: [
      { question: "Can NoLSAF handle airport transfers?", answer: "Yes. NoLSAF includes transport workflows for pickup and drop-off coordination where available." },
      { question: "Can transport connect to accommodation?", answer: "Yes. Transport is designed to sit alongside accommodation and trip booking flows." },
    ],
  },
  {
    slug: "group-stays-tanzania",
    title: "Group Stays and Multi-room Accommodation in Tanzania",
    shortTitle: "Group stays",
    description:
      "Plan group accommodation in Tanzania with verified properties, coordinated transport, flexible payments and request-based offers from eligible property owners.",
    heroImage: "/assets/Makundi.jpg",
    keywords: ["group stays Tanzania", "group accommodation Tanzania", "family stays Tanzania", "multi room booking Tanzania", ...seoKeywords],
    intro:
      "Group travel needs more than one room. NoLSAF lets travelers present their stay needs, dates, headcount and preferences, then eligible property owners can respond with suitable offers through the group stay request flow.",
    focus: ["Family and team accommodation", "Multi-room coordination", "Owner offers for group needs", "Transport for groups"],
    nolsafValue: ["Verified group-suitable stays", "Request-based owner offers", "Coordinated booking flow", "Payment flexibility"],
    faqs: [
      { question: "Can travelers request group accommodation offers?", answer: "Yes. Travelers can present their group stay needs, and eligible property owners can respond with suitable accommodation offers." },
      { question: "Are transport and payments included?", answer: "NoLSAF connects group accommodation with transport and payment support where available." },
    ],
  },
  {
    slug: "tanzania-trip-cost-estimator",
    title: "Tanzania Trip Cost Estimator for Safari, Beach and Local Tourism",
    shortTitle: "Trip cost estimator",
    description:
      "Use NoLScope to estimate Tanzania travel costs, including visa fees, park fees, accommodation, transport and activities.",
    heroImage: "/assets/Welcome.jpg",
    keywords: ["Tanzania trip cost estimator", "Tanzania safari cost", "Zanzibar travel budget", "Tanzania park fees", ...seoKeywords],
    intro:
      "Travelers search for the real cost before booking. NoLScope helps estimate Tanzania travel costs before guests commit to stays, tours or transport.",
    focus: ["Visa and park fees", "Transport routes", "Activities and accommodation", "Safari, beach and cultural trips"],
    nolsafValue: ["Free cost estimation", "Connected to NoLSAF travel flows", "Useful before booking", "Supports local and international travelers"],
    faqs: [
      { question: "What does NoLScope estimate?", answer: "NoLScope estimates items such as visa fees, park fees, transport, activities and accommodation." },
      { question: "Is NoLScope only for Tanzania?", answer: "The current SEO focus is Tanzania, with East Africa expansion supported by the wider NoLSAF platform." },
    ],
  },
  {
    slug: "payments-tanzania-east-africa",
    title: "Travel Payment Methods in Tanzania: Mobile Money, Banks and Cards",
    shortTitle: "Payments",
    description:
      "NoLSAF supports friendly travel payments through mobile money/MNO channels, bank transfers and card payments for Tanzania and East Africa booking flows.",
    heroImage: "/assets/Pay_step_2.jpg",
    keywords: ["M-Pesa travel payments", "Airtel Money booking", "bank transfer Tanzania travel", "card payments Tanzania", "mobile money tourism Tanzania", ...seoKeywords],
    intro:
      "Payment flexibility is important for tourism in Tanzania and East Africa. Local travelers often prefer mobile money, businesses may need bank transfers and international visitors may expect card support.",
    focus: ["Mobile money and MNO payments", "Bank transfers", "Card payments", "Clear payment and payout records"],
    nolsafValue: paymentTrust.methods,
    faqs: [
      { question: "Which payment types does NoLSAF support?", answer: "NoLSAF supports friendly flows for mobile money/MNO, bank transfer and card payments where available." },
      { question: "Why are payment methods important for tourism SEO?", answer: "Travelers search for trustworthy booking and payment options, especially when booking accommodation, transport and tours across borders." },
    ],
  },
];

export const eastAfricaPage: SeoLandingPage = {
  slug: "east-africa",
  title: "East Africa Tourism, Verified Stays, Tours and Travel Planning",
  shortTitle: "East Africa",
  description:
    "Explore East Africa tourism with NoLSAF: Tanzania-first verified accommodation, tour packages, transport, group stays and payment-friendly travel support.",
  heroImage: "/assets/Great Migration.jpg",
  keywords: ["East Africa tourism", "East Africa travel", "Africa tourism", "East Africa accommodation", ...seoKeywords],
  intro:
    "NoLSAF is Tanzania-first, with an East Africa layer for travelers comparing safaris, beaches, cities, cultural trips and accommodation across the region.",
  focus: ["Tanzania as the core market", "Regional tourism discovery", "Verified stays and transport", "Local and international payment friendliness"],
  nolsafValue: [
    "Tanzania-focused tourism depth",
    "East Africa discovery for wider travel planning",
    "Accommodation, tours, transport and group stay links",
    "Mobile money/MNO, bank and card payment support where available",
  ],
  faqs: [
    { question: "Is NoLSAF focused on Tanzania or all East Africa?", answer: "The SEO strategy is Tanzania-first, with East Africa coverage supporting regional travel searches." },
    { question: "What services are connected?", answer: "NoLSAF connects verified accommodation, tour packages, transport, group stays, cost estimation and payment support." },
  ],
  links: [
    { label: "Explore Tanzania", href: "/tourism/tanzania" },
    { label: "Verified stays", href: "/services/verified-accommodation-tanzania" },
    { label: "Tour packages", href: "/services/tanzania-tour-packages" },
  ],
};

export const tanzaniaHub = {
  title: "Tanzania Tourism: Verified Stays, Safaris, Tours, Transport and Payments",
  description:
    "Plan Tanzania travel with NoLSAF. Explore verified accommodation, Zanzibar, Serengeti, Ngorongoro, Kilimanjaro, Dar es Salaam, Arusha, tour packages, group stays and payment-friendly booking flows.",
  heroImage: "/assets/Serengeti baloon.jpg",
  keywords: ["Tanzania tourism", "Tanzania travel", "Tanzania accommodation", "Tanzania tours", ...seoKeywords],
};

export function pageUrl(path: string) {
  return `${SITE_URL}${path}`;
}
