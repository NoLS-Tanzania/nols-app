"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { ReactNode, ComponentType } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  MapPin,
  Users,
  BedDouble,
  Bath,
  ShieldCheck,
  ChevronLeft,
  ImageIcon,
  Eye,
  FileText,
  Tag,
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
  Sparkles,
  CreditCard,
  Banknote,
  Building2,
  BadgeCheck,
  UsersRound,
  Fuel,
  Bus,
  Hospital,
  Route,
  ExternalLink,
  Plane,
  Tags,
  DoorClosed,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  CheckCircle2,
  CigaretteOff,
  MessageSquare,
  Map as MapIcon,
  Lock,
  Share2,
  Info,
  AlertCircle,
  Clock,
  PlayCircle,
  ExternalLink as ExternalLinkIcon,
  Heart,
  Copy,
  Mail,
  Facebook,
  Twitter,
  Home,
  Loader2,
  Calendar,
  Plus,
  Minus,
} from "lucide-react";
import VerifiedIcon from "../../../../components/VerifiedIcon";
import DatePicker from "../../../../components/ui/DatePicker";
import { PropertyVisualizationPreview } from "@/app/(owner)/owner/properties/add/_components/PropertyVisualizationPreview";
import { 
  getPropertyCommission, 
  calculatePriceWithCommission
} from "../../../../lib/priceUtils";
import { BATHROOM_ICONS, OTHER_AMENITIES_ICONS } from "../../../../lib/amenityIcons";

type PublicPropertyDetail = {
  id: number;
  slug: string;
  title: string;
  type: string;
  description: string | null;
  regionName: string | null;
  district: string | null;
  city: string | null;
  street: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  basePrice: number | null;
  currency: string | null;
  maxGuests: number | null;
  totalBedrooms: number | null;
  totalBathrooms: number | null;
  buildingType: string | null;
  totalFloors: number | null;
  services: string[];
  roomsSpec: any[];
  ownerId?: number;
  verificationVideoUrl?: string | null;
  houseRules?: string | string[] | {
    checkIn?: string;
    checkOut?: string;
    smoking?: boolean;
    pets?: boolean;
    petsNote?: string;
    parties?: string;
    safetyMeasures?: string[];
    other?: string;
  } | null;
  faq?: Array<{ question?: string; answer?: string; q?: string; a?: string }> | null;
};

type ReviewUser = { id: number; name: string | null };
type PropertyReview = {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  isVerified: boolean;
  ownerResponse: string | null;
  ownerResponseAt: string | null;
  createdAt: string;
  user: ReviewUser;
};

type ReviewsResponse = {
  reviews: PropertyReview[];
  stats: {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Record<string, number>;
    categoryAverages: Record<string, number> | null;
  };
};

type PolicyItem = {
  text: string;
  Icon?: ComponentType<{ className?: string }>;
  iconColor?: string;
};

type RoomSpecRow = {
  roomType: string;
  roomCode?: string; // Room code from roomsSpec
  roomsCount: number | null;
  bedsSummary: string;
  description: string;
  amenities: string[];
  bathItems: string[];
  bathPrivate?: string; // "yes" | "no" | undefined
  pricePerNight: number | null;
  discountLabel: string | null;
  payActionLabel: string;
  policies: PolicyItem[];
};

function amenityMeta(label: string): { Icon: any; colorClass: string } {
  const key = String(label || "").trim().toLowerCase();
  const map: Record<string, { Icon: any; colorClass: string }> = {
    "free parking": { Icon: Car, colorClass: "text-blue-600" },
    "breakfast included": { Icon: Coffee, colorClass: "text-amber-600" },
    "breakfast available": { Icon: Coffee, colorClass: "text-orange-600" },
    restaurant: { Icon: UtensilsCrossed, colorClass: "text-rose-600" },
    bar: { Icon: Beer, colorClass: "text-purple-600" },
    pool: { Icon: Waves, colorClass: "text-cyan-600" },
    sauna: { Icon: Thermometer, colorClass: "text-orange-600" },
    laundry: { Icon: WashingMachine, colorClass: "text-indigo-600" },
    "room service": { Icon: ConciergeBell, colorClass: "text-emerald-700" },
    "24h security": { Icon: Shield, colorClass: "text-red-600" },
    "first aid": { Icon: Bandage, colorClass: "text-green-700" },
    "fire extinguisher": { Icon: FireExtinguisher, colorClass: "text-red-600" },
    "on-site shop": { Icon: ShoppingBag, colorClass: "text-pink-600" },
    "nearby mall": { Icon: Store, colorClass: "text-pink-600" },
    "social hall": { Icon: PartyPopper, colorClass: "text-yellow-600" },
    "sports & games": { Icon: Gamepad2, colorClass: "text-yellow-700" },
    gym: { Icon: Dumbbell, colorClass: "text-slate-700" },
  };
  return map[key] ?? { Icon: Tag, colorClass: "text-slate-500" };
}

function PaymentLogo({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="inline-flex items-center justify-center rounded-md bg-white/90 ring-1 ring-black/5 p-1.5 shadow-sm">
      <Image src={src} alt={alt} width={32} height={32} className="h-[28px] w-[28px] object-contain" />
    </span>
  );
}

function PaymentModePill({ mode }: { mode: string }) {
  const m = String(mode || "").trim();
  const key = m.toLowerCase();

  const baseCls = [
    "group w-full inline-flex items-center gap-2 rounded-xl border px-3 py-2",
    "bg-slate-50 border-slate-200 text-slate-800",
    "shadow-sm shadow-transparent select-none",
    "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out",
    "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm",
    "hover:bg-white hover:border-slate-300",
    "active:scale-[0.98]",
    "whitespace-nowrap",
  ].join(" ");

  if (key === "mobile money" || key === "mobilemoney" || key === "momo") {
    return (
      <div className={[baseCls, "justify-between"].join(" ")} title="Mobile money">
        <span className="text-sm font-semibold text-slate-700">Mobile money</span>
        <span className="inline-flex items-center gap-2">
          <PaymentLogo src="/assets/M-pesa.png" alt="M-Pesa" />
          <PaymentLogo src="/assets/mix%20by%20yas.png" alt="Tigo Pesa (Yas)" />
          <PaymentLogo src="/assets/airtel_money.png" alt="Airtel Money" />
          <PaymentLogo src="/assets/halopesa.png" alt="HaloPesa" />
        </span>
      </div>
    );
  }

  if (key === "card" || key === "cards") {
    return (
      <div className={[baseCls, "justify-between"].join(" ")} title="Card payments">
        <span className="text-sm font-semibold text-slate-700">Card</span>
        <span className="inline-flex items-center gap-2">
          <PaymentLogo src="/assets/visa_card.png" alt="Visa card" />
        </span>
      </div>
    );
  }

  if (key === "cash") {
    return (
      <div className={[baseCls, "justify-between"].join(" ")} title="Cash">
        <span className="text-sm font-semibold text-slate-700">Cash</span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-md bg-white/90 ring-1 ring-black/5 p-1.5 shadow-sm">
            <Banknote className="h-[28px] w-[28px] text-green-600 flex-shrink-0" aria-hidden />
          </span>
        </span>
      </div>
    );
  }

  if (key === "bank transfer" || key === "banktransfer") {
    return (
      <div className={[baseCls, "justify-between"].join(" ")} title="Bank transfer">
        <span className="text-sm font-semibold text-slate-700">Bank transfer</span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center justify-center rounded-md bg-white/90 ring-1 ring-black/5 p-1.5 shadow-sm">
            <Building2 className="h-[28px] w-[28px] text-blue-600 flex-shrink-0" aria-hidden />
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className={baseCls} title={m}>
      <span className="text-sm font-semibold text-slate-700">{m}</span>
    </div>
  );
}

function extractFirstUrl(s: string): { url: string | null; textWithoutUrl: string } {
  const str = String(s || "");
  const m = str.match(/https?:\/\/[^\s]+/i);
  if (!m) return { url: null, textWithoutUrl: str.trim() };
  const url = m[0];
  const textWithoutUrl = str.replace(url, "").replace(/\s{2,}/g, " ").trim();
  return { url, textWithoutUrl };
}

// Interactive Map Component for Property
function PropertyMap({ latitude, longitude, propertyTitle }: { latitude: number; longitude: number; propertyTitle: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const markerRef = useRef<any | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const token =
      (process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string) ||
      (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN as string) ||
      (window as any).__MAPBOX_TOKEN ||
      '';

    if (!token) return;
    if (!containerRef.current) return;

    let map: any = null;
    (async () => {
      try {
        const mod = await import('mapbox-gl');
        const mapboxgl = (mod as any).default ?? mod;
        mapboxgl.accessToken = token;

        map = new mapboxgl.Map({
          container: containerRef.current as HTMLElement,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [longitude, latitude],
          zoom: 15,
          interactive: true,
        });
        mapRef.current = map;
        
        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

        // Create custom marker
        const el = document.createElement('div');
        el.className = 'property-map-marker';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = '#10b981';
        el.style.border = '3px solid white';
        el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        el.style.cursor = 'pointer';
        el.setAttribute('aria-label', propertyTitle);

        // Add marker to map
        const marker = new mapboxgl.Marker(el)
          .setLngLat([longitude, latitude])
          .addTo(map);
        markerRef.current = marker;

        // Cleanup
        return () => {
          if (markerRef.current) {
            markerRef.current.remove();
          }
          if (mapRef.current) {
            mapRef.current.remove();
          }
        };
      } catch {
        // Avoid noisy console errors in production/dev; fall back to static coordinates panel.
        setMapFailed(true);
      }
    })();

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [latitude, longitude, propertyTitle]);

  return (
    <div className="relative w-full h-[400px] bg-slate-100">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      {(mapFailed || (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN)) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
          <div className="text-center">
            <MapIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 font-medium">Map view</p>
            <p className="text-xs text-slate-500 mt-1">
              {latitude}, {longitude}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

type NearbyItem = {
  key: string;
  title: string;
  detail: string | null;
  url: string | null;
  Icon: any;
  colorClass: string;
};

function normalizeNearby(nearby: string[]): NearbyItem[] {
  const map = new Map<string, NearbyItem>();
  const pickIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes("petrol")) return { Icon: Fuel, colorClass: "text-orange-600" };
    if (c.includes("bus")) return { Icon: Bus, colorClass: "text-amber-700" };
    if (c.includes("hospital")) return { Icon: Hospital, colorClass: "text-rose-600" };
    return { Icon: Route, colorClass: "text-slate-700" };
  };

  for (const raw of nearby) {
    const s = String(raw || "").trim();
    if (!s) continue;
    const cleaned = s.replace(/^near\s+/i, "").trim();
    const [left, ...rest] = cleaned.split(":");
    const category = (left || "").trim() || "Nearby";
    const detailRaw = rest.join(":").trim();
    const { url, textWithoutUrl } = extractFirstUrl(detailRaw);
    const detail = textWithoutUrl ? textWithoutUrl : null;
    const key = category.toLowerCase();
    const iconMeta = pickIcon(category);

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        title: `Near ${category}`,
        detail,
        url,
        Icon: iconMeta.Icon,
        colorClass: iconMeta.colorClass,
      });
    } else {
      // Prefer keeping a more detailed row if we later find one
      if (!existing.detail && detail) existing.detail = detail;
      if (!existing.url && url) existing.url = url;
    }
  }

  return Array.from(map.values());
}

function PolicyCard({
  icon,
  label,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "neutral" | "success";
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
      : "bg-slate-50 border-slate-200 text-slate-800";
  return (
    <div
      className={[
        "group w-full inline-flex items-center gap-2 rounded-xl border px-3 py-2",
        cls,
        "shadow-sm shadow-transparent select-none",
        "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm",
        "hover:bg-white hover:border-slate-300",
        "active:scale-[0.98]",
      ].join(" ")}
    >
      <span className="text-[#02665e]">{icon}</span>
      <span className="text-xs font-semibold truncate">{label}</span>
    </div>
  );
}

function fmtMoney(amount: number | null | undefined, currency?: string | null) {
  if (amount == null || !Number.isFinite(Number(amount))) return "—";
  const cur = currency || "TZS";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(Number(amount));
  } catch {
    return `${cur} ${Number(amount).toLocaleString()}`;
  }
}

function capWords(s: string, maxChars: number) {
  const t = String(s || "").trim();
  if (t.length <= maxChars) return t;
  return t.slice(0, maxChars - 1).trimEnd() + "…";
}

// Bed size dimensions reference
const BED_DIMENSIONS: Record<string, string> = {
  twin: "38\" × 75\" (96.5 × 190.5 cm)",
  full: "54\" × 75\" (137 × 190.5 cm)",
  queen: "60\" × 80\" (152.4 × 203.2 cm)",
  king: "76\" × 80\" (193 × 203.2 cm)",
};

function bedsToSummary(beds: any): string {
  if (!beds || typeof beds !== "object") return "—";
  const entries: Array<{ key: string; label: string }> = [
    { key: "twin", label: "Twin" },
    { key: "full", label: "Full" },
    { key: "queen", label: "Queen" },
    { key: "king", label: "King" },
  ];
  const parts = entries
    .map(({ key, label }) => {
      const n = Number((beds as any)[key]);
      if (!Number.isFinite(n) || n <= 0) return null;
      return `${n} ${label}`;
    })
    .filter(Boolean) as string[];
  return parts.length ? parts.join(", ") : "—";
}

function getBedDimensions(bedsSummary: string): string | null {
  if (!bedsSummary || bedsSummary === "—") return null;
  
  // Extract bed types from summary (e.g., "2 Queen, 1 Twin")
  const bedTypes = bedsSummary.split(',').map(s => {
    const match = s.trim().match(/\d+\s+(twin|full|queen|king)/i);
    return match ? match[1].toLowerCase() : null;
  }).filter(Boolean) as string[];
  
  if (bedTypes.length === 0) return null;
  
  // Get unique bed types and their dimensions
  const uniqueTypes = Array.from(new Set(bedTypes));
  const dimensions = uniqueTypes
    .map(type => {
      const dim = BED_DIMENSIONS[type];
      return dim ? `${type.charAt(0).toUpperCase() + type.slice(1)}: ${dim}` : null;
    })
    .filter(Boolean) as string[];
  
  return dimensions.length > 0 ? dimensions.join(" • ") : null;
}

function normalizeRoomSpec(
  r: any, 
  idx: number, 
  currency: string | null, 
  fallbackBasePrice: number | null,
  property?: any,
  systemCommission: number = 0
): RoomSpecRow {
  const roomType = String(r?.roomType || r?.name || r?.label || `Room ${idx + 1}`).trim() || `Room ${idx + 1}`;
  const roomsCountRaw = r?.roomsCount ?? r?.count ?? r?.quantity ?? null;
  const roomsCount = roomsCountRaw == null ? null : (Number.isFinite(Number(roomsCountRaw)) ? Number(roomsCountRaw) : null);

  const bedsSummary = bedsToSummary(r?.beds);
  const description = String(r?.roomDescription || r?.description || "").trim();

  const amenities = Array.from(
    new Set<string>([
      ...(Array.isArray(r?.otherAmenities) ? r.otherAmenities : []),
      ...(Array.isArray(r?.amenities) ? r.amenities : []),
    ].map((x: any) => String(x || "").trim()).filter(Boolean))
  );

  const priceRaw = r?.pricePerNight ?? r?.price ?? null;
  const originalPricePerNight = Number.isFinite(Number(priceRaw)) && Number(priceRaw) > 0 ? Number(priceRaw) : (fallbackBasePrice != null ? Number(fallbackBasePrice) : null);
  
  // Calculate final price with commission
  const pricePerNight = originalPricePerNight && property
    ? calculatePriceWithCommission(originalPricePerNight, getPropertyCommission(property, systemCommission))
    : originalPricePerNight;

  // Discounts are not currently captured in owner form, but support common shapes.
  const discountPercent = Number.isFinite(Number(r?.discountPercent)) ? Number(r.discountPercent) : null;
  const discountAmount = Number.isFinite(Number(r?.discountAmount)) ? Number(r.discountAmount) : null;
  const discountedPrice = Number.isFinite(Number(r?.discountedPrice)) ? Number(r.discountedPrice) : null;
  const discountLabel =
    discountPercent && discountPercent > 0
      ? `${discountPercent}% off`
      : discountAmount && discountAmount > 0
        ? `${fmtMoney(discountAmount, currency)} off`
        : discountedPrice && discountedPrice > 0 && pricePerNight && discountedPrice < pricePerNight
          ? `Now ${fmtMoney(discountedPrice, currency)}`
          : null;

  const smoking = String(r?.smoking || "").toLowerCase();
  const bathPrivate = String(r?.bathPrivate || "").toLowerCase();
  const towelColor = String(r?.towelColor || "").trim();
  const bathItems = Array.isArray(r?.bathItems) ? r.bathItems.map((x: any) => String(x || "").trim()).filter(Boolean) : [];

  const policies: PolicyItem[] = [
    smoking ? {
      text: "Smoking",
      Icon: smoking === "yes" ? CheckCircle : CigaretteOff,
      iconColor: smoking === "yes" ? "text-green-600" : "text-red-600",
    } : null,
    towelColor ? {
      text: `Towels: ${towelColor}`,
    } : null,
  ].filter(Boolean) as PolicyItem[];

  return {
    roomType,
    roomCode: r?.code || r?.roomCode || undefined, // Extract room code
    roomsCount,
    bedsSummary,
    description,
    amenities,
    bathItems,
    bathPrivate,
    pricePerNight,
    discountLabel,
    payActionLabel: "Pay now",
    policies: policies.length ? policies : [{ text: "—" }],
  };
}

