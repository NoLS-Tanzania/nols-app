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
const countryRailClassMap: Record<string, string> = {
  'tanzania': 'flag-rail-tanzania',
  'kenya': 'flag-rail-kenya',
  'uganda': 'flag-rail-uganda',
};

const countryCtaFlagClassMap: Record<string, string> = {
  tanzania: 'flag-cta-tanzania',
  kenya: 'flag-cta-kenya',
  uganda: 'flag-cta-uganda',
};

const countryCtaClassMap: Record<string, string> = {
  // Flag-inspired gradients (kept within Tailwind palette)
  tanzania: 'from-emerald-700 via-cyan-700 to-teal-700 border-emerald-800/15 shadow-[0_10px_24px_rgba(2,102,94,0.22)] hover:shadow-[0_14px_34px_rgba(2,102,94,0.26)] focus:ring-emerald-200/60',
  kenya: 'from-emerald-700 via-red-700 to-emerald-700 border-red-800/15 shadow-[0_10px_24px_rgba(185,28,28,0.20)] hover:shadow-[0_14px_34px_rgba(185,28,28,0.24)] focus:ring-red-200/60',
  uganda: 'from-amber-700 via-red-700 to-amber-700 border-amber-800/15 shadow-[0_10px_24px_rgba(161,98,7,0.20)] hover:shadow-[0_14px_34px_rgba(161,98,7,0.24)] focus:ring-amber-200/60',
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

export default function CountryCard({ id, name, flag = '', imageSrc, subtitle, blurb, href = '#', stats, accentClass = '', onHoverAction, onClickAction, highlighted = false, showPayments = false, variant = 'default' }: Props) {
  const isCompact = variant === 'compact';
  const ctaKey = (id || name || '').toLowerCase();
  const ctaStyle = countryCtaClassMap[ctaKey] ?? countryCtaClassMap.tanzania;
  const ctaFlagClass = countryCtaFlagClassMap[ctaKey] ?? countryCtaFlagClassMap.tanzania;

  return (
    <article
      onMouseEnter={() => onHoverAction?.(id)}
      onMouseLeave={() => onHoverAction?.(null)}
      onFocus={() => onHoverAction?.(id)}
      onBlur={() => onHoverAction?.(null)}
      aria-label={`${name} — ${subtitle ?? ''}`}
      // overflow-visible so hover tooltips (payments) aren't clipped
      className={`relative overflow-visible rounded-3xl p-[1px] card-raise ${highlighted ? 'ring-2 ring-emerald-300 shadow-[0_22px_60px_rgba(2,6,23,0.12)]' : 'ring-1 ring-slate-200/70 shadow-[0_18px_55px_rgba(2,6,23,0.10)]'} bg-gradient-to-br from-white/85 via-slate-200/45 to-emerald-200/35 ${accentClass} ${countryRailClassMap[(id || name || '').toLowerCase()] ?? ''} country-card-article`}
    >
      <div className="relative overflow-hidden rounded-[22px] bg-white/72 backdrop-blur-xl border border-white/70">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.75)_48%,rgba(255,255,255,0.28)_52%,transparent_100%)] opacity-55" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(2,180,245,0.14),transparent_52%),radial-gradient(circle_at_92%_88%,rgba(2,102,94,0.12),transparent_55%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(15,23,42,0.08)_1px,transparent_0)] [background-size:26px_26px]" aria-hidden />

        <div className={['relative flex flex-col h-full', isCompact ? 'p-3 md:p-4' : 'p-4 md:p-5'].join(' ')}>
          <div className={['flex items-start', isCompact ? 'gap-2.5' : 'gap-3'].join(' ')}>
            <div className="flex-shrink-0">
              <div
                className={[
                  'rounded-2xl bg-white/75 border border-white/70 ring-1 ring-slate-200/60 shadow-sm flex items-center justify-center',
                  isCompact ? 'w-9 h-9 text-lg' : 'w-10 h-10 text-xl',
                ].join(' ')}
                aria-hidden
              >
                {flag || '🏳️'}
              </div>
            </div>
            <div className="min-w-0">
              <h3 className={[isCompact ? 'text-base' : 'text-lg', 'font-semibold leading-tight text-slate-900'].join(' ')}>{name}</h3>
              {subtitle ? <div className={[isCompact ? 'text-xs' : 'text-sm', 'text-slate-600 mt-1'].join(' ')}>{subtitle}</div> : null}
            </div>
          </div>

          {blurb ? (
            <p
              className={[isCompact ? 'mt-2 text-[13px]' : 'mt-3 text-sm', 'text-slate-700 leading-relaxed'].join(' ')}
              style={
                isCompact
                  ? {
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical' as const,
                      overflow: 'hidden',
                    }
                  : undefined
              }
            >
              {blurb}
            </p>
          ) : null}

          <div
            className={[
              isCompact
                ? 'mt-4 rounded-2xl bg-white/60 border border-slate-200/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]'
                : 'mt-4 pt-4 border-t border-slate-200/70 space-y-3',
            ].join(' ')}
          >
            <div
              className={[
                'flex flex-col gap-2 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between',
                isCompact ? 'text-[13px]' : 'text-sm',
              ].join(' ')}
            >
              <span className="text-slate-500 text-xs">Supported</span>
              <span
                className={[
                  'inline-flex items-center rounded-full px-3 py-1 font-semibold',
                  'bg-emerald-500/10 text-emerald-800',
                  'ring-1 ring-emerald-300/25 border border-white/60 backdrop-blur',
                  'w-fit whitespace-nowrap',
                ].join(' ')}
              >
                Parks &amp; recreation
              </span>
            </div>

            {/* Payments row: optional (kept for future use) */}
            {showPayments && stats?.payments ? (
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200/60">
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
                          <span className="w-10 h-7 inline-flex items-center justify-center bg-white/70 backdrop-blur rounded-lg border border-slate-200/70 p-1 shadow-sm transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md group-active:translate-y-0">
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
                        <span className="px-2 py-1 bg-white/65 backdrop-blur border border-slate-200/70 text-slate-800 text-[11px] rounded-lg font-medium">
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

        {imageSrc && !isCompact ? (
          <div className="mt-3 md:mt-4 relative w-full country-card-image">
            <Image src={imageSrc} alt={`${name} preview`} fill className="rounded-md object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw" />
          </div>
        ) : null}

          {/* CTA pinned to bottom so all cards feel uniform */}
          <div className={[isCompact ? 'pt-3 mt-auto' : 'pt-3 mt-auto border-t border-slate-200/60'].join(' ')}>
            <Link
              href={href}
              onClick={() => onClickAction?.(id)}
              className={[
                "inline-flex items-center relative overflow-hidden isolate",
                "justify-center",
                isCompact
                  ? "w-full max-w-[220px] mx-auto min-[420px]:w-auto min-[420px]:max-w-none"
                  : "w-full sm:w-auto",
                "rounded-full no-underline font-semibold btn-explore",
                "bg-gradient-to-r text-white",
                `border ${ctaStyle}`,
                ctaFlagClass,
                "focus:outline-none focus:ring-4",
                "transition-all duration-300",
                isCompact ? "px-4 py-2.5 sm:px-4" : "px-4 py-3 sm:px-4",
              ].join(" ")}
              aria-label={`View ${name}`}
              style={{ backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}
            >
              <span className={['relative z-10', isCompact ? 'text-sm' : 'text-sm'].join(' ')}>Explore</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
