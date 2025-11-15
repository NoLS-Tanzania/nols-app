// apps/web/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("token")?.value || ""; // or read from headers/localStorage via RSC auth
  // Prefer an explicit role cookie in dev; fallback to token decode stub
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

  // If logged in and on /login, bounce to role home
  if (path === "/login" && role) {
    if (role === "ADMIN") url.pathname = "/admin";
    else if (role === "OWNER") url.pathname = "/owner";
    else if (role === "DRIVER") url.pathname = "/driver";
    else url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/owner/:path*", "/driver/:path*"],
};

// stub — replace with real decode
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function decodeRoleFromToken(_token: string) {
  return ""; // "ADMIN" | "OWNER" | ""
}
