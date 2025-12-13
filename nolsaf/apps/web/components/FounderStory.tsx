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
        <article className="rounded-lg border bg-white p-4 sm:p-5 md:p-6 shadow-md flex flex-col sm:flex-row gap-4 sm:gap-5 md:gap-6 items-start">
          <div className="w-full sm:w-1/3 md:w-1/4 lg:w-1/5 flex-shrink-0 max-w-[180px] sm:max-w-[200px] md:max-w-[240px] mx-auto sm:mx-0">
            <Image src={imageSrc} alt="Founder" width={240} height={240} className="rounded-md object-cover w-full h-auto aspect-square" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Founder’s statement</h3>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">NoLSAF offers curated verified comprehensive accommodations that provide our customers with budgetary freedom. We collaborate with reliable local partners and offer integrated payment options, all combined with single-click bookings, transport, and logistics. This enables both local and international visitors to easily plan safe and affordable trips, enjoying the freedom of choice in their travel experiences.</p>

            <blockquote className="mt-4 sm:mt-5 border-l-4 border-emerald-200 pl-4 italic text-sm sm:text-base text-slate-600 leading-relaxed">We believe that everyone deserves an easy and friendly way to travel, explore, and connect with new cultures through a single platform that offers comprehensive, end-to-end service.</blockquote>

            {/* Story shown in full per design */}
          </div>
        </article>
      </div>
    </section>
  );
}
