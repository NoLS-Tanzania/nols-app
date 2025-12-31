# Transportation System Documentation
## Complete Guide to NoLSAF Transportation Features

**Version:** 2.0  
**Last Updated:** 2024  
**Status:** Current Implementation + Planned Enhancements

---

## Table of Contents

1. [Overview](#overview)
2. [Current Implementation](#current-implementation)
3. [Planned Enhancements](#planned-enhancements)
4. [Pricing Strategy](#pricing-strategy)
5. [Free Transport Benefits](#free-transport-benefits)
6. [Group Stays & Safari Trips](#group-stays--safari-trips)
7. [Fraud Prevention](#fraud-prevention)
8. [Technical Implementation](#technical-implementation)
9. [API Reference](#api-reference)
10. [Database Schema](#database-schema)
11. [Examples & Calculations](#examples--calculations)

---

## Overview

NoLSAF offers integrated transportation services as part of property bookings, allowing users to include transport from their location to the property in a single package payment. The system uses **upfront fare pricing** (fixed price before trip) to prevent fraud and provide transparent pricing.

### Key Features
- ✅ **Upfront Fare Pricing**: Fixed price locked before trip (prevents driver fraud)
- ✅ **Single Package Payment**: Accommodation + Transport = One Total
- ✅ **Real-Time Calculation**: Instant fare display as user enters location
- ✅ **Server-Side Validation**: Prevents fare manipulation
- 🔄 **Planned**: Multi-vehicle options (Boda, Bajaji, Car, XL)
- 🔄 **Planned**: Free transport for high-value bookings
- 🔄 **Planned**: Competitive pricing (20% cheaper than Bolt)

---

## Current Implementation

### 1. Fare Calculation System

**File:** `apps/web/lib/transportFareCalculator.ts`

**Pricing Model:**
- **Base Fare:** 2,000 TZS (minimum)
- **Per Kilometer:** 500 TZS
- **Per Minute:** 50 TZS (for traffic/waiting time)
- **Surge Multiplier:**
  - 1.2x during peak hours (7-9 AM, 5-7 PM on weekdays)
  - 1.15x on weekend evenings (6-10 PM)
  - 1.0x (no surge) otherwise

**Calculation Formula:**
```
Total = (Base Fare + Distance Fare + Time Fare) × Surge Multiplier
Minimum: 2,000 TZS
```

**Distance Calculation:**
- Uses Haversine formula for accurate distance between coordinates
- Returns distance in kilometers (straight-line)

**Time Estimation:**
- Assumes average speed of 30 km/h in urban areas
- Minimum 5 minutes travel time

### 2. Booking Integration

**File:** `apps/api/src/routes/public.bookings.ts`

**New Fields:**
- `includeTransport`: boolean
- `transportOriginLat`: number (optional)
- `transportOriginLng`: number (optional)
- `transportOriginAddress`: string (optional)
- `transportFare`: number (pre-calculated from frontend)

**Security:**
- Server-side fare validation (recalculates to verify)
- Minimum fare enforcement (2,000 TZS)
- Distance-based validation to prevent fare manipulation

**Storage:**
- Transport info stored in `specialRequests` field with format:
  ```
  TRANSPORT_INCLUDED|fare:2000|origin:lat,lng|address:...
  ```
- Total amount includes transport fare

### 3. User Interface

**File:** `apps/web/app/public/booking/confirm/page.tsx`

**UI Features:**
- Toggle switch to include/exclude transportation
- Location input field for pickup address
- "Use Current Location" button (browser geolocation)
- Real-time fare calculation
- Fare breakdown display
- Auto-calculation when location is provided

**User Flow:**
1. User toggles "Include Transportation"
2. Enters pickup location or uses current location
3. Fare is automatically calculated
4. Fare breakdown is displayed
5. Total price updates to include transport

### 4. Invoice Integration

**File:** `apps/api/src/routes/public.invoices.ts`

**Updates:**
- Extracts transport fare from booking's `specialRequests`
- Uses booking's `totalAmount` (already includes transport)
- Adds transport note to invoice if applicable

---

## Planned Enhancements

### 1. Multi-Vehicle Type Selection

**Goal:** Add vehicle options similar to Bolt (Boda, Bajaji, Car, XL)

| Vehicle | Icon | Capacity | Base Fare | Per Km | Per Min | Use Case |
|---------|------|----------|-----------|--------|---------|----------|
| **Boda** | 🏍️ | 1 | 1,500 TZS | 350 TZS | 40 TZS | Budget, fast, short trips |
| **Bajaji** | 🛺 | 3 | 1,800 TZS | 400 TZS | 45 TZS | Mid-range, local experience |
| **Car** | 🚗 | 4 | 2,000 TZS | 450 TZS | 50 TZS | Standard, comfortable |
| **XL** | 🚐 | 6 | 2,500 TZS | 550 TZS | 60 TZS | Groups, luggage |

**Vehicle Selection Logic:**
- **Default Recommendation:**
  - 1 passenger: Boda (cheapest, fastest)
  - 2-3 passengers: Bajaji (good value)
  - 4 passengers: Car (standard)
  - 5+ passengers or luggage: XL (premium)
- **User Choice:** User can override recommendation

### 2. Competitive Pricing Strategy

**Target:** 20% cheaper than Bolt for same route

**Pricing Formula:**
```typescript
// NoLSAF Pricing (20% cheaper than Bolt)
const BOLT_DISCOUNT = 0.20;

// Base calculation
const baseFare = VEHICLE_BASE_FARE[vehicleType];
const distanceFare = distance * VEHICLE_PER_KM[vehicleType];
const timeFare = estimatedTime * VEHICLE_PER_MIN[vehicleType];

// Subtotal
const subtotal = baseFare + distanceFare + timeFare;

// Apply surge (if applicable)
const total = Math.ceil(subtotal * surgeMultiplier);

// Apply package discount (make it cheaper than Bolt)
const finalTotal = Math.ceil(total * (1 - BOLT_DISCOUNT));
```

**Example Comparison (10.6 km trip):**

| Vehicle | Bolt (with 20% promo) | NoLSAF (Target) | Savings |
|---------|----------------------|-----------------|---------|
| Boda | 6,000 TZS | **4,800 TZS** | 20% |
| Bajaji | 9,000 TZS | **7,200 TZS** | 20% |
| Car | 15,000 TZS | **12,000 TZS** | 20% |
| XL | 17,000 TZS | **13,600 TZS** | 20% |

### 3. Free Transport Eligibility

**Rule 1: High-Value Booking**
```
Total Booking Value ≥ 3,000,000 TZS
AND
Distance ≤ 10 km
→ FREE TRANSPORT
```

**Rule 2: Extended Stay**
```
Nights ≥ 7 nights
AND
Total Booking Value ≥ 1,500,000 TZS
AND
Distance ≤ 10 km
→ FREE TRANSPORT
```

**Rule 3: Premium Property**
```
Property Price/Night ≥ 300,000 TZS
AND
Nights ≥ 10 nights
AND
Distance ≤ 10 km
→ FREE TRANSPORT
```

**Examples:**

✅ **Eligible:**
- Property: 300,000 TZS/night × 10 nights = 3,000,000 TZS, Distance: 8 km → **FREE**
- Property: 200,000 TZS/night × 8 nights = 1,600,000 TZS, Distance: 9 km → **FREE**
- Property: 350,000 TZS/night × 12 nights = 4,200,000 TZS, Distance: 7 km → **FREE**

❌ **Not Eligible:**
- Property: 150,000 TZS/night × 5 nights = 750,000 TZS, Distance: 12 km → **CHARGED**

**UI Display:**
```
🎉 Free Transport Included!

Your booking qualifies for complimentary transportation because:
✓ Total booking value: 3,000,000 TZS
✓ Distance: 8 km (within 10 km limit)

Estimated transport value: 12,000 TZS (FREE)
```

---

## Group Stays & Safari Trips

### Manual Handling by Admin

**Important:** Large group bookings and safari trips are **NOT** handled automatically by the system. These require manual calculation and package creation by administrators.

### Group Stays (40+ People)

**Process:**
1. Customer submits booking request through "Group Stay" section
2. Admin reviews booking details:
   - Number of guests (40+)
   - Property location
   - Check-in/check-out dates
   - Special requirements
3. Admin calculates transportation needs:
   - Number of vehicles required
   - Vehicle types (may need multiple XL vehicles or buses)
   - Total distance and routes
   - Special considerations (luggage, accessibility)
4. Admin creates custom transportation package:
   - Manual fare calculation
   - Custom pricing based on group size
   - Special rates for bulk bookings
5. Admin sends package recommendation to customer:
   - Total transportation cost
   - Vehicle breakdown
   - Route details
   - Payment terms

**Example:**
```
Group: 40 people
Property: Safari Lodge (remote location)
Distance: 150 km from airport
Vehicles Needed: 2 buses (20 people each) or 7 XL vehicles

Admin Calculation:
- Bus option: 2 buses × 500,000 TZS = 1,000,000 TZS
- XL option: 7 XL × 150,000 TZS = 1,050,000 TZS
- Recommendation: Bus option (cheaper, more efficient)
```

### Safari Trips

**Process:**
1. Customer books property through "Safari" section
2. Admin reviews:
   - Safari itinerary
   - Multiple locations
   - Duration
   - Group size
3. Admin calculates transportation:
   - Multiple routes (airport → lodge → park → lodge → airport)
   - Vehicle requirements (4x4 for safari, regular for transfers)
   - Total package cost
4. Admin creates custom package:
   - All-inclusive transportation
   - Multiple stops/routes
   - Specialized vehicles
5. Admin sends recommendation to customer

**Example:**
```
Safari Trip: 5 days
Routes:
- Airport → Lodge (50 km)
- Lodge → Park (30 km) - 4x4 required
- Park → Lodge (30 km) - 4x4 required
- Lodge → Airport (50 km)

Admin Package:
- Airport transfers: 2 × 25,000 TZS = 50,000 TZS
- Safari vehicle (4x4): 5 days × 80,000 TZS = 400,000 TZS
- Total: 450,000 TZS (custom package)
```

### Admin Interface Requirements

**Needed Features:**
- Group booking review dashboard
- Manual fare calculator
- Package creation tool
- Custom pricing input
- Recommendation sending system
- Customer communication interface

**Note:** These features are separate from the automated transportation system and will be handled in the admin panel.

---

## Fraud Prevention

### Why Upfront Pricing?

**Primary Reason:** Prevent driver fraud (taking long routes to increase fare)

**Additional Benefits:**
- Handles bush areas (unpredictable routes)
- Handles properties in remote locations
- Driver paid fixed amount regardless of route taken
- No route manipulation possible

### Validation Measures

**1. Server-Side Recalculation**
```typescript
// Backend recalculates to prevent manipulation
if (clientFare < serverFare * 0.8) {
  // Use server-calculated fare
  transportFare = serverFare;
}
```

**2. Distance Validation**
- Maximum reasonable distance check
- Alert if distance seems excessive
- Manual review for outliers

**3. Challenging Location Handling**

**Bush Areas / Unpredictable Roads:**
- Add "difficult access" flag to properties
- Slightly higher base fare for these locations (15% increase)
- Require experienced drivers
- Fixed fare still applies (prevents exploitation)

```typescript
const DIFFICULT_ACCESS_MULTIPLIER = 1.15; // 15% increase

if (property.isDifficultAccess) {
  baseFare = baseFare * DIFFICULT_ACCESS_MULTIPLIER;
}
```

**4. Driver Assignment Rules**
- Match driver experience to location difficulty
- Track driver performance
- Flag suspicious patterns

---

## Technical Implementation

### Architecture

```
┌─────────────────┐
│  Frontend       │
│  - Vehicle      │
│    Selection    │
│  - Fare Display │
│  - Free Trans   │
│    Indicator    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  API Layer      │
│  - Fare Calc    │
│  - Eligibility  │
│  - Validation   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Database       │
│  - Vehicle Type │
│  - Free Trans   │
│    History      │
└─────────────────┘
```

### Key Functions

**1. Calculate Fare with Vehicle Type**
```typescript
function calculateTransportFare(
  origin: Location,
  destination: Location,
  vehicleType: VehicleType,
  currency: string = "TZS",
  bookingValue?: number,
  nights?: number
): FareCalculation
```

**2. Check Free Transport Eligibility**
```typescript
function checkFreeTransportEligibility(
  bookingValue: number,
  distance: number,
  nights: number,
  pricePerNight: number
): {
  eligible: boolean;
  reason: string;
  estimatedValue: number;
}
```

**3. Get Vehicle Recommendations**
```typescript
function getVehicleRecommendations(
  passengerCount: number,
  hasLuggage: boolean
): VehicleType[]
```

---

## API Reference

### Current Endpoints

#### POST `/api/public/bookings`

**Request Body:**
```typescript
{
  // ... existing fields ...
  includeTransport?: boolean;
  transportOriginLat?: number;
  transportOriginLng?: number;
  transportOriginAddress?: string;
  transportFare?: number; // Client-calculated (validated server-side)
}
```

**Response:**
```typescript
{
  // ... existing fields ...
  transportFare?: number;
  transportDistance?: number;
}
```

### Planned Endpoints

#### GET `/api/public/transport/options`

**Query Parameters:**
- `originLat`: number
- `originLng`: number
- `destinationLat`: number
- `destinationLng`: number
- `passengerCount?`: number (default: 1)
- `hasLuggage?`: boolean (default: false)
- `bookingValue?`: number (for free transport check)
- `nights?`: number (for free transport check)
- `pricePerNight?`: number (for free transport check)

**Response:**
```typescript
{
  options: Array<{
    vehicleType: "BODA" | "BAJAJI" | "CAR" | "XL";
    name: string;
    icon: string;
    capacity: number;
    fare: {
      baseFare: number;
      distanceFare: number;
      timeFare: number;
      subtotal: number;
      surgeMultiplier: number;
      total: number;
      isFree: boolean;
      freeReason?: string;
    };
    estimatedTime: number;
    distance: number;
    isRecommended: boolean;
  }>;
  recommended: "BODA" | "BAJAJI" | "CAR" | "XL";
}
```

#### POST `/api/public/transport/calculate`

**Request Body:**
```typescript
{
  origin: { latitude: number; longitude: number; address?: string };
  destination: { latitude: number; longitude: number };
  vehicleType: "BODA" | "BAJAJI" | "CAR" | "XL";
  bookingValue?: number;
  nights?: number;
  pricePerNight?: number;
}
```

**Response:**
```typescript
{
  vehicleType: string;
  fare: FareCalculation;
  isFree: boolean;
  freeReason?: string;
  estimatedValue: number; // If free, show what they saved
}
```

---

## Database Schema

### Current Schema

**Booking Table:**
- `totalAmount`: Includes transport fare
- `specialRequests`: Contains transport metadata
  - Format: `TRANSPORT_INCLUDED|fare:5000|origin:lat,lng|address:...`

### Planned Schema Changes

#### 1. Add Vehicle Type to Booking

```sql
ALTER TABLE `Booking` 
ADD COLUMN `transportVehicleType` ENUM('BODA','BAJAJI','CAR','XL') NULL,
ADD COLUMN `transportFare` DECIMAL(10,2) NULL,
ADD COLUMN `transportOriginLat` DECIMAL(10,6) NULL,
ADD COLUMN `transportOriginLng` DECIMAL(10,6) NULL,
ADD COLUMN `transportOriginAddress` VARCHAR(500) NULL,
ADD COLUMN `transportDistance` DECIMAL(8,2) NULL,
ADD COLUMN `transportIsFree` BOOLEAN DEFAULT FALSE,
ADD COLUMN `transportFreeReason` VARCHAR(200) NULL;
```

#### 2. Add Property Difficulty Flag

```sql
ALTER TABLE `Property`
ADD COLUMN `isDifficultAccess` BOOLEAN DEFAULT FALSE,
ADD COLUMN `difficultAccessNotes` TEXT NULL;
```

#### 3. Transport Pricing Configuration (Optional - for admin)

```sql
CREATE TABLE `TransportPricing` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `vehicleType` ENUM('BODA','BAJAJI','CAR','XL') NOT NULL,
  `baseFare` DECIMAL(10,2) NOT NULL,
  `perKmRate` DECIMAL(10,2) NOT NULL,
  `perMinuteRate` DECIMAL(10,2) NOT NULL,
  `capacity` INT NOT NULL,
  `discountPercent` DECIMAL(5,2) DEFAULT 20.00,
  `isActive` BOOLEAN DEFAULT TRUE,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_vehicle_type` (`vehicleType`)
);
```

#### 4. Free Transport Eligibility Rules (Optional - for admin)

```sql
CREATE TABLE `FreeTransportRule` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `minBookingValue` DECIMAL(12,2) NULL,
  `minNights` INT NULL,
  `minPricePerNight` DECIMAL(10,2) NULL,
  `maxDistance` DECIMAL(8,2) NOT NULL DEFAULT 10.00,
  `isActive` BOOLEAN DEFAULT TRUE,
  `priority` INT DEFAULT 0,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

---

## Examples & Calculations

### Example 1: Short Distance (5 km) - Current System

**Route:** City Center → Nearby Hotel  
**Distance:** 5 km  
**Time:** Monday, 2 PM (Off-Peak)

**Calculation:**
- Base: 2,000 TZS
- Distance (5 km × 500): 2,500 TZS
- Time (10 min × 50): 500 TZS
- Subtotal: 5,000 TZS
- Surge: 1.0x
- **Total: 5,000 TZS**

### Example 2: Medium Distance (13 km) - Peak Hours

**Route:** Ubungo → Posta  
**Distance:** 13 km  
**Time:** Monday, 8 AM (Peak Hours)

**Calculation:**
- Base: 2,000 TZS
- Distance (13 km × 500): 6,500 TZS
- Time (26 min × 50): 1,300 TZS
- Subtotal: 9,800 TZS
- Surge: 1.2x (peak hours)
- **Total: 11,760 TZS**

### Example 3: High-Value Booking with Free Transport (Planned)

**Route:** Airport → Luxury Resort  
**Distance:** 8 km  
**Booking:** 300,000 TZS/night × 10 nights = 3,000,000 TZS

**Eligibility Check:**
- ✅ Total: 3,000,000 TZS (≥ 3,000,000)
- ✅ Distance: 8 km (≤ 10 km)
- **→ FREE TRANSPORT**

**Value Saved:**
- Estimated fare (Car): 12,000 TZS
- **→ Customer saves 12,000 TZS**

### Example 4: Group Stay (40+ People) - Manual Handling

**Route:** Airport → Safari Lodge  
**Distance:** 150 km  
**Group:** 40 people  
**Handling:** Manual by admin

**Admin Calculation:**
- Option 1: 2 buses (20 people each)
  - 2 × 500,000 TZS = 1,000,000 TZS
- Option 2: 7 XL vehicles (6 people each)
  - 7 × 150,000 TZS = 1,050,000 TZS
- **Recommendation:** Bus option (cheaper, more efficient)

**Admin sends custom package to customer.**

### Example 5: Safari Trip - Manual Handling

**Routes:**
- Airport → Lodge: 50 km
- Lodge → Park (4x4): 30 km
- Park → Lodge (4x4): 30 km
- Lodge → Airport: 50 km

**Duration:** 5 days

**Admin Package:**
- Airport transfers: 2 × 25,000 TZS = 50,000 TZS
- Safari vehicle (4x4): 5 days × 80,000 TZS = 400,000 TZS
- **Total: 450,000 TZS** (custom package)

**Admin sends recommendation to customer.**

---

## Configuration

### Current Pricing Constants

**File:** `apps/web/lib/transportFareCalculator.ts`

```typescript
const BASE_FARE = 2000;        // Minimum fare in TZS
const PER_KM_RATE = 500;       // Per kilometer rate
const PER_MINUTE_RATE = 50;    // Per minute rate (for traffic/waiting)
const AVERAGE_SPEED_KMH = 30;  // Average speed in urban Tanzania
```

**Surge Multipliers:**
```typescript
Peak Hours (Weekdays 7-9 AM, 5-7 PM): 1.2x
Weekend Evenings (6-10 PM): 1.15x
All Other Times: 1.0x
```

### Planned Vehicle Pricing

```typescript
const VEHICLE_PRICING = {
  BODA: {
    baseFare: 1500,
    perKm: 350,
    perMinute: 40,
    capacity: 1,
    discount: 0.20, // 20% cheaper than Bolt
  },
  BAJAJI: {
    baseFare: 1800,
    perKm: 400,
    perMinute: 45,
    capacity: 3,
    discount: 0.20,
  },
  CAR: {
    baseFare: 2000,
    perKm: 450,
    perMinute: 50,
    capacity: 4,
    discount: 0.20,
  },
  XL: {
    baseFare: 2500,
    perKm: 550,
    perMinute: 60,
    capacity: 6,
    discount: 0.20,
  },
};
```

---

## Testing Checklist

### Current Features
- [x] Calculate fare for short distance (< 5 km)
- [x] Calculate fare for medium distance (10-20 km)
- [x] Calculate fare for long distance (> 30 km)
- [x] Test peak hour surge (7-9 AM, 5-7 PM)
- [x] Test weekend surge (evenings)
- [x] Test minimum fare enforcement (2,000 TZS)
- [x] Test location access (browser geolocation)
- [x] Test manual address entry
- [x] Verify transport included in booking total
- [x] Verify transport shown in invoice
- [x] Test booking without transport
- [x] Test payment flow with transport
- [x] Verify receipt shows transport breakdown

### Planned Features
- [ ] Vehicle type selection UI
- [ ] Free transport eligibility check
- [ ] Free transport badge display
- [ ] Vehicle recommendation logic
- [ ] Multi-vehicle pricing calculation
- [ ] Admin manual package creation (group stays)
- [ ] Admin manual package creation (safari trips)

---

## Future Enhancements

### Phase 2 Features
1. **Route-Based Distance**: Use Google Maps API for accurate routes
2. **Real-Time Traffic**: Integrate traffic data for time estimates
3. **Driver Matching**: Match drivers to vehicle types and locations
4. **Loyalty Program**: Additional free transport for frequent customers

### Phase 3 Features
1. **Multiple Trips**: Round-trip or multiple stops
2. **Scheduled Transport**: Book transport for specific times
3. **Group Bookings**: Special rates for large groups (automated)
4. **Corporate Accounts**: Bulk transport packages

---

## Summary

### Current Status
✅ **Implemented:**
- Upfront fare pricing
- Single vehicle type (generic car)
- Real-time fare calculation
- Server-side validation
- Booking integration
- Invoice integration

### Planned Status
🔄 **In Development:**
- Multi-vehicle type selection
- Competitive pricing (20% cheaper than Bolt)
- Free transport for high-value bookings
- Vehicle recommendations
- Admin manual package creation (group stays & safari)

### Manual Handling
📋 **Admin-Managed:**
- Group stays (40+ people)
- Safari trips
- Custom transportation packages
- Special route requirements

---

**Document Status:** ✅ Complete - Single Source of Truth  
**Last Updated:** 2024  
**Maintained By:** Development Team

