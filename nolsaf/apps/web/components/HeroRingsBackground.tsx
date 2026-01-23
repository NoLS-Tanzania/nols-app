"use client";

import React from "react";

export type HeroRingsMode = "stays" | "transport" | "host";
export type HeroRingsVariant = "card" | "full";

function modeAccent(mode: HeroRingsMode) {
  switch (mode) {
    case "transport":
      return {
        glow: "rgba(34,211,238,0.24)",
        stroke: "rgba(34,211,238,0.85)",
        soft: "rgba(34,211,238,0.18)",
      };
    case "host":
      return {
        glow: "rgba(167,139,250,0.22)",
        stroke: "rgba(196,181,253,0.78)",
        soft: "rgba(167,139,250,0.16)",
      };
    default:
      return {
        glow: "rgba(56,189,248,0.24)",
        stroke: "rgba(56,189,248,0.82)",
        soft: "rgba(34,197,94,0.12)",
      };
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
  const accent = modeAccent(mode);
  const uid = React.useId();
  const softGlowId = `${uid}-softGlow`;
  const ringGradId = `${uid}-ringGrad`;
  const blurGlowId = `${uid}-blurGlow`;
  const softShadowId = `${uid}-softShadow`;

  // Small inline “grain” svg (no external assets)
  const noiseSvg =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='.22'/%3E%3C/svg%3E";

  return (
    <div
      className={[
        "relative",
        "overflow-hidden",
        "bg-[#070b14]",
        variant === "card" ? "rounded-3xl" : "rounded-none",
        variant === "card"
          ? "[mask-image:radial-gradient(circle_at_50%_40%,black_0%,black_58%,transparent_74%)]"
          : "[mask-image:none]",
        className || "",
      ].join(" ")}
      aria-hidden
    >
      {/* Base vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_70%_70%,rgba(2,132,199,0.10),transparent_55%),radial-gradient(circle_at_90%_55%,rgba(0,0,0,0.65),transparent_60%)]" />

      {/* Rings */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 900 700"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <radialGradient id={softGlowId} cx="70%" cy="60%" r="70%">
            <stop offset="0%" stopColor={accent.glow} />
            <stop offset="45%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>

          <linearGradient id={ringGradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent.stroke} stopOpacity={0.15} />
            <stop offset="55%" stopColor={accent.stroke} stopOpacity={0.95} />
            <stop offset="100%" stopColor={accent.stroke} stopOpacity={0.18} />
          </linearGradient>

          <filter id={blurGlowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" />
          </filter>

          <filter id={softShadowId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* big soft aura */}
        <rect width="900" height="700" fill={`url(#${softGlowId})`} />

        {/* ring system (centered right) */}
        <g transform="translate(635 385)">
          <circle r="240" fill="none" stroke={`url(#${ringGradId})`} strokeWidth="10" strokeLinecap="round" strokeDasharray="360 1140" className="hrb-spin-1" />
          <circle r="190" fill="none" stroke={`url(#${ringGradId})`} strokeWidth="7" strokeLinecap="round" strokeDasharray="260 980" className="hrb-spin-2" opacity="0.9" />
          <circle r="145" fill="none" stroke={`url(#${ringGradId})`} strokeWidth="6" strokeLinecap="round" strokeDasharray="220 840" className="hrb-spin-3" opacity="0.78" />
          <circle r="105" fill="none" stroke={accent.stroke} strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" strokeDasharray="120 660" className="hrb-spin-4" />

          {/* inner highlight arc */}
          <path
            d="M 0 -105 A 105 105 0 0 1 90 -55"
            fill="none"
            stroke={accent.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            filter={`url(#${blurGlowId})`}
            opacity="0.85"
          />

          {/* floating glyph dots */}
          <g className="hrb-float">
            <g transform="translate(150 -120)">
              <circle r="12" fill="rgba(8,12,22,0.70)" stroke={accent.stroke} strokeOpacity="0.55" />
              <circle r="18" fill="none" stroke={accent.stroke} strokeOpacity="0.20" filter={`url(#${softShadowId})`} />
              <text
                x="0"
                y="5"
                textAnchor="middle"
                fontSize="14"
                fill={accent.stroke}
                opacity="0.9"
                fontFamily="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial"
              >
                ₮
              </text>
            </g>

            <g transform="translate(-20 155)">
              <circle r="12" fill="rgba(8,12,22,0.70)" stroke={accent.stroke} strokeOpacity="0.55" />
              <circle r="18" fill="none" stroke={accent.stroke} strokeOpacity="0.20" filter={`url(#${softShadowId})`} />
              <text
                x="0"
                y="5"
                textAnchor="middle"
                fontSize="14"
                fill={accent.stroke}
                opacity="0.9"
                fontFamily="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial"
              >
                $ 
              </text>
            </g>

            <g transform="translate(215 35)">
              <circle r="12" fill="rgba(8,12,22,0.70)" stroke={accent.stroke} strokeOpacity="0.55" />
              <circle r="18" fill="none" stroke={accent.stroke} strokeOpacity="0.20" filter={`url(#${softShadowId})`} />
              <text
                x="0"
                y="5"
                textAnchor="middle"
                fontSize="14"
                fill={accent.stroke}
                opacity="0.9"
                fontFamily="ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial"
              >
                ₿
              </text>
            </g>
          </g>
        </g>
      </svg>

      {/* Grain overlay */}
      <div
        className={[
          "absolute inset-0 mix-blend-overlay",
          variant === "card" ? "opacity-[0.18]" : "opacity-[0.14]",
        ].join(" ")}
        style={{
          backgroundImage: `url(${noiseSvg})`,
          backgroundRepeat: "repeat",
          backgroundSize: "180px 180px",
        }}
      />

      {/* Soft glass highlight */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,0.10),transparent_40%),radial-gradient(circle_at_30%_85%,rgba(34,197,94,0.07),transparent_45%)]" />

      {/* Full-bleed edge darkening (helps it feel like a hero page) */}
      {variant === "full" ? (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_25%,rgba(0,0,0,0.15),transparent_50%),radial-gradient(circle_at_85%_55%,rgba(0,0,0,0.55),transparent_62%),linear-gradient(to_bottom,rgba(2,6,23,0.55),rgba(2,6,23,0.25),rgba(2,6,23,0.75))]" />
      ) : null}

      <style jsx>{`
        @keyframes hrb-rot {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes hrb-rot2 {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }
        @keyframes hrb-float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
          100% {
            transform: translateY(0px);
          }
        }

        .hrb-spin-1 {
          transform-origin: 0px 0px;
          animation: hrb-rot 16s linear infinite;
        }
        .hrb-spin-2 {
          transform-origin: 0px 0px;
          animation: hrb-rot2 20s linear infinite;
        }
        .hrb-spin-3 {
          transform-origin: 0px 0px;
          animation: hrb-rot 24s linear infinite;
        }
        .hrb-spin-4 {
          transform-origin: 0px 0px;
          animation: hrb-rot2 30s linear infinite;
        }
        .hrb-float {
          transform-origin: 0px 0px;
          animation: hrb-float 6s ease-in-out infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .hrb-spin-1,
          .hrb-spin-2,
          .hrb-spin-3,
          .hrb-spin-4,
          .hrb-float {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
