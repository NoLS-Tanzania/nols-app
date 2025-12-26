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
      <div className="w-full mt-8 mb-3">
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

      {/* Clean, spacious logo wall (no moving marquee) */}
      <div className="max-w-6xl mx-auto px-4 pb-6">
        <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur p-5 sm:p-6 shadow-sm">
          <TrustedBy brands={brands} hideTitle layout="grid" />
        </div>
      </div>
    </section>
  );
}
