"use client";

import React, { useMemo } from 'react';
import { Facebook, Instagram, Linkedin, Quote, MessageCircle, Download, X } from 'lucide-react';

function stripHtml(html: string) {
  return String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
    text: 'Driver arrived on time and the booking code system worked perfectly — stress free.',
    name: 'John K.',
    company: 'International traveller',
    roleType: 'driver',
    platform: 'x'
  },
  {
    title: 'Bookings & fast payouts',
    text: 'As a host, I get bookings and fast payouts — NoLSAF really helps our business.',
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
    text: 'No internet? No problem — the USSD code *123# lets me check stays and book without data. NoLSAF works for everyone, even without a smartphone.',
    name: 'Samson O.',
    company: 'USSD user',
    roleType: 'traveller',
    platform: 'ussd'
  },
  {
    title: 'Plan With Us simplified planning',
    text: 'I had planning paralysis — Plan With Us gave clear recommendations, friendly costs and a simple plan. Booking felt easy and affordable.',
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

export default function Testimonials({ hideTitle = false }: { hideTitle?: boolean }) {
  const cards = useMemo(() => TESTIMONIALS.map((t) => ({ ...t, snippet: stripHtml(t.text) })), []);

  return (
    <section className="mt-8" aria-label={hideTitle ? "Testimonials" : undefined} aria-labelledby={hideTitle ? undefined : "testimonials-heading"}>
      <div className="public-container">

        {hideTitle ? null : (
          <div className="mb-6">
            <h3 id="testimonials-heading" className="text-xl sm:text-2xl font-semibold text-slate-900">
              What our customers say
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Real stories from travellers, drivers and <strong className="text-[#02665e] font-semibold">hosts</strong> who use NoLSAF.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cards.map((t) => {
            const href = SOCIAL_LINKS[t.platform as keyof typeof SOCIAL_LINKS] || '#';

            const PlatformIcon =
              t.platform === 'linkedin'  ? Linkedin :
              t.platform === 'x'         ? X :
              t.platform === 'facebook'  ? Facebook :
              t.platform === 'instagram' ? Instagram :
              t.platform === 'ussd'      ? MessageCircle :
              Download;

            const platformLabel =
              t.platform === 'linkedin'  ? 'LinkedIn'   :
              t.platform === 'x'         ? 'X'          :
              t.platform === 'facebook'  ? 'Facebook'   :
              t.platform === 'instagram' ? 'Instagram'  :
              t.platform === 'ussd'      ? 'USSD'       :
              'Play Store';

            /* Accent palette per role */
            type Palette = { bar: string; quoteText: string; avatarFrom: string; avatarTo: string; roleBg: string; roleText: string; roleBorder: string; shimmer: string };
            const palette: Palette =
              t.roleType === 'traveller' ? { bar: '#02b4f5', quoteText: '#0ea5e9', avatarFrom: '#0284c7', avatarTo: '#02b4f5', roleBg: 'rgba(2,180,245,0.10)', roleText: '#0369a1', roleBorder: 'rgba(2,180,245,0.22)', shimmer: 'rgba(2,180,245,0.06)' } :
              t.roleType === 'owner'     ? { bar: '#02665e', quoteText: '#059669', avatarFrom: '#02665e', avatarTo: '#10b981', roleBg: 'rgba(2,102,94,0.10)',  roleText: '#02665e', roleBorder: 'rgba(2,102,94,0.22)',  shimmer: 'rgba(2,102,94,0.05)'  } :
              t.roleType === 'driver'    ? { bar: '#d97706', quoteText: '#b45309', avatarFrom: '#b45309', avatarTo: '#f59e0b', roleBg: 'rgba(217,119,6,0.10)', roleText: '#92400e', roleBorder: 'rgba(217,119,6,0.22)', shimmer: 'rgba(217,119,6,0.05)'  } :
                                           { bar: '#7c3aed', quoteText: '#6d28d9', avatarFrom: '#6d28d9', avatarTo: '#a78bfa', roleBg: 'rgba(124,58,237,0.10)',roleText: '#5b21b6', roleBorder: 'rgba(124,58,237,0.22)',shimmer: 'rgba(124,58,237,0.05)' };

            const initials = (t.name || 'N')
              .split(' ')
              .map((p) => p.trim()[0])
              .filter(Boolean)
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <figure
                key={t.name + t.title}
                className="group relative flex flex-col rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm hover:-translate-y-1 transition-transform duration-300"
                style={{ boxShadow: '0 2px 16px rgba(2,6,23,0.06)' }}
              >
                {/* Coloured top bar */}
                <div className="h-0.5 w-full flex-shrink-0" style={{ background: palette.bar }} aria-hidden />

                {/* Card body */}
                <div className="flex flex-col flex-1 px-4 pt-3 pb-3 gap-2.5" style={{ background: `radial-gradient(circle at 0% 0%, ${palette.shimmer} 0%, transparent 60%)` }}>

                  {/* Opening quote + title */}
                  <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: `${palette.bar}18`, border: `1px solid ${palette.bar}33` }}>
                      <Quote className="w-3 h-3" style={{ color: palette.bar }} aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-bold leading-tight text-slate-800 truncate">{t.title}</div>
                      <div className="text-[10px] text-slate-400 leading-tight truncate">{t.company}</div>
                    </div>
                  </div>

                  {/* Quote text */}
                  <blockquote className="flex-1 text-[12px] leading-relaxed text-slate-600 font-normal">
                    &ldquo;{t.snippet}&rdquo;
                  </blockquote>

                  {/* Footer */}
                  <figcaption className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-black text-white"
                        style={{ background: `linear-gradient(135deg,${palette.avatarFrom},${palette.avatarTo})` }}>
                        {initials}
                      </div>
                      <div className="min-w-0 flex items-center gap-1.5">
                        <div className="text-[12px] font-semibold text-slate-900 truncate">{t.name}</div>
                        <div className="text-[10px] capitalize font-medium rounded-full px-1.5 py-px flex-shrink-0"
                          style={{ background: palette.roleBg, color: palette.roleText, border: `1px solid ${palette.roleBorder}` }}>
                          {t.roleType}
                        </div>
                      </div>
                    </div>

                    {/* Platform link */}
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View on ${platformLabel} (opens in new tab)`}
                      className="flex-shrink-0 flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <PlatformIcon className="w-3 h-3" aria-hidden />
                      <span className="hidden sm:inline">{platformLabel}</span>
                    </a>
                  </figcaption>
                </div>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}


