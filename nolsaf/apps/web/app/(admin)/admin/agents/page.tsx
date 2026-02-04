"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, User, CheckCircle, XCircle, Clock, Eye, Filter, GraduationCap, MapPin, Award, Languages, Briefcase, UsersRound, ChevronDown, ChevronUp, Calendar, DollarSign, Star, CheckCircle2, Mail, Phone, TrendingUp, Target, Trophy, Loader2, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";
import axios from "axios";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });

function unwrapApiData<T = any>(axiosData: any): T {
  // admin.agents endpoints respond as { ok: true, data: ... }
  // but some other endpoints in the app respond as plain objects.
  return (axiosData && typeof axiosData === "object" && "data" in axiosData) ? (axiosData.data as T) : (axiosData as T);
}

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

// Validate agent ID
function isValidAgentId(id: number | null | undefined): boolean {
  return id !== null && id !== undefined && Number.isInteger(id) && id > 0;
}

function initials(name: string | null | undefined) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "?";
  const second = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + second).toUpperCase();
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

type Agent = {
  id: number;
  userId: number;
  status: string;
  educationLevel: string | null;
  areasOfOperation: string[] | null;
  certifications: any[] | null;
  languages: string[] | string | null;
  yearsOfExperience: number | null;
  specializations: string[] | null;
  bio: string | null;
  isAvailable: boolean;
  maxActiveRequests: number;
  currentActiveRequests: number;
  performanceMetrics: any;
  level?: string;
  promotionProgress?: {
    currentTrips: number;
    minTrips: number;
    maxTrips: number;
    currentRevenue: number;
    minRevenue: number;
    tripsProgress: number;
    revenueProgress: number;
    overallProgress: number;
    eligibleForPromotion: boolean;
  };
  createdAt: string;
  updatedAt: string;
  user: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  assignedPlanRequests?: Array<{
    id: number;
    role: string;
    tripType: string;
    status: string;
    fullName: string | null;
    email: string | null;
    phone: string | null;
    dateFrom: string | null;
    dateTo: string | null;
    groupSize: number | null;
    budget: number | null;
    destinations: string | null;
    notes: string | null;
    adminResponse: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

export default function AdminAgentsPage() {
  const searchParams = useSearchParams();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;
  const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);
  const [loadingAgentDetails, setLoadingAgentDetails] = useState(false);
  const [agentDetailsError, setAgentDetailsError] = useState<string | null>(null);
  const [personalDetailsOpen, setPersonalDetailsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [status, setStatus] = useState<string>("");
  const [educationLevel, setEducationLevel] = useState<string>("");
  const [available, setAvailable] = useState<string>("");
  const [areasOfOperation, setAreasOfOperation] = useState<string>("");
  const [specializations, setSpecializations] = useState<string>("");
  const [languages, setLanguages] = useState<string>("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (searchParams) {
      const urlStatus = searchParams.get("status");
      const urlEducationLevel = searchParams.get("educationLevel");
      const urlAvailable = searchParams.get("available");
      setStatus(urlStatus || "");
      setEducationLevel(urlEducationLevel || "");
      setAvailable(urlAvailable || "");
    }
  }, [searchParams]);

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      authify();
      const params: any = {
        page,
        pageSize,
      };

      if (status && status.trim()) params.status = sanitizeInput(status.trim());
      if (educationLevel && educationLevel.trim()) params.educationLevel = sanitizeInput(educationLevel.trim());
      if (available && available.trim()) params.available = sanitizeInput(available.trim());
      if (areasOfOperation && areasOfOperation.trim()) params.areasOfOperation = sanitizeInput(areasOfOperation.trim());
      if (specializations && specializations.trim()) params.specializations = sanitizeInput(specializations.trim());
      if (languages && languages.trim()) params.languages = sanitizeInput(languages.trim());
      if (debouncedQ && debouncedQ.trim()) params.q = sanitizeInput(debouncedQ.trim());

      const response = await api.get<{ items: Agent[]; total: number; page: number; pageSize: number }>("/api/admin/agents", { params });
      const payload = unwrapApiData<{ items: Agent[]; total: number; page: number; pageSize: number }>(response.data);
      setAgents(payload?.items || []);
      setTotal(payload?.total || 0);
    } catch (err: any) {
      console.error("Failed to load agents", err);
      const errorMessage = err?.response?.data?.error || err?.message || "Failed to load agents";
      setError(errorMessage);
      showToast("error", "Failed to Load Agents", errorMessage);
    } finally {
      setLoading(false);
    }
  }, [page, status, educationLevel, available, areasOfOperation, specializations, languages, debouncedQ]);

  useEffect(() => {
    authify();
    load();
  }, [load]);

  const getStatusColor = (agentStatus: string) => {
    switch (agentStatus) {
      case "ACTIVE":
        return "bg-green-100 text-green-700";
      case "INACTIVE":
        return "bg-gray-100 text-gray-700";
      case "SUSPENDED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (agentStatus: string) => {
    switch (agentStatus) {
      case "ACTIVE":
        return <CheckCircle className="h-4 w-4" />;
      case "INACTIVE":
        return <Clock className="h-4 w-4" />;
      case "SUSPENDED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  const closeAgentDetails = useCallback(() => {
    setViewingAgent(null);
    setAgentDetailsError(null);
    setLoadingAgentDetails(false);
  }, []);

  useEffect(() => {
    if (!viewingAgent) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAgentDetails();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [closeAgentDetails, viewingAgent]);


  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-[#02665e]/10 flex items-center justify-center">
              <UsersRound className="h-8 w-8 text-[#02665e]" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-2xl font-bold text-gray-900">Agents Management</h1>
              <p className="text-sm text-gray-500 text-center">Manage hired agents and their assignments</p>
            </div>
          </div>
          <Link
            href="/admin/management/careers?tab=applications"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#02665e] text-white rounded-xl text-sm font-semibold hover:bg-[#014d47] transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 no-underline"
            title="Hire agents via job applications"
          >
            <ExternalLink className="h-4 w-4" />
            Hire via Applications
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm overflow-hidden transition-all duration-300">
        <div className="flex items-center gap-2 mb-5">
          <Filter className="h-5 w-5 text-[#02665e] transition-transform duration-200" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        
        <div className="space-y-5 w-full">
          {/* Search Row */}
          <div className="relative w-full min-w-0 box-border">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none z-10 transition-colors duration-200" />
            <input
              type="text"
              placeholder="Search agents by name, email, phone..."
              value={q}
              onChange={(e) => {
                const value = e.target.value;
                if (value.length <= 200) {
                  setQ(value);
                }
              }}
              aria-label="Search agents by name, email, phone, or other details"
              title="Search agents"
              maxLength={200}
              className="w-full min-w-0 max-w-full pl-12 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm transition-all duration-200 bg-white hover:border-gray-300 focus:bg-white box-border placeholder:text-gray-400"
            />
            {q && (
              <button
                onClick={() => setQ("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div className="flex flex-col min-w-0">
              <label htmlFor="status-filter" className="text-xs font-semibold text-gray-700 mb-2">Status</label>
              <select
                id="status-filter"
                aria-label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 focus:bg-white transition-all duration-200 cursor-pointer box-border appearance-none"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            {/* Availability Filter */}
            <div className="flex flex-col min-w-0">
              <label htmlFor="availability-filter" className="text-xs font-semibold text-gray-700 mb-2">Availability</label>
              <select
                id="availability-filter"
                aria-label="Filter by availability"
                title="Filter by availability"
                value={available}
                onChange={(e) => setAvailable(e.target.value)}
                className="w-full min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 focus:bg-white transition-all duration-200 cursor-pointer box-border appearance-none"
              >
                <option value="">All Availability</option>
                <option value="true">Available</option>
                <option value="false">Not Available</option>
              </select>
            </div>

            {/* Education Level Filter */}
            <div className="flex flex-col min-w-0">
              <label htmlFor="education-filter" className="text-xs font-semibold text-gray-700 mb-2">Education</label>
              <select
                id="education-filter"
                aria-label="Education"
                value={educationLevel}
                onChange={(e) => setEducationLevel(e.target.value)}
                className="w-full min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 focus:bg-white transition-all duration-200 cursor-pointer box-border appearance-none"
              >
                <option value="">All Education Levels</option>
                <option value="HIGH_SCHOOL">High School</option>
                <option value="DIPLOMA">Diploma</option>
                <option value="BACHELORS">Bachelors</option>
                <option value="MASTERS">Masters</option>
                <option value="PHD">PhD</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Areas of Operation Filter */}
            <div className="flex flex-col min-w-0">
              <label className="text-xs font-semibold text-gray-700 mb-2">Area of Operation</label>
              <input
                type="text"
                placeholder="Filter by area..."
                value={areasOfOperation}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 100) {
                    setAreasOfOperation(value);
                  }
                }}
                aria-label="Filter by area of operation"
                title="Filter by area of operation"
                maxLength={100}
                className="w-full min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 focus:bg-white transition-all duration-200 box-border placeholder:text-gray-400"
              />
            </div>

            {/* Specializations Filter */}
            <div className="flex flex-col min-w-0">
              <label className="text-xs font-semibold text-gray-700 mb-2">Specialization</label>
              <input
                type="text"
                placeholder="Filter by specialization..."
                value={specializations}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 100) {
                    setSpecializations(value);
                  }
                }}
                aria-label="Filter by specialization"
                title="Filter by specialization"
                maxLength={100}
                className="w-full min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 focus:bg-white transition-all duration-200 box-border placeholder:text-gray-400"
              />
            </div>

            {/* Languages Filter */}
            <div className="flex flex-col min-w-0">
              <label className="text-xs font-semibold text-gray-700 mb-2">Language</label>
              <input
                type="text"
                placeholder="Filter by language..."
                value={languages}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length <= 50) {
                    setLanguages(value);
                  }
                }}
                aria-label="Filter by language"
                title="Filter by language"
                maxLength={50}
                className="w-full min-w-0 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 focus:bg-white transition-all duration-200 box-border placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {(status || educationLevel || available || areasOfOperation || specializations || languages || q) && (
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setStatus("");
                  setEducationLevel("");
                  setAvailable("");
                  setAreasOfOperation("");
                  setSpecializations("");
                  setLanguages("");
                  setQ("");
                }}
                aria-label="Clear all filters"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#02665e] hover:bg-[#02665e]/5 rounded-lg transition-all duration-200"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Agents List */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="text-center">
            <Loader2 className="h-6 w-6 text-[#02665e] animate-spin mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Loading agents...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-red-200 p-8 shadow-sm">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
            <p className="text-red-800 font-medium mb-2">Failed to load agents</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              aria-label="Retry loading agents"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
          <div className="text-center text-gray-500">
            {debouncedQ || status || educationLevel || available || areasOfOperation || specializations || languages
              ? "No agents found matching your filters"
              : "No agents found"}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Education</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Experience</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Areas of Operation</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Languages</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Workload</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {agents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-[#02665e]/10 flex items-center justify-center mr-3">
                          <User className="h-5 w-5 text-[#02665e]" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{agent.user.name || "N/A"}</div>
                          <div className="text-sm text-gray-500">{agent.user.email}</div>
                          {agent.user.phone && (
                            <div className="text-xs text-gray-400">{agent.user.phone}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <GraduationCap className="h-4 w-4 text-gray-400" />
                        {agent.educationLevel ? agent.educationLevel.replace("_", " ") : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Briefcase className="h-4 w-4 text-gray-400" />
                        {agent.yearsOfExperience ? `${agent.yearsOfExperience} years` : "N/A"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {agent.areasOfOperation && Array.isArray(agent.areasOfOperation) && agent.areasOfOperation.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {agent.areasOfOperation.slice(0, 2).map((area, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs">
                                <MapPin className="h-3 w-3" />
                                {area}
                              </span>
                            ))}
                            {agent.areasOfOperation.length > 2 && (
                              <span className="text-xs text-gray-500">+{agent.areasOfOperation.length - 2} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs">
                        {agent.languages && Array.isArray(agent.languages) && agent.languages.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {agent.languages.slice(0, 2).map((lang, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs">
                                <Languages className="h-3 w-3" />
                                {lang}
                              </span>
                            ))}
                            {agent.languages.length > 2 && (
                              <span className="text-xs text-gray-500">+{agent.languages.length - 2} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{agent.currentActiveRequests}</span>
                          <span className="text-gray-400">/</span>
                          <span>{agent.maxActiveRequests}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1 max-w-[100px]">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                agent.currentActiveRequests >= agent.maxActiveRequests
                                  ? "bg-red-500"
                                  : agent.currentActiveRequests >= agent.maxActiveRequests * 0.8
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                              }`}
                              style={{ width: `${Math.min(100, (agent.currentActiveRequests / agent.maxActiveRequests) * 100)}%` }}
                            />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(agent.status)}`}>
                        {getStatusIcon(agent.status)}
                        {agent.status}
                      </span>
                      {!agent.isAvailable && (
                        <div className="text-xs text-gray-500 mt-1">Not available</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={async () => {
                          if (!isValidAgentId(agent.id)) {
                            showToast("error", "Invalid Agent", "Invalid agent ID provided");
                            return;
                          }
                          setLoadingAgentDetails(true);
                          setAgentDetailsError(null);
                          try {
                            authify();
                            const response = await api.get<Agent>(`/api/admin/agents/${agent.id}`);
                            const payload = unwrapApiData<Agent>(response.data);
                            setViewingAgent(payload);
                          } catch (err: any) {
                            console.error("Failed to load agent details", err);
                            const errorMessage = err?.response?.data?.error || err?.message || "Failed to load agent details";
                            setAgentDetailsError(errorMessage);
                            showToast("error", "Failed to Load Agent", errorMessage);
                          } finally {
                            setLoadingAgentDetails(false);
                          }
                        }}
                        aria-label={`View details for agent ${agent.user.name || "Unknown"}`}
                        title="View agent details"
                        className="inline-flex items-center justify-center h-9 w-9 rounded-lg text-[#02665e] hover:text-[#014d47] hover:bg-[#02665e]/10 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} agents
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  aria-label="Go to previous page"
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(pages, page + 1))}
                  disabled={page === pages}
                  aria-label="Go to next page"
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Agent Detail Modal */}
      {viewingAgent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAgentDetails();
          }}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" aria-hidden />
          <div className="relative bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl ring-1 ring-black/5 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#02665e] to-[#024d47] px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-white/15 text-white flex items-center justify-center font-bold tracking-wide flex-shrink-0">
                  {initials(viewingAgent.user.name)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{viewingAgent.user.name || "Agent Details"}</h2>
                  <div className="text-sm text-white/80 truncate">{viewingAgent.user.email || "—"}</div>
                </div>
              </div>
              <button
                onClick={closeAgentDetails}
                aria-label="Close agent details"
                className="group p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X size={18} className="transition-transform duration-200 group-hover:rotate-90" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 min-w-0 min-h-0">
              {loadingAgentDetails ? (
                <div className="p-6 text-center">
                  <Loader2 className="h-6 w-6 text-[#02665e] animate-spin mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Loading agent details...</p>
                </div>
              ) : agentDetailsError ? (
                <div className="p-6 text-center bg-red-50">
                  <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-3" />
                  <p className="text-red-800 font-medium mb-2">Failed to load agent details</p>
                  <p className="text-red-600 text-sm mb-4">{agentDetailsError}</p>
                  <button
                    onClick={async () => {
                      if (viewingAgent && isValidAgentId(viewingAgent.id)) {
                        setLoadingAgentDetails(true);
                        setAgentDetailsError(null);
                        try {
                          authify();
                          const response = await api.get<Agent>(`/api/admin/agents/${viewingAgent.id}`);
                          const payload = unwrapApiData<Agent>(response.data);
                          setViewingAgent(payload);
                        } catch (err: any) {
                          console.error("Failed to load agent details", err);
                          const errorMessage = err?.response?.data?.error || err?.message || "Failed to load agent details";
                          setAgentDetailsError(errorMessage);
                          showToast("error", "Failed to Load Agent", errorMessage);
                        } finally {
                          setLoadingAgentDetails(false);
                        }
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                    aria-label="Retry loading agent details"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </button>
                </div>
              ) : (
              <div className="p-6 space-y-6">
                {/* Agent Information - Always Visible */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-5 w-5 text-[#02665e]" />
                    <h3 className="text-base font-semibold text-gray-900">Agent Information</h3>
                  </div>
                  <div className="space-y-4">
                    {/* Agent Name */}
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Name</label>
                      <p className="text-base font-semibold text-gray-900">{viewingAgent.user.name || "N/A"}</p>
                    </div>

                    {/* Location and Specialization Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Location */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Location
                        </label>
                        {viewingAgent.areasOfOperation && Array.isArray(viewingAgent.areasOfOperation) && viewingAgent.areasOfOperation.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {viewingAgent.areasOfOperation.slice(0, 3).map((area: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-200">
                                <MapPin className="h-3 w-3" />
                                {area}
                              </span>
                            ))}
                            {viewingAgent.areasOfOperation.length > 3 && (
                              <span className="text-xs text-gray-500 px-2.5 py-1">+{viewingAgent.areasOfOperation.length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">N/A</p>
                        )}
                      </div>

                      {/* Specialization */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          Specialization
                        </label>
                        {viewingAgent.specializations && Array.isArray(viewingAgent.specializations) && viewingAgent.specializations.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {viewingAgent.specializations.slice(0, 3).map((spec: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs font-medium border border-green-200">
                                <Briefcase className="h-3 w-3" />
                                {spec}
                              </span>
                            ))}
                            {viewingAgent.specializations.length > 3 && (
                              <span className="text-xs text-gray-500 px-2.5 py-1">+{viewingAgent.specializations.length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">N/A</p>
                        )}
                      </div>
                    </div>

                    {/* Status, Availability, Workload, Rating */}
                    <div className="grid grid-cols-2 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(viewingAgent.status)}`}>
                        {getStatusIcon(viewingAgent.status)}
                        <span>{viewingAgent.status}</span>
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Availability</label>
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${viewingAgent.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {viewingAgent.isAvailable ? 'Available' : 'Not Available'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Workload</label>
                      <p className="text-sm text-gray-900">
                        {viewingAgent.currentActiveRequests} / {viewingAgent.maxActiveRequests}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1 max-w-[200px]">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            viewingAgent.currentActiveRequests >= viewingAgent.maxActiveRequests
                              ? "bg-red-500"
                              : viewingAgent.currentActiveRequests >= viewingAgent.maxActiveRequests * 0.8
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(100, (viewingAgent.currentActiveRequests / viewingAgent.maxActiveRequests) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">
                        Rating
                        {viewingAgent.performanceMetrics?.totalReviews > 0 && (
                          <span className="text-gray-400 font-normal ml-1">
                            ({viewingAgent.performanceMetrics.totalReviews} {viewingAgent.performanceMetrics.totalReviews === 1 ? 'review' : 'reviews'})
                          </span>
                        )}
                      </label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Punctuality</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const rating = viewingAgent.performanceMetrics?.punctualityRating || 0;
                              const isFilled = rating >= star;
                              const isHalfFilled = rating >= star - 0.5 && rating < star;
                              return (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    isFilled
                                      ? "fill-yellow-400 text-yellow-400"
                                      : isHalfFilled
                                      ? "fill-yellow-200 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              );
                            })}
                            <span className="text-xs text-gray-500 ml-1">
                              {viewingAgent.performanceMetrics?.punctualityRating 
                                ? viewingAgent.performanceMetrics.punctualityRating.toFixed(1)
                                : '0.0'}/5
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Customer Care</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const rating = viewingAgent.performanceMetrics?.customerCareRating || 0;
                              const isFilled = rating >= star;
                              const isHalfFilled = rating >= star - 0.5 && rating < star;
                              return (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    isFilled
                                      ? "fill-yellow-400 text-yellow-400"
                                      : isHalfFilled
                                      ? "fill-yellow-200 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              );
                            })}
                            <span className="text-xs text-gray-500 ml-1">
                              {viewingAgent.performanceMetrics?.customerCareRating 
                                ? viewingAgent.performanceMetrics.customerCareRating.toFixed(1)
                                : '0.0'}/5
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Communication</span>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const rating = viewingAgent.performanceMetrics?.communicationRating || 0;
                              const isFilled = rating >= star;
                              const isHalfFilled = rating >= star - 0.5 && rating < star;
                              return (
                                <Star
                                  key={star}
                                  className={`h-3 w-3 ${
                                    isFilled
                                      ? "fill-yellow-400 text-yellow-400"
                                      : isHalfFilled
                                      ? "fill-yellow-200 text-yellow-400"
                                      : "text-gray-300"
                                  }`}
                                />
                              );
                            })}
                            <span className="text-xs text-gray-500 ml-1">
                              {viewingAgent.performanceMetrics?.communicationRating 
                                ? viewingAgent.performanceMetrics.communicationRating.toFixed(1)
                                : '0.0'}/5
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>

                {/* Promotion Progress */}
                {viewingAgent.promotionProgress && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="h-5 w-5 text-[#02665e]" />
                      <h3 className="text-base font-semibold text-gray-900">Promotion Progress</h3>
                      {viewingAgent.level && (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          viewingAgent.level === 'PLATINUM' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                          viewingAgent.level === 'GOLD' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                          viewingAgent.level === 'SILVER' ? 'bg-gray-100 text-gray-700 border border-gray-200' :
                          'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>
                          {viewingAgent.level}
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Overall Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Overall Progress to Next Level</span>
                          <span className="text-sm font-semibold text-[#02665e]">
                            {viewingAgent.promotionProgress.overallProgress}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-[#02665e] to-teal-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${viewingAgent.promotionProgress.overallProgress}%` }}
                          />
                        </div>
                      </div>

                      {/* Trips Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-[#02665e]" />
                            <span className="text-sm font-medium text-gray-700">Completed Events</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            {viewingAgent.promotionProgress.currentTrips} / {viewingAgent.promotionProgress.minTrips} - {viewingAgent.promotionProgress.maxTrips}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              viewingAgent.promotionProgress.tripsProgress >= 100
                                ? 'bg-green-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(100, viewingAgent.promotionProgress.tripsProgress)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {viewingAgent.promotionProgress.currentTrips >= viewingAgent.promotionProgress.minTrips
                            ? '✓ Event requirement met'
                            : `${viewingAgent.promotionProgress.minTrips - viewingAgent.promotionProgress.currentTrips} more events needed`
                          }
                        </p>
                      </div>

                      {/* Revenue Progress */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-[#02665e]" />
                            <span className="text-sm font-medium text-gray-700">Revenue Generated</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            TZS {Number(viewingAgent.promotionProgress.currentRevenue).toLocaleString()} / {viewingAgent.promotionProgress.minRevenue.toLocaleString()}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              viewingAgent.promotionProgress.revenueProgress >= 100
                                ? 'bg-green-500'
                                : 'bg-orange-500'
                            }`}
                            style={{ width: `${Math.min(100, viewingAgent.promotionProgress.revenueProgress)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {viewingAgent.promotionProgress.currentRevenue >= viewingAgent.promotionProgress.minRevenue
                            ? '✓ Revenue requirement met'
                            : `TZS ${(viewingAgent.promotionProgress.minRevenue - viewingAgent.promotionProgress.currentRevenue).toLocaleString()} more needed`
                          }
                        </p>
                      </div>

                      {/* Promotion Eligibility */}
                      {viewingAgent.promotionProgress.eligibleForPromotion && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="text-sm font-semibold text-green-800">Eligible for Promotion!</p>
                              <p className="text-xs text-green-700 mt-1">
                                This agent has met all requirements for promotion to the next level.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Personal Details & Education - Collapsible */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setPersonalDetailsOpen(!personalDetailsOpen)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-[#02665e]" />
                      <h3 className="text-sm font-semibold text-gray-900">Personal Details & Education</h3>
                    </div>
                    {personalDetailsOpen ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  {personalDetailsOpen && (
                    <div className="px-5 pb-5 space-y-5 border-t border-gray-200">
                      {/* Personal Information */}
                      <div className="pt-5">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name</label>
                            <p className="text-sm font-medium text-gray-900">{viewingAgent.user.name || "N/A"}</p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                            <p className="text-sm text-gray-900 flex items-center gap-1.5">
                              <Mail className="h-3 w-3 text-gray-400" />
                              {viewingAgent.user.email || "N/A"}
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone</label>
                            <p className="text-sm text-gray-900 flex items-center gap-1.5">
                              <Phone className="h-3 w-3 text-gray-400" />
                              {viewingAgent.user.phone || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Education & Experience */}
                      {(viewingAgent.educationLevel || viewingAgent.yearsOfExperience) && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <GraduationCap className="h-4 w-4 text-[#02665e]" />
                            Education & Experience
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {viewingAgent.educationLevel && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Education Level</label>
                                <p className="text-sm text-gray-900">{viewingAgent.educationLevel.replace('_', ' ')}</p>
                              </div>
                            )}
                            {viewingAgent.yearsOfExperience !== null && viewingAgent.yearsOfExperience !== undefined && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1.5">Years of Experience</label>
                                <p className="text-sm text-gray-900">{viewingAgent.yearsOfExperience} {viewingAgent.yearsOfExperience === 1 ? 'year' : 'years'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bio */}
                      {viewingAgent.bio && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">Bio</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md p-3 border border-gray-100">{viewingAgent.bio}</p>
                        </div>
                      )}

                      {/* Areas of Operation */}
                      {viewingAgent.areasOfOperation && Array.isArray(viewingAgent.areasOfOperation) && viewingAgent.areasOfOperation.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#02665e]" />
                            Areas of Operation
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {viewingAgent.areasOfOperation.map((area: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-200">
                                <MapPin className="h-3 w-3" />
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages */}
                      {viewingAgent.languages && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Languages className="h-4 w-4 text-[#02665e]" />
                            Languages
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(viewingAgent.languages) ? (
                              viewingAgent.languages.map((lang: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm border border-purple-200">
                                  <Languages className="h-3 w-3" />
                                  {lang}
                                </span>
                              ))
                            ) : typeof viewingAgent.languages === 'string' ? (
                              viewingAgent.languages.split(',').map((lang: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm border border-purple-200">
                                  <Languages className="h-3 w-3" />
                                  {lang.trim()}
                                </span>
                              ))
                            ) : null}
                          </div>
                        </div>
                      )}

                      {/* Specializations */}
                      {viewingAgent.specializations && Array.isArray(viewingAgent.specializations) && viewingAgent.specializations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-[#02665e]" />
                            Specializations
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {viewingAgent.specializations.map((spec: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                                <Briefcase className="h-3 w-3" />
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Certifications */}
                      {viewingAgent.certifications && Array.isArray(viewingAgent.certifications) && viewingAgent.certifications.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Award className="h-4 w-4 text-[#02665e]" />
                            Certifications
                          </h4>
                          <div className="space-y-2">
                            {viewingAgent.certifications.map((cert: any, idx: number) => (
                              <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="font-medium text-amber-900">{cert.name}</div>
                                <div className="text-sm text-amber-700">
                                  {cert.issuer} • {cert.year}
                                  {cert.expiryDate && ` • Expires: ${cert.expiryDate}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Track Tasks */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Briefcase className="h-5 w-5 text-[#02665e]" />
                    <h3 className="text-base font-semibold text-gray-900">Track Tasks</h3>
                    {viewingAgent.assignedPlanRequests && viewingAgent.assignedPlanRequests.length > 0 && (
                      <span className="px-2 py-0.5 bg-[#02665e]/10 text-[#02665e] text-xs font-semibold rounded-full">
                        {viewingAgent.assignedPlanRequests.length} {viewingAgent.assignedPlanRequests.length === 1 ? 'task' : 'tasks'}
                      </span>
                    )}
                  </div>
                  {viewingAgent.assignedPlanRequests && viewingAgent.assignedPlanRequests.length > 0 ? (
                    <div className="space-y-4">
                      {viewingAgent.assignedPlanRequests.map((task: any) => {
                        const assignedDate = new Date(task.createdAt);
                        const completedDate = task.updatedAt ? new Date(task.updatedAt) : null;
                        const isCompleted = task.status === 'COMPLETED' || task.status === 'CLOSED';
                        
                        return (
                          <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="text-sm font-semibold text-gray-900">{task.role || 'Task'}</h4>
                                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                                    task.status === 'COMPLETED' || task.status === 'CLOSED' 
                                      ? 'bg-green-100 text-green-700'
                                      : task.status === 'IN_PROGRESS' || task.status === 'PENDING'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}>
                                    {task.status}
                                  </span>
                                </div>
                                {task.tripType && (
                                  <p className="text-xs text-gray-600 mb-1">Trip Type: {task.tripType}</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              {/* Client Information */}
                              <div className="space-y-2">
                                <h5 className="text-xs font-semibold text-gray-700">Client Information</h5>
                                {task.fullName && (
                                  <p className="text-xs text-gray-600">Name: {task.fullName}</p>
                                )}
                                {task.email && (
                                  <p className="text-xs text-gray-600 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {task.email}
                                  </p>
                                )}
                                {task.phone && (
                                  <p className="text-xs text-gray-600 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {task.phone}
                                  </p>
                                )}
                              </div>

                              {/* Task Details */}
                              <div className="space-y-2">
                                <h5 className="text-xs font-semibold text-gray-700">Task Details</h5>
                                {task.dateFrom && task.dateTo && (
                                  <p className="text-xs text-gray-600 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(task.dateFrom).toLocaleDateString()} - {new Date(task.dateTo).toLocaleDateString()}
                                  </p>
                                )}
                                {task.groupSize && (
                                  <p className="text-xs text-gray-600">Group Size: {task.groupSize} {task.groupSize === 1 ? 'person' : 'people'}</p>
                                )}
                                {task.budget && (
                                  <p className="text-xs text-gray-600 flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    Budget: {typeof task.budget === 'number' ? `$${task.budget.toLocaleString()}` : task.budget}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Task Description */}
                            {task.notes && (
                              <div className="mb-3">
                                <h5 className="text-xs font-semibold text-gray-700 mb-1">Task Description</h5>
                                <p className="text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-100">
                                  {task.notes.length > 200 ? `${task.notes.substring(0, 200)}...` : task.notes}
                                </p>
                              </div>
                            )}

                            {/* Admin Response / Recommendations */}
                            {task.adminResponse && (
                              <div className="mb-3">
                                <h5 className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                  Admin Recommendations
                                </h5>
                                <p className="text-xs text-gray-600 bg-green-50 rounded p-2 border border-green-100">
                                  {task.adminResponse.length > 200 ? `${task.adminResponse.substring(0, 200)}...` : task.adminResponse}
                                </p>
                              </div>
                            )}

                            {/* Timeline */}
                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>Assigned: {assignedDate.toLocaleDateString()}</span>
                                </div>
                                {completedDate && isCompleted && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                    <span>Completed: {completedDate.toLocaleDateString()}</span>
                                  </div>
                                )}
                              </div>
                              {task.destinations && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <MapPin className="h-3 w-3" />
                                  <span>{task.destinations}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">No tasks assigned yet</p>
                    </div>
                  )}
                </div>
              </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-white px-6 py-4 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setViewingAgent(null);
                  setAgentDetailsError(null);
                }}
                aria-label="Close agent details"
                className="px-6 py-2.5 bg-[#02665e] text-white rounded-lg font-medium hover:bg-[#024d47] hover:shadow-md transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 text-sm"
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

