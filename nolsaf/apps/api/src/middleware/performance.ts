/**
 * Performance Monitoring Middleware
 * 
 * Tracks request/response times and logs slow requests
 */

import type { Request, Response, NextFunction } from "express";

interface PerformanceMetrics {
  method: string;
  path: string;
  duration: number;
  statusCode: number;
  timestamp: number;
}

const slowRequestThreshold = 1000; // 1 second
const metrics: PerformanceMetrics[] = [];
const maxMetrics = 1000; // Keep last 1000 requests

/**
 * Middleware to measure request/response time
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  const method = req.method;
  const path = req.path;
  res.on('finish', () => {
    const duration = performance.now() - start;
    const statusCode = res.statusCode;

    const metric: PerformanceMetrics = {
      method,
      path,
      duration,
      statusCode,
      timestamp: Date.now(),
    };

    metrics.push(metric);
    if (metrics.length > maxMetrics) {
      metrics.shift();
    }

    if (duration > slowRequestThreshold) {
      console.warn(
        `[PERF] Slow request: ${method} ${path} took ${duration.toFixed(2)}ms (status: ${statusCode})`
      );
    }
  });

  next();
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics() {
  const recent = metrics.slice(-100); // Last 100 requests
  const avgDuration = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
  const slowRequests = recent.filter((m) => m.duration > slowRequestThreshold);
  const statusCounts = recent.reduce((acc, m) => {
    acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  return {
    totalRequests: metrics.length,
    recentRequests: recent.length,
    averageDuration: avgDuration,
    slowRequests: slowRequests.length,
    slowRequestThreshold,
    statusCounts,
    recentSlowRequests: slowRequests.slice(-10).map((m) => ({
      method: m.method,
      path: m.path,
      duration: m.duration,
      statusCode: m.statusCode,
      timestamp: new Date(m.timestamp).toISOString(),
    })),
  };
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics() {
  metrics.length = 0;
}


