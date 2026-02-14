"use client";

import React from 'react';
import Image from 'next/image';
// Link removed — story shown inline; keep import removed to avoid unused symbol

type Props = {
  imageSrc?: string;
};

export default function FounderStory({ imageSrc = '/assets/Founder.jpg' }: Props) {
  return (
    <section className="mt-8">
      <div className="public-container">
        <article className="relative overflow-hidden rounded-3xl p-[1px] bg-gradient-to-br from-white/85 via-slate-200/45 to-emerald-200/35 ring-1 ring-slate-200/70 shadow-[0_22px_70px_rgba(2,6,23,0.10)]">
          <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/70 backdrop-blur-xl">
            <div
              className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_18%_14%,rgba(2,180,245,0.14),transparent_52%),radial-gradient(circle_at_90%_86%,rgba(2,102,94,0.12),transparent_56%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-55 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.78)_48%,rgba(255,255,255,0.30)_52%,transparent_100%)]"
              aria-hidden
            />

            <div className="relative p-4 sm:p-6 md:p-7 flex flex-col sm:flex-row gap-5 sm:gap-6 md:gap-7 items-start">
              <div className="w-full sm:w-1/3 md:w-[28%] lg:w-[22%] flex-shrink-0 max-w-[220px] sm:max-w-none mx-auto sm:mx-0">
                <div className="relative rounded-3xl p-[1px] bg-gradient-to-br from-white/80 via-slate-200/55 to-emerald-200/45 ring-1 ring-slate-200/70 shadow-[0_18px_55px_rgba(2,6,23,0.12)]">
                  <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/60">
                    <Image
                      src={imageSrc}
                      alt="Founder"
                      width={360}
                      height={360}
                      className="object-cover w-full h-auto aspect-square"
                      priority={false}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/25 via-transparent to-transparent" aria-hidden />
                  </div>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center rounded-full bg-[#02665e]/8 ring-1 ring-[#02665e]/18 px-3 py-1 text-[#02665e] text-[11px] font-semibold tracking-wide">
                  Our story
                </div>
                <h3 className="mt-3 text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">Founder’s statement</h3>

                <p className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed">
                  NoLSAF offers curated verified comprehensive accommodations that provide our customers with budgetary freedom. We collaborate with reliable local partners and offer integrated payment options, all combined with single-click bookings, transport, and logistics. This enables both local and international visitors to easily plan safe and affordable trips, enjoying the freedom of choice in their travel experiences.
                </p>

                <blockquote className="mt-5 rounded-2xl border border-white/70 bg-white/60 backdrop-blur px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ring-1 ring-slate-200/70">
                  <div className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">In one line</div>
                  <p className="mt-2 italic text-sm sm:text-[15px] text-slate-700 leading-relaxed">
                    We believe that everyone deserves an easy and friendly way to travel, explore, and connect with new cultures through a single platform that offers comprehensive, end-to-end service.
                  </p>
                </blockquote>

                {/* Story shown in full per design */}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
