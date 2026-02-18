"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Users, Search, X, Mail, Phone, Lock, ShoppingCart, DollarSign, Eye, MoreVertical, CheckCircle, XCircle, Loader2, Filter } from "lucide-react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import Chart from "@/components/Chart";
import TableRow from "@/components/TableRow";
import type { ChartData } from "chart.js";

const api = axios.create({ baseURL: "", withCredentials: true });

type CustomerRow = {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  twoFactorEnabled: boolean;
  suspendedAt?: string | null;
  isDisabled?: boolean | null;
  bookingCount?: number;
  totalSpent?: number;
  lastBookingDate?: string | null;
};

type CustomersSummary = {
  totalCustomers: number;
  activeCustomers: number;
  totalBookings: number;
  totalRevenue: number;
  verifiedEmailCount?: number;
  verifiedPhoneCount?: number;
};

export default function AdminUsersListPage(){
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalBookings: 0,
    totalRevenue: 0,
    verifiedCustomers: 0,
  });
  const pageSize = 30;
  const role = "CUSTOMER";

  const searchRef = useRef<HTMLInputElement | null>(null);
  const [suggestions, setSuggestions] = useState<CustomerRow[]>([]);
  const [showActionsMenu, setShowActionsMenu] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const isCustomerSuspended = useCallback((c: CustomerRow) => {
    const disabled = (c.isDisabled as any) === true || (c.isDisabled as any) === 1;
    return Boolean(c.suspendedAt) || disabled;
  }, []);

  const load = useCallback(async ()=>{
    setLoading(true);
    try {
      // IMPORTANT: Use /api/* to avoid colliding with Next pages under /admin/users/*
      // (e.g. /admin/users is a page route, not an API route).
      const [listRes, summaryRes] = await Promise.all([
        api.get<{ data: CustomerRow[]; meta: { total: number } }>("/api/admin/users", {
          params: { q, status, page, perPage: pageSize, role },
        }),
        api.get<CustomersSummary>("/api/admin/users/summary"),
      ]);

      setItems(listRes.data.data || []);
      setTotal(listRes.data.meta?.total || 0);

      const summary = summaryRes.data;
      const verified = Number(summary.verifiedEmailCount || 0) + Number(summary.verifiedPhoneCount || 0);
      setStats({
        totalCustomers: Number(summary.totalCustomers || 0),
        activeCustomers: Number(summary.activeCustomers || 0),
        totalBookings: Number(summary.totalBookings || 0),
        totalRevenue: Number(summary.totalRevenue || 0),
        verifiedCustomers: verified,
      });
    } catch (err) {
      console.error("Failed to load customers", err);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [q, status, page, role]);

  useEffect(()=>{ load(); }, [load]);

  useEffect(()=>{
    const term = q; 
    if(!term || term.trim()===""){ 
      setSuggestions([]); 
      return; 
    }
    const t = setTimeout(()=>{ 
      (async ()=>{
        try{ 
          const r = await api.get<{ data: CustomerRow[] }>("/api/admin/users", { params: { status, q: term, page:1, perPage:5, role } }); 
          setSuggestions(r.data.data ?? []); 
        } catch(e){ 
          setSuggestions([]); 
        }
      })(); 
    }, 400);
    return ()=> clearTimeout(t);
  }, [q, status, role]);

  useEffect(()=>{ 
    const url = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
      : (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "");
    const s: Socket = io(url, { transports:['websocket'] }); 
    s.on("admin:user:updated", load); 
    return ()=>{ s.off("admin:user:updated", load); s.disconnect(); }; 
  }, [load]);

  const pages = useMemo(()=> Math.max(1, Math.ceil(total / pageSize)), [total]);

  // Chart data for customer engagement
  const engagementChartData = useMemo<ChartData<"doughnut">>(() => {
    const withBookings = items.filter(c => (c.bookingCount || 0) > 0).length;
    const withoutBookings = items.filter(c => (c.bookingCount || 0) === 0).length;
    
    return {
      labels: ["With Bookings", "No Bookings Yet"],
      datasets: [
        {
          label: "Customer Engagement",
          data: [withBookings, withoutBookings],
          backgroundColor: [
            "rgba(16, 185, 129, 0.8)", // Green
            "rgba(156, 163, 175, 0.8)", // Gray
          ],
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, [items]);

  const handleReset2FA = async (customerId: number) => {
    if (!confirm("Are you sure you want to reset 2FA for this customer?")) return;
    setActionLoading(customerId);
    try {
      await api.patch(`/api/admin/users/${customerId}`, { reset2FA: true });
      await load();
      setShowActionsMenu(null);
    } catch (err) {
      console.error("Failed to reset 2FA", err);
      alert("Failed to reset 2FA");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (customerId: number) => {
    if (!confirm("Are you sure you want to suspend this customer?")) return;
    setActionLoading(customerId);
    try {
      // Using disable endpoint if suspend endpoint doesn't exist
      await api.patch(`/api/admin/users/${customerId}`, { disable: true });
      await load();
      setShowActionsMenu(null);
    } catch (err: any) {
      console.error("Failed to suspend customer", err);
      alert(err.response?.data?.error || "Failed to suspend customer. Note: This feature may require database migration.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">All Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customers who book, review, pay, and add transportation</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-600" />
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500">Total Customers</div>
              <div className="text-xl font-bold text-gray-900">
                {loading ? "..." : stats.totalCustomers.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500">Active</div>
              <div className="text-xl font-bold text-gray-900">
                {loading ? "..." : stats.activeCustomers.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-purple-600" />
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500">Total Bookings</div>
              <div className="text-xl font-bold text-gray-900">
                {loading ? "..." : stats.totalBookings.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500">Total Revenue</div>
              <div className="text-xl font-bold text-gray-900">
                {loading ? "..." : `TZS ${stats.totalRevenue.toLocaleString()}`}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-indigo-600" />
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500">Verified</div>
              <div className="text-xl font-bold text-gray-900">
                {loading ? "..." : stats.verifiedCustomers.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-full">
          {/* Search */}
          <div className="relative flex-1 min-w-0 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm box-border max-w-full"
              placeholder="Search by name, email, or phone..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setPage(1);
                  load();
                }
              }}
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setPage(1);
                  load();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-2 z-10 bg-white border rounded-lg shadow-lg max-h-56 overflow-auto">
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setQ(s.name ?? s.email);
                      setSuggestions([]);
                      setPage(1);
                      load();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                  >
                    <div className="font-medium">{s.name ?? s.email}</div>
                    <div className="text-xs text-gray-500">{s.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-shrink-0">
            <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white box-border min-w-[140px]"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chart */}
      {items.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Engagement</h2>
          <div className="h-64">
            <Chart type="doughnut" data={engagementChartData} />
          </div>
        </div>
      )}

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <>
            {/* Skeleton Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Verification</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Total Spent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Last Booking</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i} hover={false} className="animate-pulse">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-40"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-8 bg-gray-200 rounded w-8 ml-auto"></div>
                      </td>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No customers found.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Account ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Verification</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Bookings</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Total Spent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Last Booking</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((customer) => (
                    <TableRow key={customer.id} className="align-middle">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{customer.name || "N/A"}</div>
                        <div className="text-sm text-gray-500">{customer.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">#{customer.id}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.phone || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {customer.emailVerifiedAt && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800" title="Email Verified">
                              <Mail className="h-3 w-3" />
                            </span>
                          )}
                          {customer.phoneVerifiedAt && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800" title="Phone Verified">
                              <Phone className="h-3 w-3" />
                            </span>
                          )}
                          {customer.twoFactorEnabled && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800" title="2FA Enabled">
                              <Lock className="h-3 w-3" />
                            </span>
                          )}
                          {!customer.emailVerifiedAt && !customer.phoneVerifiedAt && !customer.twoFactorEnabled && (
                            <span className="text-xs text-gray-400">None</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isCustomerSuspended(customer) ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 text-red-700 px-2.5 py-1 text-xs font-semibold">
                            <XCircle className="h-3.5 w-3.5" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-semibold">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{customer.bookingCount || 0}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {customer.totalSpent ? `TZS ${customer.totalSpent.toLocaleString()}` : "TZS 0"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer.lastBookingDate ? new Date(customer.lastBookingDate).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="relative">
                          <button
                            aria-label="Customer actions"
                            onClick={() => setShowActionsMenu(showActionsMenu === customer.id ? null : customer.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {actionLoading === customer.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </button>
                          {showActionsMenu === customer.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setShowActionsMenu(null)} />
                              <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden divide-y divide-gray-100">
                                <Link
                                  href={`/admin/users/${customer.id}`}
                                  className="w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center gap-2 no-underline hover:no-underline"
                                  onClick={() => setShowActionsMenu(null)}
                                >
                                  <Eye className="h-4 w-4 text-blue-600" />
                                  View Details
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleReset2FA(customer.id)}
                                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none flex items-center gap-2"
                                >
                                  <Lock className="h-4 w-4 text-amber-600" />
                                  Reset 2FA
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSuspend(customer.id)}
                                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:outline-none flex items-center gap-2"
                                >
                                  <XCircle className="h-4 w-4 text-red-600" />
                                  Suspend
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {items.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-sm text-gray-500">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} customers
          </div>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <div className="px-4 py-2 text-sm font-medium text-gray-700">
              Page {page} of {pages}
            </div>
            <button
              disabled={page >= pages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
