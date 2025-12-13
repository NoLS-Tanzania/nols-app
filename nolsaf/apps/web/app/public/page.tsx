"use client";

import Link from "next/link";
import Image from "next/image";
import { User, ChevronRight, ChevronLeft, X, Globe, Truck, Home, Wrench, DollarSign } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, FormEvent, useMemo } from "react";
import { createPortal } from 'react-dom';
import SectionSeparator from '../../components/SectionSeparator';
import PropertyCard from '../../components/PropertyCard';
import AttentionBlink from '../../components/AttentionBlink';
import CountryCard from '../../components/CountryCard';
import BookingFlowCard from '../../components/BookingFlowCard';
import FounderStory from '../../components/FounderStory';
import Testimonials from '../../components/Testimonials';
import LatestUpdate from '../../components/LatestUpdate';
import TrustedBySection from '../../components/TrustedBySection';
import LayoutFrame from '../../components/LayoutFrame';
import { DayPicker } from 'react-day-picker';
import axios from 'axios';

// Component to fetch and display trust partners from API
function TrustedBySectionWithData() {
  const [brands, setBrands] = useState<Array<{ name: string; logoUrl?: string; href?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const api = axios.create({ baseURL: "" });
        const r = await api.get<{ items: Array<{ name: string; logoUrl: string | null; href: string | null }> }>("/admin/trust-partners/public");
        setBrands(r.data?.items.map(item => ({
          name: item.name,
          logoUrl: item.logoUrl || undefined,
          href: item.href || undefined,
        })) || []);
      } catch (err) {
        console.error("Failed to load trust partners", err);
        // Fallback to default partners if API fails
        setBrands([
          { name: "M-Pesa", logoUrl: "/assets/M-pesa.png", href: "https://www.vodacom.co.tz/m-pesa" },
          { name: "Airtel Money", logoUrl: "/assets/airtel_money.png", href: "https://www.airtel.co.tz/airtel-money" },
          { name: "Tigo Pesa", logoUrl: "/assets/mix by yas.png", href: "https://www.tigo.co.tz/tigo-pesa" },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return null; // Don't show anything while loading
  }

  return <TrustedBySection brands={brands} />;
}
/* react-day-picker in this project/version doesn't export a Range type,
   so provide a local Range type compatible with the code below. */
type Range = { from: Date; to?: Date };
type Slide = {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaHref?: string;
  ussdCode?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};
import 'react-day-picker/dist/style.css';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  // Group Stays is now a standalone page; removed inline event integration.
  
  const slides: Slide[] = [
    {
      src: '/assets/nolsaf%20picture%201.jpg',
      alt: 'Coastal retreat, Zanzibar',
      title: 'Quality Stay For Every Wallet',
      subtitle: 'East Africa’s first end-to-end travel marketplace — book stays and safe transport in one seamless step.',
    },
    {
      src: '/assets/nolsaf%20picture%2022.jpg',
      alt: 'Safari lodge under the Acacia',
      title: 'No Internet? No Problem',
      subtitle: 'Dial *123# now to see available stays. Secure, low-cost, and works without mobile data.',
      ctaLabel: 'Dial *123#',
      ctaHref: 'tel:*123%23',
      ussdCode: '*123#'
    },
    {
      src: '/assets/nolsaf%20picture%203.jpg',
      alt: 'City stay with skyline views',
      title: 'City Stays, Local Comfort',
      subtitle: 'Comfortable apartments and boutique hotels across cities — book accommodation and secure rides to your doorstep.',
      ctaLabel: 'Browse city stays',
      ctaHref: '/public/properties?type=city',
    },
  ];

  const [idx, setIdx] = useState(0);
  const active = slides[idx];
  const timerRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  
  // Search form state for hero (first slide)
  const [q, setQ] = useState('');
  const [adults, setAdults] = useState<number>(1);
  const [children, setChildren] = useState<number>(0);
  const [pets, setPets] = useState<number>(0);
  const [pregnancy, setPregnancy] = useState<boolean>(false);
  const [checkin, setCheckin] = useState<string>('');
  const [checkout, setCheckout] = useState<string>('');
  const [guestOpen, setGuestOpen] = useState(false);
  const guestRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
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
  const monthShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const formatSingleShort = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      const day = String(d.getDate()).padStart(2, '0');
      const mon = monthShort[d.getMonth()];
      return `${mon} ${day}`;
    } catch (e) {
      return iso;
    }
  };

  // Format ranges like "Nov 22-30" or "Dec 31-Jan 02" (no year shown)
  const formatRangeShort = (fromStr?: string, toStr?: string) => {
    if (!fromStr) return '';
    if (!toStr) return formatSingleShort(fromStr);
    try {
      const f = new Date(fromStr);
      const t = new Date(toStr);
      const fDay = String(f.getDate()).padStart(2, '0');
      const tDay = String(t.getDate()).padStart(2, '0');
      const fMon = monthShort[f.getMonth()];
      const tMon = monthShort[t.getMonth()];
      if (f.getFullYear() === t.getFullYear() && f.getMonth() === t.getMonth()) {
        // same month & year: "Nov 22-30"
        return `${fMon} ${parseInt(fDay, 10)}-${parseInt(tDay, 10)}`;
      }
      // different month or year: "Dec 31-Jan 02"
      return `${fMon} ${parseInt(fDay, 10)}-${tMon} ${tDay}`;
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
    if (pets) params.set('pets', String(pets));
    if (pregnancy) params.set('pregnancy', '1');
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
        @keyframes writeSub { to { transform: scaleX(1); opacity: 1; } }
        @keyframes boxFillSub { to { background-color: rgba(0,0,0,0.4); } }

        /* Blink animation replacing the pen: when the subtitle is active it blinks to draw attention */
        @keyframes subBlink { 0% { opacity: 1; } 50% { opacity: 0.15; } 100% { opacity: 1; } }
        .writing-active .sub-title { animation: subBlink 1000ms linear infinite; }
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

      // no pen animation: subtitle will use a blink animation when active
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
        // no pen cleanup required
      }
    };
  }, [idx, active.subtitle]);

  // Close guest selector when clicking outside or pressing Escape
  // Guest popover: intentionally do not close on outside click or Escape —
  // it should only close via the Close or Done buttons so users can clear selections safely.

  // Position popover using fixed coordinates via CSS variables so it won't be clipped by hero's overflow-hidden
  useEffect(() => {
    if (!guestOpen) {
      // clear vars
      document.documentElement.style.removeProperty('--nolsaf-guest-left');
      document.documentElement.style.removeProperty('--nolsaf-guest-top');
      document.documentElement.style.removeProperty('--nolsaf-guest-width');
      return;
    }
    const update = () => {
      const btn = triggerRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const left = Math.max(8, r.left);
      const top = Math.min(window.innerHeight - 40, r.bottom + 8);
      const width = Math.min(Math.max(r.width, 220), 360);
      document.documentElement.style.setProperty('--nolsaf-guest-left', `${left}px`);
      document.documentElement.style.setProperty('--nolsaf-guest-top', `${top}px`);
      document.documentElement.style.setProperty('--nolsaf-guest-width', `${width}px`);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [guestOpen]);

  // Position date panel using fixed coordinates via CSS variables so it won't be clipped by hero's overflow-hidden
  useEffect(() => {
    if (!dateOpen) {
      document.documentElement.style.removeProperty('--nolsaf-date-left');
      document.documentElement.style.removeProperty('--nolsaf-date-top');
      document.documentElement.style.removeProperty('--nolsaf-date-width');
      return;
    }
    const update = () => {
      const btn = dateRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      // Ensure enough width for two months on desktop; increase minimum to improve visibility
      const isDesktop = window.innerWidth >= 768;
      const desiredMin = isDesktop ? 760 : 300; // increased desktop minimum to 760px
      const desiredMax = isDesktop ? Math.min(1100, window.innerWidth - 32) : Math.min(520, window.innerWidth - 32);
      const width = Math.min(desiredMax, Math.max(desiredMin, r.width));
      // Center the popper horizontally around the trigger when possible
      let left = r.left - Math.max(0, (width - r.width) / 2);
      // clamp within viewport
      left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
      const top = Math.min(window.innerHeight - 40, r.bottom + 8);
      document.documentElement.style.setProperty('--nolsaf-date-left', `${left}px`);
      document.documentElement.style.setProperty('--nolsaf-date-top', `${top}px`);
      document.documentElement.style.setProperty('--nolsaf-date-width', `${width}px`);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [dateOpen, selectedRange?.from]);

  // Date panel: intentionally do not close on outside click or Escape —
  // it should only close via the Clear or Done buttons so users don't lose their selection.

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
  const [currentMonth, setCurrentMonth] = useState<Date | undefined>(undefined);
  const dayGridRef = useRef<HTMLDivElement | null>(null);

  // Card hover/touch state: which main card is currently hovered/touched (0,1,2) or null
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  useEffect(() => {
    // Inject small card blink animation for CTA when hovered/touched
    const styleId = 'nolsaf-card-animations';
    if (!document.getElementById(styleId)) {
      const css = `
        .nls-blink { animation: nls-blink 800ms linear infinite; }
        @keyframes nls-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.18; } }
      `;
      const el = document.createElement('style');
      el.id = styleId;
      el.textContent = css;
      document.head.appendChild(el);
    }

    const update = () => setPickerMonths(window.innerWidth >= 768 ? 2 : 1);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Touch-to-hover behaviour: add pointer handlers to the DayPicker container so touching a day
  // adds a transient class that mirrors hover styles for touch users.
  useEffect(() => {
    const grid = dayGridRef.current;
    if (!grid) return;
    let last: HTMLElement | null = null;
    let previewButtons: HTMLElement[] = [];
    const dayFromNode = (node: HTMLElement | null): Date | null => {
      if (!node) return null;
      const attr = node.getAttribute('data-day') || (node as any).dataset?.day || node.getAttribute('aria-label');
      if (!attr) return null;
      const ymdMatch = attr.match(/^(\d{4}-\d{2}-\d{2})/);
      const val = ymdMatch ? ymdMatch[1] : attr;
      const d = new Date(val + 'T00:00:00');
      return isNaN(d.getTime()) ? null : d;
    };

    const clearPreview = () => {
      if (previewButtons.length) {
        previewButtons.forEach((b) => b.classList.remove('nolsaf-day-preview'));
        previewButtons = [];
      }
    };

    const applyPreviewRange = (from: Date, to: Date) => {
      clearPreview();
      const start = Math.min(from.getTime(), to.getTime());
      const end = Math.max(from.getTime(), to.getTime());
      const buttons = Array.from(grid.querySelectorAll('button.rdp-day')) as HTMLElement[];
      buttons.forEach((b) => {
        const bd = dayFromNode(b);
        if (!bd) return;
        const t = bd.getTime();
        if (t >= start && t <= end) {
          b.classList.add('nolsaf-day-preview');
          previewButtons.push(b);
        }
      });
    };

    const onPointerDown = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest('button') as HTMLElement | null;
      if (!t) return;
      if (!t.classList.contains('rdp-day')) return;
      if (last && last !== t) last.classList.remove('nolsaf-day-touch');
      t.classList.add('nolsaf-day-touch');
      last = t;

      const touched = dayFromNode(t);
      if (!touched) return;
      if (selectedRange?.from) {
        applyPreviewRange(selectedRange.from, touched);
      } else {
        applyPreviewRange(touched, touched);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const t = (e.target as HTMLElement).closest('button') as HTMLElement | null;
      if (!t) return;
      if (!t.classList.contains('rdp-day')) return;
      const touched = dayFromNode(t);
      if (!touched) return;
      if (selectedRange?.from) {
        applyPreviewRange(selectedRange.from, touched);
      } else {
        applyPreviewRange(touched, touched);
      }
    };

    const onPointerUp = () => {
      if (last) {
        setTimeout(() => {
          last?.classList.remove('nolsaf-day-touch');
          last = null;
        }, 200);
      }
      setTimeout(() => clearPreview(), 250);
    };

    grid.addEventListener('pointerdown', onPointerDown);
    grid.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    return () => {
      grid.removeEventListener('pointerdown', onPointerDown);
      grid.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      clearPreview();
      };
    }, [dateOpen, selectedRange?.from]);

    


  // Keep currentMonth in sync with selectedRange or default to today
  useEffect(() => {
    if (selectedRange?.from) {
      setCurrentMonth(selectedRange.from);
    } else {
      setCurrentMonth(new Date());
    }
  }, [selectedRange]);

  // Countries list and rotation state: rotate the left-most card periodically
  const countryList = useMemo(
    () => [
      {
        id: 'tanzania',
        name: 'Tanzania',
        flag: '🇹🇿',
        subtitle: 'Nationwide — cities & countryside',
        blurb: 'Nationwide coverage from city stays to countryside campsites. Pay locally with M‑Pesa or internationally with cards. Book with local support and secure transport.',
        href: '/public/properties?country=tanzania',
        stats: { cities: 12, regions: 31, listings: 1250, payments: ['M-Pesa', 'Airtel Money', 'Halopesa', 'Mixx by Yas', 'Visa'] },
      },
      {
        id: 'kenya',
        name: 'Kenya',
        flag: '🇰🇪',
        subtitle: 'Major hubs & safari regions',
        blurb: 'From Nairobi to the coast and national parks — local hosts and transport make long trips simple. Pay locally or by card and get support in Swahili and English.',
        href: '/public/properties?country=kenya',
        stats: { cities: 10, listings: 980, payments: ['M-Pesa', 'Airtel Money', 'T Kash', 'Visa'] },
      },
      {
        id: 'uganda',
        name: 'Uganda',
        flag: '🇺🇬',
        subtitle: 'Lakes, wildlife & hospitality',
        blurb: 'Lakeside retreats and wildlife lodges are available across regions, with local payment options and secure bookings for international visitors.',
        href: '/public/properties?country=uganda',
        stats: { cities: 7, listings: 430, payments: ['MTN Mobile Money', 'Visa'] },
      },
    ],
    []
  );

  const [rotateIndex, setRotateIndex] = useState(0);
  const [rotatePaused, setRotatePaused] = useState(false);

  useEffect(() => {
    if (rotatePaused || countryList.length <= 1) return;
    const id = window.setInterval(() => {
      setRotateIndex((i) => (i + 1) % countryList.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [rotatePaused, countryList.length]);

  const orderedCountries = useMemo(() => {
    return [...countryList.slice(rotateIndex), ...countryList.slice(0, rotateIndex)];
  }, [rotateIndex, countryList]);

  const addMonths = (d: Date, n: number) => {
    const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
    return r;
  };

  const goNextMonth = useCallback(() => {
    setCurrentMonth((m) => (m ? addMonths(m, 1) : addMonths(new Date(), 1)));
  }, []);

  const goPrevMonth = useCallback(() => {
    setCurrentMonth((m) => (m ? addMonths(m, -1) : addMonths(new Date(), -1)));
  }, []);

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Layout edge markers (left/right) to indicate content boundaries */}
      <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" labelLeft="content edge" />
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

              {/* Overlay for welcome words (editable) - positioned at the bottom center of the image */}
              <div className="absolute inset-0 flex items-end justify-center p-4 md:p-6 z-20 pointer-events-none">
                <div className="max-w-3xl rounded-md p-4 md:p-6 text-center text-white pointer-events-auto mb-6 md:mb-10">
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

                    {/* pen removed: replaced by a blink animation on the subtitle when active */}
                  </p>

                  <form onSubmit={submitSearch} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} className="mt-4 flex flex-wrap gap-2 justify-center items-center pointer-events-auto">
                    <div className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full md:rounded-2xl p-2.5 shadow-lg">
                      <input
                        aria-label="Search query"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="px-4 py-2 rounded-l-full border border-white/30 bg-white/10 text-white placeholder-white/70"
                      />
                      <div ref={guestRef} className="inline-flex items-center gap-2 border border-white/20 rounded-full overflow-visible px-2 relative">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            aria-label="Open guest selector"
                            aria-expanded={guestOpen}
                            ref={triggerRef}
                            onClick={() => { setGuestOpen(true); setPaused(true); }}
                            onTouchStart={() => { setGuestOpen(true); setPaused(true); }}
                            className="inline-flex items-center gap-2 px-2 py-1 bg-transparent text-white"
                          >
                            <User className="w-4 h-4 text-white/90" aria-hidden />
                            <span className="text-white text-sm">{adults}{children ? ` + ${children}` : ''}</span>
                          </button>
                        </div>

                        {guestOpen ? (
                          createPortal(
                            <div className="nolsaf-guest-popper pointer-events-auto bg-white rounded shadow-lg z-30 text-slate-900 border border-slate-200">
                              <div className="p-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">Guests</div>
                                    <div className="text-xs text-slate-500">Select number of guests and options</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => { setGuestOpen(false); setPaused(false); }} aria-label="Close guest selector" className="p-1 text-slate-600 rounded hover:bg-slate-100">
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="mt-3 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-medium">Adults</div>
                                      <div className="text-xs text-slate-500">Ages 16+</div>
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        aria-label="Decrease adults"
                                        onClick={() => setAdults((a) => Math.max(1, a - 1))}
                                        disabled={adults <= 1}
                                        aria-disabled={adults <= 1}
                                        className="h-8 w-8 flex items-center justify-center rounded border text-slate-700"
                                      >
                                        −
                                      </button>
                                      <div className="px-3 py-1 min-w-[2.25rem] text-center">{adults}</div>
                                      <button
                                        type="button"
                                        aria-label="Increase adults"
                                        onClick={() => setAdults((a) => Math.min(10, a + 1))}
                                        disabled={adults >= 10}
                                        aria-disabled={adults >= 10}
                                        className="h-8 w-8 flex items-center justify-center rounded border text-slate-700"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-medium">Children</div>
                                      <div className="text-xs text-slate-500">Ages 0–15</div>
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        aria-label="Decrease children"
                                        onClick={() => setChildren((c) => Math.max(0, c - 1))}
                                        disabled={children <= 0}
                                        aria-disabled={children <= 0}
                                        className="h-8 w-8 flex items-center justify-center rounded border text-slate-700"
                                      >
                                        −
                                      </button>
                                      <div className="px-3 py-1 min-w-[2rem] text-center">{children}</div>
                                      <button
                                        type="button"
                                        aria-label="Increase children"
                                        onClick={() => setChildren((c) => Math.min(10, c + 1))}
                                        disabled={children >= 10}
                                        aria-disabled={children >= 10}
                                        className="h-8 w-8 flex items-center justify-center rounded border text-slate-700"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-medium">Pets</div>
                                      <div className="text-xs text-slate-500">Optional</div>
                                    </div>
                                    <div className="inline-flex items-center gap-2">
                                      <button
                                        type="button"
                                        aria-label="Decrease pets"
                                        onClick={() => setPets((p) => Math.max(0, p - 1))}
                                        disabled={pets <= 0}
                                        aria-disabled={pets <= 0}
                                        className="h-8 w-8 flex items-center justify-center rounded border text-slate-700"
                                      >
                                        −
                                      </button>
                                      <div className="px-3 py-1 min-w-[2rem] text-center">{pets}</div>
                                      <button
                                        type="button"
                                        aria-label="Increase pets"
                                        onClick={() => setPets((p) => Math.min(5, p + 1))}
                                        disabled={pets >= 5}
                                        aria-disabled={pets >= 5}
                                        className="h-8 w-8 flex items-center justify-center rounded border text-slate-700"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-sm font-medium">Pregnancy</div>
                                      <div id="preg-help" className="text-xs text-slate-500">Let hosts know — hosts will be notified when selected</div>
                                    </div>
                                    <div>
                                      <button
                                        type="button"
                                        role="switch"
                                        aria-checked={pregnancy}
                                        aria-describedby="preg-help"
                                        aria-label={pregnancy ? 'Pregnancy selected — hosts will be notified' : 'Indicate pregnancy to notify hosts'}
                                        onClick={() => setPregnancy((p) => !p)}
                                        className={`nolsaf-preg-toggle inline-flex items-center p-0.5 rounded-full focus:outline-none ${pregnancy ? 'is-on' : 'is-off'}`}
                                      >
                                        <span className="nolsaf-preg-knob" />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 flex justify-end gap-2">
                                  <button type="button" onClick={() => { setAdults(1); setChildren(0); setPets(0); setPregnancy(false); }} className="px-2 py-1 text-sm text-slate-700 bg-transparent border border-slate-200 rounded">Clear</button>
                                  <button type="button" onClick={() => { setGuestOpen(false); setPaused(false); }} className="px-3 py-1 text-sm bg-emerald-500 rounded text-white">Done</button>
                                </div>
                              </div>
                            </div>, document.body
                          )
                        ) : null}
                      </div>
                      <div ref={dateRef} className="inline-flex items-center gap-2 relative">
                        <button
                          type="button"
                          aria-label="Select dates"
                          onClick={() => { setDateOpen((v) => !v); setPaused(true); }}
                          className="px-3 py-2 bg-white/10 text-white border border-white/20 rounded"
                        >
                          {checkin ? (checkout ? formatRangeShort(checkin, checkout) : formatSingleShort(checkin)) : 'Add dates'}
                        </button>

                        {dateOpen ? (
                          createPortal(
                            <div className="nolsaf-date-popper bg-white text-slate-900 rounded shadow-lg z-30 border border-slate-200">
                                {/* Mobile grabber shown on small screens to indicate draggable sheet */}
                                <div className="nolsaf-sheet-grabber-wrapper">
                                  <div className="nolsaf-sheet-grabber" aria-hidden />
                                </div>
                                <div className="p-3 w-full md:w-auto">
                                <div className="relative">
                                  <div className="w-full text-center">
                                    <div className="text-xs text-slate-500">Select dates</div>
                                    <div className="text-sm mb-2">{checkin ? (checkout ? formatRangeShort(checkin, checkout) : formatSingleShort(checkin)) : 'No dates selected'}</div>
                                  </div>
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                                    <button type="button" aria-label="Previous month" onClick={goPrevMonth} className="p-2 rounded hover:bg-slate-100 text-slate-700">
                                      <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <button type="button" aria-label="Next month" onClick={goNextMonth} className="p-2 rounded hover:bg-slate-100 text-slate-700">
                                      <ChevronRight className="w-5 h-5" />
                                    </button>
                                  </div>
                                </div>

                                <div ref={dayGridRef} className="bg-white text-slate-900 rounded p-2 overflow-auto max-h-[60vh]">
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
                                    month={currentMonth}
                                    onMonthChange={(m) => setCurrentMonth(m)}
                                    disabled={{ before: todayDate }}
                                  />
                                </div>

                                <div className="mt-2 flex justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => { setCheckin(''); setCheckout(''); setSelectedRange(undefined); }}
                                    className="px-2 py-1 text-sm text-slate-700 bg-transparent border border-slate-200 rounded"
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
                            </div>,
                            document.body
                          )
                        ) : null}
                      </div>
                      <button type="submit" className="px-4 py-2 bg-emerald-500 text-white rounded-md">Search</button>
                    </div>
                  </form>

                  <div className="mt-4 flex flex-wrap gap-3 justify-center">
                    {active.ctaLabel ? (
                      <Link href={active.ctaHref ?? '/public/properties'} className="no-underline">
                        <span className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-md shadow hover:bg-emerald-600">{active.ctaLabel}</span>
                      </Link>
                    ) : null}
                    {active.secondaryLabel ? (
                      <Link href={active.secondaryHref ?? '/public/about'} className="no-underline">
                        <span className="inline-flex items-center px-4 py-2 border rounded-md text-white/90 bg-white/10 hover:bg-white/20">{active.secondaryLabel}</span>
                      </Link>
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

        {/* Decorative separator marking end of hero */}
        <SectionSeparator label="End of hero" className="mt-6" />

      </section>

      <section className="py-12">
        <div className="public-container">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div
              onClick={() => router.push('/public/properties')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/public/properties'); }}
              role="link"
              tabIndex={0}
              aria-label="Travelers - Browse stays"
              className="relative border-2 rounded-lg p-6 pl-8 hover:shadow-md flex flex-col h-56 border-blue-100 cursor-pointer"
            >
              <span aria-hidden className="absolute left-0 top-0 h-full w-1 rounded-r-md bg-blue-600" />
              <span aria-hidden className="absolute left-0 bottom-0 h-px w-full bg-blue-600" />
              {/* Header: icon + title positioned at the top-left */}
              <div className="absolute top-3 left-8 z-10 flex items-center gap-3">
                <Globe className="w-6 h-6 text-blue-600" aria-hidden />
                <h3 className="font-semibold text-lg text-blue-700">Travelers</h3>
              </div>
              {/* No background image — restored to plain card */}
              <div
                onPointerEnter={() => setHoveredCard(0)}
                onPointerLeave={() => setHoveredCard(null)}
                onFocus={() => setHoveredCard(0)}
                onBlur={() => setHoveredCard(null)}
                onTouchStart={() => setHoveredCard(0)}
                onTouchEnd={() => setHoveredCard(null)}
                className="relative z-10"
              >
                <p className="mt-8 text-sm text-slate-600">Trusted stays and safe transport in one place. Compare options and prices, pay locally or internationally, and book securely with 24/7 support.</p>
              </div>
              <div className="mt-auto">
                <AttentionBlink active={hoveredCard === 0}>
                  <span className={`inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md`}>Browse stays</span>
                </AttentionBlink>
                <div className="mt-2 flex items-center gap-3">
                  <Link href="/help/payments" className="no-underline" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center text-xs bg-blue-50 border border-blue-100 text-blue-700 px-2 py-1 rounded">
                      <Image src="/assets/M-pesa.png" alt="M-PESA" width={16} height={16} className="mr-2 object-contain w-4 h-4" />
                      Local payments
                    </span>
                  </Link>

                  <Link href="/help/payments" className="no-underline" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center text-xs bg-slate-50 border border-slate-100 text-slate-700 px-2 py-1 rounded">
                      <Image src="/assets/visa_card.png" alt="VISA" width={16} height={16} className="mr-2 object-contain w-4 h-4" />
                      International payments
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            <div
              onClick={() => router.push('/register?role=driver')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/register?role=driver'); }}
              role="link"
              tabIndex={0}
              aria-label="Drivers - Register as a driver"
              className="relative border-2 rounded-lg p-6 pl-8 hover:shadow-md flex flex-col h-56 border-amber-100 cursor-pointer"
            >
              <span aria-hidden className="absolute left-0 top-0 h-full w-1 rounded-r-md bg-amber-500" />
              <span aria-hidden className="absolute left-0 bottom-0 h-px w-full bg-amber-500" />
              <div className="absolute top-3 left-8 z-10 flex items-center gap-3">
                <Truck className="w-6 h-6 text-amber-500" aria-hidden />
                <h3 className="font-semibold text-lg text-amber-700">Drivers</h3>
              </div>
              <div
                onPointerEnter={() => setHoveredCard(1)}
                onPointerLeave={() => setHoveredCard(null)}
                onFocus={() => setHoveredCard(1)}
                onBlur={() => setHoveredCard(null)}
                onTouchStart={() => setHoveredCard(1)}
                onTouchEnd={() => setHoveredCard(null)}
              >
                <p className="mt-8 text-sm text-slate-600">Join NoLSAF to access more rides, receive local seamless payments, and grow your earnings with reliable booking flows and driver tools.</p>
              </div>
              <div className="mt-auto">
                <AttentionBlink active={hoveredCard === 1}>
                  <span className={`inline-flex items-center px-3 py-2 bg-amber-500 text-white rounded-md`}>Register as a driver</span>
                </AttentionBlink>
                <div className="mt-2">
                  <Link href="/help/driver-tools" className="no-underline" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center text-xs bg-amber-50 border border-amber-100 text-amber-700 px-2 py-1 rounded">
                      <Wrench className="w-3 h-3 mr-2 text-amber-700" aria-hidden />
                      Driver tools
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            <div
              onClick={() => router.push('/register?role=owner')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/register?role=owner'); }}
              role="link"
              tabIndex={0}
              aria-label="Property Owners - List your property"
              className="relative border-2 rounded-lg p-6 pl-8 hover:shadow-md flex flex-col h-56 border-violet-100 cursor-pointer"
            >
              <span aria-hidden className="absolute left-0 top-0 h-full w-1 rounded-r-md bg-violet-600" />
              <span aria-hidden className="absolute left-0 bottom-0 h-px w-full bg-violet-600" />
              <div className="absolute top-3 left-8 z-10 flex items-center gap-3">
                <Home className="w-6 h-6 text-violet-600" aria-hidden />
                <h3 className="font-semibold text-lg text-violet-700">Property Owners</h3>
              </div>
              <div
                onPointerEnter={() => setHoveredCard(2)}
                onPointerLeave={() => setHoveredCard(null)}
                onFocus={() => setHoveredCard(2)}
                onBlur={() => setHoveredCard(null)}
                onTouchStart={() => setHoveredCard(2)}
                onTouchEnd={() => setHoveredCard(null)}
              >
                <p className="mt-8 text-sm text-slate-600">List your property to reach travelers across East Africa — manage bookings, set availability, and get paid fast through local payment integrations.</p>
              </div>
              <div className="mt-auto">
                <AttentionBlink active={hoveredCard === 2}>
                  <span className={`inline-flex items-center px-3 py-2 bg-violet-600 text-white rounded-md`}>List your property</span>
                </AttentionBlink>
                <div className="mt-2">
                  <Link href="/help/payouts" className="no-underline" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center text-xs bg-violet-50 border border-violet-100 text-violet-700 px-2 py-1 rounded">
                      <DollarSign className="w-3 h-3 mr-2 text-violet-700" aria-hidden />
                      Fast payouts
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <SectionSeparator variant="dots" pillLabel="Explore" className="mt-6" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
            {[
              { title: 'Hotel', description: 'Hotel stays', href: '/public/properties?type=hotel', imageSrc: '/assets/hotel.jpg' },
              { title: 'Lodge', description: 'Lodges & guest houses', href: '/public/properties?type=lodge', imageSrc: '/assets/guest_house.jpg' },
              { title: 'Campsite', description: 'Campsites and outdoor stays', href: '/public/properties?type=campsite', imageSrc: '/assets/campsite.jpg' },
              { title: 'Villa', description: 'Villas and private homes', href: '/public/properties?type=villa', imageSrc: '/assets/villa.jpg' },
              { title: 'Bengaluru', description: 'City stays in Bengaluru', href: '/public/properties?city=bengaluru', imageSrc: '/assets/Bengaruru.jpg' },
            ].map((c) => (
              <PropertyCard key={c.title} title={c.title} description={c.description} href={c.href} imageSrc={c.imageSrc} />
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
            {[
              { title: 'Airport Transfers', description: 'Reliable airport pickup & dropoff', href: '/public/services?service=airport', imageSrc: '/assets/Makundi.jpg' },
              { title: 'Guided Tours', description: 'Book guided tours and experiences', href: '/public/services?service=tours', imageSrc: '/assets/Toursite.jpeg' },
              { title: 'Vehicle Hire', description: 'Cars, vans and drivers for hire', href: '/public/services?service=vehicle', imageSrc: '/assets/udongo.jpg' },
              { title: 'Event Transport', description: 'Transport solutions for events', href: '/public/services?service=events', imageSrc: '/assets/Local_houses.jpg' },
              { title: 'Concierge', description: 'Concierge & planning services', href: '/public/services?service=concierge', imageSrc: '/assets/Villagestay.jpg' },
            ].map((s) => (
              <PropertyCard key={s.title} title={s.title} description={s.description} href={s.href} imageSrc={s.imageSrc} />
            ))}
          </div>

          <SectionSeparator variant="map" pillLabel="Cities" className="mt-10" />
          <div className="mt-6">
            {/* Rotating country cards: the order cycles periodically to avoid left-side bias. */}
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              style={{ contain: 'layout style' }}
              onMouseEnter={() => setRotatePaused(true)}
              onMouseLeave={() => setRotatePaused(false)}
              onFocus={() => setRotatePaused(true)}
              onBlur={() => setRotatePaused(false)}
            >
              {orderedCountries.map((c) => (
                <CountryCard key={c.id} id={c.id} name={c.name} flag={c.flag} subtitle={c.subtitle} blurb={c.blurb} href={c.href} stats={c.stats} />
              ))}
            </div>
          </div>

          {/* Separator for How to Book section */}
          <div className="w-full mt-4 mb-2">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex items-center justify-center">
                <div className="flex-1 h-px bg-slate-300" />
                <div className="mx-4 flex items-center gap-2">
                  <div className="inline-flex items-center bg-white/90 px-3 py-1 rounded-full shadow-sm border border-slate-200">
                    <svg suppressHydrationWarning className="w-4 h-4 text-emerald-600 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                      <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 12 6 12s6-6.75 6-12c0-3.314-2.686-6-6-6z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="8" r="2" fill="currentColor" />
                    </svg>
                    <span className="text-sm font-semibold text-slate-800">How to Book</span>
                  </div>
                {/* Group Stays control moved to its own page */}
                </div>
                <div className="flex-1 h-px bg-slate-300" />
              </div>
            </div>
          </div>

          

          {/* Booking flow card: explain booking steps and allow driver options */}
          <BookingFlowCard />
          <FounderStory />
          <Testimonials />
          <LatestUpdate />

          <TrustedBySectionWithData />
        </div>
      </section>
    </main>
  );
}
