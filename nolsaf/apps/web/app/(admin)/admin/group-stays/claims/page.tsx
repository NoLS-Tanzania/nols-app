"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { 
  Gift, Search, X, Calendar, MapPin, Clock, User, 
  Loader2, Eye, 
  Sparkles, Tag, DollarSign,
  Filter, Building2, Users as UsersIcon, ArrowRight
} from "lucide-react";
import Image from "next/image";
import axios from "axios";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });

function authify() {
  if (typeof window === "undefined") return;
  const lsToken =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("nolsaf_token") ||
    window.localStorage.getItem("__Host-nolsaf_token");

  if (lsToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${lsToken}`;
    return;
  }

  const m = String(document.cookie || "").match(/(?:^|;\s*)(?:nolsaf_token|__Host-nolsaf_token)=([^;]+)/);
  const cookieToken = m?.[1] ? decodeURIComponent(m[1]) : "";
  if (cookieToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${cookieToken}`;
  }
}

type ClaimRow = {
  id: number;
  groupBookingId: number;
  ownerId: number;
  propertyId: number;
  offeredPricePerNight: number;
  discountPercent: number | null;
  totalAmount: number;
  currency: string;
  specialOffers: string | null;
  notes: string | null;
  status: string;
  reviewedAt: string | null;
  reviewedBy: number | null;
  createdAt: string;
  isRecommended?: boolean;
  owner: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
  };
  property: {
    id: number;
    title: string;
    type: string;
    regionName: string;
    district: string | null;
    city: string | null;
    primaryImage: string | null;
    images: string[];
    basePrice: number | null;
  } | null;
  groupBooking: {
    id: number;
    groupType: string;
    accommodationType: string;
    headcount: number;
    roomsNeeded: number;
    toRegion: string;
    checkIn: string | null;
    checkOut: string | null;
    user: {
      id: number;
      name: string;
      email: string;
      phone: string | null;
    } | null;
  };
  pricePerGuest: number | null;
  pricePerRoom: number | null;
  savingsAmount: number | null;
  nights: number;
};

type ClaimsSummary = {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
};

function badgeClasses(v: string) {
  switch (v) {
    case "PENDING":
      return "bg-blue-100 text-blue-700 border-blue-300";
    case "REVIEWING":
      return "bg-purple-100 text-purple-700 border-purple-300";
    case "ACCEPTED":
      return "bg-green-100 text-green-700 border-green-300";
    case "REJECTED":
      return "bg-red-100 text-red-700 border-red-300";
    case "WITHDRAWN":
      return "bg-gray-100 text-gray-700 border-gray-300";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300";
  }
}

type BookingClaimsResponse = {
  groupBooking: any;
  claims: ClaimRow[];
  shortlist: {
    high: { id: number; totalAmount: number };
    mid: { id: number; totalAmount: number } | null;
    low: { id: number; totalAmount: number };
    targetTotalAmount: number;
    currency: string | null;
  } | null;
  recommendedClaimIds: number[];
  summary: any;
};

