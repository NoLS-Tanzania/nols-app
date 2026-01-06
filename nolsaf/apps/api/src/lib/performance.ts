/**
 * Performance Monitoring & Optimization Utilities
 * 
 * Provides query timing, caching helpers, and performance metrics
 * for identifying and optimizing slow database queries and API endpoints.
 */

import { prisma } from "@nolsaf/prisma";
import { getRedis } from "./redis.js";

// Performance metrics storage
const queryMetrics = new Map<string, { count: number; totalTime: number; avgTime: number; maxTime: number }>();

/**
 * Measure execution time of an async function
 */
export async function measureTime<T>(
  label: string,
  fn: () => Promise<T>,
  logToDebug: boolean = true
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  
  try {
    const result = await fn();
    const duration = performance.now() - start;
    
    // Track metrics
    const existing = queryMetrics.get(label) || { count: 0, totalTime: 0, avgTime: 0, maxTime: 0 };
    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    existing.maxTime = Math.max(existing.maxTime, duration);
    queryMetrics.set(label, existing);
    
    // Log slow queries (>1 second)
    if (duration > 1000 && logToDebug) {
      console.warn(`[PERF] Slow query detected: ${label} took ${duration.toFixed(2)}ms`);
    }
    
    return { result, duration };
  } catch (error) {
    const duration = performance.now() - start;
    throw error;
  }
}

/**
 * Get performance metrics for all tracked queries
 */
export function getPerformanceMetrics() {
  return Array.from(queryMetrics.entries()).map(([label, metrics]) => ({
    label,
    ...metrics,
  })).sort((a, b) => b.avgTime - a.avgTime);
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics() {
  queryMetrics.clear();
}

/**
 * Enhanced caching wrapper with TTL and invalidation support
 */
export async function withCache<T>(
  key: string,
  producer: () => Promise<T>,
  options: {
    ttl?: number; // Time to live in seconds (default: 300 = 5 minutes)
    tags?: string[]; // Cache tags for invalidation
    skipCache?: boolean; // Skip cache (force refresh)
  } = {}
): Promise<T> {
  const { ttl = 300, tags = [], skipCache = false } = options;
  
  if (skipCache) {
    return producer();
  }
  
  try {
    const redis = getRedis();
    
    // Try to get from cache
    const cached = await redis.get(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        return parsed as T;
      } catch {
        // Invalid cache, continue to producer
      }
    }
    
    // Cache miss - execute producer
    
    const value = await producer();
    
    // Store in cache
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
      
      // Store tags for invalidation
      if (tags.length > 0) {
        const tagKey = `cache:tags:${key}`;
        await redis.setex(tagKey, ttl, JSON.stringify(tags));
      }
    } catch (error) {
      // Cache write failed, but return value anyway
      console.warn(`[CACHE] Failed to write cache for key: ${key}`, error);
    }
    
    return value;
  } catch (error) {
    // Redis unavailable - fallback to producer
    console.warn(`[CACHE] Redis unavailable, falling back to producer for key: ${key}`);
    return producer();
  }
}

/**
 * Invalidate cache by key pattern
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const redis = getRedis();
    const stream = redis.scanStream({ match: pattern, count: 100 });
    const keys: string[] = [];
    
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (k: string[]) => keys.push(...k));
      stream.on("end", () => resolve());
      stream.on("error", reject);
    });
    
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.warn(`[CACHE] Failed to invalidate cache pattern: ${pattern}`, error);
  }
}

/**
 * Invalidate cache by tags
 */
export async function invalidateByTags(tags: string[]): Promise<void> {
  try {
    const redis = getRedis();
    
    for (const tag of tags) {
      const pattern = `cache:tags:*`;
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const keys: string[] = [];
      
      await new Promise<void>((resolve, reject) => {
        stream.on("data", (k: string[]) => keys.push(...k));
        stream.on("end", () => resolve());
        stream.on("error", reject);
      });
      
      for (const tagKey of keys) {
        const cachedTags = await redis.get(tagKey);
        if (cachedTags) {
          try {
            const parsedTags = JSON.parse(cachedTags);
            if (parsedTags.includes(tag)) {
              // Extract the actual cache key from tag key
              const actualKey = tagKey.replace('cache:tags:', '');
              await redis.del(actualKey, tagKey);
            }
          } catch {
            // Invalid tag data, skip
          }
        }
      }
    }
  } catch (error) {
    console.warn(`[CACHE] Failed to invalidate by tags: ${tags.join(',')}`, error);
  }
}

/**
 * Prisma query wrapper with automatic performance monitoring
 */
export function prismaWithMetrics<T>(
  label: string,
  query: () => Promise<T>
): Promise<T> {
  return measureTime(`db:${label}`, query, true).then(({ result }) => result);
}

/**
 * Common cache key generators
 */
export const cacheKeys = {
  property: (id: number) => `property:${id}`,
  propertyList: (params: Record<string, any>) => `properties:list:${JSON.stringify(params)}`,
  user: (id: number) => `user:${id}`,
  booking: (id: number) => `booking:${id}`,
  invoice: (id: number) => `invoice:${id}`,
  adminSummary: () => `admin:summary`,
  propertyCount: (status: string) => `property:count:${status}`,
  bookingCount: (status: string) => `booking:count:${status}`,
};

/**
 * Cache tags for invalidation
 */
export const cacheTags = {
  property: (id: number) => `property:${id}`,
  propertyList: 'property:list',
  user: (id: number) => `user:${id}`,
  booking: (id: number) => `booking:${id}`,
  adminSummary: 'admin:summary',
};

