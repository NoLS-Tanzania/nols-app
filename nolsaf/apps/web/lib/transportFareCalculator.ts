/**
 * Transportation Fare Calculator
 * 
 * PRICING METHOD: Upfront Fare Pricing (Fixed Price Before Trip)
 * 
 * This is the primary pricing method used to enable users to pay everything
 * in a single package payment (accommodation + transportation together).
 * 
 * The fare is calculated and locked in BEFORE the trip starts, providing:
 * - Transparent pricing (user knows exact cost)
 * - Single payment package (everything paid together)
 * - No surprise charges (fixed price guarantee)
 * 
 * Pricing Structure:
 * - Base fare: 2000 TZS (minimum)
 * - Per kilometer: 500 TZS
 * - Per minute: 50 TZS (for traffic/waiting)
 * - Distance-based pricing with surge multipliers
 * 
 * Future: Can be extended to support other pricing methods:
 * - Metered pricing (real-time distance tracking)
 * - Flat rate pricing (fixed per zone)
 * - Dynamic pricing (demand-based)
 * - Subscription pricing (monthly passes)
 */

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface FareCalculation {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  subtotal: number;
  surgeMultiplier: number;
  total: number;
  distance: number; // in kilometers
  estimatedTime: number; // in minutes
  currency: string;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  origin: Location,
  destination: Location
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(destination.latitude - origin.latitude);
  const dLon = toRadians(destination.longitude - origin.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(origin.latitude)) *
      Math.cos(toRadians(destination.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Estimate travel time based on distance
 * Assumes average speed of 30 km/h in urban areas
 * Returns time in minutes
 */
export function estimateTravelTime(distanceKm: number): number {
  const averageSpeedKmh = 30; // Average speed in urban Tanzania
  const timeHours = distanceKm / averageSpeedKmh;
  const timeMinutes = Math.ceil(timeHours * 60);
  return Math.max(5, timeMinutes); // Minimum 5 minutes
}

/**
 * Calculate surge multiplier based on time and demand
 * For now, we use a simple time-based surge
 * Can be enhanced with real-time demand data
 */
export function calculateSurgeMultiplier(
  hourOfDay: number,
  dayOfWeek: number
): number {
  // Peak hours: 7-9 AM, 5-7 PM on weekdays
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isMorningRush = hourOfDay >= 7 && hourOfDay < 9;
  const isEveningRush = hourOfDay >= 17 && hourOfDay < 19;

  if (isWeekday && (isMorningRush || isEveningRush)) {
    return 1.2; // 20% surge during peak hours
  }

  // Weekend evenings might have higher demand
  if (!isWeekday && hourOfDay >= 18 && hourOfDay < 22) {
    return 1.15; // 15% surge on weekend evenings
  }

  return 1.0; // No surge
}

/**
 * Calculate transportation fare (UPFRONT PRICING METHOD)
 * 
 * This calculates a fixed fare BEFORE the trip starts, enabling:
 * - Single package payment (accommodation + transport)
 * - Transparent pricing (user sees exact cost)
 * - Price guarantee (no surprises)
 * 
 * @param origin - Pickup location
 * @param destination - Drop-off location (property)
 * @param currency - Currency code (default: TZS)
 * @returns Fare calculation breakdown (fixed upfront price)
 */
export function calculateTransportFare(
  origin: Location,
  destination: Location,
  currency: string = "TZS"
): FareCalculation {
  // Pricing constants
  const BASE_FARE = 2000; // Minimum fare in TZS
  const PER_KM_RATE = 500; // Per kilometer rate
  const PER_MINUTE_RATE = 50; // Per minute rate (for traffic/waiting)

  // Calculate distance
  const distance = calculateDistance(origin, destination);

  // Estimate travel time
  const estimatedTime = estimateTravelTime(distance);

  // Calculate surge multiplier
  const now = new Date();
  const hourOfDay = now.getHours();
  const dayOfWeek = now.getDay();
  const surgeMultiplier = calculateSurgeMultiplier(hourOfDay, dayOfWeek);

  // Calculate fare components
  const baseFare = BASE_FARE;
  const distanceFare = distance * PER_KM_RATE;
  const timeFare = estimatedTime * PER_MINUTE_RATE;

  // Subtotal before surge
  const subtotal = baseFare + distanceFare + timeFare;

  // Apply surge multiplier
  const total = Math.ceil(subtotal * surgeMultiplier);

  // Ensure minimum fare
  const finalTotal = Math.max(BASE_FARE, total);

  return {
    baseFare,
    distanceFare: Math.round(distanceFare),
    timeFare: Math.round(timeFare),
    subtotal: Math.round(subtotal),
    surgeMultiplier,
    total: finalTotal,
    distance,
    estimatedTime,
    currency,
  };
}

/**
 * Format fare for display
 */
export function formatFare(fare: FareCalculation): string {
  return `${fare.total.toLocaleString()} ${fare.currency}`;
}

/**
 * Get fare breakdown text for UI
 */
export function getFareBreakdown(fare: FareCalculation): string {
  const parts: string[] = [];

  if (fare.surgeMultiplier > 1.0) {
    parts.push(`Base: ${fare.baseFare.toLocaleString()} ${fare.currency}`);
    parts.push(`Distance (${fare.distance.toFixed(1)} km): ${fare.distanceFare.toLocaleString()} ${fare.currency}`);
    parts.push(`Time (${fare.estimatedTime} min): ${fare.timeFare.toLocaleString()} ${fare.currency}`);
    parts.push(`Surge (${(fare.surgeMultiplier * 100).toFixed(0)}%): +${((fare.subtotal * fare.surgeMultiplier) - fare.subtotal).toLocaleString()} ${fare.currency}`);
  } else {
    parts.push(`Base fare: ${fare.baseFare.toLocaleString()} ${fare.currency}`);
    parts.push(`Distance (${fare.distance.toFixed(1)} km): ${fare.distanceFare.toLocaleString()} ${fare.currency}`);
    parts.push(`Estimated time (${fare.estimatedTime} min): ${fare.timeFare.toLocaleString()} ${fare.currency}`);
  }

  return parts.join(" • ");
}

