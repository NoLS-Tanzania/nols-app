import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarCheck,
  ChevronRight,
  Clock,
  CreditCard,
  LifeBuoy,
  Smartphone,
  Wallet,
  Zap,
} from "lucide-react";

import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

const PAY_METHODS = [
  {
    icon: Smartphone,
    title: "Mobile Money",
    color: "#f59e0b",
    bg: "bg-amber-50",
    border: "border-amber-200",
    items: ["M-Pesa", "Airtel Money", "Tigo Pesa", "Halopesa", "T-Pesa"],
    note: "Most popular. Funds arrive within minutes of payout.",
  },
  {
    icon: Banknote,
    title: "Bank Transfer",
    color: "#02665e",
    bg: "bg-teal-50",
    border: "border-teal-200",
    items: ["CRDB Bank", "NMB Bank", "NBC Bank", "Equity Bank", "Other local banks"],
    note: "Processed within 1–2 business days. Minimum payout: TZS 5,000.",
  },
  {
    icon: CreditCard,
    title: "Payment Platforms",
    color: "#6366f1",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    items: ["Selcom Wallet", "Azam Pay", "PesaPal"],
    note: "Processed within 24 hours. Subject to platform availability.",
  },
];

const PAYOUT_TYPES = [
  {
    icon: Zap,
    title: "Instant claim",
    detail: "After a guest checks in, your earnings are released immediately. You can trigger a manual payout from your dashboard at any time — funds arrive within minutes on Mobile Money.",
    highlight: "Available from check-in",
  },
  {
    icon: Clock,
    title: "Daily auto-payout",
    detail: "Enable daily auto-payout in your earnings settings and all confirmed earnings are swept to your registered payout method every day at midnight EAT.",
    highlight: "Opt-in in settings",
  },
  {
    icon: CalendarCheck,
    title: "Weekly auto-payout",
    detail: "Prefer a weekly cadence? Weekly payouts roll up all earnings from Monday to Sunday and are dispatched every Monday morning. Recommended for agents and event managers with regular volume.",
    highlight: "Recommended for agents",
  },
  {
    icon: Wallet,
    title: "Hold in balance",
    detail: "You can leave earnings in your NoLSAF balance and withdraw whenever you choose. Your balance never expires and there are no holding fees.",
    highlight: "No expiry, no fees",
  },
];

