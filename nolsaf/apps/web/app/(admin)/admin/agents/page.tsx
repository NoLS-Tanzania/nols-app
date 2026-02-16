"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, User, CheckCircle, XCircle, Clock, Eye, Filter, GraduationCap, MapPin, Award, Languages, Briefcase, UsersRound, ChevronDown, Calendar, DollarSign, Star, CheckCircle2, Mail, Phone, TrendingUp, Target, Trophy, Loader2, AlertCircle, RefreshCw, ExternalLink, FileX, Check, Undo2 } from "lucide-react";
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

function isProbablyPdf(url: string): boolean {
  return /\.pdf($|\?)/i.test(url);
}

function isProbablyImage(url: string): boolean {
  return /\.(png|jpg|jpeg|webp|gif)($|\?)/i.test(url);
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  return [];
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
    fullName?: string | null;
    email: string | null;
    phone: string | null;
    nationality?: string | null;
    region?: string | null;
    district?: string | null;
    timezone?: string | null;
    avatarUrl?: string | null;
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

type AgentDocument = {
  id: number;
  userId: number;
  type: string | null;
  status: string;
  reason?: string | null;
  url?: string | null;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
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

  const [agentDocuments, setAgentDocuments] = useState<AgentDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [docActionLoadingId, setDocActionLoadingId] = useState<number | null>(null);
  const docsRef = useRef<HTMLDivElement | null>(null);

  const [docPreview, setDocPreview] = useState<{ open: boolean; url: string; title: string }>({
    open: false,
    url: "",
    title: "",
  });

  const [taskView, setTaskView] = useState<"IN_PROGRESS" | "COMPLETED">("IN_PROGRESS");

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
    const tasks = viewingAgent?.assignedPlanRequests || [];
    const completed = tasks.filter((t: any) => t?.status === "COMPLETED" || t?.status === "CLOSED");
    const inProgress = tasks.filter((t: any) => !(t?.status === "COMPLETED" || t?.status === "CLOSED"));
    setTaskView(inProgress.length > 0 ? "IN_PROGRESS" : completed.length > 0 ? "COMPLETED" : "IN_PROGRESS");
  }, [viewingAgent?.id, viewingAgent?.assignedPlanRequests]);

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

  const requiredDocTypes = useRef([
    { type: "ACADEMIC_CERTIFICATES", label: "Academic certificates" },
    { type: "NDA", label: "Signed NDA" },
    { type: "NATIONAL_ID_OR_PASSPORT", label: "National ID / Travel Passport" },
  ] as const);

  const getLatestDocByType = useCallback((docs: AgentDocument[], type: string) => {
    const upper = String(type || "").toUpperCase();
    return docs.find((d) => String(d.type || "").toUpperCase() === upper) || null;
  }, []);

  const loadDocuments = useCallback(async (agentId: number) => {
    if (!isValidAgentId(agentId)) return;
    setDocsLoading(true);
    setDocsError(null);
    try {
      authify();
      const resp = await api.get(`/api/admin/agents/${agentId}/documents`);
      const payload = unwrapApiData<{ documents: AgentDocument[] }>(resp.data);
      const docs = Array.isArray(payload?.documents) ? payload.documents : [];
      // Ensure newest-first ordering (API already does this)
      setAgentDocuments(docs);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || "Failed to load agent documents";
      setDocsError(msg);
      setAgentDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!viewingAgent || !isValidAgentId(viewingAgent.id)) {
      setAgentDocuments([]);
      setDocsError(null);
      setDocsLoading(false);
      return;
    }
    void loadDocuments(viewingAgent.id);
  }, [loadDocuments, viewingAgent]);

  const updateDocumentStatus = useCallback(
    async (agentId: number, docId: number, status: "APPROVED" | "REJECTED", reason?: string) => {
      if (!isValidAgentId(agentId) || !Number.isInteger(docId) || docId <= 0) return;
      setDocActionLoadingId(docId);
      try {
        authify();
        const resp = await api.patch(`/api/admin/agents/${agentId}/documents/${docId}`, {
          status,
          reason: status === "REJECTED" ? String(reason || "").trim() : null,
        });
        const payload = unwrapApiData<{ doc: AgentDocument }>(resp.data);
        const updated = payload?.doc;
        if (updated) {
          setAgentDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        } else {
          // Fallback: reload
          await loadDocuments(agentId);
        }
        showToast("success", "Document updated", status === "APPROVED" ? "Approved" : "Rejected");
      } catch (err: any) {
        const msg = err?.response?.data?.error || err?.message || "Failed to update document";
        showToast("error", "Update failed", msg);
      } finally {
        setDocActionLoadingId(null);
      }
    },
    [loadDocuments],
  );


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
                    <button
                      type="button"
                      onClick={() => docsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="ml-auto inline-flex items-center justify-center rounded-md p-2 text-[#02665e] hover:text-[#014d47] hover:bg-[#02665e]/10"
                      aria-label="Review documents"
                      title="Review submitted documents"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
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

                {/* Agent Documents */}
                <div ref={docsRef} className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-[#02665e]" />
                      <h3 className="text-base font-semibold text-gray-900">Agent Documents</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => viewingAgent?.id && loadDocuments(viewingAgent.id)}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-50"
                      aria-label="Reload agent documents"
                      title="Reload"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>

                  {docsLoading ? (
                    <div className="py-6 text-center text-sm text-gray-500">
                      <Loader2 className="h-5 w-5 text-[#02665e] animate-spin mx-auto mb-2" />
                      Loading documents...
                    </div>
                  ) : docsError ? (
                    <div className="py-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4">
                      {docsError}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {requiredDocTypes.current.map((reqDoc) => {
                        const latest = getLatestDocByType(agentDocuments, reqDoc.type);
                        const status = String(latest?.status || "NOT_UPLOADED").toUpperCase();
                        const _isPending = status === "PENDING";
                        const isApproved = status === "APPROVED";
                        const isRejected = status === "REJECTED";
                        const canPreview = Boolean(latest?.url);
                        const isNotUploaded = !latest?.url;

                        return (
                          <div key={reqDoc.type} className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm h-full flex flex-col">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900">{reqDoc.label}</div>
                              <div className="text-xs text-gray-500 mt-1">
                                Type: <span className="font-mono">{reqDoc.type}</span>
                              </div>

                              {isRejected && latest?.reason ? (
                                <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                                  Rejection reason: {latest.reason}
                                </div>
                              ) : null}
                            </div>

                            <div className="mt-4 flex items-center justify-end gap-2">
                              {/* NOT UPLOADED icon only */}
                              {isNotUploaded ? (
                                <span
                                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
                                  title="Not uploaded"
                                  aria-label={`${reqDoc.label} not uploaded`}
                                >
                                  <FileX className="h-4.5 w-4.5" />
                                </span>
                              ) : null}

                              {/* Uploaded: Eye (preview popup) */}
                              {canPreview ? (
                                <button
                                  type="button"
                                  disabled={docActionLoadingId === latest?.id}
                                  onClick={() => {
                                    if (!latest?.url) return;
                                    setDocPreview({ open: true, url: latest.url, title: reqDoc.label });
                                  }}
                                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label={`Preview ${reqDoc.label}`}
                                  title="Preview"
                                >
                                  <Eye className="h-4.5 w-4.5" />
                                </button>
                              ) : null}

                              {/* Pending/Rejected: Approve + Reject */}
                              {canPreview && !isApproved ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={!latest?.id || docActionLoadingId === latest.id}
                                    onClick={() => {
                                      if (!viewingAgent?.id || !latest?.id) return;
                                      void updateDocumentStatus(viewingAgent.id, latest.id, "APPROVED");
                                    }}
                                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[#02665e] text-white hover:bg-[#014d47] disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label={`Approve ${reqDoc.label}`}
                                    title="Approve"
                                  >
                                    <Check className="h-4.5 w-4.5" />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={!latest?.id || docActionLoadingId === latest.id}
                                    onClick={() => {
                                      if (!viewingAgent?.id || !latest?.id) return;
                                      void updateDocumentStatus(viewingAgent.id, latest.id, "REJECTED", "");
                                    }}
                                    className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label={`Reject ${reqDoc.label}`}
                                    title="Reject"
                                  >
                                    <X className="h-4.5 w-4.5" />
                                  </button>
                                </>
                              ) : null}

                              {/* Approved: Eye + Unapprove */}
                              {canPreview && isApproved ? (
                                <button
                                  type="button"
                                  disabled={!latest?.id || docActionLoadingId === latest.id}
                                  onClick={() => {
                                    if (!viewingAgent?.id || !latest?.id) return;
                                    const ok = window.confirm("Unapprove this document? It will be marked as rejected.");
                                    if (!ok) return;
                                    void updateDocumentStatus(viewingAgent.id, latest.id, "REJECTED", "");
                                  }}
                                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                  aria-label={`Unapprove ${reqDoc.label}`}
                                  title="Unapprove"
                                >
                                  <Undo2 className="h-4.5 w-4.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-4 text-xs text-gray-500">
                    Approving/rejecting is authenticated and stored server-side. When the agent re-uploads a document, it returns to <span className="font-semibold">PENDING</span> automatically.
                  </div>
                </div>

                {/* Document Preview Popup */}
                {docPreview.open ? (
                  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Document preview">
                    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                      <div className="flex items-center justify-between gap-3 p-4 border-b border-gray-200">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{docPreview.title}</div>
                          <div className="text-xs text-gray-500 truncate">Preview</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={docPreview.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                            title="Open in new tab"
                            aria-label="Open in new tab"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => setDocPreview({ open: false, url: "", title: "" })}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                            aria-label="Close preview"
                            title="Close"
                          >
                            <X className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>

                      <div className="h-[75vh] bg-gray-50">
                        {isProbablyImage(docPreview.url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={docPreview.url} alt="Document preview" className="h-full w-full object-contain" />
                        ) : (
                          <iframe
                            title="Document preview"
                            src={docPreview.url}
                            className="h-full w-full"
                          />
                        )}
                        {isProbablyPdf(docPreview.url) ? null : null}
                      </div>
                    </div>
                  </div>
                ) : null}

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
                    type="button"
                    onClick={() => setPersonalDetailsOpen(!personalDetailsOpen)}
                    className="group w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-gray-50 to-white hover:from-white hover:to-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30"
                    aria-expanded={personalDetailsOpen}
                    aria-controls="personal-details-panel"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-[#02665e]/10 text-[#02665e] border border-[#02665e]/15 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate">Personal Details & Education</h3>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                        personalDetailsOpen ? "rotate-180" : "rotate-0"
                      }`}
                    />
                  </button>
                  {personalDetailsOpen && (
                    <div id="personal-details-panel" className="px-5 pb-5 space-y-5 border-t border-gray-200">
                      {/* Personal Information */}
                      <div className="pt-5">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Personal Information</h4>

                        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-12 w-12 rounded-full border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0 ring-2 ring-white">
                                {viewingAgent.user.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={viewingAgent.user.avatarUrl} alt="Profile photo" className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-sm font-bold text-gray-600">{initials(viewingAgent.user.fullName || viewingAgent.user.name)}</span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-gray-900 truncate">{viewingAgent.user.fullName || viewingAgent.user.name || "N/A"}</div>
                                <div className="text-xs text-gray-500 truncate">{viewingAgent.user.email || ""}</div>
                              </div>
                            </div>
                            <div className="shrink-0">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[#02665e]/10 text-[#02665e] border border-[#02665e]/15">
                                User #{viewingAgent.user.id}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <label className="block text-[11px] font-semibold text-gray-500 tracking-wide uppercase">Full Name</label>
                              <p className="text-sm font-semibold text-gray-900 mt-1">{viewingAgent.user.fullName || viewingAgent.user.name || "N/A"}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <label className="block text-[11px] font-semibold text-gray-500 tracking-wide uppercase">Email</label>
                              <p className="text-sm text-gray-900 mt-1 flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-gray-400" />
                                <span className="truncate">{viewingAgent.user.email || "N/A"}</span>
                              </p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <label className="block text-[11px] font-semibold text-gray-500 tracking-wide uppercase">Phone</label>
                              <p className="text-sm text-gray-900 mt-1 flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                <span className="truncate">{viewingAgent.user.phone || "N/A"}</span>
                              </p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <label className="block text-[11px] font-semibold text-gray-500 tracking-wide uppercase">Nationality</label>
                              <p className="text-sm text-gray-900 mt-1">{viewingAgent.user.nationality || "N/A"}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <label className="block text-[11px] font-semibold text-gray-500 tracking-wide uppercase">Region</label>
                              <p className="text-sm text-gray-900 mt-1">{viewingAgent.user.region || "N/A"}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <label className="block text-[11px] font-semibold text-gray-500 tracking-wide uppercase">District</label>
                              <p className="text-sm text-gray-900 mt-1">{viewingAgent.user.district || "N/A"}</p>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              <label className="block text-[11px] font-semibold text-gray-500 tracking-wide uppercase">Timezone</label>
                              <p className="text-sm text-gray-900 mt-1">{viewingAgent.user.timezone || "N/A"}</p>
                            </div>
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

                      {/* Areas of Operation / Languages / Specializations (3-column row) */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-[#02665e]" />
                            Areas of Operation
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(viewingAgent.areasOfOperation) && viewingAgent.areasOfOperation.length > 0 ? (
                              viewingAgent.areasOfOperation.map((area: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-200">
                                  <MapPin className="h-3 w-3" />
                                  {area}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Languages className="h-4 w-4 text-[#02665e]" />
                            Languages
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {normalizeStringArray(viewingAgent.languages).length > 0 ? (
                              normalizeStringArray(viewingAgent.languages).map((lang: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm border border-purple-200">
                                  <Languages className="h-3 w-3" />
                                  {lang}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-[#02665e]" />
                            Specializations
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(viewingAgent.specializations) && viewingAgent.specializations.length > 0 ? (
                              viewingAgent.specializations.map((spec: string, idx: number) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                                  <Briefcase className="h-3 w-3" />
                                  {spec}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            )}
                          </div>
                        </div>
                      </div>

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
                  {(() => {
                    const allTasks = viewingAgent.assignedPlanRequests || [];
                    const completedTasks = allTasks.filter((t: any) => t?.status === "COMPLETED" || t?.status === "CLOSED");
                    const inProgressTasks = allTasks.filter((t: any) => !(t?.status === "COMPLETED" || t?.status === "CLOSED"));
                    const visibleTasks = taskView === "COMPLETED" ? completedTasks : inProgressTasks;

                    return (
                      <>
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <Briefcase className="h-5 w-5 text-[#02665e]" />
                            <h3 className="text-base font-semibold text-gray-900">Track Tasks</h3>
                            {allTasks.length > 0 ? (
                              <span className="px-2 py-0.5 bg-[#02665e]/10 text-[#02665e] text-xs font-semibold rounded-full">
                                {allTasks.length} {allTasks.length === 1 ? "task" : "tasks"}
                              </span>
                            ) : null}
                          </div>

                          {allTasks.length > 0 ? (
                            <div className="inline-flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1">
                              <button
                                type="button"
                                onClick={() => setTaskView("IN_PROGRESS")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  taskView === "IN_PROGRESS" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                                }`}
                                aria-pressed={taskView === "IN_PROGRESS"}
                              >
                                In progress
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                                  {inProgressTasks.length}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setTaskView("COMPLETED")}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                  taskView === "COMPLETED" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
                                }`}
                                aria-pressed={taskView === "COMPLETED"}
                              >
                                Completed
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                  {completedTasks.length}
                                </span>
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {visibleTasks.length > 0 ? (
                          <div className="space-y-4">
                            {visibleTasks.map((task: any) => {
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
                        ) : allTasks.length > 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">{taskView === "COMPLETED" ? "No completed tasks yet" : "No in-progress tasks right now"}</p>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-sm">No tasks assigned yet</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
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

