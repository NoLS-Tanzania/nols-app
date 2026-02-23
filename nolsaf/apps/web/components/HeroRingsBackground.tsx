"use client";

import React from "react";

export type HeroRingsMode = "stays" | "transport" | "host";
export type HeroRingsVariant = "card" | "full";

// ----- colour palette per mode -----
function modeColors(mode: HeroRingsMode): {
  a: string; b: string;
  ga: string; gb: string;
  dotA: string; dotB: string;
} {
  switch (mode) {
    case "transport":
      return { a: "#22d3ee", b: "#06b6d4", ga: "rgba(6,182,212,0.26)",  gb: "rgba(6,182,212,0.12)",  dotA: "rgba(34,211,238,0.80)",  dotB: "rgba(6,182,212,0.60)"  };
    case "host":
      return { a: "#a78bfa", b: "#8b5cf6", ga: "rgba(139,92,246,0.26)",  gb: "rgba(139,92,246,0.12)", dotA: "rgba(167,139,250,0.80)", dotB: "rgba(139,92,246,0.60)" };
    default:
      return { a: "#38bdf8", b: "#10b981", ga: "rgba(56,189,248,0.26)",   gb: "rgba(16,185,129,0.14)", dotA: "rgba(56,189,248,0.85)",  dotB: "rgba(16,185,129,0.65)" };
  }
}

