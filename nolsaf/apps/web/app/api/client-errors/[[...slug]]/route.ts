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

export async function POST() {
  return new NextResponse(null, { status: 202 });
}

// Some tooling also sends GET health checks against this path.
export async function GET() {
  return new NextResponse(null, { status: 202 });
}
