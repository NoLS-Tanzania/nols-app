"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  LocateFixed,
  ChevronsUpDown,
  MoreVertical,
  CreditCard,
  Smartphone,
  BadgeCheck,
  UsersRound,
  Hospital,
  BadgeAlert,
  Plane,
  Bus,
  Fuel,
  Route,
  Car,
  Coffee,
  UtensilsCrossed,
  Beer,
  Waves,
  Thermometer,
  WashingMachine,
  ConciergeBell,
  Shield,
  Bandage,
  FireExtinguisher,
  ShoppingBag,
  Store,
  PartyPopper,
  Gamepad2,
  Dumbbell,
  Tag,
} from "lucide-react";
import SectionSeparator from "../../../components/SectionSeparator";
import { REGIONS } from "@/lib/tzRegions";
import { REGIONS_FULL_DATA } from "@/lib/tzRegionsFull";
import PublicApprovedPropertyCard from "../../../components/PublicApprovedPropertyCard";

type PublicPropertyCard = {
  id: number;
  slug: string;
  title: string;
  type: string;
  location: string;
  ward?: string | null;
  services?: any; // Can be array of strings OR object with commissionPercent and discountRules
  primaryImage: string | null;
  basePrice: number | null;
  currency: string | null;
  maxGuests: number | null;
  totalBedrooms: number | null;
  totalBathrooms: number | null;
};

type ListResponse = {
  items: PublicPropertyCard[];
  total: number;
  page: number;
  pageSize: number;
};

const PROPERTY_TYPES = [
  { key: "HOTEL", label: "Hotel" },
  { key: "LODGE", label: "Lodge" },
  { key: "APARTMENT", label: "Apartment" },
  { key: "VILLA", label: "Villa" },
  { key: "GUEST_HOUSE", label: "Guest house" },
  { key: "BUNGALOW", label: "Bungalow" },
  { key: "CONDO", label: "Condo" },
  { key: "CABIN", label: "Cabin" },
  { key: "HOMESTAY", label: "Homestay" },
  { key: "TOWNHOUSE", label: "Townhouse" },
  { key: "HOUSE", label: "House" },
  { key: "OTHER", label: "Other" },
] as const;

const AMENITIES = [
  "Free parking",
  "Breakfast included",
  "Breakfast available",
  "Restaurant",
  "Bar",
  "Pool",
  "Sauna",
  "Laundry",
  "Room service",
  "24h security",
  "First aid",
  "Fire extinguisher",
  "On-site shop",
  "Nearby mall",
  "Social hall",
  "Sports & games",
  "Gym",
] as const;

type Amenity = (typeof AMENITIES)[number];

const PRICE_BUCKETS: Array<{ label: string; min: number | null; max: number | null }> = [
  { label: "Any", min: null, max: null },
  { label: "5k–20k", min: 5_000, max: 20_000 },
  { label: "20k–40k", min: 20_000, max: 40_000 },
  { label: "40k–80k", min: 40_000, max: 80_000 },
  { label: "80k–100k", min: 80_000, max: 100_000 },
  { label: "100k–400k", min: 100_000, max: 400_000 },
  { label: "400k+", min: 400_000, max: null }, // "any million"
] as const;

const PAYMENT_MODES = [
  { key: "Card", Icon: CreditCard },
  { key: "Mobile money", Icon: Smartphone },
] as const;
type PaymentMode = (typeof PAYMENT_MODES)[number]["key"];

function priceBucketIndex(minPrice: string, maxPrice: string) {
  const min = minPrice ? Number(minPrice) : NaN;
  const max = maxPrice ? Number(maxPrice) : NaN;
  if (!Number.isFinite(min) && !Number.isFinite(max)) return 0;
  for (let i = 1; i < PRICE_BUCKETS.length; i++) {
    const b = PRICE_BUCKETS[i];
    const minOk = (b.min == null && !Number.isFinite(min)) || (b.min != null && Number.isFinite(min) && min === b.min);
    const maxOk =
      (b.max == null && !Number.isFinite(max)) ||
      (b.max != null && Number.isFinite(max) && max === b.max);
    if (minOk && maxOk) return i;
  }
  // If user typed a custom range earlier, pick the closest bucket by min
  if (Number.isFinite(min)) {
    let bestIdx = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 1; i < PRICE_BUCKETS.length; i++) {
      const b = PRICE_BUCKETS[i];
      if (b.min == null) continue;
      const dist = Math.abs(b.min - min);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }
  return 0;
}

const AMENITY_ICON_META: Record<Amenity, { Icon: LucideIcon; colorClass: string }> = {
  "Free parking": { Icon: Car, colorClass: "text-blue-600" },
  "Breakfast included": { Icon: Coffee, colorClass: "text-amber-600" },
  "Breakfast available": { Icon: Coffee, colorClass: "text-orange-600" },
  Restaurant: { Icon: UtensilsCrossed, colorClass: "text-rose-600" },
  Bar: { Icon: Beer, colorClass: "text-purple-600" },
  Pool: { Icon: Waves, colorClass: "text-cyan-600" },
  Sauna: { Icon: Thermometer, colorClass: "text-orange-600" },
  Laundry: { Icon: WashingMachine, colorClass: "text-indigo-600" },
  "Room service": { Icon: ConciergeBell, colorClass: "text-emerald-700" },
  "24h security": { Icon: Shield, colorClass: "text-red-600" },
  "First aid": { Icon: Bandage, colorClass: "text-green-700" },
  "Fire extinguisher": { Icon: FireExtinguisher, colorClass: "text-red-600" },
  "On-site shop": { Icon: ShoppingBag, colorClass: "text-pink-600" },
  "Nearby mall": { Icon: Store, colorClass: "text-pink-600" },
  "Social hall": { Icon: PartyPopper, colorClass: "text-yellow-600" },
  "Sports & games": { Icon: Gamepad2, colorClass: "text-yellow-700" },
  Gym: { Icon: Dumbbell, colorClass: "text-slate-700" },
};

