"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Calendar, Building2, Clock, CheckCircle, LogOut, XCircle, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import LogoSpinner from "@/components/LogoSpinner";

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
  transportFare?: number | string | null;
  ownerBaseAmount?: number | string | null;
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
        // The reports API enforces a max window (~12 months). Keep the request within that
        // so we don't accidentally exclude current bookings due to server-side clamping.
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - 180);
        const toDate = new Date();
        toDate.setDate(toDate.getDate() + 180);
        
        const response = await api.get('/api/owner/reports/bookings', {
          params: {
            from: fromDate.toISOString().split('T')[0],
            to: toDate.toISOString().split('T')[0],
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-100">
          <LogoSpinner size="md" ariaLabel="Loading bookings" />
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-slate-900">Loading bookings…</div>
          <div className="text-sm text-slate-400 mt-1">Fetching your property data</div>
        </div>
      </div>
    );
  }

  const totalCheckedIn = list.filter(b => b.status.toUpperCase() === 'CHECKED_IN').length;
  const totalWaiting = list.filter(b => b.status.toUpperCase() === 'CONFIRMED' || b.status.toUpperCase() === 'NEW').length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Title + description */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Bookings</h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Track guest activity and booking status across all your properties.
                </p>
              </div>
            </div>

            {/* Right: quick-stat chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</span>
                <span className="text-sm font-extrabold text-slate-900">{filterCounts.all}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-semibold text-emerald-700">Checked-in</span>
                <span className="text-sm font-extrabold text-emerald-700">{totalCheckedIn}</span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="text-xs font-semibold text-amber-700">Waiting</span>
                <span className="text-sm font-extrabold text-amber-700">{totalWaiting}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter Tabs ─────────────────────────────────────────── */}
        <div className="px-4 sm:px-6 overflow-x-auto">
          <div className="flex items-center gap-0.5 min-w-max border-b-0 pb-0">
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
                  className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap border-b-2 ${
                    isActive
                      ? 'text-emerald-700 border-emerald-600'
                      : 'text-slate-500 border-transparent hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                      isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <div className="px-4 sm:px-6 py-6 space-y-4">
        {groupedBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200 py-20 px-8">
            <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Calendar className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-base font-semibold text-slate-800">No bookings found</p>
            <p className="text-sm text-slate-400 mt-1">Try selecting a different filter above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groupedBookings.map((group) => {
              const isExpanded = expandedHotels.has(group.key);
              const hasCheckedIn = group.checkedIn.length > 0;
              const hasNotCheckedIn = group.notCheckedIn.length > 0;
              const otherBookings = group.bookings.filter(b => {
                const s = b.status.toUpperCase();
                return s !== 'CHECKED_IN' && s !== 'CONFIRMED' && s !== 'NEW';
              });

              return (
                <div
                  key={group.key}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                >
                  {/* Property card header */}
                  <button
                    onClick={() => toggleHotel(group.key)}
                    className="w-full px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Property icon */}
                      <div className="h-11 w-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="h-5 w-5 text-emerald-600" />
                      </div>

                      {/* Name + badges */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 truncate text-[15px]">{group.property}</div>
                        <div className="mt-1.5 flex items-center flex-wrap gap-2">
                          {group.checkedIn.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle className="h-3 w-3" />
                              {group.checkedIn.length} Checked-in
                            </span>
                          )}
                          {group.notCheckedIn.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                              <Clock className="h-3 w-3" />
                              {group.notCheckedIn.length} Waiting
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                            {group.bookings.length} Total
                          </span>
                        </div>
                      </div>

                      {/* Chevron */}
                      <div className={`h-8 w-8 rounded-lg border flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        isExpanded
                          ? 'bg-emerald-600 border-emerald-600 text-white rotate-180'
                          : 'bg-slate-100 border-slate-200 text-slate-500'
                      }`}>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                    </div>
                  </button>

                  {/* Expanded booking list */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">

                      {/* Checked-in section */}
                      {hasCheckedIn && (
                        <div>
                          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Checked-in · {group.checkedIn.length}
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {group.checkedIn.map((booking) => (
                              <BookingRow key={booking.id} booking={booking} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} getStatusBadge={getStatusBadge} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Waiting section */}
                      {hasNotCheckedIn && (
                        <div>
                          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Waiting for check-in · {group.notCheckedIn.length}
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {group.notCheckedIn.map((booking) => (
                              <BookingRow key={booking.id} booking={booking} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} getStatusBadge={getStatusBadge} />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Other bookings section */}
                      {otherBookings.length > 0 && (
                        <div>
                          <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                              Other · {otherBookings.length}
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {otherBookings.map((booking) => (
                              <BookingRow key={booking.id} booking={booking} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} getStatusBadge={getStatusBadge} />
                            ))}
                          </div>
                        </div>
                      )}

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

// Booking Row — clean premium list row
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
      const diff = new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime();
      return Number.isFinite(diff) && diff > 0 ? Math.max(1, Math.ceil(diff / 86400000)) : 1;
    } catch { return 1; }
  })();

  const guestInitial = String(booking.guestName || 'G').trim().charAt(0).toUpperCase() || 'G';

  const safeAmount = (() => {
    const raw = booking.ownerBaseAmount ?? booking.totalAmount;
    const n = Number(typeof raw === 'string' ? raw.replace(/,/g, '') : String(raw));
    if (Number.isFinite(n)) return n;
    const total = Number(typeof booking.totalAmount === 'string' ? booking.totalAmount.replace(/,/g, '') : String(booking.totalAmount));
    const transport = Number(booking.transportFare ?? 0);
    return Number.isFinite(total) && Number.isFinite(transport) ? Math.max(0, total - transport) : 0;
  })();

  const formatCompact = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return formatDate(dateStr); }
  };

  const statusStripe = (() => {
    const s = booking.status.toUpperCase();
    if (s === 'CHECKED_IN') return 'bg-emerald-500';
    if (s === 'CHECKED_OUT') return 'bg-sky-400';
    if (s === 'CANCELLED' || s === 'CANCELED') return 'bg-red-400';
    if (s === 'PENDING') return 'bg-amber-400';
    return 'bg-slate-300';
  })();

  const avatarColor = (() => {
    const s = booking.status.toUpperCase();
    if (s === 'CHECKED_IN') return 'bg-emerald-50 border-emerald-100 text-emerald-700';
    if (s === 'CANCELLED' || s === 'CANCELED') return 'bg-red-50 border-red-100 text-red-700';
    return 'bg-slate-100 border-slate-200 text-slate-700';
  })();

  return (
    <Link
      href={`/owner/bookings/checked-in/${booking.id}`}
      className="block group no-underline"
    >
      <div className="relative flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors">
        {/* Status stripe */}
        <div className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${statusStripe}`} aria-hidden />

        {/* Guest avatar */}
        <div className={`h-9 w-9 rounded-xl border flex items-center justify-center flex-shrink-0 text-[13px] font-extrabold ${avatarColor}`}>
          {guestInitial}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[13px] font-semibold text-slate-900 truncate">
              {booking.guestName || "Guest"}
            </span>
            <span className="text-[11px] text-slate-400 flex-shrink-0">#{booking.id}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatCompact(booking.checkIn)} → {formatCompact(booking.checkOut)}
            </span>
            <span className="text-[11px] text-slate-400">·</span>
            <span className="text-[11px] text-slate-500">{nights}n</span>
            {isCheckedIn && checkedInTime && (
              <>
                <span className="text-[11px] text-slate-400">·</span>
                <span className="text-[11px] text-emerald-600 font-medium">In {checkedInTime}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: status + amount */}
        <div className="flex-shrink-0 flex items-center gap-3">
          {getStatusBadge(booking.status)}
          <div className="text-right">
            <div className="text-[13px] font-bold text-slate-900">{formatCurrency(safeAmount)}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
