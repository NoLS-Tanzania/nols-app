"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, Building2, CheckCircle, CheckCircle2, Clock, CreditCard,
  Eye, FileText, History, Lock, LogOut, Mail, MapPin, Pencil,
  Phone, Save, Trash2, Upload, User, Wallet, X, AlertTriangle,
  ChevronDown, ChevronUp, ShieldCheck,
} from 'lucide-react';
import DatePickerField from "@/components/DatePickerField";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });



// ─── Shared display components ──────────────────────────────────────────────

function InfoItem({

  icon, label, value, tone = "light",

}: {

  icon: React.ReactNode; label: string; value: React.ReactNode;

  tone?: "light" | "dark";

}) {

  const dark = tone === "dark";

  const iconCls = dark

    ? "h-10 w-10 rounded-2xl bg-[#02665e]/10 border border-[#02665e]/20 flex items-center justify-center text-[#02665e] flex-shrink-0"

    : "h-10 w-10 rounded-2xl bg-[#02665e]/5 border border-[#02665e]/15 flex items-center justify-center text-[#02665e] flex-shrink-0";

  return (

    <div className="flex items-start gap-3">

      <div className={iconCls}>{icon}</div>

      <div className="min-w-0">

        <div className={dark ? "text-xs font-semibold text-white/60" : "text-xs font-semibold text-slate-600"}>{label}</div>

        <div className={dark ? "text-sm font-bold text-white mt-0.5 break-words" : "text-sm font-bold text-slate-900 mt-0.5 break-words"}>{value}</div>

      </div>

    </div>

  );

}



