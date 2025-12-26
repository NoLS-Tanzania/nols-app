"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { User, Mail, Phone, Calendar, CalendarDays, Car, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });

export default function AccountIndex() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ bookings: number; rides: number; groupStays: number }>({
    bookings: 0,
    rides: 0,
    groupStays: 0,
  });

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get("/api/account/me");
      setUser(response.data);
    } catch (err) {
      console.error("Failed to load profile", err);
      try {
        if (typeof window !== "undefined") window.location.href = "/login";
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Fetch bookings count
      try {
        const bookingsRes = await api.get("/api/account/bookings?page=1&pageSize=1");
        setStats((prev) => ({ ...prev, bookings: bookingsRes.data?.total || 0 }));
      } catch {}

      // Fetch rides count (trips)
      try {
        const ridesRes = await api.get("/api/account/rides?page=1&pageSize=1");
        setStats((prev) => ({ ...prev, rides: ridesRes.data?.total || 0 }));
      } catch {}

      // Fetch group stays count
      try {
        const groupStaysRes = await api.get("/api/account/group-stays?page=1&pageSize=1");
        setStats((prev) => ({ ...prev, groupStays: groupStaysRes.data?.total || 0 }));
      } catch {}
    } catch (err) {
      // Stats are optional, don't fail the page
      console.debug("Failed to load stats", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#02665e]"></div>
          <p className="mt-4 text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Account</h1>
        <p className="mt-2 text-sm text-slate-600">Manage your personal information and preferences</p>
      </div>

      {/* Profile Card */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 sm:p-8">
          {/* Header row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[#02665e]/10 ring-1 ring-[#02665e]/15 flex items-center justify-center flex-shrink-0">
                <User className="h-7 w-7 text-[#02665e]" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="text-xl font-extrabold tracking-tight text-slate-900 truncate">
                  {user?.name || user?.email || "User"}
                </div>
                <div className="mt-1 inline-flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[#02665e]/10 px-2.5 py-1 text-xs font-semibold text-[#02665e]">
                    {(user?.role || "Customer").toString().toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/account/profile"
              className="no-underline inline-flex items-center justify-center rounded-xl border border-[#02665e]/20 bg-white px-4 py-2 text-sm font-semibold text-[#02665e] shadow-sm hover:bg-[#02665e]/5 active:scale-[0.98] transition"
            >
              Edit
            </Link>
          </div>

          {/* Details grid */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-[#02665e]" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-500">Email address</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900 break-words">{user?.email || "Not provided"}</div>
                </div>
              </div>
            </div>

            {user?.createdAt && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-[#02665e]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500">Member since</div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900">
                      {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {user?.phone && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:col-span-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-[#02665e]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-500">Phone number</div>
                    <div className="mt-0.5 text-sm font-semibold text-slate-900">{user.phone}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/account/bookings"
          className="no-underline group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#02665e]/20 active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#02665e]/10 flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 leading-none">{stats.bookings || 0}</div>
                <div className="mt-1 text-sm font-medium text-slate-600">Total Bookings</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-[#02665e] transition-colors" />
          </div>
        </Link>

        <Link
          href="/account/rides"
          className="no-underline group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#02665e]/20 active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#02665e]/10 flex items-center justify-center">
                <Car className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 leading-none">{stats.rides || 0}</div>
                <div className="mt-1 text-sm font-medium text-slate-600">Total Rides</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-[#02665e] transition-colors" />
          </div>
        </Link>

        <Link
          href="/account/group-stays"
          className="no-underline group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-[#02665e]/20 active:scale-[0.99] sm:col-span-2 lg:col-span-1"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-2xl bg-[#02665e]/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
              </div>
              <div>
                <div className="text-2xl font-extrabold text-slate-900 leading-none">{stats.groupStays || 0}</div>
                <div className="mt-1 text-sm font-medium text-slate-600">Group Stays</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-[#02665e] transition-colors" />
          </div>
        </Link>
      </div>
    </div>
  );
}
