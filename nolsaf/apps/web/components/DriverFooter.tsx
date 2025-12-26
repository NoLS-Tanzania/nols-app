"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default function DriverFooter() {
  const year = new Date().getFullYear();
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
    <footer className="w-full mt-12 page-bottom-buffer bg-slate-50">
      <h2 className="sr-only">Footer</h2>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col items-center gap-4">
        {/* About NoLSAF Section */}
        <div className="w-full">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-lg font-semibold text-gray-800">About NoLSAF</h3>
            <p className="mt-2 text-sm text-gray-600">Who we are and what we do and why You have to choose us.</p>
          </div>
        </div>

        {/* Policy Links */}
        <nav aria-label="Footer navigation" className="w-full flex justify-center">
          <ul className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <li>
              <a 
                role="button" 
                onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: { type: 'terms' } }))} 
                className="text-[#02665e] font-semibold no-underline hover:no-underline"
              >
                Terms of Service
              </a>
            </li>
            <li>
              <a 
                role="button" 
                onClick={() => window.dispatchEvent(new CustomEvent('open-legal', { detail: { type: 'privacy' } }))} 
                className="text-[#02665e] font-semibold no-underline hover:no-underline"
              >
                Privacy Policy
              </a>
            </li>
            <li>
              <Link href="/cookies-policy" className="text-[#02665e] font-semibold no-underline hover:no-underline">
                Cookies Policy
              </Link>
            </li>
            <li>
              <Link href="/verification-policy" className="text-[#02665e] font-semibold no-underline hover:no-underline">
                Verification Policy
              </Link>
            </li>
            <li>
              <Link href="/cancellation-policy" className="text-[#02665e] font-semibold no-underline hover:no-underline">
                Cancellation Policy
              </Link>
            </li>
            <li>
              <Link href="/driver-disbursement-policy" className="text-[#02665e] font-semibold no-underline hover:no-underline">
                Driver Disbursement Policy
              </Link>
            </li>
          </ul>
        </nav>

        {/* Docs and Version Links */}
        <nav aria-label="Additional links" className="w-full flex justify-center">
          <ul className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <li>
              <Link href="/docs" className="text-[#02665e] font-semibold no-underline hover:no-underline">
                Docs
              </Link>
            </li>
            <li>
              <Link href="/version" className="text-[#02665e] font-semibold no-underline hover:no-underline">
                v0.1.0
              </Link>
            </li>
          </ul>
        </nav>

        {/* Logo and Copyright */}
        <div className="w-full flex flex-col items-center gap-1 mt-1">
          <Image src="/assets/NoLS2025-04.png" alt="NoLSAF" width={120} height={30} className="object-contain" />
          <div className="text-sm text-[#02665e] font-semibold">© {year} NoLSAF — All rights reserved</div>
        </div>
      </div>
    </footer>
  );
}
