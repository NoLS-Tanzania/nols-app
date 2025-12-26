"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { ClipboardList, Search, X, Calendar, MapPin, Clock, User, BarChart3, TrendingUp, CheckCircle, XCircle, Loader2, FileText, AlertTriangle, Edit, Send, Eye } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {}

type PlanRequestRow = {
  id: number;
  role: string;
  tripType: string;
  destinations: string;
  dateFrom: string | null;
  dateTo: string | null;
  groupSize: number | null;
  budget: string | null;
  notes: string;
  status: string;
  isUrgent: boolean;
  hoursSinceCreation: number;
  customer: {
    name: string;
    email: string;
    phone: string | null;
  };
  transportRequired: boolean;
  adminResponse?: string | null;
  suggestedItineraries?: string | null;
  requiredPermits?: string | null;
  estimatedTimeline?: string | null;
  assignedAgent?: string | null;
  respondedAt?: string | null;
  createdAt: string;
};

type PlanRequestStats = {
  trends: { date: string; count: number; pending: number; inProgress: number; completed: number }[];
  roleBreakdown: Record<string, number>;
  tripTypeBreakdown: Record<string, number>;
  period: string;
  startDate: string;
  endDate: string;
};

export default function AdminPlanWithUsRequestsPage() {
  const [role, setRole] = useState<string>("");
  const [tripType, setTripType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [date, setDate] = useState<string | string[]>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<PlanRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Stats state
  const [statsPeriod, setStatsPeriod] = useState<string>("30d");
  const [statsData, setStatsData] = useState<PlanRequestStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Action modal state
  const [selectedRequest, setSelectedRequest] = useState<PlanRequestRow | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Response form state
  const [responseForm, setResponseForm] = useState({
    suggestedItineraries: "",
    requiredPermits: "",
    estimatedTimeline: "",
    assignedAgent: "",
    adminResponse: "",
  });

  async function load() {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };
      if (role) params.role = role;
      if (tripType) params.tripType = tripType;
      if (status) params.status = status;
      if (date) {
        if (Array.isArray(date)) {
          params.start = date[0];
          params.end = date[1];
        } else {
          params.date = date;
        }
      }
      if (q) params.q = q;

      const r = await api.get<{ items: PlanRequestRow[]; total: number }>("/admin/plan-with-us/requests", { params });
      setList(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (err) {
      console.error("Failed to load plan requests", err);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const r = await api.get<PlanRequestStats>("/admin/plan-with-us/requests/stats", {
        params: { period: statsPeriod },
      });
      setStatsData(r.data);
    } catch (err) {
      console.error("Failed to load plan request statistics", err);
      setStatsData(null);
    } finally {
      setStatsLoading(false);
    }
  }, [statsPeriod]);

  useEffect(() => {
    authify();
    load();
  }, [page, role, tripType, status, date, q]);

  useEffect(() => {
    authify();
    loadStats();
  }, [loadStats]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  // Handle opening response modal
  const handleOpenResponse = async (request: PlanRequestRow) => {
    setSelectedRequest(request);
    setResponseForm({
      suggestedItineraries: request.suggestedItineraries || "",
      requiredPermits: request.requiredPermits || "",
      estimatedTimeline: request.estimatedTimeline || "",
      assignedAgent: request.assignedAgent || "",
      adminResponse: request.adminResponse || "",
    });
    setShowResponseModal(true);
  };

  // Handle submitting response
  const handleSubmitResponse = async () => {
    if (!selectedRequest) return;
    
    setSubmitting(true);
    try {
      await api.patch(`/admin/plan-with-us/requests/${selectedRequest.id}`, {
        status: "COMPLETED",
        ...responseForm,
      });
      
      // Reload list
      await load();
      setShowResponseModal(false);
      setSelectedRequest(null);
      setResponseForm({
        suggestedItineraries: "",
        requiredPermits: "",
        estimatedTimeline: "",
        assignedAgent: "",
        adminResponse: "",
      });
    } catch (err) {
      console.error("Failed to submit response", err);
      alert("Failed to submit response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle starting work on request
  const handleStartWork = async (requestId: number) => {
    try {
      await api.patch(`/admin/plan-with-us/requests/${requestId}`, {
        status: "IN_PROGRESS",
      });
      await load();
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update status. Please try again.");
    }
  };

  // Chart data for Requests by Role (Donut Chart)
  const roleDonutChartData = useMemo<ChartData<"doughnut">>(() => {
    if (!statsData || !statsData.roleBreakdown) {
      return { labels: [], datasets: [] };
    }
    const labels = Object.keys(statsData.roleBreakdown).filter(key => statsData.roleBreakdown[key] > 0);
    const data = Object.values(statsData.roleBreakdown).filter((v, i) => Object.values(statsData.roleBreakdown)[i] > 0);
    const colors = [
      "rgba(59, 130, 246, 0.8)", // Blue
      "rgba(16, 185, 129, 0.8)", // Green
      "rgba(245, 158, 11, 0.8)", // Amber
      "rgba(139, 92, 246, 0.8)", // Purple
      "rgba(239, 68, 68, 0.8)", // Red
    ];
    return {
      labels,
      datasets: [{
        data,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: "#fff",
        borderWidth: 2,
        hoverOffset: 4,
      }],
    };
  }, [statsData]);

  // Chart data for Requests by Trip Type (Bar Chart)
  const tripTypeBarChartData = useMemo<ChartData<"bar">>(() => {
    if (!statsData || !statsData.tripTypeBreakdown) {
      return { labels: [], datasets: [] };
    }
    const labels = Object.keys(statsData.tripTypeBreakdown).filter(key => statsData.tripTypeBreakdown[key] > 0);
    const data = Object.values(statsData.tripTypeBreakdown).filter((v, i) => Object.values(statsData.tripTypeBreakdown)[i] > 0);
    return {
      labels,
      datasets: [{
        label: "Number of Requests",
        data,
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      }],
    };
  }, [statsData]);

  // Chart data for Request Trends (Line Chart)
  const requestTrendsLineChartData = useMemo<ChartData<"line">>(() => {
    if (!statsData || !statsData.trends) {
      return { labels: [], datasets: [] };
    }
    const labels = statsData.trends.map(t => new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    return {
      labels,
      datasets: [
        {
          label: "Total Requests",
          data: statsData.trends.map(t => t.count),
          fill: true,
          backgroundColor: "rgba(59, 130, 246, 0.2)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(59, 130, 246, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(59, 130, 246, 1)",
          tension: 0.4,
        },
        {
          label: "New",
          data: statsData.trends.map(t => t.pending),
          fill: true,
          backgroundColor: "rgba(245, 158, 11, 0.2)",
          borderColor: "rgba(245, 158, 11, 1)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(245, 158, 11, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(245, 158, 11, 1)",
          tension: 0.4,
        },
        {
          label: "In Progress",
          data: statsData.trends.map(t => t.inProgress),
          fill: true,
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(16, 185, 129, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(16, 185, 129, 1)",
          tension: 0.4,
        },
        {
          label: "Completed",
          data: statsData.trends.map(t => t.completed),
          fill: true,
          backgroundColor: "rgba(34, 197, 94, 0.2)",
          borderColor: "rgba(34, 197, 94, 1)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(34, 197, 94, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(34, 197, 94, 1)",
          tension: 0.4,
        },
      ],
    };
  }, [statsData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Plan Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Review requests and provide feedback to customers</p>
        </div>
      </div>

      {/* Search and Filters - Moved to Top */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col gap-4 w-full max-w-full">
          {/* Search and Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 w-full max-w-full">
            {/* Search Box */}
            <div className="relative w-full min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm max-w-full box-border"
                placeholder="Search requests..."
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

            {/* Role Filter */}
            <div className="w-full min-w-0">
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white max-w-full box-border"
              >
                <option value="">All Roles</option>
                <option value="Event planner">Event Planner</option>
                <option value="School / Teacher">School / Teacher</option>
                <option value="University">University</option>
                <option value="Community group">Community Group</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Trip Type Filter */}
            <div className="w-full min-w-0">
              <select
                value={tripType}
                onChange={(e) => {
                  setTripType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white max-w-full box-border"
              >
                <option value="">All Trip Types</option>
                <option value="Local tourism">Local Tourism</option>
                <option value="Safari">Safari</option>
                <option value="Cultural">Cultural</option>
                <option value="Adventure / Hiking">Adventure / Hiking</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="w-full min-w-0">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white max-w-full box-border"
              >
                <option value="">All Status</option>
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            {/* Date Picker */}
            <div className="relative w-full min-w-0">
              <button
                type="button"
                onClick={() => {
                  setPickerAnim(true);
                  setTimeout(() => setPickerAnim(false), 350);
                  setPickerOpen((v) => !v);
                }}
                className={`w-full px-3 py-2 rounded-lg border border-gray-300 text-sm flex items-center justify-center gap-2 text-gray-700 bg-white transition-all ${
                  pickerAnim ? "ring-2 ring-blue-100" : "hover:bg-gray-50"
                } box-border`}
              >
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </button>
              {pickerOpen && (
                <>
                  <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />
                  <div className="fixed z-40 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <DatePicker
                      selected={date || undefined}
                      onSelect={(s) => {
                        setDate(s as string | string[]);
                        setPage(1);
                      }}
                      onClose={() => setPickerOpen(false)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <>
            {/* Skeleton Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-40"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-8 bg-gray-200 rounded w-24 ml-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : list.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No plan requests found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.map((request) => {
                    const responseTimeColor = request.hoursSinceCreation > 48 
                      ? "text-red-600" 
                      : request.hoursSinceCreation > 24 
                      ? "text-amber-600" 
                      : "text-green-600";
                    const responseTimeText = request.hoursSinceCreation < 24
                      ? `${request.hoursSinceCreation}h`
                      : `${Math.floor(request.hoursSinceCreation / 24)}d`;
                    
                    return (
                      <tr key={request.id} className={`hover:bg-gray-50 transition-colors duration-150 ${request.isUrgent ? "bg-amber-50 border-l-4 border-l-amber-500" : ""}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            #{request.id}
                            {request.isUrgent && (
                              <div title="Urgent request">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.role}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            <div className="font-medium">{request.customer.name}</div>
                            <div className="text-xs text-gray-400">{request.customer.email}</div>
                            {request.customer.phone && (
                              <div className="text-xs text-gray-400">{request.customer.phone}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.tripType}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="max-w-xs truncate">{request.destinations || "N/A"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.dateFrom && request.dateTo ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <span>{new Date(request.dateFrom).toLocaleDateString()} - {new Date(request.dateTo).toLocaleDateString()}</span>
                            </div>
                          ) : (
                            "Flexible"
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.groupSize || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.budget || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            request.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                            request.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                            "bg-gray-100 text-gray-800"
                          }`}>
                            {request.status === "NEW" ? "New" : request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            {request.status === "NEW" && (
                              <button
                                onClick={() => handleStartWork(request.id)}
                                className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                              >
                                <Edit className="h-4 w-4" />
                                Start Work
                              </button>
                            )}
                            {request.status === "IN_PROGRESS" && (
                              <button
                                onClick={() => handleOpenResponse(request)}
                                className="text-green-600 hover:text-green-900 flex items-center gap-1"
                              >
                                <Send className="h-4 w-4" />
                                Provide Feedback
                              </button>
                            )}
                            {request.status === "COMPLETED" && (
                              <button
                                onClick={() => handleOpenResponse(request)}
                                className="text-gray-600 hover:text-gray-900 flex items-center gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                View Response
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {list.map((request) => {
                const responseTimeColor = request.hoursSinceCreation > 48 
                  ? "text-red-600" 
                  : request.hoursSinceCreation > 24 
                  ? "text-amber-600" 
                  : "text-green-600";
                const responseTimeText = request.hoursSinceCreation < 24
                  ? `${request.hoursSinceCreation}h`
                  : `${Math.floor(request.hoursSinceCreation / 24)}d`;
                
                return (
                  <div key={request.id} className={`p-4 bg-white hover:bg-gray-50 transition-colors duration-150 ${request.isUrgent ? "bg-amber-50 border-l-4 border-l-amber-500" : ""}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">Request #{request.id}</span>
                        {request.isUrgent && (
                          <div title="Urgent request">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                          </div>
                        )}
                      </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      request.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                      request.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {request.status === "NEW" ? "New" : request.status}
                    </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                      <Clock className={`h-4 w-4 ${responseTimeColor}`} />
                      <span className={responseTimeColor}>
                        Response: {request.respondedAt ? "Responded" : responseTimeText}
                      </span>
                      {request.hoursSinceCreation > 48 && request.status === "NEW" && (
                        <span className="text-xs text-red-600 font-medium">• Overdue</span>
                      )}
                    </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span>Role: {request.role} • Type: {request.tripType}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <span>Customer: {request.customer.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>Destination: {request.destinations || "N/A"}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      {request.dateFrom && request.dateTo
                        ? `${new Date(request.dateFrom).toLocaleDateString()} - ${new Date(request.dateTo).toLocaleDateString()}`
                        : "Flexible dates"}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span>Group Size: {request.groupSize || "N/A"}</span>
                    {request.transportRequired && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Transport</span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2 justify-end">
                    {request.status === "NEW" && (
                      <button
                        onClick={() => handleStartWork(request.id)}
                        className="text-blue-600 hover:text-blue-900 text-sm flex items-center gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        Start Work
                      </button>
                    )}
                    {request.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => handleOpenResponse(request)}
                        className="text-green-600 hover:text-green-900 text-sm flex items-center gap-1"
                      >
                        <Send className="h-4 w-4" />
                        Provide Feedback
                      </button>
                    )}
                    {request.status === "COMPLETED" && (
                      <button
                        onClick={() => handleOpenResponse(request)}
                        className="text-gray-600 hover:text-gray-900 text-sm flex items-center gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        View Response
                      </button>
                    )}
                  </div>
                </div>
                );
              })}
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

      {/* Charts Section - Moved Below Table */}
      {statsData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut Chart - Requests by Role */}
            <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 group">
              <div className="flex items-center gap-2 mb-6">
                <User className="h-5 w-5 text-blue-600 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">Requests by Role</h3>
              </div>

              {statsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
                </div>
              ) : statsData && Object.keys(statsData.roleBreakdown).some(k => statsData.roleBreakdown[k] > 0) ? (
                <div className="h-64 w-full transform transition-all duration-500 group-hover:scale-[1.02]">
                  <Chart
                    type="doughnut"
                    data={roleDonutChartData}
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
                              return `${label}: ${value} requests (${percentage}%)`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-center">
                  <div>
                    <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No role data available.</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your filters.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Bar Chart - Requests by Trip Type */}
            <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-green-300 hover:-translate-y-1 group">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-green-600 transition-colors duration-300">
                    <BarChart3 className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform duration-300" />
                    Requests by Trip Type
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Distribution of requests by trip type</p>
                </div>
                {/* Period Filter */}
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "7 Days", value: "7d" },
                    { label: "30 Days", value: "30d" },
                    { label: "This Month", value: "month" },
                    { label: "This Year", value: "year" },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setStatsPeriod(p.value)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                        statsPeriod === p.value
                          ? "bg-green-50 border-green-300 text-green-700 scale-105 shadow-md"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-sm"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {statsLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-green-600"></div>
                </div>
              ) : statsData && Object.keys(statsData.tripTypeBreakdown).some(k => statsData.tripTypeBreakdown[k] > 0) ? (
                <div className="h-64 w-full transform transition-all duration-500 group-hover:scale-[1.02]">
                  <Chart
                    type="bar"
                    data={tripTypeBarChartData}
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
                              const label = context.dataset.label || "";
                              const value = context.parsed.y || 0;
                              return `${label}: ${value} requests`;
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
                          title: {
                            display: true,
                            text: "Number of Requests",
                            font: {
                              size: 12,
                            },
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
                            maxRotation: 45,
                            minRotation: 45,
                          },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="h-64 w-full flex flex-col justify-end p-4">
                  {/* Skeleton Bar Chart */}
                  <div className="relative h-full w-full">
                    <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                    <div className="ml-10 h-full relative">
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-px bg-gray-200"></div>
                        ))}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-around px-2">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-8 bg-gray-200 rounded-t animate-pulse"
                            style={{ height: `${Math.random() * 70 + 30}%` }}
                          ></div>
                        ))}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-3 w-10 bg-gray-200 rounded animate-pulse"></div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Request Trends Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 group">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-blue-600 transition-colors duration-300">
                  <TrendingUp className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                  Request Trends
                </h3>
                <p className="text-sm text-gray-500 mt-1">Daily request trends over time</p>
              </div>
              {/* Period Filter */}
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "7 Days", value: "7d" },
                  { label: "30 Days", value: "30d" },
                  { label: "This Month", value: "month" },
                  { label: "This Year", value: "year" },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setStatsPeriod(p.value)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                      statsPeriod === p.value
                        ? "bg-blue-50 border-blue-300 text-blue-700 scale-105 shadow-md"
                        : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-sm"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {statsLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
              </div>
            ) : statsData && statsData.trends.length > 0 ? (
              <div className="h-64 w-full transform transition-all duration-500 group-hover:scale-[1.02]">
                <Chart
                  type="line"
                  data={requestTrendsLineChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: "top",
                        labels: {
                          padding: 15,
                          font: {
                            size: 12,
                          },
                          usePointStyle: true,
                        },
                      },
                      tooltip: {
                        callbacks: {
                          label: (context: any) => {
                            const label = context.dataset.label || "";
                            const value = context.parsed.y || 0;
                            return `${label}: ${value} requests`;
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
                        title: {
                          display: true,
                          text: "Number of Requests",
                          font: {
                            size: 12,
                          },
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
              </div>
            ) : (
              <div className="h-64 w-full flex flex-col justify-end p-4">
                {/* Skeleton Line Chart */}
                <div className="relative h-full w-full">
                  <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    ))}
                  </div>
                  <div className="ml-10 h-full relative">
                    <div className="absolute inset-0 flex flex-col justify-between">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-px bg-gray-200"></div>
                      ))}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-full">
                      <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                        <path
                          d="M 0 250 Q 80 200, 160 180 T 320 150 T 400 100"
                          fill="rgba(59, 130, 246, 0.1)"
                          stroke="rgba(59, 130, 246, 0.3)"
                          strokeWidth="2"
                          className="animate-pulse"
                        />
                      </svg>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Response Modal */}
      {showResponseModal && selectedRequest && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowResponseModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedRequest.status === "COMPLETED" ? "View Response" : "Provide Feedback"}
                </h2>
                <button
                  onClick={() => setShowResponseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Request Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 mb-3">Request Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Customer:</span>
                      <span className="ml-2 font-medium">{selectedRequest.customer.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="ml-2">{selectedRequest.customer.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Role:</span>
                      <span className="ml-2">{selectedRequest.role}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Trip Type:</span>
                      <span className="ml-2">{selectedRequest.tripType}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Destination:</span>
                      <span className="ml-2">{selectedRequest.destinations || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Group Size:</span>
                      <span className="ml-2">{selectedRequest.groupSize || "N/A"}</span>
                    </div>
                  </div>
                  {selectedRequest.notes && (
                    <div className="mt-3">
                      <span className="text-gray-500 text-sm">Notes:</span>
                      <p className="mt-1 text-sm text-gray-700">{selectedRequest.notes}</p>
                    </div>
                  )}
                </div>

                {/* Response Form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Suggested Itineraries with Prices *
                    </label>
                    <textarea
                      value={responseForm.suggestedItineraries}
                      onChange={(e) => setResponseForm({ ...responseForm, suggestedItineraries: e.target.value })}
                      disabled={selectedRequest.status === "COMPLETED"}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      placeholder="Provide detailed itineraries with estimated prices..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Checklist of Required Permits and Documents *
                    </label>
                    <textarea
                      value={responseForm.requiredPermits}
                      onChange={(e) => setResponseForm({ ...responseForm, requiredPermits: e.target.value })}
                      disabled={selectedRequest.status === "COMPLETED"}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      placeholder="List all required permits, documents, and preparation steps..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Timelines and Booking Windows *
                    </label>
                    <textarea
                      value={responseForm.estimatedTimeline}
                      onChange={(e) => setResponseForm({ ...responseForm, estimatedTimeline: e.target.value })}
                      disabled={selectedRequest.status === "COMPLETED"}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      placeholder="Provide estimated timelines, booking deadlines, and important dates..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assigned Agent / Contact
                      </label>
                      <input
                        type="text"
                        value={responseForm.assignedAgent}
                        onChange={(e) => setResponseForm({ ...responseForm, assignedAgent: e.target.value })}
                        disabled={selectedRequest.status === "COMPLETED"}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                        placeholder="Agent name and contact info"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Additional Notes / Recommendations
                    </label>
                    <textarea
                      value={responseForm.adminResponse}
                      onChange={(e) => setResponseForm({ ...responseForm, adminResponse: e.target.value })}
                      disabled={selectedRequest.status === "COMPLETED"}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      placeholder="Any additional recommendations, tips, or general schedule information..."
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                {selectedRequest.status !== "COMPLETED" && (
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setShowResponseModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitResponse}
                      disabled={submitting || !responseForm.suggestedItineraries || !responseForm.requiredPermits || !responseForm.estimatedTimeline}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send Feedback to Customer
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

