// apps/api/src/routes/admin.analytics.event.ts
import { Router, Response } from "express";
import type { RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { audit } from "../lib/audit.js";
import { sanitizeText } from "../lib/sanitize.js";
import rateLimit from "express-rate-limit";

// ============================================================
// Constants
// ============================================================
const MAX_PAYLOAD_SIZE_BYTES = 50 * 1024; // 50KB max payload size
const MAX_EVENT_NAME_LENGTH = 100;
const MAX_PAYLOAD_DEPTH = 10; // Maximum nesting depth for JSON payload

// Analytics Event Types (whitelist for validation)
const ANALYTICS_EVENT_TYPES = {
  // Dashboard events
  DASHBOARD_VIEW: "dashboard.view",
  DASHBOARD_WIDGET_VIEW: "dashboard.widget.view",
  DASHBOARD_WIDGET_INTERACTION: "dashboard.widget.interaction",
  
  // Invoice events
  INVOICE_VIEW: "invoice.view",
  INVOICE_VALIDATE_CLICK: "invoice.validate_click",
  INVOICE_APPROVE: "invoice.approve",
  INVOICE_REJECT: "invoice.reject",
  
  // Property events
  PROPERTY_VIEW: "property.view",
  PROPERTY_APPROVE: "property.approve",
  PROPERTY_REJECT: "property.reject",
  
  // Booking events
  BOOKING_VIEW: "booking.view",
  BOOKING_UPDATE: "booking.update",
  
  // User events
  USER_VIEW: "user.view",
  USER_UPDATE: "user.update",
  
  // Report events
  REPORT_VIEW: "report.view",
  REPORT_EXPORT: "report.export",
  
  // Settings events
  SETTINGS_VIEW: "settings.view",
  SETTINGS_UPDATE: "settings.update",
  
  // Navigation events
  NAVIGATION: "navigation",
  SEARCH: "search",
  FILTER: "filter",
  
  // Generic events (for extensibility)
  CLICK: "click",
  HOVER: "hover",
  SCROLL: "scroll",
} as const;

type AnalyticsEventType = typeof ANALYTICS_EVENT_TYPES[keyof typeof ANALYTICS_EVENT_TYPES];

// ============================================================
// TypeScript Interfaces
// ============================================================
interface AnalyticsEventRequest {
  event: string;
  payload?: Record<string, any>;
}

interface AnalyticsEventResponse {
  ok: boolean;
  message?: string;
  eventId?: number;
}

// ============================================================
// Rate Limiter
// ============================================================
const limitAnalyticsEvents = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 events per admin per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many analytics events. Please wait before sending another event." },
  keyGenerator: (req) => {
    const adminId = (req as AuthedRequest).user?.id;
    return adminId ? `admin-analytics:${adminId}` : req.ip || req.socket.remoteAddress || "unknown";
  },
});

// ============================================================
// Zod Validation Schemas
// ============================================================
const analyticsEventSchema = z.object({
  event: z.string()
    .min(1, "Event name is required")
    .max(MAX_EVENT_NAME_LENGTH, `Event name must be ${MAX_EVENT_NAME_LENGTH} characters or less`)
    .refine(
      (val) => {
        // Allow whitelisted events or events that match a pattern (e.g., "custom.*")
        const eventValues = Object.values(ANALYTICS_EVENT_TYPES);
        return eventValues.includes(val as AnalyticsEventType) || val.startsWith("custom.");
      },
      { message: "Event type not allowed. Use a whitelisted event or a custom.* event." }
    ),
  payload: z.record(z.any()).optional().default({}),
}).strict();

// ============================================================
// Helper Functions
// ============================================================
function sendError(res: Response, status: number, message: string, details?: any): void {
  res.status(status).json({
    error: message,
    ...(details && { details }),
  });
}

function sendSuccess(res: Response, data?: AnalyticsEventResponse, message?: string): void {
  res.json({
    ok: true,
    ...(message && { message }),
    ...(data && { ...data }),
  });
}

function getAdminId(req: AuthedRequest): number {
  return req.user!.id;
}

function getClientIp(req: AuthedRequest): string {
  return req.headers["x-forwarded-for"]?.toString()?.split(",")[0]?.trim() || 
         req.socket.remoteAddress || 
         "";
}

function getUserAgent(req: AuthedRequest): string {
  return req.headers["user-agent"] || "";
}

/**
 * Validate payload size and depth
 */
