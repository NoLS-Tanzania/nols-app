import { prisma } from "@nolsaf/prisma";
import { validatePasswordStrength } from "./security.js";

/**
 * Get password validation options from SystemSetting
 */
export async function getPasswordValidationOptions() {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return {
    minLength: settings?.minPasswordLength ?? 8,
    requireUpper: settings?.requirePasswordUppercase ?? false,
    requireLower: settings?.requirePasswordLowercase ?? false,
    requireNumber: settings?.requirePasswordNumber ?? false,
    requireSpecial: settings?.requirePasswordSpecial ?? false,
  };
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
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return settings?.requireAdmin2FA ?? false;
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
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return settings?.forceLogoutOnPasswordChange ?? true;
}

/**
 * Get API rate limit per minute
 */
export async function getApiRateLimitPerMinute(): Promise<number> {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return settings?.apiRateLimitPerMinute ?? 100;
}

/**
 * Get max login attempts before lockout
 */
export async function getMaxLoginAttempts(): Promise<number> {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return settings?.maxLoginAttempts ?? 5;
}

/**
 * Get account lockout duration in minutes
 */
export async function getAccountLockoutDurationMinutes(): Promise<number> {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return settings?.accountLockoutDurationMinutes ?? 5; // Default: 5 minutes (was 30)
}

/**
 * Check if security audit logging is enabled
 */
export async function isSecurityAuditLoggingEnabled(): Promise<boolean> {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return settings?.enableSecurityAuditLogging ?? true;
}

/**
 * Check if failed login attempts should be logged
 */
export async function shouldLogFailedLoginAttempts(): Promise<boolean> {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return settings?.logFailedLoginAttempts ?? true;
}

/**
 * Check if alerts should be sent on suspicious activity
 */
export async function shouldAlertOnSuspiciousActivity(): Promise<boolean> {
  const settings = await prisma.systemSetting.findUnique({ where: { id: 1 } });
  return settings?.alertOnSuspiciousActivity ?? false;
}

