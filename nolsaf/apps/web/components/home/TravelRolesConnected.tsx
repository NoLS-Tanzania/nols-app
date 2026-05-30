"use client";

// Home section: the four NoLSAF roles, connected.
//
// Large screen layout preserved.
// Small screen overflow fixed.
// Clean NoLSAF green hover using #02665e.
// Left heading area has subtle branded background with white dots.

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, Car, Home, Gavel, ChevronRight } from "lucide-react";

type Role = {
  label: string;
  Icon: typeof Users;
  href: string;
  aria: string;
  desc: string;
};

const ROLES: Role[] = [
  {
    label: "Travellers",
    Icon: Users,
    href: "/public/properties",
    aria: "Travellers, browse verified stays",
    desc: "Verified stays, transport, and tours in one trip.",
  },
  {
    label: "Drivers",
    Icon: Car,
    href: "/account/register?role=driver",
    aria: "Drivers, register to drive",
    desc: "Airport runs and scheduled trips with clear pay.",
  },
  {
    label: "Owners",
    Icon: Home,
    href: "/account/register?role=owner",
    aria: "Property owners, list your stay",
    desc: "List stays, join auctions, manage bookings.",
  },
  {
    label: "Operators",
    Icon: Gavel,
    href: "/careers?role=agent",
    aria: "Tour operators, manage packages",
    desc: "Package tours and prove delivery to travellers.",
  },
];

const DOTS =
  "radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)";

const PANEL_DOTS =
  "radial-gradient(circle, rgba(255,255,255,0.22) 1px, transparent 1px)";

export default function TravelRolesConnected() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="relative mx-auto box-border w-full max-w-[calc(100vw-1rem)] overflow-hidden rounded-[28px] border border-white/10 bg-[#101316] p-4 sm:max-w-5xl sm:p-8 lg:p-10"
      aria-label="NoLSAF roles, connected"
    >
      {/* Main background dots */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: DOTS, backgroundSize: "24px 24px" }}
      />

      {/* Soft glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#02665e]/25 blur-3xl"
      />

      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#02b4f5]/10 blur-3xl"
      />

      <div className="relative grid w-full min-w-0 max-w-full gap-8 overflow-hidden lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
        {/* Heading area with branded background */}
        <div className="w-full min-w-0 max-w-full">
          <div className="relative isolate overflow-hidden rounded-[24px] border border-[#02665e]/20 bg-gradient-to-br from-[#02665e]/18 via-[#02665e]/10 to-transparent px-5 py-8 sm:px-7 sm:py-10">
            {/* White dots only inside left panel */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{
                backgroundImage: PANEL_DOTS,
                backgroundSize: "18px 18px",
              }}
            />

            {/* Soft inner green glow */}
            <div
              aria-hidden
              className="pointer-events-none absolute -left-12 top-0 h-48 w-48 rounded-full bg-[#02665e]/25 blur-3xl"
            />

            <div className="relative z-10">
              <h2 className="max-w-full text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:whitespace-nowrap">
                Every travel role connected.
              </h2>
            </div>
          </div>
        </div>

        {/* Role cards */}
        <div className="grid w-full min-w-0 max-w-full grid-cols-1 gap-3 overflow-hidden md:grid-cols-2">
          {ROLES.map(({ label, Icon, href, aria, desc }) => (
            <Link
              key={label}
              href={href}
              aria-label={aria}
              className="group box-border flex w-full min-w-0 max-w-full touch-manipulation items-center gap-2 overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-br from-white to-[#edf8f4] p-3 no-underline shadow-[0_12px_30px_rgba(0,0,0,0.18)] outline-none transition-[background,border-color,box-shadow] duration-300 ease-out hover:border-[#02665e] hover:from-[#02665e] hover:to-[#02665e] hover:shadow-[0_16px_36px_rgba(2,102,94,0.32)] active:border-[#014d47] active:from-[#014d47] active:to-[#014d47] active:shadow-[0_8px_22px_rgba(2,102,94,0.24)] focus-visible:border-[#02665e] focus-visible:ring-2 focus-visible:ring-[#02665e]/35 min-[380px]:gap-3 min-[380px]:p-3.5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#02665e]/15 bg-[#f7fbf9] text-[#02665e] shadow-[0_8px_16px_rgba(2,102,94,0.10)] transition-[background-color,border-color,color,box-shadow] duration-300 ease-out group-hover:border-white/40 group-hover:bg-white group-hover:text-[#02665e] group-hover:shadow-[0_10px_22px_rgba(0,0,0,0.16)] group-active:bg-white group-active:text-[#014d47]">
                <Icon className="h-4 w-4" aria-hidden />
              </span>

              <span className="block min-w-0 flex-1 overflow-hidden">
                <span className="block truncate text-[11px] font-black uppercase tracking-[0.12em] text-slate-800 transition-colors duration-300 group-hover:text-white group-active:text-white">
                  {label}
                </span>

                <span className="mt-0.5 block max-w-full break-words text-[11px] leading-snug text-slate-500 transition-colors duration-300 group-hover:text-white/85 group-active:text-white/85">
                  {desc}
                </span>
              </span>

              <span className="ml-1 hidden h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 transition-[background-color,color] duration-300 ease-out group-hover:bg-white/15 group-hover:text-white group-active:bg-white/20 group-active:text-white min-[340px]:grid">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </motion.section>
  );
}