"use client";

import Link from "next/link";
import NextImage from "next/image";
import React from "react";
import {
  User,
  ChevronRight,
  X,
  Calendar,
  Search,
  Eye,
  Sparkles,
  Gavel,
  Home,
  Car,
  Users,
  CreditCard,
  LifeBuoy,
  BedDouble,
  PlayCircle,
  Plus,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, FormEvent, useMemo } from "react";
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import AttentionBlink from '../../components/AttentionBlink';
import CountryCard from '../../components/CountryCard';
import BookingFlowCard from '../../components/BookingFlowCard';
import FounderStory from '../../components/FounderStory';
import Testimonials from '../../components/Testimonials';
import LatestUpdate from '../../components/LatestUpdate';
import TrustedBySection from '../../components/TrustedBySection';
import LayoutFrame from '../../components/LayoutFrame';
import axios from 'axios';
import DatePicker from '../../components/ui/DatePicker';

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

function _SectionHeading({
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
  const [_heroPointerActive, setHeroPointerActive] = useState(false);
  const [_heroPressed, setHeroPressed] = useState(false);

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
          tagline: "Gateway to parks lodges, villas, and adventure trips.",
        },
        {
          city: "Mwanza",
          country: "Tanzania",
          tagline: "Lake views, local hospitality, and weekend retreats.",
        },
        {
          city: "Dodoma",
          country: "Tanzania",
          tagline: "New capital energy apartments, hotels, and homes.",
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

  const _fmtMoney = (amount: number | null | undefined, currency?: string | null) => {
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

  // Responsive: show two months on md+ screens, single month on small screens
  const [isWideScreen, setIsWideScreen] = useState(false);
  useEffect(() => {
    const check = () => setIsWideScreen(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

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
  }, [dateOpen]);

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

    return () => {};
  }, []);

  // Countries list: stable order (no auto-rotation)
  const countryList = useMemo(
    () => [
      {
        id: 'tanzania',
        name: 'Tanzania',
        flag: '🇹🇿',
        subtitle: 'Safaris, parks & islands',
        blurb: 'From Serengeti to Zanzibar find stays near major attractions, coordinate transport, and book securely with clear terms.',
        href: '/public/countries/tanzania',
        accentClass: 'from-sky-100/75 via-white/70 to-emerald-100/55',
        stats: { cities: 12, regions: 31, listings: 1250, payments: ['M-Pesa', 'Airtel Money', 'Halopesa', 'Mixx by Yas', 'Visa'] },
      },
      {
        id: 'kenya',
        name: 'Kenya',
        flag: '🇰🇪',
        subtitle: 'Big Five & coast',
        blurb: 'Explore Maasai Mara, Amboseli, and the coast book verified stays, plan your route, and pay securely in one flow.',
        href: '/public/countries/kenya',
        accentClass: 'from-amber-100/65 via-white/70 to-emerald-100/55',
        stats: { cities: 10, listings: 980, payments: ['M-Pesa', 'Airtel Money', 'T Kash', 'Visa'] },
      },
      {
        id: 'uganda',
        name: 'Uganda',
        flag: '🇺🇬',
        subtitle: 'Gorillas, falls & lakes',
        blurb: 'From Bwindi to Murchison Falls discover lodges near top sites and coordinate stays + transport with secure booking.',
        href: '/public/countries/uganda',
        accentClass: 'from-violet-100/65 via-white/70 to-emerald-100/55',
        stats: { cities: 7, listings: 430, payments: ['MTN Mobile Money', 'Visa'] },
      },
    ],
    []
  );

  const orderedCountries = countryList;

  return (
    <main className="min-h-screen text-slate-900" style={{ background: 'linear-gradient(160deg,#f0fdf8 0%,#ffffff 45%,#f5fefb 100%)' }}>
      {/* Layout edge markers (left/right) to indicate content boundaries */}
      <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
      {/* Hero surround frame (tinted border on ALL sides) */}
      <div className="public-container">
        <div className="relative overflow-hidden rounded-[44px] sm:rounded-[60px] p-3 sm:p-4 lg:p-5"
          style={{
            background: "linear-gradient(145deg,#080e28 0%,#0a2235 45%,#012018 100%)",
            boxShadow: "0 40px 100px rgba(2,102,94,0.38),0 12px 32px rgba(8,30,80,0.55)",
          }}>
          {/* Outer ambient — dual teal+navy glow on the surround */}
          <div className="pointer-events-none absolute inset-0 rounded-[44px] sm:rounded-[60px]" style={{ background: "radial-gradient(ellipse 80% 55% at 60% 45%,rgba(2,102,94,0.30),transparent 70%)" }} aria-hidden />
          <div className="pointer-events-none absolute inset-0 rounded-[44px] sm:rounded-[60px]" style={{ background: "radial-gradient(ellipse 60% 40% at 25% 60%,rgba(8,50,120,0.22),transparent 65%)" }} aria-hidden />

          {/* Inner 1px border — teal-to-blue premium line */}
          <div className="relative rounded-[36px] sm:rounded-[52px] p-[1.5px]"
            style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.28) 0%,rgba(2,180,245,0.40) 40%,rgba(2,102,94,0.60) 75%,rgba(255,196,0,0.18) 100%)", boxShadow: "0 28px 72px rgba(0,0,0,0.55)" }}>
            <div className="pointer-events-none absolute inset-0 rounded-[36px] sm:rounded-[52px] bg-gradient-to-b from-white/10 via-white/4 to-transparent" aria-hidden />

            <section
              id="public-hero"
              className="relative overflow-hidden text-white rounded-[calc(36px-1.5px)] sm:rounded-[calc(52px-1.5px)]"
              style={{ background: "#050d20" }}
              ref={heroRef as any}
              onPointerEnter={() => setHeroPointerActive(true)}
              onPointerLeave={() => { setHeroPointerActive(false); setHeroPressed(false); }}
              onPointerMove={(e) => { if (prefersReducedMotion) return; queueHeroPointer(e.clientX, e.clientY); }}
              onPointerDown={(e) => {
                setHeroPointerActive(true); queueHeroPointer(e.clientX, e.clientY); setHeroPressed(true);
                if (heroPressTimerRef.current != null) window.clearTimeout(heroPressTimerRef.current);
                heroPressTimerRef.current = window.setTimeout(() => setHeroPressed(false), 220);
              }}
              onPointerUp={() => setHeroPressed(false)}
            >
          {/* Inner ring highlight */}
          <div className="pointer-events-none absolute inset-0 rounded-[calc(36px-1.5px)] sm:rounded-[calc(52px-1.5px)] ring-1 ring-white/12" aria-hidden />
        {/* ══════════════════════════════════════════════
             FULL-BLEED HERO BACKGROUND
        ══════════════════════════════════════════════ */}
        <div className="absolute inset-0" aria-hidden>

          {/* Layer 0 — base deep-space floor */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(155deg,#040c24 0%,#071828 40%,#041c14 72%,#020e0a 100%)" }} />

          {/* Layer 1 — HeroRings (keeps brand rings) */}
          <HeroRingsBackground mode={heroMode} variant="full" className="absolute inset-0" />

          {/* Layer 2 — rich teal+navy dual wash */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(130deg,rgba(2,102,94,0.48) 0%,rgba(5,40,90,0.38) 48%,rgba(8,20,60,0.30) 100%)" }} />

          {/* Layer 3 — left dark vignette so text pops */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to right,rgba(2,6,18,0.80) 0%,rgba(2,6,18,0.36) 48%,transparent 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom,rgba(2,6,18,0.44) 0%,transparent 38%,rgba(2,6,18,0.70) 100%)" }} />

          {/* Layer 4 — luxury warm-gold glow (top-right) — signals "quality" */}
          <div className="pointer-events-none absolute" style={{ top: "-10%", right: "-8%", width: 640, height: 580, borderRadius: "50%", background: "radial-gradient(ellipse at center,rgba(251,191,36,0.10) 0%,rgba(245,158,11,0.06) 35%,transparent 65%)", filter: "blur(48px)" }} />

          {/* Layer 5 — teal depth glow (bottom-left) — signals "accessible" */}
          <div className="pointer-events-none absolute" style={{ bottom: "-8%", left: "-4%", width: 580, height: 500, borderRadius: "50%", background: "radial-gradient(ellipse at center,rgba(2,102,94,0.32) 0%,rgba(4,60,80,0.14) 45%,transparent 68%)", filter: "blur(56px)" }} />

          {/* Layer 6 — soft blue-teal centre bloom */}
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 52% 42%,rgba(2,102,94,0.14),rgba(14,60,140,0.10) 50%,transparent 70%)" }} />

          {/* ════════════════════════════════════════════
               ARCHITECTURAL LUXURY VISUALIZATION
               Inspired by: hotel atrium floor plans,
               premium property blueprints, and skyline
               silhouettes — all teal+gold palette
          ════════════════════════════════════════════ */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 680" preserveAspectRatio="xMidYMid slice">
              <defs>
                {/* Fade mask — strong centre, dissolves at edges */}
                <radialGradient id="vis-fade" cx="62%" cy="48%" r="52%">
                  <stop offset="0%"  stopColor="white" stopOpacity="1" />
                  <stop offset="50%" stopColor="white" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </radialGradient>
                <mask id="vis-mask">
                  <rect width="1200" height="680" fill="url(#vis-fade)" />
                </mask>
                {/* Dot grid fill */}
                <pattern id="arch-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
                  <circle cx="16" cy="16" r="1.0" fill="#5eead4" fillOpacity="0.22" />
                </pattern>
                {/* Gold tint for luxury accents */}
                <linearGradient id="gold-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#fbbf24" stopOpacity="0.70" />
                  <stop offset="100%" stopColor="#02665e" stopOpacity="0.50" />
                </linearGradient>
                <linearGradient id="teal-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#02665e" stopOpacity="0.60" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.35" />
                </linearGradient>
                <linearGradient id="sky-line" x1="0%" y1="0%" x2="100%" y2="98%">
                  <stop offset="0%"   stopColor="#38bdf8" stopOpacity="0.50" />
                  <stop offset="100%" stopColor="#02665e" stopOpacity="0.30" />
                </linearGradient>
              </defs>

              <g mask="url(#vis-mask)">
                {/* ─── Dot grid base ─── */}
                <rect width="1200" height="680" fill="url(#arch-dots)" />

                {/* ─── Skyline silhouette (right side) ─── */}
                <g fill="none" stroke="#2dd4bf" strokeOpacity="0.14" strokeWidth="0.8">
                  {/* Building columns */}
                  <rect x="720" y="280" width="28" height="280" rx="2" />
                  <rect x="760" y="220" width="36" height="340" rx="2" />
                  <rect x="808" y="300" width="24" height="260" rx="2" />
                  <rect x="844" y="180" width="44" height="380" rx="2" />
                  <rect x="900" y="250" width="30" height="310" rx="2" />
                  <rect x="942" y="310" width="22" height="250" rx="2" />
                  <rect x="976" y="200" width="40" height="360" rx="2" />
                  <rect x="1028" y="260" width="26" height="300" rx="2" />
                  <rect x="1066" y="320" width="20" height="240" rx="2" />
                  <rect x="1098" y="230" width="32" height="330" rx="2" />
                  {/* Window grid lines on tallest building */}
                  {[230,260,290,320,350,380,410,440,470,500].map(y => (
                    <line key={y} x1="846" y1={y} x2="886" y2={y} strokeOpacity="0.09" />
                  ))}
                  {[854,866,878].map(x => (
                    <line key={x} x1={x} y1="182" x2={x} y2="558" strokeOpacity="0.09" />
                  ))}
                </g>

                {/* ─── Concentric luxury ellipses (atrium / grand hall feel) ─── */}
                <g fill="none">
                  <ellipse cx="860" cy="420" rx="280" ry="160" stroke="#02665e" strokeOpacity="0.18" strokeWidth="0.9" />
                  <ellipse cx="860" cy="420" rx="210" ry="118" stroke="#02665e" strokeOpacity="0.22" strokeWidth="1.0" />
                  <ellipse cx="860" cy="420" rx="145" ry="80" stroke="#2dd4bf" strokeOpacity="0.28" strokeWidth="1.1" />
                  <ellipse cx="860" cy="420" rx="85" ry="46" stroke="#2dd4bf" strokeOpacity="0.35" strokeWidth="1.2" />
                  <ellipse cx="860" cy="420" rx="40" ry="22" stroke="#fbbf24" strokeOpacity="0.30" strokeWidth="1.0" />
                </g>

                {/* ─── Floor plan grid (hotel room layout) ─── */}
                <g stroke="#38bdf8" strokeOpacity="0.10" strokeWidth="0.7" fill="none">
                  {/* Horizontal corridors */}
                  <line x1="580" y1="340" x2="1180" y2="340" />
                  <line x1="580" y1="400" x2="1180" y2="400" />
                  <line x1="580" y1="460" x2="1180" y2="460" />
                  <line x1="580" y1="520" x2="1180" y2="520" />
                  {/* Vertical room dividers */}
                  {[620,660,700,740,780].map(x => (
                    <line key={x} x1={x} y1="340" x2={x} y2="520" />
                  ))}
                </g>

                {/* ─── Property location routes ─── */}
                <g fill="none" strokeWidth="1.4" strokeDasharray="8 5">
                  <path d="M 60 560 Q 220 340 480 200" stroke="url(#teal-line)" />
                  <path d="M 480 200 Q 620 120 780 170" stroke="url(#sky-line)" />
                  <path d="M 130 600 Q 340 400 620 320" stroke="url(#teal-line)" strokeDasharray="5 7" strokeWidth="1.1" />
                  <path d="M 300 580 Q 460 360 700 260" stroke="url(#gold-line)" strokeDasharray="6 6" strokeWidth="1.0" />
                </g>

                {/* ─── Location nodes ─── */}
                <g fill="none">
                  {/* Primary — teal rings */}
                  <circle cx="480" cy="200" r="11" stroke="#2dd4bf" strokeOpacity="0.50" strokeWidth="1.4" />
                  <circle cx="480" cy="200" r="22" stroke="#2dd4bf" strokeOpacity="0.20" strokeWidth="0.9" />
                  <circle cx="780" cy="170" r="9"  stroke="#fbbf24" strokeOpacity="0.44" strokeWidth="1.3" />
                  <circle cx="780" cy="170" r="19" stroke="#fbbf24" strokeOpacity="0.16" strokeWidth="0.8" />
                  <circle cx="620" cy="320" r="8"  stroke="#38bdf8" strokeOpacity="0.42" strokeWidth="1.2" />
                  <circle cx="620" cy="320" r="17" stroke="#38bdf8" strokeOpacity="0.15" strokeWidth="0.7" />
                  {/* Secondary */}
                  <circle cx="60"  cy="560" r="6"  stroke="#5eead4" strokeOpacity="0.34" strokeWidth="1.0" />
                  <circle cx="300" cy="580" r="5"  stroke="#93c5fd" strokeOpacity="0.30" strokeWidth="1.0" />
                </g>

                {/* ─── Node fill dots ─── */}
                <g>
                  <circle cx="480" cy="200" r="4.5" fill="#2dd4bf" fillOpacity="0.92" />
                  <circle cx="780" cy="170" r="4.0" fill="#fbbf24" fillOpacity="0.85" />
                  <circle cx="620" cy="320" r="3.5" fill="#38bdf8" fillOpacity="0.82" />
                  <circle cx="60"  cy="560" r="3.0" fill="#5eead4" fillOpacity="0.70" />
                  <circle cx="300" cy="580" r="2.5" fill="#93c5fd" fillOpacity="0.65" />
                  <circle cx="130" cy="600" r="2.5" fill="#5eead4" fillOpacity="0.58" />
                </g>

                {/* ─── Gold accent star (luxury marker) at primary node ─── */}
                <g transform="translate(776,166)" fill="#fbbf24" fillOpacity="0.72">
                  <polygon points="4,0 5,3 8,3 5.5,5 6.5,8 4,6 1.5,8 2.5,5 0,3 3,3" />
                </g>
              </g>
            </svg>
          </div>

          {/* Bottom teal horizon */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
            style={{ background: "linear-gradient(to top,rgba(2,102,94,0.26) 0%,rgba(5,40,90,0.12) 50%,transparent 100%)" }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-400/40 to-transparent" />

          {/* Right-edge tick ruler */}
          <div className="pointer-events-none absolute inset-y-0 right-0" aria-hidden>
            <svg className="h-full w-8" viewBox="0 8 32 684" preserveAspectRatio="none">
              {[80,160,240,320,400,480,560,640].map((y) => (
                <line key={y} x1="28" y1={y} x2="32" y2={y} stroke="#2dd4bf" strokeOpacity="0.30" strokeWidth="1.5" />
              ))}
              <line x1="30" y1="8" x2="30" y2="692" stroke="#2dd4bf" strokeOpacity="0.07" strokeWidth="0.8" />
            </svg>
          </div>

          {/* Top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
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
                  <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.8rem] font-black tracking-[-0.045em] leading-[0.86] text-white text-balance">
                    Quality stay
                    <span
                      className="block text-transparent bg-clip-text"
                      style={{ backgroundImage: "linear-gradient(98deg,#38bdf8 0%,#0a5c82 28%,#02665e 58%,#2dd4bf 82%,#6ee7b7 100%)" }}
                    >
                      for every <em className="font-serif not-italic">wallet.</em>
                    </span>
                  </h1>

                  <p className="mx-auto mt-6 max-w-[44ch] text-[15px] text-white/48 leading-[1.75] font-light">
                    One platform for stays, transport &amp; experiences.
                    <br />
                    <span className="text-white/30 text-sm tracking-wide">Simpler · Trusted · Unforgettable</span>
                  </p>

                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}
                  className="mt-8 w-full max-w-3xl mx-auto"
                >
                <form onSubmit={submitSearch} className="w-full pointer-events-auto">
                  <div className="flex items-center gap-1.5 bg-gradient-to-b from-white/[0.16] to-white/[0.06] backdrop-blur-2xl rounded-full p-2 shadow-[0_22px_80px_rgba(0,0,0,0.42)] ring-1 ring-white/22 w-full sm:w-fit mx-auto">
                    <input
                      aria-label="Search query"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="flex-1 sm:flex-none sm:min-w-[170px] min-w-0 px-3 sm:px-4 py-2 text-sm sm:text-base rounded-l-full rounded-r-none border border-white/22 bg-white/[0.06] text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/45 focus:border-emerald-400/55"
                    />

                      <div ref={guestRef} className="flex-none w-14 sm:w-auto inline-flex items-center justify-center gap-1.5 border border-white/20 rounded-full overflow-visible px-2 py-1.5 relative bg-white/5">
                        <div className="relative inline-block">
                          <button
                            type="button"
                            aria-label="Open guest selector"
                            aria-expanded={guestOpen}
                            ref={triggerRef}
                            onClick={() => { setGuestOpen(true); }}
                            onTouchStart={() => { setGuestOpen(true); }}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-1 py-1 bg-transparent text-white text-sm"
                          >
                            <User className="w-4 h-4 text-white/90 flex-shrink-0" aria-hidden />
                            <span className="text-white whitespace-nowrap text-sm">{adults}{children ? ` + ${children}` : ''}</span>
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
                      <div ref={dateRef} className="flex-none w-12 sm:w-auto inline-flex items-center justify-center gap-1.5 relative border border-white/20 rounded-full px-2.5 py-1.5 bg-white/5">
                        <button
                          type="button"
                          aria-label="Select dates"
                          onClick={() => { setDateOpen((v) => !v); }}
                          className="w-full inline-flex items-center justify-center px-0 py-0 bg-transparent text-white border-0 text-sm"
                        >
                          <Calendar className="h-5 w-5 sm:hidden" aria-hidden />
                          <span className="hidden sm:inline truncate">
                            {checkin ? (checkout ? formatRangeShort(checkin, checkout) : formatSingleShort(checkin)) : 'Add dates'}
                          </span>
                        </button>

                        {dateOpen ? (
                          createPortal(
                            <div className="nolsaf-date-popper z-30">
                              {/* Mobile grabber */}
                              <div className="nolsaf-sheet-grabber-wrapper">
                                <div className="nolsaf-sheet-grabber" aria-hidden />
                              </div>
                              <DatePicker
                                selected={checkin && checkout ? [checkin, checkout] : checkin || undefined}
                                onSelectAction={(s) => {
                                  if (!s) { setCheckin(''); setCheckout(''); return; }
                                  if (Array.isArray(s)) {
                                    setCheckin(s[0] || '');
                                    setCheckout(s[1] || '');
                                  } else {
                                    setCheckin(s);
                                    setCheckout('');
                                  }
                                }}
                                onCloseAction={() => setDateOpen(false)}
                                allowRange
                                allowPast={false}
                                twoMonths={isWideScreen}
                              />
                            </div>,
                            document.body
                          )
                        ) : null}
                      </div>
                      <button
                        type="submit"
                        className="flex-none flex-shrink-0 flex items-center justify-center w-12 h-12 sm:w-auto sm:h-auto px-0 sm:px-3 py-0 sm:py-2 text-white rounded-r-full rounded-l-none font-semibold text-sm transition-all duration-200 whitespace-nowrap bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_12px_40px_rgba(16,185,129,0.30)] hover:shadow-[0_18px_55px_rgba(16,185,129,0.32)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
                      >
                        <Search className="h-5 w-5 sm:hidden" aria-hidden />
                        <span className="hidden sm:inline">Search</span>
                      </button>
                    </div>
                  </form>
                  <div className="mt-8 lg:mt-10 w-full">
                    <div className="flex items-center justify-center gap-2.5 w-full flex-wrap">
                      <Link href="/public/properties" aria-label="Browse stays" className="group relative no-underline flex-shrink-0">
                        <span className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-white font-medium rounded-full bg-emerald-500/90 hover:bg-emerald-400 active:bg-emerald-400 shadow-[0_8px_28px_rgba(16,185,129,0.30)] transition-all">
                          <BedDouble className="w-4 h-4 flex-shrink-0" />
                          <span className="hidden sm:inline whitespace-nowrap">Browse stays</span>
                        </span>
                        <span className="pointer-events-none sm:hidden absolute -top-9 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-2 py-1 text-xs font-medium text-white/90 rounded-full bg-white/[0.10] ring-1 ring-white/20 backdrop-blur-sm opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-active:opacity-100 group-active:translate-y-0">
                          Browse stays
                        </span>
                      </Link>
                      <Link href="/account/register?role=owner" aria-label="List your property" className="group relative no-underline flex-shrink-0">
                        <span className="inline-flex items-center gap-2 px-4 py-2.5 text-sm text-white/85 font-medium rounded-full bg-white/[0.08] ring-1 ring-white/15 hover:bg-white/[0.14] active:bg-white/[0.18] backdrop-blur-sm transition-all">
                          <Plus className="w-4 h-4 flex-shrink-0" />
                          <span className="hidden sm:inline whitespace-nowrap">List your property</span>
                        </span>
                        <span className="pointer-events-none sm:hidden absolute -top-9 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-2 py-1 text-xs font-medium text-white/90 rounded-full bg-white/[0.10] ring-1 ring-white/20 backdrop-blur-sm opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-active:opacity-100 group-active:translate-y-0">
                          List your property
                        </span>
                      </Link>
                      <button
                        type="button"
                        onClick={scrollToBookingFlow}
                        aria-label="How it works"
                        className="group relative flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 text-sm text-white/85 font-medium rounded-full bg-white/[0.08] ring-1 ring-white/15 hover:bg-white/[0.14] active:bg-white/[0.18] backdrop-blur-sm transition-all"
                      >
                        <PlayCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden sm:inline whitespace-nowrap">How it works</span>
                        <span className="pointer-events-none sm:hidden absolute -top-9 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap px-2 py-1 text-xs font-medium text-white/90 rounded-full bg-white/[0.10] ring-1 ring-white/20 backdrop-blur-sm opacity-0 translate-y-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-active:opacity-100 group-active:translate-y-0">
                          How it works
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Trust stats row */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, delay: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                    className="mt-10 flex items-center justify-center gap-6 flex-wrap"
                  >
                    {[
                      { value: "12K+", label: "Happy guests" },
                      { value: "340+", label: "Properties" },
                      { value: "4.9★", label: "Avg. rating" },
                      { value: "24/7", label: "Support" },
                    ].map(({ value, label }) => (
                      <div key={label} className="flex flex-col items-center gap-0.5">
                        <span className="text-lg font-extrabold text-white tracking-tight leading-none">{value}</span>
                        <span className="text-[11px] font-medium text-white/40 tracking-wide uppercase">{label}</span>
                      </div>
                    ))}
                  </motion.div>

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

      <section id="public-audience" className="relative py-14 sm:py-18 lg:py-24 overflow-hidden">
        {/* Premium section background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,#f0fdf8 0%,#ffffff 55%,#f0fdf4 100%)' }} />
        {/* Ambient color blooms matching the cards beneath */}
        <div aria-hidden className="pointer-events-none absolute -top-32 -left-24 w-[500px] h-[500px] rounded-full opacity-[0.07] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[380px] rounded-full opacity-[0.05] blur-[110px]"
          style={{ background: 'radial-gradient(circle, #38bdf8, transparent 70%)' }} />
        <div aria-hidden className="pointer-events-none absolute -top-28 -right-20 w-[480px] h-[480px] rounded-full opacity-[0.06] blur-[100px]"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent 70%)' }} />
        {/* Subtle dot grid */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.018]"
          style={{ backgroundImage: 'radial-gradient(circle, #64748b 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        {/* Top + bottom accent lines */}
        <div aria-hidden className="pointer-events-none absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

        <div className="public-container relative z-10">
          {/* ── Premium centered heading ── */}
          <div className="mb-12 flex flex-col items-center text-center">
            {/* Eyebrow pill */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase shadow-sm ring-1
              bg-gradient-to-r from-emerald-50 via-white to-sky-50 ring-slate-200/80 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" aria-hidden />
              Who It&apos;s For
            </div>

            {/* Main title — gradient two-tone */}
            <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none">
              <span className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Built&nbsp;</span>
              <span style={{ color: '#02665e' }}>for&nbsp;you</span>
            </h2>

            {/* Decorative rule */}
            <div className="mt-5 flex items-center gap-3 w-full max-w-xs" aria-hidden>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-200" />
              <span className="w-2 h-2 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200" />
            </div>

            {/* Subtitle */}
            <p className="mt-4 text-sm sm:text-base leading-relaxed max-w-[62ch] text-slate-500">
              Travelers, drivers, and property owners {" "}
              <span className="text-slate-700 font-medium">connected by verified listings, clear policies, and dependable support.</span>
            </p>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6 min-[420px]:gap-y-6 sm:gap-x-5 sm:gap-y-6 md:gap-y-0 mb-6 sm:mb-8">

            {/* ── Travelers ── */}
            <div
              onClick={() => router.push('/public/properties')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/public/properties'); }}
              role="link"
              tabIndex={0}
              aria-label="Travelers - Browse stays"
              className="group relative min-w-0 h-full cursor-pointer rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_28px_70px_rgba(4,120,87,0.40)]"
              style={{ boxShadow: '0 8px 32px rgba(4,120,87,0.22)' }}
            >
              {/* Rich emerald gradient fill */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #022c22 0%, #064e3b 35%, #065f46 65%, #047857 100%)' }} />
              {/* Mesh shimmer overlay */}
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
              {/* Large decorative ring top-right */}
              <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 w-56 h-56 rounded-full opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-500"
                style={{ border: '2px solid #34d399', boxShadow: 'inset 0 0 60px rgba(52,211,153,0.3)' }} />
              <div aria-hidden className="pointer-events-none absolute -top-4 -right-4 w-32 h-32 rounded-full opacity-[0.10] group-hover:opacity-[0.18] transition-opacity duration-500"
                style={{ border: '1px solid #6ee7b7' }} />
              {/* Bottom glow */}
              <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 opacity-40"
                style={{ background: 'linear-gradient(to top, rgba(16,185,129,0.25), transparent)' }} />

              <div className="relative flex h-full flex-col p-5 sm:p-6 md:p-7 min-h-[260px]">
                {/* Tag */}
                <div className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase"
                  style={{ background: 'rgba(52,211,153,0.18)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.35)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  Travelers
                </div>

                <h3 className="mt-5 text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
                  Trusted stays,<br/>simpler booking.
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(167,243,208,0.80)' }}>
                  One platform for accommodation, transport, and tourism in one smooth booking flow.
                </p>

                <div className="mt-auto pt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs" style={{ color: 'rgba(110,231,183,0.70)', borderTop: '1px solid rgba(52,211,153,0.15)' }}>
                  <span className="flex items-center gap-1.5 pt-4"><Calendar className="w-3.5 h-3.5" style={{ color: '#34d399' }} aria-hidden />One checkout</span>
                  <span className="flex items-center gap-1.5 pt-4"><Eye className="w-3.5 h-3.5" style={{ color: '#34d399' }} aria-hidden />Verified listings</span>
                </div>
              </div>
            </div>

            {/* ── Drivers ── */}
            <div
              onClick={() => router.push('/account/register?role=driver')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/account/register?role=driver'); }}
              role="link"
              tabIndex={0}
              aria-label="Drivers - Register as a driver"
              className="group relative min-w-0 h-full cursor-pointer rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_28px_70px_rgba(2,132,199,0.40)]"
              style={{ boxShadow: '0 8px 32px rgba(2,132,199,0.22)' }}
            >
              <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 35%, #075985 65%, #0369a1 100%)' }} />
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
              <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 w-56 h-56 rounded-full opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-500"
                style={{ border: '2px solid #38bdf8', boxShadow: 'inset 0 0 60px rgba(56,189,248,0.3)' }} />
              <div aria-hidden className="pointer-events-none absolute -top-4 -right-4 w-32 h-32 rounded-full opacity-[0.10] group-hover:opacity-[0.18] transition-opacity duration-500"
                style={{ border: '1px solid #7dd3fc' }} />
              <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 opacity-40"
                style={{ background: 'linear-gradient(to top, rgba(56,189,248,0.22), transparent)' }} />

              <div className="relative flex h-full flex-col p-5 sm:p-6 md:p-7 min-h-[260px]">
                <div className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase"
                  style={{ background: 'rgba(56,189,248,0.18)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.35)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
                  Drivers
                </div>

                <h3 className="mt-5 text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
                  Get more rides,<br/>earn reliably.
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(186,230,253,0.80)' }}>
                  Join NoLSAF to access more rides, reliable payouts, and practical driver tools.
                </p>

                <div className="mt-auto pt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs" style={{ color: 'rgba(125,211,252,0.70)', borderTop: '1px solid rgba(56,189,248,0.15)' }}>
                  <span className="flex items-center gap-1.5 pt-4"><Calendar className="w-3.5 h-3.5" style={{ color: '#38bdf8' }} aria-hidden />Quick onboarding</span>
                  <span className="flex items-center gap-1.5 pt-4"><Eye className="w-3.5 h-3.5" style={{ color: '#38bdf8' }} aria-hidden />Driver Dashboard</span>
                </div>
              </div>
            </div>

            {/* ── Property Owners ── */}
            <div
              onClick={() => router.push('/account/register?role=owner')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/account/register?role=owner'); }}
              role="link"
              tabIndex={0}
              aria-label="Property Owners - List your property"
              className="group relative min-w-0 col-span-1 min-[420px]:col-span-2 md:col-span-1 h-full sm:mt-0 cursor-pointer rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_28px_70px_rgba(109,40,217,0.40)]"
              style={{ boxShadow: '0 8px 32px rgba(109,40,217,0.22)' }}
            >
              <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #130828 0%, #2e1065 35%, #3b0764 65%, #4c1d95 100%)' }} />
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
              <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 w-56 h-56 rounded-full opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-500"
                style={{ border: '2px solid #a78bfa', boxShadow: 'inset 0 0 60px rgba(167,139,250,0.3)' }} />
              <div aria-hidden className="pointer-events-none absolute -top-4 -right-4 w-32 h-32 rounded-full opacity-[0.10] group-hover:opacity-[0.18] transition-opacity duration-500"
                style={{ border: '1px solid #c4b5fd' }} />
              <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 opacity-40"
                style={{ background: 'linear-gradient(to top, rgba(139,92,246,0.25), transparent)' }} />

              <div className="relative flex h-full flex-col p-5 sm:p-6 md:p-7 min-h-[260px]">
                <div className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase"
                  style={{ background: 'rgba(167,139,250,0.18)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.35)' }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_6px_#a78bfa]" />
                  Property Owners
                </div>

                <h3 className="mt-5 text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
                  Grow bookings<br/>with less work.
                </h3>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(221,214,254,0.80)' }}>
                  List your property, manage availability, and grow bookings with less manual work.
                </p>

                <div className="mt-auto pt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs" style={{ color: 'rgba(196,181,253,0.70)', borderTop: '1px solid rgba(167,139,250,0.15)' }}>
                  <span className="flex items-center gap-1.5 pt-4"><Calendar className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} aria-hidden />Fast onboarding</span>
                  <span className="flex items-center gap-1.5 pt-4"><Eye className="w-3.5 h-3.5" style={{ color: '#a78bfa' }} aria-hidden />Owner dashboard</span>
                </div>
              </div>
            </div>

          </div>

          {/* ── Explore heading — split editorial layout ── */}
          <div className="relative z-10 mt-14 sm:mt-16 overflow-hidden">
            {/* Ghost background word */}
            <div aria-hidden className="pointer-events-none select-none absolute -top-6 left-0 right-0 flex justify-center">
              <span className="text-[clamp(72px,16vw,160px)] font-black tracking-tighter leading-none bg-gradient-to-r from-[#02b4f5]/[0.055] via-[#02665e]/[0.045] to-transparent bg-clip-text text-transparent whitespace-nowrap">
                EXPLORE
              </span>
            </div>

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8 py-2">
              {/* LEFT — badge + title + accent line */}
              <div className="min-w-0">
                {/* Numbered badge — sharp angled style */}
                <div className="inline-flex items-center gap-2.5 mb-4">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black text-white shadow-[0_6px_18px_rgba(2,102,94,0.35)]"
                    style={{ background: 'linear-gradient(135deg, #02665e, #02b4f5)' }}>
                    02
                  </span>
                  <span className="h-px w-10 bg-gradient-to-r from-[#02b4f5]/60 to-transparent" aria-hidden />
                  <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#02665e]/70">Property Types</span>
                </div>

                <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-slate-900">
                  Expl<span className="bg-gradient-to-r from-[#02b4f5] to-[#02665e] bg-clip-text text-transparent">ore</span>
                </h2>

                {/* Underline accent */}
                <div className="mt-4 flex items-center gap-2" aria-hidden>
                  <div className="h-[3px] w-12 rounded-full bg-gradient-to-r from-[#02b4f5] to-[#02665e] shadow-[0_2px_10px_rgba(2,180,245,0.40)]" />
                  <div className="h-[3px] w-4 rounded-full bg-gradient-to-r from-[#02665e]/40 to-transparent" />
                </div>
              </div>

              {/* RIGHT — subtitle in a contained block */}
              <div className="lg:max-w-[46ch] flex-shrink-0">
                <div className="rounded-2xl px-5 py-4 ring-1 ring-slate-200/80 bg-white/60 backdrop-blur-sm shadow-[0_4px_20px_rgba(2,6,23,0.05)]">
                  <p className="text-sm sm:text-[15px] leading-relaxed text-slate-600">
                    Browse by property type, compare verified options, and{" "}
                    <span className="font-semibold text-slate-800">move from discovery to booking in minutes.</span>
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-[#02665e] tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#02b4f5] shadow-[0_0_6px_rgba(2,180,245,0.7)]" aria-hidden />
                    Start exploring
                  </div>
                </div>
              </div>
            </div>

            {/* Full-width bottom rule */}
            <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-[#02b4f5]/25 to-transparent" aria-hidden />
          </div>

          {/* ── Property type cards — bespoke premium grid ── */}
          <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {PROPERTY_TYPE_CARDS.map((c, idx) => {
              const count = typeCounts[c.key];
              const sample = typeSamples[c.key];
              const href = `/public/properties?types=${encodeURIComponent(c.key)}&page=1`;
              const img = sample?.primaryImage || c.fallbackImageSrc;

              // Per-card accent — curated 5-colour cycle so adjacent cards never clash
              const accents = [
                { glow: 'rgba(2,180,245,0.55)',  line: '#02b4f5', tint: 'rgba(2,180,245,0.16)'  },   // cyan
                { glow: 'rgba(16,185,129,0.55)', line: '#10b981', tint: 'rgba(16,185,129,0.16)' },   // emerald
                { glow: 'rgba(251,191,36,0.50)', line: '#fbbf24', tint: 'rgba(251,191,36,0.14)' },   // amber
                { glow: 'rgba(167,139,250,0.55)',line: '#a78bfa', tint: 'rgba(167,139,250,0.16)'},   // violet
                { glow: 'rgba(251,113,133,0.50)',line: '#fb7185', tint: 'rgba(251,113,133,0.14)'},   // rose
              ];
              const ac = accents[idx % accents.length];

              return (
                <Link
                  key={c.key}
                  href={href}
                  aria-label={`Browse ${c.title} stays`}
                  className="group relative block overflow-hidden rounded-[22px] no-underline
                    ring-1 ring-white/20 shadow-[0_8px_28px_rgba(2,6,23,0.13)]
                    transition-all duration-500
                    hover:ring-white/40 hover:shadow-[0_20px_56px_rgba(2,6,23,0.22)] hover:-translate-y-1"
                >
                  {/* ── Image ── */}
                  <div className="relative h-[190px] sm:h-[215px] overflow-hidden">
                    {img ? (
                      <NextImage
                        src={img}
                        alt={c.title}
                        fill
                        sizes="(min-width:1024px) 20vw, (min-width:640px) 33vw, 50vw"
                        className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07] group-hover:saturate-[1.08]"
                      />
                    ) : (
                      <div className="absolute inset-0" style={{ background: '#012e29' }} />
                    )}

                    {/* Base dark scrim for legibility */}
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />
                    {/* Colour wash at bottom matching accent */}
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[var(--ac-tint)] via-transparent to-transparent"
                      style={{ '--ac-tint': ac.tint } as React.CSSProperties} />

                    {/* ── Top-right count pill ── */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <AttentionBlink active={blinkCounts}>
                        <span className={[
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
                          "bg-black/45 backdrop-blur-md ring-1 ring-white/20",
                          "text-[11px] font-bold text-white tabular-nums",
                          countsLoading ? "animate-pulse" : "",
                        ].join(" ")}>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ background: ac.line, boxShadow: `0 0 6px ${ac.glow}` }} aria-hidden />
                          {typeof count === "number" ? count.toLocaleString() : "—"}
                        </span>
                      </AttentionBlink>
                    </div>

                    {/* ── Slide-up hover CTA ── */}
                    <div aria-hidden
                      className="absolute inset-x-0 bottom-0 flex items-center justify-center pb-3
                        translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100
                        transition-all duration-400 ease-out z-10">
                      <span className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white
                        backdrop-blur-md ring-1 ring-white/35 shadow-lg"
                        style={{ background: `linear-gradient(135deg, ${ac.line}cc, ${ac.line}88)` }}>
                        Browse &rarr;
                      </span>
                    </div>
                  </div>

                  {/* ── Footer strip ── */}
                  <div className="bg-white px-3 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-[13px] font-bold text-slate-900 tracking-tight leading-none">{c.title}</span>
                    {/* thin coloured accent dot + line */}
                    <span aria-hidden className="flex items-center gap-1 flex-shrink-0">
                      <span className="h-0.5 w-4 rounded-full" style={{ background: ac.line, opacity: 0.6 }} />
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: ac.line, boxShadow: `0 0 5px ${ac.glow}` }} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* ── Featured Destinations — departure-board / travel-ticker heading ── */}
          <div className="mt-14 sm:mt-16 relative">

            {/* Horizontal dashed separator — mimics a boarding-pass tear line */}
            <div aria-hidden className="absolute top-1/2 inset-x-0 -translate-y-1/2 flex items-center gap-0 pointer-events-none select-none">
              <div className="flex-1 border-t border-dashed border-slate-200" />
              <span className="mx-3 w-2 h-2 rounded-full flex-shrink-0 bg-gradient-to-br from-[#02b4f5] to-[#02665e] shadow-[0_0_8px_rgba(2,180,245,0.55)]" />
              <div className="flex-1 border-t border-dashed border-slate-200" />
            </div>

            {/* Main content sits above the dashed line */}
            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 sm:gap-10 bg-white/0">

              {/* LEFT — staggered weight title */}
              <div className="min-w-0">
                {/* Step badge — different from Explore's numbered square */}
                <div className="inline-flex items-center gap-2 mb-3">
                  {/* Pill with location-pin dot */}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1 text-[10px] font-bold tracking-[0.18em] uppercase text-slate-400">
                    <svg className="w-2.5 h-2.5 text-[#02b4f5] flex-shrink-0" viewBox="0 0 10 13" fill="currentColor" aria-hidden>
                      <path d="M5 0a5 5 0 0 0-5 5c0 3.5 5 8 5 8s5-4.5 5-8a5 5 0 0 0-5-5Zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/>
                    </svg>
                    East Africa
                  </span>
                </div>

                {/* Two-line staggered title */}
                <div className="leading-none">
                  <div className="text-[clamp(28px,5.5vw,52px)] font-light tracking-tight text-slate-400 leading-[1.05]">
                    Featured
                  </div>
                  <div className="text-[clamp(32px,6.5vw,64px)] font-black tracking-tight leading-[1] -mt-1"
                    style={{ background: 'linear-gradient(100deg, #0c4a6e 0%, #02b4f5 45%, #02665e 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    Destinations
                  </div>
                </div>
              </div>

              {/* RIGHT — tag-style subtitle (like a luggage label) */}
              <div className="flex-shrink-0 sm:max-w-[44ch] sm:pb-1">
                <div className="relative rounded-2xl border border-dashed border-slate-200 px-4 py-3.5 bg-slate-50/70">
                  {/* Corner notch decoration */}
                  <span aria-hidden className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-white border border-dashed border-slate-300" />
                  <span aria-hidden className="absolute -bottom-1.5 -left-1.5 w-3 h-3 rounded-full bg-white border border-dashed border-slate-300" />

                  <p className="text-[13px] sm:text-sm leading-relaxed text-slate-500">
                    Cities with strong availability —{" "}
                    <span className="text-slate-800 font-semibold">designed for fast filtering and confident booking.</span>
                  </p>

                  {/* Airport-style meta row */}
                  <div className="mt-3 flex items-center gap-3 text-[10px] font-bold tracking-[0.16em] uppercase text-slate-300">
                    <span>EAF</span>
                    <span className="h-px flex-1 bg-slate-200" aria-hidden />
                    <span className="text-[#02b4f5]">Verified</span>
                    <span className="h-px flex-1 bg-slate-200" aria-hidden />
                    <span>Live now</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

            <div
              className="mt-7"
              onMouseEnter={() => setFeaturedSlidePaused(true)}
              onMouseLeave={() => setFeaturedSlidePaused(false)}
              onFocus={() => setFeaturedSlidePaused(true)}
              onBlur={() => setFeaturedSlidePaused(false)}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`featured-slide-${featuredSlide}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.4, ease: "easeInOut" }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
                >
                  {(featuredDestinationSlides[featuredSlide] || featuredDestinationSlides[0] || []).map((d, idx) => {
                    const href = `/public/properties?city=${encodeURIComponent(d.city)}&page=1`;
                    const total = featuredCityCounts[d.city];

                    // Each city gets a unique palette — no two adjacent cards share the same
                    const palettes = [
                      { from: '#0c4a6e', to: '#0369a1', glow: 'rgba(3,105,161,0.45)', line: '#38bdf8', tag: 'rgba(56,189,248,0.18)', tagText: '#7dd3fc', tagBorder: 'rgba(56,189,248,0.30)' },
                      { from: '#134e4a', to: '#0f766e', glow: 'rgba(15,118,110,0.45)', line: '#2dd4bf', tag: 'rgba(45,212,191,0.18)', tagText: '#5eead4', tagBorder: 'rgba(45,212,191,0.30)' },
                      { from: '#1e1b4b', to: '#3730a3', glow: 'rgba(55,48,163,0.45)', line: '#818cf8', tag: 'rgba(129,140,248,0.18)', tagText: '#a5b4fc', tagBorder: 'rgba(129,140,248,0.30)' },
                      { from: '#3b0764', to: '#6b21a8', glow: 'rgba(107,33,168,0.45)', line: '#c084fc', tag: 'rgba(192,132,252,0.18)', tagText: '#d8b4fe', tagBorder: 'rgba(192,132,252,0.30)' },
                    ];
                    const p = palettes[idx % palettes.length];

                    return (
                      <Link
                        key={`${d.city}-${idx}`}
                        href={href}
                        aria-label={`Browse stays in ${d.city}`}
                        className="group/card relative block no-underline rounded-[24px] overflow-hidden
                          transition-transform duration-500 ease-out
                          hover:-translate-y-2"
                        style={{ willChange: 'transform' }}
                      >
                        {/* Card body */}
                        <div className="relative h-full overflow-hidden rounded-[24px] ring-1 ring-white/12"
                          style={{ background: `linear-gradient(160deg, ${p.from} 0%, ${p.to} 100%)`, boxShadow: `0 12px 40px ${p.glow}, 0 2px 0 rgba(255,255,255,0.08) inset` }}>

                          {/* Dot-grid texture */}
                          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]"
                            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                          {/* Soft radial bloom top-right */}
                          <div aria-hidden className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-25 blur-3xl"
                            style={{ background: p.line }} />

                          {/* Thin coloured left-edge accent bar */}
                          <div aria-hidden className="absolute left-0 top-6 bottom-6 w-[3px] rounded-full opacity-60"
                            style={{ background: `linear-gradient(to bottom, transparent, ${p.line}, transparent)` }} />

                          <div className="relative z-10 flex flex-col gap-4 p-5 sm:p-6">

                            {/* Row 1 — country + stays count */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] uppercase rounded-full px-2.5 py-1"
                                style={{ background: p.tag, color: p.tagText, border: `1px solid ${p.tagBorder}` }}>
                                <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: p.line }} aria-hidden />
                                {d.country}
                              </span>

                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/60">
                                {featuredCitiesLoading ? (
                                  <span className="inline-block h-3 w-8 rounded bg-white/15 animate-pulse" aria-hidden />
                                ) : (
                                  <span className="tabular-nums font-bold text-white/90">{typeof total === "number" ? total.toLocaleString() : "—"}</span>
                                )}
                                <span>stays</span>
                              </span>
                            </div>

                            {/* Row 2 — city name */}
                            <div>
                              <h3 className="text-2xl sm:text-[26px] font-black tracking-tight leading-tight text-white">
                                {d.city}
                              </h3>
                              <p className="mt-2 text-[13px] leading-relaxed text-white/60 max-w-[34ch]">
                                {d.tagline}
                              </p>
                            </div>

                            {/* Row 3 — bottom action row */}
                            <div className="flex items-center justify-between mt-1 pt-4"
                              style={{ borderTop: `1px solid rgba(255,255,255,0.09)` }}>
                              <span className="text-[11px] font-semibold tracking-wide"
                                style={{ color: p.tagText }}>
                                Verified listings
                              </span>
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-all duration-300
                                group-hover/card:scale-110"
                                style={{ background: p.tag, border: `1px solid ${p.tagBorder}` }}
                                aria-hidden>
                                <ChevronRight className="w-3.5 h-3.5" style={{ color: p.tagText }} />
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
                {/* ── Connected Services heading — dark cinematic treatment ── */}
                <div className="mb-8">
                  {/* Top connector bar — node chain */}
                  <div aria-hidden className="flex items-center gap-0 mb-5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#02b4f5] shadow-[0_0_10px_rgba(2,180,245,0.85)]" />
                    <span className="h-px flex-1 bg-gradient-to-r from-[#02b4f5]/80 via-[#02b4f5]/30 to-transparent" />
                    <span className="mx-1.5 w-1 h-1 rounded-full bg-white/25 flex-shrink-0" />
                    <span className="h-px w-8 bg-white/10" />
                    <span className="mx-1.5 w-1 h-1 rounded-full bg-white/15 flex-shrink-0" />
                    <span className="h-px w-12 bg-white/8" />
                  </div>

                  {/* Label chip */}
                  <div className="inline-flex items-center gap-2 rounded-full border border-dashed border-white/20 px-3 py-1 mb-4">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#02b4f5] shadow-[0_0_6px_rgba(2,180,245,0.9)]" aria-hidden />
                    <span className="text-[10px] font-bold tracking-[0.20em] uppercase text-white/50">Platform overview</span>
                  </div>

                  {/* Main title — oversized, weight/colour contrast */}
                  <h2 className="text-[clamp(28px,5vw,54px)] font-black leading-[1.0] tracking-tight">
                    <span className="text-white/30 font-light">Connected</span>{" "}
                    <span className="text-white">Services</span>
                  </h2>

                  {/* Glow underline accent */}
                  <div aria-hidden className="mt-3 h-[3px] w-24 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #02b4f5, #02665e)', boxShadow: '0 0 14px rgba(2,180,245,0.55)' }} />

                  {/* Subtitle — two-part split */}
                  <p className="mt-4 text-[13px] sm:text-sm leading-relaxed max-w-[64ch]">
                    <span className="text-white/40">An end‑to‑end travel flow — </span>
                    <span className="text-white/75 font-medium">stays, transport, and experiences coordinated around your booking.</span>
                  </p>
                </div>

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
                <div className="relative w-full rounded-[28px] p-[1.5px] shadow-[0_24px_64px_rgba(2,102,94,0.28),0_8px_24px_rgba(8,18,50,0.50)]"
                  style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.22) 0%,rgba(2,180,245,0.32) 40%,rgba(2,102,94,0.55) 80%,rgba(11,31,92,0.40) 100%)" }}>
                  <div className="relative h-full overflow-hidden rounded-[calc(28px-1.5px)]"
                    style={{ background: "linear-gradient(155deg,#080e28 0%,#0a1e3a 45%,#041c14 100%)" }}>

                    {/* Ambient glows */}
                    <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 15% 15%,rgba(10,92,130,0.22),transparent 60%)" }} aria-hidden />
                    <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 55% 45% at 85% 85%,rgba(2,102,94,0.20),transparent 65%)" }} aria-hidden />
                    {/* Dot grid */}
                    <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:radial-gradient(circle_at_1px_1px,rgba(45,212,191,0.55)_1px,transparent_0)] [background-size:26px_26px]" aria-hidden />
                    {/* Top highlight */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" aria-hidden />

                    <div className="relative z-10 p-7">
                      {/* Badge */}
                      <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/15"
                        style={{ background: "rgba(10,92,130,0.38)", backdropFilter: "blur(8px)" }}>
                        <Sparkles className="h-3.5 w-3.5 opacity-90" aria-hidden />
                        End-to-end travel platform
                      </div>

                      {/* Title */}
                      <div className="mt-5 text-white font-black text-[1.55rem] tracking-tight leading-[1.18]">
                        From booking to pickup —{" "}
                        <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(98deg,#38bdf8 0%,#2dd4bf 55%,#6ee7b7 100%)" }}>
                          all connected.
                        </span>
                      </div>

                      {/* Accent line */}
                      <div className="mt-3 h-px w-16 rounded-full" style={{ background: "linear-gradient(90deg,#02665e,#0a5c82,transparent)" }} />

                      <div className="mt-3 text-white/60 text-sm leading-relaxed max-w-[52ch]">
                        Book verified stays, coordinate transport to the property you booked, and connect solo travelers to authentic local experiences — in one flow.
                      </div>

                      {/* Service chips */}
                      <div className="mt-5 flex flex-wrap items-center gap-2">
                        {[
                          { label: "Stays",        Icon: Home      },
                          { label: "Group Stays",  Icon: Gavel     },
                          { label: "Transport",    Icon: Car       },
                          { label: "Local guides", Icon: Users     },
                          { label: "Support",      Icon: LifeBuoy  },
                        ].map(({ label, Icon }) => (
                          <span
                            key={label}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white/80 ring-1 ring-white/12 transition-colors duration-200 hover:text-white hover:ring-[#2dd4bf]/40"
                            style={{ background: "rgba(10,92,130,0.22)", backdropFilter: "blur(6px)" }}
                          >
                            <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
                            {label}
                          </span>
                        ))}
                      </div>

                      {/* CTAs */}
                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <Link
                          href="/public/group-stays"
                          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-white text-sm font-bold no-underline hover:no-underline transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_8px_24px_rgba(2,102,94,0.40)]"
                          style={{ background: "linear-gradient(135deg,#0b1f5c 0%,#0a5c82 52%,#02665e 100%)", boxShadow: "0 0 0 1px rgba(2,102,94,0.40),0 4px 16px rgba(2,102,94,0.22)" }}
                        >
                          Explore Group Stays
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </Link>
                        <Link
                          href="/public/plan-with-us"
                          className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-white/80 text-sm font-semibold ring-1 ring-white/18 no-underline hover:no-underline transition-all duration-200 hover:text-white hover:ring-[#2dd4bf]/40"
                          style={{ background: "rgba(255,255,255,0.07)" }}
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
                    "transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_110px_rgba(2,6,23,0.22)]",
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
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
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
                  className="group relative rounded-[28px] p-[1px] bg-gradient-to-br from-white/45 via-emerald-500/12 to-sky-400/16 shadow-[0_20px_70px_rgba(2,6,23,0.16)] ring-1 ring-white/45 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_32px_110px_rgba(2,6,23,0.22)]"
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
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: 'easeInOut' }}
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

          {/* ── Explore Tourism by Country — atlas / geography heading ── */}
          <div className="mt-12 relative overflow-hidden rounded-3xl">
            {/* Background: warm off-white with a faint world-grid pattern */}
            <div aria-hidden className="absolute inset-0 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50" />
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

            {/* Ghost coordinate numbers — atlas feel */}
            <div aria-hidden className="pointer-events-none select-none absolute top-2 left-4 text-[10px] font-mono text-slate-300 leading-4">
              {['3°S', '6°S', '9°S'].map(l => <div key={l}>{l}</div>)}
            </div>
            <div aria-hidden className="pointer-events-none select-none absolute top-2 right-4 text-[10px] font-mono text-slate-300 leading-4 text-right">
              {['33°E', '36°E', '39°E'].map(l => <div key={l}>{l}</div>)}
            </div>

            {/* Top amber accent line */}
            <div aria-hidden className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

            <div className="relative z-10 px-6 py-6 sm:px-8 sm:py-7 flex flex-col sm:flex-row sm:items-center gap-6">

              {/* LEFT — title block */}
              <div className="min-w-0 flex-1">
                {/* Step tag — roman numeral style */}
                <div className="inline-flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-black tracking-[0.22em] uppercase text-amber-500/80">III</span>
                  <span className="h-px w-8 bg-amber-300/60" aria-hidden />
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-400">Regional Focus</span>
                </div>

                {/* Two-weight title */}
                <h2 className="text-[clamp(22px,4vw,42px)] leading-tight tracking-tight">
                  <span className="font-black text-slate-900">Explore </span>
                  <span className="font-light text-slate-500">Tourism </span>
                  <span className="font-black" style={{ background: 'linear-gradient(100deg,#b45309,#d97706,#f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>by Country</span>
                </h2>

                {/* Subtitle with inline path arrow */}
                <p className="mt-3 text-[13px] sm:text-sm leading-relaxed text-slate-500 max-w-[60ch]">
                  Choose a country to see major and minor tourist sites —
                  {" "}<span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                    then book verified stays
                    <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" viewBox="0 0 14 14" fill="none" aria-hidden>
                      <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  {" "}and coordinate transport in one flow.
                </p>
              </div>

              {/* RIGHT — three country colour bars */}
              <div className="flex-shrink-0 flex flex-row sm:flex-col gap-2 sm:gap-2 sm:items-end">
                {[
                  { name: 'Tanzania', colors: ['#1eb53a','#fcd116','#00a3dd','#000000'] },
                  { name: 'Kenya',    colors: ['#006600','#cc0001','#ffffff','#000000'] },
                  { name: 'Uganda',   colors: ['#000000','#fcdc04','#da121a'] },
                ].map(c => (
                  <div key={c.name} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wide text-slate-400 hidden sm:block w-12 text-right">{c.name}</span>
                    <div className="flex rounded-full overflow-hidden h-2 w-16 sm:w-20">
                      {c.colors.map((col, i) => (
                        <div key={i} className="flex-1 h-full" style={{ background: col }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom amber rule */}
            <div aria-hidden className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent" />
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

          {/* ── Our story — chapter / memoir heading ── */}
          <div className="mt-12 relative">
            {/* Faint ruled-paper lines behind the heading */}
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
              style={{ backgroundImage: 'repeating-linear-gradient(transparent,transparent 27px,rgba(203,213,225,0.35) 27px,rgba(203,213,225,0.35) 28px)', backgroundSize: '100% 28px' }} />
            <div className="relative z-10 px-1 py-2">
              {/* Title with italic contrast */}
              <h2 className="text-[clamp(28px,5vw,56px)] leading-none tracking-tight">
                <em className="not-italic font-light text-slate-400">Our </em>
                <span className="font-black text-slate-900" style={{ letterSpacing: '-0.03em' }}>story</span>
              </h2>
              {/* Ink-stroke underline */}
              <div aria-hidden className="mt-2 h-[3px] w-24 rounded-full" style={{ background: 'linear-gradient(90deg,#fb7185,#f43f5e,transparent)' }} />
              {/* Subtitle as pull-quote */}
              <p className="mt-4 text-[13px] sm:text-sm text-slate-500 max-w-[55ch] border-l-2 border-rose-200 pl-4 italic">
                How NoLSAF was built and the standards we hold ourselves to.
              </p>
            </div>
          </div>
          <FounderStory />

          {/* ── What people say — quotation / voice heading ── */}
          <div className="mt-14 relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 px-6 py-7 sm:px-10">
            {/* Giant decorative opening quote */}
            <div aria-hidden className="pointer-events-none select-none absolute -top-4 -left-2 text-[160px] font-black leading-none text-sky-500/10" style={{ fontFamily: 'Georgia, serif' }}>&ldquo;</div>
            {/* Closing quote bottom-right */}
            <div aria-hidden className="pointer-events-none select-none absolute -bottom-10 right-4 text-[160px] font-black leading-none text-sky-500/10" style={{ fontFamily: 'Georgia, serif' }}>&rdquo;</div>
            {/* Top rule */}
            <div aria-hidden className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400/50 to-transparent" />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex-1">
                {/* Eyebrow */}
                <div className="flex items-center gap-2 mb-3">
                  {[1,2,3].map(i => <span key={i} className="w-1.5 h-1.5 rounded-full bg-sky-400/60" />)}
                  <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-sky-400/70 ml-1">Voices</span>
                </div>
                {/* Title */}
                <h2 className="text-[clamp(24px,4.5vw,50px)] leading-tight">
                  <span className="font-light text-white/50">What people </span>
                  <span className="font-black" style={{ color: '#02665e' }}>say</span>
                </h2>
              </div>
              {/* Subtitle pill on the right */}
              <div className="flex-shrink-0 max-w-[280px] rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[12px] text-white/50 leading-relaxed">
                  Feedback from travelers and operators — focused on what matters most.
                </p>
              </div>
            </div>
          </div>
          <Testimonials hideTitle />

          {/* ── Trusted by — authority / institutional heading ── */}
          <div className="mt-14 relative overflow-hidden">
            {/* Gold horizontal band */}
            <div aria-hidden className="absolute inset-y-0 left-0 w-1 rounded-r-full bg-gradient-to-b from-yellow-300 via-amber-400 to-yellow-300" />
            <div className="pl-6 py-1">
              {/* Top row: shield icon + spaced label */}
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-4 h-4 text-amber-400 flex-shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M8 1.5L2 4v4c0 3.31 2.55 6.21 6 6.93C11.45 14.21 14 11.31 14 8V4L8 1.5z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  <path d="M5.5 8l1.75 1.75L10.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[10px] font-black tracking-[0.28em] uppercase text-amber-500/80">Verified Partners</span>
                <span className="h-px flex-1 max-w-[60px] bg-amber-200/50" aria-hidden />
              </div>
              {/* Title */}
              <h2 className="text-[clamp(24px,4.5vw,50px)] leading-tight tracking-tight">
                <span className="font-black text-slate-900">Trusted </span>
                <span className="font-light text-slate-400">by</span>
              </h2>
              {/* Dotted rule */}
              <div aria-hidden className="mt-2.5 flex gap-1">
                {Array.from({length: 16}).map((_,i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-amber-200/70" />)}
              </div>
              {/* Subtitle */}
              <p className="mt-3 text-[13px] sm:text-sm text-slate-500 max-w-[55ch]">
                Organizations that trust NoLSAF for reliable bookings and operations.
              </p>
            </div>
          </div>
          <TrustedBySectionWithData />

          {/* ── Latest updates — changelog / terminal heading ── */}
          <div className="mt-14 relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-emerald-50/40">
            {/* Scan-line texture */}
            <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.025]"
              style={{ backgroundImage: 'repeating-linear-gradient(0deg,rgba(0,0,0,1) 0px,rgba(0,0,0,1) 1px,transparent 1px,transparent 3px)' }} />
            {/* Green accent top bar */}
            <div aria-hidden className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/70 to-transparent" />
            <div className="relative z-10 px-6 py-6 sm:px-8 flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex-1">
                {/* Terminal-style label */}
                <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200/80 bg-emerald-50 px-3 py-1 mb-3">
                  {/* Pulse dot */}
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-700 uppercase">Changelog</span>
                </div>
                {/* Title */}
                <h2 className="text-[clamp(22px,4vw,44px)] leading-tight tracking-tight">
                  <span className="font-black text-slate-900">Latest </span>
                  <span className="font-light" style={{ background: 'linear-gradient(100deg,#059669,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>updates</span>
                </h2>
              </div>
              {/* Right: version tag */}
              <div className="flex-shrink-0 font-mono text-right">
                <div className="text-[10px] text-slate-400 tracking-wider">NOLSAF</div>
                <div className="text-[11px] font-bold text-emerald-600 tracking-wider">EAST AFRICA</div>
                <p className="mt-1.5 text-[11px] text-slate-400 max-w-[200px] text-right font-sans">
                  Verified stays, integrated transport & group travel — built for every traveller.
                </p>
              </div>
            </div>
          </div>
          <LatestUpdate hideTitle />
        </div>
      </section>
    </main>
  );
}
