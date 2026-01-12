"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Calendar, Loader2, Building2, User, DollarSign, Eye, Clock, CheckCircle, LogOut, XCircle, ChevronDown, ChevronUp } from "lucide-react";
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
    const statusColors: Record<string, { bg: string; text: string; border: string }> = {
      'CONFIRMED': { bg: 'bg-brand-50', text: 'text-brand-700', border: 'border-brand-200' },
      'CHECKED_IN': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      'CHECKED_OUT': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      'CANCELLED': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'CANCELED': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'PENDING': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    };
    
    const colors = statusColors[status.toUpperCase()] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}>
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
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white border-2 border-brand-200 shadow-lg shadow-brand-500/10 mb-2 transition-all duration-300 hover:scale-105">
          <Calendar className="h-10 w-10 text-brand" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">My Bookings</h1>
          <p className="text-base text-slate-600 mt-3 max-w-2xl mx-auto leading-relaxed">
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

      {/* Bookings by Hotel */}
      {groupedBookings.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center bg-white rounded-2xl border-2 border-slate-200 p-16 shadow-sm">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-slate-100 mb-6">
            <Calendar className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-700 mb-2">No bookings found</p>
          <p className="text-sm text-slate-500">Try selecting a different category.</p>
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
                className="group relative bg-white rounded-2xl overflow-hidden transition-all duration-300"
              >
                {/* Left accent bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-brand via-brand-500 to-brand-600"></div>
                
                {/* Hotel Header */}
                <button
                  onClick={() => toggleHotel(group.key)}
                  className="relative w-full p-5 sm:p-6 text-left transition-all duration-300"
                >
                  <div className="flex items-center gap-4 sm:gap-5">
                    {/* Icon section */}
                    <div className="flex-shrink-0">
                      <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-brand/10 flex items-center justify-center">
                        <Building2 className="h-7 w-7 sm:h-8 sm:w-8 text-brand" />
                      </div>
                    </div>
                    
                    {/* Content section */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate mb-3">
                        {group.property}
                      </h3>
                      
                      {/* Stats in a compact row */}
                      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-semibold text-slate-700">{group.checkedIn.length}</span>
                          <span className="text-xs text-slate-500">Checked-in</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-semibold text-slate-700">{group.notCheckedIn.length}</span>
                          <span className="text-xs text-slate-500">Waiting</span>
                        </div>
                        <div className="h-4 w-px bg-slate-200"></div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-slate-700">{group.bookings.length}</span>
                          <span className="text-xs text-slate-500">Total</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expand button */}
                    <div className="flex-shrink-0">
                      <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                        isExpanded 
                          ? 'bg-brand text-white rotate-180' 
                          : 'bg-slate-100 text-slate-600'
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
                  <div className="bg-slate-50/50">
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.checkedIn.map((booking) => (
                              <BookingCard key={booking.id} booking={booking} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} getStatusBadge={getStatusBadge} />
                            ))}
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.notCheckedIn.map((booking) => (
                              <BookingCard key={booking.id} booking={booking} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} getStatusBadge={getStatusBadge} />
                            ))}
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.bookings
                              .filter(b => {
                                const status = b.status.toUpperCase();
                                return status !== 'CHECKED_IN' && status !== 'CONFIRMED' && status !== 'NEW';
                              })
                              .map((booking) => (
                                <BookingCard key={booking.id} booking={booking} formatDate={formatDate} formatDateTime={formatDateTime} formatCurrency={formatCurrency} getStatusBadge={getStatusBadge} />
                              ))}
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
  );
}

// Booking Card Component
function BookingCard({ 
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

  return (
    <div className="group bg-white rounded-xl p-5 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Booking #{booking.id}</div>
          {booking.guestName && (
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-slate-600" />
              </div>
              <span className="text-sm font-bold text-slate-900 truncate">{booking.guestName}</span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 ml-3">
          {getStatusBadge(booking.status)}
        </div>
      </div>

      {/* Check-in Time (if checked in) */}
      {isCheckedIn && checkedInTime && (
        <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-0.5">Checked In</div>
              <div className="text-xs font-medium text-green-800 truncate">{checkedInTime}</div>
            </div>
          </div>
        </div>
      )}

      {/* Dates */}
      <div className="space-y-3 mb-4">
        <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="h-7 w-7 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-4 w-4 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Check-in</div>
            <div className="text-sm font-bold text-slate-900">{formatDate(booking.checkIn)}</div>
          </div>
        </div>
        <div className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="h-7 w-7 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-4 w-4 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Check-out</div>
            <div className="text-sm font-bold text-slate-900">{formatDate(booking.checkOut)}</div>
          </div>
        </div>
      </div>

      {/* Amount */}
      {booking.totalAmount != null && (
        <div className="flex items-center justify-between mb-4 pb-4 border-b-2 border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <DollarSign className="h-4 w-4" />
            <span>Amount</span>
          </div>
          <span className="font-bold text-base text-slate-900">{formatCurrency(Number(booking.totalAmount))}</span>
        </div>
      )}

      {/* View Button */}
      <Link
        href={`/owner/bookings/checked-in/${booking.id}`}
        className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
        title="View Details"
      >
        <Eye className="h-5 w-5 text-brand hover:text-brand-700 transition-colors" />
      </Link>
    </div>
  );
}


