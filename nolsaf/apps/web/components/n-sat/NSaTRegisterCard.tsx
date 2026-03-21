'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Moon, Heart, X, ChevronRight, Sparkles, ShieldCheck, Users } from 'lucide-react';

type Programme = 'sleep' | 'love';
type Step = 'idle' | 'preview' | 'tiers';

interface Tier {
  name: string;
  nights: string;
  price: string;
  priceNote: string;
  tag?: string;
  features: string[];
}

const sleepTiers: Tier[] = [
  {
    name: 'Sanctuary Access',
    nights: '3 nights',
    price: 'TZS 7,000,000',
    priceNote: 'per stay',
    features: [
      'Verified calm environment',
      'Sleep rhythm programme guide',
      'No-screen structured schedule',
      'Pre-arrival preparation kit',
    ],
  },
  {
    name: 'Guided Restoration',
    nights: '5 nights',
    price: 'TZS 12,500,000',
    priceNote: 'per stay',
    tag: 'Most chosen',
    features: [
      'Everything in Sanctuary Access',
      'Certified mentor daily sessions',
      'Personalised sleep recovery plan',
      'Post-stay follow-up (2 weeks)',
    ],
  },
  {
    name: 'Elite Immersion',
    nights: '7 nights',
    price: 'TZS 22,000,000',
    priceNote: 'per stay',
    features: [
      'Everything in Guided Restoration',
      'Private sanctuary suite',
      'Dedicated mentor full programme',
      'Extended follow-up (6 weeks)',
      'Priority re-booking access',
    ],
  },
];

const loveTiers: Tier[] = [
  {
    name: 'Still Retreat',
    nights: '3 nights',
    price: 'TZS 7,000,000',
    priceNote: 'per couple',
    features: [
      'Curated peaceful environment',
      'Slow live music evenings',
      'Presence-first daily pace',
      'Pre-arrival intention guide',
    ],
  },
  {
    name: 'Restoration Journey',
    nights: '5 nights',
    price: 'TZS 13,500,000',
    priceNote: 'per couple',
    tag: 'Most chosen',
    features: [
      'Everything in Still Retreat',
      'Certified guide couples sessions',
      'Personalised restoration programme',
      'Post-stay follow-up (2 weeks)',
    ],
  },
  {
    name: 'Elite Sanctuary',
    nights: '7 nights',
    price: 'TZS 24,000,000',
    priceNote: 'per couple',
    features: [
      'Everything in Restoration Journey',
      'Private suite with curated décor',
      'Dedicated guide full immersion',
      'Extended follow-up (6 weeks)',
      'Priority re-booking access',
    ],
  },
];

const config = {
  sleep: {
    label: 'Sleep Sanctuary',
    sub: 'Reclaim natural sleep — verified calm environments across Tanzania',
    zone: 'Eastern · Northern · Lake · Central · Southern',
    Icon: Moon,
    iconColor: 'text-sky-300',
    iconBg: 'rgba(14,165,233,0.15)',
    iconBorder: 'rgba(14,165,233,0.3)',
    borderGrad: 'linear-gradient(135deg, rgba(14,165,233,0.55) 0%, rgba(14,90,180,0.45) 100%)',
    cardBg: 'linear-gradient(150deg, #040e22 0%, #062033 55%, #041a2e 100%)',
    glowColor: 'rgba(14,165,233,0.18)',
    accentText: 'text-sky-400',
    accentBorder: 'rgba(14,165,233,0.35)',
    btnBg: 'linear-gradient(90deg, #0369a1, #1d4ed8)',
    focusRing: 'focus-visible:ring-sky-400/60',
    tagBg: 'rgba(14,165,233,0.15)',
    tagColor: '#7dd3fc',
    tiers: sleepTiers,
  },
  love: {
    label: 'Love Restoration',
    sub: 'Return to natural love — environments built for presence and peace',
    zone: 'Eastern · Northern · Lake · Central · Southern',
    Icon: Heart,
    iconColor: 'text-amber-300',
    iconBg: 'rgba(217,119,6,0.15)',
    iconBorder: 'rgba(217,119,6,0.3)',
    borderGrad: 'linear-gradient(135deg, rgba(217,119,6,0.55) 0%, rgba(190,18,60,0.45) 100%)',
    cardBg: 'linear-gradient(150deg, #1c0a04 0%, #2a0e10 55%, #1a0a08 100%)',
    glowColor: 'rgba(217,119,6,0.18)',
    accentText: 'text-amber-400',
    accentBorder: 'rgba(217,119,6,0.35)',
    btnBg: 'linear-gradient(90deg, #b45309, #9f1239)',
    focusRing: 'focus-visible:ring-amber-400/60',
    tagBg: 'rgba(217,119,6,0.18)',
    tagColor: '#fcd34d',
    tiers: loveTiers,
  },
};

