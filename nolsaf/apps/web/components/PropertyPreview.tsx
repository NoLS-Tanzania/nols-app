"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { 
  MapPin, 
  Star, 
  Wifi, 
  Car, 
  UtensilsCrossed, 
  Dumbbell, 
  Waves, 
  Tv, 
  AirVent,
  CheckCircle2,
  XCircle,
  Edit,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Bed,
  BedDouble,
  Bath,
  Users,
  DollarSign,
  Phone,
  Mail,
  Building2,
  Info,
  Coffee,
  Beer,
  Thermometer,
  Package,
  ConciergeBell,
  Shield,
  Bandage,
  FireExtinguisher,
  ShoppingBag,
  Store,
  PartyPopper,
  Gamepad,
  Fuel,
  Bus,
  Plane,
  Link as LinkIcon,
  WashingMachine,
  Share2,
  Lock,
  Heart,
  BadgeCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle as XCircleIcon,
  Ban,
  CigaretteOff,
  FileText,
  Map,
  Loader2,
  ImageIcon,
  Eye,
  DoorClosed,
  Tags,
  Bike,
  FootprintsIcon,
  Sparkles,
} from "lucide-react";
import axios from "axios";
import { motion } from "framer-motion";
import NeighborhoodGuide from "./NeighborhoodGuide";
import TableRow from "./TableRow";
import PropertyEditModal from "./PropertyEditModal";
import NearbyServices from "./NearbyServices";
import ServicesAndFacilities from "./ServicesAndFacilities";
import { 
  getPropertyCommission, 
  calculatePriceWithCommission,
  getPropertyDiscountRules 
} from "../lib/priceUtils";
import { BATHROOM_ICONS, OTHER_AMENITIES_ICONS } from "../lib/amenityIcons";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

// Helper functions for rooms
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
    { key: "twin", label: "twin" },
    { key: "full", label: "full" },
    { key: "queen", label: "queen" },
    { key: "king", label: "king" },
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
  
  // Extract bed types from summary (e.g., "2 queen, 1 twin")
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

type PolicyItem = {
  text: string;
  Icon?: any;
  iconColor?: string;
};

type RoomSpecRow = {
  roomType: string;
  roomsCount: number | null;
  bedsSummary: string;
  description: string;
  amenities: string[];
  bathItems: string[];
  bathPrivate: string;
  pricePerNight: number | null;
  discountLabel: string | null;
  payActionLabel: string;
  policies: PolicyItem[];
};

