"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import TableRow from "@/components/TableRow";
import {
  ShieldCheck,
  ShieldX,
  Clock,
  ChevronRight,
  X,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Car,
  FileText,
  User,
  MapPin,
  CreditCard,
  Eye,
  AlertCircle,
  AlertTriangle,
  Send,
  Loader2,
  History,
  ChevronLeft,
  Mail,
  Phone,
  UserCircle2,
  Globe,
  IdCard,
  Star,
  BadgeCheck,
  Users,
  TrendingUp,
} from "lucide-react";

const api = axios.create({ baseURL: "", withCredentials: true });

type KycStatus = "PENDING_KYC" | "APPROVED_KYC" | "REJECTED_KYC";
type Tab = "PENDING_KYC" | "APPROVED_KYC" | "REJECTED_KYC";

type DriverRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  kycStatus: KycStatus | null;
  needsKycFix?: boolean;
  vehicleType: string | null;
  plateNumber: string | null;
  licenseNumber: string | null;
  operationArea: string | null;
  region: string | null;
  district: string | null;
  isVipDriver: boolean;
  createdAt: string;
  paymentVerified: boolean | null;
};

type FieldApprovalStatus = 'approved' | 'flagged';
type FieldApprovalsMap = Record<string, FieldApprovalStatus>;
type AuditEntry = { id: number; action: string; note: string | null; fieldApprovals: FieldApprovalsMap | null; createdAt: string; adminId: number | null; adminName?: string | null; };

type DriverDetail = DriverRow & {
  gender: string | null;
  nationality: string | null;
  nin: string | null;
  district: string | null;
  paymentPhone: string | null;
  payout: any;
  kycFieldApprovals?: FieldApprovalsMap | null;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date}, ${time}`;
}

/** Collapse consecutive field_review entries with identical fieldApprovals — keep only the latest. */
function deduplicateAuditLogs(logs: AuditEntry[]): AuditEntry[] {
  const result: AuditEntry[] = [];
  for (const entry of logs) {
    if (
      entry.action === "field_review" &&
      result.length > 0 &&
      result[result.length - 1].action === "field_review" &&
      JSON.stringify(result[result.length - 1].fieldApprovals) === JSON.stringify(entry.fieldApprovals)
    ) {
      // Replace with the newer entry (logs are newest-first, so keep the first seen)
      continue;
    }
    result.push(entry);
  }
  return result;
}

function KycBadge({ status }: { status: KycStatus | null }) {
  const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors";
  if (status === "APPROVED_KYC")
    return (
      <span title="Approved" className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100`}>
        <ShieldCheck className="w-3.5 h-3.5" /> Approved
      </span>
    );
  if (status === "REJECTED_KYC")
    return (
      <span title="Rejected" className={`${base} bg-red-50 text-red-700 border-red-200 hover:bg-red-100`}>
        <ShieldX className="w-3.5 h-3.5" /> Rejected
      </span>
    );
  if (status === "PENDING_KYC")
    return (
      <span title="New application awaiting review" className={`${base} bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100`}>
        <Clock className="w-3.5 h-3.5" /> New
      </span>
    );
  return <span className="text-xs text-slate-400">—</span>;
}

function VettingStatusPill({ status, needsFix }: { status: KycStatus | null; needsFix?: boolean }) {
  const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors";
  if (status === "APPROVED_KYC")
    return (
      <span title="Approved" className={`${base} bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100`}>
        <ShieldCheck className="w-3.5 h-3.5" /> Approved
      </span>
    );
  if (status === "REJECTED_KYC")
    return (
      <span title="Rejected" className={`${base} bg-red-50 text-red-700 border-red-200 hover:bg-red-100`}>
        <ShieldX className="w-3.5 h-3.5" /> Rejected
      </span>
    );
  if (status === "PENDING_KYC" && needsFix)
    return (
      <span title="Driver needs to fix flagged fields" className={`${base} bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100`}>
        <AlertTriangle className="w-3.5 h-3.5" /> Request Fix
      </span>
    );
  if (status === "PENDING_KYC")
    return (
      <span title="New application awaiting review" className={`${base} bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100`}>
        <Clock className="w-3.5 h-3.5" /> New
      </span>
    );
  return <span className="text-xs text-slate-400">—</span>;
}

