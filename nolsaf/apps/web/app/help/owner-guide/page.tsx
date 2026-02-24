import Link from "next/link";
import {
  Camera,
  ClipboardList,
  CheckCircle2,
  MessageSquare,
  KeyRound,
  ShieldCheck,
  Wallet,
  Clock3,
  AlertCircle,
  Star,
  TrendingUp,
  Users,
  ArrowRight,
  BadgeCheck,
  Lightbulb,
  CalendarCheck,
  DollarSign,
} from "lucide-react";

import LayoutFrame from "@/components/LayoutFrame";
import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

const LISTING_STEPS = [
  {
    icon: Camera,
    title: "Add high-quality photos",
    description:
      "Upload at least 8 well-lit photos covering every room, the exterior, and key amenities. Listings with professional-grade images receive up to 3× more bookings.",
  },
  {
    icon: ClipboardList,
    title: "Write an accurate description",
    description:
      "Describe what makes your space unique — nearby landmarks, standout amenities, and the atmosphere guests can expect. Accurate descriptions reduce disputes and cancellations.",
  },
  {
    icon: ShieldCheck,
    title: "Set house rules clearly",
    description:
      "Define no-smoking policies, pet rules, quiet hours, and guest limits. Clear rules protect your property and set the right expectations before booking.",
  },
  {
    icon: KeyRound,
    title: "Configure check-in & check-out",
    description:
      "Set your earliest check-in time and latest check-out time. Include self check-in instructions or confirm whether you'll be present to welcome guests.",
  },
  {
    icon: TrendingUp,
    title: "Price competitively",
    description:
      "Research similar properties in your area and price within range. Set weekend rates, holiday surcharges, and minimum stay lengths to maximise revenue.",
  },
  {
    icon: CalendarCheck,
    title: "Keep availability current",
    description:
      "Block dates you're unavailable and open future months in advance. Stale calendars lead to booking conflicts and poor guest experiences.",
  },
];

const BOOKING_TIPS = [
  {
    icon: MessageSquare,
    title: "Reply within 1 hour",
    description:
      "Fast responses are one of the biggest factors in getting bookings. Guests often message multiple properties — being first matters.",
  },
  {
    icon: KeyRound,
    title: "Share check-in info early",
    description:
      "Send door codes, parking instructions, and Wi-Fi details at least 24 hours before arrival. Guests appreciate not having to ask.",
  },
  {
    icon: ShieldCheck,
    title: "Inspect before every stay",
    description:
      "Walk through the property before each new guest arrives. Fix any issues, restock essentials, and confirm everything is clean and working.",
  },
  {
    icon: Star,
    title: "Ask for a review",
    description:
      "After check-out, a polite message asking guests to leave a review can significantly boost your listing's visibility and credibility.",
  },
];

const PAYOUT_STEPS = [
  {
    step: "01",
    title: "Guest completes booking",
    description: "Payment is collected from the guest and held securely by the platform.",
  },
  {
    step: "02",
    title: "Check-in confirmed",
    description: "Once the guest's check-in is verified, the payout timer starts.",
  },
  {
    step: "03",
    title: "Release window",
    description: "Funds are typically released 24–48 hours after confirmation. Bank holidays or provider delays may extend this.",
  },
  {
    step: "04",
    title: "Payout sent",
    description: "Funds are transferred to your registered mobile money or bank account.",
  },
];

