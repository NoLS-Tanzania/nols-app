"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import VoiceRecorder from './VoiceRecorder';

export default function BookingFlowCard() {
  const [busy, setBusy] = useState(false);
  const [bookingCode, setBookingCode] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(5);
  const [imgError, setImgError] = useState(false);
  // voice recorder handled by reusable component
  const containerRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const isInteractingRef = useRef(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const ROTATE_MS = 5000; // auto-rotate interval when idle
  const STEPS_COUNT = 5;

  useEffect(() => {
    // reset image error when changing steps so we try to load new image
    setImgError(false);
  }, [activeStep]);

  const clearIdleTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const scheduleIdleAdvance = useCallback((ms = ROTATE_MS) => {
    clearIdleTimer();
    // don't schedule while user is interacting
    if (isInteractingRef.current) return;
    timerRef.current = window.setTimeout(() => {
      setActiveStep((prev) => {
        if (prev === null) return 1;
        return (prev % STEPS_COUNT) + 1;
      });
      // schedule next advance after another idle interval
      scheduleIdleAdvance(ROTATE_MS);
    }, ms) as unknown as number;
  }, [clearIdleTimer]);

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

  


  const makeBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setBusy(true);
    setBookingCode(null);

    // simulate issuing booking code
    await new Promise((r) => setTimeout(r, 700));
    const code = `BK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setBookingCode(code);

    setBusy(false);
  };

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
        window.location.href = `/properties?${query}`;
      } else {
        // Fallback: if no filters detected, open properties page so user can refine
        window.location.href = '/properties';
      }
    } catch (err) {
      console.error(err);
      alert('Failed to process voice locally.');
    } finally {
      setBusy(false);
    }
  };

  // progress step derived from booking state (kept for future use)

  return (
    <section className="mt-2">
      <div className="public-container">
        {/* heading moved to a centered overlay inside the display */}
        <article ref={containerRef} className="rounded-lg border bg-white p-6 shadow-md">
          {/* Title moved to the section separator above; keep the card compact */}

          {/* Compact horizontal stepper: Book → Pay → Receive code → Driver confirm → Arrive */}
          <nav aria-label="Booking steps" className="mt-4">
            <ol role="list" className="flex items-center justify-between gap-3 text-xs">
                  {(
                // define step descriptors including optional decorative image
                  // define step descriptors (no image paths here — images render only when the step is active)
                  [
                    { label: 'Book', color: 'text-amber-500' },
                    { label: 'Pay', color: 'text-emerald-600' },
                    { label: 'Receive code', color: 'text-emerald-600' },
                    { label: 'Driver confirm', color: 'text-teal-500' },
                    { label: 'Arrive', color: 'text-blue-600' },
                  ]
              ).map((s, i) => {
                const stepNum = i + 1;
                const iconClass = s.color;

                return (
                  <li key={s.label} className="flex-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveStep(stepNum)}
                      aria-pressed={activeStep === stepNum}
                      aria-label={s.label}
                      className="flex items-center gap-2 p-0 bg-transparent border-0 rounded focus:outline-none focus:ring-2 focus:ring-blue-200 transform transition-transform duration-300 ease-in-out hover:scale-105"
                    >
                      <svg className={`w-6 h-6 ${iconClass} transition-colors`} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
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
                      <span className="text-sm text-slate-600">{s.label}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
          <div className="mt-6">
            {activeStep ? (
              <div className="w-full flex justify-center">
                <div className="max-w-2xl w-full">
                  <article
                    onClick={() => setActiveStep(null)}
                    className="relative rounded-lg border bg-gray-50 p-6 w-full transition-all duration-500 ease-in-out shadow-md"
                  >
                    {/* (Removed centered title/subtitle overlay per request) */}
                    {/* decorative image for the active step (optional) */}
                    {(() => {
                      const stepIndex = (activeStep ?? 1) - 1;
                      const stepData = [
                        '/assets/book_step_1.jpg',
                        // use project-provided pay image (you added Pay_step_2)
                        '/assets/pay_step_2.jpg',
                        '/assets/Booking_code_step_3.jpg',
                        '/assets/Driver_step_4.jpg',
                        '/assets/Arrive_step_5.jpg',
                      ][stepIndex];
                      // debug: verify which image is selected for the active step
                      // (remove this log after verification)
                      // eslint-disable-next-line no-console
                      console.debug('BookingFlowCard image debug', { activeStep, stepIndex, stepData, imgError });
                      if (!stepData || imgError) return null;
                      return (
                        <div className="mb-1 w-full rounded-md flex justify-center">
                          <div className="relative w-full max-w-md">
                            <Image
                              src={stepData}
                              alt={`Step ${activeStep} illustration`}
                              width={480}
                              height={128}
                              className={`w-full h-auto object-contain rounded-md transition-all duration-500 ease-in-out ${isInteracting ? 'scale-95 opacity-80' : 'scale-100 opacity-100'}`}
                              onError={() => setImgError(true)}
                            />

                            {/* Centered overlays placed inside the picture */}
                            {activeStep === 1 && (
                              <div className="absolute left-1/2 top-3 -translate-x-1/2 z-50 pointer-events-none">
                                <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-center shadow-sm border border-white/60">
                                  <span className="text-xs sm:text-sm font-semibold text-slate-900 drop-shadow">Search Smarter with Filters</span>
                                </div>
                              </div>
                            )}

                            {activeStep === 1 && (
                              <div className="absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-auto w-[min(92%,720px)]">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 justify-center items-center px-2 py-2 rounded-md">
                                  <Link href="/properties?filter=region" className="inline-flex items-center justify-center px-3 py-1 rounded-full text-white text-xs sm:text-sm no-underline bg-black/40 backdrop-blur-sm hover:bg-green-600/90 hover:text-white transition-colors">Region</Link>
                                  <Link href="/properties?filter=district" className="inline-flex items-center justify-center px-3 py-1 rounded-full text-white text-xs sm:text-sm no-underline bg-black/40 backdrop-blur-sm hover:bg-green-600/90 hover:text-white transition-colors">District</Link>
                                  <Link href="/properties?filter=ward" className="inline-flex items-center justify-center px-3 py-1 rounded-full text-white text-xs sm:text-sm no-underline bg-black/40 backdrop-blur-sm hover:bg-green-600/90 hover:text-white transition-colors">Ward</Link>
                                  <Link href="/properties?filter=price" className="inline-flex items-center justify-center px-3 py-1 rounded-full text-white text-xs sm:text-sm no-underline bg-black/40 backdrop-blur-sm hover:bg-green-600/90 hover:text-white transition-colors">Price</Link>
                                  <Link href="/properties?filter=property_type" className="inline-flex items-center justify-center px-3 py-1 rounded-full text-white text-xs sm:text-sm no-underline bg-black/40 backdrop-blur-sm hover:bg-green-600/90 hover:text-white transition-colors">Property</Link>
                                  <Link href="/properties?filter=nearby" className="inline-flex items-center justify-center px-3 py-1 rounded-full text-white text-xs sm:text-sm no-underline bg-black/40 backdrop-blur-sm hover:bg-green-600/90 hover:text-white transition-colors">Nearby</Link>
                                  <Link href="/properties?filter=amenities" className="inline-flex items-center justify-center px-3 py-1 rounded-full text-white text-xs sm:text-sm no-underline bg-black/40 backdrop-blur-sm hover:bg-green-600/90 hover:text-white transition-colors">Amenities</Link>
                                  <Link href="/properties?filter=safe_quiet" className="inline-flex items-center justify-center px-3 py-1 rounded-full text-white text-xs sm:text-sm no-underline bg-black/40 backdrop-blur-sm hover:bg-green-600/90 hover:text-white transition-colors">Quiet</Link>
                                </div>
                              </div>
                            )}

                            {activeStep === 2 && (
                              <>
                                <div className="absolute left-1/2 top-3 -translate-x-1/2 z-50 pointer-events-none">
                                  <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-center shadow-sm border border-white/60">
                                    <span className="text-sm font-semibold text-slate-900 drop-shadow">Integrated with easy payments</span>
                                  </div>
                                </div>

                                <div className="absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                                  <div className="flex items-center gap-3 rounded-md p-2 pointer-events-auto">
                                    <span className="w-10 h-10 flex items-center justify-center bg-white rounded p-1 shadow-sm transform transition duration-200 ease-in-out hover:scale-110 hover:shadow-md" aria-label="Airtel">
                                      <Image src="/assets/airtel_money.png" alt="Airtel" width={32} height={32} className="object-contain" />
                                    </span>
                                    <span className="w-10 h-10 flex items-center justify-center bg-white rounded p-1 shadow-sm transform transition duration-200 ease-in-out hover:scale-110 hover:shadow-md" aria-label="Halopesa">
                                      <Image src="/assets/halopesa.png" alt="Halopesa" width={32} height={32} className="object-contain" />
                                    </span>
                                    <span className="w-10 h-10 flex items-center justify-center bg-white rounded p-1 shadow-sm transform transition duration-200 ease-in-out hover:scale-110 hover:shadow-md" aria-label="Mixx by Yas">
                                      <Image src="/assets/mix%20by%20yas.png" alt="Mixx by Yas" width={32} height={32} className="object-contain" />
                                    </span>
                                    <span className="w-10 h-10 flex items-center justify-center bg-white rounded p-1 shadow-sm transform transition duration-200 ease-in-out hover:scale-110 hover:shadow-md" aria-label="T-Kash">
                                      <Image src="/assets/T_kash_logo.png" alt="T-Kash" width={32} height={32} className="object-contain" />
                                    </span>
                                    <span className="w-10 h-10 flex items-center justify-center bg-white rounded p-1 shadow-sm transform transition duration-200 ease-in-out hover:scale-110 hover:shadow-md" aria-label="MTN">
                                      <Image src="/assets/MTN%20LOGO.png" alt="MTN" width={32} height={32} className="object-contain" />
                                    </span>
                                    <span className="w-10 h-10 flex items-center justify-center bg-white rounded p-1 shadow-sm transform transition duration-200 ease-in-out hover:scale-110 hover:shadow-md" aria-label="M-Pesa">
                                      <Image src="/assets/M-pesa.png" alt="M-Pesa" width={32} height={32} className="object-contain" />
                                    </span>
                                    <span className="w-10 h-10 flex items-center justify-center bg-white rounded p-1 shadow-sm transform transition duration-200 ease-in-out hover:scale-110 hover:shadow-md" aria-label="Visa">
                                      <Image src="/assets/visa_card.png" alt="Visa" width={32} height={32} className="object-contain" />
                                    </span>
                                  </div>
                                </div>
                              </>
                            )}
                            {activeStep === 3 && (
                              <div className="absolute left-1/2 top-3 -translate-x-1/2 z-50 pointer-events-none">
                                <div className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-md text-center shadow-sm border border-white/60">
                                  <span className="text-sm font-semibold text-slate-900 drop-shadow">Receive Your Booking Code</span>
                                </div>
                              </div>
                            )}
                            {activeStep === 4 && (
                              <div className="absolute left-1/2 top-3 -translate-x-1/2 z-50 pointer-events-none">
                                <div className="px-2 py-0 text-center">
                                  <span className="text-sm font-bold text-white drop-shadow">Driver Confirms Pickup</span>
                                </div>
                              </div>
                            )}
                            {activeStep === 5 && (
                              <div className="absolute left-1/2 top-3 -translate-x-1/2 z-50 pointer-events-none">
                                <div className="bg-black/40 backdrop-blur-sm px-3 py-1 rounded-md text-center shadow-sm border border-white/30">
                                  <span className="text-sm sm:text-base font-semibold text-white drop-shadow">Complete Your Trip</span>
                                </div>
                              </div>
                            )}
                            {activeStep === 5 && (
                              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col items-center">
                                <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-md animate-pulse ring-2 ring-emerald-400/30">
                                  {/* Location / pin icon (inline) - replace with `/assets/location.png` if available */}
                                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#0f172a" strokeWidth="1.2" fill="none" />
                                    <circle cx="12" cy="9" r="2.5" fill="#059669" />
                                  </svg>
                                </div>

                                <span className="mt-3 inline-block bg-black/40 backdrop-blur-sm px-3 py-1 rounded-md text-white text-sm font-medium">Get ready for check-in</span>
                              </div>
                            )}
                            {activeStep === 3 && (
                              <div className="absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                                <div className="px-3 py-2 rounded-md text-center max-w-[90%]">
                                  <p className="text-sm sm:text-base text-white drop-shadow">After payment you will get a unique booking code to share with the driver.</p>
                                </div>
                              </div>
                            )}
                            {activeStep === 4 && (
                              <div className="absolute left-1/2 top-[72%] -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                                <div className="px-3 py-2 rounded-md text-center max-w-[90%]">
                                  <div className="flex flex-row flex-wrap justify-center gap-2">
                                    {[
                                      'Quick safety checks',
                                      'Driver ID & vehicle match',
                                      'Route looks correct',
                                      'If yes, start your trip.'
                                    ].map((phrase, i) => (
                                      <span key={i} className="inline-block bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-md text-white text-xs sm:text-sm font-normal drop-shadow">{phrase}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                            {activeStep === 1 && (
                              <div>
                                <div className="mt-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-slate-700">
                                    {/* voice recorder remains in panel body; filter pills moved into image overlay */}
                                    <VoiceRecorder onSubmit={handleVoiceSubmit} />
                                  </div>
                                </div>
                              </div>
                            )}

                    {activeStep === 2 && null}

                    {activeStep === 3 && null}

                    {activeStep === 4 && null}

                    {activeStep === 5 && null}
                  </article>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={makeBooking} className="mt-4">
            <div className="flex items-center gap-3">
              <button type="submit" disabled={busy} className="px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-60">
                {busy ? 'Processing…' : 'Book now'}
              </button>
            </div>
          </form>

          {/* show booking code when available so the state is actually used */}
          {bookingCode && (
            <div className="mt-4">
              <div className="rounded-md bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-900">
                <div className="font-medium">Booking confirmed</div>
                <div className="mt-1">
                  Your booking code: <span className="font-mono bg-white/60 px-2 py-0.5 rounded">{bookingCode}</span>
                </div>
              </div>
            </div>
          )}

          {/* status/info removed per request */}
        </article>
      </div>
    </section>
  );
}
