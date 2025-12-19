/**
 * Utility functions for calculating property prices with commission and discounts
 */

/**
 * Get commission percentage for a property
 * @param property - Property object with services field
 * @param systemCommission - Default system commission percentage
 * @returns Commission percentage (0-100)
 */
export function getPropertyCommission(
  property: any,
  systemCommission: number = 0
): number {
  if (!property?.services || typeof property.services !== 'object') {
    return systemCommission;
  }

  const services = property.services as any;
  
  // If property has custom commission, use it; otherwise use system default
  if (services.commissionPercent !== undefined && services.commissionPercent !== null) {
    const customCommission = Number(services.commissionPercent);
    if (Number.isFinite(customCommission) && customCommission >= 0 && customCommission <= 100) {
      return customCommission;
    }
  }

  return systemCommission;
}

/**
 * Calculate final price with commission
 * @param originalPrice - Original price from owner
 * @param commissionPercent - Commission percentage (0-100)
 * @returns Final price with commission added
 */
export function calculatePriceWithCommission(
  originalPrice: number,
  commissionPercent: number
): number {
  if (!originalPrice || originalPrice <= 0 || !Number.isFinite(originalPrice)) {
    return 0;
  }

  if (!Number.isFinite(commissionPercent) || commissionPercent <= 0) {
    return originalPrice;
  }

  // Clamp commission to 0-100%
  const safeCommission = Math.max(0, Math.min(100, commissionPercent));
  
  // Calculate: original price + (original price * commission percentage / 100)
  const commissionAmount = (originalPrice * safeCommission) / 100;
  const finalPrice = originalPrice + commissionAmount;
  
  // Round to 2 decimal places
  return Math.round(finalPrice * 100) / 100;
}

/**
 * Get discount rules for a property
 * @param property - Property object with services field
 * @returns Array of discount rules
 */
export function getPropertyDiscountRules(property: any): Array<{
  minDays: number;
  discountPercent: number;
  enabled: boolean;
}> {
  if (!property?.services || typeof property.services !== 'object') {
    return [];
  }

  const services = property.services as any;
  
  if (services.discountRules && Array.isArray(services.discountRules)) {
    return services.discountRules.filter((rule: any) => 
      rule && 
      typeof rule.minDays === 'number' && 
      typeof rule.discountPercent === 'number' &&
      rule.enabled === true
    );
  }

  return [];
}

/**
 * Calculate discounted price based on booking duration
 * @param basePrice - Base price (with commission already applied)
 * @param nights - Number of nights
 * @param discountRules - Array of discount rules
 * @returns Discounted price
 */
export function calculateDiscountedPrice(
  basePrice: number,
  nights: number,
  discountRules: Array<{ minDays: number; discountPercent: number; enabled: boolean }>
): number {
  if (!basePrice || basePrice <= 0 || nights <= 0) {
    return basePrice;
  }

  // Find applicable discount rule (highest discount for the booking duration)
  let maxDiscount = 0;
  for (const rule of discountRules) {
    if (rule.enabled && nights >= rule.minDays && rule.discountPercent > maxDiscount) {
      maxDiscount = rule.discountPercent;
    }
  }

  if (maxDiscount <= 0) {
    return basePrice;
  }

  // Apply discount
  const discountAmount = (basePrice * maxDiscount) / 100;
  const discountedPrice = basePrice - discountAmount;
  
  return Math.round(discountedPrice * 100) / 100;
}

/**
 * Calculate total booking price with commission and discounts
 * @param originalPricePerNight - Original price per night from owner
 * @param nights - Number of nights
 * @param property - Property object with services field
 * @param systemCommission - Default system commission percentage
 * @returns Object with breakdown of pricing
 */
export function calculateBookingPrice(
  originalPricePerNight: number,
  nights: number,
  property: any,
  systemCommission: number = 0
): {
  originalPrice: number;
  priceWithCommission: number;
  discountAmount: number;
  finalPrice: number;
  commissionPercent: number;
  commissionAmount: number;
  discountPercent: number;
} {
  const commissionPercent = getPropertyCommission(property, systemCommission);
  const priceWithCommission = calculatePriceWithCommission(originalPricePerNight, commissionPercent);
  const totalWithCommission = priceWithCommission * nights;

  const discountRules = getPropertyDiscountRules(property);
  const discountPercent = discountRules
    .filter(rule => rule.enabled && nights >= rule.minDays)
    .reduce((max, rule) => Math.max(max, rule.discountPercent), 0);

  const discountAmount = discountPercent > 0 
    ? (totalWithCommission * discountPercent) / 100 
    : 0;
  
  const finalPrice = totalWithCommission - discountAmount;
  const commissionAmount = (originalPricePerNight * commissionPercent / 100) * nights;

  return {
    originalPrice: originalPricePerNight * nights,
    priceWithCommission: totalWithCommission,
    discountAmount,
    finalPrice: Math.round(finalPrice * 100) / 100,
    commissionPercent,
    commissionAmount: Math.round(commissionAmount * 100) / 100,
    discountPercent,
  };
}
