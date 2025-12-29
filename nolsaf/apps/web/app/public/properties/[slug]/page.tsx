"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  Wifi,
  DoorClosed,
  X,
  ChevronRight,
  CheckCircle,
  CigaretteOff,
  MessageSquare,
  Map as MapIcon,
  Lock,
  Share2,
} from "lucide-react";
import VerifiedIcon from "../../../../components/VerifiedIcon";
import TableRow from "../../../../components/TableRow";
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
  services: string[];
  roomsSpec: any[];
  ownerId?: number;
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
  
  const services = servicesArray;

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
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">{property.title}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{location || "—"}</span>
          </div>

          {/* Map Card */}
          {property.latitude && property.longitude && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="relative aspect-[16/9] bg-slate-100">
                {process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? (
                  <Image
                    src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+10b981(${property.longitude},${property.latitude})/${property.longitude},${property.latitude},15,0/900x420?access_token=${encodeURIComponent(
                      (process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) as string
                    )}`}
                    alt="Property location map"
                    fill
                    className="absolute inset-0 w-full h-full object-cover"
                    sizes="900px"
                    priority
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                    <div className="text-center">
                      <MapIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600 font-medium">Map view</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {property.latitude}, {property.longitude}
                      </p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                <a
                  href={`https://www.mapbox.com/maps?lon=${property.longitude}&lat=${property.latitude}&zoom=15`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center justify-center px-4 py-2 bg-[#02665e] text-white text-sm font-semibold rounded-lg hover:bg-[#014e47] transition-colors shadow-sm"
                >
                  Show on map
                </a>
              </div>
            </div>
          )}

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

            {/* Services & Facilities */}
            {(Array.isArray(services) && services.length > 0) || (typeof services === 'object' && services !== null && Object.keys(services).length > 0) ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                  <Sparkles className="w-5 h-5" aria-hidden />
                    </span>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Services & Facilities</h2>
              </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Parking */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("parking")) && (
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        {servicesByCategory.amenities.find((s: string) => s.toLowerCase().includes("parking")) || "Parking"}
                      </span>
                    </div>
                  )}

                  {/* Restaurant */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("restaurant")) && (
                    <div className="flex items-center gap-3">
                      <UtensilsCrossed className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Restaurant</span>
                </div>
                  )}

                  {/* Bar */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("bar")) && (
                    <div className="flex items-center gap-3">
                      <Beer className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Bar</span>
            </div>
                  )}

                  {/* Pool */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("pool")) && (
                    <div className="flex items-center gap-3">
                      <Waves className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        {servicesByCategory.amenities.find((s: string) => s.toLowerCase().includes("pool")) || "Swimming Pool"}
                      </span>
                    </div>
                  )}

                  {/* Room Service */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("room service")) && (
                    <div className="flex items-center gap-3">
                      <ConciergeBell className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Room Service</span>
                    </div>
                  )}

                  {/* WiFi */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("wifi") || s.toLowerCase().includes("wi-fi")) && (
                    <div className="flex items-center gap-3">
                      <Wifi className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Free WiFi</span>
                    </div>
                  )}

                  {/* Laundry */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("laundry")) && (
                    <div className="flex items-center gap-3">
                      <WashingMachine className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Laundry</span>
                    </div>
                  )}

                  {/* Security */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("security") || s.toLowerCase().includes("24h")) && (
                    <div className="flex items-center gap-3">
                      <Shield className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">
                        {servicesByCategory.amenities.find((s: string) => s.toLowerCase().includes("security") || s.toLowerCase().includes("24h")) || "24/7 Security"}
                      </span>
                    </div>
                  )}

                  {/* Sauna */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("sauna")) && (
                    <div className="flex items-center gap-3">
                      <Thermometer className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Sauna</span>
                    </div>
                  )}

                  {/* First Aid */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("first aid")) && (
                    <div className="flex items-center gap-3">
                      <Bandage className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">First Aid</span>
                    </div>
                  )}

                  {/* Fire Extinguisher */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("fire extinguisher")) && (
                    <div className="flex items-center gap-3">
                      <FireExtinguisher className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Fire Extinguisher</span>
                    </div>
                  )}

                  {/* On-site Shop */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("on-site shop") || s.toLowerCase().includes("onsite shop")) && (
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">On-site Shop</span>
                    </div>
                  )}

                  {/* Nearby Mall */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("nearby mall")) && (
                    <div className="flex items-center gap-3">
                      <Store className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Nearby Mall</span>
                    </div>
                  )}

                  {/* Social Hall */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("social hall")) && (
                    <div className="flex items-center gap-3">
                      <PartyPopper className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Social Hall</span>
                    </div>
                  )}

                  {/* Sports & Games */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("sports") || s.toLowerCase().includes("games")) && (
                    <div className="flex items-center gap-3">
                      <Gamepad2 className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Sports & Games</span>
                    </div>
                  )}

                  {/* Gym */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("gym") || s.toLowerCase().includes("fitness")) && (
                    <div className="flex items-center gap-3">
                      <Dumbbell className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Gym / Fitness Center</span>
                    </div>
                  )}

                  {/* Breakfast Included */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("breakfast included")) && (
                    <div className="flex items-center gap-3">
                      <Coffee className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Breakfast Included</span>
                    </div>
                  )}

                  {/* Breakfast Available */}
                  {servicesByCategory.amenities.some((s: string) => s.toLowerCase().includes("breakfast available")) && (
                    <div className="flex items-center gap-3">
                      <Coffee className="h-5 w-5 text-[#02665e] flex-shrink-0" />
                      <span className="text-sm text-slate-700">Breakfast Available</span>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

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

            {/* Nearby Services */}
            {nearbyFacilities.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-6">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                    <MapPin className="w-5 h-5" aria-hidden />
                </span>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Nearby Services</h2>
              </div>
                <div className="space-y-3">
                  {nearbyFacilities.map((facility: any, idx: number) => {
                    // Get icon based on facility type
                    const getFacilityIcon = (type: string) => {
                      const t = (type || "").toLowerCase();
                      if (t.includes("hospital") || t.includes("clinic") || t.includes("pharmacy") || t.includes("polyclinic")) {
                        return { Icon: Hospital, color: "text-rose-600" };
                      }
                      if (t.includes("petrol") || t.includes("fuel") || t.includes("gas")) {
                        return { Icon: Fuel, color: "text-orange-600" };
                      }
                      if (t.includes("airport")) {
                        return { Icon: Plane, color: "text-blue-600" };
                      }
                      if (t.includes("bus") || t.includes("station")) {
                        return { Icon: Bus, color: "text-amber-700" };
                      }
                      if (t.includes("road") || t.includes("main road")) {
                        return { Icon: Route, color: "text-slate-700" };
                      }
                      if (t.includes("police")) {
                        return { Icon: Shield, color: "text-indigo-600" };
                      }
                      return { Icon: MapPin, color: "text-[#02665e]" };
                    };
                    
                    const facilityIcon = getFacilityIcon(facility.type || "");
                    const Icon = facilityIcon.Icon;
                    
                    return (
                      <div key={idx} className="bg-slate-50 rounded-lg p-3 sm:p-4 border border-slate-200 motion-safe:transition-all motion-safe:duration-200 hover:border-[#02665e]/30 hover:shadow-sm">
                        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                          {facility.name && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Icon className={`h-5 w-5 ${facilityIcon.color} flex-shrink-0`} />
                              <span className="text-base font-semibold text-gray-800">{facility.name}</span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                            {facility.type && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">
                                {facility.type}
                              </span>
                            )}
                            {facility.ownership && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium">
                                {facility.ownership}
                              </span>
                            )}
                            {typeof facility.distanceKm === 'number' && (
                              <span className="inline-flex items-center gap-1 text-gray-600">
                                <MapPin className="h-3.5 w-3.5 text-pink-600" />
                                <span className="font-medium">{facility.distanceKm} km</span>
                              </span>
                            )}
                            {facility.url && (
                              <a href={facility.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#02665e] hover:underline">
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span className="text-xs font-medium">Link</span>
                            </a>
                            )}
                        </div>
                      </div>
                        {Array.isArray(facility.reachableBy) && facility.reachableBy.length > 0 && (
                          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm text-gray-600 font-medium">Reachable by:</span>
                            {facility.reachableBy.map((mode: string, mIdx: number) => (
                              <span key={mIdx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-sm font-medium">
                                {mode}
                              </span>
                    ))}
                </div>
              )}
            </div>
                    );
                  })}
                </div>
              </div>
            )}

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

        {/* Rooms (full-width on large screens; no horizontal scroll) */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
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
                        onClick={() => alert("Pay Now / Booking flow is coming next (Phase 2).")}
                        className="mt-4 w-full rounded-lg bg-[#02665e] text-white py-1.5 px-3 text-xs font-medium hover:bg-[#014e47] transition-colors shadow-sm hover:shadow"
                      >
                        Pay now
                      </button>
                    </div>
                  ))}
                </div>

                {/* Desktop: full-width table (no horizontal scroll) */}
                <div className="hidden md:block">
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full table-fixed border-collapse">
                      <thead className="bg-slate-50 text-slate-700">
                        <tr>
                          <th className="text-left text-sm font-semibold px-3 py-3 border-b border-r border-slate-200 w-[14%]">
                            Room type
                          </th>
                          <th className="text-left text-sm font-semibold px-3 py-3 border-b border-r border-slate-200 w-[13%]">
                            Bed Type &amp; Size
                          </th>
                          <th className="text-left text-sm font-semibold px-3 py-3 border-b border-r border-slate-200 w-[30%]">
                            Description &amp; Amenities
                          </th>
                          <th className="text-left text-sm font-semibold px-3 py-3 border-b border-r border-slate-200 w-[15%]">
                            Price &amp; Discounts
                          </th>
                          <th className="text-left text-sm font-semibold px-3 py-3 border-b border-r border-slate-200 w-[12%]">Pay Now</th>
                          <th className="text-left text-sm font-semibold px-3 py-3 border-b border-slate-200 w-[16%]">
                            Policies
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white">
                        {rows.map((r, idx) => (
                          <TableRow
                            key={`${r.roomType}-${idx}`}
                            className={[
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/40",
                              // Clean, brand‑tinted hover (override TableRow default sky tint)
                              "hover:bg-emerald-50/30 hover:shadow-none",
                              "motion-safe:transition-colors motion-safe:duration-200",
                            ].join(" ")}
                          >
                            <td className="align-top px-3 py-4 border-t border-slate-200">
                              <div className="inline-flex items-start gap-2 text-base font-semibold text-slate-900 break-words">
                                <DoorClosed className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" aria-hidden />
                                <span>{r.roomType}</span>
                              </div>
                              {typeof r.roomsCount === "number" && r.roomsCount > 0 ? (
                                <div className="mt-1 inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                  {r.roomsCount} rooms
                                </div>
                              ) : null}
                            </td>
                            <td className="align-top px-3 py-4 border-t border-slate-200">
                              <div>
                                <div className="inline-flex items-start gap-2 text-base text-slate-800 break-words">
                                  <BedDouble className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" aria-hidden />
                                  <span>{r.bedsSummary}</span>
                                </div>
                                {getBedDimensions(r.bedsSummary) && (
                                  <div className="mt-1.5 text-xs text-slate-500 leading-tight">
                                    {getBedDimensions(r.bedsSummary)}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="align-top px-3 py-4 border-t border-slate-200">
                              {r.description ? (
                                <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg border border-slate-200/60">
                                  <p className="text-sm text-slate-800 leading-relaxed font-normal break-words">
                                    {capWords(r.description, 220)}
                                  </p>
                                </div>
                              ) : (
                                <div className="text-base text-slate-500">—</div>
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
                                      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
                                        r.bathPrivate === "yes" 
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                          : "bg-blue-50 text-blue-700 border border-blue-200"
                                      }`}>
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
                              ) : r.bathPrivate && (r.bathPrivate === "yes" || r.bathPrivate === "no") ? (
                                <div className="mt-3 pt-3 border-t border-slate-100">
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
                            </td>
                            <td className="align-top px-3 py-4 border-t border-slate-200">
                                <div>
                                <div className="text-base font-bold text-slate-900">{fmtMoney(r.pricePerNight, property.currency)}</div>
                                <div className="text-xs text-slate-500">per night</div>
                                </div>
                              {r.discountLabel ? (
                                <div className="mt-1 inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                                  {r.discountLabel}
                                </div>
                              ) : (
                                <div className="mt-1 text-xs text-slate-500">No discounts</div>
                              )}
                            </td>
                            <td className="align-top px-3 py-4 border-t border-slate-200">
                              <button
                                type="button"
                                onClick={() => alert("Pay Now / Booking flow is coming next (Phase 2).")}
                                className={[
                                  "w-full rounded-md bg-[#02665e] text-white px-2.5 py-1.5 text-sm font-medium",
                                  "hover:bg-[#014e47]",
                                  "motion-safe:transition-all motion-safe:duration-200",
                                  "shadow-sm hover:shadow",
                                  "active:scale-[0.98]",
                                ].join(" ")}
                              >
                                Pay now
                              </button>
                              <div className="mt-2 text-xs text-slate-500">Secure checkout (coming soon)</div>
                            </td>
                            <td className="align-top px-3 py-4 border-t border-slate-200">
                              <ul className="space-y-1 text-base text-slate-800">
                                  {r.policies.slice(0, 6).map((p, i) => (
                                  <li key={i} className="leading-snug break-words flex items-start gap-1.5">
                                    {p.Icon && (
                                      <p.Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${p.iconColor || "text-slate-600"}`} aria-hidden />
                                    )}
                                    <span>{p.text}</span>
                                    </li>
                                  ))}
                                </ul>
                            </td>
                          </TableRow>
                        ))}
                      </tbody>
                    </table>
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

          {(reviewsData?.reviews ?? []).slice(0, 20).map((r) => (
            <div key={r.id} className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-slate-900 truncate">{r.user?.name || "Guest"}</div>
                    {r.isVerified ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                        Verified stay
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <StarRow value={r.rating} />
                    <span>•</span>
                    <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  {r.title ? <div className="mt-2 text-sm font-semibold text-slate-900">{r.title}</div> : null}
                  {r.comment ? <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{r.comment}</div> : null}
                </div>
              </div>
              {r.ownerResponse ? (
                <div className="mt-3 rounded-lg bg-slate-50 border border-slate-200 p-3">
                  <div className="text-xs font-semibold text-slate-700">Owner response</div>
                  <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{r.ownerResponse}</div>
                </div>
              ) : null}
            </div>
          ))}

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
