"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { Users, Calendar, MapPin, User, CheckCircle, Loader2, Eye, XCircle, Filter, ChevronDown } from "lucide-react";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });

type GroupStay = {
  id: number;
  groupType: string;
  accommodationType: string;
  headcount: number;
  roomsNeeded: number;
  toRegion: string;
  toDistrict?: string | null;
  toWard?: string | null;
  toLocation?: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  user: { id: number; name: string; email: string; phone: string | null } | null;
  confirmedProperty: { id: number; title: string; type: string; status: string } | null;
  recommendedPropertyIds?: number[] | null;
  createdAt: string;
  // Arrangement fields
  arrPickup?: boolean;
  arrTransport?: boolean;
  arrMeals?: boolean;
  arrGuide?: boolean;
  arrEquipment?: boolean;
  pickupLocation?: string | null;
  pickupTime?: string | null;
  arrangementNotes?: string | null;
};

export default function OwnerGroupStaysPage() {
  const [groupStays, setGroupStays] = useState<GroupStay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // Always load all group stays for accurate filter counts
      const response = await api.get("/api/owner/group-stays", { params: {} });
      setGroupStays(response.data.items || []);
    } catch (err: any) {
      console.error("Failed to load group stays:", err);
      setGroupStays([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700 border-amber-200",
      PROCESSING: "bg-blue-100 text-blue-700 border-blue-200",
      CONFIRMED: "bg-green-100 text-green-700 border-green-200",
      COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
      CANCELED: "bg-red-100 text-red-700 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Calculate counts for filter tabs
  const filterCounts = useMemo(() => {
    return {
      all: groupStays.length,
      confirmed: groupStays.filter(gs => gs.status.toUpperCase() === 'CONFIRMED').length,
      completed: groupStays.filter(gs => gs.status.toUpperCase() === 'COMPLETED').length,
      canceled: groupStays.filter(gs => gs.status.toUpperCase() === 'CANCELED' || gs.status.toUpperCase() === 'CANCELLED').length,
    };
  }, [groupStays]);

  // Filter group stays based on selected status
  const filteredGroupStays = useMemo(() => {
    if (!selectedStatus) return groupStays;
    return groupStays.filter(gs => gs.status.toUpperCase() === selectedStatus.toUpperCase());
  }, [groupStays, selectedStatus]);

  const filterTabs: { key: string; label: string; icon: any; count: number }[] = [
    { key: '', label: 'All', icon: Users, count: filterCounts.all },
    { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle, count: filterCounts.confirmed },
    { key: 'COMPLETED', label: 'Completed', icon: CheckCircle, count: filterCounts.completed },
    { key: 'CANCELED', label: 'Canceled', icon: XCircle, count: filterCounts.canceled },
  ];

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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white border-2 border-brand-200 shadow-lg shadow-brand-500/10 mb-2 transition-all duration-300 hover:scale-105">
          <Users className="h-10 w-10 text-brand" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Group Stays Assigned to Me</h1>
          <p className="text-base text-slate-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            View and manage group stays assigned to you
          </p>
        </div>
      </div>

      {/* Filter Section */}
      <div className="flex flex-col items-center gap-4">
        {/* Filter Toggle Button */}
        {(() => {
          const activeTab = filterTabs.find(t => t.key === selectedStatus);
          const currentLabel = activeTab?.label || 'All Statuses';
          const currentCount = activeTab?.count || filterCounts.all;
          return (
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-brand hover:shadow-md transition-all duration-300 font-semibold text-sm text-slate-700"
            >
              <Filter className="h-4 w-4 text-brand" />
              <span>{currentLabel}</span>
              {currentCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
                  {currentCount}
                </span>
              )}
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
          );
        })()}

        {/* Filter Tabs - Collapsible */}
        {filtersOpen && (
          <div className="flex flex-wrap items-center justify-center gap-3 w-full animate-in fade-in slide-in-from-top-2 duration-200">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    setSelectedStatus(tab.key);
                    setFiltersOpen(false); // Close filters after selection
                  }}
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
        )}
      </div>

      {/* Group Stays List */}
      <div className="space-y-4">
        {filteredGroupStays.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">
              {selectedStatus ? `No ${filterTabs.find(t => t.key === selectedStatus)?.label.toLowerCase()} group stays` : 'No group stays assigned to you'}
            </p>
          </div>
        ) : (
          filteredGroupStays.map((gs) => (
            <div 
              key={gs.id} 
              className="group relative bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
            >
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-brand via-brand-500 to-brand-600"></div>
              
              <div className="pl-5 pr-4 py-4">
                <div className="flex items-center gap-4">
                  {/* Icon section - Smaller */}
                  <div className="flex-shrink-0">
                    <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center transition-all duration-300 group-hover:bg-brand/15 group-hover:scale-105">
                      <Users className="h-6 w-6 text-brand" />
                    </div>
                  </div>
                  
                  {/* Content section - Compact horizontal layout */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-brand transition-colors">
                        Group Stay #{gs.id}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(gs.status)}`}>
                        {gs.status}
                      </span>
                    </div>

                    {/* Compact info row */}
                    <div className="flex items-center gap-3 flex-wrap text-sm">
                      {/* Customer name */}
                      {gs.user && (
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-slate-700 font-medium">{gs.user.name || "N/A"}</span>
                        </div>
                      )}
                      
                      {/* Divider */}
                      {gs.user && <div className="h-3 w-px bg-slate-200"></div>}
                      
                      {/* Group type */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Type:</span>
                        <span className="text-slate-700 font-medium capitalize">{gs.groupType}</span>
                      </div>
                      
                      {/* Divider */}
                      <div className="h-3 w-px bg-slate-200"></div>
                      
                      {/* Headcount */}
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-700 font-medium">{gs.headcount} people</span>
                      </div>
                      
                      {/* Divider */}
                      <div className="h-3 w-px bg-slate-200"></div>
                      
                      {/* Accommodation Type */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">Accommodation:</span>
                        <span className="text-slate-700 font-medium capitalize">{gs.accommodationType}</span>
                      </div>
                      
                      {/* Divider */}
                      <div className="h-3 w-px bg-slate-200"></div>
                      
                      {/* Destination - Compact */}
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-slate-700 font-medium">{gs.toRegion}</span>
                      </div>
                      
                      {/* Dates - Compact */}
                      {(gs.checkIn || gs.checkOut) && (
                        <>
                          <div className="h-3 w-px bg-slate-200"></div>
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {gs.checkIn && (
                              <span className="text-slate-700 text-xs">{formatDate(gs.checkIn)}</span>
                            )}
                            {gs.checkIn && gs.checkOut && <span className="text-slate-400">→</span>}
                            {gs.checkOut && (
                              <span className="text-slate-700 text-xs">{formatDate(gs.checkOut)}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions - Eye icon only */}
                  <div className="flex-shrink-0">
                    <Link
                      href={`/owner/group-stays/${gs.id}`}
                      className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-brand hover:bg-brand/10 transition-all duration-300 hover:scale-110"
                      title="View Details"
                    >
                      <Eye className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

