import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maintenance | NoLSAF",
  description: "NoLSAF is currently undergoing scheduled maintenance.",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #020d1a 0%, #031a2e 50%, #042a1e 100%)" }}
    >
      {/* Ambient glow blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #0ea5a0 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl"
        style={{ background: "radial-gradient(circle, #02665e 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-lg text-center space-y-10">

        {/* Brand wordmark */}
        <div className="flex flex-col items-center gap-3">
          <span
            className="text-2xl font-extrabold tracking-widest"
            style={{ color: "#0ea5a0", letterSpacing: "0.2em" }}
          >
            NoLSAF
          </span>
          <div className="w-12 h-px" style={{ background: "linear-gradient(90deg, transparent, #0ea5a0, transparent)" }} />
        </div>

        {/* Animated icon */}
        <div className="flex justify-center">
          <div
            className="relative w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(14,165,160,0.15), rgba(2,102,94,0.1))",
              border: "1px solid rgba(14,165,160,0.25)",
              boxShadow: "0 0 40px rgba(14,165,160,0.15), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* Spinning ring */}
            <div
              className="absolute inset-0 rounded-full animate-spin"
              style={{
                border: "2px solid transparent",
                borderTopColor: "#0ea5a0",
                borderRightColor: "rgba(14,165,160,0.3)",
                animationDuration: "3s",
              }}
            />
            {/* Gear icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-12 h-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#0ea5a0"
              strokeWidth={1.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Scheduled Maintenance
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-sm mx-auto">
            We&apos;re making improvements to deliver you a better experience.
            The platform will be back online shortly.
          </p>
        </div>

        {/* Status pills */}
        <div
          className="rounded-2xl p-6 space-y-4 text-left"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            backdropFilter: "blur(8px)",
          }}
        >
          <StatusRow
            color="#facc15"
            pulse
            label="System maintenance in progress"
          />
          <div className="w-full h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
          <StatusRow color="#0ea5a0" label="All bookings and data are safe" />
          <StatusRow color="#0ea5a0" label="Service will resume shortly" />
        </div>

        {/* Social proof strip */}
        <div className="flex items-center justify-center gap-6 text-white/20 text-xs">
          <span>🌍 East Africa&apos;s travel platform</span>
          <span className="w-1 h-1 rounded-full bg-white/20" />
          <span>Verified stays & transport</span>
        </div>

        {/* Contact */}
        <p className="text-white/30 text-sm">
          Urgent enquiries?{" "}
          <a
            href="mailto:support@nolsaf.com"
            className="font-medium underline underline-offset-4 transition-colors"
            style={{ color: "#0ea5a0" }}
          >
            support@nolsaf.com
          </a>
        </p>
      </div>
    </div>
  );
}

function StatusRow({
  color,
  pulse,
  label,
}: {
  color: string;
  pulse?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`w-2.5 h-2.5 rounded-full shrink-0${pulse ? " animate-pulse" : ""}`}
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span className="text-white/70 text-sm">{label}</span>
    </div>
  );
}
