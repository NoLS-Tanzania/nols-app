"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { Users, User, CheckCircle, Loader2, Search, Clock, XCircle, Filter, ChevronDown, MapPin, Calendar, Building2, Users as UsersIcon, Phone, Mail, AlertCircle, Percent, FileText, History, Activity, Ban } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";

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

export default function AdminGroupStayAssignmentsPage() {
  const [groupStays, setGroupStays] = useState<GroupStay[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [auditHistory, setAuditHistory] = useState<Record<number, any[]>>({});
  const [auditLoading, setAuditLoading] = useState<Record<number, boolean>>({});
  const [expandedAudits, setExpandedAudits] = useState<Record<number, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
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
    // If closing, just close directly
    if (isOpen) {
      try {
        setOpeningForClaims(groupStayId);
        await api.patch(`/api/admin/group-stays/assignments/${groupStayId}/open-for-claims`, { open: false });
        await loadData();
        await loadAuditHistory(groupStayId);
      } catch (err: any) {
        console.error("Failed to close claims:", err);
        alert(err.response?.data?.error || "Failed to close claims");
      } finally {
        setOpeningForClaims(null);
      }
      return;
    }

    // If opening, show modal first
    setSelectedGroupStayForClaims(groupStayId);
    setShowClaimsModal(true);
    // Reset form
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setClaimsDeadline(tomorrow.toISOString().split('T')[0]);
    setClaimsNotes("");
    setMinDiscount("");
    setDeadlinePickerOpen(false);
  };

  const handleSubmitClaimsForm = async () => {
    if (!selectedGroupStayForClaims) return;

    // Validate required fields
    if (!claimsDeadline) {
      alert("Please set a deadline for claims submission");
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
    } catch (err: any) {
      console.error("Failed to open for claims:", err);
      alert(err.response?.data?.error || "Failed to open for claims");
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

  const filteredGroupStays = useMemo(() => {
    return groupStays.filter(gs => {
      // Status filter
      if (selectedStatus && gs.status.toUpperCase() !== selectedStatus.toUpperCase()) return false;
      
      // Owner filter
      if (selectedOwner) {
        const ownerId = Number(selectedOwner);
        if (gs.assignedOwner?.id !== ownerId) return false;
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          gs.user?.name?.toLowerCase().includes(query) ||
          gs.user?.email?.toLowerCase().includes(query) ||
          gs.toRegion?.toLowerCase().includes(query) ||
          gs.groupType?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [groupStays, selectedStatus, selectedOwner, searchQuery]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: "bg-amber-100 text-amber-700 border-amber-200",
      PROCESSING: "bg-blue-100 text-blue-700 border-blue-200",
      CONFIRMED: "bg-green-100 text-green-700 border-green-200",
      COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
      CANCELED: "bg-red-100 text-red-700 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Search and Filter Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 space-y-4">
        {/* Search Bar */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-semibold text-slate-700">Search</label>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-slate-200 hover:border-brand hover:bg-brand/5 transition-all duration-200 text-sm font-semibold text-slate-700"
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="relative">
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
        </div>

        {/* Collapsible Filter Sections */}
        {filtersOpen && (
          <div className="space-y-6 pt-4 border-t border-slate-200">
            {/* Status Filter Section */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Filter by Status</label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setSelectedStatus("")}
                  className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 transition-all duration-300 font-semibold text-sm ${
                    !selectedStatus
                      ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white border-brand-600 shadow-lg shadow-brand-500/30 scale-105'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md hover:scale-105'
                  }`}
                >
                  <Users className={`h-4 w-4 ${!selectedStatus ? 'text-white' : 'text-slate-500'}`} />
                  <span>All Statuses</span>
                  {statusCounts.all > 0 && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      !selectedStatus
                        ? 'bg-white/25 text-white backdrop-blur-sm' 
                        : 'bg-slate-100 text-slate-700'
                    }`}>
                      {statusCounts.all}
                    </span>
                  )}
                </button>

                {[
                  { key: 'PENDING', label: 'Pending', icon: Clock },
                  { key: 'PROCESSING', label: 'Processing', icon: Clock },
                  { key: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
                  { key: 'COMPLETED', label: 'Completed', icon: CheckCircle },
                  { key: 'CANCELED', label: 'Canceled', icon: XCircle },
                ].map(({ key, label, icon: Icon }) => {
                  const isActive = selectedStatus === key;
                  const count = statusCounts[key] || 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedStatus(key)}
                      className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-xl border-2 transition-all duration-300 font-semibold text-sm ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white border-brand-600 shadow-lg shadow-brand-500/30 scale-105'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md hover:scale-105'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span>{label}</span>
                      {count > 0 && (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          isActive 
                            ? 'bg-white/25 text-white backdrop-blur-sm' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Owner Filter Section */}
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
                          .filter((v, i, a) => a.indexOf(v) === i) // unique
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
        {filteredGroupStays.length === 0 ? (
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
            <div key={gs.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-brand-200">
              {/* Card Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 border-2 border-brand-200 shadow-sm">
                      <UsersIcon className="h-7 w-7 text-brand" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-1">Group Stay #{gs.id}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(gs.status)}`}>
                        {gs.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
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
              <div className="border-t border-slate-100 bg-gradient-to-br from-slate-50/50 to-white px-6 py-5 space-y-5">
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
                        ) : (
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
                                // Sort owners by location match priority
                                const sortedOwners = [...owners].sort((a, b) => {
                                  const aMatch = getLocationMatchScore(a, gs);
                                  const bMatch = getLocationMatchScore(b, gs);
                                  return bMatch - aMatch; // Higher score first
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
                        ) : (
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
                        <p id={`property-select-help-${gs.id}`} className="text-xs text-slate-500 mt-2">
                          Hold Ctrl/Cmd to select multiple properties
                        </p>
                      </>
                    )}
                  </div>
                </div>

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
                          <span>Opened: {new Date(gs.openedForClaimsAt).toLocaleDateString()}</span>
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
                    <div className="mt-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight truncate">Open for Competitive Claims</h2>
                  <p className="text-sm text-slate-600 mt-1 truncate">Configure settings before opening for owner submissions</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowClaimsModal(false);
                  setSelectedGroupStayForClaims(null);
                  setClaimsDeadline("");
                  setClaimsNotes("");
                  setMinDiscount("");
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
                              onSelect={(s) => {
                                const dateStr = Array.isArray(s) ? s[0] : s;
                                setClaimsDeadline(dateStr);
                                setDeadlinePickerOpen(false);
                              }}
                              onClose={() => setDeadlinePickerOpen(false)}
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
                }}
                className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 active:scale-95"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitClaimsForm}
                disabled={!claimsDeadline || openingForClaims === selectedGroupStayForClaims}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold text-sm shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 active:scale-95 disabled:active:scale-100 relative overflow-hidden group"
                aria-label="Open for claims"
              >
                {openingForClaims === selectedGroupStayForClaims ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin transition-all duration-300" />
                    <span className="animate-pulse">Opening...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    <span>Open for Claims</span>
                  </>
                )}
                {/* Animated gradient overlay on hover */}
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

