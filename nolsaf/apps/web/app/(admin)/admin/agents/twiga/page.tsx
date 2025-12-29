"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  User,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Eye,
  Search,
  Filter,
  X,
  TrendingUp,
  AlertCircle,
  Users,
  Calendar,
  Globe,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import axios from "axios";

const api = axios.create({ baseURL: "", withCredentials: true });

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

export default function TwigaDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [viewingConversation, setViewingConversation] = useState<FullConversation | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [filter, setFilter] = useState<"all" | "needsFollowUp" | "followedUp">("needsFollowUp");
  const [searchQuery, setSearchQuery] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [markingFollowUp, setMarkingFollowUp] = useState(false);
  const [timeRange, setTimeRange] = useState<"7" | "30" | "90">("7");

  useEffect(() => {
    loadStats();
    loadConversations();
  }, [page, filter, timeRange]);

  async function loadStats() {
    setLoadingStats(true);
    try {
      const response = await api.get<{ success: boolean; stats: Stats }>("/api/admin/chatbot/stats", {
        params: { days: timeRange },
      });
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err: any) {
      console.error("Failed to load stats", err);
    } finally {
      setLoadingStats(false);
    }
  }

  async function loadConversations() {
    setLoading(true);
    try {
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
    } finally {
      setLoading(false);
    }
  }

  async function loadConversationDetails(id: number) {
    setLoadingConversation(true);
    try {
      const response = await api.get<{
        success: boolean;
        conversation: FullConversation;
      }>(`/api/admin/chatbot/conversations/${id}`);

      if (response.data.success) {
        setViewingConversation(response.data.conversation);
      }
    } catch (err: any) {
      console.error("Failed to load conversation details", err);
    } finally {
      setLoadingConversation(false);
    }
  }

  async function markAsFollowedUp(id: number) {
    if (!followUpNotes.trim()) {
      alert("Please add notes about the follow-up");
      return;
    }

    setMarkingFollowUp(true);
    try {
      await api.post(`/api/admin/chatbot/conversations/${id}/follow-up`, {
        notes: followUpNotes,
      });

      await loadStats();
      await loadConversations();
      if (viewingConversation && viewingConversation.id === id) {
        await loadConversationDetails(id);
      }
      setFollowUpNotes("");
      alert("Conversation marked as followed up!");
    } catch (err: any) {
      console.error("Failed to mark follow-up", err);
      alert("Failed to mark follow-up");
    } finally {
      setMarkingFollowUp(false);
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
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
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#02665e] to-[#024d47] rounded-xl p-6 shadow-lg text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Twiga Analytics</h1>
              <p className="text-white/80 mt-1">Track and manage chatbot conversations</p>
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value as "7" | "30" | "90");
                setPage(1);
              }}
              className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Conversations */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-sm font-medium text-gray-600 mb-1">Total Conversations</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-2">All time</div>
          </div>

          {/* Needs Follow-up */}
          <div className="bg-white rounded-xl border border-red-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <ArrowUpRight className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-sm font-medium text-gray-600 mb-1">Needs Follow-up</div>
            <div className="text-3xl font-bold text-red-600">{stats.needsFollowUp}</div>
            <div className="text-xs text-gray-500 mt-2">Requires attention</div>
          </div>

          {/* Followed Up */}
          <div className="bg-white rounded-xl border border-green-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-sm font-medium text-gray-600 mb-1">Followed Up</div>
            <div className="text-3xl font-bold text-green-600">{stats.followedUp}</div>
            <div className="text-xs text-gray-500 mt-2">Resolved</div>
          </div>

          {/* Recent (24h) */}
          <div className="bg-white rounded-xl border border-purple-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-lg bg-purple-50 flex items-center justify-center">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
              <Calendar className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-sm font-medium text-gray-600 mb-1">Last 24 Hours</div>
            <div className="text-3xl font-bold text-purple-600">{stats.recent}</div>
            <div className="text-xs text-gray-500 mt-2">New conversations</div>
          </div>
        </div>
      ) : null}

      {/* Insights Section */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Languages */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-[#02665e]" />
              <h2 className="text-lg font-semibold text-gray-900">Top Languages</h2>
            </div>
            <div className="space-y-3">
              {stats.topLanguages.length > 0 ? (
                stats.topLanguages.map((lang: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#02665e]/10 flex items-center justify-center text-sm font-semibold text-[#02665e]">
                        {idx + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-900 uppercase">{lang.language}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#02665e] h-2 rounded-full"
                          style={{
                            width: `${(Number(lang.count) / stats.total) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-12 text-right">{lang.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">No data available</div>
              )}
            </div>
          </div>

          {/* Conversation Trends */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-[#02665e]" />
              <h2 className="text-lg font-semibold text-gray-900">Conversation Trends</h2>
            </div>
            <div className="space-y-2">
              {stats.conversationsByDay.length > 0 ? (
                stats.conversationsByDay.map((day: any, idx: number) => {
                  const maxCount = Math.max(...stats.conversationsByDay.map((d: any) => Number(d.count)));
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="text-xs text-gray-600 w-24">
                        {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                      <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#02665e] to-[#024d47] h-6 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                          style={{
                            width: `${(Number(day.count) / maxCount) * 100}%`,
                          }}
                        >
                          <span className="text-xs font-semibold text-white">{day.count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500 text-center py-4">No data available</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conversations Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header with Filters */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Recent Conversations</h2>
              <p className="text-sm text-gray-500 mt-1">Manage and track user interactions</p>
            </div>
            <div className="flex gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none w-64"
                />
              </div>
              {/* Filter Tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => {
                    setFilter("needsFollowUp");
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    filter === "needsFollowUp"
                      ? "bg-white text-[#02665e] shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Needs Follow-up
                </button>
                <button
                  onClick={() => {
                    setFilter("followedUp");
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    filter === "followedUp"
                      ? "bg-white text-[#02665e] shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Followed Up
                </button>
                <button
                  onClick={() => {
                    setFilter("all");
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    filter === "all"
                      ? "bg-white text-[#02665e] shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
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
          <div className="p-8 text-center text-gray-500">Loading conversations...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No conversations found</div>
        ) : (
          <>
            <div className="divide-y divide-gray-200">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => loadConversationDetails(conv.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-full bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                        {conv.userName ? (
                          <span className="text-[#02665e] font-semibold">
                            {conv.userName
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .substring(0, 2)}
                          </span>
                        ) : (
                          <User className="h-6 w-6 text-[#02665e]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900">
                            {conv.userName || "Anonymous User"}
                          </h3>
                          {conv.needsFollowUp && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Needs Follow-up
                            </span>
                          )}
                          {!conv.needsFollowUp && conv.followedUpAt && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Resolved
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                          {conv.userEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {conv.userEmail}
                            </span>
                          )}
                          {conv.userPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {conv.userPhone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            {conv.language.toUpperCase()}
                          </span>
                        </div>
                        {conv.lastMessage && (
                          <p className="text-sm text-gray-700 line-clamp-2">{conv.lastMessage}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{conv.messageCount} messages</span>
                          <span>•</span>
                          <span>
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
                      className="px-4 py-2 bg-[#02665e] text-white rounded-lg text-sm font-medium hover:bg-[#024d47] transition-colors flex items-center gap-2 flex-shrink-0"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} conversations
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(pages, page + 1))}
                    disabled={page === pages}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#02665e] to-[#024d47] px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-white">Conversation Details</h2>
              <button
                onClick={() => {
                  setViewingConversation(null);
                  setFollowUpNotes("");
                }}
                className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg transition-all duration-200 text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 min-w-0 min-h-0">
              <div className="p-6 space-y-6">
                {/* User Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">User Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">
                    Messages ({viewingConversation.messages.length})
                  </h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {viewingConversation.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg ${
                          msg.role === "user"
                            ? "bg-[#02665e]/10 ml-8"
                            : "bg-gray-100 mr-8"
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
                  <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-base font-semibold text-gray-900 mb-4">Mark as Followed Up</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Follow-up Notes</label>
                        <textarea
                          value={followUpNotes}
                          onChange={(e) => setFollowUpNotes(e.target.value)}
                          placeholder="Add notes about how you followed up with this user..."
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm"
                          rows={4}
                        />
                      </div>
                      <button
                        onClick={() => markAsFollowedUp(viewingConversation.id)}
                        disabled={markingFollowUp || !followUpNotes.trim()}
                        className="px-6 py-2.5 bg-[#02665e] text-white rounded-lg font-medium hover:bg-[#024d47] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {markingFollowUp ? "Marking..." : "Mark as Followed Up"}
                      </button>
                    </div>
                  </div>
                )}

                {!viewingConversation.needsFollowUp && viewingConversation.followUpNotes && (
                  <div className="bg-green-50 rounded-lg border border-green-200 p-5">
                    <h3 className="text-base font-semibold text-green-900 mb-2">Follow-up Notes</h3>
                    <p className="text-sm text-green-800 whitespace-pre-wrap">
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
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-white px-6 py-4 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setViewingConversation(null);
                  setFollowUpNotes("");
                }}
                className="px-6 py-2.5 bg-[#02665e] text-white rounded-lg font-medium hover:bg-[#024d47]"
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

