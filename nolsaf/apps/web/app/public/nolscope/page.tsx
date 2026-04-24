import NolScopeEstimator from "@/components/NolScopeEstimator";
import { Calculator, FileCheck, MapPin, Route, Sparkles, Telescope } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Trip Cost Estimator | NoLScope",
  description:
    "Instantly estimate your Tanzania safari, beach or cultural trip cost. Covers visa fees, park fees, transport, activities, and accommodation.",
};

const STATS = [
  { value: "8",    label: "Destinations",       icon: MapPin      },
  { value: "47+",  label: "Visa rules covered",  icon: FileCheck   },
  { value: "12",   label: "Transport routes",    icon: Route       },
  { value: "Free", label: "No sign-up needed",   icon: Sparkles    },
];

export default function NolScopePage() {
  return (
    <main className="min-h-screen bg-slate-50">

      {/* ── Hero — constrained to public-container, rounded corners ── */}
      <section className="public-container pt-4 pb-0">
        <div
          style={{
            background: [
              "repeating-linear-gradient(135deg,rgba(255,255,255,0.04) 0px,rgba(255,255,255,0.04) 14px,transparent 14px,transparent 28px)",
              "linear-gradient(135deg,#02665e 0%,#014d47 55%,#013d38 100%)",
            ].join(","),
          }}
          className="relative overflow-hidden rounded-2xl"
        >
          {/* subtle radial glow */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 60% 40%,rgba(255,255,255,0.07) 0%,transparent 70%)",
            }}
          />

          {/* content */}
          <div className="relative px-6 pt-12 pb-14 text-center text-white">

            {/* large decorative telescope — background watermark, right-aligned */}
            <div
              className="pointer-events-none absolute right-6 top-1/2 -translate-y-1/2 opacity-[0.07]"
              style={{ transform: "translateY(-50%) rotate(-18deg)" }}
              aria-hidden
            >
              <Telescope className="w-52 h-52 text-white" strokeWidth={1} />
            </div>

            {/* badge with calculator icon */}
            <span className="inline-flex items-center gap-1.5 mb-5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold tracking-widest text-white/80">
              <Calculator className="w-3 h-3 text-emerald-300" strokeWidth={2.5} />
              NoLScope &mdash; Cost Estimator
            </span>

            {/* headline */}
            <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight mb-3">
              Plan your Tanzania trip.
              <br />
              <span className="text-white/65 font-medium">Know the real cost upfront.</span>
            </h1>

            {/* sub */}
            <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed">
              Instant, itemised estimates covering visa fees, park entrance, transport,
              activities and accommodation &mdash; no sign-up required.
            </p>

            {/* stats grid — each tile has an icon */}
            <div className="mt-8 grid grid-cols-4 gap-3 max-w-lg mx-auto">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center gap-1 bg-white/10 border border-white/10 rounded-xl py-3 px-1"
                >
                  <s.icon className="w-4 h-4 text-emerald-300/70" strokeWidth={1.75} />
                  <span className="text-xl font-black text-white leading-none">{s.value}</span>
                  <span className="text-[10px] text-white/55 text-center leading-tight">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Estimator — same public-container as header/footer ── */}
      <section className="public-container py-10 pb-24">
        <NolScopeEstimator />
      </section>

    </main>
  );
}
