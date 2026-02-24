import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  ChevronRight,
  CircleDollarSign,
  Globe,
  Info,
  Package,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  Star,
  Tag,
  XCircle,
} from "lucide-react";

import LayoutFrame from "@/components/LayoutFrame";
import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

// ─── Checkout line items ────────────────────────────────────────────────────
const CHECKOUT_ITEMS = [
  {
    icon: Banknote,
    label: "Original (base) rate",
    detail: "The listed nightly or per-stay rate for the property — the baseline before any additions.",
    color: "#02665e",
  },
  {
    icon: ReceiptText,
    label: "Service fees",
    detail: "Platform service fees, if applicable, are shown at checkout before you confirm. You will never be surprised after payment.",
    color: "#02b4f5",
  },
  {
    icon: Tag,
    label: "Taxes & property charges",
    detail: "Any taxes or surcharges declared by the property owner are displayed at checkout — e.g. late check-in fees or cleaning fees agreed upfront.",
    color: "#a78bfa",
  },
  {
    icon: Package,
    label: "Included packages",
    detail: "Transport and end-to-end service packages are only added during the booking process. Any inclusive extras must be agreed at the time of reservation.",
    color: "#f59e0b",
  },
];

// ─── Currency rows ──────────────────────────────────────────────────────────
const CURRENCY_ROWS = [
  {
    flag: "🇹🇿",
    label: "Tanzanian Shilling (TZS)",
    sub: "Default currency for all properties in Tanzania",
    note: "Displayed by default",
  },
  {
    flag: "💳",
    label: "International card transactions",
    sub: "Visa, Mastercard, PayPal, Stripe",
    note: "Your bank applies its own exchange rate",
  },
  {
    flag: "📲",
    label: "Mobile money (M-Pesa, Airtel, Tigo, Halo)",
    sub: "Local wallets transact in TZS",
    note: "No conversion required",
  },
];

