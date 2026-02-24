import Link from "next/link";
import {
  TrendingUp,
  Wallet,
  ClipboardList,
  Star,
  BadgeCheck,
  Clock3,
  Smartphone,
  Building2,
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Zap,
  ReceiptText,
  Ban,
  ShieldCheck,
  CalendarClock,
  Headphones,
} from "lucide-react";

import LayoutFrame from "@/components/LayoutFrame";
import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

const EARNINGS_STEPS = [
  {
    step: "01",
    icon: ClipboardList,
    title: "Assignment accepted",
    description: "You receive a trip or service assignment through the Driver Portal. The rate for that job is visible before you confirm acceptance.",
    color: "#02b4f5",
  },
  {
    step: "02",
    icon: BadgeCheck,
    title: "Service completed",
    description: "The job is marked as completed in the system — either by booking code validation at the destination or by the guest confirming delivery.",
    color: "#a78bfa",
  },
  {
    step: "03",
    icon: Wallet,
    title: "Earnings recorded",
    description: "Your earnings for that assignment are logged in your earnings dashboard immediately. You can review a full breakdown by job at any time.",
    color: "#02665e",
  },
  {
    step: "04",
    icon: Zap,
    title: "Payout processed",
    description: "Accumulated earnings are disbursed according to your agreed payment schedule — daily, weekly, or on demand. All payouts are cashless.",
    color: "#f59e0b",
  },
];

const PAYMENT_METHODS = [
  {
    icon: Smartphone,
    label: "Mobile Money",
    sub: "M-Pesa · Airtel Money · Tigo Pesa · HaloPesa",
    time: "30 min – 3 days",
    timeLabel: "Fastest",
    color: "#02665e",
    fast: true,
  },
  {
    icon: Building2,
    label: "Bank Transfer",
    sub: "Any verified Tanzanian bank account",
    time: "1 – 5 business days",
    timeLabel: "Standard",
    color: "#02b4f5",
    fast: false,
  },
];

const EARNING_FACTORS = [
  { icon: ClipboardList, color: "#02b4f5", title: "Trip type & distance",   description: "Different assignment types have different base rates. Long-haul and specialised trips carry higher rates than standard local runs." },
  { icon: Star,          color: "#f59e0b", title: "Service rating",          description: "A consistently high guest rating keeps you eligible for priority assignments and discretionary performance bonuses." },
  { icon: CalendarClock, color: "#02665e", title: "Availability & volume",   description: "Drivers who maintain consistent availability during peak periods receive higher assignment volumes and performance recognition." },
  { icon: TrendingUp,    color: "#a78bfa", title: "Performance bonuses",     description: "Bonuses are discretionary and awarded based on booking volume, ratings, and engagement. Not legally guaranteed, but reviewed regularly." },
];

