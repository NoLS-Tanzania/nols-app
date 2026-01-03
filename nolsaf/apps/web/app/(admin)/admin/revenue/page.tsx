"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Wallet, Calendar, Eye, DollarSign, Building2, Receipt, FileText, Download, ChevronLeft, ChevronRight, ArrowUpDown, CheckSquare, Square, Printer, Filter, X, CheckCircle2, ArrowUp, ArrowDown } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import TableRow from "@/components/TableRow";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import Link from "next/link";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ 
  baseURL: "", 
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  responseType: 'json',
});

type InvoiceRow = {
  id: number;
  invoiceNumber: string | null;
  receiptNumber: string | null;
  status: string;
  issuedAt: string; // ISO
  total: number;
  commissionPercent: number;
  commissionAmount: number;
  taxPercent: number;
  netPayable: number;
  booking: { id: number; property: { id: number; title: string } };
};

export default function AdminRevenue() {
  const [status, setStatus] = useState<string>("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [date, setDate] = useState<string | string[]>("");
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  // keep legacy from/to in sync with the DatePicker selection
  useEffect(() => {
    if (!date) return;
    if (Array.isArray(date)) {
      setFrom(date[0] || "");
      setTo(date[1] || "");
    } else {
      setFrom(date as string);
      setTo(date as string);
    }
  }, [date]);

  // autofocus search input on load
  useEffect(() => {
    try {
      searchRef.current?.focus();
    } catch (e) {
      // ignore if not available
    }
  }, []);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;
  
  // Sorting
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  const [propertyFilter, setPropertyFilter] = useState<string>("");
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [owners, setOwners] = useState<Array<{ id: number; name: string | null; email: string }>>([]);
  const [properties, setProperties] = useState<Array<{ id: number; title: string }>>([]);

  // Load owners and properties for filters (optional - filters will work without this)
  useEffect(() => {
    (async () => {
      try {
        // Try to load owners and properties, but don't fail if endpoints don't exist
        const [ownersRes, propertiesRes] = await Promise.all([
          api.get("/api/admin/users", { 
            params: { role: "OWNER", page: 1, pageSize: 100 },
            headers: { 'Accept': 'application/json' },
          }).catch((err: any) => {
            console.warn("Failed to load owners for filter:", err?.response?.status || err?.message);
            return { data: { data: [] } };
          }),
          api.get("/api/admin/properties", { 
            params: { status: "APPROVED", page: 1, pageSize: 100 },
            headers: { 'Accept': 'application/json' },
          }).catch((err: any) => {
            console.warn("Failed to load properties for filter:", err?.response?.status || err?.message);
            return { data: { items: [] } };
          }),
        ]);
        const ownersData = (ownersRes.data as any)?.data || [];
        const propertiesData = (propertiesRes.data as any)?.items || [];
        setOwners(ownersData.map((u: any) => ({ id: u.id, name: u.name, email: u.email || "" })));
        setProperties(propertiesData.map((p: any) => ({ id: p.id, title: p.title || "" })));
      } catch (e) {
        // ignore - filters will still work with manual entry
        console.warn("Error loading filter data:", e);
      }
    })();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const params: any = {
        from: from || undefined,
        to: to || undefined,
        q: q || undefined,
        page,
        pageSize,
      };
      
      // Advanced filters
      if (ownerFilter) params.ownerId = Number(ownerFilter);
      if (propertyFilter) params.propertyId = Number(propertyFilter);
      if (amountMin) params.amountMin = Number(amountMin);
      if (amountMax) params.amountMax = Number(amountMax);
      
      // Sorting
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortDir = sortDir;
      }

      // If "New" is selected we treat it as REQUESTED + VERIFIED (combine both)
      if (status === "REQUESTED") {
        const [r1, r2] = await Promise.all([
          api.get<{ items: InvoiceRow[]; total: number }>("/api/admin/revenue/invoices", {
            params: { ...params, status: "REQUESTED" },
          }),
          api.get<{ items: InvoiceRow[]; total: number }>("/api/admin/revenue/invoices", {
            params: { ...params, status: "VERIFIED" },
          }),
        ]);

        // merge and dedupe by id
        const map = new Map<number, InvoiceRow>();
        (r1.data.items || []).forEach((it) => map.set(it.id, it));
        (r2.data.items || []).forEach((it) => map.set(it.id, it));
        let merged = Array.from(map.values());
        
        // Client-side sorting for merged results
        if (sortBy) {
          merged = [...merged].sort((a, b) => {
            let aVal: any, bVal: any;
            switch (sortBy) {
              case "invoiceNumber":
                aVal = a.invoiceNumber ?? a.id;
                bVal = b.invoiceNumber ?? b.id;
                break;
              case "issuedAt":
                aVal = new Date(a.issuedAt).getTime();
                bVal = new Date(b.issuedAt).getTime();
                break;
              case "total":
                aVal = Number(a.total);
                bVal = Number(b.total);
                break;
              case "netPayable":
                aVal = Number(a.netPayable);
                bVal = Number(b.netPayable);
                break;
              default:
                return 0;
            }
            if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
            if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
            return 0;
          });
        }
        
        setItems(merged);
        // Use the larger total from the two requests
        setTotal(Math.max(r1.data.total || 0, r2.data.total || 0));
      } else {
        const r = await api.get<{ items: InvoiceRow[]; total: number }>("/api/admin/revenue/invoices", {
          params: { ...params, status: status || undefined },
        });
        setItems(r.data.items || []);
        setTotal(r.data.total || 0);
      }
    } catch (e: any) {
      // Handle errors gracefully - log but don't crash
      console.error("Error loading invoices:", e?.response?.data || e?.message || e);
      setItems([]);
      setTotal(0);
      
      // If it's a network error or non-JSON response, show a user-friendly message
      if (e?.response?.status === 0 || !e?.response?.data) {
        console.warn("Network error or non-JSON response received");
      }
    } finally {
      setLoading(false);
    }
  }

  // reusable counts fetch (used on mount, when date range changes, and when invoices update via socket)
  const fetchCounts = useMemo(() => {
    return async function () {
      try {
        const statuses = ["", "REQUESTED", "VERIFIED", "APPROVED", "PAID", "REJECTED"];
        const map: Record<string, number> = {};

        // helper to fetch total for a given status
        const getTotal = async (s: string) => {
          if (s === "") {
            const r = await api.get("/api/admin/revenue/invoices", { params: { from: from || undefined, to: to || undefined, page: 1, pageSize: 1 } });
            return (r?.data?.total ?? (Array.isArray(r?.data?.items) ? r.data.items.length : 0)) as number;
          }

          if (s === "REQUESTED") {
            // New = REQUESTED + VERIFIED
            const [a, b] = await Promise.all([
              api.get("/api/admin/revenue/invoices", { params: { status: "REQUESTED", from: from || undefined, to: to || undefined, page: 1, pageSize: 1 } }),
              api.get("/api/admin/revenue/invoices", { params: { status: "VERIFIED", from: from || undefined, to: to || undefined, page: 1, pageSize: 1 } }),
            ]);
            const ta = (a?.data?.total ?? (Array.isArray(a?.data?.items) ? a.data.items.length : 0)) as number;
            const tb = (b?.data?.total ?? (Array.isArray(b?.data?.items) ? b.data.items.length : 0)) as number;
            return ta + tb;
          }

          const r = await api.get("/api/admin/revenue/invoices", { params: { status: s || undefined, from: from || undefined, to: to || undefined, page: 1, pageSize: 1 } });
          return (r?.data?.total ?? (Array.isArray(r?.data?.items) ? r.data.items.length : 0)) as number;
        };

        for (const s of statuses) {
          try {
            map[s || ''] = await getTotal(s);
          } catch (e) {
            map[s || ''] = 0;
          }
        }

        setCounts(map);
      } catch (e) {
        // ignore failures
      }
    };
  }, [from, to]);

  // initial auth + first load
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // reload on filter change or page change
  useEffect(() => {
    setPage(1); // Reset to page 1 when filters change
    setSelectedIds(new Set()); // Clear selection when filters change
  }, [status, from, to, q, ownerFilter, propertyFilter, amountMin, amountMax]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, from, to, q, page, sortBy, sortDir, ownerFilter, propertyFilter, amountMin, amountMax]);

  // Fetch counts for each status so we can show badges on the filter pills (best-effort)
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // 🔌 Socket.io: refresh when an invoice is marked PAID by webhook/admin action
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Use direct API URL for Socket.IO in browser to ensure WebSocket works in dev
    // Convert http:// to ws:// for WebSocket connections
    const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const wsUrl = apiUrl.replace(/^http/, 'ws');
    
    let s: Socket | null = null;
    try {
      s = io(apiUrl, { 
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
        autoConnect: true,
        forceNew: false,
      });

      const refresh = () => {
        load();
        fetchCounts();
      };

      s.on("admin:invoice:paid", refresh);
      s.on("admin:invoice:status", refresh);
      s.on("connect", () => {
        console.debug("Socket.IO connected successfully");
      });
      s.on("connect_error", (err) => {
        // Only log as warning, don't throw - Socket.IO will retry
        console.warn("Socket.IO connection error:", err.message);
      });
      s.on("disconnect", (reason) => {
        console.log("Socket.IO disconnected:", reason);
      });
    } catch (err) {
      console.error("Failed to initialize Socket.IO:", err);
    }

    return () => {
      if (s) {
        try {
          s.off("admin:invoice:paid");
          s.off("admin:invoice:status");
          s.off("connect");
          s.off("connect_error");
          s.off("disconnect");
          s.disconnect();
        } catch (err) {
          console.warn("Error cleaning up Socket.IO:", err);
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sumNet = useMemo(
    () => items.reduce((s, i) => s + Number(i.netPayable || 0), 0),
    [items]
  );

  const emptyMessage = useMemo(() => {
    if (status === "") return "No invoices.";
    if (status === "REQUESTED") return "No new invoices.";
    const map: Record<string, string> = {
      VERIFIED: "No verified invoices.",
      APPROVED: "No approved invoices.",
      PAID: "No paid invoices.",
      REJECTED: "No rejected invoices.",
    };
    return map[status] ?? "No invoices.";
  }, [status]);

  // Bulk selection functions
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk actions
  async function bulkApprove() {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Approve ${selectedIds.size} invoice(s)?`)) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        api.post(`/api/admin/revenue/invoices/${id}/approve`).catch(err => ({ error: err }))
      );
      await Promise.all(promises);
      await load();
      clearSelection();
      alert(`Successfully approved ${selectedIds.size} invoice(s)`);
    } catch (err) {
      console.error("Bulk approve failed", err);
      alert("Some invoices failed to approve. Please check individually.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  async function bulkMarkPaid() {
    if (selectedIds.size === 0) return;
    const paymentRef = prompt(`Enter payment reference for ${selectedIds.size} invoice(s):`);
    if (!paymentRef) return;
    
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedIds).map(id =>
        api.post(`/api/admin/revenue/invoices/${id}/mark-paid`, { method: "BANK", ref: paymentRef }).catch(err => ({ error: err }))
      );
      await Promise.all(promises);
      await load();
      clearSelection();
      alert(`Successfully marked ${selectedIds.size} invoice(s) as paid`);
    } catch (err) {
      console.error("Bulk mark paid failed", err);
      alert("Some invoices failed to mark as paid. Please check individually.");
    } finally {
      setBulkActionLoading(false);
    }
  }

  // Print function
  const handlePrint = () => {
    window.print();
  };

  // Sort handler
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setPage(1);
  };

  function getStatusBadge(status: string) {
    const statusLower = status.toLowerCase();
    if (statusLower === 'paid') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
          {status}
        </span>
      );
    }
    if (statusLower === 'approved') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
          {status}
        </span>
      );
    }
    if (statusLower === 'verified') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
          {status}
        </span>
      );
    }
    if (statusLower === 'requested') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
          {status}
        </span>
      );
    }
    if (statusLower === 'rejected') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
        {status}
      </span>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 min-w-0">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col items-center text-center">
          <div className="rounded-full bg-[#02665e]/10 p-3 inline-flex items-center justify-center mb-3">
            <Wallet className="h-6 w-6 text-[#02665e]" aria-hidden />
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Revenue (Invoices &amp; Payouts)</h1>
          <p className="mt-2 text-xs sm:text-sm text-gray-500">Invoices, payouts and exports</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search */}
          <div className="w-full min-w-0 max-w-full">
            <div className="relative w-full min-w-0 max-w-full">
                <input
                  ref={searchRef}
                className="w-full min-w-0 max-w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-xs sm:text-sm transition-all box-border"
                  placeholder="Search # / receipt / property"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); load(); } }}
                  aria-label="Search invoices"
                style={{ boxSizing: 'border-box', maxWidth: '100%' }}
                />
              <FileText className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0 pointer-events-none" />
        </div>
      </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          {[
            ["", "All"],
            ["REQUESTED", "New"],
            ["VERIFIED", "Verified"],
            ["APPROVED", "Approved"],
            ["PAID", "Paid"],
            ["REJECTED", "Rejected"],
          ].map(([val, label]) => {
            const v = val as string;
            const isActive = status === v || (v === "" && status === "");
            const colorMap: Record<string, { active: string; inactive: string; badge: string }> = {
              '': { active: 'bg-gray-100 border-gray-300 text-gray-800', inactive: 'bg-white hover:bg-gray-50', badge: 'bg-gray-100 text-gray-800' },
              REQUESTED: { active: 'bg-blue-50 border-blue-300 text-blue-700', inactive: 'bg-white hover:bg-blue-50', badge: 'bg-blue-100 text-blue-800' },
              VERIFIED: { active: 'bg-amber-50 border-amber-300 text-amber-700', inactive: 'bg-white hover:bg-amber-50', badge: 'bg-amber-100 text-amber-800' },
              APPROVED: { active: 'bg-emerald-50 border-emerald-300 text-emerald-700', inactive: 'bg-white hover:bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800' },
              PAID: { active: 'bg-teal-50 border-teal-300 text-teal-700', inactive: 'bg-white hover:bg-teal-50', badge: 'bg-teal-100 text-teal-800' },
              REJECTED: { active: 'bg-red-50 border-red-300 text-red-700', inactive: 'bg-white hover:bg-red-50', badge: 'bg-red-100 text-red-800' },
            } as const;

            const colors = colorMap[v as keyof typeof colorMap] ?? colorMap[''];
              const btnClass = `px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border text-xs flex items-center gap-1 sm:gap-1.5 transition-all duration-200 flex-shrink-0 whitespace-nowrap ${isActive ? colors.active : colors.inactive}`;
              const badgeClass = `text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${colors.badge} flex-shrink-0`;

            return (
              <button
                key={String(val) || "all"}
                type="button"
                onClick={() => { setStatus(v); setTimeout(() => load(), 0); }}
                className={btnClass}
              >
                  <span className="whitespace-nowrap">{String(label)}</span>
                <span className={badgeClass}>{counts[v || ''] ?? 0}</span>
              </button>
            );
          })}

            {/* Date Picker */}
            <div className="relative flex-shrink-0">
          <button
            type="button"
            aria-label="Open date picker"
            title="Pick date range"
            onClick={() => {
              setPickerAnim(true);
              window.setTimeout(() => setPickerAnim(false), 350);
              setPickerOpen((v) => !v);
            }}
                className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border text-xs flex items-center justify-center text-gray-700 bg-white transition-all flex-shrink-0 ${
                  pickerAnim ? 'ring-2 ring-blue-100' : 'hover:bg-gray-50'
                }`}
          >
                <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
              <div className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <DatePicker
                  selected={date || undefined}
                  onSelect={(s) => {
                    setDate(s as string | string[]);
                  }}
                  onClose={() => setPickerOpen(false)}
                />
              </div>
            </>
          )}
        </div>

            {/* Advanced Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border text-xs flex items-center gap-1.5 justify-center text-gray-700 bg-white transition-all flex-shrink-0 whitespace-nowrap ${
                showAdvancedFilters ? 'bg-[#02665e]/10 border-[#02665e] text-[#02665e]' : 'hover:bg-gray-50'
              }`}
            >
              <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full border text-xs flex items-center gap-1.5 justify-center text-gray-700 bg-white hover:bg-gray-50 transition-all flex-shrink-0 whitespace-nowrap"
              title="Print invoices"
            >
              <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Print</span>
            </button>
      </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-3 sm:pt-4 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Advanced Filters</h3>
                <button
                  type="button"
                  onClick={() => {
                    setOwnerFilter("");
                    setPropertyFilter("");
                    setAmountMin("");
                    setAmountMax("");
                    setShowAdvancedFilters(false);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors duration-200"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Owner Filter */}
                <div className="min-w-0">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Owner</label>
                  <select
                    value={ownerFilter}
                    onChange={(e) => setOwnerFilter(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-xs sm:text-sm transition-all box-border"
                  >
                    <option value="">All Owners</option>
                    {owners.map(owner => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name || owner.email} ({owner.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Property Filter */}
                <div className="min-w-0">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Property</label>
                  <select
                    value={propertyFilter}
                    onChange={(e) => setPropertyFilter(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-xs sm:text-sm transition-all box-border"
                  >
                    <option value="">All Properties</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.title} ({prop.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount Min */}
                <div className="min-w-0">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Min Amount (TZS)</label>
                  <input
                    type="number"
                    value={amountMin}
                    onChange={(e) => setAmountMin(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-xs sm:text-sm transition-all box-border"
                  />
                </div>

                {/* Amount Max */}
                <div className="min-w-0">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Max Amount (TZS)</label>
                  <input
                    type="number"
                    value={amountMax}
                    onChange={(e) => setAmountMax(e.target.value)}
                    placeholder="No limit"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-xs sm:text-sm transition-all box-border"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="border-t border-gray-200 pt-3 sm:pt-4 flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="text-xs sm:text-sm font-medium text-gray-700">
                {selectedIds.size} invoice{selectedIds.size !== 1 ? 's' : ''} selected
              </div>
              <button
                onClick={clearSelection}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
              <div className="flex-1"></div>
              <button
                onClick={bulkApprove}
                disabled={bulkActionLoading || !Array.from(selectedIds).some(id => {
                  const inv = items.find(i => i.id === id);
                  return inv && (inv.status === "VERIFIED" || inv.status === "REQUESTED");
                })}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {bulkActionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Approve Selected
                  </>
                )}
              </button>
              <button
                onClick={bulkMarkPaid}
                disabled={bulkActionLoading || !Array.from(selectedIds).some(id => {
                  const inv = items.find(i => i.id === id);
                  return inv && inv.status === "APPROVED";
                })}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {bulkActionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Receipt className="h-3.5 w-3.5" />
                    Mark Paid
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Total Summary & Export */}
      <div className="bg-gradient-to-r from-[#02665e]/10 to-emerald-50 rounded-xl border border-[#02665e]/20 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#02665e]/20 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-[#02665e]" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-medium text-gray-600">Total Net (shown)</div>
              <div className="text-xl sm:text-2xl font-bold text-[#02665e]">
                {new Intl.NumberFormat('en-US').format(sumNet)} TZS
              </div>
            </div>
          </div>
          {/* Export Button - Only show for APPROVED invoices */}
          {status === "APPROVED" && items.length > 0 && (
            <button
              onClick={async () => {
                try {
                  const params = new URLSearchParams();
                  params.set("status", "APPROVED");
                  if (from) params.set("from", from);
                  if (to) params.set("to", to);
                  if (q) params.set("q", q);

                  const response = await fetch(`/api/admin/revenue/invoices/export.csv?${params.toString()}`, {
                    credentials: "include",
                  });

                  if (!response.ok) {
                    const errorText = await response.text().catch(() => "Unknown error");
                    console.error("CSV export failed:", response.status, errorText);
                    throw new Error(`Export failed: ${response.status} ${errorText}`);
                  }

                  const blob = await response.blob();
                  
                  // Check if blob is actually CSV (not an error response)
                  if (blob.type && !blob.type.includes('csv') && !blob.type.includes('text')) {
                    const text = await blob.text();
                    console.error("CSV export returned non-CSV:", text);
                    throw new Error("Server returned an error instead of CSV");
                  }
                  
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `approved_invoices_payout_${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (err: any) {
                  console.error("Failed to export CSV:", err);
                  alert(`Failed to export CSV: ${err.message || "Please try again."}`);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#02665e] text-white rounded-lg hover:bg-[#02665e]/90 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm sm:text-base whitespace-nowrap"
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span>Export Approved for Payout</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card Layout */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-emerald-600"></div>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 shadow-sm text-center">
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        </div>
      ) : (
        <>
          {/* Mobile Cards - Hidden on md and up */}
          <div className="md:hidden space-y-3">
            {items.map((inv) => (
              <div
                key={inv.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <button
                      onClick={() => toggleSelect(inv.id)}
                      className="p-1.5 hover:bg-gray-100 rounded-md transition-all duration-200 flex-shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20"
                      title={selectedIds.has(inv.id) ? "Deselect" : "Select"}
                    >
                      {selectedIds.has(inv.id) ? (
                        <CheckSquare className="h-4 w-4 text-[#02665e] stroke-2" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400 stroke-1.5" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {inv.invoiceNumber ?? `#${inv.id}`}
                        </div>
                      </div>
                      {inv.receiptNumber && (
                        <div className="text-xs text-gray-500 ml-6">Receipt: {inv.receiptNumber}</div>
                      )}
                    </div>
                  </div>
                  <Link
                href={`/admin/revenue/${inv.id}`}
                    className="p-2 rounded-lg text-[#02665e] hover:bg-[#02665e]/10 transition-all flex-shrink-0"
                    title="View invoice details"
                  >
                    <Eye className="h-5 w-5" />
                  </Link>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-900 truncate">{inv.booking.property.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">
                      {new Date(inv.issuedAt).toLocaleDateString()} {new Date(inv.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                    <div>
                      <div className="text-xs text-gray-500">Gross</div>
                      <div className="text-sm font-medium text-gray-900">{fmt(inv.total)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Net Payable</div>
                      <div className="text-sm font-bold text-[#02665e]">{fmt(inv.netPayable)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Commission</div>
                      <div className="text-sm text-gray-900">{Number(inv.commissionPercent)}% ({fmt(inv.commissionAmount)})</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Tax</div>
                      <div className="text-sm text-gray-900">{Number(inv.taxPercent) || 0}%</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    {getStatusBadge(inv.status)}
                  </div>
            </div>
          </div>
        ))}
      </div>

          {/* Desktop Table - Hidden on mobile */}
          <div className="hidden md:block bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-10 border-r border-gray-200">
                      <button
                        onClick={toggleSelectAll}
                        className="p-1.5 hover:bg-gray-100 rounded-md transition-all duration-200 mx-auto focus:outline-none focus:ring-2 focus:ring-[#02665e]/20"
                        title={selectedIds.size === items.length ? "Deselect all" : "Select all"}
                        aria-label="Select all invoices"
                      >
                        {selectedIds.size === items.length && items.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-[#02665e] stroke-2" />
                        ) : (
                          <Square className="h-4 w-4 text-gray-400 stroke-1.5" />
                        )}
                      </button>
                    </th>
                    <th 
                      className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("invoiceNumber")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Invoice</span>
                        {sortBy === "invoiceNumber" ? (
                          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Property
                    </th>
                    <th 
                      className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("issuedAt")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Date</span>
                        {sortBy === "issuedAt" ? (
                          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("total")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Gross</span>
                        {sortBy === "total" ? (
                          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Tax
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th 
                      className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleSort("netPayable")}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Net Payable</span>
                        {sortBy === "netPayable" ? (
                          sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUpDown className="h-3 w-3 text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((inv) => (
                    <TableRow key={inv.id}>
                      <td className="px-2 py-3 whitespace-nowrap text-center border-r border-gray-100">
                        <button
                          onClick={() => toggleSelect(inv.id)}
                          className="p-1.5 hover:bg-gray-100 rounded-md transition-all duration-200 mx-auto focus:outline-none focus:ring-2 focus:ring-[#02665e]/20"
                          title={selectedIds.has(inv.id) ? "Deselect" : "Select"}
                          aria-label={selectedIds.has(inv.id) ? "Deselect invoice" : "Select invoice"}
                        >
                          {selectedIds.has(inv.id) ? (
                            <CheckSquare className="h-4 w-4 text-[#02665e] stroke-2" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-400 stroke-1.5" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {inv.invoiceNumber ?? `#${inv.id}`}
                            </div>
                            {inv.receiptNumber && (
                              <div className="text-xs text-gray-500 truncate">
                                Receipt: {inv.receiptNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="text-sm text-gray-900 truncate">{inv.booking.property.title}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(inv.issuedAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(inv.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{fmt(inv.total)}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-600">
                          {Number(inv.commissionPercent)}%
                        </div>
                        <div className="text-sm font-medium text-gray-900">{fmt(inv.commissionAmount)}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{Number(inv.taxPercent) || 0}%</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(inv.status)}
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-bold text-[#02665e]">{fmt(inv.netPayable)}</div>
                      </td>
                      <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-center">
                        <Link
                          href={`/admin/revenue/${inv.id}`}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-[#02665e] hover:bg-[#02665e]/10 transition-all duration-200"
                          title="View invoice details"
                        >
                          <Eye className="h-5 w-5" />
                        </Link>
                      </td>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {total > pageSize && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{(page - 1) * pageSize + 1}</span> to{" "}
                  <span className="font-semibold text-gray-900">{Math.min(page * pageSize, total)}</span> of{" "}
                  <span className="font-semibold text-gray-900">{total}</span> invoices
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                    className="p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {(() => {
                      const totalPages = Math.ceil(total / pageSize);
                      const pages: (number | string)[] = [];
                      
                      if (totalPages <= 7) {
                        // Show all pages if 7 or fewer
                        for (let i = 1; i <= totalPages; i++) {
                          pages.push(i);
                        }
                      } else {
                        // Always show first page
                        pages.push(1);
                        
                        if (page <= 4) {
                          // Near the start: show 1, 2, 3, 4, 5, ..., last
                          for (let i = 2; i <= 5; i++) {
                            pages.push(i);
                          }
                          pages.push('...');
                          pages.push(totalPages);
                        } else if (page >= totalPages - 3) {
                          // Near the end: show 1, ..., last-4, last-3, last-2, last-1, last
                          pages.push('...');
                          for (let i = totalPages - 4; i <= totalPages; i++) {
                            pages.push(i);
                          }
                        } else {
                          // In the middle: show 1, ..., page-1, page, page+1, ..., last
                          pages.push('...');
                          pages.push(page - 1);
                          pages.push(page);
                          pages.push(page + 1);
                          pages.push('...');
                          pages.push(totalPages);
                        }
                      }
                      
                      return pages.map((p, idx) => {
                        if (p === '...') {
                          return <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>;
                        }
                        return (
                          <button
                            key={p}
                            onClick={() => setPage(p as number)}
                            disabled={loading}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                              page === p
                                ? "bg-[#02665e] text-white"
                                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {p}
                          </button>
                        );
                      });
                    })()}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize), p + 1))}
                    disabled={page >= Math.ceil(total / pageSize) || loading}
                    className="p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function fmt(n: any) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "TZS" }).format(
    Number(n || 0)
  );
}
