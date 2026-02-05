"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import { FileText, Loader2, Users, MapPin, Calendar, CheckCircle, XCircle, Clock, Building2, Gift, ArrowRight, DollarSign } from "lucide-react";

const api = axios.create({ baseURL: "", withCredentials: true });

type Claim = {
  id: number;
  groupBookingId: number;
  propertyId: number;
  offeredPricePerNight: number;
  discountPercent: number | null;
  specialOffers: string | null;
  notes: string | null;
  totalAmount: number;
  currency: string;
  status: string;
  reviewedAt: string | null;
  createdAt: string;
  groupBooking: {
    id: number;
    headcount: number;
    roomsNeeded: number;
    toRegion: string;
    checkIn: string | null;
    checkOut: string | null;
    user: { id: number; name: string; email: string; phone: string | null } | null;
  };
  property: {
    id: number;
    title: string;
    type: string;
    regionName: string;
    owner?: {
      id: number;
      name: string;
    } | null;
  };
};

export default function OwnerMyClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedStatus) params.status = selectedStatus;

      const response = await api.get("/api/owner/group-stays/claims/my-claims", { params });
      setClaims(response.data.items || []);
    } catch (err: any) {
      console.error("Failed to load claims:", err);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, { bg: string; text: string; border: string; icon: any; gradient: string }> = {
      'PENDING': { 
        bg: 'bg-amber-50', 
        text: 'text-amber-800', 
        border: 'border-amber-300', 
        icon: Clock,
        gradient: 'from-amber-400 to-amber-500'
      },
      'ACCEPTED': { 
        bg: 'bg-green-50', 
        text: 'text-green-800', 
        border: 'border-green-300', 
        icon: CheckCircle,
        gradient: 'from-green-500 to-green-600'
      },
      'REJECTED': { 
        bg: 'bg-red-50', 
        text: 'text-red-800', 
        border: 'border-red-300', 
        icon: XCircle,
        gradient: 'from-red-500 to-red-600'
      },
      'WITHDRAWN': { 
        bg: 'bg-gray-50', 
        text: 'text-gray-800', 
        border: 'border-gray-300', 
        icon: XCircle,
        gradient: 'from-gray-400 to-gray-500'
      },
    };

    const colors = statusColors[status.toUpperCase()] || { 
      bg: 'bg-gray-50', 
      text: 'text-gray-800', 
      border: 'border-gray-300', 
      icon: FileText,
      gradient: 'from-gray-400 to-gray-500'
    };
    const Icon = colors.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold ${colors.bg} ${colors.text} border-2 ${colors.border} shadow-sm transition-all duration-300 hover:shadow-md`}>
        <div className={`h-5 w-5 rounded-lg bg-gradient-to-br ${colors.gradient} flex items-center justify-center`}>
          <Icon className="h-3 w-3 text-white" />
        </div>
        <span className="uppercase tracking-wide">{status}</span>
      </span>
    );
  };

  const formatCurrency = (amount: number, currency: string = "TZS") => {
    return new Intl.NumberFormat("en-TZ", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) + " at " + date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Calculate counts for filter tabs
  const filterCounts = useMemo(() => {
    return {
      all: claims.length,
      pending: claims.filter(c => c.status.toUpperCase() === 'PENDING').length,
      accepted: claims.filter(c => c.status.toUpperCase() === 'ACCEPTED').length,
      rejected: claims.filter(c => c.status.toUpperCase() === 'REJECTED').length,
      withdrawn: claims.filter(c => c.status.toUpperCase() === 'WITHDRAWN').length,
    };
  }, [claims]);

  // Filter claims based on selected status
  const filteredClaims = useMemo(() => {
    if (!selectedStatus) return claims;
    return claims.filter(c => c.status.toUpperCase() === selectedStatus.toUpperCase());
  }, [claims, selectedStatus]);

  const filterTabs: { key: string; label: string; icon: any; count: number }[] = [
    { key: '', label: 'All Claims', icon: FileText, count: filterCounts.all },
    { key: 'PENDING', label: 'Pending', icon: Clock, count: filterCounts.pending },
    { key: 'ACCEPTED', label: 'Accepted', icon: CheckCircle, count: filterCounts.accepted },
    { key: 'REJECTED', label: 'Rejected', icon: XCircle, count: filterCounts.rejected },
    { key: 'WITHDRAWN', label: 'Withdrawn', icon: XCircle, count: filterCounts.withdrawn },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-brand-100 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">My Claims</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">Loading your submitted claims…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white border-2 border-brand-200 shadow-lg shadow-brand-500/10 mb-2 transition-all duration-300 hover:scale-105">
          <FileText className="h-10 w-10 text-brand" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">My Claims</h1>
          <p className="text-base text-slate-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            View and track all your submitted offers for group stays.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 transition-all duration-300 font-semibold text-sm ${
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white border-brand-600 shadow-lg shadow-brand-500/30 scale-105'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md hover:scale-105'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  isActive 
                    ? 'bg-white/25 text-white backdrop-blur-sm' 
                    : 'bg-slate-100 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Claims List */}
      <div className="space-y-4">
        {filteredClaims.length === 0 ? (
          <div className="min-h-[40vh] flex flex-col items-center justify-center text-center bg-gradient-to-br from-white via-slate-50/50 to-white rounded-3xl border-2 border-slate-200/60 shadow-lg p-16 animate-in fade-in slide-in-from-bottom-4">
            <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mb-6 shadow-md">
              <FileText className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {selectedStatus ? `No ${filterTabs.find(t => t.key === selectedStatus)?.label.toLowerCase()} claims` : 'No claims submitted yet'}
            </h3>
            <p className="text-sm text-slate-600 max-w-md">
              {selectedStatus ? 'Try selecting a different filter to see more claims.' : 'Start claiming group stays to see your submitted offers here.'}
            </p>
            {!selectedStatus && (
              <Link
                href="/owner/group-stays/claims"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-brand-600 to-brand-700 text-white hover:from-brand-700 hover:to-brand-800 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Browse Available Claims
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredClaims.map((claim) => {
              // Parse special offers into array
              const specialOffersList = claim.specialOffers 
                ? claim.specialOffers.split(',').map(s => s.trim()).filter(s => s.length > 0)
                : [];
              
              return (
                <div 
                  key={claim.id} 
                  className="group relative bg-white rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 border border-slate-100 shadow-lg shadow-slate-200/50 animate-in fade-in slide-in-from-bottom-4"
                >
                  {/* Left accent bar - color based on status */}
                  <div className={`absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b ${
                    claim.status.toUpperCase() === 'ACCEPTED' ? 'from-green-500 via-green-600 to-green-700' :
                    claim.status.toUpperCase() === 'PENDING' ? 'from-amber-500 via-amber-600 to-amber-700' :
                    claim.status.toUpperCase() === 'REJECTED' ? 'from-red-500 via-red-600 to-red-700' :
                    'from-gray-400 via-gray-500 to-gray-600'
                  } shadow-lg`}></div>
                  
                  <div className="pl-6 pr-6 py-6">
                    {/* Header Section */}
                    <div className="flex items-start justify-between mb-6 pb-6 border-b border-slate-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-3">
                          <h3 className="text-2xl font-bold text-slate-900 tracking-tight group-hover:text-brand transition-colors duration-300">
                            Claim #{claim.id}
                          </h3>
                          {getStatusBadge(claim.status)}
                        </div>
                      </div>
                    </div>

                    {/* Group Stay Details */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-50/80 border border-slate-200/60 hover:bg-slate-100 transition-colors duration-200">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
                          <Users className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-0.5">Group Stay</p>
                          <p className="text-sm font-bold text-slate-900">
                            #{claim.groupBooking.id} - {claim.groupBooking.headcount} people, {claim.groupBooking.roomsNeeded} rooms
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-blue-50/80 border border-blue-200/60 hover:bg-blue-100 transition-colors duration-200">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md flex-shrink-0">
                          <MapPin className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-0.5">Destination</p>
                          <p className="text-sm font-bold text-slate-900 capitalize">{claim.groupBooking.toRegion}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-purple-50/80 border border-purple-200/60 hover:bg-purple-100 transition-colors duration-200">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-md flex-shrink-0">
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-0.5">Property</p>
                          <p className="text-sm font-bold text-slate-900">
                            {claim.property.title} <span className="text-slate-600 font-normal">({claim.property.type})</span>
                          </p>
                          {claim.property.owner && (
                            <p className="text-xs text-slate-600 mt-1">
                              Owner: <span className="font-semibold text-slate-700">{claim.property.owner.name}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pricing Section - Enhanced with Calculation Breakdown */}
                    <div className="mb-6 p-5 bg-gradient-to-br from-brand-50 via-brand-50/50 to-white rounded-2xl border-2 border-brand-200/60 shadow-md">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-700 flex items-center justify-center shadow-md">
                          <DollarSign className="h-4 w-4 text-white" />
                        </div>
                        <h4 className="text-sm font-bold text-brand-900 uppercase tracking-wide">Pricing Breakdown</h4>
                      </div>

                      {/* Summary Cards - Top Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className="p-3 bg-white/80 rounded-xl border border-brand-200/60">
                          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">Offered Price</p>
                          <p className="text-lg font-bold text-brand-900">{formatCurrency(claim.offeredPricePerNight, claim.currency)}/night</p>
                        </div>
                        {claim.discountPercent && claim.discountPercent > 0 && (
                          <div className="p-3 bg-white/80 rounded-xl border border-green-200/60">
                            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Discount</p>
                            <p className="text-lg font-bold text-green-700">{claim.discountPercent}% off</p>
                          </div>
                        )}
                        <div className="p-3 bg-white/80 rounded-xl border border-brand-200/60">
                          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">Total Amount</p>
                          <p className="text-lg font-bold text-brand-900">{formatCurrency(claim.totalAmount, claim.currency)}</p>
                        </div>
                      </div>

                      {/* Calculation Steps */}
                      {claim.groupBooking.checkIn && claim.groupBooking.checkOut && (() => {
                        const nights = Math.ceil((new Date(claim.groupBooking.checkOut).getTime() - new Date(claim.groupBooking.checkIn).getTime()) / (1000 * 60 * 60 * 24));
                        const priceAfterDiscount = claim.discountPercent && claim.discountPercent > 0
                          ? claim.offeredPricePerNight - (claim.offeredPricePerNight * claim.discountPercent / 100)
                          : claim.offeredPricePerNight;
                        const discountAmount = claim.discountPercent && claim.discountPercent > 0
                          ? (claim.offeredPricePerNight * claim.discountPercent / 100)
                          : 0;
                        
                        return (
                          <div className="space-y-2.5 pt-4 border-t border-brand-200/60">
                            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Calculation Details:</p>
                            
                            {/* Step 1: Base Price */}
                            <div className="flex items-center justify-between p-2.5 bg-white/80 rounded-lg border border-brand-200/60">
                              <span className="text-xs font-medium text-slate-700">Price per Night (per room)</span>
                              <span className="text-xs font-bold text-brand-900">{formatCurrency(claim.offeredPricePerNight, claim.currency)}</span>
                            </div>

                            {/* Step 2: Discount (if applicable) */}
                            {claim.discountPercent && claim.discountPercent > 0 && (
                              <>
                                <div className="flex items-center justify-between p-2.5 bg-white/80 rounded-lg border border-amber-200/60">
                                  <span className="text-xs font-medium text-slate-700">Discount ({claim.discountPercent}%)</span>
                                  <span className="text-xs font-bold text-amber-700">-{formatCurrency(discountAmount, claim.currency)}</span>
                                </div>
                                <div className="flex items-center justify-between p-2.5 bg-white/80 rounded-lg border border-green-200/60">
                                  <span className="text-xs font-medium text-slate-700">Price per Night (After Discount)</span>
                                  <span className="text-xs font-bold text-green-700">{formatCurrency(priceAfterDiscount, claim.currency)}</span>
                                </div>
                              </>
                            )}

                            {/* Step 3: Rooms */}
                            <div className="flex items-center justify-between p-2.5 bg-white/80 rounded-lg border border-brand-200/60">
                              <span className="text-xs font-medium text-slate-700">Number of Rooms</span>
                              <span className="text-xs font-bold text-brand-900">{claim.groupBooking.roomsNeeded} room{claim.groupBooking.roomsNeeded > 1 ? 's' : ''}</span>
                            </div>

                            {/* Step 4: Nights */}
                            <div className="flex items-center justify-between p-2.5 bg-white/80 rounded-lg border border-brand-200/60">
                              <span className="text-xs font-medium text-slate-700">Number of Nights</span>
                              <span className="text-xs font-bold text-brand-900">{nights} night{nights > 1 ? 's' : ''}</span>
                            </div>

                            {/* Calculation Formula */}
                            <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/60 mt-3">
                              <p className="text-xs font-semibold text-slate-600 mb-1.5">Calculation Formula:</p>
                              <p className="text-xs text-slate-700 font-mono leading-relaxed">
                                {claim.discountPercent && claim.discountPercent > 0 ? (
                                  <>
                                    <span className="text-brand-700 font-bold">{formatCurrency(priceAfterDiscount, claim.currency)}</span>
                                    {' × '}
                                    <span className="text-brand-700 font-bold">{claim.groupBooking.roomsNeeded}</span>
                                    {' rooms × '}
                                    <span className="text-brand-700 font-bold">{nights}</span>
                                    {' nights = '}
                                    <span className="text-brand-900 font-bold">{formatCurrency(claim.totalAmount, claim.currency)}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-brand-700 font-bold">{formatCurrency(claim.offeredPricePerNight, claim.currency)}</span>
                                    {' × '}
                                    <span className="text-brand-700 font-bold">{claim.groupBooking.roomsNeeded}</span>
                                    {' rooms × '}
                                    <span className="text-brand-700 font-bold">{nights}</span>
                                    {' nights = '}
                                    <span className="text-brand-900 font-bold">{formatCurrency(claim.totalAmount, claim.currency)}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Special Offers - Enhanced List Display */}
                    {specialOffersList.length > 0 && (
                      <div className="mb-6 p-4 bg-gradient-to-br from-amber-50 via-amber-50/50 to-white rounded-2xl border-2 border-amber-200/60 shadow-md">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
                            <Gift className="h-4 w-4 text-white" />
                          </div>
                          <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wide">Special Offers</h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {specialOffersList.map((offer, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center gap-2 p-2.5 bg-white/80 rounded-lg border border-amber-200/60 hover:bg-amber-50 transition-colors duration-200"
                            >
                              <div className="h-2 w-2 rounded-full bg-amber-500 flex-shrink-0"></div>
                              <span className="text-sm font-medium text-slate-900">{offer}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {claim.notes && (
                      <div className="mb-6 p-4 bg-gradient-to-br from-slate-50 via-slate-50/50 to-white rounded-2xl border-2 border-slate-200/60 shadow-md">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-slate-600" />
                          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Notes</h4>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{claim.notes}</p>
                      </div>
                    )}

                    {/* Footer - Dates */}
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Calendar className="h-3.5 w-3.5" />
                        <span className="font-medium">Submitted: {formatDate(claim.createdAt)}</span>
                        {claim.reviewedAt && (
                          <>
                            <span>•</span>
                            <span className="font-medium">Reviewed: {formatDate(claim.reviewedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

