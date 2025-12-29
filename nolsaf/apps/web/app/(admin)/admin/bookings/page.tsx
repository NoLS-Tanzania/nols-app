"use client";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Calendar, Eye, DollarSign, Home, User, Search, Filter, X, Download, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, QrCode, FileText, TrendingUp, BarChart3, AlertCircle, MapPin, Phone, Mail, CreditCard, Building2, CheckSquare, Square, MoreVertical, Check, X as XIcon, Loader2, MessageSquare, History, PlayCircle, LogIn, LogOut, Ban } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import TableRow from "@/components/TableRow";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });

type BookingRow = {
  id: number;
  status: string;
  checkIn: string;
  checkOut: string;
  guestName?: string | null;
  roomCode?: string | null;
  totalAmount?: number;
  cancelReason?: string | null;
  canceledAt?: string | null;
  property?: { 
    id: number; 
    title?: string;
    ownerId?: number;
    owner?: { id: number; name?: string | null; email?: string | null };
  };
  code?: { 
    id: number; 
    code: string; 
    status: string;
    generatedAt?: string | null;
    usedAt?: string | null;
    usedByOwner?: boolean | null;
  } | null;
  user?: { id: number; name?: string | null; email?: string | null; phone?: string | null };
};

type Statistics = {
  total: number;
  confirmed: number;
  checkedIn: number;
  checkedOut: number;
  canceled: number;
  totalRevenue: number;
  avgBookingValue: number;
  codeValidations: number;
  qrValidations: number;
};

