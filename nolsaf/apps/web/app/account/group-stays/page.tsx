"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Users, Calendar, CheckCircle, XCircle, User, Phone, Globe, ArrowRight, Building2, Clock, ChevronDown, MessageSquare, DollarSign, Tag, FileText, Sparkles, Gift, Send } from "lucide-react";
import Link from "next/link";
import { io } from "socket.io-client";
import LogoSpinner from "@/components/LogoSpinner";

const api = axios.create({ baseURL: "", withCredentials: true });

type GroupStay = {
  id: number;
  auction?: {
    isOpenForClaims?: boolean;
    recommendedPropertyCount?: number;
    confirmedPropertyId?: number | null;
  };
  arrangement: {
    id: number;
    property: {
      id: number;
      title: string;
      type: string;
      regionName?: string;
      district?: string;
      city?: string;
    };
  };
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
  numberOfGuests: number;
  passengers?: Array<{
    id: number;
    name: string;
    phone?: string;
    nationality?: string;
  }>;
  isValid: boolean;
  createdAt: string;
  adminSuggestions?: {
    accommodationOptions?: string;
    pricing?: string;
    recommendations?: string;
    nextSteps?: string;
    notes?: string;
  } | null;
};

type AuctionOffer = {
  claimId: number;
  property: {
    id: number;
    title: string;
    type: string;
    regionName?: string;
    district?: string;
    ward?: string;
    city?: string;
    imageUrl?: string | null;
  };
  offer: {
    offeredPricePerNight: number;
    discountPercent?: number | null;
    totalAmount: number;
    currency: string;
    specialOffers?: string | null;
    notes?: string | null;
  };
};

function SkeletonLine({ w = "w-full" }: { w?: string }) {
  return <div className={`h-3 ${w} rounded-full bg-slate-200/80 animate-pulse`} />;
}

