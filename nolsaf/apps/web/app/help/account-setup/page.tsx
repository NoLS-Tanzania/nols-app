import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  CheckCircle2,
  ChevronRight,
  Info,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  Phone,
  ShieldCheck,
  Star,
  User,
  UserCheck,
  XCircle,
} from "lucide-react";

import LayoutFrame from "@/components/LayoutFrame";
import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

// ─── Setup steps ────────────────────────────────────────────────────────────
const SETUP_STEPS = [
  {
    step: "01",
    icon: Mail,
    title: "Working email address",
    detail: "Your email is your login and the primary channel for booking confirmations, refund updates, and policy notifications.",
    color: "#02b4f5",
  },
  {
    step: "02",
    icon: Phone,
    title: "Verified phone number",
    detail: "Your phone number is used for OTP confirmations on mobile money payments and urgent booking alerts. Keep it current.",
    color: "#02665e",
  },
  {
    step: "03",
    icon: User,
    title: "Complete your profile",
    detail: "A complete profile — name, location, and contact details — enables faster checkout and allows support to assist you quickly.",
    color: "#a78bfa",
  },
  {
    step: "04",
    icon: UserCheck,
    title: "Accurate information only",
    detail: "You must provide true and complete information during registration and booking. Inaccurate details may result in booking failures or account suspension.",
    color: "#f59e0b",
  },
];

// ─── Security features ───────────────────────────────────────────────────────
const SECURITY_ITEMS = [
  {
    icon: KeyRound,
    label: "Strong, unique password",
    detail: "Use a password you don't reuse on other sites. A strong password is your first line of defence against unauthorised access.",
    color: "#02665e",
  },
  {
    icon: Lock,
    label: "Two-factor authentication (2FA)",
    detail: "Enable 2FA when available for an extra layer of protection. Even if your password is compromised, your account stays locked without the second factor.",
    color: "#02b4f5",
  },
  {
    icon: Bell,
    label: "Monitor login activity",
    detail: "Review your recent login sessions regularly. If you see access you don't recognise, change your password immediately and contact support.",
    color: "#a78bfa",
  },
  {
    icon: LogIn,
    label: "Report unauthorised access immediately",
    detail: "You are responsible for maintaining the confidentiality of your account. If anyone accesses your account without permission, report it to NoLSAF promptly.",
    color: "#ef4444",
  },
];

