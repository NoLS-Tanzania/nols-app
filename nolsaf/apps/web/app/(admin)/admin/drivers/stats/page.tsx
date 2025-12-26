"use client";
import { useEffect, useState } from "react";
import { BarChart3, Truck, Search, Calendar, DollarSign, Star } from "lucide-react";
import axios from "axios";

const api = axios.create({ baseURL: "", withCredentials: true });

type Driver = {
  id: number;
  name: string;
  email: string;
};

type StatsData = {
  driver: Driver;
  date: string;
  todaysRides: number;
  earnings: number;
  rating: number;
};

export default function AdminDriversStatsPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    if (selectedDriver) {
      loadDriverStats(selectedDriver);
    }
  }, [selectedDriver, selectedDate]);

  async function loadDrivers() {
    setLoading(true);
    try {
      const r = await api.get<{ items: Driver[]; total: number }>("/admin/drivers", { params: { page: 1, pageSize: 100 } });
      setDrivers(r.data?.items ?? []);
    } catch (err) {
      console.error("Failed to load drivers", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDriverStats(driverId: number) {
    try {
      const r = await api.get<StatsData>(`/admin/drivers/${driverId}/stats`, { params: { date: selectedDate } });
      setStatsData(r.data);
    } catch (err) {
      console.error("Failed to load driver stats", err);
    }
  }

  const filteredDrivers = drivers.filter(
    (d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mb-3">
            <BarChart3 className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Statistics</h1>
          <p className="text-sm text-gray-500 mt-1">View driver performance statistics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        <div className="lg:col-span-1 w-full min-w-0 max-w-full">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden w-full">
            <div className="p-3 border-b border-gray-200 w-full" style={{ boxSizing: 'border-box', maxWidth: '100%', overflow: 'hidden' }}>
              <div className="relative w-full" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Search drivers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  style={{ 
                    boxSizing: 'border-box', 
                    maxWidth: '100%',
                    width: '100%',
                    WebkitBoxSizing: 'border-box',
                    MozBoxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {filteredDrivers.map((driver) => (
                <div
                  key={driver.id}
                  onClick={() => setSelectedDriver(driver.id)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedDriver === driver.id ? "bg-emerald-50 border-l-4 border-emerald-600" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{driver.name}</p>
                      <p className="text-xs text-gray-500">{driver.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {statsData ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{statsData.driver.name}</h2>
                <p className="text-sm text-gray-500 mb-4">{statsData.driver.email}</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-6 w-6 text-blue-600" />
                    <p className="text-sm text-gray-600">Rides</p>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{statsData.todaysRides}</p>
                  <p className="text-xs text-gray-500 mt-1">Completed trips</p>
                </div>

                <div className="bg-emerald-50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="h-6 w-6 text-emerald-600" />
                    <p className="text-sm text-gray-600">Earnings</p>
                  </div>
                  <p className="text-3xl font-bold text-emerald-600">{statsData.earnings.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">TZS</p>
                </div>

                <div className="bg-amber-50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Star className="h-6 w-6 text-amber-600 fill-amber-600" />
                    <p className="text-sm text-gray-600">Rating</p>
                  </div>
                  <p className="text-3xl font-bold text-amber-600">{statsData.rating.toFixed(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">Average rating</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Select a driver to view their statistics</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

