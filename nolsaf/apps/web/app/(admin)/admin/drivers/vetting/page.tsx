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
  Calendar,
  Star,
  BadgeCheck,
  Users,
  TrendingUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

const api = axios.create({ baseURL: "", withCredentials: true });

type KycStatus = "PENDING_KYC" | "APPROVED_KYC" | "REJECTED_KYC";
type Tab = "PENDING_KYC" | "APPROVED_KYC" | "REJECTED_KYC" | "REVOKED";

type DriverRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  kycStatus: KycStatus | null;
  kycNote?: string | null;
  needsKycFix?: boolean;
  suspendedAt?: string | null;
  isRevoked?: boolean;
  revocationReason?: string | null;
  revocationCaseRef?: string | null;
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

const FIELD_LABELS: Record<string, string> = {
  name: 'Full Name',
  email: 'Email',
  phone: 'Phone Number',
  gender: 'Gender',
  nationality: 'Nationality',
  dateOfBirth: 'Date of Birth',
  nin: 'National ID Number',
  region: 'Region',
  district: 'District',
  operationArea: 'Operation Area',
  vehicleType: 'Vehicle Type',
  plateNumber: 'Plate Number',
  licenseNumber: 'Licence Number',
  paymentPhone: 'Payment Phone',
  drivingLicense: 'Driving Licence',
  nationalId: 'National ID',
  latra: 'LATRA Certificate',
  insurance: 'Insurance',
};