function GroupStayCardSkeleton({ variant }: { variant: "active" | "expired" }) {
  const isActive = variant === "active";
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[220px] flex-1">
              <SkeletonLine w="w-64" />
              <div className="mt-2">
                <SkeletonLine w="w-40" />
              </div>
            </div>
            <span
              className={[
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
                isActive ? "bg-[#02665e]/10 text-[#02665e]" : "bg-slate-100 text-slate-700",
              ].join(" ")}
            >
              {isActive ? <CheckCircle className="h-4 w-4" /> : <Calendar className="h-4 w-4 text-red-600" />}
              {isActive ? "Active" : "Completed"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                <SkeletonLine w="w-20" />
                <div className="mt-2">
                  <SkeletonLine w="w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyGroupStaysPage() {
  const [groupStays, setGroupStays] = useState<GroupStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "reviewed" | "active" | "completed" | "expired">("active");
  const [entered, setEntered] = useState(false);
  const [expandedPassengers, setExpandedPassengers] = useState<Set<number>>(new Set());
  const [auctionOffersByBooking, setAuctionOffersByBooking] = useState<Record<number, AuctionOffer[]>>({});
  const [auctionExpanded, setAuctionExpanded] = useState<Set<number>>(new Set());
  const [auctionLoading, setAuctionLoading] = useState<Set<number>>(new Set());
  const [auctionConfirming, setAuctionConfirming] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadGroupStays();
  }, []);

  // Gentle mount animation
  useEffect(() => {
    const t = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(t);
  }, []);

  const loadGroupStays = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/customer/group-stays");
      setGroupStays(response.data.items || []);
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to fetch group stays";
      try {
        window.dispatchEvent(
          new CustomEvent("nols:toast", {
            detail: { type: "error", title: "Group Stays", message: msg, duration: 4500 },
          })
        );
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const toggleAuction = async (bookingId: number) => {
    const next = new Set(auctionExpanded);
    if (next.has(bookingId)) {
      next.delete(bookingId);
      setAuctionExpanded(next);
      return;
    }

    next.add(bookingId);
    setAuctionExpanded(next);

    if (auctionOffersByBooking[bookingId]) return;
    const loadingNext = new Set(auctionLoading);
    loadingNext.add(bookingId);
    setAuctionLoading(loadingNext);

    try {
      const resp = await api.get(`/api/customer/group-stays/${bookingId}/auction-offers`);
      setAuctionOffersByBooking((prev) => ({
        ...prev,
        [bookingId]: resp.data?.offers || [],
      }));
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to fetch auction offers";
      try {
        window.dispatchEvent(
          new CustomEvent("nols:toast", {
            detail: { type: "error", title: "Auction Offers", message: msg, duration: 4500 },
          })
        );
      } catch {}
    } finally {
      const loadingDone = new Set(auctionLoading);
      loadingDone.delete(bookingId);
      setAuctionLoading(loadingDone);
    }
  };

  const confirmAuctionOffer = async (bookingId: number, propertyId: number) => {
    const confirmingNext = new Set(auctionConfirming);
    confirmingNext.add(bookingId);
    setAuctionConfirming(confirmingNext);

    try {
      await api.post(`/api/customer/group-stays/${bookingId}/auction-confirm`, { propertyId });
      await loadGroupStays();
      setAuctionExpanded((prev) => {
        const n = new Set(prev);
        n.delete(bookingId);
        return n;
      });
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to confirm offer";
      try {
        window.dispatchEvent(
          new CustomEvent("nols:toast", {
            detail: { type: "error", title: "Auction Offers", message: msg, duration: 4500 },
          })
        );
      } catch {}
    } finally {
      const confirmingDone = new Set(auctionConfirming);
      confirmingDone.delete(bookingId);
      setAuctionConfirming(confirmingDone);
    }
  };

  const filteredGroupStays = groupStays.filter((stay) => {
    if (filter === "pending") return stay.status === "PENDING" || stay.status === "REVIEWING";
    if (filter === "reviewed") return stay.status === "PROCESSING";
    if (filter === "active") {
      return (
        stay.isValid &&
        stay.status !== "PENDING" &&
        stay.status !== "REVIEWING" &&
        stay.status !== "PROCESSING"
      );
    }
    if (filter === "completed") return !stay.isValid && stay.status === "COMPLETED";
    if (filter === "expired") return !stay.isValid && stay.status !== "COMPLETED" && stay.status !== "CANCELED";
    return false;
  });

  const pendingCount = groupStays.filter((s) => s.status === "PENDING" || s.status === "REVIEWING").length;
  const pendingOnlyCount = groupStays.filter((s) => s.status === "PENDING").length;
  const reviewingOnlyCount = groupStays.filter((s) => s.status === "REVIEWING").length;
  const reviewedCount = groupStays.filter((s) => s.status === "PROCESSING").length;
  const activeCount = groupStays.filter(
    (s) =>
      s.isValid &&
      s.status !== "PENDING" &&
      s.status !== "REVIEWING" &&
      s.status !== "PROCESSING"
  ).length;
  const completedCount = groupStays.filter((s) => !s.isValid && s.status === "COMPLETED").length;
  const expiredCount = groupStays.filter((s) => !s.isValid && s.status !== "COMPLETED" && s.status !== "CANCELED").length;

  const displayGroupStays =
    filter === "pending"
      ? [...filteredGroupStays].sort((a, b) => {
          const rank = (s: GroupStay) => (s.status === "REVIEWING" ? 0 : 1);
          const byStatus = rank(a) - rank(b);
          if (byStatus !== 0) return byStatus;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
      : filteredGroupStays;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusLabel = (stay: GroupStay) => {
    if (stay.status === "PENDING") return "Pending";
    if (stay.status === "REVIEWING") return "Under Review";
    if (stay.status === "PROCESSING") return "Processing";
    if (stay.isValid) {
      return stay.status === "CONFIRMED" ? "Confirmed" : "Active";
    }
    if (stay.status === "COMPLETED") return "Completed";
    if (stay.status === "CANCELED") return "Canceled";
    return "Expired";
  };

  const getStatusColor = (stay: GroupStay) => {
    if (stay.status === "PENDING") return "bg-amber-100 text-amber-700";
    if (stay.isValid) {
      return stay.status === "CONFIRMED" ? "bg-[#02665e]/10 text-[#02665e]" : "bg-[#02665e]/10 text-[#02665e]";
    }
    if (stay.status === "COMPLETED") return "bg-green-100 text-green-700";
    if (stay.status === "CANCELED") return "bg-red-100 text-red-700";
    return "bg-slate-100 text-slate-700";
  };

  // Parse and format admin suggestions text (handles markdown-like formatting)
  const formatAdminText = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n');
    const sections: Array<{ type: 'heading' | 'bullet' | 'text' | 'discount' | 'savings' | 'finalPrice'; content: string; value?: string }> = [];
    
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Check for bold headings (e.g., **Pricing Details:**)
      if (trimmed.startsWith('**') && trimmed.endsWith(':**')) {
        const heading = trimmed.replace(/\*\*/g, '').replace(':', '');
        sections.push({ type: 'heading', content: heading });
      }
      // Check for discount section (🎉 Special Discount)
      else if (trimmed.includes('🎉') || trimmed.includes('Special Discount')) {
        sections.push({ type: 'discount', content: trimmed.replace(/\*\*/g, '').replace('🎉', '').trim() });
      }
      // Check for savings line (💰 You Save)
      else if (trimmed.includes('💰') || trimmed.includes('You Save')) {
        const savingsMatch = trimmed.match(/(\d[\d,]*)\s*TZS/);
        sections.push({ 
          type: 'savings', 
          content: trimmed.replace(/\*\*/g, '').replace('💰', '').trim(),
          value: savingsMatch ? savingsMatch[1] : undefined
        });
      }
      // Check for Final Price (bolded)
      else if (trimmed.includes('Final Price') && trimmed.includes('**')) {
        const priceMatch = trimmed.match(/(\d[\d,]*)\s*TZS/);
        sections.push({ 
          type: 'finalPrice', 
          content: trimmed.replace(/\*\*/g, '').trim(),
          value: priceMatch ? priceMatch[1] : undefined
        });
      }
      // Check for bold text (e.g., **Final Price:**)
      else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        sections.push({ type: 'heading', content: trimmed.replace(/\*\*/g, '') });
      }
      // Check for bullet points
      else if (trimmed.startsWith('•')) {
        sections.push({ type: 'bullet', content: trimmed.substring(1).trim() });
      }
      // Regular text
      else {
        sections.push({ type: 'text', content: trimmed });
      }
    });
    
    return sections;
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="text-center">
          <div className="mx-auto max-w-md">
            <div className="h-8 w-56 mx-auto rounded-full bg-slate-200/80 animate-pulse" />
            <div className="mt-3 h-4 w-72 mx-auto rounded-full bg-slate-200/70 animate-pulse" />
          </div>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm flex-wrap">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 w-24 rounded-xl bg-white/80 animate-pulse" />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <GroupStayCardSkeleton variant="active" />
          <GroupStayCardSkeleton variant="expired" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "mx-auto w-full max-w-5xl space-y-6 transition-all duration-300 ease-out",
        entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
      ].join(" ")}
    >
      {/* Header Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#02665e]/10 to-[#014d47]/10 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-[#02665e]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">My Group Stay</h1>
          <p className="text-sm text-gray-500 mt-1">View all your group booking arrangements</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex justify-center">
        <div className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm flex-wrap">
          {[
            { key: "pending" as const, label: "Pending", count: pendingCount },
            { key: "reviewed" as const, label: "Reviewed", count: reviewedCount },
            { key: "active" as const, label: "Active", count: activeCount },
            { key: "completed" as const, label: "Completed", count: completedCount },
            { key: "expired" as const, label: "Expired", count: expiredCount },
          ].map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(t.key)}
                className={[
                  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all duration-200",
                  active
                    ? "border-[#02665e] bg-[#02665e] text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400",
                  "active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/25 focus-visible:ring-offset-2",
                ].join(" ")}
              >
                <span>{t.label}</span>
                <span
                  className={[
                    "inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-bold",
                    active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600",
                  ].join(" ")}
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {filteredGroupStays.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#02665e]/10 transition-transform duration-200 hover:scale-[1.03]">
            <Users className="h-7 w-7 text-[#02665e]" />
          </div>
          <div className="mt-4 text-lg font-bold text-slate-900">No group stays found</div>
          <div className="mt-1 text-sm text-slate-600">
            {filter === "pending"
              ? "You don't have any group stays waiting for review at the moment."
              : filter === "reviewed"
              ? "You don't have any reviewed group stays at the moment."
              : filter === "active"
              ? "You don't have any active group stays at the moment."
              : filter === "completed"
              ? "You haven't completed any group stays yet."
              : filter === "expired"
              ? "You don't have any expired group stays."
              : "No group stays found."}
          </div>
          {filter === "active" && (
            <div className="mt-6 flex justify-center">
              <Link
                href="/public/group-stays"
                className="group no-underline inline-flex items-center justify-center gap-2 rounded-xl bg-[#02665e] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.99] transition"
              >
                Book a group stay
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayGroupStays.map((stay, idx) => {
            const section = stay.status === "REVIEWING" ? "reviewing" : stay.status === "PENDING" ? "pending" : "other";
            const prev = idx > 0 ? displayGroupStays[idx - 1] : null;
            const next = idx + 1 < displayGroupStays.length ? displayGroupStays[idx + 1] : null;
            const prevSection =
              prev?.status === "REVIEWING" ? "reviewing" : prev?.status === "PENDING" ? "pending" : "other";
            const nextSection =
              next?.status === "REVIEWING" ? "reviewing" : next?.status === "PENDING" ? "pending" : "other";

            const showSectionHeader = filter === "pending" && section !== "other" && (idx === 0 || section !== prevSection);
            const showSectionDivider =
              filter === "pending" && section !== "other" && Boolean(next) && nextSection === section;
            const sectionTitle = section === "reviewing" ? "Under Review" : "Pending";
            const sectionDescription =
              section === "reviewing"
                ? "Admin is actively reviewing these requests."
                : "Submitted and waiting for admin to start review.";
            const sectionCount = section === "reviewing" ? reviewingOnlyCount : pendingOnlyCount;

            return (
              <div key={`${stay.id}-${section}`} className="space-y-2">
                {showSectionHeader && (
                  <div className="pt-2">
                    <div className="flex items-end justify-between">
                      <div className="text-sm font-bold text-slate-900">{sectionTitle}</div>
                      <div className="text-xs font-semibold text-slate-600">{sectionCount}</div>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600">{sectionDescription}</div>
                  </div>
                )}

                <div className="group">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-[2px] group-hover:border-slate-300">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  {/* Header with property title and status */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[#02665e]/10 rounded-xl">
                        <Users className="h-5 w-5 text-[#02665e]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {stay.arrangement.property.title}
                        </h3>
                        <div className="mt-1 text-sm text-slate-600">
                          {stay.arrangement.property.type}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(stay)}`}
                    >
                      {stay.status === "PENDING" || stay.status === "REVIEWING" ? (
                        <Clock className="h-4 w-4" />
                      ) : stay.status === "PROCESSING" ? (
                        <Clock className="h-4 w-4" />
                      ) : stay.isValid ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Calendar className="h-4 w-4" />
                      )}
                      {getStatusLabel(stay)}
                    </span>
                  </div>

                  {/* Location */}
                  {stay.arrangement.property.regionName && (
                    <div className="mt-2 text-sm text-slate-600">
                      {[
                        stay.arrangement.property.regionName,
                        stay.arrangement.property.city,
                        stay.arrangement.property.district,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </div>
                  )}

                  {/* Booking Information Grid */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    {/* Check-in */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                        <Calendar className="h-3.5 w-3.5 text-[#02665e]" />
                        Check-in
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {formatDate(stay.checkIn)}
                      </div>
                    </div>

                    {/* Check-out */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                        <Calendar className="h-3.5 w-3.5 text-[#02665e]" />
                        Check-out
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {formatDate(stay.checkOut)}
                      </div>
                    </div>

                    {/* Number of Guests */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                        <Users className="h-3.5 w-3.5 text-[#02665e]" />
                        Guests
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {stay.numberOfGuests} {stay.numberOfGuests === 1 ? "guest" : "guests"}
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1">
                        <Building2 className="h-3.5 w-3.5 text-[#02665e]" />
                        Total Amount
                      </div>
                      <div className="mt-0.5 font-semibold text-slate-900">
                        {Number(stay.totalAmount).toLocaleString("en-US")} TZS
                      </div>
                    </div>
                  </div>

                  {/* Admin Messages & Recommendations */}
                  {stay.adminSuggestions && (stay.status !== "PENDING" && stay.status !== "REVIEWING") && (
                    <div className="mt-4 sm:mt-5 rounded-2xl border border-gray-200 bg-white shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden">
                      <div className="p-4 sm:p-5 lg:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-5 sm:mb-6 pb-4 border-b border-gray-200">
                          <div className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0" style={{ backgroundColor: '#02665e' }}>
                            <MessageSquare className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base sm:text-lg font-bold text-gray-900">Admin Updates & Recommendations</h4>
                            <p className="text-xs sm:text-sm text-gray-600 mt-1">Important information about your booking</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4 sm:space-y-5">
                          {/* Pricing & Budget - Sidebar Style */}
                          {stay.adminSuggestions.pricing && (() => {
                            const formatted = formatAdminText(stay.adminSuggestions.pricing);
                            return (
                              <div className="bg-white rounded-2xl border-l-4 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden" style={{ borderLeftColor: '#02665e' }}>
                                <div className="flex flex-col sm:flex-row">
                                  <div className="w-full sm:w-48 px-4 sm:px-5 py-4 sm:py-5 flex sm:flex-col items-center sm:items-start justify-center sm:justify-start gap-3" style={{ backgroundColor: '#02665e' }}>
                                    <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center">
                                      <DollarSign className="h-5 w-5" style={{ color: '#02665e' }} />
                                    </div>
                                    <div className="text-center sm:text-left">
                                      <h5 className="text-xs font-bold text-white uppercase tracking-wider mb-1">Pricing & Budget</h5>
                                      <div className="h-0.5 w-12 bg-white/30 mx-auto sm:mx-0"></div>
                                    </div>
                                  </div>
                                  <div className="flex-1 p-4 sm:p-5">
                                  {formatted ? (
                                    <div className="space-y-3">
                                      {formatted.map((item, idx) => {
                                        if (item.type === 'heading') {
                                          return (
                                            <div key={idx} className="font-bold text-gray-900 text-sm sm:text-base mt-4 first:mt-0 flex items-center gap-2">
                                              <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#02665e' }}></div>
                                              {item.content}
                                            </div>
                                          );
                                        } else if (item.type === 'discount') {
                                          return (
                                            <div key={idx} className="mt-4 pt-4 border-t-2 border-gray-200">
                                              <div className="flex items-center gap-2.5 mb-3">
                                                <div className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: '#02665e' }}>
                                                  <Gift className="h-4 w-4 text-white" />
                                                </div>
                                                <span className="font-bold text-gray-900 text-sm sm:text-base">{item.content}</span>
                                              </div>
                                            </div>
                                          );
                                        } else if (item.type === 'finalPrice') {
                                          return (
                                            <div key={idx} className="mt-3 p-3 sm:p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <span className="font-semibold text-gray-700 text-sm sm:text-base">Final Price:</span>
                                                <span className="font-bold text-lg sm:text-xl" style={{ color: '#02665e' }}>
                                                  {item.value ? `${item.value.replace(/,/g, ',')} TZS` : item.content.match(/(\d[\d,]*)\s*TZS/)?.[0] || item.content}
                                                </span>
                                              </div>
                                            </div>
                                          );
                                        } else if (item.type === 'savings') {
                                          return (
                                            <div key={idx} className="mt-3 p-3 sm:p-4 bg-gray-100 rounded-lg border-2 border-gray-300 shadow-sm">
                                              <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: '#02665e' }}>
                                                  <Tag className="h-4 w-4 text-white" />
                                                </div>
                                                <div className="flex-1">
                                                  <span className="font-bold text-sm sm:text-base block" style={{ color: '#02665e' }}>
                                                    {item.content}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        } else if (item.type === 'bullet') {
                                          // Check if it's a discount-related bullet
                                          const isDiscountInfo = item.content.includes('Discount:') || item.content.includes('Original Price:') || item.content.includes('Discount Amount:');
                                          const isPriceInfo = item.content.includes('Price per Night:') || item.content.includes('Total Nights:') || item.content.includes('Total Amount:');
                                          
                                          return (
                                            <div key={idx} className={`flex items-start gap-3 text-sm sm:text-base ${isDiscountInfo ? 'text-gray-900 font-semibold' : isPriceInfo ? 'text-gray-800' : 'text-gray-700'}`}>
                                              <span className="mt-1.5 flex-shrink-0 font-bold" style={{ color: '#02665e' }}>•</span>
                                              <span className="flex-1 leading-relaxed">{item.content}</span>
                                            </div>
                                          );
                                        } else {
                                          return (
                                            <div key={idx} className="text-sm sm:text-base text-gray-700 leading-relaxed">
                                              {item.content}
                                            </div>
                                          );
                                        }
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                                      {stay.adminSuggestions.pricing}
                                    </div>
                                  )}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Accommodation Options - Top Bar Style */}
                          {stay.adminSuggestions.accommodationOptions && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                              <div className="border-b-2 px-4 sm:px-5 py-3.5 bg-gray-50" style={{ borderBottomColor: '#02665e' }}>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl border-2 bg-white flex items-center justify-center" style={{ borderColor: '#02665e' }}>
                                    <Building2 className="h-5 w-5" style={{ color: '#02665e' }} />
                                  </div>
                                  <div>
                                    <span className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider block">Accommodation Options</span>
                                    <div className="h-0.5 w-16 mt-1" style={{ backgroundColor: '#02665e' }}></div>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 sm:p-5">
                                <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                                  {stay.adminSuggestions.accommodationOptions}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Recommendations - Icon Badge Style */}
                          {stay.adminSuggestions.recommendations && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                              <div className="p-4 sm:p-5">
                                <div className="flex items-start gap-4 mb-4">
                                  <div className="h-14 w-14 rounded-2xl border-2 bg-gray-50 flex items-center justify-center flex-shrink-0" style={{ borderColor: '#02665e' }}>
                                    <Sparkles className="h-7 w-7" style={{ color: '#02665e' }} />
                                  </div>
                                  <div className="flex-1 pt-1">
                                    <h5 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider mb-1">Recommendations</h5>
                                    <div className="h-1 w-20 rounded-full" style={{ backgroundColor: '#02665e' }}></div>
                                  </div>
                                </div>
                                <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed pl-0 sm:pl-18">
                                  {stay.adminSuggestions.recommendations}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Next Steps - Bottom Accent Style */}
                          {stay.adminSuggestions.nextSteps && (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                              <div className="p-4 sm:p-5 pb-6">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#02665e' }}>
                                    <ArrowRight className="h-5 w-5 text-white" />
                                  </div>
                                  <div>
                                    <h5 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider">Next Steps</h5>
                                    <div className="flex items-center gap-1 mt-1">
                                      <div className="h-1 w-8 rounded-full" style={{ backgroundColor: '#02665e' }}></div>
                                      <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                                      <div className="h-1 w-1 bg-gray-400 rounded-full"></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                                  {stay.adminSuggestions.nextSteps}
                                </div>
                              </div>
                              <div className="h-1" style={{ backgroundColor: '#02665e' }}></div>
                            </div>
                          )}

                          {/* General Notes - Minimalist Style */}
                          {stay.adminSuggestions.notes && (
                            <div className="bg-gray-50 rounded-2xl border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                              <div className="p-4 sm:p-5">
                                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-300">
                                  <FileText className="h-6 w-6" style={{ color: '#02665e' }} />
                                  <h5 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-wider">Additional Notes</h5>
                                </div>
                                <div className="text-sm sm:text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                                  {stay.adminSuggestions.notes}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Auction Offers (separate from normal recommendations) */}
                  {((stay.auction?.recommendedPropertyCount || 0) > 0) && !stay.auction?.confirmedPropertyId && (
                    <div className="mt-4 sm:mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-slate-50 border border-slate-200">
                              <Clock className="h-6 w-6 text-[#02665e]" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-base sm:text-lg font-bold text-slate-900">Auction Offers</h4>
                              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                                {stay.auction?.recommendedPropertyCount} shortlisted offers are ready. Choose one to confirm.
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleAuction(stay.id)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
                          >
                            {auctionExpanded.has(stay.id) ? "Hide offers" : "View offers"}
                            <ChevronDown
                              className="h-4 w-4 text-slate-600 transition-transform"
                              style={{ transform: auctionExpanded.has(stay.id) ? "rotate(180deg)" : "rotate(0deg)" }}
                            />
                          </button>
                        </div>

                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            auctionExpanded.has(stay.id) ? "max-h-[2000px] opacity-100 mt-4" : "max-h-0 opacity-0"
                          }`}
                        >
                          <div className="space-y-3">
                            {auctionLoading.has(stay.id) && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3 text-sm text-slate-700">
                                <LogoSpinner size="xs" ariaLabel="Loading offers" />
                                Loading offers...
                              </div>
                            )}

                            {!auctionLoading.has(stay.id) && (auctionOffersByBooking[stay.id] || []).length === 0 && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                                No offers available yet.
                              </div>
                            )}

                            {(auctionOffersByBooking[stay.id] || []).map((offer) => (
                              <div
                                key={offer.claimId}
                                className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm"
                              >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start gap-3">
                                      {offer.property.imageUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={offer.property.imageUrl}
                                          alt={offer.property.title}
                                          className="h-14 w-14 rounded-xl object-cover border border-slate-200 bg-slate-50 flex-shrink-0"
                                        />
                                      ) : (
                                        <div className="h-14 w-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center flex-shrink-0">
                                          <Building2 className="h-6 w-6 text-[#02665e]" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
                                          {offer.property.title}
                                        </div>
                                        <div className="text-xs sm:text-sm text-slate-600 mt-1">
                                          {[offer.property.regionName, offer.property.district, offer.property.ward || offer.property.city]
                                            .filter(Boolean)
                                            .join(", ")}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                      <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                                        <div className="text-xs font-medium text-slate-500 mb-1">Price / night</div>
                                        <div className="font-semibold text-slate-900">
                                          {Number(offer.offer.offeredPricePerNight).toLocaleString("en-US")} {offer.offer.currency}
                                        </div>
                                      </div>
                                      <div className="rounded-xl bg-slate-50/70 border border-slate-200 p-3">
                                        <div className="text-xs font-medium text-slate-500 mb-1">Total</div>
                                        <div className="font-semibold text-slate-900">
                                          {Number(offer.offer.totalAmount).toLocaleString("en-US")} {offer.offer.currency}
                                        </div>
                                      </div>
                                    </div>

                                    {(offer.offer.specialOffers || offer.offer.notes) && (
                                      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                        {offer.offer.specialOffers && (
                                          <div className="whitespace-pre-wrap leading-relaxed">{offer.offer.specialOffers}</div>
                                        )}
                                        {offer.offer.notes && (
                                          <div className={`${offer.offer.specialOffers ? "mt-2 pt-2 border-t border-slate-200" : ""} whitespace-pre-wrap leading-relaxed`}
                                            >{offer.offer.notes}</div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  <div className="sm:pl-4">
                                    <button
                                      disabled={auctionConfirming.has(stay.id)}
                                      onClick={() => confirmAuctionOffer(stay.id, offer.property.id)}
                                      className={[
                                        "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors",
                                        auctionConfirming.has(stay.id)
                                          ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                                          : "bg-[#02665e] text-white hover:bg-[#025b54]",
                                      ].join(" ")}
                                    >
                                      {auctionConfirming.has(stay.id) ? (
                                        <>
                                          <LogoSpinner size="xs" ariaLabel="Confirming offer" />
                                          Confirming...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="h-4 w-4" />
                                          Choose this offer
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Passengers List - Collapsible */}
                  {stay.passengers && stay.passengers.length > 0 && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-white overflow-hidden transition-all duration-200">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedPassengers);
                          if (newExpanded.has(stay.id)) {
                            newExpanded.delete(stay.id);
                          } else {
                            newExpanded.add(stay.id);
                          }
                          setExpandedPassengers(newExpanded);
                        }}
                        className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors duration-200"
                      >
                        <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-[#02665e]" />
                          <span className="text-sm font-medium text-slate-900">
                        Passengers ({stay.passengers.length})
                          </span>
                        </div>
                        <div className="transition-transform duration-200" style={{ transform: expandedPassengers.has(stay.id) ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                          <ChevronDown className="h-4 w-4 text-slate-600" />
                        </div>
                      </button>
                      <div 
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          expandedPassengers.has(stay.id) ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="p-3 pt-0">
                          <div className="grid grid-cols-2 gap-2">
                        {stay.passengers.map((passenger) => (
                          <div
                            key={passenger.id}
                                className="bg-slate-50 rounded-lg border border-slate-200 p-2.5 flex items-start gap-2.5 transition-shadow duration-200 hover:shadow-sm"
                          >
                            <div className="h-8 w-8 rounded-full bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                                  <User className="h-3.5 w-3.5 text-[#02665e]" />
                            </div>
                            <div className="min-w-0 flex-1">
                                  <div className="text-sm font-medium text-slate-900">
                                {passenger.name}
                              </div>
                                  <div className="flex flex-col gap-1 mt-1">
                                {passenger.nationality && (
                                  <div className="flex items-center gap-1 text-xs text-slate-600">
                                    <Globe className="h-3 w-3" />
                                    {passenger.nationality}
                                  </div>
                                )}
                                {passenger.phone && (
                                  <div className="flex items-center gap-1 text-xs text-slate-600">
                                    <Phone className="h-3 w-3" />
                                    {passenger.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Contact Admin - Messaging Component */}
                  <GroupStayMessaging bookingId={stay.id} />
                </div>
              </div>
                </div>

                  {showSectionDivider && (
                    <div className="h-[2px] rounded-full bg-slate-300/80 opacity-80 transition-all duration-200 ease-out group-hover:bg-slate-400/80 group-hover:opacity-100 transform scale-x-[0.98] group-hover:scale-x-100 origin-center" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Messaging component for group stays (similar to Plan With Us)
type ConversationMessage = {
  id: number;
  messageType: string;
  message: string;
  senderRole: string;
  senderName: string;
  createdAt: string;
  formattedDate: string;
};

function GroupStayMessaging({ bookingId }: { bookingId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messageType, setMessageType] = useState("Ask for Feedback");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);

  const loadMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      const response = await api.get(`/api/customer/group-stays/${bookingId}/messages`);
      if (response.data.success && response.data.messages) {
        const formattedMessages: ConversationMessage[] = response.data.messages.map((m: any) => ({
          id: m.id,
          messageType: m.messageType || "General",
          message: m.message,
          senderRole: m.senderRole,
          senderName: m.senderName || "Unknown",
          createdAt: m.createdAt,
          formattedDate: m.formattedDate,
        }));
        setConversationMessages(formattedMessages);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      setConversationMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [bookingId]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Use NEXT_PUBLIC_SOCKET_URL if available, otherwise fall back to API_URL or localhost
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                      process.env.NEXT_PUBLIC_API_URL || 
                      'http://localhost:4000';
    
    // Only connect if we have a valid URL
    if (!socketUrl) {
      console.warn('Socket.IO: No API URL configured, skipping connection');
      return;
    }
    
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected for group booking messages');
      // Join user room for receiving messages
      const userId = localStorage.getItem('userId') || '';
      if (userId) {
        // Use the correct event name based on API handlers
        newSocket.emit('join-user-room', { userId: userId });
      }
    });

    newSocket.on('connect_error', (error) => {
      console.warn('Socket.IO connection error:', error.message);
      // Don't show error to user, just log it - polling fallback will handle it
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
    });

    newSocket.on('group-stay:message:new', (data: any) => {
      if (data.groupBookingId === bookingId) {
        // Reload messages when new message arrives
        loadMessages();
      }
    });

    // Also listen for the alternative event name
    newSocket.on('group-booking:message:new', (data: any) => {
      if (data.groupBookingId === bookingId) {
        // Reload messages when new message arrives
        loadMessages();
      }
    });

    return () => {
      if (newSocket && newSocket.connected) {
        const userId = localStorage.getItem('userId') || '';
        if (userId) {
          newSocket.emit('leave-user-room', { userId: userId });
        }
        newSocket.close();
      }
    };
  }, [bookingId, loadMessages]);

  // Load messages on mount and when bookingId changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const messageTypes = [
    "Ask for Feedback",
    "Ask for Clarification",
    "Request Status Update",
    "Provide Additional Information",
    "Other",
  ];

  // Auto-fill messages based on message type
  const getMessageTemplate = (type: string): string => {
    const templates: Record<string, string> = {
      "Ask for Feedback": "Hello,\n\nI would appreciate your feedback on my group stay booking. Please let me know if you need any additional information or if there are any concerns I should address.\n\nThank you.",
      "Ask for Clarification": "Hello,\n\nI would like to request some clarification regarding my group stay booking. Could you please provide more details on the following:\n\n[Please specify what you need clarification on]\n\nThank you for your assistance.",
      "Request Status Update": "Hello,\n\nI would like to request an update on the status of my group stay booking. Could you please let me know the current progress and expected timeline?\n\nThank you.",
      "Provide Additional Information": "Hello,\n\nI would like to provide some additional information regarding my group stay booking:\n\n[Please add your additional information here]\n\nPlease let me know if you need anything else.\n\nThank you.",
      "Other": "",
    };
    return templates[type] || "";
  };

  const handleMessageTypeChange = (newType: string) => {
    setMessageType(newType);
    const template = getMessageTemplate(newType);
    setMessage(template);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      alert("Please enter a message");
      return;
    }

    setSending(true);
    try {
      const response = await api.post(`/api/customer/group-stays/${bookingId}/message`, {
        messageType,
        message: message.trim(),
      });

      if (response.data.success) {
        setSent(true);
        setMessage("");
        await loadMessages();
        setTimeout(() => {
          setIsOpen(false);
          setSent(false);
        }, 2000);
        
        window.dispatchEvent(
          new CustomEvent("nols:toast", {
            detail: { type: "success", title: "Message Sent", message: "Your message has been sent to the admin.", duration: 3000 },
          })
        );
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to send message";
      window.dispatchEvent(
        new CustomEvent("nols:toast", {
          detail: { type: "error", title: "Error", message: msg, duration: 4000 },
        })
      );
    } finally {
      setSending(false);
    }
  };

  // Show loading state while fetching messages
  if (messagesLoading && conversationMessages.length === 0) {
    return (
      <div className="mt-4 flex items-center justify-center p-4">
        <LogoSpinner size="sm" ariaLabel="Loading messages" />
      </div>
    );
  }

  // Show conversation history if messages exist, or just the button if no messages
  if (!isOpen && conversationMessages.length === 0) {
    return (
      <div className="mt-4">
        <button
          onClick={() => {
            setIsOpen(true);
            setMessage(getMessageTemplate(messageType));
          }}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#02665e] bg-white text-[#02665e] font-semibold px-4 py-3 text-sm hover:bg-[#02665e]/5 transition-all duration-200 active:scale-[0.98]"
        >
          <MessageSquare className="h-4 w-4" />
          Contact Admin
        </button>
      </div>
    );
  }

  if (!isOpen && conversationMessages.length > 0) {
    return (
      <div className="mt-4 space-y-4">
        {/* Conversation History */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <MessageSquare className="h-4 w-4 text-[#02665e]" />
              Conversation History
            </h4>
            <button
              onClick={() => {
                setIsOpen(true);
                setMessage(getMessageTemplate(messageType));
              }}
              className="text-xs font-medium text-[#02665e] hover:text-[#014d47] transition-colors"
            >
              Send Message
            </button>
          </div>
          
          {/* Messages List - Chat Style */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {conversationMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderRole === 'USER' ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`flex flex-col ${msg.senderRole === 'USER' ? 'items-start max-w-[80%] sm:max-w-[70%]' : 'items-end max-w-[80%] sm:max-w-[70%]'}`}>
                  <div className={`flex items-center gap-2 mb-1.5 ${msg.senderRole === 'USER' ? '' : 'flex-row-reverse'}`}>
                    {msg.senderRole === 'USER' && (
                      <span className="text-[10px] font-medium text-[#02665e] px-2 py-0.5 rounded-md bg-[#02665e]/10">
                        {msg.messageType}
                      </span>
                    )}
                    {msg.senderRole === 'ADMIN' && (
                      <span className="text-[10px] font-semibold text-[#02665e] px-2 py-0.5 rounded-md bg-[#02665e]/10 border border-[#02665e]/20">
                        Admin
                      </span>
                    )}
                    {msg.senderRole === 'SYSTEM' && (
                      <span className="text-[10px] font-semibold text-[#02665e] px-2 py-0.5 rounded-md bg-[#02665e]/10 border border-[#02665e]/20">
                        NoLSAF
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">{msg.formattedDate}</span>
                  </div>
                  <div
                    className={`rounded-xl px-3 py-2 shadow-sm ${
                      msg.senderRole === 'USER'
                        ? 'bg-[#02665e] text-white rounded-tl-sm'
                        : 'bg-white border-2 border-[#02665e]/20 rounded-tr-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Message form (when isOpen is true)
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <MessageSquare className="h-4 w-4 text-[#02665e]" />
          Contact Admin
        </h4>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <XCircle className="h-4 w-4" />
        </button>
      </div>

      {sent ? (
        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
          <CheckCircle className="h-4 w-4" />
          <span>Message sent successfully!</span>
        </div>
      ) : (
        <>
          {/* Message Type Dropdown */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-2">
              Message Type
            </label>
            <div className="relative">
              <select
                value={messageType}
                onChange={(e) => handleMessageTypeChange(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all"
              >
                {messageTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Message Textarea */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-2">
              Your Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all resize-none"
            />
            {(message.includes("[") && message.includes("]")) && (
              <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1.5">
                <span className="text-red-500">⚠️</span>
                <span>Please replace the text in <span className="font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">[brackets]</span> with your specific information.</span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#02665e] text-white font-semibold px-4 py-2.5 text-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#02665e]"
            >
              {sending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setMessage("");
                setMessageType("Ask for Feedback");
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
