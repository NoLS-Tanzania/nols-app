"use client";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, User, Building2, FileText, DollarSign, Mail, Phone, Calendar, CheckCircle2, XCircle, Clock, Eye, Shield, Ban, Copy, MapPin, ImageIcon, Bell, Send, X, History, Activity, FileCheck, Home, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import VerifiedIcon from "@/components/VerifiedIcon";
import TableRow from "@/components/TableRow";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

type Owner = {
  id:number; name:string|null; email:string; phone:string|null;
  suspendedAt:string|null; kycStatus:string; createdAt:string;
  profile?: any;
  _count: { properties:number };
};

type Snapshot = {
  propertiesRecent: { id:number; title:string; status:string; type:string; createdAt:string }[];
  invoicesCount: number;
  revenue: { netSum:number; grossSum:number; commissionSum:number; paidCount:number };
};

type Doc = { id:number; type:string; url:string; status:string; reason?:string|null; createdAt:string };

type Property = {
  id: number;
  title: string;
  status: string;
  type: string;
  regionName: string | null;
  district: string | null;
  ward: string | null;
  primaryImage: string | null;
  basePrice: number | null;
  currency: string | null;
  totalBedrooms: number;
  totalBathrooms: number;
  maxGuests: number;
};

export default function OwnerDetailPage({ params }: { params: { id: string }}) {
  const ownerId = Number(params.id);
  const [owner, setOwner] = useState<Owner|null>(null);
  const [snap, setSnap] = useState<Snapshot|null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [tab, setTab] = useState<"overview"|"properties"|"documents"|"notes"|"bookings">("overview");
  const [note, setNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [notifyOwner, setNotifyOwner] = useState(true);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notificationSubject, setNotificationSubject] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [showImpersonateForm, setShowImpersonateForm] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState("");
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsStatus, setBookingsStatus] = useState<string>("");
  const [bookingsSearch, setBookingsSearch] = useState<string>("");
  const [bookingsSortBy, setBookingsSortBy] = useState<string | null>(null);
  const [bookingsSortDir, setBookingsSortDir] = useState<"asc" | "desc">("desc");


  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get<{ owner:Owner; snapshot:Snapshot }>(`/api/admin/owners/${ownerId}`);
      setOwner(r.data.owner); 
      setSnap(r.data.snapshot); 
    } catch (err: any) {
      console.error('Failed to load owner:', err);
      console.error('Error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        url: err?.config?.url,
      });
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  const loadDocs = useCallback(async () => {
    try {
      const r = await api.get<{ items:Doc[] }>(`/api/admin/owners/${ownerId}/documents`);
    setDocs(r.data.items);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
      setDocs([]);
    }
  }, [ownerId]);

  const loadAuditHistory = useCallback(async () => {
    try {
      setAuditLoading(true);
      // API shape (admin.audits): { ok: true, data: { page, total, items: [...] } }
      const r = await api.get<any>(`/api/admin/audits?targetId=${ownerId}`);
      const raw: any = r.data;
      const next =
        Array.isArray(raw)
          ? raw
          : (
              (Array.isArray(raw?.items) && raw.items) ||
              (Array.isArray(raw?.data) && raw.data) ||
              (Array.isArray(raw?.data?.items) && raw.data.items) ||
              []
            );

      setAuditHistory(next);
    } catch (err: any) {
      console.error("Failed to load audit history:", err);
      setAuditHistory([]);
    } finally {
      setAuditLoading(false);
    }
  }, [ownerId]);

  async function loadBookings() {
    try {
      setBookingsLoading(true);
      const params: any = {
        ownerId,
        page: bookingsPage,
        pageSize: 25,
      };
      if (bookingsStatus) params.status = bookingsStatus;
      if (bookingsSearch) params.q = bookingsSearch;
      if (bookingsSortBy) {
        params.sortBy = bookingsSortBy;
        params.sortDir = bookingsSortDir;
      }
      const r = await api.get<{ items: any[]; total: number }>("/api/admin/bookings", { params });
      setBookings(r.data.items || []);
      setBookingsTotal(r.data.total || 0);
    } catch (err: any) {
      console.error("Failed to load bookings:", err);
      setBookings([]);
      setBookingsTotal(0);
    } finally {
      setBookingsLoading(false);
    }
  }

  async function loadProperties(){
    try {
      setPropertiesLoading(true);
      const r = await api.get<{ items: any[]; total: number }>(`/api/admin/properties`, {
        params: { ownerId, page: 1, pageSize: 100 }
      });
      
      // Transform properties to match our Property type
      const transformed = r.data.items.map((p: any) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        type: p.type,
        regionName: p.regionName,
        district: p.district,
        ward: p.ward,
        primaryImage: Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : 
                     (p.images && Array.isArray(p.images) && p.images.length > 0 ? p.images[0].url : null),
        basePrice: p.basePrice || null,
        currency: p.currency || 'TZS',
        totalBedrooms: p.totalBedrooms || 0,
        totalBathrooms: p.totalBathrooms || 0,
        maxGuests: p.maxGuests || 0,
      }));
      
      setProperties(transformed);
    } catch (err: any) {
      console.error('Failed to load properties:', err);
      setProperties([]);
    } finally {
      setPropertiesLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void loadDocs();
    void loadAuditHistory();
  }, [load, loadAuditHistory, loadDocs]);

  // Load properties when properties tab is active
  useEffect(() => {
    if (tab === "properties" && properties.length === 0 && !propertiesLoading) {
      loadProperties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Load bookings when bookings tab is active
  useEffect(() => {
    if (tab === "bookings") {
      loadBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, bookingsPage, bookingsStatus, bookingsSearch, bookingsSortBy, bookingsSortDir]);

  // Reset bookings page when filters change
  useEffect(() => {
    if (tab === "bookings") {
      setBookingsPage(1);
    }
  }, [bookingsStatus, bookingsSearch, tab]);

  // live updates
  useEffect(()=>{
    // Use direct API URL for Socket.IO in browser to ensure WebSocket works in dev
    const url = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
      : (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "");
    const s: Socket = io(url, { transports: ["websocket"] });
    const refresh = ()=>{ load(); loadDocs(); loadAuditHistory(); };
    s.on("admin:owner:updated", (p:any)=>{ if(p?.ownerId===ownerId) refresh(); });
    s.on("admin:kyc:updated", (p:any)=>{ if(p?.ownerId===ownerId) refresh(); });
    return ()=>{ s.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ownerId]);

  function getKycStatusBadge(status: string) {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'approved_kyc') {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Approved KYC
        </span>
      );
    }
    if (statusLower === 'pending_kyc') {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-sm font-medium">
          <Clock className="h-4 w-4" />
          Pending KYC
        </span>
      );
    }
    if (statusLower === 'rejected_kyc') {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-medium">
          <XCircle className="h-4 w-4" />
          Rejected KYC
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-800 text-sm font-medium">
        {status || 'Not Set'}
      </span>
    );
  }

  function getAccountStatusBadge(isSuspended: boolean) {
    if (isSuspended) {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-800 text-sm font-medium">
          <Ban className="h-4 w-4" />
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-800 text-sm font-medium">
        <CheckCircle2 className="h-4 w-4" />
        Active
      </span>
    );
  }

  const auditItems = Array.isArray(auditHistory) ? auditHistory : [];

  async function handleSuspendSubmit(){
    if (!suspendReason.trim()) {
      alert("Please provide a reason for suspension. This notification will be sent to the owner.");
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post(`/api/admin/owners/${ownerId}/suspend`, { 
        reason: suspendReason.trim(),
        notifyOwner: notifyOwner 
      });
      setSuspendReason("");
      setShowSuspendForm(false);
    await load();
      alert("Owner has been suspended successfully.");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to suspend owner");
    } finally {
      setActionLoading(false);
    }
  }
  
  function handleSuspendClick(){
    setShowSuspendForm(true);
    setSuspendReason("");
  }
  
  function cancelSuspend(){
    setShowSuspendForm(false);
    setSuspendReason("");
  }
  async function unsuspend(){
    setActionLoading(true);
    try {
      await api.post(`/api/admin/owners/${ownerId}/unsuspend`);
    await load();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to unsuspend owner");
    } finally {
      setActionLoading(false);
    }
  }
  async function kycApprove(){
    const note = prompt("Enter a note for approval (optional):") || "";
    setActionLoading(true);
    try {
      await api.post(`/api/admin/owners/${ownerId}/kyc/approve`, { note: note.trim() || "KYC approved by admin" });
    await load();
      alert("KYC approved successfully.");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to approve KYC");
    } finally {
      setActionLoading(false);
    }
  }
  async function kycReject(){
    const reason = prompt("Reason for rejection (required):") || "";
    if (!reason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    setActionLoading(true);
    try {
      await api.post(`/api/admin/owners/${ownerId}/kyc/reject`, { reason: reason.trim() });
    await load();
      alert("KYC rejected successfully.");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to reject KYC");
    } finally {
      setActionLoading(false);
    }
  }
  function handleImpersonateClick(){
    setShowImpersonateForm(true);
    setImpersonateReason("");
  }
  
  function cancelImpersonate(){
    setShowImpersonateForm(false);
    setImpersonateReason("");
  }
  
  async function confirmImpersonate(){
    if (!impersonateReason.trim()) {
      alert("Please provide a reason for impersonation. This action will be logged.");
      return;
    }
    
    const confirmed = window.confirm(
      `Are you sure you want to impersonate this owner?\n\n` +
      `Reason: ${impersonateReason.trim()}\n\n` +
      `This will generate a temporary token that expires in 10 minutes.`
    );
    
    if (!confirmed) {
      return;
    }
    
    setActionLoading(true);
    try {
      const r = await api.post<{token:string; expiresIn:number}>(`/api/admin/owners/${ownerId}/impersonate`, {
        reason: impersonateReason.trim()
      });
    navigator.clipboard.writeText(r.data.token);
      setImpersonateReason("");
      setShowImpersonateForm(false);
    alert("Temporary OWNER token copied to clipboard (10 min). Use in a private tab for support.");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to impersonate owner");
    } finally {
      setActionLoading(false);
    }
  }
  async function addNote(){
    if(!note.trim()) return;
    setActionLoading(true);
    try {
      await api.post(`/api/admin/owners/${ownerId}/notes`, { text: note.trim() });
    setNote("");
    alert("Note added.");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to add note");
    } finally {
      setActionLoading(false);
    }
  }
  
  async function sendNotification(){
    if (!notificationSubject.trim() || !notificationMessage.trim()) {
      alert("Please provide both subject and message for the notification.");
      return;
    }
    
    setActionLoading(true);
    try {
      await api.post(`/api/admin/owners/${ownerId}/notify`, { 
        subject: notificationSubject.trim(),
        message: notificationMessage.trim()
      });
      setNotificationSubject("");
      setNotificationMessage("");
      setShowNotificationForm(false);
      alert("Notification sent successfully to the owner.");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to send notification");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
  return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#02665e]"></div>
        </div>
      </div>
    );
  }

  if (!owner || !snap) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6">
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Owner not found</p>
          <Link href="/admin/owners" className="text-[#02665e] hover:text-[#02665e]/90 underline">
            ← Back to owners
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 min-w-0">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <Link
              href="/admin/owners"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              title="Back to owners"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-[#02665e]" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                  {owner.name ?? `Owner #${owner.id}`}
                </h1>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {getKycStatusBadge(owner.kycStatus)}
                {getAccountStatusBadge(!!owner.suspendedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Owner Information Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <div className="flex items-start gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Owner Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-semibold text-sm text-gray-900 truncate">{owner.email}</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Phone</div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-semibold text-sm text-gray-900 truncate">{owner.phone || "-"}</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Joined Date</div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-semibold text-sm text-gray-900">
                        {new Date(owner.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 ml-6 mt-0.5">
                      {new Date(owner.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Properties</div>
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-semibold text-sm text-gray-900">{owner._count.properties}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <div className="flex items-start gap-3 mb-4 sm:mb-6">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Financial Summary</h2>
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg min-w-0">
                    <span className="text-xs sm:text-sm font-medium text-gray-700 truncate pr-2">Paid Invoices</span>
                    <span className="text-base sm:text-lg font-bold text-gray-900 flex-shrink-0">{snap.revenue.paidCount}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg min-w-0">
                    <span className="text-xs sm:text-sm font-medium text-gray-700 truncate pr-2">Gross Revenue</span>
                    <span className="text-base sm:text-lg font-bold text-gray-900 flex-shrink-0">{fmt(snap.revenue.grossSum)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-blue-50 rounded-lg min-w-0">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Commission</div>
                      <div className="text-base sm:text-lg font-bold text-blue-900 mt-1 break-words">{fmt(snap.revenue.commissionSum)}</div>
                    </div>
                    <div className="p-3 sm:p-4 bg-emerald-50 rounded-lg border-2 border-emerald-200 min-w-0">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Net Revenue</div>
                      <div className="text-base sm:text-lg font-bold text-emerald-900 mt-1 break-words">{fmt(snap.revenue.netSum)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Properties Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm transition-shadow duration-200 overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Total Properties</h2>
                <div className="flex items-center justify-center p-6 sm:p-8 bg-green-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-4xl sm:text-5xl font-bold text-green-700 mb-2">
                      {owner._count.properties}
                    </div>
                    <div className="text-sm sm:text-base text-green-600 font-medium">
                      {owner._count.properties === 1 ? 'Property' : 'Properties'} Listed
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <p className="text-xs sm:text-sm text-gray-500">
                    Click on the <span className="font-medium text-gray-700">Properties</span> tab to view details
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Actions */}
        <div className="space-y-4 sm:space-y-6 min-w-0">
          {/* Account Actions */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-blue-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Account Actions</h3>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {owner.suspendedAt ? (
                <button
                  className="w-full px-4 py-2.5 sm:py-3 bg-green-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-green-700 active:bg-green-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  onClick={unsuspend}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Unsuspend
                    </>
                  )}
                </button>
              ) : (
                <>
                  {!showSuspendForm ? (
                    <button
                      className="w-full px-4 py-2.5 sm:py-3 bg-red-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-red-700 active:bg-red-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      onClick={handleSuspendClick}
                      disabled={actionLoading}
                    >
                      <Ban className="h-4 w-4" />
                      Suspend Owner
                    </button>
                  ) : (
                    <div className="space-y-3 p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
        <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
                          Reason for Suspension <span className="text-red-600">*</span>
                        </label>
                        <textarea
                          className="w-full min-h-[100px] px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all resize-none text-xs sm:text-sm box-border"
                          placeholder="Please provide a clear reason for suspending this owner (e.g., policy violation, non-compliance, etc.)"
                          value={suspendReason}
                          onChange={(e) => setSuspendReason(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">This notification will be sent to the owner.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          id="notify-owner"
                          checked={notifyOwner}
                          onChange={(e) => setNotifyOwner(e.target.checked)}
                          className="mt-1 h-4 w-4 text-[#02665e] border-gray-300 rounded focus:ring-[#02665e] flex-shrink-0"
                        />
                        <label htmlFor="notify-owner" className="text-xs sm:text-sm text-gray-700">
                          Send notification to owner about this suspension
                        </label>
        </div>
        <div className="flex gap-2">
                        <button
                          className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-red-700 active:bg-red-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2"
                          onClick={handleSuspendSubmit}
                          disabled={actionLoading || !suspendReason.trim()}
                        >
                          {actionLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-white border-t-transparent"></div>
                              <span className="hidden sm:inline">Suspending...</span>
                              <span className="sm:hidden">...</span>
                            </>
                          ) : (
                            <>
                              <Ban className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                              <span className="hidden sm:inline">Confirm Suspension</span>
                              <span className="sm:hidden">Suspend</span>
                            </>
                          )}
                        </button>
                        <button
                          className="p-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                          onClick={cancelSuspend}
                          disabled={actionLoading}
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
        </div>
      </div>
                  )}
                </>
              )}
              {!showImpersonateForm ? (
                <button
                  className="w-full px-4 py-2.5 sm:py-3 bg-[#02665e] text-white rounded-lg text-sm sm:text-base font-medium hover:bg-[#02665e]/90 active:bg-[#02665e]/80 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  onClick={handleImpersonateClick}
                  disabled={actionLoading}
                >
                  <Copy className="h-4 w-4" />
                  Impersonate
                </button>
              ) : (
                <div className="space-y-3 p-3 sm:p-4 bg-[#02665e]/5 rounded-lg border border-[#02665e]/20">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
                      Reason for Impersonation <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      className="w-full min-h-[80px] px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-all resize-none text-xs sm:text-sm box-border"
                      placeholder="Please provide a reason for impersonating this owner (e.g., customer support, troubleshooting, etc.)"
                      value={impersonateReason}
                      onChange={(e) => setImpersonateReason(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">This action will be logged in the audit trail.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#02665e] text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-[#02665e]/90 active:bg-[#02665e]/80 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2"
                      onClick={confirmImpersonate}
                      disabled={actionLoading || !impersonateReason.trim()}
                    >
                      {actionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-white border-t-transparent"></div>
                          <span className="hidden sm:inline">Processing...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="hidden sm:inline">Confirm Impersonation</span>
                          <span className="sm:hidden">Confirm</span>
                        </>
                      )}
                    </button>
                    <button
                      className="p-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                      onClick={cancelImpersonate}
                      disabled={actionLoading}
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Send Notification Button */}
              <button
                className="w-full px-4 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onClick={() => setShowNotificationForm(!showNotificationForm)}
                disabled={actionLoading}
              >
                <Bell className="h-4 w-4" />
                {showNotificationForm ? "Hide Notification Form" : "Send Notification"}
              </button>
              
              {/* Notification Form */}
              {showNotificationForm && (
                <div className="space-y-3 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200 mt-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
                      Subject <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-xs sm:text-sm box-border"
                      placeholder="e.g., Account Suspension, KYC Approval, Promotion, etc."
                      value={notificationSubject}
                      onChange={(e) => setNotificationSubject(e.target.value)}
                    />
                  </div>
              <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-2">
                      Message <span className="text-red-600">*</span>
                    </label>
                    <textarea
                      className="w-full min-h-[100px] px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none text-xs sm:text-sm box-border"
                      placeholder="Enter the notification message to be sent to the owner..."
                      value={notificationMessage}
                      onChange={(e) => setNotificationMessage(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2"
                      onClick={sendNotification}
                      disabled={actionLoading || !notificationSubject.trim() || !notificationMessage.trim()}
                    >
                      {actionLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-white border-t-transparent"></div>
                          <span className="hidden sm:inline">Sending...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="hidden sm:inline">Send Notification</span>
                          <span className="sm:hidden">Send</span>
                        </>
                      )}
                    </button>
                    <button
                      className="p-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center flex-shrink-0"
                      onClick={() => {
                        setShowNotificationForm(false);
                        setNotificationSubject("");
                        setNotificationMessage("");
                      }}
                      disabled={actionLoading}
                      title="Cancel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
      </div>

          {/* KYC Actions */}
          {owner.kycStatus !== 'APPROVED_KYC' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">KYC Actions</h3>
          </div>
              <div className="space-y-2 sm:space-y-3">
                {owner.kycStatus !== 'APPROVED_KYC' && (
                  <button
                    className="w-full px-4 py-2.5 sm:py-3 bg-emerald-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-emerald-700 active:bg-emerald-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    onClick={kycApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Approve KYC
                      </>
                    )}
                  </button>
                )}
                {owner.kycStatus !== 'REJECTED_KYC' && (
                  <button
                    className="w-full px-4 py-2.5 sm:py-3 bg-red-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-red-700 active:bg-red-800 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    onClick={kycReject}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Reject KYC
                      </>
                    )}
                  </button>
                )}
                </div>
            </div>
          )}

          {/* Audit & History */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <History className="h-4 w-4 text-purple-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Audit & History</h3>
            </div>
            {auditLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-purple-600"></div>
              </div>
            ) : auditItems.length === 0 ? (
              <div className="text-center py-6">
                <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No audit history found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {auditItems.slice(0, 10).map((audit: any, idx: number) => {
                  const getActionIcon = () => {
                    const action = audit.action?.toUpperCase() || '';
                    if (action.includes('SUSPEND')) return <Ban className="h-4 w-4 text-red-600" />;
                    if (action.includes('UNSUSPEND')) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
                    if (action.includes('KYC') || action.includes('APPROVE')) return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
                    if (action.includes('REJECT')) return <XCircle className="h-4 w-4 text-red-600" />;
                    if (action.includes('IMPERSONATE')) return <Copy className="h-4 w-4 text-blue-600" />;
                    if (action.includes('NOTIFY')) return <Bell className="h-4 w-4 text-blue-600" />;
                    return <Activity className="h-4 w-4 text-gray-600" />;
                  };

                  const getActionColor = () => {
                    const action = audit.action?.toUpperCase() || '';
                    if (action.includes('SUSPEND') || action.includes('REJECT')) return 'bg-red-50 border-red-200';
                    if (action.includes('UNSUSPEND') || action.includes('APPROVE') || action.includes('KYC')) return 'bg-emerald-50 border-emerald-200';
                    if (action.includes('IMPERSONATE') || action.includes('NOTIFY')) return 'bg-blue-50 border-blue-200';
                    return 'bg-gray-50 border-gray-200';
                  };

                  return (
                    <div key={audit.id || idx} className={`p-3 rounded-lg border ${getActionColor()} transition-all hover:shadow-sm`}>
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getActionIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                              {audit.action?.replace(/_/g, ' ') || 'Unknown Action'}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              {new Date(audit.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {audit.details && (
                            <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                              {typeof audit.details === 'string' ? audit.details : JSON.stringify(audit.details)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                            {audit.adminId && (
                              <>
                                <span>•</span>
                                <span>Admin ID: {audit.adminId}</span>
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
            {auditItems.length > 10 && (
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-500">
                  Showing 10 of {auditItems.length} entries
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-center p-2 sm:p-3 bg-gray-50/50">
          <div className="inline-flex items-center gap-1 sm:gap-2 p-1 bg-white rounded-full border border-gray-200 shadow-sm">
            {(["overview","properties","documents","notes","bookings"] as const).map(t => (
              <button
                key={t}
                onClick={()=>setTab(t)}
                className={`relative px-4 sm:px-6 py-2 sm:py-2.5 text-sm sm:text-base font-medium transition-all duration-300 whitespace-nowrap rounded-full ${
                  tab === t
                    ? "text-white bg-[#02665e] shadow-md shadow-[#02665e]/20"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
            </div>
          </div>

        <div className="p-4 sm:p-6">
          {tab === "properties" && (
            <div>
              {propertiesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#02665e]"></div>
                </div>
              ) : properties.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {properties.map((p) => (
                      <PropertyCard key={p.id} property={p} />
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <Link
                      href={`/admin/properties?ownerId=${ownerId}`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#02665e] bg-[#02665e]/5 rounded-lg hover:bg-[#02665e]/10 hover:text-[#02665e] transition-all duration-300 no-underline hover:no-underline group"
                      style={{ textDecoration: 'none' }}
                    >
                      <span>View all properties in management</span>
                      <Eye className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No properties found for this owner</p>
                  <Link
                    href={`/admin/properties?ownerId=${ownerId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#02665e] text-white rounded-lg hover:bg-[#02665e]/90 transition-colors duration-200 no-underline hover:no-underline"
                    style={{ textDecoration: 'none' }}
                  >
                    View in Properties Management
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              )}
        </div>
      )}

          {tab === "documents" && (
            <div className="space-y-4">
              {docs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {docs.map(d => {
                    const getStatusBadge = () => {
                      const status = d.status?.toUpperCase() || '';
                      if (status === 'APPROVED') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3" />
                            Approved
                          </span>
                        );
                      }
                      if (status === 'REJECTED') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                            <XCircle className="h-3 w-3" />
                            Rejected
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      );
                    };

                    const getDocumentIcon = () => {
                      const type = d.type?.toLowerCase() || '';
                      if (type.includes('id') || type.includes('passport')) {
                        return <FileCheck className="h-8 w-8 text-blue-600" />;
                      }
                      if (type.includes('license') || type.includes('permit')) {
                        return <FileCheck className="h-8 w-8 text-purple-600" />;
                      }
                      return <FileText className="h-8 w-8 text-gray-600" />;
                    };

                    return (
                      <div key={d.id} className="group border border-gray-200 rounded-xl bg-white hover:shadow-lg transition-all duration-200 overflow-hidden">
                        {/* Document Thumbnail/Preview */}
                        <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-6 flex items-center justify-center min-h-[120px]">
                          <div className="flex flex-col items-center gap-2">
                            {getDocumentIcon()}
                            <div className="text-xs font-medium text-gray-600 text-center px-2 line-clamp-2">
                              {d.type || 'Document'}
                            </div>
                          </div>
                          {/* Status overlay */}
                          <div className="absolute top-2 right-2">
                            {getStatusBadge()}
                          </div>
                        </div>

                        {/* Document Details */}
                        <div className="p-4 space-y-3">
                          <div className="space-y-1">
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(d.createdAt).toLocaleDateString()}
                            </div>
                            {d.reason && (
                              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                                <span className="font-medium">Note:</span> {d.reason}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                            {d.url && (
                              <a
                                href={d.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 px-3 py-2 text-xs font-medium text-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center gap-1.5"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                View
                              </a>
                            )}
                            {d.status === 'PENDING' && (
                              <>
                                <button
                                  className="flex-1 px-3 py-2 text-xs font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                  onClick={()=>docApprove(ownerId, d.id)}
                                  disabled={actionLoading}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Approve
                                </button>
                                <button
                                  className="flex-1 px-3 py-2 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                                  onClick={()=>docReject(ownerId, d.id)}
                                  disabled={actionLoading}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                    <FileText className="h-10 w-10 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No documents uploaded</p>
                  <p className="text-sm text-gray-500">Documents will appear here once uploaded by the owner</p>
                </div>
              )}
            </div>
          )}

          {tab === "bookings" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="Search by guest name, property, booking code..."
                      value={bookingsSearch}
                      onChange={(e) => setBookingsSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-all text-sm box-border"
                    />
                  </div>
                </div>
                {/* Status Filters */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setBookingsStatus("")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      bookingsStatus === ""
                        ? "bg-[#02665e] text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setBookingsStatus("NEW")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      bookingsStatus === "NEW"
                        ? "bg-amber-600 text-white shadow-md"
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    }`}
                  >
                    New
                  </button>
                  <button
                    onClick={() => setBookingsStatus("CONFIRMED")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      bookingsStatus === "CONFIRMED"
                        ? "bg-emerald-600 text-white shadow-md"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    Confirmed
                  </button>
                  <button
                    onClick={() => setBookingsStatus("CHECKED_IN")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      bookingsStatus === "CHECKED_IN"
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    }`}
                  >
                    Check-in
                  </button>
                  <button
                    onClick={() => setBookingsStatus("CHECKED_OUT")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      bookingsStatus === "CHECKED_OUT"
                        ? "bg-gray-600 text-white shadow-md"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    Check-out
                  </button>
                  <button
                    onClick={() => setBookingsStatus("CANCELED")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      bookingsStatus === "CANCELED"
                        ? "bg-red-600 text-white shadow-md"
                        : "bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    Canceled
                  </button>
                </div>
              </div>

              {/* Bookings Table */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            if (bookingsSortBy === "id") {
                              setBookingsSortDir(bookingsSortDir === "asc" ? "desc" : "asc");
                            } else {
                              setBookingsSortBy("id");
                              setBookingsSortDir("desc");
                            }
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>ID</span>
                            {bookingsSortBy === "id" ? (
                              bookingsSortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            if (bookingsSortBy === "property") {
                              setBookingsSortDir(bookingsSortDir === "asc" ? "desc" : "asc");
                            } else {
                              setBookingsSortBy("property");
                              setBookingsSortDir("desc");
                            }
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Property</span>
                            {bookingsSortBy === "property" ? (
                              bookingsSortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Guest
                        </th>
                        <th 
                          className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            if (bookingsSortBy === "checkIn") {
                              setBookingsSortDir(bookingsSortDir === "asc" ? "desc" : "asc");
                            } else {
                              setBookingsSortBy("checkIn");
                              setBookingsSortDir("desc");
                            }
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Check-in</span>
                            {bookingsSortBy === "checkIn" ? (
                              bookingsSortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            if (bookingsSortBy === "checkOut") {
                              setBookingsSortDir(bookingsSortDir === "asc" ? "desc" : "asc");
                            } else {
                              setBookingsSortBy("checkOut");
                              setBookingsSortDir("desc");
                            }
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Check-out</span>
                            {bookingsSortBy === "checkOut" ? (
                              bookingsSortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => {
                            if (bookingsSortBy === "amount") {
                              setBookingsSortDir(bookingsSortDir === "asc" ? "desc" : "asc");
                            } else {
                              setBookingsSortBy("amount");
                              setBookingsSortDir("desc");
                            }
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Amount</span>
                            {bookingsSortBy === "amount" ? (
                              bookingsSortDir === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-3 sm:px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookingsLoading ? (
                        <TableRow hover={false}>
                          <td colSpan={8} className="px-3 sm:px-4 py-12 text-center">
                            <div className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#02665e]"></div>
                            </div>
                          </td>
                        </TableRow>
                      ) : bookings.length === 0 ? (
                        <TableRow hover={false}>
                          <td colSpan={8} className="px-3 sm:px-4 py-12 text-center">
                            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No bookings found</p>
                            <p className="text-sm text-gray-400 mt-1">Bookings for this owner&apos;s properties will appear here</p>
                          </td>
                        </TableRow>
                      ) : (
                        bookings.map((b: any) => {
                          const getStatusBadge = () => {
                            const statusLower = b.status?.toLowerCase() || '';
                            if (statusLower.includes('confirmed') || statusLower.includes('active')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {b.status}
                                </span>
                              );
                            }
                            if (statusLower.includes('pending') || statusLower.includes('new')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                                  <Clock className="h-3 w-3" />
                                  {b.status}
                                </span>
                              );
                            }
                            if (statusLower.includes('cancel') || statusLower.includes('reject')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                                  <XCircle className="h-3 w-3" />
                                  {b.status}
                                </span>
                              );
                            }
                            if (statusLower.includes('check') || statusLower.includes('complete')) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                                  <CheckCircle2 className="h-3 w-3" />
                                  {b.status}
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
                                {b.status}
                              </span>
                            );
                          };

                          return (
                            <TableRow key={b.id}>
                              <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900">#{b.id}</td>
                              <td className="px-3 sm:px-4 py-3 text-sm text-gray-700">
                                <div className="flex items-center gap-2">
                                  <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{b.property?.title ?? '—'}</span>
                                </div>
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-sm text-gray-700">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{b.guestName ?? b.user?.name ?? b.user?.email ?? '—'}</span>
                                </div>
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                <div>{new Date(b.checkIn).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">{new Date(b.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                <div>{new Date(b.checkOut).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">{new Date(b.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-sm font-semibold text-gray-900">
                                {b.totalAmount ? (
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-4 w-4 text-gray-400" />
                                    {Number(b.totalAmount).toLocaleString()}
                                  </div>
                                ) : '—'}
                              </td>
                              <td className="px-3 sm:px-4 py-3 text-sm">{getStatusBadge()}</td>
                              <td className="px-3 sm:px-4 py-3 text-sm">
                                <div className="flex justify-center">
                                  <Link
                                    href={`/admin/management/bookings/${b.id}`}
                                    className="p-2 rounded-lg text-[#02665e] hover:bg-[#02665e]/10 transition-all duration-200"
                                    title="View booking details"
                                  >
                                    <Eye className="h-5 w-5" />
                                  </Link>
                                </div>
                              </td>
                            </TableRow>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card Layout */}
                <div className="md:hidden divide-y divide-gray-200">
                  {bookingsLoading ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-[#02665e] mx-auto"></div>
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="p-8 text-center">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No bookings found</p>
                    </div>
                  ) : (
                    bookings.map((b: any) => {
                      const getStatusBadge = () => {
                        const statusLower = b.status?.toLowerCase() || '';
                        if (statusLower.includes('confirmed') || statusLower.includes('active')) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              {b.status}
                            </span>
                          );
                        }
                        if (statusLower.includes('pending') || statusLower.includes('new')) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                              <Clock className="h-3 w-3" />
                              {b.status}
                            </span>
                          );
                        }
                        if (statusLower.includes('cancel') || statusLower.includes('reject')) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                              <XCircle className="h-3 w-3" />
                              {b.status}
                            </span>
                          );
                        }
                        if (statusLower.includes('check') || statusLower.includes('complete')) {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                              <CheckCircle2 className="h-3 w-3" />
                              {b.status}
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">
                            {b.status}
                          </span>
                        );
                      };

                      return (
                        <div key={b.id} className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
              <div>
                              <div className="font-semibold text-gray-900">Booking #{b.id}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{getStatusBadge()}</div>
                            </div>
                            <Link
                              href={`/admin/management/bookings/${b.id}`}
                              className="p-2 rounded-lg text-[#02665e] hover:bg-[#02665e]/10 transition-all"
                            >
                              <Eye className="h-5 w-5" />
                            </Link>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-gray-700">
                              <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{b.property?.title ?? '—'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700">
                              <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate">{b.guestName ?? b.user?.name ?? b.user?.email ?? '—'}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">Check-in</div>
                                <div className="text-sm font-medium text-gray-900">{new Date(b.checkIn).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">{new Date(b.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">Check-out</div>
                                <div className="text-sm font-medium text-gray-900">{new Date(b.checkOut).toLocaleDateString()}</div>
                                <div className="text-xs text-gray-500">{new Date(b.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                            </div>
                            {b.totalAmount && (
                              <div className="flex items-center gap-1 text-sm font-semibold text-gray-900 pt-2 border-t border-gray-100">
                                <DollarSign className="h-4 w-4 text-gray-400" />
                                {Number(b.totalAmount).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Pagination */}
              {bookingsTotal > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-semibold text-gray-900">{Math.min((bookingsPage - 1) * 25 + 1, bookingsTotal)}</span> to <span className="font-semibold text-gray-900">{Math.min(bookingsPage * 25, bookingsTotal)}</span> of <span className="font-semibold text-gray-900">{bookingsTotal}</span> bookings
              </div>
              <div className="flex items-center gap-2">
                      <button
                        onClick={() => setBookingsPage(p => Math.max(1, p - 1))}
                        disabled={bookingsPage === 1 || bookingsLoading}
                        className="p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Previous bookings page"
                        title="Previous bookings page"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(Math.ceil(bookingsTotal / 25), 5) }, (_, i) => {
                          const pageNum = i + 1;
                          if (pageNum > Math.ceil(bookingsTotal / 25)) return null;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setBookingsPage(pageNum)}
                              disabled={bookingsLoading}
                              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                                bookingsPage === pageNum
                                  ? "bg-[#02665e] text-white shadow-md"
                                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
              </div>
                      <button
                        onClick={() => setBookingsPage(p => Math.min(Math.ceil(bookingsTotal / 25), p + 1))}
                        disabled={bookingsPage >= Math.ceil(bookingsTotal / 25) || bookingsLoading}
                        className="p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Next bookings page"
                        title="Next bookings page"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
            </div>
                  </div>
                </div>
              )}
        </div>
      )}

          {tab === "notes" && (
            <div className="space-y-4">
              <div className="min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Note <span className="text-gray-400 font-normal">(visible to admins only)</span>
                </label>
                <textarea
                  className="w-full min-h-[100px] px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-all resize-none text-sm sm:text-base box-border"
                  placeholder="Write a private note..."
                  value={note}
                  onChange={e=>setNote(e.target.value)}
                />
          </div>
              <button
                className="px-4 py-2.5 bg-[#02665e] text-white rounded-lg text-sm sm:text-base font-medium hover:bg-[#02665e]/90 active:bg-[#02665e]/80 transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={addNote}
                disabled={actionLoading || !note.trim()}
              >
                {actionLoading ? "Adding..." : "Add Note"}
              </button>
              <div className="text-xs text-gray-500">
                Notes are logged with your admin ID and timestamp.
              </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}

async function docApprove(ownerId:number, docId:number){
  try {
    await api.post(`/api/admin/owners/${ownerId}/documents/${docId}/approve`);
    alert("Document approved successfully.");
    window.location.reload();
  } catch (err: any) {
    alert(err?.response?.data?.error || "Failed to approve document");
  }
}
async function docReject(ownerId:number, docId:number){
  const reason = prompt("Reason for rejection?") || "";
  if (!reason.trim()) return;
  try {
    await api.post(`/api/admin/owners/${ownerId}/documents/${docId}/reject`, { reason });
    alert("Document rejected successfully.");
    window.location.reload();
  } catch (err: any) {
    alert(err?.response?.data?.error || "Failed to reject document");
  }
}
function fmt(n:any){ return new Intl.NumberFormat(undefined,{ style:"currency", currency:"TZS" }).format(Number(n||0)); }

function PropertyCard({ property }: { property: Property }) {
  const location = [property.ward, property.district, property.regionName].filter(Boolean).join(", ") || "Location not specified";
  const price = property.basePrice 
    ? fmt(property.basePrice)
    : "Price not set";
  
  const PhotoPlaceholder = () => (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(2,102,94,0.18),transparent_55%),radial-gradient(circle_at_75%_85%,rgba(2,132,199,0.12),transparent_55%),linear-gradient(135deg,#f8fafc,#e2e8f0)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-black/0 to-white/35" />
      <div className="absolute inset-0 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-700">
        <div className="h-12 w-12 rounded-2xl bg-white/85 border border-slate-200 shadow-sm flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-slate-500" aria-hidden />
        </div>
        <div className="mt-2 text-sm font-semibold">Photo preview</div>
        <div className="text-xs text-slate-500">No photo available</div>
      </div>
    </div>
  );

  const getStatusBadge = () => {
    const statusLower = property.status?.toLowerCase() || '';
    if (statusLower === 'approved') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium">
          Approved
        </span>
      );
    }
    if (statusLower === 'pending') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
          Pending
        </span>
      );
    }
    if (statusLower === 'rejected') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-medium">
          Rejected
        </span>
      );
    }
    if (statusLower === 'requested' || statusLower === 'request_for_fix') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
          Request for Fix
        </span>
      );
    }
    return null;
  };

  const isApproved = property.status?.toLowerCase() === 'approved';

  return (
    <Link
      href={`/admin/properties?previewId=${property.id}`}
      className="group no-underline text-slate-900"
      aria-label={`View ${property.title}`}
    >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
        {/* Title (above image) */}
        <div className="px-4 pt-4">
          <div className="text-base font-bold text-slate-900 truncate">{property.title}</div>
          <div className="text-xs text-slate-500 mt-1">{property.type}</div>
        </div>

        {/* Image */}
        <div className="px-4 mt-3">
          <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden">
            {property.primaryImage ? (
              <Image
                src={property.primaryImage}
                alt={property.title}
                fill
                sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            ) : (
              <PhotoPlaceholder />
            )}
            {/* Verification badge only for approved properties */}
            {isApproved && <VerifiedIcon />}
          </div>
        </div>

        {/* Below image: location and details */}
        <div className="p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-3">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
            <div className="flex items-center gap-3">
              {property.totalBedrooms > 0 && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {property.totalBedrooms}
                </span>
              )}
              {property.maxGuests > 0 && (
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {property.maxGuests}
                </span>
              )}
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <div>
                  <div className="text-sm font-bold text-slate-900">{price}</div>
                  {property.basePrice && <div className="text-[11px] text-slate-500">per night</div>}
                </div>
                {getStatusBadge()}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <span className="inline-flex items-center justify-center w-full rounded-xl bg-[#02665e] text-white py-2.5 text-sm font-semibold transition-colors group-hover:bg-[#014e47]">
              View details
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