export default function HelpAccountSetupPage() {
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
                <UserCheck className="h-3 w-3" /> Account Setup
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
                Set up once. Book anywhere.
              </h1>
              <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-xl">
                A well-configured account means faster checkouts, reliable booking alerts, and smoother support. Follow the steps below to get fully set up.
              </p>
            </div>

            {/* Stat pills */}
            <div className="relative z-10 mt-8 flex flex-wrap gap-3">
              {[
                { icon: BadgeCheck, label: "Faster checkout",       sub: "With a complete profile" },
                { icon: ShieldCheck, label: "Account protection",   sub: "Password + 2FA" },
                { icon: Bell,       label: "Real-time updates",     sub: "Via email & SMS" },
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

          {/* ── Setup steps ───────────────────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-[#02665e] flex items-center justify-center flex-shrink-0">
                <UserCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Get your account ready</h2>
                <p className="text-sm text-gray-500">Four things that make every booking smoother.</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {SETUP_STEPS.map(({ step, icon: Icon, title, detail, color }) => (
                <div key={step} className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 p-5">
                  <div className="absolute inset-x-0 top-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-t-2xl"
                    style={{ backgroundColor: color }} />
                  <span className="absolute right-4 top-3 text-[3.5rem] font-black leading-none select-none pointer-events-none opacity-[0.05] group-hover:opacity-[0.10] transition-opacity duration-300"
                    style={{ color }}>{step}</span>
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300"
                    style={{ backgroundColor: `${color}18` }}>
                    <Icon className="h-5 w-5" style={{ color }} />
                  </div>
                  <p className="text-sm font-bold text-gray-900">{title}</p>
                  <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Terms quote: user responsibilities */}
            <div className="mt-4 relative overflow-hidden rounded-xl border-l-4 border-[#02665e] bg-[#f0fdfc] px-5 py-4">
              <p className="text-xs text-[#024d47] leading-relaxed italic">
                &ldquo;Users are responsible for maintaining the confidentiality of their account information, including passwords and account details. Users must report any unauthorized access to their account promptly… Users must provide accurate and complete information during the booking process.&rdquo;
              </p>
              <p className="mt-1.5 text-[10px] text-[#02665e] font-semibold not-italic">— Terms & Conditions §1.9.2a–b · User Responsibilities</p>
            </div>
          </section>

          {/* ── Security section ──────────────────────────────────────────── */}
          <section className="mt-12">
            {/* Dark security header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-[#0a1628] text-white p-6 sm:p-8 mb-5"
              style={{ backgroundImage: "radial-gradient(ellipse at 80% 0%, #02b4f514 0%, transparent 60%)" }}>
              <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
                style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
              <div className="relative z-10 flex items-start gap-4">
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#02b4f5]/20 border border-[#02b4f5]/30 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-[#02b4f5]" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#02b4f5] mb-2">
                    Account security
                  </div>
                  <h2 className="text-xl font-black">Keep your account locked down</h2>
                  <p className="mt-1.5 text-sm text-slate-300 max-w-xl leading-relaxed">
                    Your account holds your booking history, saved payment methods, and personal details. These four steps keep it protected.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {SECURITY_ITEMS.map(({ icon: Icon, label, detail, color }, i, arr) => (
                <div key={label} className={`group flex items-start gap-4 px-6 py-5 hover:bg-slate-50 transition-colors duration-200 cursor-default ${i < arr.length - 1 ? "border-b border-slate-100" : ""}`}>
                  <div className="flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
                    style={{ backgroundColor: `${color}18` }}>
                    <Icon className="h-4 w-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 group-hover:text-[#02665e] transition-colors duration-200">{label}</p>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{detail}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-[#02665e] ml-auto flex-shrink-0 mt-1 transition-colors duration-200" />
                </div>
              ))}
            </div>
          </section>

          {/* ── Your responsibilities ─────────────────────────────────────── */}
          <section className="mt-12">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f0fdfc] via-white to-[#e8f8ff] border border-teal-200 p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-[0.5]"
                style={{ backgroundImage: "linear-gradient(#02665e12 1px, transparent 1px), linear-gradient(90deg, #02665e12 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
              <div className="relative z-10 flex items-start gap-4 mb-5">
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                  <BadgeCheck className="h-5 w-5 text-[#02665e]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Your responsibilities as a user</h2>
                  <p className="text-sm text-gray-500 mt-0.5">These apply every time you use the platform.</p>
                </div>
              </div>

              <div className="relative z-10 grid sm:grid-cols-2 gap-3">
                {[
                  { ok: true,  text: "Provide accurate personal information during registration and booking." },
                  { ok: true,  text: "Keep contact details (email & phone) current for critical notifications." },
                  { ok: true,  text: "Make payments on time in accordance with booking terms." },
                  { ok: true,  text: "Comply with all Terms & Conditions, cancellation policies, and house rules." },
                  { ok: true,  text: "Treat property owners and their accommodation with respect." },
                  { ok: false, text: "Share your login credentials or allow others to book under your account." },
                  { ok: false, text: "Provide false information to circumvent policies or secure a booking fraudulently." },
                  { ok: false, text: "Attempt to make payments or communicate outside the NoLSAF platform." },
                ].map(({ ok, text }) => (
                  <div key={text} className="flex items-start gap-2.5 bg-white rounded-xl border border-slate-200 px-4 py-3">
                    {ok
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      : <XCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                    }
                    <span className="text-xs text-gray-700 leading-relaxed">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Account suspension note ───────────────────────────────────── */}
          <div className="mt-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p><strong>Account suspension or termination.</strong> NoLSAF reserves the right to suspend or terminate accounts that violate the Terms & Conditions — including misuse of the platform, non-payment, or provision of false information. You will be notified of any significant changes to these terms before they take effect.</p>
              <p className="mt-1 italic text-amber-700">&ldquo;NoLSAF reserves the right to terminate the Terms &amp; Conditions if a User violates any part of the agreement, including but not limited to policies regarding payments, cancellations, or appropriate use of the platform.&rdquo; — T&amp;C §1.8.1</p>
            </div>
          </div>

          {/* ── Privacy note ──────────────────────────────────────────────── */}
          <div className="mt-4 flex items-start gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-5">
            <div className="flex-shrink-0 h-9 w-9 rounded-xl bg-violet-50 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-violet-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">Your data is protected</p>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                NoLSAF is committed to safeguarding your personal information. By creating an account you consent to our data practices as outlined in the Privacy Policy. We never sell your data to third parties.
              </p>
            </div>
            <Link href="/privacy" className="no-underline flex-shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 text-violet-700 px-3 py-2 text-xs font-semibold hover:bg-violet-100 transition-colors duration-200">
              Privacy Policy <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* ── CTA ───────────────────────────────────────────────────────── */}
          <div className="group mt-8 relative overflow-hidden bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#02665e]/30 hover:-translate-y-1 transition-all duration-300 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#02665e18_0%,_transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                <Star className="h-5 w-5 text-[#02665e]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Still stuck with your account?</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md">
                  Our support team can help with login issues, profile updates, or account verification.
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap gap-3 flex-shrink-0">
              <Link href="/terms" className="no-underline inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-gray-700 px-5 py-2.5 text-sm font-semibold hover:border-[#02665e]/40 hover:text-[#02665e] hover:gap-3 transition-all duration-200 shadow-sm">
                Terms of Service <ChevronRight className="h-4 w-4" />
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
