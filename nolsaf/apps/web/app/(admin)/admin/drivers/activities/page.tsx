"use client";
import { useEffect, useState } from "react";
import { Activity, Truck, UserPlus, Award, Trophy, Calendar, FileText,  ArrowRight } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import { useSearchParams } from "next/navigation";

const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {
  if (typeof window === "undefined") return;

  const lsToken =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("nolsaf_token") ||
    window.localStorage.getItem("__Host-nolsaf_token");

  if (lsToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${lsToken}`;
    return;
  }

  const m = String(document.cookie || "").match(/(?:^|;\s*)(?:nolsaf_token|__Host-nolsaf_token)=([^;]+)/);
  const cookieToken = m?.[1] ? decodeURIComponent(m[1]) : "";
  if (cookieToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${cookieToken}`;
  }
}

type Driver = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
};

type DriverActivities = {
  driver: Driver;
  activities: {
    referrals: number;
    bonuses: number;
    trips: number;
    unreadReminders: number;
    todayTrips: number;
    totalTrips: number;
    totalInvoices: number;
  };
  lastUpdated: string;
};

export default function AdminDriversActivitiesPage() {
  const searchParams = useSearchParams();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [activities, setActivities] = useState<Map<number, DriverActivities["activities"]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [driverActivity, setDriverActivity] = useState<DriverActivities | null>(null);

  useEffect(() => {
    authify();
    loadDrivers();
  }, []);

  useEffect(() => {
    const raw = searchParams?.get("driverId") || "";
    const id = Number(raw);
    if (!Number.isFinite(id) || id <= 0) return;
    if (!drivers.length) return;
    if (selectedDriver === id) return;
    const exists = drivers.some((d) => d.id === id);
    if (!exists) return;
    void loadDriverActivity(id);
  }, [searchParams, drivers, selectedDriver]);

  async function loadDrivers() {
    setLoading(true);
    try {
      const r = await api.get<{ items: Driver[]; total: number }>("/api/admin/drivers", { params: { page: 1, pageSize: 100 } });
      setDrivers(r.data?.items ?? []);
      
      // Load activities for all drivers
      const activitiesMap = new Map<number, DriverActivities["activities"]>();
      for (const driver of r.data?.items ?? []) {
        try {
          const act = await api.get<DriverActivities>(`/api/admin/drivers/${driver.id}/activities`);
          if (act.data?.activities) {
            activitiesMap.set(driver.id, act.data.activities);
          }
        } catch (e) {
          console.warn(`Failed to load activities for driver ${driver.id}`, e);
        }
      }
      setActivities(activitiesMap);
    } catch (err) {
      console.error("Failed to load drivers", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDriverActivity(driverId: number) {
    try {
      const r = await api.get<DriverActivities>(`/api/admin/drivers/${driverId}/activities`);
      setDriverActivity(r.data);
      setSelectedDriver(driverId);
    } catch (err) {
      console.error("Failed to load driver activity", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading driver activities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center mb-3">
            <Activity className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Activities</h1>
          <p className="text-sm text-gray-500 mt-1">View all driver activities and tasks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drivers List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Drivers ({drivers.length})</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {drivers.map((driver) => {
                const act = activities.get(driver.id);
                return (
                  <div
                    key={driver.id}
                    onClick={() => loadDriverActivity(driver.id)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedDriver === driver.id ? "bg-emerald-50 border-l-4 border-emerald-600" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Truck className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{driver.name}</p>
                          <p className="text-sm text-gray-500">{driver.email}</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400" />
                    </div>
                    {act && (
                      <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">{act.totalTrips}</p>
                          <p className="text-gray-500">Trips</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">{act.referrals}</p>
                          <p className="text-gray-500">Referrals</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">{act.bonuses}</p>
                          <p className="text-gray-500">Bonuses</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-gray-900">{act.unreadReminders}</p>
                          <p className="text-gray-500">Reminders</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Access</h3>
            <div className="space-y-2">
              <Link
                href="/admin/drivers/trips"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-all duration-200 hover:scale-105 hover:shadow-sm no-underline"
              >
                <Calendar className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <span>All Trips</span>
              </Link>
              <Link
                href="/admin/drivers/invoices"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-all duration-200 hover:scale-105 hover:shadow-sm no-underline"
              >
                <FileText className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <span>All Invoices</span>
              </Link>
              <Link
                href="/admin/drivers/referrals"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-all duration-200 hover:scale-105 hover:shadow-sm no-underline"
              >
                <UserPlus className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <span>All Referrals</span>
              </Link>
              <Link
                href="/admin/drivers/bonuses"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-all duration-200 hover:scale-105 hover:shadow-sm no-underline"
              >
                <Award className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <span>All Bonuses</span>
              </Link>
              <Link
                href="/admin/drivers/levels"
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 transition-all duration-200 hover:scale-105 hover:shadow-sm no-underline"
              >
                <Trophy className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                <span>All Levels</span>
              </Link>
            </div>
          </div>

          {driverActivity && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Selected Driver</h3>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900">{driverActivity.driver.name}</p>
                  <p className="text-xs text-gray-500">{driverActivity.driver.email}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-gray-900">{driverActivity.activities.totalTrips}</p>
                    <p className="text-gray-500">Total Trips</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{driverActivity.activities.todayTrips}</p>
                    <p className="text-gray-500">Today Trips</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{driverActivity.activities.referrals}</p>
                    <p className="text-gray-500">Referrals</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{driverActivity.activities.bonuses}</p>
                    <p className="text-gray-500">Bonuses</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

