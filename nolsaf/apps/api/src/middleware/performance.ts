/**
 * Performance Monitoring Middleware
 * 
 * Tracks request/response times and logs slow requests
 */

import type { Request, Response, NextFunction } from "express";
import {
  getObservabilitySummary,
  recordObservedRequest,
  slowRequestThresholdMs,
  normalizeRoute,
  clearObservedRequests,
  maskIpAddress,
} from "../lib/observability.js";

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
    if (path.startsWith("/api/admin/observability")) return;

    const metric = {
      requestId: String((req as any).requestId || ""),
      method,
      path,
      route: normalizeRoute(path),
      statusCode,
      durationMs: duration,
      ip: maskIpAddress(req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || req.socket.remoteAddress || null),
      userAgent: req.headers["user-agent"]?.toString() || null,
      timestamp: new Date().toISOString(),
    };

    recordObservedRequest(metric);

    if (duration > slowRequestThresholdMs || statusCode >= 500) {
      const level = statusCode >= 500 ? "error" : "warn";
      const payload = {
        level,
        event: statusCode >= 500 ? "request_error" : "slow_request",
        requestId: metric.requestId,
        method,
        path,
        route: metric.route,
        statusCode,
        durationMs: Number(duration.toFixed(2)),
        timestamp: metric.timestamp,
      };
      const line = JSON.stringify(payload);
      if (level === "error") console.error(line);
      else console.warn(line);
    }
  });

  next();
}

/**
 * Get performance metrics
 */
export function getPerformanceMetrics() {
  return getObservabilitySummary();
}

/**
 * Clear performance metrics
 */
export function clearPerformanceMetrics() {
  clearObservedRequests();
}


