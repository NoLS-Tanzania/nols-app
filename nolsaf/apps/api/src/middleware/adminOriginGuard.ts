import type { NextFunction, Request, Response } from "express";

/**
 * Admin CSRF mitigation (production):
 * Block state-changing requests to admin endpoints unless they come from an allowed Origin/Referer,
 * or the browser indicates a same-site request via Sec-Fetch-Site.
 *
 * NOTE: This is not a full CSRF token implementation, but it materially reduces risk for cookie-auth endpoints
 * without requiring frontend changes.
 */
export function adminOriginGuard(req: Request, res: Response, next: NextFunction) {
  const isProd = process.env.NODE_ENV === "production";
  const method = String(req.method || "GET").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();

  const path = String((req as any).originalUrl || req.url || "");
  const isAdminPath = path.startsWith("/api/admin/") || path.startsWith("/admin/");
  if (!isAdminPath) return next();

  const originHeader = String(req.get("origin") || "");
  const refererHeader = String(req.get("referer") || "");
  const secFetchSite = String(req.get("sec-fetch-site") || "").toLowerCase();

  const allowedOrigins = Array.from(
    new Set(
      [
        process.env.WEB_ORIGIN,
        process.env.APP_ORIGIN,
        ...(process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()),
      ].filter(Boolean) as string[]
    )
  );

  const parseOrigin = (v: string): string | null => {
    if (!v) return null;
    try {
      // If header is already an origin like "https://example.com"
      if (!v.includes("/") && v.includes(".")) return null;
      const u = new URL(v);
      return u.origin;
    } catch {
      return null;
    }
  };

  const derivedOrigin = parseOrigin(originHeader) || parseOrigin(refererHeader);

  const isSameSiteByFetchMeta = secFetchSite === "same-origin" || secFetchSite === "same-site";
  const isAllowedByHeaders =
    isSameSiteByFetchMeta ||
    (!!derivedOrigin && (allowedOrigins.includes(derivedOrigin) || derivedOrigin === `https://${req.get("host")}` || derivedOrigin === `http://${req.get("host")}`));
  // In non-production we don't block, but we still log for verification.
  const isAllowed = isProd ? isAllowedByHeaders : true;

  // Always stamp a header (useful for runtime verification from the browser).
  // Keep it small (no secrets).
  res.setHeader(
    "X-NoLSAF-Origin-Guard",
    JSON.stringify({
      env: process.env.NODE_ENV || "",
      prod: isProd,
      fetchSite: secFetchSite || "",
      derivedOrigin: derivedOrigin || "",
      allowedByHeaders: isAllowedByHeaders,
    }).slice(0, 300)
  );

  if (isProd && !isAllowed) {
    return res.status(403).json({
      error: "Forbidden",
      message: "Blocked by origin policy (CSRF protection).",
    });
  }

  return next();
}


