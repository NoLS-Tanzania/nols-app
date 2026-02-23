import type { ReactNode } from "react";
import Image from "next/image";

import LayoutFrame from "@/components/LayoutFrame";
import { AboutFooter, AboutHeader } from "./AboutChrome";

import AboutNav from "./AboutNav";

const ABOUT_NAV = [
  { href: "/about/who", label: "Who are we" },
  { href: "/about/what", label: "What we do" },
  { href: "/about/story", label: "Our Best Story" },
] as const;

export default function AboutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AboutHeader />

      <main className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />

        <section className="bg-white text-slate-900">
          <div className="public-container py-6 sm:py-8">
            <div className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 text-white ring-1 ring-white/10 shadow-card">
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -top-28 -left-28 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
                <div className="absolute -bottom-36 right-[-140px] h-[520px] w-[520px] rounded-full bg-brand-300/10 blur-3xl" />
                <svg
                  className="absolute right-6 top-1/2 hidden h-[420px] w-[420px] -translate-y-1/2 text-brand-300/12 sm:block"
                  viewBox="0 0 200 200"
                  fill="none"
                >
                  <defs>
                    <pattern id="halftone" width="10" height="10" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1.2" fill="currentColor" />
                      <circle cx="7" cy="6" r="0.8" fill="currentColor" />
                    </pattern>
                    <radialGradient id="fade" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(125 95) rotate(90) scale(90)">
                      <stop stopColor="currentColor" stopOpacity="1" />
                      <stop offset="1" stopColor="currentColor" stopOpacity="0" />
                    </radialGradient>
                    <mask id="halftoneMask">
                      <rect width="200" height="200" fill="black" />
                      <circle cx="125" cy="95" r="90" fill="url(#fade)" />
                    </mask>
                  </defs>

                  <g mask="url(#halftoneMask)">
                    <circle cx="125" cy="95" r="92" fill="url(#halftone)" opacity="0.9" />
                  </g>

                  <g className="opacity-70 stroke-info/80" strokeWidth="2" strokeLinecap="round">
                    <path d="M30 40 L95 75" />
                    <path d="M22 66 L92 92" />
                    <path d="M26 96 L92 110" />
                    <path d="M38 128 L100 130" />
                  </g>
                </svg>
                <div className="absolute inset-0 mix-blend-overlay opacity-25 bg-gradient-to-tr from-white/0 via-white/10 to-white/0" />
                <div className="absolute inset-0 bg-gradient-to-b from-white/0 via-white/0 to-white/5" />
              </div>

              <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-12">
                <div className="relative inline-block max-w-3xl overflow-hidden rounded-2xl bg-white/[0.06] backdrop-blur-md ring-1 ring-white/15 shadow-card p-6 sm:p-7">
                  <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute -right-10 -top-10 opacity-[0.07]">
                      <Image
                        src="/assets/NoLS2025-04.png"
                        alt=""
                        width={260}
                        height={260}
                        priority
                      />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/0 to-white/5" />
                  </div>

                  <div className="relative z-10">
                    <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight leading-snug">About NoLSAF</h1>
                    <p className="mt-2 text-base sm:text-lg font-medium tracking-tight text-white/75 leading-relaxed">
                      Quality stays for every wallet
                    </p>
                    <div aria-hidden className="mt-6 h-px w-24 bg-gradient-to-r from-white/0 via-white/35 to-white/0" />
                  </div>
                </div>

                <nav
                  aria-label="About navigation"
                  className="mt-6 sm:mt-0 sm:absolute sm:bottom-6 sm:right-8"
                >
                  <AboutNav items={ABOUT_NAV} />
                </nav>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f7f9fb] py-6 sm:py-8">
          <div className="public-container">
            <div className="w-full overflow-x-hidden rounded-lg border border-slate-200 bg-white p-5 sm:p-8">
              <div className="w-full">
                {children}
              </div>
            </div>
          </div>
        </section>
      </main>

      <AboutFooter />
    </>
  );
}