const DEDUCTION_RULES = [
  { scenario: "Owner-cancelled trip",      condition: "Trip cancelled by property owner before service", youKeep: "0%", keepColor: "text-red-600",     badge: "No payout",         badgeColor: "bg-red-50 text-red-700 border-red-200" },
  { scenario: "Completed service",         condition: "Trip fully completed and validated",              youKeep: "100%", keepColor: "text-emerald-600",badge: "Full payout",       badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { scenario: "Partial service delivered", condition: "Service partially completed (mutual agreement)",  youKeep: "Varies", keepColor: "text-amber-600",badge: "Case-by-case",     badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
  { scenario: "Policy violation",          condition: "Assignment cancelled due to driver non-compliance",youKeep: "0%", keepColor: "text-red-600",    badge: "Forfeited",         badgeColor: "bg-red-50 text-red-700 border-red-200" },
];

export default function HelpDriverEarningsPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          {/* ── Hero ─────────────────────────────────────────────────── */}
          <div className="mt-4 relative overflow-hidden rounded-2xl bg-[#010f0e] text-white shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-[#011918] via-[#01332e] to-[#010f0e]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_100%_0%,_#02b4f53a_0%,_transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_0%_100%,_#02665e45_0%,_transparent_60%)]" />
            <div
              className="absolute inset-0 opacity-[0.06]"
              style={{ backgroundImage: "radial-gradient(circle,#ffffff 1px,transparent 1px)", backgroundSize: "22px 22px" }}
            />
            <div className="relative z-10 grid lg:grid-cols-[1fr_auto] gap-6 px-7 py-10 sm:px-10 sm:py-12 items-center">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] mb-5">
                  <TrendingUp className="h-3.5 w-3.5 text-[#02b4f5]" />
                  <span className="text-white/90">Driver Earnings</span>
                </div>
                <h1 className="text-3xl sm:text-[2.5rem] font-extrabold leading-[1.15] tracking-tight">
                  How your{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#02b4f5] to-[#4dd9ac]">
                    earnings work
                  </span>
                </h1>
                <p className="mt-4 text-white/60 text-sm sm:text-base leading-relaxed max-w-lg">
                  Your earnings are calculated per assignment, recorded the moment a service is validated, and paid out cashlessly on your agreed schedule. This page explains every step from job acceptance to payout.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/driver/earnings"
                    className="no-underline inline-flex items-center gap-2 rounded-xl bg-[#02b4f5] text-[#010f0e] px-5 py-2.5 text-sm font-bold hover:brightness-110 hover:gap-3 transition-all duration-200 shadow-lg shadow-[#02b4f5]/20"
                  >
                    View my earnings <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/help/driver-tools"
                    className="no-underline inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 text-white px-5 py-2.5 text-sm font-semibold hover:bg-white/18 hover:gap-3 transition-all duration-200"
                  >
                    Driver tools <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              <div className="hidden lg:flex flex-col gap-3 min-w-[200px]">
                {[
                  { icon: Zap,          label: "Recording",    value: "Instant",       color: "#f59e0b" },
                  { icon: Clock3,       label: "Mobile payout",value: "≤ 3 days",      color: "#02b4f5" },
                  { icon: TrendingUp,   label: "Bonuses",      value: "Performance-based", color: "#4dd9ac" },
                  { icon: ShieldCheck,  label: "Payments",     value: "Cashless only", color: "#a78bfa" },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="flex items-center gap-3 rounded-xl bg-white/[0.07] border border-white/10 px-4 py-3 hover:bg-white/[0.12] transition-colors duration-200 cursor-default">
                    <div className="flex-shrink-0 h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}22` }}>
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider leading-none mb-0.5">{label}</p>
                      <p className="text-sm font-bold text-white leading-none">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Earnings flow ─────────────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-[#02665e] flex items-center justify-center flex-shrink-0">
                <ReceiptText className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">How earnings are calculated</h2>
                <p className="text-sm text-gray-500">From accepting a job to receiving your payout — step by step.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {EARNINGS_STEPS.map(({ step, icon: Icon, title, description, color }) => (
                <div key={step} className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 group cursor-default">
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                    style={{ background: `linear-gradient(to right, ${color}, #02665e)` }}
                  />
                  <span
                    className="absolute right-3 top-2 text-[4rem] font-black leading-none select-none pointer-events-none opacity-[0.06] group-hover:opacity-[0.11] transition-opacity duration-300"
                    style={{ color }}
                  >
                    {step}
                  </span>
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-300"
                    style={{ backgroundColor: `${color}18` }}
                  >
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
                  <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Earning factors ───────────────────────────────────────── */}
          <section className="mt-10 relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-[#f0fdfc] via-white to-[#e8f8ff]" />
            <div
              className="absolute inset-0"
              style={{ backgroundImage: "linear-gradient(to right,#02665e0a 1px,transparent 1px),linear-gradient(to bottom,#02665e0a 1px,transparent 1px)", backgroundSize: "32px 32px", opacity: 0.4 }}
            />
            <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex items-center gap-3 mb-7">
                <div className="h-9 w-9 rounded-xl bg-[#02665e] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#02665e]/30">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">What affects your earnings</h2>
                  <p className="text-sm text-gray-500">Four key factors that determine how much you earn per period.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {EARNING_FACTORS.map(({ icon: Icon, color, title, description }) => (
                  <div key={title} className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-default">
                    <div
                      className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                      style={{ background: `linear-gradient(to right, ${color}, #02665e)` }}
                    />
                    <div className="flex items-start gap-4">
                      <div
                        className="flex-shrink-0 h-10 w-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-all duration-300"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon className="h-5 w-5" style={{ color }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
                        <p className="mt-1 text-xs text-gray-500 leading-relaxed">{description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Payment methods ───────────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-[#02b4f5] flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Payout methods</h2>
                <p className="text-sm text-gray-500">All payouts are cashless. Set your preferred method in the Driver Portal — it must be verified via OTP before first use.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {PAYMENT_METHODS.map(({ icon: Icon, label, sub, time, timeLabel, color, fast }) => (
                <div key={label} className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 group cursor-default">
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                    style={{ background: `linear-gradient(to right, ${color}, #02665e)` }}
                  />
                  {fast && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">Recommended</span>
                  )}
                  <div
                    className="h-11 w-11 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-300"
                    style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
                  >
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">{label}</h3>
                  <p className="mt-1 text-xs text-gray-500">{sub}</p>
                  <div className="mt-3 flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">{time}</span>
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border" style={{ color, backgroundColor: `${color}12`, borderColor: `${color}25` }}>{timeLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Deductions table ──────────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                <Ban className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Deductions &amp; forfeitures</h2>
                <p className="text-sm text-gray-500">Understand which scenarios affect your payout amount.</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Scenario</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Condition</th>
                      <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">You keep</th>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Outcome</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {DEDUCTION_RULES.map(({ scenario, condition, youKeep, keepColor, badge, badgeColor }) => (
                      <tr key={scenario} className="hover:bg-slate-50 transition-colors duration-150 cursor-default">
                        <td className="px-5 py-4 text-xs font-semibold text-gray-900 whitespace-nowrap">{scenario}</td>
                        <td className="px-5 py-4 text-xs text-gray-500 max-w-[240px]">{condition}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`text-sm font-black ${keepColor}`}>{youKeep}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${badgeColor}`}>{badge}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* ── Delay warning ─────────────────────────────────────────── */}
          <div className="mt-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>Payout not arrived?</strong> If your disbursement is delayed beyond the expected window, contact support at{" "}
              <a href="mailto:info@nolsaf.com" className="no-underline font-semibold text-amber-900 hover:underline">info@nolsaf.com</a>{" "}
              with your name and the relevant assignment reference.
            </p>
          </div>

          {/* ── Manage in Driver Portal link ───────────────────────────── */}
          <div className="mt-5">
            <Link
              href="/help/driver-tools"
              className="no-underline group flex items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5 hover:-translate-y-1 hover:shadow-xl hover:border-[#02b4f5]/30 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-[#02b4f5]/10 flex items-center justify-center group-hover:bg-[#02b4f5]/20 transition-colors duration-200 flex-shrink-0">
                  <ClipboardList className="h-5 w-5 text-[#02b4f5] group-hover:scale-110 transition-transform duration-200" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 group-hover:text-[#02b4f5] transition-colors duration-200">Driver Tools &amp; Driver Portal</p>
                  <p className="text-xs text-gray-500 mt-0.5">Manage assignments, schedules, and your account in the Driver Portal.</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#02b4f5] flex-shrink-0 transition-colors duration-200" />
            </Link>
          </div>

          {/* ── CTA ───────────────────────────────────────────────────── */}
          <div className="group mt-5 relative overflow-hidden bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#02665e]/30 hover:-translate-y-1 transition-all duration-300 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#02665e18_0%,_transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                <Headphones className="h-5 w-5 text-[#02665e]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Questions about your earnings?</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md">
                  Visit the Help Center or contact our support team directly with your assignment details.
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap gap-3 flex-shrink-0">
              <Link
                href="/help"
                className="no-underline inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-gray-700 px-5 py-2.5 text-sm font-semibold hover:border-[#02665e]/40 hover:text-[#02665e] hover:gap-3 transition-all duration-200 shadow-sm"
              >
                Help Center <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:info@nolsaf.com"
                className="no-underline inline-flex items-center gap-2 rounded-xl bg-[#02665e] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#024d47] hover:gap-3 transition-all duration-200 shadow-md"
              >
                Email support <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

        </div>
      </div>
      <HelpFooter />
    </>
  );
}
