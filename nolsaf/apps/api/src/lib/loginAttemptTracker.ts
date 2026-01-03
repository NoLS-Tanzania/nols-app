import { getMaxLoginAttempts, getAccountLockoutDurationMinutes, shouldLogFailedLoginAttempts } from './securitySettings.js';
import { debugLog } from "./debugLog.js";
const log = (data: any) => void debugLog(data);

/**
 * In-memory login attempt tracker
 * Tracks failed login attempts by email and IP address
 * 
 * Structure:
 * - emailAttempts: { email: { count: number, lockedUntil: number | null, lastAttempt: number } }
 * - ipAttempts: { ip: { count: number, lastAttempt: number } }
 */
interface EmailAttempt {
  count: number;
  lockedUntil: number | null; // timestamp when lockout expires
  lastAttempt: number; // timestamp of last attempt
}

interface IpAttempt {
  count: number;
  lastAttempt: number;
}

const emailAttempts = new Map<string, EmailAttempt>();
const ipAttempts = new Map<string, IpAttempt>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  const lockoutDuration = 5 * 60 * 1000; // 5 minutes default (matches default lockout duration)
  
  // Clean up email attempts older than lockout duration
  for (const [email, attempt] of emailAttempts.entries()) {
    if (attempt.lockedUntil && attempt.lockedUntil < now) {
      // Lockout expired, reset count
      emailAttempts.delete(email);
    } else if (!attempt.lockedUntil && now - attempt.lastAttempt > lockoutDuration) {
      // No lockout and last attempt was more than lockout duration ago, reset
      emailAttempts.delete(email);
    }
  }
  
  // Clean up IP attempts older than 1 hour
  for (const [ip, attempt] of ipAttempts.entries()) {
    if (now - attempt.lastAttempt > 60 * 60 * 1000) {
      ipAttempts.delete(ip);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

/**
 * Check if an email is locked out
 */
export async function isEmailLocked(email: string): Promise<{ locked: boolean; lockedUntil: number | null }> {
  const attempt = emailAttempts.get(email.toLowerCase());
  if (!attempt) {
    return { locked: false, lockedUntil: null };
  }
  
  const now = Date.now();
  
  // Check if lockout has expired
  if (attempt.lockedUntil && attempt.lockedUntil > now) {
    return { locked: true, lockedUntil: attempt.lockedUntil };
  }
  
  // Lockout expired, clear it
  if (attempt.lockedUntil && attempt.lockedUntil <= now) {
    emailAttempts.delete(email.toLowerCase());
    return { locked: false, lockedUntil: null };
  }
  
  return { locked: false, lockedUntil: null };
}

/**
 * Record a failed login attempt
 */
export async function recordFailedAttempt(email: string, ip: string): Promise<void> {
  const maxAttempts = await getMaxLoginAttempts();
  const lockoutDuration = (await getAccountLockoutDurationMinutes()) * 60 * 1000;
  const shouldLog = await shouldLogFailedLoginAttempts();
  
  const emailKey = email.toLowerCase();
  const now = Date.now();
  
  // Track email attempts
  const emailAttempt = emailAttempts.get(emailKey) || { count: 0, lockedUntil: null, lastAttempt: now };
  emailAttempt.count += 1;
  emailAttempt.lastAttempt = now;
  
  // Lock account if max attempts reached
  if (emailAttempt.count >= maxAttempts) {
    emailAttempt.lockedUntil = now + lockoutDuration;
    if (shouldLog) {
      console.warn(`[SECURITY] Account locked: ${email} after ${emailAttempt.count} failed attempts. Locked until ${new Date(emailAttempt.lockedUntil).toISOString()}`);
    }
  }
  
  emailAttempts.set(emailKey, emailAttempt);
  
  // Track IP attempts (for monitoring)
  const ipAttempt = ipAttempts.get(ip) || { count: 0, lastAttempt: now };
  ipAttempt.count += 1;
  ipAttempt.lastAttempt = now;
  ipAttempts.set(ip, ipAttempt);
  
  if (shouldLog) {
    console.warn(`[SECURITY] Failed login attempt: ${email} from IP ${ip} (attempt ${emailAttempt.count}/${maxAttempts})`);
  }
}

/**
 * Clear failed attempts for an email (on successful login)
 */
export async function clearFailedAttempts(email: string): Promise<void> {
  emailAttempts.delete(email.toLowerCase());
}

/**
 * Get remaining attempts before lockout
 */
export async function getRemainingAttempts(email: string): Promise<number> {
  const maxAttempts = await getMaxLoginAttempts();
  const attempt = emailAttempts.get(email.toLowerCase());
  
  if (!attempt) {
    return maxAttempts;
  }
  
  return Math.max(0, maxAttempts - attempt.count);
}

/**
 * Get lockout status and time remaining
 */
export async function getLockoutStatus(email: string): Promise<{ locked: boolean; timeRemaining: number | null }> {
  const attempt = emailAttempts.get(email.toLowerCase());
  
  if (!attempt || !attempt.lockedUntil) {
    return { locked: false, timeRemaining: null };
  }
  
  const now = Date.now();
  if (attempt.lockedUntil > now) {
    return { locked: true, timeRemaining: attempt.lockedUntil - now };
  }
  
  // Lockout expired
  emailAttempts.delete(email.toLowerCase());
  return { locked: false, timeRemaining: null };
}

