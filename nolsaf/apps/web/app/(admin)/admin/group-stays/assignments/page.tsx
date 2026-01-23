"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { Users, User, CheckCircle, Loader2, Search, Clock, XCircle, Filter, ChevronDown, MapPin, Calendar, Building2, Users as UsersIcon, Phone, Mail, AlertCircle, Percent, FileText, History, Activity, Ban, Gavel } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });

type GroupStay = {
  id: number;
  groupType: string;
  accommodationType: string;
  headcount: number;
  roomsNeeded: number;
  toRegion: string;
  toDistrict?: string | null;
  toWard?: string | null;
  toLocation?: string | null;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  user: { id: number; name: string; email: string; phone: string | null } | null;
  assignedOwner: { id: number; name: string; email: string; phone: string | null } | null;
  confirmedProperty: { id: number; title: string; type: string; status: string } | null;
  recommendedPropertyIds?: number[] | null;
  isOpenForClaims?: boolean;
  openedForClaimsAt?: string | null;
  claimsCount?: number;
  claimsPreview?: Array<{
    id: number;
    status: string;
    discountPercent: any;
    offeredPricePerNight: any;
    totalAmount: any;
    currency: string;
    createdAt: string;
    owner: { id: number; name: string; email: string; phone: string | null };
    property: { id: number; title: string; type: string; regionName: string | null; district: string | null };
  }>;
  claimsConfig?: {
    deadline: string | null;
    notes: string | null;
    minDiscountPercent: number | null;
    updatedAt: string | null;
  };
  createdAt: string;
};

type Owner = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  properties?: {
    regionName: string | null;
    district: string | null;
    ward: string | null;
  }[];
};

type Property = {
  id: number;
  title: string;
  type: string;
  regionName: string | null;
  district: string | null;
  ownerId?: number; // Add ownerId for batch loading
};

