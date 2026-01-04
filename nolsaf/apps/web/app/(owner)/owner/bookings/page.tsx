"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Calendar, Loader2, Building2, User, DollarSign, Eye, Clock, CheckCircle, LogOut, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

type Booking = {
  id: number;
  property: string; // Property title from API
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number | string;
  guestName?: string | null;
};

type FilterTab = 'all' | 'recent' | 'waiting' | 'checked-in' | 'checked-out' | 'cancelled';

export default function OwnerBookingsPage() {
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const router = useRouter();
  const searchParams = useSearchParams();

  const isValidTab = (v: string | null): v is FilterTab =>
    v === 'all' || v === 'recent' || v === 'waiting' || v === 'checked-in' || v === 'checked-out' || v === 'cancelled';

  // Allow deep-linking from sidebar: /owner/bookings?tab=checked-out
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (isValidTab(tab) && tab !== activeTab) {
      setActiveTab(tab);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'owner/bookings/page.tsx:tab',message:'activeTab set from query',data:{tab},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'BOOK_TAB_1'})}).catch(()=>{});
      // #endregion
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
      'CONFIRMED': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
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
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">My Bookings</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">Loading your bookings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4 transition-all duration-300">
          <Calendar className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">My Bookings</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl">
          View and manage all bookings for your approved properties. Track guest information and booking status.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {filterTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                try {
                  const next = new URLSearchParams(searchParams.toString());
                  if (tab.key === 'all') next.delete('tab');
                  else next.set('tab', tab.key);
                  router.replace(`/owner/bookings${next.toString() ? `?${next.toString()}` : ''}`);
                } catch {}
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 font-medium text-sm ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  isActive 
                    ? 'bg-white/20 text-white' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bookings Grid */}
      {filteredBookings.length === 0 ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center bg-white rounded-xl border border-slate-200 p-12">
          <Calendar className="h-12 w-12 text-slate-400 mb-4" />
          <p className="text-sm text-slate-600">No bookings found for this filter.</p>
          <p className="text-xs text-slate-500 mt-1">Try selecting a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 overflow-hidden"
          >
            <div className="p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <h3 className="font-semibold text-slate-900 truncate">
                      {booking.property || `Property #${booking.id}`}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-500">
                    Booking #{booking.id}
                  </div>
                </div>
                {getStatusBadge(booking.status)}
              </div>

              {/* Guest Info */}
              {booking.guestName && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span className="text-slate-700 truncate">{booking.guestName}</span>
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="space-y-2 mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500">Check-in</div>
                    <div className="text-slate-700 font-medium">{formatDate(booking.checkIn)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500">Check-out</div>
                    <div className="text-slate-700 font-medium">{formatDate(booking.checkOut)}</div>
                  </div>
                </div>
              </div>

              {/* Amount */}
              {booking.totalAmount != null && (
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-500">Total Amount</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(Number(booking.totalAmount))}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Link
                  href={`/owner/bookings/checked-in/${booking.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-all duration-200"
                >
                  <Eye className="h-4 w-4" />
                  <span>View</span>
                </Link>
              </div>
            </div>
          </div>
          ))}
        </div>
      )}
    </div>
  );
}

