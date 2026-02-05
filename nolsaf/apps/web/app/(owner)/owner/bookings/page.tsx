"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Calendar, Loader2, Building2, DollarSign, Clock, CheckCircle, LogOut, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

type Booking = {
  id: number;
  property: string; // Property title from API
  propertyId?: number;
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number | string;
  guestName?: string | null;
  checkedInAt?: string | null;
};

type FilterTab = 'all' | 'recent' | 'waiting' | 'checked-in' | 'checked-out' | 'cancelled';

export default function OwnerBookingsPage() {
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set());
  const router = useRouter();
  const searchParams = useSearchParams();

  const isValidTab = (v: string | null): v is FilterTab =>
    v === 'all' || v === 'recent' || v === 'waiting' || v === 'checked-in' || v === 'checked-out' || v === 'cancelled';

  // Allow deep-linking from sidebar: /owner/bookings?tab=checked-out
  useEffect(() => {
    const tab = searchParams?.get('tab') ?? null;
    if (isValidTab(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    let mounted = true;
    
    const loadBookings = async () => {
      try {
        // Use a wide date range to get all bookings (last 2 years to future)
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const twoYearsLater = new Date();
        twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
        
        const response = await api.get('/api/owner/reports/bookings', {
          params: {
            from: twoYearsAgo.toISOString().split('T')[0],
            to: twoYearsLater.toISOString().split('T')[0],
          }
        });
        
        if (!mounted) return;
        
        // Extract bookings from the table data
        const bookings = response.data?.table || [];
        setList(bookings);
      } catch (err: any) {
        console.error('Failed to load bookings:', err);
        if (mounted) setList([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadBookings();
    return () => { mounted = false; };
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return null;
    }
  };

  const toggleHotel = (hotelKey: string) => {
    setExpandedHotels(prev => {
      const next = new Set(prev);
      if (next.has(hotelKey)) {
        next.delete(hotelKey);
      } else {
        next.add(hotelKey);
      }
      return next;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const upper = status.toUpperCase();

    if (upper === 'NEW') {
      return (
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-sm border border-slate-200 bg-white/70 supports-[backdrop-filter]:bg-white/50 backdrop-blur-md text-slate-700 transition-all duration-300 group-hover:bg-gradient-to-r group-hover:from-brand-600 group-hover:to-brand-700 group-hover:text-white group-hover:border-transparent"
        >
          New
        </span>
      );
    }

    const statusColors: Record<string, { bg: string; text: string; border: string }> = {
      'CONFIRMED': { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200' },
      'CHECKED_IN': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      'CHECKED_OUT': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      'CANCELLED': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'CANCELED': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'PENDING': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    };
    
    const colors = statusColors[upper] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${colors.bg} ${colors.text} border ${colors.border}`}>
        {status}
      </span>
    );
  };

  // Calculate counts for filter tabs
  const filterCounts = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    
    return {
      all: list.length,
      recent: list.filter(b => {
        const checkInDate = new Date(b.checkIn);
        return checkInDate >= thirtyDaysAgo && checkInDate <= thirtyDaysLater;
      }).length,
      waiting: list.filter(b => b.status.toUpperCase() === 'CONFIRMED').length,
      'checked-in': list.filter(b => b.status.toUpperCase() === 'CHECKED_IN').length,
      'checked-out': list.filter(b => b.status.toUpperCase() === 'CHECKED_OUT').length,
      cancelled: list.filter(b => 
        b.status.toUpperCase() === 'CANCELLED' || 
        b.status.toUpperCase() === 'CANCELED'
      ).length,
    };
  }, [list]);

  // Filter bookings based on active tab
  const filteredBookings = useMemo(() => {
    if (activeTab === 'all') return list;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    
    switch (activeTab) {
      case 'recent':
        return list.filter(booking => {
          const checkInDate = new Date(booking.checkIn);
          return checkInDate >= thirtyDaysAgo && checkInDate <= thirtyDaysLater;
        });
      case 'waiting':
        return list.filter(booking => booking.status.toUpperCase() === 'CONFIRMED');
      case 'checked-in':
        return list.filter(booking => booking.status.toUpperCase() === 'CHECKED_IN');
      case 'checked-out':
        return list.filter(booking => booking.status.toUpperCase() === 'CHECKED_OUT');
      case 'cancelled':
        return list.filter(booking => 
          booking.status.toUpperCase() === 'CANCELLED' || 
          booking.status.toUpperCase() === 'CANCELED'
        );
      default:
        return list;
    }
  }, [list, activeTab]);

  // Group bookings by hotel/property
  const groupedBookings = useMemo(() => {
    const groups: Record<string, {
      property: string;
      propertyId?: number;
      bookings: Booking[];
      checkedIn: Booking[];
      notCheckedIn: Booking[];
    }> = {};

    filteredBookings.forEach(booking => {
      const key = booking.propertyId ? `${booking.propertyId}` : booking.property;
      if (!groups[key]) {
        groups[key] = {
          property: booking.property,
          propertyId: booking.propertyId,
          bookings: [],
          checkedIn: [],
          notCheckedIn: [],
        };
      }
      groups[key].bookings.push(booking);
      if (booking.status.toUpperCase() === 'CHECKED_IN') {
        groups[key].checkedIn.push(booking);
      } else if (booking.status.toUpperCase() === 'CONFIRMED' || booking.status.toUpperCase() === 'NEW') {
        groups[key].notCheckedIn.push(booking);
      }
    });

    return Object.entries(groups).map(([key, data]) => ({
      key,
      ...data,
    }));
  }, [filteredBookings]);

  const filterTabs: { key: FilterTab; label: string; icon: any; count: number }[] = [
    { key: 'all', label: 'All', icon: Calendar, count: filterCounts.all },
    { key: 'recent', label: 'Recent', icon: Clock, count: filterCounts.recent },
    { key: 'waiting', label: 'Waiting for Check-in', icon: Clock, count: filterCounts.waiting },
    { key: 'checked-in', label: 'Checked-in', icon: CheckCircle, count: filterCounts['checked-in'] },
    { key: 'checked-out', label: 'Checked-out', icon: LogOut, count: filterCounts['checked-out'] },
    { key: 'cancelled', label: 'Cancel Requests', icon: XCircle, count: filterCounts.cancelled },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-brand-100 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">My Bookings</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">Loading your bookings…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#052F2B] via-slate-950 to-[#081A2A]">
      {/* Background accents */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-brand/25 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-sky-500/15 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(255,255,255,0.08),transparent_60%)]" aria-hidden="true" />

      <div className="relative z-10 space-y-8 pb-10 pt-10 px-4 sm:px-6">
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white/10 border border-white/15 shadow-lg shadow-black/30 mb-2 transition-all duration-300 hover:scale-105 backdrop-blur-md">
            <Calendar className="h-10 w-10 text-brand" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">My Bookings</h1>
            <p className="text-base text-slate-300 mt-3 max-w-2xl mx-auto leading-relaxed">
              View and manage all bookings for your approved properties. Track guest information and booking status.
            </p>
          </div>
        </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                try {
                  const next = new URLSearchParams(searchParams?.toString() ?? "");
                  if (tab.key === 'all') next.delete('tab');
                  else next.set('tab', tab.key);
                  router.replace(`/owner/bookings${next.toString() ? `?${next.toString()}` : ''}`);
                } catch {}
              }}
              className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl border transition-all duration-300 font-semibold text-sm backdrop-blur-md ${
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white border-transparent shadow-lg shadow-black/30 scale-105'
                  : 'bg-white/10 text-slate-100 border-white/15 hover:bg-white/15 hover:border-white/20 hover:shadow-md hover:scale-105'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-200/80'}`} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  isActive 
                    ? 'bg-white/25 text-white backdrop-blur-sm' 
                    : 'bg-white/15 text-slate-100'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bookings by Hotel */}
      {groupedBookings.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center bg-white/10 rounded-2xl border border-white/15 p-16 shadow-lg shadow-black/30 backdrop-blur-md">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white/10 mb-6 border border-white/15">
            <Calendar className="h-8 w-8 text-slate-200/70" />
          </div>
          <p className="text-base font-semibold text-white mb-2">No bookings found</p>
          <p className="text-sm text-slate-300">Try selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {groupedBookings.map((group) => {
            const isExpanded = expandedHotels.has(group.key);
            const hasCheckedIn = group.checkedIn.length > 0;
            const hasNotCheckedIn = group.notCheckedIn.length > 0;
            
            return (
              <div
                key={group.key}
                className="group relative rounded-2xl overflow-hidden border border-white/15 bg-white/10 backdrop-blur-md shadow-lg shadow-black/30 hover:bg-white/12 transition-colors"
              >
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-brand via-brand-500 to-brand-600" aria-hidden="true"></div>
                
                {/* Hotel Header */}
                <button
                  onClick={() => toggleHotel(group.key)}
                  className="relative w-full p-5 sm:p-6 text-left transition-colors hover:bg-white/10"
                >
                  <div className="flex items-center gap-4 sm:gap-5">
                    {/* Icon section */}
                    <div className="flex-shrink-0">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/15 backdrop-blur-md">
                        <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-brand" />
                      </div>
                    </div>
                    
                    {/* Content section */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-white truncate">
                        {group.property}
                      </h3>
                      
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 text-green-100 border border-green-400/20 px-3 py-1">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-sm font-semibold">{group.checkedIn.length}</span>
                          <span className="text-xs font-medium opacity-80">Checked-in</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 text-amber-100 border border-amber-400/20 px-3 py-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-semibold">{group.notCheckedIn.length}</span>
                          <span className="text-xs font-medium opacity-80">Waiting</span>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 text-slate-100 border border-white/15 px-3 py-1">
                          <span className="text-sm font-semibold">{group.bookings.length}</span>
                          <span className="text-xs font-medium opacity-80">Total</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expand button */}
                    <div className="flex-shrink-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 border ${
                        isExpanded 
                          ? 'bg-brand text-white rotate-180 border-brand' 
                          : 'bg-white/10 text-slate-100 border-white/15 group-hover:bg-white/15'
                      }`}>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="bg-white/80 backdrop-blur-md">
                    <div className="p-5 sm:p-6 space-y-6 sm:space-y-8">
                      {/* Checked-in Guests Section */}
                      {hasCheckedIn && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-slate-900">Checked-in Guests</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{group.checkedIn.length} guest{group.checkedIn.length !== 1 ? 's' : ''} currently checked in</p>
                            </div>
                          </div>
                          <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 overflow-hidden">
                            <div className="divide-y divide-slate-200/80">
                              {group.checkedIn.map((booking) => (
                                <BookingRow key={booking.id} booking={booking} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} getStatusBadge={getStatusBadge} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Not Checked-in Guests Section */}
                      {hasNotCheckedIn && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                              <Clock className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <h4 className="text-base font-bold text-slate-900">Waiting for Check-in</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{group.notCheckedIn.length} guest{group.notCheckedIn.length !== 1 ? 's' : ''} awaiting arrival</p>
                            </div>
                          </div>
                          <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 overflow-hidden">
                            <div className="divide-y divide-slate-200/80">
                              {group.notCheckedIn.map((booking) => (
                                <BookingRow key={booking.id} booking={booking} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} getStatusBadge={getStatusBadge} />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Other Status Bookings */}
                      {group.bookings.filter(b => {
                        const status = b.status.toUpperCase();
                        return status !== 'CHECKED_IN' && status !== 'CONFIRMED' && status !== 'NEW';
                      }).length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-slate-600" />
                            </div>
                            <h4 className="text-base font-bold text-slate-900">Other Bookings</h4>
                          </div>
                          <div className="rounded-2xl bg-white ring-1 ring-slate-200/70 overflow-hidden">
                            <div className="divide-y divide-slate-200/80">
                              {group.bookings
                                .filter(b => {
                                  const status = b.status.toUpperCase();
                                  return status !== 'CHECKED_IN' && status !== 'CONFIRMED' && status !== 'NEW';
                                })
                                .map((booking) => (
                                  <BookingRow key={booking.id} booking={booking} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} getStatusBadge={getStatusBadge} />
                                ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

// Booking Row (premium list model)
function BookingRow({ 
  booking, 
  formatDate, 
  formatDateTime, 
  formatCurrency, 
  getStatusBadge 
}: { 
  booking: Booking; 
  formatDate: (date: string) => string;
  formatDateTime: (date: string | null | undefined) => string | null;
  formatCurrency: (amount: number) => string;
  getStatusBadge: (status: string) => JSX.Element;
}) {
  const isCheckedIn = booking.status.toUpperCase() === 'CHECKED_IN';
  const checkedInTime = formatDateTime(booking.checkedInAt);
  const nights = (() => {
    try {
      const inD = new Date(booking.checkIn);
      const outD = new Date(booking.checkOut);
      const diff = outD.getTime() - inD.getTime();
      if (!Number.isFinite(diff) || diff <= 0) return 1;
      return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    } catch {
      return 1;
    }
  })();

  const guestInitial = String(booking.guestName || 'G').trim().charAt(0).toUpperCase() || 'G';
  const safeAmount = (() => {
    const raw = booking.totalAmount;
    const normalized = typeof raw === 'string' ? raw.replace(/,/g, '') : String(raw);
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  })();

  const formatCompact = (dateStr: string, includeYear: boolean) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', includeYear ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' });
    } catch {
      return formatDate(dateStr);
    }
  };

  const showYears = (() => {
    try {
      const inY = new Date(booking.checkIn).getFullYear();
      const outY = new Date(booking.checkOut).getFullYear();
      return Number.isFinite(inY) && Number.isFinite(outY) && inY !== outY;
    } catch {
      return true;
    }
  })();

  const statusMeta = (() => {
    const status = booking.status.toUpperCase();
    if (status === 'CHECKED_IN') return { stripe: 'bg-green-600', dot: 'bg-green-600' };
    if (status === 'CHECKED_OUT') return { stripe: 'bg-emerald-600', dot: 'bg-emerald-600' };
    if (status === 'CANCELLED' || status === 'CANCELED') return { stripe: 'bg-red-600', dot: 'bg-red-600' };
    if (status === 'PENDING') return { stripe: 'bg-amber-600', dot: 'bg-amber-600' };
    // CONFIRMED / NEW / default
    return { stripe: 'bg-brand', dot: 'bg-brand' };
  })();

  return (
    <Link
      href={`/owner/bookings/checked-in/${booking.id}`}
      className="block group no-underline hover:no-underline"
      title="View booking details"
    >
      <div className="relative">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${statusMeta.stripe}`} aria-hidden="true" />

        {/* Premium hover gradient */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-[linear-gradient(90deg,rgba(6,182,212,0.10),rgba(255,255,255,0.0),rgba(99,102,241,0.10))] bg-[length:200%_200%] bg-[position:0%_50%] group-hover:bg-[position:100%_50%] transition-[opacity,background-position] duration-700"
          aria-hidden="true"
        />

        <div className="relative px-4 py-4 sm:px-5 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-2xl bg-slate-100 ring-1 ring-slate-200/70 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-extrabold text-slate-700">{guestInitial}</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} aria-hidden="true" />
                    <span className="text-sm font-bold text-slate-900 truncate">
                      {booking.guestName ? booking.guestName : "Guest"}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-500">Booking #{booking.id}</div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {getStatusBadge(booking.status)}
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 shadow-sm ring-1 ring-slate-200/70 bg-white/70 supports-[backdrop-filter]:bg-white/50 backdrop-blur-md group-hover:bg-white/75 transition-colors">
                <Calendar className="h-4 w-4 text-brand" />
                <span className="text-xs font-semibold text-slate-700">{formatCompact(booking.checkIn, showYears)}</span>
                <span className="text-xs text-slate-400">→</span>
                <span className="text-xs font-semibold text-slate-700">{formatCompact(booking.checkOut, showYears)}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 shadow-sm ring-1 ring-slate-200/70 bg-white/70 supports-[backdrop-filter]:bg-white/50 backdrop-blur-md group-hover:bg-white/75 transition-colors">
                <span className="text-xs text-slate-500">Nights</span>
                <span className="text-xs font-extrabold text-slate-900">{nights}</span>
              </div>
              {isCheckedIn && checkedInTime && (
                <div className="inline-flex items-center gap-2 rounded-full bg-green-50 text-green-800 border border-green-200 px-3 py-1.5">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-xs font-semibold">Checked-in</span>
                  <span className="text-xs opacity-80 truncate">{checkedInTime}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <span>Amount</span>
              </div>
              <div className="text-sm font-extrabold text-slate-900">{formatCurrency(safeAmount)}</div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}


