"use client";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Calendar,
  Search,
  X,
  Truck,
  MapPin,
  Clock,
  BarChart3,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  UserCheck,
  Navigation,
  CheckCircle2,
  Route,
  Flag,
  HelpCircle,
  UserPlus,
  UserMinus,
  Ban,
  RotateCw,
  Loader2,
  Eye,
  FileText,
} from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";
import Chart from "@/components/Chart";
import type { ChartData } from "chart.js";
import TableRow from "@/components/TableRow";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {}

type TripRow = {
  id: number;
  tripCode: string;
  driver: { id: number; name: string; email: string; phone: string | null } | null;
  pickup: string;
  dropoff: string;
  scheduledAt: string;
  amount: number;
  vehicleType?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  paymentRef?: string | null;
  invoiceId?: number | null;
  status: string;
  createdAt: string;
};

type DriverOption = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
};

type TripDetailsResponse = {
  trip: {
    id: number;
    tripCode: string;
    status: string;
    scheduledAt: string;
    pickupTime: string | null;
    dropoffTime: string | null;
    pickup: string;
    dropoff: string;
    vehicleType: string | null;
    amount: number;
    currency: string;
    paymentStatus: string | null;
    paymentMethod: string | null;
    paymentRef: string | null;
    notes: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    user: { id: number; name: string; email: string; phone: string | null } | null;
    driver: { id: number; name: string; email: string; phone: string | null } | null;
  };
  assignmentAudits: Array<{
    id: number;
    action: string;
    actorId: number | null;
    createdAt: string | null;
    reason: string | null;
  }>;
};

