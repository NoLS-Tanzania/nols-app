// apps/web/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Shared secret stamped on every server-side proxy request to the API.
// Express CSRF middleware trusts requests carrying this header, because they
// can only come from this Next.js server process — never from a browser.
// Set INTERNAL_PROXY_SECRET to the same value in both web and api env vars.
const INTERNAL_PROXY_SECRET = process.env.INTERNAL_PROXY_SECRET || "";

export function middleware(req: NextRequest) {
  // Stamp all /api/* proxy requests so Express can skip the browser-origin CSRF
  // check.  The Next.js rewrite runs AFTER middleware, so the header added here
  // is forwarded by the rewrite to the Express backend.
  const isApiProxy =
    req.nextUrl.pathname.startsWith("/api/") ||
    req.nextUrl.pathname.startsWith("/uploads/") ||
    req.nextUrl.pathname.startsWith("/webhooks/");

  if (isApiProxy && INTERNAL_PROXY_SECRET) {
    const headers = new Headers(req.headers);
    headers.set("x-proxy-secret", INTERNAL_PROXY_SECRET);
    const response = NextResponse.next({ request: { headers } });
    return response;
  }
  const url = req.nextUrl.clone();
  const path = url.pathname;

  // ─── MAINTENANCE MODE ───────────────────────────────────────────────────────
  // Edge runtime reads process.env at request time (not build time in Next.js 15+).
  // Set MAINTENANCE_MODE=true in your .env.local or AWS EB environment variables.
  const maintenance = process.env.MAINTENANCE_MODE === "true";
  if (maintenance && path !== "/maintenance") {
    url.pathname = "/maintenance";
    return NextResponse.redirect(url);
  }
  // ────────────────────────────────────────────────────────────────────────────

  // Check for both cookie names for compatibility
  const token = req.cookies.get("token")?.value || req.cookies.get("nolsaf_token")?.value || "";
  // Prefer an explicit role cookie; fallback to token decode stub
  const cookieRole = req.cookies.get("role")?.value || "";
  const role = cookieRole || decodeRoleFromToken(token); // dev: we primarily rely on cookie

  if (path.startsWith("/admin")) {
    if (role !== "ADMIN") {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  if (path.startsWith("/owner")) {
    if (role !== "OWNER" && role !== "ADMIN") {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  if (path.startsWith("/driver")) {
    if (role !== "DRIVER" && role !== "ADMIN") {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Customer account pages should require auth (like Group Stays).
  // Allow auth routes under /account/* to remain public.
  if (path.startsWith("/account")) {
    const isAccountAuthRoute =
      path === "/account/login" ||
      path === "/account/register" ||
      path === "/account/forgot-password" ||
      path === "/account/reset-password";

    // Allow the Agent Portal pages — but require AGENT (or ADMIN) role.
    // Other authenticated roles hitting /account/agent get redirected to their
    // own portal instead of seeing a broken state.
    const isAgentPortalRoute = path === "/account/agent" || path.startsWith("/account/agent/");

    if (!isAccountAuthRoute) {
      if (!token) {
        url.pathname = "/account/login";
        return NextResponse.redirect(url);
      }
      // Role-guard the agent portal — non-agents are bounced to their home
      if (isAgentPortalRoute && role && role !== "AGENT" && role !== "ADMIN") {
        if (role === "OWNER") url.pathname = "/owner";
        else if (role === "DRIVER") url.pathname = "/driver";
        else url.pathname = "/account";
        return NextResponse.redirect(url);
      }
    }
  }

  // If logged in and on /login, bounce to role home
  if (path === "/login" && role) {
    if (role === "ADMIN") url.pathname = "/admin/home";
    else if (role === "OWNER") url.pathname = "/owner";
    else if (role === "DRIVER") url.pathname = "/driver";
    else if (role === "AGENT") url.pathname = "/account/agent";
    else url.pathname = "/account";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // When in maintenance mode, intercept everything except Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon).*)",
  ],
};

// stub — replace with real decode
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function decodeRoleFromToken(_token: string) {
  return ""; // "ADMIN" | "OWNER" | ""
}
