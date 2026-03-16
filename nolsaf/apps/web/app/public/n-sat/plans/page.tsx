'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Moon, Heart, ShieldCheck, Users, Sparkles, ArrowLeft, Check } from 'lucide-react';

type Programme = 'sleep' | 'love';

/* ─── Tier data ─────────────────────────────────────────── */
const sleepTiers = [
  {
    name: 'Sanctuary Access',
    nights: '5 nights',
    price: 'TZS 9,000,000',
    priceNote: 'per stay',
    inclusions: [
      { category: 'Stay',      items: ['Verified calm environment', 'No-screen structured schedule', 'Pre-arrival preparation kit'] },
      { category: 'Meals',    items: ['Daily breakfast & dinner included'] },
      { category: 'Transport', items: ['Airport pickup & drop-off (local)', 'Ground transfers within destination'] },
      { category: 'Programme', items: ['Sleep rhythm programme guide'] },
    ],
  },
  {
    name: 'Guided Restoration',
    nights: '12 nights',
    price: 'TZS 15,000,000',
    priceNote: 'per stay',
    tag: 'Most chosen',
    inclusions: [
      { category: 'Stay',      items: ['Everything in Sanctuary Access', 'Upgraded room category'] },
      { category: 'Meals',    items: ['Full board breakfast, lunch & dinner'] },
      { category: 'Transport', items: ['All ground transfers & excursions'] },
      { category: 'Programme', items: ['Certified mentor daily sessions', 'Personalised sleep recovery plan', 'Post-stay follow-up (2 weeks)'] },
    ],
  },
  {
    name: 'Elite Immersion',
    nights: '20 nights',
    price: 'TZS 28,000,000',
    priceNote: 'per stay',
    airlineNote: true,
    inclusions: [
      { category: 'Stay',      items: ['Private sanctuary suite', 'Everything in Guided Restoration'] },
      { category: 'Meals',    items: ['Full board + welcome dinner & farewell dinner'] },
      { category: 'Transport', items: ['All ground transfers & excursions', 'Return domestic airline ticket included'] },
      { category: 'Programme', items: ['Dedicated mentor — full programme', 'Extended follow-up (6 weeks)', 'Priority re-booking access'] },
    ],
  },
];

const loveTiers = [
  {
    name: 'Still Retreat',
    nights: '5 nights',
    price: 'TZS 9,000,000',
    priceNote: 'per couple',
    inclusions: [
      { category: 'Stay',      items: ['Curated peaceful environment', 'Presence-first daily pace', 'Pre-arrival intention guide'] },
      { category: 'Meals',    items: ['Daily breakfast & dinner for two'] },
      { category: 'Transport', items: ['Airport pickup & drop-off (local)', 'Ground transfers within destination'] },
      { category: 'Programme', items: ['Slow live music evenings'] },
    ],
  },
  {
    name: 'Restoration Journey',
    nights: '12 nights',
    price: 'TZS 17,000,000',
    priceNote: 'per couple',
    tag: 'Most chosen',
    inclusions: [
      { category: 'Stay',      items: ['Everything in Still Retreat', 'Upgraded couple suite'] },
      { category: 'Meals',    items: ['Full board for two all meals included'] },
      { category: 'Transport', items: ['All ground transfers & shared excursions'] },
      { category: 'Programme', items: ['Certified guide couples sessions', 'Personalised restoration programme', 'Post-stay follow-up (2 weeks)'] },
    ],
  },
  {
    name: 'Elite Sanctuary',
    nights: '20 nights',
    price: 'TZS 32,000,000',
    priceNote: 'per couple',
    airlineNote: true,
    inclusions: [
      { category: 'Stay',      items: ['Private suite with curated décor', 'Everything in Restoration Journey'] },
      { category: 'Meals',    items: ['Full board + romantic welcome & farewell dinners'] },
      { category: 'Transport', items: ['All ground transfers & excursions', 'Return domestic airline tickets for two included'] },
      { category: 'Programme', items: ['Dedicated guide full immersion', 'Extended follow-up (6 weeks)', 'Priority re-booking access'] },
    ],
  },
];

