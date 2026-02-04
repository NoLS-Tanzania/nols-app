"use client";

import React from 'react';
import Link from 'next/link';
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useState } from "react";

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export default function OwnerFooter() {
  const year = new Date().getFullYear();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);
  
  const handleLegalClick = (type: 'terms' | 'privacy' | 'cookies') => {
    window.dispatchEvent(new CustomEvent('open-legal', { detail: { type } }));
  };

  return (
    <footer aria-label="Footer" className="relative">
      <h2 className="sr-only">Footer</h2>

      <div className="bg-gradient-to-b from-white via-white to-slate-50 border-t border-slate-200">
        {/* Subtle premium divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-brand/40 to-transparent" aria-hidden="true" />
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div
            className={[
              "mx-auto max-w-5xl rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm",
              "shadow-[0_1px_0_rgba(15,23,42,0.06)]",
              "transition-all duration-700 ease-out",
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            ].join(" ")}
          >
            <div className="px-6 py-8 sm:px-8">
              <div className="grid grid-cols-1 gap-8">
                <nav aria-label="Footer navigation" className="text-center">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Legal</div>
                  <ul className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-4 text-sm list-none p-0 place-items-center">
                <li>
                  <button
                    onClick={() => handleLegalClick('terms')}
                    className="group inline-flex items-center text-slate-700 hover:text-slate-900 no-underline hover:no-underline transition-colors duration-300 bg-transparent border-none p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
                  >
                    <span className="relative">
                      Terms of Service
                      <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-brand to-sky-500 transition-all duration-300 group-hover:w-full" />
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => handleLegalClick('privacy')}
                    className="group inline-flex items-center text-slate-700 hover:text-slate-900 no-underline hover:no-underline transition-colors duration-300 bg-transparent border-none p-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
                  >
                    <span className="relative">
                      Privacy Policy
                      <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-brand to-sky-500 transition-all duration-300 group-hover:w-full" />
                    </span>
                  </button>
                </li>
                <li>
                  <Link
                    href="/cookies-policy"
                    className="group inline-flex items-center text-slate-700 hover:text-slate-900 no-underline hover:no-underline transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
                  >
                    <span className="relative">
                      Cookies Policy
                      <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-brand to-sky-500 transition-all duration-300 group-hover:w-full" />
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/verification-policy"
                    className="group inline-flex items-center text-slate-700 hover:text-slate-900 no-underline hover:no-underline transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
                  >
                    <span className="relative">
                      Verification Policy
                      <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-brand to-sky-500 transition-all duration-300 group-hover:w-full" />
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/cancellation-policy"
                    className="group inline-flex items-center text-slate-700 hover:text-slate-900 no-underline hover:no-underline transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
                  >
                    <span className="relative">
                      Cancellation Policy
                      <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-brand to-sky-500 transition-all duration-300 group-hover:w-full" />
                    </span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/property-owner-disbursement-policy"
                    className="group inline-flex items-center text-slate-700 hover:text-slate-900 no-underline hover:no-underline transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded"
                  >
                    <span className="relative">
                      Owner Disbursement
                      <span className="pointer-events-none absolute -bottom-1 left-0 h-px w-0 bg-gradient-to-r from-brand to-sky-500 transition-all duration-300 group-hover:w-full" />
                    </span>
                  </Link>
                </li>
              </ul>
            </nav>

                <div className="text-center">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resources</div>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-sm">
                <Link
                  href="/docs"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  Docs
                </Link>
                <Link
                  href="/version"
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  v0.1.0
                </Link>
              </div>
            </div>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-200 text-center">
                <div className="text-sm text-slate-600">© {year} — All rights reserved</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

