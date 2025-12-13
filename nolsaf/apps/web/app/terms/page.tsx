"use client";

import Terms from "@/components/Terms";
import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/components/termsContent";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LayoutFrame from "@/components/LayoutFrame";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default function TermsPage() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<"ADMIN" | "OWNER" | "DRIVER" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated and get their role
    const role = getCookie('role') as "ADMIN" | "OWNER" | "DRIVER" | null;
    
    // Also check pathname as fallback
    if (!role) {
      if (pathname?.includes('/driver')) {
        setUserRole('DRIVER');
      } else if (pathname?.includes('/owner')) {
        setUserRole('OWNER');
      } else if (pathname?.includes('/admin')) {
        setUserRole('ADMIN');
      } else {
        setUserRole(null);
      }
    } else {
      setUserRole(role);
    }
    
    setIsLoading(false);
  }, [pathname]);

  // Determine which header and footer to use
  const isAuthenticated = userRole !== null;
  const isDriver = userRole === "DRIVER";
  const isOwner = userRole === "OWNER";
  const isAdmin = userRole === "ADMIN";

  // Show loading state briefly to avoid flash
  if (isLoading) {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen bg-white text-slate-900">
          <div className="public-container py-10">
            <div className="text-center">Loading...</div>
          </div>
        </main>
        <PublicFooter withRail={false} />
      </>
    );
  }

  return (
    <>
      {isAuthenticated ? (
        <SiteHeader 
          role={isDriver ? "DRIVER" : isOwner ? "OWNER" : "ADMIN"} 
          driverMode={isDriver}
        />
      ) : (
        <PublicHeader />
      )}
      
      <main className="min-h-screen bg-white text-slate-900">
        {/* Layout edge markers (left/right) to indicate content boundaries */}
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" labelLeft="content edge" />
        
        <section className="relative bg-[#f7f9fb] py-4 sm:py-6 md:py-10 overflow-x-hidden">
          <div className="public-container">
            <div className="w-full bg-white rounded-lg shadow-sm border border-gray-100 p-4 sm:p-6 md:p-10 lg:p-12 box-border overflow-x-hidden">
              <Terms headline="Terms and Conditions" lastUpdated={TERMS_LAST_UPDATED} sections={TERMS_SECTIONS} />
            </div>
          </div>
        </section>
      </main>
      
      {isAuthenticated ? (
        <SiteFooter withRail={false} topSeparator={true} />
      ) : (
        <PublicFooter withRail={false} />
      )}
    </>
  );
}
