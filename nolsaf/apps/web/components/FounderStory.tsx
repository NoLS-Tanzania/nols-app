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
                  NoLSAF offers curated verified comprehensive accommodations that provide our customers with budgetary freedom. We collaborate with reliable local partners and offer integrated payment options, all combined with single-click bookings, transport, and tourism. This enables both local and international visitors to easily plan safe and affordable trips, enjoying the freedom of choice in their travel experiences.
                </p>

                <blockquote className="mt-5 relative overflow-hidden rounded-2xl px-5 py-5" style={{ background: 'linear-gradient(135deg,#02665e,#024d47)' }}>
                  {/* Giant decorative quote */}
                  <div aria-hidden className="pointer-events-none select-none absolute -top-5 -left-1 text-[120px] font-black leading-none" style={{ color: 'rgba(255,255,255,0.07)', fontFamily: 'Georgia, serif' }}>&ldquo;</div>
                  {/* Subtle dot-grid texture */}
                  <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
                  {/* Top shimmer line */}
                  <div aria-hidden className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <div className="relative z-10">
                    {/* Label row */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="h-px w-5 bg-white/30" aria-hidden />
                      <span className="text-[10px] font-black tracking-[0.28em] uppercase text-white/50">In one line</span>
                      <span className="h-px flex-1 bg-white/10" aria-hidden />
                    </div>
                    {/* Quote text */}
                    <p className="italic text-sm sm:text-[15px] leading-relaxed text-white/90 font-light">
                      We believe that everyone deserves an easy and friendly way to travel, explore, and connect with new cultures through a single platform that offers comprehensive, end-to-end service.
                    </p>
                  </div>
                  {/* Bottom shimmer line */}
                  <div aria-hidden className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
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
