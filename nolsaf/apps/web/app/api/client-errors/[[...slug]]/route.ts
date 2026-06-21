/**
 * Next.js 15/16 built-in client-error reporting endpoint.
 *
 * The Next.js runtime sends client-side errors (and a health check) to
 * /api/client-errors and /api/client-errors/health. This handler accepts
 * those requests and returns 202 immediately so they are never proxied to
 * the Express API (which has no handler for them and would take ~3-4 seconds
 * to fall through the middleware chain before returning 404).
 */
import { NextResponse } from "next/server";

const MONITORING_PROTOCOL = "nolsaf-client-error-v1";

export async function POST(request: Request) {
  let payload: Record<string, unknown> | null = null;
  try {
    payload = await request.json();
  } catch {
    // Next.js may send its own opaque reports; acknowledge them without proxying.
  }

  if (payload?.monitoringProtocol === MONITORING_PROTOCOL) {
    const apiOrigin = (
      process.env.API_ORIGIN
      || process.env.NEXT_PUBLIC_API_URL
      || (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000")
    ).replace(/\/$/, "");
    if (apiOrigin) {
      const suffix = new URL(request.url).pathname.endsWith("/health") ? "/health" : "";
      const release = process.env.VERCEL_GIT_COMMIT_SHA
        || process.env.RAILWAY_GIT_COMMIT_SHA
        || process.env.GIT_COMMIT_SHA
        || process.env.APP_VERSION
        || payload.release;
      try {
        await fetch(`${apiOrigin}/api/client-errors${suffix}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie")! } : {}),
            ...(request.headers.get("user-agent") ? { "user-agent": request.headers.get("user-agent")! } : {}),
            ...(request.headers.get("x-forwarded-for") ? { "x-forwarded-for": request.headers.get("x-forwarded-for")! } : {}),
            ...(request.headers.get("x-request-id") ? { "x-request-id": request.headers.get("x-request-id")! } : {}),
          },
          body: JSON.stringify({ ...payload, release }),
          cache: "no-store",
        });
      } catch {
        // Monitoring must never break the page that is reporting an error.
      }
    }
  }

  return new NextResponse(null, { status: 202 });
}

// Some tooling also sends GET health checks against this path.
export async function GET() {
  return new NextResponse(null, { status: 202 });
}
