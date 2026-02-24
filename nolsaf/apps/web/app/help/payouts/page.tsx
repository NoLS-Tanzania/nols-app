import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  LifeBuoy,
  MapPin,
  Megaphone,
  UserCheck,
  Wallet,
} from "lucide-react";

import LayoutFrame from "@/components/LayoutFrame";
import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

const ROLES = [
  {
    id: "agent",
    icon: UserCheck,
    badge: "For Agents",
    color: "#02b4f5",
    headline: "Represent NoLSAF. Earn on every booking you close.",
    description: "Become a named NoLSAF Agent in your area — refer guests, assist with bookings, and earn commission on every confirmed stay.",
    href: "/help/become-agent",
    cta: "Learn about becoming an Agent",
    gradient: "from-[#010f0e] via-[#011520] to-[#021f2c]",
    glow: "#02b4f5",
  },
  {
    id: "event-manager",
    icon: Megaphone,
    badge: "Event Manager",
    color: "#a78bfa",
    headline: "Plan events. Manage stays. Earn from both.",
    description: "Co-ordinate group bookings, corporate retreats, and multi-property events and earn a management fee on every event you deliver.",
    href: "/help/event-manager",
    cta: "Learn about Event Manager",
    gradient: "from-[#0f0a1e] via-[#150f2a] to-[#0a0718]",
    glow: "#a78bfa",
  },
  {
    id: "nolsaf-stand",
    icon: MapPin,
    badge: "NoLSAF Stand",
    color: "#4dd9ac",
    headline: "Become the face of NoLSAF for tourists.",
    description: "Operate a branded stand at airports, tourist zones, or transport hubs and earn for every traveller you help book accommodation.",
    href: "/help/nolsaf-stand",
    cta: "Learn about NoLSAF Stand",
    gradient: "from-[#010f0e] via-[#011a17] to-[#01221c]",
    glow: "#4dd9ac",
  },
];

export default function HelpPayoutsPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          {/* Hero */}
          <div className="mt-4 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#010f0e] via-[#011a18] to-[#021f1c] text-white p-8 sm:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
            <div className="pointer-events-none absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20"
              style={{ background: "radial-gradient(circle, #02b4f5 0%, transparent 70%)" }} />
            <div className="pointer-events-none absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10"
              style={{ background: "radial-gradient(circle, #4dd9ac 0%, transparent 70%)" }} />

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#4dd9ac] mb-4">
                <Wallet className="h-3 w-3" /> Earning Opportunities
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                Three ways to earn<br />with NoLSAF.
              </h1>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-lg">
                Whether you refer guests, manage events, or represent NoLSAF in person  every confirmed booking puts
                money in your account. Pick the role that fits your lifestyle.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {[
                  { icon: UserCheck, label: "For Agents",    color: "#02b4f5", href: "/help/become-agent" },
                  { icon: Megaphone, label: "Event Manager", color: "#a78bfa", href: "/help/event-manager" },
                  { icon: MapPin,    label: "NoLSAF Stand",  color: "#4dd9ac", href: "/help/nolsaf-stand" },
                ].map(({ icon: Icon, label, color, href }) => (
                  <a key={label} href={href}
                    className="no-underline inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 text-white px-4 py-2 text-xs font-semibold hover:bg-white/20 hover:gap-2.5 transition-all duration-200">
                    <Icon className="h-3.5 w-3.5" style={{ color }} />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Three role teaser cards */}
          <div className="mt-10 grid sm:grid-cols-3 gap-5">
            {ROLES.map(({ id, icon: Icon, badge, color, headline, description, href, cta, gradient, glow }) => (
              <Link href={href} key={id}
                className="no-underline group relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-white flex flex-col">
                <div className="absolute inset-x-0 top-0 h-1 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-t-2xl"
                  style={{ backgroundColor: color }} />

                <div className={`relative overflow-hidden bg-gradient-to-br ${gradient} flex items-center justify-center p-8`}>
                  <div className="pointer-events-none absolute inset-0"
                    style={{ background: `radial-gradient(circle at 50% 50%, ${glow}25 0%, transparent 70%)` }} />
                  <div className="relative z-10 h-16 w-16 rounded-2xl flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: `${color}20`, border: `1.5px solid ${color}40` }}>
                    <Icon className="h-8 w-8" style={{ color }} />
                  </div>
                </div>

                <div className="flex-1 p-5 flex flex-col">
                  <div className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider mb-3 w-fit"
                    style={{ color, backgroundColor: `${color}10`, borderColor: `${color}30` }}>
                    <Icon className="h-3 w-3" />
                    {badge}
                  </div>
                  <h2 className="text-sm font-black text-gray-900 leading-snug">{headline}</h2>
                  <p className="mt-2 text-xs text-gray-500 leading-relaxed flex-1">{description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-xs font-bold group-hover:gap-3 transition-all duration-200" style={{ color }}>
                    {cta} <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="group mt-8 relative overflow-hidden bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#02665e]/30 hover:-translate-y-1 transition-all duration-300 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#02665e18_0%,_transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                <LifeBuoy className="h-5 w-5 text-[#02665e]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Not sure which role suits you?</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md">
                  Our team is happy to walk you through each opportunity. Reach out and we will help you choose the right fit.
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap gap-3 flex-shrink-0">
              <Link href="/help" className="no-underline inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-gray-700 px-5 py-2.5 text-sm font-semibold hover:border-[#02665e]/40 hover:text-[#02665e] hover:gap-3 transition-all duration-200 shadow-sm">
                Help Center <ChevronRight className="h-4 w-4" />
              </Link>
              <a href="mailto:info@nolsaf.com" className="no-underline inline-flex items-center gap-2 rounded-xl bg-[#02665e] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#024d47] hover:gap-3 transition-all duration-200 shadow-md">
                Contact us <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

        </div>
      </div>
      <HelpFooter />
    </>
  );
}
