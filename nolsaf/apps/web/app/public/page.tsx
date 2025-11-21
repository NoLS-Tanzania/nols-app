"use client";

import Link from "next/link";
import Image from "next/image";
import { User } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, FormEvent, useMemo } from "react";
import { DayPicker } from 'react-day-picker';
/* react-day-picker in this project/version doesn't export a Range type,
   so provide a local Range type compatible with the code below. */
type Range = { from: Date; to?: Date };
import 'react-day-picker/dist/style.css';
import { useRouter } from 'next/navigation';

export default function Page() {
  const slides: {
    src: string;
    alt: string;
    title: string;
    subtitle: string;
    ctaLabel?: string;
    ctaHref?: string;
    ussdCode?: string;
    secondaryLabel?: string;
    secondaryHref?: string;
  }[] = [
    {
      src: '/assets/nolsaf picture 1.jpg',
      alt: 'Coastal retreat, Zanzibar',
      title: 'Quality Stay For Every Wallet',
      subtitle:
        'East Africa’s first end-to-end travel marketplace — book stays and safe transport in one seamless step.',
      // primary CTA intentionally omitted for this slide
    },
    {
      src: '/assets/nolsaf picture 22.jpg',
      alt: 'Safari lodge under the Acacia',
      title: 'No Internet? No Problem',
      subtitle: 'Dial *123# now to see available stays. Secure, low-cost, and works without mobile data.',
      ctaLabel: 'Dial *123#',
      ctaHref: 'tel:*123%23',
      ussdCode: '*123#'
    },
    {
      src: '/assets/nolsaf picture 3.jpg',
      alt: 'City stay with skyline views',
      title: 'City Stays, Local Comfort',
      subtitle:
        'Comfortable apartments and boutique hotels across cities — book accommodation and secure rides to your doorstep.',
      ctaLabel: 'Browse city stays',
      ctaHref: '/public/properties?type=city',
    },
  ];

  const [idx, setIdx] = useState(0);
  const active = slides[idx];
  const router = useRouter();
  const timerRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);

  // Search form state for hero (first slide)
  const [q, setQ] = useState('');
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [checkin, setCheckin] = useState<string>('');
  const [checkout, setCheckout] = useState<string>('');
  const [guestOpen, setGuestOpen] = useState(false);
  const guestRef = useRef<HTMLDivElement | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement | null>(null);
  // compute today's date in local YYYY-MM-DD for input min values
  const todayStr = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  // DayPicker range state (derived/synced with checkin/checkout strings)
  const [selectedRange, setSelectedRange] = useState<Range | undefined>(() => {
    if (!checkin) return undefined;
    const from = new Date(checkin);
    const to = checkout ? new Date(checkout) : undefined;
    return { from, to } as Range;
  });

  const todayDate = useMemo(() => new Date(todayStr), [todayStr]);

  const formatDate = (d?: Date) => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Rotating search hints for the search input placeholder
  const searchHints = ['Region', 'Accommodations', 'Amenities', 'Nearby', 'Cities', 'Districts', 'Prices'];
  const [hintIdx, setHintIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setHintIdx((i) => (i + 1) % searchHints.length), 2000);
    return () => clearInterval(id);
  }, [searchHints.length]);
  const searchPlaceholder = `Search By ${searchHints[hintIdx]}`;

  // Format a concise range like "21-25/11/2025" when month/year are the same
  const formatRangeShort = (fromStr?: string, toStr?: string) => {
    if (!fromStr) return '';
    if (!toStr) return fromStr;
    try {
      const f = new Date(fromStr);
      const t = new Date(toStr);
      const fDay = String(f.getDate()).padStart(2, '0');
      const tDay = String(t.getDate()).padStart(2, '0');
      const fMonth = String(f.getMonth() + 1).padStart(2, '0');
      const tMonth = String(t.getMonth() + 1).padStart(2, '0');
      const fYear = f.getFullYear();
      const tYear = t.getFullYear();
      if (fYear === tYear && fMonth === tMonth) {
        return `${parseInt(fDay, 10)}-${parseInt(tDay, 10)}/${fMonth}/${fYear}`;
      }
      // fallback to full ranges
      return `${fDay}/${fMonth}/${fYear} - ${tDay}/${tMonth}/${tYear}`;
    } catch (e) {
      return `${fromStr}${toStr ? ` - ${toStr}` : ''}`;
    }
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    // Build query params
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (adults) params.set('adults', String(adults));
    if (children) params.set('children', String(children));
    if (checkin) params.set('checkin', checkin);
    if (checkout) params.set('checkout', checkout);
    const href = `/public/properties?${params.toString()}`;
    // navigate to search results
    router.push(href);
  };

  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    // 20000ms = 20 seconds per slide
    timerRef.current = window.setInterval(() => {
      setIdx((i) => (i + 1) % slides.length);
    }, 20000);
  }, [stopTimer, slides.length]);

  useEffect(() => {
    if (!paused) startTimer();
    return () => stopTimer();
  }, [startTimer, stopTimer, paused]);

  // Inject animations and set per-word delays on the client to avoid SSR hydration mismatches
  useEffect(() => {
    const styleId = 'nolsaf-hero-animations';
    if (!document.getElementById(styleId)) {
      const css = `
        .hero-title { display: inline-block; }
        .hero-title span { background-color: rgba(0,0,0,0); animation: boxFill 420ms ease forwards; }
        .hero-title .reveal { display: inline-block; transform-origin: left; transform: scaleX(0); opacity: 0; animation: write 520ms ease forwards; }
        @keyframes write { to { transform: scaleX(1); opacity: 1; } }
        @keyframes boxFill { to { background-color: rgba(0,0,0,0.5); } }

        /* High blink animation for urgent banner titles */
        @keyframes highBlink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }
        .high-blink { animation: highBlink 600ms linear infinite; }

        .sub-title { position: relative; display: inline-block; }
        .sub-title .sub-word { background-color: rgba(0,0,0,0); animation: boxFillSub 150ms ease forwards; }
        .sub-title .sub-reveal { display: inline-block; transform-origin: left; transform: scaleX(0); opacity: 0; animation: writeSub 300ms ease forwards; }
        .sub-title .pen { position: absolute; top: 100%; left: 0; width: 28px; height: 28px; margin-top: 6px; background: transparent; transform: translateX(-50%) translateY(-50%); background-size: contain; background-repeat: no-repeat; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'><path d='M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z'/></svg>"); animation-play-state: paused; pointer-events: none; }
        .writing-active .sub-title .pen { animation-play-state: running; }
        @keyframes writeSub { to { transform: scaleX(1); opacity: 1; } }
        @keyframes boxFillSub { to { background-color: rgba(0,0,0,0.4); } }
        @keyframes penMove { to { transform: translateX(105%) translateY(-50%); } }
      `;
      const el = document.createElement('style');
      el.id = styleId;
      el.textContent = css;
      document.head.appendChild(el);
    }

    // Set per-word animation delays for subtitle so the whole subtitle finishes in 6s
    const totalMs = 6000;
    const container = document.querySelector('.sub-title');
    if (container) {
      const words = Array.from(container.querySelectorAll('.sub-word'));
      const count = words.length || 1;
      words.forEach((el, i) => {
        const pct = i / Math.max(1, count - 1);
        const revealDelay = Math.round(pct * totalMs);
        const boxDelay = Math.max(0, revealDelay - 200);
        (el as HTMLElement).style.animationDelay = `${boxDelay}ms`;
        const inner = el.querySelector('.sub-reveal') as HTMLElement | null;
        if (inner) inner.style.animationDelay = `${revealDelay}ms`;
      });

      // set pen animation duration and start position
      const pen = container.querySelector('.pen') as HTMLElement | null;
      if (pen) {
        pen.style.animation = `penMove ${totalMs}ms linear forwards`;
        if (container.classList.contains('writing-active')) {
          pen.style.animationPlayState = 'running';
        } else {
          pen.style.animationPlayState = 'paused';
        }
      }
    }

    return () => {
      // keep the style tag (shared), but clear per-word inline delays when unmounting
      const container = document.querySelector('.sub-title');
      if (container) {
        const words = Array.from(container.querySelectorAll('.sub-word')) as HTMLElement[];
        words.forEach((el) => {
          el.style.animationDelay = '';
          const inner = el.querySelector('.sub-reveal') as HTMLElement | null;
          if (inner) inner.style.animationDelay = '';
        });
        const pen = container.querySelector('.pen') as HTMLElement | null;
        if (pen) pen.style.animation = '';
      }
    };
  }, [idx, active.subtitle]);

  // Close guest selector when clicking outside or pressing Escape
  useEffect(() => {
    if (!guestOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (guestRef.current && !guestRef.current.contains(e.target as Node)) {
        setGuestOpen(false);
        setPaused(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setGuestOpen(false);
        setPaused(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [guestOpen]);

  // Close date panel when clicking outside or pressing Escape
  useEffect(() => {
    if (!dateOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateOpen(false);
        setPaused(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDateOpen(false);
        setPaused(false);
      }
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [dateOpen]);

  // keep selectedRange in sync when checkin/checkout change externally
  useEffect(() => {
    if (!checkin) {
      setSelectedRange(undefined);
      return;
    }
    const from = new Date(checkin);
    const to = checkout ? new Date(checkout) : undefined;
    setSelectedRange({ from, to });
  }, [checkin, checkout]);

  // Responsive months for DayPicker: 1 on small screens, 2 on md+
  const [pickerMonths, setPickerMonths] = useState<number>(2);
  useEffect(() => {
    const update = () => setPickerMonths(window.innerWidth >= 768 ? 2 : 1);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="relative bg-gray-50 border-b">
        <div className="public-container py-6 lg:py-12">
          {/* Hero: make image expand responsively and place welcome text inside it */}
          <div className="grid grid-cols-1 gap-6">
            <div
              className="relative rounded-lg overflow-hidden shadow-lg w-full h-64 md:h-[420px] lg:h-[560px] mt-3 md:mt-4"
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
            >
              {slides.map((s, i) => (
                <div
                  key={s.src}
                  className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                  aria-hidden={i !== idx}
                >
                  <Image src={s.src} alt={s.alt} fill style={{ objectFit: 'cover' }} sizes="(min-width: 1024px) 1200px, 100vw" priority={i === 0} />
                </div>
              ))}

              {/* Overlay for welcome words (editable) - positioned near the top center of the image */}
              <div className="absolute inset-0 flex items-start justify-center p-4 md:p-6 z-20 pointer-events-none">
                <div className="max-w-3xl rounded-md p-4 md:p-6 text-center text-white pointer-events-auto mt-6 md:mt-10">
                  <h1 className={`text-3xl md:text-4xl font-extrabold hero-title ${active.title === 'No Internet? No Problem' ? 'high-blink' : ''}`}>
                    {active.title.split(' ').map((w, i) => (
                      <span key={i} className="inline-block bg-black/50 text-white px-1 py-0.5 rounded-sm mr-1 leading-none"><span className="reveal">{w}</span></span>
                    ))}
                  </h1>

                  {/* Subtitle with long handwriting reveal (6 minutes total) - active only on slide 0 */}
                  <p className={`mt-2 text-lg md:text-xl font-semibold sub-title ${idx === 0 ? 'writing-active' : ''}`}>
                    {active.subtitle.split(' ').map((w, i) => (
                      <span key={i} className="inline-block sub-word text-white/95 px-1 py-0.5 rounded-sm mr-0.5 leading-tight">
                        <span className="sub-reveal">{w}</span>
                      </span>
                    ))}

                    {/* pen cursor that travels across the subtitle while writing */}
                    <span aria-hidden className="pen" />
                  </p>

                  <form onSubmit={submitSearch} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} className="mt-4 flex flex-wrap gap-2 justify-center items-center pointer-events-auto">
                    <div className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-md p-2 shadow-lg">
                      <input
                        aria-label="Search query"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="px-3 py-2 rounded-l-md border border-white/30 bg-white/10 text-white placeholder-white/70"
                      />
                      <div ref={guestRef} className="inline-flex items-center gap-2 border border-white/20 rounded-md overflow-hidden px-2">
                        {guestOpen ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              aria-label="Close guest selector"
                              onClick={() => { setGuestOpen(false); setPaused(false); }}
                              className="text-white/90 p-1"
                            >
                              <User className="w-4 h-4" aria-hidden />
                            </button>

                            <div className="inline-flex items-center border-r border-white/10">
                              <button
                                type="button"
                                aria-label="Decrease adults"
                                onClick={() => setAdults((a) => Math.max(1, a - 1))}
                                className="px-3 py-2 text-white bg-transparent hover:bg-white/10"
                              >
                                −
                              </button>
                              <div className="px-3 py-2 text-white bg-transparent min-w-[2.25rem] text-center">{adults}</div>
                              <button
                                type="button"
                                aria-label="Increase adults"
                                onClick={() => setAdults((a) => Math.min(10, a + 1))}
                                className="px-3 py-2 text-white bg-transparent hover:bg-white/10"
                              >
                                +
                              </button>
                            </div>

                            <div className="inline-flex items-center px-2">
                              <div className="inline-flex items-center border-r border-white/10">
                                <button
                                  type="button"
                                  aria-label="Decrease children"
                                  onClick={() => setChildren((c) => Math.max(0, c - 1))}
                                  className="px-2 py-2 text-white bg-transparent hover:bg-white/10"
                                >
                                  −
                                </button>
                                <div className="px-3 py-2 text-white bg-transparent min-w-[2rem] text-center">{children}</div>
                                <button
                                  type="button"
                                  aria-label="Increase children"
                                  onClick={() => setChildren((c) => Math.min(10, c + 1))}
                                  className="px-2 py-2 text-white bg-transparent hover:bg-white/10"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => { setGuestOpen(false); setPaused(false); }}
                              className="ml-2 px-2 py-1 rounded bg-white/10 text-white"
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <div className="relative inline-block group">
                            <button
                              type="button"
                              aria-label="Open guest selector"
                              onClick={() => { setGuestOpen(true); setPaused(true); }}
                              className="inline-flex items-center gap-2 px-2 py-1 bg-transparent text-white"
                            >
                              <User className="w-4 h-4 text-white/90" aria-hidden />
                              <span className="text-white text-sm">{adults}{children ? ` + ${children}` : ''}</span>
                            </button>

                            {/* Tooltip: visible on hover/focus or when guest panel is open (touch) */}
                            <span className={
                              `absolute -top-9 left-1/2 transform -translate-x-1/2 text-xs rounded px-2 py-1 bg-black/80 text-white whitespace-nowrap pointer-events-none transition-opacity duration-150 ${guestOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus:opacity-100'}`
                            } aria-hidden>
                              <span className="inline sm:hidden">Add Guests</span>
                              <span className="hidden sm:inline">Guests — tap to edit adults & children</span>
                            </span>
                          </div>
                        )}
                      </div>
                      <div ref={dateRef} className="inline-flex items-center gap-2 relative">
                        <button
                          type="button"
                          aria-label="Select dates"
                          onClick={() => { setDateOpen((v) => !v); setPaused(true); }}
                          className="px-3 py-2 bg-white/10 text-white border border-white/20 rounded"
                        >
                          {checkin ? (checkout ? formatRangeShort(checkin, checkout) : checkin) : 'Add dates'}
                        </button>

                        {dateOpen ? (
                          <div className="fixed md:absolute bottom-0 md:top-full md:right-0 md:mt-2 bg-black/70 p-3 md:shadow-lg z-30 w-full md:w-80 text-white rounded-t-lg md:rounded-lg">
                            <div className="flex flex-col gap-2">
                              <div>
                                <div className="text-xs text-white/80">Select dates</div>
                                <div className="text-sm">{checkin ? (checkout ? formatRangeShort(checkin, checkout) : checkin) : 'No dates selected'}</div>
                              </div>

                              <div className="bg-white text-slate-900 rounded p-2">
                                <DayPicker
                                  mode="range"
                                  selected={selectedRange}
                                  onSelect={(r) => {
                                    const range = r as Range | undefined;
                                    if (!range || !range.from) {
                                      setCheckin('');
                                      setCheckout('');
                                      setSelectedRange(undefined);
                                      return;
                                    }
                                    const fromStr = formatDate(range.from);
                                    const toStr = range.to ? formatDate(range.to) : '';
                                    setCheckin(fromStr);
                                    setCheckout(toStr);
                                    setSelectedRange(range);
                                  }}
                                  numberOfMonths={pickerMonths}
                                  defaultMonth={selectedRange?.from ?? undefined}
                                  disabled={{ before: todayDate }}
                                />
                              </div>

                              <div className="mt-2 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => { setCheckin(''); setCheckout(''); setSelectedRange(undefined); }}
                                  className="px-2 py-1 text-sm text-white/90 bg-transparent border border-white/10 rounded"
                                >
                                  Clear
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setDateOpen(false); setPaused(false); }}
                                  className="px-3 py-1 text-sm bg-emerald-500 rounded text-white"
                                >
                                  Done
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <button type="submit" className="px-4 py-2 bg-emerald-500 text-white rounded-md">Search</button>
                    </div>
                  </form>

                  <div className="mt-4 flex flex-wrap gap-3 justify-center">
                    {active.ctaLabel ? (
                      <Link href={active.ctaHref ?? '/public/properties'} className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-md shadow hover:bg-emerald-600 no-underline">{active.ctaLabel}</Link>
                    ) : null}
                    {active.secondaryLabel ? (
                      <Link href={active.secondaryHref ?? '/public/about'} className="inline-flex items-center px-4 py-2 border rounded-md text-white/90 bg-white/10 hover:bg-white/20 no-underline">{active.secondaryLabel}</Link>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Styles are injected client-side to avoid SSR/CSR mismatches */}

              {/* Slide indicators */}
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-4 flex gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setIdx(i); startTimer(); }}
                    className={`w-2 h-2 rounded-full ${i === idx ? 'bg-white' : 'bg-white/60'}`}
                    aria-label={`Go to slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="public-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/about" className="border rounded-lg p-6 hover:shadow-md">
              <h3 className="font-semibold mb-1">About</h3>
              <p className="text-sm text-slate-500">Who we are and what we do.</p>
            </Link>

            <Link href="/public/properties" className="border rounded-lg p-6 hover:shadow-md">
              <h3 className="font-semibold mb-1">Explore</h3>
              <p className="text-sm text-slate-500">Browse properties by region and type.</p>
            </Link>

            <Link href="/bookings" className="border rounded-lg p-6 hover:shadow-md">
              <h3 className="font-semibold mb-1">Bookings</h3>
              <p className="text-sm text-slate-500">Manage your bookings and itineraries.</p>
            </Link>

            <Link href="/guides" className="border rounded-lg p-6 hover:shadow-md">
              <h3 className="font-semibold mb-1">Guides</h3>
              <p className="text-sm text-slate-500">Travel tips and local guides.</p>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Link href="/register" className="border rounded-lg p-6 hover:shadow-md">
              <h3 className="font-semibold mb-1">Register</h3>
              <p className="text-sm text-slate-500">List your property or create an account.</p>
            </Link>

            <Link href="/contact" className="border rounded-lg p-6 hover:shadow-md">
              <h3 className="font-semibold mb-1">Contact</h3>
              <p className="text-sm text-slate-500">Get in touch with our support team.</p>
            </Link>

            <Link href="/community" className="border rounded-lg p-6 hover:shadow-md">
              <h3 className="font-semibold mb-1">Community</h3>
              <p className="text-sm text-slate-500">Events, news and partner programs.</p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
