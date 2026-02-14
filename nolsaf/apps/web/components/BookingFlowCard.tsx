"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BadgeCheck, CheckCircle2, Home, KeyRound, MapPinned, PlayCircle, ShieldCheck, User } from 'lucide-react';
import VoiceRecorder from './VoiceRecorder';

export default function BookingFlowCard() {
  const [busy, setBusy] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [imgError, setImgError] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  // voice recorder handled by reusable component
  const containerRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const isInteractingRef = useRef(false);
  const [isInteracting, setIsInteracting] = useState(false);
  // Animation state for transitions
  const [isTransitioning, setIsTransitioning] = useState(false);
  const highlightRef = useRef<HTMLSpanElement>(null);

  const ROTATE_MS = 5000; // auto-rotate interval when idle
  const STEPS_COUNT = 5;

  useEffect(() => {
    // reset image error when changing steps so we try to load new image
    setImgError(false);
  }, [activeStep]);

  // Handle step transitions with animation
  const handleStepChange = useCallback((newStep: number) => {
    if (newStep === activeStep || isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Update highlight bar position using CSS variables for animation
    if (highlightRef.current) {
      const stepWidth = 100 / STEPS_COUNT;
      const prevOffset = ((activeStep - 1) * stepWidth);
      const currentOffset = ((newStep - 1) * stepWidth);
      
      highlightRef.current.style.setProperty('--prev-offset', `${prevOffset}%`);
      highlightRef.current.style.setProperty('--current-offset', `${currentOffset}%`);
      highlightRef.current.classList.add('step-highlight-animate');
    }
    
    // Trigger exit animation, then enter
    setTimeout(() => {
      setActiveStep(newStep);
      // Remove animation class after animation completes to allow re-triggering
      setTimeout(() => {
        setIsTransitioning(false);
        if (highlightRef.current) {
          highlightRef.current.classList.remove('step-highlight-animate');
        }
      }, 600);
    }, 200);
  }, [activeStep, isTransitioning]);

  const clearIdleTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const scheduleIdleAdvance = useCallback((ms = ROTATE_MS) => {
    clearIdleTimer();
    // don't schedule while user is interacting or transitioning
    if (isInteractingRef.current || isTransitioning) return;
    timerRef.current = window.setTimeout(() => {
      const current = activeStep ?? 1;
      const next = (current % STEPS_COUNT) + 1;
      handleStepChange(next);
      // schedule next advance after another idle interval
      scheduleIdleAdvance(ROTATE_MS);
    }, ms) as unknown as number;
  }, [clearIdleTimer, activeStep, isTransitioning, handleStepChange]);

  useEffect(() => {
    // start the idle rotation schedule on mount
    scheduleIdleAdvance();

    const el = containerRef.current;
    if (!el) return () => clearIdleTimer();

    const onInteractionStart = () => {
      isInteractingRef.current = true;
      setIsInteracting(true);
      clearIdleTimer();
    };

    const onInteractionEnd = () => {
      isInteractingRef.current = false;
      setIsInteracting(false);
      // schedule next advance after user stops interacting
      scheduleIdleAdvance(ROTATE_MS);
    };

    // listen for common interaction start/end events within the card
    el.addEventListener('pointerdown', onInteractionStart);
    el.addEventListener('pointermove', onInteractionStart);
    el.addEventListener('touchstart', onInteractionStart);
    el.addEventListener('mouseenter', onInteractionStart);
    el.addEventListener('focusin', onInteractionStart);
    el.addEventListener('keydown', onInteractionStart);

    el.addEventListener('pointerup', onInteractionEnd);
    el.addEventListener('touchend', onInteractionEnd);
    el.addEventListener('mouseleave', onInteractionEnd);
    el.addEventListener('focusout', onInteractionEnd);

    return () => {
      clearIdleTimer();
      el.removeEventListener('pointerdown', onInteractionStart);
      el.removeEventListener('pointermove', onInteractionStart);
      el.removeEventListener('touchstart', onInteractionStart);
      el.removeEventListener('mouseenter', onInteractionStart);
      el.removeEventListener('focusin', onInteractionStart);
      el.removeEventListener('keydown', onInteractionStart);

      el.removeEventListener('pointerup', onInteractionEnd);
      el.removeEventListener('touchend', onInteractionEnd);
      el.removeEventListener('mouseleave', onInteractionEnd);
      el.removeEventListener('focusout', onInteractionEnd);
    };
  }, [clearIdleTimer, scheduleIdleAdvance]);

  


  // handle voice submission client-side: accept recorded Blob and optional transcript
  const extractFiltersFromText = (text: string) => {
    const t = (text || '').toLowerCase();
    const params: Record<string, string> = {};
    if (t.includes('quiet') || t.includes('safe') || t.includes('away from road') || t.includes('far from road')) {
      params.filter = 'safe_quiet';
    }
    const bedMatch = t.match(/(\b(\d+)\s*(bedroom|bedrooms|br)\b)/i);
    if (bedMatch) params.bedrooms = bedMatch[2];
    const underMatch = t.match(/under\s*(\d+[kK]?)/);
    if (underMatch) {
      let v = underMatch[1];
      if (v.toLowerCase().endsWith('k')) v = String(parseInt(v.slice(0, -1), 10) * 1000);
      params.max_price = v;
    } else {
      const numMatch = t.match(/(\d{3,6})/);
      if (numMatch) params.max_price = numMatch[1];
    }
    return params;
  };

  const toQueryString = (params: Record<string, string>) => new URLSearchParams(params).toString();

  const handleVoiceSubmit = async (file: Blob, transcript?: string) => {
    setBusy(true);
    try {
      // If transcript provided, use it to extract filters client-side.
      const text = transcript || '';
      const filters = extractFiltersFromText(text);
      const query = toQueryString(filters);
      if (query) {
        window.location.href = `/public/properties?${query}`;
      } else {
        // Fallback: if no filters detected, open properties page so user can refine
        window.location.href = '/public/properties';
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process voice locally.');
    } finally {
      setBusy(false);
    }
  };

  // progress step derived from booking state (kept for future use)

  const steps = [
    { label: 'Book', color: 'text-amber-500' },
    { label: 'Pay', color: 'text-emerald-600' },
    { label: 'Receive code', color: 'text-emerald-600' },
    { label: 'Driver confirm', color: 'text-teal-500' },
    { label: 'Arrive', color: 'text-blue-600' },
  ];

  const stepHighlightWidth = 100 / steps.length;
  const highlightOffset = ((activeStep ?? 1) - 1) * stepHighlightWidth;

  const stepMeta = [
    {
      title: 'Book',
      kicker: 'Search smarter with filters or voice.',
      image: '/assets/book_step_1.jpg',
    },
    {
      title: 'Pay',
      kicker: 'Easy payments with local providers.',
      // Use exact filename case (important for Linux deployments)
      image: '/assets/Pay_step_2.jpg',
    },
    {
      title: 'Receive code',
      kicker: 'Get a unique code after payment.',
      image: '/assets/Booking_code_step_3.jpg',
    },
    {
      title: 'Driver confirm',
      kicker: 'Quick safety checks before you go.',
      image: '/assets/nolsaf_driver.jpg',
    },
    {
      title: 'Arrive',
      kicker: 'You’re all set for check‑in.',
      image: '/assets/Arrive_step_5.jpg',
    },
  ] as const;

  const activeMeta = stepMeta[(activeStep ?? 1) - 1] ?? stepMeta[0];

  // Preload step images so you don't see "faint/blank" while switching steps.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const imgs = stepMeta.map((s) => {
      const img = new window.Image();
      img.src = s.image;
      return img;
    });
    return () => {
      // allow GC
      imgs.length = 0;
    };
  }, []);

  return (
    <>
      <section className="mt-6" aria-label="Booking flow">
        <div className="public-container">
          <article
            ref={containerRef}
            className="relative overflow-hidden rounded-3xl p-[1px] ring-1 ring-slate-200/70 shadow-[0_22px_70px_rgba(2,6,23,0.10)] bg-gradient-to-br from-white/85 via-slate-200/45 to-emerald-200/35"
          >
            <div className="relative overflow-hidden rounded-[22px] border border-white/70 bg-white/70 backdrop-blur-xl">
              <div
                className="pointer-events-none absolute inset-0 opacity-55 bg-[radial-gradient(circle_at_18%_14%,rgba(2,180,245,0.14),transparent_52%),radial-gradient(circle_at_90%_86%,rgba(2,102,94,0.12),transparent_56%)]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-55 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.78)_48%,rgba(255,255,255,0.30)_52%,transparent_100%)]"
                aria-hidden
              />

              <div className="relative p-4 sm:p-6">
                {/* Stepper */}
                <nav aria-label="Booking steps" className="mt-0">
                  <div
                    className="relative flex items-center gap-2 sm:gap-3 text-xs rounded-full px-3 py-2 overflow-x-auto scrollbar-hide ring-1 ring-slate-200/70 border border-white/70 bg-gradient-to-r from-amber-50/70 via-emerald-50/60 to-sky-50/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
                  >
                    <span
                      ref={highlightRef}
                      aria-hidden
                      className="absolute inset-y-1 rounded-full bg-white/85 ring-1 ring-white/70 shadow-[0_10px_28px_rgba(2,6,23,0.10)]"
                      style={{
                        width: `${stepHighlightWidth}%`,
                        transform: `translateX(${highlightOffset}%)`,
                      }}
                    />
                    <ol
                      role="list"
                      className="flex items-center gap-2 sm:gap-3 w-full list-none m-0 p-0"
                    >
                  {steps.map((s, i) => {
                    const stepNum = i + 1;
                    const iconClass = s.color;

                    return (
                      <li key={s.label} className="relative z-10 flex-1 min-w-[8.5rem] sm:min-w-0 list-none">
                        <button
                          type="button"
                          onClick={() => handleStepChange(stepNum)}
                          aria-pressed={activeStep === stepNum}
                          aria-label={s.label}
                          disabled={isTransitioning}
                          className={[
                            "w-full flex items-center justify-center gap-2 bg-transparent border-0 rounded-full px-2 py-1.5",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02b4f5]/25 transform transition-all duration-300 ease-out",
                            activeStep === stepNum ? "scale-[1.02]" : "hover:scale-[1.02]",
                            isTransitioning ? "opacity-60 cursor-wait" : "",
                          ].join(" ")}
                        >
                          <span className={["text-[11px] tabular-nums", activeStep === stepNum ? "text-slate-900" : "text-slate-500"].join(" ")}>{stepNum}.</span>
                          <svg className={`w-5 h-5 sm:w-6 sm:h-6 ${iconClass} transition-colors`} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                            {i === 0 && (
                              <>
                                <rect x="3" y="4" width="18" height="6" rx="1" />
                                <path d="M7 10v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </>
                            )}
                            {i === 1 && (
                              <>
                                <rect x="2" y="7" width="20" height="10" rx="2" />
                                <path d="M6 11h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </>
                            )}
                            {i === 2 && (
                              <>
                                <rect x="3" y="4" width="18" height="14" rx="2" />
                                <path d="M7 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                              </>
                            )}
                            {i === 3 && (
                              <>
                                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M12 8v4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </>
                            )}
                            {i === 4 && (
                              <>
                                <path d="M12 2c3.866 0 7 3.134 7 7 0 5-7 13-7 13s-7-8-7-13c0-3.866 3.134-7 7-7z" stroke="currentColor" strokeWidth="1.2" />
                                <circle cx="12" cy="9" r="2" fill="currentColor" />
                              </>
                            )}
                          </svg>
                          <span className={["text-sm whitespace-nowrap", activeStep === stepNum ? "text-slate-900" : "text-slate-700"].join(" ")}>{s.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </nav>

            {/* Content */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Image */}
              <div className="md:col-span-6 order-1 md:order-2">
                <div
                  key={`img-${activeStep}-${activeMeta.image}`}
                  className={[
                    "relative overflow-hidden rounded-3xl border border-white/70 bg-slate-100 ring-1 ring-slate-200/70",
                    // Slightly smaller/tighter image height across breakpoints
                    "aspect-[16/10]",
                    "shadow-[0_18px_55px_rgba(2,6,23,0.14)] step-enter",
                  ].join(" ")}
                >
                  {!imgError ? (
                    <Image
                      src={activeMeta.image}
                      alt={`Step ${activeStep}: ${activeMeta.title}`}
                      fill
                      className={[
                        "object-cover",
                        "transition-transform duration-300",
                        // Step 4 image is naturally dark; boost slightly so it doesn't look "faint"
                        activeStep === 4 ? "brightness-110 contrast-105 saturate-105" : "",
                        isInteracting ? "scale-[0.99]" : "scale-100",
                      ].join(" ")}
                      onError={() => setImgError(true)}
                      priority={false}
                      sizes="(min-width: 768px) 60vw, 100vw"
                    />
                  ) : null}

                  {/* Overlay for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

                  <div className="absolute left-4 right-4 bottom-4 text-white">
                    <div className="text-sm font-semibold tracking-wide opacity-90">Step {activeStep} of {STEPS_COUNT}</div>
                    <div className="mt-1 text-xl sm:text-2xl font-bold leading-tight">{activeMeta.title}</div>
                    <div className="mt-1 text-sm text-white/90">{activeMeta.kicker}</div>
                  </div>

                  {/* Small decorative for the final step */}
                  {activeStep === 5 ? (
                    <div className="absolute right-4 top-4">
                      <div className="w-12 h-12 rounded-full bg-white/85 backdrop-blur flex items-center justify-center shadow-md ring-2 ring-emerald-400/30">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#0f172a" strokeWidth="1.4" />
                          <circle cx="12" cy="9" r="2.5" fill="#059669" />
                        </svg>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Text / actions */}
              <div className="md:col-span-6 order-2 md:order-1">
                <div className="rounded-3xl border border-white/70 bg-white/70 backdrop-blur-xl ring-1 ring-slate-200/70 p-4 sm:p-5 shadow-[0_18px_55px_rgba(2,6,23,0.10)]">
                  <div className="text-base font-semibold text-slate-900 tracking-tight">{activeMeta.title}</div>
                  <div className="mt-1 text-sm text-slate-600 leading-relaxed">{activeMeta.kicker}</div>

                  {activeStep === 1 ? (
                    <>
                      <div className="mt-4">
                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Quick filters</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {[
                            { label: 'Region', href: '/public/properties?filter=region' },
                            { label: 'District', href: '/public/properties?filter=district' },
                            { label: 'Ward', href: '/public/properties?filter=ward' },
                            { label: 'Price', href: '/public/properties?filter=price' },
                            { label: 'Property', href: '/public/properties?filter=property_type' },
                            { label: 'Nearby', href: '/public/properties?filter=nearby' },
                            { label: 'Amenities', href: '/public/properties?filter=amenities' },
                            { label: 'Quiet', href: '/public/properties?filter=safe_quiet' },
                          ].map((p) => (
                            <Link
                              key={p.label}
                              href={p.href}
                              className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium no-underline bg-slate-100 text-slate-700 hover:bg-[#02665e] hover:text-white transition-colors"
                            >
                              {p.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Or speak it</div>
                        <div className="mt-2">
                          <VoiceRecorder onSubmit={handleVoiceSubmit} />
                        </div>
                      </div>
                    </>
                  ) : null}

                  {activeStep === 2 ? (
                    <div className="mt-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Supported payments</div>
                        <div className="text-[11px] text-slate-500">Tap a logo</div>
                      </div>

                      <div className="mt-2 rounded-2xl border border-slate-200/70 p-3 nols-pay-strip shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                        {[
                          { key: 'airtel', alt: 'Airtel Money', src: '/assets/airtel_money.png' },
                          { key: 'halopesa', alt: 'Halopesa', src: '/assets/halopesa.png' },
                          { key: 'mixx', alt: 'Mixx by Yas', src: '/assets/mix%20by%20yas.png' },
                          { key: 'tkash', alt: 'T-Kash', src: '/assets/T_kash_logo.png' },
                          { key: 'mtn', alt: 'MTN', src: '/assets/MTN%20LOGO.png' },
                          { key: 'mpesa', alt: 'M-Pesa', src: '/assets/M-pesa.png' },
                          { key: 'visa', alt: 'Visa', src: '/assets/visa_card.png' },
                        ].map((p) => {
                          const selected = selectedPayment === p.key;
                          return (
                            <button
                              key={p.key}
                              type="button"
                              onClick={() => setSelectedPayment(p.key)}
                              aria-label={`Select ${p.alt}`}
                              aria-pressed={selected}
                              className={[
                                "nols-pay-tile group w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center",
                                "bg-white/90 backdrop-blur rounded-xl border shadow-sm",
                                "transition-all duration-300 ease-out",
                                "hover:bg-white hover:shadow-md hover:-translate-y-0.5",
                                // touch / click feedback
                                "active:translate-y-0 active:scale-[0.97]",
                                "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white/60",
                                selected
                                  ? "border-emerald-500 ring-2 ring-emerald-200/70 shadow-[0_10px_25px_rgba(2,102,94,0.18)]"
                                  : "border-slate-200/80",
                              ].join(" ")}
                            >
                              <Image
                                src={p.src}
                                alt={p.alt}
                                width={30}
                                height={30}
                                className="w-7 h-7 object-contain transition-transform duration-300 ease-out group-hover:scale-110"
                              />
                            </button>
                          );
                        })}
                        </div>
                      </div>
                      <div className="mt-3 text-sm text-slate-600">
                        Pay securely, then receive your booking code instantly.
                      </div>
                    </div>
                  ) : null}

                  {activeStep === 3 ? (
                    <div className="mt-4 text-sm text-slate-600">
                      After payment you’ll receive a unique booking code. Share it at pickup/check‑in to confirm your reservation.
                      <div className="mt-3 rounded-2xl bg-white/65 backdrop-blur border border-slate-200/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Example</div>
                        <div className="mt-1 font-mono text-slate-800">Thank You for Booking with NoLSAF! Your booking code is: BK-7Q2KX9 Please present this code at check-in. Thank you!</div>
                      </div>
                    </div>
                  ) : null}

                  {activeStep === 4 ? (
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Before you start</div>
                      <ul className="mt-2 space-y-2 text-sm text-slate-600">
                        {[
                          { text: 'Quick safety checks', Icon: ShieldCheck },
                          { text: 'Driver ID & vehicle match', Icon: BadgeCheck },
                          { text: 'Route looks correct', Icon: MapPinned },
                          { text: 'If yes, start your trip.', Icon: PlayCircle },
                        ].map(({ text, Icon }) => (
                          <li key={text} className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                              <Icon className="w-4 h-4 text-emerald-600" aria-hidden />
                            </span>
                            <span className="leading-6">{text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {activeStep === 5 ? (
                    <div className="mt-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Arrive & check‑in</div>
                          <div className="mt-0.5 text-sm text-slate-600">
                            You’re all set for check‑in. Here’s what to do when you arrive.
                          </div>
                        </div>
                      </div>

                      <ul className="mt-4 space-y-2 text-sm text-slate-600">
                        {[
                          { text: 'Keep your booking code ready.', Icon: KeyRound },
                          { text: 'Follow the property check‑in instructions.', Icon: Home },
                          { text: 'Once confirmed, you’re good to go.', Icon: CheckCircle2 },
                        ].map(({ text, Icon }) => (
                          <li key={text} className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center">
                              <Icon className="w-4 h-4 text-slate-700" aria-hidden />
                            </span>
                            <span className="leading-6">{text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="mt-5">
                    <Link
                      href="/public/properties"
                      aria-disabled={busy ? "true" : "false"}
                      className={[
                        "group inline-flex items-center justify-center gap-2",
                        "w-full max-w-[360px] mx-auto min-[420px]:w-auto min-[420px]:max-w-none",
                        "px-5 py-2.5 rounded-2xl no-underline font-semibold",
                        "text-white shadow-sm",
                        "bg-gradient-to-r from-[#02665e] via-[#02665e] to-emerald-600",
                        "hover:shadow-[0_16px_40px_rgba(2,102,94,0.22)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]",
                        "transition-all duration-200",
                        "focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2 focus:ring-offset-white",
                        busy ? "opacity-70 pointer-events-none" : "",
                      ].join(" ")}
                    >
                      <span>Browse stays</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                    <div className="mt-2 text-xs text-slate-500 text-center">
                      Tip: Tap the steps above to preview the full flow.
                    </div>
                  </div>
                </div>
              </div>
            </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <div className="w-full my-8">
        <div className="max-w-6xl mx-auto px-4 flex justify-center">
          <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center" role="img" aria-label="Founder">
            <User className="w-8 h-8 text-emerald-600" aria-hidden="false" />
          </div>
        </div>
      </div>

      
    </>
  );
}