const NEARBY_SERVICE_TAGS: Array<{ tag: string; label: string; Icon: LucideIcon; colorClass: string }> = [
  { tag: "Near hospital", label: "Hospital", Icon: Hospital, colorClass: "text-rose-600" },
  { tag: "Near police station", label: "Police", Icon: BadgeAlert, colorClass: "text-indigo-600" },
  { tag: "Near airport", label: "Airport", Icon: Plane, colorClass: "text-sky-600" },
  { tag: "Near bus station", label: "Bus station", Icon: Bus, colorClass: "text-amber-700" },
  { tag: "Near petrol station", label: "Petrol station", Icon: Fuel, colorClass: "text-orange-600" },
  { tag: "Near main road", label: "Main road", Icon: Route, colorClass: "text-slate-700" },
] as const;

function buildQuery(searchParams: { toString(): string } | null | undefined) {
  const qp = new URLSearchParams(searchParams?.toString() ?? "");
  if (!qp.get("pageSize")) qp.set("pageSize", "24");
  if (!qp.get("page")) qp.set("page", "1");
  // Guests are chosen later during booking (dates/adults/children),
  // so we intentionally ignore guests filtering at browse level.
  qp.delete("guests");
  return qp;
}

function getParam(qp: URLSearchParams, key: string) {
  const v = qp.get(key);
  return v && v.trim() ? v.trim() : "";
}

