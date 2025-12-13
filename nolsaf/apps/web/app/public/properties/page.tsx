"use client";

import React, { useState } from 'react';
import PropertyCard from '../../../components/PropertyCard';
import AttentionBlink from '../../../components/AttentionBlink';
import SectionSeparator from '../../../components/SectionSeparator';

type Props = { searchParams?: { [key: string]: string | undefined } };


function parseList(v?: string) {
  if (!v) return [];
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

export default function PropertiesPage({ searchParams }: Props) {
  const q = (searchParams?.q || '').trim().toLowerCase();
  const minPrice = searchParams?.minPrice ? Number(searchParams.minPrice) : undefined;
  const maxPrice = searchParams?.maxPrice ? Number(searchParams.maxPrice) : undefined;
  const region = searchParams?.region;
  const district = searchParams?.district;
  const state = searchParams?.state;
  const amenities = parseList(searchParams?.amenities);
  const types = parseList(searchParams?.types);
  const checkIn = searchParams?.checkIn;
  const checkOut = searchParams?.checkOut;

  const results: Array<any> = [];

  return (
    <>
      <main className="min-h-screen bg-white text-slate-900 header-offset">
        <section className="py-8">
          <div className="public-container">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold">{q ? `Search results for "${searchParams?.q}"` : 'All properties'}</h1>
            </div>

            <SectionSeparator pillLabel="Now" className="my-4" />

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {results.map((p) => (
                <PropertyGridItem key={p.id} p={p} />
              ))}
            </div>

            <SectionSeparator className="mt-8" />
          </div>
        </section>
      </main>
    </>
  );
}

function PropertyGridItem({ p }: { p: any }) {
  const [blink, setBlink] = useState(false);
  const cardHref = p.href || `/public/properties/${p.id}`;

  return (
    <div
      className="group"
      onPointerEnter={() => setBlink(true)}
      onPointerLeave={() => setBlink(false)}
      onFocus={() => setBlink(true)}
      onBlur={() => setBlink(false)}
    >
      <div className="transition-transform duration-200 group-hover:scale-[1.01]"> 
        <PropertyCard title={p.title} description={''} href={cardHref} imageSrc={p.imageUrl} />
      </div>

      {/* custom description placed close to the card */}
      <div className="mt-2 text-left">
        {p.category ? (
          <a
            href={cardHref}
            className="flex items-center justify-between gap-3 text-sm no-underline group-hover:text-slate-900"
            aria-label={`Open list of all ${p.category}s`}
          >
            <span className="truncate text-xs uppercase tracking-wide text-slate-600 font-semibold">{`All ${p.category}s`}</span>

            {p.count ? (
              <AttentionBlink active={blink}>
                <span className="ml-2 inline-flex items-center justify-center text-sm italic text-[#065a53] bg-[#e6f6f4] ring-1 ring-[#cfeee8] rounded-full px-2 py-0.5">{p.count}</span>
              </AttentionBlink>
            ) : (
              <span className="ml-2 inline-block text-sm text-slate-500">—</span>
            )}
          </a>
        ) : (
          <span className="text-sm font-semibold text-slate-900 block">{p.location}</span>
        )}
      </div>
    </div>
  );
}
