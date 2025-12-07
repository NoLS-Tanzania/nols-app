"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Users, Search, X, Calendar, MapPin, User, BarChart3, UsersRound, Globe, TrendingUp, Filter } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "" });
function authify() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
}

type PassengerRow = {
  id: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  sequenceNumber: number;
  booking: {
    id: number;
    groupType: string;
    destination: string;
    checkIn: string | null;
    checkOut: string | null;
    status: string;
    customer: { id: number; name: string; email: string } | null;
  } | null;
};

type PassengerStats = {
  totalPassengers: number;
  averageAge: number;
  genderStats: Record<string, number>;
  nationalityStats: Record<string, number>;
  ageGroups: Record<string, number>;
  groupTypeStats: Record<string, number>;
  regionStats: Record<string, number>;
  topNationalities: Array<{ nationality: string; count: number }>;
};

export default function AdminGroupStaysPassengersPage() {
  const [bookingId, setBookingId] = useState<string>("");
  const [groupType, setGroupType] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [nationality, setNationality] = useState<string>("");
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<PassengerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Stats state
  const [stats, setStats] = useState<PassengerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };
      if (bookingId) params.bookingId = bookingId;
      if (groupType) params.groupType = groupType;
      if (gender) params.gender = gender;
      if (nationality) params.nationality = nationality;
      if (ageMin) params.ageMin = ageMin;
      if (ageMax) params.ageMax = ageMax;
      if (q) params.q = q;

      const r = await api.get<{ items: PassengerRow[]; total: number }>("/admin/group-stays/passengers", { params });
      setList(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (err) {
      console.error("Failed to load passengers", err);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const r = await api.get<PassengerStats>("/admin/group-stays/passengers/stats");
      setStats(r.data);
    } catch (err) {
      console.error("Failed to load passenger statistics", err);
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    authify();
    load();
    loadStats();
  }, [page, bookingId, groupType, gender, nationality, ageMin, ageMax, loadStats]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  // Prepare Gender Chart data
  const genderChartData = useMemo<ChartData<"doughnut">>(() => {
    if (!stats || !stats.genderStats) {
      return { labels: [], datasets: [] };
    }

    const labels = Object.keys(stats.genderStats).filter(key => stats.genderStats[key] > 0);
    const data = Object.values(stats.genderStats).filter((v, i) => Object.values(stats.genderStats)[i] > 0);

    const colors = [
      "rgba(59, 130, 246, 0.8)", // Blue
      "rgba(236, 72, 153, 0.8)", // Pink
      "rgba(107, 114, 128, 0.8)", // Gray
    ];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: "#fff",
          borderWidth: 2,
          hoverOffset: 4,
        },
      ],
    };
  }, [stats]);

  // Prepare Age Groups Chart data
  const ageGroupsChartData = useMemo<ChartData<"bar">>(() => {
    if (!stats || !stats.ageGroups) {
      return { labels: [], datasets: [] };
    }

    const labels = Object.keys(stats.ageGroups);
    const data = Object.values(stats.ageGroups);

    return {
      labels,
      datasets: [
        {
          label: "Passengers",
          data,
          backgroundColor: "rgba(139, 92, 246, 0.8)",
          borderColor: "rgba(139, 92, 246, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [stats]);

  // Prepare Nationality Chart data
  const nationalityChartData = useMemo<ChartData<"bar">>(() => {
    if (!stats || !stats.topNationalities || stats.topNationalities.length === 0) {
      return { labels: [], datasets: [] };
    }

    const labels = stats.topNationalities.map((n) => n.nationality);
    const data = stats.topNationalities.map((n) => n.count);

    return {
      labels,
      datasets: [
        {
          label: "Passengers",
          data,
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [stats]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mb-4">
            <UsersRound className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Passengers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and view all passenger rosters from group bookings</p>
        </div>
      </div>

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-green-300 group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 mb-1">Total Passengers</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalPassengers.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-blue-300 group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 mb-1">Average Age</div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.averageAge > 0 ? `${stats.averageAge} years` : "N/A"}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-purple-300 group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 mb-1">Gender Groups</div>
                <div className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats.genderStats).filter(k => stats.genderStats[k] > 0).length}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-amber-300 group">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Globe className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-500 mb-1">Nationalities</div>
                <div className="text-2xl font-bold text-gray-900">
                  {Object.keys(stats.nationalityStats).filter(k => stats.nationalityStats[k] > 0).length}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gender Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 group">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-blue-600 transition-colors duration-300">
              <User className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
              Gender Distribution
            </h3>
            <p className="text-sm text-gray-500 mt-1">Breakdown of passengers by gender</p>
          </div>
          <div className="h-64 w-full max-h-64 min-h-[300px] overflow-hidden relative">
            {statsLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            ) : stats && Object.keys(stats.genderStats).some(k => stats.genderStats[k] > 0) ? (
              <Chart
                type="doughnut"
                data={genderChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "right",
                      labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                          size: 12,
                        },
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const label = context.label || "";
                          const value = context.parsed || 0;
                          const total = context.dataset.data.reduce((sum: number, val: number) => sum + val, 0);
                          const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                          return `${label}: ${value} (${percentage}%)`;
                        },
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No gender data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Age Groups Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-purple-300 hover:-translate-y-1 group">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-purple-600 transition-colors duration-300">
              <TrendingUp className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform duration-300" />
              Age Groups
            </h3>
            <p className="text-sm text-gray-500 mt-1">Distribution of passengers by age groups</p>
          </div>
          <div className="h-64 w-full max-h-64 min-h-[300px] overflow-hidden relative">
            {statsLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-purple-600"></div>
              </div>
            ) : stats && Object.keys(stats.ageGroups).some(k => stats.ageGroups[k] > 0) ? (
              <Chart
                type="bar"
                data={ageGroupsChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const value = context.parsed.y || 0;
                          return `Passengers: ${value}`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                        font: {
                          size: 11,
                        },
                      },
                      grid: {
                        color: "rgba(0, 0, 0, 0.1)",
                      },
                    },
                    x: {
                      grid: {
                        display: false,
                      },
                      ticks: {
                        font: {
                          size: 11,
                        },
                      },
                    },
                  },
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No age data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Nationalities Chart */}
      {stats && stats.topNationalities && stats.topNationalities.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-green-300 hover:-translate-y-1 group">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-green-600 transition-colors duration-300">
              <Globe className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform duration-300" />
              Top Nationalities
            </h3>
            <p className="text-sm text-gray-500 mt-1">Most common nationalities among passengers</p>
          </div>
          <div className="h-64 w-full max-h-64 min-h-[300px] overflow-hidden relative">
            {statsLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-green-600"></div>
              </div>
            ) : (
              <Chart
                type="bar"
                data={nationalityChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: 'y',
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: (context: any) => {
                          const value = context.parsed.x || 0;
                          return `Passengers: ${value}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                        font: {
                          size: 11,
                        },
                      },
                      grid: {
                        color: "rgba(0, 0, 0, 0.1)",
                      },
                    },
                    y: {
                      grid: {
                        display: false,
                      },
                      ticks: {
                        font: {
                          size: 11,
                        },
                      },
                    },
                  },
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col gap-4 w-full max-w-full">
          {/* Search and Filters Grid - All fields in same grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 w-full max-w-full">
            {/* Search Box */}
            <div className="relative w-full min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm max-w-full box-border"
                placeholder="Search passengers by name, phone, nationality..."
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {/* Booking ID */}
            <div className="w-full min-w-0">
              <input
                type="number"
                placeholder="Booking ID"
                value={bookingId}
                onChange={(e) => {
                  setBookingId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm max-w-full box-border"
              />
            </div>

            {/* Group Type */}
            <div className="w-full min-w-0">
              <select
                value={groupType}
                onChange={(e) => {
                  setGroupType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm bg-white max-w-full box-border"
              >
                <option value="">All Group Types</option>
                <option value="family">Family</option>
                <option value="workers">Workers</option>
                <option value="event">Event</option>
                <option value="students">Students</option>
                <option value="team">Team</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Gender */}
            <div className="w-full min-w-0">
              <select
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm bg-white max-w-full box-border"
              >
                <option value="">All Genders</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Nationality */}
            <div className="w-full min-w-0">
              <input
                type="text"
                placeholder="Nationality"
                value={nationality}
                onChange={(e) => {
                  setNationality(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm max-w-full box-border"
              />
            </div>

            {/* Age Range */}
            <div className="w-full min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-2 flex gap-2">
              <input
                type="number"
                placeholder="Min Age"
                value={ageMin}
                onChange={(e) => {
                  setAgeMin(e.target.value);
                  setPage(1);
                }}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm box-border"
              />
              <input
                type="number"
                placeholder="Max Age"
                value={ageMax}
                onChange={(e) => {
                  setAgeMax(e.target.value);
                  setPage(1);
                }}
                className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm box-border"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Passengers Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <>
            {/* Skeleton Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
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
        ) : list.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <UsersRound className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No passengers found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.map((passenger) => (
                    <tr key={passenger.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="max-w-xs truncate">{passenger.firstName} {passenger.lastName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="max-w-xs truncate block">{passenger.phone || "N/A"}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{passenger.age || "N/A"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{passenger.gender || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="max-w-xs truncate">{passenger.nationality || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {passenger.booking ? (
                          <div>
                            <div className="font-medium">#{passenger.booking.id}</div>
                            <div className="text-xs text-gray-400 capitalize">{passenger.booking.groupType}</div>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {passenger.booking ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="max-w-xs truncate">{passenger.booking.destination}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-green-600 hover:text-green-900">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {list.map((passenger) => (
                <div key={passenger.id} className="p-4 bg-white hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {passenger.firstName} {passenger.lastName}
                    </span>
                    {passenger.booking && (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-700">
                        #{passenger.booking.id}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span>Phone: {passenger.phone || "N/A"}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span>Age: {passenger.age || "N/A"} • Gender: {passenger.gender || "N/A"}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span>Nationality: {passenger.nationality || "N/A"}</span>
                  </div>
                  {passenger.booking && (
                    <>
                      <div className="text-sm text-gray-600 mb-1">
                        <span>Type: {passenger.booking.groupType} • Status: {passenger.booking.status}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>Destination: {passenger.booking.destination}</span>
                      </div>
                    </>
                  )}
                  <div className="mt-3 text-right">
                    <button className="text-green-600 hover:text-green-900 text-sm">View Details</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {list.length > 0 && (
        <div className="flex justify-center py-4">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