function SummaryValue({ value }: { value: number | null }) {
  if (value === null || Number.isNaN(value)) {
    return <div className="h-8 w-16 rounded-md bg-slate-200 animate-pulse" />;
  }
  return (
    <div className="text-2xl font-bold text-slate-900 tabular-nums">
      {value.toLocaleString()}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-slate-200 animate-pulse" />
            <div>
              <div className="h-6 w-44 rounded-md bg-slate-200 animate-pulse" />
              <div className="mt-2 h-5 w-24 rounded-full bg-slate-200 animate-pulse" />
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-50/50">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-200 animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                  <div className="mt-2 h-4 w-40 rounded bg-slate-200 animate-pulse" />
                  <div className="mt-2 h-3 w-28 rounded bg-slate-200 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminGroupStayAssignmentsPage() {
  const [groupStays, setGroupStays] = useState<GroupStay[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{ total: number; admin: number; claims: number } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [assigning, setAssigning] = useState<number | null>(null);
  const [linking, setLinking] = useState<number | null>(null);
  const [openingForClaims, setOpeningForClaims] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedOwner, setSelectedOwner] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ownersLoading, setOwnersLoading] = useState(false);
  const [ownersError, setOwnersError] = useState<string | null>(null);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [showClaimsModal, setShowClaimsModal] = useState(false);
  const [selectedGroupStayForClaims, setSelectedGroupStayForClaims] = useState<number | null>(null);
  const [claimsDeadline, setClaimsDeadline] = useState<string>("");
  const [claimsNotes, setClaimsNotes] = useState<string>("");
  const [minDiscount, setMinDiscount] = useState<string>("");
  const [deadlinePickerOpen, setDeadlinePickerOpen] = useState(false);
  const [claimsModalMode, setClaimsModalMode] = useState<"open" | "edit">("open");
  const [reAdvertiseConfirmed, setReAdvertiseConfirmed] = useState(false);
  const [showCloseClaimsModal, setShowCloseClaimsModal] = useState(false);
  const [selectedGroupStayForCloseClaims, setSelectedGroupStayForCloseClaims] = useState<number | null>(null);
  const [closeClaimsReasonCode, setCloseClaimsReasonCode] = useState<string>("");
  const [closeClaimsReasonDetails, setCloseClaimsReasonDetails] = useState<string>("");
  const [closeClaimsReasonError, setCloseClaimsReasonError] = useState<string>("");
  const [auditHistory, setAuditHistory] = useState<Record<number, any[]>>({});
  const [auditLoading, setAuditLoading] = useState<Record<number, boolean>>({});
  const [expandedAudits, setExpandedAudits] = useState<Record<number, boolean>>({});
  const [view, setView] = useState<"all" | "claims" | "admin">("admin");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      params.view = view;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedOwner) params.assignedOwnerId = selectedOwner;

      const response = await api.get("/api/admin/group-stays/assignments", { params });
      setGroupStays(response.data.items || []);
    } catch (err: any) {
      console.error("Failed to load group stays:", err);
      setGroupStays([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus, selectedOwner, view]);

  const loadSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const params: any = {};
      if (selectedStatus) params.status = selectedStatus;
      if (selectedOwner) params.assignedOwnerId = selectedOwner;

      const response = await api.get("/api/admin/group-stays/assignments/stats", { params });
      const next = response.data as { total?: number; admin?: number; claims?: number };
      setSummary({
        total: Number(next?.total ?? 0),
        admin: Number(next?.admin ?? 0),
        claims: Number(next?.claims ?? 0),
      });
    } catch (err: any) {
      console.error("Failed to load assignment summary stats:", err);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedStatus, selectedOwner]);

  const loadOwners = useCallback(async () => {
    try {
      setOwnersLoading(true);
      setOwnersError(null);
      
      // Load owners
      const response = await api.get("/api/admin/owners", { params: { page: "1", pageSize: "100" } });
      const ownersData = response.data.items || [];
      
      if (ownersData.length === 0) {
        setOwners([]);
        setOwnersLoading(false);
        return;
      }

      // Batch load all approved properties at once (much more efficient)
      try {
        const allPropertiesResponse = await api.get("/api/admin/properties", {
          params: { page: "1", pageSize: "1000", status: "APPROVED" }
        });
        const allProperties = allPropertiesResponse.data.items || [];
        
        // Group properties by ownerId
        const propertiesByOwner = new Map<number, Property[]>();
        allProperties.forEach((prop: any) => {
          const ownerId = prop.ownerId || prop.owner?.id;
          if (ownerId) {
            if (!propertiesByOwner.has(ownerId)) {
              propertiesByOwner.set(ownerId, []);
            }
            propertiesByOwner.get(ownerId)!.push({
              id: prop.id,
              title: prop.title,
              type: prop.type,
              regionName: prop.regionName,
              district: prop.district,
            });
          }
        });

        // Map owners with their properties
        const ownersWithLocations = ownersData.map((owner: Owner) => {
          const ownerProps = propertiesByOwner.get(owner.id) || [];
          return {
            ...owner,
            properties: ownerProps.map((p: Property) => ({
              regionName: p.regionName,
              district: p.district,
              ward: null, // Property type doesn't have ward in current schema
            }))
          };
        });
        
        setOwners(ownersWithLocations);
      } catch (propErr: any) {
        console.warn("Failed to load properties for owners, continuing without location data:", propErr);
        // Continue with owners but without location data
        setOwners(ownersData.map((owner: Owner) => ({ ...owner, properties: [] })));
      }
    } catch (err: any) {
      console.error("Failed to load owners:", err);
      setOwnersError(err.response?.data?.error || "Failed to load owners. Please try again.");
      setOwners([]);
    } finally {
      setOwnersLoading(false);
    }
  }, []);

  const loadProperties = useCallback(async () => {
    try {
      setPropertiesLoading(true);
      setPropertiesError(null);
      const response = await api.get("/api/admin/properties", { params: { page: "1", pageSize: "100", status: "APPROVED" } });
      setProperties(response.data.items || []);
    } catch (err: any) {
      console.error("Failed to load properties:", err);
      setPropertiesError(err.response?.data?.error || "Failed to load properties. Please try again.");
      setProperties([]);
    } finally {
      setPropertiesLoading(false);
    }
  }, []);

  const loadAuditHistory = useCallback(async (groupStayId: number) => {
    try {
      setAuditLoading(prev => ({ ...prev, [groupStayId]: true }));
      const response = await api.get(`/api/admin/group-stays/assignments/${groupStayId}/audits`);
      const audits = response.data?.items || [];
      setAuditHistory(prev => ({ ...prev, [groupStayId]: audits }));
    } catch (err: any) {
      console.error("Failed to load audit history:", err);
      setAuditHistory(prev => ({ ...prev, [groupStayId]: [] }));
    } finally {
      setAuditLoading(prev => ({ ...prev, [groupStayId]: false }));
    }
  }, []);

  useEffect(() => {
    loadOwners();
    loadProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleAssignOwner = async (groupStayId: number, ownerId: number) => {
    try {
      setAssigning(groupStayId);
      await api.post(`/api/admin/group-stays/assignments/${groupStayId}/owner`, { ownerId });
      await loadData();
    } catch (err: any) {
      console.error("Failed to assign owner:", err);
      alert(err.response?.data?.error || "Failed to assign owner");
    } finally {
      setAssigning(null);
    }
  };

  const handleLinkProperties = async (groupStayId: number, propertyIds: number[]) => {
    try {
      setLinking(groupStayId);
      await api.post(`/api/admin/group-stays/assignments/${groupStayId}/properties`, { propertyIds });
      await loadData();
      await loadAuditHistory(groupStayId);
      // Show success feedback (could be enhanced with toast notification)
    } catch (err: any) {
      console.error("Failed to link properties:", err);
      const errorMessage = err.response?.data?.error || "Failed to link properties. Please try again.";
      alert(errorMessage);
      throw err; // Re-throw for potential retry logic
    } finally {
      setLinking(null);
    }
  };

  const handleToggleOpenForClaims = async (groupStayId: number, isOpen: boolean) => {
    // If closing, require a reason
    if (isOpen) {
      setSelectedGroupStayForCloseClaims(groupStayId);
      setCloseClaimsReasonCode("");
      setCloseClaimsReasonDetails("");
      setCloseClaimsReasonError("");
      setShowCloseClaimsModal(true);
      return;
    }

    // If opening, show modal first
    setSelectedGroupStayForClaims(groupStayId);
    setClaimsModalMode("open");
    setShowClaimsModal(true);
    setReAdvertiseConfirmed(false);
    // Reset form
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setClaimsDeadline(tomorrow.toISOString().split('T')[0]);
    setClaimsNotes("");
    setMinDiscount("");
    setDeadlinePickerOpen(false);
  };

  const openClaimsSettingsModal = (gs: GroupStay) => {
    setSelectedGroupStayForClaims(gs.id);
    setClaimsModalMode("edit");
    setShowClaimsModal(true);
    setReAdvertiseConfirmed(false);

    const deadline = gs.claimsConfig?.deadline ? gs.claimsConfig.deadline.slice(0, 10) : "";
    setClaimsDeadline(deadline);
    setClaimsNotes(gs.claimsConfig?.notes ?? "");
    setMinDiscount(
      gs.claimsConfig?.minDiscountPercent !== null && gs.claimsConfig?.minDiscountPercent !== undefined
        ? String(gs.claimsConfig.minDiscountPercent)
        : ""
    );
    setDeadlinePickerOpen(false);
  };

  const handleSubmitClaimsForm = async () => {
    if (!selectedGroupStayForClaims) return;

    const selected = groupStays.find((gs) => gs.id === selectedGroupStayForClaims) || null;
    const hasManualHandling = Boolean(selected?.assignedOwner) || (Array.isArray(selected?.recommendedPropertyIds) && (selected?.recommendedPropertyIds?.length || 0) > 0);
    const hasConfirmed = Boolean(selected?.confirmedProperty);
    const needsReadvertise = claimsModalMode === "open" && hasManualHandling;

    // Validate required fields
    if (!claimsDeadline) {
      alert("Please set a deadline for claims submission");
      return;
    }

    if (hasConfirmed) {
      alert("This booking already has a confirmed property and cannot be opened for competitive claims.");
      return;
    }

    if (needsReadvertise && !reAdvertiseConfirmed) {
      alert("Confirm re-advertise to clear manual handling before opening claims.");
      return;
    }

    const deadlineDate = new Date(claimsDeadline);
    if (deadlineDate < new Date()) {
      alert("Deadline must be in the future");
      return;
    }

    try {
      setOpeningForClaims(selectedGroupStayForClaims);
      await api.patch(`/api/admin/group-stays/assignments/${selectedGroupStayForClaims}/open-for-claims`, {
        open: true,
        deadline: claimsDeadline,
        notes: claimsNotes.trim() || null,
        minDiscountPercent: minDiscount ? Number(minDiscount) : null,
        reAdvertise: needsReadvertise ? true : undefined,
      });
      await loadData();
      if (selectedGroupStayForClaims) {
        await loadAuditHistory(selectedGroupStayForClaims);
      }
      setShowClaimsModal(false);
      setSelectedGroupStayForClaims(null);
      setClaimsDeadline("");
      setClaimsNotes("");
      setMinDiscount("");
      setDeadlinePickerOpen(false);
      setClaimsModalMode("open");
      setReAdvertiseConfirmed(false);
    } catch (err: any) {
      const actionLabel = claimsModalMode === "edit" ? "save auction settings" : "open for claims";
      console.error(`Failed to ${actionLabel}:`, err);
      alert(err.response?.data?.error || `Failed to ${actionLabel}`);
    } finally {
      setOpeningForClaims(null);
    }
  };

  const handleSubmitCloseClaims = async () => {
    if (!selectedGroupStayForCloseClaims) return;
    const reasonCode = closeClaimsReasonCode.trim();
    const reasonDetails = closeClaimsReasonDetails.trim();
    if (!reasonCode) {
      setCloseClaimsReasonError("Select a reason to enable closing.");
      return;
    }

    if (reasonCode === "POLICY_DECISION" && !reasonDetails) {
      setCloseClaimsReasonError("Add details for Policy decision.");
      return;
    }

    try {
      setOpeningForClaims(selectedGroupStayForCloseClaims);
      await api.patch(`/api/admin/group-stays/assignments/${selectedGroupStayForCloseClaims}/open-for-claims`, {
        open: false,
        reasonCode,
        reasonDetails: reasonDetails || undefined,
      });
      await loadData();
      await loadAuditHistory(selectedGroupStayForCloseClaims);
      setShowCloseClaimsModal(false);
      setSelectedGroupStayForCloseClaims(null);
      setCloseClaimsReasonCode("");
      setCloseClaimsReasonDetails("");
      setCloseClaimsReasonError("");
    } catch (err: any) {
      console.error("Failed to close claims:", err);
      alert(err.response?.data?.error || "Failed to close claims");
    } finally {
      setOpeningForClaims(null);
    }
  };

  // Calculate filter counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: groupStays.length,
      PENDING: groupStays.filter(gs => gs.status.toUpperCase() === 'PENDING').length,
      PROCESSING: groupStays.filter(gs => gs.status.toUpperCase() === 'PROCESSING').length,
      CONFIRMED: groupStays.filter(gs => gs.status.toUpperCase() === 'CONFIRMED').length,
      COMPLETED: groupStays.filter(gs => gs.status.toUpperCase() === 'COMPLETED').length,
      CANCELED: groupStays.filter(gs => gs.status.toUpperCase() === 'CANCELED' || gs.status.toUpperCase() === 'CANCELLED').length,
    };
    return counts;
  }, [groupStays]);

  const ownerCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: groupStays.length,
    };
    owners.forEach(owner => {
      counts[owner.id.toString()] = groupStays.filter(gs => gs.assignedOwner?.id === owner.id).length;
    });
    return counts;
  }, [groupStays, owners]);

  // Calculate location match score for owner (higher = better match)
  const getLocationMatchScore = useCallback((owner: Owner, groupStay: GroupStay): number => {
    if (!owner.properties || owner.properties.length === 0) return 0;
    
    let maxScore = 0;
    for (const prop of owner.properties) {
      let score = 0;
      
      // Region match = 3 points
      if (prop.regionName && groupStay.toRegion && 
          prop.regionName.toLowerCase() === groupStay.toRegion.toLowerCase()) {
        score += 3;
        
        // District match = +2 points (total 5)
        if (prop.district && groupStay.toDistrict && 
            prop.district.toLowerCase() === groupStay.toDistrict.toLowerCase()) {
          score += 2;
          
          // Ward match = +1 point (total 6)
          if (prop.ward && groupStay.toWard && 
              prop.ward.toLowerCase() === groupStay.toWard.toLowerCase()) {
            score += 1;
          }
        }
      }
      
      maxScore = Math.max(maxScore, score);
    }
    
    return maxScore;
  }, []);

  // Get human-readable location match label
  const getLocationMatchLabel = useCallback((owner: Owner, groupStay: GroupStay, score: number): string => {
    if (score === 0) return "No location match";
    if (score >= 6) return "✓ Exact match (Region, District, Ward)";
    if (score >= 5) return "✓ Region & District match";
    if (score >= 3) return "✓ Region match";
    return "";
  }, []);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700 border-amber-200",
      PROCESSING: "bg-blue-100 text-blue-700 border-blue-200",
      CONFIRMED: "bg-green-100 text-green-700 border-green-200",
      COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
      CANCELED: "bg-red-100 text-red-700 border-red-200",
      CANCELLED: "bg-red-100 text-red-700 border-red-200",
    };
    const key = (status || "").toUpperCase();
    return colors[key] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  const filteredGroupStays = useMemo(() => {
    return groupStays.filter((gs) => {
      if (selectedStatus && gs.status.toUpperCase() !== selectedStatus.toUpperCase()) return false;

      if (selectedOwner) {
        const ownerId = Number(selectedOwner);
        if (gs.assignedOwner?.id !== ownerId) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const haystacks = [
          gs.user?.name,
          gs.user?.email,
          gs.user?.phone,
          gs.toRegion,
          gs.toDistrict,
          gs.toWard,
          gs.toLocation,
          gs.groupType,
          gs.accommodationType,
          gs.assignedOwner?.name,
          gs.assignedOwner?.email,
          gs.confirmedProperty?.title,
        ]
          .filter(Boolean)
          .map((v) => String(v).toLowerCase());

        return haystacks.some((value) => value.includes(query));
      }

      return true;
    });
  }, [groupStays, selectedStatus, selectedOwner, searchQuery]);

  return (
    <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <div className="pointer-events-none absolute inset-x-0 -top-10 h-72 bg-gradient-to-b from-brand-50/50 via-slate-50/30 to-transparent" />
      <div className="relative space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center justify-center text-center space-y-3">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-white border-2 border-brand-200 shadow-lg shadow-brand-500/10 mb-2 transition-all duration-300 hover:scale-105">
          <Users className="h-10 w-10 text-brand" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Group Stay Assignments</h1>
          <p className="text-base text-slate-600 mt-3 max-w-2xl mx-auto leading-relaxed">
            Assign owners and link properties to group stays
          </p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-700">Summary</div>
            <div className="text-xs text-slate-500">Quick counts by category (respects Status/Owner filters)</div>
          </div>
          {loading && groupStays.length === 0 ? (
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { key: "admin" as const, label: "Admin-handled", icon: User, value: summary?.admin ?? null },
            { key: "claims" as const, label: "Open for claims", icon: AlertCircle, value: summary?.claims ?? null },
            { key: "all" as const, label: "All", icon: Users, value: summary?.total ?? null },
          ]).map(({ key, label, icon: Icon, value }) => {
            const active = view === key;
            const resolvedValue = summaryLoading ? null : value;

            const palette =
              key === "claims"
                ? {
                    activeCard: "border-brand-200 bg-gradient-to-br from-brand-50 to-white shadow-md",
                    inactiveCard: "border-brand-100/80 bg-brand-50/20 hover:border-brand-200 hover:bg-brand-50/35 hover:shadow-sm",
                    activeIcon: "bg-white border-brand-200 text-brand",
                    inactiveIcon: "bg-brand-50/40 border-brand-100/80 text-brand group-hover:border-brand-200",
                  }
                : key === "admin"
                  ? {
                      activeCard: "border-slate-300 bg-gradient-to-br from-slate-50 to-white shadow-md",
                      inactiveCard: "border-slate-200 bg-slate-50/30 hover:border-slate-300 hover:bg-slate-50/60 hover:shadow-sm",
                      activeIcon: "bg-white border-slate-300 text-slate-700",
                      inactiveIcon: "bg-slate-50 border-slate-200 text-slate-600 group-hover:border-slate-300",
                    }
                  : {
                      activeCard: "border-slate-300 bg-white shadow-md",
                      inactiveCard: "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/30 hover:shadow-sm",
                      activeIcon: "bg-white border-slate-300 text-slate-700",
                      inactiveIcon: "bg-slate-50 border-slate-200 text-slate-600 group-hover:border-slate-300",
                    };

            return (
              <button
                key={key}
                type="button"
                onClick={() => setView(key)}
                className={`group text-left rounded-2xl border p-4 transition-all duration-200 ${
                  active ? palette.activeCard : palette.inactiveCard
                }`}
                aria-pressed={active}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-500">{label}</div>
                    <div className="mt-1">
                      <SummaryValue value={resolvedValue} />
                    </div>
                  </div>
                  <div
                    className={`inline-flex items-center justify-center h-10 w-10 rounded-xl border transition-colors ${
                      active ? palette.activeIcon : palette.inactiveIcon
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Filter Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
        {/* Search Bar */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-slate-700">Search</label>
            {loading && groupStays.length > 0 ? (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating…
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by customer, region, type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full box-border pl-12 pr-12 py-3.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all duration-200 text-sm sm:text-base bg-white shadow-sm hover:shadow-md"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Icon-only Filters toggle */}
            <button
              type="button"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className={`relative inline-flex items-center justify-center h-[52px] w-[52px] rounded-xl border-2 transition-all duration-200 ${
                filtersOpen
                  ? "bg-brand-50 border-brand-200 text-brand shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:border-brand hover:bg-brand/5"
              }`}
              aria-label={filtersOpen ? "Close filters" : "Open filters"}
              title={filtersOpen ? "Close filters" : "Open filters"}
            >
              <Filter className="h-5 w-5" />
              {filtersOpen ? (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-brand ring-2 ring-white" />
              ) : null}
            </button>
          </div>
        </div>

        {/* Collapsible Filter Sections */}
        {filtersOpen && (
          <div className="space-y-6 pt-4 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className={`grid grid-cols-1 ${owners.length > 0 ? "md:grid-cols-2" : ""} gap-4`}>
              {/* Status */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-slate-700">Filter by Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all duration-200 text-sm font-medium bg-white shadow-sm hover:shadow-md"
                >
                  <option value="">All statuses ({statusCounts.all})</option>
                  <option value="PENDING">Pending ({statusCounts.PENDING || 0})</option>
                  <option value="PROCESSING">Processing ({statusCounts.PROCESSING || 0})</option>
                  <option value="CONFIRMED">Confirmed ({statusCounts.CONFIRMED || 0})</option>
                  <option value="COMPLETED">Completed ({statusCounts.COMPLETED || 0})</option>
                  <option value="CANCELED">Canceled ({statusCounts.CANCELED || 0})</option>
                </select>
              </div>

              {/* Owner */}
              {owners.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-700">Filter by Owner</label>
                  <select
                    value={selectedOwner}
                    onChange={(e) => setSelectedOwner(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none transition-all duration-200 text-sm font-medium bg-white shadow-sm hover:shadow-md"
                    aria-label="Filter by Owner"
                    title="Filter by Owner"
                  >
                    <option value="">All Owners ({ownerCounts.all})</option>
                    {owners.map(owner => {
                      const count = ownerCounts[owner.id.toString()] || 0;
                      const locationInfo = owner.properties && owner.properties.length > 0
                        ? owner.properties
                            .map(p => [p.regionName, p.district].filter(Boolean).join(", "))
                            .filter((v, i, a) => a.indexOf(v) === i)
                            .slice(0, 2)
                            .join("; ")
                        : "No properties";
                      return (
                        <option key={owner.id} value={owner.id.toString()}>
                          {owner.name || owner.email} {count > 0 && `(${count})`} - {locationInfo}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Messages */}
      {ownersError && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3" role="alert" aria-live="polite">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">Error loading owners</p>
            <p className="text-sm text-red-700 mt-1">{ownersError}</p>
            <button
              onClick={loadOwners}
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-900 underline"
              aria-label="Retry loading owners"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {propertiesError && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3" role="alert" aria-live="polite">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">Error loading properties</p>
            <p className="text-sm text-red-700 mt-1">{propertiesError}</p>
            <button
              onClick={loadProperties}
              className="mt-2 text-sm font-medium text-red-700 hover:text-red-900 underline"
              aria-label="Retry loading properties"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Group Stays List */}
      <div className="space-y-4">
        {loading && groupStays.length === 0 ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filteredGroupStays.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-slate-100 mb-4">
              <Users className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No group stays found</h3>
            <p className="text-sm text-slate-600 mb-4">
              {searchQuery || selectedStatus || selectedOwner
                ? "Try adjusting your filters to see more results."
                : "There are no group stays to display at the moment."}
            </p>
            {(searchQuery || selectedStatus || selectedOwner) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("");
                  setSelectedOwner("");
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white font-medium text-sm hover:bg-brand-600 transition-colors"
                aria-label="Clear all filters"
              >
                <XCircle className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredGroupStays.map((gs) => (
            <div
              key={gs.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-brand-200 hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2"
            >
              {/* Card Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 border-2 border-brand-200 shadow-sm">
                      <UsersIcon className="h-7 w-7 text-brand" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">Group Stay #{gs.id}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(gs.status)}`}>
                          {gs.status}
                        </span>
                        {!gs.isOpenForClaims && (gs.assignedOwner || (Array.isArray(gs.recommendedPropertyIds) && gs.recommendedPropertyIds.length > 0)) ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 bg-slate-50 text-slate-700">
                            <Activity className="h-3.5 w-3.5" />
                            Admin-handled
                          </span>
                        ) : null}
                        {!gs.isOpenForClaims && !gs.assignedOwner && Array.isArray(gs.recommendedPropertyIds) && gs.recommendedPropertyIds.length > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border border-amber-200 bg-amber-50 text-amber-800">
                            <Clock className="h-3.5 w-3.5" />
                            Waiting customer selection
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {/* Customer */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white border border-slate-200 flex-shrink-0">
                      <User className="h-5 w-5 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Customer</div>
                      <div className="font-bold text-slate-900 truncate">{gs.user?.name || gs.user?.email || "N/A"}</div>
                      {gs.user?.phone && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-600">
                          <Phone className="h-3 w-3" />
                          <span>{gs.user.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Group Type */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white border border-slate-200 flex-shrink-0">
                      <UsersIcon className="h-5 w-5 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Group Type</div>
                      <div className="font-bold text-slate-900 capitalize">{gs.groupType}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-600">
                        <span className="font-medium">{gs.headcount} people</span>
                        <span>•</span>
                        <span>{gs.roomsNeeded} rooms</span>
                      </div>
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="col-span-2 md:col-span-1 flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white border border-slate-200 flex-shrink-0">
                      <MapPin className="h-5 w-5 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Destination</div>
                      <div className="font-bold text-slate-900">{gs.toRegion}</div>
                      {gs.toDistrict && (
                        <div className="text-xs text-slate-600 mt-1">{gs.toDistrict}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assignment Section */}
              <div className="border-t border-slate-100 bg-gradient-to-br from-slate-50/60 via-white to-white px-6 py-5 space-y-5">
                {gs.isOpenForClaims ? (
                  <div className="rounded-2xl border-2 border-brand-200 bg-gradient-to-r from-brand-50/60 via-white to-white p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-xs font-bold border border-brand-200">
                          <AlertCircle className="h-4 w-4" />
                          Auction Live
                        </div>
                        <p className="mt-2 text-sm text-slate-600">
                          Manual owner assignment is disabled while competitive claims are open.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/group-stays/claims?bookingId=${gs.id}`}
                          className="no-underline hover:no-underline inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white border-2 border-brand-200 text-brand hover:bg-brand-50 hover:shadow-md transition-all duration-200"
                          aria-label="Manage auction"
                          title="Manage auction"
                        >
                          <Gavel className="h-5 w-5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openClaimsSettingsModal(gs)}
                          className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white border-2 border-brand-200 text-brand hover:bg-brand-50 hover:shadow-md transition-all duration-200"
                          aria-label="Settings"
                          title="Settings"
                        >
                          <FileText className="h-5 w-5 text-brand" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-white/70 border border-slate-200">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deadline</div>
                        <div className="mt-1 text-sm font-bold text-slate-900">
                          {gs.claimsConfig?.deadline
                            ? new Date(gs.claimsConfig.deadline).toLocaleString()
                            : "Not set"}
                        </div>
                        {gs.claimsConfig?.updatedAt ? (
                          <div className="mt-1 text-xs text-slate-500">Updated: {new Date(gs.claimsConfig.updatedAt).toLocaleString()}</div>
                        ) : null}
                      </div>

                      <div className="p-3 rounded-xl bg-white/70 border border-slate-200">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Min Discount</div>
                        <div className="mt-1 text-sm font-bold text-slate-900">
                          {gs.claimsConfig?.minDiscountPercent !== null && gs.claimsConfig?.minDiscountPercent !== undefined
                            ? `${gs.claimsConfig.minDiscountPercent}%`
                            : "None"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">Optional quality gate</div>
                      </div>

                      <div className="p-3 rounded-xl bg-white/70 border border-slate-200">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Offers</div>
                        <div className="mt-1 text-sm font-bold text-slate-900">{(gs.claimsCount ?? 0).toLocaleString()}</div>
                        <div className="mt-1 text-xs text-slate-500">Top offers shown below</div>
                      </div>
                    </div>

                    {gs.claimsConfig?.notes ? (
                      <div className="mt-4 p-3 rounded-xl bg-white/70 border border-slate-200">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</div>
                        <div className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">{gs.claimsConfig.notes}</div>
                      </div>
                    ) : null}

                    <div className="mt-4">
                      {gs.claimsPreview && gs.claimsPreview.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Best offers (preview)</div>
                          {gs.claimsPreview.map((c) => {
                            const amount = Number(c.totalAmount);
                            const perNight = Number(c.offeredPricePerNight);
                            const discount = c.discountPercent !== null && c.discountPercent !== undefined ? Number(c.discountPercent) : null;
                            return (
                              <div key={c.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200">
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-slate-900 truncate">
                                    {c.owner?.name || c.owner?.email || `Owner #${c.owner?.id}`}
                                  </div>
                                  <div className="text-xs text-slate-600 truncate">
                                    {c.property?.title} • {c.property?.type}
                                  </div>
                                  <div className="mt-1 text-xs text-slate-500">
                                    Status: {c.status}
                                    {discount !== null && Number.isFinite(discount) ? ` • Discount: ${discount}%` : ""}
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                                    {Number.isFinite(amount) ? amount.toLocaleString() : String(c.totalAmount)} {c.currency}
                                  </div>
                                  <div className="text-xs text-slate-500 tabular-nums">
                                    /night: {Number.isFinite(perNight) ? perNight.toLocaleString() : String(c.offeredPricePerNight)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-white/70 border border-slate-200 text-sm text-slate-600">
                          No offers submitted yet.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Owner Assignment */}
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Assigned Owner</label>
                      {gs.assignedOwner ? (
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md">
                          <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-white border-2 border-green-200 shadow-sm">
                            <User className="h-6 w-6 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-green-900 truncate">{gs.assignedOwner.name || gs.assignedOwner.email}</div>
                            <div className="flex items-center gap-1.5 mt-1 text-xs text-green-700">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{gs.assignedOwner.email}</span>
                            </div>
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {gs.status === "REVIEWING" ? (
                            <div className="p-4 border-2 border-slate-200 rounded-xl bg-white shadow-sm">
                              <div className="text-sm font-semibold text-slate-900">Waiting for customer consultation + selection</div>
                              <p className="mt-1 text-xs text-slate-600">
                                Per policy, do not assign an owner directly from Assignments while a booking is in REVIEWING. Use the Booking page to consult the customer and send the 3 quoted recommendations (with discounts). Once the customer confirms one option, the assigned owner will auto-fill here.
                              </p>
                              <div className="mt-3">
                                <Link
                                  href={`/admin/group-stays/bookings?bookingId=${gs.id}`}
                                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white border-2 border-brand-200 text-brand hover:bg-brand-50 hover:shadow-md transition-all duration-200"
                                  aria-label="Go to booking"
                                  title="Go to booking"
                                >
                                  <FileText className="h-5 w-5" />
                                </Link>
                              </div>
                            </div>
                          ) : null}
                          {ownersLoading ? (
                            <div className="flex items-center justify-center p-4 border-2 border-slate-200 rounded-xl bg-slate-50">
                              <Loader2 className="h-5 w-5 animate-spin text-brand" />
                              <span className="ml-2 text-sm text-slate-600">Loading owners...</span>
                            </div>
                          ) : owners.length === 0 ? (
                            <div className="p-4 border-2 border-amber-200 rounded-xl bg-amber-50">
                              <p className="text-sm font-medium text-amber-900">No owners available</p>
                              <p className="text-xs text-amber-700 mt-1">Please add owners to the system first.</p>
                            </div>
                          ) : gs.status === "REVIEWING" ? null : (
                            <>
                              <select
                                disabled={assigning === gs.id || ownersLoading}
                                onChange={(e) => {
                                  const ownerId = Number(e.target.value);
                                  if (ownerId) handleAssignOwner(gs.id, ownerId);
                                }}
                                aria-label="Select owner to assign"
                                aria-describedby={`owner-select-help-${gs.id}`}
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none disabled:opacity-50 text-sm font-medium bg-white shadow-sm transition-all duration-200 hover:shadow-md"
                                defaultValue=""
                              >
                                <option value="">Select Owner by Location Match...</option>
                                {(() => {
                                  const sortedOwners = [...owners].sort((a, b) => {
                                    const aMatch = getLocationMatchScore(a, gs);
                                    const bMatch = getLocationMatchScore(b, gs);
                                    return bMatch - aMatch;
                                  });

                                  return sortedOwners.map(owner => {
                                    const matchScore = getLocationMatchScore(owner, gs);
                                    const matchLabel = getLocationMatchLabel(owner, gs, matchScore);
                                    return (
                                      <option key={owner.id} value={owner.id}>
                                        {owner.name || owner.email} {matchLabel && `- ${matchLabel}`}
                                      </option>
                                    );
                                  });
                                })()}
                              </select>
                              <p id={`owner-select-help-${gs.id}`} className="text-xs text-slate-500 flex items-center gap-1.5">
                                <MapPin className="h-3 w-3" aria-hidden="true" />
                                <span>Owners sorted by location match (Region → District → Ward)</span>
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Property Linking */}
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">Recommended Properties</label>
                      {gs.recommendedPropertyIds && Array.isArray(gs.recommendedPropertyIds) && gs.recommendedPropertyIds.length > 0 ? (
                        <div className="space-y-2">
                          {gs.recommendedPropertyIds.map((propId) => {
                            const prop = properties.find(p => p.id === propId);
                            return prop ? (
                              <div key={propId} className="flex items-center gap-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md">
                                <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white border-2 border-blue-200 flex-shrink-0">
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-blue-900 truncate">{prop.title}</div>
                                  <div className="text-xs text-blue-700 capitalize">{prop.type}</div>
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <>
                          {gs.status === "REVIEWING" ? (
                            <div className="p-4 border-2 border-slate-200 rounded-xl bg-white shadow-sm min-h-[100px]">
                              <div className="text-sm font-semibold text-slate-900">No recommendations sent yet</div>
                              <p className="mt-1 text-xs text-slate-600">
                                Send the recommended options (with prices/discounts) from the Booking page. This Assignments page will reflect them automatically.
                              </p>
                              <div className="mt-3">
                                <Link
                                  href={`/admin/group-stays/bookings?bookingId=${gs.id}`}
                                  className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-white border-2 border-slate-200 text-slate-900 hover:bg-slate-50 hover:shadow-md transition-all duration-200"
                                  aria-label="Go to booking"
                                  title="Go to booking"
                                >
                                  <FileText className="h-5 w-5" />
                                </Link>
                              </div>
                            </div>
                          ) : null}
                          {propertiesLoading ? (
                            <div className="flex items-center justify-center p-4 border-2 border-slate-200 rounded-xl bg-slate-50 min-h-[100px]">
                              <Loader2 className="h-5 w-5 animate-spin text-brand" />
                              <span className="ml-2 text-sm text-slate-600">Loading properties...</span>
                            </div>
                          ) : properties.length === 0 ? (
                            <div className="p-4 border-2 border-amber-200 rounded-xl bg-amber-50 min-h-[100px]">
                              <p className="text-sm font-medium text-amber-900">No properties available</p>
                              <p className="text-xs text-amber-700 mt-1">No approved properties found in this region.</p>
                            </div>
                          ) : properties.filter(p => p.regionName === gs.toRegion || !gs.toRegion).length === 0 ? (
                            <div className="p-4 border-2 border-amber-200 rounded-xl bg-amber-50 min-h-[100px]">
                              <p className="text-sm font-medium text-amber-900">No properties in this region</p>
                              <p className="text-xs text-amber-700 mt-1">No approved properties found in {gs.toRegion}.</p>
                            </div>
                          ) : gs.status === "REVIEWING" ? null : (
                            <select
                              disabled={linking === gs.id || propertiesLoading}
                              onChange={(e) => {
                                const selected = Array.from(e.target.selectedOptions, opt => Number(opt.value));
                                if (selected.length > 0) handleLinkProperties(gs.id, selected);
                              }}
                              multiple
                              aria-label="Select properties to recommend"
                              aria-describedby={`property-select-help-${gs.id}`}
                              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-brand outline-none disabled:opacity-50 min-h-[100px] text-sm font-medium bg-white shadow-sm transition-all duration-200 hover:shadow-md"
                            >
                              {properties.filter(p => p.regionName === gs.toRegion || !gs.toRegion).map(prop => (
                                <option key={prop.id} value={prop.id}>{prop.title} ({prop.type})</option>
                              ))}
                            </select>
                          )}
                          {gs.status === "REVIEWING" ? null : (
                            <p id={`property-select-help-${gs.id}`} className="text-xs text-slate-500 mt-2">
                              Hold Ctrl/Cmd to select multiple properties
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {gs.confirmedProperty && (
                  <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-brand-50 to-brand-100 border-2 border-brand-200 rounded-xl shadow-sm">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-white border-2 border-brand-200 shadow-sm">
                      <CheckCircle className="h-6 w-6 text-brand" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-bold text-brand-600 uppercase tracking-wide mb-1">Confirmed Property</div>
                      <div className="font-bold text-brand-900">{gs.confirmedProperty.title}</div>
                    </div>
                  </div>
                )}

                {/* Open for Claims Toggle */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between p-4 bg-white rounded-xl border-2 border-slate-100 shadow-sm">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Open for Competitive Claims</label>
                      <p className="text-xs text-slate-500">Allow owners to submit competitive offers</p>
                      {gs.isOpenForClaims && gs.openedForClaimsAt && (
                        <p className="text-xs text-brand-600 mt-2 flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Opened: {new Date(gs.openedForClaimsAt).toLocaleString(undefined, {
                              year: "numeric",
                              month: "2-digit",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleOpenForClaims(gs.id, gs.isOpenForClaims || false)}
                      disabled={openingForClaims === gs.id}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 shadow-sm ${
                        gs.isOpenForClaims 
                          ? 'bg-gradient-to-r from-brand-600 to-brand-700 shadow-brand-500/30' 
                          : 'bg-slate-200'
                      } ${openingForClaims === gs.id ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                      aria-label={gs.isOpenForClaims ? "Close for claims" : "Open for claims"}
                      title={gs.isOpenForClaims ? "Close for claims" : "Open for claims"}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                          gs.isOpenForClaims ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Audit History Section */}
                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={() => {
                      if (!expandedAudits[gs.id]) {
                        loadAuditHistory(gs.id);
                      }
                      setExpandedAudits(prev => ({ ...prev, [gs.id]: !prev[gs.id] }));
                    }}
                    className="w-full flex items-center justify-between p-4 bg-white rounded-xl border-2 border-slate-100 shadow-sm hover:border-brand-200 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-purple-50 border border-purple-200">
                        <History className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-sm font-bold text-slate-900">Audit History</h4>
                        <p className="text-xs text-slate-500">View all admin actions for this group stay</p>
                      </div>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${expandedAudits[gs.id] ? 'rotate-180' : ''}`} />
                  </button>

                  {expandedAudits[gs.id] && (
                    <div className="mt-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-4">
                        {auditLoading[gs.id] ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-brand" />
                          </div>
                        ) : !auditHistory[gs.id] || auditHistory[gs.id].length === 0 ? (
                          <div className="text-center py-8">
                            <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No audit history found</p>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {auditHistory[gs.id].map((audit: any, idx: number) => {
                              const getActionIcon = () => {
                                const action = audit.action?.toUpperCase() || '';
                                if (action.includes('ASSIGNED')) return <User className="h-4 w-4 text-blue-600" />;
                                if (action.includes('RECOMMENDED')) return <Building2 className="h-4 w-4 text-indigo-600" />;
                                if (action.includes('OPENED')) return <CheckCircle className="h-4 w-4 text-green-600" />;
                                if (action.includes('CLOSED')) return <Ban className="h-4 w-4 text-red-600" />;
                                return <Activity className="h-4 w-4 text-slate-600" />;
                              };

                              const getActionColor = () => {
                                const action = audit.action?.toUpperCase() || '';
                                if (action.includes('ASSIGNED')) return 'bg-blue-50 border-blue-200';
                                if (action.includes('RECOMMENDED')) return 'bg-indigo-50 border-indigo-200';
                                if (action.includes('OPENED')) return 'bg-green-50 border-green-200';
                                if (action.includes('CLOSED')) return 'bg-red-50 border-red-200';
                                return 'bg-slate-50 border-slate-200';
                              };

                              return (
                                <div key={audit.id || idx} className={`p-4 rounded-lg border ${getActionColor()} transition-all hover:shadow-sm`}>
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                      {getActionIcon()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-sm font-semibold text-slate-900 truncate">
                                          {audit.action?.replace(/_/g, ' ') || 'Unknown Action'}
                                        </span>
                                        <span className="text-xs text-slate-500 flex-shrink-0">
                                          {new Date(audit.createdAt).toLocaleDateString()}
                                        </span>
                                      </div>
                                      {audit.description && (
                                        <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                                          {audit.description}
                                        </p>
                                      )}
                                      {audit.metadata && typeof audit.metadata === 'object' && (
                                        <div className="text-xs text-slate-500 mb-2">
                                          {Object.entries(audit.metadata).map(([key, value]) => (
                                            value ? (
                                              <div key={key} className="truncate">
                                                <span className="font-medium">{key}:</span> {String(value)}
                                              </div>
                                            ) : null
                                          ))}
                                        </div>
                                      )}
                                      <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Clock className="h-3 w-3" />
                                        <span>
                                          {new Date(audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                        {audit.admin && (
                                          <>
                                            <span>•</span>
                                            <span>By: {audit.admin.name || audit.admin.email || `Admin #${audit.adminId}`}</span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Open for Claims Modal */}
      {showClaimsModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-x-hidden"
          onClick={() => {
            setShowClaimsModal(false);
            setSelectedGroupStayForClaims(null);
            setClaimsDeadline("");
            setClaimsNotes("");
            setMinDiscount("");
            setDeadlinePickerOpen(false);
            setClaimsModalMode("open");
            setReAdvertiseConfirmed(false);
          }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-brand-50/30 via-slate-50 to-white overflow-x-hidden min-w-0">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 border-2 border-brand-200 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md hover:border-brand-300 flex-shrink-0">
                  <AlertCircle className="h-7 w-7 text-brand transition-transform duration-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight truncate">
                    {claimsModalMode === "edit" ? "Manage Competitive Claims" : "Open for Competitive Claims"}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 truncate">
                    {claimsModalMode === "edit"
                      ? "Adjust auction settings without closing"
                      : "Configure settings before opening for owner submissions"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowClaimsModal(false);
                  setSelectedGroupStayForClaims(null);
                  setClaimsDeadline("");
                  setClaimsNotes("");
                  setMinDiscount("");
                  setClaimsModalMode("open");
                  setReAdvertiseConfirmed(false);
                }}
                className="text-slate-400 hover:text-slate-600 transition-all duration-200 hover:scale-110 p-1 rounded-lg hover:bg-slate-100 flex-shrink-0 ml-2"
                aria-label="Close modal"
                title="Close modal"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-6 min-w-0">
                {(() => {
                  const selected = groupStays.find((gs) => gs.id === selectedGroupStayForClaims) || null;
                  const hasManualHandling = Boolean(selected?.assignedOwner) || (Array.isArray(selected?.recommendedPropertyIds) && (selected?.recommendedPropertyIds?.length || 0) > 0);
                  const hasConfirmed = Boolean(selected?.confirmedProperty);
                  const needsReadvertise = claimsModalMode === "open" && hasManualHandling;

                  if (hasConfirmed) {
                    return (
                      <div className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 p-4">
                        <div className="text-sm font-bold text-red-900">Cannot open claims</div>
                        <div className="mt-1 text-sm text-red-800">This booking already has a confirmed property.</div>
                      </div>
                    );
                  }

                  if (!needsReadvertise) return null;

                  return (
                    <div className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-4">
                      <div className="text-sm font-bold text-amber-900">Re-advertise required</div>
                      <div className="mt-1 text-sm text-amber-800">
                        This booking has already been handled directly (owner/properties assigned). Opening claims will clear manual handling.
                      </div>
                      <label className="mt-3 flex items-start gap-3 text-sm text-amber-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={reAdvertiseConfirmed}
                          onChange={(e) => setReAdvertiseConfirmed(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-amber-300 text-brand focus:ring-brand"
                        />
                        <span className="leading-5">I confirm re-advertise and clear manual handling.</span>
                      </label>
                    </div>
                  );
                })()}

                {/* Two Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                  {/* Submission Deadline */}
                  <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 min-w-0 transition-all duration-300 hover:border-brand-200 hover:shadow-sm hover:bg-slate-50/70">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                      Submission Deadline <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setDeadlinePickerOpen(true)}
                        className="w-full box-border pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none text-sm font-medium text-slate-900 shadow-sm transition-all duration-300 hover:border-brand-300 hover:shadow-md focus:shadow-lg focus:scale-[1.01] text-left flex items-center justify-between"
                        aria-label="Claims submission deadline (required)"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none transition-colors duration-300" />
                          <span className={claimsDeadline ? "text-slate-900" : "text-slate-400 truncate"}>
                            {claimsDeadline
                              ? new Date(claimsDeadline + "T00:00:00").toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Select deadline date"}
                          </span>
                        </div>
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                      </button>
                      {deadlinePickerOpen && (
                        <>
                          <div className="fixed inset-0 z-[60]" onClick={() => setDeadlinePickerOpen(false)} />
                          <div className="absolute z-[70] top-full left-0 mt-2">
                            <DatePicker
                              selected={claimsDeadline || undefined}
                              onSelectAction={(s) => {
                                const dateStr = Array.isArray(s) ? s[0] : s;
                                setClaimsDeadline(dateStr);
                                setDeadlinePickerOpen(false);
                              }}
                              onCloseAction={() => setDeadlinePickerOpen(false)}
                              allowRange={false}
                              minDate={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="break-words">Owners must submit before this date</span>
                    </p>
                  </div>

                  {/* Minimum Discount */}
                  <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 min-w-0 transition-all duration-300 hover:border-brand-200 hover:shadow-sm hover:bg-slate-50/70">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                      Minimum Discount <span className="text-xs font-normal text-slate-400 normal-case">(Optional)</span>
                    </label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none transition-colors duration-300" />
                      <input
                        type="number"
                        value={minDiscount}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || (Number(val) >= 0 && Number(val) <= 100)) {
                            setMinDiscount(val);
                          }
                        }}
                        placeholder="e.g., 10"
                        min="0"
                        max="100"
                        className="w-full box-border pl-10 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none text-sm font-medium text-slate-900 shadow-sm transition-all duration-300 hover:border-brand-300 hover:shadow-md focus:shadow-lg focus:scale-[1.01]"
                        aria-label="Minimum discount percentage"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                      <Percent className="h-3 w-3 flex-shrink-0" />
                      <span className="break-words">Minimum discount percentage (0-100%)</span>
                    </p>
                  </div>
                </div>

                {/* Additional Notes - Separated */}
                <div className="mt-6 pt-6 border-t border-slate-200 min-w-0">
                  <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 w-full min-w-0 transition-all duration-300 hover:border-brand-200 hover:shadow-sm hover:bg-slate-50/70">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                      Additional Notes <span className="text-xs font-normal text-slate-400 normal-case">(Optional)</span>
                    </label>
                    <textarea
                      value={claimsNotes}
                      onChange={(e) => setClaimsNotes(e.target.value)}
                      placeholder="Add any special requirements, preferences, or notes for owners..."
                      rows={2}
                      className="w-full box-border px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none text-sm font-medium text-slate-900 resize-none shadow-sm transition-all duration-300 hover:border-brand-300 hover:shadow-md focus:shadow-lg focus:scale-[1.01]"
                      aria-label="Additional notes for claims"
                    />
                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                      <FileText className="h-3 w-3 flex-shrink-0" />
                      <span className="break-words">Visible to owners when submitting claims</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => {
                  setShowClaimsModal(false);
                  setSelectedGroupStayForClaims(null);
                  setClaimsDeadline("");
                  setClaimsNotes("");
                  setMinDiscount("");
                  setClaimsModalMode("open");
                  setReAdvertiseConfirmed(false);
                }}
                className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 active:scale-95"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitClaimsForm}
                disabled={(() => {
                  if (!claimsDeadline) return true;
                  if (openingForClaims === selectedGroupStayForClaims) return true;
                  const selected = groupStays.find((gs) => gs.id === selectedGroupStayForClaims) || null;
                  const hasManualHandling = Boolean(selected?.assignedOwner) || (Array.isArray(selected?.recommendedPropertyIds) && (selected?.recommendedPropertyIds?.length || 0) > 0);
                  const hasConfirmed = Boolean(selected?.confirmedProperty);
                  const needsReadvertise = claimsModalMode === "open" && hasManualHandling;
                  if (hasConfirmed) return true;
                  if (needsReadvertise && !reAdvertiseConfirmed) return true;
                  return false;
                })()}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold text-sm shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 active:scale-95 disabled:active:scale-100 relative overflow-hidden group"
                aria-label={claimsModalMode === "edit" ? "Save auction settings" : "Open for claims"}
              >
                {openingForClaims === selectedGroupStayForClaims ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin transition-all duration-300" />
                    <span className="animate-pulse">{claimsModalMode === "edit" ? "Saving..." : "Opening..."}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    <span>{claimsModalMode === "edit" ? "Save Settings" : "Open for Claims"}</span>
                  </>
                )}
                {/* Animated gradient overlay on hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Claims Modal (requires reason) */}
      {showCloseClaimsModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 overflow-x-hidden"
          onClick={() => {
            setShowCloseClaimsModal(false);
            setSelectedGroupStayForCloseClaims(null);
            setCloseClaimsReasonCode("");
            setCloseClaimsReasonDetails("");
            setCloseClaimsReasonError("");
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 bg-gradient-to-r from-red-50/40 via-slate-50 to-white overflow-x-hidden min-w-0">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 shadow-sm flex-shrink-0">
                  <Ban className="h-7 w-7 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight truncate">Close Competitive Claims</h2>
                  <p className="text-sm text-slate-600 mt-1 truncate">A reason is required for audit and accountability</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCloseClaimsModal(false);
                  setSelectedGroupStayForCloseClaims(null);
                  setCloseClaimsReasonCode("");
                  setCloseClaimsReasonDetails("");
                  setCloseClaimsReasonError("");
                }}
                className="text-slate-400 hover:text-slate-600 transition-all duration-200 hover:scale-110 p-1 rounded-lg hover:bg-slate-100 flex-shrink-0 ml-2"
                aria-label="Close modal"
                title="Close modal"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="p-6 min-w-0">
                <div className="grid grid-cols-1 gap-4">
                  <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 w-full">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={closeClaimsReasonCode}
                      onChange={(e) => {
                        setCloseClaimsReasonCode(e.target.value);
                        setCloseClaimsReasonError("");
                      }}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none text-sm font-medium text-slate-900 shadow-sm transition-all duration-300 hover:border-brand-300 hover:shadow-md"
                      aria-label="Reason code for closing competitive claims"
                    >
                      <option value="">Select a reason…</option>
                      <option value="OWNER_CONFIRMED">Owner confirmed</option>
                      <option value="NO_VALID_OFFERS">No valid offers</option>
                      <option value="POLICY_DECISION">Policy decision</option>
                    </select>
                    {closeClaimsReasonError ? (
                      <p className="text-xs text-red-600 mt-2">{closeClaimsReasonError}</p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2">Select a reason to enable closing. This will be saved to the audit log.</p>
                    )}
                  </div>

                  <div className="bg-slate-50/50 rounded-lg p-4 border border-slate-100 w-full">
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                      Details <span className="text-xs font-normal text-slate-400 normal-case">(Optional)</span>
                    </label>
                    <textarea
                      value={closeClaimsReasonDetails}
                      onChange={(e) => setCloseClaimsReasonDetails(e.target.value)}
                      placeholder="Add short context (e.g., selected owner, key issue, decision note)"
                      rows={3}
                      className="w-full box-border px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand focus:border-brand outline-none text-sm font-medium text-slate-900 resize-none shadow-sm transition-all duration-300 hover:border-brand-300 hover:shadow-md"
                      aria-label="Optional details for closing competitive claims"
                    />
                    {closeClaimsReasonCode === "POLICY_DECISION" ? (
                      <p className="text-xs text-amber-700 mt-2">Required for Policy decision.</p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2">Optional.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => {
                  setShowCloseClaimsModal(false);
                  setSelectedGroupStayForCloseClaims(null);
                  setCloseClaimsReasonCode("");
                  setCloseClaimsReasonDetails("");
                  setCloseClaimsReasonError("");
                }}
                className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 active:scale-95"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitCloseClaims}
                disabled={
                  !closeClaimsReasonCode.trim() ||
                  (closeClaimsReasonCode === "POLICY_DECISION" && !closeClaimsReasonDetails.trim()) ||
                  openingForClaims === selectedGroupStayForCloseClaims
                }
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold text-sm shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/30 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 active:scale-95"
                aria-label="Close claims"
              >
                {openingForClaims === selectedGroupStayForCloseClaims ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="animate-pulse">Closing...</span>
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    <span>Close Claims</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

