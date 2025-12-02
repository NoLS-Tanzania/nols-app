"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Linkedin, Instagram, X, Facebook, MessageCircle, Download, Eye } from 'lucide-react';

const TESTIMONIALS = [
  {
    title: 'Effortless group bookings',
    text: 'NoLSAF made organising our group trip effortless bookings, transport and payments in one place just one Click.',
    name: 'Asha M.',
    company: 'Group leader, Dar es Salaam',
    roleType: 'traveller',
    platform: 'linkedin'
  },
  {
    title: 'Reliable drivers & booking codes',
    text: '<strong>Driver</strong> arrived on time and the booking code system worked perfectly — stress free.',
    name: 'John K.',
    company: 'International traveller',
    roleType: 'driver',
    platform: 'x'
  },
  {
    title: 'Bookings & fast payouts',
    text: 'As a <strong>host</strong>, I get bookings and fast payouts NoLSAF really helps our business.',
    name: 'Moses N.',
    company: 'Properties Owner, Arusha',
    roleType: 'owner',
    platform: 'facebook'
  },
  {
    title: 'Affordable travel options',
    text: 'I used to think travel needed too much money. When I started using NoLSAF everything changed flexible options, clear pricing and group-friendly.',
    name: 'Fatuma L.',
    company: 'Local traveller',
    roleType: 'traveller',
    platform: 'instagram'
  },
  {
    title: 'Booking without internet',
    text: 'No internet? No problem the <strong>USSD code</strong> *123# lets me check stays and book without data. NoLSAF works for everyone, even without a smartphone.',
    name: 'Samson O.',
    company: 'USSD user',
    roleType: 'traveller',
    platform: 'ussd'
  },
  {
    title: 'Plan With Us simplified planning',
    text: 'I had planning paralysis <strong>Plan With Us</strong> gave clear recommendations, friendly costs and a simple plan. Booking felt easy and affordable.',
    name: 'Grace T.',
    company: 'Planner',
    roleType: 'planner',
    platform: 'play'
  }
];

const SOCIAL_LINKS = {
  linkedin: 'https://www.linkedin.com/company/nolsaf',
  x: 'https://x.com/nolsaf',
  facebook: 'https://www.facebook.com/nolsaf',
  instagram: 'https://www.instagram.com/nolsaf',
  ussd: 'https://nolsaf.org/ussd',
  play: 'https://play.google.com/store/apps/details?id=com.nolsaf'
};

export default function Testimonials() {
  const total = TESTIMONIALS.length;
  const [active, setActive] = useState(0);
  const timerRef = useRef<any>(undefined);

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function start() {
    stop();
    timerRef.current = window.setInterval(() => {
      setActive((a) => ((a + 2) % total));
    }, 10000);
  }

  function stop() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }

  function isVisibleNew(i: number) {
    return i === active || i === ((active + 1) % total);
  }

  return (
    <section className="mt-6">
      <div className="public-container">
        <div className="rounded-lg border bg-white p-6 shadow-md">
          <h3 className="text-lg font-semibold">What our customers say</h3>
          <p className="mt-1 text-sm text-slate-600">Real stories from travellers, drivers and <strong className="text-[#039e92] font-semibold">hosts</strong> who use NoLSAF.</p>

          <div
            className="mt-4 flex gap-3 flex-wrap justify-center"
            onMouseEnter={() => stop()}
            onMouseLeave={() => start()}
            onFocus={() => stop()}
            onBlur={() => start()}
          >
            {TESTIMONIALS.map((t, i) =>
              isVisibleNew(i) ? (
                <figure key={i} aria-label="Testimonial" className="p-3 border rounded-lg transition-opacity duration-500 ease-in-out hover:shadow-lg focus:outline-none cursor-pointer flex flex-col justify-between max-w-[360px]">
                  <h4 className="text-sm italic mb-2 text-[#02665e]">{t.title}</h4>
                  <blockquote className="text-sm text-slate-700 whitespace-normal break-words"><span dangerouslySetInnerHTML={{ __html: t.text }} /></blockquote>
                  <figcaption className="mt-3 flex items-center gap-3">
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        {t.name}
                        <span className="sr-only">via {t.platform}</span>
                        {/* platform icon */}
                        {t.platform === 'linkedin' && <Linkedin className="w-4 h-4 text-[#0A66C2]" aria-hidden="true" />}
                        {t.platform === 'x' && <X className="w-4 h-4 text-black dark:text-white" aria-hidden="true" />}
                        {t.platform === 'facebook' && <Facebook className="w-4 h-4 text-[#1877F2]" aria-hidden="true" />}
                        {t.platform === 'instagram' && <Instagram className="w-4 h-4 text-[#E1306C]" aria-hidden="true" />}
                        {t.platform === 'ussd' && <MessageCircle className="w-4 h-4 text-[#16A34A]" aria-hidden="true" />}
                        {t.platform === 'play' && <Download className="w-4 h-4 text-[#3DDC84]" aria-hidden="true" />}

                        <a href={SOCIAL_LINKS[t.platform as keyof typeof SOCIAL_LINKS] || '#'} target="_blank" rel="noopener noreferrer" aria-label={`View on ${t.platform} (opens in new tab)`} className="ml-2 inline-flex items-center group relative">
                          <Eye className="w-4 h-4 text-slate-400 group-hover:text-slate-600" aria-hidden="true" />
                          <span className="sr-only">opens in new tab</span>
                          {/* tooltip backgrounds per platform */}
                          <span className={`absolute -mt-8 left-0 hidden group-hover:block group-focus:block text-white text-xs px-2 py-1 rounded ${
                            t.platform === 'linkedin' ? 'bg-[#0A66C2]' : t.platform === 'facebook' ? 'bg-[#1877F2]' : t.platform === 'instagram' ? 'bg-[#E1306C]' : t.platform === 'play' ? 'bg-[#3DDC84]' : t.platform === 'ussd' ? 'bg-[#039e92]' : 'bg-black'
                          }`}>View on {t.platform}</span>
                        </a>
                      </div>
                      <div className="text-xs text-slate-500">{t.company ? t.company : (t.roleType ? (t.roleType.charAt(0).toUpperCase() + t.roleType.slice(1)) : '')}</div>
                    </div>
                  </figcaption>
                </figure>
              ) : null
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
