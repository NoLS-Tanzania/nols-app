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
        <article className="rounded-lg border bg-white p-6 shadow-md flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-1/3 flex-shrink-0">
            <Image src={imageSrc} alt="Founder" width={420} height={420} className="rounded-md object-cover w-full h-44 md:h-64" />
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-semibold">Founder’s statement</h3>
            <p className="mt-2 text-sm text-slate-700">NoLSAF offers curated verified comprehensive accommodations that provide our customers with budgetary freedom. We collaborate with reliable local partners and offer integrated payment options, all combined with single-click bookings, transport, and logistics. This enables both local and international visitors to easily plan safe and affordable trips, enjoying the freedom of choice in their travel experiences.</p>

            <blockquote className="mt-4 border-l-4 border-emerald-200 pl-4 italic text-slate-600">We believe that everyone deserves an easy and friendly way to travel, explore, and connect with new cultures through a single platform that offers comprehensive, end-to-end service.</blockquote>

            {/* Story shown in full per design */}
          </div>
        </article>
      </div>
    </section>
  );
}