export default function HeroRingsBackground({
  mode,
  className,
  variant = "card",
}: {
  mode: HeroRingsMode;
  className?: string;
  variant?: HeroRingsVariant;
}) {
  const { a, b, ga, gb, dotA, dotB } = modeColors(mode);
  const uid     = React.useId();
  const coronaId = `${uid}-corona`;
  const glowId   = `${uid}-glow`;
  const blurId   = `${uid}-blur`;
  const ringGId  = `${uid}-ringG`;

  // Off-canvas ring origin â€” bottom-right so only elegant arcs bleed in
  const cx = 900;
  const cy = 580;

  const noiseSvg =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='.20'/%3E%3C/svg%3E";

  // Sparse star-field seed (deterministic so no hydration mismatch)
  const stars: { x: number; y: number; r: number; o: number }[] = [
    { x: 620, y:  45, r: 1.2, o: 0.65 },
    { x: 740, y: 130, r: 0.9, o: 0.50 },
    { x: 680, y: 210, r: 1.4, o: 0.70 },
    { x: 810, y:  80, r: 0.8, o: 0.45 },
    { x: 870, y: 195, r: 1.1, o: 0.55 },
    { x: 590, y: 310, r: 1.0, o: 0.42 },
    { x: 770, y: 340, r: 1.3, o: 0.60 },
    { x: 840, y: 390, r: 0.7, o: 0.35 },
    { x: 700, y: 440, r: 1.2, o: 0.52 },
    { x: 920, y: 290, r: 0.9, o: 0.40 },
    { x: 955, y:  55, r: 1.0, o: 0.48 },
    { x: 545, y: 150, r: 0.8, o: 0.38 },
    { x: 480, y: 260, r: 1.1, o: 0.44 },
    { x: 510, y:  70, r: 0.7, o: 0.32 },
    { x: 780, y: 500, r: 1.3, o: 0.55 },
    { x: 640, y: 520, r: 0.9, o: 0.42 },
    { x: 890, y: 460, r: 1.0, o: 0.50 },
    { x: 960, y: 360, r: 0.8, o: 0.36 },
    { x: 430, y: 180, r: 1.2, o: 0.40 },
    { x: 460, y: 400, r: 0.9, o: 0.38 },
  ];

  return (
    <div
      className={[
        "relative overflow-hidden bg-[#011a16]",
        variant === "card" ? "rounded-3xl" : "",
        className ?? "",
      ].join(" ")}
      aria-hidden
    >
      {/* â”€â”€ Layer 1: ambient colour blobs â”€â”€ */}
      <div
        className="absolute inset-0"
        style={{
          background: [
            `radial-gradient(ellipse 900px 700px at 94% 88%, ${ga}, transparent 60%)`,
            `radial-gradient(ellipse 560px 420px at  6% 12%, ${gb}, transparent 55%)`,
            `radial-gradient(ellipse 420px 340px at 50% 55%, rgba(255,255,255,0.025), transparent 52%)`,
          ].join(","),
        }}
      />

      {/* â”€â”€ Layer 2: orbital ring SVG â”€â”€ */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 700"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Soft corona centred on ring origin */}
          <radialGradient id={coronaId} cx={`${cx / 10}%`} cy={`${cy / 7}%`} r="52%">
            <stop offset="0%"  stopColor={a} stopOpacity="0.28" />
            <stop offset="35%" stopColor={a} stopOpacity="0.10" />
            <stop offset="100%" stopColor={a} stopOpacity="0"   />
          </radialGradient>

          {/* Per-ring crescent gradient */}
          <linearGradient id={ringGId} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={a} stopOpacity="0.05" />
            <stop offset="50%"  stopColor={a} stopOpacity="0.90" />
            <stop offset="100%" stopColor={b} stopOpacity="0.12" />
          </linearGradient>

          {/* Glow filter for nodes */}
          <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="4.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Soft blur for background corona */}
          <filter id={blurId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        {/* Blurred corona blob */}
        <ellipse
          cx={cx} cy={cy} rx="400" ry="340"
          fill={a} fillOpacity="0.10"
          filter={`url(#${blurId})`}
        />

        {/* Soft gradient corona */}
        <ellipse cx={cx} cy={cy} rx="440" ry="360" fill={`url(#${coronaId})`} />

        {/* â”€â”€ Rings (5 from tight to wide) â”€â”€ */}
        {/* Ring 1 â€“ tightest, brightest crescent */}
        <circle
          cx={cx} cy={cy} r="120"
          fill="none"
          stroke={`url(#${ringGId})`} strokeWidth="1.8"
          strokeLinecap="round" strokeDasharray="168 586"
          className="hrb-s1"
        />
        {/* Ring 2 */}
        <circle
          cx={cx} cy={cy} r="210"
          fill="none"
          stroke={`url(#${ringGId})`} strokeWidth="1.4"
          strokeLinecap="round" strokeDasharray="245 1074"
          className="hrb-s2"
        />
        {/* Ring 3 */}
        <circle
          cx={cx} cy={cy} r="320"
          fill="none"
          stroke={b} strokeOpacity="0.44" strokeWidth="1.1"
          strokeLinecap="round" strokeDasharray="275 1732"
          className="hrb-s3"
        />
        {/* Ring 4 */}
        <circle
          cx={cx} cy={cy} r="450"
          fill="none"
          stroke={b} strokeOpacity="0.26" strokeWidth="0.9"
          strokeLinecap="round" strokeDasharray="300 2527"
          className="hrb-s4"
        />
        {/* Ring 5 â€“ outermost, barely visible */}
        <circle
          cx={cx} cy={cy} r="590"
          fill="none"
          stroke={a} strokeOpacity="0.14" strokeWidth="0.7"
          strokeLinecap="round" strokeDasharray="320 3388"
          className="hrb-s5"
        />

        {/* â”€â”€ Glowing orbital nodes â”€â”€ */}
        <g filter={`url(#${glowId})`}>
          {/* Node on ring 1 â€” top */}
          <circle cx={cx}       cy={cy - 120} r="4.2" fill={a}    opacity="0.96" className="hrb-s1" />
          <circle cx={cx}       cy={cy - 120} r="8"   fill={a}    opacity="0.18" className="hrb-s1" />

          {/* Node on ring 2 â€” right side */}
          <circle cx={cx + 210} cy={cy}       r="3.6" fill={b}    opacity="0.88" className="hrb-s2" />
          <circle cx={cx + 210} cy={cy}       r="7"   fill={b}    opacity="0.16" className="hrb-s2" />

          {/* Node on ring 3 â€” lower-left */}
          <circle cx={cx - 40}  cy={cy + 320} r="3.2" fill={dotA} opacity="0.80" className="hrb-s3" />
          <circle cx={cx - 40}  cy={cy + 320} r="6"   fill={dotA} opacity="0.14" className="hrb-s3" />

          {/* Node on ring 4 */}
          <circle cx={cx - 420} cy={cy - 70}  r="2.6" fill={dotB} opacity="0.65" className="hrb-s4" />
        </g>

        {/* â”€â”€ Star field (right half only) â”€â”€ */}
        <g>
          {stars.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={a} opacity={s.o} />
          ))}
        </g>

        {/* â”€â”€ Blueprint scan-lines (horizontal, very faint) â”€â”€ */}
        <g stroke={a} strokeOpacity="0.032" strokeWidth="1">
          {[55, 110, 165, 220, 275, 330, 385, 440, 495, 550, 605].map((y) => (
            <line key={y} x1="380" y1={y} x2="1000" y2={y} />
          ))}
        </g>

        {/* â”€â”€ Vertical accent line from ring origin â”€â”€ */}
        <line
          x1={cx} y1={cy - 600} x2={cx} y2={cy + 80}
          stroke={a} strokeOpacity="0.06" strokeWidth="1"
          strokeDasharray="4 8"
        />
        <line
          x1={cx - 500} y1={cy} x2={cx + 80} y2={cy}
          stroke={a} strokeOpacity="0.06" strokeWidth="1"
          strokeDasharray="4 8"
        />
      </svg>

      {/* â”€â”€ Layer 3: film grain â”€â”€ */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-[0.14]"
        style={{
          backgroundImage: `url(${noiseSvg})`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
        }}
      />

      {/* â”€â”€ Layer 4: top glass sheen â”€â”€ */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_30%_at_50%_0%,rgba(255,255,255,0.10),transparent)]" />

      {/* â”€â”€ Layer 5: bottom fade-to-dark (for full variant) â”€â”€ */}
      {variant === "full" && (
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(5,8,15,0.50),rgba(5,8,15,0.10)_40%,rgba(5,8,15,0.72))]" />
      )}

      <style jsx>{`
        @keyframes hrb-cw  { to { transform: rotate( 360deg); } }
        @keyframes hrb-ccw { to { transform: rotate(-360deg); } }

        .hrb-s1 { transform-origin: ${cx}px ${cy}px; animation: hrb-cw  14s linear infinite; }
        .hrb-s2 { transform-origin: ${cx}px ${cy}px; animation: hrb-ccw 22s linear infinite; }
        .hrb-s3 { transform-origin: ${cx}px ${cy}px; animation: hrb-cw  33s linear infinite; }
        .hrb-s4 { transform-origin: ${cx}px ${cy}px; animation: hrb-ccw 46s linear infinite; }
        .hrb-s5 { transform-origin: ${cx}px ${cy}px; animation: hrb-cw  62s linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .hrb-s1,.hrb-s2,.hrb-s3,.hrb-s4,.hrb-s5 { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
