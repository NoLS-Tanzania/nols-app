// apps/web/proxy.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  // Check for both cookie names for compatibility
  const token = req.cookies.get("token")?.value || req.cookies.get("nolsaf_token")?.value || "";
  // Prefer an explicit role cookie; fallback to token decode stub
  const cookieRole = req.cookies.get("role")?.value || "";
  const role = cookieRole || decodeRoleFromToken(token); // dev: we primarily rely on cookie

  const url = req.nextUrl.clone();
  const path = url.pathname;

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
  matcher: ["/admin/:path*", "/owner/:path*", "/driver/:path*", "/account/:path*", "/login"],
};

// stub — replace with real decode
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function decodeRoleFromToken(_token: string) {
  return ""; // "ADMIN" | "OWNER" | ""
}
