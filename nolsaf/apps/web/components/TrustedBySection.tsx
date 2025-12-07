"use client";
import React from "react";
import TrustedBy, { Brand } from "./TrustedBy";

type Props = {
  brands: Brand[];
  className?: string;
};

export default function TrustedBySection({ brands, className = "" }: Props) {
  return (
    <section className={`w-full ${className}`} aria-label="Trusted by section">
      <div className="w-full mt-4 mb-2">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="flex-1 h-px bg-slate-300" />
            <div className="mx-4 flex items-center gap-2">
              <div className="inline-flex items-center bg-white/90 px-3 py-1 rounded-full shadow-sm border border-slate-200">
                <span className="text-sm font-semibold text-slate-800">Trusted by</span>
              </div>
            </div>
            <div className="flex-1 h-px bg-slate-300" />
          </div>
        </div>
      </div>

      <div className="w-full overflow-hidden">
        <style>
          {`
            @keyframes nolsaf-marquee {
              0% { transform: translateX(-50%); }
              100% { transform: translateX(0%); }
            }
          `}
        </style>
        <div className="relative">
          <div className="flex items-center gap-10 animate-[nolsaf-marquee_18s_linear_infinite] will-change-transform">
            <div className="min-w-full flex justify-center">
              <div className="max-w-6xl w-full px-4">
                <TrustedBy brands={brands} hideTitle />
              </div>
            </div>
            <div className="min-w-full flex justify-center">
              <div className="max-w-6xl w-full px-4">
                <TrustedBy brands={brands} hideTitle />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