export default function HelpOwnerGuidePage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />

        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          {/* ── Hero banner ─────────────────────────────────────────────── */}
          <div className="mt-4 relative overflow-hidden rounded-2xl bg-[#010f0e] shadow-2xl text-white">
            {/* layered bg — deep dark base + teal sweep + cyan spotlight */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#011918] via-[#01332e] to-[#010f0e]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_110%_-10%,_#02b4f540_0%,_transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_-5%_110%,_#02665e50_0%,_transparent_60%)]" />
            {/* dot-grid texture */}
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #ffffff 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />

            {/* two-column layout */}
            <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-6 px-7 py-10 sm:px-10 sm:py-12 items-center">

              {/* LEFT — copy */}
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] mb-5">
                  <BadgeCheck className="h-3.5 w-3.5 text-[#02b4f5]" />
                  <span className="text-white/90">Owner Guide</span>
                </div>

                <h1 className="text-3xl sm:text-[2.6rem] font-extrabold leading-[1.15] tracking-tight">
                  Everything you need to{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#02b4f5] to-[#4dd9ac]">
                    succeed as a host
                  </span>
                </h1>

                <p className="mt-4 text-white/65 text-sm sm:text-base leading-relaxed max-w-lg">
                  From creating a standout listing to earning your first payout — this guide walks you
                  through every stage of being a property owner on NoLSAF.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/owner/properties/add"
                    className="no-underline inline-flex items-center gap-2 rounded-xl bg-[#02b4f5] text-[#010f0e] px-5 py-2.5 text-sm font-bold hover:brightness-110 hover:gap-3 transition-all duration-200 shadow-lg shadow-[#02b4f5]/20"
                  >
                    List a property <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/help/payouts"
                    className="no-underline inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 text-white px-5 py-2.5 text-sm font-semibold hover:bg-white/18 hover:gap-3 transition-all duration-200"
                  >
                    Payout guide <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              {/* RIGHT — floating mini-stat cards */}
              <div className="hidden lg:flex flex-col gap-3 min-w-[200px]">
                {[
                  { icon: Star,        label: "More bookings",  value: "3× uplift",      color: "#f59e0b" },
                  { icon: Clock3,      label: "Reply target",   value: "≤ 1 hour",        color: "#02b4f5" },
                  { icon: DollarSign,  label: "Payout window",  value: "24 – 48 hrs",     color: "#4dd9ac" },
                  { icon: TrendingUp,  label: "Visibility",     value: "Top search rank", color: "#a78bfa" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl bg-white/[0.07] border border-white/10 px-4 py-3 backdrop-blur-sm hover:bg-white/[0.12] transition-colors duration-200 cursor-default"
                  >
                    <div
                      className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${color}22` }}
                    >
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/45 uppercase tracking-wider leading-none mb-0.5">{label}</p>
                      <p className="text-sm font-bold text-white leading-none">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* ── Stats strip ────────────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Users, label: "Active guests", value: "Growing daily" },
              { icon: DollarSign, label: "Payout window", value: "24–48 hrs" },
              { icon: Star, label: "Review boost", value: "3× more bookings" },
              { icon: Clock3, label: "Response time", value: "Within 1 hour" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="group bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 flex items-center gap-3 hover:-translate-y-1 hover:shadow-lg hover:border-[#02665e]/25 transition-all duration-200 cursor-default">
                <div className="flex-shrink-0 h-9 w-9 rounded-lg bg-[#02665e]/10 flex items-center justify-center group-hover:bg-[#02665e]/20 group-hover:scale-110 transition-all duration-200">
                  <Icon className="h-4 w-4 text-[#02665e]" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 truncate">{label}</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Section 1: Listing Checklist ────────────────────────────── */}
          <section className="mt-8">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-[#02665e] flex items-center justify-center flex-shrink-0">
                <ClipboardList className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Listing checklist</h2>
                <p className="text-sm text-gray-500">Make your property irresistible to guests before you go live.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {LISTING_STEPS.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="relative overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#02665e]/30 hover:ring-1 hover:ring-[#02665e]/10 transition-all duration-300 group cursor-default"
                >
                  {/* top accent bar */}
                  <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#02665e] to-[#02b4f5] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-t-xl" />
                  <div className="h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center mb-3 group-hover:bg-[#02665e] group-hover:scale-110 transition-all duration-300">
                    <Icon className="h-5 w-5 text-[#02665e] group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
                  <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Section 2: During a Booking ─────────────────────────────── */}
          <section className="mt-10 relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
            {/* soft gradient mesh — light teal wash */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#f0fdfc] via-white to-[#e8f8ff]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_0%_0%,_#02b4f514_0%,_transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_100%_100%,_#02665e0f_0%,_transparent_65%)]" />
            {/* fine grid */}
            <div
              className="absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "linear-gradient(to right,#02665e0a 1px,transparent 1px),linear-gradient(to bottom,#02665e0a 1px,transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />

            <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10">
              {/* header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="h-9 w-9 rounded-xl bg-[#02b4f5] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#02b4f5]/30">
                  <CalendarCheck className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">During a booking</h2>
                  <p className="text-sm text-gray-500">Deliver a five-star experience from arrival to departure.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {BOOKING_TIPS.map(({ icon: Icon, title, description }, idx) => (
                  <div
                    key={title}
                    className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-sm p-6 hover:-translate-y-1.5 hover:shadow-xl hover:border-[#02b4f5]/35 transition-all duration-300 group cursor-default"
                  >
                    {/* watermark step number */}
                    <span className="absolute right-3 top-2 text-[4.5rem] font-black leading-none text-[#02b4f5]/[0.06] select-none pointer-events-none group-hover:text-[#02b4f5]/[0.10] transition-colors duration-300">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    {/* top accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#02b4f5] to-[#02665e] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="flex-shrink-0 h-11 w-11 rounded-2xl bg-gradient-to-br from-[#02b4f5]/15 to-[#02665e]/10 border border-[#02b4f5]/20 flex items-center justify-center group-hover:bg-[#02b4f5] group-hover:border-[#02b4f5] group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#02b4f5]/25 transition-all duration-300">
                        <Icon className="h-5 w-5 text-[#02b4f5] group-hover:text-white transition-colors duration-300" />
                      </div>
                      <div className="pt-0.5">
                        <h3 className="font-bold text-gray-900 text-sm leading-snug">{title}</h3>
                        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Pro Tips callout ────────────────────────────────────────── */}
          <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4">
            <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Pro tip — build your superhost reputation</p>
              <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                Owners who maintain a response rate above 90%, receive consistent 5-star reviews, and have zero
                cancellations are featured higher in search results. Consistency is everything — treat every
                guest like your first.
              </p>
            </div>
          </div>

          {/* ── Section 3: Payouts ──────────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
                <Wallet className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">How payouts work</h2>
                <p className="text-sm text-gray-500">Understand the flow from booking payment to money in your account.</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {PAYOUT_STEPS.map(({ step, title, description }) => (
                  <div key={step} className="group flex items-start gap-5 px-6 py-5 hover:bg-[#02665e]/[0.03] transition-colors duration-200 cursor-default">
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-[#02665e]/10 border border-[#02665e]/20 flex items-center justify-center group-hover:bg-[#02665e] group-hover:border-[#02665e] transition-all duration-300">
                      <span className="text-xs font-bold text-[#02665e] group-hover:text-white transition-colors duration-300">{step}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-[#02665e] transition-colors duration-200">{title}</p>
                      <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{description}</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 flex-shrink-0 mt-0.5 ml-auto transition-colors duration-300" />
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  Holidays or payment provider delays may extend the release window.
                </div>
                <Link
                  href="/help/payouts"
                  className="no-underline flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-[#02665e] hover:gap-2.5 transition-all duration-200"
                >
                  Full payout guide <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </section>

          {/* ── CTA footer card ─────────────────────────────────────────── */}
          <div className="group mt-10 relative overflow-hidden bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#02665e]/30 hover:-translate-y-1 transition-all duration-300 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            {/* background glow on hover */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#02665e18_0%,_transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10">
              <h3 className="text-lg font-bold text-gray-900">Ready to start hosting?</h3>
              <p className="mt-1 text-sm text-gray-500 max-w-md">
                Create your first listing today and start earning from your property. Setup takes less than 15 minutes.
              </p>
            </div>
            <Link
              href="/owner/properties/add"
              className="no-underline relative z-10 flex-shrink-0 inline-flex items-center gap-2 rounded-xl bg-[#02665e] text-white px-6 py-3 text-sm font-semibold hover:bg-[#024d47] hover:gap-3 hover:shadow-lg transition-all duration-200 shadow-md"
            >
              List your property <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
      <HelpFooter />
    </>
  );
}
