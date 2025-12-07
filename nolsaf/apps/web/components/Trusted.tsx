"use client";
import React from "react";
import TrustedBy, { Brand } from "./TrustedBy";

type Props = {
  brands: Brand[];
  className?: string;
};

export default function Trusted({ brands, className = "" }: Props) {
  return (
    <div className={className}>
      <div className="w-full mt-4 mb-2">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="flex-1 h-px bg-slate-300" />
            <div className="mx-4 flex items-center gap-2">
              <div className="inline-flex items-center bg-white/90 px-3 py-1 rounded-full shadow-sm border border-slate-200">
                <svg className="w-4 h-4 text-emerald-600 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 12 6 12s6-6.75 6-12c0-3.314-2.686-6-6-6z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="8" r="2" fill="currentColor" />
                </svg>
                <span className="text-sm font-semibold text-slate-800">Trusted by</span>
              </div>
            </div>
            <div className="flex-1 h-px bg-slate-300" />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        <TrustedBy brands={brands} />
      </div>
    </div>
  );
}