function EditableInfoItem({
  icon, label, value, fieldKey, fieldType = "text", selectOptions,
  editingField, onStartEdit, onStopEdit, onChange, maskFn,
}: {
  icon: React.ReactNode;
  label: string;
  value: any;
  fieldKey: string;
  fieldType?: "text" | "select" | "tel" | "textarea";
  selectOptions?: { value: string; label: string }[];
  editingField: string | null;
  onStartEdit: (k: string) => void;
  onStopEdit: () => void;
  onChange: (k: string, v: string) => void;
  maskFn?: (v: string) => string;
}) {
  const editing = editingField === fieldKey;
  const display = value ? (maskFn ? maskFn(String(value)) : value) : "—";

  if (editing) {
    return (
      <div className="w-full min-w-0 max-w-full overflow-hidden">
        <div className="flex items-center justify-between gap-1 mb-1.5 w-full min-w-0 max-w-full">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); onStopEdit(); }}
            className="flex-shrink-0 h-6 w-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none"
            aria-label="Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-xl">
        {fieldType === "select" && selectOptions ? (
          <select
            value={value || ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            autoFocus
            onBlur={onStopEdit}
            className="block w-full min-w-0 max-w-full box-border rounded-xl border-2 border-[#02665e]/30 bg-[#02665e]/5 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-0 focus:border-[#02665e] focus:bg-white transition-all"
          >
            <option value="">Select</option>
            {selectOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : fieldType === "textarea" ? (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            autoFocus
            onBlur={onStopEdit}
            rows={3}
            className="block w-full min-w-0 max-w-full box-border rounded-xl border-2 border-[#02665e]/30 bg-[#02665e]/5 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-0 focus:border-[#02665e] focus:bg-white transition-all resize-none"
          />
        ) : (
          <input
            type={fieldType === "tel" ? "tel" : "text"}
            value={value || ""}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            autoFocus
            onBlur={onStopEdit}
            onKeyDown={(e) => { if (e.key === "Enter") onStopEdit(); }}
            className="block w-full min-w-0 max-w-full box-border rounded-xl border-2 border-[#02665e]/30 bg-[#02665e]/5 px-3 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-0 focus:border-[#02665e] focus:bg-white transition-all"
          />
        )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group min-w-0 overflow-hidden">
      <div className="h-10 w-10 rounded-2xl bg-[#02665e]/5 border border-[#02665e]/15 flex items-center justify-center text-[#02665e] flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-600 truncate">{label}</div>
          <button
            type="button"
            onClick={() => onStartEdit(fieldKey)}
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 h-6 w-6 rounded-lg flex items-center justify-center text-[#02665e] hover:bg-[#02665e]/10 transition-all focus-visible:opacity-100 focus-visible:outline-none"
            aria-label={"Edit " + label}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className={"text-sm font-bold mt-0.5 break-all " + (!value ? "text-slate-400" : "text-slate-900")}>
          {display}
        </div>
      </div>
    </div>
  );
}


export default function OwnerProfile() {
  const [form, setForm] = useState<any>({});
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [pendingSave, setPendingSave] = useState<(() => Promise<void>) | null>(null);
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showAllAuditHistory, setShowAllAuditHistory] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

  const [docUploading, setDocUploading] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [docDragOver, setDocDragOver] = useState(false);
  const [docHelpOpen, setDocHelpOpen] = useState(false);
  const docHelpRef = useRef<HTMLDivElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [businessLicenceExpiresOn, setBusinessLicenceExpiresOn] = useState<string>("");

  const requiredDocTypes = useMemo(
    () =>
      [
        { type: "BUSINESS_LICENCE", label: "Business Licence" },
        { type: "TIN_CERTIFICATE", label: "TIN Number Certificate" },
      ] as const,
    [],
  );

  type CloudinarySig = {
    timestamp: number;
    signature: string;
    folder: string;
    cloudName: string;
    apiKey: string;
  };

  async function uploadToCloudinary(file: File, folder: string) {
    const sig = await api.get(`/api/uploads/cloudinary/sign?folder=${encodeURIComponent(folder)}`);
    const sigData = sig.data as CloudinarySig;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("timestamp", String(sigData.timestamp));
    fd.append("api_key", sigData.apiKey);
    fd.append("signature", sigData.signature);
    fd.append("folder", sigData.folder);
    fd.append("overwrite", "true");
    const resp = await axios.post(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`, fd);
    return (resp.data as { secure_url: string }).secure_url;
  }

  const uploadAvatar = async (file: File) => {
    setError(null);
    setSuccess(null);
    setAvatarUploading(true);
    try {
      const url = await uploadToCloudinary(file, "avatars");
      await api.put("/api/account/profile", { avatarUrl: url });

      setForm((prev: any) => ({ ...prev, avatarUrl: url }));
      try {
        const updatedMe = { ...(me ?? {}), avatarUrl: url };
        setMe(updatedMe);
        try { (window as any).ME = updatedMe; } catch { /* ignore */ }
      } catch { /* ignore */ }

      try {
        window.dispatchEvent(new CustomEvent("nolsaf:profile-updated", { detail: { avatarUrl: url } }));
      } catch {
        // ignore
      }

      setSuccess("Profile photo updated.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      console.warn("Failed to upload avatar", e);
      setError("Failed to upload profile photo. Please try again.");
    } finally {
      setAvatarUploading(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = "";
    }
  };

  function getLatestDocByType(docs: any[] | undefined | null, type: string) {
    const normalizedType = String(type).toUpperCase();
    const items = Array.isArray(docs) ? docs : [];
    for (const d of items) {
      if (String(d?.type ?? "").toUpperCase() === normalizedType) return d;
    }
    return null;
  }

  const allowedDocTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

  const todayIsoDate = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const parseDocExpiresAt = (doc: any): Date | null => {
    const raw = doc?.metadata?.expiresAt ?? doc?.metadata?.expires_on ?? doc?.metadata?.expiresOn;
    if (!raw) return null;
    const d = new Date(String(raw));
    if (!Number.isFinite(d.getTime())) return null;
    return d;
  };

  const isBusinessLicenceExpired = useCallback((doc: any): boolean => {
    const exp = parseDocExpiresAt(doc);
    if (!exp) return false;
    return exp.getTime() < Date.now();
  }, []);

  const uploadDocumentForType = async (type: string, file: File | null) => {
    if (!file || !type) return;
    setDocError(null);
    setDocSuccess(null);

    const normalizedType = String(type).toUpperCase();
    const isBusinessLicence = normalizedType === "BUSINESS_LICENCE";
    if (isBusinessLicence) {
      if (!businessLicenceExpiresOn) {
        setDocError("Please enter the Business Licence expiry date before uploading.");
        return;
      }
      const parsed = new Date(`${businessLicenceExpiresOn}T23:59:59.999Z`);
      if (!Number.isFinite(parsed.getTime())) {
        setDocError("Please enter a valid expiry date.");
        return;
      }
      const minIso = todayIsoDate();
      if (String(businessLicenceExpiresOn) < String(minIso)) {
        setDocError("Expiry date must be today or later.");
        return;
      }
    }

    if (!allowedDocTypes.has(file.type)) {
      setDocError("Please choose a PDF or image file (PDF, JPG, PNG, WebP).");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setDocError("File is too large. Maximum size is 15MB.");
      return;
    }

    try {
      setDocUploading(type);
      const url = await uploadToCloudinary(file, "owner-documents");
      const expiresAtIso = normalizedType === "BUSINESS_LICENCE" && businessLicenceExpiresOn
        ? new Date(`${businessLicenceExpiresOn}T23:59:59.999Z`).toISOString()
        : null;
      const resp = await api.put("/api/account/documents", {
        type,
        url,
        metadata: {
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          ...(expiresAtIso
            ? { expiresAt: expiresAtIso, expiresOn: businessLicenceExpiresOn }
            : null),
        },
      });

      const saved = (resp as any)?.data?.data?.doc ?? (resp as any)?.data?.doc ?? null;

      const applySavedDoc = (prev: any) => {
        if (!prev) return prev;
        const docs = Array.isArray(prev.documents) ? prev.documents : [];
        const nextDocs = saved ? [saved, ...docs.filter((d: any) => d?.id !== saved?.id)] : docs;
        return { ...prev, documents: nextDocs };
      };

      setMe(applySavedDoc);
      setForm(applySavedDoc);
      setDocSuccess("Document uploaded. Pending admin review.");
    } catch (e: any) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setDocError(String(serverMsg || e?.message || "Failed to upload document. Please try again."));
    } finally {
      setDocUploading(null);
      setDocDragOver(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const triggerDocUpload = () => {
    setDocError(null);
    setDocSuccess(null);
    docInputRef.current?.click();
  };

  const onUploadDocumentFromPicker = async (file: File | null) => {
    await uploadDocumentForType(selectedDocType, file);
  };

  const actionableDocTypes = useMemo(() => {
    const docs = Array.isArray(me?.documents) ? me.documents : [];
    return requiredDocTypes.filter((t) => {
      const doc = getLatestDocByType(docs, t.type);
      const hasUrl = Boolean(doc?.url);
      const status = (doc?.status ? String(doc.status) : "").toUpperCase();
      const expired = t.type === "BUSINESS_LICENCE" && status === "APPROVED" && isBusinessLicenceExpired(doc);
      if (!hasUrl) return true;
      if (status === "REJECTED") return true;
      if (expired) return true;
      return false;
    });
  }, [me?.documents, requiredDocTypes, isBusinessLicenceExpired]);

  const showUploader = actionableDocTypes.length > 0;

  useEffect(() => {
    if (!selectedDocType) return;
    const stillSelectable = actionableDocTypes.some((t) => t.type === selectedDocType);
    if (!stillSelectable) setSelectedDocType("");
  }, [actionableDocTypes, selectedDocType]);

  useEffect(() => {
    if (String(selectedDocType).toUpperCase() !== "BUSINESS_LICENCE") {
      setBusinessLicenceExpiresOn("");
    }
  }, [selectedDocType]);

  useEffect(() => {
    if (!docHelpOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDocHelpOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const root = docHelpRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      setDocHelpOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [docHelpOpen]);

  // Check for email verification success
  useEffect(() => {
    if (searchParams?.get('email_verified') === '1') {
      setSuccess('Email verified successfully!');
      // Refresh user data
      api.get("/api/account/me").then((r) => {
        const meData = (r as any)?.data?.data ?? (r as any)?.data;
        setMe(meData);
        setForm((prev: any) => ({ ...prev, emailVerifiedAt: meData?.emailVerifiedAt }));
      }).catch(() => {});
      // Remove query parameter from URL
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('email_verified');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.get("/api/account/me");
        if (!mounted) return;
        // `/api/account/me` returns `{ ok: true, data: user }`
        // but some callers historically expected the user object directly.
        const meData = (r as any)?.data?.data ?? (r as any)?.data;
        const meRole = String(meData?.role || '').toUpperCase();
        // Check if user is an owner
        if (meRole !== 'OWNER' && meRole !== 'ADMIN') {
          window.location.href = '/owner/login';
          return;
        }
        
        // Extract payout data from JSON field and merge into form data
        const payoutData = (meData?.payout && typeof meData.payout === 'object') ? meData.payout : {};
        
        // Helper to normalize empty strings to null
        const normalizeValue = (val: any) => {
          if (val === undefined || val === null || val === '') return null;
          return String(val).trim() || null;
        };
        
        const formData = {
          ...meData,
          // Extract payout fields to top level for form - API now attaches these directly to user object
          // Use || instead of ?? to handle empty strings
          bankAccountName: normalizeValue(meData.bankAccountName || payoutData.bankAccountName),
          bankName: normalizeValue(meData.bankName || payoutData.bankName),
          bankAccountNumber: normalizeValue(meData.bankAccountNumber || payoutData.bankAccountNumber),
          bankBranch: normalizeValue(meData.bankBranch || payoutData.bankBranch),
          mobileMoneyProvider: normalizeValue(meData.mobileMoneyProvider || payoutData.mobileMoneyProvider),
          mobileMoneyNumber: normalizeValue(meData.mobileMoneyNumber || payoutData.mobileMoneyNumber),
          payoutPreferred: normalizeValue(meData.payoutPreferred || payoutData.payoutPreferred),
        };
        
        setForm(formData);
        setMe(formData);
        try { (window as any).ME = formData; } catch (e) { /* ignore */ }
      } catch (err: any) {
        console.error('Failed to load profile', err);
        if (mounted) setError(String(err?.message ?? err));
        const status = err?.response?.status;
        const code = err?.response?.data?.code;
        if (status === 403 && code === 'ACCOUNT_SUSPENDED') {
          return;
        }
        if (typeof window !== 'undefined') window.location.href = '/owner/login';
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Load audit history
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingAudit(true);
      try {
        const r = await api.get("/api/account/audit-history", { params: { page: 1, pageSize: 20 } });
        if (!mounted) return;
        const data = (r as any)?.data?.data;
        if (data?.items) {
          setAuditHistory(data.items);
        }
      } catch (err) {
        console.warn('Failed to load audit history', err);
      } finally {
        if (mounted) setLoadingAudit(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const normalizeE164Phone = (raw: unknown): string | undefined => {
    if (raw === null || raw === undefined) return undefined;
    const s = String(raw).trim().replace(/\s+/g, '');
    if (!s) return undefined;
    if (s.startsWith('+')) return s;
    // Best-effort TZ normalization (common in this app). If unsure, keep original.
    if (/^0\d{9}$/.test(s)) return `+255${s.slice(1)}`;
    if (/^\d{9}$/.test(s)) return `+255${s}`;
    return s;
  };

  const isValidE164Phone = (phone: string) => /^\+?[1-9]\d{1,14}$/.test(phone);
  const isValidUrl = (value: string) => {
    try {
      // eslint-disable-next-line no-new
      new URL(value);
      return true;
    } catch {
      return false;
    }
  };

  const performSave = async () => {
    setSaving(true);
    setEditingField(null); // Close any open edit fields
    try {
      const payload: any = {};
      const fullName = String(form.fullName || form.name || '').trim();
      if (fullName) payload.fullName = fullName;

      const phone = normalizeE164Phone(form.phone);
      if (phone) {
        if (!isValidE164Phone(phone)) {
          setError('Phone number must be in international format (E.164), e.g. +2557XXXXXXXX');
          setSaving(false);
          return;
        }
        payload.phone = phone;
      }

      const email = String(form.email || '').trim();
      if (email) payload.email = email;

      const avatarUrl = String(form.avatarUrl || '').trim();
      if (avatarUrl) {
        // API requires a real URL (data: URLs will be rejected).
        if (!isValidUrl(avatarUrl) || avatarUrl.startsWith('data:')) {
          // Ignore invalid avatarUrl instead of failing the entire save.
          console.warn('Ignoring invalid avatarUrl for profile update');
        } else {
          payload.avatarUrl = avatarUrl;
        }
      }

      const tin = String(form.tin || '').trim();
      if (tin) payload.tin = tin;

      const address = String(form.address || '').trim();
      if (address) payload.address = address;

      await api.put("/api/account/profile", payload);
      
      // also save payout details (owner fields) if present
      try {
        const payoutPayload: any = {
          bankAccountName: form.bankAccountName,
          bankName: form.bankName,
          bankAccountNumber: form.bankAccountNumber,
          bankBranch: form.bankBranch,
          mobileMoneyProvider: form.mobileMoneyProvider,
          mobileMoneyNumber: form.mobileMoneyNumber,
          payoutPreferred: form.payoutPreferred,
        };
        // Only call payouts endpoint if any payout field exists
        if (Object.values(payoutPayload).some(v => typeof v !== 'undefined' && v !== null && v !== '')) {
          await api.put('/api/account/payouts', payoutPayload);
        }
      } catch (e: any) {
        // Check if it's a rate limit error
        const serverData = e?.response?.data;
        if (serverData?.error?.includes('Too many payout updates')) {
          setError(serverData.error || 'Too many payout updates. Please wait before making changes.');
        } else {
          console.warn('Failed to save payout details', e);
        }
      }
      setSuccess("Profile saved successfully!");
      setError(null);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      // update local `me` shortcut and global window.ME
      try {
        const updatedMe = { ...(me ?? {}), ...payload, bankAccountName: form.bankAccountName, bankName: form.bankName, bankAccountNumber: form.bankAccountNumber, bankBranch: form.bankBranch, mobileMoneyProvider: form.mobileMoneyProvider, mobileMoneyNumber: form.mobileMoneyNumber, payoutPreferred: form.payoutPreferred };
        setMe(updatedMe);
        try { (window as any).ME = updatedMe; } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
      
      // Reload audit history after save
      try {
        const r = await api.get("/api/account/audit-history", { params: { page: 1, pageSize: 20 } });
        const data = (r as any)?.data?.data;
        if (data?.items) {
          setAuditHistory(data.items);
        }
      } catch (err) {
        console.warn('Failed to reload audit history', err);
      }
    } catch (err: any) {
      console.error('Failed to save profile', err);
      const serverData = err?.response?.data;
      const serverMessage = serverData?.error || serverData?.message;
      const details = Array.isArray(serverData?.details) ? serverData.details : null;
      const detailsText = details
        ? details.map((d: any) => d?.message).filter(Boolean).join('; ')
        : '';
      setError(
        'Could not save profile: ' +
          String(serverMessage || err?.message || err) +
          (detailsText ? ` (${detailsText})` : '')
      );
      setSuccess(null);
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    // Check for sensitive field changes that require confirmation
    const sensitiveFields = ['bankAccountNumber', 'mobileMoneyNumber', 'bankName', 'bankAccountName'];
    const hasSensitiveChange = sensitiveFields.some(field => {
      const oldVal = String(me?.[field] || '').trim().toLowerCase();
      const newVal = String(form[field] || '').trim().toLowerCase();
      return oldVal !== newVal && newVal !== '';
    });

    if (hasSensitiveChange) {
      const changedFields = sensitiveFields.filter(field => {
        const oldVal = String(me?.[field] || '').trim().toLowerCase();
        const newVal = String(form[field] || '').trim().toLowerCase();
        return oldVal !== newVal && newVal !== '';
      });
      
      const fieldLabels: Record<string, string> = {
        bankAccountNumber: 'Bank Account Number',
        mobileMoneyNumber: 'Mobile Money Number',
        bankName: 'Bank Name',
        bankAccountName: 'Bank Account Name',
      };
      
      setConfirmMessage(
        `You are about to change sensitive payout information: ${changedFields.map(f => fieldLabels[f] || f).join(', ')}. ` +
        `This change will be logged in your audit history. Are you sure you want to continue?`
      );
      setPendingSave(() => performSave);
      setShowConfirmDialog(true);
    } else {
      await performSave();
    }
  };

  const avatarUrl = (form?.avatarUrl || me?.avatarUrl || null) as string | null;
  const displayName = String(form?.fullName || form?.name || me?.fullName || me?.name || '').trim();
  const emailValue = String(form?.email || me?.email || '').trim();
  const phoneValue = String(form?.phone || me?.phone || '').trim();
  const tinValue = String(form?.tin || me?.tin || '').trim();
  const addressValue = String(form?.address || me?.address || '').trim();

  const requiredDocsOk = useMemo(() => {
    return requiredDocTypes.every((t) => {
      const doc = getLatestDocByType(me?.documents, t.type);
      const hasUrl = Boolean(doc?.url);
      const status = (doc?.status ? String(doc.status) : '').toUpperCase();
      if (!hasUrl) return false;
      if (status === 'REJECTED') return false;

      if (t.type === 'BUSINESS_LICENCE') {
        const exp = parseDocExpiresAt(doc);
        if (!exp) return false;
        if (status === 'APPROVED' && isBusinessLicenceExpired(doc)) return false;
      }
      return true;
    });
  }, [isBusinessLicenceExpired, me?.documents, requiredDocTypes]);

  const payoutPreferred = String(form?.payoutPreferred || me?.payoutPreferred || '').toUpperCase();
  const payoutDetailsOk = useMemo(() => {
    if (!payoutPreferred) return false;
    if (payoutPreferred === 'BANK') {
      const bankName = String(form?.bankName || me?.bankName || '').trim();
      const bankAccountName = String(form?.bankAccountName || me?.bankAccountName || '').trim();
      const bankAccountNumber = String(form?.bankAccountNumber || me?.bankAccountNumber || '').trim();
      return Boolean(bankName && bankAccountName && bankAccountNumber);
    }
    if (payoutPreferred === 'MOBILE_MONEY') {
      const provider = String(form?.mobileMoneyProvider || me?.mobileMoneyProvider || '').trim();
      const number = String(form?.mobileMoneyNumber || me?.mobileMoneyNumber || '').trim();
      return Boolean(provider && number);
    }
    return true;
  }, [
    form?.bankAccountName,
    form?.bankAccountNumber,
    form?.bankName,
    form?.mobileMoneyNumber,
    form?.mobileMoneyProvider,
    me?.bankAccountName,
    me?.bankAccountNumber,
    me?.bankName,
    me?.mobileMoneyNumber,
    me?.mobileMoneyProvider,
    payoutPreferred,
  ]);

  const profileCompletion = useMemo(() => {
    const checks: Array<boolean> = [
      Boolean(avatarUrl),
      Boolean(displayName && displayName !== '—'),
      Boolean(emailValue),
      Boolean(phoneValue),
      Boolean(tinValue),
      Boolean(addressValue),
      requiredDocsOk,
      Boolean(payoutPreferred),
      payoutDetailsOk,
    ];

    const total = checks.length;
    const done = checks.filter(Boolean).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { pct, done, total };
  }, [addressValue, avatarUrl, displayName, emailValue, phoneValue, payoutDetailsOk, payoutPreferred, requiredDocsOk, tinValue]);

  const completionTone = useMemo(() => {
    const pct = profileCompletion.pct;
    if (pct >= 80) return 'good' as const;
    if (pct >= 50) return 'warn' as const;
    return 'bad' as const;
  }, [profileCompletion.pct]);

  if (loading) {
    return (
      <div className="w-full max-w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="dot-spinner dot-md mx-auto" aria-hidden>
            <span className="dot dot-blue" />
            <span className="dot dot-black" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Loading profile…</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full max-w-full">
        <div className="rounded-md bg-red-50 border-2 border-red-200 p-4">
          <div className="text-sm font-medium text-red-800">Error loading profile: {error}</div>
        </div>
      </div>
    );
  }

  const maskAccount = (str: string | null | undefined) => {
    if (!str) return '—';
    const s = String(str);
    if (s.length <= 4) return s;
    return s.slice(0, 4) + '•'.repeat(Math.min(4, s.length - 4)) + s.slice(-4);
  };

  const maskPhone = (str: string | null | undefined) => {
    if (!str) return '—';
    const s = String(str).replace(/\D/g, '');
    if (s.length <= 4) return s;
    return s.slice(0, 3) + '•'.repeat(Math.min(4, s.length - 4)) + s.slice(-3);
  };

  const renderField = (label: string, value: any, icon: any, required: boolean = false, fieldKey?: string, fieldType: 'text' | 'textarea' = 'text') => {
    const Icon = icon;
    // Check for empty string, null, undefined, or whitespace-only strings
    const isEmpty = !value || (typeof value === 'string' && value.trim() === '');
    // Mask account number, mobile money number, and phone when displaying (not when editing)
    const displayValue = isEmpty 
      ? (required ? 'Not provided' : '—') 
      : (fieldKey === 'bankAccountNumber' && editingField !== 'bankAccountNumber' 
          ? maskAccount(value) 
          : (fieldKey === 'mobileMoneyNumber' || fieldKey === 'phone') && editingField !== fieldKey
          ? maskPhone(value)
          : String(value));
    // Generate unique ID for each field instance using timestamp and random
    const fieldId = fieldKey ? `owner-profile-${fieldKey}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}` : undefined;
    
    return (
      <div className="w-full max-w-full min-w-0 p-3 sm:p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-emerald-300 transition-all duration-300 hover:shadow-md group overflow-hidden box-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 w-full max-w-full min-w-0 overflow-hidden">
          {fieldId ? (
            <label htmlFor={fieldId} className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 transition-colors duration-300 group-hover:text-emerald-600 flex-shrink-0" />
              <span className="truncate min-w-0">{label}</span>
              {required && <span className="text-red-500 flex-shrink-0">*</span>}
              {fieldKey === 'mobileMoneyProvider' && editingField === 'mobileMoneyProvider' && (
                <div className="relative group/tooltip flex-shrink-0">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 transition-colors cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div className="font-semibold mb-1">Available providers:</div>
                    <div className="space-y-0.5">
                      <div>• M-Pesa</div>
                      <div>• Mix by yas</div>
                      <div>• Airtel</div>
                      <div>• Tigo Pesa</div>
                      <div>• Halopesa</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                </div>
              )}
              {fieldKey === 'bankName' && editingField === 'bankName' && (
                <div className="relative group/tooltip flex-shrink-0">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 transition-colors cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div className="font-semibold mb-1">Sample bank names:</div>
                    <div className="space-y-0.5">
                      <div>• CRDB BANK</div>
                      <div>• NMB BANK</div>
                      <div>• NBC BANK</div>
                      <div>• EXIM BANK</div>
                      <div>• DTB BANK</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                </div>
              )}
            </label>
          ) : (
            <div className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 transition-colors duration-300 group-hover:text-emerald-600 flex-shrink-0" />
              <span className="truncate min-w-0">{label}</span>
              {required && <span className="text-red-500 flex-shrink-0">*</span>}
              {fieldKey === 'mobileMoneyProvider' && editingField === 'mobileMoneyProvider' && (
                <div className="relative group/tooltip flex-shrink-0">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 transition-colors cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div className="font-semibold mb-1">Available providers:</div>
                    <div className="space-y-0.5">
                      <div>• M-Pesa</div>
                      <div>• Mix by yas</div>
                      <div>• Airtel</div>
                      <div>• Tigo Pesa</div>
                      <div>• Halopesa</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                </div>
              )}
              {fieldKey === 'bankName' && editingField === 'bankName' && (
                <div className="relative group/tooltip flex-shrink-0">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 transition-colors cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg z-50 min-w-[200px]">
                    <div className="font-semibold mb-1">Sample bank names:</div>
                    <div className="space-y-0.5">
                      <div>• CRDB BANK</div>
                      <div>• NMB BANK</div>
                      <div>• NBC BANK</div>
                      <div>• EXIM BANK</div>
                      <div>• DTB BANK</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                      <div className="border-4 border-transparent border-t-slate-900"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {fieldKey && (
            <button 
              type="button" 
              onClick={() => setEditingField(editingField === fieldKey ? null : fieldKey)}
              className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 hover:underline font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105 self-start sm:self-auto flex-shrink-0 whitespace-nowrap"
            >
              <Pencil className="w-3 h-3 flex-shrink-0" />
              <span>{editingField === fieldKey ? 'Cancel' : 'Edit'}</span>
            </button>
          )}
        </div>
        <div className="w-full max-w-full min-w-0 overflow-hidden">
          {editingField === fieldKey && fieldKey ? (
            fieldType === 'textarea' ? (
              <textarea
                id={fieldId}
                aria-label={label}
                value={value || ''}
                onChange={(e) => setForm({...form, [fieldKey]: e.target.value})}
                className="block w-full max-w-full rounded-lg border-2 border-emerald-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200 resize-none min-w-0 box-border"
                rows={3}
                autoFocus
                onBlur={() => setEditingField(null)}
              />
            ) : (
              <input
                id={fieldId}
                type={fieldKey === 'email' ? 'email' : fieldKey === 'phone' ? 'tel' : 'text'}
                aria-label={label}
                value={value || ''}
                placeholder={fieldKey === 'mobileMoneyProvider' ? 'e.g., M-Pesa, Mix by yas, Airtel' : fieldKey === 'bankName' ? 'e.g., CRDB BANK, NMB BANK, NBC BANK' : undefined}
                onChange={(e) => setForm({...form, [fieldKey]: e.target.value})}
                className="block w-full max-w-full rounded-lg border-2 border-emerald-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200 min-w-0 box-border"
                autoFocus
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingField(null);
                }}
              />
            )
          ) : (
            <div className="space-y-2">
              <div className={`text-xs sm:text-sm font-medium transition-colors duration-200 break-words overflow-wrap-anywhere w-full max-w-full ${isEmpty ? 'text-slate-400 italic' : 'text-slate-900'}`}>
                {displayValue}
              </div>
              {/* Verification Status for Email and Phone */}
              {fieldKey === 'email' && !isEmpty && (
                <div className="flex items-center gap-2">
                  {me?.emailVerifiedAt ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Verified</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        setVerifyingEmail(true);
                        try {
                          await api.post('/api/owner/email/verify/send');
                          setSuccess('Verification email sent! Please check your inbox.');
                          // Refresh user data to get updated verification status
                          const r = await api.get("/api/account/me");
                          const meData = (r as any)?.data?.data ?? (r as any)?.data;
                          setMe(meData);
                          setForm((prev: any) => ({ ...prev, emailVerifiedAt: meData?.emailVerifiedAt }));
                        } catch (err: any) {
                          setError(err?.response?.data?.error || 'Failed to send verification email');
                        } finally {
                          setVerifyingEmail(false);
                        }
                      }}
                      disabled={verifyingEmail}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{verifyingEmail ? 'Sending...' : 'Verify Email'}</span>
                    </button>
                  )}
                </div>
              )}
              {/* Phone numbers are verified during registration, so always show verified badge */}
              {fieldKey === 'phone' && !isEmpty && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>Verified</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };



  const editProps = {

    editingField,

    onStartEdit: (k: string) => setEditingField(k),

    onStopEdit: () => setEditingField(null),

    onChange: (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v })),

  };



  return (

    <div className="w-full py-2 sm:py-4">



      {/* ── Hero banner ─────────────────────────────────────────────────── */}

      <div className="mb-6 relative rounded-3xl border border-[#02665e]/30 bg-[#040f0e] shadow-card overflow-hidden">

        <div className="absolute inset-0 bg-gradient-to-br from-[#02665e]/45 via-[#02665e]/10 to-slate-950" aria-hidden />

        <div className="pointer-events-none absolute -top-10 -left-10 h-64 w-64 rounded-full bg-[#02665e]/15 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-6 right-10 h-40 w-40 rounded-full bg-[#02665e]/10 blur-2xl" aria-hidden />

        <div className="relative p-5 sm:p-7">

          <div className="relative min-h-10">

            <Link href="/owner" aria-label="Back"

              className="absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#02665e]/30 bg-[#02665e]/10 text-white/90 shadow-card transition-colors hover:bg-[#02665e]/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/50"

            >

              <ArrowLeft className="h-4 w-4" aria-hidden />

            </Link>



            {/* Completion ring */}

            <div className="absolute right-0 top-0 flex items-center gap-3 rounded-2xl border border-[#02665e]/30 bg-[#02665e]/10 px-3 py-2 backdrop-blur-sm">

              <div className="relative h-11 w-11">

                <svg viewBox="0 0 36 36" className="h-11 w-11" aria-hidden>

                  <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" className="text-white/10" strokeWidth="3.5" />

                  <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor"

                    className={completionTone === "good" ? "text-emerald-500" : completionTone === "warn" ? "text-amber-500" : "text-rose-500"}

                    strokeWidth="3.5" strokeLinecap="round" pathLength="100"

                    strokeDasharray={`${profileCompletion.pct} 100`} transform="rotate(-90 18 18)"

                  />

                </svg>

                <div className="absolute inset-0 flex items-center justify-center">

                  <div className="text-xs font-bold text-white tabular-nums">{profileCompletion.pct}%</div>

                </div>

              </div>

              <div className="hidden sm:block text-left">

                <div className="text-[11px] font-semibold text-white/70 leading-tight">Profile status</div>

                <div className="text-[11px] font-semibold text-white/60 leading-tight">{profileCompletion.done}/{profileCompletion.total} items</div>

              </div>

            </div>



            <div className="mx-auto w-full max-w-2xl px-12 sm:px-16 pt-0.5 text-center">

              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">My Profile</h1>

              <p className="mt-2 text-sm sm:text-base text-white/70 leading-relaxed">Business details, payout info, and required documents.</p>

            </div>

          </div>

        </div>

      </div>



      {/* ── Save feedback ──────────────────────────────────────────────── */}

      {(success || error) && (

        <div className={`mb-5 rounded-2xl border px-5 py-3.5 text-sm font-semibold ${success ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>

          {success ?? error}

        </div>

      )}



      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">



        {/* ── Personal details ──────────────────────────────────────────── */}

        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">

          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">

            <div className="text-sm font-bold text-slate-900">Personal details</div>

            <div className="text-sm text-slate-600 mt-1">Name, contact and business identity.</div>

          </div>

          <div className="p-5 sm:p-6">

            {/* Avatar row */}

            <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-100">

              <div className="flex items-center gap-4 min-w-0">

                <div className="relative h-14 w-14 rounded-full border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center flex-shrink-0">

                  {avatarUrl

                    ? <Image src={avatarUrl} alt="Profile photo" fill sizes="56px" className="object-cover" />

                    : <User className="h-6 w-6 text-slate-400" aria-hidden />}

                </div>

                <div className="min-w-0">

                  <div className="text-sm font-bold text-slate-900">Profile photo</div>

                  <div className="text-xs text-slate-600 mt-0.5">{!avatarUrl ? "Upload your business photo." : "Keep your photo up to date."}</div>

                </div>

              </div>

              <div className="shrink-0">

                <input ref={avatarFileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; await uploadAvatar(f); }} />

                <button type="button" onClick={() => { if (!avatarUploading) avatarFileInputRef.current?.click(); }} disabled={avatarUploading}

                  className="inline-flex items-center justify-center text-[#02665e] disabled:opacity-60 focus-visible:outline-none">

                  <span className="sr-only">{avatarUrl ? "Change photo" : "Upload photo"}</span>

                  {avatarUploading

                    ? <span className="h-4 w-4 rounded-full border-2 border-[#02665e]/20 border-t-[#02665e] animate-spin" aria-hidden />

                    : <Pencil className="h-4 w-4" aria-hidden />}

                </button>

              </div>

            </div>

            <div className="pt-5 grid grid-cols-2 gap-4">

              <EditableInfoItem icon={<User className="w-5 h-5" />} label="Full name" value={form.fullName || form.name} fieldKey="fullName" {...editProps} />

              <EditableInfoItem icon={<Mail className="w-5 h-5" />} label="Email" value={form.email} fieldKey="email" {...editProps} />

              <EditableInfoItem icon={<Phone className="w-5 h-5" />} label="Phone" value={form.phone} fieldKey="phone" fieldType="tel" {...editProps} />

              <EditableInfoItem icon={<FileText className="w-5 h-5" />} label="Business TIN" value={form.tin} fieldKey="tin" {...editProps} />

              <div className="col-span-2">

                <EditableInfoItem icon={<MapPin className="w-5 h-5" />} label="Address" value={form.address} fieldKey="address" fieldType="textarea" {...editProps} />

              </div>

            </div>

            {/* Email verification row */}

            {form.email && (

              <div className="mt-4 pt-4 border-t border-slate-100">

                {me?.emailVerifiedAt ? (

                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">

                    <CheckCircle2 className="h-3.5 w-3.5" />Email verified

                  </span>

                ) : (

                  <button type="button" disabled={verifyingEmail}

                    onClick={async () => {

                      setVerifyingEmail(true);

                      try {

                        await api.post('/api/owner/email/verify/send');

                        setSuccess('Verification email sent! Please check your inbox.');

                        const r = await api.get("/api/account/me");

                        const meData = (r as any)?.data?.data ?? (r as any)?.data;

                        setMe(meData); setForm((prev: any) => ({ ...prev, emailVerifiedAt: meData?.emailVerifiedAt }));

                      } catch (err: any) { setError(err?.response?.data?.error || 'Failed to send verification email'); }

                      finally { setVerifyingEmail(false); }

                    }}

                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50">

                    <ShieldCheck className="h-3.5 w-3.5" />{verifyingEmail ? 'Sending…' : 'Verify email'}

                  </button>

                )}

              </div>

            )}

          </div>

        </div>



        {/* ── Payout preference ─────────────────────────────────────────── */}

        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">

          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">

            <div className="text-sm font-bold text-slate-900">Payout preference</div>

            <div className="text-sm text-slate-600 mt-1">How you receive your earnings.</div>

          </div>

          <div className="p-5 sm:p-6 grid grid-cols-1 gap-4">

            <EditableInfoItem icon={<Building2 className="w-5 h-5" />} label="Bank name" value={form.bankName} fieldKey="bankName" {...editProps} />

            <EditableInfoItem icon={<User className="w-5 h-5" />} label="Account name" value={form.bankAccountName} fieldKey="bankAccountName" {...editProps} />

            <EditableInfoItem icon={<CreditCard className="w-5 h-5" />} label="Account number" value={form.bankAccountNumber} fieldKey="bankAccountNumber" maskFn={maskAccount} {...editProps} />

            <EditableInfoItem icon={<MapPin className="w-5 h-5" />} label="Branch" value={form.bankBranch} fieldKey="bankBranch" {...editProps} />

          </div>

        </div>



        {/* ── Mobile money — dark card ──────────────────────────────────── */}

        <div className="lg:col-span-6 relative rounded-2xl border border-white/10 bg-slate-950/70 shadow-card overflow-hidden backdrop-blur-xl">

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#02665e]/20 via-slate-950/80 to-slate-950" aria-hidden />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />

          <div className="relative p-5 sm:p-6 border-b border-white/10 bg-white/5">

            <div className="text-sm font-bold text-white">Mobile money</div>

            <div className="text-sm text-white/70 mt-1">M-Pesa / Tigo / Airtel number for payouts.</div>

          </div>

          <div className="relative p-5 sm:p-6 space-y-4">

            <div className="flex items-start gap-3 group">

              <div className="h-10 w-10 rounded-2xl bg-[#02665e]/10 border border-[#02665e]/20 flex items-center justify-center text-[#02665e] flex-shrink-0"><Phone className="w-5 h-5" /></div>

              <div className="min-w-0 flex-1">

                <div className="flex items-center justify-between gap-2">

                  <div className="text-xs font-semibold text-white/60">Provider</div>

                  <button type="button" onClick={() => setEditingField(editingField === "mobileMoneyProvider" ? null : "mobileMoneyProvider")}

                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white/90 focus-visible:opacity-100 focus-visible:outline-none">

                    {editingField === "mobileMoneyProvider" ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}

                  </button>

                </div>

                {editingField === "mobileMoneyProvider"

                  ? <input type="text" value={form.mobileMoneyProvider || ""} onChange={(e) => setForm((p: any) => ({ ...p, mobileMoneyProvider: e.target.value }))}

                      autoFocus onBlur={() => setEditingField(null)} onKeyDown={(e) => { if (e.key === "Enter") setEditingField(null); }}

                      placeholder="e.g. M-Pesa, Tigo Pesa, Airtel"

                      className="mt-2 block w-full max-w-full min-w-0 box-border rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white appearance-none outline-none shadow-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none focus:ring-offset-0 focus:border-[#02665e]/50 transition-all placeholder:text-white/30" />

                  : <div className={`text-sm font-bold mt-0.5 ${!form.mobileMoneyProvider ? "text-white/40" : "text-white"}`}>{form.mobileMoneyProvider || "—"}</div>}

              </div>

            </div>

            <div className="flex items-start gap-3 group">

              <div className="h-10 w-10 rounded-2xl bg-[#02665e]/10 border border-[#02665e]/20 flex items-center justify-center text-[#02665e] flex-shrink-0"><Phone className="w-5 h-5" /></div>

              <div className="min-w-0 flex-1">

                <div className="flex items-center justify-between gap-2">

                  <div className="text-xs font-semibold text-white/60">Mobile money number</div>

                  <button type="button" onClick={() => setEditingField(editingField === "mobileMoneyNumber" ? null : "mobileMoneyNumber")}

                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white/90 focus-visible:opacity-100 focus-visible:outline-none">

                    {editingField === "mobileMoneyNumber" ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}

                  </button>

                </div>

                {editingField === "mobileMoneyNumber"

                  ? <input type="tel" value={form.mobileMoneyNumber || ""} inputMode="numeric" pattern="\d*" maxLength={15} onChange={(e) => setForm((p: any) => ({ ...p, mobileMoneyNumber: e.target.value.replace(/\D/g, "").slice(0, 15) }))}

                      autoFocus onBlur={() => setEditingField(null)} onKeyDown={(e) => { if (e.key === "Enter") setEditingField(null); }}

                      className="mt-2 block w-full max-w-full min-w-0 box-border rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white tabular-nums appearance-none outline-none shadow-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus:shadow-none focus:ring-offset-0 focus:border-[#02665e]/50 transition-all" />

                  : <div className={`text-sm font-bold mt-0.5 ${!form.mobileMoneyNumber ? "text-white/40" : "text-white"}`}>{form.mobileMoneyNumber ? maskPhone(form.mobileMoneyNumber) : "—"}</div>}

              </div>

            </div>

          </div>

        </div>



        {/* ── Saved payout summary — dark card ─────────────────────────── */}

        <div className="lg:col-span-6 relative rounded-2xl border border-white/10 bg-slate-950/70 shadow-card overflow-hidden backdrop-blur-xl">

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0a5c82]/15 via-slate-950/85 to-slate-950" aria-hidden />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />

          <div className="relative p-5 sm:p-6 border-b border-white/10 bg-white/5">

            <div className="text-sm font-bold text-white">Payout summary</div>

            <div className="text-sm text-white/70 mt-1">Your saved earnings payout details.</div>

          </div>

          <div className="relative p-5 sm:p-6 grid grid-cols-2 gap-4">

            <InfoItem tone="dark" icon={<Building2 className="w-5 h-5" />} label="Bank name" value={form.bankName || "—"} />

            <InfoItem tone="dark" icon={<CreditCard className="w-5 h-5" />} label="Account number" value={form.bankAccountNumber ? maskAccount(form.bankAccountNumber) : "—"} />

            <InfoItem tone="dark" icon={<Phone className="w-5 h-5" />} label="Mobile money" value={form.mobileMoneyProvider ? `${form.mobileMoneyProvider} — ${maskPhone(form.mobileMoneyNumber)}` : "—"} />

            <InfoItem tone="dark" icon={<Wallet className="w-5 h-5" />} label="Preferred payout" value={form.payoutPreferred === "BANK" ? "Bank Account" : form.payoutPreferred === "MOBILE_MONEY" ? "Mobile Money" : form.payoutPreferred || "—"} />

          </div>

        </div>



        {/* ── Required documents ────────────────────────────────────────── */}

        <div className="lg:col-span-12 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">

          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">

            <div className="text-sm font-bold text-slate-900">Required documents</div>

            <div className="text-sm text-slate-600 mt-1">PDF, JPG, PNG or WebP — max 15 MB each.</div>

          </div>

          <div className="p-5 sm:p-6 space-y-4">

            <input ref={docInputRef} type="file" className="hidden" accept="application/pdf,image/*"

              onChange={(e) => onUploadDocumentFromPicker(e.target.files?.[0] ?? null)} />



            {(docError || docSuccess) && (

              <div className="space-y-1">

                {docError  && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{docError}</div>}

                {docSuccess && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">{docSuccess}</div>}

              </div>

            )}



            {/* Upload widget */}

            {showUploader && (

              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">

                  <div className="lg:col-span-4">

                    <div className="text-xs font-semibold text-slate-600">Document type</div>

                    <select value={selectedDocType} onChange={(e) => setSelectedDocType(e.target.value)} disabled={actionableDocTypes.length === 0}

                      className="mt-2 w-full h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30">

                      <option value="">Select document…</option>

                      {actionableDocTypes.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}

                    </select>

                    <div className="text-xs text-slate-600 mt-2">Select type, then drag & drop or click to upload.</div>

                    {String(selectedDocType).toUpperCase() === "BUSINESS_LICENCE" && (

                      <div className="mt-3">

                        <div className="text-[11px] font-semibold text-slate-700 mb-1.5">Business licence expiry date <span className="text-red-500">*</span></div>

                        <DatePickerField label="Business licence expiry date" value={businessLicenceExpiresOn}

                          onChangeAction={(iso) => setBusinessLicenceExpiresOn(String(iso))} min={todayIsoDate()} widthClassName="w-full" size="sm" allowPast={false} twoMonths={false} />

                        <div className="text-[10px] text-slate-400 mt-1">Reminders start 10 days before expiry.</div>

                      </div>

                    )}

                  </div>

                  <div className="lg:col-span-8">

                    <div

                      role="button" tabIndex={0} aria-label="Upload document"

                      className={`w-full rounded-2xl border-2 border-dashed px-4 py-4 sm:py-5 transition cursor-pointer ${!selectedDocType || docUploading ? "border-slate-200 bg-slate-50/60 opacity-70" : docDragOver ? "border-[#02665e] bg-[#02665e]/5" : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"}`}

                      onClick={() => { if (!selectedDocType || docUploading) return; docInputRef.current?.click(); }}

                      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !docUploading && selectedDocType) { e.preventDefault(); docInputRef.current?.click(); } }}

                      onDragOver={(e) => { if (!selectedDocType || !!docUploading) return; e.preventDefault(); setDocDragOver(true); }}

                      onDragLeave={() => setDocDragOver(false)}

                      onDrop={(e) => { if (!selectedDocType || !!docUploading) return; e.preventDefault(); setDocDragOver(false); void uploadDocumentForType(selectedDocType, e.dataTransfer.files?.[0] ?? null); }}

                    >

                      <div className="flex items-center justify-center gap-3 text-center">

                        <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-[#02665e] shrink-0">

                          <Upload className="w-5 h-5" aria-hidden />

                        </div>

                        <div className="min-w-0">

                          <div className="text-sm font-semibold text-slate-900">{docUploading ? "Uploading…" : !selectedDocType ? "Select a document type above" : "Drag & drop to upload"}</div>

                          <div className="text-xs font-semibold text-slate-600 mt-0.5">or click to browse</div>

                        </div>

                      </div>

                    </div>

                  </div>

                </div>

              </div>

            )}

            {!showUploader && (

              <div className="p-6 text-center border border-emerald-200 rounded-2xl bg-emerald-50/50">

                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />

                <div className="text-sm font-semibold text-slate-900">All required documents uploaded</div>

                <div className="text-xs text-slate-500 mt-0.5">Pending admin review & approval.</div>

              </div>

            )}



            {/* Doc status cards */}

            <div className="grid grid-cols-2 gap-3 sm:gap-4">

              {requiredDocTypes.map((item) => {

                const docs = Array.isArray(me?.documents) ? me.documents : [];

                const doc = getLatestDocByType(docs, item.type);

                const status = (doc?.status ? String(doc.status) : "").toUpperCase();

                const hasUrl = Boolean(doc?.url);

                const statusText = hasUrl ? (status || "PENDING") : "NOT_UPLOADED";

                const expiresAt = item.type === "BUSINESS_LICENCE" ? parseDocExpiresAt(doc) : null;

                const isExpired = item.type === "BUSINESS_LICENCE" && status === "APPROVED" && Boolean(expiresAt) && (expiresAt as Date).getTime() < Date.now();

                const daysLeft = expiresAt ? Math.ceil(((expiresAt as Date).getTime() - Date.now()) / 86400000) : null;

                const canUpload = !hasUrl || statusText === "REJECTED" || isExpired;

                const badgeCls = isExpired ? "bg-rose-50 text-rose-700 border-rose-200"

                  : statusText === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200"

                  : statusText === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200"

                  : statusText === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200"

                  : "bg-slate-50 text-slate-600 border-slate-200";

                const badgeText = isExpired ? "Expired" : statusText === "APPROVED" ? "Approved" : statusText === "REJECTED" ? "Rejected" : statusText === "PENDING" ? "Pending review" : "Not uploaded";

                return (

                  <div key={item.type} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">

                    <div className="flex items-start justify-between gap-2">

                      <div className="flex items-center gap-2 min-w-0">

                        <div className="h-8 w-8 rounded-xl bg-[#02665e]/5 border border-[#02665e]/15 flex items-center justify-center text-[#02665e] shrink-0">

                          <FileText className="w-4 h-4" />

                        </div>

                        <div className="min-w-0">

                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-900 leading-snug">{item.label}</span>
                            {item.type === "BUSINESS_LICENCE" && statusText === "APPROVED" && !isExpired && (
                              <span title="Valid" className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 shrink-0">
                                <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5 text-white" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="2,6 5,9 10,3" />
                                </svg>
                              </span>
                            )}
                          </div>

                          {hasUrl && doc?.url && (

                            <a href={doc.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-[#02665e] hover:underline mt-0.5">

                              <Eye className="h-3 w-3" />

                            </a>

                          )}

                        </div>

                      </div>

                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shrink-0 ${badgeCls}`}>

                        {statusText === "PENDING" && <Clock className="w-3 h-3" />}

                        {statusText === "APPROVED" && !isExpired && <CheckCircle2 className="w-3 h-3" />}

                        {!(statusText === "APPROVED" && !isExpired) && badgeText}

                      </span>

                    </div>

                    {expiresAt && (

                      <div className={`mt-1.5 text-[10px] font-medium ${isExpired ? "text-rose-600" : typeof daysLeft === "number" && daysLeft <= 10 ? "text-orange-600" : "text-slate-500"}`}>

                        {isExpired ? "âš  Expired: " : "Expires: "}{new Date(expiresAt).toLocaleDateString()}

                        {!isExpired && typeof daysLeft === "number" && daysLeft <= 30 && ` (${daysLeft}d left)`}

                      </div>

                    )}

                    {statusText === "REJECTED" && doc?.reason && (

                      <div className="mt-2 text-xs text-rose-700 bg-rose-50 rounded-lg px-2.5 py-2 border border-rose-200">

                        <span className="font-semibold">Reason:</span> {doc.reason}

                      </div>

                    )}

                    {canUpload ? (

                      <button type="button" disabled={!!docUploading}

                        onClick={() => { setDocError(null); setDocSuccess(null); setSelectedDocType(item.type); triggerDocUpload(); }}

                        className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50">

                        <Upload className="w-3 h-3" />{!hasUrl ? "Upload" : isExpired ? "Renew" : "Re-upload"}

                      </button>

                    ) : (

                      <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">

                        <Lock className="w-3 h-3" />

                        {statusText === "APPROVED" ? "Approved — locked" : "Under review — locked"}

                      </div>

                    )}

                  </div>

                );

              })}

            </div>

          </div>

        </div>



        {/* ── Account actions ───────────────────────────────────────────── */}

        <div className="lg:col-span-12 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">

          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">

            <div className="text-sm font-bold text-slate-900">Account actions</div>

            <div className="text-sm text-slate-600 mt-1">Save changes, security, and account management.</div>

          </div>

          <div className="p-5 sm:p-6 grid grid-cols-2 gap-3">

            <button onClick={save} disabled={saving}

              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#02665e] text-white text-sm font-semibold hover:bg-[#02665e]/90 shadow-card transition-colors disabled:opacity-60 disabled:cursor-wait">

              <Save className="h-4 w-4" />{saving ? "Saving…" : "Save changes"}

            </button>

            <button onClick={() => { window.location.href = "/owner/settings/password"; }}

              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 shadow-card transition-colors">

              <Lock className="h-4 w-4" />Change password

            </button>

            <button onClick={async () => { try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {} window.location.href = "/owner/login"; }}

              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 shadow-card transition-colors">

              <LogOut className="h-4 w-4" />Logout

            </button>

            <button onClick={async () => {

              if (!confirm("Delete your account? This is irreversible.")) return;

              try {

                await api.delete("/api/account");

                try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}

                alert("Account deleted."); window.location.href = "/";

              } catch (err: any) { alert("Could not delete account: " + String(err?.message ?? err)); }

            }} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 shadow-card transition-colors">

              <Trash2 className="h-4 w-4" />Delete account

            </button>

          </div>

        </div>



        {/* ── Audit / Change history ────────────────────────────────────── */}

        <div className="lg:col-span-12 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">

          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">

            <div className="text-sm font-bold text-slate-900">Change history</div>

            <div className="text-sm text-slate-600 mt-1">All modifications to your profile and payout details.</div>

          </div>

          <div className="p-5 sm:p-6">

            {loadingAudit ? (

              <div className="py-10 flex flex-col items-center gap-3">

                <div className="dot-spinner dot-sm" aria-hidden><span className="dot dot-blue" /><span className="dot dot-black" /><span className="dot dot-yellow" /><span className="dot dot-green" /></div>

                <p className="text-sm text-slate-500">Loading history…</p>

              </div>

            ) : auditHistory.length === 0 ? (

              <div className="py-10 flex flex-col items-center gap-3 text-center">

                <div className="h-14 w-14 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center"><History className="h-6 w-6 text-slate-300" /></div>

                <div className="text-sm font-semibold text-slate-600">No changes recorded yet</div>

                <div className="text-xs text-slate-400">Your change history will appear here.</div>

              </div>

            ) : (

              <div>

                <div className="space-y-3">

                  {(showAllAuditHistory ? auditHistory : auditHistory.slice(0, 3)).map((log: any) => {

                    const impactCls = log.impactLevel === "high" ? "bg-rose-50 border-rose-200" : log.impactLevel === "medium" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200";

                    const badgeCls2 = log.impactLevel === "high" ? "bg-rose-600 text-white" : log.impactLevel === "medium" ? "bg-amber-500 text-white" : "bg-blue-500 text-white";

                    const fLabels: Record<string, string> = { bankAccountNumber: "Account Number", mobileMoneyNumber: "Mobile Money Number", bankName: "Bank Name", bankAccountName: "Account Name", bankBranch: "Branch", mobileMoneyProvider: "Provider", payoutPreferred: "Preferred Method", fullName: "Full Name", email: "Email", phone: "Phone", tin: "TIN", address: "Address" };

                    return (

                      <div key={log.id} className={`p-4 rounded-2xl border ${impactCls}`}>

                        <div className="flex items-start justify-between gap-3 mb-2">

                          <div className="flex items-center gap-2 flex-wrap">

                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${badgeCls2}`}>{log.impactLevel} impact</span>

                            <span className="text-sm font-semibold text-slate-900">

                              {log.action === "USER_PAYOUT_UPDATE" ? "Payout Updated" : log.action === "USER_PROFILE_UPDATE" ? "Profile Updated" : log.action === "USER_PASSWORD_CHANGE" ? "Password Changed" : log.action === "USER_LOGIN" ? "Login" : log.action === "USER_LOGOUT" ? "Logout" : "Account Action"}

                            </span>

                          </div>

                          <div className="flex items-center gap-1 text-xs text-slate-500 flex-shrink-0">

                            <Clock className="h-3 w-3" />{new Date(log.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}

                          </div>

                        </div>

                        {log.changedFields?.length > 0 && (

                          <div className="flex flex-wrap gap-1.5">

                            {log.changedFields.map((f: string, i: number) => (

                              <span key={i} className="px-2 py-0.5 rounded-md text-xs bg-white border border-slate-200 text-slate-700">{fLabels[f] || f}</span>

                            ))}

                          </div>

                        )}

                        {log.ip && <div className="mt-2 text-[10px] text-slate-400 font-mono">IP: {log.ip}</div>}

                      </div>

                    );

                  })}

                </div>

                {auditHistory.length > 3 && (

                  <button onClick={() => setShowAllAuditHistory(!showAllAuditHistory)}

                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-colors">

                    {showAllAuditHistory ? <><ChevronUp className="h-4 w-4" />Show less</> : <><ChevronDown className="h-4 w-4" />View {auditHistory.length - 3} more</>}

                  </button>

                )}

              </div>

            )}

          </div>

        </div>



      </div>



      {/* Confirmation Dialog */}

      {showConfirmDialog && (

        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowConfirmDialog(false)}>

          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>

            <div className="flex items-start gap-4 mb-5">

              <div className="h-12 w-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">

                <AlertTriangle className="h-6 w-6 text-amber-600" />

              </div>

              <div>

                <h3 className="text-lg font-bold text-slate-900 mb-1">Confirm Sensitive Change</h3>

                <p className="text-sm text-slate-600">{confirmMessage}</p>

              </div>

            </div>

            <div className="flex gap-3">

              <button onClick={() => { setShowConfirmDialog(false); setPendingSave(null); setConfirmMessage(""); }}

                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>

              <button onClick={async () => { setShowConfirmDialog(false); if (pendingSave) await pendingSave(); setPendingSave(null); setConfirmMessage(""); }}

                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#02665e] hover:bg-[#02665e]/90 rounded-xl transition-colors">Confirm & Save</button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}
