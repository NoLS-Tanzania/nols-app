"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  MessageSquare,
  User,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Eye,
  Search,
  X,
  TrendingUp,
  AlertCircle,
  Calendar,
  Globe,
  Activity,
  ArrowUpRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import axios from "axios";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const api = axios.create({ baseURL: "", withCredentials: true });

function authify() {
  if (typeof window === "undefined") return;

  // Most of the app uses a Bearer token (often stored in localStorage).
  // The API endpoints are protected by requireAuth, so we must attach it.
  const lsToken =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("nolsaf_token") ||
    window.localStorage.getItem("__Host-nolsaf_token");

  if (lsToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${lsToken}`;
    return;
  }

  // Fallback: non-httpOnly cookie (if present)
  const m = String(document.cookie || "").match(/(?:^|;\s*)(?:nolsaf_token|__Host-nolsaf_token)=([^;]+)/);
  const cookieToken = m?.[1] ? decodeURIComponent(m[1]) : "";
  if (cookieToken) {
    api.defaults.headers.common["Authorization"] = `Bearer ${cookieToken}`;
  }
}

// Input sanitization helper
function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, "");
}

// Validate conversation ID
function isValidConversationId(id: number | null | undefined): boolean {
  return id !== null && id !== undefined && Number.isInteger(id) && id > 0;
}

// Toast notification helper
function showToast(type: "success" | "error" | "info" | "warning", title: string, message?: string, duration?: number) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("nols:toast", {
        detail: { type, title, message, duration: duration ?? 5000 },
      })
    );
  }
}

type Conversation = {
  id: number;
  sessionId: string;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  userPhone: string | null;
  language: string;
  needsFollowUp: boolean;
  followUpNotes: string | null;
  followedUpAt: string | null;
  followedUpBy: number | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
};

type FullConversation = Conversation & {
  messages: Array<{
    id: number;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
};

type Stats = {
  total: number;
  needsFollowUp: number;
  followedUp: number;
  recent: number;
  conversationsByDay: Array<{ date: string; count: number }>;
  topLanguages: Array<{ language: string; count: number }>;
};

export default function AIAgentsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [viewingConversation, setViewingConversation] = useState<FullConversation | null>(null);
  const [filter, setFilter] = useState<"all" | "needsFollowUp" | "followedUp">("needsFollowUp");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [markingFollowUp, setMarkingFollowUp] = useState(false);
  const [loadingConversationDetails, setLoadingConversationDetails] = useState(false);
  const [timeRange, setTimeRange] = useState<"7" | "30" | "90">("7");
  const [error, setError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [conversationDetailsError, setConversationDetailsError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      authify();
      const response = await api.get<{ success: boolean; stats: Stats }>("/api/admin/chatbot/stats", {
        params: { days: timeRange },
      });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err: any) {
      console.error("Failed to load stats", err);
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to load statistics";
      setStatsError(errorMessage);
      showToast("error", "Failed to Load Statistics", errorMessage);
    } finally {
      setLoadingStats(false);
    }
  }, [timeRange]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      authify();
      const params: any = {
        page,
        pageSize,
        sortBy: "updatedAt",
        sortOrder: "desc",
      };
      if (filter === "needsFollowUp") {
        params.needsFollowUp = "true";
      } else if (filter === "followedUp") {
        params.needsFollowUp = "false";
      }

      const response = await api.get<{
        success: boolean;
        conversations: Conversation[];
        total: number;
        page: number;
        pageSize: number;
      }>("/api/admin/chatbot/conversations", { params });

      if (response.data.success) {
        setConversations(response.data.conversations || []);
        setTotal(response.data.total || 0);
      }
    } catch (err: any) {
      console.error("Failed to load conversations", err);
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to load conversations";
      setError(errorMessage);
      showToast("error", "Failed to Load Conversations", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  useEffect(() => {
    authify();
    loadStats();
    loadConversations();
  }, [loadStats, loadConversations]);

  const loadConversationDetails = useCallback(async (id: number) => {
    if (!isValidConversationId(id)) {
      showToast("error", "Invalid Conversation", "Invalid conversation ID provided");
      return;
    }

    setLoadingConversationDetails(true);
    setConversationDetailsError(null);
    try {
      authify();
      const response = await api.get<{
        success: boolean;
        conversation: FullConversation;
      }>(`/api/admin/chatbot/conversations/${id}`);

      if (response.data.success) {
        setViewingConversation(response.data.conversation);
      }
    } catch (err: any) {
      console.error("Failed to load conversation details", err);
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to load conversation details";
      setConversationDetailsError(errorMessage);
      showToast("error", "Failed to Load Conversation", errorMessage);
    } finally {
      setLoadingConversationDetails(false);
    }
  }, []);

  const markAsFollowedUp = useCallback(async (id: number) => {
    if (!isValidConversationId(id)) {
      showToast("error", "Invalid Conversation", "Invalid conversation ID provided");
      return;
    }

    const sanitizedNotes = sanitizeInput(followUpNotes);
    if (!sanitizedNotes.trim()) {
      showToast("warning", "Notes Required", "Please add notes about the follow-up");
      return;
    }

    if (sanitizedNotes.length > 2000) {
      showToast("error", "Notes Too Long", "Follow-up notes must be less than 2000 characters");
      return;
    }

    setMarkingFollowUp(true);
    try {
      authify();
      await api.post(`/api/admin/chatbot/conversations/${id}/follow-up`, {
        notes: sanitizedNotes,
      });

      await loadStats();
      await loadConversations();
      if (viewingConversation && viewingConversation.id === id) {
        await loadConversationDetails(id);
      }
      setFollowUpNotes("");
      showToast("success", "Follow-up Marked", "Conversation marked as followed up successfully");
    } catch (err: any) {
      console.error("Failed to mark follow-up", err);
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to mark follow-up";
      showToast("error", "Failed to Mark Follow-up", errorMessage);
    } finally {
      setMarkingFollowUp(false);
    }
  }, [followUpNotes, loadStats, loadConversations, viewingConversation, loadConversationDetails]);

  const filteredConversations = conversations.filter((conv) => {
    if (!debouncedSearch) return true;
    const query = sanitizeInput(debouncedSearch).toLowerCase();
    return (
      conv.userName?.toLowerCase().includes(query) ||
      conv.userEmail?.toLowerCase().includes(query) ||
      conv.userPhone?.toLowerCase().includes(query) ||
      conv.lastMessage?.toLowerCase().includes(query) ||
      conv.sessionId.toLowerCase().includes(query)
    );
  });

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 px-2 sm:px-4">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-[#02665e]/10 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-[#02665e]" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Twiga Analytics</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Track and manage chatbot conversations</p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Range Selector - Modernized */}
      <div className="flex justify-end px-2 sm:px-4">
        <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <Calendar className="h-4 w-4 text-gray-500 ml-2" aria-hidden="true" />
          <select
            value={timeRange}
            onChange={(e) => {
              setTimeRange(e.target.value as "7" | "30" | "90");
              setPage(1);
            }}
            aria-label="Select time range for conversations"
            title="Select time range for statistics"
            className="px-3 py-2 bg-transparent border-0 text-gray-700 text-sm font-medium focus:outline-none focus:ring-0 cursor-pointer appearance-none pr-8 bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25em_1.25em] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%3E%3C%2Fpath%3E%3C%2Fsvg%3E')]"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : statsError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
          <p className="text-red-800 font-medium mb-2">Failed to load statistics</p>
          <p className="text-red-600 text-sm mb-4">{statsError}</p>
          <button
            onClick={loadStats}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            aria-label="Retry loading statistics"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Conversations */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Conversations</div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-2">All time</div>
          </div>

          {/* Needs Follow-up */}
          <div className="bg-white rounded-xl border border-red-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
              </div>
              <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Needs Follow-up</div>
            <div className="text-2xl sm:text-3xl font-bold text-red-600">{stats.needsFollowUp}</div>
            <div className="text-xs text-gray-500 mt-2">Requires attention</div>
          </div>

          {/* Followed Up */}
          <div className="bg-white rounded-xl border border-green-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Followed Up</div>
            <div className="text-2xl sm:text-3xl font-bold text-green-600">{stats.followedUp}</div>
            <div className="text-xs text-gray-500 mt-2">Resolved</div>
          </div>

          {/* Recent (24h) */}
          <div className="bg-white rounded-xl border border-purple-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
            </div>
            <div className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Last 24 Hours</div>
            <div className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.recent}</div>
            <div className="text-xs text-gray-500 mt-2">New conversations</div>
          </div>
        </div>
      ) : null}

      {/* Visualizations Section */}
      <div className="space-y-4 sm:space-y-6">
        {/* Conversation Trends - Line Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#02665e]" />
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">Conversation Trends Over Time</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={
                stats?.conversationsByDay && stats.conversationsByDay.length > 0
                  ? stats.conversationsByDay.map((day: any) => ({
                      date: new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                      conversations: Number(day.count),
                    }))
                  : Array.from({ length: 7 }, (_, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - i));
                      return {
                        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                        conversations: 0,
                      };
                    })
              }
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  padding: "8px 12px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="conversations"
                stroke="#02665e"
                strokeWidth={2}
                dot={{ fill: "#02665e", r: 4 }}
                activeDot={{ r: 6 }}
                name="Conversations"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution and Top Languages */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Conversation Status Distribution - Pie Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-[#02665e]" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Status Distribution</h2>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={[
                    {
                      name: "Needs Follow-up",
                      value: stats?.needsFollowUp || 0,
                      color: "#ef4444",
                    },
                    {
                      name: "Followed Up",
                      value: stats?.followedUp || 0,
                      color: "#10b981",
                    },
                    {
                      name: "Other",
                      value: Math.max(0, (stats?.total || 0) - (stats?.needsFollowUp || 0) - (stats?.followedUp || 0)),
                      color: "#6b7280",
                    },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) => (value > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : "")}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {[
                    { name: "Needs Follow-up", value: stats?.needsFollowUp || 0, color: "#ef4444" },
                    { name: "Followed Up", value: stats?.followedUp || 0, color: "#10b981" },
                    {
                      name: "Other",
                      value: Math.max(0, (stats?.total || 0) - (stats?.needsFollowUp || 0) - (stats?.followedUp || 0)),
                      color: "#6b7280",
                    },
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px 12px",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Languages - Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-[#02665e]" />
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Top Languages</h2>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={
                  stats?.topLanguages && stats.topLanguages.length > 0
                    ? stats.topLanguages.map((lang: any) => ({
                        language: lang.language.toUpperCase(),
                        count: Number(lang.count),
                      }))
                    : [{ language: "EN", count: 0 }, { language: "FR", count: 0 }, { language: "SW", count: 0 }]
                }
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="language" type="category" stroke="#6b7280" fontSize={12} width={60} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    padding: "8px 12px",
                  }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]} name="Conversations">
                  {(stats?.topLanguages && stats.topLanguages.length > 0
                    ? stats.topLanguages.map((lang: any) => ({
                        language: lang.language.toUpperCase(),
                        count: Number(lang.count),
                      }))
                    : [{ language: "EN", count: 0 }, { language: "FR", count: 0 }, { language: "SW", count: 0 }]
                  ).map((entry: any, index: number) => {
                    // Color mapping for different languages
                    const languageColors: { [key: string]: string } = {
                      EN: "#3b82f6", // Blue for English
                      FR: "#8b5cf6", // Purple for French
                      ES: "#ef4444", // Red for Spanish
                      PT: "#10b981", // Green for Portuguese
                      AR: "#f59e0b", // Amber for Arabic
                      ZH: "#ec4899", // Pink for Chinese
                      SW: "#06b6d4", // Cyan for Swahili
                    };
                    const color = languageColors[entry.language] || "#02665e"; // Default teal for unknown languages
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Conversations Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header with Filters */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Conversations</h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Manage and track user interactions</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-3 items-stretch sm:items-center sm:justify-between">
              {/* Search */}
              <div className="relative w-full sm:w-auto sm:max-w-xs flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 200) {
                      setSearchQuery(value);
                    }
                  }}
                  aria-label="Search conversations by name, email, phone, message, or session ID"
                  title="Search conversations"
                  maxLength={200}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {/* Filter Tabs */}
              <div className="inline-flex gap-0.5 bg-gray-100 rounded-lg p-0.5 overflow-x-auto flex-shrink-0 sm:ml-auto">
                <button
                  onClick={() => {
                    setFilter("needsFollowUp");
                    setPage(1);
                  }}
                  aria-label="Filter conversations that need follow-up"
                  className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 ease-in-out ${
                    filter === "needsFollowUp"
                      ? "bg-white text-[#02665e] shadow-sm font-semibold"
                      : "text-gray-600 hover:text-[#02665e] hover:bg-gray-50"
                  }`}
                >
                  Needs Follow-up
                </button>
                <button
                  onClick={() => {
                    setFilter("followedUp");
                    setPage(1);
                  }}
                  aria-label="Filter followed up conversations"
                  className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 ease-in-out ${
                    filter === "followedUp"
                      ? "bg-white text-[#02665e] shadow-sm font-semibold"
                      : "text-gray-600 hover:text-[#02665e] hover:bg-gray-50"
                  }`}
                >
                  Followed Up
                </button>
                <button
                  onClick={() => {
                    setFilter("all");
                    setPage(1);
                  }}
                  aria-label="Show all conversations"
                  className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all duration-200 ease-in-out ${
                    filter === "all"
                      ? "bg-white text-[#02665e] shadow-sm font-semibold"
                      : "text-gray-600 hover:text-[#02665e] hover:bg-gray-50"
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Conversations List */}
        {loading ? (
          <div className="p-6 sm:p-8 text-center">
            <Loader2 className="h-6 w-6 text-[#02665e] animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Loading conversations...</p>
          </div>
        ) : error ? (
          <div className="p-6 sm:p-8 text-center bg-red-50 border-t border-red-200">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
            <p className="text-red-800 font-medium mb-2">Failed to load conversations</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={loadConversations}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              aria-label="Retry loading conversations"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-6 sm:p-8 text-center text-gray-500 text-sm">
            {debouncedSearch ? "No conversations found matching your search" : "No conversations found"}
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="p-4 sm:p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => loadConversationDetails(conv.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                        {conv.userName ? (
                          <span className="text-[#02665e] font-semibold text-xs sm:text-sm">
                            {conv.userName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .substring(0, 2)}
                          </span>
                        ) : (
                          <User className="h-5 w-5 sm:h-6 sm:w-6 text-[#02665e]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {conv.userName || "Anonymous User"}
                          </h3>
                          {conv.needsFollowUp && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1 flex-shrink-0">
                              <AlertCircle className="h-3 w-3" />
                              <span className="hidden sm:inline">Needs Follow-up</span>
                              <span className="sm:hidden">Follow-up</span>
                            </span>
                          )}
                          {!conv.needsFollowUp && conv.followedUpAt && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1 flex-shrink-0">
                              <CheckCircle className="h-3 w-3" />
                              Resolved
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500 mb-2">
                          {conv.userEmail && (
                            <span className="flex items-center gap-1 truncate max-w-[200px] sm:max-w-none">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{conv.userEmail}</span>
                            </span>
                          )}
                          {conv.userPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 flex-shrink-0" />
                              {conv.userPhone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3 flex-shrink-0" />
                            {conv.language.toUpperCase()}
                          </span>
                        </div>
                        {conv.lastMessage && (
                          <p className="text-xs sm:text-sm text-gray-700 line-clamp-2 mb-2">{conv.lastMessage}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
                          <span>{conv.messageCount} messages</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate">
                            {conv.lastMessageTime
                              ? new Date(conv.lastMessageTime).toLocaleString()
                              : new Date(conv.updatedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadConversationDetails(conv.id);
                      }}
                      aria-label={`View conversation details for ${conv.userName || "Anonymous User"}`}
                      title="View conversation details"
                      className="px-3 sm:px-4 py-2 bg-[#02665e] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#024d47] transition-colors flex items-center justify-center gap-2 flex-shrink-0 w-full sm:w-auto"
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} conversations
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    aria-label="Go to previous page"
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(pages, page + 1))}
                    disabled={page === pages}
                    aria-label="Go to next page"
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Conversation Detail Modal */}
      {viewingConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col m-2 sm:m-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#02665e] to-[#024d47] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg sm:text-xl font-bold text-white truncate pr-2">Conversation Details</h2>
              <button
                onClick={() => {
                  setViewingConversation(null);
                  setFollowUpNotes("");
                }}
                aria-label="Close conversation details"
                className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg transition-all duration-200 text-white flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 min-w-0 min-h-0">
              {loadingConversationDetails ? (
                <div className="p-6 sm:p-8 text-center">
                  <Loader2 className="h-6 w-6 text-[#02665e] animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Loading conversation details...</p>
                </div>
              ) : conversationDetailsError ? (
                <div className="p-6 sm:p-8 text-center bg-red-50">
                  <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
                  <p className="text-red-800 font-medium mb-2">Failed to load conversation details</p>
                  <p className="text-red-600 text-sm mb-4">{conversationDetailsError}</p>
                  <button
                    onClick={() => viewingConversation && loadConversationDetails(viewingConversation.id)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    aria-label="Retry loading conversation details"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              ) : (
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* User Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 shadow-sm">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">User Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
                      <p className="text-sm font-medium text-gray-900">
                        {viewingConversation.userName || "Anonymous User"}
                      </p>
                    </div>
                    {viewingConversation.userEmail && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                        <p className="text-sm text-gray-900">{viewingConversation.userEmail}</p>
                      </div>
                    )}
                    {viewingConversation.userPhone && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone</label>
                        <p className="text-sm text-gray-900">{viewingConversation.userPhone}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Language</label>
                      <p className="text-sm text-gray-900">{viewingConversation.language.toUpperCase()}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                      {viewingConversation.needsFollowUp ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                          <Clock className="h-3 w-3" />
                          Needs Follow-up
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Followed Up
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 shadow-sm">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">
                    Messages ({viewingConversation.messages.length})
                  </h3>
                  <div className="space-y-3 sm:space-y-4 max-h-64 sm:max-h-96 overflow-y-auto">
                    {viewingConversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 sm:p-4 rounded-lg ${
                          msg.role === "user"
                            ? "bg-[#02665e]/10 ml-0 sm:ml-8"
                            : "bg-gray-100 mr-0 sm:mr-8"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-700">
                            {msg.role === "user" ? "User" : "Twiga"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Follow-up Section */}
                {viewingConversation.needsFollowUp && (
                  <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 shadow-sm">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 sm:mb-4">Mark as Followed Up</h3>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label htmlFor="follow-up-notes" className="block text-xs font-medium text-gray-500 mb-2">
                          Follow-up Notes
                        </label>
                        <textarea
                          id="follow-up-notes"
                          value={followUpNotes}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 2000) {
                              setFollowUpNotes(value);
                            }
                          }}
                          placeholder="Add notes about how you followed up with this user..."
                          aria-label="Follow-up notes"
                          title="Add notes about the follow-up"
                          maxLength={2000}
                          className="w-full px-3 sm:px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm"
                          rows={4}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {followUpNotes.length}/2000 characters
                        </p>
                      </div>
                      <button
                        onClick={() => viewingConversation && markAsFollowedUp(viewingConversation.id)}
                        disabled={markingFollowUp || !followUpNotes.trim()}
                        aria-label="Mark conversation as followed up"
                        className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-[#02665e] text-white rounded-lg text-sm sm:text-base font-medium hover:bg-[#024d47] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {markingFollowUp ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Marking...
                          </>
                        ) : (
                          "Mark as Followed Up"
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {!viewingConversation.needsFollowUp && viewingConversation.followUpNotes && (
                  <div className="bg-green-50 rounded-lg border border-green-200 p-4 sm:p-5">
                    <h3 className="text-sm sm:text-base font-semibold text-green-900 mb-2">Follow-up Notes</h3>
                    <p className="text-xs sm:text-sm text-green-800 whitespace-pre-wrap">
                      {viewingConversation.followUpNotes}
                    </p>
                    {viewingConversation.followedUpAt && (
                      <p className="text-xs text-green-600 mt-2">
                        Followed up on: {new Date(viewingConversation.followedUpAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-white px-4 sm:px-6 py-3 sm:py-4 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setViewingConversation(null);
                  setFollowUpNotes("");
                }}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-2.5 bg-[#02665e] text-white rounded-lg text-sm sm:text-base font-medium hover:bg-[#024d47]"
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