/* ─── Per-programme config ───────────────────────────────── */
const config = {
  sleep: {
    label: 'Sleep Sanctuary',
    tagline: 'Reclaim natural sleep',
    sub: 'Verified calm environments + certified mentors across Tanzania',
    zone: 'Eastern · Northern · Lake · Central · Southern',
    Icon: Moon,
    iconColor: 'text-sky-300',
    iconBg: 'rgba(14,165,233,0.15)',
    iconBorder: 'rgba(14,165,233,0.3)',
    borderGrad: 'linear-gradient(135deg, rgba(14,165,233,0.55) 0%, rgba(14,90,180,0.45) 100%)',
    cardBg: 'linear-gradient(150deg, #040e22 0%, #062033 55%, #041a2e 100%)',
    heroBg: 'linear-gradient(160deg, #060f28 0%, #0a2240 40%, #063020 70%, #041810 100%)',
    glowA: 'rgba(14,165,233,0.35)',
    glowB: 'rgba(5,173,162,0.4)',
    accentText: 'text-sky-400',
    accentBorder: 'rgba(14,165,233,0.35)',
    btnBg: 'linear-gradient(90deg, #0369a1, #1d4ed8)',
    tagBg: 'rgba(14,165,233,0.15)',
    tagColor: '#7dd3fc',
    pageBg: 'linear-gradient(160deg, #020b1a 0%, #041222 60%, #021a12 100%)',
    tiers: sleepTiers,
    tabActive: 'bg-sky-600 text-white',
    tabInactive: 'bg-transparent text-white/40 hover:text-white/70',
  },
  love: {
    label: 'Love Restoration',
    tagline: 'Return to natural love',
    sub: 'Environments built for presence, peace and togetherness',
    zone: 'Eastern · Northern · Lake · Central · Southern',
    Icon: Heart,
    iconColor: 'text-amber-300',
    iconBg: 'rgba(217,119,6,0.15)',
    iconBorder: 'rgba(217,119,6,0.3)',
    borderGrad: 'linear-gradient(135deg, rgba(217,119,6,0.55) 0%, rgba(190,18,60,0.45) 100%)',
    cardBg: 'linear-gradient(150deg, #1c0a04 0%, #2a0e10 55%, #1a0a08 100%)',
    heroBg: 'linear-gradient(160deg, #1a0806 0%, #2e0f08 40%, #200814 70%, #100408 100%)',
    glowA: 'rgba(217,119,6,0.35)',
    glowB: 'rgba(190,18,60,0.4)',
    accentText: 'text-amber-400',
    accentBorder: 'rgba(217,119,6,0.35)',
    btnBg: 'linear-gradient(90deg, #b45309, #9f1239)',
    tagBg: 'rgba(217,119,6,0.18)',
    tagColor: '#fcd34d',
    pageBg: 'linear-gradient(160deg, #100402 0%, #1e0608 60%, #100208 100%)',
    tiers: loveTiers,
    tabActive: 'bg-amber-600 text-white',
    tabInactive: 'bg-transparent text-white/40 hover:text-white/70',
  },
} as const;

