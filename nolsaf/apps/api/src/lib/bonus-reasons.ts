/**
 * Driver Bonus Reason Types and Helpers
 * Standardized reasons for granting bonuses to drivers
 */

export type BonusReasonType = 
  | 'PERFORMANCE_EXCELLENCE'
  | 'VOLUME_ACHIEVEMENT'
  | 'LOYALTY_RETENTION'
  | 'CUSTOM';

export interface BonusReasonConfig {
  type: BonusReasonType;
  label: string;
  description: string;
  defaultAmount?: number; // Suggested amount in TZS
  icon?: string;
}

export const BONUS_REASON_TYPES: Record<BonusReasonType, BonusReasonConfig> = {
  PERFORMANCE_EXCELLENCE: {
    type: 'PERFORMANCE_EXCELLENCE',
    label: 'Performance Excellence',
    description: 'High ratings, completion rate, and customer satisfaction',
    defaultAmount: 150000,
    icon: 'Trophy',
  },
  VOLUME_ACHIEVEMENT: {
    type: 'VOLUME_ACHIEVEMENT',
    label: 'Volume Achievement',
    description: 'Trip milestones and consistent activity',
    defaultAmount: 100000,
    icon: 'BarChart3',
  },
  LOYALTY_RETENTION: {
    type: 'LOYALTY_RETENTION',
    label: 'Loyalty & Retention',
    description: 'Long-term service and consistent availability',
    defaultAmount: 200000,
    icon: 'Gem',
  },
  CUSTOM: {
    type: 'CUSTOM',
    label: 'Custom Reason',
    description: 'Other reasons not covered above',
    defaultAmount: 0,
    icon: 'Edit',
  },
};

/**
 * Generate a formatted reason text based on type and metrics
 */
export function generateBonusReasonText(
  type: BonusReasonType,
  metrics?: {
    rating?: number;
    completionRate?: number;
    tripsCount?: number;
    activeDays?: number;
    monthsOfService?: number;
    cancellations?: number;
    customText?: string;
  }
): string {
  if (type === 'CUSTOM' && metrics?.customText) {
    return metrics.customText;
  }

  const parts: string[] = [];

  switch (type) {
    case 'PERFORMANCE_EXCELLENCE':
      parts.push('Performance Excellence:');
      if (metrics?.rating) parts.push(`${metrics.rating.toFixed(1)} rating`);
      if (metrics?.completionRate) parts.push(`${metrics.completionRate}% completion rate`);
      if (metrics?.cancellations !== undefined) {
        parts.push(`${metrics.cancellations} cancellation${metrics.cancellations !== 1 ? 's' : ''}`);
      }
      break;

    case 'VOLUME_ACHIEVEMENT':
      parts.push('Volume Achievement:');
      if (metrics?.tripsCount) parts.push(`Completed ${metrics.tripsCount} trips`);
      if (metrics?.activeDays) parts.push(`${metrics.activeDays} active days`);
      break;

    case 'LOYALTY_RETENTION':
      parts.push('Loyalty Bonus:');
      if (metrics?.monthsOfService) parts.push(`${metrics.monthsOfService} months of service`);
      if (metrics?.activeDays) parts.push(`${metrics.activeDays} active days this month`);
      break;

    default:
      return metrics?.customText || 'Bonus granted';
  }

  return parts.join(', ');
}

/**
 * Get suggested bonus amount based on reason type and metrics
 */
export function getSuggestedBonusAmount(
  type: BonusReasonType,
  metrics?: {
    tripsCount?: number;
    monthsOfService?: number;
    rating?: number;
  }
): number {
  const baseAmount = BONUS_REASON_TYPES[type].defaultAmount || 0;

  // Adjust based on metrics
  switch (type) {
    case 'VOLUME_ACHIEVEMENT':
      if (metrics?.tripsCount) {
        // Scale with trip count: 50 trips = base, 100 = 1.5x, 200+ = 2x
        if (metrics.tripsCount >= 200) return baseAmount * 2;
        if (metrics.tripsCount >= 100) return Math.round(baseAmount * 1.5);
        if (metrics.tripsCount >= 50) return baseAmount;
      }
      break;

    case 'LOYALTY_RETENTION':
      if (metrics?.monthsOfService) {
        // Scale with service duration: 6 months = base, 12 = 1.5x, 24+ = 2x
        if (metrics.monthsOfService >= 24) return baseAmount * 2;
        if (metrics.monthsOfService >= 12) return Math.round(baseAmount * 1.5);
        if (metrics.monthsOfService >= 6) return baseAmount;
      }
      break;

    case 'PERFORMANCE_EXCELLENCE':
      if (metrics?.rating) {
        // Scale with rating: 4.7 = base, 4.8 = 1.2x, 4.9+ = 1.5x
        if (metrics.rating >= 4.9) return Math.round(baseAmount * 1.5);
        if (metrics.rating >= 4.8) return Math.round(baseAmount * 1.2);
        return baseAmount;
      }
      break;
  }

  return baseAmount;
}

/**
 * Validate bonus reason type
 */
export function isValidBonusReasonType(value: string): value is BonusReasonType {
  return Object.keys(BONUS_REASON_TYPES).includes(value);
}

