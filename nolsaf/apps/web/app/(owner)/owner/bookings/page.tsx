"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Calendar, Building2, Clock, CheckCircle, LogOut, XCircle, ChevronDown, ArrowRight } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="h-14 w-14 rounded-2xl bg-[#02665e]/10 border border-[#02665e]/20 flex items-center justify-center">
          <LogoSpinner size="md" ariaLabel="Loading bookings" />
        </div>
        <div className="text-center">
          <div className="text-base font-bold text-slate-800">Loading your bookings…</div>
          <div className="text-sm text-slate-400 mt-1">Fetching activity across all properties</div>
        </div>
      </div>
    );
  }

  const totalCheckedIn   = list.filter(b => b.status.toUpperCase() === 'CHECKED_IN').length;
  const totalWaiting     = list.filter(b => b.status.toUpperCase() === 'CONFIRMED' || b.status.toUpperCase() === 'NEW').length;
  const totalCheckedOut  = list.filter(b => b.status.toUpperCase() === 'CHECKED_OUT').length;
  const totalCancelled   = list.filter(b => b.status.toUpperCase() === 'CANCELLED' || b.status.toUpperCase() === 'CANCELED').length;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const heroKpis = [
    { label: 'Total',       sub: 'Bookings',   value: filterCounts.all,  bar: 'bg-slate-300',   num: 'text-slate-900',   light: 'bg-slate-50'   },
    { label: 'Checked',     sub: 'In',         value: totalCheckedIn,    bar: 'bg-emerald-400', num: 'text-emerald-700', light: 'bg-emerald-50' },
    { label: 'Awaiting',    sub: 'Arrival',    value: totalWaiting,      bar: 'bg-amber-400',   num: 'text-amber-700',   light: 'bg-amber-50'   },
    { label: 'Checked',     sub: 'Out',        value: totalCheckedOut,   bar: 'bg-sky-400',     num: 'text-sky-700',     light: 'bg-sky-50'     },
    { label: 'Cancelled',   sub: '',           value: totalCancelled,    bar: 'bg-red-400',     num: 'text-red-600',     light: 'bg-red-50'     },
  ];

  return (
    <div className="relative overflow-x-hidden" style={{ background: 'linear-gradient(160deg, #edf8f7 0%, #f9fffe 20%, #ffffff 55%, #f7fafc 100%)' }}>
      {/* ── ambient decorative blobs ────────────────────────────────── */}
      <div className="pointer-events-none absolute top-[55vh] -left-40 h-[500px] w-[500px] rounded-full opacity-[0.06] blur-[100px]" style={{ background: '#02665e' }} />
      <div className="pointer-events-none absolute top-[30vh] -right-40 h-[420px] w-[420px] rounded-full opacity-[0.04] blur-[90px]" style={{ background: '#038076' }} />
      <div className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[300px] w-[700px] rounded-full opacity-[0.03] blur-[80px]" style={{ background: '#02665e' }} />

      {/* ══ HERO BAND ════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden mx-4 sm:mx-8 mt-5 rounded-3xl" style={{ background: 'linear-gradient(135deg, #024d47 0%, #02665e 60%, #038076 100%)' }}>
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-48 w-96 rounded-full bg-teal-300/10 blur-3xl" />
        {/* dot grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        {/* large watermark icon */}
        <Calendar className="pointer-events-none absolute -right-6 -bottom-6 h-52 w-52 text-white/[0.04]" aria-hidden />

        <div className="relative px-4 sm:px-8 pt-9 pb-14">
          <div className="flex items-start justify-between gap-4">
            <div>
              {/* breadcrumb label */}
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block h-[3px] w-5 rounded-full bg-white/30" />
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">Owner · Dashboard</span>
              </div>
              <h1 className="text-3xl sm:text-[2.6rem] font-black text-white tracking-tight leading-none">
                My Bookings
              </h1>
              <p className="mt-2 text-[13px] text-white/50 font-medium">
                Live guest activity across all your properties
              </p>
            </div>
            {/* today's date — hidden on very small screens */}
            <div className="hidden sm:flex flex-col items-end flex-shrink-0 pt-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Today</span>
              <span className="text-[13px] font-bold text-white/60 mt-0.5 text-right">{today}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ KPI CARDS — overlap hero bottom ═══════════════════════════ */}
      <div className="px-4 sm:px-8 -mt-7 pb-0 relative z-10">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {heroKpis.map((kpi) => (
            <div key={kpi.label + kpi.sub}
              className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] border border-white/80 px-2.5 py-3 sm:px-3.5 sm:py-4 flex flex-col relative overflow-hidden">
              {/* colored top bar */}
              <div className={`absolute top-0 inset-x-0 h-[3px] rounded-t-2xl ${kpi.bar}`} />
              <div className={`text-2xl sm:text-[2rem] font-black leading-none ${kpi.num} mt-1`}>{kpi.value}</div>
              <div className="mt-1.5 leading-tight">
                <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400">{kpi.label}</div>
                {kpi.sub && <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400">{kpi.sub}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FILTER TABS — underline style ═════════════════════════════ */}
      <div className="px-4 sm:px-8 pt-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/70 overflow-x-auto">
          <div className="flex items-center min-w-max border-b border-slate-100">
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
                  className={`relative flex items-center gap-2 px-4 py-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 border-b-2 -mb-px ${
                    isActive
                      ? 'text-[#02665e] border-[#02665e]'
                      : 'text-slate-400 border-transparent hover:text-slate-700 hover:border-slate-200'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-[#02665e]' : 'text-slate-300'}`} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[9px] font-black ${
                      isActive ? 'bg-[#02665e] text-white' : 'bg-slate-100 text-slate-500'
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

      {/* ══ PROPERTY CARDS ════════════════════════════════════════════ */}
      <div className="px-4 sm:px-8 pt-5 pb-12 space-y-3">
        <div className="flex items-center gap-3 px-1 mb-1">
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">
            {groupedBookings.length} Propert{groupedBookings.length === 1 ? 'y' : 'ies'}
          </span>
          <div className="flex-1 h-px bg-slate-200/70" />
        </div>

        {groupedBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-200 py-20 px-8 shadow-sm">
            <div className="h-16 w-16 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-5">
              <Calendar className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-base font-bold text-slate-800">No bookings found</p>
            <p className="text-sm text-slate-400 mt-1">Try a different filter above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {groupedBookings.map((group) => {
              const isExpanded = expandedHotels.has(group.key);
              const hasCheckedIn    = group.checkedIn.length > 0;
              const hasNotCheckedIn = group.notCheckedIn.length > 0;
              const otherBookings   = group.bookings.filter(b => {
                const s = b.status.toUpperCase();
                return s !== 'CHECKED_IN' && s !== 'CONFIRMED' && s !== 'NEW';
              });
              const isLive = group.checkedIn.length > 0;

              // Compute total revenue for this property group
              const groupRevenue = group.bookings.reduce((sum, b) => {
                const v = Number(String(b.ownerBaseAmount ?? b.totalAmount ?? 0).replace(/,/g, ''));
                return sum + (Number.isFinite(v) && v > 0 ? v : 0);
              }, 0);

              const accentBorder = isLive ? 'border-l-emerald-400' : hasNotCheckedIn ? 'border-l-amber-400' : 'border-l-slate-200';
              const accentIcon   = isLive ? 'bg-emerald-50 text-emerald-600' : hasNotCheckedIn ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-400';

              return (
                <div
                  key={group.key}
                  className={`bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 border-l-4 ${accentBorder} shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden`}
                >
                  {/* ── Card header ── */}
                  <button
                    onClick={() => toggleHotel(group.key)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center gap-3.5 px-4 sm:px-5 py-4 hover:bg-slate-50/70 transition-colors duration-150">
                      {/* Property icon */}
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accentIcon}`}>
                        <Building2 className="h-5 w-5" />
                      </div>

                      {/* Text block */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {isLive && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 flex-shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-white/70 animate-pulse" />
                              LIVE
                            </span>
                          )}
                          <span className="text-[14px] font-bold text-slate-900 truncate leading-tight">{group.property}</span>
                        </div>
                        <div className="flex items-center flex-wrap gap-1.5">
                          {group.checkedIn.length > 0 && (
                            <StatusPill icon={<CheckCircle className="h-3 w-3" />} label={`${group.checkedIn.length} In`} color="emerald" />
                          )}
                          {group.notCheckedIn.length > 0 && (
                            <StatusPill icon={<Clock className="h-3 w-3" />} label={`${group.notCheckedIn.length} Waiting`} color="amber" />
                          )}
                          {otherBookings.length > 0 && (
                            <StatusPill icon={<LogOut className="h-3 w-3" />} label={`${otherBookings.length} Other`} color="slate" />
                          )}
                        </div>
                      </div>

                      {/* Revenue + toggle */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {groupRevenue > 0 && (
                          <div className="hidden sm:block text-right">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Revenue</div>
                            <div className="text-[13px] font-black text-slate-800 tabular-nums">
                              {new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(groupRevenue)}
                            </div>
                          </div>
                        )}
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border transition-all duration-300 ${
                          isExpanded ? 'bg-[#02665e] border-[#02665e]' : 'bg-slate-100 border-slate-200 hover:border-slate-300'
                        }`}>
                          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'text-white rotate-180' : 'text-slate-500'}`} />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* ── Expanded content ── */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      {hasCheckedIn && (
                        <BookingSection
                          label="Checked-in"
                          count={group.checkedIn.length}
                          dotClass="bg-emerald-500"
                          labelClass="text-emerald-700"
                          bgClass="bg-emerald-50/50"
                        >
                          {group.checkedIn.map(b => (
                            <BookingRow key={b.id} booking={b} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} />
                          ))}
                        </BookingSection>
                      )}
                      {hasNotCheckedIn && (
                        <BookingSection
                          label="Awaiting arrival"
                          count={group.notCheckedIn.length}
                          dotClass="bg-amber-400"
                          labelClass="text-amber-700"
                          bgClass="bg-amber-50/40"
                        >
                          {group.notCheckedIn.map(b => (
                            <BookingRow key={b.id} booking={b} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} />
                          ))}
                        </BookingSection>
                      )}
                      {otherBookings.length > 0 && (
                        <BookingSection
                          label="Other"
                          count={otherBookings.length}
                          dotClass="bg-slate-300"
                          labelClass="text-slate-500"
                          bgClass="bg-slate-50/60"
                        >
                          {otherBookings.map(b => (
                            <BookingRow key={b.id} booking={b} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} />
                          ))}
                        </BookingSection>
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

/* ──────────────────────────────────────────────────────────────────
   StatusPill  — tiny coloured badge for the property card header
────────────────────────────────────────────────────────────────── */
function StatusPill({ icon, label, color }: { icon: React.ReactNode; label: string; color: 'emerald' | 'amber' | 'slate' | 'sky' | 'red' }) {
  const styles = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50  text-amber-700  border-amber-200',
    slate:   'bg-slate-100 text-slate-600  border-slate-200',
    sky:     'bg-sky-50    text-sky-700    border-sky-200',
    red:     'bg-red-50    text-red-700    border-red-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${styles[color]}`}>
      {icon}{label}
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────────
   BookingSection  — expandable section label inside a property card
────────────────────────────────────────────────────────────────── */
function BookingSection({ label, count, dotClass, labelClass, bgClass, children }: {
  label: string; count: number; dotClass: string; labelClass: string; bgClass: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div className={`flex items-center gap-2.5 px-5 py-2 border-b border-slate-100 ${bgClass}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        <span className={`text-[11px] font-bold uppercase tracking-widest ${labelClass}`}>{label}</span>
        <span className="ml-auto text-[11px] font-semibold text-slate-400">{count}</span>
      </div>
      <div className="divide-y divide-slate-100/80">{children}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   BookingRow  — single booking entry inside an expanded property card
────────────────────────────────────────────────────────────────── */
function BookingRow({
  booking,
  formatDate,
  formatDateTime,
  formatCurrency,
}: {
  booking: Booking;
  formatDate: (d: string) => string;
  formatDateTime: (d: string | null | undefined) => string | null;
  formatCurrency: (n: number) => string;
}) {
  const s = booking.status.toUpperCase();
  const isCheckedIn = s === 'CHECKED_IN';
  const checkedInTime = formatDateTime(booking.checkedInAt);

  const nights = (() => {
    try {
      const diff = new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime();
      return Number.isFinite(diff) && diff > 0 ? Math.max(1, Math.ceil(diff / 86400000)) : 1;
    } catch { return 1; }
  })();

  const guestInitial = String(booking.guestName || 'G').trim().charAt(0).toUpperCase() || 'G';

  const safeAmount = (() => {
    const toNum = (v: any) => Number(typeof v === 'string' ? v.replace(/,/g, '') : String(v ?? 0));
    const oba = toNum(booking.ownerBaseAmount);
    if (Number.isFinite(oba) && oba > 0) return oba;
    const total = toNum(booking.totalAmount);
    if (Number.isFinite(total) && total > 0) return total;
    return 0;
  })();

  const fmtDay = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return formatDate(d); }
  };

  const statusCfg: Record<string, { pill: string; label: string; avatarBg: string }> = {
    CHECKED_IN:  { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',     label: 'Checked-in',  avatarBg: 'bg-emerald-500 text-white'  },
    CHECKED_OUT: { pill: 'bg-sky-50    text-sky-700    border-sky-200',           label: 'Checked-out', avatarBg: 'bg-sky-100     text-sky-700'   },
    CONFIRMED:   { pill: 'bg-teal-50   text-teal-700  border-teal-200',           label: 'Confirmed',   avatarBg: 'bg-[#02665e]   text-white'     },
    NEW:         { pill: 'bg-teal-50   text-teal-700  border-teal-200',           label: 'New',         avatarBg: 'bg-[#02665e]   text-white'     },
    PENDING:     { pill: 'bg-amber-50  text-amber-700 border-amber-200',          label: 'Pending',     avatarBg: 'bg-amber-100   text-amber-700' },
    CANCELLED:   { pill: 'bg-red-50    text-red-600   border-red-200',            label: 'Cancelled',   avatarBg: 'bg-red-100     text-red-600'   },
    CANCELED:    { pill: 'bg-red-50    text-red-600   border-red-200',            label: 'Cancelled',   avatarBg: 'bg-red-100     text-red-600'   },
  };
  const cfg = statusCfg[s] ?? { pill: 'bg-slate-100 text-slate-600 border-slate-200', label: booking.status, avatarBg: 'bg-slate-200 text-slate-600' };

  return (
    <Link href={`/owner/bookings/checked-in/${booking.id}`} className="block group no-underline" style={{ textDecoration: 'none' }}>
      <div className="flex items-center gap-3.5 px-4 sm:px-5 py-3.5 hover:bg-slate-50/80 transition-colors duration-150">

        {/* Circle guest avatar */}
        <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 text-[14px] font-black shadow-sm ${cfg.avatarBg}`}>
          {guestInitial}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Row 1: name + amount */}
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-bold text-slate-900 truncate flex-1" style={{ textDecoration: 'none' }}>
              {booking.guestName || 'Guest'}
            </span>
            <span className={`text-[13px] font-black tabular-nums flex-shrink-0 ${safeAmount > 0 ? 'text-[#02665e]' : 'text-slate-400'}`}>
              {formatCurrency(safeAmount)}
            </span>
          </div>
          {/* Row 2: dates · nights · status */}
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-medium">
              {fmtDay(booking.checkIn)} – {fmtDay(booking.checkOut)}
            </span>
            <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-px text-[10px] font-bold text-slate-500 flex-shrink-0">
              {nights}n
            </span>
            <span className={`inline-flex items-center rounded-full border px-2 py-px text-[10px] font-bold tracking-wide flex-shrink-0 ${cfg.pill}`}>
              {cfg.label}
            </span>
            {isCheckedIn && checkedInTime && (
              <span className="text-[11px] text-emerald-600 font-semibold flex-shrink-0">
                · {checkedInTime}
              </span>
            )}
          </div>
        </div>

        {/* Subtle arrow */}
        <ArrowRight className="h-4 w-4 text-slate-200 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-150 flex-shrink-0" />
      </div>
    </Link>
  );
}



