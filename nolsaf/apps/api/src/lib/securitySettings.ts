import { prisma } from "@nolsaf/prisma";
import { validatePasswordStrength } from "./security.js";

/**
 * Get password validation options from SystemSetting
 */
export async function getPasswordValidationOptions() {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    return {
      minLength: settings?.minPasswordLength ?? 8,
      requireUpper: settings?.requirePasswordUppercase ?? false,
      requireLower: settings?.requirePasswordLowercase ?? false,
      requireNumber: settings?.requirePasswordNumber ?? false,
      requireSpecial: settings?.requirePasswordSpecial ?? false,
    };
  } catch (err) {
    console.error('Failed to fetch password validation options from SystemSetting:', err);
    // Return safe defaults
    return {
      minLength: 8,
      requireUpper: false,
      requireLower: false,
      requireNumber: false,
      requireSpecial: false,
    };
  }
}

/**
 * Validate password using SystemSetting configuration
 */
export async function validatePasswordWithSettings(
  password: string,
  role?: string | null
): Promise<{ valid: boolean; reasons: string[] }> {
  const options = await getPasswordValidationOptions();
  return validatePasswordStrength(password, { ...options, role: role || undefined });
}

/**
 * Check if admin 2FA is required
 */
export async function isAdmin2FARequired(): Promise<boolean> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    return settings?.requireAdmin2FA ?? false;
  } catch (err) {
    console.error('Failed to fetch admin 2FA requirement setting:', err);
    return false; // Default fallback
  }
}

/**
 * Get session idle timeout in minutes
 */
export async function getSessionIdleMinutes(): Promise<number> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    return settings?.sessionIdleMinutes ?? 30;
  } catch (err) {
    console.error('Failed to fetch session idle minutes from SystemSetting:', err);
    return 30; // Default fallback
  }
}

/**
 * Get maximum session duration in hours
 */
export async function getMaxSessionDurationHours(): Promise<number> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    return settings?.maxSessionDurationHours ?? 24;
  } catch (err) {
    console.error('Failed to fetch max session duration from SystemSetting:', err);
    return 24; // Default fallback
  }
}

/**
 * Check if force logout on password change is enabled
 */
export async function shouldForceLogoutOnPasswordChange(): Promise<boolean> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    return settings?.forceLogoutOnPasswordChange ?? true;
  } catch (err) {
    console.error('Failed to fetch force logout on password change setting:', err);
    return true; // Default fallback
  }
}

/**
 * Get API rate limit per minute
 */
export async function getApiRateLimitPerMinute(): Promise<number> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    return settings?.apiRateLimitPerMinute ?? 100;
  } catch (err) {
    console.error('Failed to fetch API rate limit from SystemSetting:', err);
    return 100; // Default fallback
  }
}

/**
 * Get max login attempts before lockout
 */
export async function getMaxLoginAttempts(): Promise<number> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    return settings?.maxLoginAttempts ?? 5;
  } catch (err) {
    console.error('Failed to fetch max login attempts from SystemSetting:', err);
    return 5; // Default fallback
  }
}

/**
 * Get account lockout duration in minutes
 */
export async function getAccountLockoutDurationMinutes(): Promise<number> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    return settings?.accountLockoutDurationMinutes ?? 5; // Default: 5 minutes (was 30)
  } catch (err) {
    console.error('Failed to fetch account lockout duration from SystemSetting:', err);
    return 5; // Default fallback
  }
}

/**
 * Check if security audit logging is enabled
 */
export async function isSecurityAuditLoggingEnabled(): Promise<boolean> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    return settings?.enableSecurityAuditLogging ?? true;
  } catch (err) {
    console.error('Failed to fetch security audit logging setting:', err);
    return true; // Default fallback
  }
}

/**
 * Check if failed login attempts should be logged
 */
export async function shouldLogFailedLoginAttempts(): Promise<boolean> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    return settings?.logFailedLoginAttempts ?? true;
  } catch (err) {
    console.error('Failed to fetch log failed login attempts setting:', err);
    return true; // Default fallback
  }
}

/**
 * Check if alerts should be sent on suspicious activity
 */
export async function shouldAlertOnSuspiciousActivity(): Promise<boolean> {
  try {
    const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
    return settings?.alertOnSuspiciousActivity ?? false;
  } catch (err) {
    console.error('Failed to fetch alert on suspicious activity setting:', err);
    return false; // Default fallback
  }
}

