/**
 * NoLScope – Seed Script
 * ───────────────────────────────────────────────────────────────────────────
 * Seeds all static reference data that the NoLScope cost estimation engine
 * needs to produce meaningful results with NO external API calls.
 *
 * Data sources verified from:
 *  - Tanzania Immigration Dept  (visa fees)
 *  - TANAPA / NCAA (park & conservation area fees, 2025/26 schedule)
 *  - Precision Air / Coastal Aviation / Azam Marine public tariffs
 *  - Bus company published fares (Kilimanjaro Express, Dar Express, etc.)
 *  - Our own TransportBooking fare engine (local city rides via computeTransportFare)
 *
 * Run with:
 *   npm run seed:nolscope
 * ───────────────────────────────────────────────────────────────────────────
 */

import 'dotenv/config';
import { prisma } from '@nolsaf/prisma';

// ─── helpers ────────────────────────────────────────────────────────────────

const upsertLog = (model: string, key: string) =>
  console.log(`  ✅ [${model}] ${key}`);

const skipLog = (model: string, key: string, err: unknown) =>
  console.warn(`  ⚠️  [${model}] ${key} — ${(err as any)?.message ?? err}`);

// ─── 1. DESTINATIONS ────────────────────────────────────────────────────────

const destinations = [
  {
    destinationCode: 'ZANZIBAR',
    destinationName: 'Zanzibar',
    displayName: 'Zanzibar Archipelago',
    destinationType: 'island',
    region: 'Zanzibar',
    coordinates: { lat: -6.165, lng: 39.202 },
    mainAirport: 'Abeid Amani Karume Intl (ZNZ)',
    nearestCity: 'Dar es Salaam',
    accessDifficulty: 'easy',
    bestMonths: [6, 7, 8, 9, 10, 12, 1, 2],
    rainyMonths: [4, 5],
    peakMonths: [12, 1, 2, 7, 8],
    offPeakMonths: [4, 5, 11],
    accommodationMultiplier: 1.00,
    transportBaseUsd: 40.00,
    avgStayDays: 5,
    description: 'Tropical island paradise with white beaches, historic Stone Town, world-class diving and spice farms.',
    popularity: 95,
  },
  {
    destinationCode: 'SERENGETI',
    destinationName: 'Serengeti',
    displayName: 'Serengeti National Park',
    destinationType: 'park',
    region: 'Northern Circuit',
    coordinates: { lat: -2.333, lng: 34.833 },
    mainAirport: 'Seronera Airstrip (SEU)',
    nearestCity: 'Arusha',
    accessDifficulty: 'moderate',
    bestMonths: [6, 7, 8, 9, 10],
    rainyMonths: [3, 4, 5],
    peakMonths: [7, 8, 9],
    offPeakMonths: [4, 5],
    accommodationMultiplier: 1.20,
    transportBaseUsd: 200.00,
    avgStayDays: 3,
    description: 'World-famous savannah, home of the Great Migration. 1.5 million wildebeest, lions, cheetahs and more.',
    popularity: 100,
  },
  {
    destinationCode: 'NGORONGORO',
    destinationName: 'Ngorongoro',
    displayName: 'Ngorongoro Conservation Area',
    destinationType: 'park',
    region: 'Northern Circuit',
    coordinates: { lat: -3.175, lng: 35.587 },
    mainAirport: 'Arusha Airport (ARK)',
    nearestCity: 'Arusha',
    accessDifficulty: 'moderate',
    bestMonths: [6, 7, 8, 9, 10, 1, 2],
    rainyMonths: [3, 4, 5],
    peakMonths: [7, 8, 9],
    offPeakMonths: [4, 5],
    accommodationMultiplier: 1.15,
    transportBaseUsd: 150.00,
    avgStayDays: 2,
    description: 'UNESCO World Heritage site. An unbroken volcanic caldera teeming with wildlife including the Big Five.',
    popularity: 90,
  },
  {
    destinationCode: 'KILIMANJARO',
    destinationName: 'Kilimanjaro',
    displayName: 'Mount Kilimanjaro',
    destinationType: 'park',
    region: 'Northern Circuit',
    coordinates: { lat: -3.066, lng: 37.355 },
    mainAirport: 'Kilimanjaro Intl Airport (JRO)',
    nearestCity: 'Moshi',
    accessDifficulty: 'difficult',
    bestMonths: [1, 2, 6, 7, 8, 9, 10],
    rainyMonths: [3, 4, 5, 11],
    peakMonths: [7, 8, 9],
    offPeakMonths: [4, 5, 11],
    accommodationMultiplier: 1.10,
    transportBaseUsd: 80.00,
    avgStayDays: 7,
    description: "Africa's highest peak. Six official trekking routes. Summit at 5,895 m. No technical climbing required.",
    popularity: 92,
  },
  {
    destinationCode: 'ARUSHA',
    destinationName: 'Arusha',
    displayName: 'Arusha City',
    destinationType: 'city',
    region: 'Northern Circuit',
    coordinates: { lat: -3.386, lng: 36.682 },
    mainAirport: 'Kilimanjaro Intl Airport (JRO)',
    nearestCity: 'Arusha',
    accessDifficulty: 'easy',
    bestMonths: [6, 7, 8, 9, 1, 2],
    rainyMonths: [3, 4, 5],
    peakMonths: [7, 8],
    offPeakMonths: [4, 5],
    accommodationMultiplier: 0.90,
    transportBaseUsd: 0.00,
    avgStayDays: 2,
    description: 'Gateway to the Northern Circuit. Safari tour operators, cultural markets, and Arusha National Park nearby.',
    popularity: 75,
  },
  {
    destinationCode: 'DAR_ES_SALAAM',
    destinationName: 'Dar es Salaam',
    displayName: 'Dar es Salaam',
    destinationType: 'city',
    region: 'Coast',
    coordinates: { lat: -6.792, lng: 39.208 },
    mainAirport: 'Julius Nyerere Intl (DAR)',
    nearestCity: 'Dar es Salaam',
    accessDifficulty: 'easy',
    bestMonths: [6, 7, 8, 9, 12, 1, 2],
    rainyMonths: [3, 4, 5, 11],
    peakMonths: [7, 8, 12],
    offPeakMonths: [4, 5],
    accommodationMultiplier: 0.95,
    transportBaseUsd: 0.00,
    avgStayDays: 2,
    description: 'Commercial capital and main gateway. Vibrant city with beaches, seafood, and the National Museum.',
    popularity: 80,
  },
  {
    destinationCode: 'RUAHA',
    destinationName: 'Ruaha',
    displayName: "Ruaha National Park",
    destinationType: 'park',
    region: 'Southern Circuit',
    coordinates: { lat: -7.750, lng: 34.950 },
    mainAirport: 'Msembe Airstrip',
    nearestCity: 'Iringa',
    accessDifficulty: 'moderate',
    bestMonths: [6, 7, 8, 9, 10],
    rainyMonths: [12, 1, 2, 3, 4],
    peakMonths: [7, 8, 9],
    offPeakMonths: [1, 2, 3],
    accommodationMultiplier: 1.05,
    transportBaseUsd: 250.00,
    avgStayDays: 3,
    description: "Tanzania's largest national park fewer crowds, enormous elephant herds, lions and wild dogs.",
    popularity: 65,
  },
  {
    destinationCode: 'SELOUS',
    destinationName: 'Nyerere',
    displayName: 'Nyerere National Park (Selous)',
    destinationType: 'park',
    region: 'Southern Circuit',
    coordinates: { lat: -9.600, lng: 37.600 },
    mainAirport: 'Selous Airstrip',
    nearestCity: 'Dar es Salaam',
    accessDifficulty: 'moderate',
    bestMonths: [6, 7, 8, 9, 10],
    rainyMonths: [12, 1, 2, 3, 4],
    peakMonths: [7, 8, 9],
    offPeakMonths: [1, 2],
    accommodationMultiplier: 1.10,
    transportBaseUsd: 180.00,
    avgStayDays: 3,
    description: "One of Africa's largest wildlife reserves. Boat safaris on the Rufiji River are unique to Tanzania.",
    popularity: 70,
  },
];

