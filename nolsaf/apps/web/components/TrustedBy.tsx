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
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 lg:gap-3 xl:gap-2 whitespace-nowrap py-2">
          {brands.map((b, i) => (
            b.href ? (
              <a 
                key={i} 
                href={b.href} 
                className="inline-flex items-center justify-center opacity-80 hover:opacity-100 transition group"
                title={b.name}
              >
                {b.logoUrl ? (
                  <div className="h-6 w-16 sm:h-7 sm:w-20 md:h-8 md:w-24 lg:h-7 lg:w-20 xl:h-6 xl:w-[4.5rem] bg-white border border-gray-200 rounded-lg p-0.5 sm:p-1 flex items-center justify-center hover:border-emerald-500 transition-colors">
                    <Image 
                      src={b.logoUrl} 
                      alt={`${b.name} logo`} 
                      width={80} 
                      height={32} 
                      className="h-full w-full object-contain" 
                    />
                  </div>
                ) : (
                  <span className="text-sm sm:text-base font-semibold text-gray-700">{b.name}</span>
                )}
              </a>
            ) : (
              <span 
                key={i} 
                className="inline-flex items-center justify-center opacity-80 group"
                title={b.name}
              >
                {b.logoUrl ? (
                  <div className="h-6 w-16 sm:h-7 sm:w-20 md:h-8 md:w-24 lg:h-7 lg:w-20 xl:h-6 xl:w-[4.5rem] bg-white border border-gray-200 rounded-lg p-0.5 sm:p-1 flex items-center justify-center">
                    <Image 
                      src={b.logoUrl} 
                      alt={`${b.name} logo`} 
                      width={80} 
                      height={32} 
                      className="h-full w-full object-contain" 
                    />
                  </div>
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