function badgeClasses(v: string) {
  switch (v) {
    case "PENDING":
      return "bg-gray-100 text-gray-700";
    case "CONFIRMED":
      return "bg-blue-100 text-blue-700";
    case "IN_PROGRESS":
      return "bg-emerald-100 text-emerald-700";
    case "COMPLETED":
      return "bg-sky-100 text-sky-700";
    case "CANCELED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function pillClasses(kind: "neutral" | "blue" | "green" | "amber") {
  switch (kind) {
    case "blue":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "green":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "amber":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

function titleCaseIfAllCaps(input: string) {
  const s = String(input ?? "").trim();
  if (!s) return "";
  // Only title-case strings that are mostly uppercase (common for location segments)
  const letters = s.replace(/[^A-Za-z]/g, "");
  if (letters && letters === letters.toUpperCase()) {
    return s
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  return s;
}

function abbreviateLocation(input: string) {
  const raw = String(input ?? "").trim();
  if (!raw) return "";

  const cleaned = raw
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts = cleaned
    .split(/\s*-\s*|\s*,\s*/g)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    const first = titleCaseIfAllCaps(parts[0]);
    const last = parts[parts.length - 1];
    const lastOut = last && last === last.toUpperCase() ? last : titleCaseIfAllCaps(last);
    if (!lastOut || first.toLowerCase() === lastOut.toLowerCase()) return first;
    return `${first}....${lastOut}`;
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length <= 3) return titleCaseIfAllCaps(cleaned);

  const lower = words.map((w) => w.toLowerCase());
  const airportIdx = lower.lastIndexOf("airport");
  if (airportIdx > 0) {
    let idx = airportIdx - 1;
    const ignore = new Set(["international", "intl"]);
    while (idx > 0 && ignore.has(lower[idx])) idx -= 1;
    const head = titleCaseIfAllCaps(`${words[0]} ${words[idx]}`);
    return `${head}....${words[airportIdx]}`;
  }

  const head = titleCaseIfAllCaps(words.slice(0, 2).join(" "));
  const tail = words[words.length - 1];
  return `${head}....${tail}`;
}

function formatRequestedDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DriverStepState = "upcoming" | "current" | "completed";
type DriverProgress =
  | { kind: "progress"; current: number }
  | { kind: "canceled" }
  | { kind: "completed" }
  | { kind: "unknown"; label: string };

function toDriverProgress(statusRaw: string, hasDriver: boolean): DriverProgress {
  const status = String(statusRaw ?? "").toUpperCase().trim();
  if (!hasDriver && status === "PENDING") return { kind: "progress", current: -1 };
  if (status === "CANCELED" || status === "CANCELLED") return { kind: "canceled" };
  if (status === "COMPLETED") return { kind: "completed" };

  // Prefer driver-step style statuses where available.
  if (status === "ASSIGNED") return { kind: "progress", current: 0 };
  if (status === "ACCEPTED" || status === "CONFIRMED") return { kind: "progress", current: 1 };
  if (status === "ARRIVED_PICKUP") return { kind: "progress", current: 2 };
  if (status === "PICKED_UP") return { kind: "progress", current: 3 };
  if (status === "IN_TRANSIT" || status === "IN_PROGRESS") return { kind: "progress", current: 3 };
  if (status === "ARRIVED_DESTINATION" || status === "DROPPED_OFF" || status === "DROPOFF") return { kind: "progress", current: 4 };

  if (status === "PENDING") return { kind: "progress", current: hasDriver ? 0 : -1 };
  return { kind: "unknown", label: status || "UNKNOWN" };
}

function StatusStepIcons({ status, hasDriver }: { status: string; hasDriver: boolean }) {
  const steps = [
    { label: "Assigned", Icon: UserCheck },
    { label: "On the way to pickup", Icon: Navigation },
    { label: "Pickup confirmed", Icon: CheckCircle2 },
    { label: "En route to destination", Icon: Route },
    { label: "Drop off", Icon: Flag },
  ] as const;

  const progress = toDriverProgress(status, hasDriver);

  if (progress.kind === "canceled") {
    return (
      <div className="inline-flex items-center" title="Cancelled">
        <Ban className="h-4 w-4 text-red-600" />
      </div>
    );
  }

  if (progress.kind === "completed") {
    return (
      <div className="inline-flex items-center" title="Completed">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      </div>
    );
  }

  if (progress.kind === "unknown") {
    return (
      <div className="inline-flex items-center" title={progress.label}>
        <HelpCircle className="h-4 w-4 text-gray-500" />
      </div>
    );
  }

  const current = progress.current;
  return (
    <div className="inline-flex items-center gap-1.5" aria-label="Trip progress">
      {!hasDriver ? (
        <span title="Unassigned" className="inline-flex items-center">
          <HelpCircle className="h-4 w-4 text-gray-400" />
        </span>
      ) : null}
      {steps.map((s, idx) => {
        let state: DriverStepState = "upcoming";
        if (current >= 0 && idx < current) state = "completed";
        else if (idx === current) state = "current";

        const cls =
          state === "completed"
            ? "text-emerald-600"
            : state === "current"
              ? "text-blue-700"
              : "text-gray-300";

        const Icon = s.Icon;
        return (
          <span key={s.label} title={s.label} className="inline-flex items-center">
            <Icon className={`h-4 w-4 ${cls}`} />
          </span>
        );
      })}
    </div>
  );
}

type TripStats = {
  date: string;
  count: number;
  completed: number;
  amount: number;
};

type TripStatsResponse = {
  stats: TripStats[];
  period: string;
  startDate: string;
  endDate: string;
};

export default function AdminDriversTripsPage() {
  const [status, setStatus] = useState<string>("");
  const [assignment, setAssignment] = useState<"all" | "assigned" | "unassigned">("all");
  const [date, setDate] = useState<string | string[]>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  type SortKey = "tripCode" | "driver" | "pickup" | "dropoff" | "vehicleType" | "createdAt" | "amount" | "status";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  
  // Histogram state
  const [histogramPeriod, setHistogramPeriod] = useState<string>("30d");
  const [histogramData, setHistogramData] = useState<TripStatsResponse | null>(null);
  const [histogramLoading, setHistogramLoading] = useState(false);

  // Assign modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTrip, setAssignTrip] = useState<TripRow | null>(null);
  const [driverQuery, setDriverQuery] = useState("");
  const [driverResults, setDriverResults] = useState<DriverOption[]>([]);
  const [driverLoading, setDriverLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverOption | null>(null);
  const [assignReason, setAssignReason] = useState("");
  const [assignMounted, setAssignMounted] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assignSelectedPick, setAssignSelectedPick] = useState<string | null>(null);
  const assignReasonRef = useRef<HTMLTextAreaElement | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Trip Details drawer
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsMounted, setDetailsMounted] = useState(false);
  const [detailsTripId, setDetailsTripId] = useState<number | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsData, setDetailsData] = useState<TripDetailsResponse | null>(null);

  // Reason modal (unassign/cancel)
  const [reasonMounted, setReasonMounted] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonKind, setReasonKind] = useState<"unassign" | "cancel">("unassign");
  const [reasonTrip, setReasonTrip] = useState<TripRow | null>(null);
  const [reasonText, setReasonText] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [reasonSelectedPick, setReasonSelectedPick] = useState<string | null>(null);
  const reasonTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const reasonQuickPicks = useMemo(() => {
    return reasonKind === "cancel"
      ? [
          "Customer canceled",
          "No drivers available",
          "Incorrect booking details",
          "Payment issue",
          "Duplicate booking",
          "Safety concern",
          "Other",
        ]
      : [
          "Driver unavailable",
          "Vehicle issue",
          "Customer requested change",
          "Wrong assignment",
          "Duplicate booking",
          "Other",
        ];
  }, [reasonKind]);

  const applyReasonPick = (pick: string) => {
    setReasonSelectedPick(pick);
    if (pick === "Other") {
      setReasonText("");
    } else {
      setReasonText(reasonKind === "cancel" ? `${pick} - ` : pick);
    }
    if (reasonError) setReasonError(null);
    window.setTimeout(() => reasonTextareaRef.current?.focus(), 0);
  };

  async function load() {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
      };
      if (status) params.status = status;
      if (assignment) params.assignment = assignment;
      if (date) {
        if (Array.isArray(date)) {
          params.start = date[0];
          params.end = date[1];
        } else {
          params.date = date;
        }
      }
      if (q) params.q = q;

      const r = await api.get<{ items: TripRow[]; total: number }>("/api/admin/drivers/trips", { params });
      setList(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (err) {
      console.error("Failed to load trips", err);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  const loadHistogram = useCallback(async () => {
    setHistogramLoading(true);
    try {
      const r = await api.get<TripStatsResponse>("/api/admin/drivers/trips/stats", {
        params: { period: histogramPeriod },
      });
      setHistogramData(r.data);
    } catch (err) {
      console.error("Failed to load trip statistics", err);
      setHistogramData(null);
    } finally {
      setHistogramLoading(false);
    }
  }, [histogramPeriod]);

  useEffect(() => {
    authify();
    load();
  }, [page, status, assignment, date]);

  useEffect(() => {
    authify();
    loadHistogram();
  }, [loadHistogram]);

  const fetchDrivers = useCallback(async (term: string) => {
    setDriverLoading(true);
    try {
      const url = assignTrip?.id
        ? `/api/admin/drivers/trips/${assignTrip.id}/eligible-drivers`
        : "/api/admin/drivers";
      const r = await api.get<{ items: any[] }>(url, {
        params: { q: term, page: 1, pageSize: 10 },
      });
      const items = Array.isArray(r.data?.items) ? r.data.items : [];
      const mapped: DriverOption[] = items
        .map((d: any) => ({
          id: Number(d.id),
          name: String(d.name || ""),
          email: String(d.email || ""),
          phone: d.phone ?? null,
        }))
        .filter((d: DriverOption) => Number.isFinite(d.id) && d.id > 0);
      setDriverResults(mapped);
    } catch (err) {
      console.error("Failed to load drivers", err);
      setDriverResults([]);
    } finally {
      setDriverLoading(false);
    }
  }, [assignTrip?.id]);

  useEffect(() => {
    if (!assignOpen) return;
    const t = setTimeout(() => {
      void fetchDrivers(driverQuery.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [assignOpen, driverQuery, fetchDrivers]);

  const assignQuickPicks = useMemo(
    () => [
      "Closest driver",
      "Driver already nearby",
      "Customer requested this driver",
      "Replacement driver",
      "Best availability",
      "Other",
    ],
    []
  );

  const applyAssignPick = (pick: string) => {
    setAssignSelectedPick(pick);
    setAssignReason(pick === "Other" ? "" : pick);
    if (assignError) setAssignError(null);
    window.setTimeout(() => assignReasonRef.current?.focus(), 0);
  };

  const openAssign = (trip: TripRow) => {
    setAssignTrip(trip);
    setAssignMounted(true);
    requestAnimationFrame(() => {
      setAssignOpen(true);
      window.setTimeout(() => assignReasonRef.current?.focus(), 0);
    });
    setDriverQuery("");
    setDriverResults([]);
    setSelectedDriver(null);
    setAssignReason("");
    setAssignSelectedPick(null);
    setAssignError(null);
  };

  const closeAssign = () => {
    setAssignOpen(false);
    window.setTimeout(() => {
      setAssignMounted(false);
      setAssignTrip(null);
      setDriverQuery("");
      setDriverResults([]);
      setSelectedDriver(null);
      setAssignReason("");
      setAssignSelectedPick(null);
      setAssignError(null);
    }, 200);
  };

  const submitAssign = async () => {
    if (!assignTrip) return;
    if (!selectedDriver) {
      setAssignError("Select a driver");
      return;
    }
    const reason = assignReason.trim();
    if (!reason) {
      setAssignError("Reason is required");
      return;
    }
    setActionBusy(true);
    try {
      await api.post(`/api/admin/drivers/trips/${assignTrip.id}/assign`, {
        driverId: selectedDriver.id,
        reason,
      });
      closeAssign();
      await load();
      if (detailsMounted && detailsTripId === assignTrip.id) {
        await refreshDetails();
      }
    } catch (err: any) {
      console.error("Assign failed", err);
      setAssignError(err?.response?.data?.error || "Failed to assign");
    } finally {
      setActionBusy(false);
    }
  };

  const openDetails = async (trip: TripRow) => {
    setDetailsTripId(trip.id);
    setDetailsMounted(true);
    requestAnimationFrame(() => setDetailsOpen(true));
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    window.setTimeout(() => {
      setDetailsMounted(false);
      setDetailsTripId(null);
      setDetailsData(null);
    }, 220);
  };

  const refreshDetails = useCallback(async () => {
    if (!detailsMounted || !detailsTripId) return;
    setDetailsLoading(true);
    try {
      const r = await api.get<TripDetailsResponse>(`/api/admin/drivers/trips/${detailsTripId}`);
      setDetailsData(r.data);
    } catch (err) {
      console.error("Failed to load trip details", err);
      setDetailsData(null);
    } finally {
      setDetailsLoading(false);
    }
  }, [detailsMounted, detailsTripId]);

  useEffect(() => {
    void refreshDetails();
  }, [refreshDetails]);

  const openReasonModal = (kind: "unassign" | "cancel", trip: TripRow) => {
    setReasonKind(kind);
    setReasonTrip(trip);
    setReasonText("");
    setReasonError(null);
    setReasonSelectedPick(null);
    setReasonMounted(true);
    requestAnimationFrame(() => {
      setReasonOpen(true);
      window.setTimeout(() => reasonTextareaRef.current?.focus(), 0);
    });
  };

  const closeReasonModal = () => {
    setReasonOpen(false);
    window.setTimeout(() => {
      setReasonMounted(false);
      setReasonTrip(null);
      setReasonText("");
      setReasonError(null);
      setReasonSelectedPick(null);
    }, 200);
  };

  const submitReasonModal = async () => {
    if (!reasonTrip) return;
    const reason = reasonText.trim();
    if (!reason) {
      setReasonError("Reason is required");
      return;
    }
    if (reasonKind === "cancel") {
      const minLen = 40;
      if (reason.length < minLen) {
        setReasonError(`Please provide a detailed cancel reason (min ${minLen} characters).`);
        return;
      }
    }
    setActionBusy(true);
    try {
      const endpoint = reasonKind === "unassign" ? "unassign" : "cancel";
      await api.post(`/api/admin/drivers/trips/${reasonTrip.id}/${endpoint}`, { reason });
      closeReasonModal();
      await load();
      if (detailsMounted && detailsTripId === reasonTrip.id) {
        await refreshDetails();
      }
    } catch (err: any) {
      console.error(`${reasonKind} failed`, err);
      setReasonError(err?.response?.data?.error || `Failed to ${reasonKind}`);
    } finally {
      setActionBusy(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / pageSize));

  // Prepare histogram chart data
  const histogramChartData = useMemo<ChartData<"bar">>(() => {
    if (!histogramData || histogramData.stats.length === 0) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = histogramData.stats.map((s) => {
      const d = new Date(s.date);
      return histogramPeriod === "year" 
        ? d.toLocaleDateString("en-US", { month: "short" })
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    });
    
    return {
      labels,
      datasets: [
        {
          label: "Total Trips",
          data: histogramData.stats.map((s) => s.count),
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderColor: "rgba(59, 130, 246, 1)",
          borderWidth: 1,
        },
        {
          label: "Completed",
          data: histogramData.stats.map((s) => s.completed),
          backgroundColor: "rgba(16, 185, 129, 0.6)",
          borderColor: "rgba(16, 185, 129, 1)",
          borderWidth: 1,
        },
      ],
    };
  }, [histogramData, histogramPeriod]);

  const toggleSort = (key: SortKey) => {
    setSortKey((prev) => {
      if (prev !== key) {
        setSortDir("asc");
        return key;
      }
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return prev;
    });
  };

  const sortedList = useMemo(() => {
    if (!sortKey) return list;
    const dir = sortDir === "asc" ? 1 : -1;
    const copy = [...list];
    const cmpStr = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

    copy.sort((a, b) => {
      switch (sortKey) {
        case "tripCode":
          return dir * cmpStr(String(a.tripCode ?? ""), String(b.tripCode ?? ""));
        case "driver": {
          const aHas = Boolean(a.driver?.name);
          const bHas = Boolean(b.driver?.name);
          if (aHas !== bHas) return dir * (aHas ? -1 : 1);
          return dir * cmpStr(String(a.driver?.name ?? ""), String(b.driver?.name ?? ""));
        }
        case "pickup":
          return dir * cmpStr(String(a.pickup ?? ""), String(b.pickup ?? ""));
        case "dropoff":
          return dir * cmpStr(String(a.dropoff ?? ""), String(b.dropoff ?? ""));
        case "vehicleType":
          return dir * cmpStr(String(a.vehicleType ?? ""), String(b.vehicleType ?? ""));
        case "createdAt": {
          const aDate = a.createdAt ?? a.scheduledAt;
          const bDate = b.createdAt ?? b.scheduledAt;
          return dir * (new Date(aDate).getTime() - new Date(bDate).getTime());
        }
        case "amount":
          return dir * ((a.amount ?? 0) - (b.amount ?? 0));
        case "status":
          return dir * cmpStr(String(a.status ?? ""), String(b.status ?? ""));
        default:
          return 0;
      }
    });
    return copy;
  }, [list, sortKey, sortDir]);

  const SortIcon = ({ active }: { active: boolean }) => {
    if (!active) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3.5 w-3.5 text-gray-700" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-gray-700" />
    );
  };

  const SortableTh = ({ label, k, align = "left" }: { label: string; k: SortKey; align?: "left" | "right" }) => {
    const active = sortKey === k;
    return (
      <th
        className={`px-6 py-3 ${align === "right" ? "text-right" : "text-left"} text-xs font-medium text-gray-500 uppercase tracking-wider select-none`}
        scope="col"
      >
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className={`inline-flex items-center gap-1.5 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white !bg-transparent !border-0 !shadow-none !p-0 !m-0 !rounded-none ${
            align === "right" ? "justify-end w-full" : ""
          }`}
          aria-label={`Sort by ${label}`}
          title={`Sort by ${label}`}
        >
          <span>{label}</span>
          <SortIcon active={active} />
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Trips</h1>
          <p className="text-sm text-gray-500 mt-1">Direct-accept/dispatch trips only (scheduled-claim trips are in Scheduled Trips).</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 w-full box-border">
          {/* Top Row: Search and Date Picker */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            {/* Search Box */}
            <div className="relative w-full sm:flex-1 min-w-0">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
                <input
                  ref={searchRef}
                  type="text"
                  className="w-full box-border pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  placeholder="Search trips..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setPage(1);
                      load();
                    }
                  }}
                  style={{ width: '100%', maxWidth: '100%' }}
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      setPage(1);
                      load();
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Date Picker */}
            <div className="relative w-full sm:w-auto sm:flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPickerAnim(true);
                  setTimeout(() => setPickerAnim(false), 350);
                  setPickerOpen((v) => !v);
                }}
                className={`w-full box-border px-3 py-2 rounded-lg border border-gray-300 text-sm flex items-center justify-center gap-2 text-gray-700 bg-white transition-all ${
                  pickerAnim ? "ring-2 ring-brand-100" : "hover:bg-gray-50"
                }`}
                style={{ width: '100%', maxWidth: '100%' }}
              >
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </button>
              {pickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                  <div className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
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

          {/* Bottom Row: Minimal Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center w-full">
            <div className="flex gap-2 items-center justify-center w-full sm:w-auto overflow-x-auto pb-1 scrollbar-hide">
              {[
                { label: "All", value: "all" as const },
                { label: "Assigned", value: "assigned" as const },
                { label: "Unassigned", value: "unassigned" as const },
              ].map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => {
                    setAssignment(s.value);
                    setPage(1);
                    setTimeout(() => load(), 0);
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                    assignment === s.value
                      ? "bg-brand-50 border-brand-300 text-brand-700"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-60">
              <label className="sr-only" htmlFor="tripStatus">Trip status</label>
              <select
                id="tripStatus"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                  setTimeout(() => load(), 0);
                }}
                className="w-full box-border px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-500"
              >
                <option value="">All statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELED">Canceled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-brand-600"></div>
            <p className="mt-3 text-sm text-gray-500">Loading trips...</p>
          </div>
        ) : list.length === 0 ? (
          <>
            <div className="px-6 py-12 text-center">
              <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No trips found.</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
            </div>
            
            {/* Trip Statistics Histogram */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-blue-300 hover:-translate-y-1 group">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 group-hover:text-blue-600 transition-colors duration-300">
                    <BarChart3 className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                    Trip Statistics
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Visualize trip data over time</p>
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
                      onClick={() => setHistogramPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-300 whitespace-nowrap ${
                    histogramPeriod === p.value
                      ? "bg-blue-50 border-blue-300 text-blue-700 scale-105 shadow-md"
                      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-105 hover:shadow-sm"
                  }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {histogramLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
                </div>
              ) : histogramData && histogramData.stats.length > 0 ? (
                <div className="h-64 w-full transform transition-all duration-500 group-hover:scale-[1.02]">
                  <Chart
                    type="bar"
                    data={histogramChartData}
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
                              const index = context.dataIndex;
                              const amount = histogramData.stats[index]?.amount || 0;
                              if (label === "Total Trips") {
                                return `${label}: ${value} trips (${amount.toLocaleString()} TZS)`;
                              }
                              return `${label}: ${value} trips`;
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
                            text: "Number of Trips",
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
                  {/* Skeleton Histogram */}
                  <div className="relative h-full w-full">
                    {/* Y-axis skeleton */}
                    <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </div>

                    {/* Chart area skeleton */}
                    <div className="ml-10 h-full relative">
                      {/* Grid lines */}
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="h-px bg-gray-200"></div>
                        ))}
                      </div>

                      {/* Skeleton bars */}
                      <div className="absolute bottom-0 left-0 right-0 h-full flex items-end justify-between gap-2 px-2">
                        {[...Array(7)].map((_, i) => {
                          const height = Math.random() * 60 + 20; // Random height between 20% and 80%
                          return (
                            <div
                              key={i}
                              className="flex-1 flex flex-col items-center justify-end gap-1"
                            >
                              <div
                                className="w-full bg-gray-200 rounded-t animate-pulse"
                                style={{ height: `${height}%` }}
                              ></div>
                              <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <SortableTh label="Trip Code" k="tripCode" />
                    <SortableTh label="Driver" k="driver" />
                    <SortableTh label="Pickup" k="pickup" />
                    <SortableTh label="Dropoff" k="dropoff" />
                    <SortableTh label="Type" k="vehicleType" />
                    <SortableTh label="Requested" k="createdAt" />
                    <SortableTh label="Amount" k="amount" />
                    <SortableTh label="Status" k="status" />
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedList.map((trip) => (
                    <TableRow key={trip.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{trip.tripCode}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trip.driver ? (
                          <div>
                            <div className="font-medium">{trip.driver.name}</div>
                            <div className="text-xs text-gray-500">{trip.driver.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="max-w-xs truncate" title={trip.pickup}>
                            {abbreviateLocation(trip.pickup)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="max-w-xs truncate" title={trip.dropoff}>
                            {abbreviateLocation(trip.dropoff)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <span className="truncate">{trip.vehicleType || "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{formatRequestedDateTime(trip.createdAt ?? trip.scheduledAt)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span>{trip.amount.toLocaleString()}</span>
                          {typeof trip.invoiceId === "number" && trip.invoiceId > 0 ? (
                            <Link
                              href={`/public/booking/receipt?invoiceId=${trip.invoiceId}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Open invoice/receipt"
                              className="text-blue-700 hover:text-blue-900"
                              aria-label="Open invoice/receipt"
                            >
                              <FileText className="h-4 w-4" />
                            </Link>
                          ) : (
                            <span
                              title={trip.paymentRef ? "No matching invoice found for this payment ref" : "No payment ref"}
                              className="text-gray-300"
                              aria-label="No invoice available"
                            >
                              <FileText className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusStepIcons status={trip.status} hasDriver={Boolean(trip.driver)} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-2">
                          {!trip.driver && trip.status !== "CANCELED" && trip.status !== "COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => openAssign(trip)}
                              disabled={actionBusy}
                                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 hover:border-brand-300 disabled:opacity-50"
                              aria-label="Assign driver"
                              title="Assign driver"
                            >
                              <UserPlus className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openDetails(trip)}
                                className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300"
                            aria-label="View details"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {trip.driver && trip.status !== "IN_PROGRESS" && trip.status !== "CANCELED" && trip.status !== "COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => openReasonModal("unassign", trip)}
                              disabled={actionBusy}
                                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300 disabled:opacity-50"
                              aria-label="Unassign driver"
                              title="Unassign driver"
                            >
                              <UserMinus className="h-4 w-4" />
                            </button>
                          )}
                          {trip.status !== "CANCELED" && trip.status !== "COMPLETED" && (
                            <button
                              type="button"
                              onClick={() => openReasonModal("cancel", trip)}
                              disabled={actionBusy}
                                  className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 disabled:opacity-50"
                              aria-label="Cancel trip"
                              title="Cancel trip"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-4">
              {sortedList.map((trip) => (
                <div key={trip.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="truncate">{trip.tripCode}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-900">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <span className="truncate">{trip.vehicleType || "—"}</span>
                      </div>
                      <div className="mt-1">
                        <StatusStepIcons status={trip.status} hasDriver={Boolean(trip.driver)} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!trip.driver && trip.status !== "CANCELED" && trip.status !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => openAssign(trip)}
                          disabled={actionBusy}
                          className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 hover:border-brand-300 disabled:opacity-50"
                          aria-label="Assign driver"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openDetails(trip)}
                        className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300"
                        aria-label="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {trip.driver && trip.status !== "IN_PROGRESS" && trip.status !== "CANCELED" && trip.status !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => openReasonModal("unassign", trip)}
                          disabled={actionBusy}
                          className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300 disabled:opacity-50"
                          aria-label="Unassign driver"
                        >
                          <UserMinus className="h-4 w-4" />
                        </button>
                      )}
                      {trip.status !== "CANCELED" && trip.status !== "COMPLETED" && (
                        <button
                          type="button"
                          onClick={() => openReasonModal("cancel", trip)}
                          disabled={actionBusy}
                          className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-300 disabled:opacity-50"
                          aria-label="Cancel trip"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {trip.driver && (
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900">{trip.driver.name}</div>
                          <div className="text-xs text-gray-500">{trip.driver.email}</div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-500">Pickup</div>
                        <div className="text-gray-900" title={trip.pickup}>{abbreviateLocation(trip.pickup)}</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div>
                        <div className="text-xs text-gray-500">Dropoff</div>
                        <div className="text-gray-900" title={trip.dropoff}>{abbreviateLocation(trip.dropoff)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{formatRequestedDateTime(trip.createdAt ?? trip.scheduledAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{trip.amount.toLocaleString()}</span>
                        {typeof trip.invoiceId === "number" && trip.invoiceId > 0 ? (
                          <Link
                            href={`/public/booking/receipt?invoiceId=${trip.invoiceId}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open invoice/receipt"
                            className="text-blue-700 hover:text-blue-900"
                            aria-label="Open invoice/receipt"
                          >
                            <FileText className="h-4 w-4" />
                          </Link>
                        ) : (
                          <span
                            title={trip.paymentRef ? "No matching invoice found for this payment ref" : "No payment ref"}
                            className="text-gray-300"
                            aria-label="No invoice available"
                          >
                            <FileText className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-sm text-gray-500 text-center sm:text-left">
                  Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} trips
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(pages, p + 1))}
                    disabled={page === pages}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Assign Driver Modal */}
      {assignMounted && (
        <div className={`fixed inset-0 z-50 ${assignOpen ? "" : "pointer-events-none"}`}>
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${assignOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closeAssign}
          />
          <div className="relative h-full w-full flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <div
              className={`relative w-full max-w-lg my-3 sm:my-0 max-h-[92vh] overflow-hidden rounded-2xl sm:rounded-3xl border border-white/30 shadow-2xl flex flex-col bg-gradient-to-b from-surface via-white to-brand-50 transition-all duration-200 ease-out ${
                assignOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.98] translate-y-2"
              }`}
              role="dialog"
              aria-modal="true"
              aria-label="Assign driver"
            >
              <div className="relative overflow-hidden border-b border-white/40">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500" />
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_10%,white,transparent_35%),radial-gradient(circle_at_40%_90%,white,transparent_35%)]" />
                <div className="relative px-4 pt-5 pb-6 sm:px-6 sm:pt-6 sm:pb-6 flex items-start justify-between gap-3 text-white">
                  <div className="min-w-0 flex-1">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                      <div className="min-w-0 text-base sm:text-lg font-semibold leading-snug truncate">Assign Driver</div>
                      <div className="inline-flex max-w-[60vw] sm:max-w-none items-center gap-2 px-2 py-1 rounded-full bg-white/15 border border-white/25 backdrop-blur text-xs text-white">
                        <span className="text-white/90">Trip</span>
                        <span className="select-text break-all" title={assignTrip?.tripCode || ""}>{assignTrip?.tripCode || ""}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeAssign}
                    className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl bg-white/15 border border-white/25 text-white hover:bg-white/20 transition"
                    aria-label="Close"
                    title="Close"
                  >
                    <X className="h-4 w-4 mx-auto" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">Search driver</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        value={driverQuery}
                        onChange={(e) => {
                          setDriverQuery(e.target.value);
                          if (assignError) setAssignError(null);
                        }}
                        placeholder="Name or email"
                        className="w-full box-border pl-10 pr-10 py-2 rounded-xl border border-gray-300 bg-white/80 outline-none text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                      />
                      {driverLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur overflow-hidden">
                    <div className="max-h-56 overflow-y-auto">
                      {driverResults.length === 0 && !driverLoading ? (
                        <div className="px-4 py-6 text-center text-sm text-gray-500">No drivers found</div>
                      ) : (
                        driverResults.map((d) => {
                          const active = selectedDriver?.id === d.id;
                          return (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => {
                                setSelectedDriver(d);
                                if (assignError) setAssignError(null);
                              }}
                              className={`w-full text-left px-4 py-3 border-b border-gray-100/70 transition ${
                                active
                                  ? "bg-brand-50"
                                  : "bg-white/70 hover:bg-white"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-gray-900 truncate">{d.name || `Driver #${d.id}`}</div>
                                  <div className="text-xs text-gray-500 break-words">{d.email}</div>
                                  {d.phone ? <div className="text-xs text-gray-500">{d.phone}</div> : null}
                                </div>
                                <div
                                  className={`h-6 w-6 rounded-full border flex items-center justify-center mt-0.5 ${
                                    active ? "border-brand-600 bg-brand-600" : "border-gray-300 bg-white"
                                  }`}
                                  aria-hidden="true"
                                >
                                  {active ? <CheckCircle2 className="h-4 w-4 text-white" /> : null}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <label className="block text-xs font-medium text-gray-600">Reason (required)</label>
                      <button
                        type="button"
                        onClick={() => {
                          setAssignReason("");
                          setAssignSelectedPick(null);
                          if (assignError) setAssignError(null);
                          window.setTimeout(() => assignReasonRef.current?.focus(), 0);
                        }}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900"
                        disabled={actionBusy}
                      >
                        Clear
                      </button>
                    </div>

                    <div className="mb-3">
                      <div className="text-[11px] font-medium tracking-wide uppercase text-gray-500 mb-2">Quick pick</div>
                      <div className="flex flex-wrap gap-2">
                        {assignQuickPicks.map((pick) => (
                          <button
                            key={pick}
                            type="button"
                            onClick={() => applyAssignPick(pick)}
                            disabled={actionBusy}
                            title={pick}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition disabled:opacity-50 ${
                              assignSelectedPick === pick
                                ? "border-brand-600 bg-brand-600 text-white"
                                : "border-gray-200 bg-white/80 text-gray-700 hover:bg-white hover:border-gray-300"
                            }`}
                          >
                            {pick}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      ref={assignReasonRef}
                      value={assignReason}
                      onChange={(e) => {
                        setAssignReason(e.target.value);
                        if (assignSelectedPick) setAssignSelectedPick(null);
                        if (assignError) setAssignError(null);
                      }}
                      placeholder="Why assign this driver?"
                      rows={3}
                      className={`block w-full max-w-full box-border px-3 py-2 rounded-xl border bg-white/80 outline-none text-sm leading-relaxed text-gray-900 shadow-inner resize-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                        assignError ? "border-red-300" : "border-gray-300"
                      }`}
                    />
                    {assignError ? <div className="mt-2 text-xs text-red-600">{assignError}</div> : null}
                  </div>
                </div>
              </div>

              <div className="px-4 py-4 sm:px-6 sm:py-5 border-t border-gray-200/60 bg-white/60 backdrop-blur flex items-center justify-end">
                {(() => {
                  const ready = Boolean(selectedDriver) && Boolean(assignReason.trim()) && !actionBusy;
                  const tooltip = !selectedDriver
                    ? "Select a driver to assign"
                    : !assignReason.trim()
                      ? "Enter a reason to assign"
                      : actionBusy
                        ? "Processing..."
                        : "Assign";
                  return (
                <button
                  type="button"
                  onClick={submitAssign}
                  disabled={!ready}
                  aria-label="Assign driver"
                  title={tooltip}
                  className="inline-flex items-center justify-center h-11 w-11 rounded-2xl text-white transition shadow-sm bg-brand-600 hover:bg-brand-700 border border-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {actionBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserPlus className="h-5 w-5" />}
                </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trip Details Drawer */}
      {detailsMounted && (
        <div className={`fixed inset-0 z-50 ${detailsOpen ? "" : "pointer-events-none"}`}>
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${detailsOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closeDetails}
          />
          <div className="relative h-full w-full flex items-center justify-center p-3 sm:p-6">
            <div
              className={`relative w-full max-w-xl max-h-[96vh] sm:max-h-[92vh] overflow-hidden rounded-2xl sm:rounded-3xl border border-white/30 shadow-2xl flex flex-col bg-gradient-to-b from-slate-50 via-white to-sky-50 transition-all duration-200 ease-out ${
                detailsOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.98] translate-y-2"
              }`}
            >
            <div className="relative overflow-hidden border-b border-white/40">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500" />
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_10%,white,transparent_35%),radial-gradient(circle_at_40%_90%,white,transparent_35%)]" />
              <div className="relative px-4 py-4 sm:px-6 sm:pt-6 sm:pb-5 flex items-start justify-between gap-3 text-white">
                <div className="min-w-0 pr-2">
                  <div className="hidden sm:block text-[11px] font-semibold tracking-wide text-white/85">Trip Details</div>
                  <div className="text-sm sm:mt-0.5 sm:text-lg font-semibold leading-snug break-words">
                    {detailsData?.trip?.tripCode || "Trip Details"}
                  </div>
                  <div className="mt-1 sm:mt-2 flex flex-wrap items-center gap-2">
                    {detailsData?.trip?.status ? (
                      <span className="px-2 py-1 text-[11px] font-semibold rounded-full bg-white/15 border border-white/25 backdrop-blur">
                        {detailsData.trip.status}
                      </span>
                    ) : (
                      <span className="text-xs text-white/80">—</span>
                    )}
                    <span className="text-xs text-white/80 break-words">
                      {detailsData?.trip?.createdAt
                        ? new Date(detailsData.trip.createdAt).toLocaleString()
                        : detailsData?.trip?.scheduledAt
                          ? new Date(detailsData.trip.scheduledAt).toLocaleString()
                          : ""}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDetails}
                  className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl bg-white/15 border border-white/25 text-white hover:bg-white/20 transition"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 mx-auto" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {detailsLoading ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-gray-400" />
                  Loading details...
                </div>
              ) : !detailsData ? (
                <div className="py-10 text-center text-sm text-gray-500">Failed to load trip details.</div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/80 backdrop-blur border border-gray-200/60 shadow-sm hover:shadow-md transition p-4">
                      <div className="text-xs text-gray-500">Passenger</div>
                      <div className="text-sm font-medium text-gray-900">
                        {detailsData.trip.user?.name || "—"}
                      </div>
                      <div className="text-xs text-gray-500">{detailsData.trip.user?.email || ""}</div>
                      {detailsData.trip.user?.phone && (
                        <div className="text-xs text-gray-500">{detailsData.trip.user.phone}</div>
                      )}
                    </div>
                    <div className="rounded-2xl bg-white/80 backdrop-blur border border-gray-200/60 shadow-sm hover:shadow-md transition p-4">
                      <div className="text-xs text-gray-500">Driver</div>
                      <div className="text-sm font-medium text-gray-900">
                        {detailsData.trip.driver?.name || "Unassigned"}
                      </div>
                      <div className="text-xs text-gray-500">{detailsData.trip.driver?.email || ""}</div>
                      {detailsData.trip.driver?.phone && (
                        <div className="text-xs text-gray-500">{detailsData.trip.driver.phone}</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/80 backdrop-blur border border-gray-200/60 shadow-sm hover:shadow-md transition p-4 space-y-2">
                    <div className="text-xs font-semibold text-gray-600">Route</div>
                    <div className="text-sm text-gray-900">
                      <span className="text-gray-500">Pickup:</span> {detailsData.trip.pickup}
                    </div>
                    <div className="text-sm text-gray-900">
                      <span className="text-gray-500">Dropoff:</span> {detailsData.trip.dropoff}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white/80 backdrop-blur border border-gray-200/60 shadow-sm hover:shadow-md transition p-4">
                      <div className="text-xs text-gray-500">Vehicle Type</div>
                      <div className="text-sm font-medium text-gray-900">{detailsData.trip.vehicleType || "—"}</div>
                    </div>
                    <div className="rounded-2xl bg-white/80 backdrop-blur border border-gray-200/60 shadow-sm hover:shadow-md transition p-4">
                      <div className="text-xs text-gray-500">Amount</div>
                      <div className="text-sm font-medium text-gray-900">
                        {detailsData.trip.currency} {Number(detailsData.trip.amount || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/80 backdrop-blur border border-gray-200/60 shadow-sm hover:shadow-md transition p-4">
                      <div className="text-xs text-gray-500">Payment Status</div>
                      <div className="text-sm font-medium text-gray-900">{detailsData.trip.paymentStatus || "—"}</div>
                      {detailsData.trip.paymentRef && (
                        <div className="text-xs text-gray-500 break-all">Ref: {detailsData.trip.paymentRef}</div>
                      )}
                    </div>
                    <div className="rounded-2xl bg-white/80 backdrop-blur border border-gray-200/60 shadow-sm hover:shadow-md transition p-4">
                      <div className="text-xs text-gray-500">Times</div>
                      <div className="text-sm text-gray-900">
                        <span className="text-gray-500">Pickup:</span> {detailsData.trip.pickupTime ? new Date(detailsData.trip.pickupTime).toLocaleString() : "—"}
                      </div>
                      <div className="text-sm text-gray-900">
                        <span className="text-gray-500">Dropoff:</span> {detailsData.trip.dropoffTime ? new Date(detailsData.trip.dropoffTime).toLocaleString() : "—"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white/80 backdrop-blur border border-gray-200/60 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 bg-white/60 border-b border-gray-200/60 text-xs font-semibold text-gray-600">
                      Assignment History
                    </div>
                    {detailsData.assignmentAudits.length === 0 ? (
                      <div className="px-4 py-5 text-sm text-gray-500">No assignment history.</div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {detailsData.assignmentAudits.map((a) => (
                          <div key={a.id} className="px-4 py-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-medium text-gray-900">{a.action}</div>
                              <div className="text-xs text-gray-500">
                                {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                              </div>
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                              {a.reason ? `Reason: ${a.reason}` : ""}
                              {a.actorId ? `  •  By: ${a.actorId}` : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-gray-200/60 bg-white/60 backdrop-blur flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={refreshDetails}
                className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-gray-300/80 text-gray-700 bg-white/80 hover:bg-white transition"
                aria-label="Refresh"
                title="Refresh"
              >
                <RotateCw className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-2">
                {detailsData?.trip && !detailsData.trip.driver && detailsData.trip.status !== "CANCELED" && detailsData.trip.status !== "COMPLETED" && (
                  <button
                    type="button"
                    onClick={() => {
                      const row: TripRow = {
                        id: detailsData.trip.id,
                        tripCode: detailsData.trip.tripCode,
                        driver: null,
                        pickup: detailsData.trip.pickup,
                        dropoff: detailsData.trip.dropoff,
                        scheduledAt: detailsData.trip.scheduledAt,
                        amount: detailsData.trip.amount,
                        status: detailsData.trip.status,
                        createdAt: detailsData.trip.createdAt || "",
                      };
                      openAssign(row);
                    }}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 hover:border-brand-300 transition"
                    aria-label="Assign"
                    title="Assign"
                  >
                    <UserPlus className="h-4 w-4" />
                  </button>
                )}
                {detailsData?.trip && detailsData.trip.driver && detailsData.trip.status !== "IN_PROGRESS" && detailsData.trip.status !== "CANCELED" && detailsData.trip.status !== "COMPLETED" && (
                  <button
                    type="button"
                    onClick={async () => {
                      const row: TripRow = {
                        id: detailsData.trip.id,
                        tripCode: detailsData.trip.tripCode,
                        driver: detailsData.trip.driver,
                        pickup: detailsData.trip.pickup,
                        dropoff: detailsData.trip.dropoff,
                        scheduledAt: detailsData.trip.scheduledAt,
                        amount: detailsData.trip.amount,
                        status: detailsData.trip.status,
                        createdAt: detailsData.trip.createdAt || "",
                      };
                      openReasonModal("unassign", row);
                    }}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:border-amber-300 transition"
                    aria-label="Unassign"
                    title="Unassign"
                  >
                    <UserMinus className="h-4 w-4" />
                  </button>
                )}
                {detailsData?.trip && detailsData.trip.status !== "CANCELED" && detailsData.trip.status !== "COMPLETED" && (
                  <button
                    type="button"
                    onClick={async () => {
                      const row: TripRow = {
                        id: detailsData.trip.id,
                        tripCode: detailsData.trip.tripCode,
                        driver: detailsData.trip.driver,
                        pickup: detailsData.trip.pickup,
                        dropoff: detailsData.trip.dropoff,
                        scheduledAt: detailsData.trip.scheduledAt,
                        amount: detailsData.trip.amount,
                        status: detailsData.trip.status,
                        createdAt: detailsData.trip.createdAt || "",
                      };
                      openReasonModal("cancel", row);
                    }}
                    className="inline-flex items-center justify-center h-10 w-10 rounded-xl border border-red-600 text-white bg-red-600 hover:bg-red-700 transition"
                    aria-label="Cancel trip"
                    title="Cancel trip"
                  >
                    <Ban className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Reason Modal */}
      {reasonMounted && (
        <div className={`fixed inset-0 z-50 ${reasonOpen ? "" : "pointer-events-none"}`}>
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${reasonOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closeReasonModal}
          />
          <div className="relative h-full w-full flex items-center justify-center p-3 sm:p-6">
            <div
              className={`relative w-full max-w-lg overflow-hidden rounded-2xl sm:rounded-3xl border border-white/30 shadow-2xl bg-gradient-to-b from-surface via-white to-brand-50 transition-all duration-200 ease-out ${
                reasonOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-[0.98] translate-y-2"
              }`}
              role="dialog"
              aria-modal="true"
              aria-label={reasonKind === "cancel" ? "Cancel trip" : "Unassign trip"}
            >
              <div className="relative overflow-hidden border-b border-white/40">
                <div className="absolute inset-0 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500" />
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,white,transparent_40%),radial-gradient(circle_at_80%_10%,white,transparent_35%),radial-gradient(circle_at_40%_90%,white,transparent_35%)]" />
                <div className="relative px-4 py-4 sm:px-6 sm:pt-6 sm:pb-5 flex items-start justify-between gap-3 text-white">
                  <div className="min-w-0 pr-2">
                    <div className="text-sm sm:text-lg font-semibold leading-snug break-words">
                      {reasonKind === "cancel" ? "Cancel Trip" : "Unassign Trip"}
                    </div>
                    <div className="mt-1 text-xs text-white/85 break-words">
                      <span className="select-text break-all" title={reasonTrip?.tripCode || ""}>
                        {reasonTrip?.tripCode || ""}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={closeReasonModal}
                    className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-xl bg-white/15 border border-white/25 text-white hover:bg-white/20 transition"
                    aria-label="Close"
                    title="Close"
                  >
                    <X className="h-4 w-4 mx-auto" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="block text-xs font-medium text-gray-600">
                    {reasonKind === "cancel" ? "Reason (required, detailed)" : "Reason (required)"}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setReasonText("");
                      if (reasonError) setReasonError(null);
                      setReasonSelectedPick(null);
                      window.setTimeout(() => reasonTextareaRef.current?.focus(), 0);
                    }}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                    disabled={actionBusy}
                  >
                    Clear
                  </button>
                </div>

                <div className="mb-3">
                  <div className="text-[11px] font-medium tracking-wide uppercase text-gray-500 mb-2">Quick pick</div>
                  <div className="flex flex-wrap gap-2">
                    {reasonQuickPicks.map((pick) => (
                      <button
                        key={pick}
                        type="button"
                        onClick={() => applyReasonPick(pick)}
                        disabled={actionBusy}
                        title={pick}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition disabled:opacity-50 ${
                          reasonSelectedPick === pick
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-gray-200 bg-white/80 text-gray-700 hover:bg-white hover:border-gray-300"
                        }`}
                      >
                        {pick}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  ref={reasonTextareaRef}
                  value={reasonText}
                  onChange={(e) => {
                    setReasonText(e.target.value);
                    if (reasonSelectedPick) setReasonSelectedPick(null);
                    if (reasonError) setReasonError(null);
                  }}
                  placeholder={
                    reasonKind === "cancel"
                      ? "Explain clearly why you are canceling this trip (include who requested it, what happened, and next steps)."
                      : "Why are you unassigning this driver?"
                  }
                  rows={4}
                  className={`block w-full max-w-full box-border px-3 py-2 rounded-xl border bg-white/80 outline-none text-sm leading-relaxed text-gray-900 shadow-inner resize-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 ${
                    reasonError ? "border-red-300" : "border-gray-300"
                  }`}
                />
                {reasonKind === "cancel" ? (
                  <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-gray-500">
                    <span>Minimum 40 characters required for cancel.</span>
                    <span>{reasonText.trim().length}/40</span>
                  </div>
                ) : null}
                {reasonError ? <div className="mt-2 text-xs text-red-600">{reasonError}</div> : null}
              </div>

              <div className="px-4 py-4 sm:px-6 sm:py-5 border-t border-gray-200/60 bg-white/60 backdrop-blur flex items-center justify-end">
                {(() => {
                  const trimmed = reasonText.trim();
                  const minCancelLen = 40;
                  const canSubmit =
                    !actionBusy &&
                    (reasonKind === "cancel" ? trimmed.length >= minCancelLen : trimmed.length > 0);
                  const submitTitle =
                    reasonKind === "cancel"
                      ? canSubmit
                        ? "Cancel trip"
                        : `Provide at least ${minCancelLen} characters to cancel`
                      : canSubmit
                        ? "Unassign"
                        : "Reason is required";

                  return (
                <button
                  type="button"
                  onClick={submitReasonModal}
                  disabled={!canSubmit}
                  aria-label={reasonKind === "cancel" ? "Cancel trip" : "Unassign driver"}
                  title={submitTitle}
                  className={`inline-flex items-center justify-center h-11 w-11 rounded-2xl text-white transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    reasonKind === "cancel"
                      ? "bg-red-600 hover:bg-red-700 border border-red-600"
                      : "bg-brand-600 hover:bg-brand-700 border border-brand-600"
                  }`}
                >
                  {actionBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : reasonKind === "cancel" ? (
                    <Ban className="h-5 w-5" />
                  ) : (
                    <UserMinus className="h-5 w-5" />
                  )}
                </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

