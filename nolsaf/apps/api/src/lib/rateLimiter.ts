import rateLimit from "express-rate-limit";
import { getApiRateLimitPerMinute } from "./securitySettings.js";

// In-memory cache for rate limiters (to avoid recreating them on every request)
const rateLimiterCache = new Map<number, ReturnType<typeof rateLimit>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache
let lastCacheUpdate = 0;
let cachedRateLimit = 100;

/**
 * Get the current API rate limit from SystemSetting
 * Uses caching to avoid DB queries on every request
 */
async function getCurrentRateLimit(): Promise<number> {
  const now = Date.now();
  // Refresh cache every 5 minutes
  if (now - lastCacheUpdate > CACHE_TTL_MS) {
    try {
      cachedRateLimit = await getApiRateLimitPerMinute();
      lastCacheUpdate = now;
    } catch (err) {
      console.error('Failed to fetch rate limit from settings:', err);
      // Use cached value on error
    }
  }
  return cachedRateLimit;
}

/**
 * Get or create a rate limiter with the specified limit
 */
function getRateLimiter(limit: number): ReturnType<typeof rateLimit> {
  if (!rateLimiterCache.has(limit)) {
    // Clear old limiters if cache is getting too large
    if (rateLimiterCache.size > 10) {
      rateLimiterCache.clear();
    }
    
    const limiter = rateLimit({
      windowMs: 60 * 1000, // 1 minute
      limit,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "Too many requests, please try again later." },
    });
    
    rateLimiterCache.set(limit, limiter);
  }
  
  return rateLimiterCache.get(limit)!;
}

/**
 * Dynamic rate limiter middleware that reads from SystemSetting
 * Note: This is async but express-rate-limit doesn't support async middleware directly,
 * so we use a wrapper that initializes the limiter on first request
 */
let initializedLimiter: ReturnType<typeof rateLimit> | null = null;

// Initialize limiter on module load (non-blocking)
getCurrentRateLimit().then(limit => {
  initializedLimiter = getRateLimiter(limit);
}).catch(err => {
  console.error('Failed to initialize rate limiter:', err);
  initializedLimiter = getRateLimiter(100); // Fallback
});

export function dynamicRateLimiter(req: any, res: any, next: any) {
  // Use initialized limiter if available, otherwise get one with current limit
  if (initializedLimiter) {
    // Refresh limit in background (non-blocking)
    getCurrentRateLimit().then(limit => {
      initializedLimiter = getRateLimiter(limit);
    }).catch(() => {
      // Ignore errors, keep using current limiter
    });
    return initializedLimiter(req, res, next);
  }
  
  // Fallback: create a limiter with default limit
  const defaultLimiter = getRateLimiter(100);
  return defaultLimiter(req, res, next);
}

