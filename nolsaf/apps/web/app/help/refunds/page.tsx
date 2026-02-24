import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileWarning,
  Info,
  ReceiptText,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Star,
  Users,
  XCircle,
} from "lucide-react";

import LayoutFrame from "@/components/LayoutFrame";
import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

// ─── Before-check-in timeline rows ─────────────────────────────────────────
const CANCELLATION_WINDOWS = [
  {
    timing: "Within 24 hrs of booking",
    condition: "AND at least 72 hrs before check-in",
    refund: "Full refund",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
  },
  {
    timing: "After 24-hr grace, 96+ hrs before check-in",
    condition: "Outside the free cancellation window",
    refund: "50% refund",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-400",
  },
  {
    timing: "Less than 96 hrs before check-in",
    condition: "Late cancellation",
    refund: "No refund",
    badge: "bg-red-100 text-red-600",
    dot: "bg-red-400",
  },
  {
    timing: "Non-refundable booking",
    condition: "Promotional / last-minute / specific terms",
    refund: "No refund",
    badge: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
  },
];

// ─── Exceptional circumstances ──────────────────────────────────────────────
const EXCEPTIONAL = [
  {
    icon: ShieldAlert,
    label: "Medical emergency",
    detail: "Life-threatening condition requiring hospitalisation after check-in. Hospital admission records required within 48 hours.",
    color: "#ef4444",
  },
  {
    icon: FileWarning,
    label: "Death in immediate family",
    detail: "Spouse, parent, child or sibling only. Official death certificate required within 72 hours. Extended family does not qualify.",
    color: "#f59e0b",
  },
  {
    icon: ShieldCheck,
    label: "Natural disaster",
    detail: "Government-declared disaster making the property unsafe or inaccessible. Request within 7 days with official documentation.",
    color: "#3b82f6",
  },
  {
    icon: BookOpen,
    label: "Government-imposed restriction",
    detail: "Mandatory travel ban, lockdown, or quarantine order imposed after check-in. Advisory warnings do not qualify.",
    color: "#8b5cf6",
  },
  {
    icon: ShieldAlert,
    label: "Property emergency",
    detail: "Accommodation rendered genuinely uninhabitable (fire, structural failure, severe infestation). Must be reported to NoLSAF within 24 hours of discovery.",
    color: "#02665e",
  },
];

// ─── Refund method timing ────────────────────────────────────────────────────
const REFUND_TIMING = [
  { method: "M-Pesa", timing: "2–5 business days", note: "Reversed to your registered Vodacom number" },
  { method: "Airtel Money", timing: "2–5 business days", note: "Reversed to your Airtel wallet" },
  { method: "Tigo Pesa / HaloPesa", timing: "2–5 business days", note: "Reversed to the originating wallet" },
  { method: "Visa / Mastercard", timing: "5–10 business days", note: "Processing time varies by issuing bank" },
  { method: "PayPal / Stripe", timing: "5–10 business days", note: "Refunded to your PayPal or Stripe account" },
];

