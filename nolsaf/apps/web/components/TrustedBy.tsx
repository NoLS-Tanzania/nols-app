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
};

function BrandTile({ b }: { b: Brand }) {
  const content = b.logoUrl ? (
    <div
      className={[
        "w-full",
        // Fixed height prevents tall logos getting clipped by layout quirks
        "h-16 sm:h-20",
        "bg-white border border-slate-200 rounded-2xl",
        "px-4 py-3",
        "flex items-center justify-center",
        "shadow-sm",
      ].join(" ")}
    >
      {/* Use plain img to support admin-uploaded remote URLs without next/image domain config */}
      <img
        src={b.logoUrl}
        alt={`${b.name} logo`}
        className="block object-contain"
        // Inline styles win over broad global rules (e.g. `.public-container * { max-width: 100% }`)
        style={{
          maxHeight: 56,
          maxWidth: 180,
          width: "auto",
          height: "auto",
        }}
        loading="lazy"
        decoding="async"
      />
    </div>
  ) : (
    <span className="text-sm font-semibold text-slate-700">{b.name}</span>
  );

  const baseClass =
    "inline-flex items-center justify-center opacity-95 hover:opacity-100 transition-all duration-200 " +
    "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] " +
    "focus:outline-none focus:ring-2 focus:ring-emerald-200 rounded-2xl";

  return b.href ? (
    <a
      href={b.href}
      target="_blank"
      rel="noopener noreferrer"
      className={baseClass}
      title={b.name}
      aria-label={`${b.name} (opens in new tab)`}
    >
      <span className="group">{content}</span>
    </a>
  ) : (
    <span className="inline-flex items-center justify-center opacity-90" title={b.name}>
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
}: Props) {
  return (
    <section className={`w-full ${className}`} aria-label={hideTitle ? "Trusted brands" : "Trusted by"}>
      {hideTitle ? null : (
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">{title}</h2>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        </div>
      )}
      {layout === "grid" ? (
        <div
          className="grid gap-4 py-2"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
        >
          {brands.map((b) => (
            <BrandTile key={`${b.name}-${b.href ?? "na"}`} b={b} />
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
              <BrandTile b={b} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
