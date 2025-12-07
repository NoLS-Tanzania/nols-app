"use client";
import React from "react";
import Image from "next/image";

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
};

export default function TrustedBy({ title = "Trusted by", brands, className = "", hideTitle = false }: Props) {
  return (
    <section className={`w-full ${className}`} aria-label={hideTitle ? "Trusted brands" : "Trusted by"}>
      {hideTitle ? null : (
        <div className="flex items-center justify-center gap-3 mb-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          <h2 className="text-sm font-semibold tracking-wide text-gray-900 uppercase">{title}</h2>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        </div>
      )}
      <div className="overflow-hidden">
        <div className="flex items-center gap-6 sm:gap-8 whitespace-nowrap py-2">
          {brands.map((b, i) => (
            b.href ? (
              <a key={i} href={b.href} className="inline-flex items-center gap-2 opacity-80 hover:opacity-100 transition">
                {b.logoUrl ? (
                  <Image src={b.logoUrl} alt={`${b.name} logo`} width={120} height={40} className="h-6 sm:h-8 w-auto" />
                ) : (
                  <span className="text-sm sm:text-base font-semibold text-gray-700">{b.name}</span>
                )}
              </a>
            ) : (
              <span key={i} className="inline-flex items-center gap-2 opacity-80">
                {b.logoUrl ? (
                  <Image src={b.logoUrl} alt={`${b.name} logo`} width={120} height={40} className="h-6 sm:h-8 w-auto" />
                ) : (
                  <span className="text-sm sm:text-base font-semibold text-gray-700">{b.name}</span>
                )}
              </span>
            )
          ))}
        </div>
      </div>
    </section>
  );
}
