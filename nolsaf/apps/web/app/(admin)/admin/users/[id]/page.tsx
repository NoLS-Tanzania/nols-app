"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { 
  Mail, Phone, Calendar, Lock, CheckCircle, XCircle, 
  ShoppingCart, DollarSign, ArrowLeft, Ban, UserCheck, 
  CreditCard, Eye, History, Activity, Clock, X
} from "lucide-react";

// IMPORTANT: Use same-origin requests so Next.js can proxy via `rewrites()`.
// Hardcoding `http://localhost:4000` from the browser triggers CORS failures.
const api = axios.create({ withCredentials: true });

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
  user?: UserDetail | null;
  bookings?: Booking[];
  stats?: {
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

export default function AdminUserDetailPage() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(routeParams?.id) ? routeParams?.id?.[0] : routeParams?.id;
  const userId = Number(idParam);
  const isValidUserId = Number.isFinite(userId) && userId > 0;
  const router = useRouter();
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "bookings">("overview");
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [showUnsuspendForm, setShowUnsuspendForm] = useState(false);
  const [unsuspendNotification, setUnsuspendNotification] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isValidUserId) return;
    setLoading(true);
    try {
      const r = await api.get<UserDetailResponse>(`/api/admin/users/${userId}`);
      setData(r.data);
      setLoadError(null);
    } catch (err: any) {
      console.error("Failed to load user details:", err);
      const serverData = err?.response?.data;
      const stage = typeof serverData?.stage === "string" ? serverData.stage : null;
      const message = typeof serverData?.message === "string" ? serverData.message : null;
      const errorText =
        stage || message
          ? `Server error${stage ? ` (${stage})` : ""}${message ? `: ${message}` : ""}`
          : (typeof serverData?.error === "string" ? serverData.error : null);
      setLoadError(errorText || "Failed to load user details");
      if (err?.response?.status === 404) {
        alert("User not found");
        router.push("/admin/users/list");
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // router is stable, don't include in deps

  const loadAuditHistory = useCallback(async () => {
    if (!isValidUserId) return;
    try {
      setAuditLoading(true);
      const r = await api.get<any>(`/api/admin/audits?targetId=${userId}`);
      const raw: any = r.data;
      const next =
        Array.isArray(raw)
          ? raw
          : (
              (Array.isArray(raw?.items) && raw.items) ||
              (Array.isArray(raw?.data) && raw.data) ||
              (Array.isArray(raw?.data?.items) && raw.data.items) ||
              []
            );
      setAuditHistory(next);
    } catch (err: any) {
      console.error("Failed to load audit history:", err);
      setAuditHistory([]);
    } finally {
      setAuditLoading(false);
    }
  }, [userId, isValidUserId]);

  useEffect(() => {
    if (isValidUserId) {
      load();
      loadAuditHistory();
    } else {
      setLoading(false);
    }
  }, [load, loadAuditHistory, isValidUserId]);

  async function handleSuspendSubmit() {
    if (!suspendReason.trim()) {
      setSuccessMessage(null);
      alert("Please provide a reason for suspension. This action will be logged.");
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post(`/api/admin/users/${userId}/suspend`, { 
        reason: suspendReason.trim()
      });
      setSuspendReason("");
      setShowSuspendForm(false);
      await load();
      await loadAuditHistory();
      setSuccessMessage("User suspended successfully. The user can no longer access their account.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Failed to suspend user:", err);
      setSuccessMessage(null);
      alert(err?.response?.data?.error || "Failed to suspend user");
    } finally {
      setActionLoading(false);
    }
  }

  function handleSuspendClick() {
    setShowSuspendForm(true);
    setSuspendReason("");
  }

  function cancelSuspend() {
    setShowSuspendForm(false);
    setSuspendReason("");
  }

  async function handleUnsuspendSubmit() {
    if (!unsuspendNotification.trim()) {
      setSuccessMessage(null);
      alert("Please provide a notification message for the user. This will be logged in the audit history.");
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post(`/api/admin/users/${userId}/unsuspend`, { 
        notification: unsuspendNotification.trim()
      });
      setUnsuspendNotification("");
      setShowUnsuspendForm(false);
      await load();
      await loadAuditHistory();
      setSuccessMessage("User unsuspended successfully. The user can now access their account again.");
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      console.error("Failed to unsuspend user:", err);
      setSuccessMessage(null);
      alert(err?.response?.data?.error || "Failed to unsuspend user");
    } finally {
      setActionLoading(false);
    }
  }

  function handleUnsuspendClick() {
    setShowUnsuspendForm(true);
    setUnsuspendNotification("");
  }

  function cancelUnsuspend() {
    setShowUnsuspendForm(false);
    setUnsuspendNotification("");
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
          <p className="text-gray-500">{loadError || "Failed to load user data"}</p>
          <Link href="/admin/users/list" className="text-emerald-600 hover:text-emerald-700 mt-4 inline-block">
            ← Back to users list
          </Link>
        </div>
      </div>
    );
  }

  const user = data.user ?? null;
  const bookings = data.bookings ?? [];
  const stats =
    data.stats ??
    ({
      booking: {
        total: 0,
        confirmed: 0,
        checkedIn: 0,
        checkedOut: 0,
        canceled: 0,
      },
      revenue: {
        total: 0,
        invoiceCount: 0,
      },
      lastBooking: null,
    } satisfies NonNullable<UserDetailResponse["stats"]>);

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">User not found (or invalid response)</p>
          <Link href="/admin/users/list" className="text-emerald-600 hover:text-emerald-700 mt-4 inline-block">
            ← Back to users list
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message Card */}
        {successMessage && (
          <div className="mb-6 bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl shadow-lg p-4 sm:p-5 flex items-start gap-3 sm:gap-4 animate-in slide-in-from-top-2">
            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-bold text-emerald-900 mb-1">Success!</h4>
              <p className="text-xs sm:text-sm text-emerald-800">{successMessage}</p>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="flex-shrink-0 p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-700" />
            </button>
          </div>
        )}

        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-emerald-50 to-blue-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/users/list"
                className="p-2 hover:bg-white/60 rounded-lg transition-all duration-200 hover:shadow-sm"
                title="Back to users list"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </Link>
              <div className="h-8 w-px bg-gray-300" />
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                  {user.name || `User #${user.id}`}
                </h1>
                <p className="text-sm text-gray-500 mt-1">User ID: {user.id}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* User Info */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.email}</p>
                    </div>
                  </div>

                  {user.phone && (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Phone className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone</p>
                        <p className="text-sm font-semibold text-gray-900">{user.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Joined</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(user.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(user.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <UserCheck className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Role</p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:min-w-[200px]">
                {user.suspendedAt ? (
                  <button
                    onClick={handleUnsuspendClick}
                    disabled={actionLoading}
                    className="px-5 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md"
                  >
                    <UserCheck className="h-4 w-4" />
                    Unsuspend
                  </button>
                ) : (
                  <button
                    onClick={handleSuspendClick}
                    disabled={actionLoading}
                    className="px-5 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md"
                  >
                    <Ban className="h-4 w-4" />
                    Suspend
                  </button>
                )}
                {user.phone && (
                  <a
                    href={`tel:${user.phone}`}
                    className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md no-underline"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                )}
                {user.email && (
                  <a
                    href={`mailto:${user.email}`}
                    className="px-5 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-sm hover:shadow-md no-underline"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Suspend Form */}
        {showSuspendForm && (
          <div className="w-full bg-white rounded-xl border border-red-200 shadow-sm p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 box-border">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <Ban className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-red-600" />
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Suspend User</h3>
            </div>
            <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
              <div className="w-full">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 md:mb-2">
                  Reason for Suspension <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full min-h-[70px] sm:min-h-[80px] md:min-h-[100px] px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none box-border"
                  placeholder="Enter the reason for suspending this user. This will be logged in the audit history."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 md:gap-3">
                <button
                  onClick={handleSuspendSubmit}
                  disabled={actionLoading || !suspendReason.trim()}
                  className="w-full sm:w-auto sm:flex-initial px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base font-medium shadow-sm hover:shadow-md whitespace-nowrap"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent flex-shrink-0"></div>
                      <span>Suspending...</span>
                    </>
                  ) : (
                    "Confirm Suspend"
                  )}
                </button>
                <button
                  onClick={cancelSuspend}
                  disabled={actionLoading}
                  className="w-full sm:w-auto sm:flex-initial px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base font-medium whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Unsuspend Form */}
        {showUnsuspendForm && (
          <div className="w-full bg-white rounded-xl border border-emerald-200 shadow-sm p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 box-border">
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <UserCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-emerald-600" />
              </div>
              <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Unsuspend User</h3>
            </div>
            <div className="space-y-2.5 sm:space-y-3 md:space-y-4">
              <div className="w-full">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5 md:mb-2">
                  Notification Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  className="w-full min-h-[70px] sm:min-h-[80px] md:min-h-[100px] px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none box-border"
                  placeholder="Enter a notification message for the user. This will be logged in the audit history."
                  value={unsuspendNotification}
                  onChange={(e) => setUnsuspendNotification(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 md:gap-3">
                <button
                  onClick={handleUnsuspendSubmit}
                  disabled={actionLoading || !unsuspendNotification.trim()}
                  className="w-full sm:w-auto sm:flex-initial px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base font-medium shadow-sm hover:shadow-md whitespace-nowrap"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent flex-shrink-0"></div>
                      <span>Unsuspending...</span>
                    </>
                  ) : (
                    "Confirm Unsuspend"
                  )}
                </button>
                <button
                  onClick={cancelUnsuspend}
                  disabled={actionLoading}
                  className="w-full sm:w-auto sm:flex-initial px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm md:text-base font-medium whitespace-nowrap"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Status Badges */}
        <div className="flex flex-wrap gap-3 mb-6">
          {user.emailVerifiedAt && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 flex items-center gap-2.5 shadow-sm hover:shadow-md transition-shadow">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-blue-900">Email Verified</span>
            </div>
          )}
          {user.phoneVerifiedAt && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 flex items-center gap-2.5 shadow-sm hover:shadow-md transition-shadow">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-green-900">Phone Verified</span>
            </div>
          )}
          {user.twoFactorEnabled && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-2.5 flex items-center gap-2.5 shadow-sm hover:shadow-md transition-shadow">
              <Lock className="h-5 w-5 text-purple-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-purple-900">2FA Enabled</span>
            </div>
          )}
          {user.suspendedAt && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 flex items-center gap-2.5 shadow-sm hover:shadow-md transition-shadow">
              <Ban className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-red-900">Suspended</span>
            </div>
          )}
          {user.isDisabled && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex items-center gap-2.5 shadow-sm hover:shadow-md transition-shadow">
              <XCircle className="h-5 w-5 text-gray-600 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-900">Disabled</span>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Bookings</p>
                <p className="text-3xl font-bold text-gray-900">{stats.booking.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Confirmed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.booking.confirmed}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl group-hover:bg-emerald-200 transition-colors">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.revenue.total.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">TZS</p>
              </div>
              <div className="p-3 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors">
                <DollarSign className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Invoices</p>
                <p className="text-3xl font-bold text-gray-900">{stats.revenue.invoiceCount}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex gap-1 px-6">
              <button
                onClick={() => setTab("overview")}
                className={`px-6 py-4 font-semibold text-sm transition-all duration-200 border-b-2 relative ${
                  tab === "overview"
                    ? "border-emerald-600 text-emerald-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Overview
                {tab === "overview" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                )}
              </button>
              <button
                onClick={() => setTab("bookings")}
                className={`px-6 py-4 font-semibold text-sm transition-all duration-200 border-b-2 relative ${
                  tab === "bookings"
                    ? "border-emerald-600 text-emerald-600 bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                Bookings
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  tab === "bookings"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-200 text-gray-600"
                }`}>
                  {bookings.length}
                </span>
                {tab === "bookings" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
                )}
              </button>
            </div>
          </div>

          <div className="p-6">
            {tab === "overview" && (
              <div className="space-y-8">
                {/* User Information */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-emerald-600"></div>
                    User Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Name</div>
                      <div className="text-lg font-bold text-gray-900">{user.name || "N/A"}</div>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email</div>
                      <div className="text-lg font-bold text-gray-900 break-all">{user.email}</div>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone</div>
                      <div className="text-lg font-bold text-gray-900">{user.phone || "N/A"}</div>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Role</div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800">
                        {user.role}
                      </span>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email Verified</div>
                      <div className="text-base font-semibold text-gray-900">
                        {user.emailVerifiedAt
                          ? new Date(user.emailVerifiedAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : <span className="text-red-600">Not verified</span>}
                      </div>
                    </div>
                    <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone Verified</div>
                      <div className="text-base font-semibold text-gray-900">
                        {user.phoneVerifiedAt
                          ? new Date(user.phoneVerifiedAt).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : <span className="text-red-600">Not verified</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booking Statistics */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-emerald-600"></div>
                    Booking Statistics
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 text-center hover:shadow-lg transition-all duration-200">
                      <div className="text-3xl font-bold text-blue-700">{stats.booking.total}</div>
                      <div className="text-sm font-semibold text-blue-900 mt-2">Total</div>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 text-center hover:shadow-lg transition-all duration-200">
                      <div className="text-3xl font-bold text-emerald-700">{stats.booking.confirmed}</div>
                      <div className="text-sm font-semibold text-emerald-900 mt-2">Confirmed</div>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 text-center hover:shadow-lg transition-all duration-200">
                      <div className="text-3xl font-bold text-purple-700">{stats.booking.checkedIn}</div>
                      <div className="text-sm font-semibold text-purple-900 mt-2">Checked In</div>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 text-center hover:shadow-lg transition-all duration-200">
                      <div className="text-3xl font-bold text-red-700">{stats.booking.canceled}</div>
                      <div className="text-sm font-semibold text-red-900 mt-2">Canceled</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "bookings" && (
              <div>
                {bookings.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                      <ShoppingCart className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-base font-semibold text-gray-700 mb-1">No bookings found</p>
                    <p className="text-sm text-gray-500">This user hasn&apos;t made any bookings yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b-2 border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Property</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Check In/Out</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Amount</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Code</th>
                          <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bookings.map((booking) => (
                          <tr key={booking.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-6 py-5">
                              {booking.property ? (
                                <>
                                  <div className="font-semibold text-gray-900 mb-1">{booking.property.title}</div>
                                  <div className="text-sm text-gray-600">
                                    {[booking.property.regionName, booking.property.city, booking.property.district]
                                      .filter(Boolean)
                                      .join(" • ")}
                                  </div>
                                  {booking.property.type && (
                                    <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                                      {booking.property.type}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <div className="text-gray-400 italic">Property not found</div>
                              )}
                            </td>
                            <td className="px-6 py-5">
                              <div className="text-sm font-semibold text-gray-900">
                                {new Date(booking.checkIn).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                to {new Date(booking.checkOut).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="font-bold text-gray-900">
                                {Number(booking.totalAmount).toLocaleString()} TZS
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <span
                                className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full ${
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
                                {booking.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              {booking.code ? (
                                <div>
                                  <div className="text-sm font-mono font-semibold text-gray-900 bg-gray-50 px-2 py-1 rounded">
                                    {booking.code.codeVisible || "N/A"}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">{booking.code.status}</div>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 italic">No code</span>
                              )}
                            </td>
                            <td className="px-6 py-5 text-right">
                              <Link
                                href={`/admin/bookings/${booking.id}`}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md"
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

        {/* Audit History */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <History className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Audit & History</h3>
            </div>
          </div>
          <div className="p-6">
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-purple-600"></div>
              </div>
            ) : auditHistory.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No audit history found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {auditHistory.slice(0, 10).map((audit: any, idx: number) => {
                  const getActionIcon = () => {
                    const action = audit.action?.toUpperCase() || '';
                    if (action.includes('SUSPEND')) return <Ban className="h-4 w-4 text-red-600" />;
                    if (action.includes('UNSUSPEND')) return <CheckCircle className="h-4 w-4 text-green-600" />;
                    return <Activity className="h-4 w-4 text-gray-600" />;
                  };

                  const getActionColor = () => {
                    const action = audit.action?.toUpperCase() || '';
                    if (action.includes('SUSPEND')) return 'bg-red-50 border-red-200';
                    if (action.includes('UNSUSPEND')) return 'bg-emerald-50 border-emerald-200';
                    return 'bg-gray-50 border-gray-200';
                  };

                  return (
                    <div key={audit.id || idx} className={`p-4 rounded-lg border ${getActionColor()} transition-all hover:shadow-sm`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getActionIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {audit.action?.replace(/_/g, ' ') || 'Unknown Action'}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {new Date(audit.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {audit.details && (
                            <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                              {typeof audit.details === 'string' ? audit.details : JSON.stringify(audit.details)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            {audit.adminId && (
                              <>
                                <span>•</span>
                                <span>Admin ID: {audit.adminId}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {auditHistory.length > 10 && (
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-500">
                  Showing 10 of {auditHistory.length} entries
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

