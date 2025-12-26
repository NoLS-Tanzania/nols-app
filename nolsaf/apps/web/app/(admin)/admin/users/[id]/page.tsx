"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { 
  Mail, Phone, Calendar, Lock, CheckCircle, XCircle, 
  ShoppingCart, DollarSign, ArrowLeft, Ban, UserCheck, 
  CreditCard, Eye
} from "lucide-react";

const api = axios.create({ baseURL: "", withCredentials: true });

type UserDetail = {
  id: number;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  createdAt: string;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  twoFactorEnabled: boolean;
  suspendedAt: string | null;
  isDisabled: boolean | null;
  _count: {
    bookings: number;
  };
};

type Booking = {
  id: number;
  status: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  guestName: string | null;
  guestPhone: string | null;
  roomCode: string | null;
  createdAt: string;
  property: {
    id: number;
    title: string;
    type: string | null;
    regionName: string | null;
    city: string | null;
    district: string | null;
  };
  code: {
    id: number;
    status: string;
    codeVisible: string | null;
  } | null;
};

type UserDetailResponse = {
  user: UserDetail;
  bookings: Booking[];
  stats: {
    booking: {
      total: number;
      confirmed: number;
      checkedIn: number;
      checkedOut: number;
      canceled: number;
    };
    revenue: {
      total: number;
      invoiceCount: number;
    };
    lastBooking: {
      id: number;
      createdAt: string;
      status: string;
    } | null;
  };
};

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const userId = Number(params.id);
  const router = useRouter();
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "bookings">("overview");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get<UserDetailResponse>(`/admin/users/${userId}`);
      setData(r.data);
    } catch (err: any) {
      console.error("Failed to load user details:", err);
      if (err?.response?.status === 404) {
        alert("User not found");
        router.push("/admin/users/list");
      }
    } finally {
      setLoading(false);
    }
  }, [userId, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function suspend() {
    if (!window.confirm("Are you sure you want to suspend this user?")) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/users/${userId}/suspend`);
      await load();
      alert("User suspended successfully");
    } catch (err: any) {
      console.error("Failed to suspend user:", err);
      alert(err?.response?.data?.error || "Failed to suspend user");
    } finally {
      setActionLoading(false);
    }
  }

  async function unsuspend() {
    if (!window.confirm("Are you sure you want to unsuspend this user?")) return;
    setActionLoading(true);
    try {
      await api.post(`/admin/users/${userId}/unsuspend`);
      await load();
      alert("User unsuspended successfully");
    } catch (err: any) {
      console.error("Failed to unsuspend user:", err);
      alert(err?.response?.data?.error || "Failed to unsuspend user");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-emerald-600"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Failed to load user data</p>
          <Link href="/admin/users/list" className="text-emerald-600 hover:text-emerald-700 mt-4 inline-block">
            ← Back to users list
          </Link>
        </div>
      </div>
    );
  }

  const { user, bookings = [], stats } = data;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/users/list"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Back to users list"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{user.name || `User #${user.id}`}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                {user.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Joined: {new Date(user.createdAt).toLocaleDateString()} at{" "}
                    {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {user.suspendedAt ? (
              <button
                onClick={unsuspend}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Unsuspend
              </button>
            ) : (
              <button
                onClick={suspend}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Ban className="h-4 w-4" />
                Suspend
              </button>
            )}
            {user.phone && (
              <a
                href={`tel:${user.phone}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
            )}
            {user.email && (
              <a
                href={`mailto:${user.email}`}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-3">
        {user.emailVerifiedAt && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Email Verified</span>
          </div>
        )}
        {user.phoneVerifiedAt && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Phone Verified</span>
          </div>
        )}
        {user.twoFactorEnabled && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <Lock className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">2FA Enabled</span>
          </div>
        )}
        {user.suspendedAt && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <Ban className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-900">Suspended</span>
          </div>
        )}
        {user.isDisabled && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Disabled</span>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-6 w-6 text-blue-600" />
            <div>
              <div className="text-sm font-medium text-gray-500">Total Bookings</div>
              <div className="text-2xl font-bold text-gray-900">{stats.booking.total}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
            <div>
              <div className="text-sm font-medium text-gray-500">Confirmed</div>
              <div className="text-2xl font-bold text-gray-900">{stats.booking.confirmed}</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <DollarSign className="h-6 w-6 text-amber-600" />
            <div>
              <div className="text-sm font-medium text-gray-500">Total Revenue</div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.revenue.total.toLocaleString()} TZS
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-purple-600" />
            <div>
              <div className="text-sm font-medium text-gray-500">Invoices</div>
              <div className="text-2xl font-bold text-gray-900">{stats.revenue.invoiceCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex gap-1 px-6">
            <button
              onClick={() => setTab("overview")}
              className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                tab === "overview"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setTab("bookings")}
              className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                tab === "bookings"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Bookings ({bookings.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {tab === "overview" && (
            <div className="space-y-6">
              {/* User Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">User Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500 mb-1">Name</div>
                    <div className="text-base font-semibold text-gray-900">{user.name || "N/A"}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500 mb-1">Email</div>
                    <div className="text-base font-semibold text-gray-900">{user.email}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500 mb-1">Phone</div>
                    <div className="text-base font-semibold text-gray-900">{user.phone || "N/A"}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500 mb-1">Role</div>
                    <div className="text-base font-semibold text-gray-900">{user.role}</div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500 mb-1">Email Verified</div>
                    <div className="text-base font-semibold text-gray-900">
                      {user.emailVerifiedAt
                        ? new Date(user.emailVerifiedAt).toLocaleString()
                        : "Not verified"}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-500 mb-1">Phone Verified</div>
                    <div className="text-base font-semibold text-gray-900">
                      {user.phoneVerifiedAt
                        ? new Date(user.phoneVerifiedAt).toLocaleString()
                        : "Not verified"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Booking Statistics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Statistics</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">{stats.booking.total}</div>
                    <div className="text-sm text-gray-600 mt-1">Total</div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-emerald-600">{stats.booking.confirmed}</div>
                    <div className="text-sm text-gray-600 mt-1">Confirmed</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">{stats.booking.checkedIn}</div>
                    <div className="text-sm text-gray-600 mt-1">Checked In</div>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-600">{stats.booking.canceled}</div>
                    <div className="text-sm text-gray-600 mt-1">Canceled</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "bookings" && (
            <div>
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No bookings found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Property</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In/Out</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookings.map((booking) => (
                        <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-4">
                            {booking.property ? (
                              <>
                                <div className="font-medium text-gray-900">{booking.property.title}</div>
                                <div className="text-sm text-gray-500">
                                  {[booking.property.regionName, booking.property.city, booking.property.district]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </div>
                                {booking.property.type && (
                                  <div className="text-xs text-gray-400 mt-1">{booking.property.type}</div>
                                )}
                              </>
                            ) : (
                              <div className="text-gray-400">Property not found</div>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm text-gray-900">
                              {new Date(booking.checkIn).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-gray-500">
                              to {new Date(booking.checkOut).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-gray-900">
                              {Number(booking.totalAmount).toLocaleString()} TZS
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                booking.status === "CONFIRMED"
                                  ? "bg-blue-100 text-blue-800"
                                  : booking.status === "CHECKED_IN"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : booking.status === "CHECKED_OUT"
                                  ? "bg-purple-100 text-purple-800"
                                  : booking.status === "CANCELED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {booking.status}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            {booking.code ? (
                              <div>
                                <div className="text-sm font-mono text-gray-900">
                                  {booking.code.codeVisible || "N/A"}
                                </div>
                                <div className="text-xs text-gray-500">{booking.code.status}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">No code</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <Link
                              href={`/admin/bookings/${booking.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
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
          )}
        </div>
      </div>
    </div>
  );
}

