"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Facebook, Instagram, Linkedin, Quote, Eye, MessageCircle, Download, X } from 'lucide-react';

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

export default function Testimonials() {
  const total = TESTIMONIALS.length;
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportW, setViewportW] = useState(0);
  const [disableTransition, setDisableTransition] = useState(false);
  const resizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slides = useMemo(() => TESTIMONIALS.map((t) => ({ ...t, snippet: stripHtml(t.text) })), []);

  useEffect(() => {
    if (!viewportRef.current) return;
    const el = viewportRef.current;

    const update = () => {
      // During responsive resize/orientation changes, don't animate the transform jump.
      setDisableTransition(true);
      setViewportW(el.clientWidth || 0);
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      resizeTimerRef.current = setTimeout(() => setDisableTransition(false), 160);
    };
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
    };
  }, []);

  const start = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive((a) => ((a + 1) % total));
    }, 9000);
  };

  const stop = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (total <= 1) return;
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const goTo = (idx: number) => {
    const safe = ((idx % total) + total) % total;
    setActive(safe);
  };

  const goPrev = () => {
    stop();
    goTo(active - 1);
    start();
  };

  const goNext = () => {
    stop();
    goTo(active + 1);
    start();
  };

  return (
    <section className="mt-8" aria-labelledby="testimonials-heading">
      <div className="public-container">
        <div className="rounded-xl border bg-gradient-to-b from-white via-slate-50 to-white p-5 sm:p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h3 id="testimonials-heading" className="text-xl sm:text-2xl font-semibold text-slate-900">
                What our customers say
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Real stories from travellers, drivers and{" "}
                <strong className="text-emerald-700 font-semibold">hosts</strong> who use NoLSAF.
              </p>
            </div>
            <div className="hidden sm:block" aria-hidden="true" />
          </div>

          <div
            className="mt-5"
            onMouseEnter={stop}
            onMouseLeave={start}
            onFocus={stop}
            onBlur={start}
          >
            <div className="relative">
              <div ref={viewportRef} className="w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div
                  className={[
                    "flex will-change-transform",
                    // Responsive + accessible motion: no animation while resizing or when user prefers reduced motion
                    disableTransition ? "transition-none" : "transition-transform duration-500 ease-out",
                    "motion-reduce:transition-none",
                  ].join(" ")}
                  style={{ transform: `translateX(-${active * viewportW}px)` }}
                  aria-live="polite"
                >
                  {slides.map((t) => {
                    const href = SOCIAL_LINKS[t.platform as keyof typeof SOCIAL_LINKS] || '#';
                    const PlatformIcon =
                      t.platform === 'linkedin' ? Linkedin :
                      t.platform === 'x' ? X :
                      t.platform === 'facebook' ? Facebook :
                      t.platform === 'instagram' ? Instagram :
                      t.platform === 'ussd' ? MessageCircle :
                      Download;

                    const platformColor =
                      t.platform === 'linkedin' ? 'text-sky-600' :
                      t.platform === 'x' ? 'text-slate-800' :
                      t.platform === 'facebook' ? 'text-blue-600' :
                      t.platform === 'instagram' ? 'text-pink-600' :
                      t.platform === 'play' ? 'text-emerald-600' :
                      'text-emerald-700';

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
                        aria-label="Testimonial"
                        className="flex-shrink-0"
                        // Fallback to 100% until we measure viewportW, so the first paint is still perfectly centered.
                        style={{ width: viewportW ? `${viewportW}px` : '100%' }}
                      >
                        <div className="px-4 py-3 sm:px-6 sm:py-5">
                          <div className="mx-auto max-w-4xl flex flex-col items-center text-center gap-3">
                            <div className="flex items-center justify-center gap-2">
                              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100">
                                <Quote className="w-4.5 h-4.5 text-emerald-700" aria-hidden />
                              </span>
                              <div>
                                <div className="text-sm font-semibold text-emerald-800 leading-tight whitespace-normal break-words">
                                  {t.title}
                                </div>
                                <div className="text-xs text-slate-500 whitespace-normal break-words">
                                  {t.company ? t.company : (t.roleType ? (t.roleType.charAt(0).toUpperCase() + t.roleType.slice(1)) : '')}
                                </div>
                              </div>
                            </div>

                            <div className="w-full max-w-3xl text-sm text-slate-700 leading-relaxed whitespace-normal break-words">
                              {t.snippet}
                            </div>

                            <figcaption className="flex flex-wrap items-center justify-center gap-2">
                              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-semibold">
                                {initials}
                              </div>
                              <div className="text-sm font-semibold text-slate-900 max-w-full">
                                {t.name}
                              </div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-600 whitespace-nowrap">
                                <PlatformIcon className={`w-3.5 h-3.5 ${platformColor}`} aria-hidden />
                                <span className="capitalize">{t.platform}</span>
                              </span>
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`View on ${t.platform} (opens in new tab)`}
                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                <Eye className="w-4 h-4" aria-hidden />
                              </a>
                            </figcaption>
                          </div>
                        </div>
                      </figure>
                    );
                  })}
                </div>
              </div>

              {/* Overlay arrows so centering never shifts */}
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous testimonial"
                className={[
                  "hidden sm:inline-flex items-center justify-center",
                  "absolute left-2 top-1/2 -translate-y-1/2",
                  "w-10 h-10 rounded-xl border border-slate-200",
                  "bg-white/90 backdrop-blur text-slate-700",
                  "hover:bg-white hover:shadow-sm",
                  "transition-all active:scale-[0.98]",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-200",
                ].join(" ")}
              >
                <ChevronLeft className="w-5 h-5" aria-hidden />
              </button>

              <button
                type="button"
                onClick={goNext}
                aria-label="Next testimonial"
                className={[
                  "hidden sm:inline-flex items-center justify-center",
                  "absolute right-2 top-1/2 -translate-y-1/2",
                  "w-10 h-10 rounded-xl border border-slate-200",
                  "bg-white/90 backdrop-blur text-slate-700",
                  "hover:bg-white hover:shadow-sm",
                  "transition-all active:scale-[0.98]",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-200",
                ].join(" ")}
              >
                <ChevronRight className="w-5 h-5" aria-hidden />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-center gap-1.5">
              {Array.from({ length: total }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { stop(); goTo(i); start(); }}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={[
                    "w-2 h-2 rounded-full transition-all",
                    i === active ? "bg-emerald-600 w-5" : "bg-slate-300 hover:bg-slate-400",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
