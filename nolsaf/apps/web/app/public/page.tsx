"use client";

import Link from "next/link";
import Image from "next/image";
import React from "react";
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
  const [brands, setBrands] = useState<Array<{ name: string; logoUrl?: string; href?: string }>>([
    { name: "M-Pesa", logoUrl: "/assets/M-pesa.png", href: "https://www.vodacom.co.tz/m-pesa" },
    { name: "Airtel Money", logoUrl: "/assets/airtel_money.png", href: "https://www.airtel.co.tz/airtel-money" },
    { name: "Tigo Pesa", logoUrl: "/assets/mix%20by%20yas.png", href: "https://www.tigo.co.tz/tigo-pesa" },
    { name: "VISA", logoUrl: "/assets/visa_card.png", href: "https://www.visa.com" },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const api = axios.create({ baseURL: "" });
        const r = await api.get<{ items: Array<{ name: string; logoUrl: string | null; href: string | null }> }>("/admin/trust-partners/public");
        const items = Array.isArray(r.data?.items) ? r.data.items : [];
        const mapped = items
          .map((item) => ({
            name: item.name,
            logoUrl: item.logoUrl || undefined,
            href: item.href || undefined,
          }))
          .filter((b) => Boolean(b.name));

        // If DB has no rows yet, show a safe default so the section is still visible in public.
        if (mapped.length > 0) {
          setBrands(mapped);
        } else {
          setBrands([
            { name: "M-Pesa", logoUrl: "/assets/M-pesa.png", href: "https://www.vodacom.co.tz/m-pesa" },
            { name: "Airtel Money", logoUrl: "/assets/airtel_money.png", href: "https://www.airtel.co.tz/airtel-money" },
            { name: "Tigo Pesa", logoUrl: "/assets/mix%20by%20yas.png", href: "https://www.tigo.co.tz/tigo-pesa" },
            { name: "VISA", logoUrl: "/assets/visa_card.png", href: "https://www.visa.com" },
          ]);
        }
      } catch (err) {
        console.error("Failed to load trust partners", err);
        // Fallback to default partners if API fails
        setBrands([
          { name: "M-Pesa", logoUrl: "/assets/M-pesa.png", href: "https://www.vodacom.co.tz/m-pesa" },
          { name: "Airtel Money", logoUrl: "/assets/airtel_money.png", href: "https://www.airtel.co.tz/airtel-money" },
          { name: "Tigo Pesa", logoUrl: "/assets/mix%20by%20yas.png", href: "https://www.tigo.co.tz/tigo-pesa" },
          { name: "VISA", logoUrl: "/assets/visa_card.png", href: "https://www.visa.com" },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Keep layout stable: show something even while loading (fallback brands will be replaced if DB has items)
  return <TrustedBySection brands={brands} className={loading ? "opacity-90" : ""} />;
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
      subtitle: 'Book accommodation and secure rides to your doorstep.',
      ctaLabel: 'Browse city stays',
      ctaHref: '/public/properties?type=city',
    },
  ];

  const [idx, setIdx] = useState(0);
  const active = slides[idx];
  const timerRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);

  // Property type cards (counts + quick navigation)
  type PropertyTypeKey =
    | "HOTEL"
    | "LODGE"
    | "APARTMENT"
    | "VILLA"
    | "GUEST_HOUSE"
    | "BUNGALOW"
    | "CABIN"
    | "HOMESTAY"
    | "CONDO"
    | "HOUSE";

  type PublicPropertyCardLite = {
    title: string;
    location: string;
    primaryImage: string | null;
    basePrice: number | null;
    currency: string | null;
  };

  const PROPERTY_TYPE_CARDS: Array<{
    key: PropertyTypeKey;
    title: string;
    fallbackImageSrc: string;
  }> = [
    { key: "HOTEL", title: "Hotel", fallbackImageSrc: "/assets/hotel.jpg" },
    { key: "LODGE", title: "Lodge", fallbackImageSrc: "/assets/guest_house.jpg" },
    { key: "APARTMENT", title: "Apartment", fallbackImageSrc: "/assets/Local_houses.jpg" },
    { key: "VILLA", title: "Villa", fallbackImageSrc: "/assets/villa.jpg" },
    { key: "GUEST_HOUSE", title: "Guest house", fallbackImageSrc: "/assets/Villagestay.jpg" },
    { key: "BUNGALOW", title: "Bungalow", fallbackImageSrc: "/assets/villa.jpg" },
    { key: "CABIN", title: "Cabin", fallbackImageSrc: "/assets/campsite.jpg" },
    { key: "HOMESTAY", title: "Homestay", fallbackImageSrc: "/assets/Local_houses.jpg" },
    { key: "CONDO", title: "Condo", fallbackImageSrc: "/assets/Local_houses.jpg" },
    { key: "HOUSE", title: "House", fallbackImageSrc: "/assets/Local_houses.jpg" },
  ];

  const [typeCounts, setTypeCounts] = useState<Record<string, number | null>>({});
  const [typeSamples, setTypeSamples] = useState<Record<string, PublicPropertyCardLite | null>>({});
  const [countsLoading, setCountsLoading] = useState(true);
  const [blinkCounts, setBlinkCounts] = useState(false);

  const [topCities, setTopCities] = useState<Array<{ city: string; count: number; imageSrc: string | null }>>([]);
  const [citiesLoading, setCitiesLoading] = useState(true);

  const cityKey = (s: string) => String(s || "").trim().toLowerCase();
  const CITY_IMAGE_MAP: Record<string, string> = {
    // Use stable, brand-safe hero images for key cities (Booking.com style tiles)
    [cityKey("Dar es Salaam")]: "/assets/nolsaf%20picture%203.jpg",
    [cityKey("Zanzibar")]: "/assets/nolsaf%20picture%201.jpg",
    [cityKey("Arusha")]: "/assets/nolsaf%20picture%2022.jpg",
    [cityKey("Dodoma")]: "/assets/Welcome.jpg",
    [cityKey("Mwanza")]: "/assets/Local_houses.jpg",
  };

  const CITY_FALLBACK_IMAGES = [
    "/assets/nolsaf%20picture%201.jpg",
    "/assets/nolsaf%20picture%2022.jpg",
    "/assets/nolsaf%20picture%203.jpg",
    "/assets/Welcome.jpg",
    "/assets/Local_houses.jpg",
  ];

  const fmtMoney = (amount: number | null | undefined, currency?: string | null) => {
    if (amount == null || !Number.isFinite(Number(amount))) return "";
    const cur = currency || "TZS";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Number(amount));
    } catch {
      return `${cur} ${Number(amount).toLocaleString()}`;
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      setCountsLoading(true);
      try {
        const pairs = await Promise.all(
          PROPERTY_TYPE_CARDS.map(async (t) => {
            const res = await fetch(`/api/public/properties?types=${encodeURIComponent(t.key)}&page=1&pageSize=1`, {
              cache: "no-store",
            });
            if (!res.ok) return [t.key, null, null] as const;
            const json = (await res.json()) as any;
            const total = typeof json?.total === "number" ? json.total : Number(json?.total);
            const first = Array.isArray(json?.items) && json.items.length ? json.items[0] : null;
            const sample: PublicPropertyCardLite | null = first
              ? {
                  title: String(first.title || ""),
                  location: String(first.location || ""),
                  primaryImage: typeof first.primaryImage === "string" ? first.primaryImage : null,
                  basePrice: first.basePrice != null ? Number(first.basePrice) : null,
                  currency: first.currency ?? null,
                }
              : null;
            return [t.key, Number.isFinite(total) ? total : null, sample] as const;
          })
        );
        if (cancelled) return;
        const next: Record<string, number | null> = {};
        const nextSamples: Record<string, PublicPropertyCardLite | null> = {};
        for (const [k, v, s] of pairs) {
          next[k] = v;
          nextSamples[k] = s;
        }
        setTypeCounts(next);
        setTypeSamples(nextSamples);
        setBlinkCounts(true);
        window.setTimeout(() => setBlinkCounts(false), 1800);
      } catch {
        if (cancelled) return;
      } finally {
        if (!cancelled) setCountsLoading(false);
      }
    }
    void loadCounts();
    return () => {
      cancelled = true;
    };
    // Intentionally run once per mount (counts can be refreshed on page reload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadTopCities() {
      setCitiesLoading(true);
      try {
        const res = await fetch(`/api/public/properties/top-cities?take=5`, { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as any;
        const items = Array.isArray(json?.items) ? json.items : [];
        const mapped = items
          .map((it: any) => ({
            city: String(it?.city || "").trim(),
            count: Number(it?.count ?? 0),
            imageSrc: null as string | null, // image is chosen from local assets below
          }))
          .filter((x: any) => x.city && Number.isFinite(x.count) && x.count > 0);
        // TEMP fallback (visual sample): if DB has no city data yet, show sample tiles so you can review the design.
        // Remove this fallback once real city data is present.
        const fallbackSample = [
          { city: "Dar es Salaam", count: 128, imageSrc: null },
          { city: "Zanzibar", count: 96, imageSrc: null },
          { city: "Arusha", count: 74, imageSrc: null },
          { city: "Mwanza", count: 41, imageSrc: null },
          { city: "Dodoma", count: 33, imageSrc: null },
        ];
        if (!cancelled) setTopCities((mapped.length ? mapped : fallbackSample).slice(0, 5));
      } catch {
        // On error, still show sample tiles for design review (can be removed later)
        if (!cancelled) {
          setTopCities([
            { city: "Dar es Salaam", count: 128, imageSrc: null },
            { city: "Zanzibar", count: 96, imageSrc: null },
            { city: "Arusha", count: 74, imageSrc: null },
            { city: "Mwanza", count: 41, imageSrc: null },
            { city: "Dodoma", count: 33, imageSrc: null },
          ]);
        }
      } finally {
        if (!cancelled) setCitiesLoading(false);
      }
    }
    void loadTopCities();
    return () => {
      cancelled = true;
    };
  }, []);
  
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
        .hero-title { 
          display: block; 
          text-shadow: 0 2px 20px rgba(0, 0, 0, 0.7), 0 4px 30px rgba(0, 0, 0, 0.5);
        }
        .hero-title span { 
          display: inline-block;
          opacity: 0;
          transform: translateY(20px);
          animation: titleFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .hero-title .reveal { 
          display: inline-block;
          color: #ffffff;
          opacity: 0;
          transform: translateY(10px);
          animation: textReveal 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes titleFadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes textReveal {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* High blink animation for urgent banner titles */
        @keyframes highBlink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }
        .high-blink { animation: highBlink 600ms linear infinite; }

        .sub-title { 
          position: relative; 
          display: block;
          text-shadow: 0 2px 15px rgba(0, 0, 0, 0.6), 0 1px 5px rgba(0, 0, 0, 0.7);
        }
        .sub-title .sub-word { 
          display: inline-block;
          opacity: 0;
          transform: translateY(15px);
          animation: subtitleFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .sub-title .sub-reveal { 
          display: inline-block;
          color: rgba(255, 255, 255, 0.98);
          opacity: 0;
          transform: translateY(8px);
          animation: subtitleTextReveal 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        @keyframes subtitleFadeIn {
          0% {
            opacity: 0;
            transform: translateY(15px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes subtitleTextReveal {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Blink animation replacing the pen: when the subtitle is active it blinks to draw attention */
        @keyframes subBlink { 0% { opacity: 1; } 50% { opacity: 0.15; } 100% { opacity: 1; } }
        .writing-active .sub-title { animation: subBlink 1000ms linear infinite; }
      `;
      const el = document.createElement('style');
      el.id = styleId;
      el.textContent = css;
      document.head.appendChild(el);
    }

    // Set smooth staggered animations for title
    const titleContainer = document.querySelector('.hero-title');
    if (titleContainer) {
      const titleWords = Array.from(titleContainer.querySelectorAll('span')) as HTMLElement[];
      titleWords.forEach((el, i) => {
        el.style.animationDelay = `${i * 80}ms`; // 80ms between words
        const inner = el.querySelector('.reveal') as HTMLElement | null;
        if (inner) inner.style.animationDelay = `${i * 80 + 100}ms`; // Text appears 100ms after container
      });
    }

    // Set smooth staggered animations for subtitle
    const subtitleContainer = document.querySelector('.sub-title');
    if (subtitleContainer) {
      const subtitleWords = Array.from(subtitleContainer.querySelectorAll('.sub-word')) as HTMLElement[];
      const count = subtitleWords.length || 1;
      subtitleWords.forEach((el, i) => {
        // Stagger over 2.5 seconds for comfortable reading on mobile
        const delay = (i / Math.max(1, count - 1)) * 2500;
        el.style.animationDelay = `${delay}ms`;
        const inner = el.querySelector('.sub-reveal') as HTMLElement | null;
        if (inner) inner.style.animationDelay = `${delay + 80}ms`; // Text appears 80ms after container
      });
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
    // Inject card animations and fade-in effects
    const styleId = 'nolsaf-card-animations';
    if (!document.getElementById(styleId)) {
      const css = `
        .nls-blink { animation: nls-blink 800ms linear infinite; }
        @keyframes nls-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.18; } }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
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
      <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
      <section id="public-hero" className="relative bg-gray-50 border-b">
        {/* Full-bleed hero background (treated like header background).
            Keep content aligned via public-container inside the overlay. */}
        <div
          className="relative w-screen left-1/2 -translate-x-1/2 overflow-hidden w-full h-64 md:h-[420px] lg:h-[560px] rounded-b-2xl sm:rounded-b-3xl shadow-[0_18px_50px_rgba(2,6,23,0.10)] ring-1 ring-black/5"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {slides.map((s, i) => (
            <div
              key={s.src}
              className={`absolute inset-0 transition-opacity duration-700 overflow-hidden ${i === idx ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              aria-hidden={i !== idx}
            >
              <Image src={s.src} alt={s.alt} fill style={{ objectFit: 'cover' }} sizes="100vw" priority={i === 0} />
            </div>
          ))}

          {/* Contrast overlay to keep header + text readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/55 z-10 pointer-events-none" />

          {/* Overlay for welcome words - Mobile-first, clean design */}
          <div className="absolute inset-0 flex items-end justify-center p-3 sm:p-4 md:p-6 z-20 pointer-events-none">
            <div className="public-container w-full text-center text-white pointer-events-auto mb-4 sm:mb-6 md:mb-10">
                  {/* Title - Clean, responsive, no individual boxes */}
                  <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold hero-title leading-tight px-2 ${active.title === 'No Internet? No Problem' ? 'high-blink' : ''}`}>
                    <span className="inline-block">
                      {active.title.split(' ').map((w, i, arr) => (
                        <React.Fragment key={i}>
                          <span className="inline-block">
                            <span className="reveal">{w}</span>
                          </span>
                          {i < arr.length - 1 && <span className="inline-block mx-1 sm:mx-1.5" />}
                        </React.Fragment>
                      ))}
                    </span>
                  </h1>

                  {/* Subtitle - Clean, readable, wraps naturally */}
                  <p className={`mt-3 sm:mt-4 text-sm sm:text-base md:text-lg lg:text-xl font-medium sub-title leading-relaxed px-2 max-w-3xl mx-auto ${idx === 0 ? 'writing-active' : ''}`}>
                    <span className="inline-block">
                      {active.subtitle.split(' ').map((w, i, arr) => (
                        <React.Fragment key={i}>
                          <span className="inline-block sub-word">
                            <span className="sub-reveal">{w}</span>
                          </span>
                          {i < arr.length - 1 && <span className="inline-block mx-0.5 sm:mx-1" />}
                        </React.Fragment>
                      ))}
                    </span>
                  </p>

                  {/* Search Form - Horizontal layout on all screens, size-responsive */}
                  <form onSubmit={submitSearch} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} className="mt-4 sm:mt-6 w-full max-w-2xl mx-auto pointer-events-auto">
                    <div className="flex flex-row items-center gap-1 sm:gap-1.5 bg-black/60 backdrop-blur-md rounded-full p-1.5 sm:p-2 shadow-xl border border-white/10 w-fit mx-auto">
                      <input
                        aria-label="Search query"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="flex-none w-auto min-w-[120px] sm:min-w-[150px] px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base rounded-l-full rounded-r-none border border-white/30 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400/50"
                      />
                      <div ref={guestRef} className="inline-flex items-center justify-center gap-1 sm:gap-1.5 border border-white/20 rounded-full overflow-visible px-1.5 sm:px-2 py-1 sm:py-1.5 relative bg-white/5">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            aria-label="Open guest selector"
                            aria-expanded={guestOpen}
                            ref={triggerRef}
                            onClick={() => { setGuestOpen(true); setPaused(true); }}
                            onTouchStart={() => { setGuestOpen(true); setPaused(true); }}
                            className="inline-flex items-center gap-1 sm:gap-1.5 px-0.5 sm:px-1.5 py-0.5 sm:py-1 bg-transparent text-white text-xs sm:text-sm"
                          >
                            <User className="w-3 h-3 sm:w-4 sm:h-4 text-white/90 flex-shrink-0" aria-hidden />
                            <span className="text-white whitespace-nowrap text-xs sm:text-sm">{adults}{children ? ` + ${children}` : ''}</span>
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
                      <div ref={dateRef} className="inline-flex items-center justify-center gap-1 sm:gap-1.5 relative border border-white/20 rounded-full px-1.5 sm:px-2.5 py-1 sm:py-1.5 bg-white/5">
                        <button
                          type="button"
                          aria-label="Select dates"
                          onClick={() => { setDateOpen((v) => !v); setPaused(true); }}
                          className="flex-none text-center px-0 py-0 bg-transparent text-white border-0 text-xs sm:text-sm whitespace-nowrap"
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
                      <button 
                        type="submit" 
                        className="flex-shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-r-full rounded-l-none font-semibold text-xs sm:text-sm transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 whitespace-nowrap"
                      >
                        Search
                      </button>
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

        <div className="public-container pt-0 pb-6 lg:pb-12">
          {/* Decorative separator marking end of hero */}
          <SectionSeparator label="End of hero" className="mt-6" />
        </div>

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
              className="group relative border-2 rounded-xl p-5 pl-8 bg-white flex flex-col h-auto border-blue-100 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01] hover:border-blue-300 overflow-visible"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.1s both' }}
            >
              <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-md bg-blue-600 transition-all duration-300 group-hover:w-2 group-hover:bg-blue-700 z-0" />
              {/* Header: icon + title positioned at the top-left */}
              <div className="relative z-10 flex items-center gap-2.5 mb-3">
                <Globe className="w-6 h-6 text-blue-600 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" aria-hidden />
                <h3 className="font-semibold text-lg text-blue-700 transition-colors duration-300 group-hover:text-blue-800">Travelers</h3>
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
                <p className="text-sm text-slate-600 leading-relaxed mb-4">Trusted stays and safe transport in one place. Compare options and prices, pay locally or internationally, and book securely with 24/7 support.</p>
              </div>
              <div>
                <AttentionBlink active={hoveredCard === 0}>
                  <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium transition-all duration-300 group-hover:bg-blue-700 group-hover:shadow-md group-hover:scale-105">Browse stays</span>
                </AttentionBlink>
                <div className="mt-3 flex items-center gap-2 flex-wrap relative z-20">
                  <Link href="/help/payments" className="no-underline transition-transform duration-200 hover:scale-105" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center text-xs bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1.5 rounded-md transition-all duration-200 hover:bg-blue-100 hover:border-blue-200 font-medium">
                      <Image src="/assets/M-pesa.png" alt="M-PESA" width={18} height={18} className="mr-1.5 object-contain w-4.5 h-4.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">Local payments</span>
                    </span>
                  </Link>

                  <Link href="/help/payments" className="no-underline transition-transform duration-200 hover:scale-105" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center text-xs bg-slate-50 border border-slate-100 text-slate-700 px-2.5 py-1.5 rounded-md transition-all duration-200 hover:bg-slate-100 hover:border-slate-200 font-medium">
                      <Image src="/assets/visa_card.png" alt="VISA" width={18} height={18} className="mr-1.5 object-contain w-4.5 h-4.5 flex-shrink-0" />
                      <span className="whitespace-nowrap">International payments</span>
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
              className="group relative border-2 rounded-xl p-5 pl-8 bg-white flex flex-col h-auto border-amber-100 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01] hover:border-amber-300 overflow-visible"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
            >
              <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-md bg-amber-500 transition-all duration-300 group-hover:w-2 group-hover:bg-amber-600 z-0" />
              <div className="relative z-10 flex items-center gap-2.5 mb-3">
                <Truck className="w-6 h-6 text-amber-500 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-12" aria-hidden />
                <h3 className="font-semibold text-lg text-amber-700 transition-colors duration-300 group-hover:text-amber-800">Drivers</h3>
              </div>
              <div
                onPointerEnter={() => setHoveredCard(1)}
                onPointerLeave={() => setHoveredCard(null)}
                onFocus={() => setHoveredCard(1)}
                onBlur={() => setHoveredCard(null)}
                onTouchStart={() => setHoveredCard(1)}
                onTouchEnd={() => setHoveredCard(null)}
              >
                <p className="text-sm text-slate-600 leading-relaxed mb-4">Join NoLSAF to access more rides, receive local seamless payments, and grow your earnings with reliable booking flows and driver tools.</p>
              </div>
              <div>
                <AttentionBlink active={hoveredCard === 1}>
                  <span className="inline-flex items-center px-4 py-2 bg-amber-500 text-white rounded-lg font-medium transition-all duration-300 group-hover:bg-amber-600 group-hover:shadow-md group-hover:scale-105">Register as a driver</span>
                </AttentionBlink>
                <div className="mt-3 relative z-20">
                  <Link href="/help/driver-tools" className="no-underline transition-transform duration-200 hover:scale-105" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center text-xs bg-amber-50 border border-amber-100 text-amber-700 px-2.5 py-1.5 rounded-md transition-all duration-200 hover:bg-amber-100 hover:border-amber-200 font-medium">
                      <Wrench className="w-3.5 h-3.5 mr-1.5 text-amber-700 transition-transform duration-200 group-hover:rotate-90 flex-shrink-0" aria-hidden />
                      <span className="whitespace-nowrap">Driver tools</span>
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
              className="group relative border-2 rounded-xl p-5 pl-8 bg-white flex flex-col h-auto border-violet-100 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01] hover:border-violet-300 overflow-visible"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
            >
              <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1.5 rounded-r-md bg-violet-600 transition-all duration-300 group-hover:w-2 group-hover:bg-violet-700 z-0" />
              <div className="relative z-10 flex items-center gap-2.5 mb-3">
                <Home className="w-6 h-6 text-violet-600 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" aria-hidden />
                <h3 className="font-semibold text-lg text-violet-700 transition-colors duration-300 group-hover:text-violet-800">Property Owners</h3>
              </div>
              <div
                onPointerEnter={() => setHoveredCard(2)}
                onPointerLeave={() => setHoveredCard(null)}
                onFocus={() => setHoveredCard(2)}
                onBlur={() => setHoveredCard(null)}
                onTouchStart={() => setHoveredCard(2)}
                onTouchEnd={() => setHoveredCard(null)}
              >
                <p className="text-sm text-slate-600 leading-relaxed mb-4">List your property to reach travelers across East Africa — manage bookings, set availability, and get paid fast through local payment integrations.</p>
              </div>
              <div>
                <AttentionBlink active={hoveredCard === 2}>
                  <span className="inline-flex items-center px-4 py-2 bg-violet-600 text-white rounded-lg font-medium transition-all duration-300 group-hover:bg-violet-700 group-hover:shadow-md group-hover:scale-105">List your property</span>
                </AttentionBlink>
                <div className="mt-3 relative z-20">
                  <Link href="/help/payouts" className="no-underline transition-transform duration-200 hover:scale-105" onClick={(e) => e.stopPropagation()}>
                    <span className="inline-flex items-center text-xs bg-violet-50 border border-violet-100 text-violet-700 px-2.5 py-1.5 rounded-md transition-all duration-200 hover:bg-violet-100 hover:border-violet-200 font-medium">
                      <DollarSign className="w-3.5 h-3.5 mr-1.5 text-violet-700 transition-transform duration-200 group-hover:scale-110 flex-shrink-0" aria-hidden />
                      <span className="whitespace-nowrap">Fast payouts</span>
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <SectionSeparator variant="dots" pillLabel="Explore" className="mt-6" />

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
            {PROPERTY_TYPE_CARDS.map((c) => {
              const count = typeCounts[c.key];
              const sample = typeSamples[c.key];
              const href = `/public/properties?types=${encodeURIComponent(c.key)}&page=1`;
              return (
                <PropertyCard
                  key={c.key}
                  title={c.title}
                  description={
                    sample
                      ? `${sample.title}${sample.location ? ` • ${sample.location}` : ""}${sample.basePrice != null ? ` • from ${fmtMoney(sample.basePrice, sample.currency)}` : ""}`
                      : `${c.title} stays`
                  }
                  href={href}
                  imageSrc={sample?.primaryImage || c.fallbackImageSrc}
                  topLeftBadge={
                    <AttentionBlink active={blinkCounts}>
                      <span
                        className={[
                          "inline-flex items-center gap-2 rounded-full px-2.5 py-1",
                          "bg-white/80 backdrop-blur-md ring-1 ring-white/70",
                          "text-[11px] font-semibold text-slate-900",
                          countsLoading ? "animate-pulse" : "",
                        ].join(" ")}
                      >
                        <span className="text-slate-600">Total</span>
                        <span className="tabular-nums">{typeof count === "number" ? count.toLocaleString() : "—"}</span>
                      </span>
                    </AttentionBlink>
                  }
                  topLeftSubBadge={
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 bg-[#02665e]/90 text-white text-xs font-semibold ring-1 ring-white/40 backdrop-blur-md">
                      {c.title}
                    </span>
                  }
                />
              );
            })}
          </div>

          <div className="mt-8">
            <SectionSeparator variant="map" pillLabel="Top Cities" className="mt-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
              {(citiesLoading ? Array.from({ length: 5 }) : topCities).map((c: any, idx: number) => {
                if (!c || typeof c.city !== "string") {
                  return (
                    <div key={`city-skel-${idx}`} className="h-56 rounded-xl border-2 border-slate-100 bg-slate-50 animate-pulse" />
                  );
                }
                const href = `/public/properties?city=${encodeURIComponent(c.city)}&page=1`;
                const img =
                  CITY_IMAGE_MAP[cityKey(c.city)] ||
                  CITY_FALLBACK_IMAGES[idx % CITY_FALLBACK_IMAGES.length] ||
                  "/assets/Local_houses.jpg";
                return (
                  <PropertyCard
                    key={c.city}
                    title={c.city}
                    description=""
                    href={href}
                    imageSrc={img}
                    hideCaption
                    showVerified={false}
                    ctaLabel="Explore"
                    bottomOverlay={
                      <div className="-mx-4 px-4 py-3 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                        <div className="text-white font-bold text-lg leading-tight">{c.city}</div>
                        <div className="text-white/90 text-xs font-semibold">{Number(c.count).toLocaleString()} properties</div>
                      </div>
                    }
                  />
                );
              })}
            </div>
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
          <TrustedBySectionWithData />
          <LatestUpdate />
        </div>
      </section>
    </main>
  );
}
