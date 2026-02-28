"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, Calendar, MapPin, Clock, User, BarChart3, TrendingUp, Loader2, FileText, AlertTriangle, Edit, Send, Eye, MessageSquare, ChevronDown, Star, Building2, Utensils, Car, Target, Ticket, Plane, Users, Gift, Mail, Printer } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
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

type ConversationMessage = {
  type: string;
  message: string;
  timestamp: Date;
  formattedDate: string;
  sender: 'user' | 'admin';
};

function ConversationHistoryDisplay({ requestId }: { requestId: number }) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/api/admin/plan-with-us/requests/${requestId}/messages`);
        if (response.data.success && response.data.messages) {
          const formattedMessages: ConversationMessage[] = response.data.messages.map((m: any) => ({
            type: m.messageType || (m.senderRole === 'ADMIN' ? 'Admin Response' : 'General'),
            message: m.message,
            timestamp: new Date(m.createdAt),
            formattedDate: new Date(m.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            sender: m.senderRole === 'ADMIN' ? 'admin' : 'user',
          }));
          setMessages(formattedMessages);
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (requestId) {
      loadMessages();
    }
  }, [requestId]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (messages.length === 0) return null;
  
  return (
    <div className="space-y-3 max-h-[300px] overflow-y-auto">
      {messages.map((msg, index) => (
        <div
          key={index}
          className={`flex ${msg.sender === 'user' ? 'justify-start' : 'justify-end'}`}
        >
          <div className={`flex flex-col ${msg.sender === 'user' ? 'items-start max-w-[80%] sm:max-w-[70%]' : 'items-end max-w-[80%] sm:max-w-[70%]'}`}>
            <div className={`flex items-center gap-2 mb-1.5 ${msg.sender === 'user' ? '' : 'flex-row-reverse'}`}>
              {msg.sender === 'user' && (
                <span className="text-[10px] font-medium text-[#02665e] px-2 py-0.5 rounded-md bg-[#02665e]/10">
                  {msg.type}
                </span>
              )}
              {msg.sender === 'admin' && (
                <span className="text-[10px] font-medium text-blue-700 px-2 py-0.5 rounded-md bg-blue-100">
                  Admin
                </span>
              )}
              <span className="text-[10px] text-slate-400">{msg.formattedDate}</span>
            </div>
            <div
              className={`rounded-xl px-3 py-2 shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-[#02665e] text-white rounded-tl-sm'
                  : 'bg-blue-50 border border-blue-100 text-slate-800 rounded-tr-sm'
              }`}
            >
              <p className={`text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${msg.sender === 'user' ? 'text-white' : 'text-slate-700'}`}>
                {msg.message}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

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
  assignedAgentId?: number | null;
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
  const searchParams = useSearchParams();
  
  // Initialize state from URL params if present
  const [role, setRole] = useState<string>("");
  const [tripType, setTripType] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [date, setDate] = useState<string | string[]>("");
  const [q, setQ] = useState("");

  // Initialize from URL params on mount - clear filters if no params in URL
  useEffect(() => {
    if (searchParams) {
      const urlRole = searchParams.get("role");
      const urlTripType = searchParams.get("tripType");
      const urlStatus = searchParams.get("status");
      const urlDate = searchParams.get("date");
      const urlQ = searchParams.get("q");
      
      // Set or clear filters based on URL params
      setRole(urlRole || "");
      setTripType(urlTripType || "");
      setStatus(urlStatus || "");
      setDate(urlDate || "");
      setQ(urlQ || "");
    }
  }, [searchParams]);
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
    assignedAgentId: null as number | null,
    adminResponse: "",
  });
  const [quickMessage, setQuickMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [assignmentSaving, setAssignmentSaving] = useState(false);
  
  // Agent selection state
  const [agents, setAgents] = useState<any[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  // ── Structured feedback builder state ──────────────────────────────────────
  type ItineraryOption = {
    id: string; name: string; days: number; pricePerPerson: string;
    inclusions: string[]; customInclusion: string; dayOutline: string;
    autoFilled?: boolean;
    priceMode: "trip" | "night";
    inclusionDetails: Record<string, string>;
    feeAmounts: Record<string, string>; // per selected fee-item → TZS amount per person
    linkedProperties: Array<{ id: number; title: string; type: string | null; regionName?: string | null }>;
  };
  const [itineraryOptions, setItineraryOptions] = useState<ItineraryOption[]>([]);
  const [activeSections, setActiveSections] = useState<Set<string>>(
    new Set(["itinerary", "permits", "timeline", "agent"])
  );
  const [selectedPermits, setSelectedPermits] = useState<string[]>([]);
  const [tripSpecificNotes, setTripSpecificNotes] = useState("");
  // Property search state for linking approved listings to accommodation
  const [propSearch, setPropSearch] = useState<{
    optId: string;
    query: string;
    results: Array<{ id: number; title: string; type: string | null; regionName?: string | null }>;
    loading: boolean;
  } | null>(null);
  // ───────────────────────────────────────────────────────────────────────────

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
    }
    
    if (showAgentDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showAgentDropdown]);

  async function load() {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };
      // Only include filters if they have values (not empty strings)
      if (role && role.trim()) params.role = role.trim();
      if (tripType && tripType.trim()) params.tripType = tripType.trim();
      if (status && status.trim()) params.status = status.trim();
      if (date) {
        if (Array.isArray(date) && date.length > 0) {
          if (date[0]) params.start = date[0];
          if (date[1]) params.end = date[1];
        } else if (date && !Array.isArray(date)) {
          params.date = date;
        }
      }
      if (q && q.trim()) params.q = q.trim();

      console.log('Loading plan requests with params:', params);
      const r = await api.get<{ items: PlanRequestRow[]; total: number }>("/api/admin/plan-with-us/requests", { params });
      console.log('Plan requests response:', { 
        itemsCount: Array.isArray(r.data?.items) ? r.data.items.length : 0, 
        total: r.data?.total || 0, 
        items: r.data?.items,
        fullResponse: r.data
      });
      setList(Array.isArray(r.data?.items) ? r.data.items : []);
      setTotal(r.data?.total ?? 0);
    } catch (err: any) {
      console.error("Failed to load plan requests", err);
      console.error("Error details:", err?.response?.data || err?.message);
      // Show error to user
      if (err?.response?.data?.error) {
        alert(`Error loading requests: ${err.response.data.error}`);
      }
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const r = await api.get<PlanRequestStats>("/api/admin/plan-with-us/requests/stats", {
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

  // Load data when filters change
  useEffect(() => {
    authify();
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, role, tripType, status, date, q]);

  useEffect(() => {
    authify();
    loadStats();
  }, [loadStats]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  // Load agents for selection
  const loadAgents = async (searchQuery: string = "") => {
    setAgentsLoading(true);
    try {
      const params: any = {
        page: 1,
        pageSize: 50,
        status: "ACTIVE",
        available: "true",
      };
      if (searchQuery && searchQuery.trim()) {
        params.q = searchQuery.trim();
      }
      const response = await api.get("/api/admin/agents", { params });
      const body = response.data as any;
      const items = body?.data?.items ?? body?.items ?? [];
      setAgents(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Failed to load agents", err);
      setAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  };

  const handleSaveAssignment = async () => {
    if (!selectedRequest) return;
    if (!responseForm.assignedAgentId) {
      alert("Please select an agent first.");
      return;
    }

    setAssignmentSaving(true);
    try {
      const selectedAgent = agents.find((a) => Number(a?.id) === Number(responseForm.assignedAgentId));

      const submitData: any = {
        assignedAgentId: responseForm.assignedAgentId,
        assignedAgent: selectedAgent?.user?.name || responseForm.assignedAgent || "",
      };

      // Nice default: when assigning an agent to a pending request, mark it in-progress.
      if (String(selectedRequest.status || "").toUpperCase() === "PENDING") {
        submitData.status = "IN_PROGRESS";
      }

      await api.patch(`/api/admin/plan-with-us/requests/${selectedRequest.id}`, submitData);

      // Refresh list + selected request details
      await load();
      const refreshed = await api.get(`/api/admin/plan-with-us/requests/${selectedRequest.id}`);
      setSelectedRequest(refreshed.data);
      setResponseForm((prev) => ({
        ...prev,
        assignedAgent: refreshed.data?.assignedAgent || prev.assignedAgent,
        assignedAgentId: refreshed.data?.assignedAgentId ?? prev.assignedAgentId,
      }));

      window.dispatchEvent(
        new CustomEvent("nols:toast", {
          detail: { type: "success", title: "Agent Assigned", message: "Agent assignment saved successfully.", duration: 3000 },
        })
      );
    } catch (err) {
      console.error("Failed to save assignment", err);
      alert("Failed to save assignment. Please try again.");
    } finally {
      setAssignmentSaving(false);
    }
  };

  // Handle opening response modal
  const handleOpenResponse = async (request: PlanRequestRow) => {
    // Load agents when opening modal
    await loadAgents();
    
    // Fetch the full request details to get updated notes
    try {
      const response = await api.get(`/api/admin/plan-with-us/requests/${request.id}`);
      setSelectedRequest(response.data);
      setResponseForm({
        suggestedItineraries: response.data.suggestedItineraries || "",
        requiredPermits: response.data.requiredPermits || "",
        estimatedTimeline: response.data.estimatedTimeline || "",
        assignedAgent: response.data.assignedAgent || "",
        assignedAgentId: response.data.assignedAgentId || null,
        adminResponse: response.data.adminResponse || "",
      });
      setQuickMessage("");
      // Auto-populate itinerary options from the guest's requested destinations
      if (response.data.destinations) {
        const parsed = parseDestinationsForItinerary(response.data.destinations);
        setItineraryOptions(parsed.map((d, i) => ({
          id: `dest-${Date.now()}-${i}`,
          name: d.name,
          days: d.nights,
          pricePerPerson: "",
          inclusions: [],
          customInclusion: "",
          dayOutline: "",
          autoFilled: true,
          priceMode: "trip" as const,
          inclusionDetails: {},
          feeAmounts: {},
          linkedProperties: [],
        })));
      } else {
        setItineraryOptions([]);
      }
      setSelectedPermits([]);
      setTripSpecificNotes("");
      setActiveSections(new Set(["itinerary", "permits", "timeline", "agent"]));
    } catch (err) {
      console.error("Failed to load request details", err);
      // Fallback to the request from the list
      setSelectedRequest(request);
      setResponseForm({
        suggestedItineraries: request.suggestedItineraries || "",
        requiredPermits: request.requiredPermits || "",
        estimatedTimeline: request.estimatedTimeline || "",
        assignedAgent: request.assignedAgent || "",
        assignedAgentId: null,
        adminResponse: request.adminResponse || "",
      });
    }
    setShowResponseModal(true);
  };

  
  // Handle agent selection
  const handleSelectAgent = (agent: any) => {
    setResponseForm({
      ...responseForm,
      assignedAgentId: agent.id,
      assignedAgent: agent.user?.name || "",
    });
    setShowAgentDropdown(false);
    setAgentSearchQuery(agent.user?.name || "");
  };

  const getAgentRatingSummary = (agent: any): { avg: number | null; totalReviews: number | null } => {
    const performanceMetrics = agent?.performanceMetrics ?? {};
    const punctuality = typeof performanceMetrics?.punctualityRating === "number" ? performanceMetrics.punctualityRating : null;
    const customerCare = typeof performanceMetrics?.customerCareRating === "number" ? performanceMetrics.customerCareRating : null;
    const communication = typeof performanceMetrics?.communicationRating === "number" ? performanceMetrics.communicationRating : null;
    const totalReviews = typeof performanceMetrics?.totalReviews === "number" ? performanceMetrics.totalReviews : null;

    const parts = [punctuality, customerCare, communication].filter((n): n is number => typeof n === "number" && n > 0);
    if (parts.length === 0) return { avg: null, totalReviews };
    const avg = parts.reduce((sum, n) => sum + n, 0) / parts.length;
    return { avg, totalReviews };
  };

  const renderStars = (avg: number | null) => {
    const rounded = typeof avg === "number" ? Math.max(0, Math.min(5, Math.round(avg))) : 0;
    return (
      <div className="flex items-center gap-0.5" aria-label={avg ? `Rating ${avg.toFixed(1)} out of 5` : "No rating"}>
        {Array.from({ length: 5 }).map((_, i) => {
          const filled = i + 1 <= rounded;
          return (
            <Star
              key={i}
              className={
                "h-3.5 w-3.5 " +
                (filled ? "text-yellow-500 fill-yellow-500" : "text-gray-300")
              }
            />
          );
        })}
      </div>
    );
  };
  
  // Initialize agent search query when modal opens with existing agent
  useEffect(() => {
    if (showResponseModal && responseForm.assignedAgent) {
      setAgentSearchQuery(responseForm.assignedAgent);
    }
  }, [showResponseModal, responseForm.assignedAgent]);

  // Handle sending quick message
  const handleSendQuickMessage = async () => {
    if (!selectedRequest || !quickMessage.trim()) return;
    
    setSendingMessage(true);
    try {
      await api.post(`/api/admin/plan-with-us/requests/${selectedRequest.id}/message`, {
        message: quickMessage.trim(),
      });
      
      // Clear the message input (messages will reload automatically via ConversationHistoryDisplay useEffect)
      setQuickMessage("");
      
      // Show success message
      window.dispatchEvent(
        new CustomEvent("nols:toast", {
          detail: { type: "success", title: "Message Sent", message: "Your response has been sent to the customer.", duration: 3000 },
        })
      );
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle starting work on request
  const handleStartWork = async (requestId: number) => {
    try {
      await api.patch(`/api/admin/plan-with-us/requests/${requestId}`, {
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

  // ── Structured feedback helpers ─────────────────────────────────────────────
  const INCLUSION_CATEGORIES = [
    { id: "accommodation", label: "Accommodation", emoji: "🏨", icon: Building2,
      chipActive: "bg-purple-100 text-purple-700 border-purple-300",
      chipIdle: "bg-gray-50 text-gray-600 border-gray-200 hover:border-purple-300",
      headerColor: "text-purple-700", countBg: "bg-purple-100 text-purple-700",
      options: ["Luxury Lodge","Tented Safari Camp","Boutique Hotel","Budget Guesthouse","Beach Resort","Mountain Hut","Self-Catering Villa"],
      placeholder: "Lodge name, star rating, room type, amenities (pool, wifi, A/C), location highlights..." },
    { id: "meals", label: "Meals", emoji: "🍽️", icon: Utensils,
      chipActive: "bg-orange-100 text-orange-700 border-orange-300",
      chipIdle: "bg-gray-50 text-gray-600 border-gray-200 hover:border-orange-300",
      headerColor: "text-orange-700", countBg: "bg-orange-100 text-orange-700",
      options: ["Full Board","Half Board","Bed & Breakfast","All-Inclusive","Lunch Only","Dinner Only","Self-Catering"],
      placeholder: "Meal schedule, restaurant style, dietary options (vegetarian, halal, vegan) accommodated on request..." },
    { id: "transport", label: "Transport", emoji: "🚐", icon: Car,
      chipActive: "bg-blue-100 text-blue-700 border-blue-300",
      chipIdle: "bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300",
      headerColor: "text-blue-700", countBg: "bg-blue-100 text-blue-700",
      options: ["4WD Safari Vehicle","Luxury Minibus","Private Car","Shared Shuttle","Domestic Flight","Charter Flight","Boat / Ferry"],
      placeholder: "Vehicle type, seating capacity, pop-up roof, driver-guide details, airline/operator name..." },
    { id: "activities", label: "Activities & Experiences", emoji: "🎯", icon: Target,
      chipActive: "bg-emerald-100 text-emerald-700 border-emerald-300",
      chipIdle: "bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-300",
      headerColor: "text-emerald-700", countBg: "bg-emerald-100 text-emerald-700",
      options: ["Game Drives (AM/PM)","Night Game Drive","Walking Safari","Boat Safari","Cultural Village Visit","Cooking Class","Photography Session","Hot Air Balloon","Snorkeling / Diving","Bird Watching","Guided Hike"],
      placeholder: "Schedule, frequency (e.g. 2x daily), duration, ranger/guide included, what makes each activity special..." },
    { id: "fees", label: "Fees & Entry", emoji: "🎫", icon: Ticket,
      chipActive: "bg-amber-100 text-amber-700 border-amber-300",
      chipIdle: "bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-300",
      headerColor: "text-amber-700", countBg: "bg-amber-100 text-amber-700",
      options: ["National Park Entry","Conservation Levy","Crater Access Fee","Beach Access Fee","Museum / Heritage Site","Equipment / Gear Rental","Climbing Permit"],
      placeholder: "Fee amounts in USD or TZS, which parks/sites covered, gear rental items included..." },
    { id: "transfers", label: "Airport & Transfers", emoji: "✈️", icon: Plane,
      chipActive: "bg-sky-100 text-sky-700 border-sky-300",
      chipIdle: "bg-gray-50 text-gray-600 border-sky-300 hover:border-sky-300",
      headerColor: "text-sky-700", countBg: "bg-sky-100 text-sky-700",
      options: ["Airport Pickup","Airport Drop-off","Hotel-to-Hotel Transfer","Port / Ferry Transfer","Train Station Transfer"],
      placeholder: "Airport name (e.g. KIA / JRO), meet & greet details, transfer vehicle, timing, driving distance..." },
    { id: "guides", label: "Guides & Crew", emoji: "👤", icon: Users,
      chipActive: "bg-indigo-100 text-indigo-700 border-indigo-300",
      chipIdle: "bg-gray-50 text-gray-600 border-gray-200 hover:border-indigo-300",
      headerColor: "text-indigo-700", countBg: "bg-indigo-100 text-indigo-700",
      options: ["Professional Driver-Guide","Specialist Wildlife Guide","Cultural Interpreter","Mountain Guide (KCMC)","Porters","Security Escort"],
      placeholder: "Guide certification body, languages spoken, years of experience, crew-to-guest ratio..." },
    { id: "extras", label: "Extras & Add-ons", emoji: "⭐", icon: Gift,
      chipActive: "bg-pink-100 text-pink-700 border-pink-300",
      chipIdle: "bg-gray-50 text-gray-600 border-gray-200 hover:border-pink-300",
      headerColor: "text-pink-700", countBg: "bg-pink-100 text-pink-700",
      options: ["Travel Insurance","Visa Assistance","SIM Card / Data","Laundry Service","Gratuities Included","Welcome Pack","Certificate of Achievement","Pre-trip Briefing"],
      placeholder: "Insurance coverage amount, visa type, SIM data limit, special welcome extras..." },
  ];
  const PERMIT_PRESETS: Record<string, string[]> = {
    "Safari": ["National Park Entry Permit","Vehicle Entry Fee","Photography/Filming Permit","Yellow Fever Certificate","Valid International Passport","Travel Insurance"],
    "Cultural": ["Cultural Site Entry Permit","Photography/Filming Permit","Local Guide Certification","Travel Insurance","Valid ID"],
    "Adventure / Hiking": ["Hiking/Trekking Permit","Mountain Climbing Certificate","Medical Fitness Certificate","Travel Insurance","Emergency Contact Registration","Gear Checklist Confirmation"],
    "School / Teacher": ["Parent/Guardian Consent Forms","School Authorization Letter","Student ID/School Registry","First Aid Certificate (Staff)","Emergency Contact List","Dietary/Medical Requirements Sheet"],
    "Local tourism": ["Entry Tickets for Sites","Transport Charter Permit","Travel Insurance","Valid ID Documents"],
    "Multi-destination tour": ["National Park Entry Permits","Cross-Border Documents (if applicable)","Transport Charter Permit","Yellow Fever Certificate","Travel Insurance","Valid Passport"],
  };
  const SECTION_DEFS: Record<string, { id: string; label: string }[]> = {
    "Safari":             [{ id:"itinerary",label:"Itinerary Options"},{ id:"permits",label:"Park Permits & Docs"},{ id:"timeline",label:"Timeline"},{ id:"tripSpecific",label:"Game Drive & Lodges"},{ id:"agent",label:"Assign Agent"}],
    "Cultural":           [{ id:"itinerary",label:"Itinerary Options"},{ id:"permits",label:"Permits & Docs"},{ id:"timeline",label:"Timeline"},{ id:"tripSpecific",label:"Cultural Sites & Guide"},{ id:"agent",label:"Assign Agent"}],
    "Adventure / Hiking": [{ id:"itinerary",label:"Itinerary Options"},{ id:"permits",label:"Permits & Gear"},{ id:"timeline",label:"Timeline"},{ id:"tripSpecific",label:"Safety & Fitness Info"},{ id:"agent",label:"Assign Agent"}],
    "School / Teacher":   [{ id:"itinerary",label:"Itinerary Options"},{ id:"permits",label:"Required Documents"},{ id:"timeline",label:"Timeline"},{ id:"tripSpecific",label:"Educational Objectives"},{ id:"agent",label:"Assign Agent"}],
    "Local tourism":      [{ id:"itinerary",label:"Itinerary Options"},{ id:"permits",label:"Permits & Docs"},{ id:"timeline",label:"Timeline"},{ id:"tripSpecific",label:"Route & Highlights"},{ id:"agent",label:"Assign Agent"}],
    "default":            [{ id:"itinerary",label:"Itinerary Options"},{ id:"permits",label:"Permits & Documents"},{ id:"timeline",label:"Timeline"},{ id:"tripSpecific",label:"Trip Details"},{ id:"agent",label:"Assign Agent"}],
  };
  const TIMELINE_PRESETS = [
    { label:"2-Week Window", value:"Booking confirmation required within 14 days. 50% deposit on booking, balance 7 days before departure." },
    { label:"30-Day Standard", value:"Best booked 30 days in advance. 30% deposit on confirmation, full payment 14 days before departure." },
    { label:"Last Minute (<7 days)", value:"Available as last-minute booking. Full payment required at booking. Subject to availability." },
    { label:"3-Month Safari Plan", value:"Recommended 3 months in advance for peak season. 25% deposit to secure dates, balance 30 days before." },
  ];
  const getAvailableSections = (tripType: string) => SECTION_DEFS[tripType] || SECTION_DEFS["default"];
  const getPermitPresets = (tripType: string) => PERMIT_PRESETS[tripType] || ["Travel Insurance","Valid ID Documents","Entry Permits"];
  const getTripSpecificLabel = (tripType: string) => (({ "Safari":"Game Drive & Lodge Options","Cultural":"Cultural Sites & Local Guide Info","Adventure / Hiking":"Safety, Fitness & Gear Requirements","School / Teacher":"Educational Objectives & Safety Protocols","Local tourism":"Route Highlights & Local Tips" } as Record<string,string>)[tripType] || "Trip-Specific Information");
  // Parse destinations string into {name, nights} array for auto-populating itinerary cards
  const parseDestinationsForItinerary = (raw: string): { name: string; nights: number }[] => {
    const parts = raw.split(/\d+\)/).map((s: string) => s.trim()).filter(Boolean);
    const extract = (str: string) => {
      const m = str.match(/[-\u2014\u2013]\s*(\d+)\s*nights?/i);
      const nights = m ? Number(m[1]) : 3;
      const name = str.replace(/[-\u2014\u2013]\s*\d+\s*nights?/i, "").trim().replace(/[,;]+$/, "");
      return { name: name || str, nights };
    };
    if (parts.length <= 1) return [extract(raw.replace(/^\d+\)\s*/, ""))];
    return parts.map(extract);
  };

  const getTripSpecificPlaceholder = (tripType: string) => (({ "Safari":"Describe lodge options, game reserve highlights, Big Five sightings, best drive times...","Cultural":"List cultural sites, local guides, historical significance, cultural etiquette...","Adventure / Hiking":"Fitness requirements, altitude info, gear checklist, emergency protocols...","School / Teacher":"Learning objectives, age-appropriate activities, emergency plan, dietary notes...","Local tourism":"Route map notes, local gems, viewpoints, lunch spots, photo opportunities..." } as Record<string,string>)[tripType] || "Any trip-specific details, highlights, or important information...");
  const toggleSection = (id: string) => setActiveSections(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const addItineraryOption = () => setItineraryOptions(prev => [...prev, { id: Date.now().toString(), name: `Option ${String.fromCharCode(65 + prev.length)}`, days: 3, pricePerPerson: "", inclusions: [], customInclusion: "", dayOutline: "", priceMode: "trip" as const, inclusionDetails: {}, feeAmounts: {}, linkedProperties: [] }]);
  const linkProperty = (optId: string, p: { id: number; title: string; type: string | null; regionName?: string | null }) =>
    setItineraryOptions(prev => prev.map(o => o.id === optId ? { ...o, linkedProperties: [...(o.linkedProperties ?? []).filter(lp => lp.id !== p.id), p] } : o));
  const unlinkProperty = (optId: string, propId: number) =>
    setItineraryOptions(prev => prev.map(o => o.id === optId ? { ...o, linkedProperties: (o.linkedProperties ?? []).filter(lp => lp.id !== propId) } : o));
  const searchApprovedProperties = async (optId: string, query: string) => {
    setPropSearch({ optId, query, results: [], loading: !!query.trim() });
    if (!query.trim()) return;
    try {
      const r = await api.get("/api/admin/properties", {
        params: { status: "APPROVED", q: query.trim(), page: 1, pageSize: 10 },
      });
      const items: Array<{ id: number; title: string; type: string | null; regionName?: string | null }> =
        r.data?.items ?? r.data?.data?.items ?? [];
      setPropSearch(prev => prev?.optId === optId && prev.query === query ? { ...prev, results: items, loading: false } : prev);
    } catch {
      setPropSearch(prev => prev?.optId === optId ? { ...prev, results: [], loading: false } : prev);
    }
  };
  const removeItineraryOption = (id: string) => setItineraryOptions(prev => prev.filter(o => o.id !== id));
  const updateItineraryOption = (id: string, field: string, value: unknown) => setItineraryOptions(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
  const updateInclusionDetail = (optId: string, catId: string, text: string) =>
    setItineraryOptions(prev => prev.map(o => o.id === optId ? { ...o, inclusionDetails: { ...o.inclusionDetails, [catId]: text } } : o));
  const updateFeeAmount = (optId: string, feeName: string, amount: string) =>
    setItineraryOptions(prev => prev.map(o => o.id === optId ? { ...o, feeAmounts: { ...o.feeAmounts, [feeName]: amount } } : o));
  const toggleInclusion = (optId: string, item: string) => setItineraryOptions(prev => prev.map(o => o.id === optId ? { ...o, inclusions: o.inclusions.includes(item) ? o.inclusions.filter(i => i !== item) : [...o.inclusions, item] } : o));
  const addCustomInclusion = (optId: string) => setItineraryOptions(prev => prev.map(o => o.id === optId ? { ...o, inclusions: o.customInclusion.trim() ? [...o.inclusions, o.customInclusion.trim()] : o.inclusions, customInclusion: "" } : o));
  const togglePermit = (item: string) => setSelectedPermits(prev => prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]);

  const handleSubmitResponseNew = async () => {
    if (!selectedRequest) return;
    setSubmitting(true);
    try {
      const itineraryText = itineraryOptions.length > 0
        ? itineraryOptions.map((opt, i) => {
            const lines: string[] = [`=== ${opt.name || `Option ${String.fromCharCode(65 + i)}`} ===`];
            lines.push(`Duration: ${opt.days} ${opt.days === 1 ? "day" : "days"}`);
            if (opt.pricePerPerson) {
              const p = Number(String(opt.pricePerPerson).replace(/[^0-9.]/g, ""));
              const g = Number(selectedRequest?.groupSize) || 0;
              const n = Number(opt.days) || 0;
              const mode = opt.priceMode || "trip";
              const perPersonTotal = mode === "night" ? p * n : p;
              const groupTotal = perPersonTotal * g;
              if (mode === "night") {
                lines.push(`Price per person per night: TZS ${opt.pricePerPerson}`);
                if (n) lines.push(`Price per person (${n} nights): TZS ${perPersonTotal.toLocaleString()}`);
              } else {
                lines.push(`Price per person (full stay): TZS ${opt.pricePerPerson}`);
              }
              if (p && g) lines.push(`Total for group (${g} ${g===1?"person":"people"}): TZS ${groupTotal.toLocaleString()}`);
            }
            if (opt.inclusions.length > 0) {
              lines.push("\n--- WHAT'S INCLUDED ---");
              INCLUSION_CATEGORIES.forEach(cat => {
                const sel = cat.options.filter(o => opt.inclusions.includes(o));
                if (sel.length > 0) {
                  lines.push(`${cat.emoji} ${cat.label}: ${sel.join(", ")}`);
                  if (cat.id === "fees") {
                    sel.forEach(item => {
                      const amt = Number(String(opt.feeAmounts?.[item] || "0").replace(/[^0-9.]/g, ""));
                      if (amt > 0) lines.push(`   ${item}: TZS ${amt.toLocaleString()} /person`);
                    });
                    const feesTotal = sel.reduce((sum, item) => sum + (Number(String(opt.feeAmounts?.[item] || "0").replace(/[^0-9.]/g, "")) || 0), 0);
                    if (feesTotal > 0 && sel.length > 1) lines.push(`   Fees subtotal: TZS ${feesTotal.toLocaleString()} /person`);
                  }
                  const det = opt.inclusionDetails?.[cat.id];
                  if (det?.trim()) lines.push(`   ${det.trim()}`);
                  if (cat.id === "accommodation" && (opt.linkedProperties?.length ?? 0) > 0) {
                    lines.push(`   Linked listings: ${opt.linkedProperties!.map(p => p.title).join(", ")}`);
                  }
                }
              });
              const known = INCLUSION_CATEGORIES.flatMap(c => c.options);
              const custom = opt.inclusions.filter(i => !known.includes(i));
              if (custom.length > 0) lines.push(`Additional: ${custom.join(", ")}`);
            }
            if (opt.dayOutline.trim()) lines.push(`\nItinerary:\n${opt.dayOutline.trim()}`);
            return lines.join("\n");
          }).join("\n\n")
        : responseForm.suggestedItineraries;

      const permitsText = selectedPermits.length > 0
        ? selectedPermits.map((p, i) => `${i + 1}. ${p}`).join("\n")
        : responseForm.requiredPermits;

      const fullAdminResponse = [responseForm.adminResponse, tripSpecificNotes].filter(Boolean).join("\n\n");

      const submitData: Record<string, unknown> = {
        status: "COMPLETED",
        suggestedItineraries: itineraryText,
        requiredPermits: permitsText,
        estimatedTimeline: responseForm.estimatedTimeline,
        adminResponse: fullAdminResponse,
      };
      if (responseForm.assignedAgentId) {
        submitData.assignedAgentId = responseForm.assignedAgentId;
        const sel = agents.find(a => a.id === responseForm.assignedAgentId);
        if (sel) submitData.assignedAgent = sel.user?.name || "";
      }
      await api.patch(`/api/admin/plan-with-us/requests/${selectedRequest.id}`, submitData);
      await load();
      setShowResponseModal(false);
      setSelectedRequest(null);
      setResponseForm({ suggestedItineraries:"", requiredPermits:"", estimatedTimeline:"", assignedAgent:"", assignedAgentId:null, adminResponse:"" });
      setItineraryOptions([]);
      setSelectedPermits([]);
      setTripSpecificNotes("");
      setActiveSections(new Set(["itinerary","permits","timeline","agent"]));
      setQuickMessage("");
      setAgentSearchQuery("");
      setShowAgentDropdown(false);
    } catch (err) {
      console.error("Failed to submit response", err);
      alert("Failed to submit response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div
        className="relative rounded-xl overflow-hidden shadow-sm"
        style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 45%, #0f766e 100%)" }}
      >
        {/* SVG geometric overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-10" preserveAspectRatio="none" viewBox="0 0 800 160">
          <line x1="0" y1="40" x2="800" y2="40" stroke="white" strokeWidth="1"/>
          <line x1="0" y1="80" x2="800" y2="80" stroke="white" strokeWidth="1"/>
          <line x1="0" y1="120" x2="800" y2="120" stroke="white" strokeWidth="1"/>
          <line x1="200" y1="0" x2="200" y2="160" stroke="white" strokeWidth="1"/>
          <line x1="500" y1="0" x2="500" y2="160" stroke="white" strokeWidth="1"/>
          <circle cx="680" cy="30" r="60" stroke="white" strokeWidth="1" fill="none"/>
          <circle cx="100" cy="140" r="45" stroke="white" strokeWidth="1" fill="none"/>
        </svg>
        <div className="relative z-10 px-8 py-8 flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0 shadow-lg">
            <FileText className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Plan Requests</h1>
            <p className="text-blue-100 text-sm mt-1">Review requests and provide feedback to customers</p>
          </div>
        </div>
      </div>

      {/* Search and Filters - Moved to Top */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
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
                <option value="Tourist">Tourist</option>
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
                      onSelectAction={(s) => {
                        setDate(s as string | string[]);
                        setPage(1);
                      }}
                      onCloseAction={() => setPickerOpen(false)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      {statsData?.trends && statsData.trends.length > 0 && (() => {
        interface TrendItem { count: number; pending: number; inProgress: number; completed: number; }
        const kpis = [
          { label: "Total", value: statsData.trends.reduce((s: number, t: TrendItem) => s + t.count, 0), color: "blue" },
          { label: "New", value: statsData.trends.reduce((s: number, t: TrendItem) => s + t.pending, 0), color: "amber" },
          { label: "In Progress", value: statsData.trends.reduce((s: number, t: TrendItem) => s + t.inProgress, 0), color: "indigo" },
          { label: "Completed", value: statsData.trends.reduce((s: number, t: TrendItem) => s + t.completed, 0), color: "emerald" },
        ] as const;
        const periodLabel = statsPeriod === "7d" ? "Last 7 days" : statsPeriod === "30d" ? "Last 30 days" : statsPeriod === "month" ? "This month" : "This year";
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {kpis.map(({ label, value, color }) => (
              <div key={label} className={`bg-${color}-50 rounded-xl border border-${color}-100 p-4 shadow-sm`}>
                <div className={`text-2xl font-bold text-${color}-700 leading-none`}>{value}</div>
                <div className="text-xs font-semibold text-gray-700 mt-1.5">{label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{periodLabel}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Requests Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-500" />

        {/* ── Loading skeletons ── */}
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-40" />
                  <div className="h-3 bg-gray-200 rounded w-64" />
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-20 shrink-0" />
                <div className="h-8 bg-gray-200 rounded-lg w-28 shrink-0" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No plan requests found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <>
            {/* ── Column header row (desktop only) ── */}
            <div className="hidden lg:grid grid-cols-[56px_1fr_1fr_1fr_1fr_140px_120px] gap-x-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
              {["#", "Customer", "Trip Type", "Destination", "Dates", "Status", ""].map((h) => (
                <span key={h} className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{h}</span>
              ))}
            </div>

            {/* ── Rows ── */}
            <div className="divide-y divide-gray-50">
              {list.map((request) => {
                const initials = (request.customer.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                const avatarColors: Record<string, string> = {
                  "Tourist": "bg-blue-100 text-blue-700",
                  "Teacher": "bg-amber-100 text-amber-700",
                  "School": "bg-violet-100 text-violet-700",
                  "Local": "bg-emerald-100 text-emerald-700",
                };
                const avatarColor = avatarColors[request.role?.split(" ")[0] ?? ""] ?? "bg-indigo-100 text-indigo-700";

                const statusMeta = request.status === "COMPLETED"
                  ? { label: "Completed", dot: "bg-emerald-500", pill: "bg-emerald-50 text-emerald-700 border-emerald-200", glow: "" }
                  : request.status === "IN_PROGRESS"
                  ? { label: "In Progress", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700 border-blue-200", glow: "" }
                  : { label: "New", dot: "bg-amber-400 animate-pulse", pill: "bg-amber-50 text-amber-700 border-amber-200", glow: "" };

                const tripTypeMeta: Record<string, { color: string; short: string }> = {
                  "Safari": { color: "bg-emerald-100 text-emerald-800 border-emerald-200", short: "Safari" },
                  "Cultural": { color: "bg-orange-100 text-orange-800 border-orange-200", short: "Cultural" },
                  "Adventure / Hiking": { color: "bg-sky-100 text-sky-800 border-sky-200", short: "Hiking" },
                  "School / Teacher": { color: "bg-violet-100 text-violet-800 border-violet-200", short: "School" },
                  "Local tourism": { color: "bg-teal-100 text-teal-800 border-teal-200", short: "Local" },
                  "Multi-destination tour": { color: "bg-indigo-100 text-indigo-800 border-indigo-200", short: "Multi" },
                };
                const ttMeta = tripTypeMeta[request.tripType] ?? { color: "bg-gray-100 text-gray-700 border-gray-200", short: request.tripType };

                // Parse destinations for a compact display
                const destRaw = request.destinations || "";
                const destParts = destRaw.split(/\d+\)/).map((s: string) => s.trim()).filter(Boolean);
                const firstDest = destParts.length > 0
                  ? destParts[0].replace(/\s*[-\u2014\u2013]\s*\d+\s*nights?/i, "").trim()
                  : destRaw.replace(/\s*[-\u2014\u2013]\s*\d+\s*nights?/i, "").trim() || "N/A";
                const extraDestCount = destParts.length > 1 ? destParts.length - 1 : 0;

                // Date display
                const dateStr = (() => {
                  if (!request.dateFrom || !request.dateTo) return null;
                  const from = new Date(request.dateFrom);
                  const to = new Date(request.dateTo);
                  const fmtShort = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
                  const sameYear = from.getFullYear() === to.getFullYear();
                  return sameYear
                    ? `${fmtShort(from)} – ${fmtShort(to)}, ${to.getFullYear()}`
                    : `${fmtShort(from)} ${from.getFullYear()} – ${fmtShort(to)} ${to.getFullYear()}`;
                })();

                const isOverdue = request.hoursSinceCreation > 48 && request.status === "NEW";
                const agingColor = request.hoursSinceCreation > 48 ? "text-red-500" : request.hoursSinceCreation > 24 ? "text-amber-500" : "text-emerald-500";
                const agingLabel = request.respondedAt ? null : request.hoursSinceCreation < 24
                  ? `${request.hoursSinceCreation}h ago`
                  : `${Math.floor(request.hoursSinceCreation / 24)}d ago`;

                return (
                  <div
                    key={request.id}
                    className={`group relative px-5 py-4 transition-all duration-150 hover:bg-blue-50/30 ${
                      request.isUrgent ? "bg-amber-50/60 hover:bg-amber-50" : ""
                    }`}
                  >
                    {/* Urgent left stripe */}
                    {request.isUrgent && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r bg-amber-400" />
                    )}

                    {/* ── Desktop layout ── */}
                    <div className="hidden lg:grid grid-cols-[56px_1fr_1fr_1fr_1fr_140px_120px] gap-x-4 items-center">

                      {/* ID */}
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5 leading-none">
                          #{request.id}
                        </span>
                        {request.isUrgent && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor}`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{request.customer.name}</p>
                          <p className="text-[11px] text-gray-400 truncate leading-tight">{request.customer.email}</p>
                          {request.customer.phone && (
                            <p className="text-[11px] text-gray-400 truncate leading-tight">{request.customer.phone}</p>
                          )}
                          <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${avatarColor} border-current/20`}>
                            {request.role}
                          </span>
                        </div>
                      </div>

                      {/* Trip type */}
                      <div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg border text-[11px] font-semibold ${ttMeta.color}`}>
                          {request.tripType}
                        </span>
                        {request.groupSize && (
                          <div className="flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3 text-gray-400" />
                            <span className="text-[11px] text-gray-500">{request.groupSize} {Number(request.groupSize) === 1 ? "person" : "people"}</span>
                          </div>
                        )}
                        {request.budget && (
                          <p className="text-[10px] text-gray-400 mt-0.5 truncate">Budget: {request.budget}</p>
                        )}
                      </div>

                      {/* Destination */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                          <span className="text-xs font-semibold text-gray-800 truncate">{firstDest}</span>
                        </div>
                        {extraDestCount > 0 && (
                          <span className="mt-0.5 inline-block text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-1.5 py-0.5">
                            +{extraDestCount} more stop{extraDestCount > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      {/* Dates */}
                      <div>
                        {dateStr ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="text-xs text-gray-700 leading-tight">{dateStr}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5">
                            <Calendar className="w-3 h-3" /> Flexible
                          </span>
                        )}
                        {agingLabel && (
                          <p className={`text-[10px] font-medium mt-1 ${agingColor}`}>
                            {isOverdue ? "Overdue · " : ""}{agingLabel}
                          </p>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full border ${statusMeta.pill}`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                          {statusMeta.label}
                        </span>
                        {request.assignedAgent && (
                          <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                            <User className="w-3 h-3" />{request.assignedAgent}
                          </p>
                        )}
                      </div>

                      {/* Action */}
                      <div className="flex justify-end">
                        {request.status === "NEW" && (
                          <button
                            onClick={() => handleStartWork(request.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                          >
                            <Edit className="h-3.5 w-3.5" /> Start
                          </button>
                        )}
                        {request.status === "IN_PROGRESS" && (
                          <button
                            onClick={() => handleOpenResponse(request)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md"
                          >
                            <Send className="h-3.5 w-3.5" /> Respond
                          </button>
                        )}
                        {request.status === "COMPLETED" && (
                          <button
                            onClick={() => handleOpenResponse(request)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-100 transition-all"
                          >
                            <Eye className="h-3.5 w-3.5" /> Review
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Mobile / Tablet layout ── */}
                    <div className="lg:hidden space-y-3">
                      {/* Top row */}
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor}`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-900">{request.customer.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${avatarColor} border-current/20`}>{request.role}</span>
                            {request.isUrgent && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                          </div>
                          <p className="text-[11px] text-gray-400 truncate">{request.customer.email}{request.customer.phone ? ` · ${request.customer.phone}` : ""}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-full border shrink-0 ${statusMeta.pill}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />{statusMeta.label}
                        </span>
                      </div>
                      {/* Meta pills */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${ttMeta.color}`}>{request.tripType}</span>
                        {request.groupSize && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] text-gray-600">
                            <Users className="w-3 h-3" />{request.groupSize}
                          </span>
                        )}
                        {request.budget && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg border border-gray-200 bg-gray-50 text-[11px] text-gray-600">{request.budget}</span>
                        )}
                        <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">#{request.id}</span>
                      </div>
                      {/* Destination + Dates */}
                      <div className="flex items-start gap-3 text-xs text-gray-600">
                        {firstDest !== "N/A" && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                            <span className="font-medium truncate max-w-[160px]">{firstDest}{extraDestCount > 0 ? ` +${extraDestCount}` : ""}</span>
                          </div>
                        )}
                        {dateStr && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <Calendar className="w-3.5 h-3.5 shrink-0" />
                            <span>{dateStr}</span>
                          </div>
                        )}
                      </div>
                      {/* Action row */}
                      <div className="flex items-center justify-between">
                        {agingLabel && (
                          <span className={`text-[11px] font-medium ${agingColor}`}>{isOverdue ? "Overdue · " : ""}{agingLabel}</span>
                        )}
                        <div className="ml-auto flex gap-2">
                          {request.status === "NEW" && (
                            <button onClick={() => handleStartWork(request.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm">
                              <Edit className="h-3.5 w-3.5" /> Start
                            </button>
                          )}
                          {request.status === "IN_PROGRESS" && (
                            <button onClick={() => handleOpenResponse(request)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-md">
                              <Send className="h-3.5 w-3.5" /> Respond
                            </button>
                          )}
                          {request.status === "COMPLETED" && (
                            <button onClick={() => handleOpenResponse(request)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border-2 border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-100 transition-all">
                              <Eye className="h-3.5 w-3.5" /> Review
                            </button>
                          )}
                        </div>
                      </div>
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
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setShowResponseModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 h-[90vh] flex flex-col overflow-hidden">

              {/* ── Modal Header ── */}
              <div
                className="sticky top-0 z-10 flex-shrink-0 rounded-t-2xl"
                style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 50%,#0f766e 100%)" }}
              >
                <div className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white/15 border border-white/25 flex-shrink-0">
                      {selectedRequest.status === "COMPLETED"
                        ? <Eye className="h-5 w-5 text-white" />
                        : <Send className="h-5 w-5 text-white" />}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-white leading-tight">{selectedRequest.status === "COMPLETED" ? "View Response" : "Provide Feedback"}</h2>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/15 border border-white/25 text-white/80 font-mono">#{selectedRequest.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${selectedRequest.status === "COMPLETED" ? "bg-emerald-500/70 text-white" : selectedRequest.status === "IN_PROGRESS" ? "bg-blue-400/70 text-white" : "bg-amber-400/70 text-white"}`}>{selectedRequest.status === "NEW" ? "New" : selectedRequest.status === "IN_PROGRESS" ? "In Progress" : "Completed"}</span>
                      </div>
                      <p className="text-blue-200 text-xs mt-1">
                        {selectedRequest.tripType} · {selectedRequest.role} · Group of {selectedRequest.groupSize ?? "?"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowResponseModal(false)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>

              {/* ── Scrollable Content ── */}
              <div className="flex-1 min-h-0 overflow-y-scroll overflow-x-hidden px-5 py-5 space-y-4 bg-gray-50">

                {/* Request Details - full context panel — hidden on COMPLETED (A4 report replaces all) */}
                {selectedRequest.status !== "COMPLETED" && <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4">
                      <span className="inline-flex h-7 w-7 rounded-md bg-blue-50 border border-blue-100 items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </span>
                      Request Details
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { label:"Customer", value:selectedRequest.customer.name, color:"blue" },
                        { label:"Email", value:selectedRequest.customer.email, color:"blue" },
                        { label:"Phone", value:selectedRequest.customer.phone||"-", color:"blue" },
                        { label:"Role", value:selectedRequest.role, color:"purple" },
                        { label:"Trip Type", value:selectedRequest.tripType, color:"emerald" },
                        { label:"Group Size", value:selectedRequest.groupSize?`${selectedRequest.groupSize} people`:"-", color:"amber" },
                        { label:"Budget", value:selectedRequest.budget?`TZS ${Number(selectedRequest.budget).toLocaleString()}`:"Not specified", color:"green" },
                        { label:"Transport", value:selectedRequest.transportRequired?"Required":"Not required", color:selectedRequest.transportRequired?"orange":"gray" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 text-${color}-600`}>{label}</div>
                          <div className="text-sm font-medium text-gray-900 break-words">{value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Travel Dates — premium card */}
                    {(() => {
                      const fmtDate = (d: string) => {
                        const dt = new Date(d);
                        return { day: dt.toLocaleDateString("en-US",{day:"2-digit"}), month: dt.toLocaleDateString("en-US",{month:"short"}), year: dt.toLocaleDateString("en-US",{year:"numeric"}) };
                      };
                      const rawFrom = selectedRequest.dateFrom;
                      const rawTo = selectedRequest.dateTo;
                      const from = rawFrom ? fmtDate(rawFrom) : null;
                      const to = rawTo ? fmtDate(rawTo) : null;
                      const tripDays = (rawFrom && rawTo) ? Math.round((new Date(rawTo).getTime() - new Date(rawFrom).getTime()) / 86400000) : null;
                      return (
                        <div className="mt-2.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider mb-2 text-teal-600 flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            Travel Dates
                          </div>
                          {from ? (
                            <div className="rounded-xl border border-teal-200 overflow-hidden shadow-sm">
                              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2 flex items-center justify-between">
                                <span className="text-[11px] font-bold text-white uppercase tracking-wider">Trip Window</span>
                                {tripDays !== null && (
                                  <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-0.5">
                                    <Clock className="h-3 w-3 text-white" />
                                    <span className="text-[11px] font-bold text-white">{tripDays} days</span>
                                  </div>
                                )}
                              </div>
                              <div className="bg-gradient-to-b from-teal-50/60 to-white px-4 py-3 flex items-center gap-3">
                                {/* From */}
                                <div className="flex-1 flex flex-col items-center bg-white rounded-lg border border-teal-100 py-2 px-3 shadow-sm">
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-teal-500 mb-0.5">Departure</span>
                                  <span className="text-xl font-black text-teal-800 leading-none">{from.day}</span>
                                  <span className="text-[11px] font-semibold text-teal-700">{from.month} {from.year}</span>
                                </div>
                                {/* Divider arrow */}
                                {to && (
                                  <>
                                    <div className="flex flex-col items-center gap-0.5">
                                      <div className="h-0.5 w-6 bg-teal-300 rounded" />
                                      <div className="w-0 h-0 border-t-[4px] border-b-[4px] border-l-[6px] border-transparent border-l-teal-400" />
                                    </div>
                                    {/* To */}
                                    <div className="flex-1 flex flex-col items-center bg-white rounded-lg border border-teal-100 py-2 px-3 shadow-sm">
                                      <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-500 mb-0.5">Return</span>
                                      <span className="text-xl font-black text-teal-800 leading-none">{to.day}</span>
                                      <span className="text-[11px] font-semibold text-teal-700">{to.month} {to.year}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm text-gray-400 italic">Not specified</div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="mt-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider mb-2 text-teal-600 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        Destination(s)
                      </div>
                      {selectedRequest.destinations ? (() => {
                        const raw = selectedRequest.destinations;
                        const parts = raw.split(/\d+\)/).map((s: string) => s.trim()).filter(Boolean);
                        if (parts.length <= 1) {
                          return (
                            <div className="flex items-center gap-3 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl px-4 py-3 shadow-sm">
                              <div className="h-8 w-8 rounded-full bg-teal-500 flex items-center justify-center shrink-0 shadow-sm">
                                <MapPin className="h-4 w-4 text-white" />
                              </div>
                              <span className="text-sm font-semibold text-teal-900">{raw}</span>
                            </div>
                          );
                        }
                        const totalNights = parts.reduce((sum: number, part: string) => {
                          const m = part.match(/[-—]\s*(\d+)\s*nights?/i);
                          return sum + (m ? Number(m[1]) : 0);
                        }, 0);
                        return (
                          <div className="rounded-xl border border-teal-200 overflow-hidden shadow-sm">
                            {/* Header banner */}
                            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-teal-100" />
                                <span className="text-[11px] font-bold text-white uppercase tracking-wider">Multi-Destination Journey</span>
                              </div>
                              {totalNights > 0 && (
                                <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-0.5">
                                  <Clock className="h-3 w-3 text-white" />
                                  <span className="text-[11px] font-bold text-white">{totalNights} nights total</span>
                                </div>
                              )}
                            </div>
                            {/* Timeline */}
                            <div className="bg-gradient-to-b from-teal-50/60 to-white px-4 py-3">
                              <div className="relative">
                                {/* Vertical connector line */}
                                {parts.length > 1 && (
                                  <div className="absolute left-[13px] top-5 bottom-5 w-0.5 bg-gradient-to-b from-teal-300 to-cyan-200 z-0" />
                                )}
                                <div className="flex flex-col gap-2.5">
                                  {parts.map((part: string, idx: number) => {
                                    const nightsMatch = part.match(/[-—]\s*(\d+)\s*nights?/i);
                                    const nights = nightsMatch ? Number(nightsMatch[1]) : null;
                                    const name = part.replace(/[-—]\s*\d+\s*nights?/i, "").trim().replace(/[,;]+$/, "");
                                    const isLast = idx === parts.length - 1;
                                    return (
                                      <div key={idx} className="relative flex items-center gap-3 z-10">
                                        {/* Step dot */}
                                        <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 shadow-sm font-bold text-[11px] text-white
                                          ${isLast ? "bg-gradient-to-br from-cyan-500 to-teal-600 ring-2 ring-teal-200" : "bg-teal-500"}`}>
                                          {idx + 1}
                                        </div>
                                        {/* Card */}
                                        <div className={`flex-1 flex items-center justify-between rounded-lg px-3 py-2 border gap-2 min-w-0
                                          ${isLast ? "bg-white border-teal-200 shadow-sm" : "bg-white/70 border-teal-100"}`}>
                                          <span className={`text-sm font-semibold truncate ${isLast ? "text-teal-900" : "text-gray-800"}`}>{name}</span>
                                          {nights !== null && (
                                            <span className="inline-flex items-center gap-1 bg-teal-50 border border-teal-200 text-teal-700 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                                              <Clock className="h-2.5 w-2.5" />
                                              {nights}n
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="text-sm text-gray-400 italic">Not specified</div>
                      )}
                    </div>
                    {selectedRequest.notes && (
                      <div className="mt-2.5 bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-amber-700">Guest Special Requirements / Notes</div>
                        <div className="text-sm text-amber-900 whitespace-pre-line">{selectedRequest.notes}</div>
                      </div>
                    )}
                  </div>
                </div>}

                {/* Conversation History — hidden on COMPLETED (A4 report is shown instead) */}
                {selectedRequest.status !== "COMPLETED" && <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-slate-400 to-gray-400" />
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
                      <span className="inline-flex h-7 w-7 rounded-md bg-slate-50 border border-slate-200 items-center justify-center">
                        <MessageSquare className="h-4 w-4 text-slate-600" />
                      </span>
                      Conversation History
                    </h3>
                    <ConversationHistoryDisplay requestId={selectedRequest.id} />
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Send Quick Message</label>
                      <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                        <textarea
                          value={quickMessage}
                          onChange={(e) => setQuickMessage(e.target.value)}
                          placeholder="Send a quick update to the customer..."
                          rows={2}
                          className="w-full sm:flex-1 max-w-full box-border px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm resize-none"
                        />
                        <button
                          onClick={handleSendQuickMessage}
                          disabled={sendingMessage || !quickMessage.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 sm:self-end transition-all"
                        >
                          {sendingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>}

                {/* ── Feedback builder (only when not COMPLETED) ── */}
                {selectedRequest.status !== "COMPLETED" && (
                  <>
                    {/* Section selector chips */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                        Select sections to include in your feedback
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {getAvailableSections(selectedRequest.tripType).map(sec => (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => toggleSection(sec.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                              activeSections.has(sec.id)
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                            }`}
                          >
                            {activeSections.has(sec.id) ? "✓ " : "+ "}{sec.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Itinerary Options */}
                    {activeSections.has("itinerary") && (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                        <div className="p-5">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                              <span className="inline-flex h-7 w-7 rounded-md bg-blue-50 border border-blue-100 items-center justify-center">
                                <MapPin className="h-4 w-4 text-blue-600" />
                              </span>
                              Itinerary Options
                            </h3>
                            <button
                              type="button"
                              onClick={addItineraryOption}
                              className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-all"
                            >
                              + Add Option
                            </button>
                          </div>
                          {itineraryOptions.length === 0 && (
                            <div className="text-center py-7 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                              Click <strong>+ Add Option</strong> to build proposals (e.g. Budget Option, Premium Option).<br />
                              <span className="text-xs text-teal-500">For multi-destination requests, cards are auto-created per destination.</span>
                            </div>
                          )}
                          <div className="space-y-4">
                            {itineraryOptions.map((opt, idx) => (
                              <div key={opt.id} className="w-full min-w-0 border border-gray-200 rounded-xl overflow-hidden">
                                {/* Option name bar */}
                                <div className={`px-4 py-2.5 flex items-center justify-between border-b border-gray-200 min-w-0 ${opt.autoFilled ? "bg-teal-50" : "bg-gray-50"}`}>
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {opt.autoFilled && (
                                      <span className="inline-flex items-center gap-1 bg-teal-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wide">
                                        <MapPin className="h-2.5 w-2.5" />
                                        Destination
                                      </span>
                                    )}
                                    <input
                                      type="text"
                                      value={opt.name}
                                      onChange={e => updateItineraryOption(opt.id, "name", e.target.value)}
                                      className={`bg-transparent text-sm font-bold outline-none flex-1 min-w-0 ${opt.autoFilled ? "text-teal-900" : "text-gray-900"}`}
                                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeItineraryOption(opt.id)}
                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors ml-3"
                                  >
                                    Remove
                                  </button>
                                </div>
                                {/* Days + Price + Auto-computation */}
                                <div className="p-4 space-y-3 min-w-0">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Duration (nights)</label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={opt.days}
                                        onChange={e => updateItineraryOption(opt.id, "days", Number(e.target.value))}
                                        className="w-full max-w-full box-border px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                      />
                                    </div>
                                    <div>
                                      {/* Price mode toggle — admin must explicitly choose to avoid mistakes */}
                                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                        {opt.priceMode === "night" ? "Price / Person / Night (TZS)" : "Price / Person — Full Stay (TZS)"}
                                      </label>
                                      <input
                                        type="text"
                                        value={opt.pricePerPerson}
                                        onChange={e => updateItineraryOption(opt.id, "pricePerPerson", e.target.value)}
                                        className="w-full max-w-full box-border px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="e.g. 850,000"
                                      />
                                    </div>
                                  </div>
                                  {/* Price mode selector */}
                                  <div className="flex items-center gap-0 rounded-lg border border-gray-200 overflow-hidden text-xs font-semibold">
                                    <button
                                      type="button"
                                      onClick={() => updateItineraryOption(opt.id, "priceMode", "trip")}
                                      className={`flex-1 py-2 text-center transition-all ${
                                        opt.priceMode === "trip"
                                          ? "bg-indigo-600 text-white"
                                          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                      }`}
                                    >
                                      Total for full stay
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateItineraryOption(opt.id, "priceMode", "night")}
                                      className={`flex-1 py-2 text-center transition-all border-l border-gray-200 ${
                                        opt.priceMode === "night"
                                          ? "bg-amber-500 text-white"
                                          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                      }`}
                                    >
                                      Per night × {opt.days} nights
                                    </button>
                                  </div>
                                  {/* Live price computation */}
                                  {(() => {
                                    const priceCleaned = Number(String(opt.pricePerPerson).replace(/[^0-9.]/g, ""));
                                    const groupSize = Number(selectedRequest?.groupSize) || 0;
                                    const nights = Number(opt.days) || 0;
                                    const basePerPerson = opt.priceMode === "night" ? priceCleaned * nights : priceCleaned;
                                    const feesTotal = Object.values(opt.feeAmounts || {}).reduce((sum, v) => sum + (Number(String(v).replace(/[^0-9.]/g, "")) || 0), 0);
                                    const perPersonTotal = basePerPerson + feesTotal;
                                    const groupTotal = perPersonTotal * groupSize;
                                    const fmt = (n: number) => n > 0 ? `TZS ${n.toLocaleString()}` : "—";
                                    if (!priceCleaned && !feesTotal) return null;
                                    return (
                                      <div className={`border rounded-xl p-3 ${
                                        opt.priceMode === "night"
                                          ? "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100"
                                          : "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100"
                                      }`}>
                                        <p className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${
                                          opt.priceMode === "night" ? "text-amber-600" : "text-blue-500"
                                        }`}>
                                          Price Summary — {opt.priceMode === "night" ? `${priceCleaned.toLocaleString()} × ${nights} nights` : "Full Stay Rate"}{feesTotal > 0 ? " + Fees" : ""}
                                        </p>
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                          <div className="bg-white rounded-lg border border-gray-100 p-2 text-center">
                                            <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Base rate</p>
                                            <p className="text-xs font-bold text-gray-700">{fmt(basePerPerson)}</p>
                                            <p className="text-[9px] text-gray-400 mt-0.5">{opt.priceMode === "night" ? `${nights} nights` : "full stay"}</p>
                                          </div>
                                          <div className="bg-white rounded-lg border border-amber-100 p-2 text-center">
                                            <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">🎫 Fees / person</p>
                                            <p className="text-xs font-bold text-amber-600">{feesTotal > 0 ? fmt(feesTotal) : "—"}</p>
                                            <p className="text-[9px] text-gray-400 mt-0.5">park &amp; entry</p>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="bg-white rounded-lg border border-indigo-100 p-2 text-center">
                                            <p className="text-[9px] text-gray-400 uppercase tracking-wider mb-0.5">Per person total</p>
                                            <p className="text-xs font-bold text-indigo-700">{fmt(perPersonTotal)}</p>
                                            <p className="text-[9px] text-gray-400 mt-0.5">base + fees</p>
                                          </div>
                                          <div className={`rounded-lg p-2 text-center ${
                                            opt.priceMode === "night" ? "bg-amber-500" : "bg-indigo-600"
                                          }`}>
                                            <p className="text-[9px] text-white/70 uppercase tracking-wider mb-0.5">{groupSize} {groupSize === 1 ? "person" : "people"} total</p>
                                            <p className="text-xs font-bold text-white">{fmt(groupTotal)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </div>
                                {/* Inclusions — Categorized */}
                                <div className="px-4 pb-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">What&apos;s Included</label>
                                    <span className="text-[9px] text-gray-400 normal-case">pick sub-types, then describe each category</span>
                                  </div>
                                  <div className="space-y-2.5">
                                    {INCLUSION_CATEGORIES.map(cat => {
                                      const selected = cat.options.filter(o => opt.inclusions.includes(o));
                                      const hasSelected = selected.length > 0;
                                      const CatIcon = cat.icon;
                                      return (
                                        <div key={cat.id} className={`rounded-xl border transition-all ${hasSelected ? "border-gray-300 shadow-sm" : "border-gray-100"}`}>
                                          <div className={`flex items-center gap-2 px-3 py-2 ${hasSelected ? "bg-gray-50 border-b border-gray-200 rounded-t-xl" : "rounded-xl"}`}>
                                            <CatIcon className={`w-3.5 h-3.5 flex-shrink-0 ${cat.headerColor}`} />
                                            <span className={`text-xs font-bold ${cat.headerColor}`}>{cat.label}</span>
                                            {hasSelected && (
                                              <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cat.countBg}`}>
                                                {selected.length} selected
                                              </span>
                                            )}
                                          </div>
                                          <div className="px-3 py-2 flex flex-wrap gap-1.5">
                                            {cat.options.map(item => (
                                              <button
                                                key={item}
                                                type="button"
                                                onClick={() => toggleInclusion(opt.id, item)}
                                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${opt.inclusions.includes(item) ? cat.chipActive : cat.chipIdle}`}
                                              >
                                                {opt.inclusions.includes(item) ? "✓ " : ""}{item}
                                              </button>
                                            ))}
                                          </div>
                                          {hasSelected && (
                                            <div className="px-3 pb-3">
                                              {cat.id === "fees" && (
                                                <div className="space-y-1.5 mb-2.5 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
                                                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1.5">Enter amount per person (TZS)</p>
                                                  {selected.map(item => (
                                                    <div key={item} className="flex items-center gap-2">
                                                      <span className="text-[11px] text-amber-800 font-medium flex-1 min-w-0 truncate">{item}</span>
                                                      <div className="flex items-center gap-1 shrink-0">
                                                        <span className="text-[10px] text-gray-400 font-mono">TZS</span>
                                                        <input
                                                          type="text"
                                                          value={opt.feeAmounts?.[item] || ""}
                                                          onChange={e => updateFeeAmount(opt.id, item, e.target.value)}
                                                          placeholder="0"
                                                          className="w-28 px-2 py-1 border-2 border-amber-200 bg-white rounded-lg text-xs focus:ring-2 focus:ring-amber-400 outline-none text-right font-mono"
                                                        />
                                                        <span className="text-[10px] text-gray-400">/person</span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                  {selected.length > 0 && (() => {
                                                    const feesPerPerson = selected.reduce((sum, item) => sum + (Number(String(opt.feeAmounts?.[item] || "0").replace(/[^0-9.]/g, "")) || 0), 0);
                                                    const grpSize = Number(selectedRequest?.groupSize) || 0;
                                                    const feesGroupTotal = feesPerPerson * grpSize;
                                                    return (
                                                      <div className="pt-1.5 border-t border-amber-200 mt-1 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                          <span className="text-[11px] font-bold text-amber-700">Total fees / person</span>
                                                          <span className="text-[11px] font-bold text-amber-700 font-mono">
                                                            TZS {feesPerPerson.toLocaleString()}
                                                          </span>
                                                        </div>
                                                        {grpSize > 0 && (
                                                          <div className="flex items-center justify-between bg-amber-100 rounded-md px-2 py-1">
                                                            <span className="text-[11px] font-bold text-amber-800">Total fees / {grpSize} {grpSize === 1 ? "person" : "people"}</span>
                                                            <span className="text-[11px] font-bold text-amber-800 font-mono">
                                                              TZS {feesGroupTotal.toLocaleString()}
                                                            </span>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })()}
                                                </div>
                                              )}
                                              {cat.id === "accommodation" && (
                                                <div className="mb-2.5">
                                                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                                    <Building2 className="w-3 h-3" /> Link Approved Properties
                                                  </p>
                                                  {/* Linked property chips */}
                                                  {(opt.linkedProperties?.length ?? 0) > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                                      {opt.linkedProperties!.map(p => (
                                                        <span key={p.id} className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-[11px] font-medium bg-purple-100 text-purple-800 border border-purple-300">
                                                          <Building2 className="w-3 h-3 shrink-0 text-purple-500" />
                                                          <button
                                                            type="button"
                                                            onClick={() => window.open(`/admin/properties/previews?id=${p.id}`, "_blank")}
                                                            className="hover:underline font-semibold max-w-[130px] truncate text-left leading-none"
                                                            title={`Open ${p.title} listing`}
                                                          >
                                                            {p.title}
                                                          </button>
                                                          {p.regionName && <span className="text-purple-400 text-[10px]">· {p.regionName}</span>}
                                                          <button
                                                            type="button"
                                                            onClick={() => unlinkProperty(opt.id, p.id)}
                                                            className="ml-0.5 w-4 h-4 shrink-0 flex items-center justify-center rounded-full hover:bg-red-100 text-purple-400 hover:text-red-500 text-sm leading-none"
                                                            title="Remove"
                                                          ><X className="w-2.5 h-2.5" /></button>
                                                        </span>
                                                      ))}
                                                    </div>
                                                  )}
                                                  {/* Search input */}
                                                  <div className="relative">
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 border-2 border-purple-200 rounded-lg focus-within:ring-2 focus-within:ring-purple-400">
                                                      <Search className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                                      <input
                                                        type="text"
                                                        value={propSearch?.optId === opt.id ? propSearch.query : ""}
                                                        onChange={e => searchApprovedProperties(opt.id, e.target.value)}
                                                        onFocus={() => { if (!propSearch || propSearch.optId !== opt.id) setPropSearch({ optId: opt.id, query: "", results: [], loading: false }); }}
                                                        placeholder="Search approved properties to link..."
                                                        className="flex-1 min-w-0 bg-transparent text-xs outline-none placeholder-purple-300 text-purple-900"
                                                      />
                                                      {propSearch?.optId === opt.id && propSearch.loading && <Loader2 className="w-3 h-3 text-purple-400 animate-spin shrink-0" />}
                                                      {propSearch?.optId === opt.id && propSearch.query && !propSearch.loading && (
                                                        <button type="button" onClick={() => setPropSearch(null)} className="shrink-0 text-purple-300 hover:text-purple-600"><X className="w-3 h-3" /></button>
                                                      )}
                                                    </div>
                                                    {propSearch?.optId === opt.id && (propSearch.results.length > 0 || (propSearch.query && !propSearch.loading)) && (
                                                      <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-purple-200 rounded-xl shadow-2xl overflow-hidden">
                                                        {propSearch.results.length === 0 ? (
                                                          <div className="px-3 py-2.5 text-[11px] text-gray-400 italic">No approved properties found — describe it manually in the field below.</div>
                                                        ) : (
                                                          <div className="max-h-44 overflow-y-auto divide-y divide-gray-100">
                                                            {propSearch.results.map((p) => {
                                                              const alreadyLinked = opt.linkedProperties?.some(lp => lp.id === p.id);
                                                              return (
                                                                <button
                                                                  key={p.id}
                                                                  type="button"
                                                                  disabled={alreadyLinked}
                                                                  onClick={() => { linkProperty(opt.id, p); setPropSearch(null); }}
                                                                  className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors ${
                                                                    alreadyLinked ? "opacity-50 cursor-default bg-gray-50" : "hover:bg-purple-50 cursor-pointer"
                                                                  }`}
                                                                >
                                                                  <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                                                                  <div className="min-w-0 flex-1">
                                                                    <p className="text-xs font-semibold text-gray-800 truncate">{p.title}</p>
                                                                    <p className="text-[10px] text-gray-400">{[p.type, p.regionName].filter(Boolean).join(" · ")}{alreadyLinked ? " — already linked" : ""}</p>
                                                                  </div>
                                                                  {!alreadyLinked && <span className="shrink-0 text-[10px] text-purple-500 font-medium self-center">Link</span>}
                                                                </button>
                                                              );
                                                            })}
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                              <textarea
                                                rows={2}
                                                value={opt.inclusionDetails?.[cat.id] || ""}
                                                onChange={e => updateInclusionDetail(opt.id, cat.id, e.target.value)}
                                                placeholder={cat.placeholder}
                                                className="w-full max-w-full box-border px-3 py-2 border-2 border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white"
                                              />
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="mt-3">
                                    <p className="text-[10px] text-gray-400 mb-1">Custom item not listed? Type and press Enter:</p>
                                    <input
                                      type="text"
                                      value={opt.customInclusion}
                                      onChange={e => updateItineraryOption(opt.id, "customInclusion", e.target.value)}
                                      onKeyDown={e => { if (e.key === "Enter") { addCustomInclusion(opt.id); e.preventDefault(); } }}
                                      placeholder="e.g. Traditional Maasai Welcome Ceremony + Enter"
                                      className="w-full max-w-full box-border px-3 py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                    {opt.inclusions.filter(i => !INCLUSION_CATEGORIES.flatMap(c => c.options).includes(i)).length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {opt.inclusions.filter(i => !INCLUSION_CATEGORIES.flatMap(c => c.options).includes(i)).map(item => (
                                          <span key={item} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-300">
                                            {item}
                                            <button type="button" onClick={() => toggleInclusion(opt.id, item)} className="text-gray-400 hover:text-red-500 leading-none ml-0.5">&times;</button>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Day outline */}
                                <div className="px-4 pb-4 overflow-hidden">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                                    Day-by-Day Outline <span className="font-normal text-gray-400 normal-case">(optional)</span>
                                  </label>
                                  <textarea
                                    value={opt.dayOutline}
                                    onChange={e => updateItineraryOption(opt.id, "dayOutline", e.target.value)}
                                    rows={3}
                                    className="w-full min-w-0 max-w-full box-border px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    placeholder="Day 1: Arrive Arusha, transfer to lodge..."
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Permits & Documents */}
                    {activeSections.has("permits") && (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                        <div className="p-5">
                          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4">
                            <span className="inline-flex h-7 w-7 rounded-md bg-amber-50 border border-amber-100 items-center justify-center">
                              <FileText className="h-4 w-4 text-amber-600" />
                            </span>
                            Required Permits &amp; Documents
                          </h3>
                          <p className="text-xs text-gray-500 mb-3">Click items to add them to the checklist</p>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {getPermitPresets(selectedRequest.tripType).map(item => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => togglePermit(item)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                  selectedPermits.includes(item)
                                    ? "bg-amber-100 text-amber-800 border-amber-300"
                                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-300"
                                }`}
                              >
                                {selectedPermits.includes(item) ? "✓ " : ""}{item}
                              </button>
                            ))}
                          </div>

                          {selectedPermits.length > 0 && (
                            <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 mb-2">
                                Checklist ({selectedPermits.length} items)
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {selectedPermits.map(p => (
                                  <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-medium">
                                    {p}
                                    <button
                                      onClick={() => togglePermit(p)}
                                      className="text-amber-500 hover:text-amber-700 ml-0.5 leading-none"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    {activeSections.has("timeline") && (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full">
                        <div className="h-1 bg-gradient-to-r from-teal-400 to-cyan-500" />
                        <div className="p-4">
                          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
                            <span className="inline-flex h-7 w-7 shrink-0 rounded-md bg-teal-50 border border-teal-100 items-center justify-center">
                              <Calendar className="h-4 w-4 text-teal-600" />
                            </span>
                            Estimated Timeline &amp; Booking Windows
                          </h3>

                          {/* Preset chips */}
                          <p className="text-[11px] text-gray-400 mb-2">Quick presets — tap to apply</p>
                          <div className="flex flex-wrap gap-2 mb-5">
                            {TIMELINE_PRESETS.map(preset => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => setResponseForm(prev => ({ ...prev, estimatedTimeline: preset.value }))}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                  responseForm.estimatedTimeline === preset.value
                                    ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                                    : "bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-700"
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>

                          {/* Payment term cards */}
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Payment Terms</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                            {/* Card 1 */}
                            <div className="flex flex-col gap-1.5 bg-teal-50 border border-teal-100 rounded-xl p-3 w-full">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-500">Confirm within</span>
                              <div className="flex items-baseline gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  placeholder="14"
                                  className="w-full box-border px-3 py-2 bg-white border border-teal-200 rounded-lg text-sm font-bold text-teal-700 text-center focus:ring-2 focus:ring-teal-400 outline-none"
                                  onChange={e => {
                                    const v = e.target.value;
                                    if (!v) return;
                                    setResponseForm(prev => ({
                                      ...prev,
                                      estimatedTimeline: prev.estimatedTimeline.replace(/Booking confirmation required within \d+ days?\.?/, `Booking confirmation required within ${v} days.`).trim() || `Booking confirmation required within ${v} days.`,
                                    }));
                                  }}
                                />
                              </div>
                              <span className="text-[11px] text-teal-400 text-center">days</span>
                            </div>
                            {/* Card 2 */}
                            <div className="flex flex-col gap-1.5 bg-cyan-50 border border-cyan-100 rounded-xl p-3 w-full">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500">Deposit</span>
                              <div className="flex items-baseline gap-1.5">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  placeholder="50"
                                  className="w-full box-border px-3 py-2 bg-white border border-cyan-200 rounded-lg text-sm font-bold text-cyan-700 text-center focus:ring-2 focus:ring-cyan-400 outline-none"
                                  onChange={e => {
                                    const v = e.target.value;
                                    if (!v) return;
                                    setResponseForm(prev => ({
                                      ...prev,
                                      estimatedTimeline: prev.estimatedTimeline.replace(/\d+% deposit[^,\.]*/, `${v}% deposit on booking`).trim() || `${v}% deposit on booking.`,
                                    }));
                                  }}
                                />
                              </div>
                              <span className="text-[11px] text-cyan-400 text-center">% on booking</span>
                            </div>
                            {/* Card 3 */}
                            <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-3 w-full">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Balance due</span>
                              <div className="flex items-baseline gap-1.5">
                                <input
                                  type="number"
                                  min={1}
                                  placeholder="7"
                                  className="w-full box-border px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 text-center focus:ring-2 focus:ring-slate-400 outline-none"
                                  onChange={e => {
                                    const v = e.target.value;
                                    if (!v) return;
                                    setResponseForm(prev => ({
                                      ...prev,
                                      estimatedTimeline: prev.estimatedTimeline.replace(/balance \d+ days before departure/, `balance ${v} days before departure`).trim() || `Balance due ${v} days before departure.`,
                                    }));
                                  }}
                                />
                              </div>
                              <span className="text-[11px] text-slate-400 text-center">days before departure</span>
                            </div>
                          </div>

                          {/* Live summary */}
                          {responseForm.estimatedTimeline && (
                            <div className="mt-3 flex items-start gap-2 bg-teal-50 border border-teal-100 rounded-xl px-3 py-2.5 w-full overflow-hidden">
                              <Clock className="h-3.5 w-3.5 text-teal-500 mt-0.5 shrink-0" />
                              <p className="text-[11px] text-teal-700 leading-relaxed break-words min-w-0">
                                {responseForm.estimatedTimeline}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Trip-type specific section */}
                    {activeSections.has("tripSpecific") && (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="h-1 bg-gradient-to-r from-purple-400 to-violet-500" />
                        <div className="p-5">
                          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-3">
                            <span className="inline-flex h-7 w-7 rounded-md bg-purple-50 border border-purple-100 items-center justify-center">
                              <MapPin className="h-4 w-4 text-purple-600" />
                            </span>
                            {getTripSpecificLabel(selectedRequest.tripType)}
                          </h3>
                          <textarea
                            value={tripSpecificNotes}
                            onChange={e => setTripSpecificNotes(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-y"
                            placeholder={getTripSpecificPlaceholder(selectedRequest.tripType)}
                          />
                        </div>
                      </div>
                    )}

                    {/* Trip Cost Summary */}
                    {activeSections.has("agent") && (() => {
                      const groupSize = Number(selectedRequest?.groupSize) || 0;
                      const pricedOptions = itineraryOptions.filter(opt => {
                        const base = Number(String(opt.pricePerPerson).replace(/[^0-9.]/g, "")) || 0;
                        const fees = Object.values(opt.feeAmounts || {}).reduce((s, v) => s + (Number(String(v).replace(/[^0-9.]/g, "")) || 0), 0);
                        return base > 0 || fees > 0;
                      });
                      if (pricedOptions.length === 0) return null;
                      const fmt = (n: number) => `TZS ${n.toLocaleString()}`;
                      return (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                          <div className="p-5">
                            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4">
                              <span className="inline-flex h-7 w-7 rounded-md bg-emerald-50 border border-emerald-100 items-center justify-center">
                                <BarChart3 className="h-4 w-4 text-emerald-600" />
                              </span>
                              Trip Cost Summary
                              {groupSize > 0 && (
                                <span className="ml-auto text-[11px] font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {groupSize} {groupSize === 1 ? "person" : "people"}
                                </span>
                              )}
                            </h3>
                            <div className="space-y-3">
                              {pricedOptions.map((opt, idx) => {
                                const priceCleaned = Number(String(opt.pricePerPerson).replace(/[^0-9.]/g, "")) || 0;
                                const nights = Number(opt.days) || 0;
                                const basePerPerson = opt.priceMode === "night" ? priceCleaned * nights : priceCleaned;
                                const feeItems = Object.entries(opt.feeAmounts || {}).filter(([, v]) => (Number(String(v).replace(/[^0-9.]/g, "")) || 0) > 0);
                                const feesPerPerson = feeItems.reduce((s, [, v]) => s + (Number(String(v).replace(/[^0-9.]/g, "")) || 0), 0);
                                const perPersonTotal = basePerPerson + feesPerPerson;
                                const groupTotal = perPersonTotal * groupSize;
                                return (
                                  <div key={opt.id} className="rounded-xl border border-gray-200 overflow-hidden">
                                    {/* Option header */}
                                    <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                      <div className="flex items-center gap-2">
                                        <span className="inline-flex h-5 w-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold items-center justify-center shrink-0">{idx + 1}</span>
                                        <span className="text-sm font-bold text-gray-800 truncate">{opt.name}</span>
                                      </div>
                                      <span className="text-[11px] font-medium text-gray-500 shrink-0 ml-2">{nights} {nights === 1 ? "night" : "nights"}</span>
                                    </div>
                                    <div className="px-4 py-3 space-y-2">
                                      {/* Base rate row */}
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-500">
                                          {opt.priceMode === "night"
                                            ? `Base rate (${fmt(priceCleaned)} × ${nights} nights)`
                                            : "Base rate (full stay)"}
                                        </span>
                                        <span className="font-semibold text-gray-800">{fmt(basePerPerson)} <span className="font-normal text-gray-400">/person</span></span>
                                      </div>
                                      {/* Fee rows */}
                                      {feeItems.map(([name, val]) => {
                                        const amt = Number(String(val).replace(/[^0-9.]/g, "")) || 0;
                                        return (
                                          <div key={name} className="flex items-center justify-between text-xs">
                                            <span className="text-amber-700 flex items-center gap-1">
                                              <Ticket className="h-3 w-3 shrink-0" />{name}
                                            </span>
                                            <span className="font-semibold text-amber-700">{fmt(amt)} <span className="font-normal text-amber-400">/person</span></span>
                                          </div>
                                        );
                                      })}
                                      {/* Divider + per-person total */}
                                      <div className="border-t border-dashed border-gray-200 pt-2 flex items-center justify-between text-xs">
                                        <span className="font-semibold text-gray-700">Total per person</span>
                                        <span className="font-bold text-gray-900">{fmt(perPersonTotal)}</span>
                                      </div>
                                      {/* Group total highlight */}
                                      {groupSize > 0 && (
                                        <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 px-3 py-2 flex items-center justify-between">
                                          <span className="text-xs font-bold text-emerald-800">Total for {groupSize} {groupSize === 1 ? "person" : "people"}</span>
                                          <span className="text-sm font-black text-emerald-700">{fmt(groupTotal)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                              {/* Grand total across all options */}
                              {pricedOptions.length > 1 && groupSize > 0 && (
                                <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 flex items-center justify-between shadow-sm mt-1">
                                  <div>
                                    <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider">Grand Total — All Options Combined</p>
                                    <p className="text-[11px] text-indigo-100 mt-0.5">{pricedOptions.length} options × {groupSize} {groupSize === 1 ? "person" : "people"}</p>
                                  </div>
                                  <span className="text-lg font-black text-white">
                                    {fmt(pricedOptions.reduce((sum, opt) => {
                                      const base = opt.priceMode === "night"
                                        ? (Number(String(opt.pricePerPerson).replace(/[^0-9.]/g, "")) || 0) * (Number(opt.days) || 0)
                                        : (Number(String(opt.pricePerPerson).replace(/[^0-9.]/g, "")) || 0);
                                      const fees = Object.values(opt.feeAmounts || {}).reduce((s, v) => s + (Number(String(v).replace(/[^0-9.]/g, "")) || 0), 0);
                                      return sum + (base + fees) * groupSize;
                                    }, 0))}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Assign Agent */}
                    {activeSections.has("agent") && (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-hidden overflow-y-visible">
                        <div className="h-1 bg-gradient-to-r from-indigo-400 to-blue-500" />
                        <div className="p-5 overflow-x-hidden overflow-y-visible">
                          <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2 mb-4">
                            <span className="inline-flex h-7 w-7 rounded-md bg-indigo-50 border border-indigo-100 items-center justify-center">
                              <User className="h-4 w-4 text-indigo-600" />
                            </span>
                            Assign Agent
                          </h3>
                          <div className="w-full relative" ref={agentDropdownRef}>
                            <div className="relative">
                              <input
                                type="text"
                                value={agentSearchQuery || responseForm.assignedAgent || ""}
                                onChange={(e) => {
                                  setAgentSearchQuery(e.target.value);
                                  setShowAgentDropdown(true);
                                  if (e.target.value) { loadAgents(e.target.value); } else { loadAgents(); }
                                }}
                                onFocus={() => { setShowAgentDropdown(true); if (agents.length === 0) loadAgents(); }}
                                className="w-full max-w-full box-border pl-4 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm bg-white placeholder:text-gray-400"
                                placeholder="Search and select an agent..."
                              />
                              <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 transition-transform ${showAgentDropdown ? "rotate-180" : ""}`} />
                            </div>
                            {showAgentDropdown && (
                              <div className="relative z-50 w-full mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto">
                                {agentsLoading ? (
                                  <div className="p-4 text-center text-sm text-gray-500">Loading agents...</div>
                                ) : agents.length === 0 ? (
                                  <div className="p-4 text-center text-sm text-gray-500">No agents found. Try a different search.</div>
                                ) : (
                                  <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {agents.map((agent) => {
                                      const name = agent.user?.name || "N/A";
                                      const email = agent.user?.email || "";
                                      const initials = String(name).split(" ").filter(Boolean).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join("") || "A";
                                      const { avg, totalReviews } = getAgentRatingSummary(agent);
                                      const selected = Number(responseForm.assignedAgentId) === Number(agent.id);
                                      const capClass = agent.currentActiveRequests >= agent.maxActiveRequests ? "bg-red-100 text-red-700" : agent.currentActiveRequests >= agent.maxActiveRequests * 0.8 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700";
                                      return (
                                        <button
                                          key={agent.id}
                                          type="button"
                                          onClick={() => handleSelectAgent(agent)}
                                          className={`group w-full text-left rounded-xl border p-3 transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${selected ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
                                        >
                                          <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center">{initials}</div>
                                                <div className="min-w-0">
                                                  <div className="font-semibold text-gray-900 truncate text-sm">{name}</div>
                                                  <div className="text-xs text-gray-500 truncate">{email}</div>
                                                </div>
                                              </div>
                                              <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                                                {agent.yearsOfExperience ? <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">{agent.yearsOfExperience} yrs exp.</span> : null}
                                                {Array.isArray(agent.areasOfOperation) && agent.areasOfOperation.length > 0 ? <span className="rounded-md bg-gray-100 px-2 py-0.5 text-gray-700">{agent.areasOfOperation.slice(0, 2).join(", ")}</span> : null}
                                              </div>
                                            </div>
                                            <div className="shrink-0 flex flex-col items-end gap-1">
                                              <div className={`text-xs px-2 py-0.5 rounded-md font-semibold ${capClass}`}>{agent.currentActiveRequests}/{agent.maxActiveRequests}</div>
                                              <div className="flex items-center gap-1">{renderStars(avg)}<span className="text-xs text-gray-700 font-semibold">{typeof avg === "number" ? avg.toFixed(1) : "-"}{typeof totalReviews === "number" ? ` (${totalReviews})` : ""}</span></div>
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {responseForm.assignedAgentId && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-gray-500">Selected: <span className="font-semibold text-gray-900">{responseForm.assignedAgent}</span></span>
                              <button type="button" onClick={() => { setResponseForm({ ...responseForm, assignedAgentId: null, assignedAgent: "" }); setAgentSearchQuery(""); }} className="text-xs text-red-500 hover:text-red-700 underline">Clear</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ── View completed response — A4 Premium Report ── */}
                {selectedRequest.status === "COMPLETED" && (() => {
                  // ── Parse itinerary text into option blocks ──────────────
                  const parseOptions = (raw: string) => {
                    const blocks = raw.split(/(?=^===\s)/m).filter(s => s.trim());
                    return blocks.map(block => {
                      const lines = block.split("\n");
                      const nameLine = lines[0] ?? "";
                      const name = nameLine.replace(/^===\s*/, "").replace(/\s*===\s*$/, "").trim();
                      const pricingLines: string[] = [];
                      const inclusionLines: string[] = [];
                      const itineraryLines: string[] = [];
                      let section: "pricing" | "inclusions" | "itinerary" = "pricing";
                      for (let i = 1; i < lines.length; i++) {
                        const l = lines[i];
                        if (/^---\s*WHAT[''&#x27;]?S INCLUDED/i.test(l) || /^---\s*WHAT/i.test(l)) { section = "inclusions"; continue; }
                        if (/^Itinerary:/i.test(l)) { section = "itinerary"; continue; }
                        if (section === "pricing" && l.trim()) pricingLines.push(l.trim());
                        if (section === "inclusions") inclusionLines.push(l);
                        if (section === "itinerary") itineraryLines.push(l);
                      }
                      // Parse inclusion categories
                      const inclCats: { label: string; items: string; details: string[] }[] = [];
                      let currentCat: { label: string; items: string; details: string[] } | null = null;
                      for (const l of inclusionLines) {
                        if (!l.trim()) continue;
                        if (/^\s{2,}/.test(l)) {
                          currentCat?.details.push(l.trim());
                        } else {
                          const m = l.match(/^(.+?):\s*(.*)$/);
                          if (m) {
                            currentCat = { label: m[1].trim(), items: m[2].trim(), details: [] };
                            inclCats.push(currentCat);
                          }
                        }
                      }
                      return { name, pricingLines, inclCats, itineraryLines: itineraryLines.filter(l => l.trim()) };
                    });
                  };

                  const options = parseOptions(selectedRequest.suggestedItineraries || "");
                  const permits = (selectedRequest.requiredPermits || "").split("\n").map(l => l.replace(/^\d+\.\s*/, "").trim()).filter(Boolean);
                  const sentDate = selectedRequest.respondedAt
                    ? new Date(selectedRequest.respondedAt).toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" })
                    : new Date().toLocaleDateString("en-GB", { day:"numeric", month:"long", year:"numeric" });
                  const fmtRequestDate = (d: string | null) => d ? new Date(d).toLocaleDateString("en-GB", { day:"numeric", month:"short", year:"numeric" }) : null;

                  return (
                    <div className="space-y-3">
                      {/* Preview label */}
                      <div className="flex items-center gap-2 px-1">
                        <Eye className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Trip Planning Report — sent {sentDate}</span>
                        <span className="ml-auto text-[10px] text-gray-400">A4 Preview</span>
                      </div>

                      {/* ════ A4 PAPER ════ */}
                      <div
                        className="mx-auto bg-white shadow-2xl border border-gray-200 rounded-sm overflow-hidden"
                        style={{ maxWidth: 794, minHeight: 400, fontFamily: "'Inter', 'Segoe UI', sans-serif" }}
                      >
                        {/* ── Company Header — NoLSAF Revenue Visa Card style ── */}
                        <div
                          className="relative overflow-hidden"
                          style={{
                            background: "linear-gradient(135deg, #0e2a7a 0%, #0a5c82 38%, #02665e 100%)",
                            minHeight: 110,
                            boxShadow: "0 8px 32px -8px rgba(2,102,94,0.45), 0 2px 12px -4px rgba(14,42,122,0.40)",
                          }}
                        >
                          {/* Decorative SVG — arcs + sparkline + NFC (same as revenue card) */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 794 110" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                            {/* Big arcs top-right */}
                            <circle cx="760" cy="28"  r="160" stroke="white" strokeOpacity="0.07" strokeWidth="1" fill="none" />
                            <circle cx="760" cy="28"  r="118" stroke="white" strokeOpacity="0.06" strokeWidth="1" fill="none" />
                            <circle cx="725" cy="8"   r="90"  stroke="white" strokeOpacity="0.05" strokeWidth="1" fill="none" />
                            {/* Bottom-left arc */}
                            <circle cx="18"  cy="98"  r="90"  stroke="white" strokeOpacity="0.05" strokeWidth="1" fill="none" />
                            {/* Sparkline wave */}
                            <polyline
                              points="0,95 80,78 160,86 240,64 320,72 400,52 480,60 560,40 640,50 720,30 794,38"
                              stroke="white" strokeOpacity="0.14" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"
                            />
                            <polygon
                              points="0,95 80,78 160,86 240,64 320,72 400,52 480,60 560,40 640,50 720,30 794,38 794,110 0,110"
                              fill="white" fillOpacity="0.025"
                            />
                            {/* Sparkline dots */}
                            {([[80,78],[240,64],[400,52],[560,40],[720,30]] as [number,number][]).map(([cx,cy],i) => (
                              <circle key={i} cx={cx} cy={cy} r="2.5" fill="white" fillOpacity="0.22" />
                            ))}
                            {/* NFC arcs — top right */}
                            <path d="M757 12 Q768 28 757 44" stroke="white" strokeOpacity="0.55" strokeWidth="2" fill="none" strokeLinecap="round" />
                            <path d="M750 6  Q767 28 750 50" stroke="white" strokeOpacity="0.30" strokeWidth="2" fill="none" strokeLinecap="round" />
                            <path d="M743 0  Q766 28 743 56" stroke="white" strokeOpacity="0.15" strokeWidth="2" fill="none" strokeLinecap="round" />
                          </svg>

                          {/* Top sheen */}
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />

                          {/* Card content */}
                          <div className="relative px-8 py-5 flex items-center justify-between gap-6">
                            {/* Left: logo + brand */}
                            <div className="flex items-center gap-4 min-w-0">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src="/assets/NoLS2025-04.png"
                                alt="NoLSAF"
                                className="w-14 h-14 object-contain flex-shrink-0 drop-shadow"
                              />
                              <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/50">NoLSAF</p>
                                <div className="text-white font-black text-[17px] tracking-tight leading-tight">NoLS Africa Inc</div>
                                <div className="text-[11px] font-bold text-teal-300 mt-0.5 tracking-wide">Quality Stay For Every Wallet</div>
                                <div className="text-[10px] text-white/40 mt-0.5">P.O BOX 23091 · Dar es Salaam, Tanzania</div>
                              </div>
                            </div>

                            {/* Center: EMV chip */}
                            <svg width="36" height="28" viewBox="0 0 38 30" fill="none" className="opacity-75 flex-shrink-0 hidden sm:block" aria-hidden="true">
                              <rect x="1" y="1" width="36" height="28" rx="4" fill="#c8a84b" stroke="#a07830" strokeWidth="0.8" />
                              <rect x="1" y="10" width="36" height="10" fill="#b8983a" />
                              <rect x="13" y="1" width="12" height="28" fill="#b8983a" />
                              <rect x="13" y="10" width="12" height="10" fill="#a07830" />
                              <rect x="1" y="10" width="36" height="0.8" fill="#8a6820" />
                              <rect x="1" y="19.2" width="36" height="0.8" fill="#8a6820" />
                              <rect x="13" y="1" width="0.8" height="28" fill="#8a6820" />
                              <rect x="24.2" y="1" width="0.8" height="28" fill="#8a6820" />
                            </svg>

                            {/* Right: contact + dual circles */}
                            <div className="flex items-center gap-5 flex-shrink-0">
                              <div className="space-y-1.5 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Mail className="w-3 h-3 text-teal-300 flex-shrink-0" />
                                  <span className="text-[11px] text-white/75">sales@nolsaf.com</span>
                                </div>
                                <div className="flex items-center justify-end gap-1.5">
                                  <MapPin className="w-3 h-3 text-teal-300 flex-shrink-0" />
                                  <span className="text-[11px] text-white/75">Dar es Salaam, Tanzania</span>
                                </div>
                                <div className="flex items-center justify-end gap-1.5">
                                  <Printer className="w-3 h-3 text-teal-300 flex-shrink-0" />
                                  <span className="text-[11px] text-white/75">Fax: +255 736 766 726</span>
                                </div>
                              </div>
                              {/* Mastercard-style dual circles */}
                              <div className="-space-x-3 flex-shrink-0 hidden sm:flex">
                                <div className="w-9 h-9 rounded-full" style={{ background: "radial-gradient(circle at 38% 38%, #2563eb, #0e2a7a)", opacity: 0.9 }} />
                                <div className="w-9 h-9 rounded-full" style={{ background: "radial-gradient(circle at 62% 38%, #02665e, #013f3a)", opacity: 0.8 }} />
                              </div>
                            </div>
                          </div>

                          {/* Bottom separator sheen */}
                          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
                        </div>

                        {/* ── Report Title Band ── */}
                        <div className="px-8 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/60 to-teal-50/40">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-widest text-teal-600 mb-1">Official Trip Planning Feedback Report</div>
                              <h1 className="text-xl font-black text-gray-900 leading-tight">
                                Dear {selectedRequest.customer.name},
                              </h1>
                              <p className="text-sm text-gray-500 mt-0.5">Prepared exclusively for your upcoming {selectedRequest.tripType} experience</p>
                            </div>
                            <div className="flex-shrink-0 text-right space-y-1">
                              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Ref No.</div>
                              <div className="text-sm font-bold text-indigo-700 font-mono">NLS-{String(selectedRequest.id).padStart(5,"0")}</div>
                              <div className="text-[10px] text-gray-400">{sentDate}</div>
                            </div>
                          </div>
                          {/* Customer contact row */}
                          <div className="mt-3 pt-3 border-t border-blue-100 flex flex-wrap gap-x-5 gap-y-1">
                            {[
                              { l: "Email", v: selectedRequest.customer.email },
                              { l: "Phone", v: selectedRequest.customer.phone || "—" },
                              { l: "Role", v: selectedRequest.role },
                            ].map(c => (
                              <div key={c.l} className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{c.l}:</span>
                                <span className="text-xs font-semibold text-gray-700">{c.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ── Intro / Opening Statement ── */}
                        <div className="px-8 py-5 border-b border-gray-100">
                          <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-xl border border-teal-100 px-5 py-4">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-1 h-4 bg-teal-500 rounded-full" />
                              <span className="text-[10px] font-black uppercase tracking-widest text-teal-700">A Message from NoLSAF</span>
                            </div>
                            <p className="text-sm text-gray-800 leading-relaxed font-medium">
                              Every journey you take is a story waiting to be told. At <strong>NoLSAF</strong>, we don&apos;t just plan trips we craft experiences that stay with you long after you return home.
                            </p>
                            <p className="text-sm text-gray-600 leading-relaxed mt-2">
                              This proposal was built around <strong>you</strong>. Review it, dream about it then let&apos;s make it real.
                            </p>
                          </div>
                        </div>

                        {/* ── Section 1: Request Summary ── */}
                        <div className="px-8 py-6 border-b border-gray-100">
                          {/* Section header */}
                          <div className="flex items-center gap-3 mb-5">
                            <div className="flex items-center justify-center w-7 h-7 rounded-full text-white text-[11px] font-black flex-shrink-0" style={{ background:"linear-gradient(135deg,#0e2a7a,#0a5c82)" }}>1</div>
                            <span className="text-[11px] font-black text-gray-900 uppercase tracking-[0.18em]">Your Request Summary</span>
                            <div className="flex-1 h-px" style={{ background:"linear-gradient(90deg,#0a5c82 0%,transparent 100%)" }} />
                          </div>

                          {/* Row 1 — Trip Type · Group Size · Budget */}
                          <div className="grid grid-cols-3 gap-3 mb-3">
                            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:"linear-gradient(135deg,#dbeafe,#eff6ff)" }}>
                                <Plane className="w-4 h-4 text-blue-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Trip Type</div>
                                <div className="text-[13px] font-black text-gray-900 mt-0.5 leading-tight truncate">{selectedRequest.tripType}</div>
                              </div>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:"linear-gradient(135deg,#cffafe,#ecfeff)" }}>
                                <Users className="w-4 h-4 text-cyan-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Group Size</div>
                                <div className="text-[13px] font-black text-gray-900 mt-0.5 leading-tight">{selectedRequest.groupSize ? `${selectedRequest.groupSize} ${Number(selectedRequest.groupSize)===1?"person":"people"}` : "—"}</div>
                              </div>
                            </div>
                            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:"linear-gradient(135deg,#d1fae5,#ecfdf5)" }}>
                                <Target className="w-4 h-4 text-emerald-600" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Budget</div>
                                <div className="text-[13px] font-black text-gray-900 mt-0.5 leading-tight">{selectedRequest.budget ? `TZS ${Number(selectedRequest.budget).toLocaleString()}` : "Not specified"}</div>
                              </div>
                            </div>
                          </div>

                          {/* Row 2 — Transport · Travel Window */}
                          <div className={`grid gap-3 mb-3 ${selectedRequest.dateFrom && selectedRequest.dateTo ? "grid-cols-2" : "grid-cols-1 max-w-xs"}`}>
                            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: selectedRequest.transportRequired ? "linear-gradient(135deg,#ffedd5,#fff7ed)" : "linear-gradient(135deg,#f3f4f6,#f9fafb)" }}>
                                <Car className={`w-4 h-4 ${selectedRequest.transportRequired ? "text-orange-500" : "text-gray-400"}`} />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Transport</div>
                                <div className={`text-[13px] font-black mt-0.5 leading-tight ${selectedRequest.transportRequired ? "text-orange-600" : "text-gray-500"}`}>{selectedRequest.transportRequired ? "Required" : "Not required"}</div>
                              </div>
                            </div>
                            {selectedRequest.dateFrom && selectedRequest.dateTo && (
                              <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 flex items-center gap-3 shadow-sm">
                                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background:"linear-gradient(135deg,#ede9fe,#f5f3ff)" }}>
                                  <Calendar className="w-4 h-4 text-violet-600" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Travel Window</div>
                                  <div className="text-[13px] font-black text-gray-900 mt-0.5 leading-tight">{fmtRequestDate(selectedRequest.dateFrom)} – {fmtRequestDate(selectedRequest.dateTo)}</div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Full-width Destination(s) */}
                          {selectedRequest.destinations && (() => {
                            // Parse "1) Name — 6 nights 2) Name — 6 nights" into structured stops
                            const raw = selectedRequest.destinations;
                            const stops: { name: string; nights: string | null }[] = [];
                            const parts = raw.split(/(?=\d+\))/);
                            parts.forEach(p => {
                              const m = p.match(/^\d+\)\s*(.+?)(?:\s*[—–-]+\s*(\d+\s*nights?))?\s*$/i);
                              if (m) stops.push({ name: m[1].trim(), nights: m[2] ? m[2].trim() : null });
                            });
                            const items = stops.length > 0 ? stops : [{ name: raw, nights: null }];
                            return (
                              <div className="rounded-xl border border-teal-200 overflow-hidden shadow-sm mb-3">
                                {/* Header */}
                                <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "linear-gradient(90deg,#0e2a7a,#0a5c82)" }}>
                                  <MapPin className="w-3.5 h-3.5 text-teal-300 flex-shrink-0" />
                                  <span className="text-[9px] font-black uppercase tracking-widest text-white">Destination{items.length > 1 ? `s · ${items.length} stops` : ""}</span>
                                </div>
                                {/* Stop rows */}
                                <div className="bg-white divide-y divide-teal-50">
                                  {items.map((stop, idx) => (
                                    <div key={idx} className="flex items-center gap-3 px-4 py-3">
                                      {/* Step number */}
                                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ background: "linear-gradient(135deg,#0a5c82,#02665e)" }}>
                                        {idx + 1}
                                      </div>
                                      {/* Name */}
                                      <span className="flex-1 text-[13px] font-bold text-gray-900 leading-snug">{stop.name}</span>
                                      {/* Nights badge */}
                                      {stop.nights && (
                                        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black text-teal-700 border border-teal-200 bg-teal-50 flex-shrink-0 whitespace-nowrap">
                                          <Clock className="w-3 h-3" />
                                          {stop.nights}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Client Notes */}
                          {selectedRequest.notes?.trim() && (
                            <div className="rounded-xl border border-amber-200 overflow-hidden">
                              <div className="flex items-center gap-2 px-4 py-2" style={{ background:"linear-gradient(90deg,#f59e0b,#d97706)" }}>
                                <Star className="w-3 h-3 text-white flex-shrink-0" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-white">Client Notes</span>
                              </div>
                              <div className="bg-amber-50 px-4 py-3">
                                <p className="text-sm text-amber-900 leading-relaxed italic">&ldquo;{selectedRequest.notes}&rdquo;</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── Section 2: Itinerary Options ── */}
                        <div className="px-8 py-5 border-b border-gray-100">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center justify-center w-6 h-6 rounded-full text-white text-[11px] font-black" style={{ background:"linear-gradient(135deg,#0f766e,#0d9488)" }}>2</div>
                            <span className="text-sm font-black text-gray-900 uppercase tracking-wide">
                              {options.length > 1 ? `Proposed Itinerary Options (${options.length})` : "Proposed Itinerary"}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>

                          {options.length === 0 && selectedRequest.suggestedItineraries && (
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {selectedRequest.suggestedItineraries}
                            </div>
                          )}

                          <div className="space-y-5">
                            {options.map((opt, oi) => (
                              <div key={oi} className="rounded-2xl border border-gray-200 overflow-hidden shadow-md">

                                {/* ── Option header — visa card gradient ── */}
                                <div className="relative overflow-hidden flex items-center justify-between px-5 py-4" style={{ background:"linear-gradient(135deg,#0e2a7a 0%,#0a5c82 50%,#02665e 100%)" }}>
                                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 700 60" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                                    <circle cx="660" cy="10" r="80" stroke="white" strokeOpacity="0.07" strokeWidth="1" fill="none" />
                                    <circle cx="660" cy="10" r="55" stroke="white" strokeOpacity="0.05" strokeWidth="1" fill="none" />
                                    <polyline points="0,50 120,38 240,44 360,28 480,34 600,16 700,22" stroke="white" strokeOpacity="0.10" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                                  </svg>
                                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                                  <div className="relative flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/30 flex items-center justify-center text-white font-black text-base flex-shrink-0">
                                      {String.fromCharCode(65 + oi)}
                                    </div>
                                    <div>
                                      <div className="text-white font-black text-[15px] leading-tight">{opt.name || `Option ${String.fromCharCode(65+oi)}`}</div>
                                      {options.length > 1 && <div className="text-[9px] text-white/55 font-bold uppercase tracking-[0.2em] mt-0.5">Option {oi+1} of {options.length}</div>}
                                    </div>
                                  </div>
                                  {/* Dual circles */}
                                  <div className="relative hidden sm:flex -space-x-3 flex-shrink-0">
                                    <div className="w-7 h-7 rounded-full" style={{ background:"radial-gradient(circle at 38% 38%,#2563eb,#0e2a7a)", opacity:0.85 }} />
                                    <div className="w-7 h-7 rounded-full" style={{ background:"radial-gradient(circle at 62% 38%,#02665e,#013f3a)", opacity:0.75 }} />
                                  </div>
                                </div>

                                <div className="bg-gray-50/60 p-4 space-y-4">

                                  {/* ── Pricing card ── */}
                                  {opt.pricingLines.length > 0 && (() => {
                                    const rows = opt.pricingLines.map(l => {
                                      const colonIdx = l.lastIndexOf(":");
                                      const isTotal = /total for group/i.test(l);
                                      return { label: colonIdx > -1 ? l.slice(0, colonIdx).trim() : l.trim(), value: colonIdx > -1 ? l.slice(colonIdx+1).trim() : "", isTotal };
                                    });
                                    return (
                                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                                          <BarChart3 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                          <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600">Pricing Breakdown</span>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                          {rows.map((row, ri) => row.isTotal ? (
                                            <div key={ri} className="flex items-center justify-between px-4 py-3" style={{ background:"linear-gradient(90deg,#ecfdf5,#d1fae5)" }}>
                                              <span className="flex items-center gap-2 text-[12px] font-black text-emerald-800">
                                                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                                {row.label}
                                              </span>
                                              <span className="text-[14px] font-black text-emerald-700 tabular-nums">{row.value}</span>
                                            </div>
                                          ) : (
                                            <div key={ri} className="flex items-center justify-between px-4 py-2.5">
                                              <span className="text-[11px] text-gray-500">{row.label}</span>
                                              <span className="text-[12px] font-bold text-gray-800 tabular-nums">{row.value}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* ── Inclusions grid ── */}
                                  {opt.inclCats.length > 0 && (() => {
                                    // Per-category Lucide icon + colour map
                                    type CatCfg = { Icon: typeof Building2; bg: string; border: string; iconColor: string; labelColor: string };
                                    const catCfg: Record<string, CatCfg> = {
                                      accommodation: { Icon: Building2,  bg:"#eff6ff", border:"#bfdbfe", iconColor:"#3b82f6", labelColor:"#1d4ed8" },
                                      meal:          { Icon: Utensils,   bg:"#fef9c3", border:"#fde047", iconColor:"#ca8a04", labelColor:"#a16207" },
                                      food:          { Icon: Utensils,   bg:"#fef9c3", border:"#fde047", iconColor:"#ca8a04", labelColor:"#a16207" },
                                      transport:     { Icon: Car,        bg:"#fff7ed", border:"#fed7aa", iconColor:"#f97316", labelColor:"#c2410c" },
                                      guide:         { Icon: User,       bg:"#f0fdf4", border:"#bbf7d0", iconColor:"#22c55e", labelColor:"#15803d" },
                                      park:          { Icon: MapPin,     bg:"#f0fdfa", border:"#99f6e4", iconColor:"#14b8a6", labelColor:"#0f766e" },
                                      permit:        { Icon: FileText,   bg:"#fdf4ff", border:"#e9d5ff", iconColor:"#a855f7", labelColor:"#7e22ce" },
                                      activity:      { Icon: Target,     bg:"#fefce8", border:"#fef08a", iconColor:"#eab308", labelColor:"#a16207" },
                                      ticket:        { Icon: Ticket,     bg:"#fefce8", border:"#fef08a", iconColor:"#eab308", labelColor:"#a16207" },
                                    };
                                    const fallbackCfg: CatCfg = { Icon: Star, bg:"#f8fafc", border:"#e2e8f0", iconColor:"#94a3b8", labelColor:"#475569" };
                                    const getCfg = (lbl: string): CatCfg => {
                                      const key = Object.keys(catCfg).find(k => lbl.toLowerCase().includes(k));
                                      return key ? catCfg[key] : fallbackCfg;
                                    };
                                    return (
                                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                                          <Gift className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                                          <span className="text-[9px] font-black uppercase tracking-widest text-teal-700">What&apos;s Included</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
                                          {opt.inclCats.map((cat, ci) => {
                                            const cfg = getCfg(cat.label);
                                            const { Icon: CatIcon } = cfg;
                                            const catName = cat.label.replace(/^[\p{Emoji}\s]+/u,"").split(":")[0].trim();
                                            const linkedDetail = cat.details.find(d => /linked listings:/i.test(d));
                                            const otherDetails = cat.details.filter(d => !/linked listings:/i.test(d));
                                            return (
                                              <div key={ci} className="bg-white p-3.5 flex items-start gap-3">
                                                {/* Lucide icon bubble */}
                                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background:`linear-gradient(135deg,${cfg.bg},#fff)`, border:`1px solid ${cfg.border}` }}>
                                                  <CatIcon className="w-4 h-4" style={{ color: cfg.iconColor }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <div className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: cfg.labelColor }}>{catName}</div>
                                                  <div className="text-[12px] font-bold text-gray-900 leading-snug">{cat.items}</div>
                                                  {otherDetails.length > 0 && otherDetails.map((d,di) => (
                                                    <p key={di} className="text-[10px] text-gray-400 italic mt-0.5 leading-snug">{d}</p>
                                                  ))}
                                                  {linkedDetail && (
                                                    <div className="mt-1.5 inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">
                                                      <span className="text-[9px]">🔗</span>
                                                      <span className="text-[10px] font-bold text-teal-700 truncate">{linkedDetail.replace(/linked listings:\s*/i,"")}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* ── Day-by-day timeline ── */}
                                  {opt.itineraryLines.length > 0 && (() => {
                                    type DayBlock = { day: string; desc: string; notes: string[] };
                                    const days: DayBlock[] = [];
                                    opt.itineraryLines.forEach(l => {
                                      const m = l.match(/^(Day\s+\d+[:\-\s]?)/i);
                                      if (m) { days.push({ day: m[1].trim().replace(/[:–-]+$/, ""), desc: l.replace(m[0], "").trim(), notes: [] }); }
                                      else if (days.length > 0) { days[days.length - 1].notes.push(l); }
                                      else { days.push({ day: "", desc: l, notes: [] }); }
                                    });
                                    return (
                                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
                                          <Calendar className="w-3.5 h-3.5 text-violet-600 flex-shrink-0" />
                                          <span className="text-[9px] font-black uppercase tracking-widest text-violet-700">Day-by-Day Itinerary</span>
                                        </div>
                                        <div className="px-4 py-3 space-y-0">
                                          {days.map((d, di) => (
                                            <div key={di} className="flex gap-3 relative">
                                              {/* Connector line */}
                                              {di < days.length - 1 && (
                                                <div className="absolute left-[14px] top-7 bottom-0 w-px bg-gradient-to-b from-indigo-200 to-transparent z-0" />
                                              )}
                                              {/* Day badge */}
                                              <div className="flex-shrink-0 z-10 mt-1">
                                                {d.day ? (
                                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black flex-shrink-0" style={{ background:"linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                                                    {d.day.replace(/Day\s*/i,"").trim() || (di+1)}
                                                  </div>
                                                ) : (
                                                  <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background:"#f3f4f6" }}>
                                                    <span className="text-gray-400 text-[10px]">↳</span>
                                                  </div>
                                                )}
                                              </div>
                                              {/* Content */}
                                              <div className="flex-1 pb-3.5">
                                                {d.day && <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mb-0.5">{d.day}</div>}
                                                <p className="text-[12px] font-semibold text-gray-800 leading-snug">{d.desc}</p>
                                                {d.notes.map((n, ni) => (
                                                  <p key={ni} className="text-[10px] text-gray-400 italic mt-0.5 leading-snug">{n}</p>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    );
                                  })()}

                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* ── Section 3: Permits ── */}
                        {permits.length > 0 && (
                          <div className="px-8 py-5 border-b border-gray-100">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full text-white text-[11px] font-black" style={{ background:"linear-gradient(135deg,#d97706,#f59e0b)" }}>3</div>
                              <span className="text-sm font-black text-gray-900 uppercase tracking-wide">Required Permits &amp; Documents</span>
                              <div className="flex-1 h-px bg-gray-200" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {permits.map((p, i) => (
                                <div key={i} className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-[9px] font-black flex items-center justify-center">{i+1}</span>
                                  <span className="text-xs text-gray-700">{p}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* ── Section 4: Timeline ── */}
                        {selectedRequest.estimatedTimeline && (
                          <div className="px-8 py-5 border-b border-gray-100">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="flex items-center justify-center w-6 h-6 rounded-full text-white text-[11px] font-black" style={{ background:"linear-gradient(135deg,#0f766e,#14b8a6)" }}>{permits.length > 0 ? "4" : "3"}</div>
                              <span className="text-sm font-black text-gray-900 uppercase tracking-wide">Booking Timeline &amp; Payment Terms</span>
                              <div className="flex-1 h-px bg-gray-200" />
                            </div>
                            <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedRequest.estimatedTimeline}</p>
                            </div>
                          </div>
                        )}

                        {/* ── Assigned Agent ── */}
                        {selectedRequest.assignedAgent && (
                          <div className="px-8 py-5 border-b border-gray-100">
                            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                              <div className="w-9 h-9 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-800 font-black text-sm flex-shrink-0">
                                {(selectedRequest.assignedAgent).split(" ").map((w:string) => w[0]).join("").slice(0,2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Your Dedicated Travel Agent</div>
                                <div className="text-sm font-bold text-indigo-900">{selectedRequest.assignedAgent}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded-full px-2 py-0.5">✦ Top-Rated</span>
                                  <span className="text-[10px] text-indigo-500 font-semibold">Ranked by NoLSAF Intelligence Score™</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ── Footer — matching visa card gradient ── */}
                        <div
                          className="relative overflow-hidden px-8 py-4"
                          style={{ background: "linear-gradient(135deg, #0e2a7a 0%, #0a5c82 38%, #02665e 100%)" }}
                        >
                          {/* Top sheen */}
                          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />
                          {/* Faint sparkline echo */}
                          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 794 72" fill="none" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                            <polyline points="0,60 160,48 320,52 480,36 640,42 794,28" stroke="white" strokeOpacity="0.10" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                            <circle cx="680" cy="15" r="80" stroke="white" strokeOpacity="0.05" strokeWidth="1" fill="none" />
                          </svg>
                          <div className="relative flex items-center justify-between gap-4">
                            <div>
                              <div className="text-white font-black text-sm tracking-tight">NoLS Africa Inc</div>
                              <div className="text-teal-300 text-[10px] mt-0.5">Authorised Trip Planning Report · Ref NLS-{String(selectedRequest.id).padStart(5,"0")}</div>
                            </div>
                            <div className="text-center">
                              <span className="text-teal-300/80 text-[10px] italic font-semibold tracking-wide">&ldquo;Quality Stay For Every Wallet&rdquo;</span>
                            </div>
                            <div className="text-right">
                              <div className="text-white/60 text-[10px]">Issued: {sentDate}</div>
                              <div className="text-white/35 text-[9px] mt-0.5">Confidential · For named recipient only</div>
                            </div>
                          </div>
                          <div className="relative mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-3 text-[9px] text-white/35">
                            <span>sales@nolsaf.com</span>
                            <span>Dar es Salaam, Tanzania</span>
                            <span>Fax: +255 736 766 726</span>
                            <span className="ml-auto">© {new Date().getFullYear()} NoLS Africa Inc. · NoLSAF TripEngine™ · Precision-Crafted Travel Technology</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* ── Footer actions ── */}
              {selectedRequest.status !== "COMPLETED" && (
                <div className="flex-shrink-0 flex flex-col sm:flex-row justify-end gap-3 px-5 py-4 border-t border-gray-200 bg-white rounded-b-2xl">
                  <button
                    onClick={() => setShowResponseModal(false)}
                    className="w-full sm:w-auto px-5 py-2.5 border-2 border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAssignment}
                    disabled={assignmentSaving || !responseForm.assignedAgentId || Number(responseForm.assignedAgentId) === Number(selectedRequest.assignedAgentId ?? 0)}
                    className="w-full sm:w-auto px-5 py-2.5 border-2 border-blue-200 bg-blue-50 text-blue-700 rounded-xl text-sm font-semibold hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                  >
                    {assignmentSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : <><User className="h-4 w-4" />Save Assignment</>}
                  </button>
                  <button
                    onClick={handleSubmitResponseNew}
                    disabled={submitting || (activeSections.has("itinerary") && itineraryOptions.length === 0)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
                  >
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" />Sending...</> : <><Send className="h-4 w-4" />Send Feedback to Customer</>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
