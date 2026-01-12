"use client";
import React from "react";

export type Brand = {
  name: string;
  logoUrl?: string; // optional if using text-only
  href?: string;
};

type Props = {
  title?: string;
  brands: Brand[];
  className?: string;
  hideTitle?: boolean;
  layout?: "marquee" | "wrap" | "grid";
  /** Max logo height in px (applies to <img>). */
  logoMaxHeight?: number;
  /** Max logo width in px (applies to <img>). */
  logoMaxWidth?: number;
};

function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function safeHref(href?: string): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (!trimmed) return undefined;

  // Allow only https/http to prevent `javascript:` and other schemes from admin input.
  return isSafeExternalUrl(trimmed) ? trimmed : undefined;
}

function safeImgSrc(src?: string): string | undefined {
  if (!src) return undefined;
  const trimmed = src.trim();
  if (!trimmed) return undefined;

  // Allow same-origin/relative images and https/http.
  if (trimmed.startsWith("/")) return trimmed;
  return isSafeExternalUrl(trimmed) ? trimmed : undefined;
}

function BrandTile({ b, logoMaxHeight, logoMaxWidth }: { b: Brand; logoMaxHeight: number; logoMaxWidth: number }) {
  const href = safeHref(b.href);
  const logoSrc = safeImgSrc(b.logoUrl);

  const content = logoSrc ? (
    <div
      className={[
        "w-full",
        // Fixed height prevents tall logos getting clipped by layout quirks
        "h-16 sm:h-20",
        "rounded-2xl",
        "bg-white/80",
        "border border-slate-200",
        "ring-1 ring-slate-200/40",
        "px-4 py-3",
        "flex items-center justify-center",
        "shadow-sm",
        "transition-all duration-300",
        "group-hover:border-slate-300 group-hover:ring-slate-300/50 group-hover:bg-white",
      ].join(" ")}
    >
      {/* Use plain img to support admin-uploaded remote URLs without next/image domain config */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt={`${b.name} logo`}
        className="block object-contain opacity-90 group-hover:opacity-100 transition-opacity duration-300"
        // Inline styles win over broad global rules (e.g. `.public-container * { max-width: 100% }`)
        style={{
          maxHeight: `var(--trusted-logo-max-h)`,
          maxWidth: `var(--trusted-logo-max-w)`,
          width: "auto",
          height: "auto",
        }}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
    </div>
  ) : (
    <span className="text-sm font-semibold text-slate-700" title={b.name}>
      {b.name}
    </span>
  );

  const baseClass =
    "group inline-flex items-center justify-center rounded-2xl " +
    "opacity-95 hover:opacity-100 " +
    "motion-safe:transition-all motion-safe:duration-300 " +
    "hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 " +
    "will-change-transform";

  const tileStyle = {
    // CSS variables keep sizing configurable without scattering magic numbers in multiple places.
    ["--trusted-logo-max-h" as any]: `${logoMaxHeight}px`,
    ["--trusted-logo-max-w" as any]: `${logoMaxWidth}px`,
  };

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={baseClass}
      title={b.name}
      aria-label={`${b.name} (opens in new tab)`}
      style={tileStyle}
    >
      {content}
    </a>
  ) : (
    <span className={baseClass} title={b.name} style={tileStyle}>
      {content}
    </span>
  );
}

export default function TrustedBy({
  title = "Trusted by",
  brands,
  className = "",
  hideTitle = false,
  layout = "wrap",
  logoMaxHeight = 56,
  logoMaxWidth = 180,
}: Props) {
  return (
    <section className={`w-full ${className}`} aria-label={hideTitle ? "Trusted brands" : "Trusted by"}>
      {hideTitle ? null : (
        <div className="flex items-center justify-center gap-3 mb-3">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          <h2 className="text-sm font-semibold tracking-wide text-slate-900 uppercase">{title}</h2>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        </div>
      )}
      {layout === "grid" ? (
        <div
          className="grid gap-4 py-2"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          {brands.map((b) => (
            <BrandTile
              key={`${b.name}-${b.href ?? "na"}`}
              b={b}
              logoMaxHeight={logoMaxHeight}
              logoMaxWidth={logoMaxWidth}
            />
          ))}
        </div>
      ) : (
        <div
          className={[
            "flex items-stretch gap-4 py-2",
            layout === "wrap" ? "flex-wrap justify-center" : "whitespace-nowrap",
          ].join(" ")}
        >
          {brands.map((b) => (
            <div key={`${b.name}-${b.href ?? "na"}`} className="w-[11rem] sm:w-[12rem]">
              <BrandTile b={b} logoMaxHeight={logoMaxHeight} logoMaxWidth={logoMaxWidth} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
