import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  ChevronRight,
  FileCheck,
  LifeBuoy,
  MapPin,
  Send,
  ShieldCheck,
  Star,
  UserCheck,
  Zap,
} from "lucide-react";

import LayoutFrame from "@/components/LayoutFrame";
import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

const STEPS = [
  {
    step: "01",
    icon: Send,
    title: "Submit your application",
    detail:
      "Fill in the agent application form with your personal details, location, languages spoken, and a short motivation. No prior experience is required — just commitment and professionalism.",
  },
  {
    step: "02",
    icon: FileCheck,
    title: "Background review",
    detail:
      "The NoLSAF team reviews your application within 3–5 business days. You may be contacted for a short interview or asked to provide a national ID. All information is kept confidential.",
  },
  {
    step: "03",
    icon: BookOpen,
    title: "Onboarding & training",
    detail:
      "On approval you get access to the Agent Portal and complete a short module covering platform tools, booking processes, commission structure, and the code of conduct.",
  },
  {
    step: "04",
    icon: Star,
    title: "Activated & assigned",
    detail:
      "Your agent account goes live. You are officially named a NoLSAF Agent, appear in the internal directory, and start receiving assignments and referral opportunities in your area.",
  },
];

const WHAT_YOU_DO = [
  { icon: UserCheck, text: "Refer guests to the platform and earn commission on every confirmed booking" },
  { icon: MapPin,    text: "Act as the on-the-ground NoLSAF contact for your region or district" },
  { icon: BadgeCheck,text: "Assist guests with bookings, check-in support, and general queries" },
  { icon: Zap,       text: "Receive and manage assignments through the Agent Portal dashboard" },
  { icon: ShieldCheck,text: "Represent NoLSAF professionally at all times under a code of conduct" },
  { icon: Star,      text: "Build your rating top agents get priority assignments and higher-value bookings" },
];

export default function HelpBecomeAgentPage() {
  return (
    <>
      <HelpHeader />
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        <div className="public-container py-8 sm:py-12">
          <HelpBackLink />

          {/* ── Hero ─────────────────────────────────────────────── */}
          <div className="mt-4 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#010f0e] via-[#011520] to-[#021f2c] text-white p-8 sm:p-10">
            <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
              style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
            <div className="pointer-events-none absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-20"
              style={{ background: "radial-gradient(circle, #02b4f5 0%, transparent 70%)" }} />
            <div className="pointer-events-none absolute bottom-0 left-0 w-64 h-64 rounded-full blur-3xl opacity-10"
              style={{ background: "radial-gradient(circle, #4dd9ac 0%, transparent 70%)" }} />

            <div className="relative z-10 grid sm:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#02b4f5] mb-4">
                  <UserCheck className="h-3 w-3" /> For Agents
                </div>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
                  Become a<br />NoLSAF Agent.
                </h1>
                <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                  Represent NoLSAF in your area, refer guests, assist with bookings, and earn a commission on every confirmed stay you help secure.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/careers?role=agent"
                    className="no-underline inline-flex items-center gap-2 rounded-xl bg-[#02b4f5] text-[#010f0e] px-5 py-2.5 text-sm font-bold hover:brightness-110 hover:gap-3 transition-all duration-200 shadow-lg shadow-[#02b4f5]/20">
                    Apply now <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Commission-based",   sub: "Earn on every booking you close" },
                  { label: "Agent Portal",        sub: "Dashboard, assignments & tracking" },
                  { label: "Your own area",       sub: "Work in your region or district" },
                  { label: "Flexible hours",      sub: "Work around your schedule" },
                ].map(({ label, sub }) => (
                  <div key={label} className="rounded-xl bg-white/8 border border-white/12 p-4 backdrop-blur-sm">
                    <BadgeCheck className="h-5 w-5 text-[#02b4f5] mb-2" />
                    <p className="text-xs font-bold text-white leading-snug">{label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── What you'll do ───────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-8 w-8 rounded-lg bg-[#02b4f5] flex items-center justify-center flex-shrink-0">
                <UserCheck className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">What NoLSAF Agents do</h2>
                <p className="text-sm text-gray-500">Your responsibilities as an active agent.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {WHAT_YOU_DO.map(({ icon: Icon, text }) => (
                <div key={text} className="group flex items-start gap-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-[#02b4f5]/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                    <Icon className="h-4 w-4 text-[#02b4f5]" />
                  </div>
                  <p className="text-xs text-gray-700 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Process steps ────────────────────────────────────── */}
          <section className="mt-10">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#f0fdfc] via-white to-[#e8f8ff] border border-teal-200 p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 opacity-40"
                style={{ backgroundImage: "linear-gradient(#02665e12 1px, transparent 1px), linear-gradient(90deg, #02665e12 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

              <div className="relative z-10 mb-6">
                <h2 className="text-xl font-bold text-gray-900">How to become a NoLSAF Agent</h2>
                <p className="text-sm text-gray-500 mt-0.5">Four stages from application to your first assignment.</p>
              </div>

              <div className="relative z-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {STEPS.map(({ step, icon: Icon, title, detail }) => (
                  <div key={step} className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-5 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-default">
                    <div className="absolute inset-x-0 top-0 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-t-2xl bg-[#02b4f5]" />
                    <span className="absolute right-4 top-3 text-[3.5rem] font-black leading-none select-none pointer-events-none opacity-[0.06] text-[#02b4f5]">{step}</span>
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-3 bg-[#02b4f5]/10 group-hover:scale-110 transition-transform duration-200">
                      <Icon className="h-4 w-4 text-[#02b4f5]" />
                    </div>
                    <p className="text-sm font-bold text-gray-900">{title}</p>
                    <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{detail}</p>
                  </div>
                ))}
              </div>

              <div className="relative z-10 mt-5 flex items-center gap-3 bg-white/80 border border-[#02b4f5]/20 rounded-xl px-5 py-3">
                <BadgeCheck className="h-4 w-4 text-[#02b4f5] flex-shrink-0" />
                <p className="text-xs text-gray-600">
                  Once activated, your <strong className="text-gray-900">Agent ID</strong> is tied to every booking you refer — this is how your commission is tracked and paid automatically.
                </p>
              </div>
            </div>
          </section>

          {/* ── CTA ──────────────────────────────────────────────── */}
          <div className="group mt-8 relative overflow-hidden bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#02b4f5]/30 hover:-translate-y-1 transition-all duration-300 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#02b4f518_0%,_transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#02b4f5]/10 flex items-center justify-center">
                <LifeBuoy className="h-5 w-5 text-[#02b4f5]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Ready to join the NoLSAF Agent network?</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md">
                  Submit your application today and our team will be in touch within 3–5 business days.
                </p>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap gap-3 flex-shrink-0">
              <Link href="/help/payouts"
                className="no-underline inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white text-gray-700 px-5 py-2.5 text-sm font-semibold hover:border-[#02b4f5]/40 hover:text-[#02b4f5] hover:gap-3 transition-all duration-200 shadow-sm">
                All opportunities <ChevronRight className="h-4 w-4" />
              </Link>
              <Link href="/careers?role=agent"
                className="no-underline inline-flex items-center gap-2 rounded-xl bg-[#02b4f5] text-white px-5 py-2.5 text-sm font-bold hover:brightness-110 hover:gap-3 transition-all duration-200 shadow-md">
                Apply now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

        </div>
      </div>
      <HelpFooter />
    </>
  );
}