export default function HelpEarningPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          {/* ── Hero ─────────────────────────────────────────────── */}
          <div className="mt-4 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0f00] via-[#1f1200] to-[#261800] text-white p-8 sm:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
            <div className="pointer-events-none absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20"
              style={{ background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)" }} />
            <div className="pointer-events-none absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10"
              style={{ background: "radial-gradient(circle, #d97706 0%, transparent 70%)" }} />

            <div className="relative z-10 grid sm:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#f59e0b] mb-4">
                  <Wallet className="h-3 w-3" /> Earning
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  How your earnings are<br />paid on NoLSAF.
                </h1>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Whether you are an agent, event manager, or stand operator, this page explains your payout methods, schedules, and how to access your balance — in plain language.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/help/payouts"
                    className="no-underline inline-flex items-center gap-2 rounded-xl bg-[#f59e0b] text-[#1a0f00] px-5 py-2.5 text-sm font-bold hover:brightness-110 hover:gap-3 transition-all duration-200 shadow-lg shadow-[#f59e0b]/20">
                    View earning opportunities <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link href="/help/become-agent"
                    className="no-underline inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 text-white px-5 py-2.5 text-sm font-semibold hover:bg-white/20 hover:gap-3 transition-all duration-200">
                    Become an Agent <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Instant claim",      sub: "Withdraw right after check-in" },
                  { label: "Mobile Money",        sub: "M-Pesa, Airtel, Tigo, Halo" },
                  { label: "Auto-payout",         sub: "Daily or weekly auto-sweep" },
                  { label: "No fees on balance",  sub: "Hold earnings with no expiry" },
                ].map(({ label, sub }) => (
                  <div key={label} className="rounded-xl bg-white/8 border border-white/12 p-4 backdrop-blur-sm">
                    <BadgeCheck className="h-5 w-5 text-[#f59e0b] mb-2" />
                    <p className="text-xs font-bold text-white leading-snug">{label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Payout methods ───────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-[#f59e0b] flex items-center justify-center flex-shrink-0">
                <Banknote className="h-4 w-4 text-[#1a0f00]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Payout methods</h2>
                <p className="text-sm text-gray-500">Choose how you receive your earnings. You can update your method anytime in account settings.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {PAY_METHODS.map(({ icon: Icon, title, color, bg, border, items, note }) => (
                <div key={title} className={`group relative overflow-hidden rounded-2xl ${bg} ${border} border p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                  </div>
                  <ul className="space-y-1.5 mb-4">
                    {items.map((m) => (
                      <li key={m} className="flex items-center gap-2 text-xs text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                        {m}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-gray-500 italic border-t pt-3" style={{ borderColor: `${color}30` }}>{note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Payout schedules ─────────────────────────────────── */}
          <section className="mt-10">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#fffbeb] via-white to-[#fff8e1] border border-amber-200 p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-40"
                style={{ backgroundImage: "linear-gradient(#f59e0b12 1px, transparent 1px), linear-gradient(90deg, #f59e0b12 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
              <div className="relative z-10 mb-6">
                <h2 className="text-xl font-bold text-gray-900">Payout schedules</h2>
                <p className="text-sm text-gray-500 mt-0.5">Four ways to access your earnings — choose what fits your workflow.</p>
              </div>
              <div className="relative z-10 grid sm:grid-cols-2 gap-4">
                {PAYOUT_TYPES.map(({ icon: Icon, title, detail, highlight }) => (
                  <div key={title} className="group bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-t-2xl bg-[#f59e0b]" />
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                        <Icon className="h-4 w-4 text-[#f59e0b]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900">{title}</p>
                          <span className="text-[10px] font-semibold text-[#d97706] bg-amber-100 rounded-full px-2 py-0.5">{highlight}</span>
                        </div>
                        <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Info strip ───────────────────────────────────────── */}
          <section className="mt-6 grid sm:grid-cols-3 gap-3">
            {[
              { icon: BadgeCheck, title: "Earnings are protected",   body: "Your balance is held securely by NoLSAF. No third party can access or freeze it." },
              { icon: Zap,        title: "No minimum for instant",    body: "Instant claim has no minimum payout amount. You can withdraw any amount from TZS 500." },
              { icon: Clock,      title: "Auto-payout always on time",body: "Auto-payouts run at midnight EAT. If a bank or mobile money system is down, it retries automatically." },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Icon className="h-4 w-4 text-[#f59e0b]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-900">{title}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </section>

          {/* ── CTA ──────────────────────────────────────────────── */}
          <div className="group mt-8 relative overflow-hidden bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#f59e0b]/30 hover:-translate-y-1 transition-all duration-300 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#f59e0b18_0%,_transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <LifeBuoy className="h-5 w-5 text-[#f59e0b]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Questions about your payouts?</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md">
                  If your payout is delayed or you need to update your payout method, contact NoLSAF support — we respond within 24 hours.
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap gap-3 flex-shrink-0">
              <Link href="/help/payouts"
                className="no-underline inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-gray-700 px-5 py-2.5 text-sm font-semibold hover:border-[#f59e0b]/40 hover:text-[#d97706] hover:gap-3 transition-all duration-200 shadow-sm">
                Earning opportunities <ChevronRight className="h-4 w-4" />
              </Link>
              <Link href="mailto:support@nolsaf.com"
                className="no-underline inline-flex items-center gap-2 rounded-xl bg-[#f59e0b] text-[#1a0f00] px-5 py-2.5 text-sm font-bold hover:brightness-110 hover:gap-3 transition-all duration-200 shadow-md">
                Contact support <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

        </div>
      </div>
      <HelpFooter />
    </>
  );
}