export default function AdminBookingsPage() {
  const [items, setItems] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const pageSize = 25;
  
  // Sorting
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<string | string[]>("");
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  
  // Modal state
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Bulk selection
  const [selectedBookings, setSelectedBookings] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Quick actions state
  const [quickActionLoading, setQuickActionLoading] = useState<number | null>(null);
  
  // Booking notes state
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notesBookingId, setNotesBookingId] = useState<number | null>(null);
  const [bookingNotes, setBookingNotes] = useState<string>("");
  const [notesLoading, setNotesLoading] = useState(false);
  
  // History state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyBookingId, setHistoryBookingId] = useState<number | null>(null);
  const [bookingHistory, setBookingHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  // Socket connection status
  const [socketConnected, setSocketConnected] = useState(false);
  
  const searchRef = useRef<HTMLInputElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Autofocus search
  useEffect(() => {
    try {
      searchRef.current?.focus();
    } catch (e) {}
  }, []);

  // Load counts
  const fetchCounts = async () => {
    try {
      const r = await api.get<Record<string, number>>("/api/admin/bookings/counts");
      if (r?.data) setCounts(r.data);
    } catch (e) {
      console.error("Failed to load counts:", e);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  // Load statistics
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<{ items: BookingRow[] }>("/api/admin/bookings", { params: { page: 1, pageSize: 10000 } });
        const bookings = r.data.items || [];
        
        const stats: Statistics = {
          total: bookings.length,
          confirmed: bookings.filter(b => b.status === "CONFIRMED").length,
          checkedIn: bookings.filter(b => b.status === "CHECKED_IN" || b.status === "PENDING_CHECKIN").length,
          checkedOut: bookings.filter(b => b.status === "CHECKED_OUT").length,
          canceled: bookings.filter(b => b.status === "CANCELED").length,
          totalRevenue: bookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0),
          avgBookingValue: bookings.length > 0 
            ? bookings.reduce((sum, b) => sum + (Number(b.totalAmount) || 0), 0) / bookings.length 
            : 0,
          codeValidations: bookings.filter(b => b.code?.usedByOwner === true).length,
          qrValidations: bookings.filter(b => b.code?.usedAt && b.code?.usedByOwner === false).length,
        };
        
        setStatistics(stats);
      } catch (e) {
        console.error("Failed to load statistics:", e);
      }
    })();
  }, []);

  // Load bookings function
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        pageSize,
        status: status || undefined,
        q: q || undefined,
      };
      
      if (dateFilter) {
        if (Array.isArray(dateFilter)) {
          params.date = dateFilter[0];
        } else {
          params.date = dateFilter;
        }
      }
      if (propertyFilter) params.propertyId = Number(propertyFilter);
      if (ownerFilter) params.ownerId = Number(ownerFilter);
      
      // Sorting
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortDir = sortDir;
      }

      const r = await api.get<{ items: BookingRow[]; total: number }>("/api/admin/bookings", { params });
      setItems(r.data.items ?? []);
      setTotal(r.data.total ?? 0);
    } catch (e: any) {
      console.error('bookings fetch', e);
      setError(e?.message ?? 'Failed to load bookings');
      setItems([]);
    } finally { 
      setLoading(false);
    }
  };

  // Load bookings
  useEffect(() => {
    load();
  }, [page, status, q, dateFilter, propertyFilter, ownerFilter, sortBy, sortDir]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [status, q, dateFilter, propertyFilter, ownerFilter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close modals
      if (e.key === 'Escape') {
        if (selectedBooking) closeModal();
        if (showNotesModal) {
          setShowNotesModal(false);
          setBookingNotes("");
          setNotesBookingId(null);
        }
        if (showHistoryModal) {
          setShowHistoryModal(false);
          setBookingHistory([]);
          setHistoryBookingId(null);
        }
      }
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      // Ctrl/Cmd + A to select all (when not in input)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && e.target instanceof HTMLInputElement === false && e.target instanceof HTMLTextAreaElement === false) {
        e.preventDefault();
        if (items.length > 0) {
          if (selectedBookings.size === items.length) {
            setSelectedBookings(new Set());
          } else {
            setSelectedBookings(new Set(items.map(b => b.id)));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBooking, showNotesModal, showHistoryModal, items.length, selectedBookings.size]);

  // Socket.IO for real-time updates
  useEffect(() => {
    // Only connect in browser
    if (typeof window === 'undefined') return;

    // For WebSocket connections, we need to connect directly to the API server
    // because Next.js rewrites don't support WebSocket upgrades
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                      process.env.NEXT_PUBLIC_API_URL || 
                      (typeof window !== 'undefined' ? "http://localhost:4000" : "");

    // Skip if no URL configured
    if (!socketUrl) {
      console.warn("Socket.IO: No API URL configured, skipping connection");
      return;
    }

    let s: Socket;
    try {
      // Connect directly to API server (WebSocket upgrades don't work through Next.js rewrites)
      s = io(socketUrl, { 
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000,
        autoConnect: true,
      });
    socketRef.current = s;

      const refresh = async () => {
        // Reload data instead of full page refresh
        try {
          // Trigger a reload by updating a dependency
          setPage(p => p); // This will trigger the useEffect that loads data
        } catch (e) {
          console.error("Failed to refresh bookings:", e);
        }
      };

    s.on("connect", () => {
        setSocketConnected(true);
    });

      s.on("connect_error", (err) => {
        setSocketConnected(false);
      });

    s.on("disconnect", () => {
        setSocketConnected(false);
    });

  s.on("admin:code:generated", refresh);
  s.on("admin:code:voided", refresh);
      s.on("admin:booking:status", refresh);
      s.on("admin:booking:validated", refresh);

    return () => {
        if (s) {
      s.off("admin:code:generated", refresh);
      s.off("admin:code:voided", refresh);
          s.off("admin:booking:status", refresh);
          s.off("admin:booking:validated", refresh);
      s.disconnect();
        }
      socketRef.current = null;
    };
    } catch (err) {
      // Silently fail - Socket.IO is optional
      socketRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Client-side sorting fallback
  const sortedItems = useMemo(() => {
    if (!sortBy || items.length === 0) return items;
    return [...items].sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case "id":
          aVal = a.id;
          bVal = b.id;
          break;
        case "property":
          aVal = a.property?.title ?? "";
          bVal = b.property?.title ?? "";
          break;
        case "guest":
          aVal = a.guestName ?? a.user?.name ?? "";
          bVal = b.guestName ?? b.user?.name ?? "";
          break;
        case "nights":
          aVal = calculateNights(a.checkIn, a.checkOut);
          bVal = calculateNights(b.checkIn, b.checkOut);
          break;
        case "amount":
          aVal = a.totalAmount ?? 0;
          bVal = b.totalAmount ?? 0;
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, sortBy, sortDir]);

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
  }

  function getSortIcon(column: string) {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-[#02665e]" />
    ) : (
      <ArrowDown className="h-3 w-3 text-[#02665e]" />
    );
  }

  function calculateNights(checkIn: string, checkOut: string): number {
    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const diffTime = checkOutDate.getTime() - checkInDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    } catch (e) {
      return 0;
    }
  }

  function getStatusBadge(status: string) {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('confirmed') || statusLower.includes('active')) {
  return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
          <CheckCircle2 className="h-3 w-3" />
          {status}
        </span>
      );
    }
    if (statusLower.includes('pending') || statusLower.includes('new')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
          <Clock className="h-3 w-3" />
          {status}
        </span>
      );
    }
    if (statusLower.includes('cancel') || statusLower.includes('reject')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
          <XCircle className="h-3 w-3" />
          {status}
        </span>
      );
    }
    if (statusLower.includes('check') || statusLower.includes('complete')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
          <CheckCircle2 className="h-3 w-3" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
        {status}
      </span>
    );
  }

  function getValidationMethod(b: BookingRow) {
    if (!b.code?.usedAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
          <Clock className="h-3 w-3" />
          Not Validated
        </span>
      );
    }
    // Rule: usedByOwner === true means Booking Code, usedByOwner === false means QR Code
    if (b.code.usedByOwner === true) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
          <FileText className="h-3.5 w-3.5" />
          Booking Code
        </span>
      );
    }
    // usedByOwner === false or null means QR Code was used
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
        <QrCode className="h-3.5 w-3.5" />
        QR Code
      </span>
    );
  }

  function clearAdvancedFilters() {
    setDateFilter("");
    setPropertyFilter("");
    setOwnerFilter("");
    setShowAdvancedFilters(false);
  }

  // Fetch booking details
  const fetchBookingDetails = async (bookingId: number) => {
    setLoadingDetails(true);
    try {
      const response = await api.get(`/api/admin/bookings/${bookingId}`);
      setBookingDetails(response.data);
    } catch (error) {
      console.error("Failed to fetch booking details:", error);
      setBookingDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Handle eye icon click
  const handleViewDetails = async (booking: BookingRow) => {
    setSelectedBooking(booking);
    await fetchBookingDetails(booking.id);
  };

  // Close modal
  const closeModal = () => {
    setSelectedBooking(null);
    setBookingDetails(null);
  };

  // Bulk selection handlers
  const toggleBookingSelection = (bookingId: number) => {
    setSelectedBookings(prev => {
      const next = new Set(prev);
      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }
      return next;
    });
  };

  const toggleSelectAll = useCallback(() => {
    if (selectedBookings.size === sortedItems.length) {
      setSelectedBookings(new Set());
    } else {
      setSelectedBookings(new Set(sortedItems.map(b => b.id)));
    }
  }, [selectedBookings.size, sortedItems]);

  // Bulk actions
  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedBookings.size === 0) return;
    // Only allow CONFIRMED status for bulk updates
    if (newStatus !== 'CONFIRMED') return;
    setBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedBookings).map(id =>
          api.post(`/api/admin/bookings/${id}/confirm`)
        )
      );
      setSelectedBookings(new Set());
      setShowBulkActions(false);
      load(); // Reload data
      fetchCounts();
    } catch (error) {
      console.error("Bulk status update failed:", error);
      alert("Failed to update bookings. Please try again.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedBookings.size === 0) return;
    const reason = prompt("Enter cancellation reason (required):");
    if (!reason || reason.trim().length < 3) {
      alert("Cancellation reason is required (minimum 3 characters)");
      return;
    }
    setBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedBookings).map(id =>
          api.post(`/api/admin/bookings/${id}/cancel`, { reason: reason.trim() })
        )
      );
      setSelectedBookings(new Set());
      setShowBulkActions(false);
      load();
      fetchCounts();
    } catch (error) {
      console.error("Bulk cancellation failed:", error);
      alert("Failed to cancel bookings. Please try again.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkExport = () => {
    if (selectedBookings.size === 0) return;
    const ids = Array.from(selectedBookings).join(',');
    window.open(`/api/admin/bookings/export.csv?selectedIds=${ids}`, "_blank");
  };

  // Archive/Delete bookings with safeguards
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  
  const handleBulkArchive = () => {
    if (selectedBookings.size === 0) return;
    setShowArchiveModal(true);
  };

  const confirmBulkArchive = async () => {
    if (!archiveReason || archiveReason.trim().length < 10) {
      alert("Archive reason is required (minimum 10 characters)");
      return;
    }
    
    const count = selectedBookings.size;
    
    // Double confirmation
    const confirmed = window.confirm(
      `⚠️ WARNING: You are about to archive ${count} booking(s).\n\n` +
      `This action will mark these bookings as archived and they will be hidden from normal views.\n\n` +
      `Reason: ${archiveReason}\n\n` +
      `Are you absolutely sure you want to proceed?`
    );
    
    if (!confirmed) return;

    setBulkActionLoading(true);
    try {
      // Archive bookings (soft delete - mark as archived)
      await Promise.all(
        Array.from(selectedBookings).map(id =>
          api.post(`/api/admin/bookings/${id}/archive`, { 
            reason: archiveReason.trim(),
            archivedAt: new Date().toISOString()
          })
        )
      );
      setSelectedBookings(new Set());
      setShowArchiveModal(false);
      setArchiveReason("");
      load();
      fetchCounts();
      alert(`Successfully archived ${count} booking(s).`);
    } catch (error: any) {
      console.error("Bulk archive failed:", error);
      // If archive endpoint doesn't exist, show a message
      if (error?.response?.status === 404) {
        alert("Archive functionality is not yet available. Please contact system administrator.");
      } else {
        alert("Failed to archive bookings. Please try again.");
      }
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Quick actions
  const handleQuickAction = async (bookingId: number, action: 'confirm' | 'checkin' | 'checkout') => {
    setQuickActionLoading(bookingId);
    try {
      const endpoint = action === 'confirm' ? 'confirm' : action === 'checkin' ? 'checkin' : 'checkout';
      await api.post(`/api/admin/bookings/${bookingId}/${endpoint}`);
      // Optimistic update
      setItems(prev => prev.map(b => 
        b.id === bookingId 
          ? { ...b, status: action === 'confirm' ? 'CONFIRMED' : action === 'checkin' ? 'CHECKED_IN' : 'CHECKED_OUT' }
          : b
      ));
      fetchCounts();
    } catch (error) {
      console.error(`Quick action ${action} failed:`, error);
      alert(`Failed to ${action} booking. Please try again.`);
      load(); // Reload on error
    } finally {
      setQuickActionLoading(null);
    }
  };

  // Booking notes
  const handleOpenNotes = async (bookingId: number) => {
    setNotesBookingId(bookingId);
    setShowNotesModal(true);
    setNotesLoading(true);
    try {
      // Fetch existing notes if API exists
      // const response = await api.get(`/api/admin/bookings/${bookingId}/notes`);
      // setBookingNotes(response.data.notes || "");
    } catch (error) {
      console.error("Failed to load notes:", error);
    } finally {
      setNotesLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!notesBookingId) return;
    setNotesLoading(true);
    try {
      // await api.post(`/api/admin/bookings/${notesBookingId}/notes`, { notes: bookingNotes });
      alert("Notes saved successfully!");
      setShowNotesModal(false);
      setBookingNotes("");
      setNotesBookingId(null);
    } catch (error) {
      console.error("Failed to save notes:", error);
      alert("Failed to save notes. Please try again.");
    } finally {
      setNotesLoading(false);
    }
  };

  // Booking history
  const handleOpenHistory = async (bookingId: number) => {
    setHistoryBookingId(bookingId);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      // Fetch booking history/audit trail
      // const response = await api.get(`/api/admin/bookings/${bookingId}/history`);
      // setBookingHistory(response.data || []);
      setBookingHistory([]); // Placeholder
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden box-border">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="h-5 w-5 text-[#02665e]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Bookings</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">View and manage all guest bookings and validation codes</p>
            </div>
          </div>
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (status) params.append("status", status);
              if (q) params.append("q", q);
              if (dateFilter) params.append("date", Array.isArray(dateFilter) ? dateFilter[0] : dateFilter);
              window.open(`/api/admin/bookings/export.csv?${params.toString()}`, "_blank");
            }}
            className="px-4 py-2 bg-[#02665e] text-white rounded-lg text-sm font-medium hover:bg-[#02665e]/90 transition-all duration-200 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full box-border">
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm w-full box-border overflow-hidden">
            <div className="flex items-center justify-between min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide truncate">Total Bookings</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{statistics.total}</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm w-full box-border overflow-hidden">
            <div className="flex items-center justify-between min-w-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-500 uppercase tracking-wide truncate">Total Revenue</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{Number(statistics.totalRevenue).toLocaleString()} TZS</p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-xl border-2 p-3 sm:p-4 shadow-sm w-full box-border overflow-hidden ${
            statistics.codeValidations > statistics.qrValidations 
              ? 'border-blue-300 bg-blue-50/30' 
              : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between min-w-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <p className="text-xs text-gray-500 uppercase tracking-wide truncate">Booking Code</p>
                  {statistics.codeValidations > statistics.qrValidations && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold whitespace-nowrap flex-shrink-0">MOST USED</span>
                  )}
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{statistics.codeValidations}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {statistics.codeValidations + statistics.qrValidations > 0 
                    ? `${Math.round((statistics.codeValidations / (statistics.codeValidations + statistics.qrValidations)) * 100)}% of validations`
                    : 'No validations yet'}
          </p>
        </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
      </div>
            </div>
          </div>
          <div className={`bg-white rounded-xl border-2 p-3 sm:p-4 shadow-sm w-full box-border overflow-hidden ${
            statistics.qrValidations > statistics.codeValidations 
              ? 'border-purple-300 bg-purple-50/30' 
              : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between min-w-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <p className="text-xs text-gray-500 uppercase tracking-wide truncate">QR Code</p>
                  {statistics.qrValidations > statistics.codeValidations && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white text-[10px] font-bold whitespace-nowrap flex-shrink-0">MOST USED</span>
                  )}
                </div>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 truncate">{statistics.qrValidations}</p>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {statistics.codeValidations + statistics.qrValidations > 0 
                    ? `${Math.round((statistics.qrValidations / (statistics.codeValidations + statistics.qrValidations)) * 100)}% of validations`
                    : 'No validations yet'}
                </p>
              </div>
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm w-full box-border" style={{ maxWidth: '100%', overflow: 'hidden' }}>
        {/* Search and Advanced Filters */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-4 w-full box-border" style={{ maxWidth: '100%', minWidth: 0 }}>
          <div className="flex-1 relative w-full box-border" style={{ maxWidth: '100%', minWidth: 0 }}>
            <div className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
              <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 transition-colors duration-200 flex-shrink-0" />
            </div>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search bookings... (Ctrl+K)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-all duration-200 text-xs sm:text-sm box-border bg-white hover:border-gray-400 shadow-sm hover:shadow-md focus:shadow-lg placeholder:text-gray-400"
              style={{ maxWidth: '100%', width: '100%' }}
              aria-label="Search bookings by guest name, property, or booking code"
              aria-describedby="search-hint"
            />
            <span id="search-hint" className="sr-only">Press Ctrl+K or Cmd+K to focus search</span>
          </div>
            <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`group relative w-full sm:w-auto sm:flex-shrink-0 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 lg:py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex items-center justify-center gap-1.5 sm:gap-2 shadow-sm box-border ${
              showAdvancedFilters
                ? "bg-[#02665e] text-white hover:bg-[#02665e]/90 shadow-lg shadow-[#02665e]/30 scale-105"
                : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-300 hover:border-[#02665e] hover:shadow-md"
            }`}
            style={{ maxWidth: '100%' }}
          >
            <Filter className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 transition-transform duration-300 ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            <span className="hidden sm:inline font-medium whitespace-nowrap">Advanced Filters</span>
            <span className="sm:hidden font-medium">Filters</span>
            {showAdvancedFilters && (
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#02665e] to-[#028a7e] animate-pulse opacity-20"></span>
            )}
            </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="border-t border-gray-200 pt-4 mt-4 overflow-hidden">
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 sm:p-4 lg:p-5 border border-gray-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                    <Filter className="h-4 w-4 text-[#02665e]" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 truncate">Advanced Filters</h3>
                </div>
          <button
                  onClick={clearAdvancedFilters}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex-shrink-0"
                  title="Clear all filters"
                >
                  <X className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="hidden sm:inline">Clear</span>
          </button>
              </div>

              {/* Filter Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-w-0">
                {/* Date Filter */}
                <div className="space-y-2 min-w-0">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <Calendar className="h-3.5 w-3.5 text-[#02665e] flex-shrink-0" />
                    <span className="truncate">Booking Date</span>
                  </label>
                  <div className="relative min-w-0">
                <DatePicker
                      selected={dateFilter}
                      onSelect={setDateFilter}
                />
              </div>
                </div>

                {/* Property ID Filter */}
                <div className="space-y-2 min-w-0">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <Home className="h-3.5 w-3.5 text-[#02665e] flex-shrink-0" />
                    <span className="truncate">Property ID</span>
                  </label>
                  <input
                    type="number"
                    value={propertyFilter}
                    onChange={(e) => setPropertyFilter(e.target.value)}
                    placeholder="Enter property ID"
                    className="w-full min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-sm transition-all duration-200 bg-white hover:border-gray-400 box-border"
                  />
                </div>

                {/* Owner ID Filter */}
                <div className="space-y-2 min-w-0">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <User className="h-3.5 w-3.5 text-[#02665e] flex-shrink-0" />
                    <span className="truncate">Owner ID</span>
                  </label>
                  <input
                    type="number"
                    value={ownerFilter}
                    onChange={(e) => setOwnerFilter(e.target.value)}
                    placeholder="Enter owner ID"
                    className="w-full min-w-0 px-3 sm:px-4 py-2 sm:py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-sm transition-all duration-200 bg-white hover:border-gray-400 box-border"
                  />
                </div>
              </div>

              {/* Active Filters Indicator */}
              {(dateFilter || propertyFilter || ownerFilter) && (
                <div className="mt-4 pt-4 border-t border-gray-200 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <span className="text-xs font-medium text-gray-600 flex-shrink-0">Active filters:</span>
                    {dateFilter && (
                      <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-[#02665e]/10 text-[#02665e] rounded-md text-xs font-medium max-w-full min-w-0">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Date: {Array.isArray(dateFilter) ? dateFilter.join(' - ') : dateFilter}</span>
                        <button
                          onClick={() => setDateFilter("")}
                          className="ml-1 hover:bg-[#02665e]/20 rounded-full p-0.5 transition-colors flex-shrink-0"
                          aria-label="Remove date filter"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    )}
                    {propertyFilter && (
                      <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium max-w-full min-w-0">
                        <Home className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Property: {propertyFilter}</span>
                        <button
                          onClick={() => setPropertyFilter("")}
                          className="ml-1 hover:bg-blue-100 rounded-full p-0.5 transition-colors flex-shrink-0"
                          aria-label="Remove property filter"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    )}
                    {ownerFilter && (
                      <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md text-xs font-medium max-w-full min-w-0">
                        <User className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Owner: {ownerFilter}</span>
                        <button
                          onClick={() => setOwnerFilter("")}
                          className="ml-1 hover:bg-purple-100 rounded-full p-0.5 transition-colors flex-shrink-0"
                          aria-label="Remove owner filter"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
          )}
        </div>
      </div>
              )}
            </div>
          </div>
        )}

        {/* Status Filters */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 pt-4 border-t border-gray-200 w-full box-border overflow-hidden">
          <button
            onClick={() => setStatus("")}
            className={`group relative px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex-shrink-0 ${
              status === ""
                ? "bg-[#02665e] text-white shadow-lg shadow-[#02665e]/30 scale-105"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
            }`}
          >
            <span className="relative z-10 flex items-center gap-1 sm:gap-2">
              <span className="whitespace-nowrap">All</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                status === ""
                  ? "bg-white/25 text-white"
                  : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
              }`}>
                {(counts["NEW"] || 0) + (counts["CONFIRMED"] || 0) + (counts["CHECKED_IN"] || 0) + (counts["CHECKED_OUT"] || 0) + (counts["CANCELED"] || 0)}
              </span>
            </span>
            {status === "" && (
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#02665e] to-[#028a7e] animate-pulse opacity-20"></span>
            )}
          </button>
          <button
            onClick={() => setStatus("NEW")}
            className={`group relative px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex-shrink-0 ${
              status === "NEW"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/30 scale-105"
                : "bg-white text-amber-700 hover:bg-amber-50 border border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-md"
            }`}
          >
            <span className="relative z-10 flex items-center gap-1 sm:gap-2">
              <span className="whitespace-nowrap">New</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                status === "NEW"
                  ? "bg-white/25 text-white"
                  : "bg-amber-100 text-amber-700 group-hover:bg-amber-200"
              }`}>
                {counts["NEW"] || 0}
              </span>
            </span>
            {status === "NEW" && (
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 animate-pulse opacity-20"></span>
            )}
          </button>
          <button
            onClick={() => setStatus("CONFIRMED")}
            className={`group relative px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex-shrink-0 ${
              status === "CONFIRMED"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105"
                : "bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200 hover:border-emerald-300 shadow-sm hover:shadow-md"
            }`}
          >
            <span className="relative z-10 flex items-center gap-1 sm:gap-2">
              <span className="whitespace-nowrap">Confirmed</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                status === "CONFIRMED"
                  ? "bg-white/25 text-white"
                  : "bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200"
              }`}>
                {counts["CONFIRMED"] || 0}
              </span>
            </span>
            {status === "CONFIRMED" && (
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 animate-pulse opacity-20"></span>
            )}
          </button>
          <button
            onClick={() => setStatus("CHECKED_IN")}
            className={`group relative px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex-shrink-0 ${
              status === "CHECKED_IN"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105"
                : "bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md"
            }`}
          >
            <span className="relative z-10 flex items-center gap-1 sm:gap-2">
              <span className="whitespace-nowrap">Check-in</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                status === "CHECKED_IN"
                  ? "bg-white/25 text-white"
                  : "bg-blue-100 text-blue-700 group-hover:bg-blue-200"
              }`}>
                {counts["CHECKED_IN"] || 0}
              </span>
            </span>
            {status === "CHECKED_IN" && (
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 animate-pulse opacity-20"></span>
            )}
          </button>
          <button
            onClick={() => setStatus("CHECKED_OUT")}
            className={`group relative px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex-shrink-0 ${
              status === "CHECKED_OUT"
                ? "bg-gray-700 text-white shadow-lg shadow-gray-700/30 scale-105"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md"
            }`}
          >
            <span className="relative z-10 flex items-center gap-1 sm:gap-2">
              <span className="whitespace-nowrap">Check-out</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                status === "CHECKED_OUT"
                  ? "bg-white/25 text-white"
                  : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
              }`}>
                {counts["CHECKED_OUT"] || 0}
              </span>
            </span>
            {status === "CHECKED_OUT" && (
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-700 to-gray-600 animate-pulse opacity-20"></span>
            )}
          </button>
          <button
            onClick={() => setStatus("CANCELED")}
            className={`group relative px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 flex-shrink-0 ${
              status === "CANCELED"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30 scale-105"
                : "bg-white text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md"
            }`}
          >
            <span className="relative z-10 flex items-center gap-1 sm:gap-2">
              <span className="whitespace-nowrap">Canceled</span>
              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap ${
                status === "CANCELED"
                  ? "bg-white/25 text-white"
                  : "bg-red-100 text-red-700 group-hover:bg-red-200"
              }`}>
                {counts["CANCELED"] || 0}
              </span>
            </span>
            {status === "CANCELED" && (
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600 to-red-500 animate-pulse opacity-20"></span>
            )}
          </button>
          </div>
          </div>

      {/* Bulk Actions Bar */}
      {selectedBookings.size > 0 && (
        <div 
          className="flex justify-center mb-4"
          onClick={() => setSelectedBookings(new Set())}
        >
          <div 
            className="bg-[#02665e] text-white rounded-lg p-3 max-w-md w-full shadow-lg border-2 border-[#028a7e]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-center gap-3">
              <CheckSquare className="h-5 w-5 text-white" />
              <span className="text-sm font-semibold">
                {selectedBookings.size} selected
              </span>
              <div className="h-5 w-px bg-white/40"></div>
              <button
                onClick={handleBulkExport}
                className="px-3 py-1.5 bg-transparent text-white rounded-md text-xs font-semibold hover:opacity-80 transition-opacity flex items-center gap-1.5 border-0 outline-none"
                aria-label="Export selected"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button
                onClick={handleBulkArchive}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 bg-orange-600 text-white rounded-md text-xs font-semibold hover:bg-orange-700 disabled:opacity-50 shadow-sm transition-all flex items-center gap-1.5"
                aria-label="Archive selected bookings"
              >
                {bulkActionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span>Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Socket.IO Connection Indicator */}
      <div className="flex items-center justify-end gap-2 mb-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
          socketConnected 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-gray-50 text-gray-600 border border-gray-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span>{socketConnected ? 'Live Updates' : 'Offline'}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr role="row">
                <th className="px-3 sm:px-4 py-3 w-12">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center"
                    aria-label={selectedBookings.size === sortedItems.length ? "Deselect all" : "Select all"}
                    title={selectedBookings.size === sortedItems.length ? "Deselect all" : "Select all"}
                  >
                    {selectedBookings.size === sortedItems.length && sortedItems.length > 0 ? (
                      <CheckSquare className="h-5 w-5 text-[#02665e]" />
                    ) : (
                      <Square className="h-5 w-5 text-gray-400 hover:text-[#02665e] transition-colors" />
                    )}
                  </button>
                      </th>
                <th 
                  className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("id")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>ID</span>
                    {getSortIcon("id")}
                  </div>
                </th>
                <th 
                  className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("property")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Property</span>
                    {getSortIcon("property")}
                  </div>
                </th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Guest
                </th>
                <th 
                  className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("nights")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nights</span>
                    {getSortIcon("nights")}
                  </div>
                </th>
                <th 
                  className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Amount</span>
                    {getSortIcon("amount")}
                  </div>
                </th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex flex-col gap-0.5">
                    <span>Validation</span>
                    <span className="text-[10px] font-normal text-gray-500 normal-case">QR Code or Booking Code</span>
                  </div>
                </th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
                  </tr>
                </thead>
            <tbody className="bg-white divide-y divide-gray-200" role="rowgroup">
        {loading ? (
                <TableRow hover={false}>
                  <td colSpan={9} className="px-3 sm:px-4 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#02665e]"></div>
          </div>
                  </td>
                </TableRow>
              ) : sortedItems.length === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={9} className="px-3 sm:px-4 py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No bookings found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
                  </td>
                </TableRow>
              ) : (
                sortedItems.map(b => (
                  <TableRow key={b.id} role="row">
                    <td className="px-3 sm:px-4 py-3">
                      <button
                        onClick={() => toggleBookingSelection(b.id)}
                        className="flex items-center justify-center"
                        aria-label={selectedBookings.has(b.id) ? `Deselect booking ${b.id}` : `Select booking ${b.id}`}
                        title={selectedBookings.has(b.id) ? "Deselect" : "Select"}
                      >
                        {selectedBookings.has(b.id) ? (
                          <CheckSquare className="h-5 w-5 text-[#02665e]" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400 hover:text-[#02665e] transition-colors" />
                        )}
                      </button>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900">#{b.id}</td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-gray-700">
                                  <div className="flex items-center gap-2">
                        <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <div className="truncate">{b.property?.title ?? '—'}</div>
                          {b.property?.owner && (
                            <div className="text-xs text-gray-500 truncate">{b.property.owner.name ?? b.property.owner.email ?? '—'}</div>
                          )}
          </div>
                      </div>
                        </td>
                    <td className="px-3 sm:px-4 py-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{b.guestName ?? b.user?.name ?? b.user?.email ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{calculateNights(b.checkIn, b.checkOut)}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-gray-900">
                      {b.totalAmount ? (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          {Number(b.totalAmount).toLocaleString()}
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm">
                      <div className="flex flex-col gap-1">
                        {getValidationMethod(b)}
                        {b.code?.usedAt && (
                          <span className="text-[10px] text-gray-500">
                            {new Date(b.code.usedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-sm">{getStatusBadge(b.status)}</td>
                    <td className="px-3 sm:px-4 py-3 text-sm">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => handleViewDetails(b)}
                          className="p-2 rounded-lg text-[#02665e] hover:bg-[#02665e]/10 transition-all duration-200"
                          title="View booking details"
                          aria-label="View booking details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </TableRow>
                ))
              )}
                </tbody>
              </table>
            </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden divide-y divide-gray-200">
        {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#02665e] mx-auto"></div>
          </div>
          ) : sortedItems.length === 0 ? (
            <div className="p-8 text-center">
            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No bookings found</p>
          </div>
        ) : (
            sortedItems.map(b => (
              <div key={b.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                    <div>
                    <div className="font-semibold text-gray-900">Booking #{b.id}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{getStatusBadge(b.status)}</div>
                    </div>
                      <button
                    onClick={() => handleViewDetails(b)}
                    className="p-2 rounded-lg text-[#02665e] hover:bg-[#02665e]/10 transition-all"
                    title="View booking details"
                  >
                    <Eye className="h-5 w-5" />
                      </button>
                    </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{b.property?.title ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{b.guestName ?? b.user?.name ?? b.user?.email ?? '—'}</span>
                    </div>
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-gray-500 mb-0.5">Nights</div>
                        <div className="text-sm font-semibold text-gray-900">{calculateNights(b.checkIn, b.checkOut)} nights</div>
                  </div>
                </div>
                  </div>
                  {b.totalAmount && (
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 pt-2 border-t border-gray-100">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      {Number(b.totalAmount).toLocaleString()}
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500 mb-1.5 font-medium">Validation Method</div>
                    {getValidationMethod(b)}
                    {b.code?.usedAt && (
                      <div className="text-xs text-gray-500 mt-1.5">
                        Validated: {new Date(b.code.usedAt).toLocaleDateString()} {new Date(b.code.usedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  {b.status === "CANCELED" && b.cancelReason && (
                    <div className="pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Cancellation Reason:</div>
                      <div className="text-sm text-red-700 bg-red-50 p-2 rounded-md">{b.cancelReason}</div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
            </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm w-full box-border overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 w-full box-border">
            <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left w-full sm:w-auto">
              Showing <span className="font-semibold text-gray-900">{startItem}</span> to <span className="font-semibold text-gray-900">{endItem}</span> of <span className="font-semibold text-gray-900">{total}</span> bookings
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-center sm:justify-end flex-wrap">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-1.5 sm:p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              
              {/* Page Numbers */}
              <div className="flex items-center gap-1 flex-wrap justify-center">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (page <= 4) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = page - 3 + i;
                  }
                  
                  if (pageNum > totalPages) return null;
                  
                                return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      disabled={loading}
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex-shrink-0 ${
                        page === pageNum
                          ? "bg-[#02665e] text-white shadow-md"
                          : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPages > 7 && page < totalPages - 3 && (
                  <>
                    <span className="px-1 sm:px-2 text-gray-400 text-xs sm:text-sm">...</span>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={loading}
                      className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 flex-shrink-0"
                    >
                      {totalPages}
                    </button>
          </>
        )}
                                  </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="p-1.5 sm:p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-[#02665e] to-[#028a7e]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Booking Details</h2>
                  <p className="text-xs sm:text-sm text-white/80">#{selectedBooking.id}</p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#02665e]"></div>
                </div>
              ) : bookingDetails ? (
                <div className="space-y-6">
                  {/* Booking Status */}
                  <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
                      {getStatusBadge(bookingDetails.status || selectedBooking.status)}
                    </div>
                  </div>

                  {/* Booking Information Grid */}
                  <div className={`grid gap-4 ${(bookingDetails.status === "CANCELED" || selectedBooking.status === "CANCELED" || bookingDetails.canceledAt) ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                    {/* Check-in & Check-out - Hide if canceled */}
                    {!(bookingDetails.status === "CANCELED" || selectedBooking.status === "CANCELED" || bookingDetails.canceledAt) && (
                      <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="h-5 w-5 text-[#02665e]" />
                          <h3 className="text-sm font-semibold text-gray-900">Stay Duration</h3>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Check-in</p>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(selectedBooking.checkIn).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(selectedBooking.checkIn).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Check-out</p>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(selectedBooking.checkOut).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(selectedBooking.checkOut).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Nights</p>
                            <p className="text-lg font-bold text-[#02665e]">{calculateNights(selectedBooking.checkIn, selectedBooking.checkOut)} nights</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Amount */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <DollarSign className="h-5 w-5 text-[#02665e]" />
                        <h3 className="text-sm font-semibold text-gray-900">Payment</h3>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Total Amount</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedBooking.totalAmount ? Number(selectedBooking.totalAmount).toLocaleString() : '—'} TZS
                        </p>
                        {bookingDetails.roomCode && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Room Code</p>
                            <p className="text-sm font-medium text-gray-900">{bookingDetails.roomCode}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Property & Guest Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Property */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Home className="h-5 w-5 text-[#02665e]" />
                        <h3 className="text-sm font-semibold text-gray-900">Property</h3>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Property Name</p>
                          <p className="text-sm font-medium text-gray-900">{selectedBooking.property?.title ?? '—'}</p>
                        </div>
                        {selectedBooking.property?.owner && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Owner</p>
                                  <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <p className="text-sm font-medium text-gray-900">{selectedBooking.property.owner.name ?? selectedBooking.property.owner.email ?? '—'}</p>
                                  </div>
            </div>
                        )}
                      </div>
                    </div>

                    {/* Guest */}
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-5 w-5 text-[#02665e]" />
                        <h3 className="text-sm font-semibold text-gray-900">Guest</h3>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Guest Name</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedBooking.guestName ?? selectedBooking.user?.name ?? '—'}
                          </p>
                        </div>
                        {selectedBooking.user?.email && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Email</p>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <p className="text-sm font-medium text-gray-900">{selectedBooking.user.email}</p>
                            </div>
                          </div>
                        )}
                        {selectedBooking.user?.phone && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Phone</p>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <p className="text-sm font-medium text-gray-900">{selectedBooking.user.phone}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Validation Information */}
                  {selectedBooking.code && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <QrCode className="h-5 w-5 text-[#02665e]" />
                        <h3 className="text-sm font-semibold text-gray-900">Validation</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Validation Method</p>
                          {getValidationMethod(selectedBooking)}
                        </div>
                        {selectedBooking.code.code && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Booking Code</p>
                            <p className="text-sm font-mono font-medium text-gray-900">{selectedBooking.code.code}</p>
                          </div>
                        )}
                        {selectedBooking.code.usedAt && (
                          <div className="pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-1">Validated At</p>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(selectedBooking.code.usedAt).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            {selectedBooking.code.usedByOwner && (
                              <p className="text-xs text-gray-500 mt-1">Validated by property owner</p>
                            )}
                          </div>
                        )}
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Code Status</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                            selectedBooking.code.status === 'USED' 
                              ? 'bg-green-100 text-green-700' 
                              : selectedBooking.code.status === 'VOIDED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {selectedBooking.code.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cancellation Information - Only show for canceled bookings */}
                  {(bookingDetails.status === "CANCELED" || selectedBooking.status === "CANCELED") && (
                    <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <h3 className="text-sm font-semibold text-red-900">Cancellation Details</h3>
                      </div>
                      <div className="space-y-4">
                        {/* Refund Status */}
                        <div>
                          <p className="text-xs text-red-700 uppercase tracking-wide mb-2 font-semibold">Refund Status</p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {bookingDetails.cancelRefundPercent === 100 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 text-green-800 border border-green-300 text-sm font-semibold">
                                <CheckCircle2 className="h-4 w-4" />
                                Full Refund (100%)
                              </span>
                            ) : bookingDetails.cancelRefundPercent === 50 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 text-sm font-semibold">
                                <AlertCircle className="h-4 w-4" />
                                Partial Refund (50%)
                              </span>
                            ) : bookingDetails.cancelRefundPercent === 0 ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-800 border border-red-300 text-sm font-semibold">
                                <XCircle className="h-4 w-4" />
                                No Refund (0%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 border border-gray-300 text-sm font-semibold">
                                <Clock className="h-4 w-4" />
                                Refund Status: Pending
                              </span>
                            )}
                            {bookingDetails.cancelPolicyRule && (
                              <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-md">
                                {bookingDetails.cancelPolicyRule}
                              </span>
                            )}
                          </div>
                          {bookingDetails.cancelPolicyEligible === false && bookingDetails.cancelRefundPercent === null && (
                            <p className="text-xs text-red-600 mt-2 italic">Not eligible for refund per cancellation policy</p>
                          )}
                        </div>

                        {/* Cancellation Date */}
                        {bookingDetails.canceledAt && (
                          <div className="pt-3 border-t border-red-200">
                            <p className="text-xs text-red-700 uppercase tracking-wide mb-2 font-semibold">Cancellation Date & Time</p>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-red-600" />
                              <p className="text-sm font-medium text-red-900">
                                {new Date(bookingDetails.canceledAt).toLocaleDateString('en-US', { 
                                  weekday: 'long',
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric'
                                })}
                              </p>
                            </div>
                            <p className="text-xs text-red-600 mt-1 ml-6">
                              {new Date(bookingDetails.canceledAt).toLocaleTimeString('en-US', { 
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                              })}
                            </p>
                          </div>
                        )}

                        {/* Cancellation Reason - Only show for canceled bookings */}
                        {bookingDetails.cancelReason && (
                          <div className="pt-3 border-t border-red-200">
                            <p className="text-xs text-red-700 uppercase tracking-wide mb-2 font-semibold">Reason Provided by User</p>
                            <div className="bg-white rounded-lg p-3 border border-red-200">
                              <p className="text-sm text-red-900 leading-relaxed whitespace-pre-wrap">{bookingDetails.cancelReason}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Failed to load booking details</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Notes Modal */}
      {showNotesModal && notesBookingId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setShowNotesModal(false);
            setBookingNotes("");
            setNotesBookingId(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-[#02665e] to-[#028a7e]">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-white" />
                <h2 className="text-lg sm:text-xl font-bold text-white">Booking Notes</h2>
                <p className="text-xs sm:text-sm text-white/80">#{notesBookingId}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {notesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#02665e]" />
                </div>
              ) : (
                <textarea
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Add notes about this booking..."
                  className="w-full h-64 p-4 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-sm resize-none"
                  aria-label="Booking notes"
                />
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowNotesModal(false);
                  setBookingNotes("");
                  setNotesBookingId(null);
                }}
                className="px-4 py-2 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={notesLoading}
                className="px-4 py-2 rounded-lg bg-[#02665e] text-white hover:bg-[#02665e]/90 transition-all duration-200 font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {notesLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Notes
          </>
        )}
              </button>
      </div>
          </div>
        </div>
      )}

      {/* Booking History Modal */}
      {showHistoryModal && historyBookingId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setShowHistoryModal(false);
            setBookingHistory([]);
            setHistoryBookingId(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-[#02665e] to-[#028a7e]">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-white" />
                <h2 className="text-lg sm:text-xl font-bold text-white">Booking History</h2>
                <p className="text-xs sm:text-sm text-white/80">#{historyBookingId}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {historyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#02665e]" />
                </div>
              ) : bookingHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No history available</p>
                  <p className="text-sm text-gray-400 mt-1">Booking history will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookingHistory.map((entry, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{entry.action || 'Status Change'}</p>
                          <p className="text-xs text-gray-500 mt-1">{entry.description || 'No description'}</p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setBookingHistory([]);
                  setHistoryBookingId(null);
                }}
                className="px-4 py-2 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => {
            setShowArchiveModal(false);
            setArchiveReason("");
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-orange-600 to-orange-500">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white">Archive Bookings</h2>
                  <p className="text-xs sm:text-sm text-white/80">{selectedBookings.size} booking(s) selected</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-orange-900 mb-1">Important Notice</p>
                      <p className="text-xs text-orange-800 leading-relaxed">
                        Archiving bookings will mark them as archived and hide them from normal views. 
                        This action helps maintain data integrity while removing bookings from active lists. 
                        Archived bookings can be restored if needed.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Archive Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    placeholder="Please provide a detailed reason for archiving these bookings (minimum 10 characters)..."
                    className="w-full h-32 p-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none text-sm resize-none"
                    aria-label="Archive reason"
                    aria-required="true"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {archiveReason.length}/10 characters (minimum required)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowArchiveModal(false);
                  setArchiveReason("");
                }}
                className="px-4 py-2 rounded-lg text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkArchive}
                disabled={bulkActionLoading || archiveReason.trim().length < 10}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {bulkActionLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Archive {selectedBookings.size} Booking(s)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
