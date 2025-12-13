/**
 * Business Configuration Helper
 * Fetches configurable business logic values from SystemSetting with fallback defaults
 */

import { prisma } from "@nolsaf/prisma";

export interface BusinessConfig {
  // Referral system
  referralCreditPercent: number; // Default: 0.35% (0.0035)
  
  // Driver levels
  driverLevelGoldThreshold: number; // Default: 500000 TZS
  driverLevelDiamondThreshold: number; // Default: 2000000 TZS
  
  // Goal calculations
  goalMultiplier: number; // Default: 1.1 (10% above average)
  goalMinimumMonthly: number; // Default: 3000000 TZS
}

const DEFAULT_CONFIG: BusinessConfig = {
  referralCreditPercent: 0.0035, // 0.35%
  driverLevelGoldThreshold: 500000, // 500K TZS
  driverLevelDiamondThreshold: 2000000, // 2M TZS
  goalMultiplier: 1.1, // 10% above average
  goalMinimumMonthly: 3000000, // 3M TZS
};

/**
 * Get business configuration from SystemSetting
 * Falls back to defaults if SystemSetting doesn't have these fields yet
 */
export async function getBusinessConfig(): Promise<BusinessConfig> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    
    if (!settings) {
      return DEFAULT_CONFIG;
    }

    // Extract config from settings
    const config: BusinessConfig = {
      referralCreditPercent: settings.referralCreditPercent ? Number(settings.referralCreditPercent) : DEFAULT_CONFIG.referralCreditPercent,
      driverLevelGoldThreshold: settings.driverLevelGoldThreshold ?? DEFAULT_CONFIG.driverLevelGoldThreshold,
      driverLevelDiamondThreshold: settings.driverLevelDiamondThreshold ?? DEFAULT_CONFIG.driverLevelDiamondThreshold,
      goalMultiplier: settings.goalMultiplier ? Number(settings.goalMultiplier) : DEFAULT_CONFIG.goalMultiplier,
      goalMinimumMonthly: settings.goalMinimumMonthly ?? DEFAULT_CONFIG.goalMinimumMonthly,
    };

    return config;
  } catch (err) {
    console.warn('Failed to load business config from SystemSetting, using defaults:', err);
    return DEFAULT_CONFIG;
  }
}

/**
 * Get referral credit percentage (as decimal, e.g., 0.0035 for 0.35%)
 */
export async function getReferralCreditPercent(): Promise<number> {
  const config = await getBusinessConfig();
  return config.referralCreditPercent;
}

/**
 * Get driver level thresholds
 */
export async function getDriverLevelThresholds(): Promise<{ gold: number; diamond: number }> {
  const config = await getBusinessConfig();
  return {
    gold: config.driverLevelGoldThreshold,
    diamond: config.driverLevelDiamondThreshold,
  };
}

/**
 * Get goal calculation parameters
 */
export async function getGoalConfig(): Promise<{ multiplier: number; minimumMonthly: number }> {
  const config = await getBusinessConfig();
  return {
    multiplier: config.goalMultiplier,
    minimumMonthly: config.goalMinimumMonthly,
  };
}

