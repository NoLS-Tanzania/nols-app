import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export function GET(request: Request) {
  return NextResponse.redirect(new URL('/apple-icon.png', request.url));
}
