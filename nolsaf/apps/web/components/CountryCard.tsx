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

// Map country id or name (lowercased) to a CSS class name defined in global CSS
const countryNameClassMap: Record<string, string> = {
  'tanzania': 'flag-text-tanzania',
  'kenya': 'flag-text-kenya',
  'uganda': 'flag-text-uganda',
};

// Map country id/name to bottom-rail class (used with article to show colored stripe)
const countryRailClassMap: Record<string, string> = {
  'tanzania': 'flag-rail-tanzania',
  'kenya': 'flag-rail-kenya',
  'uganda': 'flag-rail-uganda',
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
  onHover?: (id: string | null) => void;
  onClick?: (id: string) => void;
  highlighted?: boolean;
};

export default function CountryCard({ id, name, flag = '', imageSrc, subtitle, blurb, href = '#', stats, accentClass = '', onHover, onClick, highlighted = false }: Props) {
  return (
    <article
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(id)}
      onBlur={() => onHover?.(null)}
      aria-label={`${name} — ${subtitle ?? ''}`}
      className={`relative rounded-lg overflow-hidden bg-white border card-raise ${highlighted ? 'ring-2 ring-emerald-300 shadow-lg' : 'shadow-sm'} ${accentClass} ${countryRailClassMap[(id || name || '').toLowerCase()] ?? ''}`}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-md bg-slate-100 flex items-center justify-center text-xl" aria-hidden>
              {flag || '🏳️'}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight">{name}</h3>
            {subtitle ? <div className="text-sm text-slate-500 mt-1">{subtitle}</div> : null}
          </div>
        </div>

        {blurb ? <p className="mt-3 text-sm text-slate-600">{blurb}</p> : null}

        {stats ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-700">
            {typeof stats.cities === 'number' ? (
              <Link href={`/public/properties?country=${encodeURIComponent(id)}&view=cities`} className="inline-flex items-baseline gap-2 no-underline" title={`View cities in ${name}`}>
                <span className="text-slate-500 text-xs">Cities</span>
                <span className="font-medium text-slate-900">{stats.cities}</span>
              </Link>
            ) : null}

            {typeof stats.regions === 'number' ? (
              <Link href={`/public/properties?country=${encodeURIComponent(id)}&view=regions`} className="inline-flex items-baseline gap-2 no-underline" title={`View regions in ${name}`}>
                <span className="text-slate-500 text-xs">Regions</span>
                <span className="font-medium text-slate-900">{stats.regions}</span>
              </Link>
            ) : null}

            {typeof stats.listings === 'number' ? (
              <Link href={`/public/properties?country=${encodeURIComponent(id)}`} className="inline-flex items-baseline gap-2 no-underline" title={`View listings in ${name}`}>
                <span className="text-slate-500 text-xs">Listings</span>
                <span className="font-medium text-slate-900">{stats.listings.toLocaleString()}</span>
              </Link>
            ) : null}

            {stats.payments ? (
              <div className="inline-flex items-center gap-3">
                <span className="text-slate-500 text-xs">Payments</span>
                <div className="flex items-center gap-2">
                  {stats.payments.map((p, i) => {
                    const key = p.toLowerCase();
                    const icon = paymentIconMap[key];
                    const href = `/help/payments?method=${encodeURIComponent(p)}`;
                    // clickable tile with hover tooltip
                    if (icon) {
                      return (
                        <Link
                          key={i}
                          href={href}
                          title={p}
                          aria-label={p}
                          className="group relative inline-block"
                        >
                          <div className="w-8 h-6 flex items-center justify-center bg-white rounded-sm border border-slate-100 p-0.5">
                            <Image src={icon} alt={p} width={28} height={16} className="object-contain" />
                          </div>
                          <span className="pointer-events-none absolute -top-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity text-center">
                            {p}
                          </span>
                        </Link>
                      );
                    }

                    // fallback: small text badge clickable
                    return (
                      <Link key={i} href={href} title={p} aria-label={p} className="group relative inline-block">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded">{p}</span>
                        <span className="pointer-events-none absolute -top-7 left-1/2 transform -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity text-center">
                          {p}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {imageSrc ? (
          <div className="mt-3 md:mt-4">
            <Image src={imageSrc} alt={`${name} preview`} width={280} height={140} className="rounded-md object-cover" />
          </div>
        ) : null}

        <div className="mt-4">
          <Link href={href} onClick={() => onClick?.(id)} className="inline-flex items-center px-5 py-2 bg-emerald-600 text-white rounded-full no-underline btn-explore" aria-label={`Explore ${name}`}>
            <span className="mr-1">Explore</span>
            {(() => {
              const key = (id || name || '').toLowerCase();
              const cls = countryNameClassMap[key];
              if (cls) {
                return <span className={`font-semibold ${cls}`}>{name}</span>;
              }
              return <span className="font-semibold">{name}</span>;
            })()}
          </Link>
        </div>
      </div>
    </article>
  );
}
