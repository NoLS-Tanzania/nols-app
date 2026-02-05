"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import { HandHeart, Loader2, Users, MapPin, Calendar, DollarSign, Percent, Gift, FileText, Plus, XCircle, Filter, Building2, Tag, Zap, Eye, CheckCircle2, ArrowRight } from "lucide-react";
import { CountdownClock } from "@/components/ui/CountdownClock";

const api = axios.create({ baseURL: "", withCredentials: true });

type AvailableGroupStay = {
  id: number;
  groupType: string;
  accommodationType: string;
  headcount: number;
  roomsNeeded: number;
  toRegion: string;
  toDistrict?: string | null;
  toLocation?: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  totalAmount: number | null;
  currency: string;
  user: { id: number; name: string; email: string; phone: string | null } | null;
  existingClaimsCount: number;
  ownerClaims?: Array<{
    id: number;
    ownerId: number;
    offeredPricePerNight: number;
    discountPercent: number | null;
    status: string;
  }>;
  otherClaims?: Array<{
    id: number;
    ownerId: number;
    offeredPricePerNight: number;
    discountPercent: number | null;
    status: string;
  }>;
  hasOwnerClaim?: boolean;
  existingClaims: Array<{
    id: number;
    ownerId: number;
    offeredPricePerNight: number;
    discountPercent: number | null;
    status: string;
  }>;
  openedForClaimsAt: string | null;
  submissionDeadline: string | null;
  minDiscountPercent: number | null;
  minHotelStar?: number | null;
  createdAt: string;
};

type Property = {
  id: number;
  title: string;
  type: string;
  regionName: string;
  district?: string | null;
  services?: any;
  hotelStar?: string | null;
  basePrice: number | null;
  currency: string;
};

function normalizeText(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.trim().toLowerCase();
}

