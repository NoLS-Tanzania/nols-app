"use client";

import React, { useState } from 'react';
import PropertyCard from '../../../components/PropertyCard';
import AttentionBlink from '../../../components/AttentionBlink';
import SectionSeparator from '../../../components/SectionSeparator';

type Props = { searchParams?: { [key: string]: string | undefined } };

const MOCK_PROPERTIES: Array<any> = [
  { id: 't1', title: 'All Villas', category: 'Villa', count: 98, href: '/public/properties?types=Villa', imageUrl: '/assets/villa.jpg' },
  { id: 't2', title: 'All Apartments', category: 'Apartment', count: 640, href: '/public/properties?types=Apartment', imageUrl: '/assets/Apartments.jpg' },
  { id: 't3', title: 'All Hotels', category: 'Hotel', count: 1912, href: '/public/properties?types=Hotel', imageUrl: '/assets/five_star.jpg' },
  { id: 't4', title: 'All Hostels', category: 'Hostel', count: 120, href: '/public/properties?types=Hostel', imageUrl: '/assets/Hostel.jpg' },
  { id: 't5', title: 'All Lodges', category: 'Lodge', count: 452, href: '/public/properties?types=Lodge', imageUrl: '/assets/Bengaruru.jpg' },
  { id: 't6', title: 'All Condos', category: 'Condo', count: 823, href: '/public/properties?types=Condo', imageUrl: '/assets/Condo.jpg' },
  { id: 't7', title: 'All Guest Houses', category: 'Guest House', count: 210, href: '/public/properties?types=Guest%20House', imageUrl: '/assets/guest_house.jpg' },
  { id: 't8', title: 'All Bungalows', category: 'Bungalow', count: 45, href: '/public/properties?types=Bungalow', imageUrl: '/assets/Bungalow.jpg' },
  { id: 't9', title: 'All Cabins', category: 'Cabin', count: 127, href: '/public/properties?types=Cabin', imageUrl: '/assets/cabin.jpg' },
  { id: 't10', title: 'All Homestays', category: 'Homestay', count: 78, href: '/public/properties?types=Homestay', imageUrl: '/assets/Homestay.jpg' },
  { id: 't11', title: 'All Townhouses', category: 'Townhouse', count: 56, href: '/public/properties?types=Townhouse', imageUrl: '/assets/TownHouses.jpg' },
  { id: 't12', title: 'All Houses', category: 'House', count: 300, href: '/public/properties?types=House', imageUrl: '/assets/Local_houses.jpg' },
  { id: 't13', title: 'Tourist Sites', category: 'Tourist Site', count: 85, href: '/public/properties?types=Tourist%20Site', imageUrl: '/assets/Villagestay.jpg' },
];

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

  const results = MOCK_PROPERTIES.filter(p => {
    if (q) {
      const matched = (p.title + ' ' + p.location).toLowerCase().includes(q);
      if (!matched) return false;
    }
    if (minPrice !== undefined && !Number.isNaN(minPrice)) {
      if (p.price < minPrice) return false;
    }
    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
      if (p.price > maxPrice) return false;
    }
    if (region && (!p.location || p.location.toLowerCase() !== region.toLowerCase())) return false;
    if (district && (!p.district || p.district.toLowerCase() !== district.toLowerCase())) return false;
    if (state && p.state && p.state.toLowerCase() !== state.toLowerCase()) return false;
    if (amenities.length) {
      const ok = amenities.every(a => (p.amenities || []).map(String).map(s=>s.toLowerCase()).includes(a.toLowerCase()));
      if (!ok) return false;
    }
    if (types.length) {
      const ok = types.every(t => (p.types || []).map(String).map(s=>s.toLowerCase()).includes(t.toLowerCase()));
      if (!ok) return false;
    }
    if (checkIn) {
      // ensure the property is available from <= checkIn
      if (p.availableFrom && p.availableFrom > checkIn) return false;
    }
    if (checkOut) {
      // ensure availableTo >= checkOut
      if (p.availableTo && p.availableTo < checkOut) return false;
    }

    return true;
  });

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