type DriverDetail = DriverRow & {
  gender: string | null;
  nationality: string | null;
  dateOfBirth?: string | null;
  nin: string | null;
  district: string | null;
  isDisabled?: boolean;
  paymentPhone: string | null;
  payout: any;
  kycFieldApprovals?: FieldApprovalsMap | null;
  documents?: any[];
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

function formatStoredDate(value: string | null | undefined) {
  if (!value) return "—";
  return String(value).split('T')[0];
}

function formatFieldLabel(key: string) {
  return FIELD_LABELS[key] ?? key;
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

function KycBadge({ status, suspendedAt }: { status: KycStatus | null; suspendedAt?: string | null }) {
  const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors";
  if (suspendedAt)
    return (
      <span title="Revoked" className={`${base} bg-red-50 text-red-800 border-red-200 hover:bg-red-100`}>
        <ShieldX className="w-3.5 h-3.5" /> Revoked
      </span>
    );
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

function VettingStatusPill({ status, needsFix, suspendedAt }: { status: KycStatus | null; needsFix?: boolean; suspendedAt?: string | null }) {
  const base = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors";
  if (suspendedAt)
    return (
      <span title="Revoked" className={`${base} bg-red-50 text-red-800 border-red-200 hover:bg-red-100`}>
        <ShieldX className="w-3.5 h-3.5" /> Revoked
      </span>
    );
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
      className={`group px-4 py-4 flex items-center justify-between gap-3 transition-colors ${
        fieldStatus === 'approved' ? 'bg-emerald-50/60' :
        fieldStatus === 'flagged'  ? 'bg-orange-50/40'  :
        'bg-white hover:bg-slate-50/70'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <span className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ring-1 ring-black/5 ${accent ?? 'bg-slate-100'}`}>
            <Icon className="w-4 h-4 text-slate-600" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.16em] truncate">{label}</p>
          {isEmpty ? (
            <p className="mt-1 text-sm text-slate-300 italic">Not provided</p>
          ) : (
            <p className="mt-1 text-sm font-semibold text-slate-900 break-words leading-snug">{value}</p>
          )}
        </div>
      </div>

      {fieldKey && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {fieldStatus === 'approved' ? (
            <button
              title="Approved — click to undo"
              onClick={() => onToggle?.(fieldKey, 'approved')}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-600 text-white border border-emerald-600 shadow-sm shadow-emerald-600/20"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <>
              <button
                title="Approve this field"
                onClick={() => onToggle?.(fieldKey, 'approved')}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${
                  'bg-white text-slate-400 border-slate-200 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-sm'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <button
                title="Flag this field for correction"
                onClick={() => onToggle?.(fieldKey, 'flagged')}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${
                  fieldStatus === 'flagged'
                    ? 'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-500/20'
                    : 'bg-white text-slate-400 border-slate-200 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50 hover:shadow-sm'
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

function DocLink({ label, url, expiryInfo, docId, docStatus, rejectionReason, fieldKey, fieldStatus, onToggle, onReviewDoc }: {
  label: string;
  url?: string | null;
  expiryInfo?: string | null;
  docId?: number | null;
  docStatus?: string | null;
  rejectionReason?: string | null;
  fieldKey?: string;
  fieldStatus?: FieldApprovalStatus | null;
  onToggle?: (key: string, status: FieldApprovalStatus) => void;
  onReviewDoc?: (docId: number, action: 'approve' | 'reject' | 'pending') => void;
}) {
  const normalizedDocStatus = String(docStatus ?? '').toUpperCase();
  const canReviewDoc = typeof docId === 'number' && docId > 0;

  const approvalButtons = fieldKey ? (
    <div className="flex items-center gap-1">
      {(fieldStatus === 'approved' || normalizedDocStatus === 'APPROVED') ? (
        <button
          title="Approved — click to undo"
          onClick={e => {
            e.preventDefault();
            if (canReviewDoc) onReviewDoc?.(docId as number, 'pending');
            else onToggle?.(fieldKey, 'approved');
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-600 text-white border border-emerald-600 shadow-sm"
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
      ) : (
        <>
          <button
            title="Approve this document"
            onClick={e => {
              e.preventDefault();
              if (canReviewDoc) onReviewDoc?.(docId as number, 'approve');
              else onToggle?.(fieldKey, 'approved');
            }}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all border bg-white text-slate-400 border-slate-200 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50"
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button
            title="Flag this document for correction"
            onClick={e => {
              e.preventDefault();
              if (canReviewDoc) onReviewDoc?.(docId as number, 'reject');
              else onToggle?.(fieldKey, 'flagged');
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border ${
              (fieldStatus === 'flagged' || normalizedDocStatus === 'REJECTED')
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

  // If we have a real doc record, prefer document status for background coloring
  const visualStatus = normalizedDocStatus === 'APPROVED'
    ? 'approved'
    : normalizedDocStatus === 'REJECTED'
      ? 'flagged'
      : fieldStatus;

  const Row = url ? "a" : "div";
  const rowProps = url
    ? ({ href: url, target: "_blank", rel: "noopener noreferrer" } as any)
    : {};

  return (
    <Row
      {...rowProps}
      className={`px-4 py-4 flex items-center justify-between gap-3 no-underline transition-colors ${
        visualStatus === 'approved' ? 'bg-emerald-50/60' :
        visualStatus === 'flagged'  ? 'bg-orange-50/40'  :
        'bg-white'
      } ${url ? 'hover:bg-slate-50' : ''}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0 ring-1 ring-black/5">
          <FileText className="w-4 h-4 text-slate-500" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.16em] truncate">{label}</p>
          {url ? (
            <p className="mt-1 text-sm font-semibold text-slate-900">Open document</p>
          ) : (
            <p className="mt-1 text-sm text-slate-300 italic">Not uploaded</p>
          )}
          {expiryInfo && (
            <p className="mt-1 text-[11px] text-slate-500">Expires: <span className="font-semibold text-slate-700">{expiryInfo}</span></p>
          )}
          {normalizedDocStatus === 'REJECTED' && rejectionReason && (
            <p className="mt-1 text-[11px] text-orange-700 font-semibold">Reason: {rejectionReason}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {url && (
          <span className="w-8 h-8 rounded-xl border border-slate-200 bg-white text-slate-500 flex items-center justify-center shadow-sm">
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
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [counts, setCounts] = useState<Record<Tab, number>>({ PENDING_KYC: 0, APPROVED_KYC: 0, REJECTED_KYC: 0, REVOKED: 0 });

  const [selected, setSelected] = useState<DriverDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState<"reject" | "request_info" | "revoke" | "unrevoke" | null>(null);
  const [revokeReason, setRevokeReason] = useState<string>("");
  const [revokePolicyAgreed, setRevokePolicyAgreed] = useState(false);
  const [unrevokeReason, setUnrevokeReason] = useState<string>("");
  const [unrevokePolicyAgreed, setUnrevokePolicyAgreed] = useState(false);
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

  function toggleSort(col: string) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const sortedItems = [...items].sort((a, b) => {
    if (!sortCol) return 0;
    let av: any, bv: any;
    if (sortCol === "createdAt") {
      av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    } else {
      av = (a as any)[sortCol] ?? "";
      bv = (b as any)[sortCol] ?? "";
    }
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

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

  async function reviewDriverDoc(docId: number, action: 'approve' | 'reject' | 'pending', fieldKey?: string) {
    if (!selected) return;
    try {
      const base = `/api/admin/drivers/${selected.id}/documents/${docId}`;
      let resp: any;
      if (action === 'approve') resp = await api.post(`${base}/approve`);
      else if (action === 'reject') {
        resp = await api.post(`${base}/reject`, { reason: "" });
      } else resp = await api.post(`${base}/pending`);

      const updatedDoc = resp?.data?.doc ?? resp?.data?.data?.doc ?? null;
      if (updatedDoc) {
        setSelected(prev => {
          if (!prev) return prev;
          const docs: any[] = Array.isArray((prev as any).documents) ? (prev as any).documents : [];
          const nextDocs = docs.map((d: any) => (d?.id === updatedDoc.id ? { ...d, ...updatedDoc } : d));
          return { ...prev, documents: nextDocs } as any;
        });
      }

      // Keep the legacy fieldApprovals map in sync for docs
      if (fieldKey) {
        setFieldApprovals(prev => {
          const next = { ...(prev ?? {}) } as any;
          if (action === 'approve') next[fieldKey] = 'approved';
          else if (action === 'reject') next[fieldKey] = 'flagged';
          else delete next[fieldKey];
          return next;
        });
      }
    } catch (e: any) {
      setActionMsg({ type: 'error', text: e?.response?.data?.message || e?.response?.data?.error || e?.message || 'Document review failed' });
    }
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
      const [p, a, r, revoked] = await Promise.all([
        api.get("/api/admin/drivers", { params: { status: "PENDING_KYC", page: 1, pageSize: 1 } }),
        api.get("/api/admin/drivers", { params: { status: "APPROVED_KYC", page: 1, pageSize: 1 } }),
        api.get("/api/admin/drivers", { params: { status: "REJECTED_KYC", page: 1, pageSize: 1 } }),
        api.get("/api/admin/drivers", { params: { status: "REVOKED", page: 1, pageSize: 1 } }),
      ]);
      setCounts({
        PENDING_KYC: p.data?.total ?? 0,
        APPROVED_KYC: a.data?.total ?? 0,
        REJECTED_KYC: r.data?.total ?? 0,
        REVOKED: revoked.data?.total ?? 0,
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
    setRevokeReason("");
    setRevokePolicyAgreed(false);
    setUnrevokeReason("");
    setUnrevokePolicyAgreed(false);
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

  async function doAction(action: "approve" | "reject" | "request_info" | "revoke" | "unrevoke", overrideNote?: string) {
    if (!selected) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      const response = await api.patch(`/api/admin/drivers/${selected.id}/kyc`, {
        action,
        reason: (action === "reject" || action === "revoke" || action === "unrevoke") ? (overrideNote ?? actionNote) : undefined,
        note: action === "request_info" ? (overrideNote ?? actionNote) : undefined,
        fieldApprovals: (action === "request_info" || action === "approve") ? fieldApprovals : undefined,
      });
      const newStatus =
        (action === "approve" || action === "unrevoke") ? "APPROVED_KYC" :
        (action === "reject" || action === "revoke") ? "REJECTED_KYC" : "PENDING_KYC";
      const suspendedAt = action === "revoke" ? (response.data?.suspendedAt ?? new Date().toISOString()) : null;
      const revocationCaseRef = action === "revoke" ? (response.data?.revocationCaseRef ?? null) : null;
      const resolutionNote = overrideNote ?? actionNote;
      setSelected(prev => prev ? {
        ...prev,
        kycStatus: newStatus as KycStatus,
        suspendedAt,
        isRevoked: action === "revoke",
        revocationReason: action === "revoke" ? resolutionNote : null,
        revocationCaseRef,
        kycNote: (action === "reject" || action === "revoke") ? resolutionNote : null,
      } : prev);
      setItems(prev => prev.map(d => d.id === selected.id ? {
        ...d,
        kycStatus: newStatus as KycStatus,
        suspendedAt,
        isRevoked: action === "revoke",
        revocationReason: action === "revoke" ? resolutionNote : null,
        revocationCaseRef,
        kycNote: (action === "reject" || action === "revoke") ? resolutionNote : null,
      } : d));
      if (action !== "request_info") {
        setItems(prev => prev.filter(d => d.id !== selected.id));
        setFieldApprovals({});
      }
      setActionMsg({
        type: "success",
        text: action === "approve" ? "Driver approved successfully." :
              action === "revoke" ? "Driver access revoked. The driver has been notified via SMS and email." :
              action === "unrevoke" ? "Driver suspension lifted. The driver has been notified with a dedicated restoration message." :
              action === "reject" ? "Driver application rejected." :
              "Field reviews saved and driver notified.",
      });
      setShowNoteInput(null);
      setActionNote("");
      setRevokeReason("");
      setRevokePolicyAgreed(false);
            setUnrevokeReason("");
            setUnrevokePolicyAgreed(false);
      loadCounts();
      // Reload audit logs to reflect the new action
      if (selected) loadAudit(selected.id);
    } catch (e: any) {
      const payload = e?.response?.data ?? {};
      const details = [
        ...(Array.isArray(payload?.missingFields) ? [`Missing fields: ${payload.missingFields.join(', ')}`] : []),
        ...(Array.isArray(payload?.missingDocuments) ? [`Missing documents: ${payload.missingDocuments.join(', ')}`] : []),
        ...(Array.isArray(payload?.missingApprovals) ? [`Missing approvals: ${payload.missingApprovals.join(', ')}`] : []),
      ];
      setActionMsg({
        type: "error",
        text: [payload?.message || payload?.error || e?.message || "Action failed", ...details].filter(Boolean).join(' '),
      });
    } finally {
      setActionLoading(false);
    }
  }

  const total = counts.PENDING_KYC + counts.APPROVED_KYC + counts.REJECTED_KYC + counts.REVOKED;
  const approvalRate = total > 0 ? Math.round((counts.APPROVED_KYC / total) * 100) : 0;
  const payoutObj = (selected?.payout && typeof selected.payout === "object") ? selected.payout as any : {};
  const selectedRevoked = Boolean(selected?.suspendedAt);
  const fieldsLocked = Boolean(selected?.suspendedAt) || selected?.kycStatus === "APPROVED_KYC";
  const selectedDocuments: any[] = Array.isArray(selected?.documents) ? selected.documents : [];
  const getSelectedDoc = (types: string[]) => types.map((t) => selectedDocuments.find((doc) => String(doc?.type ?? '').toUpperCase() === t)).find(Boolean) ?? null;
  const selectedLicenseDoc = getSelectedDoc(['DRIVER_LICENSE', 'DRIVING_LICENSE', 'DRIVER_LICENCE', 'DRIVING_LICENCE', 'LICENSE']);
  const selectedNationalIdDoc = getSelectedDoc(['NATIONAL_ID', 'ID', 'PASSPORT']);
  const selectedLatraDoc = getSelectedDoc(['VEHICLE_REGISTRATION', 'LATRA', 'VEHICLE_REG']);
  const selectedInsuranceDoc = getSelectedDoc(['INSURANCE']);
  const selectedLicenseExpiry = String(selectedLicenseDoc?.metadata?.expiresOn ?? selectedLicenseDoc?.metadata?.expiresAt ?? '').split('T')[0] || null;
  const selectedInsuranceExpiry = String(selectedInsuranceDoc?.metadata?.expiresOn ?? selectedInsuranceDoc?.metadata?.expiresAt ?? '').split('T')[0] || null;
  const resolvedLicenseUrl = selectedLicenseDoc?.url || payoutObj?.drivingLicenseUrl || selected?.payout?.drivingLicenseUrl || null;
  const resolvedNationalIdUrl = selectedNationalIdDoc?.url || payoutObj?.nationalIdUrl || selected?.payout?.nationalIdUrl || null;
  const resolvedLatraUrl = selectedLatraDoc?.url || payoutObj?.latraUrl || payoutObj?.vehicleRegistrationUrl || selected?.payout?.latraUrl || selected?.payout?.vehicleRegistrationUrl || null;
  const resolvedInsuranceUrl = selectedInsuranceDoc?.url || payoutObj?.insuranceUrl || selected?.payout?.insuranceUrl || null;
  const missingRequiredFields = [
    !String(selected?.name ?? '').trim() ? 'full name' : null,
    !String(selected?.email ?? '').trim() ? 'email' : null,
    !String(selected?.phone ?? '').trim() ? 'phone' : null,
    !String(selected?.gender ?? '').trim() ? 'gender' : null,
    !String(selected?.nationality ?? '').trim() ? 'nationality' : null,
    !(selected as DriverDetail | null)?.dateOfBirth ? 'date of birth' : null,
    !String((selected as DriverDetail | null)?.nin ?? '').trim() ? 'NIN' : null,
    !String(selected?.region ?? '').trim() ? 'region' : null,
    !String(selected?.district ?? '').trim() ? 'district' : null,
    !String(selected?.operationArea ?? '').trim() ? 'operation area' : null,
    !String(selected?.vehicleType ?? '').trim() ? 'vehicle type' : null,
    !String(selected?.plateNumber ?? '').trim() ? 'plate number' : null,
    !String(selected?.licenseNumber ?? '').trim() ? 'licence number' : null,
    !String((selected as DriverDetail | null)?.paymentPhone ?? '').trim() ? 'payment phone' : null,
    !Boolean(selected?.paymentVerified) ? 'verified payment phone' : null,
  ].filter(Boolean) as string[];
  const missingRequiredDocuments = [
    !resolvedLicenseUrl ? 'driving licence' : null,
    !resolvedNationalIdUrl ? 'National ID' : null,
    !resolvedLatraUrl ? 'vehicle registration' : null,
    !resolvedInsuranceUrl ? 'insurance certificate' : null,
  ].filter(Boolean) as string[];
  const approvalBlockedReasons = [
    ...(missingRequiredFields.length > 0 ? [`Missing fields: ${missingRequiredFields.join(', ')}`] : []),
    ...(missingRequiredDocuments.length > 0 ? [`Missing documents: ${missingRequiredDocuments.join(', ')}`] : []),
  ];
  const REQUIRED_FIELDS = [
    'name', 'email', 'phone', 'gender', 'nationality', 'dateOfBirth', 'nin',
    'region', 'district', 'operationArea',
    'vehicleType', 'plateNumber', 'licenseNumber',
    'paymentPhone',
    'drivingLicense', 'nationalId', 'latra', 'insurance',
  ];
  const flaggedFields = Object.entries(fieldApprovals).filter(([, v]) => v === "flagged").map(([k]) => k);
  const approvedFields = Object.entries(fieldApprovals).filter(([, v]) => v === "approved").map(([k]) => k);
  const reviewedCount = REQUIRED_FIELDS.filter(k => fieldApprovals[k] === 'approved').length;
  const allFieldsApproved = reviewedCount === REQUIRED_FIELDS.length;
  const canGrantFinalApproval = allFieldsApproved && approvalBlockedReasons.length === 0;
  const fa = (key: string) => fieldApprovals[key] ?? null;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const tabs: { key: Tab; label: string; shortLabel: string; icon: any; color: string }[] = [
    { key: "PENDING_KYC",  label: "Pending Review", shortLabel: "Pending",  icon: Clock,       color: "#f59e0b" },
    { key: "APPROVED_KYC", label: "Approved",        shortLabel: "Approved", icon: ShieldCheck, color: "#10b981" },
    { key: "REJECTED_KYC", label: "Rejected",         shortLabel: "Rejected", icon: ShieldX,     color: "#ef4444" },
    { key: "REVOKED",      label: "Revoked",          shortLabel: "Revoked",  icon: ShieldX,     color: "#991b1b" },
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
                  {(["name", "vehicleType", "region", "createdAt", "kycStatus"] as const).map((col) => {
                    const labels: Record<string, string> = { name: "Driver", vehicleType: "Vehicle Type", region: "Region / District / Ward", createdAt: "Joined", kycStatus: "Status" };
                    const nowrap = col === "vehicleType" || col === "createdAt";
                    const isActive = sortCol === col;
                    return (
                      <th
                        key={col}
                        onClick={() => toggleSort(col)}
                        className={`px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider cursor-pointer select-none group transition-colors${nowrap ? " whitespace-nowrap" : ""} ${isActive ? "text-[#02665e]" : "text-gray-500 hover:text-[#02665e]"}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {labels[col]}
                          {isActive
                            ? sortDir === "asc"
                              ? <ArrowUp className="w-3 h-3" />
                              : <ArrowDown className="w-3 h-3" />
                            : <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-60" />}
                        </span>
                      </th>
                    );
                  })}
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
                         tab === "APPROVED_KYC" ? "No approved drivers" :
                         tab === "REJECTED_KYC" ? "No rejected applications" : "No revoked drivers"}
                      </p>
                    </td>
                  </TableRow>
                ) : sortedItems.map((d, i) => {
                  const isSelected = selected?.id === d.id;
                  const rowNum = sortCol ? i + 1 : (page - 1) * pageSize + i + 1;
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
                        <VettingStatusPill status={d.kycStatus} needsFix={d.needsKycFix} suspendedAt={d.suspendedAt} />
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
            <div className="fixed right-0 top-0 h-screen w-[620px] max-w-[96vw] z-50 bg-[#f7f7f2] shadow-2xl border-l border-slate-200/80 flex flex-col overflow-hidden">

            {/* Detail header */}
            <div style={{ background: "linear-gradient(145deg, #132968 0%, #0e4a70 46%, #0a7a68 100%)" }} className="px-5 pt-5 pb-4 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at top right, rgba(255,255,255,0.35), transparent 34%), radial-gradient(circle at bottom left, rgba(255,255,255,0.2), transparent 28%)" }} />
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className="w-14 h-14 rounded-[22px] bg-white/14 border border-white/20 flex items-center justify-center flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-sm">
                    <UserCircle2 className="w-8 h-8 text-white/90" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[20px] font-black text-white leading-tight tracking-[-0.02em] truncate">{selected.name}</h2>
                      {selected.isVipDriver && <span className="inline-flex items-center rounded-full border border-white/20 bg-white/12 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] text-white/85">VIP</span>}
                    </div>
                    <p className="text-white/70 text-sm mt-1 truncate">{selected.email}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      <KycBadge status={selected.kycStatus} suspendedAt={selected.suspendedAt} />
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                        <Calendar className="w-3.5 h-3.5" />
                        Joined {formatDate(selected.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80">
                        <History className="w-3.5 h-3.5" />
                        {auditLogs.length} audit event{auditLogs.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/18 border border-white/15 flex items-center justify-center text-white/60 hover:text-white flex-shrink-0 transition-all backdrop-blur-sm"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="px-5 py-3 border-b border-slate-200/70 bg-white/85 backdrop-blur flex-shrink-0">
              <div className="inline-flex rounded-2xl bg-slate-100 p-1 ring-1 ring-slate-200/80">
                {([
                  { key: "details" as const, label: "Details",       icon: User    },
                  { key: "audit"   as const, label: "Audit History", icon: History },
                ]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setDetailTab(key)}
                    className={`flex items-center gap-2 rounded-[14px] px-4 py-2 text-xs font-bold transition-all ${
                      detailTab === key
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    {key === "audit" && auditLogs.length > 0 && (
                      <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none ${detailTab === key ? 'bg-[#02665e] text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {auditLogs.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── DETAILS TAB ── */}
            {detailTab === "details" && (
            <div className="overflow-y-auto flex-1 bg-[linear-gradient(180deg,#f7f7f2_0%,#f5f7fb_100%)]">
              {detailLoading ? (
                <div className="p-10 text-center">
                  <div className="w-8 h-8 rounded-full border-2 border-[#02665e] border-t-transparent animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-400">Loading full details…</p>
                </div>
              ) : (
                <div className="p-5 space-y-5">
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

                  {selectedRevoked && (
                    <div className="space-y-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4">
                      <div className="flex items-start gap-3">
                        <ShieldX className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-red-800">Driver access is currently revoked</p>
                          <p className="text-xs text-red-700 mt-0.5">This driver is suspended from the NoLSAF driver portal until an admin completes the un-revoke procedure.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-red-200 bg-white px-3 py-2.5">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Revoked on</p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">{formatDateTime(selected.suspendedAt)}</p>
                        </div>
                        <div className="rounded-xl border border-red-200 bg-white px-3 py-2.5">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Ref No.</p>
                          <p className="mt-1 break-all text-sm font-semibold text-slate-800">{selected.revocationCaseRef ?? 'Pending reference'}</p>
                        </div>
                        <div className="rounded-xl border border-red-200 bg-white px-3 py-2.5">
                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Reason for suspension</p>
                          <p className="mt-1 text-sm font-semibold text-slate-800">{selected.revocationReason ?? selected.kycNote ?? 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Read-only banner for approved drivers */}
                  {selected.kycStatus === "APPROVED_KYC" && !selectedRevoked && (
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
                      <InfoRow label="Full name"    value={selected.name}                          icon={User}        accent="bg-blue-50"    fieldKey="name"        fieldStatus={fa("name")}        onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
                      <InfoRow label="Email"        value={selected.email}                         icon={Mail}        accent="bg-violet-50"  fieldKey="email"       fieldStatus={fa("email")}       onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
                      <InfoRow label="Phone"        value={selected.phone}                         icon={Phone}       accent="bg-emerald-50" fieldKey="phone"       fieldStatus={fa("phone")}       onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
                      <InfoRow label="Gender"       value={(selected as DriverDetail).gender}      icon={UserCircle2} accent="bg-pink-50"    fieldKey="gender"      fieldStatus={fa("gender")}      onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
                      <InfoRow label="Nationality"  value={(selected as DriverDetail).nationality} icon={Globe}       accent="bg-sky-50"     fieldKey="nationality" fieldStatus={fa("nationality")} onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
                      <InfoRow label="Date of birth" value={formatStoredDate((selected as DriverDetail).dateOfBirth)} icon={Calendar} accent="bg-indigo-50" fieldKey="dateOfBirth" fieldStatus={fa("dateOfBirth")} onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
                      <InfoRow label="NIN"          value={(selected as DriverDetail).nin}         icon={IdCard}      accent="bg-amber-50"   fieldKey="nin"         fieldStatus={fa("nin")}         onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
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
                      <InfoRow label="Region"         value={selected.region}                     icon={MapPin} accent="bg-emerald-50" fieldKey="region"        fieldStatus={fa("region")}        onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
                      <InfoRow label="District"       value={(selected as DriverDetail).district} icon={MapPin} accent="bg-teal-50"    fieldKey="district"      fieldStatus={fa("district")}      onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
                      <InfoRow label="Operation area" value={selected.operationArea}              icon={MapPin} accent="bg-cyan-50"    fieldKey="operationArea" fieldStatus={fa("operationArea")} onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
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
                      <InfoRow label="Vehicle type"  value={selected.vehicleType}   icon={Car}      accent="bg-amber-50"  fieldKey="vehicleType"  fieldStatus={fa("vehicleType")}  onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
                      <InfoRow label="Plate number"  value={selected.plateNumber}   icon={IdCard}   accent="bg-orange-50" fieldKey="plateNumber"  fieldStatus={fa("plateNumber")}  onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
                      <InfoRow label="Licence no."   value={selected.licenseNumber} icon={FileText} accent="bg-yellow-50" fieldKey="licenseNumber" fieldStatus={fa("licenseNumber")} onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
                      <InfoRow label="Licence expiry" value={selectedLicenseExpiry} icon={Calendar} accent="bg-lime-50" />
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
                      <InfoRow label="Payment phone"  value={(selected as DriverDetail).paymentPhone}                 icon={Phone}      accent="bg-indigo-50" fieldKey="paymentPhone" fieldStatus={fa("paymentPhone")} onToggle={!fieldsLocked ? toggleFieldApproval : undefined} />
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
                      {(() => {
                        const fmtExpiry = (doc: any) => doc?.metadata?.expiresOn ?? null;
                        const urlFrom = (doc: any, fallback: string | null | undefined) => doc?.url || fallback || null;
                        return (
                          <>
                            <DocLink
                              label="Driving License"
                              url={urlFrom(selectedLicenseDoc, resolvedLicenseUrl)}
                              expiryInfo={selectedLicenseExpiry || fmtExpiry(selectedLicenseDoc)}
                              docId={selectedLicenseDoc?.id ?? null}
                              docStatus={selectedLicenseDoc?.status ?? null}
                              rejectionReason={selectedLicenseDoc?.reason ?? null}
                              fieldKey="drivingLicense"
                              fieldStatus={fa("drivingLicense")}
                              onToggle={!fieldsLocked ? toggleFieldApproval : undefined}
                              onReviewDoc={!fieldsLocked ? (id, act) => reviewDriverDoc(id, act, 'drivingLicense') : undefined}
                            />
                            <DocLink
                              label="National ID"
                              url={urlFrom(selectedNationalIdDoc, resolvedNationalIdUrl)}
                              expiryInfo={null}
                              docId={selectedNationalIdDoc?.id ?? null}
                              docStatus={selectedNationalIdDoc?.status ?? null}
                              rejectionReason={selectedNationalIdDoc?.reason ?? null}
                              fieldKey="nationalId"
                              fieldStatus={fa("nationalId")}
                              onToggle={!fieldsLocked ? toggleFieldApproval : undefined}
                              onReviewDoc={!fieldsLocked ? (id, act) => reviewDriverDoc(id, act, 'nationalId') : undefined}
                            />
                            <DocLink
                              label="LATRA Certificate"
                              url={urlFrom(selectedLatraDoc, resolvedLatraUrl)}
                              expiryInfo={null}
                              docId={selectedLatraDoc?.id ?? null}
                              docStatus={selectedLatraDoc?.status ?? null}
                              rejectionReason={selectedLatraDoc?.reason ?? null}
                              fieldKey="latra"
                              fieldStatus={fa("latra")}
                              onToggle={!fieldsLocked ? toggleFieldApproval : undefined}
                              onReviewDoc={!fieldsLocked ? (id, act) => reviewDriverDoc(id, act, 'latra') : undefined}
                            />
                            <DocLink
                              label="Insurance"
                              url={urlFrom(selectedInsuranceDoc, resolvedInsuranceUrl)}
                              expiryInfo={selectedInsuranceExpiry || fmtExpiry(selectedInsuranceDoc)}
                              docId={selectedInsuranceDoc?.id ?? null}
                              docStatus={selectedInsuranceDoc?.status ?? null}
                              rejectionReason={selectedInsuranceDoc?.reason ?? null}
                              fieldKey="insurance"
                              fieldStatus={fa("insurance")}
                              onToggle={!fieldsLocked ? toggleFieldApproval : undefined}
                              onReviewDoc={!fieldsLocked ? (id, act) => reviewDriverDoc(id, act, 'insurance') : undefined}
                            />
                          </>
                        );
                      })()}
                    </div>
                  </section>
                </div>
              )}
            </div>
            )} {/* end detailTab === "details" */}

            {/* AUDIT HISTORY TAB */}
            {detailTab === "audit" && (
              <div className="overflow-y-auto flex-1 px-5 py-5 bg-[linear-gradient(180deg,#f7f7f2_0%,#f6f4fb_100%)]">
                {auditLoading ? (
                  <div className="p-10 text-center">
                    <div className="w-7 h-7 rounded-full border-2 border-[#02665e] border-t-transparent animate-spin mx-auto mb-3" />
                    <p className="text-xs text-slate-400">Loading history…</p>
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-10 text-center rounded-[28px] border border-white/70 bg-white/75 shadow-sm backdrop-blur">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 ring-1 ring-slate-200">
                      <History className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs font-semibold text-slate-400">No audit history yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">Actions taken on this driver will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Review Timeline</p>
                          <h3 className="mt-1 text-lg font-black tracking-[-0.02em] text-slate-900">Decision history and reviewer actions</h3>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Events</p>
                          <p className="text-base font-black text-slate-900">{auditLogs.length}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                    {deduplicateAuditLogs(auditLogs).map((entry, index, arr) => {
                      const actionMeta: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
                        approve:      { label: "Approved",           color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200", dot: "bg-emerald-500" },
                        reject:       { label: "Rejected",           color: "text-red-700",     bg: "bg-red-50",      border: "border-red-200",     dot: "bg-red-500" },
                        revoke:       { label: "Access Revoked",     color: "text-red-800",     bg: "bg-red-100",     border: "border-red-300",     dot: "bg-red-700" },
                        unrevoke:     { label: "Suspension Lifted",  color: "text-emerald-800", bg: "bg-emerald-100", border: "border-emerald-300", dot: "bg-emerald-700" },
                        request_info: { label: "Requested Info",     color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-200",   dot: "bg-amber-500" },
                        field_review: { label: "Field Review Saved", color: "text-blue-700",    bg: "bg-blue-50",     border: "border-blue-200",    dot: "bg-blue-400" },
                        resubmitted:  { label: "Resubmitted",        color: "text-violet-700",  bg: "bg-violet-50",   border: "border-violet-200",  dot: "bg-violet-500" },
                      };
                      const meta = actionMeta[entry.action] ?? { label: entry.action, color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200", dot: "bg-slate-400" };
                      const fieldMap = entry.fieldApprovals as Record<string, string> | null | undefined;
                      const approvedF = fieldMap ? Object.entries(fieldMap).filter(([, v]) => v === "approved").map(([k]) => formatFieldLabel(k)) : [];
                      const flaggedF  = fieldMap ? Object.entries(fieldMap).filter(([, v]) => v !== "approved").map(([k]) => formatFieldLabel(k)) : [];
                      const previewApproved = approvedF.slice(0, 4);
                      const previewFlagged = flaggedF.slice(0, 4);
                      return (
                        <div key={entry.id} className="grid grid-cols-[28px_1fr] gap-3">
                          <div className="flex flex-col items-center pt-2">
                            <span className={`w-3.5 h-3.5 rounded-full ring-4 ring-white shadow-sm ${meta.dot}`} />
                            {index < arr.length - 1 && <span className="mt-2 w-px flex-1 bg-gradient-to-b from-slate-300 via-slate-200 to-transparent" />}
                          </div>
                          <div className={`rounded-[26px] border ${meta.border} ${meta.bg} px-4 py-4 shadow-sm`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${meta.color} bg-white/75 border border-white/70`}>
                                    <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                                    {meta.label}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    {entry.action === 'resubmitted' ? 'by Driver' : `by ${entry.adminName ?? 'Admin'}`}
                                  </span>
                                </div>
                                {entry.note && (
                                  <p className="mt-3 text-sm leading-relaxed text-slate-700">{entry.note}</p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Timestamp</p>
                                <p className="mt-1 text-[11px] font-semibold text-slate-600">{formatDateTime(entry.createdAt)}</p>
                              </div>
                            </div>

                            {(approvedF.length > 0 || flaggedF.length > 0) && (
                              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {approvedF.length > 0 && (
                                  <div className="rounded-2xl border border-emerald-200/80 bg-white/70 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-700">Approved items</p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {previewApproved.map((item) => (
                                        <span key={item} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">{item}</span>
                                      ))}
                                      {approvedF.length > previewApproved.length && (
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">+{approvedF.length - previewApproved.length} more</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {flaggedF.length > 0 && (
                                  <div className="rounded-2xl border border-orange-200/80 bg-white/70 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-700">Needs correction</p>
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {previewFlagged.map((item) => (
                                        <span key={item} className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700">{item}</span>
                                      ))}
                                      {flaggedF.length > previewFlagged.length && (
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600">+{flaggedF.length - previewFlagged.length} more</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* â”€â”€ ACTION BAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="border-t-2 border-slate-200 px-4 py-4 bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)] space-y-3 flex-shrink-0">
              {showNoteInput === "revoke" ? (
                <div className="space-y-3">
                  {/* Warning banner */}
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Access Revocation</p>
                      <p className="text-xs text-red-600 mt-0.5">This will immediately remove the driver's access to the NoLSAF driver portal. The driver will be notified by SMS and email.</p>
                    </div>
                  </div>

                  {/* Reason category */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Reason for revocation <span className="text-red-500">*</span></label>
                    <select
                      value={revokeReason}
                      onChange={e => setRevokeReason(e.target.value)}
                      className="mt-1.5 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white box-border"
                    >
                      <option value="">— Select a reason —</option>
                      <option value="Policy violation">Policy violation</option>
                      <option value="Fraudulent documents">Fraudulent documents</option>
                      <option value="Unacceptable conduct">Unacceptable conduct</option>
                      <option value="Extended inactivity">Extended inactivity</option>
                      <option value="Account security concern">Account security concern</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Policy agreement */}
                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <input
                      type="checkbox"
                      checked={revokePolicyAgreed}
                      onChange={e => setRevokePolicyAgreed(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 flex-shrink-0 cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      I confirm that I have reviewed this driver's record, that revocation is warranted, and that I take full responsibility for this action.
                    </span>
                  </label>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading || !revokeReason || !revokePolicyAgreed}
                      onClick={() => doAction("revoke", revokeReason)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldX className="w-4 h-4" />}
                      Confirm Revocation
                    </button>
                    <button
                      onClick={() => { setShowNoteInput(null); setRevokeReason(""); setRevokePolicyAgreed(false); }}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : showNoteInput === "unrevoke" ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <AlertTriangle className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Lift Driver Suspension</p>
                      <p className="text-xs text-emerald-700 mt-0.5">You are about to un-suspend this driver and restore portal access. A dedicated restoration email and SMS will be sent immediately.</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Reason for un-revoke <span className="text-red-500">*</span></label>
                    <select
                      value={unrevokeReason}
                      onChange={e => setUnrevokeReason(e.target.value)}
                      className="mt-1.5 w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none bg-white box-border"
                    >
                      <option value="">— Select a reason —</option>
                      <option value="Appeal reviewed and approved">Appeal reviewed and approved</option>
                      <option value="Issue resolved">Issue resolved</option>
                      <option value="Documents verified and cleared">Documents verified and cleared</option>
                      <option value="Administrative correction">Administrative correction</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <input
                      type="checkbox"
                      checked={unrevokePolicyAgreed}
                      onChange={e => setUnrevokePolicyAgreed(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0 cursor-pointer"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      I confirm that I have reviewed the revocation record, that restoring this driver's access is appropriate, and that I accept responsibility for reactivating this account.
                    </span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading || !unrevokeReason || !unrevokePolicyAgreed}
                      onClick={() => doAction("unrevoke", unrevokeReason)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Confirm Un-Revoke
                    </button>
                    <button
                      onClick={() => { setShowNoteInput(null); setUnrevokeReason(""); setUnrevokePolicyAgreed(false); }}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : showNoteInput ? (
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
                  {selectedRevoked ? (
                    <>
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3">
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Revoked driver workflow</p>
                        <p className="mt-1 text-xs leading-relaxed text-red-700">This record is in a revoked state. Rejection and field-review actions are locked while the suspension is active. Use the action below to restore access.</p>
                      </div>
                      <button
                        disabled={actionLoading}
                        onClick={() => setShowNoteInput("unrevoke")}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Un-Revoke Driver Access
                      </button>
                    </>
                  ) : (
                    <>
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
                              dateOfBirth:   'Date of Birth',
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
                      style={canGrantFinalApproval
                        ? { background: '#f0fdf4', borderColor: '#bbf7d0' }
                        : { background: '#fffbeb', borderColor: '#fde68a' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold"
                          style={{ color: canGrantFinalApproval ? '#15803d' : '#92400e' }}>
                          {canGrantFinalApproval
                            ? '✅ All fields verified — ready to approve'
                            : `⚠️ ${reviewedCount} / ${REQUIRED_FIELDS.length} fields approved — review all before approving`}
                        </span>
                        <span className="text-[10px] font-mono font-bold"
                          style={{ color: canGrantFinalApproval ? '#16a34a' : '#b45309' }}>
                          {reviewedCount}/{REQUIRED_FIELDS.length}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${(reviewedCount / REQUIRED_FIELDS.length) * 100}%`,
                            background: canGrantFinalApproval ? '#16a34a' : '#f59e0b',
                          }}
                        />
                      </div>
                      {approvalBlockedReasons.length > 0 && (
                        <div className="pt-1 space-y-1">
                          {approvalBlockedReasons.map((reason) => (
                            <p key={reason} className="text-[11px] text-amber-800 leading-relaxed">{reason}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Final approval CTA — shown prominently when all fields are verified */}
                  {selected.kycStatus !== "APPROVED_KYC" && canGrantFinalApproval && (
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
                    {selected.kycStatus !== "APPROVED_KYC" && !canGrantFinalApproval && (
                      <button
                        disabled={actionLoading || true}
                        title={approvalBlockedReasons.length > 0
                          ? approvalBlockedReasons.join(' | ')
                          : `Approve all ${REQUIRED_FIELDS.length} fields first (${REQUIRED_FIELDS.length - reviewedCount} remaining)`}
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
                        onClick={() => setShowNoteInput("revoke")}
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50"
                      >
                        <ShieldX className="w-4 h-4" />
                        Revoke
                      </button>
                    )}
                  </div>
                      </>
                    )}
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

