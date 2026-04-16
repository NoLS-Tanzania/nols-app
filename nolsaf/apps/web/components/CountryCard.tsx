"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Map common payment method names (lowercased) to local asset paths
const paymentIconMap: Record<string, string> = {
  'm-pesa': '/assets/M-pesa.png',
  'mpesa': '/assets/M-pesa.png',
  'm pesa': '/assets/M-pesa.png',
  'visa': '/assets/visa_card.png',
  'airtel': '/assets/airtel_money.png',
  'airtel money': '/assets/airtel_money.png',
  'airtel_money': '/assets/airtel_money.png',
  'halopesa': '/assets/halopesa.png',
  'mixx by yas': '/assets/mix%20by%20yas.png',
  'mix by yas': '/assets/mix%20by%20yas.png',
  'mixx': '/assets/mix%20by%20yas.png',
  'mix': '/assets/mix%20by%20yas.png',
  't kash': '/assets/T_kash_logo.png',
  't-kash': '/assets/T_kash_logo.png',
  'tkash': '/assets/T_kash_logo.png',
  't_kash': '/assets/T_kash_logo.png',
  'mtn': '/assets/MTN%20LOGO.png',
  'mtn mobile money': '/assets/MTN%20LOGO.png',
  'mtn_mobile_money': '/assets/MTN%20LOGO.png',
};

// Map country id/name to bottom-rail class (used with article to show colored stripe)
const _countryRailClassMap: Record<string, string> = {
  'tanzania': 'flag-rail-tanzania',
  'kenya': 'flag-rail-kenya',
  'uganda': 'flag-rail-uganda',
};

// Top accent strip: flag colour sequence rendered as a slim gradient band
const countryTopStripMap: Record<string, string> = {
  tanzania: 'linear-gradient(90deg,#1eb53a 0%,#1eb53a 30%,#fcd116 30%,#fcd116 50%,#000000 50%,#000000 70%,#00a3dd 70%,#00a3dd 100%)',
  kenya:    'linear-gradient(90deg,#006600 0%,#006600 25%,#cc0001 25%,#cc0001 50%,#000000 50%,#000000 75%,#ffffff 75%,#ffffff 100%)',
  uganda:   'linear-gradient(90deg,#000000 0%,#000000 34%,#fcdc04 34%,#fcdc04 67%,#da121a 67%,#da121a 100%)',
};



type Stats = { cities?: number; regions?: number; listings?: number; payments?: string[] };

type Props = {
  id: string;
  name: string;
  flag?: string; // emoji or small svg path
  imageSrc?: string;
  subtitle?: string;
  blurb?: string;
  href?: string;
  stats?: Stats;
  accentClass?: string;
  onHoverAction?: (id: string | null) => void;
  onClickAction?: (id: string) => void;
  highlighted?: boolean;
  showPayments?: boolean;
  variant?: 'default' | 'compact';
};

export default function CountryCard({ id, name, flag = '', imageSrc, subtitle, blurb, href = '#', stats, accentClass: _accentClass = '', onHoverAction, onClickAction, highlighted = false, showPayments = false, variant = 'default' }: Props) {
  const isCompact = variant === 'compact';
  const ctaKey = (id || name || '').toLowerCase();
  const topStrip = countryTopStripMap[ctaKey] ?? countryTopStripMap.tanzania;

  return (
    <Link
      href={href}
      onClick={() => onClickAction?.(id)}
      onMouseEnter={() => onHoverAction?.(id)}
      onMouseLeave={() => onHoverAction?.(null)}
      onFocus={() => onHoverAction?.(id)}
      onBlur={() => onHoverAction?.(null)}
      aria-label={`${name} — ${subtitle ?? ''}`}
      className={[
        'block relative overflow-hidden rounded-2xl country-card-article no-underline',
        'bg-white group',
        highlighted
          ? 'ring-2 ring-emerald-300 shadow-[0_8px_30px_rgba(2,6,23,0.13)]'
          : 'ring-1 ring-slate-200/80 shadow-[0_2px_12px_rgba(2,6,23,0.06)]',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(2,6,23,0.11)] active:translate-y-0 active:shadow-sm',
        'cursor-pointer',
      ].join(' ')}
    >
      {/* Flag colour band — slides in on hover */}
      <div className="h-0 group-hover:h-[4px] transition-all duration-200 w-full" style={{ background: topStrip }} aria-hidden />

      {/* Card body */}
      <div className={['flex flex-col', isCompact ? 'px-4 pt-3.5 pb-4' : 'px-4 pt-4 pb-5'].join(' ')}>

        {/* ── Header: flag + name + subtitle ── */}
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-slate-50 ring-1 ring-slate-200/60"
            aria-hidden
          >
            {flag || '🏳️'}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold leading-tight text-slate-900 tracking-tight">{name}</h3>
            {subtitle ? (
              <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
            ) : null}
          </div>
        </div>

        {/* ── Blurb ── */}
        {blurb ? (
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">{blurb}</p>
        ) : null}

        {/* ── Optional image ── */}
        {imageSrc && !isCompact ? (
          <div className="mt-3 relative w-full h-32 rounded-xl overflow-hidden country-card-image">
            <Image src={imageSrc} alt={`${name} preview`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
        ) : null}

        {/* ── Footer row: tag + arrow ── */}
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 whitespace-nowrap">
            Parks &amp; recreation
          </span>
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* ── Payments row: optional ── */}
        {showPayments && stats?.payments ? (
          <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-slate-100">
            <span className="text-slate-400 text-xs flex-shrink-0">Payments</span>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {stats.payments.map((p, i) => {
                const key = p.toLowerCase();
                const icon = paymentIconMap[key];
                if (icon) {
                  return (
                    <span key={i} className="w-10 h-7 inline-flex items-center justify-center bg-white rounded-lg border border-slate-200/70 p-1 shadow-sm">
                      <Image src={icon} alt={p} width={34} height={18} className="object-contain" style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }} />
                    </span>
                  );
                }
                return (
                  <span key={i} className="px-2 py-1 bg-white border border-slate-200/70 text-slate-600 text-[11px] rounded-lg font-medium">{p}</span>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
