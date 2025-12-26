"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

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
      // overflow-visible so hover tooltips (payments) aren't clipped
      className={`relative rounded-lg overflow-visible bg-white border card-raise ${highlighted ? 'ring-2 ring-emerald-300 shadow-lg' : 'shadow-sm'} ${accentClass} ${countryRailClassMap[(id || name || '').toLowerCase()] ?? ''} country-card-article`}
    >
      <div className="p-4 md:p-5 flex flex-col h-full">
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
          <div className="mt-4 space-y-3">
            {/* Stats row: stable alignment across cards */}
            <div className="grid grid-cols-3 gap-3 text-sm text-slate-700">
              {typeof stats.cities === 'number' ? (
                <Link
                  href={`/public/properties?country=${encodeURIComponent(id)}&view=cities`}
                  className="inline-flex items-baseline justify-between gap-2 no-underline rounded-md px-2 py-1 bg-slate-50 border border-slate-100 hover:bg-slate-100 transition"
                  title={`View cities in ${name}`}
                >
                  <span className="text-slate-500 text-xs">Cities</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{stats.cities}</span>
                </Link>
              ) : <span />}

              {typeof stats.regions === 'number' ? (
                <Link
                  href={`/public/properties?country=${encodeURIComponent(id)}&view=regions`}
                  className="inline-flex items-baseline justify-between gap-2 no-underline rounded-md px-2 py-1 bg-slate-50 border border-slate-100 hover:bg-slate-100 transition"
                  title={`View regions in ${name}`}
                >
                  <span className="text-slate-500 text-xs">Regions</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{stats.regions}</span>
                </Link>
              ) : <span />}

              {typeof stats.listings === 'number' ? (
                <Link
                  href={`/public/properties?country=${encodeURIComponent(id)}`}
                  className="inline-flex items-baseline justify-between gap-2 no-underline rounded-md px-2 py-1 bg-slate-50 border border-slate-100 hover:bg-slate-100 transition"
                  title={`View listings in ${name}`}
                >
                  <span className="text-slate-500 text-xs">Listings</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{stats.listings.toLocaleString()}</span>
                </Link>
              ) : <span />}
            </div>

            {/* Payments row: wraps cleanly and tooltips are visible */}
            {stats.payments ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500 text-xs flex-shrink-0">Payments</span>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {stats.payments.map((p, i) => {
                    const key = p.toLowerCase();
                    const icon = paymentIconMap[key];
                    const payHref = `/help/payments?method=${encodeURIComponent(p)}`;
                    if (icon) {
                      return (
                        <Link
                          key={i}
                          href={payHref}
                          title={p}
                          aria-label={p}
                          className="group relative inline-flex items-center focus:outline-none"
                        >
                          <span className="w-10 h-7 inline-flex items-center justify-center bg-white/90 rounded-md border border-slate-200 p-1 shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-active:translate-y-0">
                            <Image src={icon} alt={p} width={34} height={18} className="object-contain" style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }} />
                          </span>
                          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 text-white text-[11px] px-2 py-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity text-center shadow-lg">
                            {p}
                          </span>
                        </Link>
                      );
                    }

                    return (
                      <Link key={i} href={payHref} title={p} aria-label={p} className="group relative inline-flex items-center">
                        <span className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-800 text-[11px] rounded-md font-medium">
                          {p}
                        </span>
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 text-white text-[11px] px-2 py-1 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity text-center shadow-lg">
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
          <div className="mt-3 md:mt-4 relative w-full country-card-image">
            <Image src={imageSrc} alt={`${name} preview`} fill className="rounded-md object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
          </div>
        ) : null}

        {/* CTA pinned to bottom so all cards feel uniform */}
        <div className="pt-1 mt-auto">
          <Link
            href={href}
            onClick={() => onClick?.(id)}
            className={[
              "inline-flex items-center justify-center w-full sm:w-auto",
              "px-6 py-2.5 rounded-full no-underline font-semibold btn-explore",
              // Softer, simpler button: slightly transparent green with a subtle border
              "bg-emerald-600/85 text-white shadow-sm border border-emerald-700/20",
              "hover:bg-emerald-600 hover:shadow-md hover:border-emerald-700/25",
              "focus:outline-none focus:ring-4 focus:ring-emerald-200/60",
              "transition-all duration-300",
            ].join(" ")}
            aria-label={`Explore ${name}`}
            style={{ backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}
          >
            <span>Explore</span>
            <ArrowRight className="w-4 h-4 ml-2 opacity-90" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