export default function AdminGroupStaysClaimsPage() {
  const [status, setStatus] = useState<string>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [summary, setSummary] = useState<ClaimsSummary | null>(null);

  const [activeBookingId, setActiveBookingId] = useState<number | null>(null);
  const [bookingClaims, setBookingClaims] = useState<BookingClaimsResponse | null>(null);
  const [bookingClaimsLoading, setBookingClaimsLoading] = useState(false);
  const [showShortlistOnly, setShowShortlistOnly] = useState(true);
  const [selectedClaimIds, setSelectedClaimIds] = useState<number[]>([]);
  const [startingReview, setStartingReview] = useState(false);
  const [recommending, setRecommending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      authify();
      
      // Direct API call to get all claims (regardless of booking status)
      const params: any = {
        page,
        pageSize,
      };
      
      if (status && status.trim()) {
        params.status = status.trim();
      }
      
      if (q && q.trim()) {
        params.q = q.trim();
      }

      const response = await api.get<{
        items: ClaimRow[];
        total: number;
        totalAll: number;
        page: number;
        pageSize: number;
        summary: ClaimsSummary;
      }>("/api/admin/group-stays/claims", { params });

      if (response.data) {
        setList(response.data.items || []);
        setTotal(response.data.total || 0);
        setSummary(response.data.summary || {
          total: 0,
          pending: 0,
          accepted: 0,
          rejected: 0,
          withdrawn: 0,
        });
      } else {
        setList([]);
        setTotal(0);
        setSummary({
          total: 0,
          pending: 0,
          accepted: 0,
          rejected: 0,
          withdrawn: 0,
        });
      }
    } catch (err: any) {
      console.error("Failed to load claims", err);
      setList([]);
      setTotal(0);
      setSummary({
        total: 0,
        pending: 0,
        accepted: 0,
        rejected: 0,
        withdrawn: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [page, status, q, pageSize]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (q && page !== 1) {
      setPage(1);
    }
  }, [q, page]);

  // Load data when dependencies change
  useEffect(() => {
    // Debounce search query
    const timer = setTimeout(() => {
      load();
    }, q ? 500 : 0); // Only debounce when searching, immediate load for filters
    return () => clearTimeout(timer);
  }, [load, q]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const openBookingReview = useCallback(async (bookingId: number) => {
    setActiveBookingId(bookingId);
    setBookingClaims(null);
    setBookingClaimsLoading(true);
    try {
      authify();
      const r = await api.get<BookingClaimsResponse>(`/api/admin/group-stays/claims/${bookingId}`);
      setBookingClaims(r.data);

      const recommendedIds = Array.isArray(r.data?.recommendedClaimIds) ? r.data.recommendedClaimIds : [];
      if (recommendedIds.length > 0) {
        setSelectedClaimIds(recommendedIds.slice(0, 3));
      } else {
        const shortlistIds = [
          r.data?.shortlist?.high?.id,
          r.data?.shortlist?.mid?.id,
          r.data?.shortlist?.low?.id,
        ].filter(Boolean) as number[];
        setSelectedClaimIds(shortlistIds.slice(0, 3));
        setShowShortlistOnly(shortlistIds.length > 0);
      }
    } catch (err: any) {
      console.error("Failed to load booking claims", err);
      setBookingClaims(null);
    } finally {
      setBookingClaimsLoading(false);
    }
  }, []);

  const closeBookingReview = () => {
    setActiveBookingId(null);
    setBookingClaims(null);
    setSelectedClaimIds([]);
    setShowShortlistOnly(true);
  };

  const toggleSelection = (claimId: number) => {
    setSelectedClaimIds((prev) => {
      if (prev.includes(claimId)) return prev.filter((id) => id !== claimId);
      if (prev.length >= 3) return prev;
      return [...prev, claimId];
    });
  };

  const startReview = async () => {
    if (!activeBookingId) return;
    setStartingReview(true);
    try {
      authify();
      await api.post(`/api/admin/group-stays/claims/${activeBookingId}/start-review`);
      await openBookingReview(activeBookingId);
      load();
    } catch (err: any) {
      console.error("Failed to start review", err);
      alert(err?.response?.data?.error || "Failed to start review");
    } finally {
      setStartingReview(false);
    }
  };

  const recommendSelected = async () => {
    if (!activeBookingId) return;
    if (selectedClaimIds.length === 0) return;
    setRecommending(true);
    try {
      authify();
      await api.post(`/api/admin/group-stays/claims/${activeBookingId}/recommendations`, {
        claimIds: selectedClaimIds,
      });
      await openBookingReview(activeBookingId);
      load();
    } catch (err: any) {
      console.error("Failed to recommend", err);
      alert(err?.response?.data?.error || "Failed to recommend");
    } finally {
      setRecommending(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      {/* In-page Review Modal (keeps auction workflow on this page) */}
      {activeBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeBookingReview} />
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking #{activeBookingId}</div>
                <div className="text-lg sm:text-xl font-bold text-gray-900 truncate">Review & Recommend Offers</div>
                {bookingClaims?.groupBooking && (
                  <div className="mt-1 text-xs sm:text-sm text-gray-600">
                    {bookingClaims.groupBooking.toRegion}
                    {bookingClaims.groupBooking.toDistrict ? `, ${bookingClaims.groupBooking.toDistrict}` : ""} • Guests {bookingClaims.groupBooking.headcount} • Rooms {bookingClaims.groupBooking.roomsNeeded}
                  </div>
                )}
              </div>
              <button
                onClick={closeBookingReview}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                aria-label="Close"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5">
              {bookingClaimsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mb-3" />
                  <div className="text-sm text-gray-600">Loading offers...</div>
                </div>
              ) : !bookingClaims ? (
                <div className="py-10 text-center text-sm text-gray-600">Failed to load offers.</div>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      {bookingClaims.shortlist && (
                        <button
                          onClick={() => setShowShortlistOnly((v) => !v)}
                          className="px-3 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100"
                          title={showShortlistOnly ? "Showing shortlist" : "Showing all offers"}
                        >
                          {showShortlistOnly ? "⭐ Shortlist" : "📦 All"}
                        </button>
                      )}
                      <div className="text-xs text-gray-500">Selected {selectedClaimIds.length}/3</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={startReview}
                        disabled={startingReview}
                        className="px-3 py-2 text-xs font-semibold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Mark all pending as REVIEWING"
                      >
                        {startingReview ? "Starting..." : "Mark Reviewing"}
                      </button>
                      <button
                        onClick={recommendSelected}
                        disabled={recommending || selectedClaimIds.length === 0}
                        className="px-4 py-2 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
                        title="Save recommendations for customer"
                      >
                        {recommending ? "Saving..." : "Recommend Selected"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bookingClaims.claims
                      .filter((c) => {
                        if (!showShortlistOnly || !bookingClaims.shortlist) return true;
                        const ids = [bookingClaims.shortlist.high.id, bookingClaims.shortlist.mid?.id, bookingClaims.shortlist.low.id].filter(Boolean) as number[];
                        return ids.includes(c.id);
                      })
                      .map((c) => {
                        const isSelected = selectedClaimIds.includes(c.id);
                        const isRecommended = (bookingClaims.recommendedClaimIds || []).includes(c.id);
                        const isHigh = bookingClaims.shortlist?.high?.id === c.id;
                        const isMid = bookingClaims.shortlist?.mid?.id === c.id;
                        const isLow = bookingClaims.shortlist?.low?.id === c.id;

                        return (
                          <div
                            key={c.id}
                            className={`rounded-xl border p-4 shadow-sm ${
                              isSelected ? "border-emerald-400 bg-emerald-50/40" : "border-gray-200 bg-white"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-1 text-[10px] font-bold rounded-md border ${badgeClasses(c.status)}`}>{c.status}</span>
                                  {(isHigh || isMid || isLow) && (
                                    <span
                                      className={`px-2 py-1 text-[10px] font-bold rounded-md border ${
                                        isHigh
                                          ? "bg-amber-50 text-amber-800 border-amber-200"
                                          : isMid
                                          ? "bg-slate-50 text-slate-800 border-slate-200"
                                          : "bg-indigo-50 text-indigo-800 border-indigo-200"
                                      }`}
                                    >
                                      {isHigh ? "HIGH" : isMid ? "MID" : "LOW"}
                                    </span>
                                  )}
                                  {isRecommended && (
                                    <span className="px-2 py-1 text-[10px] font-bold rounded-md border bg-green-50 text-green-700 border-green-200">
                                      Recommended
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 text-sm font-bold text-gray-900 truncate">
                                  {c.property?.title || `Property #${c.propertyId}`}
                                </div>
                                <div className="mt-1 text-xs text-gray-600 truncate">Owner: {c.owner.name}</div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm font-bold text-emerald-700">
                                  {c.currency} {Number(c.totalAmount).toLocaleString()}
                                </div>
                                <div className="text-[11px] text-gray-500">Total</div>
                              </div>
                            </div>

                            {c.specialOffers && (
                              <div className="mt-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2">
                                {c.specialOffers}
                              </div>
                            )}

                            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between gap-2">
                              <button
                                onClick={() => toggleSelection(c.id)}
                                disabled={!isSelected && selectedClaimIds.length >= 3}
                                className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                                  isSelected
                                    ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                                    : "bg-white text-gray-800 border-gray-200 hover:bg-gray-50"
                                }`}
                              >
                                {isSelected ? "Selected" : "Select"}
                              </button>
                              <div className="text-[11px] text-gray-500">{c.currency} {Number(c.offeredPricePerNight).toLocaleString()}/night</div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header - Modern & Clean */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md flex-shrink-0">
              <Gift className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">Submitted Claims & Offers</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1.5">Review and manage all owner claims for group bookings</p>
            </div>
          </div>
        </div>

        {/* Summary Stats - Clean Grid Layout */}
        {summary && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Total</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-900">{summary.total}</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border border-blue-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1.5">Pending</div>
                <div className="text-2xl sm:text-3xl font-bold text-blue-700">{summary.pending}</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-4 border border-green-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-1.5">Recommended</div>
                <div className="text-2xl sm:text-3xl font-bold text-green-700">{summary.accepted}</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100/50 rounded-lg p-4 border border-red-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1.5">Rejected</div>
                <div className="text-2xl sm:text-3xl font-bold text-red-700">{summary.rejected}</div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Withdrawn</div>
                <div className="text-2xl sm:text-3xl font-bold text-gray-700">{summary.withdrawn}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modern Integrated Search & Filter - Premium Design */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-0 overflow-hidden">
          {/* Search - Left Side */}
          <div className="flex-1 relative min-w-0 order-1 sm:order-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10" />
            <input
              ref={searchRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by property, owner, customer, region..."
              className="w-full pl-12 pr-12 sm:pr-4 py-3.5 sm:py-3.5 border-0 rounded-xl sm:rounded-l-xl sm:rounded-r-none focus:ring-0 focus:outline-none text-sm sm:text-base text-gray-900 placeholder-gray-400 bg-transparent transition-all duration-200 hover:bg-gray-50/50 focus:bg-gray-50/50"
              aria-label="Search claims"
              title="Search by property, owner, customer, region"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-md hover:bg-gray-100 active:scale-95 z-10"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Divider - Only visible on larger screens */}
          <div className="hidden sm:block w-px h-8 bg-gray-200 self-center order-2 mx-1"></div>

          {/* Status Filter - Right Side, Integrated */}
          <div className="relative min-w-full sm:min-w-[200px] order-2 sm:order-3 border-t sm:border-t-0 border-gray-200 sm:border-l sm:border-l-gray-200">
            {/* Filter Icon - Left Side Only */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none z-10">
              <Filter className="h-4 w-4 text-emerald-600" />
            </div>
            
            {/* Dropdown Select */}
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className={`w-full pl-11 pr-4 py-3.5 sm:py-3.5 border-0 rounded-xl sm:rounded-l-none sm:rounded-r-xl focus:ring-0 focus:outline-none text-sm sm:text-base font-semibold bg-transparent appearance-none cursor-pointer hover:bg-gray-50/50 focus:bg-gray-50/50 transition-all duration-200 ${
                status === "" ? "text-gray-700" :
                status === "PENDING" ? "text-blue-700" :
                status === "REVIEWING" ? "text-purple-700" :
                status === "ACCEPTED" ? "text-green-700" :
                status === "REJECTED" ? "text-red-700" :
                status === "WITHDRAWN" ? "text-gray-700" :
                "text-gray-700"
              }`}
              aria-label="Filter by status"
              title="Filter by status"
            >
              <option value="" className="text-gray-700">All Status</option>
              <option value="PENDING" className="text-blue-700">Pending</option>
              <option value="REVIEWING" className="text-purple-700">Reviewing</option>
              <option value="ACCEPTED" className="text-green-700">Accepted</option>
              <option value="REJECTED" className="text-red-700">Rejected</option>
              <option value="WITHDRAWN" className="text-gray-700">Withdrawn</option>
            </select>
          </div>
        </div>
      </div>

      {/* Claims List - Modern Card Layout */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20">
            <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-emerald-600 mb-3" />
            <span className="text-sm sm:text-base text-gray-600 font-medium">Loading claims...</span>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Gift className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
            </div>
            <p className="text-base sm:text-lg text-gray-700 font-semibold mb-1">No claims found</p>
            <p className="text-xs sm:text-sm text-gray-500 text-center max-w-md">
              {q || status ? "Try adjusting your search or filter criteria" : "No claims have been submitted yet for review"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <div className="min-w-full divide-y divide-gray-100">
                {list.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-4 sm:p-5 hover:bg-gray-50/50 transition-all duration-200 border-l-4 border-l-transparent hover:border-l-emerald-500 active:bg-gray-100/50"
                  >
                    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
                      {/* Left: Property Image & Basic Info */}
                      <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
                        {claim.property?.primaryImage && (
                          <div className="flex-shrink-0 hidden sm:block">
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                              <Image
                                src={claim.property.primaryImage}
                                alt={claim.property.title || "Property"}
                                width={120}
                                height={120}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate mb-2 leading-tight">
                                {claim.property?.title || "Property #" + claim.propertyId}
                              </h3>
                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${badgeClasses(claim.status)}`}>
                                  {claim.status}
                                </span>
                                {claim.isRecommended && (
                                  <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                    <Sparkles className="h-3 w-3" />
                                    Recommended
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-left sm:text-right flex-shrink-0 sm:ml-auto">
                              <div className="text-lg sm:text-xl font-bold text-emerald-700">
                                {claim.currency} {claim.totalAmount.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">Total Amount</div>
                            </div>
                          </div>

                          {/* Owner Info & Location - Clean Row Layout */}
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-3 text-sm">
                            <div className="flex items-center gap-1.5 text-gray-700">
                              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="font-semibold truncate max-w-[200px]">{claim.owner.name}</span>
                            </div>
                            <span className="text-gray-300 hidden sm:inline">|</span>
                            <span className="text-xs text-gray-500 truncate max-w-[250px] hidden sm:inline">{claim.owner.email}</span>
                            {claim.property && (
                              <>
                                <span className="text-gray-300 hidden sm:inline">|</span>
                                <div className="flex items-center gap-1.5 text-gray-600">
                                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="truncate max-w-[200px]">
                                    {[claim.property.regionName, claim.property.district]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Pricing Details - Compact Grid */}
                          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-3">
                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                              <DollarSign className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">
                                {claim.currency} {claim.offeredPricePerNight.toLocaleString()}/night
                              </span>
                            </div>
                            {claim.discountPercent && claim.discountPercent > 0 && (
                              <div className="flex items-center gap-1.5 text-sm font-semibold text-green-700 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                                <Tag className="h-3.5 w-3.5" />
                                <span>{claim.discountPercent}% off</span>
                              </div>
                            )}
                            {claim.pricePerGuest && (
                              <div className="text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                                {claim.currency} {claim.pricePerGuest.toFixed(0)}/guest
                              </div>
                            )}
                          </div>

                          {/* Special Offers - Enhanced Display */}
                          {claim.specialOffers && (
                            <div className="flex items-start gap-2.5 mt-2 p-3 bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-200 rounded-lg">
                              <Tag className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs sm:text-sm text-amber-900 leading-relaxed flex-1">{claim.specialOffers}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Booking Info & Actions - Clean Sidebar */}
                      <div className="lg:w-72 xl:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-gray-200 pt-4 lg:pt-0 lg:pl-5 space-y-4">
                        {/* Booking Details - Compact Card */}
                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
                          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Booking Info</span>
                          </div>
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <UsersIcon className="h-4 w-4 text-gray-400" />
                                <span>Guests</span>
                              </div>
                              <span className="font-semibold text-gray-900">{claim.groupBooking.headcount}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <span>Rooms</span>
                              </div>
                              <span className="font-semibold text-gray-900">{claim.groupBooking.roomsNeeded}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <span>Nights</span>
                              </div>
                              <span className="font-semibold text-gray-900">{claim.nights}</span>
                            </div>
                            {claim.groupBooking.checkIn && (
                              <div className="pt-2 border-t border-gray-200">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>Dates</span>
                                </div>
                                <div className="text-xs text-gray-700 leading-relaxed">
                                  {new Date(claim.groupBooking.checkIn).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}{" "}
                                  - {claim.groupBooking.checkOut
                                    ? new Date(claim.groupBooking.checkOut).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                      })
                                    : "TBD"}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Customer - Compact */}
                          {claim.groupBooking.user && (
                            <div className="pt-3 mt-3 border-t border-gray-200">
                              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                <span>Customer</span>
                              </div>
                              <div className="text-sm font-medium text-gray-900 mb-0.5">{claim.groupBooking.user.name}</div>
                              <div className="text-xs text-gray-500 truncate">{claim.groupBooking.user.email}</div>
                            </div>
                          )}
                        </div>

                        {/* Actions - Modern Button */}
                        <div className="space-y-2">
                          <button
                            onClick={() => openBookingReview(claim.groupBookingId)}
                            className="w-full px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Review & Recommend</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                          <div className="text-xs text-gray-400 text-center pt-1 flex items-center justify-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span>
                              Submitted {new Date(claim.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modern Pagination */}
            {pages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50/50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs sm:text-sm text-gray-600 font-medium">
                    Showing <span className="font-semibold text-gray-900">{(page - 1) * pageSize + 1}</span> to{" "}
                    <span className="font-semibold text-gray-900">{Math.min(page * pageSize, total)}</span> of{" "}
                    <span className="font-semibold text-gray-900">{total}</span> claims
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md"
                      aria-label="Previous page"
                    >
                      Previous
                    </button>
                    <div className="px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold text-gray-900 shadow-sm">
                      Page {page} of {pages}
                    </div>
                    <button
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page === pages}
                      className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-all duration-200 shadow-sm hover:shadow-md"
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