function normalizeRoomSpec(r: any, idx: number, currency: string | null, fallbackBasePrice: number | null): RoomSpecRow {
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
  const pricePerNight = Number.isFinite(Number(priceRaw)) && Number(priceRaw) > 0 ? Number(priceRaw) : (fallbackBasePrice != null ? Number(fallbackBasePrice) : null);

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

// Icon mappings matching the owner's add page exactly
// Icon mappings are imported from shared source to ensure consistency with owner submissions
// DO NOT define custom icon mappings here - use the shared BATHROOM_ICONS and OTHER_AMENITIES_ICONS

// Helper function to get icon for room amenity - uses exact mappings from owner's add page
// Transport method to icon mapping
function getTransportIcon(mode: string): React.ComponentType<{ className?: string }> | null {
  const modeLower = mode.toLowerCase();
  if (modeLower.includes('walk') || modeLower === 'walking') return FootprintsIcon;
  if (modeLower.includes('car') || modeLower.includes('taxi')) return Car;
  if (modeLower.includes('boda') || modeLower.includes('motorcycle') || modeLower.includes('bike')) return Bike;
  if (modeLower.includes('public') || modeLower.includes('bus') || modeLower.includes('transport')) return Bus;
  return null;
}

function getRoomAmenityIcon(label: string): React.ComponentType<{ className?: string }> | null {
  // Use exact match from the owner's icon mappings first
  return BATHROOM_ICONS[label] || OTHER_AMENITIES_ICONS[label] || null;
}

// RoomAmenityChip component matching public view - icon-only with hover tooltip
function RoomAmenityChip({ label }: { label: string }) {
  // Use exact match from the owner's icon mappings first
  const Icon = BATHROOM_ICONS[label] || OTHER_AMENITIES_ICONS[label] || Tags;
  
  // Determine colors based on icon type (matching public view logic)
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

interface PropertyPreviewProps {
  propertyId: number;
  mode?: "admin" | "public" | "owner";
  onApproved?: () => void;
  onRejected?: () => void;
  onUpdated?: () => void;
}

export default function PropertyPreview({ 
  propertyId, 
  mode = "public",
  onApproved,
  onRejected,
  onUpdated,
  onClose
}: PropertyPreviewProps) {
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [rejectReasons, setRejectReasons] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [displayPhotos, setDisplayPhotos] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);
  const [reviews, setReviews] = useState<any>(null);
  const [reviewsLoading, setReviewsLoading] = useState<boolean>(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [systemCommission, setSystemCommission] = useState<number>(0);
  const [nearbyFacilitiesExpanded, setNearbyFacilitiesExpanded] = useState(false);

  // Load system commission settings
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await api.get("/admin/settings");
        if (mounted && response.data?.commissionPercent !== undefined) {
          const commission = Number(response.data.commissionPercent);
          setSystemCommission(isNaN(commission) ? 0 : commission);
        }
      } catch (e) {
        // Silently fail - will use 0 as default
      }
    };
    if (mode === "admin" || mode === "owner") {
      load();
    }
    return () => {
      mounted = false;
    };
  }, [mode]);

  useEffect(() => {
    loadProperty();
  }, [propertyId]);

  useEffect(() => {
    if (property && (mode === "public" || mode === "owner")) {
      loadReviews();
    }
  }, [property, mode]);

  async function loadReviews() {
    try {
      setReviewsLoading(true);
      const response = await api.get(`/property-reviews/${propertyId}`);
      setReviews(response.data);
    } catch (err: any) {
      console.error("Load reviews error:", err);
      // Don't show error - reviews are optional
    } finally {
      setReviewsLoading(false);
    }
  }

  // Close share menu when clicking outside
  useEffect(() => {
    if (showShareMenu) {
      const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.share-menu-container')) {
          setShowShareMenu(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showShareMenu]);

  async function loadProperty() {
    try {
      setLoading(true);
      const endpoint = mode === "admin" 
        ? `/admin/properties/${propertyId}`
        : mode === "owner"
        ? `/owner/properties/${propertyId}`
        : `/public/properties/${propertyId}`;
      
      // Add cache-busting parameter to ensure fresh data
      const response = await api.get(endpoint, {
        params: { _t: Date.now() }
      });
      const data = mode === "admin" || mode === "owner" 
        ? response.data 
        : response.data?.item || response.data;
      
      setProperty(data);
      setEditData(data);
      // Initialize display photos array
      if (data.photos && Array.isArray(data.photos)) {
        setDisplayPhotos(data.photos);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load property");
      console.error("Load property error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove() {
    if (!confirm("Are you sure you want to approve this property?")) return;
    try {
      setSaving(true);
      await api.post(`/admin/properties/${propertyId}/approve`, { note: "" });
      await loadProperty();
      onApproved?.();
      alert("Property approved successfully!");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to approve property");
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!rejectReasons.trim()) {
      alert("Please provide rejection reasons");
      return;
    }
    try {
      setSaving(true);
      // Split by comma and validate each reason is at least 2 characters (matching backend validation)
      const reasons = rejectReasons.split(",").map((s) => s.trim()).filter(Boolean);
      
      // Validate reasons meet backend requirements
      const invalidReasons = reasons.filter(r => r.length < 2 || r.length > 200);
      if (invalidReasons.length > 0) {
        alert(`Each reason must be between 2 and 200 characters. Invalid: ${invalidReasons.join(", ")}`);
        setSaving(false);
        return;
      }
      
      if (reasons.length === 0) {
        alert("Please provide at least one valid rejection reason");
        setSaving(false);
        return;
      }
      
      await api.post(`/admin/properties/${propertyId}/reject`, { reasons, note: "" });
      await loadProperty();
      setShowRejectDialog(false);
      setRejectReasons("");
      onRejected?.();
      alert("Property rejected successfully");
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to reject property";
      alert(typeof errorMessage === 'string' ? errorMessage : "Failed to reject property. Please check that each reason is at least 2 characters long.");
      console.error("Reject property error:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    try {
      setSaving(true);
      await api.patch(`/admin/properties/${propertyId}`, {
        title: editData?.title,
        description: editData?.description,
        basePrice: editData?.basePrice,
        currency: editData?.currency,
      });
      await loadProperty();
      setIsEditing(false);
      onUpdated?.();
      alert("Property updated successfully!");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to update property");
    } finally {
      setSaving(false);
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: property?.title,
        text: property?.description?.substring(0, 100),
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
    setShowShareMenu(false);
  }

  function handleFavorite() {
    setIsFavorite(!isFavorite);
    // TODO: Implement favorite API call
  }

  // Collect all images: property photos + room photos
  // Must be called before early returns to maintain consistent hook order
  const allImages = useMemo(() => {
    if (!property) return [];
    const propertyPhotos = displayPhotos.length > 0 ? displayPhotos : (property.photos || []);
    const roomPhotos: string[] = [];
    
    // Collect photos from all rooms
    if (Array.isArray(property.roomsSpec)) {
      property.roomsSpec.forEach((room: any) => {
        if (room?.photos && Array.isArray(room.photos)) {
          roomPhotos.push(...room.photos);
        }
        if (room?.roomImages && Array.isArray(room.roomImages)) {
          roomPhotos.push(...room.roomImages);
        }
      });
    }
    
    // Combine property photos first, then room photos
    return [...propertyPhotos, ...roomPhotos];
  }, [displayPhotos, property?.photos, property?.roomsSpec]);

  // About this place - description handling
  // Must be called before early returns to maintain consistent hook order
  const about = useMemo(() => {
    const fallback = "No description provided yet.";
    const raw = String(property?.description || "").trim();
    const text = raw ? raw : fallback;
    const limit = 320;
    const hasMore = raw.length > limit;
    const collapsed = hasMore ? raw.slice(0, limit).trimEnd() + "…" : text;
    return { raw, text, hasMore, collapsed };
  }, [property?.description]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || "Property not found"}</p>
        </div>
      </div>
    );
  }

  // Calculate mock booking count (would come from API)
  const bookingCount = property?.status === "APPROVED" ? Math.floor(Math.random() * 50) + 10 : 0;
  const isPopular = bookingCount > 30;
  const isRecentlyBooked = bookingCount > 0 && Math.random() > 0.5;

  const photos = allImages;
  const rooms = property.roomsSpec || [];
  const servicesRaw = property.services;
  const location = property.location || {};
  const status = property.status;
  const hotelStar = property.hotelStar;
  const totalBedrooms = property.totalBedrooms;
  const totalBathrooms = property.totalBathrooms;
  const maxGuests = property.maxGuests;

  // Parse services - can be JSON string, array of strings, or object
  // Database stores services as JSON, which Prisma may return as string or already parsed object
  let parsedServices: any = servicesRaw;
  if (typeof servicesRaw === 'string' && servicesRaw.trim()) {
    try {
      parsedServices = JSON.parse(servicesRaw);
    } catch {
      // If parsing fails, treat as empty
      parsedServices = null;
    }
  }
  
  // Handle null/undefined
  if (!parsedServices) {
    parsedServices = {};
  }
  
  const servicesArray = Array.isArray(parsedServices) ? parsedServices : [];
  const servicesObj = typeof parsedServices === 'object' && parsedServices !== null && !Array.isArray(parsedServices) ? parsedServices : {};
  
  // Debug logging for admin mode
  if (mode === "admin") {
    console.log('[PropertyPreview] Services Debug:', {
      raw: servicesRaw,
      parsed: parsedServices,
      isArray: Array.isArray(parsedServices),
      isObject: typeof parsedServices === 'object' && !Array.isArray(parsedServices),
      servicesObjKeys: Object.keys(servicesObj),
      servicesObj,
      servicesArrayLength: servicesArray.length,
    });
  }
  
  // Normalize boolean values - handle both true/false and "true"/"false" strings
  // Also handle undefined values (when service wasn't selected, it won't be in the object)
  const normalizeBoolean = (value: any): boolean => {
    if (value === undefined || value === null) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return false;
  };
  
  // Create normalized services object with proper boolean values
  // Check for both direct properties and properties that might be nested
  const normalizedServicesObj = {
    // Preserve all original properties
    ...servicesObj,
    // Normalize boolean services - if property doesn't exist, default to false
    breakfastIncluded: normalizeBoolean(servicesObj.breakfastIncluded),
    breakfastAvailable: normalizeBoolean(servicesObj.breakfastAvailable),
    restaurant: normalizeBoolean(servicesObj.restaurant),
    bar: normalizeBoolean(servicesObj.bar),
    pool: normalizeBoolean(servicesObj.pool),
    sauna: normalizeBoolean(servicesObj.sauna),
    laundry: normalizeBoolean(servicesObj.laundry),
    roomService: normalizeBoolean(servicesObj.roomService),
    security24: normalizeBoolean(servicesObj.security24),
    firstAid: normalizeBoolean(servicesObj.firstAid),
    fireExtinguisher: normalizeBoolean(servicesObj.fireExtinguisher),
    onSiteShop: normalizeBoolean(servicesObj.onSiteShop),
    nearbyMall: normalizeBoolean(servicesObj.nearbyMall),
    socialHall: normalizeBoolean(servicesObj.socialHall),
    sportsGames: normalizeBoolean(servicesObj.sportsGames),
    gym: normalizeBoolean(servicesObj.gym),
    parking: servicesObj.parking || 'no',
    parkingPrice: servicesObj.parkingPrice || '',
    // Preserve tags and nearbyFacilities
    tags: servicesObj.tags || [],
    nearbyFacilities: servicesObj.nearbyFacilities || [],
  };
  
  // If services is an object with tags, use the tags array for amenities
  const effectiveServicesArray = normalizedServicesObj.tags && Array.isArray(normalizedServicesObj.tags) 
    ? normalizedServicesObj.tags 
    : servicesArray;
  
  // Extract service properties from tags array if individual properties are missing
  // The owner form saves services in tags array, so we need to parse them
  // Check if we have tags but no individual service properties
  const hasIndividualProperties = Object.keys(servicesObj).some(k => 
    k !== 'tags' && 
    k !== 'nearbyFacilities' && 
    (k === 'parking' || k === 'breakfastIncluded' || k === 'restaurant' || k === 'bar' || k === 'pool' || k === 'sauna' || k === 'laundry' || k === 'roomService' || k === 'security24' || k === 'firstAid' || k === 'fireExtinguisher' || k === 'onSiteShop' || k === 'nearbyMall' || k === 'socialHall' || k === 'sportsGames' || k === 'gym')
  );
  
  // Always parse tags to ensure we have the latest values, even if some properties exist
  // This ensures we don't miss any services that might be in tags but not in individual properties
  if (effectiveServicesArray.length > 0) {
    // Parse tags to extract individual service properties
    const tags = effectiveServicesArray.map((t: string) => String(t).toLowerCase());
    
    // Parking - only set if not already set or if tags have more specific info
    if (!normalizedServicesObj.parking || normalizedServicesObj.parking === 'no') {
      if (tags.some(t => t.includes('free parking'))) {
        normalizedServicesObj.parking = 'free';
      } else if (tags.some(t => t.includes('paid parking'))) {
        normalizedServicesObj.parking = 'paid';
        // Try to extract parking price from tag
        const paidParkingTag = effectiveServicesArray.find((t: string) => t.toLowerCase().includes('paid parking'));
        if (paidParkingTag) {
          const priceMatch = paidParkingTag.match(/\(([^)]+)\)/);
          if (priceMatch) {
            normalizedServicesObj.parkingPrice = priceMatch[1].replace(/TZS/i, '').trim();
          }
        }
      }
    }
    
    // Other services - set to true if found in tags (even if already false, tags are source of truth)
    if (tags.some(t => t.includes('breakfast included'))) normalizedServicesObj.breakfastIncluded = true;
    if (tags.some(t => t.includes('breakfast available'))) normalizedServicesObj.breakfastAvailable = true;
    if (tags.some(t => t.includes('restaurant'))) normalizedServicesObj.restaurant = true;
    if (tags.some(t => t.includes('bar'))) normalizedServicesObj.bar = true;
    if (tags.some(t => t.includes('pool'))) normalizedServicesObj.pool = true;
    if (tags.some(t => t.includes('sauna'))) normalizedServicesObj.sauna = true;
    if (tags.some(t => t.includes('laundry'))) normalizedServicesObj.laundry = true;
    if (tags.some(t => t.includes('room service'))) normalizedServicesObj.roomService = true;
    if (tags.some(t => t.includes('24h security') || t.includes('24-hour security'))) normalizedServicesObj.security24 = true;
    if (tags.some(t => t.includes('first aid'))) normalizedServicesObj.firstAid = true;
    if (tags.some(t => t.includes('fire extinguisher'))) normalizedServicesObj.fireExtinguisher = true;
    if (tags.some(t => t.includes('on-site shop'))) normalizedServicesObj.onSiteShop = true;
    if (tags.some(t => t.includes('nearby mall'))) normalizedServicesObj.nearbyMall = true;
    if (tags.some(t => t.includes('social hall'))) normalizedServicesObj.socialHall = true;
    if (tags.some(t => t.includes('sports') || t.includes('games'))) normalizedServicesObj.sportsGames = true;
    if (tags.some(t => t.includes('gym'))) normalizedServicesObj.gym = true;
    
    // Debug logging
    if (mode === "admin") {
      console.log('[PropertyPreview] Parsed services from tags:', {
        tagsCount: tags.length,
        parking: normalizedServicesObj.parking,
        breakfastIncluded: normalizedServicesObj.breakfastIncluded,
        restaurant: normalizedServicesObj.restaurant,
        bar: normalizedServicesObj.bar,
        pool: normalizedServicesObj.pool,
        sauna: normalizedServicesObj.sauna,
        laundry: normalizedServicesObj.laundry,
        roomService: normalizedServicesObj.roomService,
        security24: normalizedServicesObj.security24,
        firstAid: normalizedServicesObj.firstAid,
        fireExtinguisher: normalizedServicesObj.fireExtinguisher,
        onSiteShop: normalizedServicesObj.onSiteShop,
        nearbyMall: normalizedServicesObj.nearbyMall,
        socialHall: normalizedServicesObj.socialHall,
        sportsGames: normalizedServicesObj.sportsGames,
        gym: normalizedServicesObj.gym,
      });
    }
  }
  
  // Extract nearby facilities - check both services array (as JSON string) and services object
  // Use normalizedServicesObj which includes nearbyFacilities
  let nearbyFacilities: any[] = [];
  try {
    // First check normalized object (which preserves nearbyFacilities)
    if (normalizedServicesObj.nearbyFacilities && Array.isArray(normalizedServicesObj.nearbyFacilities)) {
      nearbyFacilities = normalizedServicesObj.nearbyFacilities;
    }
    // Fallback: Try to find nearbyFacilities in original services object
    else if (servicesObj.nearbyFacilities && Array.isArray(servicesObj.nearbyFacilities)) {
      nearbyFacilities = servicesObj.nearbyFacilities;
    }
    // Also check if it's stored as a JSON string in the services array
    const facilitiesStr = effectiveServicesArray.find((s: string) => s.includes('nearbyFacilities') || s.startsWith('['));
    if (facilitiesStr && nearbyFacilities.length === 0) {
      try {
        const parsed = JSON.parse(facilitiesStr);
        if (Array.isArray(parsed)) nearbyFacilities = parsed;
      } catch {}
    }
  } catch {}

  // Build comprehensive amenities list from services array/object
  const parseServiceLabel = (s: string) => {
    if (s.includes("Free parking")) return { key: "parking", label: "Free Parking", icon: Car, value: true };
    if (s.includes("Paid parking")) return { key: "parking", label: s, icon: Car, value: true };
    if (s.includes("Restaurant")) return { key: "restaurant", label: "Restaurant", icon: UtensilsCrossed, value: true };
    if (s.includes("Bar")) return { key: "bar", label: "Bar", icon: Beer, value: true };
    if (s.includes("Pool")) return { key: "pool", label: "Swimming Pool", icon: Waves, value: true };
    if (s.includes("Sauna")) return { key: "sauna", label: "Sauna", icon: Thermometer, value: true };
    if (s.includes("Laundry")) return { key: "laundry", label: "Laundry", icon: WashingMachine, value: true };
    if (s.includes("Room service")) return { key: "roomService", label: "Room Service", icon: Package, value: true };
    if (s.includes("24h security") || s.includes("24-hour security")) return { key: "security", label: "24/7 Security", icon: Shield, value: true };
    if (s.includes("First aid")) return { key: "firstAid", label: "First Aid", icon: Bandage, value: true };
    if (s.includes("Fire extinguisher")) return { key: "fireExtinguisher", label: "Fire Extinguisher", icon: FireExtinguisher, value: true };
    if (s.includes("On-site shop")) return { key: "onSiteShop", label: "On-site Shop", icon: ShoppingBag, value: true };
    if (s.includes("Nearby mall")) return { key: "nearbyMall", label: "Nearby Mall", icon: Store, value: true };
    if (s.includes("Social hall")) return { key: "socialHall", label: "Social Hall", icon: PartyPopper, value: true };
    if (s.includes("Sports") || s.includes("Sports & games")) return { key: "sports", label: "Sports & Games", icon: Gamepad, value: true };
    if (s.includes("Gym")) return { key: "gym", label: "Gym / Fitness Center", icon: Dumbbell, value: true };
    return null;
  };

  const amenities = effectiveServicesArray.map(parseServiceLabel).filter(Boolean) as Array<{ key: string; label: string; icon: any; value: boolean }>;
  
  // Add common amenities that might be in services object
  if (servicesObj.wifi || effectiveServicesArray.some((s: string) => s.toLowerCase().includes("wifi"))) {
    amenities.push({ key: "wifi", label: "Free WiFi", icon: Wifi, value: true });
  }
  if (servicesObj.ac || effectiveServicesArray.some((s: string) => s.toLowerCase().includes("air conditioning"))) {
    amenities.push({ key: "ac", label: "Air Conditioning", icon: AirVent, value: true });
  }

  return (
    <div className="w-full bg-white">
      {/* Header with Status and Actions */}
      {mode === "admin" && (
        <div className="bg-white border-b border-gray-200 shadow-sm mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {onClose && (
                  <button
                    onClick={onClose}
                    className="group flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 transition-colors"
                    aria-label="Back"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600 group-hover:text-slate-900" />
                  </button>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  status === "PENDING" ? "bg-amber-100 text-amber-800" :
                  status === "APPROVED" ? "bg-emerald-100 text-emerald-800" :
                  status === "REJECTED" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {status}
                </span>
                {property.owner && (
                  <div className="text-sm text-gray-600">
                    Owner: <span className="font-medium">{property.owner.name || property.owner.email}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    {status === "PENDING" && (
                      <>
                        <button
                          onClick={handleApprove}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => setShowRejectDialog(true)}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditData(property);
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Title and Location - Match Public View */}
        <div className="mt-5">
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
            {isEditing ? (
              <input
                type="text"
                value={editData?.title || ""}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-2xl sm:text-3xl font-bold"
              />
            ) : (
              property.title
            )}
          </h1>
          <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4" />
            <span className="truncate">
              {location.street && `${location.street}${location.apartment ? `, ${location.apartment}` : ''}, `}
              {location.ward && `${location.ward}, `}
              {location.district && `${location.district}, `}
              {location.regionName && location.regionName}
              {location.city && `, ${location.city}`}
              {!location.street && !location.ward && !location.district && !location.regionName && !location.city && "—"}
                    </span>
              </div>
            </div>

        {/* Gallery */}
        <div className="mt-6">
        {photos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-2xl overflow-hidden border border-slate-200">
                  <button
              type="button"
              className={[
                "relative md:col-span-2 aspect-[16/10] bg-slate-100 cursor-pointer rounded-2xl overflow-hidden",
                "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
                "motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
              ].join(" ")}
                    onClick={() => {
                      setSelectedImageIndex(0);
                  setShowLightbox(true);
                    }}
              aria-label="Open photo gallery"
                  >
                    <Image
                  src={photos[0]}
                alt=""
                      fill
                      className="object-cover"
                sizes="(min-width: 768px) 66vw, 100vw"
                  priority
                    />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
              <div className="absolute left-4 bottom-4 inline-flex items-center gap-2 rounded-full bg-white/90 border border-white/70 px-3 py-1 text-xs font-semibold text-slate-900">
                Approved photos • {photos.length}
              </div>
                  </button>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-3 bg-white p-3">
              {/* Photo 2 */}
              {photos[1] ? (
                  <button
                  type="button"
                  className={[
                    "relative aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden cursor-pointer",
                    "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
                    "motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  ].join(" ")}
                    onClick={() => {
                    setSelectedImageIndex(1);
                      setShowLightbox(true);
                    }}
                  aria-label="Open photo 2"
                    >
                      <Image
                    src={photos[1]}
                    alt=""
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
              {photos[2] ? (
              <button
                  type="button"
                  className={[
                    "relative aspect-[16/10] bg-slate-100 rounded-xl overflow-hidden cursor-pointer",
                    "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
                    "motion-safe:hover:scale-[1.01] motion-safe:active:scale-[0.98]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
                  ].join(" ")}
                onClick={() => {
                    const hasMorePhotos = photos.length > 3;
                    if (hasMorePhotos) {
                      setSelectedImageIndex(0);
                      setShowLightbox(true);
                    } else {
                      setSelectedImageIndex(2);
                      setShowLightbox(true);
                    }
                    }}
                  aria-label={photos.length > 3 ? "View all photos" : "Open photo 3"}
                  >
                    <Image
                    src={photos[2]}
                    alt=""
                      fill
                      className="object-cover"
                    sizes="(min-width: 768px) 22vw, 50vw"
                  />
                  {photos.length > 3 && (
                    <div className="absolute left-3 right-3 bottom-3 flex items-center justify-start">
                      <div
                        className="nls-blink inline-flex items-center gap-2 rounded-full bg-white/95 text-[#02665e] px-4 py-2 text-xs font-semibold shadow-sm ring-1 ring-black/5 whitespace-nowrap leading-none"
                        style={{ animationDuration: "1.8s" }}
                  >
                        <Eye className="w-4 h-4 flex-shrink-0 text-[#02665e]" aria-hidden />
                        <span className="leading-none">View all photos</span>
            </div>
          </div>
            )}
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
                          onClick={() => {
                  setSelectedImageIndex(0);
                  setShowLightbox(true);
                }}
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
                                onClick={() => {
                      setSelectedImageIndex(0);
                      setShowLightbox(true);
                    }}
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
                    {i === 1 && (
                      <div className="absolute left-3 right-3 bottom-3 flex items-center justify-start">
                        <div
                          className="nls-blink inline-flex items-center gap-2 rounded-full bg-white/95 text-[#02665e] px-4 py-2 text-xs font-semibold shadow-sm ring-1 ring-black/5 whitespace-nowrap leading-none"
                          style={{ animationDuration: "1.8s" }}
                        >
                          <Eye className="w-4 h-4 flex-shrink-0 text-[#02665e]" aria-hidden />
                          <span className="leading-none">View all photos</span>
                      </div>
                        </div>
                      )}
                          </button>
                ))}
                        </div>
                        </div>
                        </div>
                      )}
                    </div>
                  
        {/* Facts - Match Public View */}
                  {(totalBedrooms || totalBathrooms || maxGuests) && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {maxGuests && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="text-slate-600"><Users className="w-4 h-4" /></span>
                    <span className="text-xs font-semibold">Guests</span>
                        </div>
                  <div className="mt-2 text-sm font-bold text-slate-900">{maxGuests}</div>
                        </div>
                      )}
                      {totalBedrooms && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="text-slate-600"><BedDouble className="w-4 h-4" /></span>
                    <span className="text-xs font-semibold">Bedrooms</span>
                        </div>
                  <div className="mt-2 text-sm font-bold text-slate-900">{totalBedrooms}</div>
                        </div>
                      )}
                      {totalBathrooms && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="text-slate-600"><Bath className="w-4 h-4" /></span>
                    <span className="text-xs font-semibold">Bathrooms</span>
                        </div>
                  <div className="mt-2 text-sm font-bold text-slate-900">{totalBathrooms}</div>
                        </div>
                      )}
              {property.status === "APPROVED" && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="text-slate-600"><BadgeCheck className="w-4 h-4" /></span>
                    <span className="text-xs font-semibold">Status</span>
                  </div>
                  <div className="mt-2 text-sm font-bold text-slate-900">Verified</div>
                    </div>
                  )}
                </div>
                    </div>
                  )}

      {/* Main Content */}
      <div className="mt-6">
        <div className="space-y-6">

            {/* Amenities - Match Public View */}
            {/* About this place */}
            <section className="border-b border-gray-200 pb-6">
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
                </div>
              </section>


            {/* Services & Facilities - Simple List */}
            {(() => {
              // Check if there are any services to display using normalized values
              const hasServices = 
                (normalizedServicesObj.parking && normalizedServicesObj.parking !== 'no') ||
                normalizedServicesObj.breakfastIncluded ||
                normalizedServicesObj.breakfastAvailable ||
                normalizedServicesObj.restaurant ||
                normalizedServicesObj.bar ||
                normalizedServicesObj.pool ||
                normalizedServicesObj.sauna ||
                normalizedServicesObj.laundry ||
                normalizedServicesObj.roomService ||
                normalizedServicesObj.security24 ||
                normalizedServicesObj.firstAid ||
                normalizedServicesObj.fireExtinguisher ||
                normalizedServicesObj.onSiteShop ||
                normalizedServicesObj.nearbyMall ||
                normalizedServicesObj.socialHall ||
                normalizedServicesObj.sportsGames ||
                normalizedServicesObj.gym ||
                (Array.isArray(normalizedServicesObj.nearbyFacilities) && normalizedServicesObj.nearbyFacilities.length > 0) ||
                nearbyFacilities.length > 0 ||
                servicesArray.length > 0 ||
                (Array.isArray(normalizedServicesObj.tags) && normalizedServicesObj.tags.length > 0);
              
              // Debug logging
              if (mode === "admin") {
                console.log('[PropertyPreview] hasServices check:', {
                  hasServices,
                  parking: normalizedServicesObj.parking,
                  breakfastIncluded: normalizedServicesObj.breakfastIncluded,
                  breakfastAvailable: normalizedServicesObj.breakfastAvailable,
                  restaurant: normalizedServicesObj.restaurant,
                  bar: normalizedServicesObj.bar,
                  pool: normalizedServicesObj.pool,
                  sauna: normalizedServicesObj.sauna,
                  laundry: normalizedServicesObj.laundry,
                  roomService: normalizedServicesObj.roomService,
                  security24: normalizedServicesObj.security24,
                  firstAid: normalizedServicesObj.firstAid,
                  fireExtinguisher: normalizedServicesObj.fireExtinguisher,
                  onSiteShop: normalizedServicesObj.onSiteShop,
                  nearbyMall: normalizedServicesObj.nearbyMall,
                  socialHall: normalizedServicesObj.socialHall,
                  sportsGames: normalizedServicesObj.sportsGames,
                  gym: normalizedServicesObj.gym,
                  nearbyFacilitiesCount: nearbyFacilities.length,
                  servicesArrayLength: servicesArray.length,
                  tagsLength: Array.isArray(normalizedServicesObj.tags) ? normalizedServicesObj.tags.length : 0,
                });
              }
              
              return hasServices || nearbyFacilities.length > 0;
            })() && (
              <section className="border-b border-gray-200 pb-6">
                <ServicesAndFacilities
                  normalizedServicesObj={normalizedServicesObj}
                  effectiveServicesArray={effectiveServicesArray}
                  servicesArray={servicesArray}
                />

                {/* Nearby Services - Separate Section with Proper Spacing */}
                {nearbyFacilities.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-slate-200">
                    <NearbyServices
                      facilities={nearbyFacilities}
                      defaultExpanded={false}
                      showExpandButton={nearbyFacilities.length > 2}
                      maxInitialDisplay={2}
                    />
                  </div>
                )}
              </section>
            )}

            {/* Rooms Section - Match Public View with Table */}
            {rooms.length > 0 && (
              <section className="border-b border-gray-200 pb-10">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="flex items-center gap-2">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                      <DoorClosed className="w-5 h-5" aria-hidden />
                    </span>
                    <h2 className="text-lg font-semibold text-slate-900">Rooms & Pricing</h2>
                            </div>
                  {(() => {
                    const rows = normalizeRoomsSpec(property.roomsSpec || rooms, property.currency, property.basePrice, property, systemCommission);
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
                                    <RoomAmenityChip key={a} label={a} />
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
                                      <RoomAmenityChip key={item} label={item} />
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
                                    <li key={i} className="break-words flex items-start gap-1.5">
                                      {p.Icon && (
                                        <p.Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${p.iconColor || "text-slate-600"}`} aria-hidden />
                                      )}
                                      <span className="break-words">{p.text}</span>
                                    </li>
                                  ))}
                                </ul>
                            </div>
                            </div>
                                ))}
                              </div>

                        {/* Desktop: full-width table */}
                        <div className="hidden md:block">
                          <div className="rounded-xl border border-slate-200 overflow-hidden">
                            <table className="w-full table-fixed border-collapse">
                              <thead className="bg-slate-50 text-slate-700">
                                <tr>
                                  <th className="text-left text-sm font-semibold px-3 py-3 border-b border-slate-200 border-r border-slate-200 w-[13%]">
                                    Room type
                                  </th>
                                  <th className="text-left text-sm font-semibold px-3 py-3 border-b border-slate-200 border-r border-slate-200 w-[11%]">
                                    Bed Type &amp; Size
                                  </th>
                                  <th className="text-left text-sm font-semibold px-3 py-3 border-b border-slate-200 border-r border-slate-200 w-[28%]">
                                    Description &amp; Amenities
                                  </th>
                                  <th className="text-left text-sm font-semibold px-3 py-3 border-b border-slate-200 border-r border-slate-200 w-[14%]">
                                    Price &amp; Discounts
                                  </th>
                                  <th className="text-left text-sm font-semibold px-3 py-3 border-b border-slate-200 border-r border-slate-200 w-[11%]">Pay Now</th>
                                  <th className="text-left text-sm font-semibold px-3 py-3 border-b border-slate-200 w-[23%] min-w-[160px]">
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
                                            <RoomAmenityChip key={a} label={a} />
                                ))}
                      </div>
                                      ) : null}
                                      {r.bathItems && r.bathItems.length > 0 ? (
                                        <div className="mt-3 pt-3 border-t border-slate-100">
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
                                              <RoomAmenityChip key={item} label={item} />
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
                                        <div className="text-base font-bold text-[#02665e]">{fmtMoney(r.pricePerNight, property.currency)}</div>
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
                                      <ul className="space-y-1.5 text-sm text-slate-800">
                                        {r.policies.slice(0, 6).map((p, i) => (
                                          <li key={i} className="leading-relaxed break-words flex items-start gap-1.5">
                                            {p.Icon && (
                                              <p.Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${p.iconColor || "text-slate-600"}`} aria-hidden />
                                            )}
                                            <span className="break-words min-w-0">{p.text}</span>
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
              </section>
            )}

            {/* Admin/Owner Info Card - Moved here for full-width rooms table */}
            {(mode === "admin" || mode === "owner") && (
              <section className="border-b border-gray-200 pb-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-6 motion-safe:transition-all motion-safe:duration-300 hover:shadow-md">
                  {(property.basePrice !== null && property.basePrice !== undefined && property.basePrice > 0) && (
                    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-500">
                      <div className="text-sm sm:text-base text-slate-600 mb-2 font-medium">Base Price</div>
                      <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#02665e] motion-safe:transition-transform motion-safe:duration-200 hover:scale-[1.02]">
                              {(() => {
                                const basePrice = Number(property?.basePrice);
                                if (!basePrice || basePrice <= 0) return "—";
                                const commission = getPropertyCommission(property, systemCommission);
                                const finalPrice = calculatePriceWithCommission(basePrice, commission);
                                return new Intl.NumberFormat(undefined, {
                                  style: "currency",
                                  currency: property.currency || "TZS",
                                  maximumFractionDigits: 0,
                                }).format(finalPrice);
                              })()}
                            </div>
                  </div>
                )}
                  
                  {property.owner && (
                    <div className="pt-6 border-t border-slate-200/60 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-100">
                      <div className="text-sm sm:text-base font-semibold text-slate-900 mb-4">Owner Information</div>
                      
                      {/* Owner Profile Card */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5 motion-safe:transition-all motion-safe:duration-300 hover:bg-white hover:border-[#02665e]/20 hover:shadow-md cursor-default">
                        <div className="flex items-center gap-3 sm:gap-4 mb-4">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#02665e]/10 flex items-center justify-center flex-shrink-0 motion-safe:transition-all motion-safe:duration-300 hover:bg-[#02665e]/20 hover:scale-110">
                            <Users className="h-6 w-6 sm:h-7 sm:w-7 text-[#02665e] motion-safe:transition-transform motion-safe:duration-300" />
                      </div>
                          <div className="flex-1 min-w-0">
                            {property.owner.name && (
                              <div className="font-semibold text-sm sm:text-base text-slate-900 truncate mb-1.5">{property.owner.name}</div>
                            )}
                            <div className="flex items-center gap-1.5 motion-safe:transition-all motion-safe:duration-200">
                              <BadgeCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#02665e] flex-shrink-0" />
                              <span className="text-xs sm:text-sm text-[#02665e] font-medium">Verified Host</span>
                            </div>
                              </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 pt-3 border-t border-slate-200/50">
                          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 text-slate-500" />
                          <span>Response time: Usually within 2 hours</span>
                        </div>
                      </div>

                      {/* Contact Information */}
                      <div className="mt-4 space-y-2">
                        {property.owner.email && (
                          <a
                            href={`mailto:${property.owner.email}`}
                            className="group flex items-center gap-3 text-sm sm:text-base p-3 rounded-lg bg-white border border-slate-200 motion-safe:transition-all motion-safe:duration-200 hover:bg-slate-50 hover:border-[#02665e]/30 hover:shadow-sm no-underline"
                          >
                            <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 flex-shrink-0 motion-safe:transition-all motion-safe:duration-200 group-hover:text-[#02665e]" />
                            <span className="text-[#02665e] group-hover:text-[#014e47] truncate motion-safe:transition-colors motion-safe:duration-200 font-medium no-underline">
                              {property.owner.email}
                            </span>
                          </a>
                        )}
                        {property.owner.phone && (
                          <a
                            href={`tel:${property.owner.phone}`}
                            className="group flex items-center gap-3 text-sm sm:text-base p-3 rounded-lg bg-white border border-slate-200 motion-safe:transition-all motion-safe:duration-200 hover:bg-slate-50 hover:border-[#02665e]/30 hover:shadow-sm no-underline"
                          >
                            <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400 flex-shrink-0 motion-safe:transition-all motion-safe:duration-200 group-hover:text-[#02665e]" />
                            <span className="text-[#02665e] group-hover:text-[#014e47] motion-safe:transition-colors motion-safe:duration-200 font-medium no-underline">
                              {property.owner.phone}
                            </span>
                          </a>
                      )}
                    </div>
                </div>
            )}

                  {property.lastSubmittedAt && (
                    <div className="pt-5 border-t border-slate-200 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-200">
                      <div className="text-sm sm:text-base text-slate-600 mb-1.5 font-medium">Last Submitted</div>
                      <div className="text-sm sm:text-base font-medium text-slate-900">
                        {new Date(property.lastSubmittedAt).toLocaleString()}
                      </div>
                  </div>
                )}
                </div>
              </section>
            )}

            {/* House Rules Section */}
            {mode === "public" && (
              <section className="border-b border-gray-200 pb-10">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">House Rules</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Check-in</div>
                      <div className="text-sm text-gray-600">3:00 PM - 11:00 PM</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Check-out</div>
                      <div className="text-sm text-gray-600">Before 11:00 AM</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">No smoking</div>
                      <div className="text-sm text-gray-600">Smoking is not allowed</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Max guests</div>
                      <div className="text-sm text-gray-600">{maxGuests || "As specified"} guests maximum</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Ban className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">No parties or events</div>
                      <div className="text-sm text-gray-600">Quiet hours after 10 PM</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">Security deposit</div>
                      <div className="text-sm text-gray-600">May be required</div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Reviews Section */}
            {(mode === "public" || mode === "owner") && reviews && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="border-b border-gray-200 pb-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Guest Reviews</h2>
                  {reviews.stats && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                        <span className="text-xl font-bold text-gray-900">
                          {reviews.stats.averageRating.toFixed(1)}
                        </span>
                      </div>
                      <span className="text-gray-600">
                        ({reviews.stats.totalReviews} {reviews.stats.totalReviews === 1 ? "review" : "reviews"})
                      </span>
                    </div>
                  )}
                </div>

                {reviews.stats && (
                  <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">{rating}</span>
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(reviews.stats.ratingDistribution[rating] / reviews.stats.totalReviews) * 100}%` }}
                            transition={{ duration: 0.5, delay: rating * 0.1 }}
                            className="h-full bg-amber-400"
                          />
                        </div>
                        <span className="text-xs text-gray-600 w-8 text-right">
                          {reviews.stats.ratingDistribution[rating]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-6">
                  {reviews.reviews.slice(0, 5).map((review: any, idx: number) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: idx * 0.1 }}
                      className="border-b border-gray-100 pb-6 last:border-0"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <span className="text-emerald-600 font-semibold">
                              {review.user?.name?.charAt(0) || "G"}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {review.user?.name || "Anonymous Guest"}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <div className="flex items-center">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                              {review.isVerified && (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium">
                                  Verified Stay
                                </span>
                              )}
                              <span className="text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {review.title && (
                        <h4 className="font-semibold text-gray-900 mb-2">{review.title}</h4>
                      )}
                      {review.comment && (
                        <p className="text-gray-700 leading-relaxed mb-3">{review.comment}</p>
                      )}
                      {review.ownerResponse && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border-l-4 border-emerald-500">
                          <div className="font-semibold text-gray-900 mb-1">Owner Response</div>
                          <p className="text-gray-700 text-sm">{review.ownerResponse}</p>
                          {review.ownerResponseAt && (
                            <div className="text-xs text-gray-500 mt-2">
                              {new Date(review.ownerResponseAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Neighborhood Guide */}
            {mode === "public" && location.regionName && (
              <NeighborhoodGuide location={location} />
            )}

            {/* Location Details - Modern Style */}
            <section className="border-b border-gray-200 pb-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
                    <MapPin className="w-5 h-5" aria-hidden />
                  </span>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Where you'll be</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {location.street && (
                    <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-200 motion-safe:transition-all motion-safe:duration-200 hover:bg-white hover:border-[#02665e]/20 hover:shadow-sm">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Street Address</span>
                      <span className="text-sm sm:text-base font-medium text-slate-900">{location.street}</span>
                  </div>
                )}
                {location.apartment && (
                    <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-200 motion-safe:transition-all motion-safe:duration-200 hover:bg-white hover:border-[#02665e]/20 hover:shadow-sm">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Apartment/Building</span>
                      <span className="text-sm sm:text-base font-medium text-slate-900">{location.apartment}</span>
                  </div>
                )}
                {location.ward && (
                    <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-200 motion-safe:transition-all motion-safe:duration-200 hover:bg-white hover:border-[#02665e]/20 hover:shadow-sm">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Ward</span>
                      <span className="text-sm sm:text-base font-medium text-slate-900">{location.ward}</span>
                  </div>
                )}
                {location.district && (
                    <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-200 motion-safe:transition-all motion-safe:duration-200 hover:bg-white hover:border-[#02665e]/20 hover:shadow-sm">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">District</span>
                      <span className="text-sm sm:text-base font-medium text-slate-900">{location.district}</span>
                  </div>
                )}
                {location.regionName && (
                    <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-200 motion-safe:transition-all motion-safe:duration-200 hover:bg-white hover:border-[#02665e]/20 hover:shadow-sm">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Region</span>
                      <span className="text-sm sm:text-base font-medium text-slate-900">{location.regionName}</span>
                  </div>
                )}
                {location.city && (
                    <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-200 motion-safe:transition-all motion-safe:duration-200 hover:bg-white hover:border-[#02665e]/20 hover:shadow-sm">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">City</span>
                      <span className="text-sm sm:text-base font-medium text-slate-900">{location.city}</span>
                  </div>
                )}
                {location.zip && (
                    <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-200 motion-safe:transition-all motion-safe:duration-200 hover:bg-white hover:border-[#02665e]/20 hover:shadow-sm">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Zip Code</span>
                      <span className="text-sm sm:text-base font-medium text-slate-900">{location.zip}</span>
                  </div>
                )}
                {location.country && (
                    <div className="flex flex-col p-3 rounded-lg bg-slate-50 border border-slate-200 motion-safe:transition-all motion-safe:duration-200 hover:bg-white hover:border-[#02665e]/20 hover:shadow-sm">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Country</span>
                      <span className="text-sm sm:text-base font-medium text-slate-900">{location.country}</span>
                  </div>
                )}
                </div>

                {/* Map Card - Mapbox */}
                  <div className="mt-6">
                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">Property Location</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Exact location on map</p>
                  </div>
                  {((property.latitude && property.longitude) || (location.lat && location.lng) || (location.latitude && location.longitude)) ? (
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                      <div className="relative aspect-[16/9] bg-slate-100">
                        {(() => {
                          const lat = property.latitude || location.lat || location.latitude;
                          const lng = property.longitude || location.lng || location.longitude;
                          const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
                          return (
                            <>
                              {mapboxToken ? (
                        <img
                                  src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+10b981(${lng},${lat})/${lng},${lat},15,0/900x420?access_token=${encodeURIComponent(mapboxToken)}`}
                                  alt="Property location map"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                          <div className="text-center">
                                    <Map className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm text-slate-600 font-medium">Map view</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      {lat}, {lng}
                            </p>
                          </div>
                        </div>
                      )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
                            </>
                          );
                        })()}
                    </div>
                  </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                      <div className="relative aspect-[16/9] flex items-center justify-center">
                        <div className="text-center">
                          <MapPin className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                          <p className="text-sm text-slate-600 font-medium">Location coordinates not available</p>
                          <p className="text-xs text-slate-500 mt-1">Please add latitude and longitude to show the map</p>
              </div>
          </div>
                </div>
              )}
                      </div>
                    </div>
            </section>
                          </div>
                        </div>
                      </div>

      {/* Lightbox - Match Public View */}
      {showLightbox && photos.length > 0 ? (
        <div
          className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowLightbox(false);
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
              <div className="flex items-center justify-between mb-3">
                <div className="text-white text-sm font-semibold truncate">{property.title || "Property"}</div>
            <button
                  type="button"
                  className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              onClick={() => setShowLightbox(false)}
              aria-label="Close"
            >
                  <X className="w-5 h-5" />
            </button>
              </div>

              {/* Main image */}
              <div className="mx-auto w-full max-w-[720px]">
                <div className="relative rounded-2xl overflow-hidden bg-black h-[62vh] max-h-[520px] min-h-[320px]">
              <Image
                src={photos[selectedImageIndex]}
                    alt=""
                fill
                className="object-contain"
                    sizes="(min-width: 1024px) 720px, 100vw"
                    priority
              />

                <button
                    type="button"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                      setSelectedImageIndex((i) => (i <= 0 ? photos.length - 1 : i - 1));
                  }}
                    aria-label="Previous photo"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                      setSelectedImageIndex((i) => (i >= photos.length - 1 ? 0 : i + 1));
                  }}
                    aria-label="Next photo"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
                </div>
              </div>

              {/* Counter under photo */}
              <div className="mt-3 text-center text-white/90 text-sm font-semibold">
              {selectedImageIndex + 1} / {photos.length}
            </div>

              {/* Thumbnails strip */}
              <div className="mt-4 mx-auto w-full max-w-[920px] flex gap-2 overflow-x-auto pb-2 justify-center">
                {photos.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    className={[
                      "relative h-16 w-24 sm:h-20 sm:w-28 flex-shrink-0 rounded-xl overflow-hidden border",
                      i === selectedImageIndex ? "border-white" : "border-white/20",
                      "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
                      "motion-safe:hover:scale-[1.03] motion-safe:active:scale-[0.97]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
                    ].join(" ")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImageIndex(i);
                    }}
                    aria-label={`View photo ${i + 1}`}
                  >
                    <Image src={src} alt="" fill className="object-cover" sizes="120px" />
                  </button>
                ))}
          </div>
        </div>
          </div>
        </div>
      ) : null}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full shadow-xl my-auto max-h-[90vh] flex flex-col">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Reject Property</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">Please provide reasons for rejection (comma-separated):</p>
            <textarea
              value={rejectReasons}
              onChange={(e) => setRejectReasons(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 min-h-[100px] max-h-[200px] resize-y overflow-y-auto text-sm"
              placeholder="e.g., Insufficient photos, Missing location details, Quality issues"
            />
            <div className="flex flex-col sm:flex-row gap-2 justify-end mt-auto">
              <button
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectReasons("");
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={saving || !rejectReasons.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Rejecting..." : "Reject Property"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Property Edit Modal */}
      {property && (
        <PropertyEditModal
          property={property}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={async () => {
            // Force a complete reload by resetting property state first
            setProperty(null);
            setLoading(true);
            
            // Reload property data to get updated commission, discount rules, and room prices
            await loadProperty();
            
            // Also reload system commission in case it changed
            try {
              const response = await api.get("/admin/settings");
              if (response.data?.commissionPercent !== undefined) {
                const commission = Number(response.data.commissionPercent);
                setSystemCommission(isNaN(commission) ? 0 : commission);
              }
            } catch (e) {
              // Silently fail
            }
            
            // Trigger parent's onUpdated callback to refresh the list
            onUpdated?.();
          }}
        />
      )}
    </div>
  );
}