export default function HelpRefundsPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <div className="mt-4 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#010f0e] via-[#011a18] to-[#021f1c] text-white p-8 sm:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
            <div className="pointer-events-none absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-20"
              style={{ background: "radial-gradient(circle, #02b4f5 0%, transparent 70%)" }} />
            <div className="pointer-events-none absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10"
              style={{ background: "radial-gradient(circle, #4dd9ac 0%, transparent 70%)" }} />

            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#4dd9ac] mb-4">
                <RefreshCcw className="h-3 w-3" /> Refunds & Cancellations
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Know your options before you act
              </h1>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-xl">
                Cancellation eligibility depends on <em>when</em> you cancel relative to check-in. Read the timeline below carefully — then check your specific booking terms, which may override the general policy.
              </p>
            </div>

            {/* Stat pills */}
            <div className="relative z-10 mt-8 flex flex-wrap gap-3">
              {[
                { icon: Clock3,      label: "24-hr grace window",    sub: "After booking" },
                { icon: ReceiptText, label: "5–10 business days",    sub: "Refund processing" },
                { icon: BadgeCheck,  label: "Full refund possible",  sub: "Within free cancel window" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-xl bg-white/10 border border-white/15 px-4 py-2.5">
                  <Icon className="h-4 w-4 text-[#02b4f5] flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-white leading-none">{label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Policy quote: read your booking terms first ────────────────── */}
          <div className="mt-6 relative overflow-hidden rounded-xl border-l-4 border-[#02665e] bg-[#f0fdfc] px-5 py-4">
            <p className="text-xs text-[#024d47] leading-relaxed italic">
              &ldquo;Users are encouraged to review the specific cancellation terms provided at the time of booking to ensure understanding of applicable conditions. This policy applies to all reservations made through the NoLSAF platform, including individual bookings and group stays.&rdquo;
            </p>
            <p className="mt-1.5 text-[10px] text-[#02665e] font-semibold not-italic">— NoLSAF Cancellation Policy §1</p>
          </div>

          {/* ── Before check-in timeline ───────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-[#02665e] flex items-center justify-center flex-shrink-0">
                <Clock3 className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Cancellation windows — before check-in</h2>
                <p className="text-sm text-gray-500">Which window applies depends on when you booked <em>and</em> when you cancel.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {CANCELLATION_WINDOWS.map(({ timing, condition, refund, badge, dot }, i, arr) => (
                <div key={timing} className={`group flex items-start gap-4 px-6 py-5 hover:bg-slate-50 transition-colors duration-200 ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <div className={`flex-shrink-0 mt-1 h-2.5 w-2.5 rounded-full ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">{timing}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{condition}</p>
                  </div>
                  <span className={`flex-shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${badge}`}>{refund}</span>
                </div>
              ))}
            </div>

            {/* Policy quote */}
            <div className="mt-4 relative overflow-hidden rounded-xl border-l-4 border-amber-400 bg-amber-50 px-5 py-4">
              <p className="text-xs text-amber-900 leading-relaxed italic">
                &ldquo;Users may cancel their bookings free of charge within 24 hours of making the reservation, provided the cancellation occurs at least 72 hours before the scheduled check-in time.&rdquo;
              </p>
              <p className="mt-1.5 text-[10px] text-amber-700 font-semibold not-italic">— Cancellation Policy §2.1 · Free Cancellation Period</p>
            </div>

            {/* How to cancel */}
            <div className="mt-4 flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-xl px-5 py-4">
              <Info className="h-4 w-4 text-slate-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700 leading-relaxed">
                <strong>How to cancel:</strong> Use the <em>&ldquo;Cancel Booking&rdquo;</em> option in your account dashboard, or email <a href="mailto:info@nolsaf.com" className="underline font-semibold text-[#02665e]">info@nolsaf.com</a> from your registered address. You'll receive an email confirmation with refund details and a cancellation reference number.
              </p>
            </div>
          </section>

          {/* ── After check-in ─────────────────────────────────────────────── */}
          <section className="mt-12">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 sm:p-8 text-white mb-6">
              <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
              <div className="relative z-10 flex items-start gap-4">
                <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black">After check-in — refunds are rare</h2>
                  <p className="mt-1.5 text-sm text-slate-300 max-w-xl leading-relaxed">
                    Once you have checked in, your booking is considered active. Early departure does not automatically qualify for any refund. The only exceptions are genuine, verifiable emergencies as listed below.
                  </p>
                </div>
              </div>
              {/* Policy quote inside dark strip */}
              <div className="relative z-10 mt-5 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                <p className="text-xs text-slate-300 italic leading-relaxed">
                  &ldquo;Once a User has checked in to their booked accommodation, the booking is considered active, and no refunds will be offered for unused nights or services after the booking has commenced… early departure does not automatically qualify for any refund, and all requests will be subject to strict evaluation.&rdquo;
                </p>
                <p className="mt-1.5 text-[10px] text-slate-400 font-semibold not-italic">— Cancellation Policy §3.1 · After Check-In General Policy</p>
              </div>
            </div>

            <h3 className="text-base font-bold text-gray-900 mb-4">Exceptional circumstances considered for post-check-in refunds</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {EXCEPTIONAL.map(({ icon: Icon, label, detail, color }) => (
                <div key={label} className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-5">
                  <div className="absolute inset-x-0 top-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-t-2xl"
                    style={{ backgroundColor: color }} />
                  <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: `${color}18` }}>
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <p className="text-sm font-bold text-gray-900">{label}</p>
                  <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Policy quote — no guarantee */}
            <div className="mt-5 relative overflow-hidden rounded-xl border-l-4 border-red-400 bg-red-50 px-5 py-4">
              <p className="text-xs text-red-900 leading-relaxed italic">
                &ldquo;Meeting all requirements does not guarantee approval. NoLSAF reserves the absolute right to deny any request, even if all requirements are met, based on the specific circumstances and evaluation of the claim. Evaluation takes 14–21 business days.&rdquo;
              </p>
              <p className="mt-1.5 text-[10px] text-red-700 font-semibold not-italic">— Cancellation Policy §3.2.6.5 – §3.2.6.6</p>
            </div>

            {/* What doesn't qualify */}
            <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <h4 className="text-sm font-bold text-gray-900">What does NOT qualify as an exceptional circumstance</h4>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {[
                  "Change of plans or personal preference",
                  "Work obligations or business emergencies",
                  "Extended family bereavement (non-immediate)",
                  "Financial difficulty",
                  "Transport delays (unless from declared disaster)",
                  "Minor illness or pre-existing conditions",
                  "Inconvenient weather (non-declared disaster)",
                  "Personal or social events (weddings, reunions)",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <XCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Group Stay cancellation specifics ─────────────────────────── */}
          <section className="mt-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Group Stay cancellations</h2>
                <p className="text-sm text-gray-500">Stricter terms apply — review before booking.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {[
                { icon: CheckCircle2, color: "#7c3aed", label: "Free cancellation window", detail: "May be reduced to 14+ days before check-in (vs the standard 24-hour grace). Exact window is specified in your booking confirmation." },
                { icon: CheckCircle2, color: "#7c3aed", label: "Partial refunds — >30 days out", detail: "Cancellations made more than 30 days before check-in may be eligible for a partial refund. The precise amount depends on the terms agreed at booking." },
                { icon: XCircle,      color: "#ef4444", label: "No refund — within 30 days", detail: "Cancellations within 30 days of check-in are typically non-refundable or subject to significant penalties." },
                { icon: XCircle,      color: "#ef4444", label: "Deposits are non-refundable", detail: "Non-refundable deposits paid to secure a group booking will not be returned regardless of cancellation timing, unless the booking agreement specifies otherwise." },
                { icon: CheckCircle2, color: "#7c3aed", label: "Date changes — 60+ days notice", detail: "Changes to check-in dates must be requested at least 60 days before the original check-in date, subject to property availability and owner approval." },
                { icon: CheckCircle2, color: "#7c3aed", label: "Guest-count reductions", detail: "Reducing headcount may forfeit group discounts and trigger rate adjustments. Increases require availability confirmation." },
                { icon: XCircle,      color: "#ef4444", label: "Full group no-show = full charge", detail: "If the entire group fails to check in without prior notification, the full booking amount is charged with no refunds." },
                { icon: Info,         color: "#02665e", label: "All requests must be in writing", detail: "Verbal requests are not accepted for group cancellations. Submit via the platform or email info@nolsaf.com. Allow 5–7 business days processing." },
              ].map(({ icon: Icon, color, label, detail }, i, arr) => (
                <div key={label} className={`group flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors duration-200 ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color }} />
                  <div>
                    <p className="text-sm font-bold text-gray-900">{label}</p>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{detail}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Group policy quote */}
            <div className="mt-4 relative overflow-hidden rounded-xl border-l-4 border-violet-400 bg-violet-50 px-5 py-4">
              <p className="text-xs text-violet-900 leading-relaxed italic">
                &ldquo;Group stay cancellations are subject to stricter terms than individual bookings due to the impact on property owners and the difficulty of rebooking multiple accommodations. The specific cancellation terms for each group stay booking will be clearly communicated at the time of booking.&rdquo;
              </p>
              <p className="mt-1.5 text-[10px] text-violet-700 font-semibold not-italic">— Cancellation Policy §4.2 · Group Stay Cancellation Terms</p>
            </div>
          </section>

          {/* ── Refund timing by payment method ───────────────────────────── */}
          <section className="mt-12">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-[#02b4f5] flex items-center justify-center flex-shrink-0">
                <Banknote className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Refund timeline by payment method</h2>
                <p className="text-sm text-gray-500">Refunds are returned to the original payment method in the original currency.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-3 gap-0 bg-slate-50 border-b border-slate-200 px-6 py-3">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Method</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Timeline</span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Note</span>
              </div>
              {REFUND_TIMING.map(({ method, timing, note }, i, arr) => (
                <div key={method} className={`group grid grid-cols-3 gap-0 px-6 py-4 hover:bg-slate-50 transition-colors duration-200 ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#02665e] flex-shrink-0" />
                    {method}
                  </span>
                  <span className="text-sm text-[#02665e] font-semibold">{timing}</span>
                  <span className="text-xs text-gray-500">{note}</span>
                </div>
              ))}
            </div>

            {/* Quote */}
            <div className="mt-4 relative overflow-hidden rounded-xl border-l-4 border-[#02b4f5] bg-[#f0f9ff] px-5 py-4">
              <p className="text-xs text-slate-700 leading-relaxed italic">
                &ldquo;Eligible refunds will be processed to the original payment method within 5–10 business days after the cancellation is confirmed. The actual time for funds to appear may vary depending on the payment provider. Refunds will be processed in the same currency as the original payment.&rdquo;
              </p>
              <p className="mt-1.5 text-[10px] text-[#0284c7] font-semibold not-italic">— Cancellation Policy §8.1 & §8.3 · Refund Processing</p>
            </div>
          </section>

          {/* ── Owner-initiated cancellations ──────────────────────────────── */}
          <section className="mt-10">
            <div className="group relative overflow-hidden bg-gradient-to-br from-[#f0fdfc] via-white to-[#e8f8ff] rounded-2xl border border-teal-200 shadow-sm p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-[0.6]"
                style={{ backgroundImage: "linear-gradient(#02665e12 1px, transparent 1px), linear-gradient(90deg, #02665e12 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
              <div className="relative z-10 flex items-start gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5 text-[#02665e]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">If the property owner cancels your booking</h3>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed max-w-2xl">
                    In rare circumstances, a property owner may cancel a confirmed booking due to property damage, maintenance, or a double-booking error. If this happens, NoLSAF will notify you immediately and either arrange alternative accommodation of equal or better quality at no extra cost, or issue a <strong>full refund of all amounts paid</strong>.
                  </p>
                  {/* Policy quote */}
                  <div className="mt-4 rounded-xl bg-white border border-teal-200 px-4 py-3">
                    <p className="text-xs text-[#024d47] leading-relaxed italic">
                      &ldquo;In rare circumstances, property owners may need to cancel a confirmed booking… NoLSAF will notify the User immediately and work to find alternative accommodation of similar or better quality at no additional cost. If no suitable alternative is available, Users will receive a full refund of all amounts paid.&rdquo;
                    </p>
                    <p className="mt-1.5 text-[10px] text-[#02665e] font-semibold not-italic">— Cancellation Policy §9.1 · Owner-Initiated Cancellations</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── CTA ───────────────────────────────────────────────────────── */}
          <div className="group mt-8 relative overflow-hidden bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#02665e]/30 hover:-translate-y-1 transition-all duration-300 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#02665e18_0%,_transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-[#02665e]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Still unsure about your specific booking?</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md">
                  Read the full Cancellation Policy or contact support — include your booking reference for faster help.
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap gap-3 flex-shrink-0">
              <Link href="/cancellation-policy" className="no-underline inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-gray-700 px-5 py-2.5 text-sm font-semibold hover:border-[#02665e]/40 hover:text-[#02665e] hover:gap-3 transition-all duration-200 shadow-sm">
                Full policy <ChevronRight className="h-4 w-4" />
              </Link>
              <a href="mailto:info@nolsaf.com" className="no-underline inline-flex items-center gap-2 rounded-xl bg-[#02665e] text-white px-5 py-2.5 text-sm font-semibold hover:bg-[#024d47] hover:gap-3 transition-all duration-200 shadow-md">
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
