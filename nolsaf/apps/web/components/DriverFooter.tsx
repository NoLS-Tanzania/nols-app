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

export default function DriverFooter() {
  const pathname = usePathname();

  // Set navigation context for policy pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = getCookie('role');
      if (role) {
        sessionStorage.setItem('navigationContext', role.toLowerCase());
      } else {
        // Fallback to pathname
        if (pathname?.includes('/driver')) {
          sessionStorage.setItem('navigationContext', 'driver');
        }
      }
    }
  }, [pathname]);
  
  return (
    <AdminFooter
      policyBasePath=""
      showDriverDisbursementPolicy={true}
      showPropertyOwnerDisbursementPolicy={false}
      containerClassName="public-container pt-10 pb-9"
    />
  );
}