function normalizeRoomsSpec(
  roomsSpec: any[], 
  currency: string | null, 
  fallbackBasePrice: number | null,
  property?: any,
  systemCommission: number = 0
): RoomSpecRow[] {
  if (!Array.isArray(roomsSpec)) return [];
  return roomsSpec.map((r, idx) => normalizeRoomSpec(r, idx, currency, fallbackBasePrice, property, systemCommission));
}

function joinLocation(p: Pick<PublicPropertyDetail, "city" | "district" | "regionName" | "country">) {
  return [p.city, p.district, p.regionName, p.country].filter(Boolean).join(", ");
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function getFloorName(floorNum: number): string {
  if (floorNum === 0) return "Ground";
  return `${floorNum}${getOrdinal(floorNum)}`;
}

function formatDateLabel(dateString: string) {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTimeAgo(ms: number): string {
  if (!ms || ms <= 0) return "—";
  const diff = Date.now() - ms;
  if (diff < 10 * 1000) return "just now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "< 1m ago";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Availability Checker Component
function PropertyAvailabilityChecker({
  propertyId,
  onAvailability,
  onDatesChange,
  refreshSignal,
  dates,
}: {
  propertyId: number;
  onAvailability?: (data: any | null) => void;
  onDatesChange?: (checkIn: string, checkOut: string) => void;
  refreshSignal?: number;
  dates?: { checkIn: string; checkOut: string };
}) {
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkInPickerOpen, setCheckInPickerOpen] = useState(false);
  const [checkOutPickerOpen, setCheckOutPickerOpen] = useState(false);

  const inFlightRef = useRef(false);
  const debounceTimerRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastRunAtRef = useRef<number>(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number>(0);
  const [nowTick, setNowTick] = useState(0);

  const runCheckNow = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!checkIn || !checkOut) return;

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const now = new Date();

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      setError("Please select valid dates");
      return;
    }
    if (checkInDate < now) {
      setError("Check-in date cannot be in the past");
      return;
    }
    if (checkOutDate <= checkInDate) {
      setError("Check-out date must be after check-in date");
      return;
    }

    // Simple throttle: avoid bursts when both date pickers fire quickly.
    const nowMs = Date.now();
    if (nowMs - lastRunAtRef.current < 800) return;
    lastRunAtRef.current = nowMs;

    // Cancel any previous request (date changes)
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    inFlightRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
      const response = await fetch(`${API}/api/public/availability/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          propertyId,
          checkIn: checkInDate.toISOString(),
          checkOut: checkOutDate.toISOString(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to check availability");

      setAvailability(data);
      onAvailability?.(data);
      setLastUpdatedAt(Date.now());
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      const msg = err?.message || "Failed to check availability";
      setError(msg);

      // If we get rate-limited, keep the last known availability visible.
      if (!/Too many availability requests/i.test(msg)) {
        setAvailability(null);
        onAvailability?.(null);
      }
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [checkIn, checkOut, onAvailability, propertyId]);

  const scheduleCheck = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void runCheckNow();
    }, 450);
  }, [runCheckNow]);

  // Keep local inputs in sync if parent provides date values.
  useEffect(() => {
    if (!dates) return;
    if ((dates.checkIn || "") !== checkIn) setCheckIn(dates.checkIn || "");
    if ((dates.checkOut || "") !== checkOut) setCheckOut(dates.checkOut || "");
  }, [dates?.checkIn, dates?.checkOut]);

  // Live updates: whenever the date range changes, auto-check (debounced).
  useEffect(() => {
    if (!checkIn || !checkOut) return;
    scheduleCheck();
  }, [checkIn, checkOut, scheduleCheck]);

  // Live updates: socket/parent can bump refreshSignal to re-check (debounced).
  useEffect(() => {
    if (refreshSignal == null) return;
    if (!checkIn || !checkOut) return;
    scheduleCheck();
  }, [refreshSignal, checkIn, checkOut, scheduleCheck]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
          <Calendar className="w-5 h-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900">Availability Live Updates</h2>
          <div className="text-xs text-slate-500">
            Select check-in and check-out dates to see live availability • Last updated: {formatTimeAgo(lastUpdatedAt)}
            <span className="text-slate-400"> (refreshes up to every 4 minutes)</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Check-in Date
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setCheckInPickerOpen(true);
                  setCheckOutPickerOpen(false);
                }}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#02665e]" />
                  <span className="text-slate-900">
                    {checkIn ? formatDate(checkIn) : "Select date"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {checkInPickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCheckInPickerOpen(false)} />
                  <div className="absolute z-50 top-full left-0 mt-2 bg-white rounded-xl border-2 border-slate-200 shadow-xl">
                    <DatePicker
                      selected={checkIn}
                      onSelectAction={(s) => {
                        const date = Array.isArray(s) ? s[0] : s;
                        setCheckIn(date);
                        onDatesChange?.(date, checkOut);
                        setCheckInPickerOpen(false);
                        // Reset check-out if it's before new check-in
                        if (checkOut && date && new Date(checkOut) <= new Date(date)) {
                          setCheckOut("");
                          onDatesChange?.(date, "");
                        }
                      }}
                      onCloseAction={() => setCheckInPickerOpen(false)}
                      minDate={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              Check-out Date
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setCheckOutPickerOpen(true);
                  setCheckInPickerOpen(false);
                }}
                disabled={!checkIn}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-400 bg-white shadow-sm flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#02665e]" />
                  <span className="text-slate-900">
                    {checkOut ? formatDate(checkOut) : "Select date"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {checkOutPickerOpen && checkIn && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setCheckOutPickerOpen(false)} />
                  <div className="absolute z-50 top-full left-0 mt-2 bg-white rounded-xl border-2 border-slate-200 shadow-xl">
                    <DatePicker
                      selected={checkOut}
                      onSelectAction={(s) => {
                        const date = Array.isArray(s) ? s[0] : s;
                        setCheckOut(date);
                        onDatesChange?.(checkIn, date);
                        setCheckOutPickerOpen(false);
                      }}
                      onCloseAction={() => setCheckOutPickerOpen(false)}
                      minDate={checkIn || new Date().toISOString().split("T")[0]}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Updating availability…</span>
          </div>
        ) : null}

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Availability Results */}
        {availability && !error && (
          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <div className="px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-white via-white to-emerald-50/40">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600/10 text-emerald-800 ring-1 ring-emerald-600/15">
                      <CheckCircle2 className="w-5 h-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-extrabold tracking-tight text-slate-900">Availability</h3>
                        <span className="inline-flex items-center rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide shadow-sm">LIVE</span>
                      </div>
                      <div className="mt-0.5 text-[12px] text-slate-600">
                        <span className="font-semibold text-slate-800">{formatDate(checkIn)} - {formatDate(checkOut)}</span>
                        <span className="text-slate-300"> • </span>
                        <span className="text-slate-500">Updated {formatTimeAgo(lastUpdatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 shadow-sm">
                    Refreshes up to every 4 minutes
                  </span>
                </div>
              </div>
            </div>

            {availability.available ? (
              <div className="p-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Premium summary */}
                  <div className="lg:col-span-1">
                    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-emerald-50/30 p-4 shadow-[0_8px_22px_rgba(15,23,42,0.06)]">
                      <div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">Available now</div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-3">
                          <div className="text-[11px] font-medium text-slate-500">Rooms</div>
                          <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{availability.summary.totalAvailableRooms}</div>
                        </div>
                        <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-3">
                          <div className="text-[11px] font-medium text-slate-500">Beds</div>
                          <div className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{availability.summary.totalAvailableBeds}</div>
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] text-slate-500">
                        Numbers reflect the selected date range.
                      </div>
                    </div>
                  </div>

                  {/* Clean breakdown table */}
                  <div className="lg:col-span-2">
                    <div className="rounded-3xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <div className="hidden md:grid grid-cols-12 gap-3 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                          <div className="col-span-4">Room type</div>
                          <div className="col-span-3 text-right">Rooms</div>
                          <div className="col-span-3 text-right">Beds</div>
                          <div className="col-span-2 text-right">Status</div>
                        </div>
                        <div className="md:hidden text-xs font-bold tracking-wide text-slate-600 uppercase">By room type</div>
                      </div>

                      <div className="divide-y divide-slate-200">
                        {(availability.byRoomType && Object.keys(availability.byRoomType).length > 0
                          ? Object.entries(availability.byRoomType)
                          : [])
                          .map(([roomCode, data]: [string, any]) => {
                            const availableRooms = Number(data?.availableRooms ?? 0);
                            const totalRooms = Math.max(0, Number(data?.totalRooms ?? 0));
                            const availableBeds = Number(data?.availableBeds ?? 0);
                            const totalBeds = Math.max(0, Number(data?.totalBeds ?? 0));
                            const bookedRooms = Math.max(0, Number(data?.bookedRooms ?? 0));
                            const blockedRooms = Math.max(0, Number(data?.blockedRooms ?? 0));
                            const roomsPct = totalRooms > 0 ? Math.round((availableRooms / totalRooms) * 100) : 0;
                            const bedsPct = totalBeds > 0 ? Math.round((availableBeds / totalBeds) * 100) : 0;

                            return (
                              <div key={roomCode} className="px-4 py-3">
                                <div className="grid grid-cols-12 gap-3 items-center">
                                  <div className="col-span-12 md:col-span-4 min-w-0">
                                    <div className="text-sm font-extrabold text-slate-900 truncate">
                                      {roomCode === "default" ? "All Rooms" : roomCode}
                                    </div>
                                    <div className="mt-1 flex md:hidden items-center gap-2 text-[11px] text-slate-500">
                                      <span className="font-semibold">{availableRooms}</span>/{totalRooms} rooms
                                      <span className="text-slate-300">•</span>
                                      <span className="font-semibold">{availableBeds}</span>/{totalBeds} beds
                                    </div>
                                  </div>

                                  <div className="col-span-6 md:col-span-3 md:text-right">
                                    <div className="md:hidden text-[10px] font-bold tracking-wide text-slate-500 uppercase">Rooms</div>
                                    <div className="text-sm font-extrabold text-slate-900">
                                      {availableRooms}
                                      <span className="text-slate-300">/</span>
                                      <span className="text-slate-600 font-bold">{totalRooms}</span>
                                    </div>
                                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200">
                                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${roomsPct}%` }} />
                                    </div>
                                  </div>

                                  <div className="col-span-6 md:col-span-3 md:text-right">
                                    <div className="md:hidden text-[10px] font-bold tracking-wide text-slate-500 uppercase">Beds</div>
                                    <div className="text-sm font-extrabold text-slate-900">
                                      {availableBeds}
                                      <span className="text-slate-300">/</span>
                                      <span className="text-slate-600 font-bold">{totalBeds}</span>
                                    </div>
                                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden ring-1 ring-slate-200">
                                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{ width: `${bedsPct}%` }} />
                                    </div>
                                  </div>

                                  <div className="col-span-12 md:col-span-2 md:flex md:justify-end">
                                    <div className="flex flex-wrap gap-2 md:justify-end">
                                      {bookedRooms > 0 ? (
                                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-900 ring-1 ring-amber-200">
                                          {bookedRooms} booked
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200">
                                          Available
                                        </span>
                                      )}
                                      {blockedRooms > 0 ? (
                                        <span
                                          className="inline-flex items-center rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200"
                                          title="These rooms are already booked or reserved for the selected dates."
                                        >
                                          {blockedRooms} booked
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5">
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20">
                      <AlertCircle className="w-5 h-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="text-base font-extrabold tracking-tight text-amber-950">Not available</div>
                      <div className="mt-1 text-sm text-amber-800">No rooms or beds are available for the selected dates.</div>
                      <div className="mt-2 text-[12px] text-amber-700">Try a different date range.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PublicPropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String((params as any)?.slug ?? "");

  const [property, setProperty] = useState<PublicPropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [reviewsData, setReviewsData] = useState<ReviewsResponse | null>(null);

  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewTitle, setReviewTitle] = useState<string>("");
  const [reviewComment, setReviewComment] = useState<string>("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitMsg, setReviewSubmitMsg] = useState<string | null>(null);
  const [showAllNearbyServices, setShowAllNearbyServices] = useState(false);
  const [categoryRatings, setCategoryRatings] = useState<{
    customerCare: number;
    security: number;
    reality: number;
    comfort: number;
  }>({
    customerCare: 0,
    security: 0,
    reality: 0,
    comfort: 0,
  });
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [roomAmenityHint, setRoomAmenityHint] = useState<string | null>(null);
  const [systemCommission, setSystemCommission] = useState<number>(0);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);

  // Availability + booking shortcut state for visualization tiles
  const [selectedDates, setSelectedDates] = useState<{ checkIn: string; checkOut: string }>({ checkIn: "", checkOut: "" });
  const [availabilityData, setAvailabilityData] = useState<any | null>(null);
  const [roomQuickView, setRoomQuickView] = useState<null | { roomType: string; floor: number }>(null);
  const [modalDates, setModalDates] = useState<{ checkIn: string; checkOut: string }>({ checkIn: "", checkOut: "" });
  const [modalAvailLoading, setModalAvailLoading] = useState(false);
  const [modalAvailError, setModalAvailError] = useState<string | null>(null);
  const lastQuickViewKeyRef = useRef<string>("");
  const [modalCheckInPickerOpen, setModalCheckInPickerOpen] = useState(false);
  const [modalCheckOutPickerOpen, setModalCheckOutPickerOpen] = useState(false);
  const [modalRoomsQty, setModalRoomsQty] = useState(1);
  const [modalGuests, setModalGuests] = useState<{ adults: number; children: number; pets: number }>({ adults: 1, children: 0, pets: 0 });
  const [quickBookingPage, setQuickBookingPage] = useState<"details" | "availability">("details");
  const [availabilitySocket, setAvailabilitySocket] = useState<Socket | null>(null);
  const [availabilityConnected, setAvailabilityConnected] = useState(false);
  const [availabilityRefreshTick, setAvailabilityRefreshTick] = useState(0);
  const selectedDatesRef = useRef(selectedDates);

  const modalInFlightRef = useRef(false);

  // Throttle socket-driven refresh signals so we don't spam the availability endpoint.
  const socketRefreshTimerRef = useRef<any>(null);
  const lastSocketRefreshAtRef = useRef<number>(0);

  useEffect(() => {
    selectedDatesRef.current = selectedDates;
  }, [selectedDates]);

  const runAvailabilityCheck = useCallback(
    async (propertyId: number, checkInStr: string, checkOutStr: string, roomCode?: string | null) => {
      // Guard against double-fires (e.g., fast UI interactions)
      if (modalInFlightRef.current) return;
      if (!checkInStr || !checkOutStr) {
        setModalAvailError("Select both check-in and check-out dates");
        return;
      }
      const checkInDate = new Date(checkInStr);
      const checkOutDate = new Date(checkOutStr);
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        setModalAvailError("Please enter valid dates");
        return;
      }
      if (checkOutDate <= checkInDate) {
        setModalAvailError("Check-out must be after check-in");
        return;
      }

      modalInFlightRef.current = true;
      setModalAvailLoading(true);
      setModalAvailError(null);
      try {
        const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
        const response = await fetch(`${API}/api/public/availability/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            checkIn: checkInDate.toISOString(),
            checkOut: checkOutDate.toISOString(),
            roomCode: roomCode ? String(roomCode).trim() : null,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to check availability");
        }
        setAvailabilityData(data);
        setSelectedDates({ checkIn: checkInStr, checkOut: checkOutStr });
      } catch (e: any) {
        const msg = e?.message || "Failed to check availability";
        setModalAvailError(msg);

        // Keep last-known availability on 429 so the UI can still show room status.
        if (!/Too many availability requests/i.test(msg)) {
          setAvailabilityData(null);
        }
      } finally {
        setModalAvailLoading(false);
        modalInFlightRef.current = false;
      }
    },
    []
  );

  // Live updates: socket updates bump a refresh signal.

  // Socket.IO connection for real-time availability updates
  useEffect(() => {
    if (!property?.id) return;

    const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");
    
    (async () => {
      try {
        const { io } = await import("socket.io-client");
        const newSocket = io(socketUrl, {
          transports: ["websocket", "polling"],
          withCredentials: true,
        });

        newSocket.on("connect", () => {
          setAvailabilityConnected(true);
          newSocket.emit("join-property-availability", { propertyId: property.id });
        });

        newSocket.on("disconnect", () => {
          setAvailabilityConnected(false);
        });

        newSocket.on("availability:update", (data: any) => {
          if (Number(data?.propertyId) !== Number(property.id)) return;

          const { checkIn, checkOut } = selectedDatesRef.current;
          if (!checkIn || !checkOut) return;

          const nowMs = Date.now();
          const minGapMs = 4 * 60 * 1000; // at most one refresh signal per 4 minutes
          const since = nowMs - lastSocketRefreshAtRef.current;

          if (since >= minGapMs) {
            lastSocketRefreshAtRef.current = nowMs;
            setAvailabilityRefreshTick((t) => t + 1);
            return;
          }

          if (socketRefreshTimerRef.current) return;
          socketRefreshTimerRef.current = setTimeout(() => {
            socketRefreshTimerRef.current = null;
            lastSocketRefreshAtRef.current = Date.now();
            setAvailabilityRefreshTick((t) => t + 1);
          }, minGapMs - Math.max(0, since));
        });

        setAvailabilitySocket(newSocket);

        return () => {
          newSocket.emit("leave-property-availability", { propertyId: property.id });
          newSocket.disconnect();
        };
      } catch (e) {
        console.warn("Socket.IO client failed to initialize for availability", e);
      }
    })();
  }, [property?.id]);

  useEffect(() => {
    return () => {
      if (socketRefreshTimerRef.current) {
        clearTimeout(socketRefreshTimerRef.current);
        socketRefreshTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const key = roomQuickView ? `${roomQuickView.roomType}|${roomQuickView.floor}` : "";
    if (roomQuickView && key !== lastQuickViewKeyRef.current) {
      lastQuickViewKeyRef.current = key;
      setModalDates({ checkIn: selectedDates.checkIn, checkOut: selectedDates.checkOut });
      setModalAvailError(null);
      setModalRoomsQty(1);
      setModalGuests((g) => ({ adults: Math.max(1, g.adults || 1), children: 0, pets: 0 }));
      setQuickBookingPage("details");
    }
  }, [roomQuickView, selectedDates.checkIn, selectedDates.checkOut]);

  useEffect(() => {
    if (!roomQuickView) return;
  }, [quickBookingPage, roomQuickView]);

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

  // Load current user to check if they are the owner
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
          if (mounted) setIsOwner(false);
          return;
        }
        
        const res = await fetch(`/api/account/me`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
          credentials: "include",
        });
        
        if (res.ok) {
          const user = await res.json();
          if (mounted) {
            // Check if user is the owner of this property
            if (property?.ownerId && user?.id && Number(user.id) === Number(property.ownerId)) {
              setIsOwner(true);
            } else {
              setIsOwner(false);
            }
          }
        } else {
          if (mounted) setIsOwner(false);
        }
      } catch (e) {
        // Silently fail - user not logged in or error
        if (mounted) setIsOwner(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [property?.ownerId]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/properties/${encodeURIComponent(slug)}`, { cache: "no-store" });
        if (res.status === 404) throw new Error("This property is not available.");
        if (!res.ok) throw new Error(`Failed to load property (${res.status})`);
        const json = await res.json();
        if (!mounted) return;
        setProperty(json?.property ?? null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load property");
        setProperty(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!property?.id) return;
    let mounted = true;
    const load = async () => {
      setReviewsLoading(true);
      setReviewsError(null);
      try {
        const res = await fetch(`/api/property-reviews/${property.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load reviews (${res.status})`);
        const json = (await res.json()) as ReviewsResponse;
        if (!mounted) return;
        setReviewsData(json);
      } catch (e: any) {
        if (!mounted) return;
        setReviewsError(e?.message || "Failed to load reviews");
        setReviewsData(null);
      } finally {
        if (mounted) setReviewsLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [property?.id]);

  // Check if property is saved
  useEffect(() => {
    if (!property?.id) return;
    let mounted = true;
    const checkSaved = async () => {
      try {
        const res = await fetch(`/api/customer/saved-properties?page=1&pageSize=100`, {
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          if (!mounted) return;
          const isSaved = json?.items?.some((p: any) => p.id === property.id) || false;
          setIsFavorite(isSaved);
        }
      } catch (e) {
        // Silently fail - user might not be logged in
      }
    };
    void checkSaved();
    return () => {
      mounted = false;
    };
  }, [property?.id]);

  const location = useMemo(() => (property ? joinLocation(property) : ""), [property]);
  
  // Calculate final price with commission
  const finalBasePrice = useMemo(() => {
    if (!property?.basePrice) return null;
    const commission = getPropertyCommission(property, systemCommission);
    return calculatePriceWithCommission(property.basePrice, commission);
  }, [property, systemCommission]);
  
  const price = useMemo(() => (finalBasePrice ? fmtMoney(finalBasePrice, property?.currency) : "—"), [finalBasePrice, property?.currency]);

  const about = useMemo(() => {
    const fallback = "No description provided yet.";
    const raw = String(property?.description || "").trim();
    const text = raw ? raw : fallback;
    const limit = 320;
    const hasMore = raw.length > limit;
    const collapsed = hasMore ? raw.slice(0, limit).trimEnd() + "…" : text;
    return { raw, text, hasMore, collapsed };
  }, [property?.description]);

  const images = property?.images ?? [];
  const hero = images[0] ?? null;
  const gallery = images.slice(0, 48);
  const hasMorePhotos = images.length > 3;

  const placeholderLightboxImages = useMemo(() => {
    const mk = (a: string, b: string) =>
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="${a}"/>
              <stop offset="1" stop-color="${b}"/>
            </linearGradient>
            <radialGradient id="r" cx="30%" cy="25%" r="80%">
              <stop offset="0" stop-color="#02665e" stop-opacity="0.16"/>
              <stop offset="1" stop-color="#000" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1600" height="1000" fill="url(#g)"/>
          <rect width="1600" height="1000" fill="url(#r)"/>
        </svg>`
      )}`;
    return [
      mk("#f8fafc", "#e2e8f0"),
      mk("#eef2ff", "#e0f2fe"),
      mk("#ecfeff", "#e0f2f1"),
      mk("#f0fdf4", "#dcfce7"),
      mk("#fff7ed", "#ffedd5"),
      mk("#fdf2f8", "#fce7f3"),
      mk("#f1f5f9", "#e2e8f0"),
      mk("#eff6ff", "#dbeafe"),
    ];
  }, []);

  const lightboxImages = images.length ? images : placeholderLightboxImages;

  // Parse services - can be array of strings or object
  const servicesRaw = useMemo(() => property?.services ?? [], [property?.services]);
  const servicesArray = useMemo(
    () => (Array.isArray(servicesRaw) ? servicesRaw.map(String).map((s) => s.trim()).filter(Boolean) : []),
    [servicesRaw]
  );
  const servicesObj: any = useMemo(
    () => (typeof servicesRaw === 'object' && !Array.isArray(servicesRaw) && servicesRaw !== null ? servicesRaw : {}),
    [servicesRaw]
  );
  
  // Extract nearby facilities from services object (owner fills this in)
  const nearbyFacilities = useMemo(() => {
    let facilities: any[] = [];
    try {
      // Try to find nearbyFacilities in services object
      if (servicesObj.nearbyFacilities && Array.isArray(servicesObj.nearbyFacilities)) {
        facilities = servicesObj.nearbyFacilities;
      }
      // Also check if it's stored as a JSON string in the services array
      const facilitiesStr = servicesArray.find((s: string) => s.includes('nearbyFacilities') || s.startsWith('['));
      if (facilitiesStr) {
        try {
          const parsed = JSON.parse(facilitiesStr);
          if (Array.isArray(parsed)) facilities = parsed;
        } catch {}
      }
    } catch {}
    return facilities;
  }, [servicesObj, servicesArray]);

  // Parse houseRules - can be a JSON string or object
  const houseRules = useMemo(() => {
    const parseHouseRulesValue = (v: any) => {
      if (!v) return null;
      if (typeof v === "string") {
        try {
          const parsed = JSON.parse(v);
          return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : null;
        } catch {
          return null;
        }
      }
      if (typeof v === "object" && v !== null && !Array.isArray(v)) return v;
      return null;
    };

    const normalize = (hr: any) => {
      if (!hr || typeof hr !== "object") return null;

      // Already-normalized shape used by the owner submit payload:
      // { checkIn, checkOut, pets, petsNote, smoking, other, safetyMeasures? }
      const out: any = {};
      if (typeof hr.checkIn === "string" && hr.checkIn.trim()) out.checkIn = hr.checkIn.trim();
      if (typeof hr.checkOut === "string" && hr.checkOut.trim()) out.checkOut = hr.checkOut.trim();

      // Support legacy/un-normalized shape (from TotalsStep state)
      const fmtWindow = (from: string, to: string) => {
        const f = String(from || "").trim();
        const t = String(to || "").trim();
        if (f && t) return `${f} – ${t}`;
        if (f) return `From ${f}`;
        if (t) return `Until ${t}`;
        return "";
      };
      if (!out.checkIn) {
        const v = fmtWindow(hr.checkInFrom, hr.checkInTo);
        if (v) out.checkIn = v;
      }
      if (!out.checkOut) {
        const v = fmtWindow(hr.checkOutFrom, hr.checkOutTo);
        if (v) out.checkOut = v;
      }

      if (typeof hr.pets === "boolean") out.pets = hr.pets;
      if (typeof hr.petsAllowed === "boolean") out.pets = hr.petsAllowed;
      if (typeof hr.petsNote === "string" && hr.petsNote.trim()) out.petsNote = hr.petsNote.trim();

      // In the public UI, `houseRules.smoking === true` means "Smoking Not Allowed"
      if (typeof hr.smoking === "boolean") out.smoking = hr.smoking;
      if (typeof hr.smokingNotAllowed === "boolean") out.smoking = hr.smokingNotAllowed;

      if (Array.isArray(hr.safetyMeasures)) out.safetyMeasures = hr.safetyMeasures;
      if (typeof hr.other === "string" && hr.other.trim()) out.other = hr.other.trim();

      return Object.keys(out).length ? out : null;
    };

    // Prefer direct `property.houseRules` if it exists (future-proof), otherwise fallback to `services.houseRules`
    const direct = parseHouseRulesValue((property as any)?.houseRules);
    const viaServices = parseHouseRulesValue((servicesObj as any)?.houseRules);

    return normalize(direct) || normalize(viaServices) || null;
  }, [property, servicesObj]);
  
  // Default payment methods that should always be displayed
  const servicesByCategory = useMemo(() => {
    const DEFAULT_PAYMENT_METHODS = ["Mobile money", "Cash", "Card", "Bank transfer"];
    const paymentModes = servicesArray
      .filter((s) => /^payment:\s*/i.test(s))
      .map((s) => s.replace(/^payment:\s*/i, "").trim())
      .filter(Boolean);
    
    // If no payment modes are provided by owner, use defaults
    const finalPaymentModes = paymentModes.length > 0 ? paymentModes : DEFAULT_PAYMENT_METHODS;
    
    const freeCancellation = servicesArray.some((s) => s.toLowerCase() === "free cancellation");
    const groupStay = servicesArray.some((s) => s.toLowerCase() === "group stay");
    const nearby = servicesArray.filter((s) => /^near\s+/i.test(s));
    const amenities = servicesArray
      .filter((s) => !/^payment:\s*/i.test(s))
      .filter((s) => !/^(free cancellation|group stay)$/i.test(s))
      .filter((s) => !/^near\s+/i.test(s));
    return { paymentModes: finalPaymentModes, freeCancellation, groupStay, nearby, amenities };
  }, [servicesArray]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [allPhotosOpen, setAllPhotosOpen] = useState(false);
  const [allPhotosShown, setAllPhotosShown] = useState(false);

  const openLightbox = (idx: number) => {
    setActiveIdx(Math.max(0, Math.min(idx, lightboxImages.length - 1)));
    setLightboxOpen(true);
  };

  const closeLightbox = () => setLightboxOpen(false);

  const openAllPhotos = () => {
    setAllPhotosOpen(true);
    requestAnimationFrame(() => setAllPhotosShown(true));
  };

  const closeAllPhotos = () => {
    setAllPhotosShown(false);
    window.setTimeout(() => setAllPhotosOpen(false), 180);
  };

  useEffect(() => {
    if (!allPhotosOpen && !lightboxOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (lightboxOpen) setLightboxOpen(false);
        if (allPhotosOpen) closeAllPhotos();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [allPhotosOpen, lightboxOpen]);

  useEffect(() => {
    if (!roomAmenityHint) return;
    const t = window.setTimeout(() => setRoomAmenityHint(null), 1200);
    return () => window.clearTimeout(t);
  }, [roomAmenityHint]);

  const openFromGrid = (idx: number) => {
    // Close grid first, then open lightbox to keep UX clean.
    setAllPhotosShown(false);
    setAllPhotosOpen(false);
    setActiveIdx(Math.max(0, Math.min(idx, lightboxImages.length - 1)));
    requestAnimationFrame(() => setLightboxOpen(true));
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-white text-slate-900 header-offset">
        <div className="public-container py-8">
          <div className="h-8 w-28 bg-slate-100 animate-pulse rounded" />
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="aspect-[16/9] bg-slate-100 animate-pulse rounded-2xl" />
              <div className="mt-4 h-6 w-2/3 bg-slate-100 animate-pulse rounded" />
              <div className="mt-2 h-4 w-1/2 bg-slate-100 animate-pulse rounded" />
            </div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="h-6 w-1/2 bg-slate-100 animate-pulse rounded" />
              <div className="mt-3 h-10 bg-slate-100 animate-pulse rounded-xl" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !property) {
    return (
      <main className="min-h-screen bg-white text-slate-900 header-offset">
        <div className="public-container py-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <div className="font-semibold text-rose-900">Property not available</div>
            <div className="text-sm text-rose-800 mt-1">{error || "This property could not be loaded."}</div>
            <div className="mt-4">
              <Link href="/public/properties" className="text-sm font-semibold text-[#02665e] no-underline hover:underline">
                Browse properties
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-slate-900 header-offset">
      <div className="public-container py-8">
        <div className="flex items-center justify-start gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="group relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="absolute left-full ml-2 px-2 py-1 text-xs font-medium text-white bg-slate-900 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 group-active:opacity-100 pointer-events-none transition-opacity">
            Back
            </span>
          </button>
        </div>

        {/* Title */}
        <div className="mt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">{property.title}</h1>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{location || "—"}</span>
              </div>
            </div>
            {/* Favorite & Share Buttons */}
            <div className="flex items-center gap-2 mt-2 flex-shrink-0">
              <button
                type="button"
                onClick={async () => {
                  if (!property?.id || favoriteLoading) return;
                  setFavoriteLoading(true);
                  try {
                    if (isFavorite) {
                      // Unsave
                      const res = await fetch(`/api/customer/saved-properties/${property.id}`, {
                        method: "DELETE",
                        credentials: "include",
                      });
                      if (res.ok) {
                        setIsFavorite(false);
                      } else {
                        const json = await res.json().catch(() => ({}));
                        if (json.error?.includes("not found")) {
                          setIsFavorite(false);
                        } else {
                          alert(json.error || "Failed to remove from saved list. Please try again.");
                        }
                      }
                    } else {
                      // Save
                      const propertyId = Number(property.id);
                      if (!propertyId || isNaN(propertyId)) {
                        alert("Invalid property ID");
                        setFavoriteLoading(false);
                        return;
                      }
                      const res = await fetch(`/api/customer/saved-properties`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ propertyId }),
                      });
                      const json = await res.json().catch(() => ({}));
                      if (res.ok) {
                        setIsFavorite(true);
                      } else if (res.status === 401 || res.status === 403) {
                        // Not logged in - redirect to login
                        alert("Please log in to save properties");
                        router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
                      } else {
                        const errorMsg = json.error || json.message || "Failed to save property. Please try again.";
                        alert(errorMsg);
                      }
                    }
                  } catch (e: any) {
                    alert("Network error. Please check your connection and try again.");
                  } finally {
                    setFavoriteLoading(false);
                  }
                }}
                disabled={favoriteLoading}
                className={[
                  "inline-flex items-center justify-center w-10 h-10 rounded-lg border",
                  "transition-all duration-300 ease-in-out",
                  "hover:scale-110 active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isFavorite
                    ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:border-rose-300 hover:shadow-md"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm",
                ].join(" ")}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                title={isFavorite ? "Remove from favorites" : "Save property"}
              >
                {favoriteLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Heart className={`w-5 h-5 transition-all duration-300 ${isFavorite ? "fill-current scale-110" : "scale-100"}`} />
                )}
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className={[
                    "inline-flex items-center justify-center w-10 h-10 rounded-lg border border-slate-200 bg-white text-slate-600",
                    "transition-all duration-300 ease-in-out",
                    "hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm hover:scale-110",
                    "active:scale-95",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2",
                    showShareMenu ? "bg-slate-50 border-slate-300 shadow-sm" : "",
                  ].join(" ")}
                  aria-label="Share property"
                  title="Share property"
                >
                  <Share2 className={`w-5 h-5 transition-transform duration-300 ${showShareMenu ? "rotate-12" : ""}`} />
                </button>
                {showShareMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-200"
                      onClick={() => setShowShareMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-slate-200 bg-white shadow-lg z-50 overflow-hidden transform transition-all duration-200 origin-top-right">
                      <button
                        type="button"
                        onClick={async () => {
                          const url = window.location.href;
                          navigator.clipboard.writeText(url).then(() => {
                            setCopyLinkSuccess(true);
                            setTimeout(() => setCopyLinkSuccess(false), 2000);
                          });
                          setShowShareMenu(false);
                          // Mark as shared if property is saved
                          if (property?.id && isFavorite) {
                            try {
                              await fetch(`/api/customer/saved-properties/${property.id}/share`, {
                                method: "POST",
                                credentials: "include",
                              });
                            } catch (e) {
                              // Silently fail
                            }
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-all duration-200 hover:translate-x-1 active:scale-95"
                      >
                        <Copy className={`w-4 h-4 transition-transform duration-200 ${copyLinkSuccess ? "scale-110 text-[#02665e]" : ""}`} />
                        <span className={copyLinkSuccess ? "font-semibold text-[#02665e]" : ""}>{copyLinkSuccess ? "Link copied!" : "Copy link"}</span>
                      </button>
                      <a
                        href={`mailto:?subject=${encodeURIComponent(property.title)}&body=${encodeURIComponent(window.location.href)}`}
                        onClick={async () => {
                          setShowShareMenu(false);
                          // Mark as shared if property is saved
                          if (property?.id && isFavorite) {
                            try {
                              await fetch(`/api/customer/saved-properties/${property.id}/share`, {
                                method: "POST",
                                credentials: "include",
                              });
                            } catch (e) {
                              // Silently fail
                            }
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-all duration-200 hover:translate-x-1 active:scale-95"
                      >
                        <Mail className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                        <span>Email</span>
                      </a>
                      <a
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={async () => {
                          setShowShareMenu(false);
                          // Mark as shared if property is saved
                          if (property?.id && isFavorite) {
                            try {
                              await fetch(`/api/customer/saved-properties/${property.id}/share`, {
                                method: "POST",
                                credentials: "include",
                              });
                            } catch (e) {
                              // Silently fail
                            }
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-all duration-200 hover:translate-x-1 active:scale-95"
                      >
                        <Facebook className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                        <span>Facebook</span>
                      </a>
                      <a
                        href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(property.title)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={async () => {
                          setShowShareMenu(false);
                          // Mark as shared if property is saved
                          if (property?.id && isFavorite) {
                            try {
                              await fetch(`/api/customer/saved-properties/${property.id}/share`, {
                                method: "POST",
                                credentials: "include",
                              });
                            } catch (e) {
                              // Silently fail
                            }
                          }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-all duration-200 hover:translate-x-1 active:scale-95 border-t border-slate-100"
                      >
                        <Twitter className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                        <span>Twitter</span>
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Verified by NoLSAF statement (anti-fraud) */}
          <div className="mt-3 rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-emerald-50/95 to-teal-50/80 p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-sm shadow-emerald-600/30 flex-shrink-0">
                    <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-sm font-bold text-emerald-900 leading-tight">Verified by NoLSAF</h3>
                </div>
                <div className="text-xs text-emerald-900/85 leading-relaxed pl-9">
                  This property was verified through <strong className="font-semibold text-emerald-900">physical site visitation</strong>, location validation, and documentation review. We do this to ensure authenticity and protect you from fraud and misleading listings{" "}
                  (<Link href="/verification-policy" className="text-emerald-700 hover:text-emerald-900 font-medium underline underline-offset-2">
                    visit our Verification Policy
                  </Link>
                  ).
                </div>
              </div>
              <VerifiedIcon href={`/public/properties/${property.slug}`} ariaLabel="Verified — view details" />
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="mt-6">
          {hero ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl overflow-hidden border border-slate-200">
              <button
                type="button"
                className={[
                  "relative md:col-span-2 aspect-[16/10] bg-slate-100 cursor-pointer rounded-2xl overflow-hidden",
                  "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
                  "motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                ].join(" ")}
                onClick={() => openLightbox(0)}
                aria-label="Open photo gallery"
              >
                <Image
                  src={gallery[0]}
                  alt={`${property.title} photo 1`}
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 66vw, 100vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
                <div className="absolute left-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-white/90 border border-white/70 px-3 py-1 text-xs font-semibold text-slate-900">
                  Approved photos • {images.length}
              </div>
              </button>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-3 bg-white p-3">
                {/* Photo 2 */}
                {gallery[1] ? (
                  <button
                    type="button"
                    className={[
                      "relative aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden cursor-pointer",
                      "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
                      "motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    ].join(" ")}
                    onClick={() => openLightbox(1)}
                    aria-label="Open photo 2"
                  >
                    <Image
                      src={gallery[1]}
                      alt={`${property.title} photo 2`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 22vw, 50vw"
                    />
                  </button>
                ) : (
                  <div className="relative aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(2,102,94,0.10),transparent_55%),linear-gradient(135deg,#f8fafc,#e2e8f0)]" />
                    <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-slate-400" aria-hidden />
                  </div>
              </div>
                )}

                {/* Photo 3 (or View all photos tile) */}
                {gallery[2] ? (
                  <button
                    type="button"
                    className={[
                      "relative aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden cursor-pointer",
                      "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
                      "motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                    ].join(" ")}
                    onClick={() => (hasMorePhotos ? openAllPhotos() : openLightbox(2))}
                    aria-label={hasMorePhotos ? "View all photos" : "Open photo 3"}
                  >
                    <Image
                      src={gallery[2]}
                      alt={`${property.title} photo 3`}
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 22vw, 50vw"
                    />
                    {hasMorePhotos ? (
                      <div className="absolute left-3 right-3 bottom-3 flex items-center justify-start">
                        <div
                          className="nls-blink inline-flex items-center gap-2 rounded-full bg-white/95 text-[#02665e] px-4 py-2 text-xs font-semibold shadow-sm ring-1 ring-black/5 whitespace-nowrap leading-none blink-animation"
                        >
                          <Eye className="w-4 h-4 flex-shrink-0 text-[#02665e]" aria-hidden />
                          <span className="leading-none">View all photos</span>
                          <span className="mx-1 h-3 w-px bg-[#02665e]/20" aria-hidden />
                          <span className="text-[#02665e]/80">+{Math.max(0, images.length - 3)} more</span>
            </div>
                      </div>
                    ) : null}
                  </button>
          ) : (
                  <div className="relative aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(2,102,94,0.10),transparent_55%),linear-gradient(135deg,#f8fafc,#e2e8f0)]" />
                    <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-slate-400" aria-hidden />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              {/* Photo layout preview (until Cloudinary / approved photos are available) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl overflow-hidden border border-slate-200">
                <button
                  type="button"
                  onClick={() => openAllPhotos()}
                  className={[
                    "relative md:col-span-2 aspect-[16/10] bg-slate-100 rounded-2xl overflow-hidden cursor-pointer",
                    "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
                    "motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  ].join(" ")}
                  aria-label="View all photos"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(2,102,94,0.14),transparent_55%),radial-gradient(circle_at_75%_85%,rgba(2,132,199,0.10),transparent_55%),linear-gradient(135deg,#f8fafc,#e2e8f0)]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-black/0 to-white/35" />
                  <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
                    <div className="h-14 w-14 rounded-2xl bg-white/85 border border-slate-200 shadow-sm flex items-center justify-center">
                      <ImageIcon className="w-7 h-7 text-slate-500" aria-hidden />
                    </div>
                    <div className="mt-3 text-sm font-semibold">Photo preview</div>
                    <div className="text-xs text-slate-500">Hero image will appear here</div>
                  </div>
                  <div className="absolute left-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-white/90 border border-white/70 px-3 py-1 text-xs font-semibold text-slate-900">
                    Approved photos • 0
                  </div>
                </button>
                <div className="grid grid-cols-2 md:grid-cols-1 gap-3 bg-white p-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => openAllPhotos()}
                      className={[
                        "relative aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden cursor-pointer",
                        "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
                        "motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                      ].join(" ")}
                      aria-label="View all photos"
                    >
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(2,102,94,0.10),transparent_55%),linear-gradient(135deg,#f8fafc,#e2e8f0)]" />
                      <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-slate-400" aria-hidden />
                      </div>
                      {i === 1 ? (
                        <div className="absolute left-3 right-3 bottom-3 flex items-center justify-start">
                          <div
                            className="nls-blink inline-flex items-center gap-2 rounded-full bg-white/95 text-[#02665e] px-4 py-2 text-xs font-semibold shadow-sm ring-1 ring-black/5 whitespace-nowrap leading-none blink-18"
                          >
                            <Eye className="w-4 h-4 flex-shrink-0 text-[#02665e]" aria-hidden />
                            <span className="leading-none">View all photos</span>
                          </div>
                        </div>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Facts */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <Fact icon={<Users className="w-6 h-6" />} label="Guests" value={property.maxGuests ?? "—"} />
                <Fact icon={<BedDouble className="w-6 h-6" />} label="Bedrooms" value={property.totalBedrooms ?? "—"} />
                <Fact icon={<Bath className="w-6 h-6" />} label="Bathrooms" value={property.totalBathrooms ?? "—"} />
                <Fact icon={<ShieldCheck className="w-6 h-6" />} label="Status" value="Verified listing" />
              </div>
            </div>

            {/* Description */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                        <FileText className="w-5 h-5" aria-hidden />
                      </span>
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">About this place</h2>
                        <div className="text-xs text-slate-500">What the host says about the property</div>
                      </div>
                    </div>
                  </div>
                  {about.hasMore ? (
                    <button
                      type="button"
                      onClick={() => setAboutExpanded((v) => !v)}
                      className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {aboutExpanded ? "Show less" : "Read more"}
                    </button>
                  ) : null}
                </div>

                <div className="mt-4 relative">
                  <p className="text-[15px] sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                    {aboutExpanded ? about.text : about.collapsed}
                  </p>
                  {!aboutExpanded && about.hasMore ? (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-white/0" />
                  ) : null}
                </div>
              </div>
              <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            </div>

            {/* Physical Verification - Our Competitive Advantage */}
            <div className="rounded-2xl border-2 border-[#02665e]/20 bg-gradient-to-br from-[#02665e]/5 to-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                  <ShieldCheck className="w-5 h-5" aria-hidden />
                </span>
                <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Physically Verified Property</h2>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  We physically verify every property through on-site visits by our agents or CEO. This ensures authenticity, accuracy, and your peace of mind.
                </p>
              </div>

              {/* YouTube Video Thumbnail - Only show if video URL exists */}
              {property?.verificationVideoUrl ? (
                <a
                  href={property.verificationVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block w-full rounded-xl overflow-hidden border-2 border-slate-200 hover:border-[#02665e]/40 transition-all duration-200 hover:shadow-lg mb-4"
                >
                  <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200">
                    {/* YouTube Thumbnail - Extract video ID and use YouTube thumbnail API */}
                    {(() => {
                      const videoId = property.verificationVideoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
                      const thumbnailUrl = videoId 
                        ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
                        : null;
                      
                      return thumbnailUrl ? (
                        <Image
                          src={thumbnailUrl}
                          alt="Property verification video"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300">
                          <PlayCircle className="h-16 w-16 text-slate-400" />
                        </div>
                      );
                    })()}
                    
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors duration-200">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                          <PlayCircle className="h-10 w-10 text-[#02665e] ml-1" fill="currentColor" />
                        </div>
                        <div className="text-white text-sm font-semibold drop-shadow-lg">Watch Verification</div>
                      </div>
                    </div>
                    
                    {/* External Link Indicator */}
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-lg p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <ExternalLinkIcon className="h-4 w-4 text-[#02665e]" />
                    </div>
                  </div>
                </a>
              ) : (
                <div className="mb-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <PlayCircle className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <div className="text-sm font-medium text-slate-700 mb-1">Verification video coming soon</div>
                  <div className="text-xs text-slate-500">Watch this space for the physical verification video</div>
                </div>
              )}

              <div className="flex items-start gap-2 text-xs text-slate-600">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  {property?.verificationVideoUrl 
                    ? "This property has been physically inspected and verified by our team. Click above to see the complete verification process."
                    : "This property will be physically inspected and verified by our team to ensure authenticity and accuracy."}
                </span>
              </div>
            </div>


            {/* Payment Methods (mobile/tablet only; on large screens it sits in the right column) */}
            <div className="lg:hidden rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                  <CreditCard className="w-6 h-6" aria-hidden />
                </span>
                <h2 className="text-2xl font-semibold text-slate-900">Payment Methods</h2>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {servicesByCategory.paymentModes.slice(0, 6).map((m) => (
                  <PaymentModePill key={m} mode={m} />
                ))}
                {servicesByCategory.freeCancellation ? (
                  <PolicyCard tone="success" icon={<BadgeCheck className="w-4 h-4" aria-hidden />} label="Free cancellation" />
                ) : null}
                {servicesByCategory.groupStay ? (
                  <PolicyCard tone="neutral" icon={<UsersRound className="w-4 h-4" aria-hidden />} label="Group stay" />
                ) : null}
              </div>
            </div>


          </div>

          {/* Side / CTA */}
          <aside className="lg:sticky lg:top-24 h-fit space-y-6">
            {/* Payment Methods (large screens: right column, touches the right layout frame) */}
            <div className="hidden lg:block rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                  <CreditCard className="w-6 h-6" aria-hidden />
                </span>
                <h2 className="text-2xl font-semibold text-slate-900">Payment Methods</h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3">
                {servicesByCategory.paymentModes.slice(0, 6).map((m) => (
                  <PaymentModePill key={m} mode={m} />
                ))}
                {servicesByCategory.freeCancellation ? (
                  <PolicyCard tone="success" icon={<BadgeCheck className="w-4 h-4" aria-hidden />} label="Free cancellation" />
                ) : null}
                {servicesByCategory.groupStay ? (
                  <PolicyCard tone="neutral" icon={<UsersRound className="w-4 h-4" aria-hidden />} label="Group stay" />
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-slate-600">Starting from</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{price}</div>
              <div className="text-xs text-slate-500">per night</div>

              <button
                type="button"
                onClick={() => alert("Booking flow is coming next (Phase 2).")}
                className="mt-4 w-full rounded-xl bg-[#02665e] text-white py-3 text-sm font-semibold hover:bg-[#014e47] transition-colors"
              >
                Request booking
              </button>

              <div className="mt-3 text-xs text-slate-600 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5" />
                <span>Approved listings only. Secure workflows and host verification are in progress.</span>
              </div>
            </div>
          </aside>
        </div>

        {/* Availability Checker */}
        <PropertyAvailabilityChecker
          propertyId={property.id}
          onAvailability={(data) => setAvailabilityData(data)}
          onDatesChange={(checkIn, checkOut) => setSelectedDates({ checkIn, checkOut })}
          refreshSignal={availabilityRefreshTick}
          dates={selectedDates}
        />

        {/* Building visualization (owner-declared) */}
        {property.roomsSpec && property.roomsSpec.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                <Building2 className="w-5 h-5" aria-hidden />
              </span>
              <h2 className="text-lg font-semibold text-slate-900">Building layout</h2>
            </div>
            <div className="mt-4">
              {(() => {
                const roomsSpec = Array.isArray(property.roomsSpec) ? property.roomsSpec : [];
                const explicitFloors = typeof property.totalFloors === "number" ? property.totalFloors : null;
                const derivedFloors = (() => {
                  let max = 0;
                  for (const r of roomsSpec) {
                    const dist = (r as any)?.floorDistribution;
                    let obj: any = dist;
                    if (typeof dist === "string") {
                      try { obj = JSON.parse(dist); } catch { obj = null; }
                    }
                    if (obj && typeof obj === "object") {
                      for (const k of Object.keys(obj)) {
                        const n = Number(k);
                        if (Number.isFinite(n)) max = Math.max(max, n);
                      }
                    }
                  }
                  return max > 0 ? max : 1;
                })();

                const effectiveTotalFloors = explicitFloors && explicitFloors > 0 ? explicitFloors : derivedFloors;
                const effectiveBuildingType =
                  (property.buildingType && String(property.buildingType).trim()) ||
                  (effectiveTotalFloors > 1 ? "multi_storey" : "single_storey");

                return (
                  <PropertyVisualizationPreview
                    title={property.title || "Property"}
                    buildingType={effectiveBuildingType}
                    totalFloors={effectiveTotalFloors}
                    showHeader={false}
                    rooms={roomsSpec.map((r: any) => {
                      // floorDistribution may arrive as JSON string or object
                      let floorDist: Record<number, number> | undefined = undefined;
                      const dist = r?.floorDistribution;
                      if (dist) {
                        if (typeof dist === "string") {
                          try {
                            const parsed = JSON.parse(dist);
                            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                              floorDist = parsed;
                            }
                          } catch {}
                        } else if (typeof dist === "object" && dist !== null && !Array.isArray(dist)) {
                          floorDist = dist;
                        }
                      }
                      return {
                        roomType: String(r?.roomType || r?.name || r?.label || "Room"),
                        roomsCount: Number(r?.roomsCount ?? r?.count ?? r?.quantity ?? 0) || 0,
                        floorDistribution: floorDist,
                      };
                    })}
                    onRoomTypeClick={({ roomType, floor }) => setRoomQuickView({ roomType, floor })}
                  />
                );
              })()}
            </div>
          </div>
        )}

        {/* Room quick view modal (booking shortcut) */}
        {roomQuickView ? (
          <div className="fixed inset-0 z-[80]">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setRoomQuickView(null)} />
            <div className="absolute inset-x-0 top-14 sm:top-20 mx-auto w-[min(92vw,640px)] h-[min(78vh,640px)]">
              <div
                className="rounded-[28px] border border-slate-200/80 bg-white shadow-2xl overflow-hidden nls-flipbook h-full flex flex-col ring-1 ring-slate-200/40"
                data-qb-version="flip-v1"
              >
                <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-50 via-white to-emerald-50/40 border-b border-slate-200 shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Quick booking</div>
                      <div className="mt-1 text-xl font-bold text-slate-900 truncate">{roomQuickView.roomType}</div>
                      <div className="mt-1 text-sm text-slate-600">
                        {getFloorName(roomQuickView.floor)} Floor
                        {selectedDates.checkIn && selectedDates.checkOut ? (
                          <span className="text-slate-400"> · dates selected</span>
                        ) : (
                          <span className="text-amber-700"> · select dates above to see live availability</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRoomQuickView(null)}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 w-10 h-10 transition-colors"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5 text-slate-600" aria-hidden />
                    </button>
                  </div>
                </div>

                <div className="p-3 sm:p-4 flex-1 overflow-y-auto">
                  {(() => {
                    const roomsSpec = Array.isArray(property.roomsSpec) ? property.roomsSpec : [];
                    const normalizedRows = normalizeRoomsSpec(roomsSpec, property.currency, property.basePrice, property, systemCommission);
                    const row = normalizedRows.find((r) => r.roomType === roomQuickView.roomType) || null;

                    const codesForType = roomsSpec
                      .filter((r: any) => String(r?.roomType || r?.name || r?.label || "").trim() === roomQuickView.roomType)
                      .map((r: any) => String(r?.code || r?.roomCode || "").trim())
                      .filter(Boolean);

                    // Availability API buckets are room-type based (e.g. "Single-1" -> "Single")
                    const bucketKeyFromCode = (s: string) => String(s || "").trim().replace(/-\d+$/, "");
                    const bucketKeysForType = Array.from(
                      new Set(
                        [roomQuickView.roomType, ...codesForType]
                          .map(bucketKeyFromCode)
                          .map((k) => k.trim())
                          .filter(Boolean)
                      )
                    );

                    const byCode = availabilityData?.byRoomType || null;
                    // Keep original calculation for debug log (do not change previously added log)
                    const availableCodes = byCode
                      ? bucketKeysForType.filter((c: string) => Number(byCode?.[c]?.availableRooms ?? 0) > 0)
                      : [];

                    const effectiveDates =
                      modalDates.checkIn && modalDates.checkOut ? modalDates : selectedDates;
                    const availabilityMatchesDates =
                      !!byCode &&
                      !!availabilityData?.checkIn &&
                      !!availabilityData?.checkOut &&
                      !!effectiveDates.checkIn &&
                      !!effectiveDates.checkOut &&
                      String(availabilityData.checkIn).startsWith(effectiveDates.checkIn) &&
                      String(availabilityData.checkOut).startsWith(effectiveDates.checkOut);

                    const roomIndex = roomsSpec.findIndex(
                      (r: any) => String(r?.roomType || r?.name || r?.label || "").trim() === roomQuickView.roomType
                    );

                    const defaultAvail = byCode?.default || null;
                    const availabilityMode: "none" | "per_code" | "default" =
                      !byCode ? "none" : bucketKeysForType.length ? "per_code" : defaultAvail ? "default" : "none";

                    const computedAvailableRooms =
                      !byCode
                        ? null
                        : !availabilityMatchesDates
                          ? null
                          : availabilityMode === "per_code"
                            ? bucketKeysForType.reduce((sum: number, c: string) => sum + Number(byCode?.[c]?.availableRooms ?? 0), 0)
                            : availabilityMode === "default"
                              ? Number(defaultAvail?.availableRooms ?? 0)
                              : 0;

                    const canBook =
                      Boolean(effectiveDates.checkIn && effectiveDates.checkOut) &&
                      (computedAvailableRooms == null ? false : computedAvailableRooms > 0) &&
                      (codesForType.length > 0 || roomIndex >= 0);

                    const buildBookingUrl = () => {
                      const base = `/public/booking/confirm?property=${property.id}&checkIn=${encodeURIComponent(
                        effectiveDates.checkIn
                      )}&checkOut=${encodeURIComponent(effectiveDates.checkOut)}&floor=${roomQuickView.floor}&adults=${encodeURIComponent(
                        String(Math.max(1, Number(modalGuests.adults || 1)))
                      )}&children=${encodeURIComponent(String(Math.max(0, Number(modalGuests.children || 0))))}&pets=${encodeURIComponent(
                        String(Math.max(0, Number(modalGuests.pets || 0)))
                      )}&rooms=${encodeURIComponent(String(Math.max(1, Number(modalRoomsQty || 1))))}`;
                      if (bucketKeysForType.length > 0) {
                        // Use room-type key so availability + booking capacity stay consistent
                        const code = availabilityMode === "per_code"
                          ? (availableCodes[0] || bucketKeysForType[0])
                          : bucketKeysForType[0];
                        return `${base}&roomCode=${encodeURIComponent(code)}`;
                      }
                      if (roomIndex >= 0) {
                        return `${base}&roomIndex=${roomIndex}`;
                      }
                      return base;
                    };

                    return (
                      true ? (
                      <div className="relative [perspective:1200px] [isolation:isolate]">
                          <div
                            className={[
                              "relative min-h-[420px]",
                              "motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-in-out",
                            "[transform-style:preserve-3d]",
                            "[will-change:transform]",
                              quickBookingPage === "availability" ? "[transform:rotateY(180deg)]" : "",
                            ].join(" ")}
                          >
                            {/* Front: Details */}
                          <div
                            className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden]"
                            data-qb-face="front"
                          >
                              {(() => {
                                const maxGuests = Number(property.maxGuests ?? 0) > 0 ? Number(property.maxGuests) : 100;
                                const declaredRoomsCount =
                                  typeof row?.roomsCount === "number" && row.roomsCount > 0
                                    ? row.roomsCount
                                    : (() => {
                                        const rs = Array.isArray(property.roomsSpec) ? property.roomsSpec : [];
                                        const found = rs.find(
                                          (x: any) => String(x?.roomType || x?.name || x?.label || "").trim() === roomQuickView.roomType
                                        );
                                        const n = Number(found?.roomsCount ?? found?.count ?? found?.quantity ?? 0);
                                        return Number.isFinite(n) && n > 0 ? n : 1;
                                      })();
                                const maxRooms =
                                  computedAvailableRooms != null && availabilityMatchesDates
                                    ? Math.max(1, computedAvailableRooms)
                                    : Math.max(1, declaredRoomsCount);

                                const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
                                const setRooms = (next: number) => setModalRoomsQty(clamp(next, 1, maxRooms));
                                const setAdults = (next: number) =>
                                  setModalGuests((g) => ({ ...g, adults: clamp(next, 1, maxGuests) }));

                                const Stepper = ({
                                  value,
                                  min,
                                  max,
                                  onChange,
                                  label,
                                }: {
                                  value: number;
                                  min: number;
                                  max: number;
                                  onChange: (n: number) => void;
                                  label: string;
                                }) => (
                                  <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                                    <button
                                      type="button"
                                      onClick={() => onChange(value - 1)}
                                      disabled={value <= min}
                                      className="w-10 h-10 inline-flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      aria-label={`Decrease ${label}`}
                                    >
                                      <Minus className="w-4 h-4 text-slate-700" aria-hidden />
                                    </button>
                                    <div className="w-10 h-10 inline-flex items-center justify-center text-sm font-extrabold text-slate-900">
                                      {value}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => onChange(value + 1)}
                                      disabled={value >= max}
                                      className="w-10 h-10 inline-flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      aria-label={`Increase ${label}`}
                                    >
                                      <Plus className="w-4 h-4 text-slate-700" aria-hidden />
                                    </button>
                                  </div>
                                );

                                const canFlip = Boolean(modalDates.checkIn && modalDates.checkOut);

                                return (
                                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Beds</div>
                                          <div className="mt-1 text-sm font-semibold text-slate-900">{row?.bedsSummary || "—"}</div>
                                        </div>
                                        <div className="text-right">
                                          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Price / night</div>
                                          <div className="mt-1 text-base font-extrabold text-slate-900">
                                            {fmtMoney(row?.pricePerNight ?? null, property.currency)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Check-in</label>
                                        <div className="relative">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setModalCheckInPickerOpen(true);
                                              setModalCheckOutPickerOpen(false);
                                            }}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-300 bg-white flex items-center justify-between"
                                            aria-label="Select check-in date"
                                          >
                                            <span className="inline-flex items-center gap-2 min-w-0">
                                              <Calendar className="w-4 h-4 text-[#02665e]" aria-hidden />
                                              <span className="text-slate-900 truncate">
                                                {modalDates.checkIn ? formatDateLabel(modalDates.checkIn) : "Select date"}
                                              </span>
                                            </span>
                                            <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden />
                                          </button>
                                          {modalCheckInPickerOpen && (
                                            <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 sm:p-6">
                                              <div
                                                className="absolute inset-0 bg-black/15 backdrop-blur-[1px]"
                                                onClick={() => setModalCheckInPickerOpen(false)}
                                              />
                                              <div className="relative mt-24 sm:mt-28 bg-white rounded-2xl border-2 border-slate-200 shadow-2xl p-3 transition-all duration-200">
                                                <DatePicker
                                                  selected={modalDates.checkIn}
                                                  onSelectAction={(s) => {
                                                    const date = Array.isArray(s) ? s[0] : s;
                                                    setModalDates((st) => ({ ...st, checkIn: date }));
                                                    setModalAvailError(null);
                                                    setModalCheckInPickerOpen(false);
                                                    // Reset check-out if it is before/equals new check-in
                                                    if (modalDates.checkOut && date && new Date(modalDates.checkOut) <= new Date(date)) {
                                                      setModalDates((st) => ({ ...st, checkOut: "" }));
                                                    }
                                                  }}
                                                  onCloseAction={() => setModalCheckInPickerOpen(false)}
                                                  minDate={new Date().toISOString().split("T")[0]}
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="space-y-1">
                                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Check-out</label>
                                        <div className="relative">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setModalCheckOutPickerOpen(true);
                                              setModalCheckInPickerOpen(false);
                                            }}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-300 bg-white flex items-center justify-between"
                                            aria-label="Select check-out date"
                                          >
                                            <span className="inline-flex items-center gap-2 min-w-0">
                                              <Calendar className="w-4 h-4 text-[#02665e]" aria-hidden />
                                              <span className="text-slate-900 truncate">
                                                {modalDates.checkOut ? formatDateLabel(modalDates.checkOut) : "Select date"}
                                              </span>
                                            </span>
                                            <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden />
                                          </button>
                                          {modalCheckOutPickerOpen && (
                                            <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 sm:p-6">
                                              <div
                                                className="absolute inset-0 bg-black/15 backdrop-blur-[1px]"
                                                onClick={() => setModalCheckOutPickerOpen(false)}
                                              />
                                              <div className="relative mt-24 sm:mt-28 bg-white rounded-2xl border-2 border-slate-200 shadow-2xl p-3 transition-all duration-200">
                                                <DatePicker
                                                  selected={modalDates.checkOut}
                                                  onSelectAction={(s) => {
                                                    const date = Array.isArray(s) ? s[0] : s;
                                                    setModalDates((st) => ({ ...st, checkOut: date }));
                                                    setModalAvailError(null);
                                                    setModalCheckOutPickerOpen(false);
                                                  }}
                                                  onCloseAction={() => setModalCheckOutPickerOpen(false)}
                                                  minDate={modalDates.checkIn || new Date().toISOString().split("T")[0]}
                                                />
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                        <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Rooms</div>
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                          <div className="text-sm font-semibold text-slate-900">{modalRoomsQty}</div>
                                          <Stepper value={modalRoomsQty} min={1} max={maxRooms} onChange={setRooms} label="rooms" />
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-500">Max {maxRooms}.</div>
                                      </div>
                                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                                        <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Adults</div>
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                          <div className="text-sm font-semibold text-slate-900">{modalGuests.adults}</div>
                                          <Stepper value={modalGuests.adults} min={1} max={maxGuests} onChange={setAdults} label="adults" />
                                        </div>
                                        <div className="mt-1 text-[11px] text-slate-500">Max {maxGuests}.</div>
                                      </div>
                                    </div>

                                    <div className="mt-4 flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setQuickBookingPage("availability");
                                        }}
                                        disabled={!canFlip}
                                        className="flex-1 rounded-xl bg-slate-900 text-white py-2.5 text-sm font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Next: check availability
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          document.getElementById("roomsSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                          setRoomQuickView(null);
                                        }}
                                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                                      >
                                        View rooms
                                      </button>
                                    </div>

                                    {!canFlip ? (
                                      <div className="mt-2 text-xs text-amber-700">Select both dates to continue.</div>
                                    ) : null}
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Back: Availability */}
                          <div
                            className="absolute inset-0 [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)]"
                            data-qb-face="back"
                          >
                              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Availability</div>
                                    <div className="mt-1 text-sm text-slate-700">
                                      {effectiveDates.checkIn && effectiveDates.checkOut
                                        ? `${formatDateLabel(effectiveDates.checkIn)} → ${formatDateLabel(effectiveDates.checkOut)}`
                                        : "Select dates first"}
                                    </div>
                                    <div className="mt-1 text-[11px] text-slate-500">
                                      Rooms: {modalRoomsQty} · Adults: {modalGuests.adults}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuickBookingPage("details");
                                    }}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                                  >
                                    Back
                                  </button>
                                </div>

                                <div className="mt-4 flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      runAvailabilityCheck(property.id, modalDates.checkIn, modalDates.checkOut, roomQuickView.roomType);
                                    }}
                                    disabled={modalAvailLoading}
                                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {modalAvailLoading ? (
                                      <span className="inline-flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                                        Checking...
                                      </span>
                                    ) : (
                                      "Check availability"
                                    )}
                                  </button>
                                  {modalAvailError ? (
                                    <div className="text-xs font-semibold text-rose-700">{modalAvailError}</div>
                                  ) : null}
                                </div>

                                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Result</div>
                                  <div className="mt-1 text-sm font-semibold text-slate-900">
                                    {computedAvailableRooms == null
                                      ? "Select dates and check availability"
                                      : computedAvailableRooms > 0
                                        ? availabilityMode === "default"
                                          ? `${computedAvailableRooms} available (overall)`
                                          : `${computedAvailableRooms} available`
                                        : "No availability for selected dates"}
                                  </div>
                                  {availabilityMode === "default" ? (
                                    <div className="mt-1 text-[11px] text-slate-500">
                                      This listing tracks availability at the property level (no per-room codes yet).
                                    </div>
                                  ) : null}
                                  {byCode && !availabilityMatchesDates && (modalDates.checkIn && modalDates.checkOut) ? (
                                    <div className="mt-1 text-[11px] text-amber-700">
                                      Availability shown may be for different dates — tap “Check availability”.
                                    </div>
                                  ) : null}
                                </div>

                                <div className="mt-4 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      router.push(buildBookingUrl());
                                    }}
                                    disabled={!canBook}
                                    className="flex-1 inline-flex items-center justify-center rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-semibold hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Book this room type
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      document.getElementById("roomsSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                      setRoomQuickView(null);
                                    }}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                                  >
                                    View rooms
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                        {/* Left: compact premium summary + rooms/guests */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 nols-entrance">
                          <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Beds</div>
                                <div className="mt-1 text-sm font-semibold text-slate-900">{row?.bedsSummary || "—"}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Price / night</div>
                                <div className="mt-1 text-base font-extrabold text-slate-900">
                                  {fmtMoney(row?.pricePerNight ?? null, property!.currency)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {(() => {
                            const maxGuests = Number(property!.maxGuests ?? 0) > 0 ? Number(property!.maxGuests) : 100;
                            const petsAllowed = houseRules?.pets === false ? false : true;
                            const declaredRoomsCount =
                              typeof row?.roomsCount === "number" && (row?.roomsCount ?? 0) > 0
                                ? (row?.roomsCount ?? 0)
                                : (() => {
                                    const rs = Array.isArray(property!.roomsSpec) ? property!.roomsSpec : [];
                                    const found = rs.find(
                                      (x: any) => String(x?.roomType || x?.name || x?.label || "").trim() === roomQuickView!.roomType
                                    );
                                    const n = Number(found?.roomsCount ?? found?.count ?? found?.quantity ?? 0);
                                    return Number.isFinite(n) && n > 0 ? n : 1;
                                  })();
                            const maxRooms =
                              computedAvailableRooms != null ? Math.max(1, Number(computedAvailableRooms)) : Math.max(1, declaredRoomsCount);

                            const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
                            const setRooms = (next: number) => setModalRoomsQty(clamp(next, 1, maxRooms));
                            const setAdults = (next: number) =>
                              setModalGuests((g) => ({ ...g, adults: clamp(next, 1, maxGuests) }));
                            const setChildren = (next: number) =>
                              setModalGuests((g) => ({ ...g, children: clamp(next, 0, maxGuests) }));
                            const setPets = (next: number) =>
                              setModalGuests((g) => ({ ...g, pets: petsAllowed ? clamp(next, 0, 10) : 0 }));

                            const Stepper = ({
                              value,
                              min,
                              max,
                              onChange,
                              label,
                              disabled,
                            }: {
                              value: number;
                              min: number;
                              max: number;
                              onChange: (n: number) => void;
                              label: string;
                              disabled?: boolean;
                            }) => (
                              <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => onChange(value - 1)}
                                  disabled={disabled || value <= min}
                                  className="w-10 h-10 inline-flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  aria-label={`Decrease ${label}`}
                                >
                                  <Minus className="w-4 h-4 text-slate-700" aria-hidden />
                                </button>
                                <div className="w-10 h-10 inline-flex items-center justify-center text-sm font-extrabold text-slate-900">
                                  {disabled ? 0 : value}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onChange(value + 1)}
                                  disabled={disabled || value >= max}
                                  className="w-10 h-10 inline-flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  aria-label={`Increase ${label}`}
                                >
                                  <Plus className="w-4 h-4 text-slate-700" aria-hidden />
                                </button>
                              </div>
                            );

                            return (
                              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 nols-entrance nols-delay-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                                    Customize
                                  </div>
                                  <div className="text-[11px] text-slate-500">Max guests: {maxGuests}</div>
                                </div>

                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {/* Rooms tile */}
                                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:bg-white transition-colors">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Rooms</div>
                                        <div className="mt-1 text-sm font-semibold text-slate-900">{modalRoomsQty}</div>
                                        <div className="mt-1 text-[11px] text-slate-500">Max {maxRooms} for this type</div>
                                      </div>
                                      <Stepper value={modalRoomsQty} min={1} max={maxRooms} onChange={setRooms} label="rooms" />
                                    </div>
                                  </div>

                                  {/* Adults tile */}
                                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:bg-white transition-colors">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Adults</div>
                                        <div className="mt-1 text-sm font-semibold text-slate-900">{modalGuests.adults}</div>
                                      </div>
                                      <Stepper value={modalGuests.adults} min={1} max={maxGuests} onChange={setAdults} label="adults" />
                                    </div>
                                  </div>

                                  {/* Children tile */}
                                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:bg-white transition-colors">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">Children</div>
                                        <div className="mt-1 text-sm font-semibold text-slate-900">{modalGuests.children}</div>
                                      </div>
                                      <Stepper value={modalGuests.children} min={0} max={maxGuests} onChange={setChildren} label="children" />
                                    </div>
                                  </div>

                                  {/* Pets tile */}
                                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 hover:bg-white transition-colors">
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                        <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                                          Pets {petsAllowed ? "" : <span className="text-slate-500 font-medium">(not allowed)</span>}
                                        </div>
                                        <div className="mt-1 text-sm font-semibold text-slate-900">{petsAllowed ? modalGuests.pets : 0}</div>
                                      </div>
                                      <Stepper
                                        value={modalGuests.pets}
                                        min={0}
                                        max={10}
                                        onChange={setPets}
                                        label="pets"
                                        disabled={!petsAllowed}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Right: dates + availability + actions (premium compact) */}
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 nols-entrance nols-delay-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Check-in</label>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalCheckInPickerOpen(true);
                                    setModalCheckOutPickerOpen(false);
                                  }}
                                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-300 bg-white flex items-center justify-between"
                                  aria-label="Select check-in date"
                                >
                                  <span className="inline-flex items-center gap-2 min-w-0">
                                    <Calendar className="w-4 h-4 text-[#02665e]" aria-hidden />
                                    <span className="text-slate-900 truncate">
                                      {modalDates.checkIn ? formatDateLabel(modalDates.checkIn) : "Select date"}
                                    </span>
                                  </span>
                                  <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden />
                                </button>
                                {modalCheckInPickerOpen && (
                                  <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 sm:p-6">
                                    <div
                                      className="absolute inset-0 bg-black/15 backdrop-blur-[1px]"
                                      onClick={() => setModalCheckInPickerOpen(false)}
                                    />
                                    <div className="relative mt-24 sm:mt-28 bg-white rounded-2xl border-2 border-slate-200 shadow-2xl p-3 transition-all duration-200">
                                      <DatePicker
                                        selected={modalDates.checkIn}
                                        onSelectAction={(s) => {
                                          const date = Array.isArray(s) ? s[0] : s;
                                          setModalDates((st) => ({ ...st, checkIn: date }));
                                          setModalAvailError(null);
                                          setModalCheckInPickerOpen(false);
                                          // Reset check-out if it is before/equals new check-in
                                          if (modalDates.checkOut && date && new Date(modalDates.checkOut) <= new Date(date)) {
                                            setModalDates((st) => ({ ...st, checkOut: "" }));
                                          }
                                        }}
                                        onCloseAction={() => setModalCheckInPickerOpen(false)}
                                        minDate={new Date().toISOString().split("T")[0]}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">Check-out</label>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setModalCheckOutPickerOpen(true);
                                    setModalCheckInPickerOpen(false);
                                  }}
                                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] hover:border-slate-300 bg-white flex items-center justify-between"
                                  aria-label="Select check-out date"
                                >
                                  <span className="inline-flex items-center gap-2 min-w-0">
                                    <Calendar className="w-4 h-4 text-[#02665e]" aria-hidden />
                                    <span className="text-slate-900 truncate">
                                      {modalDates.checkOut ? formatDateLabel(modalDates.checkOut) : "Select date"}
                                    </span>
                                  </span>
                                  <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden />
                                </button>
                                {modalCheckOutPickerOpen && (
                                  <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 sm:p-6">
                                    <div
                                      className="absolute inset-0 bg-black/15 backdrop-blur-[1px]"
                                      onClick={() => setModalCheckOutPickerOpen(false)}
                                    />
                                    <div className="relative mt-24 sm:mt-28 bg-white rounded-2xl border-2 border-slate-200 shadow-2xl p-3 transition-all duration-200">
                                      <DatePicker
                                        selected={modalDates.checkOut}
                                        onSelectAction={(s) => {
                                          const date = Array.isArray(s) ? s[0] : s;
                                          setModalDates((st) => ({ ...st, checkOut: date }));
                                          setModalAvailError(null);
                                          setModalCheckOutPickerOpen(false);
                                        }}
                                        onCloseAction={() => setModalCheckOutPickerOpen(false)}
                                        minDate={modalDates.checkIn || new Date().toISOString().split("T")[0]}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => runAvailabilityCheck(property!.id, modalDates.checkIn, modalDates.checkOut)}
                              disabled={modalAvailLoading}
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {modalAvailLoading ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                                  Checking...
                                </span>
                              ) : (
                                "Check availability"
                              )}
                            </button>
                            {modalAvailError ? (
                              <div className="text-xs font-semibold text-rose-700">{modalAvailError}</div>
                            ) : null}
                          </div>

                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Availability</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {computedAvailableRooms == null
                              ? "Select dates and check availability"
                              : Number(computedAvailableRooms) > 0
                                ? availabilityMode === "default"
                                  ? `${computedAvailableRooms} available (overall)`
                                  : `${computedAvailableRooms} available`
                                : "No availability for selected dates"}
                          </div>
                          {availabilityMode === "default" ? (
                            <div className="mt-1 text-[11px] text-slate-500">
                              This listing tracks availability at the property level (no per-room codes yet).
                            </div>
                          ) : null}
                          {byCode && !availabilityMatchesDates && (modalDates.checkIn && modalDates.checkOut) ? (
                            <div className="mt-1 text-[11px] text-amber-700">
                              Availability shown may be for different dates — tap “Check availability”.
                            </div>
                          ) : null}

                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                router.push(buildBookingUrl());
                              }}
                              disabled={!canBook}
                              className="flex-1 inline-flex items-center justify-center rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-semibold hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Book this room type
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                document.getElementById("roomsSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
                                setRoomQuickView(null);
                              }}
                              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                            >
                              View rooms
                            </button>
                          </div>

                          {!selectedDates.checkIn || !selectedDates.checkOut ? (
                            <div className="mt-2 text-xs text-amber-700">
                              Tip: select dates in “Check Availability”, then tap “Check Availability”.
                            </div>
                          ) : null}
                        </div>
                      </div>
                      )
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Rooms (full-width on large screens; no horizontal scroll) */}
        <div id="roomsSection" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
              <DoorClosed className="w-5 h-5" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold text-slate-900">Rooms</h2>
          </div>
          {(() => {
            const rows = normalizeRoomsSpec(property.roomsSpec, property.currency, property.basePrice, property, systemCommission);
            if (!rows.length) return <p className="mt-2 text-sm text-slate-600">Room details coming soon.</p>;

            return (
              <div className="mt-4">
                {/* Mobile: stacked rows */}
                <div className="space-y-3 md:hidden">
                  {rows.map((r, idx) => (
                    <div key={`${r.roomType}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            <span className="inline-flex items-center gap-2">
                              <DoorClosed className="w-4 h-4 text-slate-500" aria-hidden />
                              <span className="truncate">{r.roomType}</span>
                            </span>
                            {typeof r.roomsCount === "number" && r.roomsCount > 0 ? (
                              <span className="ml-2 inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                x{r.roomsCount}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1">
                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                              <BedDouble className="w-3.5 h-3.5 text-slate-500" aria-hidden />
                              <span className="truncate">{r.bedsSummary}</span>
                            </div>
                            {getBedDimensions(r.bedsSummary) && (
                              <div className="mt-1 text-[10px] text-slate-500 leading-tight">
                                {getBedDimensions(r.bedsSummary)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-slate-900">{fmtMoney(r.pricePerNight, property.currency)}</div>
                          <div className="text-[11px] text-slate-500">per night</div>
                          {r.discountLabel ? (
                            <div className="mt-1 text-[11px] font-semibold text-emerald-700">{r.discountLabel}</div>
                          ) : null}
                        </div>
                      </div>

                      {r.description ? (
                        <div className="mt-3 p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200/60">
                          <p className="text-sm text-slate-800 leading-relaxed font-normal">
                            {capWords(r.description, 180)}
                          </p>
                        </div>
                      ) : null}

                      {r.amenities.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {r.amenities.slice(0, 6).map((a) => (
                            <RoomAmenityChip
                              key={a}
                              label={a}
                              activeHint={roomAmenityHint}
                              onTouchHint={(label) => setRoomAmenityHint(label)}
                            />
                          ))}
                        </div>
                      ) : null}

                      {r.bathItems && r.bathItems.length > 0 ? (
                        <div className="mt-3">
                          <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Bath className="w-4 h-4 text-slate-600" />
                              <span>Bathroom</span>
                            </div>
                            {r.bathPrivate && (r.bathPrivate === "yes" || r.bathPrivate === "no") && (
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 ${
                                r.bathPrivate === "yes" 
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                              }`}>
                                {r.bathPrivate === "yes" ? (
                                  <>
                                    <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Private</span>
                                  </>
                                ) : (
                                  <>
                                    <Share2 className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Shared</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {r.bathItems.map((item) => (
                              <RoomAmenityChip
                                key={item}
                                label={item}
                                activeHint={roomAmenityHint}
                                onTouchHint={(label) => setRoomAmenityHint(label)}
                              />
                            ))}
                          </div>
                        </div>
                      ) : r.bathPrivate && (r.bathPrivate === "yes" || r.bathPrivate === "no") ? (
                        <div className="mt-3">
                          <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Bath className="w-4 h-4 text-slate-600" />
                              <span>Bathroom</span>
                            </div>
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 ${
                              r.bathPrivate === "yes" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}>
                              {r.bathPrivate === "yes" ? (
                                <>
                                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span>Private</span>
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span>Shared</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="mt-3">
                        <div className="text-[11px] font-semibold text-slate-700">Policies</div>
                        <ul className="mt-1 space-y-1 text-[12px] text-slate-700">
                          {r.policies.slice(0, 4).map((p, i) => (
                            <li key={i} className="truncate flex items-center gap-1.5">
                              {p.Icon && (
                                <p.Icon className={`w-3.5 h-3.5 flex-shrink-0 ${p.iconColor || "text-slate-600"}`} aria-hidden />
                              )}
                              <span>{p.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const params = new URLSearchParams({
                            property: String(property.id),
                          });
                          // Use roomCode if available, otherwise use index as fallback
                          if (r.roomCode) {
                            params.set("roomCode", r.roomCode);
                          } else {
                            // Use index as identifier when code is not available
                            const roomIndex = rows.findIndex((row) => row === r);
                            if (roomIndex >= 0) {
                              params.set("roomIndex", String(roomIndex));
                            }
                          }
                          router.push(`/public/booking/confirm?${params.toString()}`);
                        }}
                        className="mt-4 w-full rounded-lg bg-[#02665e] text-white py-1.5 px-3 text-xs font-medium hover:bg-[#014e47] transition-colors shadow-sm hover:shadow"
                      >
                        Pay now
                      </button>
                    </div>
                  ))}
                </div>

                {/* Desktop: modern column-aligned "card rows" (clean + transitional) */}
                <div className="hidden md:block">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm overflow-hidden">
                    <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-slate-50/70 border-b border-slate-200">
                      <div className="col-span-2 text-[12px] font-semibold text-slate-600">Room type</div>
                      <div className="col-span-2 text-[12px] font-semibold text-slate-600">Bed Type &amp; Size</div>
                      <div className="col-span-4 text-[12px] font-semibold text-slate-600">Description &amp; Amenities</div>
                      <div className="col-span-2 text-[12px] font-semibold text-slate-600">Price &amp; Discounts</div>
                      <div className="col-span-1 text-[12px] font-semibold text-slate-600">Pay now</div>
                      <div className="col-span-1 text-[12px] font-semibold text-slate-600">Policies</div>
                    </div>

                    <div className="divide-y divide-slate-200">
                      {rows.map((r, idx) => (
                        <div
                          key={`${r.roomType}-${idx}`}
                          className={[
                            "grid grid-cols-12 gap-3 px-4 py-4",
                            "bg-white",
                            "hover:bg-emerald-50/30",
                            "motion-safe:transition-colors motion-safe:duration-200",
                          ].join(" ")}
                        >
                          {/* Room type */}
                          <div className="col-span-2">
                            <div className="inline-flex items-start gap-2 text-base font-semibold text-slate-900">
                              <DoorClosed className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" aria-hidden />
                              <span className="break-words">{r.roomType}</span>
                            </div>
                            {typeof r.roomsCount === "number" && r.roomsCount > 0 ? (
                              <div className="mt-1 inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                {r.roomsCount} rooms
                              </div>
                            ) : null}
                          </div>

                          {/* Beds */}
                          <div className="col-span-2">
                            <div className="inline-flex items-start gap-2 text-base text-slate-800">
                              <BedDouble className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" aria-hidden />
                              <span className="break-words">{r.bedsSummary}</span>
                            </div>
                            {getBedDimensions(r.bedsSummary) && (
                              <div className="mt-1.5 text-xs text-slate-500 leading-tight">
                                {getBedDimensions(r.bedsSummary)}
                              </div>
                            )}
                          </div>

                          {/* Description & Amenities */}
                          <div className="col-span-4">
                            {r.description ? (
                              <div className="p-3 rounded-xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-emerald-50/20">
                                <p className="text-sm text-slate-800 leading-relaxed break-words">
                                  {capWords(r.description, 220)}
                                </p>
                              </div>
                            ) : (
                              <div className="text-sm text-slate-500">—</div>
                            )}

                            {r.amenities.length ? (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {r.amenities.slice(0, 6).map((a) => (
                                  <RoomAmenityChip
                                    key={a}
                                    label={a}
                                    activeHint={roomAmenityHint}
                                    onTouchHint={(label) => setRoomAmenityHint(label)}
                                  />
                                ))}
                              </div>
                            ) : null}

                            {r.bathItems && r.bathItems.length > 0 ? (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <div className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <Bath className="w-4 h-4 text-slate-600" />
                                    <span>Bathroom amenities</span>
                                  </div>
                                  {r.bathPrivate && (r.bathPrivate === "yes" || r.bathPrivate === "no") && (
                                    <div
                                      className={[
                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium",
                                        r.bathPrivate === "yes"
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : "bg-blue-50 text-blue-700 border border-blue-200",
                                      ].join(" ")}
                                    >
                                      {r.bathPrivate === "yes" ? (
                                        <>
                                          <Lock className="w-3 h-3" />
                                          <span>Private</span>
                                        </>
                                      ) : (
                                        <>
                                          <Share2 className="w-3 h-3" />
                                          <span>Shared</span>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {r.bathItems.map((item) => (
                                    <RoomAmenityChip
                                      key={item}
                                      label={item}
                                      activeHint={roomAmenityHint}
                                      onTouchHint={(label) => setRoomAmenityHint(label)}
                                    />
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>

                          {/* Price */}
                          <div className="col-span-2">
                            <div className="text-base font-bold text-slate-900">{fmtMoney(r.pricePerNight, property.currency)}</div>
                            <div className="text-xs text-slate-500">per night</div>
                            {r.discountLabel ? (
                              <div className="mt-1 inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                {r.discountLabel}
                              </div>
                            ) : (
                              <div className="mt-1 text-xs text-slate-500">No discounts</div>
                            )}
                          </div>

                          {/* Pay */}
                          <div className="col-span-1">
                            <button
                              type="button"
                              onClick={() => {
                                const params = new URLSearchParams({ property: String(property.id) });
                                if (r.roomCode) {
                                  params.set("roomCode", r.roomCode);
                                } else {
                                  const roomIndex = rows.findIndex((row) => row === r);
                                  if (roomIndex >= 0) params.set("roomIndex", String(roomIndex));
                                }
                                router.push(`/public/booking/confirm?${params.toString()}`);
                              }}
                              className={[
                                "w-full rounded-xl bg-[#02665e] text-white px-3 py-2 text-sm font-semibold",
                                "hover:bg-[#014e47]",
                                "motion-safe:transition-all motion-safe:duration-200",
                                "shadow-sm hover:shadow",
                                "active:scale-[0.98]",
                              ].join(" ")}
                            >
                              Pay now
                            </button>
                            <div className="mt-2 text-[11px] text-slate-500">Secure checkout</div>
                          </div>

                          {/* Policies */}
                          <div className="col-span-1">
                            <div className="flex flex-col gap-1.5">
                              {r.policies.slice(0, 3).map((p, i) => (
                                <div key={i} className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                                  {p.Icon ? (
                                    <p.Icon className={`w-3.5 h-3.5 flex-shrink-0 ${p.iconColor || "text-slate-600"}`} aria-hidden />
                                  ) : null}
                                  <span className="truncate">{p.text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Reviews (bottom section) */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
              <MessageSquare className="w-5 h-5" aria-hidden />
            </span>
            <h2 className="text-lg font-semibold text-slate-900">Guest reviews</h2>
              </div>

          {reviewsError ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {reviewsError}
            </div>
          ) : reviewsLoading ? (
            <div className="mt-4 text-sm text-slate-600">Loading reviews…</div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                {(() => {
                  const avgRating = Number(reviewsData?.stats?.averageRating ?? 0);
                  const totalReviews = reviewsData?.stats?.totalReviews ?? 0;
                  const ratingPercent = (avgRating / 5) * 100;
                  const getRatingLabel = (rating: number) => {
                    if (rating >= 9) return "Wonderful";
                    if (rating >= 8) return "Very good";
                    if (rating >= 7) return "Good";
                    if (rating >= 6) return "Pleasant";
                    return "Fair";
                  };

                  return (
                    <>
                      <div className="inline-flex items-center justify-center rounded-lg bg-[#02665e] text-white px-3 py-1.5 min-w-[3rem]">
                        <span className="text-lg font-bold">{avgRating > 0 ? avgRating.toFixed(1) : "0.0"}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          {avgRating > 0 && (
                            <span className="font-medium">{getRatingLabel(avgRating)}</span>
                          )}
                          <span className="text-slate-500">·</span>
                          <span>{totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}</span>
                        </div>
                        <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-[#02665e] rounded-full transition-all duration-300 rating-bar`}
                            data-rating-width={ratingPercent}
                          ></div>
                        </div>
                      </div>
                    </>
                  );
                })()}
          </div>

              {/* Categories */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Categories:</h3>
                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    const categories = [
                      { key: "customerCare", label: "Customer care" },
                      { key: "security", label: "Security" },
                      { key: "reality", label: "Reality" },
                      { key: "comfort", label: "Comfort" },
                    ];

                    return categories.map(({ key, label }) => {
                      const categoryRating = reviewsData?.stats?.categoryAverages?.[key] ?? 0;
                      const ratingPercent = (categoryRating / 5) * 100;
                      const barColor = categoryRating >= 8 ? "bg-emerald-500" : categoryRating >= 6 ? "bg-[#02665e]" : "bg-slate-400";

                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-700 mb-1.5">{label}</div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${barColor} rounded-full transition-all duration-300 rating-bar-width`}
                                data-rating-width={ratingPercent}
                              />
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-slate-900 min-w-[2.5rem] text-right">
                            {categoryRating > 0 ? categoryRating.toFixed(1) : "0.0"}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {!reviewsLoading && (reviewsData?.reviews?.length ?? 0) === 0 && (
                <div className="mt-4 text-sm text-slate-600">
                  No reviews yet. Be the first to leave a review.
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {(reviewsData?.reviews ?? []).slice(0, 20).map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>

          {/* Leave a review */}
          {!isOwner ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm font-semibold text-slate-900">Leave a review</div>
            <div className="mt-1 text-xs text-slate-600">You can rate and comment. If you’re not logged in, we’ll ask you to log in first.</div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Rating</label>
                <div className="flex items-center gap-3">
              <StarPicker value={reviewRating} onChange={setReviewRating} />
                  {reviewRating > 0 && (
                    <span className="text-sm text-slate-600">
                      {reviewRating === 5 ? "Excellent" : reviewRating === 4 ? "Very good" : reviewRating === 3 ? "Good" : reviewRating === 2 ? "Fair" : "Poor"}
                    </span>
                  )}
                </div>
            </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Title <span className="text-slate-400 font-normal">(optional)</span>
                </label>
              <input
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                  placeholder="Give your review a title"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-colors"
              />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your review</label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share details about your experience..."
                rows={4}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] resize-y transition-colors"
              />
            </div>

              {/* Category Ratings */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block text-sm font-semibold text-slate-900 mb-4">Rate by category</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "customerCare" as const, label: "Customer care" },
                    { key: "security" as const, label: "Security" },
                    { key: "reality" as const, label: "Reality" },
                    { key: "comfort" as const, label: "Comfort" },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <div className="text-xs font-medium text-slate-700">{label}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-[#02665e] rounded-full transition-all duration-200 category-rating-bar"
                            data-width={categoryRatings[key]}
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setCategoryRatings((prev) => ({ ...prev, [key]: n }))}
                              className={`w-5 h-5 rounded border flex items-center justify-center text-xs transition-colors ${
                                n <= categoryRatings[key]
                                  ? "bg-amber-50 border-amber-300 text-amber-600"
                                  : "bg-white border-slate-200 text-slate-300 hover:border-slate-300"
                              }`}
                              aria-label={`${n} star for ${label}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 min-w-[2rem] text-right">
                          {categoryRatings[key] > 0 ? categoryRatings[key].toFixed(1) : "0.0"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {reviewSubmitMsg && (
                <div className={`rounded-lg p-3 text-sm ${
                  reviewSubmitMsg.includes("Thanks") || reviewSubmitMsg.includes("submitted")
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                    : "bg-rose-50 border border-rose-200 text-rose-700"
                }`}>
                  {reviewSubmitMsg}
                </div>
              )}

              <div className="pt-2">
              <button
                type="button"
                  disabled={reviewSubmitting || !reviewRating}
                onClick={async () => {
                  setReviewSubmitMsg(null);
                  if (!property?.id) return;
                  if (!reviewRating) {
                    setReviewSubmitMsg("Please select a rating (1–5).");
                    return;
                  }
                  setReviewSubmitting(true);
                  try {
                    const res = await fetch(`/api/property-reviews`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        propertyId: property.id,
                        rating: reviewRating,
                        title: reviewTitle.trim() || null,
                        comment: reviewComment.trim() || null,
                        categoryRatings: {
                          customerCare: categoryRatings.customerCare > 0 ? categoryRatings.customerCare : null,
                          security: categoryRatings.security > 0 ? categoryRatings.security : null,
                          reality: categoryRatings.reality > 0 ? categoryRatings.reality : null,
                          comfort: categoryRatings.comfort > 0 ? categoryRatings.comfort : null,
                        },
                      }),
                    });
                    if (res.status === 401) {
                      setReviewSubmitMsg("Please log in to submit a review.");
                      router.push(`/login?next=${encodeURIComponent(`/public/properties/${property.slug}`)}`);
                      return;
                    }
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      setReviewSubmitMsg(json?.error || `Failed to submit review (${res.status})`);
                      return;
                    }
                    setReviewSubmitMsg("Thanks! Your review was submitted.");
                    setReviewRating(0);
                    setReviewTitle("");
                    setReviewComment("");
                    setCategoryRatings({
                      customerCare: 0,
                      security: 0,
                      reality: 0,
                      comfort: 0,
                    });
                    const r2 = await fetch(`/api/property-reviews/${property.id}`, { cache: "no-store" });
                    if (r2.ok) setReviewsData((await r2.json()) as ReviewsResponse);
                  } catch (e: any) {
                    setReviewSubmitMsg(e?.message || "Failed to submit review");
                  } finally {
                    setReviewSubmitting(false);
                  }
                }}
                  className="w-full rounded-lg bg-[#02665e] text-white px-4 py-2.5 text-sm font-semibold hover:bg-[#014e47] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow"
              >
                {reviewSubmitting ? "Submitting…" : "Submit review"}
              </button>
            </div>
          </div>
          </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-900">Leave a review</div>
              <div className="mt-2 text-xs text-slate-600">
                As the property owner, you cannot leave reviews on your own property. However, you can still book this property like any other user.
              </div>
            </div>
          )}
        </div>

        {/* House Rules Section - Three Column Layout */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm nols-entrance">
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
              <Home className="w-5 h-5" aria-hidden />
            </span>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900">House Rules</h2>
          </div>
          
          {houseRules ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: Check-in & Check-out */}
              <div className="space-y-4 nols-entrance nols-delay-1">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-[#02665e]" />
                  <h3 className="text-sm font-semibold text-slate-900">Check-in & Check-out</h3>
                </div>
                <div className="space-y-3">
                  {houseRules.checkIn ? (
                    <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 motion-safe:duration-300">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Check-in</div>
                      <div className="text-sm font-medium text-slate-900">{houseRules.checkIn}</div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 opacity-60">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Check-in</div>
                      <div className="text-sm text-slate-400">Not specified</div>
                    </div>
                  )}
                  {houseRules.checkOut ? (
                    <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 motion-safe:duration-300">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Check-out</div>
                      <div className="text-sm font-medium text-slate-900">{houseRules.checkOut}</div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 opacity-60">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Check-out</div>
                      <div className="text-sm text-slate-400">Not specified</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 2: Pets */}
              <div className="space-y-4 nols-entrance nols-delay-2">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-5 h-5 text-[#02665e]" />
                  <h3 className="text-sm font-semibold text-slate-900">Pets</h3>
                </div>
                <div className="space-y-3">
                  {houseRules.pets !== undefined ? (
                    <div className={`rounded-lg border p-3 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 motion-safe:duration-300 ${
                      houseRules.pets 
                        ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" 
                        : "border-rose-200 bg-gradient-to-br from-rose-50 to-white"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {houseRules.pets ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <X className="w-4 h-4 text-rose-600" />
                        )}
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          {houseRules.pets ? "Allowed" : "Not Allowed"}
                        </div>
                      </div>
                      {houseRules.petsNote && (
                        <div className="text-sm text-slate-700 mt-2">{houseRules.petsNote}</div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 opacity-60">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pets</div>
                      <div className="text-sm text-slate-400">Not specified</div>
                    </div>
                  )}
                  {houseRules.smoking !== undefined && (
                    <div className={`rounded-lg border p-3 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 motion-safe:duration-300 ${
                      !houseRules.smoking 
                        ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white" 
                        : "border-rose-200 bg-gradient-to-br from-rose-50 to-white"
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {houseRules.smoking ? (
                          <CigaretteOff className="w-4 h-4 text-rose-600" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Smoking {houseRules.smoking ? "Not Allowed" : "Allowed"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: Safety Measures */}
              <div className="space-y-4 nols-entrance nols-delay-3">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-[#02665e]" />
                  <h3 className="text-sm font-semibold text-slate-900">Safety Measures</h3>
                </div>
                <div className="space-y-2">
                  {[
                    "Keep the property clean and well-maintained",
                    "Return all keys and access cards upon checkout",
                    "Report any incidents or damages immediately",
                    "Respect quiet hours and neighbors",
                    "Follow all posted safety guidelines"
                  ].map((measure, idx) => (
                    <div 
                      key={idx}
                      className="flex items-start gap-2 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3 transition-all duration-200 hover:shadow-sm hover:border-[#02665e]/30 hover:-translate-y-0.5 motion-safe:duration-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#02665e] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700 leading-relaxed">{measure}</span>
                    </div>
                  ))}
                  {houseRules.safetyMeasures && Array.isArray(houseRules.safetyMeasures) && houseRules.safetyMeasures.length > 0 && (
                    <>
                      {houseRules.safetyMeasures.map((measure: string, idx: number) => (
                        <div 
                          key={`custom-${idx}`}
                          className="flex items-start gap-2 rounded-lg border border-[#02665e]/20 bg-gradient-to-br from-[#02665e]/5 to-white p-3 transition-all duration-200 hover:shadow-sm hover:border-[#02665e]/40 hover:-translate-y-0.5 motion-safe:duration-300"
                        >
                          <CheckCircle2 className="w-4 h-4 text-[#02665e] flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-slate-700 leading-relaxed font-medium">{measure}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-500 italic text-center py-8">
              House rules will be available soon. The owner is setting up the rules for this property.
            </div>
          )}
        </div>

        {/* Location & Map - Two column layout */}
        {property.latitude && property.longitude && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Nearby Services - Left Column */}
            <div className="space-y-6">
                {/* Nearby Services - Detailed Cards */}
              {(() => {
                // Filter to only detailed facilities (with name)
                const detailedFacilities = nearbyFacilities.filter((f: any) => typeof f !== 'string' && f.name);
                
                if (detailedFacilities.length === 0) return null;
                
                // Show 2 by default, all when expanded
                const displayCount = showAllNearbyServices ? detailedFacilities.length : 2;
                const facilitiesToShow = detailedFacilities.slice(0, displayCount);
                const hasMore = detailedFacilities.length > 2;
                
                return (
                  <div className="rounded-xl border border-slate-200 bg-white p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                        <MapPin className="w-5 h-5" aria-hidden />
                      </span>
                      <h2 className="text-lg font-semibold text-slate-900">Nearby Services</h2>
                    </div>
                    
                    <div className="space-y-3">
                      {facilitiesToShow.map((facility: any, idx: number) => {
                      
                      // Get icon based on facility type
                      const getFacilityIcon = (type: string) => {
                        const t = (type || "").toLowerCase();
                        if (t.includes("hospital") || t.includes("clinic") || t.includes("pharmacy") || t.includes("polyclinic")) {
                          return { Icon: Hospital, color: "text-rose-600", bgColor: "bg-rose-50" };
                        }
                        if (t.includes("petrol") || t.includes("fuel") || t.includes("gas")) {
                          return { Icon: Fuel, color: "text-orange-600", bgColor: "bg-orange-50" };
                        }
                        if (t.includes("airport")) {
                          return { Icon: Plane, color: "text-blue-600", bgColor: "bg-blue-50" };
                        }
                        if (t.includes("bus") || t.includes("station")) {
                          return { Icon: Bus, color: "text-amber-700", bgColor: "bg-amber-50" };
                        }
                        if (t.includes("road") || t.includes("main road")) {
                          return { Icon: Route, color: "text-slate-700", bgColor: "bg-slate-50" };
                        }
                        if (t.includes("police")) {
                          return { Icon: Shield, color: "text-indigo-600", bgColor: "bg-indigo-50" };
                        }
                        if (t.includes("conference") || t.includes("center") || t.includes("centre")) {
                          return { Icon: MapPin, color: "text-emerald-600", bgColor: "bg-emerald-50" };
                        }
                        return { Icon: MapPin, color: "text-[#02665e]", bgColor: "bg-[#02665e]/10" };
                      };
                      
                      const facilityIcon = getFacilityIcon(facility.type || "");
                      const Icon = facilityIcon.Icon;
                      
                      return (
                        <div 
                          key={idx} 
                          className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:border-[#02665e]/30 hover:shadow-lg hover:shadow-[#02665e]/5 hover:-translate-y-0.5"
                        >
                          <div className="flex items-start gap-4">
                            {/* Icon - Enhanced with better styling */}
                            <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${facilityIcon.bgColor} flex items-center justify-center shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md`}>
                              <Icon className={`h-6 w-6 ${facilityIcon.color} transition-transform duration-300 group-hover:scale-110`} />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-3">
                              {/* Name */}
                              {facility.name && (
                                <div className="font-bold text-slate-900 text-base leading-snug tracking-tight">{facility.name}</div>
                              )}
                              
                              {/* Tags Row - Enhanced styling */}
                              <div className="flex flex-wrap items-center gap-2">
                                {facility.type && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100/80 shadow-sm">
                                    {facility.type}
                                  </span>
                                )}
                                {facility.ownership && (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/80 shadow-sm">
                                    {facility.ownership}
                                  </span>
                                )}
                              </div>
                              
                              {/* Distance & Link Row - Better spacing and styling */}
                              <div className="flex flex-wrap items-center gap-4 text-xs">
                                {typeof facility.distanceKm === 'number' && (
                                  <div className="inline-flex items-center gap-1.5 text-slate-700 font-semibold">
                                    <MapPin className="h-4 w-4 text-rose-500 flex-shrink-0" />
                                    <span>{facility.distanceKm} km</span>
                                  </div>
                                )}
                                {facility.url && (
                                  <a 
                                    href={facility.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="inline-flex items-center gap-1.5 text-[#02665e] hover:text-[#014e47] font-semibold transition-all duration-200 hover:underline underline-offset-2"
                                  >
                                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                                    <span>Link</span>
                                  </a>
                                )}
                              </div>
                              
                              {/* Transportation - Enhanced with better visual separation */}
                              {Array.isArray(facility.reachableBy) && facility.reachableBy.length > 0 && (
                                <div className="pt-2.5 border-t border-slate-100/80">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs text-slate-500 font-semibold">Reachable by:</span>
                                    {facility.reachableBy.map((mode: string, mIdx: number) => (
                                      <span 
                                        key={mIdx} 
                                        className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200/60 shadow-sm transition-colors duration-200 group-hover:border-slate-300"
                                      >
                                        {mode}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Subtle accent line on hover */}
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#02665e]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      );
                      })}
                    </div>
                    
                    {/* Show More/Less Button */}
                    {hasMore && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowAllNearbyServices(!showAllNearbyServices)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-semibold text-sm transition-all duration-200 border border-slate-200 hover:border-slate-300"
                        >
                          {showAllNearbyServices ? (
                            <>
                              <span>Show less</span>
                              <ChevronUp className="h-4 w-4" />
                            </>
                          ) : (
                            <>
                              <span>Show more</span>
                              <ChevronDown className="h-4 w-4" />
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Simple Nearby Places (string format) */}
              {nearbyFacilities.length > 0 && nearbyFacilities.some((f: any) => typeof f === 'string' || (!f.name && f)) && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                      <MapPin className="w-5 h-5" aria-hidden />
                    </span>
                    <h2 className="text-lg font-semibold text-slate-900">Nearby Places</h2>
                  </div>
                  <div className="space-y-2">
                    {nearbyFacilities
                      .filter((f: any) => typeof f === 'string' || !f.name)
                      .slice(0, 8)
                      .map((facility: any, idx: number) => {
                        const facilityStr = typeof facility === 'string' ? facility : (facility?.label || String(facility));
                        const normalized = normalizeNearby([facilityStr]);
                        if (!normalized || normalized.length === 0) return null;
                        const item = normalized[0];
                        const { Icon, colorClass, title, detail } = item;
                        return (
                          <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                            <Icon className={`w-4 h-4 ${colorClass} flex-shrink-0`} />
                            <span>{title}{detail ? `: ${detail}` : ''}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
              
              {/* Nearby Facilities (from services) */}
              {servicesByCategory.nearby.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                      <MapPin className="w-5 h-5" aria-hidden />
                    </span>
                    <h2 className="text-lg font-semibold text-slate-900">Nearby Facilities</h2>
                  </div>
                  <div className="space-y-2">
                    {servicesByCategory.nearby.slice(0, 6).map((item: string, idx: number) => {
                      const normalized = normalizeNearby([item]);
                      if (!normalized || normalized.length === 0) return null;
                      const { Icon, colorClass, title, detail } = normalized[0];
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                          <Icon className={`w-4 h-4 ${colorClass} flex-shrink-0`} />
                          <span>{title}{detail ? `: ${detail}` : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Services & Amenities */}
              {servicesByCategory.amenities.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                      <Sparkles className="w-5 h-5" aria-hidden />
                    </span>
                    <h2 className="text-lg font-semibold text-slate-900">Services & Amenities</h2>
                  </div>
                  <div className="space-y-2">
                    {servicesByCategory.amenities.map((amenity: string, idx: number) => {
                      const meta = amenityMeta(amenity);
                      return (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-700">
                          <meta.Icon className={`w-4 h-4 ${meta.colorClass} flex-shrink-0`} />
                          <span className="capitalize">{amenity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>

              {/* Interactive Map - Right Column */}
              <div className="space-y-4">
                {/* Location Header - Map Title */}
                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                      <MapPin className="w-5 h-5" aria-hidden />
                    </span>
                    <h2 className="text-lg font-semibold text-slate-900">Location</h2>
                  </div>
                  <div className="text-sm text-slate-600">{location || "—"}</div>
                </div>

                {/* Map */}
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <PropertyMap 
                    latitude={property.latitude} 
                    longitude={property.longitude}
                    propertyTitle={property.title}
                  />
                </div>
              </div>
            </div>
          )}
        </div>


      {/* Lightbox */}
      {lightboxOpen && lightboxImages.length > 0 ? (
        <div
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLightbox();
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white text-sm font-semibold truncate">{property.title}</div>
                <button
                  type="button"
                  className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                  onClick={closeLightbox}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main image (compact like your sample) */}
              <div className="mx-auto w-full max-w-[720px]">
                <div className="relative rounded-2xl overflow-hidden bg-black h-[62vh] max-h-[520px] min-h-[320px]">
                  <Image
                    src={lightboxImages[activeIdx]}
                    alt={`${property.title} photo ${activeIdx + 1}`}
                    fill
                    className="object-contain"
                    sizes="(min-width: 1024px) 720px, 100vw"
                    priority
                  />

                  <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                    onClick={() => setActiveIdx((i) => (i <= 0 ? lightboxImages.length - 1 : i - 1))}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                    onClick={() => setActiveIdx((i) => (i >= lightboxImages.length - 1 ? 0 : i + 1))}
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Counter under photo (centered, like your sample) */}
              <div className="mt-3 text-center text-white/90 text-sm font-semibold">
                {activeIdx + 1} / {lightboxImages.length}
              </div>

              {/* Thumbnails strip */}
              <div className="mt-4 mx-auto w-full max-w-[920px] flex gap-2 overflow-x-auto pb-2 justify-center">
                {lightboxImages.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    className={[
                      "relative h-16 w-24 sm:h-20 sm:w-28 flex-shrink-0 rounded-xl overflow-hidden border",
                      i === activeIdx ? "border-white" : "border-white/20",
                      "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
                      "motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                    ].join(" ")}
                    onClick={() => setActiveIdx(i)}
                    aria-label={`View photo ${i + 1}`}
                  >
                    <Image src={src} alt={`thumb ${i + 1}`} fill className="object-cover" sizes="120px" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* All photos (masonry/grid) */}
      {allPhotosOpen ? (
        <div
          className="fixed inset-0 z-[500] bg-white"
          role="dialog"
          aria-modal="true"
          aria-label="All photos"
        >
          <div
            className={[
              "absolute inset-0 flex flex-col",
              "transition-all duration-200 ease-out motion-reduce:transition-none",
              allPhotosShown ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            {/* Sticky top bar (always visible) */}
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-slate-200">
              <div className="w-full px-4 sm:px-6 lg:px-10 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900 truncate">All photos</div>
                  <div className="text-xs text-slate-600">{lightboxImages.length.toLocaleString()} photos</div>
                </div>
                <button
                  type="button"
                  onClick={closeAllPhotos}
                  className="h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-slate-700" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="w-full px-4 sm:px-6 lg:px-10 py-5">
                <div
                  className={[
                    "columns-2 sm:columns-3 lg:columns-4 gap-3 [column-fill:_balance]",
                    "transition-transform duration-200 ease-out motion-reduce:transition-none",
                    allPhotosShown ? "translate-y-0" : "translate-y-1",
                  ].join(" ")}
                >
                  {lightboxImages.map((src, i) => {
                    const aspect =
                      i % 7 === 0 ? "aspect-[4/3]" : i % 7 === 1 ? "aspect-[3/4]" : i % 7 === 2 ? "aspect-square" : "aspect-[16/10]";
                    return (
                      <button
                        key={`${src}-${i}`}
                        type="button"
                        onClick={() => openFromGrid(i)}
                        className={[
                          "mb-3 w-full break-inside-avoid",
                          "rounded-2xl overflow-hidden bg-slate-100",
                          "shadow-sm hover:shadow-md",
                          "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
                          "motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                        ].join(" ")}
                        aria-label={`Open photo ${i + 1}`}
                      >
                        <div className={["relative w-full", aspect].join(" ")}>
                          <Image
                            src={src}
                            alt={`${property.title} photo ${i + 1}`}
                            fill
                            className="object-cover"
                            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                          />
                          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-gradient-to-t from-black/35 via-black/0 to-black/0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function Fact({ icon, label, value }: { icon: ReactNode; label: string; value: any }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <div className="flex items-center gap-2 text-slate-700">
        <span className="text-slate-600">{icon}</span>
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <div className="mt-2 text-sm font-bold text-slate-900">{String(value)}</div>
    </div>
  );
}

function ReviewCard({ review }: { review: PropertyReview }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const MAX_PREVIEW_LENGTH = 200;
  const comment = review.comment || "";
  const isLongComment = comment.length > MAX_PREVIEW_LENGTH;
  const previewText = isLongComment ? comment.slice(0, MAX_PREVIEW_LENGTH) + "..." : comment;

  return (
    <>
      <div className="group relative bg-white rounded-2xl border border-slate-200/60 hover:border-[#02665e]/40 hover:shadow-xl transition-all duration-300 overflow-hidden shadow-sm">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="text-lg font-bold text-slate-900 truncate">
                  {review.user?.name || "Guest"}
                </div>
                {review.isVerified && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 text-[10px] font-bold text-emerald-700 flex-shrink-0 tracking-wide">
                    ✓ Verified
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-500">
                <div className="flex items-center">
                  <StarRow value={review.rating} />
                </div>
                <span className="text-slate-300">•</span>
                <span className="font-medium">{new Date(review.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Title */}
          {review.title && (
            <div className="mb-4">
              <h3 className="text-base font-bold text-slate-900 leading-tight">{review.title}</h3>
            </div>
          )}

          {/* Comment */}
          {comment && (
            <div className="mb-4">
              <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/80 p-5 shadow-inner">
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap block font-normal">
                  {isExpanded ? comment : previewText}
                </p>
              </div>
              {isLongComment && !isExpanded && (
                <button
                  onClick={() => {
                    if (comment.length > 500) {
                      setShowModal(true);
                    } else {
                      setIsExpanded(true);
                    }
                  }}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-white border-2 border-slate-200 text-sm font-semibold text-[#02665e] hover:bg-slate-50 hover:border-[#02665e]/40 hover:shadow-md transition-all duration-200 inline-flex items-center gap-2 active:scale-[0.98]"
                >
                  <span>Show more</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
              {isLongComment && isExpanded && (
                <button
                  onClick={() => setIsExpanded(false)}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-white border-2 border-slate-200 text-sm font-semibold text-[#02665e] hover:bg-slate-50 hover:border-[#02665e]/40 hover:shadow-md transition-all duration-200 inline-flex items-center gap-2 active:scale-[0.98]"
                >
                  <span>Show less</span>
                  <ChevronUp className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Owner Response */}
          {review.ownerResponse && (
            <div className="mt-5 pt-5 border-t border-slate-200/60">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#02665e]/10 to-[#02665e]/5 border border-[#02665e]/20 flex items-center justify-center shadow-sm">
                  <MessageSquare className="w-5 h-5 text-[#02665e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wide">Owner response</div>
                  <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-3">
                    {review.ownerResponse}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Modal for Very Long Reviews */}
      {showModal && (
        <ReviewModal review={review} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}

function ReviewModal({ review, onClose }: { review: PropertyReview; onClose: () => void }) {
  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-[#02665e] to-[#014e47] text-white p-6 flex items-start justify-between gap-4 z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-xl font-bold truncate">
                {review.user?.name || "Guest"}
              </div>
              {review.isVerified && (
                <span className="inline-flex items-center rounded-full bg-white/20 border border-white/30 px-2.5 py-1 text-[11px] font-semibold flex-shrink-0">
                  Verified stay
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-white/90">
              <StarRow value={review.rating} />
              <span>•</span>
              <span>{new Date(review.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          {/* Title */}
          {review.title && (
            <h2 className="text-2xl font-bold text-slate-900 mb-4">{review.title}</h2>
          )}

          {/* Comment */}
          {review.comment && (
            <div className="mb-6">
              <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/80 p-6 shadow-inner">
                <p className="text-base text-slate-800 leading-relaxed whitespace-pre-wrap block font-normal">
                  {review.comment}
                </p>
              </div>
            </div>
          )}

          {/* Owner Response */}
          {review.ownerResponse && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#02665e]/10 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-[#02665e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 mb-2">Owner response</div>
                  <div className="text-base text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {review.ownerResponse}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StarRow({ value }: { value: number }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < v ? "text-amber-500" : "text-slate-300"} aria-hidden>
          ★
        </span>
      ))}
      <span className="sr-only">{v} out of 5</span>
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  return (
    <div className="inline-flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const n = i + 1;
        const active = n <= v;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={[
              "h-8 w-8 rounded-full border flex items-center justify-center",
              active ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-white border-slate-200 text-slate-400",
              "hover:bg-slate-50",
            ].join(" ")}
            aria-label={`${n} star`}
            aria-pressed={active}
          >
            ★
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(0)}
        className="ml-2 text-xs font-semibold text-slate-600 hover:underline"
        aria-label="Clear rating"
      >
        Clear
      </button>
    </div>
  );
}

// Icon mappings matching the owner's add page exactly
// Icon mappings are imported from shared source to ensure consistency with owner submissions
// DO NOT define custom icon mappings here - use the shared BATHROOM_ICONS and OTHER_AMENITIES_ICONS

function RoomAmenityChip({
  label,
  onTouchHint,
}: {
  label: string;
  activeHint: string | null;
  onTouchHint: (label: string) => void;
}) {
  // Use exact match from the owner's icon mappings first
  const Icon = BATHROOM_ICONS[label] || OTHER_AMENITIES_ICONS[label] || Tags;
  
  // Determine colors based on icon type
  const meta = (() => {
    // Check if it's a bathroom item - use same colors as other amenities
    if (BATHROOM_ICONS[label]) {
      return { Icon, bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-700" };
    }
    // Check if it's an other amenity
    if (OTHER_AMENITIES_ICONS[label]) {
      // Special colors for specific amenities
      if (label === "Free Wi-Fi") {
        return { Icon, bg: "bg-emerald-50", border: "border-emerald-200", icon: "text-emerald-700" };
    }
      if (label === "TV" || label === "Flat Screen TV") {
        return { Icon, bg: "bg-indigo-50", border: "border-indigo-200", icon: "text-indigo-700" };
    }
      if (label === "PS Station") {
        return { Icon, bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-700" };
      }
      if (label === "Air Conditioning") {
        return { Icon, bg: "bg-cyan-50", border: "border-cyan-200", icon: "text-cyan-700" };
    }
      if (label === "Mini Fridge") {
        return { Icon, bg: "bg-blue-50", border: "border-blue-200", icon: "text-blue-700" };
      }
      if (label === "Heating") {
        return { Icon, bg: "bg-orange-50", border: "border-orange-200", icon: "text-orange-700" };
    }
      if (label === "Couches") {
        return { Icon, bg: "bg-purple-50", border: "border-purple-200", icon: "text-purple-700" };
    }
      if (label === "Chair") {
        return { Icon, bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-700" };
      }
      // Default for other amenities
      return { Icon, bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-700" };
    }
    // Fallback for unknown amenities
    return { Icon: Tags, bg: "bg-slate-50", border: "border-slate-200", icon: "text-slate-700" };
  })();

  return (
    <button
      type="button"
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") onTouchHint(label);
      }}
      className={[
        "group relative inline-flex items-center justify-center rounded-full border",
        meta.bg,
        meta.border,
        "h-9 w-9",
        "shadow-sm shadow-transparent",
        "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out",
        "hover:bg-white hover:border-slate-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-sm",
        "active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
      ].join(" ")}
      aria-label={label}
      title={label}
    >
      <Icon className={["w-5 h-5 transition-colors", meta.icon, "group-hover:text-[#02665e]"].join(" ")} aria-hidden />
    </button>
  );
}