function setOrDelete(qp: URLSearchParams, key: string, value: string) {
  const v = value.trim();
  if (!v) qp.delete(key);
  else qp.set(key, v);
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function nextSort(cur: string): "" | "price_asc" | "price_desc" {
  if (cur === "price_asc") return "price_desc";
  if (cur === "price_desc") return "";
  return "price_asc";
}

function parseTypesParam(qp: URLSearchParams) {
  const raw = qp.get("types") || qp.get("type") || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseAmenitiesParam(qp: URLSearchParams) {
  const raw = qp.get("amenities") || qp.get("services") || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCsvParam(qp: URLSearchParams, key: string) {
  const raw = qp.get(key) || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBoolParam(qp: URLSearchParams, key: string) {
  const v = (qp.get(key) || "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export default function PropertiesPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const qp = useMemo(() => buildQuery(sp), [sp]);
  const q = qp.get("q")?.trim() || "";
  const page = Math.max(1, Number(qp.get("page") || "1"));

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemCommission, setSystemCommission] = useState<number>(0);

  // Load system commission settings
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/public/support/system-settings`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (mounted && json?.commissionPercent !== undefined) {
            const commission = Number(json.commissionPercent);
            setSystemCommission(isNaN(commission) ? 0 : commission);
          }
        }
      } catch (e) {
        // Silently fail - will use 0 as default
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Filters UI state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filtersShown, setFiltersShown] = useState(false);
  const [filtersError, setFiltersError] = useState<string | null>(null);
  const [amenityHint, setAmenityHint] = useState<Amenity | null>(null);
  const [draft, setDraft] = useState<{
    q: string;
    sort: string;
    region: string;
    district: string;
    ward: string;
    street: string;
    minPrice: string;
    maxPrice: string;
    types: string[];
    amenities: string[];
    nearbyServices: string[];
    paymentModes: string[];
    freeCancellation: boolean;
    groupStay: boolean;
    nearbyOn: boolean;
    radiusKm: string;
    nearLat: string;
    nearLng: string;
  }>({
    q: "",
    sort: "",
    region: "",
    district: "",
    ward: "",
    street: "",
    minPrice: "",
    maxPrice: "",
    types: [],
    amenities: [],
    nearbyServices: [],
    paymentModes: [],
    freeCancellation: false,
    groupStay: false,
    nearbyOn: false,
    radiusKm: "15",
    nearLat: "",
    nearLng: "",
  });

  const locationOptions = useMemo(() => {
    const regionData = draft.region
      ? (REGIONS_FULL_DATA as any[]).find((r) => slugify(String(r?.name || "")) === draft.region) || null
      : null;
    const districts: string[] = regionData?.districts?.map((d: any) => String(d?.name || "")).filter(Boolean) || [];
    const districtData = regionData && draft.district ? regionData.districts?.find((d: any) => String(d?.name || "") === draft.district) || null : null;
    const wards: string[] = districtData?.wards?.map((w: any) => String(w?.name || "")).filter(Boolean) || [];
    const wardData = districtData && draft.ward ? districtData.wards?.find((w: any) => String(w?.name || "") === draft.ward) || null : null;
    const streets: string[] = wardData?.streets?.map((s: any) => String(s || "")).filter(Boolean) || [];
    return { districts, wards, streets };
  }, [draft.region, draft.district, draft.ward]);

  useEffect(() => {
    if (!amenityHint) return;
    const t = setTimeout(() => setAmenityHint(null), 1200);
    return () => clearTimeout(t);
  }, [amenityHint]);

  const hasNearby = Boolean(getParam(qp, "nearLat") && getParam(qp, "nearLng"));

  const appliedChips = useMemo(() => {
    const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
    const remove = (keys: string[]) => {
      const next = new URLSearchParams(qp.toString());
      keys.forEach((k) => next.delete(k));
      next.set("page", "1");
      router.push(`/public/properties?${next.toString()}`);
    };
    const qv = getParam(qp, "q");
    if (qv) chips.push({ key: "q", label: `Search: ${qv}`, onRemove: () => remove(["q"]) });
    const sort = getParam(qp, "sort");
    if (sort) {
      const label = sort === "price_asc" ? "Price: low → high" : sort === "price_desc" ? "Price: high → low" : sort.replace("_", " ");
      chips.push({ key: "sort", label: `Sort: ${label}`, onRemove: () => remove(["sort"]) });
    }
    const region = getParam(qp, "region");
    if (region) {
      const label = REGIONS.find((r: any) => String(r.id) === String(region))?.name || region;
      chips.push({ key: "region", label: `Region: ${label}`, onRemove: () => remove(["region"]) });
    }
    const district = getParam(qp, "district");
    if (district) chips.push({ key: "district", label: `District: ${district}`, onRemove: () => remove(["district"]) });
    const ward = getParam(qp, "ward");
    if (ward) chips.push({ key: "ward", label: `Ward: ${ward}`, onRemove: () => remove(["ward"]) });
    const street = getParam(qp, "street");
    if (street) chips.push({ key: "street", label: `Street: ${street}`, onRemove: () => remove(["street"]) });
    const city = getParam(qp, "city");
    if (city) chips.push({ key: "city", label: `City: ${city}`, onRemove: () => remove(["city"]) });
    const minPrice = getParam(qp, "minPrice");
    const maxPrice = getParam(qp, "maxPrice");
    if (minPrice || maxPrice) chips.push({ key: "price", label: `Price: ${minPrice || "0"}–${maxPrice || "∞"}`, onRemove: () => remove(["minPrice", "maxPrice"]) });
    const types = parseTypesParam(qp);
    if (types.length) chips.push({ key: "types", label: `Type: ${types.join(", ")}`, onRemove: () => remove(["types", "type"]) });
    const amenities = parseAmenitiesParam(qp);
    if (amenities.length) chips.push({ key: "amenities", label: `Amenities: ${amenities.join(", ")}`, onRemove: () => remove(["amenities", "services"]) });
    const nearbyServices = parseCsvParam(qp, "nearbyServices");
    if (nearbyServices.length) chips.push({ key: "nearbyServices", label: `Nearby: ${nearbyServices.map((t) => t.replace(/^Near\\s+/i, "")).join(", ")}`, onRemove: () => remove(["nearbyServices"]) });
    const paymentModes = parseCsvParam(qp, "paymentModes").filter((m) => PAYMENT_MODES.some((x) => x.key === (m as PaymentMode)));
    if (paymentModes.length) chips.push({ key: "paymentModes", label: `Payments: ${paymentModes.join(", ")}`, onRemove: () => remove(["paymentModes"]) });
    const freeCancellation = parseBoolParam(qp, "freeCancellation");
    if (freeCancellation) chips.push({ key: "freeCancellation", label: "Free cancellation", onRemove: () => remove(["freeCancellation"]) });
    const groupStay = parseBoolParam(qp, "groupStay");
    if (groupStay) chips.push({ key: "groupStay", label: "Group stay", onRemove: () => remove(["groupStay"]) });
    if (hasNearby) {
      const r = getParam(qp, "radiusKm") || "15";
      chips.push({ key: "nearby", label: `Nearby: ${r}km`, onRemove: () => remove(["nearLat", "nearLng", "radiusKm"]) });
    }
    return chips;
  }, [qp, router, hasNearby]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/properties?${qp.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load properties (${res.status})`);
        const json = (await res.json()) as ListResponse;
        if (!mounted) return;
        setData(json);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load properties");
        setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [qp]);

  const total = data?.total ?? 0;
  const pageSize = data?.pageSize ?? Number(qp.get("pageSize") || "24");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const goToPage = (nextPage: number) => {
    const next = new URLSearchParams(qp.toString());
    next.set("page", String(Math.max(1, Math.min(nextPage, totalPages))));
    router.push(`/public/properties?${next.toString()}`);
  };

  const openFilters = () => {
    setFiltersError(null);
    setDraft({
      q: getParam(qp, "q"),
      sort: getParam(qp, "sort"),
      region: getParam(qp, "region"),
      district: getParam(qp, "district"),
      ward: getParam(qp, "ward"),
      street: getParam(qp, "street"),
      minPrice: getParam(qp, "minPrice"),
      maxPrice: getParam(qp, "maxPrice"),
      types: parseTypesParam(qp),
      amenities: parseAmenitiesParam(qp),
      nearbyServices: parseCsvParam(qp, "nearbyServices"),
      paymentModes: parseCsvParam(qp, "paymentModes").filter((m) => PAYMENT_MODES.some((x) => x.key === (m as PaymentMode))),
      freeCancellation: parseBoolParam(qp, "freeCancellation"),
      groupStay: parseBoolParam(qp, "groupStay"),
      nearbyOn: Boolean(getParam(qp, "nearLat") && getParam(qp, "nearLng")),
      radiusKm: getParam(qp, "radiusKm") || "15",
      nearLat: getParam(qp, "nearLat"),
      nearLng: getParam(qp, "nearLng"),
    });
    setFiltersOpen(true);
    // allow mount before transition in
    requestAnimationFrame(() => setFiltersShown(true));
  };

  const closeFilters = () => {
    setFiltersShown(false);
    // let exit animation play before unmount
    window.setTimeout(() => setFiltersOpen(false), 180);
  };

  const applyFilters = () => {
    const next = new URLSearchParams(qp.toString());
    // reset paging when filters change
    next.set("page", "1");

    setOrDelete(next, "q", draft.q);
    setOrDelete(next, "sort", draft.sort);
    setOrDelete(next, "region", draft.region);
    setOrDelete(next, "district", draft.district);
    setOrDelete(next, "ward", draft.ward);
    setOrDelete(next, "street", draft.street);
    setOrDelete(next, "minPrice", draft.minPrice);
    setOrDelete(next, "maxPrice", draft.maxPrice);

    // types
    next.delete("type");
    if (draft.types.length) next.set("types", draft.types.join(","));
    else next.delete("types");

    // amenities
    next.delete("services");
    if (draft.amenities.length) next.set("amenities", draft.amenities.join(","));
    else next.delete("amenities");

    // nearby services tags
    if (draft.nearbyServices.length) next.set("nearbyServices", draft.nearbyServices.join(","));
    else next.delete("nearbyServices");

    // more filters
    const allowedModes = draft.paymentModes.filter((m) => PAYMENT_MODES.some((x) => x.key === (m as PaymentMode)));
    if (allowedModes.length) next.set("paymentModes", allowedModes.join(","));
    else next.delete("paymentModes");
    if (draft.freeCancellation) next.set("freeCancellation", "1");
    else next.delete("freeCancellation");
    if (draft.groupStay) next.set("groupStay", "1");
    else next.delete("groupStay");

    // nearby
    if (draft.nearbyOn && draft.nearLat && draft.nearLng) {
      setOrDelete(next, "nearLat", draft.nearLat);
      setOrDelete(next, "nearLng", draft.nearLng);
      setOrDelete(next, "radiusKm", draft.radiusKm || "15");
    } else {
      next.delete("nearLat");
      next.delete("nearLng");
      next.delete("radiusKm");
    }

    router.push(`/public/properties?${next.toString()}`);
    closeFilters();
  };

  const clearFilters = () => {
    const next = new URLSearchParams(qp.toString());
    ["q","sort","region","district","ward","street","minPrice","maxPrice","types","type","amenities","services","nearbyServices","paymentModes","freeCancellation","groupStay","nearLat","nearLng","radiusKm","city"].forEach((k) => next.delete(k));
    next.set("page", "1");
    router.push(`/public/properties?${next.toString()}`);
    closeFilters();
  };

  const requestNearby = async () => {
    setFiltersError(null);
    setFiltersError(null);
    if (!navigator.geolocation) {
      setFiltersError("Geolocation is not supported on this device/browser.");
      return;
    }
    setFiltersError("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setDraft((d) => ({
          ...d,
          nearbyOn: true,
          nearLat: lat.toFixed(6),
          nearLng: lng.toFixed(6),
        }));
        setFiltersError(null);
      },
      (err) => {
        setFiltersError(err?.message || "Failed to get location permission.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 }
    );
  };

  return (
    <main className="relative min-h-screen bg-white text-slate-900 header-offset">
      <section className="py-8">
        <div className="public-container">
          <div className="flex flex-col gap-3">
            <div className="w-full min-w-0">
              {/* Premium header card */}
              <div className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] p-[1px] shadow-[0_20px_60px_rgba(2,102,94,0.22)]" style={{ background: 'linear-gradient(135deg,rgba(2,102,94,0.75) 0%,rgba(2,180,245,0.40) 50%,rgba(2,102,94,0.65) 100%)' }}>
                <div className="relative overflow-hidden rounded-[27px] sm:rounded-[35px] px-6 sm:px-10 py-7 sm:py-8" style={{ background: 'linear-gradient(140deg,#012e29 0%,#013530 55%,#01241f 100%)' }}>

                  {/* Ambient glows */}
                  <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 rounded-full" style={{ background: 'radial-gradient(circle,rgba(2,180,245,0.22) 0%,transparent 65%)' }} aria-hidden />
                  <div className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 rounded-full" style={{ background: 'radial-gradient(circle,rgba(2,102,94,0.18) 0%,transparent 65%)' }} aria-hidden />
                  <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 0%,rgba(2,102,94,0.18),transparent 70%)' }} aria-hidden />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
                    {/* Left: title + tagline */}
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-xs font-bold tracking-[0.20em] uppercase mb-2.5" style={{ color: '#02b4f5' }}>
                        Verified &amp; Trusted
                      </p>
                      <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold tracking-tight leading-[1.1] text-white">
                        {q
                          ? <>{`Search results for `}<span style={{ color: '#02b4f5' }}>&ldquo;{q}&rdquo;</span></>
                          : 'Properties'}
                      </h1>
                      <p className="mt-2.5 text-sm sm:text-base font-medium" style={{ color: 'rgba(255,255,255,0.52)' }}>
                        Trusted listings, smooth booking, reliable support.
                      </p>
                    </div>

                    {/* Right: badges */}
                    <div className="flex flex-row sm:flex-col items-start sm:items-end gap-2 shrink-0 flex-wrap">
                      <div className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)' }}>
                        <BadgeCheck className="w-3.5 h-3.5 flex-none" style={{ color: '#10b981' }} />
                        {loading ? (
                          'Loading…'
                        ) : (
                          <><span className="tabular-nums">{total.toLocaleString()}</span>&nbsp;verified &amp; approved listings</>
                        )}
                      </div>
                      <Link
                        href="/public"
                        className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02b4f5]/40"
                        style={{ color: '#02b4f5', background: 'rgba(2,180,245,0.08)', border: '1px solid rgba(2,180,245,0.22)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(2,180,245,0.16)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(2,180,245,0.08)')}
                      >
                        <Search className="w-3.5 h-3.5 flex-none" />
                        Refine search on home
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <SectionSeparator pillLabel="Browse" className="my-5" />

          {/* Filters row */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="flex-1 flex justify-center">
                <div
                  className={[
                    "w-full max-w-4xl",
                    "flex flex-row items-center gap-1.5",
                    "rounded-full p-1.5",
                    "bg-white/85 backdrop-blur-xl",
                    "border border-slate-200",
                    "ring-1 ring-slate-200/70",
                    "shadow-sm",
                    "overflow-hidden",
                    "transition-all",
                    "hover:shadow-md hover:ring-slate-300/70",
                    "focus-within:shadow-md focus-within:ring-2 focus-within:ring-[#02665e]/15 focus-within:border-[#02665e]/30",
                  ].join(" ")}
                >
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={getParam(qp, "q")}
                      onChange={(e) => {
                        const next = new URLSearchParams(qp.toString());
                        next.set("page", "1");
                        setOrDelete(next, "q", e.target.value);
                        router.push(`/public/properties?${next.toString()}`);
                      }}
                      placeholder="Search by region, district, city, title…"
                      className={[
                        "w-full min-w-0",
                        "rounded-full",
                        "border border-transparent",
                        "bg-transparent",
                        "px-3 py-2.5 pl-10",
                        "text-sm",
                        "placeholder:text-slate-400",
                        "focus:outline-none",
                      ].join(" ")}
                    />
                  </div>

                  <div className="flex items-center gap-1 flex-none whitespace-nowrap border-l border-slate-200/80 pl-1.5">
                    <button
                      type="button"
                      onClick={openFilters}
                      aria-label="Filters"
                      title="Filters"
                      className={[
                        "relative flex-none",
                        "h-10 w-10",
                        "rounded-full",
                        "border border-transparent",
                        "bg-transparent",
                        "inline-flex items-center justify-center",
                        "hover:bg-slate-50",
                        "active:bg-slate-100",
                        "transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                      ].join(" ")}
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                      {appliedChips.length > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-[#02665e]/10 text-[#02665e] text-[11px] font-bold">
                          {appliedChips.length}
                        </span>
                      )}
                    </button>

                    {(() => {
                      const cur = getParam(qp, "sort");
                      const setSort = (v: "" | "price_asc" | "price_desc") => {
                        const next = new URLSearchParams(qp.toString());
                        next.set("page", "1");
                        setOrDelete(next, "sort", v);
                        router.push(`/public/properties?${next.toString()}`);
                      };
                      const label =
                        cur === "price_asc"
                          ? "Price: low → high"
                          : cur === "price_desc"
                            ? "Price: high → low"
                            : "Price: none";
                      const iconColor =
                        cur === "price_asc"
                          ? "text-emerald-700"
                          : cur === "price_desc"
                            ? "text-rose-600"
                            : "text-slate-700";
                      return (
                        <button
                          type="button"
                          onClick={() => setSort(nextSort(cur))}
                          className={[
                            "h-10 w-10 rounded-full border flex items-center justify-center",
                            "bg-transparent",
                            "border-transparent",
                            "hover:bg-slate-50 active:bg-slate-100 transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                          ].join(" ")}
                          aria-label={`Sort (${label})`}
                          title={label}
                        >
                          <ChevronsUpDown className={["w-5 h-5", iconColor].join(" ")} />
                        </button>
                      );
                    })()}

                    {/* More filters (3-dots) */}
                    <div className="relative">
                      <button
                        type="button"
                        disabled
                        className={[
                          "h-10 w-10 rounded-full border flex items-center justify-center",
                          "bg-transparent",
                          "border-transparent",
                          "opacity-40 cursor-not-allowed",
                          "transition-colors",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                        ].join(" ")}
                        aria-label="More filters (disabled)"
                        title="More filters (disabled)"
                      >
                        <MoreVertical className="w-5 h-5 text-slate-700" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Applied filter chips */}
            {appliedChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {appliedChips.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={c.onRemove}
                    className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                    title="Remove filter"
                  >
                    <span className="truncate max-w-[14rem]">{c.label}</span>
                    <X className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-700" />
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => clearFilters()}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                  <div className="aspect-square bg-slate-100 animate-pulse" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-2/3 bg-slate-100 animate-pulse rounded" />
                    <div className="h-3 w-1/2 bg-slate-100 animate-pulse rounded" />
                    <div className="h-3 w-1/3 bg-slate-100 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && !error && (data?.items?.length ?? 0) === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-base font-semibold text-slate-900">No approved properties found</div>
              <div className="text-sm text-slate-600 mt-1">
                If you just approved a property, refresh in a moment — it will appear here automatically.
              </div>
            </div>
          )}

          {!loading && !error && (data?.items?.length ?? 0) > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
                {(data?.items ?? []).map((p) => (
                  <PublicApprovedPropertyCard key={p.id} p={p} systemCommission={systemCommission} />
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-8 flex items-center justify-end gap-3 w-full">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-sm text-slate-700">
                  Page <span className="font-semibold">{page}</span> / {totalPages}
                </div>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}

          <SectionSeparator className="mt-10" />
        </div>
      </section>

      {/* Filters modal (mobile + desktop) */}
      {filtersOpen && (
        <div className="fixed inset-x-0 bottom-4 sm:bottom-6 z-[120] px-4 sm:px-6 pointer-events-none">
          <div
            className={[
              "relative w-full max-w-[28rem] sm:max-w-[26rem] mr-auto pointer-events-auto",
              "rounded-2xl overflow-hidden",
              // Prevent the panel from reaching the fixed header on short screens
              "max-h-[calc(100vh-var(--header-height)-6rem)]",
              "flex flex-col",
              // Glass + subtle gradient
              "bg-gradient-to-br from-white/85 via-white/75 to-emerald-50/70",
              "backdrop-blur-md",
              "border border-white/60 ring-1 ring-slate-200/70",
              // Smooth enter/exit (keeps the old placement)
              "transition-all duration-200 ease-out",
              "motion-reduce:transition-none",
              filtersShown ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-[0.98]",
              // Soft elevation & interaction
              "shadow-xl hover:shadow-2xl transition-shadow",
            ].join(" ")}
          >
            <div className="px-4 py-3 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-900">Filters</div>
                <div className="text-xs text-slate-500 mt-0.5">Search by location, price, nearby, and more</div>
              </div>
              <button
                type="button"
                onClick={closeFilters}
                className={[
                  "h-9 w-9 rounded-xl border border-slate-200 bg-white",
                  "flex items-center justify-center",
                  "hover:bg-slate-50 active:bg-slate-100",
                  "transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                ].join(" ")}
                aria-label="Close filters"
              >
                <X className="w-4 h-4 text-slate-700 transition-transform duration-150 ease-out hover:rotate-90" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 overscroll-contain">
              {/* Sort (inside panel for mobile convenience) */}
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Sort</div>
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, sort: nextSort(d.sort) }))}
                  className={[
                    "h-9 w-9 rounded-xl border flex items-center justify-center",
                    "bg-white/70 backdrop-blur",
                    draft.sort ? "border-slate-300 shadow-sm" : "border-slate-200",
                    "hover:bg-white hover:shadow-md transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  ].join(" ")}
                  aria-label={
                    draft.sort === "price_asc"
                      ? "Sort (Price: low → high)"
                      : draft.sort === "price_desc"
                        ? "Sort (Price: high → low)"
                        : "Sort (Price: none)"
                  }
                  title={
                    draft.sort === "price_asc"
                      ? "Price: low → high"
                      : draft.sort === "price_desc"
                        ? "Price: high → low"
                        : "Price: none"
                  }
                >
                  <ChevronsUpDown
                    className={[
                      "w-5 h-5",
                      draft.sort === "price_asc"
                        ? "text-emerald-700"
                        : draft.sort === "price_desc"
                          ? "text-rose-600"
                          : "text-slate-700",
                    ].join(" ")}
                  />
                </button>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-900">Region</label>
                  <select
                    value={draft.region}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        region: e.target.value,
                        // Reset dependent fields when region changes
                        district: "",
                        ward: "",
                        street: "",
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e]"
                  >
                    <option value="">Any region</option>
                    {REGIONS.map((r: any) => (
                      <option key={r.id} value={String(r.id)}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-900">District</label>
                  <select
                    value={draft.district}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        district: e.target.value,
                        // Reset dependent fields when district changes
                        ward: "",
                        street: "",
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e]"
                    disabled={!draft.region}
                  >
                    <option value="">{draft.region ? "Any district" : "Select region first"}</option>
                    {locationOptions.districts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-900">Ward</label>
                  <select
                    value={draft.ward}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        ward: e.target.value,
                        // Reset dependent field when ward changes
                        street: "",
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e]"
                    disabled={!draft.region || !draft.district}
                  >
                    <option value="">{draft.district ? "Any ward" : draft.region ? "Select district first" : "Select region first"}</option>
                    {locationOptions.wards.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-900">Street</label>
                  <select
                    value={draft.street}
                    onChange={(e) => setDraft((d) => ({ ...d, street: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e]"
                    disabled={!draft.region || !draft.district || !draft.ward}
                  >
                    <option value="">{draft.ward ? "Any street" : draft.district ? "Select ward first" : draft.region ? "Select district first" : "Select region first"}</option>
                    {locationOptions.streets.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
                  <div className="space-y-2 min-w-0 md:col-span-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-semibold text-slate-900">Price range</label>
                      <div className="text-xs font-semibold text-slate-700">{PRICE_BUCKETS[priceBucketIndex(draft.minPrice, draft.maxPrice)]?.label}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "budget", label: "Budget", bucketLabel: "5k–20k" },
                        { key: "mid", label: "Mid", bucketLabel: "40k–80k" },
                        { key: "premium", label: "Premium", bucketLabel: "100k–400k" },
                      ].map((p) => {
                        const idx = PRICE_BUCKETS.findIndex((b) => b.label === p.bucketLabel);
                        const active = idx >= 0 && priceBucketIndex(draft.minPrice, draft.maxPrice) === idx;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => {
                              const b = PRICE_BUCKETS[idx] || PRICE_BUCKETS[0];
                              setDraft((d) => ({
                                ...d,
                                minPrice: b.min == null ? "" : String(b.min),
                                maxPrice: b.max == null ? "" : String(b.max),
                              }));
                            }}
                            className={[
                              "inline-flex items-center justify-center h-8 px-3 rounded-full border text-xs font-semibold transition-colors",
                              active
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                            ].join(" ")}
                          >
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={PRICE_BUCKETS.length - 1}
                      step={1}
                      value={priceBucketIndex(draft.minPrice, draft.maxPrice)}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        const b = PRICE_BUCKETS[idx] || PRICE_BUCKETS[0];
                        setDraft((d) => ({
                          ...d,
                          minPrice: b.min == null ? "" : String(b.min),
                          maxPrice: b.max == null ? "" : String(b.max),
                        }));
                      }}
                      className="w-full"
                      aria-label="Price range"
                    />
                    <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500">
                      {["Any", "20k", "40k", "80k", "100k", "400k", "1M+"].map((t) => (
                        <div key={t} className="text-center">
                          {t}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Types */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-900">Property type</label>
                  {draft.types.length > 0 && (
                    <button type="button" className="text-xs font-semibold text-slate-700 hover:underline" onClick={() => setDraft((d) => ({ ...d, types: [] }))}>
                      Clear types
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {PROPERTY_TYPES.map((t) => {
                    const checked = draft.types.includes(t.key);
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() =>
                          setDraft((d) => {
                            const next = checked ? d.types.filter((x) => x !== t.key) : [...d.types, t.key];
                            return { ...d, types: next };
                          })
                        }
                        className={[
                          "text-left rounded-xl border px-3 py-2 text-sm transition",
                          checked ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-900",
                        ].join(" ")}
                        aria-pressed={checked}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amenities */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-900">Amenities</label>
                  {draft.amenities.length > 0 && (
                    <button type="button" className="text-xs font-semibold text-slate-700 hover:underline" onClick={() => setDraft((d) => ({ ...d, amenities: [] }))}>
                      Clear amenities
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {AMENITIES.map((a) => {
                    const checked = draft.amenities.includes(a);
                    const meta = AMENITY_ICON_META[a];
                    const Icon = meta?.Icon || Tag;
                    return (
                      <button
                        key={a}
                        type="button"
                        onPointerDown={(e) => {
                          // Show name briefly on touch/pen (mobile/tablet)
                          if (e.pointerType !== "mouse") setAmenityHint(a);
                        }}
                        onClick={() =>
                          setDraft((d) => {
                            const next = checked ? d.amenities.filter((x) => x !== a) : [...d.amenities, a];
                            return { ...d, amenities: next };
                          })
                        }
                        className={[
                          "group relative w-full rounded-full border transition select-none",
                          "h-12 flex items-center justify-center",
                          checked ? "border-emerald-600 bg-emerald-600 text-white shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-900",
                        ].join(" ")}
                        aria-pressed={checked}
                        aria-label={a}
                        title={a}
                      >
                        <Icon className={["w-5 h-5", checked ? "text-white" : meta.colorClass].join(" ")} aria-hidden />
                        <span
                          className={[
                            "pointer-events-none absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full",
                            "whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold shadow-lg ring-1 ring-black/5",
                            checked ? "bg-emerald-700 text-white" : "bg-slate-900 text-white",
                            "opacity-0 transition-opacity duration-150",
                            "group-hover:opacity-100 group-focus-visible:opacity-100",
                            amenityHint === a ? "opacity-100" : "",
                          ].join(" ")}
                        >
                          {a}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nearby services */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold text-slate-900">Nearby services</label>
                  {draft.nearbyServices.length > 0 && (
                    <button type="button" className="text-xs font-semibold text-slate-700 hover:underline" onClick={() => setDraft((d) => ({ ...d, nearbyServices: [] }))}>
                      Clear
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
                  {NEARBY_SERVICE_TAGS.map(({ tag, label, Icon, colorClass }) => {
                    const checked = draft.nearbyServices.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setDraft((d) => {
                            const next = checked ? d.nearbyServices.filter((x) => x !== tag) : [...d.nearbyServices, tag];
                            return { ...d, nearbyServices: next };
                          })
                        }
                        className={[
                          "group relative w-full rounded-full border transition select-none",
                          "h-11 flex items-center justify-center",
                          checked ? "border-emerald-600 bg-emerald-600 text-white shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50 text-slate-900",
                        ].join(" ")}
                        aria-pressed={checked}
                        aria-label={label}
                        title={label}
                      >
                        <Icon className={["w-5 h-5", checked ? "text-white" : colorClass].join(" ")} aria-hidden />
                        <span
                          className={[
                            "pointer-events-none absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full",
                            "whitespace-nowrap rounded-lg px-2 py-1 text-xs font-semibold shadow-lg ring-1 ring-black/5",
                            checked ? "bg-emerald-700 text-white" : "bg-slate-900 text-white",
                            "opacity-0 transition-opacity duration-150",
                            "group-hover:opacity-100 group-focus-visible:opacity-100",
                          ].join(" ")}
                        >
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Payments, cancellation, group stay */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Payments & policies</div>
                    <div className="text-xs text-slate-600 mt-0.5">Payments, cancellation, group stay</div>
                  </div>
                  {(draft.paymentModes.length > 0 || draft.freeCancellation || draft.groupStay) && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-700 hover:underline"
                      onClick={() => setDraft((d) => ({ ...d, paymentModes: [], freeCancellation: false, groupStay: false }))}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-2">Payment modes</div>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_MODES.map(({ key, Icon }) => {
                      const checked = draft.paymentModes.includes(key);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() =>
                            setDraft((d) => {
                              const next = checked ? d.paymentModes.filter((x) => x !== key) : [...d.paymentModes, key];
                              return { ...d, paymentModes: next };
                            })
                          }
                          className={[
                            "h-10 rounded-xl border flex items-center justify-center active:scale-[0.98]",
                            "motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0",
                            checked
                              ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                              : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
                            "transition-all duration-200",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                          ].join(" ")}
                          aria-pressed={checked}
                          aria-label={key}
                          title={key}
                        >
                          <Icon className={["w-5 h-5", checked ? "text-white" : "text-slate-700"].join(" ")} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  {([
                    { key: "freeCancellation", label: "Free cancellation", Icon: BadgeCheck },
                    { key: "groupStay", label: "Group stay", Icon: UsersRound },
                  ] as const).map(({ key, label, Icon }) => {
                    const checked = key === "freeCancellation" ? draft.freeCancellation : draft.groupStay;
                    const toggle = () =>
                      setDraft((d) =>
                        key === "freeCancellation"
                          ? { ...d, freeCancellation: !d.freeCancellation }
                          : { ...d, groupStay: !d.groupStay }
                      );
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={toggle}
                        className={[
                          "w-full h-10 rounded-xl border px-3 flex items-center justify-between active:scale-[0.99]",
                          "motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0",
                          checked
                            ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
                          "transition-all duration-200",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                        ].join(" ")}
                        aria-pressed={checked}
                      >
                        <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                          <Icon className={["w-4 h-4", checked ? "text-white" : "text-slate-700"].join(" ")} />
                          {label}
                        </span>
                        <span className="inline-flex items-center gap-2" aria-hidden>
                          <span className={["text-[11px] font-semibold tracking-wide", checked ? "text-white/80" : "text-slate-500"].join(" ")}>
                            {checked ? "ON" : "OFF"}
                          </span>
                          <span
                            className={[
                              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                              checked ? "bg-white/30" : "bg-slate-200",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ease-out",
                                checked ? "translate-x-4" : "translate-x-1",
                              ].join(" ")}
                            />
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nearby */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Nearby me</div>
                    <div className="text-xs text-slate-600 mt-0.5">Use your device location to show listings around you.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (draft.nearbyOn) {
                        setDraft((d) => ({ ...d, nearbyOn: false, nearLat: "", nearLng: "" }));
                        return;
                      }
                      requestNearby();
                    }}
                    className={[
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold border",
                      draft.nearbyOn ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <LocateFixed className="w-4 h-4" />
                    {draft.nearbyOn ? "On" : "Enable"}
                  </button>
                </div>
                {draft.nearbyOn && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-900">Radius (km)</label>
                      <input
                        type="range"
                        min={1}
                        max={50}
                        value={Number(draft.radiusKm || "15")}
                        onChange={(e) => setDraft((d) => ({ ...d, radiusKm: String(e.target.value) }))}
                        className="w-full"
                      />
                      <div className="text-xs text-slate-700">{draft.radiusKm || "15"} km</div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-slate-900">Detected location</label>
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                        {draft.nearLat && draft.nearLng ? `${draft.nearLat}, ${draft.nearLng}` : "—"}
                      </div>
                      <div className="text-[11px] text-slate-500">We only use this to filter nearby listings.</div>
                    </div>
                  </div>
                )}
                {filtersError && (
                  <div className="mt-3 text-xs text-slate-700">{filtersError}</div>
                )}
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-100">
              <div className="text-xs text-slate-600 mb-2">
                {loading ? "Loading results…" : `Showing ${total.toLocaleString()} results`}
              </div>
              <div className="flex items-center justify-between gap-2 flex-nowrap">
                <button
                  type="button"
                  onClick={clearFilters}
                  className={[
                    "inline-flex items-center justify-center",
                    "h-10 px-3 sm:px-4 rounded-xl",
                    "text-sm font-semibold text-slate-700 whitespace-nowrap",
                    "border border-slate-200 bg-white",
                    "hover:bg-slate-50 active:bg-slate-100",
                    "transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  ].join(" ")}
                >
                  <span className="sm:hidden">Clear</span>
                  <span className="hidden sm:inline">Clear all</span>
                </button>
                <div className="flex items-center justify-end gap-2 flex-nowrap">
                  <button
                    type="button"
                    onClick={closeFilters}
                    className={[
                      "inline-flex items-center justify-center",
                      "h-10 px-3 sm:px-4 rounded-xl",
                      "border border-slate-200 bg-white",
                      "text-sm font-semibold text-slate-700 whitespace-nowrap",
                      "hover:bg-slate-50 active:bg-slate-100",
                      "transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    ].join(" ")}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyFilters}
                    className={[
                      "inline-flex items-center justify-center",
                      "h-10 px-4 sm:px-5 rounded-xl",
                      "bg-[#02665e] text-white",
                      "text-sm font-semibold whitespace-nowrap",
                      "shadow-sm hover:shadow-md",
                      "hover:bg-[#014e47] active:bg-[#013a35]",
                      "transition-all duration-200 motion-safe:active:scale-[0.99]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    ].join(" ")}
                  >
                    <span className="sm:hidden">Apply</span>
                    <span className="hidden sm:inline">Apply filters</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

