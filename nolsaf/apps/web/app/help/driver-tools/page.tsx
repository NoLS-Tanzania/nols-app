import Link from "next/link";
import {
  Car,
  ClipboardList,
  Bell,
  UserCircle2,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Headphones,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Star,
  Clock3,
  Smartphone,
  CalendarCheck,
  Radio,
  Plane,
  Users,
  Navigation,
  Zap,
  BadgeCheck,
  Sparkles,
} from "lucide-react";

import LayoutFrame from "@/components/LayoutFrame";
import { HelpFooter, HelpHeader } from "../HelpChrome";
import HelpBackLink from "../HelpBackLink";

const SERVICE_TYPES = [
  {
    icon: CalendarCheck,
    title: "Scheduled Transfers",
    tag: "Pre-booked",
    tagColor: "#02b4f5",
    description:
      "A guest books a specific pick-up time in advance. Once the booking is confirmed, it becomes available for drivers to claim interest in through the Driver Portal. Multiple drivers can claim the same trip — the NoLSAF system then selects the most suitable driver based on its own criteria. Full trip details are visible before you claim, so you always know what you're committing to.",
    how: [
      "Open the Driver Portal — available scheduled trips are listed with pick-up time, destination, and guest details",
      "Claim your interest in a trip — other drivers may claim the same trip simultaneously",
      "The NoLSAF system evaluates all claims and assigns the trip to the selected driver automatically",
      "If selected, you are notified and the guest receives your name, photo, and vehicle plate",
      "Arrive a minimum of 5 minutes before the scheduled pick-up time",
      "Validate the guest's booking code at pick-up — this officially starts the trip and records your earnings",
    ],
    color: "#02b4f5",
  },
  {
    icon: Radio,
    title: "Dispatch (On-Demand)",
    tag: "Live dispatch",
    tagColor: "#a78bfa",
    description:
      "NoLSAF dispatches you in real time based on your current location and availability status. Speed of acceptance matters — assignments are offered to the nearest available driver first.",
    how: [
      "Set your status to \"Available\" in the Driver Portal before going on shift",
      "Dispatch notification arrives — you have a short window to accept",
      "Navigate to pick-up using the in-app directions",
      "Validate booking code on arrival to begin the trip",
    ],
    color: "#a78bfa",
  },
  {
    icon: Plane,
    title: "Airport & Terminal Transfers",
    tag: "High-value",
    tagColor: "#02665e",
    description:
      "These are time-sensitive assignments tied to flight or bus arrivals. You will receive flight/bus details so you can monitor arrival times. A sign with the guest's name is expected at the terminal.",
    how: [
      "Assignment includes flight number and terminal details",
      "Monitor the arrival status — delays update automatically in your portal",
      "Meet the guest at the arrivals gate with a visible name sign",
      "Validate booking code before departing the terminal",
    ],
    color: "#02665e",
  },
  {
    icon: Users,
    title: "Group & Tour Travel",
    tag: "Multi-passenger",
    tagColor: "#f59e0b",
    description:
      "Assigned for groups, family transfers, or curated tour itineraries. These may involve multiple stops, waiting time, and an extended booking duration. Vehicle capacity must match the group size.",
    how: [
      "Assignment specifies group size, stops, and total expected duration",
      "Confirm your vehicle can accommodate the group before accepting",
      "Waiting time between stops is tracked and compensated",
      "Final code validation happens at the last drop-off point",
    ],
    color: "#f59e0b",
  },
];

const NOLSAF_EDGE = [
  { icon: Navigation, title: "Live guest tracking",     description: "Guests can follow your live location from the moment you accept — building trust before you even arrive." },
  { icon: BadgeCheck, title: "Verified driver identity",  description: "Every driver on NoLSAF is identity-verified. Guests see your name, photo, and vehicle plate before the trip — no surprises." },
  { icon: Zap,        title: "Instant earning records",  description: "Your earnings for each trip are logged the moment the booking code is validated — no end-of-week mystery." },
  { icon: Sparkles,   title: "Rating-based priority",   description: "Drivers with consistently high ratings are prioritised for premium assignments, airport runs, and group tours." },
];

