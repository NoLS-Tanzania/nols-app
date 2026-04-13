"use client";

import Link from "next/link";
import NextImage from "next/image";
import React from "react";
import {
  User,
  ChevronRight,
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
  BedDouble,
  Search,
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

export default function Page() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  // Group Stays is now a standalone page; removed inline event integration.

  type HeroMode = "stays" | "transport" | "host";
  const [, setHeroMode] = useState<HeroMode>("stays");

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
  const searchHints = ['Zanzibar', 'Serengeti', 'Dar es Salaam', 'Arusha', 'Kilimanjaro', 'Ngorongoro'];
  const [hintIdx, setHintIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setHintIdx((i) => (i + 1) % searchHints.length), 2500);
    return () => clearInterval(id);
  }, [searchHints.length]);
  const searchPlaceholder = `Where are you going? e.g. ${searchHints[hintIdx]}`;

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
      {/* Hero surround frame */}
      <div className="public-container">
        <div className="relative overflow-hidden rounded-[34px] sm:rounded-[60px] mx-0 p-0"
          style={{
            background: "transparent",
          }}>

          {/* Inner 1px border — teal-to-blue premium line */}
          <div className="relative rounded-[30px] sm:rounded-[52px] p-[1px]"
            style={{ background: "linear-gradient(135deg,rgba(255,255,255,0.12) 0%,rgba(2,180,245,0.20) 40%,rgba(2,102,94,0.30) 75%,rgba(255,196,0,0.08) 100%)" }}>
            <div className="pointer-events-none absolute inset-0 rounded-[30px] sm:rounded-[52px] bg-gradient-to-b from-white/10 via-white/4 to-transparent" aria-hidden />

            <section
              id="public-hero"
              className="relative overflow-hidden text-white rounded-[calc(30px-1px)] sm:rounded-[calc(52px-1.5px)]"
              style={{ background: "#020f0d" }}
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
          <div className="pointer-events-none absolute inset-0 rounded-[calc(30px-1px)] sm:rounded-[calc(52px-1.5px)] ring-1 ring-white/12" aria-hidden />
        {/* ══════════════════════════════════════════════
             FULL-BLEED HERO BACKGROUND
        ══════════════════════════════════════════════ */}
        <div className="absolute inset-0" aria-hidden>

          {/* Background — owner portal teal gradient */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#020f0d 0%,#011c18 22%,#023a32 48%,#025549 72%,#02705f 90%,#048070 100%)" }} />

          {/* Dot grid */}
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.06) 1px,transparent 1px)", backgroundSize: "24px 24px" }} />

          {/* Horizontal depth lines */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,1) 39px,rgba(255,255,255,1) 40px)" }} />

          {/* Vignette */}
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%,rgba(0,0,0,0) 0%,rgba(0,0,0,0.45) 100%)" }} />

          {/* Ambient glows */}
          <div className="pointer-events-none absolute -top-20 left-1/3 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle,rgba(4,180,150,0.22) 0%,transparent 70%)" }} />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full" style={{ background: "radial-gradient(circle,rgba(0,240,190,0.10) 0%,transparent 70%)" }} />



          {/* SVG area wave */}
          <svg className="pointer-events-none absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 400 180" style={{ opacity: 0.07 }}>
            <defs>
              <linearGradient id="heroWave" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ffcc" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#00ffcc" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,140 C60,100 100,160 160,90 C220,30 260,120 320,70 C360,30 380,60 400,50 L400,180 L0,180 Z" fill="url(#heroWave)" />
            <path d="M0,140 C60,100 100,160 160,90 C220,30 260,120 320,70 C360,30 380,60 400,50" fill="none" stroke="#00ffcc" strokeWidth="2" />
          </svg>

          {/* ════════════════════════════════════════════
               ARCHITECTURAL LUXURY VISUALIZATION
               Inspired by: hotel atrium floor plans,
               premium property blueprints, and skyline
               silhouettes — all teal+gold palette
          ════════════════════════════════════════════ */}
          <div className="pointer-events-none absolute inset-0" aria-hidden style={{ display: "none" }}>
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
                  <ellipse cx="860" cy="420" rx="280" ry="160" stroke="#02665e" strokeOpacity="0.32" strokeWidth="1.0" />
                  <ellipse cx="860" cy="420" rx="210" ry="118" stroke="#02665e" strokeOpacity="0.40" strokeWidth="1.1" />
                  <ellipse cx="860" cy="420" rx="145" ry="80" stroke="#2dd4bf" strokeOpacity="0.50" strokeWidth="1.3" />
                  <ellipse cx="860" cy="420" rx="85" ry="46" stroke="#2dd4bf" strokeOpacity="0.65" strokeWidth="1.4" />
                  <ellipse cx="860" cy="420" rx="40" ry="22" stroke="#fbbf24" strokeOpacity="0.55" strokeWidth="1.2" />
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
                  <circle cx="480" cy="200" r="11" stroke="#2dd4bf" strokeOpacity="0.80" strokeWidth="1.6" />
                  <circle cx="480" cy="200" r="22" stroke="#2dd4bf" strokeOpacity="0.34" strokeWidth="1.0" />
                  <circle cx="780" cy="170" r="9"  stroke="#fbbf24" strokeOpacity="0.75" strokeWidth="1.5" />
                  <circle cx="780" cy="170" r="19" stroke="#fbbf24" strokeOpacity="0.28" strokeWidth="0.9" />
                  <circle cx="620" cy="320" r="8"  stroke="#38bdf8" strokeOpacity="0.72" strokeWidth="1.4" />
                  <circle cx="620" cy="320" r="17" stroke="#38bdf8" strokeOpacity="0.28" strokeWidth="0.8" />
                  {/* Secondary */}
                  <circle cx="60"  cy="560" r="6"  stroke="#5eead4" strokeOpacity="0.55" strokeWidth="1.2" />
                  <circle cx="300" cy="580" r="5"  stroke="#93c5fd" strokeOpacity="0.50" strokeWidth="1.1" />
                </g>

                {/* ─── Node fill dots ─── */}
                <g>
                  <circle cx="480" cy="200" r="4.5" fill="#2dd4bf" fillOpacity="1" />
                  <circle cx="780" cy="170" r="4.0" fill="#fbbf24" fillOpacity="1" />
                  <circle cx="620" cy="320" r="3.5" fill="#38bdf8" fillOpacity="1" />
                  <circle cx="60"  cy="560" r="3.0" fill="#5eead4" fillOpacity="0.88" />
                  <circle cx="300" cy="580" r="2.5" fill="#93c5fd" fillOpacity="0.80" />
                  <circle cx="130" cy="600" r="2.5" fill="#5eead4" fillOpacity="0.75" />
                </g>

                {/* ─── Gold accent star (luxury marker) at primary node ─── */}
                <g transform="translate(776,166)" fill="#fbbf24" fillOpacity="0.95">
                  <polygon points="4,0 5,3 8,3 5.5,5 6.5,8 4,6 1.5,8 2.5,5 0,3 3,3" />
                </g>
              </g>

              {/* ══════════════════════════════════════════════
                   BOTTOM-LEFT CORNER DECORATION (no mask)
                   Quarter-circle arcs · building blueprint
                   location cluster · scan lines · label chip
              ══════════════════════════════════════════════ */}
              <g>
                {/* Quarter-circle arcs radiating from bottom-left corner */}
                <g fill="none">
                  <path d="M 0 680 A 90 90 0 0 1 90 590" stroke="#2dd4bf" strokeOpacity="0.60" strokeWidth="1.3" />
                  <path d="M 0 680 A 165 165 0 0 1 165 515" stroke="#2dd4bf" strokeOpacity="0.44" strokeWidth="1.1" />
                  <path d="M 0 680 A 255 255 0 0 1 255 425" stroke="#02665e" strokeOpacity="0.50" strokeWidth="1.0" />
                  <path d="M 0 680 A 360 360 0 0 1 360 320" stroke="#38bdf8" strokeOpacity="0.28" strokeWidth="0.8" />
                  <path d="M 0 680 A 460 460 0 0 1 420 240" stroke="#5eead4" strokeOpacity="0.16" strokeWidth="0.7" />
                </g>

                {/* Mini hotel / property blueprint sketch */}
                <g stroke="#2dd4bf" strokeOpacity="0.52" strokeWidth="0.9" fill="none">
                  <rect x="46" y="496" width="56" height="38" rx="1.5" />
                  <line x1="74" y1="496" x2="74" y2="534" />
                  <line x1="46" y1="515" x2="102" y2="515" />
                  <path d="M 40 496 L 74 482 L 108 496" strokeOpacity="0.38" />
                  <path d="M 66 534 L 66 544 L 82 544 L 82 534" strokeOpacity="0.60" />
                  <rect x="52" y="500" width="14" height="10" rx="1" strokeOpacity="0.35" />
                  <rect x="86" y="500" width="14" height="10" rx="1" strokeOpacity="0.35" />
                </g>
                <g transform="translate(70,478)" fill="#fbbf24" fillOpacity="0.75">
                  <polygon points="4,0 5,3 8,3 5.5,5 6.5,8 4,6 1.5,8 2.5,5 0,3 3,3" />
                </g>

                {/* Location cluster — nodes with rings */}
                <g fill="none">
                  <circle cx="60"  cy="562" r="13" stroke="#5eead4" strokeOpacity="0.48" strokeWidth="1.1" />
                  <circle cx="60"  cy="562" r="24" stroke="#5eead4" strokeOpacity="0.22" strokeWidth="0.8" />
                  <circle cx="145" cy="604" r="10" stroke="#2dd4bf" strokeOpacity="0.52" strokeWidth="1.1" />
                  <circle cx="145" cy="604" r="20" stroke="#2dd4bf" strokeOpacity="0.22" strokeWidth="0.7" />
                  <circle cx="210" cy="572" r="8"  stroke="#38bdf8" strokeOpacity="0.48" strokeWidth="1.0" />
                  <circle cx="210" cy="572" r="16" stroke="#38bdf8" strokeOpacity="0.20" strokeWidth="0.6" />
                  <circle cx="270" cy="612" r="6"  stroke="#a78bfa" strokeOpacity="0.40" strokeWidth="0.9" />
                  <circle cx="310" cy="588" r="5"  stroke="#fbbf24" strokeOpacity="0.38" strokeWidth="0.9" />
                </g>

                {/* Node fill dots */}
                <g>
                  <circle cx="60"  cy="562" r="3.5" fill="#5eead4"  fillOpacity="0.95" />
                  <circle cx="145" cy="604" r="3.0" fill="#2dd4bf"  fillOpacity="0.90" />
                  <circle cx="210" cy="572" r="2.5" fill="#38bdf8"  fillOpacity="0.88" />
                  <circle cx="270" cy="612" r="2.5" fill="#a78bfa"  fillOpacity="0.78" />
                  <circle cx="310" cy="588" r="2.0" fill="#fbbf24"  fillOpacity="0.72" />
                  <circle cx="180" cy="640" r="2.0" fill="#5eead4"  fillOpacity="0.65" />
                  <circle cx="245" cy="650" r="1.8" fill="#93c5fd"  fillOpacity="0.60" />
                </g>

                {/* Route connectors between nodes */}
                <g fill="none" strokeWidth="1.1" strokeDasharray="5 5">
                  <path d="M 60 562 Q 102 583 145 604" stroke="#5eead4" strokeOpacity="0.55" />
                  <path d="M 145 604 Q 177 588 210 572" stroke="#2dd4bf" strokeOpacity="0.50" />
                  <path d="M 210 572 Q 240 580 270 612" stroke="#a78bfa" strokeOpacity="0.38" strokeDasharray="4 6" />
                  <path d="M 210 572 Q 260 580 310 588" stroke="#fbbf24" strokeOpacity="0.32" strokeDasharray="4 7" />
                  <path d="M 60 562 Q 135 567 210 572" stroke="#38bdf8" strokeOpacity="0.28" strokeDasharray="3 7" />
                </g>

                {/* Horizontal terrain / scan lines */}
                <g stroke="#2dd4bf" strokeOpacity="0.14" strokeWidth="0.65">
                  {[574, 590, 606, 622, 638, 654, 668].map((y) => (
                    <line key={y} x1="0" y1={y} x2="360" y2={y} />
                  ))}
                </g>

                {/* Left-edge tick marks */}
                <g stroke="#2dd4bf" strokeOpacity="0.40" strokeWidth="1.2">
                  {[520, 560, 600, 640].map((y) => (
                    <line key={y} x1="0" y1={y} x2="7" y2={y} />
                  ))}
                </g>

                {/* NOLSAF label chip */}
                <rect x="12" y="622" width="92" height="19" rx="9.5" fill="#02665e" fillOpacity="0.30" />
                <rect x="12" y="622" width="92" height="19" rx="9.5" stroke="#2dd4bf" strokeOpacity="0.48" strokeWidth="0.8" fill="none" />
                <text x="27" y="635.5" fill="#5eead4" fillOpacity="0.90" fontSize="8.5" fontFamily="monospace" letterSpacing="1.5">NOLSAF</text>
              </g>
            </svg>
          </div>

          {/* Bottom teal horizon */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48"
            style={{ background: "linear-gradient(to top,rgba(2,102,94,0.40) 0%,rgba(5,40,90,0.18) 50%,transparent 100%)" }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-teal-400/60 to-transparent" />

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
          <div className="relative flex flex-col lg:flex-row lg:items-stretch gap-0">
              <div className="flex-1 px-5 sm:px-8 lg:px-10 pt-7 pb-6 lg:pb-7 flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                  className="max-w-4xl mx-auto text-center"
                >
                  <h1 className="text-[1.75rem] sm:text-[2.75rem] md:text-[3.5rem] lg:text-[4.25rem] font-black tracking-[-0.045em] leading-[0.95] sm:leading-[0.90] text-balance">
                    <span
                      className="text-transparent bg-clip-text"
                      style={{
                        backgroundImage: "linear-gradient(100deg,#ffffff 0%,#f0fdfa 50%,#ccfbf1 100%)",
                        filter: "drop-shadow(0 0 32px rgba(45,212,191,0.35))"
                      }}
                    >Quality stay</span>
                    <span
                      className="block text-transparent bg-clip-text"
                      style={{ backgroundImage: "linear-gradient(95deg,#5eead4 0%,#2dd4bf 50%,#14b8a6 100%)" }}
                    >
                      for every <em className="font-serif not-italic">wallet.</em>
                    </span>
                  </h1>

                  <p className="mx-auto mt-3 sm:mt-6 max-w-[44ch] text-[13px] sm:text-[15px] text-white/80 leading-[1.75] font-light">
                    One platform for stays, transport &amp; experiences.
                    <br />
                    <span className="hidden sm:inline text-white/30 text-sm tracking-wide">Simpler · Trusted · Unforgettable</span>
                  </p>

                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.08, ease: [0.2, 0.8, 0.2, 1] }}
                  className="mt-5 sm:mt-8 w-full max-w-3xl lg:max-w-xl mx-auto"
                >
                <form onSubmit={submitSearch} className="w-full pointer-events-auto flex justify-center sm:block">
                  <div className="flex items-center gap-1.5 bg-gradient-to-b from-white/[0.18] to-white/[0.08] backdrop-blur-2xl rounded-full p-2 shadow-[0_22px_80px_rgba(0,0,0,0.50)] ring-1 ring-white/30 w-[270px] sm:w-full mx-auto">
                    <input
                      aria-label="Search query"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder={searchPlaceholder}
                      className="flex-1 min-w-0 px-3 py-2 text-sm rounded-full sm:rounded-l-full sm:rounded-r-none border border-white/22 bg-white/[0.06] text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/45 focus:border-emerald-400/55"
                    />
                    {/* Mobile-only search submit icon */}
                    <button
                      type="submit"
                      aria-label="Search"
                      className="flex sm:hidden flex-none items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 shadow-[0_6px_20px_rgba(16,185,129,0.35)] active:scale-95 transition-transform"
                    >
                      <Search className="w-4 h-4 text-white" />
                    </button>

                      <div ref={guestRef} className="hidden sm:inline-flex flex-none w-14 sm:w-auto items-center justify-center gap-1.5 border border-white/20 rounded-full overflow-visible px-2 py-1.5 relative bg-white/5">
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
                      <div ref={dateRef} className="hidden sm:inline-flex flex-none items-center justify-center gap-1.5 relative border border-white/20 rounded-full px-2.5 py-1.5 bg-white/5">
                        <button
                          type="button"
                          aria-label="Select dates"
                          onClick={() => { setDateOpen((v) => !v); }}
                          className="w-full inline-flex items-center justify-center px-0 py-0 bg-transparent text-white border-0 text-sm"
                        >
                          <span className="truncate text-sm">
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
                        className="hidden sm:flex flex-none flex-shrink-0 items-center justify-center px-4 py-2 text-white rounded-r-full rounded-l-none font-semibold text-sm transition-all duration-200 whitespace-nowrap bg-gradient-to-r from-emerald-500 via-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_12px_40px_rgba(16,185,129,0.30)] hover:shadow-[0_18px_55px_rgba(16,185,129,0.32)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60"
                      >
                        <span>Search</span>
                      </button>
                    </div>
                  </form>
                  {/* Primary CTA */}
                  <div className="hidden sm:flex mt-5 sm:mt-7 lg:mt-8 w-full justify-center">
                    <Link href="/public/properties" aria-label="Browse all stays" className="no-underline">
                      <span className="inline-flex items-center gap-2.5 px-6 py-3 text-sm text-white font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 shadow-[0_12px_40px_rgba(16,185,129,0.35)] hover:shadow-[0_18px_55px_rgba(16,185,129,0.40)] active:scale-95 transition-all duration-200">
                        <BedDouble className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Browse all stays</span>
                        <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-70" />
                      </span>
                    </Link>
                  </div>

                  {/* Social proof strip */}
                  <div className="hidden sm:flex mt-6 sm:mt-8 w-full justify-center">
                    <div className="flex items-center gap-4 sm:gap-6 text-[11px] sm:text-xs text-white/50 font-medium tracking-wide">
                      <span className="flex items-center gap-1.5">
                        <BedDouble className="w-3.5 h-3.5 text-emerald-400/70" />
                        2,500+ Stays
                      </span>
                      <span className="w-px h-3 bg-white/15" aria-hidden />
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-teal-400/70" />
                        30+ Regions
                      </span>
                      <span className="w-px h-3 bg-white/15" aria-hidden />
                      <span className="flex items-center gap-1.5">
                        <span className="text-emerald-400/70">★</span>
                        Trusted by travelers
                      </span>
                    </div>
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

          <motion.div
            className="mb-12 flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[11px] font-semibold tracking-[0.12em] uppercase shadow-sm ring-1 bg-gradient-to-r from-emerald-50 via-white to-sky-50 ring-slate-200/80 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" aria-hidden />
              Who It&apos;s For
            </div>

            <h2 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none">
              <span className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent">Built&nbsp;</span>
              <span style={{ color: '#02665e' }}>for&nbsp;you</span>
            </h2>

            <div className="mt-5 flex items-center gap-3 w-full max-w-xs" aria-hidden>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-200" />
              <span className="w-2 h-2 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200" />
            </div>

            <p className="mt-4 text-sm sm:text-base leading-relaxed max-w-[62ch] text-slate-500">
              Travelers, drivers, and property owners {" "}
              <span className="text-slate-700 font-medium">connected by verified listings, clear policies, and dependable support.</span>
            </p>
          </motion.div>

          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6 min-[420px]:gap-y-6 sm:gap-x-5 sm:gap-y-6 md:gap-y-0 mb-6 sm:mb-8">
            <motion.div
              onClick={() => router.push('/public/properties')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/public/properties'); }}
              role="link"
              tabIndex={0}
              aria-label="Travelers - Browse stays"
              className="group relative min-w-0 h-full cursor-pointer rounded-3xl overflow-hidden transition-shadow duration-500 hover:shadow-[0_28px_70px_rgba(4,120,87,0.40)]"
              style={{ boxShadow: '0 8px 32px rgba(4,120,87,0.22)' }}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0, ease: [0.2, 0.8, 0.2, 1] }}
              whileHover={{ y: -8 }}
            >
              <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #022c22 0%, #064e3b 35%, #065f46 65%, #047857 100%)' }} />
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
              <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 w-56 h-56 rounded-full opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-500" style={{ border: '2px solid #34d399', boxShadow: 'inset 0 0 60px rgba(52,211,153,0.3)' }} />
              <div aria-hidden className="pointer-events-none absolute -top-4 -right-4 w-32 h-32 rounded-full opacity-[0.10] group-hover:opacity-[0.18] transition-opacity duration-500" style={{ border: '1px solid #6ee7b7' }} />
              <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 opacity-40" style={{ background: 'linear-gradient(to top, rgba(16,185,129,0.25), transparent)' }} />

              <div className="relative flex h-full flex-col p-5 sm:p-6 md:p-7 min-h-[260px]">
                <div className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase" style={{ background: 'rgba(52,211,153,0.18)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.35)' }}>
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
            </motion.div>

            <motion.div
              onClick={() => router.push('/account/register?role=driver')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/account/register?role=driver'); }}
              role="link"
              tabIndex={0}
              aria-label="Drivers - Register as a driver"
              className="group relative min-w-0 h-full cursor-pointer rounded-3xl overflow-hidden transition-shadow duration-500 hover:shadow-[0_28px_70px_rgba(2,132,199,0.40)]"
              style={{ boxShadow: '0 8px 32px rgba(2,132,199,0.22)' }}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
              whileHover={{ y: -8 }}
            >
              <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #0c1a2e 0%, #0c4a6e 35%, #075985 65%, #0369a1 100%)' }} />
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
              <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 w-56 h-56 rounded-full opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-500" style={{ border: '2px solid #38bdf8', boxShadow: 'inset 0 0 60px rgba(56,189,248,0.3)' }} />
              <div aria-hidden className="pointer-events-none absolute -top-4 -right-4 w-32 h-32 rounded-full opacity-[0.10] group-hover:opacity-[0.18] transition-opacity duration-500" style={{ border: '1px solid #7dd3fc' }} />
              <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 opacity-40" style={{ background: 'linear-gradient(to top, rgba(56,189,248,0.22), transparent)' }} />

              <div className="relative flex h-full flex-col p-5 sm:p-6 md:p-7 min-h-[260px]">
                <div className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase" style={{ background: 'rgba(56,189,248,0.18)', color: '#7dd3fc', border: '1px solid rgba(56,189,248,0.35)' }}>
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
                  <span className="flex items-center gap-1.5 pt-4"><Eye className="w-3.5 h-3.5" style={{ color: '#38bdf8' }} aria-hidden />Driver dashboard</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              onClick={() => router.push('/account/register?role=owner')}
              onKeyDown={(e) => { if (e.key === 'Enter') router.push('/account/register?role=owner'); }}
              role="link"
              tabIndex={0}
              aria-label="Property Owners - List your property"
              className="group relative min-w-0 col-span-1 min-[420px]:col-span-2 md:col-span-1 h-full sm:mt-0 cursor-pointer rounded-3xl overflow-hidden transition-shadow duration-500 hover:shadow-[0_28px_70px_rgba(109,40,217,0.40)]"
              style={{ boxShadow: '0 8px 32px rgba(109,40,217,0.22)' }}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
              whileHover={{ y: -8 }}
            >
              <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #130828 0%, #2e1065 35%, #3b0764 65%, #4c1d95 100%)' }} />
              <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
              <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 w-56 h-56 rounded-full opacity-[0.15] group-hover:opacity-[0.25] transition-opacity duration-500" style={{ border: '2px solid #a78bfa', boxShadow: 'inset 0 0 60px rgba(167,139,250,0.3)' }} />
              <div aria-hidden className="pointer-events-none absolute -top-4 -right-4 w-32 h-32 rounded-full opacity-[0.10] group-hover:opacity-[0.18] transition-opacity duration-500" style={{ border: '1px solid #c4b5fd' }} />
              <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 opacity-40" style={{ background: 'linear-gradient(to top, rgba(139,92,246,0.25), transparent)' }} />

              <div className="relative flex h-full flex-col p-5 sm:p-6 md:p-7 min-h-[260px]">
                <div className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-widest uppercase" style={{ background: 'rgba(167,139,250,0.18)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.35)' }}>
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
            </motion.div>
          </div>

          {/* ── Explore heading — left-aligned editorial ── */}
          <div className="relative z-10 mt-14 sm:mt-16">
            {/* Gradient top accent */}
            <div className="h-[3px] w-16 rounded-full bg-gradient-to-r from-[#02b4f5] to-[#02665e] mb-6" aria-hidden />

            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-400 mb-3">Property Types</p>

            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-[1.1] text-slate-900">
              Explore <span className="bg-gradient-to-r from-[#02b4f5] to-[#02665e] bg-clip-text text-transparent">stays</span>
            </h2>

            <p className="mt-3 max-w-[52ch] text-sm sm:text-[15px] leading-relaxed text-slate-500">
              Browse by property type, compare verified options, and{" "}
              <span className="font-medium text-slate-700">move from discovery to booking in minutes.</span>
            </p>
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
                <motion.div
                  key={c.key}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.45, delay: (idx % 5) * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
                >
                <Link
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
                </motion.div>
              );
            })}
          </div>

          {/* ── Featured Destinations — left-aligned editorial heading ── */}
          <motion.div
            className="mt-14 sm:mt-16 relative"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {/* Gradient top accent */}
            <div className="h-[3px] w-16 rounded-full bg-gradient-to-r from-[#02b4f5] to-[#02665e] mb-6" aria-hidden />

            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-400 mb-3">East Africa</p>

            <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-[1.1] text-slate-900">
              Featured <span className="bg-gradient-to-r from-[#02b4f5] to-[#02665e] bg-clip-text text-transparent">Destinations</span>
            </h2>

            <p className="mt-3 max-w-[52ch] text-sm sm:text-[15px] leading-relaxed text-slate-500">
              Cities with strong availability {" "}
              <span className="font-medium text-slate-700">designed for fast filtering and confident booking.</span>
            </p>
          </motion.div>

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
              <div className="relative p-6 sm:p-8 lg:p-10">
                {/* ── Connected Services heading — left-aligned editorial (dark) ── */}
                <div className="mb-8">
                  {/* Gradient top accent */}
                  <div className="h-[3px] w-16 rounded-full bg-gradient-to-r from-[#02b4f5] to-[#02665e] mb-6" aria-hidden />

                  <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/40 mb-3">Platform Overview</p>

                  <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-[1.1]">
                    <span className="text-white/40 font-light">Connected</span>{" "}
                    <span className="text-white">Services</span>
                  </h2>

                  <p className="mt-3 max-w-[52ch] text-sm sm:text-[15px] leading-relaxed text-white/50">
                    An end‑to‑end travel flow —{" "}
                    <span className="font-medium text-white/75">stays, transport, and experiences coordinated around your booking.</span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                  {[
                    { title: "Verified Stays",     desc: "Browse and book verified properties with secure payments and instant confirmation codes.", Icon: Home,       href: "/public/properties?page=1", accent: "#38bdf8" },
                    { title: "Group Stays",         desc: "Submit requirements once owners compete with offers. You pick the best fit for your budget.", Icon: Gavel,      href: "/public/group-stays",        accent: "#2dd4bf" },
                    { title: "Transport",           desc: "Coordinate pickup to your booked property with driver confirmation and safety checks.", Icon: Car,        href: "/public/plan-with-us",       accent: "#38bdf8" },
                    { title: "Local Guides",        desc: "Connect solo travelers to authentic local experiences through one simple request.", Icon: Users,      href: "/public/plan-with-us",       accent: "#2dd4bf" },
                    { title: "Plan With Us",        desc: "Let our team coordinate stays, transport, and experiences into one seamless trip.", Icon: Sparkles,   href: "/public/plan-with-us",       accent: "#38bdf8" },
                    { title: "Support",             desc: "Real support from a real team before, during, and after your trip.", Icon: LifeBuoy,   href: "/public/plan-with-us",       accent: "#2dd4bf" },
                  ].map(({ title, desc, Icon, href, accent }) => (
                    <Link
                      key={title}
                      href={href}
                      className="group relative block rounded-2xl p-[1px] no-underline hover:no-underline bg-gradient-to-br from-white/[0.08] to-white/[0.02] ring-1 ring-white/[0.08] transition-all duration-300 hover:-translate-y-0.5 hover:ring-white/[0.16]"
                    >
                      <div className="relative rounded-[calc(1rem-1px)] bg-white/[0.04] p-5 h-full">
                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 ring-white/10"
                            style={{ background: `${accent}15` }}
                          >
                            <Icon className="h-4 w-4" style={{ color: accent }} aria-hidden />
                          </span>
                          <h3 className="text-white font-bold text-[15px] tracking-tight">{title}</h3>
                        </div>
                        <p className="text-white/45 text-[13px] leading-relaxed">{desc}</p>
                        <div className="mt-4 flex items-center gap-1 text-xs font-semibold transition-colors duration-200 group-hover:text-white/70" style={{ color: `${accent}99` }}>
                          Learn more
                          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

              </div>
            </div>
          </div>

          {/* ── Explore Tourism by Country ── */}
          <div className="mt-12 relative overflow-hidden rounded-3xl">
            {/* Background */}
            <div aria-hidden className="absolute inset-0 bg-[#02665e]" />

            <div className="relative z-10 px-6 py-8 sm:px-8 sm:py-10">
              {/* Gradient top accent */}
              <div className="h-[3px] w-16 rounded-full bg-gradient-to-r from-white/70 to-white/20 mb-6" aria-hidden />

              <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-white/45 mb-3">Regional Focus</p>

              <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-extrabold tracking-tight leading-[1.1]">
                <span className="text-white">Explore Tourism </span>
                <span className="text-white/40 font-light">by </span>
                <span className="text-white">Country</span>
              </h2>

              <p className="mt-3 max-w-[52ch] text-sm sm:text-[15px] leading-relaxed text-white/55">
                Choose a country to see major and minor tourist sites {" "}
                <span className="font-medium text-white/80">then book verified stays and coordinate transport in one flow.</span>
              </p>

              {/* Country indicators */}
              <div className="mt-5 flex flex-wrap items-center gap-4">
                {[
                  { name: 'Tanzania', colors: ['#1eb53a','#fcd116','#00a3dd','#000000'] },
                  { name: 'Kenya',    colors: ['#006600','#cc0001','#ffffff','#000000'] },
                  { name: 'Uganda',   colors: ['#000000','#fcdc04','#da121a'] },
                ].map(c => (
                  <div key={c.name} className="flex items-center gap-2">
                    <div className="flex rounded-full overflow-hidden h-2 w-12">
                      {c.colors.map((col, i) => (
                        <div key={i} className="flex-1 h-full" style={{ background: col }} />
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold tracking-wide text-white/50">{c.name}</span>
                  </div>
                ))}
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

          {/* ── What people say — distinct quote-accent style ── */}
          <div className="mt-14 flex items-start gap-4">
            {/* Large quote mark as a visual anchor */}
            <span className="hidden sm:block text-[4.5rem] leading-none font-black bg-gradient-to-b from-[#02b4f5] to-[#02665e] bg-clip-text text-transparent -mt-3 select-none" aria-hidden>&ldquo;</span>

            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-400 mb-2">Voices</p>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.15] text-slate-900">
                What people <span className="bg-gradient-to-r from-[#02b4f5] to-[#02665e] bg-clip-text text-transparent">say</span>
              </h2>

              <p className="mt-2 max-w-[52ch] text-sm sm:text-[15px] leading-relaxed text-slate-500">
                Feedback from travelers and operators {" "}
                <span className="font-medium text-slate-700">focused on what matters most.</span>
              </p>
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