export default function NSaTPlansPage() {
  const searchParams = useSearchParams();
  const initial = (searchParams.get('p') ?? 'sleep') as Programme;
  const [prog, setProg] = useState<Programme>(initial);
  const c = config[prog];

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="relative overflow-hidden rounded-[2.5rem] text-white" style={{ background: c.pageBg }}>
          <div className="px-6 py-8 sm:px-10">

        {/* ── Back ── */}
        <Link href="/public/n-sat"
          className="no-underline inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition mb-8">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to N‑SaT
        </Link>

        {/* ── Page title ── */}
        <div className="text-center mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/6 px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-white/50">
            N‑SaT · Choose your programme
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {c.tagline}
          </h1>
          <p className="mt-2 text-sm text-white/50">{c.sub}</p>
        </div>

        {/* ── Programme toggle tabs ── */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex rounded-2xl border border-white/10 p-1" style={{ background: 'rgba(0,0,0,0.35)' }}>
            {(['sleep', 'love'] as Programme[]).map((p) => {
              const icon = p === 'sleep' ? <Moon className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />;
              const label = p === 'sleep' ? 'Sleep Sanctuary' : 'Love Restoration';
              const isActive = prog === p;
              return (
                <button key={p} type="button"
                  onClick={() => setProg(p)}
                  className={`flex items-center gap-2 rounded-xl border-0 px-5 py-2.5 text-xs font-bold transition ${
                    isActive ? config[p].tabActive : config[p].tabInactive
                  }`}>
                  {icon}
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Property preview card ── */}
        <div className="relative overflow-hidden rounded-3xl p-[1px] mb-10"
          style={{ background: c.borderGrad }}>
          <div className="relative overflow-hidden rounded-3xl" style={{ background: c.cardBg }}>

            {/* glow */}
            <div aria-hidden className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 h-40 w-96 rounded-full"
                style={{ background: `radial-gradient(ellipse, ${c.glowA.replace('0.35', '0.12')} 0%, transparent 70%)` }} />
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-0">

              {/* Left — scenic visual */}
              <div className="relative overflow-hidden md:rounded-l-3xl min-h-[180px] md:min-h-[240px]"
                style={{ background: c.heroBg }}>
                {/* ambient glows */}
                <div aria-hidden className="absolute inset-0">
                  <div className="absolute top-4 left-8 h-24 w-32 rounded-full opacity-30"
                    style={{ background: `radial-gradient(circle, ${c.glowA} 0%, transparent 70%)` }} />
                  <div className="absolute bottom-4 right-6 h-20 w-36 rounded-full opacity-22"
                    style={{ background: `radial-gradient(circle, ${c.glowB} 0%, transparent 70%)` }} />
                  {/* terrain lines */}
                  {[30, 45, 60, 75].map((y) => (
                    <div key={y} className="absolute w-full h-px opacity-10"
                      style={{ top: `${y}%`, background: 'linear-gradient(90deg, transparent 0%, white 20%, white 80%, transparent 100%)' }} />
                  ))}
                </div>

                <div className="relative flex flex-col justify-end h-full p-5 min-h-[180px] md:min-h-[240px]">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center border"
                      style={{ background: c.iconBg, borderColor: c.iconBorder }}>
                      <c.Icon className={`h-4.5 w-4.5 ${c.iconColor}`} aria-hidden />
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${c.accentText}`}>{c.label}</div>
                      <div className="text-[10px] text-white/40">N‑SaT Sanctuary · Tanzania</div>
                    </div>
                  </div>
                  <div className="text-[10px] text-white/35 uppercase tracking-widest">{c.zone}</div>
                </div>
              </div>

              {/* Right — details */}
              <div className="p-6 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-white/40 mb-3 uppercase tracking-wider font-semibold">What's always included</div>
                  <div className="space-y-2.5">
                    {[
                      { icon: <ShieldCheck className="h-4 w-4" />, title: 'Verified property', desc: 'Every sanctuary is inspected and approved by N‑SaT.' },
                      { icon: <Users className="h-4 w-4" />, title: 'Certified mentor', desc: 'A trained guide accompanies your entire programme.' },
                      { icon: <Sparkles className="h-4 w-4" />, title: 'Curated environment', desc: 'Spaces designed intentionally — no noise, no distraction.' },
                    ].map((f) => (
                      <div key={f.title} className="flex items-start gap-2.5">
                        <div className="mt-0.5 flex-shrink-0" style={{ color: c.tagColor, opacity: 0.8 }}>{f.icon}</div>
                        <div>
                          <div className="text-xs font-semibold text-white/80">{f.title}</div>
                          <div className="text-[11px] text-white/40 leading-4">{f.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-white/8">
                  <div className="text-[10px] text-white/35 uppercase tracking-wider mb-0.5">Pricing starts at</div>
                  <div className={`text-2xl font-extrabold ${c.accentText}`}>TZS 9,000,000</div>
                  <div className="text-[10px] text-white/35">per stay · 5 nights minimum</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ── Section label ── */}
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-white/35 mb-6">
          Select your package
        </p>

        {/* ── Pricing tiers ── */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {c.tiers.map((tier, i) => {
            const isMiddle = i === 1;
            return (
              <div key={tier.name}
                className="relative overflow-hidden rounded-3xl p-[1px] flex flex-col"
                style={{
                  background: isMiddle ? c.borderGrad : 'rgba(255,255,255,0.07)',
                  transform: isMiddle ? 'scale(1.025)' : 'none',
                }}>
                <div className="relative overflow-hidden rounded-3xl h-full flex flex-col"
                  style={{ background: isMiddle ? c.cardBg : 'rgba(4,8,20,0.75)' }}>

                  {isMiddle && (
                    <div aria-hidden className="pointer-events-none absolute inset-0">
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-28 w-48 rounded-full"
                        style={{ background: `radial-gradient(ellipse, ${c.glowA.replace('0.35', '0.18')} 0%, transparent 70%)` }} />
                    </div>
                  )}

                  <div className="relative p-6 flex flex-col flex-1">

                    {/* tag */}
                    <div className="mb-3 min-h-[22px] flex items-start">
                      {tier.tag && (
                        <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                          style={{ background: c.tagBg, color: c.tagColor, border: `1px solid ${c.accentBorder}` }}>
                          {tier.tag}
                        </span>
                      )}
                    </div>

                    {/* name + nights */}
                    <div className="text-lg font-extrabold text-white leading-tight">{tier.name}</div>
                    <div className="text-xs text-white/35 mt-0.5 mb-5">{tier.nights}</div>

                    {/* price */}
                    <div className={`text-3xl font-extrabold leading-none mb-1 ${isMiddle ? c.accentText : 'text-white'}`}>
                      {tier.price}
                    </div>
                    <div className="text-xs text-white/35 mb-4">{tier.priceNote}</div>

                    {/* airline NB */}
                    {tier.airlineNote && (
                      <div className="mb-4 rounded-xl px-3 py-2 text-[10px] leading-4"
                        style={{ background: 'rgba(234,179,8,0.10)', border: '1px solid rgba(234,179,8,0.25)', color: 'rgba(253,224,71,0.8)' }}>
                        <span className="font-bold uppercase tracking-wider">NB:</span> International flights are not included. Airline ticket covers domestic routes only. International travellers will incur additional charges.
                      </div>
                    )}

                    {/* categorised inclusions */}
                    <div className="space-y-3 flex-1 mb-7">
                      {tier.inclusions.map((group) => (
                        <div key={group.category}>
                          <div className="text-[9px] font-bold uppercase tracking-widest mb-1.5"
                            style={{ color: isMiddle ? c.tagColor : 'rgba(255,255,255,0.3)' }}>
                            {group.category}
                          </div>
                          <ul className="space-y-1.5">
                            {group.items.map((item) => (
                              <li key={item} className="flex items-start gap-2">
                                <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"
                                  style={{ color: isMiddle ? c.tagColor : 'rgba(255,255,255,0.28)' }} />
                                <span className="text-xs text-white/55 leading-4">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <Link href="/public/plan-with-us"
                      className="no-underline hover:no-underline w-full flex items-center justify-center rounded-2xl py-3.5 text-sm font-bold text-white transition hover:-translate-y-[1px] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                      style={{
                        background: isMiddle ? c.btnBg : 'rgba(255,255,255,0.08)',
                        border: isMiddle ? 'none' : '1px solid rgba(255,255,255,0.12)',
                      }}>
                      Reserve this package
                    </Link>

                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer note ── */}
        <p className="mt-10 text-center text-xs text-white/25 leading-5 max-w-lg mx-auto">
          A NoLSAF advisor will confirm availability and a matched property before any payment is processed.
          All stays include mentor support. Prices are per stay. Domestic airline tickets are included in Elite packages only — international flights are charged separately.
        </p>

          </div>
        </div>
      </div>
    </main>
  );
}