export default function HelpPricingPage() {
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
                <CircleDollarSign className="h-3 w-3" /> Pricing & Charges
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                No surprises. Ever.
              </h1>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-xl">
                Every charge you pay is based on the original listed price. NoLSAF shows you a complete cost breakdown before you confirm — what you see is what you pay.
              </p>
            </div>

            {/* Stat pills */}
            <div className="relative z-10 mt-8 flex flex-wrap gap-3">
              {[
                { icon: BadgeCheck,        label: "Original price baseline",  sub: "No hidden markup" },
                { icon: Globe,             label: "TZS default currency",     sub: "Local & international" },
                { icon: ShieldCheck,       label: "Full cost shown upfront",  sub: "Before confirmation" },
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

          {/* ── Policy quote: transparency ─────────────────────────────────── */}
          <div className="mt-6 relative overflow-hidden rounded-xl border-l-4 border-[#02665e] bg-[#f0fdfc] px-5 py-4">
            <p className="text-xs text-[#024d47] leading-relaxed italic">
              &ldquo;All charges associated with bookings will be quoted based on the original price. This practice ensures transparency and enables Users to have a clear understanding of the financial obligations involved in their reservations.&rdquo;
            </p>
            <p className="mt-1.5 text-[10px] text-[#02665e] font-semibold not-italic">— NoLSAF Terms & Conditions §1.4 · Pricing and Charges</p>
          </div>

          {/* ── What you'll see at checkout ────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-[#02665e] flex items-center justify-center flex-shrink-0">
                <ReceiptText className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">What you&apos;ll see at checkout</h2>
                <p className="text-sm text-gray-500">Every cost component is itemised before you confirm your booking.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {CHECKOUT_ITEMS.map(({ icon: Icon, label, detail, color }) => (
                <div key={label} className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-5">
                  <div className="absolute inset-x-0 top-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-t-2xl"
                    style={{ backgroundColor: color }} />
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: `${color}18` }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <p className="text-sm font-bold text-gray-900">{label}</p>
                  <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Quote: packages only at booking */}
            <div className="mt-4 relative overflow-hidden rounded-xl border-l-4 border-amber-400 bg-amber-50 px-5 py-4">
              <p className="text-xs text-amber-900 leading-relaxed italic">
                &ldquo;The only packages that NoLSAF will engage with are those added during the booking process… any inclusive services offered alongside the booking must be agreed upon at the time of reservation.&rdquo;
              </p>
              <p className="mt-1.5 text-[10px] text-amber-700 font-semibold not-italic">— Terms & Conditions §1.4.4 · Engagement in Booking Packages</p>
            </div>
          </section>

          {/* ── Currency ──────────────────────────────────────────────────── */}
          <section className="mt-12">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f0fdfc] via-white to-[#e8f8ff] border border-teal-200 p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-[0.5]"
                style={{ backgroundImage: "linear-gradient(#02665e12 1px, transparent 1px), linear-gradient(90deg, #02665e12 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
              <div className="relative z-10 flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                  <Globe className="h-5 w-5 text-[#02665e]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Currency & exchange rates</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Prices default to local currency. International cards may attract conversion fees from your bank.</p>
                </div>
              </div>

              <div className="relative z-10 bg-white rounded-2xl border border-teal-200 shadow-sm overflow-hidden">
                {CURRENCY_ROWS.map(({ flag, label, sub, note }, i, arr) => (
                  <div key={label} className={`group flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors duration-200 ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                    <span className="text-2xl flex-shrink-0">{flag}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{label}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{sub}</p>
                    </div>
                    <span className="flex-shrink-0 rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-[11px] font-semibold text-[#02665e]">{note}</span>
                  </div>
                ))}
              </div>

              {/* Quote: exchange rates */}
              <div className="relative z-10 mt-4 rounded-xl bg-white/80 border border-teal-200 px-4 py-3">
                <p className="text-xs text-[#024d47] leading-relaxed italic">
                  &ldquo;Users shall be informed of the applicable exchange rates at the time of booking if they are transacting in a currency different from the local currency. Users are responsible for any fees associated with converting funds to the required local currency, including any bank charges or processing fees incurred as a result of using international credit/debit cards.&rdquo;
                </p>
                <p className="mt-1.5 text-[10px] text-[#02665e] font-semibold not-italic">— Terms & Conditions §1.5.2 & §1.5.4 · Exchange Rates</p>
              </div>
            </div>
          </section>

          {/* ── Discounts & surcharges ─────────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-[#a78bfa] flex items-center justify-center flex-shrink-0">
                <Tag className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Discounts &amp; surcharges</h2>
                <p className="text-sm text-gray-500">Promotions and extra charges are always shown before you pay.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Promotional discounts</h3>
                </div>
                <ul className="space-y-2">
                  {[
                    "Time-limited promotional rates are clearly flagged on listings.",
                    "Discounts are shown as a reduction from the original price.",
                    "Promotional terms are displayed before checkout so you can make an informed decision.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-amber-50 flex items-center justify-center">
                    <ReceiptText className="h-4 w-4 text-amber-500" />
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">Surcharges</h3>
                </div>
                <ul className="space-y-2">
                  {[
                    "Late check-in fees, cleaning fees, or other surcharges are declared at checkout — never after.",
                    "NoLSAF only covers charges agreed at point of booking.",
                    "Any additional fees charged by the property owner after arrival fall outside NoLSAF's liability.",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Quote: discounts & surcharges */}
            <div className="mt-4 relative overflow-hidden rounded-xl border-l-4 border-violet-400 bg-violet-50 px-5 py-4">
              <p className="text-xs text-violet-900 leading-relaxed italic">
                &ldquo;Any promotional discounts or time-sensitive offers will be clearly communicated, allowing Users to take advantage of cost-saving opportunities while booking. Conversely, any surcharges incurred such as fees for additional services or late check-ins will also be communicated clearly to prevent unforeseen financial implications.&rdquo;
              </p>
              <p className="mt-1.5 text-[10px] text-violet-700 font-semibold not-italic">— Terms & Conditions §1.4.5 · Communication of Discounts and Surcharges</p>
            </div>
          </section>

          {/* ── What NoLSAF doesn't cover ──────────────────────────────────── */}
          <section className="mt-10">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <h3 className="text-base font-bold text-gray-900">What NoLSAF is not responsible for</h3>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { label: "Post-arrival fees", detail: "Cleaning charges, room upgrades, or extra services requested directly from the owner after check-in." },
                  { label: "Off-platform payments", detail: "Any money exchanged outside the NoLSAF platform. Only payments processed through NoLSAF are covered." },
                  { label: "Bank conversion fees", detail: "Charges your bank or card provider applies when converting foreign currency at their rate." },
                  { label: "Third-party transaction fees", detail: "Processing fees charged by payment providers (PayPal, Stripe, etc.) beyond the amount shown at checkout." },
                ].map(({ label, detail }) => (
                  <div key={label} className="flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-900">{label}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quote */}
              <div className="mt-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
                <p className="text-xs text-red-900 leading-relaxed italic">
                  &ldquo;NoLSAF will not be liable for any payments made outside the platform, particularly after the User has arrived at their booked area. Any additional fees such as cleaning fees or service charges will be managed solely by the property Owner.&rdquo;
                </p>
                <p className="mt-1.5 text-[10px] text-red-700 font-semibold not-italic">— Terms & Conditions §1.4.3 · No Liability for External Payments</p>
              </div>
            </div>
          </section>

          {/* ── Rate guarantee note ────────────────────────────────────────── */}
          <div className="mt-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p><strong>Rates can change if your balance is unpaid.</strong> If you book with a deposit and do not settle the remaining balance within the stated window (typically 24 hours), NoLSAF cannot guarantee the original rate on rebooking. The rate in effect at the time of re-confirmation applies.</p>
              <p className="mt-1"><strong>Prices on listings reflect live published rates.</strong> Promotions and availability are subject to change — the price locked at the moment you confirm your booking is the price you pay.</p>
            </div>
          </div>

          {/* ── CTA ───────────────────────────────────────────────────────── */}
          <div className="group mt-8 relative overflow-hidden bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#02665e]/30 hover:-translate-y-1 transition-all duration-300 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#02665e18_0%,_transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-[#02665e]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Questions about a specific price?</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md">
                  Share the property name and your travel dates and our team will clarify the breakdown.
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap gap-3 flex-shrink-0">
              <Link href="/help/payments" className="no-underline inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-gray-700 px-5 py-2.5 text-sm font-semibold hover:border-[#02665e]/40 hover:text-[#02665e] hover:gap-3 transition-all duration-200 shadow-sm">
                Payment methods <RefreshCcw className="h-4 w-4" />
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
