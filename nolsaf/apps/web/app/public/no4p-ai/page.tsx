import type { Metadata } from "next";
import Link from "next/link";
import No4PAIDemoCard from "../../../components/no4p-ai/No4PAIDemoCard";
import {
  Cpu,
  ShieldCheck,
  Route,
  BarChart3,
  Users,
  Building2,
  Car,
  Lock,
  ClipboardCheck,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "No4P AI",
  description:
    "No4P AI is the intelligence layer inside NoLS Africa—designed to help customers, owners, and drivers use sophisticated technology while pursuing their goals.",
};

function GlowCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative rounded-3xl">
      {/* outer glow ring */}
      <div className="pointer-events-none absolute -inset-[1px] rounded-3xl bg-gradient-to-r from-emerald-400/35 via-sky-400/25 to-fuchsia-400/30 opacity-70 blur-[1px] transition-opacity duration-300 group-hover:opacity-100" />
      {/* inner border */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/10" />
      <div className="relative rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl transition duration-300 group-hover:-translate-y-1 group-hover:border-white/20 group-hover:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white ring-1 ring-white/15 transition duration-300 group-hover:bg-slate-800">
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white">
              {title}
            </h3>
            {subtitle ? (
              <p className="mt-1 text-sm text-white/70">{subtitle}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 text-sm leading-6 text-white/80">{children}</div>
      </div>
    </div>
  );
}

export default function No4PAIPage() {
  return (
    <main
      className="relative min-h-screen bg-white text-slate-900 header-offset"
    >
      {/* Hero */}
      <section className="pt-0 pb-8 -mt-6">
      <div className="public-container">
        <div className="relative rounded-3xl p-[1px] shadow-2xl shadow-emerald-500/10">
          <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-400/35 via-sky-400/20 to-fuchsia-400/25" />
          <section className="relative overflow-hidden rounded-3xl bg-[#050B10] ring-1 ring-white/10 text-slate-50">
            <div className="relative h-[360px] sm:h-[440px]">
              <div className="pointer-events-none absolute inset-0">
                {/* ambient gradients (tailwind-native classes, high contrast) */}
                <div className="absolute -top-48 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
                <div className="absolute top-24 left-10 h-72 w-72 rounded-full bg-sky-500/15 blur-3xl" />
                <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-rose-500/10 blur-3xl" />

                {/* darkening overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/70 to-black" />

                {/* AI-tech overlay (hex icons + central AI tile) */}
                <div className="absolute inset-0">
                  {/* starfield (subtle, lighting effect) */}
                  <div className="absolute inset-0 nols-ai-stars opacity-25" />

                  {/* faint hex pattern */}
                  <svg
                    className="absolute inset-0 h-full w-full nols-ai-hex-drift"
                    viewBox="0 0 1200 520"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <pattern id="hex" width="84" height="72" patternUnits="userSpaceOnUse">
                        <path
                          d="M42 6 L73 24 L73 48 L42 66 L11 48 L11 24 Z"
                          fill="none"
                          stroke="rgba(255,255,255,0.10)"
                          strokeWidth="1"
                        />
                      </pattern>
                    </defs>
                    <rect width="1200" height="520" fill="url(#hex)" opacity="0.55" />
                  </svg>

                  {/* center network line */}
                  <div className="absolute left-1/2 top-[54%] h-px w-[min(960px,92vw)] -translate-x-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  <div className="absolute left-1/2 top-[54%] h-px w-[min(760px,84vw)] -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-300/35 to-transparent blur-[0.5px]" />

                  {/* scan line */}
                  <div className="absolute -inset-x-24 top-[36%] h-px bg-gradient-to-r from-transparent via-sky-300/45 to-transparent blur-[0.5px] nols-ai-scan" />

                  {/* orbit system (visual focus ring + central tile) */}
                  <div className="absolute left-1/2 top-[54%] h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2">
                    <div className="pointer-events-none absolute inset-0 rounded-full border border-white/10" />
                    <div className="pointer-events-none absolute inset-6 rounded-full border border-white/10" />

                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="relative">
                        <div className="pointer-events-none absolute -inset-10 rounded-3xl bg-emerald-400/15 blur-2xl" />
                        <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-sky-400/10 blur-xl" />
                        <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/30 bg-slate-950 shadow-2xl shadow-emerald-500/10">
                          <div className="absolute inset-1 rounded-xl border border-white/15" />
                          <div className="absolute -inset-[1px] rounded-2xl ring-1 ring-emerald-300/25" />
                          <span className="font-mono text-xl font-extrabold tracking-[0.22em] text-white/90 animate-pulse-soft">
                            AI
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pb-10 px-4 sm:px-6">
              <div className="mx-auto mt-5 max-w-3xl text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-slate-950 text-white shadow-sm">
                    <Cpu className="h-6 w-6" />
                  </span>
                  <h1 className="text-balance text-center text-4xl font-extrabold tracking-tight sm:text-5xl">
                    No4P AI
                  </h1>
                </div>
                <p className="mt-3 text-pretty text-base leading-7 text-white/80 sm:text-lg">
                  Built in support of Artificial Intelligence so users, owners, and drivers can integrate with sophisticated technology while pursuing their goals.
                </p>
              </div>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  href="/public/plan-with-us#request"
                  className="group relative inline-flex rounded-full p-[1px] no-underline shadow-2xl shadow-emerald-500/10 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-emerald-500/20 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
                >
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400/70 via-sky-400/55 to-fuchsia-400/60 opacity-90" />
                  <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                    <span className="absolute -inset-y-6 left-0 w-24 -translate-x-[140%] rotate-12 bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 blur-sm transition-all duration-700 ease-out group-hover:translate-x-[220%] group-hover:opacity-100" />
                  </span>
                  <span className="relative inline-flex items-center justify-center rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-emerald-950 transition duration-300 group-hover:bg-emerald-400">
                    Plan with us
                  </span>
                </Link>

                <Link
                  href="/public"
                  className="group relative inline-flex rounded-full p-[1px] no-underline transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40"
                >
                  <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-white/20 via-white/10 to-white/20 opacity-90" />
                  <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                    <span className="absolute -inset-y-6 left-0 w-20 -translate-x-[140%] rotate-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 blur-sm transition-all duration-700 ease-out group-hover:translate-x-[220%] group-hover:opacity-100" />
                  </span>
                  <span className="relative inline-flex items-center justify-center rounded-full border border-white/20 bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white/90 transition duration-300 group-hover:bg-slate-900">
                    Explore NoLSAF
                  </span>
                </Link>
              </div>

              <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3">
                {["Operational clarity", "Trusted automation", "Human-in-the-loop"].map((label) => (
                  <div
                    key={label}
                    tabIndex={0}
                    className="group relative rounded-2xl outline-none"
                  >
                    <div className="pointer-events-none absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-emerald-400/25 via-sky-400/15 to-fuchsia-400/20 opacity-60 blur-[0.5px] transition-opacity duration-300 group-hover:opacity-95 group-focus-visible:opacity-95" />
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/10 transition duration-300 group-hover:ring-white/20 group-focus-visible:ring-white/25" />
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white/80 shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:border-white/20 group-hover:bg-slate-900 group-hover:text-white/90 group-focus-visible:-translate-y-0.5 group-focus-visible:border-white/25 group-focus-visible:bg-slate-900 group-focus-visible:text-white/90">
                      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
                        <span className="absolute -inset-y-6 left-0 w-20 -translate-x-[140%] rotate-12 bg-gradient-to-r from-transparent via-white/18 to-transparent blur-sm transition-transform duration-700 ease-out group-hover:translate-x-[220%] group-focus-visible:translate-x-[220%]" />
                      </span>
                      <span className="font-semibold text-white">{label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Personas */}
            <section className="px-4 sm:px-6 py-12">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    Built for every role in the journey
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                    No4P AI strengthens the experience for guests, operators, and the mobility layer—without adding complexity.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-3">
                <GlowCard
                  title="Customers"
                  subtitle="Faster discovery, clearer decisions"
                  icon={<Users className="h-5 w-5" />}
                >
                  <ul className="space-y-2">
                    <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" /><span>Smarter search that matches intent, budget, and comfort.</span></li>
                    <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" /><span>Transparent summaries (what’s included, what’s not, and why).</span></li>
                    <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" /><span>Guidance that reduces back-and-forth and booking friction.</span></li>
                  </ul>
                </GlowCard>

                <GlowCard
                  title="Owners"
                  subtitle="Better operations, better yield"
                  icon={<Building2 className="h-5 w-5" />}
                >
                  <ul className="space-y-2">
                    <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" /><span>Performance insights: demand patterns, pricing signals, occupancy trends.</span></li>
                    <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" /><span>Content & listing guidance to improve conversion quality.</span></li>
                    <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-400" /><span>Automation that still preserves control and approvals.</span></li>
                  </ul>
                </GlowCard>

                <GlowCard
                  title="Drivers"
                  subtitle="Safer routing, smoother work"
                  icon={<Car className="h-5 w-5" />}
                >
                  <ul className="space-y-2">
                    <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400" /><span>Smarter dispatch + routing suggestions to reduce wasted time.</span></li>
                    <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400" /><span>Auction style; choose the routes you can manage and lock your day plan early.</span></li>
                    <li className="flex gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400" /><span>Support and issue escalation that’s fast and structured.</span></li>
                  </ul>
                </GlowCard>
              </div>
            </section>

            {/* Demo */}
            <section className="px-4 sm:px-6 pb-14">
              <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <p className="mb-3 text-xs text-white/55">
                    Workflow summary: request in chat → No4P AI triggers the right action → timelines, notifications, and audit logs update.
                  </p>
                  <No4PAIDemoCard />
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950 p-6">
                  <h3 className="text-lg font-semibold text-white">Integrations that feel native</h3>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    No4P AI connects conversations, reminders, accounting, and route auctions into one operating layer—so actions don’t get lost across tools.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-white/80">
                    <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" /><span>Chat that resolves issues and escalates cleanly when needed.</span></li>
                    <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-sky-400" /><span>Reminders for check-in/out, arrivals, payments, and itinerary steps.</span></li>
                    <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-fuchsia-400" /><span>Invoice claims and payouts with verification + exception handling.</span></li>
                    <li className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-400" /><span>Auction offers captured, validated, and routed for best-fit awards.</span></li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Capabilities */}
            <section className="px-4 sm:px-6 pb-14">
              <div className="rounded-3xl border border-white/15 bg-slate-950 p-6 shadow-2xl md:p-10">
                <h2 className="text-2xl font-bold tracking-tight">
                  Capabilities that show technological advancement
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                  Designed to look premium and feel practical—these are the kinds of integrations that make NoLSAF more intelligent at scale.
                </p>

                <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
                  <div className="lg:col-span-2">
                    <GlowCard
                      title="Smart routing"
                      subtitle="Better ETA and trip efficiency"
                      icon={<Route className="h-5 w-5" />}
                    >
                      Reduce delays with context-aware suggestions and route adjustments.
                    </GlowCard>
                  </div>

                  <div className="lg:col-span-2">
                    <GlowCard
                      title="AI support assistant"
                      subtitle="Fast answers, consistent service"
                      icon={<Cpu className="h-5 w-5" />}
                    >
                      Help customers, owners, and drivers resolve common issues quickly.
                    </GlowCard>
                  </div>

                  <div className="lg:col-span-2">
                    <GlowCard
                      title="Operational analytics"
                      subtitle="Signals you can act on"
                      icon={<BarChart3 className="h-5 w-5" />}
                    >
                      Insights on demand, conversion, pricing performance, and service quality.
                    </GlowCard>
                  </div>

                  <div className="lg:col-span-2 lg:col-start-2">
                    <GlowCard
                      title="Automation with control"
                      subtitle="Approve before execution"
                      icon={<ClipboardCheck className="h-5 w-5" />}
                    >
                      Automate repetitive steps while keeping approvals and audit trails.
                    </GlowCard>
                  </div>

                  <div className="lg:col-span-2 lg:col-start-4">
                    <GlowCard
                      title="Security-first architecture"
                      subtitle="Designed for sensitive workflows"
                      icon={<ShieldCheck className="h-5 w-5" />}
                    >
                      Secure defaults, careful data handling, and guardrails for safe outputs.
                    </GlowCard>
                  </div>

                  <div className="lg:col-span-2 lg:col-start-3">
                    <GlowCard
                      title="Integration-ready core"
                      subtitle="APIs and data pipelines"
                      icon={<Cpu className="h-5 w-5" />}
                    >
                      Built to connect with the tools your team already relies on.
                    </GlowCard>
                  </div>
                </div>
              </div>
            </section>

            {/* Principles */}
            <section className="px-4 sm:px-6 pb-16">
              <h2 className="text-2xl font-bold tracking-tight">
                Trust and governance
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">
                We build AI features with safety, privacy, and accountability as first-class requirements.
              </p>

              <div className="mt-7 grid grid-cols-1 gap-5 md:grid-cols-3">
                <GlowCard
                  title="Privacy"
                  subtitle="Use only what’s necessary"
                  icon={<Lock className="h-5 w-5" />}
                >
                  Data minimization, clear boundaries, and careful access controls.
                </GlowCard>

                <GlowCard
                  title="Reliability"
                  subtitle="Designed for real operations"
                  icon={<ShieldCheck className="h-5 w-5" />}
                >
                  Guardrails, monitoring, and fallbacks so the system behaves predictably.
                </GlowCard>

                <GlowCard
                  title="Human-in-the-loop"
                  subtitle="Assist, don’t replace"
                  icon={<Users className="h-5 w-5" />}
                >
                  AI supports decisions—your team stays in control of outcomes.
                </GlowCard>
              </div>

              <div className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-slate-950 via-slate-950 to-slate-900 p-6 shadow-2xl sm:p-8">
                <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-[min(760px,92vw)] rounded-full bg-emerald-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />

                <div className="relative flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                  <div className="max-w-2xl">
                    <h3 className="text-lg font-semibold text-white">Ready to add No4P AI to your workflow?</h3>
                    <p className="mt-1 text-sm leading-6 text-white/70">
                      Tell us what you’re trying to achieve and we’ll map the right integrations.
                    </p>
                  </div>

                  <Link
                    href="/public/plan-with-us#request"
                    className="no-underline hover:no-underline inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-white/20 transition hover:-translate-y-[1px] hover:bg-white/95 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 active:translate-y-0"
                  >
                    Get started
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </section>

            <div className="h-12" />
          </section>
        </div>
      </div>
      </section>
    </main>
  );
}
