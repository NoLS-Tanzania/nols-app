"use client";
import { useEffect, useState } from "react";
import { UserPlus, Truck, Search, ExternalLink, X, MapPin, Eye } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import TableRow from "@/components/TableRow";

const api = axios.create({ baseURL: "" });
function authify() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
}

type Driver = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  suspendedAt?: string | null;
  createdAt?: string;
};

type ReferralData = {
  driver: Driver & {
    region?: string | null;
    district?: string | null;
  };
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  activeReferrals: number;
  totalCredits: number;
  pendingCredits: number;
  referrals: Array<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    registeredAs?: "OWNER" | "DRIVER" | "CUSTOMER" | "USER" | "TRAVELLER";
    status: "active" | "completed";
    joinedAt: string;
    registeredAt: string;
    linkSharedAt: string;
    region?: string | null;
    district?: string | null;
    spend?: number;
    creditsEarned: number;
  }>;
};

type FilterType = "all" | "active" | "suspended" | "recent" | "high_rated";
type SortType = "name_asc" | "name_desc" | "newest" | "oldest";

export default function AdminDriversReferralsPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<number | null>(null);
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("name_asc");
  const [viewingReferral, setViewingReferral] = useState<ReferralData["referrals"][0] | null>(null);

  useEffect(() => {
    authify();
    loadDrivers();
  }, []);

  async function loadDrivers() {
    setLoading(true);
    try {
      const r = await api.get<{ items: Driver[]; total: number }>("/admin/drivers", { 
        params: { page: 1, pageSize: 100, status: "" } 
      });
      const driversList = r.data?.items ?? [];
      setDrivers(driversList);
    } catch (err) {
      console.error("Failed to load drivers", err);
      setDrivers([]);
    } finally {
      setLoading(false);
    }
  }


  async function loadDriverReferrals(driverId: number) {
    try {
      const r = await api.get<ReferralData>(`/admin/drivers/${driverId}/referrals`);
      setReferralData(r.data);
      setSelectedDriver(driverId);
    } catch (err) {
      console.error("Failed to load driver referrals", err);
    }
  }

  const filteredDrivers = drivers
    .filter((d) => {
      // Search filter
      const matchesSearch = 
        !search ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.email.toLowerCase().includes(search.toLowerCase()) ||
        (d.phone && d.phone.toLowerCase().includes(search.toLowerCase()));
      
      if (!matchesSearch) return false;

      // Status filter
      switch (filter) {
        case "active":
          return !d.suspendedAt;
        case "suspended":
          return !!d.suspendedAt;
        case "recent":
          if (!d.createdAt) return false;
          const createdDate = new Date(d.createdAt);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return createdDate >= weekAgo;
        case "high_rated":
          // For now, show all if we don't have rating data
          return true;
        default:
          return true;
      }
    })
    .sort((a, b) => {
      switch (sort) {
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "newest":
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        case "oldest":
          const dateA2 = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB2 = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateA2 - dateB2;
        default:
          return 0;
      }
    });

  return (
    <div className="space-y-4 lg:space-y-6 w-full overflow-x-hidden" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 shadow-sm w-full" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
        <div className="flex flex-col items-center justify-center text-center mb-4">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-3">
            <UserPlus className="h-6 w-6 text-blue-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Driver Referrals</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">View and manage driver referral programs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 w-full" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
        <div className="lg:col-span-1 w-full" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full max-h-[calc(100vh-200px)] w-full" style={{ maxWidth: '100%' }}>
            {/* Search & Filters Section */}
            <div className="border-b border-gray-200 flex-shrink-0 w-full bg-gradient-to-br from-gray-50 to-white" style={{ padding: '1rem', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
              {/* Search Bar */}
              <div className="relative w-full mb-4 group" style={{ maxWidth: '100%', boxSizing: 'border-box' }}>
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                  <Search className="h-4 w-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all duration-200 hover:border-gray-400 placeholder:text-gray-400"
                  style={{ 
                    boxSizing: 'border-box',
                    WebkitBoxSizing: 'border-box',
                    MozBoxSizing: 'border-box',
                    maxWidth: '100%'
                  }}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 active:scale-95 transition-all duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(["all", "active", "suspended", "recent"] as FilterType[]).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setFilter(filterType)}
                    className={`px-4 py-2 text-xs font-normal rounded-full transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                      filter === filterType
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105"
                        : "bg-white text-gray-700 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 shadow-sm"
                    }`}
                  >
                    {filterType === "all" && "All"}
                    {filterType === "active" && "Active"}
                    {filterType === "suspended" && "Suspended"}
                    {filterType === "recent" && "Recent"}
                  </button>
                ))}
              </div>

              {/* Sort Dropdown */}
              <div className="relative group mb-3">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortType)}
                  className="w-full px-3 py-2 text-xs font-medium border border-gray-300 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none cursor-pointer transition-all duration-200 hover:border-gray-400"
                  style={{ 
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="name_asc">Name (A-Z)</option>
                  <option value="name_desc">Name (Z-A)</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              {/* Results Count */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-white/60 backdrop-blur-sm rounded-lg border border-gray-200/50">
                <span className="text-xs font-medium text-gray-600">
                  <span className="text-emerald-600 font-bold">{filteredDrivers.length}</span>{" "}
                  driver{filteredDrivers.length !== 1 ? 's' : ''} found
                </span>
                {(search || filter !== "all" || sort !== "name_asc") && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                      setSort("name_asc");
                    }}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors duration-200"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
            <div className="divide-y divide-gray-100 overflow-y-auto flex-1 min-h-0 w-full max-w-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {filteredDrivers.length > 0 ? (
                filteredDrivers.map((driver, index) => (
                  <div
                    key={driver.id}
                    onClick={() => loadDriverReferrals(driver.id)}
                    className={`group p-3 sm:p-4 cursor-pointer transition-all duration-300 w-full max-w-full box-border transform hover:translate-x-1 hover:shadow-md ${
                      selectedDriver === driver.id 
                        ? "bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-l-4 border-emerald-600 shadow-sm" 
                        : "hover:bg-gradient-to-r hover:from-gray-50 hover:to-white border-l-4 border-transparent"
                    }`}
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        selectedDriver === driver.id
                          ? "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30 scale-110"
                          : "bg-gradient-to-br from-emerald-100 to-emerald-200 group-hover:from-emerald-200 group-hover:to-emerald-300 group-hover:scale-105"
                      }`}>
                        <Truck className={`h-5 w-5 sm:h-6 sm:w-6 transition-colors duration-300 ${
                          selectedDriver === driver.id ? "text-white" : "text-emerald-600"
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 text-sm sm:text-base truncate group-hover:text-emerald-600 transition-colors duration-200">
                            {driver.name}
                          </p>
                          {driver.suspendedAt && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full animate-pulse">
                              Suspended
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{driver.email}</p>
                      </div>
                      {selectedDriver === driver.id && (
                        <div className="flex-shrink-0">
                          <div className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">No drivers found</p>
                  <p className="text-xs text-gray-500 text-center">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 w-full max-w-full min-w-0">
          {referralData ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 lg:p-6 overflow-hidden w-full max-w-full min-w-0 box-border">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-xl font-bold text-gray-900 mb-2 break-words">{referralData.driver.name}</h2>
                <p className="text-xs lg:text-sm text-gray-500 break-words">{referralData.driver.email}</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 lg:gap-3.5 mb-4 lg:mb-6">
                <div className="bg-blue-50 rounded-lg p-3 md:p-3.5 border border-blue-100">
                  <p className="text-xl font-bold text-blue-600 leading-tight">{referralData.totalReferrals}</p>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">Total Referrals</p>
                </div>
                <div className="bg-emerald-50 rounded-lg p-3 md:p-3.5 border border-emerald-100">
                  <p className="text-xl font-bold text-emerald-600 leading-tight">{referralData.activeReferrals}</p>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">Active</p>
                </div>
                {referralData.totalCredits > 0 ? (
                  <Link
                    href={`/admin/driver/referral${selectedDriver ? `?driverId=${selectedDriver}` : ""}`}
                    className="bg-amber-50 rounded-lg p-3 md:p-3.5 border border-amber-100 hover:border-amber-200 hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 block no-underline"
                  >
                    <p className="text-xl font-bold text-amber-600 leading-tight">{referralData.totalCredits}</p>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">Total Credits</p>
                    <span className="text-[11px] font-semibold text-emerald-700 inline-flex items-center gap-1 mt-2">
                      Manage credits <ExternalLink className="h-3 w-3" />
                    </span>
                  </Link>
                ) : (
                  <div className="bg-amber-50 rounded-lg p-3 md:p-3.5 border border-amber-100 text-gray-400">
                    <p className="text-xl font-bold leading-tight text-amber-400">0</p>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">Total Credits</p>
                    <span className="text-[11px] font-semibold text-gray-400 inline-flex items-center gap-1 mt-2">
                      Manage credits
                    </span>
                  </div>
                )}
                <div className="bg-purple-50 rounded-lg p-3 md:p-3.5 border border-purple-100">
                  <p className="text-xl font-bold text-purple-600 leading-tight">{referralData.totalReferrals - referralData.activeReferrals}</p>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">Inactive</p>
                </div>
              </div>

              <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-gray-50 rounded-lg overflow-hidden">
                <p className="text-xs lg:text-sm font-medium text-gray-700 mb-2">Referral Code</p>
                <p className="text-base lg:text-lg font-mono text-gray-900 break-all">{referralData.referralCode}</p>
                <a
                  href={referralData.referralLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs lg:text-sm text-emerald-600 hover:underline flex items-center gap-1 mt-2 break-all"
                >
                  <span className="truncate">{referralData.referralLink}</span>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              </div>

              <div className="overflow-hidden">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-3 lg:mb-4">Referred Users</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto max-h-[400px] lg:max-h-[500px] overflow-y-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Link Shared</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Registered</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Registered As</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Spend</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Credits</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {referralData.referrals.length > 0 ? (
                          referralData.referrals.map((ref) => (
                            <TableRow key={ref.id} className="transition-all duration-150">
                              <td className="px-3 py-3">
                                <div className="min-w-[150px]">
                                  <p className="text-sm font-medium text-gray-900">{ref.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{ref.email}</p>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                {(ref.region || ref.district) ? (
                                  <div className="flex items-center gap-1 text-xs text-gray-600 min-w-[120px]">
                                    <MapPin className="h-3 w-3 flex-shrink-0" />
                                    <span className="truncate">{ref.district && ref.region ? `${ref.district}, ${ref.region}` : ref.region || ref.district || "N/A"}</span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                                <div>
                                  <p className="font-medium">{new Date(ref.linkSharedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}</p>
                                  <p className="text-gray-500">{new Date(ref.linkSharedAt).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}</p>
                                </div>
                              </td>
                              <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">
                                <div>
                                  <p className="font-medium">{new Date(ref.registeredAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}</p>
                                  <p className="text-gray-500">{new Date(ref.registeredAt).toLocaleTimeString("en-US", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}</p>
                                </div>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                    ref.registeredAs === "OWNER"
                                      ? "bg-purple-100 text-purple-700"
                                      : ref.registeredAs === "DRIVER"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-emerald-100 text-emerald-700"
                                  }`}
                                >
                                  {ref.registeredAs === "OWNER" ? "Owner" : ref.registeredAs === "DRIVER" ? "Driver" : "Traveller"}
                                </span>
                              </td>
                              <td className="px-3 py-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                                    ref.status === "completed"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {ref.status}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-medium text-gray-900 whitespace-nowrap">
                                {(ref.spend ?? 0).toLocaleString()} TZS
                              </td>
                              <td className="px-3 py-3 text-right text-sm font-semibold text-gray-900 whitespace-nowrap">
                                {ref.creditsEarned.toLocaleString()} TZS
                              </td>
                              <td className="px-3 py-3 text-center whitespace-nowrap">
                                <button
                                  onClick={() => setViewingReferral(ref)}
                                  className="inline-flex items-center justify-center p-1.5 text-emerald-600 hover:text-emerald-700 transition-all duration-200 hover:scale-110 active:scale-95"
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </td>
                            </TableRow>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                              No referrals yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 lg:p-6">
              {/* Skeleton Preview */}
              <div className="mb-4 lg:mb-6">
                <div className="h-7 w-48 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
                <div className="h-4 w-64 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>

              {/* Stats Cards Skeleton */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4 mb-4 lg:mb-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                    <div className="h-8 w-16 bg-gray-300 rounded-lg mb-2 animate-pulse"></div>
                    <div className="h-4 w-24 bg-gray-300 rounded-lg animate-pulse"></div>
                  </div>
                ))}
              </div>

              {/* Referral Code Skeleton */}
              <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="h-4 w-28 bg-gray-300 rounded-lg mb-2 animate-pulse"></div>
                <div className="h-6 w-48 bg-gray-300 rounded-lg mb-3 animate-pulse"></div>
                <div className="h-4 w-64 bg-gray-300 rounded-lg animate-pulse"></div>
              </div>

              {/* Referred Users Skeleton */}
              <div>
                <div className="h-6 w-32 bg-gray-300 rounded-lg mb-3 lg:mb-4 animate-pulse"></div>
                <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="overflow-x-auto max-h-[400px] lg:max-h-[500px] overflow-y-auto">
                    <table className="w-full min-w-[800px]">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Name</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Link Shared</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Registered</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Registered As</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Spend</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Credits</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {[1, 2, 3].map((i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="px-3 py-3">
                              <div className="h-4 w-32 bg-gray-300 rounded mb-1"></div>
                              <div className="h-3 w-48 bg-gray-200 rounded"></div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="h-3 w-24 bg-gray-300 rounded"></div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="h-3 w-28 bg-gray-300 rounded mb-1"></div>
                              <div className="h-2 w-20 bg-gray-200 rounded"></div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="h-3 w-28 bg-gray-300 rounded mb-1"></div>
                              <div className="h-2 w-20 bg-gray-200 rounded"></div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="h-6 w-20 bg-gray-300 rounded-full"></div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="h-6 w-16 bg-gray-300 rounded-full"></div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="h-4 w-24 bg-gray-300 rounded ml-auto"></div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="h-4 w-20 bg-gray-300 rounded ml-auto"></div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="h-8 w-8 bg-gray-300 rounded-lg mx-auto"></div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Helper Text */}
              <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                <UserPlus className="h-10 w-10 text-gray-300 mx-auto mb-3 animate-pulse" />
                <p className="text-sm text-gray-400 font-medium">Select a driver to view their referrals</p>
                <p className="text-xs text-gray-400 mt-1">This preview shows how the data will be displayed</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Referral Details Modal */}
      {viewingReferral && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingReferral(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-gradient-to-r from-emerald-50 to-blue-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Referral Details</h2>
              <button
                onClick={() => setViewingReferral(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Name</p>
                    <p className="text-sm font-medium text-gray-900">{viewingReferral.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone Number</p>
                    <p className="text-sm font-medium text-gray-900">{viewingReferral.phone || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Registered As</p>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        viewingReferral.registeredAs === "OWNER"
                          ? "bg-purple-100 text-purple-700"
                          : viewingReferral.registeredAs === "DRIVER"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {viewingReferral.registeredAs === "OWNER" ? "Owner" : viewingReferral.registeredAs === "DRIVER" ? "Driver" : "Traveller"}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Region</p>
                    <p className="text-sm font-medium text-gray-900">{viewingReferral.region || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">District</p>
                    <p className="text-sm font-medium text-gray-900">{viewingReferral.district || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Referral Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Link Shared</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(viewingReferral.linkSharedAt).toLocaleString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Registered</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(viewingReferral.registeredAt).toLocaleString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Status, Spend & Credits</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        viewingReferral.status === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {viewingReferral.status}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Total Spend</p>
                    <p className="text-lg font-bold text-blue-600">{(viewingReferral.spend ?? 0).toLocaleString()} TZS</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Credits Earned</p>
                    <p className="text-lg font-bold text-emerald-600">{viewingReferral.creditsEarned.toLocaleString()} TZS</p>
                  </div>
                </div>
              </div>

              {/* Admin actions for this driver/referral */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Actions</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Decide how to use this driver’s collected credits: convert to bonus or manage withdrawals.
                </p>
                {viewingReferral.creditsEarned > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/driver/referral${selectedDriver ? `?driverId=${selectedDriver}` : ""}`}
                      className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition"
                    >
                      Manage credits
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setViewingReferral(null)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-200 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

