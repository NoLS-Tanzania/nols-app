import { NextResponse } from 'next/server';

/**
 * Returns the Mapbox token at request time (server-side).
 * NEXT_PUBLIC_* vars are baked at build time and may be empty in an older
 * deploy.  This endpoint reads the env at runtime so adding a token on the
 * hosting dashboard takes effect immediately without a new build.
 *
 * NOTE: This deliberately lives outside /api/ because next.config.ts has a
 * beforeFiles rewrite that proxies ALL /api/:path* to the Express backend
 * before Next.js can serve local route handlers.
 */
export async function GET() {
  const token =
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    "";
  return NextResponse.json({ token });
}