function InfoRow({ label, value, icon: Icon, accent, fieldKey, fieldStatus, onToggle }: {
  label: string;
  value: string | null | undefined;
  icon?: any;
  accent?: string;
  fieldKey?: string;
  fieldStatus?: FieldApprovalStatus | null;
  onToggle?: (key: string, status: FieldApprovalStatus) => void;
}) {
  const isEmpty = !value;
  return (
    <div
      className={`px-4 py-3 flex items-center justify-between gap-3 ${
        fieldStatus === 'approved' ? 'bg-emerald-50/40' :
        fieldStatus === 'flagged'  ? 'bg-orange-50/30'  :
        'bg-transparent'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ?? 'bg-slate-100'}`}>
            <Icon className="w-4 h-4 text-slate-500" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] truncate">{label}</p>
          {isEmpty ? (
            <p className="mt-0.5 text-sm text-slate-300 italic">Not provided</p>
          ) : (
            <p className="mt-0.5 text-sm font-bold text-slate-900 break-words">{value}</p>
          )}
        </div>
      </div>

      {fieldKey && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {fieldStatus === 'approved' ? (
            <button
              title="Approved — click to undo"
              onClick={() => onToggle?.(fieldKey, 'approved')}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-600 text-white border border-emerald-600 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                title="Approve this field"
                onClick={() => onToggle?.(fieldKey, 'approved')}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${
                  'bg-white text-slate-400 border-slate-200 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                title="Flag this field for correction"
                onClick={() => onToggle?.(fieldKey, 'flagged')}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${
                  fieldStatus === 'flagged'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                    : 'bg-white text-slate-400 border-slate-200 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DocLink({ label, url, fieldKey, fieldStatus, onToggle }: {
  label: string;
  url?: string | null;
  fieldKey?: string;
  fieldStatus?: FieldApprovalStatus | null;
  onToggle?: (key: string, status: FieldApprovalStatus) => void;
}) {
  const approvalButtons = fieldKey ? (
    <div className="flex items-center gap-1">
      {fieldStatus === 'approved' ? (
        <button
          title="Approved — click to undo"
          onClick={e => { e.preventDefault(); onToggle?.(fieldKey, 'approved'); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-600 text-white border border-emerald-600 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      ) : (
        <>
          <button
            title="Approve this document"
            onClick={e => { e.preventDefault(); onToggle?.(fieldKey, 'approved'); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all border bg-white text-slate-400 border-slate-200 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            title="Flag this document for correction"
            onClick={e => { e.preventDefault(); onToggle?.(fieldKey, 'flagged'); }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${
              fieldStatus === 'flagged'
                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                : 'bg-white text-slate-400 border-slate-200 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  ) : null;

  const Row = url ? "a" : "div";
  const rowProps = url
    ? ({ href: url, target: "_blank", rel: "noopener noreferrer" } as any)
    : {};

  return (
    <Row
      {...rowProps}
      className={`px-4 py-3 flex items-center justify-between gap-3 no-underline ${
        fieldStatus === 'approved' ? 'bg-emerald-50/40' :
        fieldStatus === 'flagged'  ? 'bg-orange-50/30'  :
        'bg-transparent'
      } ${url ? 'hover:bg-emerald-50/40 transition-colors' : ''}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
          <FileText className="w-4 h-4 text-slate-400" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em] truncate">{label}</p>
          {url ? (
            <p className="mt-0.5 text-sm font-bold text-slate-900">Open document</p>
          ) : (
            <p className="mt-0.5 text-sm text-slate-300 italic">Not uploaded</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {url && (
          <span className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-500 flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </span>
        )}
        {approvalButtons}
      </div>
    </Row>
  );
}

export default function DriverVettingPage() {
  const [tab, setTab] = useState<Tab>("PENDING_KYC");
  const [items, setItems] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<Tab, number>>({ PENDING_KYC: 0, APPROVED_KYC: 0, REJECTED_KYC: 0 });

  const [selected, setSelected] = useState<DriverDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState<"reject" | "request_info" | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fieldApprovals, setFieldApprovals] = useState<FieldApprovalsMap>({});
  const [_saveFieldsLoading, _setSaveFieldsLoading] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalItems, setTotalItems] = useState(0);

  // Audit history
  const [detailTab, setDetailTab] = useState<"details" | "audit">("details");
  const [auditLogs, setAuditLogs] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  function toggleFieldApproval(fieldKey: string, status: FieldApprovalStatus) {
    setFieldApprovals(prev => {
      const next = prev[fieldKey] === status
        ? (() => { const n = { ...prev }; delete n[fieldKey]; return n; })()
        : { ...prev, [fieldKey]: status };
      // Auto-save silently after each toggle (field_review = no notification)
      if (selected) {
        api.patch(`/api/admin/drivers/${selected.id}/kyc`, { action: "field_review", fieldApprovals: next })
          .catch(() => {/* non-fatal */});
      }
      return next;
    });
  }

  const load = useCallback(async (activeTab: Tab, currentPage = 1) => {
    setLoading(true);
    try {
      const r = await api.get("/api/admin/drivers", {
        params: { status: activeTab, page: currentPage, pageSize },
      });
      setItems(r.data?.items ?? []);
      setTotalItems(r.data?.total ?? 0);
    } catch {
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const loadCounts = useCallback(async () => {
    try {
      const [p, a, r] = await Promise.all([
        api.get("/api/admin/drivers", { params: { status: "PENDING_KYC", page: 1, pageSize: 1 } }),
        api.get("/api/admin/drivers", { params: { status: "APPROVED_KYC", page: 1, pageSize: 1 } }),
        api.get("/api/admin/drivers", { params: { status: "REJECTED_KYC", page: 1, pageSize: 1 } }),
      ]);
      setCounts({
        PENDING_KYC: p.data?.total ?? 0,
        APPROVED_KYC: a.data?.total ?? 0,
        REJECTED_KYC: r.data?.total ?? 0,
      });
    } catch { /* best-effort */ }
  }, []);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { setPage(1); load(tab, 1); }, [tab, load]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(tab, page); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadAudit = useCallback(async (driverId: number) => {
    setAuditLoading(true);
    try {
      const r = await api.get(`/api/admin/drivers/${driverId}/kyc-audit`);
      setAuditLogs(r.data?.logs ?? []);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  async function openDetail(row: DriverRow) {
    setSelected(row as DriverDetail);
    setDetailLoading(true);
    setDetailTab("details");
    setActionMsg(null);
    setActionNote("");
    setShowNoteInput(null);
    setFieldApprovals({});
    setAuditLogs([]);
    try {
      const [detailRes] = await Promise.all([
        api.get(`/api/admin/drivers/${row.id}`),
        loadAudit(row.id),
      ]);
      const d = detailRes.data?.driver ?? detailRes.data;
      if (d) {
        setSelected({ ...row, ...d });
        const saved = d.kycFieldApprovals;
        if (saved && typeof saved === "object") setFieldApprovals(saved as FieldApprovalsMap);
      }
    } catch { /* keep row data */ } finally {
      setDetailLoading(false);
    }
  }

  async function doAction(action: "approve" | "reject" | "request_info", overrideNote?: string) {
    if (!selected) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      await api.patch(`/api/admin/drivers/${selected.id}/kyc`, {
        action,
        reason: action === "reject" ? actionNote : undefined,
        note: action === "request_info" ? (overrideNote ?? actionNote) : undefined,
        fieldApprovals: action === "request_info" ? fieldApprovals : undefined,
      });
      const newStatus =
        action === "approve" ? "APPROVED_KYC" :
        action === "reject" ? "REJECTED_KYC" : "PENDING_KYC";
      setSelected(prev => prev ? { ...prev, kycStatus: newStatus as KycStatus } : prev);
      setItems(prev => prev.map(d => d.id === selected.id ? { ...d, kycStatus: newStatus as KycStatus } : d));
      if (action !== "request_info") {
        setItems(prev => prev.filter(d => d.id !== selected.id));
        setFieldApprovals({});
      }
      setActionMsg({
        type: "success",
        text: action === "approve" ? "Driver approved successfully." :
              action === "reject" ? "Driver application rejected." :
              "Field reviews saved and driver notified.",
      });
      setShowNoteInput(null);
      setActionNote("");
      loadCounts();
      // Reload audit logs to reflect the new action
      if (selected) loadAudit(selected.id);
    } catch (e: any) {
      setActionMsg({ type: "error", text: e?.response?.data?.message || e?.message || "Action failed" });
    } finally {
      setActionLoading(false);
    }
  }

  const total = counts.PENDING_KYC + counts.APPROVED_KYC + counts.REJECTED_KYC;
  const approvalRate = total > 0 ? Math.round((counts.APPROVED_KYC / total) * 100) : 0;
  const payoutObj = (selected?.payout && typeof selected.payout === "object") ? selected.payout as any : {};
  const REQUIRED_FIELDS = [
    'name', 'email', 'phone', 'gender', 'nationality', 'nin',
    'region', 'district', 'operationArea',
    'vehicleType', 'plateNumber', 'licenseNumber',
    'paymentPhone',
    'drivingLicense', 'nationalId', 'latra', 'insurance',
  ];
  const flaggedFields = Object.entries(fieldApprovals).filter(([, v]) => v === "flagged").map(([k]) => k);
  const approvedFields = Object.entries(fieldApprovals).filter(([, v]) => v === "approved").map(([k]) => k);
  const reviewedCount = REQUIRED_FIELDS.filter(k => fieldApprovals[k] === 'approved').length;
  const allFieldsApproved = reviewedCount === REQUIRED_FIELDS.length;
  const fa = (key: string) => fieldApprovals[key] ?? null;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const tabs: { key: Tab; label: string; shortLabel: string; icon: any; color: string }[] = [
    { key: "PENDING_KYC",  label: "Pending Review", shortLabel: "Pending",  icon: Clock,       color: "#f59e0b" },
    { key: "APPROVED_KYC", label: "Approved",        shortLabel: "Approved", icon: ShieldCheck, color: "#10b981" },
    { key: "REJECTED_KYC", label: "Rejected",         shortLabel: "Rejected", icon: ShieldX,     color: "#ef4444" },
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* â”€â”€ PAGE HEADER â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0e2a7a 0%, #0a5c82 45%, #02665e 100%)" }}
      >
        {/* Top strip: title + stat pills */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Driver Vetting</h1>
              <p className="text-white/55 text-sm mt-0.5">Review and approve new driver applications</p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5">
              <Users className="w-3.5 h-3.5 text-white/70" />
              <span className="text-white/70 text-xs">Total</span>
              <span className="text-white font-bold text-sm">{total}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-xl px-3 py-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-white/70 text-xs">Approval rate</span>
              <span className="text-emerald-300 font-bold text-sm">{approvalRate}%</span>
            </div>
            {counts.PENDING_KYC > 0 && (
              <div className="flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/30 rounded-xl px-3 py-1.5 animate-pulse">
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-amber-200 font-semibold text-xs">{counts.PENDING_KYC} awaiting review</span>
              </div>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="px-6 pb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {tabs.map(({ key, label, shortLabel, icon: Icon, color }) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setTab(key); setSelected(null); }}
                  aria-pressed={active ? "true" : "false"}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all border"
                  style={active
                    ? { background: color, color: "#fff", borderColor: "transparent", boxShadow: `0 2px 10px ${color}55` }
                    : { background: `${color}1a`, color: "rgba(255,255,255,0.90)", borderColor: `${color}30` }}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="sm:hidden">{shortLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                  <span
                    className="tabular-nums text-[10px] font-bold rounded-lg px-2 py-0.5"
                    style={active
                      ? { background: "rgba(255,255,255,0.22)", color: "#fff" }
                      : { background: `${color}26`, color: "rgba(255,255,255,0.92)" }}
                  >
                    {counts[key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* â”€â”€ BODY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="flex flex-col gap-4">

        {/* TABLE PANEL */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">

          {/* Search + info bar */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-slate-400 flex-shrink-0">
              <span className="font-semibold text-slate-600">{totalItems}</span> drivers
              {totalPages > 1 && <span>&middot; page <span className="font-semibold text-slate-600">{page}</span> of {totalPages}</span>}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">#</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Vehicle Type</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Region / District / Ward</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Joined</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <TableRow hover={false}>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <div className="w-8 h-8 rounded-full border-2 border-[#02665e] border-t-transparent animate-spin mx-auto mb-3" />
                      <p className="text-sm text-slate-400">Loading drivers...</p>
                    </td>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow hover={false}>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        {tab === "PENDING_KYC" ? <Clock className="w-7 h-7 text-slate-300" /> :
                         tab === "APPROVED_KYC" ? <ShieldCheck className="w-7 h-7 text-slate-300" /> :
                         <ShieldX className="w-7 h-7 text-slate-300" />}
                      </div>
                      <p className="text-sm font-semibold text-slate-400">
                        {tab === "PENDING_KYC" ? "No pending applications" :
                         tab === "APPROVED_KYC" ? "No approved drivers" : "No rejected applications"}
                      </p>
                    </td>
                  </TableRow>
                ) : items.map((d, i) => {
                  const isSelected = selected?.id === d.id;
                  const rowNum = (page - 1) * pageSize + i + 1;
                  const joinedDate = d.createdAt ? new Date(d.createdAt).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" }) : "—";
                  const joinedTime = d.createdAt ? new Date(d.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "";
                  return (
                    <TableRow
                      key={d.id}
                      hover={false}
                      className={`group transition-colors duration-100 ${isSelected ? "bg-[#02665e]/[0.05]" : "hover:bg-gray-50/70"}`}
                    >
                      <td className="px-4 py-2.5 text-xs text-slate-300 font-mono text-right tabular-nums">{rowNum}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <p className="text-sm font-bold text-slate-900 leading-tight truncate">{d.name}</p>
                              {d.isVipDriver && <span className="flex-shrink-0 text-[9px] bg-violet-50 text-violet-700 border border-violet-200 px-1.5 py-0.5 rounded-full font-bold">VIP</span>}
                            </div>
                            <p className="text-xs text-slate-400 truncate">{d.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <p className="text-sm font-semibold text-slate-700">{d.vehicleType ?? "—"}</p>
                        {d.plateNumber && <p className="text-xs text-slate-400 font-mono mt-0.5">{d.plateNumber}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-sm font-semibold text-slate-700">{d.region ?? "—"}</p>
                        {d.district && <p className="text-xs text-slate-400 mt-0.5">{d.district}</p>}
                        {d.operationArea && <p className="text-xs text-slate-400">{d.operationArea}</p>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="leading-tight">
                          <p className="text-sm text-slate-700">{joinedDate}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{joinedTime}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <VettingStatusPill status={d.kycStatus} needsFix={d.needsKycFix} />
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => openDetail(d)}
                          aria-label="View driver details"
                          title="View"
                          className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold transition-all border shadow-sm ${
                            isSelected
                              ? "bg-[#02665e] text-white border-[#02665e]"
                              : "bg-white text-[#02665e] border-[#02665e]/30 hover:bg-[#02665e] hover:text-white hover:border-[#02665e]"
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </TableRow>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-600">{(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, totalItems)}</span> of <span className="font-semibold text-slate-600">{totalItems}</span> drivers
              </span>
              <div className="flex items-center gap-1">
                <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => {
                  const p = totalPages <= 7 ? idx + 1 : page <= 4 ? idx + 1 : page >= totalPages - 3 ? totalPages - 6 + idx : page - 3 + idx;
                  return <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-semibold transition-all ${p === page ? "bg-[#02665e] text-white border-[#02665e] shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>{p}</button>;
                })}
                <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-30 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
        {/* â”€â”€ DETAIL PANEL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {selected && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/25 z-40 backdrop-blur-[2px]"
              onClick={() => setSelected(null)}
            />
            {/* Drawer */}
            <div className="fixed right-0 top-0 h-screen w-[600px] max-w-[95vw] z-50 bg-white shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden">

            {/* Detail header */}
            <div style={{ background: "linear-gradient(135deg, #0e2a7a 0%, #0a5c82 45%, #02665e 100%)" }} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center flex-shrink-0 shadow-inner">
                    <UserCircle2 className="w-7 h-7 text-white/90" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-tight">{selected.name}</h2>
                    <p className="text-white/55 text-xs mt-0.5">{selected.email}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <KycBadge status={selected.kycStatus} />
                      <span className="text-white/40 text-xs">Joined {formatDate(selected.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white/60 hover:text-white flex-shrink-0 transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-slate-100 bg-slate-50/40 flex-shrink-0">
              {([
                { key: "details" as const, label: "Details",       icon: User    },
                { key: "audit"   as const, label: "Audit History", icon: History },
              ]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setDetailTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
                    detailTab === key
                      ? "border-[#02665e] text-[#02665e] bg-white"
                      : "border-transparent text-slate-400 hover:text-slate-600 hover:bg-white/60"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                  {key === "audit" && auditLogs.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-bold leading-none">
                      {auditLogs.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── DETAILS TAB ── */}
            {detailTab === "details" && (
            <div className="overflow-y-auto flex-1 bg-slate-50/40">
              {detailLoading ? (
                <div className="p-10 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[#02665e] border-t-transparent animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Loading full details…</p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Action result */}
                  {actionMsg && (
                    <div className={`p-3.5 rounded-xl flex items-center gap-3 ${
                      actionMsg.type === "success"
                        ? "bg-emerald-50 border border-emerald-200"
                        : "bg-red-50 border border-red-200"
                    }`}>
                      {actionMsg.type === "success"
                        ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0" />
                        : <AlertCircle className="w-4.5 h-4.5 text-red-600 flex-shrink-0" />}
                      <p className={`text-sm font-medium ${actionMsg.type === "success" ? "text-emerald-800" : "text-red-800"}`}>
                        {actionMsg.text}
                      </p>
                    </div>
                  )}

                  {/* Read-only banner for approved drivers */}
                  {selected.kycStatus === "APPROVED_KYC" && (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-emerald-800">Driver approved — read-only view</p>
                        <p className="text-xs text-emerald-700 mt-0.5">This driver's account is active. Fields are locked. Use the Audit History tab to see who approved this driver and when. Use Revoke to remove access.</p>
                      </div>
                    </div>
                  )}

                  {/* Personal */}
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-5 h-5 rounded-md bg-blue-50 flex items-center justify-center">
                        <User className="w-3 h-3 text-blue-500" />
                      </span>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Personal Information</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                      <InfoRow label="Full name"    value={selected.name}                          icon={User}        accent="bg-blue-50"    fieldKey="name"        fieldStatus={fa("name")}        onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <InfoRow label="Email"        value={selected.email}                         icon={Mail}        accent="bg-violet-50"  fieldKey="email"       fieldStatus={fa("email")}       onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <InfoRow label="Phone"        value={selected.phone}                         icon={Phone}       accent="bg-emerald-50" fieldKey="phone"       fieldStatus={fa("phone")}       onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <InfoRow label="Gender"       value={(selected as DriverDetail).gender}      icon={UserCircle2} accent="bg-pink-50"    fieldKey="gender"      fieldStatus={fa("gender")}      onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <InfoRow label="Nationality"  value={(selected as DriverDetail).nationality} icon={Globe}       accent="bg-sky-50"     fieldKey="nationality" fieldStatus={fa("nationality")} onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <InfoRow label="NIN"          value={(selected as DriverDetail).nin}         icon={IdCard}      accent="bg-amber-50"   fieldKey="nin"         fieldStatus={fa("nin")}         onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                    </div>
                  </section>

                  {/* Location */}
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center">
                        <MapPin className="w-3 h-3 text-emerald-600" />
                      </span>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Location</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                      <InfoRow label="Region"         value={selected.region}                     icon={MapPin} accent="bg-emerald-50" fieldKey="region"        fieldStatus={fa("region")}        onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <InfoRow label="District"       value={(selected as DriverDetail).district} icon={MapPin} accent="bg-teal-50"    fieldKey="district"      fieldStatus={fa("district")}      onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <InfoRow label="Operation area" value={selected.operationArea}              icon={MapPin} accent="bg-cyan-50"    fieldKey="operationArea" fieldStatus={fa("operationArea")} onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                    </div>
                  </section>

                  {/* Vehicle */}
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-5 h-5 rounded-md bg-amber-50 flex items-center justify-center">
                        <Car className="w-3 h-3 text-amber-600" />
                      </span>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Vehicle &amp; Licence</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                      <InfoRow label="Vehicle type"  value={selected.vehicleType}   icon={Car}      accent="bg-amber-50"  fieldKey="vehicleType"  fieldStatus={fa("vehicleType")}  onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <InfoRow label="Plate number"  value={selected.plateNumber}   icon={IdCard}   accent="bg-orange-50" fieldKey="plateNumber"  fieldStatus={fa("plateNumber")}  onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <InfoRow label="Licence no."   value={selected.licenseNumber} icon={FileText} accent="bg-yellow-50" fieldKey="licenseNumber" fieldStatus={fa("licenseNumber")} onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <InfoRow label="VIP class"     value={selected.isVipDriver ? "VIP declared" : "Standard"} icon={Star} accent="bg-violet-50" />
                    </div>
                  </section>

                  {/* Payment */}
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-5 h-5 rounded-md bg-indigo-50 flex items-center justify-center">
                        <CreditCard className="w-3 h-3 text-indigo-500" />
                      </span>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Payment</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                      <InfoRow label="Payment phone"  value={(selected as DriverDetail).paymentPhone}                 icon={Phone}      accent="bg-indigo-50" fieldKey="paymentPhone" fieldStatus={fa("paymentPhone")} onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <InfoRow label="Phone verified" value={selected.paymentVerified ? "Verified" : "Not verified"} icon={BadgeCheck} accent={selected.paymentVerified ? "bg-emerald-50" : "bg-red-50"} />
                    </div>
                  </section>

                  {/* Documents */}
                  <section>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center">
                        <FileText className="w-3 h-3 text-slate-500" />
                      </span>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">Uploaded Documents</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                      <DocLink label="Driving licence"   url={payoutObj?.drivingLicenseUrl || selected.payout?.drivingLicenseUrl}                                                                              fieldKey="drivingLicense" fieldStatus={fa("drivingLicense")} onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <DocLink label="National ID"       url={payoutObj?.nationalIdUrl || selected.payout?.nationalIdUrl}                                                                                        fieldKey="nationalId"     fieldStatus={fa("nationalId")}     onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <DocLink label="LATRA Certificate" url={payoutObj?.latraUrl || payoutObj?.vehicleRegistrationUrl || selected.payout?.latraUrl || selected.payout?.vehicleRegistrationUrl}                  fieldKey="latra"          fieldStatus={fa("latra")}          onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                      <DocLink label="Insurance"         url={payoutObj?.insuranceUrl || selected.payout?.insuranceUrl}                                                                                          fieldKey="insurance"      fieldStatus={fa("insurance")}      onToggle={selected.kycStatus !== "APPROVED_KYC" ? toggleFieldApproval : undefined} />
                    </div>
                  </section>
                </div>
              )}
            </div>
            )} {/* end detailTab === "details" */}

            {/* AUDIT HISTORY TAB */}
            {detailTab === "audit" && (
              <div className="overflow-y-auto flex-1 p-4 bg-slate-50/40">
                {auditLoading ? (
                  <div className="p-10 text-center">
                    <div className="w-7 h-7 rounded-full border-2 border-[#02665e] border-t-transparent animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400">Loading history…</p>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                      <History className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs font-semibold text-slate-400">No audit history yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">Actions taken on this driver will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {deduplicateAuditLogs(auditLogs).map((entry) => {
                      const actionMeta: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
                        approve:      { label: "Approved",           color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", dot: "bg-emerald-500" },
                        reject:       { label: "Rejected",           color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",     dot: "bg-red-500" },
                        request_info: { label: "Requested Info",     color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   dot: "bg-amber-500" },
                        field_review: { label: "Field Review Saved", color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",    dot: "bg-blue-400" },
                      };
                      const meta = actionMeta[entry.action] ?? { label: entry.action, color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-400" };
                      const fieldMap = entry.fieldApprovals as Record<string, string> | null | undefined;
                      const approvedF = fieldMap ? Object.entries(fieldMap).filter(([, v]) => v === "approved").map(([k]) => k) : [];
                      const flaggedF  = fieldMap ? Object.entries(fieldMap).filter(([, v]) => v !== "approved").map(([k]) => k) : [];
                      return (
                        <div key={entry.id} className={`rounded-xl border ${meta.border} ${meta.bg} px-3 py-2.5`}>
                          {/* Header row */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />
                              <span className={`text-xs font-bold ${meta.color} truncate`}>{meta.label}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 flex-shrink-0 font-mono">{formatDateTime(entry.createdAt)}</span>
                          </div>
                          {/* Who performed the action */}
                          {entry.adminName && (
                            <p className="text-[11px] text-slate-500 mt-1 pl-4">
                              by <span className="font-semibold text-slate-700">{entry.adminName}</span>
                            </p>
                          )}
                          {/* Note */}
                          {entry.note && (
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed pl-4">{entry.note}</p>
                          )}
                          {/* Field tags */}
                          {(approvedF.length > 0 || flaggedF.length > 0) && (
                            <div className="flex flex-wrap gap-1 mt-2 pl-4">
                              {approvedF.map(k => (
                                <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">{k}</span>
                              ))}
                              {flaggedF.map(k => (
                                <span key={k} className="text-[10px] px-1.5 py-0.5 rounded-md font-semibold bg-orange-100 text-orange-700 border border-orange-200">{k}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* â”€â”€ ACTION BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="border-t-2 border-slate-200 px-4 py-4 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)] space-y-3 flex-shrink-0">
              {showNoteInput ? (
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {showNoteInput === "reject" ? "Rejection reason (visible to driver)" : "What info is needed? (sent to driver)"}
                  </label>
                  <textarea
                    rows={3}
                    value={actionNote}
                    onChange={e => setActionNote(e.target.value)}
                    placeholder={
                      showNoteInput === "reject"
                        ? "e.g. Driving licence image is blurry or unreadable"
                        : "e.g. Please re-upload a clearer photo of your LATRA certificate"
                    }
                    className="w-full block px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none resize-none bg-white box-border"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => doAction(showNoteInput === "reject" ? "reject" : "request_info")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm ${
                        showNoteInput === "reject"
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-[#02665e] hover:bg-[#024f47] text-white"
                      } disabled:opacity-50`}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {showNoteInput === "reject" ? "Confirm Rejection" : "Send Request"}
                    </button>
                    <button
                      onClick={() => { setShowNoteInput(null); setActionNote(""); }}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Field review summary + Send Field Feedback */}
                  {(approvedFields.length > 0 || flaggedFields.length > 0) && (
                    <div className="flex items-center gap-2 flex-wrap p-2.5 rounded-xl bg-white border border-slate-200">
                      <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                        {approvedFields.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold">
                            <CheckCircle2 className="w-3 h-3" /> {approvedFields.length} approved
                          </span>
                        )}
                        {flaggedFields.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-xs font-semibold">
                            <AlertTriangle className="w-3 h-3" /> {flaggedFields.length} flagged
                          </span>
                        )}
                      </div>
                      {flaggedFields.length > 0 && (
                        <button
                          disabled={actionLoading}
                          onClick={() => {
                            const fieldLabels: Record<string, string> = {
                              name:          'Full Name',
                              email:         'Email',
                              phone:         'Phone Number',
                              gender:        'Gender',
                              region:        'Region',
                              district:      'District',
                              plateNumber:   'Plate Number',
                              vehicleType:   'Vehicle Type',
                              licenseNumber: 'License Number',
                              operationArea: 'Operation Area',
                              latra:         'LATRA Certificate',
                              insurance:     'Insurance',
                              nationalId:    'National ID',
                              drivingLicense:'Driving Licence',
                            };
                            const readable = flaggedFields.map(f => fieldLabels[f] ?? f);
                            const autoNote = `Following our review, please update the following in your driver profile: ${readable.join(', ')}.`;
                            doAction("request_info", autoNote);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-sm disabled:opacity-50"
                        >
                          {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Send Field Feedback
                        </button>
                      )}
                    </div>
                  )}

                  {/* Field approval progress — must approve all before approving driver */}
                  {selected.kycStatus !== "APPROVED_KYC" && (
                    <div
                      className="rounded-xl border px-3 py-2.5 space-y-1.5"
                      style={allFieldsApproved
                        ? { background: '#f0fdf4', borderColor: '#bbf7d0' }
                        : { background: '#fffbeb', borderColor: '#fde68a' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold"
                          style={{ color: allFieldsApproved ? '#15803d' : '#92400e' }}>
                          {allFieldsApproved
                            ? '✅ All fields verified — ready to approve'
                            : `⚠️ ${reviewedCount} / ${REQUIRED_FIELDS.length} fields approved — review all before approving`}
                        </span>
                        <span className="text-[10px] font-mono font-bold"
                          style={{ color: allFieldsApproved ? '#16a34a' : '#b45309' }}>
                          {reviewedCount}/{REQUIRED_FIELDS.length}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(reviewedCount / REQUIRED_FIELDS.length) * 100}%`,
                            background: allFieldsApproved ? '#16a34a' : '#f59e0b',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Final approval CTA — shown prominently when all fields are verified */}
                  {selected.kycStatus !== "APPROVED_KYC" && allFieldsApproved && (
                    <button
                      disabled={actionLoading}
                      onClick={() => doAction("approve")}
                      className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-extrabold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white transition-all shadow-md hover:shadow-lg"
                      style={{ letterSpacing: '0.02em' }}
                    >
                      {actionLoading
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle2 className="w-5 h-5" />}
                      Grant Driver Access — Final Approval
                    </button>
                  )}

                  {/* Main action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {selected.kycStatus !== "APPROVED_KYC" && !allFieldsApproved && (
                      <button
                        disabled={actionLoading || true}
                        title={`Approve all ${REQUIRED_FIELDS.length} fields first (${REQUIRED_FIELDS.length - reviewedCount} remaining)`}
                        className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-300 text-white cursor-not-allowed opacity-60"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </button>
                    )}
                    <button
                      disabled={actionLoading}
                      onClick={() => setShowNoteInput("request_info")}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-white hover:bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300 transition-all disabled:opacity-50"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Request Info
                    </button>
                    {selected.kycStatus !== "REJECTED_KYC" && (
                      <button
                        disabled={actionLoading}
                        onClick={() => setShowNoteInput("reject")}
                        className="flex-1 min-w-[90px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-white hover:bg-red-50 text-red-600 border border-red-200 hover:border-red-300 transition-all disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    )}
                    {selected.kycStatus === "APPROVED_KYC" && (
                      <button
                        disabled={actionLoading}
                        onClick={() => setShowNoteInput("reject")}
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50"
                      >
                        <ShieldX className="w-4 h-4" />
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