export default function NSaTRegisterCard({ programme }: { programme: Programme }) {
  const [step, setStep] = useState<Step>('idle');
  const c = config[programme];

  /* ── IDLE: just the button ── */
  if (step === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setStep('preview')}
        className={`no-underline w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white transition hover:-translate-y-[1px] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 ${c.focusRing}`}
        style={{ background: c.btnBg }}
      >
        Register Interest — {c.label}
      </button>
    );
  }

  /* ── PREVIEW: property-style card ── */
  if (step === 'preview') {
    return (
      <div className="relative overflow-hidden rounded-2xl p-[1px] mt-2 animate-fadeIn"
        style={{ background: c.borderGrad }}>
        <div className="relative overflow-hidden rounded-2xl" style={{ background: c.cardBg }}>
          {/* glow */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 h-32 w-64 rounded-full"
              style={{ background: `radial-gradient(ellipse, ${c.glowColor} 0%, transparent 70%)` }} />
          </div>

          {/* close */}
          <button type="button" onClick={() => setStep('idle')}
            className="absolute top-3 right-3 z-10 h-7 w-7 rounded-full flex items-center justify-center transition hover:bg-white/10 focus-visible:outline-none"
            aria-label="Close">
            <X className="h-4 w-4 text-white/50" />
          </button>

          <div className="relative p-5">
            {/* property card header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center border"
                style={{ background: c.iconBg, borderColor: c.iconBorder }}>
                <c.Icon className={`h-5 w-5 ${c.iconColor}`} aria-hidden />
              </div>
              <div className="min-w-0">
                <div className={`text-[10px] font-bold uppercase tracking-widest ${c.accentText} opacity-75`}>
                  N‑SaT Programme
                </div>
                <div className="text-sm font-bold text-white leading-tight">{c.label}</div>
                <div className="text-xs text-white/45 mt-0.5 truncate">{c.sub}</div>
              </div>
            </div>

            {/* property visualization strips */}
            <div className="rounded-xl overflow-hidden mb-4 border border-white/8">
              {/* mock property visual — abstract gradient art */}
              <div className="h-24 relative overflow-hidden"
                style={{ background: programme === 'sleep'
                  ? 'linear-gradient(160deg, #060f28 0%, #0a2240 40%, #063020 70%, #041810 100%)'
                  : 'linear-gradient(160deg, #1a0806 0%, #2e0f08 40%, #200814 70%, #100408 100%)' }}>
                {/* visual noise */}
                <div aria-hidden className="absolute inset-0">
                  <div className="absolute top-2 left-6 h-16 w-20 rounded-full opacity-30"
                    style={{ background: `radial-gradient(circle, ${programme === 'sleep' ? 'rgba(14,165,233,0.35)' : 'rgba(217,119,6,0.35)'} 0%, transparent 70%)` }} />
                  <div className="absolute bottom-0 right-4 h-12 w-28 rounded-full opacity-25"
                    style={{ background: `radial-gradient(circle, ${programme === 'sleep' ? 'rgba(5,173,162,0.4)' : 'rgba(190,18,60,0.4)'} 0%, transparent 70%)` }} />
                  {/* abstract horizontal lines simulating terrain */}
                  {[38, 52, 66, 80].map((y) => (
                    <div key={y} className="absolute w-full h-px opacity-10"
                      style={{ top: `${y}%`, background: 'linear-gradient(90deg, transparent 0%, white 30%, white 70%, transparent 100%)' }} />
                  ))}
                </div>
                <div className="absolute bottom-2 left-3 text-[9px] font-semibold text-white/40 uppercase tracking-widest">
                  Sanctuary · Tanzania
                </div>
                <div className="absolute bottom-2 right-3">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white/70"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                    {c.zone}
                  </span>
                </div>
              </div>

              {/* info row */}
              <div className="grid grid-cols-3 border-t border-white/8" style={{ background: 'rgba(0,0,0,0.3)' }}>
                {[
                  { icon: <ShieldCheck className="h-3 w-3" />, label: 'Verified' },
                  { icon: <Users className="h-3 w-3" />, label: 'Mentor included' },
                  { icon: <Sparkles className="h-3 w-3" />, label: 'N‑SaT certified' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center justify-center gap-1 py-2 border-r border-white/8 last:border-0 text-white/45">
                    {f.icon}
                    <span className="text-[10px]">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* from price + view tiers */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] text-white/40 uppercase tracking-wider">Starting from</div>
                <div className={`text-base font-extrabold ${c.accentText}`}>TZS 7,000,000</div>
                <div className="text-[10px] text-white/40">per stay · 3 nights minimum</div>
              </div>
              <button
                type="button"
                onClick={() => setStep('tiers')}
                className={`flex-shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white transition hover:-translate-y-[1px] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 ${c.focusRing}`}
                style={{ background: c.btnBg }}>
                View packages
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── TIERS: 3 pricing cards ── */
  return (
    <div className="mt-2 animate-fadeIn">
      {/* back button */}
      <button type="button" onClick={() => setStep('preview')}
        className="mb-3 flex items-center gap-1 text-xs text-white/40 hover:text-white/70 transition focus-visible:outline-none">
        <ChevronRight className="h-3 w-3 rotate-180" />
        Back to {c.label}
      </button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {c.tiers.map((tier, i) => {
          const isMiddle = i === 1;
          return (
            <div key={tier.name}
              className={`relative overflow-hidden rounded-2xl p-[1px] ${isMiddle ? 'sm:-mt-2 sm:-mb-2' : ''}`}
              style={{ background: isMiddle ? c.borderGrad : 'rgba(255,255,255,0.08)' }}>
              <div className="relative overflow-hidden rounded-2xl h-full flex flex-col"
                style={{ background: isMiddle ? c.cardBg : 'rgba(5,15,10,0.6)' }}>

                {isMiddle && (
                  <div aria-hidden className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-24 w-40 rounded-full"
                      style={{ background: `radial-gradient(ellipse, ${c.glowColor} 0%, transparent 70%)` }} />
                  </div>
                )}

                <div className="relative p-4 flex flex-col flex-1">
                  {tier.tag && (
                    <div className="mb-2 self-start text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                      style={{ background: c.tagBg, color: c.tagColor, border: `1px solid ${c.accentBorder}` }}>
                      {tier.tag}
                    </div>
                  )}
                  {!tier.tag && <div className="mb-2 h-[18px]" />}

                  <div className="text-xs font-bold text-white/80 mb-0.5">{tier.name}</div>
                  <div className="text-[10px] text-white/35 mb-3">{tier.nights}</div>

                  <div className={`text-xl font-extrabold ${isMiddle ? c.accentText : 'text-white'} leading-none mb-0.5`}>
                    {tier.price}
                  </div>
                  <div className="text-[10px] text-white/35 mb-4">{tier.priceNote}</div>

                  <ul className="space-y-1.5 flex-1 mb-4">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-1.5 text-[11px] text-white/55 leading-4">
                        <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
                          style={{ background: isMiddle ? c.tagColor : 'rgba(255,255,255,0.25)' }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href="/public/plan-with-us"
                    className={`no-underline hover:no-underline w-full flex items-center justify-center rounded-xl py-2.5 text-xs font-bold text-white transition hover:-translate-y-[1px] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 ${c.focusRing}`}
                    style={{ background: isMiddle ? c.btnBg : 'rgba(255,255,255,0.08)', border: isMiddle ? 'none' : '1px solid rgba(255,255,255,0.12)' }}>
                    Reserve this package
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-[10px] text-white/30 leading-4">
        Prices are per stay. A NoLSAF advisor will confirm availability and matched property before payment is processed.
      </p>
    </div>
  );
}