// ─── 2. VISA FEES ────────────────────────────────────────────────────────────
// Source: Tanzania Immigration Dept (2025/26). Most nationalities: $50 single entry.
// EAC bloc: Kenya, Uganda, Rwanda, Burundi = visa free.

const visaFees = [
  // EAC — visa free
  { nationality: 'KE', amount: 0,  description: 'East African Community — visa free' },
  { nationality: 'UG', amount: 0,  description: 'East African Community — visa free' },
  { nationality: 'RW', amount: 0,  description: 'East African Community — visa free' },
  { nationality: 'BI', amount: 0,  description: 'East African Community — visa free' },
  // SADC reduced / visa waiver
  { nationality: 'ZA', amount: 0,  description: 'SADC — visa free for South Africans' },
  { nationality: 'ZM', amount: 0,  description: 'SADC — visa free' },
  { nationality: 'MZ', amount: 0,  description: 'SADC — visa free' },
  { nationality: 'ZW', amount: 0,  description: 'SADC — visa free' },
  { nationality: 'BW', amount: 0,  description: 'SADC — visa free' },
  { nationality: 'NA', amount: 0,  description: 'SADC — visa free' },
  { nationality: 'SZ', amount: 0,  description: 'SADC — visa free' },
  { nationality: 'LS', amount: 0,  description: 'SADC — visa free' },
  { nationality: 'MG', amount: 0,  description: 'SADC — visa free' },
  { nationality: 'MU', amount: 0,  description: 'SADC — visa free' },
  // Tanzania — citizens (locals) don't need visa
  { nationality: 'TZ', amount: 0,  description: 'Tanzanian citizen — no visa required' },
  // Standard $50 tourist visa (on arrival or e-visa)
  // Exception: US citizens must obtain a Multiple Entry Visa ($100, 12 months)
  { nationality: 'US', amount: 100, entries: 'multiple', durationDays: 365, processingTime: 'e-visa', description: 'Multiple Entry Visa (12 months) — US citizens must apply online via e-visa portal; ordinary single-entry visa is NOT issued to Americans' },
  { nationality: 'GB', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'DE', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'FR', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'IT', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'ES', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'NL', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'BE', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'SE', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'NO', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'DK', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'FI', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'CH', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'AT', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'CA', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'AU', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'NZ', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'JP', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'KR', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'CN', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'IN', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'BR', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'MX', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'AE', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'SA', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'IL', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'RU', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'PL', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'PT', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'CZ', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  { nationality: 'AR', amount: 50, description: 'Single entry tourist visa — on arrival or e-visa' },
  // Other Africa — standard
  { nationality: 'NG', amount: 50, description: 'Single entry tourist visa' },
  { nationality: 'GH', amount: 50, description: 'Single entry tourist visa' },
  { nationality: 'ET', amount: 50, description: 'Single entry tourist visa' },
  // Fallback — used when nationality unknown
  { nationality: 'XX', amount: 50, description: 'Default rate — verify for your nationality' },
];

// ─── 3. PARK FEES ────────────────────────────────────────────────────────────
// Source: TANAPA / NCAA official fee schedule 2025/26
// All fees in USD per person per 24-hour period unless noted

const parkFees = [
  {
    parkName: 'Serengeti National Park',
    parkCode: 'SERENGETI',
    category: 'national-park',
    region: 'Northern Circuit',
    adultForeignerFee: 83.00,     // US$ 83 — TANAPA 2025/26
    adultResidentFee: 4.50,       // Tsh 10,000 ≈ US$ 4-5 — EAC/Tanzanian citizens
    childForeignerFee: 24.00,     // US$ 24 (5-15 years)
    childResidentFee: 0.90,       // Tsh 2,000 ≈ US$ 0.90 (5-15 years)
    vehicleFee: 40.00,         // per vehicle (foreign-reg) per entry
    campingFee: 30.00,         // public campsite per person per night
    requiresGuide: false,
    description: 'TANAPA 2025/26. Non-residents US$ 83, Expatriates US$ 83, EAC/TZ citizens Tsh 10,000. Children under 5 free.',
    officialWebsite: 'tanzaniaparks.go.tz',
  },
  {
    parkName: 'Ngorongoro Conservation Area',
    parkCode: 'NGORONGORO',
    category: 'conservation-area',
    region: 'Northern Circuit',
    adultForeignerFee: 83.00,     // US$ 83 — NCAA 2025/26 conservation fee per 24h
    adultResidentFee: 4.50,       // Tsh 10,000 ≈ US$ 4-5
    childForeignerFee: 24.00,     // US$ 24 (5-15 years)
    childResidentFee: 0.90,       // Tsh 2,000 ≈ US$ 0.90
    vehicleFee: 200.00,        // Per vehicle per crater descent (mandatory day pass)
    campingFee: 50.00,
    requiresGuide: false,
    description: 'NCAA fee. The vehicle fee covers one crater descent day pass — essential for crater floor game drives.',
    officialWebsite: 'ngorongorocrater.org',
  },
  {
    parkName: 'Kilimanjaro National Park',
    parkCode: 'KILIMANJARO',
    category: 'national-park',
    region: 'Northern Circuit',
    adultForeignerFee: 83.00,     // US$ 83 per day on the mountain
    adultResidentFee: 4.50,       // Tsh 10,000 ≈ US$ 4-5
    childForeignerFee: 24.00,     // US$ 24 (5-15 years)
    childResidentFee: 0.90,       // Tsh 2,000 ≈ US$ 0.90
    vehicleFee: null,
    guideFee: 20.00,           // mandatory guide fee per day per guide
    campingFee: 50.00,
    requiresGuide: true,
    minimumDays: 5,            // TANAPA minimum: 5-night routes (Marangu = 5, Machame = 6-7)
    description: 'TANAPA fee. Guide and porter fees are mandatory — budgeted separately. Rescue fee also applies ($20 total).',
    officialWebsite: 'tanzaniaparks.go.tz/kilimanjaro',
  },
  {
    parkName: 'Tarangire National Park',
    parkCode: 'TARANGIRE',
    category: 'national-park',
    region: 'Northern Circuit',
    adultForeignerFee: 53.00,     // US$ 53 — TANAPA standard tier
    adultResidentFee: 4.50,       // Tsh 10,000 ≈ US$ 4-5
    childForeignerFee: 20.00,     // US$ 20 (5-15 years)
    childResidentFee: 0.90,       // Tsh 2,000 ≈ US$ 0.90
    vehicleFee: 40.00,
    campingFee: 30.00,
    requiresGuide: false,
    description: 'Famous for enormous elephant herds and ancient baobab trees. Less crowded than Serengeti.',
    officialWebsite: 'tanzaniaparks.go.tz/tarangire',
  },
  {
    parkName: 'Arusha National Park',
    parkCode: 'ARUSHA_NP',
    category: 'national-park',
    region: 'Northern Circuit',
    adultForeignerFee: 45.00,     // US$ 45 — TANAPA budget tier
    adultResidentFee: 4.50,       // Tsh 10,000 ≈ US$ 4-5
    childForeignerFee: 15.00,     // US$ 15 (5-15 years)
    childResidentFee: 0.90,       // Tsh 2,000 ≈ US$ 0.90
    vehicleFee: 40.00,
    campingFee: 30.00,
    requiresGuide: false,
    description: 'Compact park with Meru crater, flamingos, giraffes, colobus monkeys. Good day-trip from Arusha city.',
    officialWebsite: 'tanzaniaparks.go.tz',
  },
  {
    parkName: 'Ruaha National Park',
    parkCode: 'RUAHA',
    category: 'national-park',
    region: 'Southern Circuit',
    adultForeignerFee: 53.00,     // US$ 53 — TANAPA standard tier
    adultResidentFee: 4.50,       // Tsh 10,000 ≈ US$ 4-5
    childForeignerFee: 20.00,     // US$ 20 (5-15 years)
    childResidentFee: 0.90,       // Tsh 2,000 ≈ US$ 0.90
    vehicleFee: 40.00,
    campingFee: 30.00,
    requiresGuide: false,
    description: "Tanzania's largest national park. Remote, uncrowded. Famous for lions, wild dogs and massive elephant herds.",
    officialWebsite: 'tanzaniaparks.go.tz/ruaha',
  },
  {
    parkName: 'Nyerere National Park (Selous)',
    parkCode: 'NYERERE',
    category: 'national-park',
    region: 'Southern Circuit',
    adultForeignerFee: 53.00,     // US$ 53 — TANAPA standard tier
    adultResidentFee: 4.50,       // Tsh 10,000 ≈ US$ 4-5
    childForeignerFee: 20.00,     // US$ 20 (5-15 years)
    childResidentFee: 0.90,       // Tsh 2,000 ≈ US$ 0.90
    vehicleFee: 40.00,
    campingFee: 30.00,
    requiresGuide: false,
    description: 'Boat safaris on the Rufiji River. UNESCO listed. Vast, remote — ideal for fly-in safaris.',
    officialWebsite: 'tanzaniaparks.go.tz',
  },
  {
    parkName: 'Zanzibar Marine Parks (snorkelling/diving zones)',
    parkCode: 'ZANZIBAR_MARINE',
    category: 'marine-park',
    region: 'Zanzibar',
    adultForeignerFee: 10.00,  // ZMPCA entry fee per person per day
    adultResidentFee: 5.00,
    childForeignerFee: 5.00,
    childResidentFee: 2.00,
    vehicleFee: null,
    campingFee: null,
    requiresGuide: false,
    description: 'Zanzibar Marine Parks and Conservation Area fee. Typically included by dive operators in their quoted price.',
    officialWebsite: 'zmpca.go.tz',
  },
];

// ─── 4. TRANSPORT COST AVERAGES ──────────────────────────────────────────────
// NOTE: These are INTER-CITY / INTER-REGION averages for trip planning purposes.
// Local city rides (BODA, BAJAJI, CAR) are handled by the existing TransportBooking
// system (computeTransportFare in transportPolicy.ts) — do NOT duplicate those here.

const transportRoutes = [
  // ── Ferries ──────────────────────────────────────────────────────────────
  {
    fromLocation: 'Dar es Salaam',
    toLocation: 'Zanzibar',
    transportType: 'ferry',
    minCost: 35.00, maxCost: 50.00, averageCost: 40.00,
    durationHours: 2.0, distanceKm: 75,
    frequency: 'multiple-daily',
    peakMultiplier: 1.10, offPeakMultiplier: 0.95,
    description: 'High-speed ferry (Azam Marine / Sea Star Express). Book 1-2 days ahead in peak season.',
    provider: 'Azam Marine / Sea Star Express',
    requiresBooking: true, bookingLeadDays: 1,
    confidence: 0.95, dataSource: 'provider-website',
  },
  // ── Domestic Flights ─────────────────────────────────────────────────────
  {
    fromLocation: 'Dar es Salaam',
    toLocation: 'Zanzibar',
    transportType: 'flight',
    minCost: 60.00, maxCost: 120.00, averageCost: 85.00,
    durationHours: 0.3, distanceKm: 75,
    frequency: 'multiple-daily',
    peakMultiplier: 1.30, offPeakMultiplier: 0.85,
    description: 'Precision Air / Auric Air. 20 min flight. Often cheaper to take the ferry.',
    provider: 'Precision Air / Auric Air',
    requiresBooking: true, bookingLeadDays: 3,
    confidence: 0.85, dataSource: 'aggregator',
  },
  {
    fromLocation: 'Dar es Salaam',
    toLocation: 'Arusha',
    transportType: 'flight',
    minCost: 80.00, maxCost: 160.00, averageCost: 115.00,
    durationHours: 1.0, distanceKm: 540,
    frequency: 'multiple-daily',
    peakMultiplier: 1.30, offPeakMultiplier: 0.85,
    description: 'Precision Air daily flights. Saves ~8h vs road.',
    provider: 'Precision Air',
    requiresBooking: true, bookingLeadDays: 3,
    confidence: 0.90, dataSource: 'aggregator',
  },
  {
    fromLocation: 'Arusha',
    toLocation: 'Serengeti',
    transportType: 'flight',
    minCost: 200.00, maxCost: 400.00, averageCost: 290.00,
    durationHours: 1.0, distanceKm: 325,
    frequency: '3x-weekly',
    peakMultiplier: 1.25, offPeakMultiplier: 0.90,
    description: 'Coastal Aviation / Auric Air charter to Seronera or Grumeti. Prices vary enormously — book early.',
    provider: 'Coastal Aviation / Auric Air',
    requiresBooking: true, bookingLeadDays: 14,
    confidence: 0.75, dataSource: 'aggregator',
  },
  {
    fromLocation: 'Dar es Salaam',
    toLocation: 'Ruaha',
    transportType: 'flight',
    minCost: 200.00, maxCost: 450.00, averageCost: 300.00,
    durationHours: 1.5, distanceKm: 600,
    frequency: 'daily',
    peakMultiplier: 1.20, offPeakMultiplier: 0.90,
    description: 'Fly-in safari via Msembe Airstrip. Coastal Aviation / Auric Air.',
    provider: 'Coastal Aviation',
    requiresBooking: true, bookingLeadDays: 7,
    confidence: 0.75, dataSource: 'manual-entry',
  },
  {
    fromLocation: 'Dar es Salaam',
    toLocation: 'Nyerere',
    transportType: 'flight',
    minCost: 150.00, maxCost: 300.00, averageCost: 200.00,
    durationHours: 1.0, distanceKm: 400,
    frequency: 'daily',
    peakMultiplier: 1.20, offPeakMultiplier: 0.90,
    description: 'Coastal Aviation charter to Selous/Nyerere airstrip.',
    provider: 'Coastal Aviation',
    requiresBooking: true, bookingLeadDays: 7,
    confidence: 0.75, dataSource: 'manual-entry',
  },
  // ── Buses / Road ─────────────────────────────────────────────────────────
  {
    fromLocation: 'Dar es Salaam',
    toLocation: 'Arusha',
    transportType: 'bus',
    minCost: 15.00, maxCost: 25.00, averageCost: 18.00,
    durationHours: 8.0, distanceKm: 640,
    frequency: 'multiple-daily',
    peakMultiplier: 1.10, offPeakMultiplier: 1.00,
    description: 'Kilimanjaro Express / Dar Express / Royal Coach. AC luxury buses. Depart early morning.',
    provider: 'Kilimanjaro Express / Dar Express',
    requiresBooking: true, bookingLeadDays: 1,
    confidence: 0.95, dataSource: 'manual-entry',
  },
  {
    fromLocation: 'Dar es Salaam',
    toLocation: 'Iringa',
    transportType: 'bus',
    minCost: 10.00, maxCost: 18.00, averageCost: 14.00,
    durationHours: 5.5, distanceKm: 480,
    frequency: 'multiple-daily',
    peakMultiplier: 1.00, offPeakMultiplier: 1.00,
    description: 'Gateway to Ruaha. Multiple bus companies operate this route.',
    provider: 'Various',
    requiresBooking: false, bookingLeadDays: null,
    confidence: 0.85, dataSource: 'manual-entry',
  },
  {
    fromLocation: 'Arusha',
    toLocation: 'Serengeti',
    transportType: 'private-car',
    minCost: 150.00, maxCost: 300.00, averageCost: 220.00,
    durationHours: 6.5, distanceKm: 325,
    frequency: 'on-demand',
    peakMultiplier: 1.20, offPeakMultiplier: 0.90,
    description: '4WD safari vehicle with driver-guide. Price per vehicle (not per person). Book through your lodge or tour operator.',
    provider: 'Various tour operators',
    requiresBooking: true, bookingLeadDays: 7,
    confidence: 0.80, dataSource: 'manual-entry',
  },
  {
    fromLocation: 'Arusha',
    toLocation: 'Ngorongoro',
    transportType: 'private-car',
    minCost: 100.00, maxCost: 200.00, averageCost: 150.00,
    durationHours: 3.5, distanceKm: 180,
    frequency: 'on-demand',
    peakMultiplier: 1.15, offPeakMultiplier: 0.95,
    description: '4WD safari vehicle with driver-guide from Arusha.',
    provider: 'Various tour operators',
    requiresBooking: true, bookingLeadDays: 3,
    confidence: 0.80, dataSource: 'manual-entry',
  },
  {
    fromLocation: 'Kilimanjaro Airport',
    toLocation: 'Moshi',
    transportType: 'shared-taxi',
    minCost: 5.00, maxCost: 10.00, averageCost: 7.00,
    durationHours: 0.5, distanceKm: 45,
    frequency: 'on-demand',
    peakMultiplier: 1.00, offPeakMultiplier: 1.00,
    description: 'Shared taxi/dalla-dalla from JRO airport to Moshi town.',
    provider: 'Various',
    requiresBooking: false, bookingLeadDays: null,
    confidence: 0.85, dataSource: 'manual-entry',
  },
  {
    fromLocation: 'Kilimanjaro Airport',
    toLocation: 'Arusha',
    transportType: 'shared-taxi',
    minCost: 10.00, maxCost: 20.00, averageCost: 15.00,
    durationHours: 1.0, distanceKm: 50,
    frequency: 'on-demand',
    peakMultiplier: 1.00, offPeakMultiplier: 1.00,
    description: 'Shuttle or shared taxi from JRO to Arusha.',
    provider: 'Impala Shuttle / Various',
    requiresBooking: false, bookingLeadDays: null,
    confidence: 0.90, dataSource: 'manual-entry',
  },
];

// ─── 5. ACTIVITIES ───────────────────────────────────────────────────────────

const activities = [
  // ── Serengeti / Northern Circuit Safaris ─────────────────────────────────
  {
    activityCode: 'safari-full-day-shared',
    activityName: 'Full Day Shared Game Drive',
    category: 'safari',
    destination: 'Serengeti',
    minCost: 200.00, maxCost: 350.00, averageCost: 280.00,
    priceUnit: 'per-person',
    duration: 'full-day', durationHours: 10.0,
    groupSize: '4-6 people',
    difficulty: 'easy',
    includes: ['guide', '4WD-vehicle', 'park-entry', 'bottled-water'],
    excludes: ['lunch', 'tips', 'personal-items'],
    peakMultiplier: 1.25, offPeakMultiplier: 0.85,
    description: 'Shared open-roof 4WD vehicle. Best for budget travellers. Park fees included.',
    popularity: 90,
  },
  {
    activityCode: 'safari-full-day-private',
    activityName: 'Full Day Private Game Drive',
    category: 'safari',
    destination: 'Serengeti',
    minCost: 350.00, maxCost: 600.00, averageCost: 450.00,
    priceUnit: 'per-vehicle',
    duration: 'full-day', durationHours: 10.0,
    groupSize: 'up to 6 people',
    difficulty: 'easy',
    includes: ['private-guide', '4WD-vehicle', 'park-entry', 'lunch-box', 'bottled-water'],
    excludes: ['tips', 'drinks-at-camp'],
    peakMultiplier: 1.25, offPeakMultiplier: 0.85,
    description: 'Private vehicle — go at your own pace. Same park fees included. Price is per vehicle.',
    popularity: 85,
  },
  {
    activityCode: 'ngorongoro-crater-descent',
    activityName: 'Ngorongoro Crater Full Day',
    category: 'safari',
    destination: 'Ngorongoro',
    minCost: 350.00, maxCost: 550.00, averageCost: 430.00,
    priceUnit: 'per-vehicle',
    duration: 'full-day', durationHours: 8.0,
    groupSize: 'up to 6 people',
    difficulty: 'easy',
    includes: ['guide', '4WD-vehicle', 'crater-descent-fee', 'conservation-fee'],
    excludes: ['lunch', 'tips'],
    peakMultiplier: 1.20, offPeakMultiplier: 0.90,
    description: 'Includes mandatory crater descent vehicle fee ($200) + conservation fee. Price per vehicle.',
    popularity: 88,
  },
  {
    activityCode: 'kilimanjaro-trek-marangu',
    activityName: 'Kilimanjaro Trek – Marangu Route (5 days)',
    category: 'adventure',
    destination: 'Kilimanjaro',
    minCost: 1400.00, maxCost: 2200.00, averageCost: 1800.00,
    priceUnit: 'per-person',
    duration: '5-days', durationHours: 120.0,
    groupSize: 'small group or private',
    difficulty: 'challenging',
    includes: ['park-fees-5-days', 'guide', 'porters', 'meals-on-mountain', 'hut-accommodation', 'rescue-fee'],
    excludes: ['tips', 'gear-rental', 'travel-insurance'],
    requirements: ['medical-clearance', 'travel-insurance', 'good-fitness'],
    seasonalActivity: false,
    peakMultiplier: 1.15, offPeakMultiplier: 0.95,
    description: 'Marangu (Coca-Cola route) — the only route with hut accommodation. 5 nights.',
    popularity: 82,
  },
  {
    activityCode: 'kilimanjaro-trek-machame',
    activityName: 'Kilimanjaro Trek – Machame Route (7 days)',
    category: 'adventure',
    destination: 'Kilimanjaro',
    minCost: 1600.00, maxCost: 2800.00, averageCost: 2100.00,
    priceUnit: 'per-person',
    duration: '7-days', durationHours: 168.0,
    groupSize: 'small group or private',
    difficulty: 'challenging',
    includes: ['park-fees-7-days', 'guide', 'porters', 'meals-on-mountain', 'camping-equipment', 'rescue-fee'],
    excludes: ['tips', 'personal-gear', 'travel-insurance'],
    requirements: ['medical-clearance', 'travel-insurance', 'good-fitness'],
    seasonalActivity: false,
    peakMultiplier: 1.15, offPeakMultiplier: 0.95,
    description: 'Machame (Whiskey route) — most scenic, higher success rate than Marangu. Camping route.',
    popularity: 85,
  },
  // ── Zanzibar Activities ───────────────────────────────────────────────────
  {
    activityCode: 'zanzibar-diving-2-tank',
    activityName: 'Two Tank Scuba Dive',
    category: 'water-sports',
    destination: 'Zanzibar',
    minCost: 80.00, maxCost: 120.00, averageCost: 95.00,
    priceUnit: 'per-person',
    duration: 'half-day', durationHours: 4.0,
    groupSize: '2-8 people',
    difficulty: 'moderate',
    includes: ['equipment', 'guide', 'boat', 'marine-park-fee', 'snacks'],
    excludes: ['certification-course', 'photos', 'hotel-transfer'],
    requirements: ['padi-open-water-or-equivalent'],
    availableMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
    peakMultiplier: 1.10, offPeakMultiplier: 0.95,
    description: 'Two guided dives at Mnemba Atoll or similar coral reefs. Equipment included.',
    provider: 'One Ocean Zanzibar / Barakuda Dive Center',
    popularity: 82,
  },
  {
    activityCode: 'zanzibar-snorkelling',
    activityName: 'Snorkelling Trip',
    category: 'water-sports',
    destination: 'Zanzibar',
    minCost: 25.00, maxCost: 50.00, averageCost: 35.00,
    priceUnit: 'per-person',
    duration: 'half-day', durationHours: 3.0,
    groupSize: 'shared group',
    difficulty: 'easy',
    includes: ['equipment', 'boat', 'guide', 'marine-park-fee'],
    excludes: ['photos', 'hotel-transfer'],
    availableMonths: [1,2,3,4,6,7,8,9,10,11,12],
    peakMultiplier: 1.05, offPeakMultiplier: 1.00,
    description: 'Half-day shared snorkelling trip. Good for non-divers and children.',
    popularity: 88,
  },
  {
    activityCode: 'zanzibar-spice-tour',
    activityName: 'Spice Farm Tour',
    category: 'cultural',
    destination: 'Zanzibar',
    minCost: 25.00, maxCost: 45.00, averageCost: 32.00,
    priceUnit: 'per-person',
    duration: 'half-day', durationHours: 3.0,
    groupSize: 'shared group',
    difficulty: 'easy',
    includes: ['guide', 'transport', 'fruit-tasting', 'lunch'],
    excludes: ['tips', 'souvenirs'],
    availableMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
    peakMultiplier: 1.00, offPeakMultiplier: 1.00,
    description: 'Visit traditional spice plantations. Smell, taste and learn about cloves, vanilla, nutmeg and more.',
    popularity: 85,
  },
  {
    activityCode: 'zanzibar-stone-town-tour',
    activityName: 'Stone Town Walking Tour',
    category: 'cultural',
    destination: 'Zanzibar',
    minCost: 20.00, maxCost: 40.00, averageCost: 28.00,
    priceUnit: 'per-person',
    duration: '3-hours', durationHours: 3.0,
    groupSize: 'shared group',
    difficulty: 'easy',
    includes: ['guide'],
    excludes: ['museum-entry', 'food', 'tips'],
    availableMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
    peakMultiplier: 1.00, offPeakMultiplier: 1.00,
    description: 'UNESCO heritage old town. Narrow streets, carved doors, Freddie Mercury birthplace.',
    popularity: 80,
  },
  {
    activityCode: 'zanzibar-sunset-dhow',
    activityName: 'Sunset Dhow Cruise',
    category: 'cultural',
    destination: 'Zanzibar',
    minCost: 30.00, maxCost: 60.00, averageCost: 42.00,
    priceUnit: 'per-person',
    duration: '2-hours', durationHours: 2.0,
    groupSize: 'shared group',
    difficulty: 'easy',
    includes: ['boat', 'sundowner-drinks', 'snacks'],
    excludes: ['dinner', 'tips'],
    availableMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
    peakMultiplier: 1.10, offPeakMultiplier: 1.00,
    description: 'Traditional wooden dhow cruise at sunset along the Zanzibar coastline.',
    popularity: 78,
  },
  // ── Cultural / General ────────────────────────────────────────────────────
  {
    activityCode: 'maasai-village-visit',
    activityName: 'Maasai Village Cultural Visit',
    category: 'cultural',
    destination: 'Arusha',
    minCost: 30.00, maxCost: 60.00, averageCost: 45.00,
    priceUnit: 'per-person',
    duration: '3-hours', durationHours: 3.0,
    groupSize: 'small group',
    difficulty: 'easy',
    includes: ['guide', 'village-entry-fee', 'traditional-dance'],
    excludes: ['souvenirs', 'tips', 'transport'],
    availableMonths: [1,2,3,4,5,6,7,8,9,10,11,12],
    peakMultiplier: 1.00, offPeakMultiplier: 1.00,
    description: 'Authentic Maasai boma visit. Meet warriors, see traditional homes, watch cultural dances.',
    popularity: 72,
  },
];

// ─── 6. PRICING RULES ────────────────────────────────────────────────────────

const pricingRules = [
  {
    ruleName: 'northern-circuit-peak-safari-season',
    ruleType: 'seasonal',
    destination: null,         // applies to: Serengeti, Ngorongoro, Kilimanjaro
    category: null,
    seasonName: 'peak',
    startMonth: 6, endMonth: 10,
    priceMultiplier: 1.25,
    priority: 200,
    description: 'Peak safari season June–October (dry season, wildebeest migration).',
  },
  {
    ruleName: 'zanzibar-beach-peak-season',
    ruleType: 'seasonal',
    destination: 'Zanzibar',
    category: null,
    seasonName: 'peak',
    startMonth: 12, endMonth: 2,
    priceMultiplier: 1.30,
    priority: 200,
    description: 'Peak beach season December–February. Hotels fill quickly — book early.',
  },
  {
    ruleName: 'zanzibar-second-peak',
    ruleType: 'seasonal',
    destination: 'Zanzibar',
    category: null,
    seasonName: 'peak',
    startMonth: 7, endMonth: 8,
    priceMultiplier: 1.20,
    priority: 190,
    description: 'Second peak season July–August (European summer). Good weather, busy beaches.',
  },
  {
    ruleName: 'green-season-shoulder',
    ruleType: 'seasonal',
    destination: null,
    category: null,
    seasonName: 'shoulder',
    startMonth: 11, endMonth: 11,
    priceMultiplier: 0.90,
    priority: 100,
    description: 'Short rains (November). Some discounts, fewer tourists, landscape is green.',
  },
  {
    ruleName: 'long-rains-off-peak',
    ruleType: 'seasonal',
    destination: null,
    category: null,
    seasonName: 'off-peak',
    startMonth: 4, endMonth: 5,
    priceMultiplier: 0.75,
    priority: 150,
    description: 'Long rains April–May. Significant discounts. Roads can be difficult. Good for birding.',
  },
  {
    ruleName: 'large-group-discount',
    ruleType: 'demand-based',
    destination: null,
    category: null,
    seasonName: null,
    startMonth: null, endMonth: null,
    priceMultiplier: 0.90,
    minTravelers: 6,
    maxTravelers: null,
    priority: 120,
    description: 'Groups of 6+ travellers get ~10% reduction on most accommodation and activities.',
  },
  {
    ruleName: 'last-minute-premium',
    ruleType: 'demand-based',
    destination: null,
    category: null,
    seasonName: null,
    startMonth: null, endMonth: null,
    priceMultiplier: 1.15,
    daysInAdvance: 7,   // applies when booking < 7 days ahead
    priority: 130,
    description: 'Last-minute availability premium. Book 7+ days ahead to avoid this.',
  },
];

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌍 NoLScope Seed — Tanzania Travel Data');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ── Destinations
  console.log('📍 Seeding destinations...');
  for (const d of destinations) {
    try {
      await (prisma as any).tripDestination.upsert({
        where: { destinationCode: d.destinationCode },
        update: { ...d, coordinates: d.coordinates as any, bestMonths: d.bestMonths as any, rainyMonths: d.rainyMonths as any, peakMonths: d.peakMonths as any, offPeakMonths: d.offPeakMonths as any },
        create: { ...d, coordinates: d.coordinates as any, bestMonths: d.bestMonths as any, rainyMonths: d.rainyMonths as any, peakMonths: d.peakMonths as any, offPeakMonths: d.offPeakMonths as any },
      });
      upsertLog('TripDestination', d.destinationCode);
    } catch (err) { skipLog('TripDestination', d.destinationCode, err); }
  }

  // ── Visa fees — cleanup stale records before upserting
  // Some nationalities changed visa type between seed runs (e.g. US: single→multiple).
  // Delete any old rows whose (nationality, visaType, entries) combo is no longer in the
  // canonical list so they don't linger as ghost records.
  console.log('\n🧹 Cleaning up stale visa fee records...');
  const canonicalKeys = visaFees.map((v) => ({
    nationality:  v.nationality,
    visaType:     'tourist',
    entries:      (v as any).entries ?? 'single',
  }));
  // Fetch all existing tourist-visa rows and delete any not in the canonical set
  const existingVisaRows: { id: string; nationality: string; visaType: string; entries: string }[] =
    await (prisma as any).visaFee.findMany({ where: { visaType: 'tourist' }, select: { id: true, nationality: true, visaType: true, entries: true } });
  const toDelete = existingVisaRows.filter(
    (row) => !canonicalKeys.some((k) => k.nationality === row.nationality && k.entries === row.entries),
  );
  if (toDelete.length > 0) {
    await (prisma as any).visaFee.deleteMany({ where: { id: { in: toDelete.map((r) => r.id) } } });
    for (const r of toDelete) {
      console.log(`  🗑️  removed stale [VisaFee] ${r.nationality} / ${r.entries}`);
    }
  } else {
    console.log('  ✅ no stale records found');
  }

  // ── Visa fees
  console.log('\n🛂 Seeding visa fees...');
  for (const v of visaFees) {
    try {
      const entries       = (v as any).entries       ?? 'single';
      const durationDays  = (v as any).durationDays  ?? 90;
      const processingTime = (v as any).processingTime ?? (v.amount > 0 ? 'on-arrival' : 'not-required');
      await (prisma as any).visaFee.upsert({
        where: { nationality_visaType_entries: { nationality: v.nationality, visaType: 'tourist', entries } },
        update: { amount: v.amount, description: v.description, durationDays, processingTime },
        create: { nationality: v.nationality, visaType: 'tourist', entries, durationDays, amount: v.amount, currency: 'USD', description: v.description, processingTime },
      });
      upsertLog('VisaFee', `${v.nationality} → $${v.amount}`);
    } catch (err) { skipLog('VisaFee', v.nationality, err); }
  }

  // ── Park fees
  console.log('\n🌳 Seeding park fees...');
  for (const p of parkFees) {
    try {
      await (prisma as any).parkFee.upsert({
        where: { parkCode: p.parkCode },
        update: { ...p },
        create: { ...p },
      });
      upsertLog('ParkFee', `${p.parkCode} → adult $${p.adultForeignerFee}/day`);
    } catch (err) { skipLog('ParkFee', p.parkCode, err); }
  }

  // ── Transport routes
  console.log('\n🚌 Seeding transport cost averages...');
  for (const t of transportRoutes) {
    try {
      await (prisma as any).transportCostAverage.upsert({
        where: { fromLocation_toLocation_transportType: { fromLocation: t.fromLocation, toLocation: t.toLocation, transportType: t.transportType } },
        update: { ...t },
        create: { ...t },
      });
      upsertLog('TransportCostAverage', `${t.fromLocation} → ${t.toLocation} (${t.transportType}) ~$${t.averageCost}`);
    } catch (err) { skipLog('TransportCostAverage', `${t.fromLocation}→${t.toLocation}`, err); }
  }

  // ── Activities
  console.log('\n🎯 Seeding activities...');
  for (const a of activities) {
    try {
      await (prisma as any).activityCost.upsert({
        where: { activityCode: a.activityCode },
        update: { ...a, includes: a.includes as any, excludes: (a as any).excludes as any, requirements: (a as any).requirements as any ?? null, availableMonths: (a as any).availableMonths as any ?? null },
        create: { ...a, includes: a.includes as any, excludes: (a as any).excludes as any, requirements: (a as any).requirements as any ?? null, availableMonths: (a as any).availableMonths as any ?? null },
      });
      upsertLog('ActivityCost', `${a.activityCode} ($${a.averageCost} avg)`);
    } catch (err) { skipLog('ActivityCost', a.activityCode, err); }
  }

  // ── Pricing rules
  console.log('\n📊 Seeding pricing rules...');
  for (const r of pricingRules) {
    try {
      await (prisma as any).pricingRule.upsert({
        where: { ruleName: r.ruleName },
        update: { ...r },
        create: { ...r },
      });
      upsertLog('PricingRule', `${r.ruleName} (×${r.priceMultiplier})`);
    } catch (err) { skipLog('PricingRule', r.ruleName, err); }
  }

  // ── Summary
  const counts = {
    destinations: await (prisma as any).tripDestination.count(),
    visaFees: await (prisma as any).visaFee.count(),
    parkFees: await (prisma as any).parkFee.count(),
    transport: await (prisma as any).transportCostAverage.count(),
    activities: await (prisma as any).activityCost.count(),
    pricingRules: await (prisma as any).pricingRule.count(),
  };

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✨ NoLScope seed complete!\n');
  console.log(`  📍 Destinations    : ${counts.destinations}`);
  console.log(`  🛂 Visa Fees       : ${counts.visaFees}`);
  console.log(`  🌳 Park Fees       : ${counts.parkFees}`);
  console.log(`  🚌 Transport Routes: ${counts.transport}`);
  console.log(`  🎯 Activities      : ${counts.activities}`);
  console.log(`  📊 Pricing Rules   : ${counts.pricingRules}`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(() => (prisma as any).$disconnect());