function validatePayload(payload: any): { valid: boolean; error?: string } {
  try {
    const payloadString = JSON.stringify(payload);
    
    // Check size
    const sizeBytes = Buffer.byteLength(payloadString, "utf8");
    if (sizeBytes > MAX_PAYLOAD_SIZE_BYTES) {
      return {
        valid: false,
        error: `Payload size (${sizeBytes} bytes) exceeds maximum allowed size (${MAX_PAYLOAD_SIZE_BYTES} bytes)`,
      };
    }
    
    // Check depth
    const depth = getObjectDepth(payload);
    if (depth > MAX_PAYLOAD_DEPTH) {
      return {
        valid: false,
        error: `Payload depth (${depth} levels) exceeds maximum allowed depth (${MAX_PAYLOAD_DEPTH} levels)`,
      };
    }
    
    return { valid: true };
  } catch (err: any) {
    return {
      valid: false,
      error: `Invalid payload: ${err.message}`,
    };
  }
}

/**
 * Calculate the maximum depth of a nested object
 */
function getObjectDepth(obj: any, currentDepth = 0): number {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return currentDepth;
  }
  
  let maxDepth = currentDepth;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const depth = getObjectDepth(obj[key], currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  }
  
  return maxDepth;
}

/**
 * Sanitize payload recursively (remove potential XSS, limit string lengths)
 */
function sanitizePayload(payload: any, maxStringLength = 1000): any {
  if (payload === null || payload === undefined) {
    return payload;
  }
  
  if (typeof payload === "string") {
    // Sanitize and truncate strings
    const sanitized = sanitizeText(payload);
    return sanitized.length > maxStringLength ? sanitized.substring(0, maxStringLength) : sanitized;
  }
  
  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item, maxStringLength));
  }
  
  if (typeof payload === "object") {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload)) {
      // Sanitize keys (limit length)
      const sanitizedKey = sanitizeText(String(key)).substring(0, 100);
      sanitized[sanitizedKey] = sanitizePayload(value, maxStringLength);
    }
    return sanitized;
  }
  
  // For numbers, booleans, etc., return as-is
  return payload;
}

// Validation middleware helper
function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: Response, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return sendError(res, 400, "Invalid request", { errors: result.error.errors });
    }
    req.validatedData = result.data;
    next();
  };
}

// ============================================================
// Router Setup
// ============================================================
export const router = Router();
router.use(requireAuth as unknown as RequestHandler);
router.use(requireRole("ADMIN") as unknown as RequestHandler);
router.use(limitAnalyticsEvents);

// ============================================================
// POST /api/admin/analytics/event
// ============================================================
router.post("/event", validate(analyticsEventSchema), async (req: any, res) => {
  try {
    const { event, payload = {} } = req.validatedData;
    const adminId = getAdminId(req as AuthedRequest);
    const clientIp = getClientIp(req as AuthedRequest);
    const userAgent = getUserAgent(req as AuthedRequest);

    // Validate payload size and depth
    const payloadValidation = validatePayload(payload);
    if (!payloadValidation.valid) {
      return sendError(res, 400, payloadValidation.error || "Invalid payload");
    }

    // Sanitize payload
    const sanitizedPayload = sanitizePayload(payload);

    // Sanitize event name
    const sanitizedEvent = sanitizeText(event).substring(0, MAX_EVENT_NAME_LENGTH);

    // Store event in AuditLog (using ANALYTICS_EVENT action)
    let eventId: number | undefined;
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorRole: "ADMIN",
          action: `ANALYTICS_EVENT:${sanitizedEvent}`,
          entity: "ANALYTICS",
          entityId: null,
          beforeJson: undefined,
          afterJson: sanitizedPayload,
          ip: clientIp || null,
          ua: userAgent || null,
        },
      });
      eventId = Number(auditLog.id);
    } catch (dbError: any) {
      console.error("[ANALYTICS_EVENT] Database error:", dbError);
      // Don't fail the request if DB write fails - analytics should be non-blocking
      // But log the error for monitoring
    }

    // Also log to console in development for debugging
    if (process.env.NODE_ENV !== "production") {
      console.info("[admin-analytics]", {
        event: sanitizedEvent,
        payload: sanitizedPayload,
        at: new Date().toISOString(),
        user: adminId,
        ip: clientIp,
        eventId,
      });
    }

    // Audit log for tracking (separate from analytics event storage)
    await audit(req as AuthedRequest, "ANALYTICS_EVENT_SENT", `analytics:${sanitizedEvent}`, null, {
      event: sanitizedEvent,
      payloadSize: JSON.stringify(sanitizedPayload).length,
      eventId,
    });

    sendSuccess(res, { ok: true, eventId }, "Analytics event recorded successfully");
  } catch (err: any) {
    console.error("[ANALYTICS_EVENT] Error:", err);
    sendError(res, 500, "Failed to record analytics event", {
      message: err.message || "Unknown error",
    });
  }
});

export default router;
