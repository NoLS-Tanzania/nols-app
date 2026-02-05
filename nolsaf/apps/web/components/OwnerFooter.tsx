"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import AdminFooter from "@/components/AdminFooter";

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default function OwnerFooter() {
  const pathname = usePathname();

  // Set navigation context for policy pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = getCookie('role');
      if (role) {
        sessionStorage.setItem('navigationContext', role.toLowerCase());
      } else {
        // Fallback to pathname
        if (pathname?.includes('/owner')) {
          sessionStorage.setItem('navigationContext', 'owner');
        }
      }
    }
  }, [pathname]);

  return (
    <AdminFooter
      policyBasePath="/owner"
      showDriverDisbursementPolicy={false}
      showPropertyOwnerDisbursementPolicy={true}
    />
  );
}

