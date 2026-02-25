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
      <div className="min-h-screen bg-[#02665e] flex flex-col items-center justify-center gap-5">
        <div className="h-16 w-16 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center">
          <LogoSpinner size="md" ariaLabel="Loading bookings" />
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-white">Loading your bookings…</div>
          <div className="text-sm text-white/60 mt-1">Fetching activity across all properties</div>
        </div>
      </div>
    );
  }

  const totalCheckedIn   = list.filter(b => b.status.toUpperCase() === 'CHECKED_IN').length;
  const totalWaiting     = list.filter(b => b.status.toUpperCase() === 'CONFIRMED' || b.status.toUpperCase() === 'NEW').length;
  const totalCheckedOut  = list.filter(b => b.status.toUpperCase() === 'CHECKED_OUT').length;
  const totalCancelled   = list.filter(b => b.status.toUpperCase() === 'CANCELLED' || b.status.toUpperCase() === 'CANCELED').length;

  const heroKpis = [
    { label: 'Total Bookings', value: filterCounts.all,  dot: 'bg-slate-400',    num: 'text-slate-900'   },
    { label: 'Checked In',     value: totalCheckedIn,    dot: 'bg-emerald-400',  num: 'text-emerald-700' },
    { label: 'Awaiting',       value: totalWaiting,      dot: 'bg-amber-400',    num: 'text-amber-700'   },
    { label: 'Checked Out',    value: totalCheckedOut,   dot: 'bg-sky-400',      num: 'text-sky-700'     },
    { label: 'Cancelled',      value: totalCancelled,    dot: 'bg-red-400',      num: 'text-red-700'     },
  ];

  return (
    <div className="min-h-screen bg-white">

      {/* ══ HERO BAND ═══════════════════════════════════════════════ */}
      <div className="relative overflow-hidden bg-[#02665e]">
        {/* subtle radial glow */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-[320px] w-[320px] rounded-full bg-teal-400/10 blur-3xl" />
        {/* dot-grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />

        <div className="relative px-4 sm:px-6 pt-8 pb-8">
          {/* Title row */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Calendar className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-none">My Bookings</h1>
              <p className="mt-1.5 text-sm text-white/60">Live guest activity across all your properties</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══ KPI STRIP — outside hero, clean white cards ═══════════ */}
      <div className="px-4 sm:px-6 -mt-1 pb-2">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {heroKpis.map((kpi) => (
            <div
              key={kpi.label}
              className="bg-white rounded-2xl shadow-lg border border-slate-200 px-3 py-3.5 sm:px-4 sm:py-4 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${kpi.dot}`} />
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-400 leading-tight">
                  {kpi.label}
                </span>
              </div>
              <div className={`text-2xl sm:text-3xl font-extrabold leading-none mt-1 ${kpi.num}`}>{kpi.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══ FILTER TABS ═════════════════════════════════════════════ */}
      <div className="px-4 sm:px-6 pt-4 pb-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-1.5 overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
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
                  className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#02665e] text-white shadow-md shadow-[#02665e]/30'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-white/80' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
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

      {/* ══ PROPERTY CARDS ══════════════════════════════════════════ */}
      <div className="px-4 sm:px-6 pb-10 space-y-4">
        <p className="text-[13px] font-semibold text-slate-400 uppercase tracking-widest pl-1">
          {groupedBookings.length} Propert{groupedBookings.length === 1 ? 'y' : 'ies'}
        </p>
        {groupedBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-slate-200 py-20 px-8 shadow-sm">
            <div className="h-16 w-16 rounded-3xl bg-slate-100 flex items-center justify-center mb-5">
              <Calendar className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-lg font-bold text-slate-800">No bookings found</p>
            <p className="text-sm text-slate-400 mt-1">Try a different filter above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groupedBookings.map((group) => {
              const isExpanded = expandedHotels.has(group.key);
              const hasCheckedIn   = group.checkedIn.length > 0;
              const hasNotCheckedIn = group.notCheckedIn.length > 0;
              const otherBookings  = group.bookings.filter(b => {
                const s = b.status.toUpperCase();
                return s !== 'CHECKED_IN' && s !== 'CONFIRMED' && s !== 'NEW';
              });

              // Dominant status colour for card accent
              const accentBg   = group.checkedIn.length > 0 ? 'bg-emerald-500' : group.notCheckedIn.length > 0 ? 'bg-amber-500' : 'bg-slate-400';
              const accentText = group.checkedIn.length > 0 ? 'text-emerald-600' : group.notCheckedIn.length > 0 ? 'text-amber-600' : 'text-slate-500';
              const accentRing = group.checkedIn.length > 0 ? 'ring-emerald-100 bg-emerald-50' : group.notCheckedIn.length > 0 ? 'ring-amber-100 bg-amber-50' : 'ring-slate-100 bg-slate-50';

              return (
                <div
                  key={group.key}
                  className="bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden"
                >
                  {/* ── Card header ── */}
                  <button
                    onClick={() => toggleHotel(group.key)}
                    className="w-full text-left group"
                  >
                    {/* Top accent stripe */}
                    <div className={`h-1.5 w-full ${accentBg}`} />

                    <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors">
                      {/* Property icon */}
                      <div className={`h-12 w-12 rounded-2xl ring-1 flex items-center justify-center flex-shrink-0 ${accentRing}`}>
                        <Building2 className={`h-6 w-6 ${accentText}`} />
                      </div>

                      {/* Text block */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-bold text-slate-900 truncate leading-tight">{group.property}</div>
                        <div className="mt-2 flex items-center flex-wrap gap-2">
                          {group.checkedIn.length > 0 && (
                            <StatusPill icon={<CheckCircle className="h-3 w-3" />} label={`${group.checkedIn.length} Checked-in`} color="emerald" />
                          )}
                          {group.notCheckedIn.length > 0 && (
                            <StatusPill icon={<Clock className="h-3 w-3" />} label={`${group.notCheckedIn.length} Waiting`} color="amber" />
                          )}
                          {otherBookings.length > 0 && (
                            <StatusPill icon={<LogOut className="h-3 w-3" />} label={`${otherBookings.length} Other`} color="slate" />
                          )}
                          <span className="text-[11px] text-slate-400 font-medium">{group.bookings.length} total</span>
                        </div>
                      </div>

                      {/* Toggle button */}
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all duration-300 ${
                        isExpanded
                          ? 'bg-[#02665e] border-[#02665e] [&>svg]:rotate-180'
                          : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                      }`}>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isExpanded ? 'text-white' : 'text-slate-500'}`} />
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
                          bgClass="bg-emerald-50/60"
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
                          dotClass="bg-amber-500"
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
                          dotClass="bg-slate-400"
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
    const total = toNum(booking.totalAmount);
    if (Number.isFinite(total) && total > 0) return total;
    const oba = toNum(booking.ownerBaseAmount);
    if (Number.isFinite(oba) && oba > 0) return oba;
    return 0;
  })();

  const fmtDay = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
    catch { return formatDate(d); }
  };

  // Status visual config
  const statusCfg: Record<string, { stripe: string; pill: string; label: string }> = {
    CHECKED_IN:  { stripe: 'bg-emerald-500', pill: 'bg-emerald-100 text-emerald-700 border-emerald-200',  label: 'Checked-in'  },
    CHECKED_OUT: { stripe: 'bg-sky-400',     pill: 'bg-sky-100    text-sky-700    border-sky-200',        label: 'Checked-out' },
    CONFIRMED:   { stripe: 'bg-[#02665e]',   pill: 'bg-teal-50    text-teal-700  border-teal-200',        label: 'Confirmed'   },
    NEW:         { stripe: 'bg-[#02665e]',   pill: 'bg-teal-50    text-teal-700  border-teal-200',        label: 'New'         },
    PENDING:     { stripe: 'bg-amber-400',   pill: 'bg-amber-100  text-amber-700 border-amber-200',       label: 'Pending'     },
    CANCELLED:   { stripe: 'bg-red-400',     pill: 'bg-red-100    text-red-700   border-red-200',         label: 'Cancelled'   },
    CANCELED:    { stripe: 'bg-red-400',     pill: 'bg-red-100    text-red-700   border-red-200',         label: 'Cancelled'   },
  };
  const cfg = statusCfg[s] ?? { stripe: 'bg-slate-300', pill: 'bg-slate-100 text-slate-600 border-slate-200', label: booking.status };

  const avatarBg = isCheckedIn ? 'bg-emerald-500 text-white'
    : (s === 'CANCELLED' || s === 'CANCELED') ? 'bg-red-100 text-red-600'
    : 'bg-[#02665e] text-white';

  return (
    <Link href={`/owner/bookings/checked-in/${booking.id}`} className="block group no-underline" style={{ textDecoration: 'none' }}>
      <div className="relative flex items-center gap-3 px-5 py-3 hover:bg-slate-50/80 transition-colors duration-150">
        {/* Left status stripe */}
        <div className={`absolute left-0 inset-y-3 w-[3px] rounded-r-full ${cfg.stripe}`} aria-hidden />

        {/* Guest avatar */}
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 text-[13px] font-black shadow-sm ${avatarBg}`}>
          {guestInitial}
        </div>

        {/* Main content: 2-line layout */}
        <div className="flex-1 min-w-0">
          {/* Line 1: name · id ————————— amount */}
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold text-slate-900 truncate" style={{ textDecoration: 'none' }}>
              {booking.guestName || 'Guest'}
            </span>
            <span className="text-[11px] text-slate-400 flex-shrink-0">#{booking.id}</span>
            <span className="ml-auto text-[13px] font-extrabold text-slate-800 tabular-nums flex-shrink-0">
              {formatCurrency(safeAmount)}
            </span>
          </div>
          {/* Line 2: dates · nights · status · check-in time */}
          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500">
              {fmtDay(booking.checkIn)} – {fmtDay(booking.checkOut)}
            </span>
            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-px text-[10px] font-bold text-slate-500 flex-shrink-0">
              {nights}n
            </span>
            <span className={`inline-flex items-center rounded-full border px-2 py-px text-[10px] font-bold uppercase tracking-wide flex-shrink-0 ${cfg.pill}`}>
              {cfg.label}
            </span>
            {isCheckedIn && checkedInTime && (
              <span className="text-[11px] text-emerald-600 font-semibold flex-shrink-0" style={{ textDecoration: 'none' }}>
                in {checkedInTime}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}



