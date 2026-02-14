"use client";

import Link from "next/link";
import React from "react";
import {
  User,
  ChevronRight,
  ChevronLeft,
  X,
  Calendar,
  Eye,
  Sparkles,
  Gavel,
  Home,
  Car,
  Users,
  CreditCard,
  LifeBuoy,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, FormEvent, useMemo } from "react";
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
        const r = await api.get<{ items: Array<{ name: string; logoUrl: string | null; href: string | null }> }>("/api/admin/trust-partners/public");
        const items = Array.isArray(r.data?.items) ? r.data.items : [];
        const mapped = items
          .map((item) => ({
            name: item.name,
            logoUrl: item.logoUrl || undefined,
            href: item.href || undefined,
          }))
          .filter((b) => Boolean(b.name));

        setBrands(mapped);
      } catch (err) {
        console.error("Failed to load trust partners", err);
        setBrands([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Admin fully controls this section. If no partners are configured (or API fails), hide the section.
  if (!loading && brands.length === 0) return null;
  if (brands.length === 0) return null;

  return <TrustedBySection brands={brands} hideTitle className={loading ? "opacity-90" : ""} />;
}

function SectionHeading({
  title,
  subtitle,
  kicker,
  variant = "bar",
  className = "",
  tone = "light",
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  variant?: "bar" | "center" | "split" | "eyebrow" | "compact";
  className?: string;
  tone?: "light" | "dark";
}) {
  const titleClass = tone === "dark" ? "text-white" : "text-slate-900";
  const subtitleClass = tone === "dark" ? "text-white/80" : "text-slate-600";
  const dividerNeutral = tone === "dark" ? "via-white/12" : "via-slate-200/75";
  const titleEnhance = tone === "dark" ? "drop-shadow-sm" : "";

  const accentBar = (
    <span
      className="h-6 w-1.5 rounded-full bg-gradient-to-b from-[#02b4f5] via-[#02b4f5] to-[#02665e] shadow-[0_10px_22px_rgba(2,180,245,0.16)]"
      aria-hidden
    />
  );

  if (variant === "center") {
    return (
      <div className={["relative text-center", className].join(" ")}>
        {kicker ? (
          <div className="inline-flex items-center rounded-full bg-[#02665e]/8 ring-1 ring-[#02665e]/18 px-3 py-1 text-[#02665e] text-[11px] font-semibold tracking-wide">
            {kicker}
          </div>
        ) : null}
        <h2 className={[titleClass, kicker ? "mt-3" : "", "text-2xl sm:text-3xl font-semibold tracking-tight"].join(" ")}>
          {title}
        </h2>
        {subtitle ? (
          <p className={["mt-3 mx-auto text-sm leading-relaxed max-w-[74ch]", subtitleClass].join(" ")}>
            {subtitle}
          </p>
        ) : null}
        <div className={["mt-5 h-px w-full bg-gradient-to-r from-transparent", dividerNeutral, "to-transparent"].join(" ")} aria-hidden />
      </div>
    );
  }

  if (variant === "split") {
    return (
      <div className={["relative", className].join(" ")}>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="min-w-0">
            {kicker ? (
              <div className="inline-flex items-center rounded-full bg-[#02b4f5]/8 ring-1 ring-[#02b4f5]/18 px-3 py-1 text-[#035c8b] text-[11px] font-semibold tracking-wide">
                {kicker}
              </div>
            ) : null}
            <div className={["flex items-center gap-3", kicker ? "mt-3" : ""].join(" ")}>
              {accentBar}
              <h2 className={[titleClass, "text-2xl sm:text-3xl font-semibold tracking-tight"].join(" ")}>
                {title}
              </h2>
            </div>
          </div>

          {subtitle ? (
            <p className={["text-sm leading-relaxed max-w-[70ch] lg:text-right", subtitleClass].join(" ")}>
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className={["mt-4 h-px w-full bg-gradient-to-r from-transparent", dividerNeutral, "to-transparent"].join(" ")} aria-hidden />
        <div className="mt-2 h-px w-full bg-gradient-to-r from-[#02b4f5]/0 via-[#02b4f5]/22 to-[#02665e]/0" aria-hidden />
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={["relative", className].join(" ")}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {kicker ? (
              <div className={[tone === "dark" ? "text-white/80" : "text-[#02665e]", "text-[11px] font-semibold tracking-wide"].join(" ")}>
                {kicker}
              </div>
            ) : null}
            <h2 className={[titleClass, titleEnhance, kicker ? "mt-1" : "", "text-xl sm:text-2xl font-semibold tracking-tight"].join(" ")}>
              {title}
            </h2>
          </div>

          <div className="hidden md:flex items-center gap-2" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-full bg-[#02b4f5]/55" />
            <span className="h-1.5 w-1.5 rounded-full bg-[#02665e]/55" />
            <span className="h-1.5 w-1.5 rounded-full bg-slate-200" />
          </div>
        </div>
        {subtitle ? (
          <p className={["mt-2 text-sm leading-relaxed max-w-[76ch]", subtitleClass].join(" ")}>
            {subtitle}
          </p>
        ) : null}
        <div className={[("mt-4 h-px w-full bg-gradient-to-r from-transparent"), dividerNeutral, ("to-transparent")].join(" ")} aria-hidden />
      </div>
    );
  }

  // "eyebrow" and default "bar" share a strong left-aligned, premium layout.
  return (
    <div className={["relative", className].join(" ")}>
      {variant === "eyebrow" && kicker ? (
        <div
          className={[
            "inline-flex items-center rounded-full backdrop-blur-md ring-1 px-3 py-1 text-[11px] font-semibold tracking-wide shadow-sm",
            tone === "dark" ? "bg-white/10 ring-white/20 text-white/85" : "bg-white/70 ring-slate-200/70 text-[#02665e]",
          ].join(" ")}
        >
          {kicker}
        </div>
      ) : null}

      <div className={["flex items-start justify-between gap-6", variant === "eyebrow" && kicker ? "mt-3" : ""].join(" ")}>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {accentBar}
            <h2 className={[titleClass, titleEnhance, "text-2xl sm:text-3xl font-semibold tracking-tight"].join(" ")}>
              {title}
            </h2>
          </div>

          {subtitle ? (
            <p className={["mt-2 text-sm leading-relaxed max-w-[76ch]", subtitleClass].join(" ")}>
              {subtitle}
            </p>
          ) : null}
        </div>

        <div className="hidden lg:block flex-1 pt-3">
          <div className={[("h-px w-full bg-gradient-to-r from-transparent"), dividerNeutral, ("to-transparent")].join(" ")} aria-hidden />
          <div className="mt-2 h-px w-full bg-gradient-to-r from-[#02b4f5]/0 via-[#02b4f5]/28 to-[#02665e]/0" aria-hidden />
        </div>
      </div>

      <div className={[("mt-4 h-px w-full bg-gradient-to-r from-transparent lg:hidden"), dividerNeutral, ("to-transparent")].join(" ")} aria-hidden />
    </div>
  );
}
/* react-day-picker in this project/version doesn't export a Range type,
   so provide a local Range type compatible with the code below. */
type Range = { from: Date; to?: Date };
import 'react-day-picker/dist/style.css';
import { useRouter } from 'next/navigation';

import HeroRingsBackground from "../../components/HeroRingsBackground";

export default function Page() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  // Group Stays is now a standalone page; removed inline event integration.

  type HeroMode = "stays" | "transport" | "host";
  const [heroMode, setHeroMode] = useState<HeroMode>("stays");

  // Cursor/touch-adaptive hero glow (premium interactive background)
  const heroRef = useRef<HTMLElement | null>(null);
  const heroPointerRafRef = useRef<number | null>(null);
  const heroPointerPendingRef = useRef<{ x: number; y: number } | null>(null);
  const heroPressTimerRef = useRef<number | null>(null);
  const [heroPointerActive, setHeroPointerActive] = useState(false);
  const [heroPressed, setHeroPressed] = useState(false);

  const queueHeroPointer = useCallback((clientX: number, clientY: number) => {
    heroPointerPendingRef.current = { x: clientX, y: clientY };
    if (heroPointerRafRef.current != null) return;

    heroPointerRafRef.current = window.requestAnimationFrame(() => {
      heroPointerRafRef.current = null;
      const el = heroRef.current;
      const pending = heroPointerPendingRef.current;
      if (!el || !pending) return;
      const rect = el.getBoundingClientRect();
      const x = Math.min(Math.max(pending.x - rect.left, 0), rect.width);
      const y = Math.min(Math.max(pending.y - rect.top, 0), rect.height);
      el.style.setProperty("--hero-x", `${Math.round(x)}px`);
      el.style.setProperty("--hero-y", `${Math.round(y)}px`);
    });
  }, []);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    // Initialize CSS vars to center so first hover/touch looks intentional.
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--hero-x", `${Math.round(rect.width * 0.52)}px`);
    el.style.setProperty("--hero-y", `${Math.round(rect.height * 0.42)}px`);

    return () => {
      if (heroPointerRafRef.current != null) window.cancelAnimationFrame(heroPointerRafRef.current);
      if (heroPressTimerRef.current != null) window.clearTimeout(heroPressTimerRef.current);
    };
  }, []);

  const scrollToBookingFlow = useCallback(() => {
    const el = document.getElementById("booking-flow");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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

  const FEATURED_DESTINATIONS = useMemo(
    () =>
      [
        {
          city: "Dar es Salaam",
          country: "Tanzania",
          tagline: "Coastal city stays, business travel, and quick getaways.",
        },
        {
          city: "Nairobi",
          country: "Kenya",
          tagline: "Major hub for safaris, conferences, and city breaks.",
        },
        {
          city: "Zanzibar",
          country: "Tanzania",
          tagline: "Beachfront escapes, old town charm, and island stays.",
        },
        {
          city: "Arusha",
          country: "Tanzania",
          tagline: "Gateway to parks — lodges, villas, and adventure trips.",
        },
        {
          city: "Mwanza",
          country: "Tanzania",
          tagline: "Lake views, local hospitality, and weekend retreats.",
        },
        {
          city: "Dodoma",
          country: "Tanzania",
          tagline: "New capital energy — apartments, hotels, and homes.",
        },
      ] as const,
    []
  );

  const [featuredCityCounts, setFeaturedCityCounts] = useState<Record<string, number | null>>({});
  const [featuredCitiesLoading, setFeaturedCitiesLoading] = useState(true);

  const [groupStaySlide, setGroupStaySlide] = useState(0);
  const [connectedSlide, setConnectedSlide] = useState(0);
  const [connectedServicesPaused, setConnectedServicesPaused] = useState(false);
  const [featuredSlide, setFeaturedSlide] = useState(0);
  const [featuredSlidePaused, setFeaturedSlidePaused] = useState(false);

  const fmtMoney = (amount: number | null | undefined, currency?: string | null) => {
    if (amount == null || !Number.isFinite(Number(amount))) return "";
    const cur = currency || "TZS";
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Number(amount));
    } catch {
      return `${cur} ${Number(amount).toLocaleString()}`;
    }
  };

  const connectedSlides = useMemo(
    () =>
      [
        {
          key: "e2e",
          pill: "End‑to‑end",
          title: "Book → Pay → Receive code",
          body: "Verified listings, clear terms, and secure payments — designed for confidence.",
          Icon: CreditCard,
          chips: ["Verified stays", "Instant booking code"],
        },
        {
          key: "transport",
          pill: "Connected transport",
          title: "Pickup to your booking",
          body: "Add transport and track confirmation before the trip starts.",
          Icon: Car,
          chips: ["Driver confirmation", "Safety checks"],
        },
        {
          key: "authentic",
          pill: "Authentic local",
          title: "Guides & experiences",
          body: "Connect to trusted local experiences through one request.",
          Icon: Users,
          chips: ["Local guides", "Assisted planning"],
        },
      ] as const,
    []
  );

  const featuredDestinationSlides = useMemo(() => {
    const perSlide = 4;
    const list = FEATURED_DESTINATIONS;
    if (list.length <= perSlide) return [list];
    const first = list.slice(0, perSlide);
    const rest = list.slice(perSlide);
    const fill = first.slice(0, Math.max(0, perSlide - rest.length));
    return [first, [...rest, ...fill]];
  }, [FEATURED_DESTINATIONS]);

  const groupStaySlides = useMemo(
    () =>
      [
        {
          key: "auction",
          pill: "Group Stay",
          title: "Auction‑based offers",
          body: "Submit your requirements once — owners compete by sending offers. You pick the best fit.",
          Icon: Gavel,
          chips: ["Competitive offers", "Fast confirmation"],
        },
        {
          key: "budget",
          pill: "Budget control",
          title: "You decide the budget",
          body: "Keep the trip within your target budget while still getting verified options.",
          Icon: CreditCard,
          chips: ["Budget‑first", "Verified options"],
        },
        {
          key: "logistics",
          pill: "Logistics",
          title: "Rooms + transport",
          body: "Coordinate rooms and pickup with one request and clear confirmation steps.",
          Icon: Home,
          chips: ["Rooms", "Transport"],
        },
      ] as const,
    []
  );

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (connectedServicesPaused) return;
    const ms = 6500;
    const t = window.setInterval(() => {
      setGroupStaySlide((s) => (s + 1) % groupStaySlides.length);
      setConnectedSlide((s) => (s + 1) % connectedSlides.length);
    }, ms);
    return () => window.clearInterval(t);
  }, [prefersReducedMotion, connectedServicesPaused, groupStaySlides.length, connectedSlides.length]);

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (featuredSlidePaused) return;
    if (featuredDestinationSlides.length <= 1) return;

    const ms = 7000;
    const t = window.setInterval(() => {
      setFeaturedSlide((s) => (s + 1) % featuredDestinationSlides.length);
    }, ms);
    return () => window.clearInterval(t);
  }, [prefersReducedMotion, featuredSlidePaused, featuredDestinationSlides.length]);

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
    async function loadFeaturedCityCounts() {
      setFeaturedCitiesLoading(true);
      try {
        const pairs = await Promise.all(
          FEATURED_DESTINATIONS.map(async (d) => {
            const res = await fetch(`/api/public/properties?city=${encodeURIComponent(d.city)}&page=1&pageSize=1`, {
              cache: "no-store",
            });
            if (!res.ok) return [d.city, null] as const;
            const json = (await res.json()) as any;
            const total = typeof json?.total === "number" ? json.total : Number(json?.total);
            return [d.city, Number.isFinite(total) ? total : null] as const;
          })
        );
        if (cancelled) return;
        const next: Record<string, number | null> = {};
        for (const [city, total] of pairs) next[city] = total;
        setFeaturedCityCounts(next);
      } catch {
        if (cancelled) return;
        // keep empty (UI will show placeholders)
        setFeaturedCityCounts({});
      } finally {
        if (!cancelled) setFeaturedCitiesLoading(false);
      }
    }
    void loadFeaturedCityCounts();
    return () => {
      cancelled = true;
    };
  }, [FEATURED_DESTINATIONS]);
  
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

  // Auto-rotate hero modes (no manual toggles). Pause while popovers are open.
  useEffect(() => {
    if (prefersReducedMotion) return;
    if (guestOpen || dateOpen) return;

    const modes: HeroMode[] = ["stays", "transport", "host"];
    const id = window.setInterval(() => {
      setHeroMode((m) => {
        const idx = modes.indexOf(m);
        const next = idx >= 0 ? (idx + 1) % modes.length : 0;
        return modes[next];
      });
    }, 30000);
    return () => window.clearInterval(id);
  }, [prefersReducedMotion, guestOpen, dateOpen]);
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

  // Inject lightweight animations used in the hero (no photo assets)
  useEffect(() => {
    const styleId = "nolsaf-public-hero-anim";
    if (document.getElementById(styleId)) return;

    const css = [
      "@keyframes nolsafFloat {",
      "  0% { transform: translate3d(0, 0, 0); }",
      "  50% { transform: translate3d(0, -10px, 0); }",
      "  100% { transform: translate3d(0, 0, 0); }",
      "}",
      ".nolsaf-float { animation: nolsafFloat 6s ease-in-out infinite; }",
      ".nolsaf-float-slow { animation: nolsafFloat 9s ease-in-out infinite; }",
      "@media (prefers-reduced-motion: reduce) {",
      "  .nolsaf-float, .nolsaf-float-slow { animation: none !important; }",
      "}",
    ].join("\n");

    const el = document.createElement("style");
    el.id = styleId;
    el.textContent = css;
    document.head.appendChild(el);
  }, []);

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
  const [_hoveredCard, setHoveredCard] = useState<number | null>(null);
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

  // Countries list: stable order (no auto-rotation)
  const countryList = useMemo(
    () => [
      {
        id: 'tanzania',
        name: 'Tanzania',
        flag: '🇹🇿',
        subtitle: 'Safaris, parks & islands',
        blurb: 'From Serengeti to Zanzibar — find stays near major attractions, coordinate transport, and book securely with clear terms.',
        href: '/public/countries/tanzania',
        accentClass: 'from-sky-100/75 via-white/70 to-emerald-100/55',
        stats: { cities: 12, regions: 31, listings: 1250, payments: ['M-Pesa', 'Airtel Money', 'Halopesa', 'Mixx by Yas', 'Visa'] },
      },
      {
        id: 'kenya',
        name: 'Kenya',
        flag: '🇰🇪',
        subtitle: 'Big Five & coast',
        blurb: 'Explore Maasai Mara, Amboseli, and the coast — book verified stays, plan your route, and pay securely in one flow.',
        href: '/public/countries/kenya',
        accentClass: 'from-amber-100/65 via-white/70 to-emerald-100/55',
        stats: { cities: 10, listings: 980, payments: ['M-Pesa', 'Airtel Money', 'T Kash', 'Visa'] },
      },
      {
        id: 'uganda',
        name: 'Uganda',
        flag: '🇺🇬',
        subtitle: 'Gorillas, falls & lakes',
        blurb: 'From Bwindi to Murchison Falls — discover lodges near top sites and coordinate stays + transport with secure booking.',
        href: '/public/countries/uganda',
        accentClass: 'from-violet-100/65 via-white/70 to-emerald-100/55',
        stats: { cities: 7, listings: 430, payments: ['MTN Mobile Money', 'Visa'] },
      },
    ],
    []
  );

  const orderedCountries = countryList;

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
      {/* Hero surround frame (tinted border on ALL sides) */}
      <div className="public-container">
        <div className="relative overflow-hidden rounded-[40px] sm:rounded-[56px] p-3 sm:p-4 lg:p-5 bg-gradient-to-br from-slate-200/85 via-slate-100/65 to-slate-200/75 shadow-[0_26px_70px_rgba(15,23,42,0.18)] ring-1 ring-white/70">
          {/* Soft ambient tint + top highlight streaks like the reference */}
          <div className="pointer-events-none absolute inset-0 rounded-[40px] sm:rounded-[56px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.75),transparent_55%)]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.75)_48%,rgba(255,255,255,0.28)_52%,transparent_100%)] opacity-70" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-52 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.32)_45%,rgba(255,255,255,0.08)_55%,transparent_100%)] opacity-55" aria-hidden />

          {/* Inner hero border (thin premium gradient line) */}
          <div className="relative rounded-[32px] sm:rounded-[44px] p-[1px] bg-gradient-to-br from-white/35 via-[#02b4f5]/18 to-[#02665e]/22 shadow-[0_30px_80px_rgba(0,0,0,0.40)]">
            <div className="pointer-events-none absolute inset-0 rounded-[32px] sm:rounded-[44px] bg-gradient-to-b from-white/25 via-white/10 to-transparent" aria-hidden />

            <section
              id="public-hero"
              className="relative overflow-hidden bg-slate-900 text-white rounded-[calc(32px-1px)] sm:rounded-[calc(44px-1px)]"
              ref={heroRef as any}
              onPointerEnter={() => setHeroPointerActive(true)}
              onPointerLeave={() => {
                setHeroPointerActive(false);
                setHeroPressed(false);
              }}
              onPointerMove={(e) => {
                if (prefersReducedMotion) return;
                queueHeroPointer(e.clientX, e.clientY);
              }}
              onPointerDown={(e) => {
                setHeroPointerActive(true);
                queueHeroPointer(e.clientX, e.clientY);
                setHeroPressed(true);
                if (heroPressTimerRef.current != null) window.clearTimeout(heroPressTimerRef.current);
                heroPressTimerRef.current = window.setTimeout(() => setHeroPressed(false), 220);
              }}
              onPointerUp={() => setHeroPressed(false)}
            >
          {/* Inner ring highlight (subtle premium frame) */}
          <div className="pointer-events-none absolute inset-0 rounded-[calc(32px-1px)] sm:rounded-[calc(44px-1px)] ring-1 ring-white/14" aria-hidden />
          <div className="pointer-events-none absolute inset-0 rounded-[calc(32px-1px)] sm:rounded-[calc(44px-1px)] ring-1 ring-[#02b4f5]/10 [mask-image:radial-gradient(1200px_600px_at_85%_50%,#000_35%,transparent_70%)]" aria-hidden />
        {/* Full-bleed hero background (covers the whole hero page) */}
        <div className="absolute inset-0" aria-hidden>
          <HeroRingsBackground mode={heroMode} variant="full" className="absolute inset-0" />

          {/* Deep premium dark wash (2–3 tone split with a clean transition) */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/92 via-slate-950/55 to-emerald-950/55" />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-950/22 to-sky-950/30" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-cyan-950/24 to-transparent mix-blend-soft-light opacity-70" />

          {/* Brighter center highlight (keeps it intense, but not "too dark") */}
          <div className="absolute inset-0 bg-[radial-gradient(740px_circle_at_50%_34%,rgba(255,255,255,0.14),transparent_62%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(860px_circle_at_22%_18%,rgba(2,180,245,0.14),transparent_60%)] opacity-80" />
          <div className="absolute inset-0 bg-[radial-gradient(920px_circle_at_78%_26%,rgba(2,102,94,0.12),transparent_62%)] opacity-75" />

          {/* Diagonal glass glint (ultra-subtle premium finish) */}
          <div className="absolute -top-40 left-1/2 h-72 w-[1200px] -translate-x-1/2 rotate-[-12deg] bg-gradient-to-r from-transparent via-white/12 to-transparent opacity-35 blur-2xl" />

          {/* Subtle bloom around the transition seam (adds premium depth) */}
          <div className="absolute inset-0 [mask-image:radial-gradient(820px_640px_at_82%_54%,#000_32%,transparent_74%)] opacity-60 mix-blend-screen">
            <div className="absolute inset-0 bg-[radial-gradient(closest-side_at_80%_55%,rgba(56,189,248,0.20),transparent_64%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(closest-side_at_82%_58%,rgba(16,185,129,0.12),transparent_66%)]" />
          </div>

          {/* Technical micro-lines (very faint; masked away from headline) */}
          <div className="absolute inset-0 opacity-18 mix-blend-overlay [mask-image:radial-gradient(900px_520px_at_78%_22%,#000_38%,transparent_74%)]">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgba(255,255,255,0.08)_0px,rgba(255,255,255,0.08)_1px,transparent_1px,transparent_14px)]" />
          </div>

          {/* Thunder/transition seam (subtle lightning line to sell the split) */}
          <div className="absolute inset-0 pointer-events-none opacity-70 mix-blend-soft-light [mask-image:radial-gradient(760px_640px_at_80%_52%,#000_42%,transparent_78%)]">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 800" preserveAspectRatio="none" aria-hidden>
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path
                  d="M 760 0 L 820 125 L 800 210 L 860 335 L 830 420 L 910 565 L 875 660 L 940 800"
                  className="stroke-white/22"
                  strokeWidth="2"
                  opacity="0.78"
                />
                <path
                  d="M 760 0 L 820 125 L 800 210 L 860 335 L 830 420 L 910 565 L 875 660 L 940 800"
                  className="stroke-sky-200/20"
                  strokeWidth="7"
                  opacity="0.22"
                />
                <path
                  d="M 770 70 L 860 335 L 914 568"
                  className="stroke-emerald-200/14"
                  strokeWidth="10"
                  opacity="0.14"
                />

                {/* Soft cyan glow edge */}
                <path
                  d="M 760 0 L 820 125 L 800 210 L 860 335 L 830 420 L 910 565 L 875 660 L 940 800"
                  className="stroke-cyan-200/12"
                  strokeWidth="14"
                  opacity="0.10"
                />

                {/* Small branches to feel more like lightning */}
                <path d="M 820 125 L 900 175" className="stroke-white/18" strokeWidth="2" opacity="0.55" />
                <path d="M 860 335 L 960 370" className="stroke-white/16" strokeWidth="2" opacity="0.45" />
                <path d="M 830 420 L 920 470" className="stroke-sky-200/16" strokeWidth="3" opacity="0.22" />
              </g>

              {/* Spark nodes along the seam (very subtle) */}
              <g opacity="0.85">
                <circle cx="820" cy="125" r="2.5" className="fill-white/25" />
                <circle cx="860" cy="335" r="2.5" className="fill-white/18" />
                <circle cx="910" cy="565" r="2.5" className="fill-white/16" />
              </g>
            </svg>
          </div>

          {/* Subtle line-art drawing (premium tech/map feel) */}
          <div className="absolute inset-0 pointer-events-none opacity-50 [mask-image:radial-gradient(900px_520px_at_20%_45%,#000_40%,transparent_78%)]">
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 1200 800"
              preserveAspectRatio="none"
              aria-hidden
            >
              <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" className="text-white/25">
                <path d="M 40 210 C 200 150, 310 150, 470 220 S 760 300, 980 240 S 1120 210, 1180 250" strokeWidth="2" opacity="0.55" />
                <path d="M 60 360 C 250 290, 380 310, 520 380 S 770 470, 1010 420 S 1130 390, 1180 430" strokeWidth="2" opacity="0.45" />
                <path d="M 70 520 C 260 450, 420 470, 560 540 S 820 650, 1050 590 S 1140 560, 1180 600" strokeWidth="2" opacity="0.40" />
              </g>

              <g fill="none" stroke="currentColor" strokeLinecap="round" className="text-sky-300/25">
                <path d="M 120 140 L 330 230 L 520 170 L 680 260 L 820 210" strokeWidth="2" opacity="0.55" strokeDasharray="6 10" />
                <path d="M 160 610 L 360 520 L 520 610 L 720 540 L 880 620" strokeWidth="2" opacity="0.45" strokeDasharray="6 10" />
              </g>

              <g className="text-emerald-300/25" fill="currentColor" opacity="0.7">
                <circle cx="330" cy="230" r="3" />
                <circle cx="520" cy="170" r="3" />
                <circle cx="680" cy="260" r="3" />
                <circle cx="360" cy="520" r="3" />
                <circle cx="720" cy="540" r="3" />
              </g>
            </svg>
          </div>

          {/* Decorative glows (Central-like) */}
          <div className="absolute -inset-[30%] bg-[radial-gradient(circle_at_18%_8%,rgba(56,189,248,0.16),transparent_52%)]" />
          <div className="absolute -inset-[30%] bg-[radial-gradient(circle_at_80%_52%,rgba(34,211,238,0.14),transparent_55%)]" />
          <div className="absolute -inset-[30%] bg-[radial-gradient(circle_at_55%_92%,rgba(16,185,129,0.10),transparent_58%)]" />

          {/* Cursor/touch spotlight: fades in on hover/touch and amplifies slightly on press */}
          <div
            className={[
              "pointer-events-none absolute inset-0",
              "transition-opacity duration-500 ease-out motion-reduce:transition-none",
              "bg-[radial-gradient(720px_circle_at_var(--hero-x,52%)_var(--hero-y,42%),rgba(2,180,245,0.22),transparent_55%),radial-gradient(520px_circle_at_var(--hero-x,52%)_var(--hero-y,42%),rgba(2,102,94,0.18),transparent_62%),radial-gradient(1000px_circle_at_50%_115%,rgba(255,255,255,0.05),transparent_60%)]",
              heroPointerActive ? (heroPressed ? "opacity-95" : "opacity-70") : "opacity-0",
              heroPressed ? "saturate-150" : "saturate-125",
            ].join(" ")}
            aria-hidden
          />
          {/* Vignette + depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-transparent via-slate-950/35 to-slate-950/82" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-slate-950/22 to-slate-950/70" />
          <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:26px_26px] opacity-22" />
          <div className="absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:14px_14px] opacity-12 mix-blend-soft-light" />
          {/* Right-side curved (separate) arc lines — teal/cyan/white */}
          <div className="absolute inset-y-0 right-0 w-[60%] pointer-events-none opacity-100">
            <svg
              className="absolute inset-0 h-full w-full overflow-hidden"
              viewBox="0 0 1000 800"
              preserveAspectRatio="xMaxYMid meet"
              aria-hidden
            >
              <defs>
                <filter id="hero-arc-glow" x="-40%" y="-40%" width="180%" height="180%">
                  <feGaussianBlur stdDeviation="2.4" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.75 0"
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g filter="url(#hero-arc-glow)" fill="none" strokeLinecap="round" strokeLinejoin="round">
                {/* White arcs (separate segments) */}
                <path d="M 980 110 A 560 560 0 0 1 820 420" stroke="#ffffff" strokeWidth="5" opacity="0.26" />
                <path d="M 900 510 A 560 560 0 0 1 760 770" stroke="#ffffff" strokeWidth="5" opacity="0.22" />

                {/* Teal arcs (separate segments) */}
                <path d="M 990 170 A 500 500 0 0 1 830 470" stroke="#02665e" strokeWidth="8" opacity="0.52" />
                <path d="M 910 565 A 500 500 0 0 1 790 775" stroke="#02665e" strokeWidth="8" opacity="0.44" />

                {/* Cyan arcs (separate segments) */}
                <path d="M 995 235 A 440 440 0 0 1 845 520" stroke="#02b4f5" strokeWidth="11" opacity="0.88" />
                <path d="M 920 610 A 440 440 0 0 1 835 780" stroke="#02b4f5" strokeWidth="11" opacity="0.72" />

                {/* Thick cyan highlight segment */}
                <path d="M 995 390 A 360 360 0 0 1 900 540" stroke="#02b4f5" strokeWidth="18" opacity="0.98" />

                {/* Orbit nodes (aligned to the arcs region) */}
                <g opacity="0.95">
                  <circle cx="835" cy="360" r="16" stroke="#ffffff" strokeWidth="2" opacity="0.32" />
                  <circle cx="835" cy="360" r="4" fill="#ffffff" opacity="0.40" />

                  <circle cx="870" cy="520" r="18" stroke="#02665e" strokeWidth="3" opacity="0.82" />
                  <circle cx="870" cy="520" r="5" fill="#02665e" opacity="0.82" />

                  <circle cx="855" cy="705" r="20" stroke="#02b4f5" strokeWidth="3.5" opacity="0.90" />
                  <circle cx="855" cy="705" r="5.5" fill="#02b4f5" opacity="0.95" />
                </g>
              </g>
            </svg>
          </div>
          {/* Subtle top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </div>

        <div className="relative z-10">
          <div className="public-container min-h-[calc(100vh-72px)] grid grid-cols-1 lg:grid-cols-12 items-center gap-12 pt-16 pb-12 sm:pt-20 sm:pb-14 lg:pt-24 lg:pb-16">
              <div className="lg:col-span-12 flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                  className="max-w-4xl mx-auto text-center"
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={heroMode}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.75, ease: [0.2, 0.8, 0.2, 1] }}
                    >
                      <h1 className="mt-5 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-[-0.04em] leading-[0.94] text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/70 text-balance drop-shadow-[0_18px_55px_rgba(0,0,0,0.55)]">
                        {heroMode === "transport" ? (
                          "Book stays and add transport in one click."
                        ) : heroMode === "host" ? (
                          "Grow your bookings with a platform built for Africa."
                        ) : (
                          <>
                            <span className="block">Quality stay for</span>
                            <span className="block">
                              every <span className="font-serif italic">wallet.</span>
                            </span>
                          </>
                        )}
                      </h1>

                      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
                        {heroMode === "transport" ? (
                          <>
                            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-gradient-to-b from-white/[0.16] to-white/[0.06] ring-1 ring-white/22 shadow-[0_12px_38px_rgba(0,0,0,0.22)] text-white/90 text-xs font-semibold backdrop-blur-md hover:bg-white/[0.10] hover:ring-white/30 transition">Transparent pricing</span>
                            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-gradient-to-b from-white/[0.16] to-white/[0.06] ring-1 ring-white/22 shadow-[0_12px_38px_rgba(0,0,0,0.22)] text-white/90 text-xs font-semibold backdrop-blur-md hover:bg-white/[0.10] hover:ring-white/30 transition">Verified drivers</span>
                            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-gradient-to-b from-white/[0.16] to-white/[0.06] ring-1 ring-white/22 shadow-[0_12px_38px_rgba(0,0,0,0.22)] text-white/90 text-xs font-semibold backdrop-blur-md hover:bg-white/[0.10] hover:ring-white/30 transition">Live support</span>
                          </>
                        ) : heroMode === "host" ? (
                          <>
                            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-gradient-to-b from-white/[0.16] to-white/[0.06] ring-1 ring-white/22 shadow-[0_12px_38px_rgba(0,0,0,0.22)] text-white/90 text-xs font-semibold backdrop-blur-md hover:bg-white/[0.10] hover:ring-white/30 transition">Owner dashboard</span>
                            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-gradient-to-b from-white/[0.16] to-white/[0.06] ring-1 ring-white/22 shadow-[0_12px_38px_rgba(0,0,0,0.22)] text-white/90 text-xs font-semibold backdrop-blur-md hover:bg-white/[0.10] hover:ring-white/30 transition">Fast payouts</span>
                            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-gradient-to-b from-white/[0.16] to-white/[0.06] ring-1 ring-white/22 shadow-[0_12px_38px_rgba(0,0,0,0.22)] text-white/90 text-xs font-semibold backdrop-blur-md hover:bg-white/[0.10] hover:ring-white/30 transition">AI powered platform</span>
                          </>
                        ) : (
                          <>
                            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-gradient-to-b from-white/[0.16] to-white/[0.06] ring-1 ring-white/22 shadow-[0_12px_38px_rgba(0,0,0,0.22)] text-white/90 text-xs font-semibold backdrop-blur-md hover:bg-white/[0.10] hover:ring-white/30 transition">Physical Verified listings</span>
                            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-gradient-to-b from-white/[0.16] to-white/[0.06] ring-1 ring-white/22 shadow-[0_12px_38px_rgba(0,0,0,0.22)] text-white/90 text-xs font-semibold backdrop-blur-md hover:bg-white/[0.10] hover:ring-white/30 transition">Secure payments</span>
                            <span className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-gradient-to-b from-white/[0.16] to-white/[0.06] ring-1 ring-white/22 shadow-[0_12px_38px_rgba(0,0,0,0.22)] text-white/90 text-xs font-semibold backdrop-blur-md hover:bg-white/[0.10] hover:ring-white/30 transition">AI & Human support</span>
                          </>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}
                  className="mt-7 w-full max-w-2xl mx-auto"
                >
                <form onSubmit={submitSearch} className="w-full pointer-events-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-1.5 bg-gradient-to-b from-white/[0.16] to-white/[0.06] backdrop-blur-2xl rounded-3xl sm:rounded-full p-2 sm:p-2 shadow-[0_22px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/22 w-full sm:w-fit mx-auto">
                    <input
                      aria-label="Search query"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="w-full sm:w-auto sm:flex-none sm:min-w-[170px] min-w-0 px-3 sm:px-4 py-2 text-sm sm:text-base rounded-full sm:rounded-l-full sm:rounded-r-none border border-white/22 bg-white/[0.06] text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/45 focus:border-emerald-400/55"
                    />
                      <div ref={guestRef} className="w-full sm:w-auto inline-flex items-center justify-center gap-1 sm:gap-1.5 border border-white/20 rounded-full overflow-visible px-2 sm:px-2 py-1.5 sm:py-1.5 relative bg-white/5">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            aria-label="Open guest selector"
                            aria-expanded={guestOpen}
                            ref={triggerRef}
                            onClick={() => { setGuestOpen(true); }}
                            onTouchStart={() => { setGuestOpen(true); }}
                            className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 py-1 bg-transparent text-white text-sm sm:text-sm"
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
                                    <div className="text-sm font-semibold text-slate-900">Guests</div>
                                    <div className="text-xs text-slate-500">Adults, children, pets</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => { setGuestOpen(false); }} aria-label="Close guest selector" className="p-1 text-slate-600 rounded hover:bg-slate-100">
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
                                        className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition"
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
                                        className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition"
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
                                        className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition"
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
                                        className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition"
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
                                        className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition"
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
                                        className="h-8 w-8 flex items-center justify-center rounded-full border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 transition"
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
                                  <button
                                    type="button"
                                    onClick={() => { setAdults(1); setChildren(0); setPets(0); setPregnancy(false); }}
                                    className="px-3 py-1.5 text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition"
                                  >
                                    Clear
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setGuestOpen(false); }}
                                    className="px-3 py-1.5 text-sm text-white rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_10px_30px_rgba(16,185,129,0.30)] active:scale-95 transition"
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            </div>, document.body
                          )
                        ) : null}
                      </div>
                      <div ref={dateRef} className="w-full sm:w-auto inline-flex items-center justify-center gap-1 sm:gap-1.5 relative border border-white/20 rounded-full px-2.5 sm:px-2.5 py-1.5 sm:py-1.5 bg-white/5">
                        <button
                          type="button"
                          aria-label="Select dates"
                          onClick={() => { setDateOpen((v) => !v); }}
                          className="w-full sm:w-auto text-center px-0 py-0 bg-transparent text-white border-0 text-sm sm:text-sm whitespace-nowrap"
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
                                    className="px-3 py-1.5 text-sm text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition"
                                  >
                                    Clear
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { setDateOpen(false); }}
                                    className="px-3 py-1.5 text-sm text-white rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_10px_30px_rgba(16,185,129,0.30)] active:scale-95 transition"
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
                        className="w-full sm:w-auto flex-shrink-0 px-3 sm:px-3 py-2 sm:py-2 text-white rounded-full sm:rounded-r-full sm:rounded-l-none font-semibold text-sm sm:text-sm transition-all duration-200 whitespace-nowrap bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_12px_40px_rgba(16,185,129,0.30)] hover:shadow-[0_18px_55px_rgba(16,185,129,0.32)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
                      >
                        Search
                      </button>
                    </div>
                  </form>
                  <div className="mt-5 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 w-full">
                    <AnimatePresence mode="wait" initial={false}>
                      {heroMode === "transport" ? (
                        <motion.div
                          key="hero-ctas-transport"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                          className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 w-full"
                        >
                          <button
                            type="button"
                            onClick={scrollToBookingFlow}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-white/[0.08] text-white/90 rounded-full ring-1 ring-white/18 hover:bg-white/[0.12] backdrop-blur-sm transition-colors"
                          >
                            How it works
                          </button>
                          <Link href="/public/properties" className="no-underline">
                            <span className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-white rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_12px_40px_rgba(16,185,129,0.28)] transition-colors">Browse stays</span>
                          </Link>
                        </motion.div>
                      ) : heroMode === "host" ? (
                        <motion.div
                          key="hero-ctas-host"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                          className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 w-full"
                        >
                          <Link href="/account/register?role=owner" className="no-underline">
                            <span className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-white rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_12px_40px_rgba(16,185,129,0.28)] transition-colors">List your property</span>
                          </Link>
                          <Link href="/public/properties" className="no-underline">
                            <span className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-white/[0.08] text-white/90 rounded-full ring-1 ring-white/18 hover:bg-white/[0.12] backdrop-blur-sm transition-colors">Browse stays</span>
                          </Link>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="hero-ctas-stays"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                          className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 w-full"
                        >
                          <Link href="/public/properties" className="no-underline">
                            <span className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-white rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_12px_40px_rgba(16,185,129,0.28)] transition-colors">Browse stays</span>
                          </Link>
                          <Link href="/account/register?role=owner" className="no-underline">
                            <span className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 bg-white/[0.08] text-white/90 rounded-full ring-1 ring-white/18 hover:bg-white/[0.12] backdrop-blur-sm transition-colors">List your property</span>
                          </Link>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            </div>
        </div>

        {/* Decorative separator marking end of hero */}
        <div className="relative z-10">
          <div className="public-container pb-8 lg:pb-12">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" aria-hidden />
          </div>
        </div>
            </section>
          </div>
        </div>
      </div>

      <section id="public-audience" className="py-10 sm:py-12 lg:py-16">
        <div className="public-container">
          <SectionHeading
            title="Built for"
            variant="eyebrow"
            subtitle="Travelers, drivers, and property owners — connected by verified listings, clear policies, and dependable support."
            className="mb-8"
          />
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8 min-[420px]:gap-y-10 sm:gap-x-6 sm:gap-y-10 md:gap-y-8 mb-6 sm:mb-8">
            <div
              onClick={() => router.push('/public/properties')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/public/properties'); }}
              role="link"
              tabIndex={0}
              aria-label="Travelers - Browse stays"
              className="group relative min-w-0 h-full cursor-pointer rounded-[26px] p-[1px] bg-gradient-to-br from-white/25 via-emerald-400/12 to-teal-400/18 shadow-[0_14px_40px_rgba(15,23,42,0.10)] sm:shadow-[0_22px_60px_rgba(15,23,42,0.12)] transition-all duration-300 sm:hover:shadow-[0_30px_80px_rgba(15,23,42,0.16)] sm:hover:scale-[1.01]"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.1s both' }}
            >
              <div className="relative flex h-full flex-col overflow-hidden rounded-[25px] bg-gradient-to-b from-[#062a58] via-[#031f45] to-[#021735] p-3 min-[420px]:p-4 sm:p-6 md:p-7 ring-1 ring-white/10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(16,185,129,0.16),transparent_60%)]" aria-hidden />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_82%,rgba(20,184,166,0.12),transparent_58%)]" aria-hidden />
                <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.10)_1px,transparent_0)] [background-size:28px_28px]" aria-hidden />

                <div className="inline-flex self-start max-w-full items-center px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] sm:text-sm font-semibold ring-1 ring-emerald-300/15 truncate">Travelers</div>
                <h3 className="mt-4 sm:mt-6 text-lg sm:text-2xl lg:text-3xl font-semibold text-white tracking-tight font-mono leading-tight break-words">
                  Trusted stays, simpler booking.
                </h3>

                <div
                  onPointerEnter={() => setHoveredCard(0)}
                  onPointerLeave={() => setHoveredCard(null)}
                  onFocus={() => setHoveredCard(0)}
                  onBlur={() => setHoveredCard(null)}
                  onTouchStart={() => setHoveredCard(0)}
                  onTouchEnd={() => setHoveredCard(null)}
                  className="mt-3 sm:mt-4"
                >
                  <p className="text-xs sm:text-sm md:text-base text-slate-200/70 leading-relaxed">
                    One platform for accommodation + transport + tourism, So a trip like Serengeti comes together in one booking and one checkout, with verified options and flexible payments.
                  </p>
                </div>

                <div className="mt-auto pt-5 sm:pt-7 flex flex-col gap-2 text-xs sm:text-sm text-slate-200/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-4 h-4 opacity-80" aria-hidden />
                    <span className="min-w-0 truncate">One checkout</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Eye className="w-4 h-4 opacity-80" aria-hidden />
                    <span className="min-w-0 truncate">Verified listings</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              onClick={() => router.push('/account/register?role=driver')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/account/register?role=driver'); }}
              role="link"
              tabIndex={0}
              aria-label="Drivers - Register as a driver"
              className="group relative min-w-0 h-full cursor-pointer rounded-[26px] p-[1px] bg-gradient-to-br from-white/25 via-sky-400/12 to-cyan-400/18 shadow-[0_14px_40px_rgba(15,23,42,0.10)] sm:shadow-[0_22px_60px_rgba(15,23,42,0.12)] transition-all duration-300 sm:hover:shadow-[0_30px_80px_rgba(15,23,42,0.16)] sm:hover:scale-[1.01]"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.2s both' }}
            >
              <div className="relative flex h-full flex-col overflow-hidden rounded-[25px] bg-gradient-to-b from-[#062a58] via-[#031f45] to-[#021735] p-3 min-[420px]:p-4 sm:p-6 md:p-7 ring-1 ring-white/10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(56,189,248,0.16),transparent_60%)]" aria-hidden />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_82%,rgba(34,211,238,0.12),transparent_58%)]" aria-hidden />
                <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.10)_1px,transparent_0)] [background-size:28px_28px]" aria-hidden />

                <div className="inline-flex self-start max-w-full items-center px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-sky-500/20 text-sky-200 text-[11px] sm:text-sm font-semibold ring-1 ring-sky-300/15 truncate">Drivers</div>
                <h3 className="mt-4 sm:mt-6 text-lg sm:text-2xl lg:text-3xl font-semibold text-white tracking-tight font-mono leading-tight break-words">
                  Get more rides, earn reliably.
                </h3>

                <div
                  onPointerEnter={() => setHoveredCard(1)}
                  onPointerLeave={() => setHoveredCard(null)}
                  onFocus={() => setHoveredCard(1)}
                  onBlur={() => setHoveredCard(null)}
                  onTouchStart={() => setHoveredCard(1)}
                  onTouchEnd={() => setHoveredCard(null)}
                  className="mt-3 sm:mt-4"
                >
                  <p className="text-xs sm:text-sm md:text-base text-slate-200/70 leading-relaxed">
                    Join NoLSAF to access more rides (Auction style), receive fast payouts, and grow your earnings with reliable booking flows and driver tools.
                  </p>
                </div>

                <div className="mt-auto pt-5 sm:pt-7 flex flex-col gap-2 text-xs sm:text-sm text-slate-200/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-4 h-4 opacity-80" aria-hidden />
                    <span className="min-w-0 truncate">Quick onboarding</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Eye className="w-4 h-4 opacity-80" aria-hidden />
                    <span className="min-w-0 truncate">Driver Dashboard</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              onClick={() => router.push('/account/register?role=owner')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/account/register?role=owner'); }}
              role="link"
              tabIndex={0}
              aria-label="Property Owners - List your property"
              className="group relative min-w-0 col-span-1 min-[420px]:col-span-2 md:col-span-1 h-full sm:mt-2 md:mt-0 cursor-pointer rounded-[26px] p-[1px] bg-gradient-to-br from-white/25 via-violet-400/12 to-fuchsia-400/18 shadow-[0_14px_40px_rgba(15,23,42,0.10)] sm:shadow-[0_22px_60px_rgba(15,23,42,0.12)] transition-all duration-300 sm:hover:shadow-[0_30px_80px_rgba(15,23,42,0.16)] sm:hover:scale-[1.01]"
              style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}
            >
              <div className="relative flex h-full flex-col overflow-hidden rounded-[25px] bg-gradient-to-b from-[#062a58] via-[#031f45] to-[#021735] p-3 min-[420px]:p-4 sm:p-6 md:p-7 ring-1 ring-white/10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_18%,rgba(167,139,250,0.16),transparent_60%)]" aria-hidden />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_82%,rgba(232,121,249,0.12),transparent_58%)]" aria-hidden />
                <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.10)_1px,transparent_0)] [background-size:28px_28px]" aria-hidden />

                <div className="inline-flex self-start max-w-full items-center px-3 py-1 sm:px-4 sm:py-1.5 rounded-full bg-violet-500/20 text-violet-200 text-[11px] sm:text-sm font-semibold ring-1 ring-violet-300/15 truncate">Property Owners</div>
                <h3 className="mt-4 sm:mt-6 text-lg sm:text-2xl lg:text-3xl font-semibold text-white tracking-tight font-mono leading-tight break-words">
                  Grow bookings with less work.
                </h3>

                <div
                  onPointerEnter={() => setHoveredCard(2)}
                  onPointerLeave={() => setHoveredCard(null)}
                  onFocus={() => setHoveredCard(2)}
                  onBlur={() => setHoveredCard(null)}
                  onTouchStart={() => setHoveredCard(2)}
                  onTouchEnd={() => setHoveredCard(null)}
                  className="mt-3 sm:mt-4"
                >
                  <p className="text-xs sm:text-sm md:text-base text-slate-200/70 leading-relaxed">
                    List your property to reach travelers across world. Manage bookings, set availability, and get paid fast through local payment integrations.
                  </p>
                </div>

                <div className="mt-auto pt-5 sm:pt-7 flex flex-col gap-2 text-xs sm:text-sm text-slate-200/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-4 h-4 opacity-80" aria-hidden />
                    <span className="min-w-0 truncate">Fast onboarding</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Eye className="w-4 h-4 opacity-80" aria-hidden />
                    <span className="min-w-0 truncate">Owner dashboard</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-14 sm:mt-16">
            <div className="rounded-[28px] p-[1px] bg-gradient-to-r from-slate-200/70 via-[#02b4f5]/18 to-slate-200/70 shadow-[0_18px_55px_rgba(2,6,23,0.08)]">
              <div className="rounded-[27px] bg-white/70 backdrop-blur-xl ring-1 ring-white/70 px-5 py-7 sm:px-8 sm:py-9">
                <SectionHeading
                  title="Explore"
                  kicker="Start exploring"
                  variant="center"
                  subtitle="Browse by property type, compare verified options, and move from discovery to booking in minutes."
                  className="mt-0"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 lg:gap-6 mt-6">
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
                    hideCaption
                  topLeftBadge={
                    <AttentionBlink active={blinkCounts}>
                      <span
                        className={[
                          "inline-flex items-center gap-2 rounded-full px-2.5 py-1",
                          "bg-white/70 backdrop-blur-md",
                          "border border-white/70 ring-1 ring-slate-200/60",
                          "shadow-sm",
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
                    <span className="inline-flex items-center rounded-full px-2.5 py-1 bg-gradient-to-r from-[#02665e]/95 via-emerald-600/90 to-teal-500/85 text-white text-xs font-semibold ring-1 ring-white/25 shadow-[0_10px_20px_rgba(2,102,94,0.20)] backdrop-blur-md">
                      {c.title}
                    </span>
                  }
                />
              );
            })}
          </div>

          <div className="mt-10">
            <SectionHeading
              title="Featured Destinations"
              variant="split"
              subtitle="Cities with strong availability — designed for fast filtering and confident booking."
              className="mt-0"
            />

            <div
              className="mt-6"
              onMouseEnter={() => setFeaturedSlidePaused(true)}
              onMouseLeave={() => setFeaturedSlidePaused(false)}
              onFocus={() => setFeaturedSlidePaused(true)}
              onBlur={() => setFeaturedSlidePaused(false)}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`featured-slide-${featuredSlide}`}
                  initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -10 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.55, ease: "easeOut" }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
                >
                  {(featuredDestinationSlides[featuredSlide] || featuredDestinationSlides[0] || []).map((d, idx) => {
                    const href = `/public/properties?city=${encodeURIComponent(d.city)}&page=1`;
                    const total = featuredCityCounts[d.city];
                    const accent =
                      idx % 3 === 0
                        ? "from-[#02b4f5]/18 via-white/8 to-[#02665e]/20"
                        : idx % 3 === 1
                          ? "from-[#02665e]/20 via-white/8 to-[#02b4f5]/16"
                          : "from-white/14 via-[#02b4f5]/12 to-[#02665e]/18";

                    return (
                      <Link
                        key={`${d.city}-${idx}`}
                        href={href}
                        className={[
                          "group/card relative rounded-[28px] p-[1px] no-underline",
                          `bg-gradient-to-br ${accent}`,
                          "shadow-[0_18px_55px_rgba(2,6,23,0.10)] ring-1 ring-white/30",
                          "transition-all duration-300",
                          "hover:shadow-[0_28px_80px_rgba(2,6,23,0.14)] hover:scale-[1.01]",
                        ].join(" ")}
                        aria-label={`View ${d.city}`}
                      >
                        <div className="relative h-64 overflow-hidden rounded-[27px] bg-gradient-to-b from-[#051b36] via-[#03152c] to-[#020b18] ring-1 ring-white/10">
                          <div
                            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(2,180,245,0.18),transparent_56%),radial-gradient(circle_at_88%_82%,rgba(2,102,94,0.16),transparent_60%)]"
                            aria-hidden
                          />
                          <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#02b4f5]/18 blur-3xl" aria-hidden />

                          {/* Right-side cyan arcs */}
                          <div className="pointer-events-none absolute right-[-40px] top-[-10px] h-[120%] w-[180px] opacity-90" aria-hidden>
                            <svg viewBox="0 0 220 280" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M210 22C160 54 128 106 112 160c-16 56-16 92 10 112" stroke="#02b4f5" strokeWidth="10" strokeLinecap="round" opacity="0.85" />
                              <path d="M210 62c-44 32-70 74-84 120-14 48-10 78 14 96" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
                              <path d="M210 100c-34 26-54 58-64 94-10 36-6 60 16 74" stroke="#02665e" strokeWidth="8" strokeLinecap="round" opacity="0.55" />
                            </svg>
                          </div>

                          <div className="relative z-10 flex h-full flex-col justify-between p-6">
                            <div className="flex items-center justify-between gap-3">
                              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1.5 text-white/90 text-xs font-semibold">
                                {d.country}
                              </div>
                              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1.5 text-white/90 text-xs font-semibold">
                                {featuredCitiesLoading ? (
                                  <span className="inline-block h-3 w-10 rounded bg-white/20 animate-pulse" aria-hidden />
                                ) : (
                                  <span className="tabular-nums">{typeof total === "number" ? total.toLocaleString() : "—"}</span>
                                )}
                                <span className="text-white/75 font-medium">stays</span>
                              </div>
                            </div>

                            <div>
                              <div className="text-white font-bold text-2xl tracking-tight leading-tight">
                                {d.city}
                              </div>
                              <div className="mt-2 text-white/75 text-sm leading-relaxed max-w-[40ch]">
                                {d.tagline}
                              </div>

                              <div className="mt-4 flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1.5 text-white/85 text-xs font-semibold">
                                  Verified listings
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-end">
                              <span className="inline-flex items-center rounded-full bg-white/12 border border-white/30 backdrop-blur-md p-2.5 text-white/95 shadow-[0_12px_28px_rgba(2,6,23,0.22)] transition-all duration-300 group-hover/card:bg-white/16 group-hover/card:border-white/40" aria-hidden>
                                <ChevronRight className="h-4 w-4" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-12">
            <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 ring-1 ring-white/10 shadow-[0_22px_70px_rgba(2,6,23,0.22)]">
              {/* cyan/emerald glow wash */}
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_40%,rgba(2,180,245,0.22),transparent_55%),radial-gradient(circle_at_82%_68%,rgba(2,102,94,0.16),transparent_58%)]"
                aria-hidden
              />
              {/* portal + wave streams */}
              <div className="pointer-events-none absolute inset-0 opacity-95" aria-hidden>
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 520" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="csWave" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="rgba(2,180,245,0.70)" />
                      <stop offset="0.55" stopColor="rgba(2,180,245,0.28)" />
                      <stop offset="1" stopColor="rgba(2,102,94,0.18)" />
                    </linearGradient>
                    <linearGradient id="csWave2" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0" stopColor="rgba(255,255,255,0.20)" />
                      <stop offset="0.6" stopColor="rgba(2,180,245,0.14)" />
                      <stop offset="1" stopColor="rgba(255,255,255,0.06)" />
                    </linearGradient>
                    <radialGradient id="csPortal" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(88 260) rotate(90) scale(240)">
                      <stop offset="0" stopColor="rgba(2,180,245,0.50)" />
                      <stop offset="0.45" stopColor="rgba(2,180,245,0.22)" />
                      <stop offset="1" stopColor="rgba(2,180,245,0.0)" />
                    </radialGradient>
                    <filter id="csGlow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="1.4" />
                    </filter>
                  </defs>

                  {/* portal bloom */}
                  <circle cx="88" cy="260" r="240" fill="url(#csPortal)" opacity="0.95" />

                  {/* portal rings */}
                  <g fill="none" stroke="rgba(2,180,245,0.22)" strokeWidth="2" opacity="0.85">
                    <circle cx="88" cy="260" r="120" />
                    <circle cx="88" cy="260" r="170" />
                    <circle cx="88" cy="260" r="215" />
                  </g>
                  <g fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="2" opacity="0.75">
                    <path d="M12 260 C 32 250, 54 250, 74 260" />
                    <path d="M18 260 C 38 270, 58 270, 78 260" />
                  </g>

                  {/* wave lines */}
                  <g fill="none" strokeLinecap="round" filter="url(#csGlow)">
                    <path d="M120 240 C 260 160, 420 170, 560 240 C 690 306, 840 312, 1040 250" stroke="url(#csWave)" strokeWidth="2.6" opacity="0.95" />
                    <path d="M120 268 C 280 210, 420 210, 600 268 C 740 312, 900 320, 1120 292" stroke="url(#csWave2)" strokeWidth="1.8" opacity="0.9" />
                    <path d="M120 308 C 270 360, 430 356, 620 302 C 770 260, 920 258, 1120 314" stroke="url(#csWave)" strokeWidth="2.1" opacity="0.65" />
                    <path d="M120 212 C 280 110, 470 120, 660 206 C 790 266, 940 270, 1120 196" stroke="url(#csWave2)" strokeWidth="1.6" opacity="0.55" />
                  </g>

                  {/* particles */}
                  <g opacity="0.75">
                    {[
                      [420, 210, 3],
                      [470, 252, 2.5],
                      [520, 232, 2.2],
                      [580, 272, 2.8],
                      [640, 246, 2.2],
                      [700, 288, 2.6],
                      [760, 266, 2.2],
                      [820, 302, 2.8],
                      [880, 280, 2.4],
                      [940, 312, 2.8],
                      [1010, 286, 2.4],
                    ].map(([x, y, r], i) => (
                      <g key={i}>
                        <circle cx={x} cy={y} r={r as number} fill="rgba(2,180,245,0.85)" />
                        <circle cx={x} cy={y} r={(r as number) * 4} fill="rgba(2,180,245,0.10)" />
                      </g>
                    ))}
                  </g>
                </svg>
              </div>

              {/* very subtle grid */}
              <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:46px_46px]" aria-hidden />
              <div className="relative p-6 sm:p-8 lg:p-10">
                <SectionHeading
                  title="Connected Services"
                  variant="eyebrow"
                  subtitle="An end‑to‑end travel flow — stays, transport, and experiences coordinated around your booking."
                  tone="dark"
                  className="mt-0"
                />

                <div className="relative mt-6">
                  {/* wiring overlay (connectivity cue) */}
                  <svg
                    className="pointer-events-none absolute inset-0 hidden lg:block"
                    viewBox="0 0 1000 520"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <defs>
                      <linearGradient id="wireMain" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0" stopColor="rgba(255,255,255,0.10)" />
                        <stop offset="0.55" stopColor="rgba(2,180,245,0.26)" />
                        <stop offset="1" stopColor="rgba(16,185,129,0.22)" />
                      </linearGradient>
                      <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2.2" result="blur" />
                        <feColorMatrix
                          in="blur"
                          type="matrix"
                          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.65 0"
                          result="glow"
                        />
                        <feMerge>
                          <feMergeNode in="glow" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Left story -> top card */}
                    <path
                      d="M 520 168 C 585 168, 600 120, 642 120 C 705 120, 742 140, 760 154"
                      fill="none"
                      stroke="url(#wireMain)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      opacity="0.9"
                      filter="url(#wireGlow)"
                    />
                    <path
                      d="M 520 168 C 585 168, 600 120, 642 120 C 705 120, 742 140, 760 154"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="6.5"
                      strokeLinecap="round"
                      opacity="0.55"
                    />

                    {/* Left story -> bottom card */}
                    <path
                      d="M 520 300 C 585 300, 608 352, 650 362 C 712 376, 736 360, 760 346"
                      fill="none"
                      stroke="url(#wireMain)"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      opacity="0.9"
                      filter="url(#wireGlow)"
                    />
                    <path
                      d="M 520 300 C 585 300, 608 352, 650 362 C 712 376, 736 360, 760 346"
                      fill="none"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="6.5"
                      strokeLinecap="round"
                      opacity="0.55"
                    />

                    {/* vertical wire between the two right cards */}
                    <path
                      d="M 924 178 C 910 218, 910 268, 924 308"
                      fill="none"
                      stroke="rgba(255,255,255,0.10)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                    <path
                      d="M 924 178 C 910 218, 910 268, 924 308"
                      fill="none"
                      stroke="rgba(2,180,245,0.16)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      opacity="0.45"
                    />

                    {/* nodes */}
                    {[ [520,168], [520,300], [760,154], [760,346], [924,178], [924,308] ].map(([cx, cy], i) => (
                      <g key={i}>
                        <circle cx={cx} cy={cy} r={4} fill="rgba(255,255,255,0.22)" />
                        <circle cx={cx} cy={cy} r={2.2} fill="rgba(2,180,245,0.75)" />
                        <circle cx={cx} cy={cy} r={12} fill="rgba(2,180,245,0.09)" />
                      </g>
                    ))}
                  </svg>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
              {/* Story (left on desktop, vertically centered vs the two cards) */}
              <div className="lg:flex lg:items-center">
                <div className="relative w-full rounded-[28px] p-[1px] bg-gradient-to-br from-white/30 via-sky-400/10 to-emerald-500/12 shadow-[0_18px_55px_rgba(2,6,23,0.10)] ring-1 ring-white/40">
                  <div className="relative h-full overflow-hidden rounded-[27px] bg-gradient-to-b from-[#062a58] via-[#031f45] to-[#021735] ring-1 ring-white/10 p-6">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(2,180,245,0.14),transparent_55%),radial-gradient(circle_at_88%_86%,rgba(2,102,94,0.12),transparent_58%)]" aria-hidden />
                    <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.10)_1px,transparent_0)] [background-size:28px_28px]" aria-hidden />

                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1.5 text-white/90 text-xs font-semibold">
                        <Sparkles className="h-4 w-4 opacity-90" aria-hidden />
                        End-to-end travel platform
                      </div>

                      <div className="mt-4 text-white font-semibold text-2xl tracking-tight leading-tight">
                        From booking to pickup — all connected.
                      </div>
                      <div className="mt-2 text-white/75 text-sm leading-relaxed max-w-[56ch]">
                        Book verified stays, coordinate transport to the property you booked, and connect solo travelers to authentic local experiences — in one flow.
                      </div>

                      {/* Simple illustration: connected nodes */}
                      <div className="mt-6 relative">
                        <div className="pointer-events-none absolute left-3 right-3 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" aria-hidden />
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            { label: "Stays", Icon: Home },
                            { label: "Group Stays", Icon: Gavel },
                            { label: "Transport", Icon: Car },
                            { label: "Local guides", Icon: Users },
                            { label: "Support", Icon: LifeBuoy },
                          ].map(({ label, Icon }) => (
                            <span
                              key={label}
                              className="relative inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-3 py-1.5 text-white/85 text-xs font-semibold backdrop-blur-md"
                            >
                              <Icon className="h-4 w-4 opacity-85" aria-hidden />
                              {label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <Link
                          href="/public/group-stays"
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/12 border border-white/30 backdrop-blur-md px-4 py-2 text-white/95 text-sm font-semibold shadow-[0_12px_28px_rgba(2,6,23,0.22)] transition-all duration-300 hover:bg-white/16 hover:border-white/40 no-underline hover:no-underline"
                        >
                          Explore Group Stays
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                        <Link
                          href="/public/plan-with-us"
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/6 ring-1 ring-white/12 px-4 py-2 text-white/85 text-sm font-semibold transition-all duration-300 hover:bg-white/10 no-underline hover:no-underline"
                        >
                          Plan with us
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards (right column, stacked) */}
              <div className="grid grid-cols-1 gap-6">
                {/* Card 1 (top) */}
                <Link
                  href="/public/group-stays"
                  onMouseEnter={() => setConnectedServicesPaused(true)}
                  onMouseLeave={() => setConnectedServicesPaused(false)}
                  onFocus={() => setConnectedServicesPaused(true)}
                  onBlur={() => setConnectedServicesPaused(false)}
                  className={[
                    "group relative block rounded-[28px] p-[1px] no-underline",
                    "bg-gradient-to-br from-white/45 via-sky-400/16 to-emerald-500/14",
                    "shadow-[0_20px_70px_rgba(2,6,23,0.16)] ring-1 ring-white/45",
                    "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_32px_110px_rgba(2,6,23,0.22)] hover:scale-[1.012]",
                  ].join(" ")}
                  aria-label="Explore Group Stays"
                >
                  <div className="relative overflow-hidden rounded-[27px] bg-white/65 backdrop-blur-2xl ring-1 ring-white/55">
                    <div
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(2,102,94,0.14),transparent_58%),radial-gradient(circle_at_92%_78%,rgba(2,180,245,0.16),transparent_60%)]"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(2,102,94,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(2,180,245,0.08)_1px,transparent_1px)] [background-size:28px_28px]"
                      aria-hidden
                    />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/65 to-transparent" aria-hidden />
                    <div className="pointer-events-none absolute -left-28 top-0 h-full w-28 rotate-12 bg-white/55 blur-xl opacity-0 transition-all duration-700 group-hover:opacity-60 group-hover:translate-x-[520px]" aria-hidden />

                    <div className="relative z-10 p-6">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={groupStaySlides[groupStaySlide]?.key}
                          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12, scale: prefersReducedMotion ? 1 : 0.985 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -12, scale: prefersReducedMotion ? 1 : 0.99 }}
                          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28, mass: 0.9 }}
                        >
                          {(() => {
                            const s = groupStaySlides[groupStaySlide] || groupStaySlides[0];
                            const Icon = s.Icon;
                            return (
                              <>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#02665e]/10 ring-1 ring-[#02665e]/22 shadow-[0_18px_45px_rgba(2,6,23,0.12)] transition-transform duration-300 group-hover:scale-[1.04] group-hover:rotate-[3deg]">
                                      <Icon className="h-5 w-5 text-[#02665e]" aria-hidden />
                                    </span>
                                    <div>
                                      <div className="inline-flex items-center gap-2 rounded-full bg-[#02665e]/10 ring-1 ring-[#02665e]/20 px-3 py-1.5 text-[#02665e] text-xs font-semibold">
                                        {s.pill}
                                      </div>
                                      <div className="mt-3 text-[#02665e] font-bold text-xl tracking-tight leading-tight">
                                        {s.title}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="hidden sm:flex items-center gap-2 text-[#02665e]/70 text-xs font-semibold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#02b4f5]/80" aria-hidden />
                                    <span className="tabular-nums">{groupStaySlide + 1}</span>
                                    <span className="text-[#02665e]/40">/</span>
                                    <span className="tabular-nums">{groupStaySlides.length}</span>
                                  </div>
                                </div>

                                <div className="mt-3 text-[#02665e]/80 text-sm leading-relaxed">{s.body}</div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  {s.chips.slice(0, 2).map((c) => (
                                    <span
                                      key={c}
                                      className="inline-flex items-center rounded-full bg-[#02665e]/8 ring-1 ring-[#02665e]/20 px-3 py-1.5 text-[#02665e]/90 text-xs font-semibold"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </motion.div>
                      </AnimatePresence>

                      <div className="mt-6 flex items-center justify-end">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#02665e]/10 border border-[#02665e]/25 backdrop-blur-md px-4 py-2 text-[#02665e] text-sm font-semibold shadow-[0_12px_28px_rgba(2,6,23,0.14)] transition-all duration-300 group-hover:bg-[#02665e]/14 group-hover:border-[#02665e]/35">
                          Start a Group Stay
                          <ChevronRight className="h-4 w-4 text-[#02665e]" aria-hidden />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>

                {/* Card 2 (bottom) */}
                <div
                  className="group relative rounded-[28px] p-[1px] bg-gradient-to-br from-white/45 via-emerald-500/12 to-sky-400/16 shadow-[0_20px_70px_rgba(2,6,23,0.16)] ring-1 ring-white/45 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_32px_110px_rgba(2,6,23,0.22)] hover:scale-[1.012]"
                  onMouseEnter={() => setConnectedServicesPaused(true)}
                  onMouseLeave={() => setConnectedServicesPaused(false)}
                  onFocus={() => setConnectedServicesPaused(true)}
                  onBlur={() => setConnectedServicesPaused(false)}
                >
                  <div className="relative overflow-hidden rounded-[27px] bg-white/65 backdrop-blur-2xl ring-1 ring-white/55">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(2,180,245,0.16),transparent_58%),radial-gradient(circle_at_82%_78%,rgba(2,102,94,0.10),transparent_60%)]" aria-hidden />
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/65 to-transparent" aria-hidden />
                    <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,rgba(2,180,245,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(2,102,94,0.08)_1px,transparent_1px)] [background-size:30px_30px]" aria-hidden />
                    <div className="pointer-events-none absolute -left-28 top-0 h-full w-28 rotate-12 bg-white/55 blur-xl opacity-0 transition-all duration-700 group-hover:opacity-60 group-hover:translate-x-[520px]" aria-hidden />

                    <div className="relative z-10 p-6">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={connectedSlides[connectedSlide]?.key}
                          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12, scale: prefersReducedMotion ? 1 : 0.985 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -12, scale: prefersReducedMotion ? 1 : 0.99 }}
                          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 28, mass: 0.9 }}
                        >
                          {(() => {
                            const s = connectedSlides[connectedSlide] || connectedSlides[0];
                            const Icon = s.Icon;
                            return (
                              <>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#02b4f5]/12 ring-1 ring-[#02b4f5]/25 shadow-[0_18px_45px_rgba(2,6,23,0.10)] transition-transform duration-300 group-hover:scale-[1.04] group-hover:rotate-[-3deg]">
                                      <Icon className="h-5 w-5 text-[#02665e]" aria-hidden />
                                    </span>
                                    <div>
                                      <div className="inline-flex items-center gap-2 rounded-full bg-[#02b4f5]/12 ring-1 ring-[#02b4f5]/25 px-3 py-1.5 text-[#02665e] text-xs font-semibold">
                                        {s.pill}
                                      </div>
                                      <div className="mt-3 text-[#02665e] font-bold text-2xl tracking-tight leading-tight">
                                        {s.title}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="hidden sm:flex items-center gap-2 text-[#02665e]/70 text-xs font-semibold">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#02665e]/80" aria-hidden />
                                    <span className="tabular-nums">{connectedSlide + 1}</span>
                                    <span className="text-[#02665e]/40">/</span>
                                    <span className="tabular-nums">{connectedSlides.length}</span>
                                  </div>
                                </div>

                                <div className="mt-3 text-[#02665e]/80 text-sm leading-relaxed max-w-[72ch]">{s.body}</div>

                                <div className="mt-4 flex flex-wrap gap-2">
                                  {s.chips.slice(0, 2).map((c) => (
                                    <span
                                      key={c}
                                      className="inline-flex items-center rounded-full bg-[#02b4f5]/10 ring-1 ring-[#02b4f5]/25 px-3 py-1.5 text-[#02665e]/90 text-xs font-semibold"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </motion.div>
                      </AnimatePresence>

                      <div className="mt-6 flex flex-wrap items-center gap-3 justify-end">
                        <Link
                          href="/public/properties?page=1"
                          className="no-underline hover:no-underline inline-flex items-center gap-1.5 rounded-full bg-[#02665e]/10 border border-[#02665e]/25 backdrop-blur-md px-4 py-2 text-[#02665e] text-sm font-semibold shadow-[0_12px_28px_rgba(2,6,23,0.12)] transition-all duration-300 hover:bg-[#02665e]/14 hover:border-[#02665e]/35"
                        >
                          Browse stays
                          <ChevronRight className="h-4 w-4 text-[#02665e]" aria-hidden />
                        </Link>
                        <Link
                          href="#booking-flow"
                          className="no-underline hover:no-underline inline-flex items-center gap-1.5 rounded-full bg-[#02665e]/6 ring-1 ring-[#02665e]/18 px-4 py-2 text-[#02665e]/90 text-sm font-semibold transition-all duration-300 hover:bg-[#02665e]/10"
                        >
                          Booking flow
                          <ChevronRight className="h-4 w-4 text-[#02665e]" aria-hidden />
                        </Link>
                        <Link
                          href="/cancellation-policy"
                          className="no-underline hover:no-underline inline-flex items-center gap-1.5 rounded-full bg-[#02665e]/6 ring-1 ring-[#02665e]/18 px-4 py-2 text-[#02665e]/90 text-sm font-semibold transition-all duration-300 hover:bg-[#02665e]/10"
                        >
                          Policy
                          <ChevronRight className="h-4 w-4 text-[#02665e]" aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

          <div className="mt-12">
            <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/70 backdrop-blur-xl ring-1 ring-slate-200/70 shadow-[0_18px_55px_rgba(2,6,23,0.08)]">
              <div
                className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_16%_18%,rgba(2,180,245,0.16),transparent_50%),radial-gradient(circle_at_86%_82%,rgba(2,102,94,0.12),transparent_52%)]"
                aria-hidden
              />
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-55 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.78)_48%,rgba(255,255,255,0.30)_52%,transparent_100%)]"
                aria-hidden
              />
              <div className="relative px-5 py-5 sm:px-6">
                <SectionHeading
                  title="Explore Tourism by Country"
                  variant="compact"
                  subtitle="Choose a country to see major and minor tourist sites — then book verified stays and coordinate transport in one flow."
                  className="mt-0"
                />
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              style={{ contain: 'layout style' }}
            >
              {orderedCountries.map((c) => (
                <CountryCard key={c.id} id={c.id} name={c.name} flag={c.flag} subtitle={c.subtitle} blurb={c.blurb} href={c.href} stats={c.stats} variant="compact" accentClass={c.accentClass} />
              ))}
            </div>
          </div>


          

          {/* Booking flow card: explain booking steps and allow driver options */}
          <div id="booking-flow" className="mt-12">
            <BookingFlowCard />
          </div>

          <SectionHeading
            title="Our story"
            variant="eyebrow"
            subtitle="How NoLSAF was built — and the standards we hold ourselves to."
            className="mt-12"
          />
          <FounderStory />

          <SectionHeading
            title="What people say"
            variant="split"
            subtitle="Feedback from travelers and operators — focused on what matters most."
            className="mt-12"
          />
          <Testimonials hideTitle />

          <SectionHeading
            title="Trusted by"
            variant="compact"
            subtitle="Organizations that trust NoLSAF for reliable bookings and operations."
            className="mt-12"
          />
          <TrustedBySectionWithData />

          <SectionHeading
            title="Latest updates"
            variant="eyebrow"
            subtitle="New features and improvements — shipping steadily."
            className="mt-12"
          />
          <LatestUpdate hideTitle />
        </div>
      </section>
    </main>
  );
}