const PORTAL_FEATURES = [
  {
    step: "01",
    icon: ClipboardList,
    title: "Assignments & schedules",
    description: "View all your active and upcoming trip assignments in real time. Schedules update automatically — always check before starting your shift.",
    color: "#02b4f5",
  },
  {
    step: "02",
    icon: Bell,
    title: "Notifications & updates",
    description: "All communications from NoLSAF come through the portal. Keep push notifications enabled so you never miss a booking change or urgent alert.",
    color: "#a78bfa",
  },
  {
    step: "03",
    icon: UserCircle2,
    title: "Profile management",
    description: "Keep your vehicle details, license information, and contact info up to date. Inaccurate profiles can lead to missed assignments.",
    color: "#02665e",
  },
  {
    step: "04",
    icon: ShieldCheck,
    title: "Security settings",
    description: "Set up two-factor authentication, update your password, and review active sessions. Your account security protects your earnings.",
    color: "#f59e0b",
  },
];

const BEST_PRACTICES = [
  { icon: Clock3,    text: "Log in before every shift to check for last-minute assignment updates or schedule changes." },
  { icon: MapPin,    text: "Keep location permissions enabled on your device during active trips so guests can track progress." },
  { icon: Star,      text: "Maintain a high service rating — it directly influences your assignment priority and bonus eligibility." },
  { icon: Smartphone,text: "Use the latest version of the portal app. Outdated versions may miss critical features or notifications." },
  { icon: CheckCircle2, text: "Complete your profile fully — missing vehicle or license details can pause your assignments." },
  { icon: AlertCircle, text: "Never accept off-platform payments. All earnings are processed through NoLSAF — this protects you and the guest." },
];