function normalizeKey(v: unknown): string {
  return normalizeText(v).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function normalizeDistrictName(v: unknown): string {
  return normalizeText(v)
    .replace(/\bdistrict\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getServicesTags(services: any): string[] {
  if (!services) return [];
  if (Array.isArray(services)) {
    return services.filter((s) => typeof s === "string");
  }
  if (typeof services === "object") {
    const tags = (services as any)?.tags;
    if (Array.isArray(tags)) {
      return tags.filter((s) => typeof s === "string");
    }
  }
  return [];
}

function propertyAllowsGroupStay(property: Property): boolean {
  const tags = getServicesTags(property.services);
  return tags.some((t) => normalizeText(t) === "group stay");
}

function propertyTypeToAccommodationKey(propertyType: unknown): string {
  const k = normalizeKey(propertyType);
  // UI uses human labels like "Hotel", "Guest House", etc.
  if (k === "guest_house" || k === "guesthouse") return "guest_house";
  if (k === "hotel") return "hotel";
  if (k === "apartment") return "apartment";
  if (k === "villa") return "villa";
  if (k === "lodge") return "lodge";
  if (k === "resort") return "resort";
  if (k === "camp" || k === "campsite") return "camp";
  if (k === "hostel") return "hostel";
  return k;
}

function bookingAccommodationKey(accommodationType: unknown): string {
  const k = normalizeKey(accommodationType);
  if (k === "guest_house" || k === "guesthouse") return "guesthouse";
  return k;
}

function isAccommodationCompatible(requestedAccommodationType: unknown, propertyType: unknown): boolean {
  const requested = bookingAccommodationKey(requestedAccommodationType);
  const propertyKey = propertyTypeToAccommodationKey(propertyType);

  if (!requested || !propertyKey) return true;
  if (requested === propertyKey) return true;

  // Current system does not reliably model "Hostel" as a distinct property type.
  // Best-effort compatibility: allow hotel/guest_house for hostel requests.
  if (requested === "hostel") {
    return propertyKey === "hotel" || propertyKey === "guest_house";
  }

  if (requested === "guesthouse") {
    return propertyKey === "guest_house";
  }

  return false;
}

function hotelStarLabelToNumber(v: unknown): number | null {
  const s = normalizeText(v);
  if (!s) return null;
  const map: Record<string, number> = {
    basic: 1,
    simple: 2,
    moderate: 3,
    high: 4,
    luxury: 5,
  };
  if (map[s]) return map[s];
  const n = Number(s);
  if (Number.isFinite(n) && n >= 1 && n <= 5) return Math.trunc(n);
  return null;
}

function describeAccommodationType(v: unknown): string {
  const s = normalizeText(v);
  if (!s) return "any";
  return s.replace(/_/g, " ");
}

export default function OwnerClaimBookingPage() {
  const [groupStays, setGroupStays] = useState<AvailableGroupStay[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedAccommodation, setSelectedAccommodation] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedGroupStay, setSelectedGroupStay] = useState<AvailableGroupStay | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Claim form state
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null);
  const [offeredPrice, setOfferedPrice] = useState<string>("");
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [discountCriteria, setDiscountCriteria] = useState<string>("");
  const [minimumNights, setMinimumNights] = useState<string>("");
  const [specialOffers, setSpecialOffers] = useState<string>("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>("");
  
  // Validation state
  const [errors, setErrors] = useState<{
    property?: string;
    price?: string;
    discountPercent?: string;
    specialOffers?: string;
    notes?: string;
  }>({});
  
  // Character limits
  const MAX_SPECIAL_OFFERS = 500;
  const MAX_NOTES = 1000;

  // Common exceptional services
  const exceptionalServices = [
    "Free breakfast",
    "Airport pickup",
    "Late checkout",
    "Early check-in",
    "Free Wi-Fi",
    "Room upgrade",
    "Welcome drinks",
    "Spa discount",
    "Free parking",
    "Laundry service",
    "Tour guide assistance",
    "Complimentary dinner",
  ];

  // Handle service selection
  const handleServiceToggle = (service: string) => {
    setSelectedServices((prev) => {
      const isSelected = prev.includes(service);
      const newSelection = isSelected
        ? prev.filter((s) => s !== service)
        : [...prev, service];
      
      // Update textarea with selected services
      const servicesText = newSelection.join(", ");
      setSpecialOffers(servicesText);
      
      return newSelection;
    });
  };

  // Sync textarea changes with selected services
  const handleSpecialOffersChange = (value: string) => {
    if (value.length <= MAX_SPECIAL_OFFERS) {
      setSpecialOffers(value);
      // Parse services from textarea (split by comma)
      const services = value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      
      // Update selected services to match textarea
      setSelectedServices(services.filter((s) => exceptionalServices.includes(s)));
      
      // Clear error if valid
      if (errors.specialOffers && value.length <= MAX_SPECIAL_OFFERS) {
        setErrors((prev) => ({ ...prev, specialOffers: undefined }));
      }
    }
  };

  // Handle notes change with character limit
  const handleNotesChange = (value: string) => {
    if (value.length <= MAX_NOTES) {
      setNotes(value);
      // Clear error if valid
      if (errors.notes && value.length <= MAX_NOTES) {
        setErrors((prev) => ({ ...prev, notes: undefined }));
      }
    }
  };

  // Show toast notification
  const showToast = (type: "success" | "error" | "info" | "warning", title: string, message?: string, duration?: number) => {
    window.dispatchEvent(
      new CustomEvent("nols:toast", {
        detail: { type, title, message, duration: duration ?? 5000 },
      })
    );
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!selectedPropertyId) {
      newErrors.property = "Please select a property";
    }

    if (!offeredPrice || Number(offeredPrice) <= 0) {
      newErrors.price = "Please enter a valid price per night";
    } else if (Number(offeredPrice) < 1) {
      newErrors.price = "Price must be at least 1";
    }

    if (discountEnabled && discountPercent) {
      if (discountType === "percentage" && (Number(discountPercent) < 0 || Number(discountPercent) > 100)) {
        newErrors.discountPercent = "Discount percentage must be between 0 and 100";
      } else if (discountType === "fixed" && Number(discountPercent) < 0) {
        newErrors.discountPercent = "Discount amount cannot be negative";
      } else if (discountType === "fixed" && Number(discountPercent) >= Number(offeredPrice)) {
        newErrors.discountPercent = "Discount amount cannot exceed price per night";
      }
    }

    if (specialOffers.length > MAX_SPECIAL_OFFERS) {
      newErrors.specialOffers = `Special offers cannot exceed ${MAX_SPECIAL_OFFERS} characters`;
    }

    if (notes.length > MAX_NOTES) {
      newErrors.notes = `Notes cannot exceed ${MAX_NOTES} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate on input change
  const validatePrice = (value: string) => {
    setOfferedPrice(value);
    if (value && Number(value) <= 0) {
      setErrors((prev) => ({ ...prev, price: "Price must be greater than 0" }));
    } else if (value && Number(value) < 1) {
      setErrors((prev) => ({ ...prev, price: "Price must be at least 1" }));
    } else {
      setErrors((prev) => ({ ...prev, price: undefined }));
    }
  };

  const validateDiscount = (value: string) => {
    setDiscountPercent(value);
    if (!value) {
      setErrors((prev) => ({ ...prev, discountPercent: undefined }));
      return;
    }
    
    if (discountType === "percentage") {
      if (Number(value) < 0 || Number(value) > 100) {
        setErrors((prev) => ({ ...prev, discountPercent: "Must be between 0 and 100" }));
      } else {
        setErrors((prev) => ({ ...prev, discountPercent: undefined }));
      }
    } else {
      // Fixed amount
      if (Number(value) < 0) {
        setErrors((prev) => ({ ...prev, discountPercent: "Cannot be negative" }));
      } else if (offeredPrice && Number(value) >= Number(offeredPrice)) {
        setErrors((prev) => ({ ...prev, discountPercent: "Cannot exceed price per night" }));
      } else {
        setErrors((prev) => ({ ...prev, discountPercent: undefined }));
      }
    }
  };
  
  // Re-validate discount when discount type or offered price changes
  useEffect(() => {
    if (discountPercent && discountEnabled) {
      const value = discountPercent;
      if (discountType === "percentage") {
        if (Number(value) < 0 || Number(value) > 100) {
          setErrors((prev) => ({ ...prev, discountPercent: "Must be between 0 and 100" }));
        } else {
          setErrors((prev) => ({ ...prev, discountPercent: undefined }));
        }
      } else {
        // Fixed amount
        if (Number(value) < 0) {
          setErrors((prev) => ({ ...prev, discountPercent: "Cannot be negative" }));
        } else if (offeredPrice && Number(value) >= Number(offeredPrice)) {
          setErrors((prev) => ({ ...prev, discountPercent: "Cannot exceed price per night" }));
        } else {
          setErrors((prev) => ({ ...prev, discountPercent: undefined }));
        }
      }
    }
  }, [discountType, offeredPrice, discountPercent, discountEnabled]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Always load all group stays (no filters) so we can show accurate counts in filter tabs
      const [groupStaysRes, propertiesRes] = await Promise.all([
        api.get("/api/owner/group-stays/claims/available"),
        api.get("/api/owner/properties/mine", { params: { status: "APPROVED" } }),
      ]);

      const groupStaysData = groupStaysRes.data.items || [];
      setGroupStays(groupStaysData);
      const props = Array.isArray(propertiesRes.data) ? propertiesRes.data : (propertiesRes.data?.items || []);
      setProperties(props as Property[]);
    } catch (err: any) {
      console.error("Failed to load data:", err);
      setGroupStays([]);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, []); // Remove dependencies so it only loads once

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update current time every second for countdown timers (digital watch style)
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second for real-time countdown
    return () => clearInterval(interval);
  }, []);

  const handleOpenClaimModal = (groupStay: AvailableGroupStay) => {
    setSelectedGroupStay(groupStay);
    setSelectedPropertyId(null);
    setOfferedPrice("");
    setDiscountEnabled(false);
    setDiscountType("percentage");
    setDiscountPercent("");
    setDiscountCriteria("");
    setMinimumNights("");
    setSpecialOffers("");
    setSelectedServices([]);
    setNotes("");
    setErrors({});
    setShowClaimModal(true);
  };

  // Autofill price when property is selected
  useEffect(() => {
    if (selectedPropertyId && properties.length > 0) {
      const selectedProperty = properties.find(p => p.id === selectedPropertyId);
      if (selectedProperty && selectedProperty.basePrice) {
        setOfferedPrice(selectedProperty.basePrice.toString());
      }
    }
  }, [selectedPropertyId, properties]);

  const eligibleProperties = useMemo(() => {
    if (!selectedGroupStay) return properties;

    const bookingRegion = normalizeText(selectedGroupStay.toRegion);
    const bookingDistrict = normalizeDistrictName(selectedGroupStay.toDistrict);
    const requiresDistrict = Boolean(bookingDistrict);
    const minHotelStar = typeof selectedGroupStay.minHotelStar === "number" ? selectedGroupStay.minHotelStar : null;

    return properties.filter((p) => {
      if (!propertyAllowsGroupStay(p)) return false;
      if (!isAccommodationCompatible(selectedGroupStay.accommodationType, p.type)) return false;

      if (bookingRegion && normalizeText(p.regionName) !== bookingRegion) return false;
      if (requiresDistrict) {
        const propertyDistrict = normalizeDistrictName(p.district);
        if (!propertyDistrict || propertyDistrict !== bookingDistrict) return false;
      }

      if (minHotelStar) {
        const star = hotelStarLabelToNumber(p.hotelStar);
        if (!star || star < minHotelStar) return false;
      }

      return true;
    });
  }, [properties, selectedGroupStay]);

  const propertyEligibility = useMemo(() => {
    if (!selectedGroupStay) {
      return properties.map((p) => ({ property: p, eligible: true, reasons: [] as string[] }));
    }

    const bookingRegion = normalizeText(selectedGroupStay.toRegion);
    const bookingDistrict = normalizeDistrictName(selectedGroupStay.toDistrict);
    const requiresDistrict = Boolean(bookingDistrict);
    const requestedAccommodation = describeAccommodationType(selectedGroupStay.accommodationType);
    const minHotelStar = typeof selectedGroupStay.minHotelStar === "number" ? selectedGroupStay.minHotelStar : null;

    return properties.map((p) => {
      const reasons: string[] = [];

      if (!propertyAllowsGroupStay(p)) {
        reasons.push("Group stay not enabled");
      }

      if (!isAccommodationCompatible(selectedGroupStay.accommodationType, p.type)) {
        reasons.push(`Type mismatch (needs ${requestedAccommodation})`);
      }

      if (bookingRegion && normalizeText(p.regionName) !== bookingRegion) {
        reasons.push("Wrong region");
      }

      if (requiresDistrict) {
        const propertyDistrict = normalizeDistrictName(p.district);
        if (!propertyDistrict) {
          reasons.push("Missing district");
        } else if (propertyDistrict !== bookingDistrict) {
          reasons.push("Wrong district");
        }
      }

      if (minHotelStar) {
        const star = hotelStarLabelToNumber(p.hotelStar);
        if (!star) {
          reasons.push(`Missing hotel star (needs ${minHotelStar}★+)`);
        } else if (star < minHotelStar) {
          reasons.push(`Hotel star too low (needs ${minHotelStar}★+)`);
        }
      }

      return { property: p, eligible: reasons.length === 0, reasons };
    });
  }, [properties, selectedGroupStay]);

  // If a property was selected and becomes ineligible, clear it.
  useEffect(() => {
    if (!selectedPropertyId) return;
    if (!selectedGroupStay) return;
    const stillEligible = eligibleProperties.some((p) => p.id === selectedPropertyId);
    if (!stillEligible) setSelectedPropertyId(null);
  }, [eligibleProperties, selectedGroupStay, selectedPropertyId]);

  const handleSubmitClaim = async () => {
    // Validate form
    if (!validateForm()) {
      showToast("error", "Validation Error", "Please fix the errors before submitting", 4000);
      return;
    }

    if (!selectedGroupStay || !selectedPropertyId || !offeredPrice) {
      showToast("error", "Missing Information", "Please fill in all required fields", 4000);
      return;
    }

    try {
      setClaiming(true);
      await api.post("/api/owner/group-stays/claims", {
        groupBookingId: selectedGroupStay.id,
        propertyId: selectedPropertyId,
        offeredPricePerNight: Number(offeredPrice),
        discountPercent: discountEnabled && discountPercent ? Number(discountPercent) : null,
        specialOffers: specialOffers.trim() || null,
        notes: notes.trim() || null,
      });

      showToast("success", "Offer Submitted!", "Your competitive offer has been submitted successfully", 5000);
      setShowClaimModal(false);
      loadData(); // Reload to show updated claims count
    } catch (err: any) {
      console.error("Failed to submit claim:", err);
      const errorMessage = err.response?.data?.error || err.message || "Failed to submit claim. Please try again.";
      showToast("error", "Submission Failed", errorMessage, 6000);
    } finally {
      setClaiming(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Not specified";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount: number | null, currency: string = "TZS") => {
    if (amount === null) return "N/A";
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get unique regions and accommodation types for filters (from all available, not just filtered)
  const regions = useMemo(() => {
    const unique = new Set(groupStays.map(gs => gs.toRegion).filter(Boolean));
    return Array.from(unique).sort();
  }, [groupStays]);

  const accommodationTypes = useMemo(() => {
    const unique = new Set(groupStays.map(gs => gs.accommodationType).filter(Boolean));
    return Array.from(unique).sort();
  }, [groupStays]);

  // Calculate time remaining for each group stay (digital watch style)
  const getTimeRemaining = useCallback((deadline: string | null) => {
    if (!deadline) {
      return null;
    }
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - currentTime.getTime();
    
    if (diff <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0 };
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { expired: false, days, hours, minutes, seconds, totalMs: diff };
  }, [currentTime]);

  // Filter and sort group stays
  const filteredGroupStays = useMemo(() => {
    const filtered = groupStays.filter(gs => {
      const hasOwnerClaim = gs.hasOwnerClaim ?? (gs.ownerClaims && gs.ownerClaims.length > 0 && 
        gs.ownerClaims.some(claim => claim.status === "PENDING" || claim.status === "REVIEWING" || claim.status === "ACCEPTED"));

      // Available-to-claim list should only show bookings not yet claimed by this owner.
      if (hasOwnerClaim) return false;
      
      if (selectedRegion && gs.toRegion !== selectedRegion) return false;
      if (selectedAccommodation && gs.accommodationType !== selectedAccommodation) return false;
      // Hide expired auctions
      if (gs.submissionDeadline) {
        const timeRemaining = getTimeRemaining(gs.submissionDeadline);
        if (timeRemaining?.expired) return false;
      }
      return true;
    });

    // Always sort by deadline (soonest first)
    filtered.sort((a, b) => {
      const aDeadline = a.submissionDeadline ? new Date(a.submissionDeadline).getTime() : Infinity;
      const bDeadline = b.submissionDeadline ? new Date(b.submissionDeadline).getTime() : Infinity;
      return aDeadline - bDeadline;
    });

    return filtered;
  }, [groupStays, selectedRegion, selectedAccommodation, getTimeRemaining]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-brand-100 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Claim Booking</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">Loading available group stays…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white border-2 border-brand-200 shadow-lg shadow-brand-500/10 mb-2 transition-all duration-300 hover:scale-105">
          <HandHeart className="h-10 w-10 text-brand" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Claim Booking</h1>
          <p className="text-base text-slate-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            Submit competitive offers for group stays. Showcase your properties with discounts and special offers.
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col items-center gap-4">
        {/* Filter Buttons & Filter Icon */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 bg-gradient-to-r from-brand-600 to-brand-700 text-white border-brand-600 shadow-lg shadow-brand-500/30">
            <Zap className="h-4 w-4 text-white" />
            <span>Available to Claim</span>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/25 text-white backdrop-blur-sm">
              {groupStays.filter(gs => {
                const hasOwnerClaim = gs.hasOwnerClaim ?? (gs.ownerClaims && gs.ownerClaims.length > 0 &&
                  gs.ownerClaims.some(claim => claim.status === "PENDING" || claim.status === "REVIEWING" || claim.status === "ACCEPTED"));
                return !hasOwnerClaim;
              }).length}
            </span>
          </div>

          <Link
            href="/owner/group-stays/claims/my-claims"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 transition-all duration-300 font-semibold text-sm bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md hover:scale-105"
            aria-label="Go to My Claims"
            title="My Claims"
          >
            <FileText className="h-4 w-4 text-slate-500" />
            <span>My Claims</span>
            <ArrowRight className="h-4 w-4 text-slate-500" />
          </Link>
          {/* Filter Button - Executive Professional Style */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`inline-flex items-center justify-center h-12 w-12 rounded-2xl border-2 transition-all duration-500 shadow-lg hover:shadow-xl hover:scale-110 ${
              filtersOpen || selectedRegion || selectedAccommodation
                ? 'bg-gradient-to-br from-brand-600 via-brand-600 to-brand-700 text-white border-brand-500/30 shadow-brand-500/40'
                : 'bg-gradient-to-br from-white to-slate-50 text-brand border-slate-200 hover:border-brand/40 hover:from-brand/5 hover:to-brand/10'
            }`}
            aria-label="Filter options"
            title="Filter options"
          >
            <Filter className={`h-5 w-5 transition-transform duration-300 ${filtersOpen ? 'rotate-180' : ''} ${filtersOpen || selectedRegion || selectedAccommodation ? 'text-white' : 'text-brand'}`} />
          </button>
        </div>

        {/* Active Filters Display - Executive Professional Badges */}
        {(selectedRegion || selectedAccommodation) && (
          <div className="flex items-center gap-3 flex-wrap justify-center pt-4">
            <span className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Active Filters:</span>
            {selectedRegion && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-50 to-blue-100/80 border-2 border-blue-200/60 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <MapPin className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-blue-900">{selectedRegion}</span>
                <button
                  onClick={() => setSelectedRegion("")}
                  className="ml-1 h-6 w-6 rounded-lg bg-blue-200/60 hover:bg-blue-300/80 flex items-center justify-center text-blue-700 hover:text-blue-900 transition-all duration-300 hover:scale-110"
                  aria-label="Remove region filter"
                  title="Remove region filter"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            )}
            {selectedAccommodation && (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-50 to-violet-100/80 border-2 border-violet-200/60 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 group">
                <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-sm">
                  <Building2 className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-violet-900 capitalize">{selectedAccommodation}</span>
                <button
                  onClick={() => setSelectedAccommodation("")}
                  className="ml-1 h-6 w-6 rounded-lg bg-violet-200/60 hover:bg-violet-300/80 flex items-center justify-center text-violet-700 hover:text-violet-900 transition-all duration-300 hover:scale-110"
                  aria-label="Remove accommodation filter"
                  title="Remove accommodation filter"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {filtersOpen && (
          <div className="w-full max-w-5xl bg-gradient-to-br from-white via-slate-50/50 to-white rounded-3xl border-2 border-slate-200/80 p-8 shadow-2xl shadow-slate-300/40 animate-in fade-in slide-in-from-top-2 duration-500 backdrop-blur-sm">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b-2 border-slate-200/60">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-brand/10 via-brand/5 to-transparent flex items-center justify-center border border-brand/20 shadow-md">
                  <Filter className="h-6 w-6 text-brand" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Advanced Filters</p>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Refine Your Opportunities</h3>
                </div>
              </div>
            </div>

            {/* Filter Grid - Executive Professional Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Region Filter - Enhanced */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <label className="block text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Region
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 pointer-events-none z-10 group-hover:text-brand transition-colors duration-300">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full pl-12 pr-10 py-4 border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 bg-gradient-to-br from-white to-slate-50/50 focus:ring-4 focus:ring-brand/20 focus:border-brand outline-none transition-all duration-300 hover:border-slate-300 hover:shadow-md shadow-sm appearance-none cursor-pointer"
                    aria-label="Filter by region"
                    title="Select region to filter"
                  >
                    <option value="">All Regions</option>
                    {regions.map(region => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Accommodation Type Filter - Enhanced */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-md">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <label className="block text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Accommodation Type
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-600 pointer-events-none z-10 group-hover:text-violet-600 transition-colors duration-300">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <select
                    value={selectedAccommodation}
                    onChange={(e) => setSelectedAccommodation(e.target.value)}
                    className="w-full pl-12 pr-10 py-4 border-2 border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 bg-gradient-to-br from-white to-slate-50/50 focus:ring-4 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all duration-300 hover:border-slate-300 hover:shadow-md shadow-sm appearance-none cursor-pointer"
                    aria-label="Filter by accommodation type"
                    title="Select accommodation type to filter"
                  >
                    <option value="">All Types</option>
                    {accommodationTypes.map(type => (
                      <option key={type} value={type} className="capitalize">{type}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Clear Filters Button */}
            {(selectedRegion || selectedAccommodation) && (
              <div className="mt-6 pt-6 border-t-2 border-slate-200/60 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedRegion("");
                    setSelectedAccommodation("");
                  }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border-2 border-slate-200 transition-all duration-300 hover:scale-105 shadow-sm"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Group Stays List */}
      <div className="space-y-4">
        {filteredGroupStays.length === 0 ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center bg-white rounded-2xl shadow-sm p-16">
            <HandHeart className="h-12 w-12 text-slate-400 mb-6" />
            <p className="text-base font-semibold text-slate-700 mb-2">
              {groupStays.length === 0 
                ? "No group stays available for claiming" 
                : "No group stays match your filters"}
            </p>
            <p className="text-sm text-slate-500">
              {groupStays.length === 0 
                ? "Check back later for new opportunities." 
                : "Try adjusting your filters to see more results."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredGroupStays.map((gs) => {
              const timeRemaining = getTimeRemaining(gs.submissionDeadline);
              const isUrgent = timeRemaining && !timeRemaining.expired && timeRemaining.totalMs < 24 * 60 * 60 * 1000; // Less than 24 hours
              const isHot = gs.existingClaimsCount >= 3;
              
              // Check if owner has claimed this group stay
              const hasOwnerClaim = gs.hasOwnerClaim ?? (gs.ownerClaims && gs.ownerClaims.length > 0 && 
                gs.ownerClaims.some(claim => claim.status === "PENDING" || claim.status === "REVIEWING" || claim.status === "ACCEPTED"));
              const ownerClaim = gs.ownerClaims?.find(claim => claim.status === "PENDING" || claim.status === "REVIEWING" || claim.status === "ACCEPTED");
              
              return (
              <div key={gs.id} className={`group relative bg-white rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-slate-100 ${isUrgent ? 'ring-4 ring-red-500/20 shadow-red-500/10' : 'shadow-lg shadow-slate-200/50'}`}>
                {/* Left accent bar - color based on urgency */}
                <div className={`absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b ${
                  isUrgent ? 'from-red-500 via-red-600 to-red-700' : 
                  isHot ? 'from-orange-500 via-orange-600 to-orange-700' : 
                  'from-brand via-brand-500 to-brand-600'
                } shadow-lg`}></div>
                
                <div className="pl-6 pr-6 py-6">
                  {/* Digital Clock Icon with Countdown Timer - Featured at Top */}
                  {gs.submissionDeadline && (
                    <div className="mb-8">
                      <CountdownClock
                        deadline={gs.submissionDeadline}
                        showDetails={true}
                        isHot={isHot}
                        size="md"
                        className="animate-in fade-in slide-in-from-top-3 duration-500"
                      />
                    </div>
                  )}

                  {/* Header Section - Enhanced Professional Design */}
                  <div className="flex items-start gap-4 mb-6 pb-6 border-b border-slate-100">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand/10 via-brand/5 to-transparent flex items-center justify-center transition-all duration-500 group-hover:from-brand/20 group-hover:via-brand/10 group-hover:scale-110 group-hover:shadow-lg shadow-md border border-brand/20">
                      <HandHeart className="h-7 w-7 text-brand transition-transform duration-500 group-hover:scale-110" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-3">
                        <h3 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-brand transition-colors duration-300">
                          Group Stay #{gs.id}
                        </h3>
                        <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200/60 capitalize shadow-sm backdrop-blur-sm">
                          {gs.groupType}
                        </span>
                        {hasOwnerClaim && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-600 to-brand-700 text-white border border-brand-500/30 shadow-md backdrop-blur-sm">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Claimed
                            {ownerClaim && (
                              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/25 text-white text-[10px] font-bold">
                                {ownerClaim.status === "ACCEPTED" ? "✓" : "⏳"}
                              </span>
                            )}
                          </span>
                        )}
                        {gs.existingClaimsCount > 0 && !hasOwnerClaim && (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 border border-amber-200/60 shadow-sm backdrop-blur-sm">
                            {gs.existingClaimsCount} competitive offer{gs.existingClaimsCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {/* Location & Accommodation Type - Enhanced Info badges */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
                          <MapPin className="h-3.5 w-3.5 text-slate-600" />
                          <span className="font-medium">{gs.toRegion}{gs.toDistrict ? `, ${gs.toDistrict}` : ''}</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-slate-100/50 border border-slate-200/60 rounded-xl text-xs font-semibold text-slate-700 capitalize shadow-sm backdrop-blur-sm">
                          <Building2 className="h-3.5 w-3.5 text-slate-600" />
                          <span className="font-medium">{gs.accommodationType}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Minimum Discount Requirement - Enhanced */}
                  {gs.minDiscountPercent && (
                    <div className="mb-6 p-4 bg-gradient-to-br from-purple-50 via-purple-50/80 to-purple-50/60 rounded-2xl border-2 border-purple-200/60 shadow-sm backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                          <Percent className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-0.5">
                            Minimum Discount Requirement
                          </div>
                          <div className="text-lg font-bold text-purple-900">
                            {gs.minDiscountPercent}% Discount Required
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Key Metrics Grid - Professional Executive Style */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Headcount Card */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-emerald-50/90 to-emerald-50/70 rounded-2xl border-2 border-emerald-200/60 p-4 shadow-md hover:shadow-lg transition-all duration-300 group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                            Headcount
                          </div>
                          <div className="text-xl font-bold text-emerald-900 leading-tight">
                            {gs.headcount} <span className="text-sm font-medium text-emerald-700">people</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rooms Card */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-violet-50/90 to-violet-50/70 rounded-2xl border-2 border-violet-200/60 p-4 shadow-md hover:shadow-lg transition-all duration-300 group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-violet-200/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-violet-700 uppercase tracking-wide mb-1">
                            Rooms
                          </div>
                          <div className="text-xl font-bold text-violet-900 leading-tight">
                            {gs.roomsNeeded} <span className="text-sm font-medium text-violet-700">rooms</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Accommodation Type Card */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-blue-50/90 to-blue-50/70 rounded-2xl border-2 border-blue-200/60 p-4 shadow-md hover:shadow-lg transition-all duration-300 group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <Tag className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
                            Type
                          </div>
                          <div className="text-xl font-bold text-blue-900 leading-tight capitalize">
                            {gs.accommodationType}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Base Price Card */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-amber-50/90 to-amber-50/70 rounded-2xl border-2 border-amber-200/60 p-4 shadow-md hover:shadow-lg transition-all duration-300 group">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/20 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
                      <div className="relative flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <DollarSign className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
                            Base Price
                          </div>
                          <div className="text-xl font-bold text-amber-900 leading-tight">
                            {gs.totalAmount ? formatCurrency(gs.totalAmount, gs.currency) : <span className="text-sm font-medium text-amber-700">N/A</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stay Dates - Enhanced */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 via-slate-50/80 to-slate-50/60 rounded-2xl border border-slate-200/60 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center shadow-md">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-0.5">
                          Stay Duration
                        </div>
                        <div className="text-base font-bold text-slate-900">
                          {formatDate(gs.checkIn)} <span className="text-slate-500 font-normal">→</span> {formatDate(gs.checkOut)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Owner's Claim Details - Show when viewing claimed filter */}
                  {hasOwnerClaim && ownerClaim && (
                    <div className="mb-6 p-5 bg-gradient-to-br from-brand-50 via-brand-50/80 to-brand-50/60 rounded-2xl border-2 border-brand-300/60 shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center shadow-md">
                          <CheckCircle2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-brand-900 uppercase tracking-wide mb-0.5">
                            Your Submitted Offer
                          </h4>
                          <p className="text-xs text-brand-700">
                            Status: <span className="font-semibold capitalize">{ownerClaim.status}</span>
                          </p>
                        </div>
                        <Link
                          href="/owner/group-stays/claims/my-claims"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-brand-700 border border-brand-300 hover:bg-brand-50 transition-colors duration-200"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View All
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-3 bg-white/80 rounded-xl border border-brand-200/60">
                          <p className="text-xs text-brand-600 mb-1">Your Price</p>
                          <p className="text-lg font-bold text-brand-900">
                            {formatCurrency(ownerClaim.offeredPricePerNight, gs.currency)}/night
                          </p>
                        </div>
                        {ownerClaim.discountPercent && (
                          <div className="p-3 bg-white/80 rounded-xl border border-brand-200/60">
                            <p className="text-xs text-brand-600 mb-1">Your Discount</p>
                            <p className="text-lg font-bold text-green-700">
                              {ownerClaim.discountPercent}% OFF
                            </p>
                          </div>
                        )}
                        <div className="p-3 bg-white/80 rounded-xl border border-brand-200/60">
                          <p className="text-xs text-brand-600 mb-1">Status</p>
                          <p className={`text-lg font-bold capitalize ${
                            ownerClaim.status === "ACCEPTED" ? "text-green-700" :
                            ownerClaim.status === "PENDING" ? "text-amber-700" :
                            "text-slate-700"
                          }`}>
                            {ownerClaim.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Current Competitive Offers - Enhanced Executive Display */}
                  {gs.existingClaims.length > 0 && !hasOwnerClaim && (
                    <div className="mb-6 p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 rounded-2xl border-2 border-slate-200/60 shadow-md">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                          <DollarSign className="h-4 w-4 text-white" />
                        </div>
                        <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Current Competitive Offers
                        </p>
                        <span className="ml-auto px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold">
                          {gs.existingClaims.length}
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {gs.existingClaims.slice(0, 3).map((claim, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white/80 rounded-xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300 hover:border-slate-300">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                #{idx + 1}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900">
                                  {formatCurrency(claim.offeredPricePerNight, gs.currency)}
                                </div>
                                <div className="text-xs text-slate-500 font-medium">per night</div>
                              </div>
                            </div>
                            {claim.discountPercent && (
                              <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-100 to-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-sm shadow-sm">
                                {claim.discountPercent}% OFF
                              </div>
                            )}
                          </div>
                        ))}
                        {gs.existingClaims.length > 3 && (
                          <div className="text-center pt-2">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs font-semibold">
                              <span>+{gs.existingClaims.length - 3} additional competitive offer{gs.existingClaims.length - 3 > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Submit Button or View Claim Button */}
                  {hasOwnerClaim ? (
                    <div className="flex justify-center w-full">
                      <Link
                        href="/owner/group-stays/claims/my-claims"
                        className="inline-flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-500 font-semibold sm:font-bold text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] bg-gradient-to-r from-brand-600 via-brand-600 to-brand-700 text-white hover:from-brand-700 hover:via-brand-700 hover:to-brand-800 shadow-brand-500/40 hover:shadow-brand-500/50 border-2 border-brand-500/20 no-underline hover:no-underline"
                      >
                        <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </div>
                        <span className="tracking-wide no-underline">View you claim</span>
                        <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Link>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenClaimModal(gs)}
                      className={`w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl transition-all duration-500 font-bold text-base shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] ${
                        isUrgent 
                          ? 'bg-gradient-to-r from-red-600 via-red-600 to-red-700 text-white hover:from-red-700 hover:via-red-700 hover:to-red-800 shadow-red-500/40 hover:shadow-red-500/50 border-2 border-red-500/20' 
                          : 'bg-gradient-to-r from-brand-600 via-brand-600 to-brand-700 text-white hover:from-brand-700 hover:via-brand-700 hover:to-brand-800 shadow-brand-500/40 hover:shadow-brand-500/50 border-2 border-brand-500/20'
                      }`}
                    >
                      <div className={`h-6 w-6 rounded-lg ${isUrgent ? 'bg-red-500/30' : 'bg-white/20'} flex items-center justify-center backdrop-blur-sm`}>
                        <Plus className="h-4 w-4" />
                      </div>
                      <span className="tracking-wide">{isUrgent ? 'Submit Offer Immediately' : 'Submit Competitive Offer'}</span>
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Claim Modal - Enhanced Professional Design */}
      {showClaimModal && selectedGroupStay && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 z-50 animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto border border-slate-200/60 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 overflow-x-hidden">
              {/* Header Section */}
              <div className="flex items-center justify-between pb-4 sm:pb-6 border-b border-slate-200">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-brand/10 via-brand/5 to-transparent flex items-center justify-center border border-brand/20 shadow-md flex-shrink-0">
                    <HandHeart className="h-5 w-5 sm:h-6 sm:w-6 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
                      Submit Competitive Offer
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-600 mt-0.5 sm:mt-1">
                      Group Stay #{selectedGroupStay.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-all duration-300 hover:scale-110 flex-shrink-0 ml-2"
                  aria-label="Close modal"
                  title="Close modal"
                >
                  <XCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>

              <div className="space-y-6 sm:space-y-8">
                {/* Property Selection */}
                <div className="space-y-2">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wide">
                    Select Property <span className="text-red-500 font-bold">*</span>
                  </label>
                  <select
                    value={selectedPropertyId || ""}
                    onChange={(e) => {
                      setSelectedPropertyId(Number(e.target.value));
                      if (errors.property) {
                        setErrors((prev) => ({ ...prev, property: undefined }));
                      }
                    }}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl text-sm font-medium text-slate-900 bg-white focus:ring-2 focus:ring-brand outline-none transition-all duration-200 hover:border-slate-400 shadow-sm ${
                      errors.property ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-brand"
                    }`}
                    aria-label="Select Property"
                    title="Select Property"
                  >
                    <option value="">Choose a property...</option>
                    {propertyEligibility
                      .filter((x) => x.eligible)
                      .map(({ property: prop }) => (
                        <option key={prop.id} value={prop.id}>
                          {prop.title} ({prop.type}) - {formatCurrency(prop.basePrice, prop.currency)}/night
                        </option>
                      ))}
                    {propertyEligibility.some((x) => !x.eligible) && (
                      <optgroup label="Not eligible (disabled)">
                        {propertyEligibility
                          .filter((x) => !x.eligible)
                          .map(({ property: prop, reasons }) => (
                            <option key={prop.id} value={prop.id} disabled>
                              {prop.title} ({prop.type}) — Not eligible: {reasons.slice(0, 3).join("; ")}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                  {selectedGroupStay && propertyEligibility.every((x) => !x.eligible) && (
                    <p className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      No eligible properties found for this request. The disabled options show what’s missing.
                    </p>
                  )}
                  {errors.property && (
                    <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      {errors.property}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] sm:text-xs text-slate-500">
                    💡 Price will auto-fill from selected property
                  </p>
                </div>

                {/* Pricing & Budget Section */}
                <div className="space-y-4 sm:space-y-5 overflow-x-hidden">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Pricing & Budget</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
                    {/* Headcount */}
                    <div className="space-y-1.5 sm:space-y-2 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-slate-700">Headcount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-500 pointer-events-none">People</span>
                        <input
                          type="number"
                          value={selectedGroupStay?.headcount || ""}
                          readOnly
                          aria-label="Headcount"
                          title="Headcount"
                          className="w-full pl-14 sm:pl-16 pr-7 sm:pr-8 py-2 sm:py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 bg-slate-50 box-border"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none">
                          <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▲</span>
                          <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▼</span>
                        </div>
                      </div>
                    </div>

                    {/* Rooms Needed */}
                    <div className="space-y-1.5 sm:space-y-2 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-slate-700">Rooms Needed</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-500 pointer-events-none">Rooms</span>
                        <input
                          type="number"
                          value={selectedGroupStay?.roomsNeeded || ""}
                          readOnly
                          aria-label="Rooms Needed"
                          title="Rooms Needed"
                          className="w-full pl-14 sm:pl-16 pr-7 sm:pr-8 py-2 sm:py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 bg-slate-50 box-border"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none">
                          <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▲</span>
                          <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▼</span>
                        </div>
                      </div>
                    </div>

                    {/* Price per Night (per room) */}
                    <div className="space-y-1.5 sm:space-y-2 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-slate-700">
                        Price per Night (per room) <span className="text-red-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-medium text-slate-600 bg-slate-100 border border-slate-300 rounded pointer-events-none z-10">
                          {selectedGroupStay?.currency || "TZS"}
                        </span>
                        <input
                          type="number"
                          value={offeredPrice}
                          onChange={(e) => validatePrice(e.target.value)}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className={`w-full pl-12 sm:pl-14 pr-7 sm:pr-8 py-2 sm:py-2.5 border rounded-lg text-sm font-medium text-slate-900 bg-white focus:ring-2 focus:ring-brand outline-none transition-all duration-200 box-border ${
                            errors.price ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-brand"
                          }`}
                        />
                        {errors.price && (
                          <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            {errors.price}
                          </p>
                        )}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none">
                          <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▲</span>
                          <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▼</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Nights */}
                    <div className="space-y-1.5 sm:space-y-2 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-slate-700">Total Nights</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-500 pointer-events-none">Nights</span>
                        <input
                          type="number"
                          value={selectedGroupStay?.checkIn && selectedGroupStay?.checkOut 
                            ? Math.ceil((new Date(selectedGroupStay.checkOut).getTime() - new Date(selectedGroupStay.checkIn).getTime()) / (1000 * 60 * 60 * 24))
                            : ""}
                          readOnly
                          aria-label="Total Nights"
                          title="Total Nights"
                          className="w-full pl-14 sm:pl-16 pr-7 sm:pr-8 py-2 sm:py-2.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 bg-slate-50 box-border"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none">
                          <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▲</span>
                          <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▼</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div className="space-y-1.5 sm:space-y-2 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-slate-700">Total Amount</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 sm:px-2 sm:py-1 text-[10px] sm:text-xs font-medium text-purple-700 bg-purple-100 border border-purple-300 rounded pointer-events-none z-10">
                          {selectedGroupStay?.currency || "TZS"}
                        </span>
                        <input
                          type="text"
                          value={offeredPrice && selectedGroupStay?.roomsNeeded && selectedGroupStay?.checkIn && selectedGroupStay?.checkOut
                            ? formatCurrency(Number(offeredPrice) * selectedGroupStay.roomsNeeded * Math.ceil((new Date(selectedGroupStay.checkOut).getTime() - new Date(selectedGroupStay.checkIn).getTime()) / (1000 * 60 * 60 * 24)), selectedGroupStay.currency)
                            : formatCurrency(0, selectedGroupStay?.currency || "TZS")}
                          readOnly
                          aria-label="Total Amount"
                          title="Total Amount"
                          className="w-full pl-12 sm:pl-14 pr-7 sm:pr-8 py-2 sm:py-2.5 border border-purple-300 rounded-lg text-sm font-medium text-slate-900 bg-purple-50/30 box-border"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none">
                          <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▲</span>
                          <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▼</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Offer Discount Section */}
                <div className="bg-green-50/50 rounded-xl p-4 sm:p-5 border border-green-100 shadow-sm overflow-x-hidden">
                  <div className="flex items-center justify-between mb-4 sm:mb-5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 flex-shrink-0" />
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 truncate">Offer Discount</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDiscountEnabled(!discountEnabled)}
                      aria-label={discountEnabled ? "Disable discount" : "Enable discount"}
                      title={discountEnabled ? "Disable discount" : "Enable discount"}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 flex-shrink-0 ${
                        discountEnabled ? "bg-purple-600" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${
                          discountEnabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  {discountEnabled && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 min-w-0">
                        {/* Discount Type */}
                        <div className="space-y-1.5 sm:space-y-2 min-w-0">
                          <label className="block text-xs sm:text-sm font-medium text-slate-700">Discount Type</label>
                          <select
                            value={discountType}
                            onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                            aria-label="Discount Type"
                            title="Discount Type"
                            className="w-full px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all duration-200 box-border"
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount</option>
                          </select>
                        </div>

                        {/* Discount Percentage */}
                        <div className="space-y-1.5 sm:space-y-2 min-w-0">
                          <label className="block text-xs sm:text-sm font-medium text-slate-700">Discount Percentage</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-slate-500 pointer-events-none">%</span>
                            <input
                              type="number"
                              value={discountPercent}
                              onChange={(e) => validateDiscount(e.target.value)}
                              placeholder="0"
                              min="0"
                              max={discountType === "percentage" ? "100" : undefined}
                              className={`w-full pl-7 sm:pl-8 pr-7 sm:pr-8 py-2 sm:py-2.5 border rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-brand outline-none transition-all duration-200 box-border ${
                                errors.discountPercent ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-brand"
                              }`}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none">
                              <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▲</span>
                              <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▼</span>
                            </div>
                          </div>
                          {errors.discountPercent && (
                            <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              {errors.discountPercent}
                            </p>
                          )}
                          {discountType === "percentage" && (
                            <p className="mt-1 text-[10px] sm:text-xs text-slate-500">
                              💡 Enter a value between 0-100%
                            </p>
                          )}
                        </div>

                        {/* Discount Criteria (Optional) */}
                        <div className="space-y-1.5 sm:space-y-2 min-w-0">
                          <label className="block text-xs sm:text-sm font-medium text-slate-700">
                            Discount Criteria <span className="text-slate-500 font-normal">(Optional)</span>
                          </label>
                          <select
                            value={discountCriteria}
                            onChange={(e) => setDiscountCriteria(e.target.value)}
                            aria-label="Discount Criteria"
                            title="Discount Criteria"
                            className="w-full px-3 py-2 sm:py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all duration-200 box-border"
                          >
                            <option value="">Select criteria...</option>
                            <option value="total-nights">Based on Total Nights</option>
                            <option value="early-booking">Early Booking</option>
                            <option value="group-size">Group Size</option>
                          </select>
                        </div>

                        {/* Minimum Nights Required */}
                        <div className="space-y-1.5 sm:space-y-2 min-w-0">
                          <label className="block text-xs sm:text-sm font-medium text-slate-700">Minimum Nights Required</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={minimumNights}
                              onChange={(e) => setMinimumNights(e.target.value)}
                              placeholder="e.g., 5 nights"
                              min="1"
                              className="w-full px-3 pr-7 sm:pr-8 py-2 sm:py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all duration-200 box-border"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none">
                              <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▲</span>
                              <span className="h-2.5 w-2.5 text-slate-400 text-[10px] leading-none">▼</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Discount Summary - Show calculation details */}
                      {offeredPrice && discountPercent && Number(discountPercent) > 0 && (
                        <div className="col-span-1 sm:col-span-2 mt-3 sm:mt-4 p-4 sm:p-5 bg-gradient-to-br from-white via-purple-50/30 to-white rounded-xl border-2 border-purple-200/60 shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
                          {/* Header */}
                          <div className="flex items-center gap-2.5 mb-4 sm:mb-5 pb-3 sm:pb-4 border-b border-purple-200/60">
                            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md">
                              <Percent className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </div>
                            <h4 className="text-sm sm:text-base font-bold text-slate-900">
                              Discount Calculation
                            </h4>
                          </div>
                          
                          {/* Calculation Details */}
                          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-5">
                            {/* Row 1: Original Price */}
                            <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors duration-200">
                              <span className="text-xs sm:text-sm font-medium text-slate-700">Original Price per Night:</span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-900">
                                {formatCurrency(Number(offeredPrice), selectedGroupStay?.currency || "TZS")}
                              </span>
                            </div>

                            {/* Row 2: Discount Applied */}
                            <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-purple-50/50 hover:bg-purple-50 transition-colors duration-200">
                              <span className="text-xs sm:text-sm font-medium text-slate-700">Discount Applied:</span>
                              <span className="text-xs sm:text-sm font-bold text-purple-700">
                                {discountType === "percentage" 
                                  ? `${discountPercent}%`
                                  : formatCurrency(Number(discountPercent), selectedGroupStay?.currency || "TZS")}
                              </span>
                            </div>

                            {/* Row 3: Discount Amount */}
                            <div className="flex justify-between items-center py-2 px-3 rounded-lg bg-red-50/50 hover:bg-red-50 transition-colors duration-200">
                              <span className="text-xs sm:text-sm font-medium text-slate-700">Discount Amount:</span>
                              <span className="text-xs sm:text-sm font-bold text-red-600">
                                -{discountType === "percentage"
                                  ? formatCurrency((Number(offeredPrice) * Number(discountPercent)) / 100, selectedGroupStay?.currency || "TZS")
                                  : formatCurrency(Number(discountPercent), selectedGroupStay?.currency || "TZS")}
                              </span>
                            </div>

                            {/* Row 4: Price After Discount */}
                            <div className="flex justify-between items-center py-2.5 px-3 rounded-lg bg-green-50/50 hover:bg-green-50 transition-colors duration-200 border border-green-200/50">
                              <span className="text-xs sm:text-sm font-semibold text-slate-700">Price per Night (After Discount):</span>
                              <span className="text-xs sm:text-sm font-bold text-green-700">
                                {formatCurrency(
                                  discountType === "percentage"
                                    ? Number(offeredPrice) - ((Number(offeredPrice) * Number(discountPercent)) / 100)
                                    : Number(offeredPrice) - Number(discountPercent),
                                  selectedGroupStay?.currency || "TZS"
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Total Amount After Discount */}
                          {selectedGroupStay?.roomsNeeded && selectedGroupStay?.checkIn && selectedGroupStay?.checkOut && (
                            <div className="pt-4 sm:pt-5 border-t-2 border-purple-200/60 space-y-2">
                              <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/60 hover:shadow-md transition-all duration-200">
                                <span className="text-xs sm:text-sm font-bold text-slate-900">Total Amount (After Discount):</span>
                                <span className="text-base sm:text-lg font-bold text-green-700">
                                  {formatCurrency(
                                    (discountType === "percentage"
                                      ? Number(offeredPrice) - ((Number(offeredPrice) * Number(discountPercent)) / 100)
                                      : Number(offeredPrice) - Number(discountPercent)) *
                                    selectedGroupStay.roomsNeeded *
                                    Math.ceil((new Date(selectedGroupStay.checkOut).getTime() - new Date(selectedGroupStay.checkIn).getTime()) / (1000 * 60 * 60 * 24)),
                                    selectedGroupStay.currency
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between items-center py-2 px-4 rounded-lg bg-slate-50/50">
                                <span className="text-[10px] sm:text-xs font-medium text-slate-600">Savings:</span>
                                <span className="text-[10px] sm:text-xs font-semibold text-slate-700">
                                  {formatCurrency(
                                    (discountType === "percentage"
                                      ? (Number(offeredPrice) * Number(discountPercent)) / 100
                                      : Number(discountPercent)) *
                                    selectedGroupStay.roomsNeeded *
                                    Math.ceil((new Date(selectedGroupStay.checkOut).getTime() - new Date(selectedGroupStay.checkIn).getTime()) / (1000 * 60 * 60 * 24)),
                                    selectedGroupStay.currency
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Special Offers */}
                <div className="space-y-2 sm:space-y-3 min-w-0 overflow-x-hidden">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wide">
                    Special Offers & Favors <span className="text-slate-500 font-normal text-xs normal-case">(optional)</span>
                  </label>
                  
                  {/* Service Checkboxes */}
                  <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 rounded-xl border border-slate-200/60 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 sm:mb-5">
                      <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-md">
                        <Gift className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <p className="text-xs sm:text-sm font-bold text-slate-900">Quick Select Services</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                      {exceptionalServices.map((service) => {
                        const isSelected = selectedServices.includes(service);
                        return (
                          <label
                            key={service}
                            className={`relative flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl border-2 cursor-pointer transition-all duration-300 group ${
                              isSelected
                                ? "bg-gradient-to-br from-brand-50 to-brand-100/50 border-brand-400 shadow-md shadow-brand-200/50"
                                : "bg-white border-slate-200 hover:border-brand-300 hover:bg-slate-50 hover:shadow-md"
                            }`}
                          >
                            <div className="relative flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleServiceToggle(service)}
                                className="sr-only"
                                aria-label={`Select ${service}`}
                              />
                              <div
                                className={`h-4 w-4 sm:h-5 sm:w-5 rounded-md border-2 flex items-center justify-center transition-all duration-300 ${
                                  isSelected
                                    ? "bg-gradient-to-br from-brand-500 to-brand-600 border-brand-600 shadow-sm"
                                    : "border-slate-300 bg-white group-hover:border-brand-400"
                                }`}
                              >
                                {isSelected && (
                                  <svg
                                    className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] sm:text-xs font-semibold leading-tight transition-colors duration-300 ${
                                isSelected
                                  ? "text-brand-900"
                                  : "text-slate-700 group-hover:text-brand-700"
                              }`}
                            >
                              {service}
                            </span>
                            {isSelected && (
                              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-400/10 to-transparent pointer-events-none" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Textarea */}
                  <div className="relative">
                    <div className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-slate-500 pointer-events-none flex-shrink-0">
                      <Gift className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <textarea
                      value={specialOffers}
                      onChange={(e) => handleSpecialOffersChange(e.target.value)}
                      placeholder="Selected services will appear here, or type custom offers..."
                      rows={3}
                      className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl text-sm font-medium text-slate-900 bg-white focus:ring-2 focus:ring-brand outline-none transition-all duration-200 hover:border-slate-400 shadow-sm resize-none box-border ${
                        errors.specialOffers ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-brand"
                      }`}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      {errors.specialOffers ? (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {errors.specialOffers}
                        </p>
                      ) : (
                        <p className="text-[10px] sm:text-xs text-slate-500">
                          💡 Select services above or type custom offers
                        </p>
                      )}
                      <p className={`text-[10px] sm:text-xs ${specialOffers.length > MAX_SPECIAL_OFFERS * 0.9 ? "text-amber-600" : "text-slate-500"}`}>
                        {specialOffers.length}/{MAX_SPECIAL_OFFERS}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="space-y-2 sm:space-y-3 min-w-0 overflow-x-hidden">
                  <label className="block text-xs sm:text-sm font-semibold text-slate-900 uppercase tracking-wide">
                    Additional Notes <span className="text-slate-500 font-normal text-xs normal-case">(optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-slate-500 pointer-events-none flex-shrink-0">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <textarea
                      value={notes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="Any additional information about your offer..."
                      rows={3}
                      className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl text-sm font-medium text-slate-900 bg-white focus:ring-2 focus:ring-brand outline-none transition-all duration-200 hover:border-slate-400 shadow-sm resize-none box-border ${
                        errors.notes ? "border-red-300 focus:border-red-500" : "border-slate-300 focus:border-brand"
                      }`}
                    />
                    <div className="mt-1 flex items-center justify-between">
                      {errors.notes ? (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <XCircle className="h-3 w-3" />
                          {errors.notes}
                        </p>
                      ) : (
                        <p className="text-[10px] sm:text-xs text-slate-500">
                          💡 Add any additional details about your offer
                        </p>
                      )}
                      <p className={`text-[10px] sm:text-xs ${notes.length > MAX_NOTES * 0.9 ? "text-amber-600" : "text-slate-500"}`}>
                        {notes.length}/{MAX_NOTES}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-slate-200">
                <button
                  onClick={() => setShowClaimModal(false)}
                  className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all duration-200 hover:scale-[1.02] shadow-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitClaim}
                  disabled={claiming || !selectedPropertyId || !offeredPrice}
                  className="flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm font-bold bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-700 hover:to-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl border border-brand-500/20"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting Offer...</span>
                    </>
                  ) : (
                    <>
                      <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/20 flex items-center justify-center border border-white/30 flex-shrink-0">
                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                      </div>
                      <span className="tracking-wide">Submit Competitive Offer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

