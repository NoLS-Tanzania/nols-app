"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function RouteChromeShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hidesPublicMobileNav =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/owner") ||
    pathname.startsWith("/driver") ||
    pathname.startsWith("/agent") ||
    pathname === "/account/agent" ||
    pathname.startsWith("/account/agent/");

  return (
    <div className={`min-h-screen bg-neutral-50 ${hidesPublicMobileNav ? "" : "pb-16 md:pb-0"}`}>
      {children}
    </div>
  );
}