export default function HelpDriverToolsPage() {
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
                  <Car className="h-3.5 w-3.5 text-[#02b4f5]" />
                  <span className="text-white/90">Driver Hub</span>
                </div>
                <h1 className="text-3xl sm:text-[2.5rem] font-extrabold leading-[1.15] tracking-tight">
                  Your tools &amp;{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#02b4f5] to-[#4dd9ac]">
                    best practices
                  </span>
                </h1>
                <p className="mt-4 text-white/60 text-sm sm:text-base leading-relaxed max-w-lg">
                  Everything you need to manage your assignments, stay on top of notifications, and deliver a great experience through the NoLSAF Driver Portal.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/driver"
                    className="no-underline inline-flex items-center gap-2 rounded-xl bg-[#02b4f5] text-[#010f0e] px-5 py-2.5 text-sm font-bold hover:brightness-110 hover:gap-3 transition-all duration-200 shadow-lg shadow-[#02b4f5]/20"
                  >
                  Open Driver Portal <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/help/driver-earnings"
                    className="no-underline inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 text-white px-5 py-2.5 text-sm font-semibold hover:bg-white/18 hover:gap-3 transition-all duration-200"
                  >
                    Driver earnings <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
              {/* right: key stats */}
              <div className="hidden lg:flex flex-col gap-3 min-w-[200px]">
                {[
                  { icon: ClipboardList, label: "Assignments",   value: "Real-time",    color: "#02b4f5" },
                  { icon: Bell,          label: "Notifications", value: "Instant alerts",color: "#a78bfa" },
                  { icon: TrendingUp,    label: "Earnings",      value: "Tracked live",  color: "#4dd9ac" },
                  { icon: ShieldCheck,   label: "Account",       value: "2FA available", color: "#f59e0b" },
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

          {/* ── Service types ─────────────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-[#02b4f5] flex items-center justify-center flex-shrink-0">
                <Car className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">What you&apos;ll be doing</h2>
                <p className="text-sm text-gray-500">NoLSAF operates four service modes. Understanding each one is the key to performing well and earning more.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {SERVICE_TYPES.map(({ icon: Icon, title, tag, tagColor, description, how, color }) => (
                <div key={title} className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 group cursor-default">
                  <div
                    className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"
                    style={{ background: `linear-gradient(to right, ${color}, #02665e)` }}
                  />
                  <div className="p-5 pb-0">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="h-11 w-11 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all duration-300"
                        style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}
                      >
                        <Icon className="h-5 w-5" style={{ color }} />
                      </div>
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide rounded-full px-2.5 py-1 border"
                        style={{ color: tagColor, backgroundColor: `${tagColor}12`, borderColor: `${tagColor}30` }}
                      >{tag}</span>
                    </div>
                    <h3 className="font-extrabold text-gray-900 text-base">{title}</h3>
                    <p className="mt-1.5 text-xs text-gray-500 leading-relaxed">{description}</p>
                  </div>
                  <div className="mt-4 border-t border-slate-100 px-5 py-4 bg-slate-50/60 group-hover:bg-slate-50 transition-colors duration-200">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">How it works</p>
                    <ol className="space-y-2">
                      {how.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span
                            className="flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-black mt-0.5"
                            style={{ backgroundColor: `${color}18`, color }}
                          >{i + 1}</span>
                          <span className="text-xs text-gray-600 leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── The NoLSAF edge ───────────────────────────────────────── */}
          <section className="mt-10 relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="absolute inset-0 bg-[#010f0e]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_100%_0%,_#02b4f525_0%,_transparent_65%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_0%_100%,_#02665e35_0%,_transparent_60%)]" />
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{ backgroundImage: "radial-gradient(circle,#ffffff 1px,transparent 1px)", backgroundSize: "20px 20px" }}
            />
            <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex items-center gap-3 mb-7">
                <div className="h-9 w-9 rounded-xl bg-[#02b4f5] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#02b4f5]/30">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-white">The NoLSAF difference</h2>
                  <p className="text-sm text-white/50">What makes driving with NoLSAF different from anything else.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {NOLSAF_EDGE.map(({ icon: Icon, title, description }) => (
                  <div key={title} className="relative overflow-hidden bg-white/[0.06] border border-white/10 rounded-2xl p-5 hover:bg-white/[0.11] hover:-translate-y-1 transition-all duration-300 group cursor-default">
                    <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left bg-gradient-to-r from-[#02b4f5] to-[#4dd9ac]" />
                    <div className="h-9 w-9 rounded-xl bg-[#02b4f5]/15 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200">
                      <Icon className="h-4 w-4 text-[#02b4f5]" />
                    </div>
                    <h3 className="font-bold text-white text-sm">{title}</h3>
                    <p className="mt-1.5 text-[11px] text-white/50 leading-relaxed">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Driver Portal features ─────────────────────────────────── */}
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 rounded-lg bg-[#02665e] flex items-center justify-center flex-shrink-0">
                <ClipboardList className="h-4 w-4 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">In the Driver Portal</h2>
                <p className="text-sm text-gray-500">Your central hub for managing every aspect of your driver work on NoLSAF.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PORTAL_FEATURES.map(({ step, icon: Icon, title, description, color }) => (
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

          {/* ── Best practices ────────────────────────────────────────── */}
          <section className="mt-10 relative overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-[#f0fdfc] via-white to-[#e8f8ff]" />
            <div
              className="absolute inset-0"
              style={{ backgroundImage: "linear-gradient(to right,#02665e0a 1px,transparent 1px),linear-gradient(to bottom,#02665e0a 1px,transparent 1px)", backgroundSize: "32px 32px", opacity: 0.4 }}
            />
            <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex items-center gap-3 mb-7">
                <div className="h-9 w-9 rounded-xl bg-[#02b4f5] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#02b4f5]/30">
                  <Star className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Best practices for drivers</h2>
                  <p className="text-sm text-gray-500">Follow these habits to maintain top performance and maximise your earnings.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {BEST_PRACTICES.map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-start gap-3 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-default"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left bg-gradient-to-r from-[#02b4f5] to-[#02665e]" />
                    <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center group-hover:bg-[#02665e]/20 transition-colors duration-200">
                      <Icon className="h-4 w-4 text-[#02665e] group-hover:scale-110 transition-transform duration-200" />
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Earnings link card ────────────────────────────────────── */}
          <section className="mt-10">
            <Link
              href="/help/driver-earnings"
              className="no-underline group flex items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5 hover:-translate-y-1 hover:shadow-xl hover:border-[#02b4f5]/30 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 rounded-xl bg-[#02b4f5]/10 flex items-center justify-center group-hover:bg-[#02b4f5]/20 transition-colors duration-200 flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-[#02b4f5] group-hover:scale-110 transition-transform duration-200" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 group-hover:text-[#02b4f5] transition-colors duration-200">Driver Earnings</p>
                  <p className="text-xs text-gray-500 mt-0.5">Understand how your earnings are calculated, tracked, and paid out.</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#02b4f5] flex-shrink-0 transition-colors duration-200" />
            </Link>
          </section>

          {/* ── Support alert ─────────────────────────────────────────── */}
          <div className="mt-5 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>Having trouble with an assignment or your account?</strong> Contact support immediately at{" "}
              <a href="mailto:info@nolsaf.com" className="no-underline font-semibold text-amber-900 hover:underline">info@nolsaf.com</a>{" "}
              and include your name, vehicle details, and the booking or assignment reference number.
            </p>
          </div>

          {/* ── CTA ───────────────────────────────────────────────────── */}
          <div className="group mt-6 relative overflow-hidden bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-[#02665e]/30 hover:-translate-y-1 transition-all duration-300 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_#02665e18_0%,_transparent_65%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative z-10 flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center">
                <Headphones className="h-5 w-5 text-[#02665e]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Need more help?</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md">
                  Browse the Help Center or reach our support team directly — we&apos;re here to keep you on the road.
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
