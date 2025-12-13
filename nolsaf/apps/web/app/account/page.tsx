"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { User, Mail, Phone, Calendar, MapPin } from "lucide-react";
import Link from "next/link";

const api = axios.create();

export default function AccountIndex() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (token) {
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await api.get("/account/me");
      setUser(response.data);
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="mt-4 text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Account</h1>
        <p className="text-slate-600 mt-1">Manage your personal information and preferences</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {user?.name || user?.email || "User"}
            </h2>
            <p className="text-sm text-slate-600 capitalize">{user?.role || "Customer"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-slate-400" />
            <div>
              <div className="text-sm text-slate-600">Email</div>
              <div className="font-medium text-slate-900">{user?.email || "Not provided"}</div>
            </div>
          </div>

          {user?.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm text-slate-600">Phone</div>
                <div className="font-medium text-slate-900">{user.phone}</div>
              </div>
            </div>
          )}

          {user?.createdAt && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-slate-400" />
              <div>
                <div className="text-sm text-slate-600">Member Since</div>
                <div className="font-medium text-slate-900">
                  {new Date(user.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200">
          <Link
            href="/account/profile"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link
          href="/account/bookings"
          className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="text-2xl font-bold text-slate-900">-</div>
          <div className="text-sm text-slate-600 mt-1">Total Bookings</div>
        </Link>
        <Link
          href="/account/rides"
          className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="text-2xl font-bold text-slate-900">-</div>
          <div className="text-sm text-slate-600 mt-1">Total Rides</div>
        </Link>
        <Link
          href="/account/group-stays"
          className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="text-2xl font-bold text-slate-900">-</div>
          <div className="text-sm text-slate-600 mt-1">Group Stays</div>
        </Link>
      </div>
    </div>
  );
}
