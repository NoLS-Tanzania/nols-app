"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Truck, Search, X, User, MapPin, Calendar, Clock, AlertTriangle, CheckCircle, FileText, Filter, Eye } from "lucide-react";
import axios from "axios";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {}

type TransportBooking = {
  id: number;
  groupType: string;
  toRegion: string;
  toLocation: string | null;
  fromRegion: string | null;
  fromLocation: string | null;
  checkIn: string | null;
  checkOut: string | null;
  useDates: boolean;
  headcount: number;
  status: string;
  totalAmount: number | null;
  currency: string;
  pickupLocation: string | null;
  pickupTime: string | null;
  arrangementNotes: string | null;
  createdAt: string;
  urgency: "urgent" | "later" | "specified" | "flexible";
  urgencyReason: string;
  user: {
    id: number;
    name: string | null;
    email: string;
    phone: string | null;
  };
};

export default function TransportBookingsPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TransportBooking[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);

  async function load() {
    setLoading(true);
    try {
      authify();
      const params: any = { page, pageSize };
      if (status) params.status = status;
      if (q) params.q = q;

      const r = await api.get<{ items: TransportBooking[]; total: number }>("/admin/users/transport-bookings", { params });
      setItems(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (err) {
      console.error("Failed to load transport bookings", err);
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    authify();
    load();
  }, [page, status, q]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const getUrgencyBadge = (urgency: string, reason: string) => {
    switch (urgency) {
      case "urgent":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Urgent: {reason}
          </span>
        );
      case "later":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="h-3 w-3 mr-1" />
            Later: {reason}
          </span>
        );
      case "specified":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <Calendar className="h-3 w-3 mr-1" />
            {reason}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
            <Clock className="h-3 w-3 mr-1" />
            Flexible
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string }> = {
      PENDING: { bg: "bg-gray-100", text: "text-gray-800" },
      CONFIRMED: { bg: "bg-blue-100", text: "text-blue-800" },
      PROCESSING: { bg: "bg-amber-100", text: "text-amber-800" },
      COMPLETED: { bg: "bg-emerald-100", text: "text-emerald-800" },
      CANCELED: { bg: "bg-red-100", text: "text-red-800" },
    };
    const colors = statusMap[status] || { bg: "bg-gray-100", text: "text-gray-800" };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
            <Truck className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Bookings</h1>
          <p className="text-sm text-gray-500 mt-1">Customers who booked properties with transport services</p>
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
              placeholder="Search by customer name, email, phone, or location..."
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
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <>
            {/* Skeleton Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Urgency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Group Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Pickup Info</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-40"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-6 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-8 bg-gray-200 rounded w-16 ml-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No transport bookings found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Urgency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Group Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Pickup Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{booking.user.name || "N/A"}</div>
                      <div className="text-sm text-gray-500">{booking.user.email}</div>
                      {booking.user.phone && (
                        <div className="text-xs text-gray-400">{booking.user.phone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{booking.toRegion}</div>
                          {booking.toLocation && (
                            <div className="text-xs text-gray-500">{booking.toLocation}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {booking.checkIn && booking.checkOut ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <div className="text-sm">
                            <div>{new Date(booking.checkIn).toLocaleDateString()}</div>
                            <div className="text-xs text-gray-500">to {new Date(booking.checkOut).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Flexible</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getUrgencyBadge(booking.urgency, booking.urgencyReason)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{booking.groupType}</div>
                        <div className="text-xs text-gray-500">{booking.headcount} people</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {booking.pickupLocation ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{booking.pickupLocation}</div>
                          {booking.pickupTime && (
                            <div className="text-xs text-gray-500">{booking.pickupTime}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Link
                        href={`/admin/group-stays/bookings?bookingId=${booking.id}`}
                        className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-900 text-sm font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {items.length > 0 && (
        <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="text-sm text-gray-500">
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} bookings
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

