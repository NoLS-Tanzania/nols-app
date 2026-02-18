"use client";
import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { User, Upload, CreditCard, Wallet, X, CheckCircle, Save, Lock, LogOut, Trash2, Mail, Phone, MapPin, Building2, FileText, Pencil, AlertTriangle, History, Clock, ChevronDown, ChevronUp, KeyRound, Shield, LogIn, CheckCircle2, ShieldCheck, Info } from 'lucide-react';
import DatePickerField from "@/components/DatePickerField";
// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

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
        { type: "BUSINESS_LICENCE", label: "Business Licence (Valid)" },
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

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">Your Profile</h1>
              <p className="text-xs sm:text-sm text-slate-600">Review and update your information</p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div
                className="flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-2.5 py-1.5"
                aria-label={`Profile completion ${profileCompletion.pct}%`}
                title={`Profile completion ${profileCompletion.pct}%`}
              >
                <div className="relative h-10 w-10">
                  <svg viewBox="0 0 36 36" className="h-10 w-10" aria-hidden>
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke="currentColor"
                      className="text-slate-200"
                      strokeWidth="3.5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="16"
                      fill="none"
                      stroke="currentColor"
                      className={
                        completionTone === 'good'
                          ? 'text-emerald-600'
                          : completionTone === 'warn'
                            ? 'text-amber-500'
                            : 'text-rose-600'
                      }
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      pathLength="100"
                      strokeDasharray={`${profileCompletion.pct} 100`}
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-[11px] font-bold text-slate-900 tabular-nums">{profileCompletion.pct}%</div>
                  </div>
                </div>

                <div className="hidden sm:block text-left leading-tight">
                  <div className="text-[11px] font-semibold text-slate-600">Profile status</div>
                  <div className="text-[11px] font-semibold text-slate-500">
                    {profileCompletion.done}/{profileCompletion.total} items
                  </div>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (avatarUploading) return;
                    avatarFileInputRef.current?.click();
                  }}
                  className="inline-flex items-center justify-center h-11 w-11 rounded-full border-2 border-slate-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition"
                  aria-label={form.avatarUrl ? 'Edit profile photo' : 'Upload profile photo'}
                  title={form.avatarUrl ? 'Edit profile photo' : 'Upload profile photo'}
                >
                  {avatarUploading ? (
                    <span className="h-5 w-5 rounded-full border-2 border-emerald-200 border-t-emerald-700 animate-spin" aria-hidden />
                  ) : form.avatarUrl ? (
                    <Pencil className="h-5 w-5" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              aria-label="Upload avatar image"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                await uploadAvatar(f);
              }}
              className="hidden"
            />
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-white rounded-xl shadow-md border-2 border-green-200 p-4 animate-in fade-in slide-in-from-top-2 duration-300 transition-all">
            <div className="flex items-center gap-2 text-sm sm:text-base font-medium text-green-800">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-white rounded-xl shadow-md border-2 border-red-200 p-4 animate-in fade-in slide-in-from-top-2 duration-300 transition-all">
            <div className="flex items-center gap-2 text-sm sm:text-base font-medium text-red-800">
              <X className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Registration Details Section */}
        <section className="bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50 animate-in fade-in slide-in-from-bottom-4 box-border">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 border-b border-slate-200">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-100">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">Registration Details</h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-full overflow-hidden">
            <div className="min-w-0 max-w-full overflow-hidden">
              {renderField("Full name", form.fullName || form.name, User, true, 'fullName')}
            </div>
            <div className="min-w-0 max-w-full overflow-hidden">
              {renderField("Email", form.email, Mail, true, 'email')}
            </div>
            <div className="min-w-0 max-w-full overflow-hidden">
              {renderField("Phone", form.phone, Phone, false, 'phone')}
            </div>
            <div className="min-w-0 max-w-full overflow-hidden">
              {renderField("Business TIN", form.tin, FileText, false, 'tin')}
            </div>
            <div className="col-span-2 min-w-0 max-w-full overflow-hidden">
              {renderField("Address", form.address, MapPin, false, 'address', 'textarea')}
            </div>
          </div>
        </section>

        {/* Payout Details Section */}
        <section className="bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50 animate-in fade-in slide-in-from-bottom-4 box-border">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 border-b border-slate-200">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center transition-all duration-300 group-hover:bg-blue-100">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">Payout Details</h2>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Bank Account Details */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border-2 border-slate-200 transition-all duration-300 hover:border-emerald-200 hover:shadow-md w-full max-w-full overflow-hidden min-w-0 box-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Bank Account</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-full overflow-hidden">
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField("Bank name", form.bankName, Building2, false, 'bankName')}
                </div>
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField("Account name", form.bankAccountName, User, false, 'bankAccountName')}
                </div>
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField("Account number", form.bankAccountNumber, CreditCard, false, 'bankAccountNumber')}
                </div>
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField("Branch", form.bankBranch, MapPin, false, 'bankBranch')}
                </div>
              </div>
            </div>

            {/* Mobile Money Details */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border-2 border-slate-200 transition-all duration-300 hover:border-emerald-200 hover:shadow-md w-full max-w-full overflow-hidden min-w-0 box-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Mobile Money</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-full overflow-hidden">
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField(
                    "Provider", 
                    form.mobileMoneyProvider, 
                    Phone, 
                    false, 
                    'mobileMoneyProvider',
                    'text'
                  )}
                </div>
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField("Mobile Money Number", form.mobileMoneyNumber, Phone, false, 'mobileMoneyNumber')}
                </div>
              </div>
            </div>

            {/* Payout Preference */}
            <div className="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-xl transition-all duration-300 hover:border-emerald-200 hover:shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                  Preferred payout method
                </label>
                <button 
                  type="button" 
                  onClick={() => setEditingField(editingField === 'payoutPreferred' ? null : 'payoutPreferred')}
                  className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 hover:underline font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105"
                >
                  <Pencil className="w-3 h-3" />
                  {editingField === 'payoutPreferred' ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {editingField === 'payoutPreferred' ? (
                <select
                  id="field-payoutPreferred"
                  aria-label="Preferred payout method"
                  value={form.payoutPreferred || ''}
                  onChange={(e) => setForm({...form, payoutPreferred: e.target.value})}
                  className="block w-full rounded-lg border-2 border-emerald-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                  autoFocus
                  onBlur={() => setEditingField(null)}
                >
                  <option value="">Select preference</option>
                  <option value="BANK">Bank Account</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </select>
              ) : (
                <div className={`text-sm sm:text-base font-medium transition-colors duration-200 ${!form.payoutPreferred ? 'text-slate-400 italic' : 'text-slate-900'}`}>
                  {form.payoutPreferred === 'BANK' ? 'Bank Account' : form.payoutPreferred === 'MOBILE_MONEY' ? 'Mobile Money' : 'Not set'}
                </div>
              )}
            </div>

            {/* Display saved payout details */}
            {(form.bankAccountNumber || form.mobileMoneyNumber || form.bankName) ? (
              <div className="p-4 sm:p-5 border-2 border-emerald-200 rounded-xl bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 transition-all duration-300 hover:shadow-md hover:border-emerald-300">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div className="font-bold text-gray-900 text-sm sm:text-base">Saved payout details</div>
                </div>
                <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                  {form.bankName && form.bankAccountNumber && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="break-words">Bank: <strong>{form.bankName}</strong> — Account: <strong className="font-mono">{maskAccount(form.bankAccountNumber)}</strong></span>
                    </div>
                  )}
                  {form.mobileMoneyProvider && form.mobileMoneyNumber && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Phone className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="break-words">Mobile money (<strong>{form.mobileMoneyProvider}</strong>): <strong className="font-mono">{maskPhone(form.mobileMoneyNumber)}</strong></span>
                    </div>
                  )}
                  {form.payoutPreferred && (
                    <div className="text-xs text-slate-500 mt-2">Preferred: {form.payoutPreferred === 'BANK' ? 'Bank Account' : form.payoutPreferred === 'MOBILE_MONEY' ? 'Mobile Money' : form.payoutPreferred}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 text-center border-2 border-slate-200 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 transition-all duration-300 hover:border-slate-300">
                <Wallet className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-3 transition-transform duration-300" />
                <div className="text-sm sm:text-base font-medium text-slate-600 mb-1">No saved payout details</div>
                <div className="text-xs sm:text-sm text-slate-500">Add payout details to receive payments</div>
              </div>
            )}
          </div>
        </section>

        {/* Required Documents Section */}
        <section className="bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50 animate-in fade-in slide-in-from-bottom-4 box-border">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 border-b border-slate-200">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-700" />
            </div>
            <div ref={docHelpRef} className="relative flex items-center gap-2 min-w-0">
              <button
                type="button"
                aria-label="Required documents help"
                aria-expanded={docHelpOpen}
                aria-controls="owner-required-docs-help"
                onClick={() => setDocHelpOpen((v) => !v)}
                className="inline-flex items-center justify-center border-0 bg-transparent p-0 m-0 appearance-none text-slate-500 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 rounded"
              >
                <Info className="h-4 w-4" aria-hidden />
              </button>
              <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 truncate">Required Documents</h2>

              {docHelpOpen && (
                <div
                  id="owner-required-docs-help"
                  role="tooltip"
                  className="absolute left-0 top-full mt-2 w-[min(360px,calc(100vw-3rem))] rounded-2xl border-2 border-slate-200 bg-white p-3 text-xs shadow-lg"
                >
                  <div className="font-semibold text-slate-900">Upload your documents</div>
                  <div className="mt-1 text-slate-600">Clear scan/photo. Supported: PDF, JPG, PNG, WebP (max 15MB).</div>
                  <div className="mt-2 text-slate-600">After upload, it will be reviewed by admin for compliance.</div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 sm:space-y-5">
            <input
              ref={docInputRef}
              type="file"
              className="hidden"
              accept="application/pdf,image/*"
              onChange={(e) => onUploadDocumentFromPicker(e.target.files?.[0] ?? null)}
            />

            {(docError || docSuccess) && (
              <div className="space-y-1">
                {docError && <div className="text-sm text-red-700 bg-red-50 border-2 border-red-200 rounded-xl px-4 py-3">{docError}</div>}
                {docSuccess && <div className="text-sm text-emerald-800 bg-emerald-50 border-2 border-emerald-200 rounded-xl px-4 py-3">{docSuccess}</div>}
              </div>
            )}

            {showUploader ? (
              <div className="rounded-xl border-2 border-slate-200 bg-slate-50/40 p-4 sm:p-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-4">
                    <div className="text-xs font-semibold text-slate-700">Document type</div>
                    <select
                      value={selectedDocType}
                      onChange={(e) => setSelectedDocType(e.target.value)}
                      disabled={actionableDocTypes.length === 0}
                      className="mt-2 w-full h-11 rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                    >
                      <option value="">Select document</option>
                      {actionableDocTypes.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <div className="text-xs text-slate-600 mt-2 leading-relaxed">Select a document, then drag & drop (or click) to upload.</div>

                    {String(selectedDocType).toUpperCase() === "BUSINESS_LICENCE" ? (
                      <div className="mt-3 max-w-xs">
                        <div className="text-[11px] font-semibold text-slate-700">Business licence expiry date</div>
                        <div className="mt-1.5">
                          <DatePickerField
                            label="Business licence expiry date"
                            value={businessLicenceExpiresOn}
                            onChangeAction={(iso) => setBusinessLicenceExpiresOn(String(iso))}
                            min={todayIsoDate()}
                            widthClassName="w-[170px]"
                            size="sm"
                            allowPast={false}
                            twoMonths={false}
                          />
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">Reminders start 10 days before expiry.</div>
                      </div>
                    ) : null}
                  </div>

                  <div className="lg:col-span-8">
                    {(() => {
                      const isUploading = docUploading != null;
                      const disabled = isUploading || !selectedDocType || actionableDocTypes.length === 0;
                      const dropzoneClass =
                        "w-full rounded-xl border-2 border-dashed px-4 py-4 sm:py-5 transition " +
                        (disabled
                          ? "border-slate-200 bg-white/70 opacity-70"
                          : docDragOver
                            ? "border-emerald-400 bg-emerald-50/50"
                            : "border-slate-200 bg-white hover:bg-slate-50");

                      return (
                        <div>
                          <div
                            role="button"
                            tabIndex={0}
                            aria-label="Upload required document"
                            className={dropzoneClass}
                            onClick={() => {
                              if (actionableDocTypes.length === 0) return;
                              if (!selectedDocType) {
                                setDocError("Please select a document type first.");
                                return;
                              }
                              if (!isUploading) triggerDocUpload();
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                if (actionableDocTypes.length === 0) return;
                                if (!selectedDocType) {
                                  setDocError("Please select a document type first.");
                                  return;
                                }
                                if (!isUploading) triggerDocUpload();
                              }
                            }}
                            onDragOver={(e) => {
                              if (disabled) return;
                              e.preventDefault();
                              setDocDragOver(true);
                            }}
                            onDragLeave={() => setDocDragOver(false)}
                            onDrop={(e) => {
                              if (disabled) return;
                              e.preventDefault();
                              setDocDragOver(false);
                              const f = e.dataTransfer.files?.[0] ?? null;
                              void uploadDocumentForType(selectedDocType, f);
                            }}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">Drag & drop your file here</div>
                                <div className="text-xs text-slate-600 mt-1">or click to choose a file</div>
                              </div>
                              <div className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                                <Upload className="h-4 w-4" />
                                {docUploading ? "Uploading…" : "Upload"}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 text-center border-2 border-emerald-200 rounded-xl bg-gradient-to-br from-emerald-50/40 to-emerald-100/20">
                <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-500 mx-auto mb-3" />
                <div className="text-sm sm:text-base font-semibold text-slate-900 mb-1">All required documents uploaded</div>
                <div className="text-xs sm:text-sm text-slate-600">Admin will review and approve them.</div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {requiredDocTypes.map((item) => {
                const docs = Array.isArray(me?.documents) ? me.documents : [];
                const doc = getLatestDocByType(docs, item.type);
                const status = (doc?.status ? String(doc.status) : "NOT_UPLOADED").toUpperCase();
                const isPending = status === "PENDING";
                const isApproved = status === "APPROVED";
                const isRejected = status === "REJECTED";
                const isNotUploaded = !doc?.url;
                const expiresAt = item.type === "BUSINESS_LICENCE" ? parseDocExpiresAt(doc) : null;
                const isExpired = item.type === "BUSINESS_LICENCE" && isApproved && Boolean(expiresAt) && (expiresAt as Date).getTime() < Date.now();
                const daysLeft = expiresAt ? Math.ceil(((expiresAt as Date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
                const isExpiringSoon = Boolean(expiresAt) && !isExpired && typeof daysLeft === "number" && daysLeft <= 10;

                const badgeClass = isApproved
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : isRejected
                    ? "bg-red-100 text-red-800 border-red-200"
                    : isPending
                      ? "bg-amber-100 text-amber-800 border-amber-200"
                      : "bg-slate-100 text-slate-700 border-slate-200";

                const effectiveBadgeClass = isExpired
                  ? "bg-red-100 text-red-800 border-red-200"
                  : badgeClass;

                const badgeText = isExpired ? "Expired" : isApproved ? "Approved" : isRejected ? "Rejected" : isPending ? "Pending" : "Not uploaded";

                return (
                  <div key={item.type} className="rounded-xl border-2 border-slate-200 bg-white p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">{item.label}</div>
                        <div className="text-xs text-slate-500 mt-1">Type: <span className="font-mono">{item.type}</span></div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${effectiveBadgeClass}`}>{badgeText}</span>
                    </div>

                    {item.type === "BUSINESS_LICENCE" && expiresAt ? (
                      <div className="mt-3 text-xs text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-lg px-3 py-2">
                        Expires on: <span className="font-semibold">{new Date(expiresAt).toLocaleDateString()}</span>
                        {typeof daysLeft === "number" ? (
                          <span className={`ml-2 font-semibold ${isExpired ? "text-red-700" : isExpiringSoon ? "text-amber-700" : "text-slate-700"}`}>
                            ({isExpired ? `${Math.abs(daysLeft)} day(s) ago` : `${daysLeft} day(s) left`})
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {isRejected && doc?.reason ? (
                      <div className="mt-3 text-xs text-red-800 bg-red-50 border-2 border-red-200 rounded-lg px-3 py-2">
                        Rejection reason: {doc.reason}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-end">
                      {isNotUploaded || isRejected || isExpired ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDocType(item.type);
                            // make it quick to upload the selected doc
                            triggerDocUpload();
                          }}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border-2 transition-all duration-200 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300"
                        >
                          <Upload className="h-4 w-4" />
                          {isNotUploaded ? "Upload" : isRejected ? "Re-upload" : "Renew"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Actions Section */}
        <section className="bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50 animate-in fade-in slide-in-from-bottom-4 box-border">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-200">
            <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center transition-all duration-300 group-hover:bg-slate-100">
              <Lock className="h-5 w-5 text-slate-600" />
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Account Actions</h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full min-w-0 overflow-hidden">
            <button
              className={`w-full max-w-full min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 border-2 shadow-md hover:shadow-lg box-border overflow-hidden ${
                saving 
                  ? 'text-slate-400 bg-slate-50 border-slate-200 opacity-60 cursor-wait' 
                  : 'text-white bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700 hover:scale-105 active:scale-95'
              }`}
              onClick={save}
              disabled={saving}
              aria-live="polite"
            >
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate min-w-0">{saving ? 'Saving…' : 'Save Changes'}</span>
            </button>
            
            <button 
              className="w-full max-w-full min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all duration-300 border-2 border-slate-200 hover:border-slate-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 box-border overflow-hidden" 
              onClick={() => { window.location.href = '/owner/settings/password'; }}
            >
              <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate min-w-0">Change Password</span>
            </button>
            
            <button 
              className="w-full max-w-full min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all duration-300 border-2 border-slate-200 hover:border-slate-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 box-border overflow-hidden" 
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                } catch {}
                window.location.href = "/owner/login";
              }}
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate min-w-0">Logout</span>
            </button>
            
            <button
              className="w-full max-w-full min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all duration-300 border-2 border-red-600 hover:border-red-700 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 box-border overflow-hidden"
              onClick={async () => {
                const ok = confirm('Are you sure you want to delete your account? This is irreversible.');
                if (!ok) return;
                try {
                  await api.delete('/api/account');
                  // clear session and redirect
                  try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
                  alert('Account deleted');
                  window.location.href = '/';
                } catch (err: any) {
                  console.error('Failed to delete account', err);
                  alert('Could not delete account: ' + String(err?.message ?? err));
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate min-w-0">Delete Account</span>
            </button>
          </div>
        </section>

        {/* Audit History Section */}
        <section className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-slate-300/60 animate-in fade-in slide-in-from-bottom-4 box-border">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 flex items-center justify-center transition-all duration-300 shadow-sm">
              <History className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight">Change History</h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Track all modifications to your profile and payout details</p>
            </div>
          </div>
          
          {loadingAudit ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <div className="h-4 w-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading audit history...</span>
              </div>
            </div>
          ) : auditHistory.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center mx-auto mb-4">
                <History className="h-8 w-8 text-slate-300" />
              </div>
              <div className="text-sm font-medium text-slate-600 mb-1">No changes recorded yet</div>
              <div className="text-xs text-slate-400">Your change history will appear here</div>
            </div>
          ) : (
            <div>
              <div className="space-y-3">
                {(showAllAuditHistory ? auditHistory : auditHistory.slice(0, 2)).map((log: any) => {
                const impactStyles: Record<string, { badge: string; bg: string; text: string; border: string }> = {
                  high: {
                    badge: 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md shadow-red-500/20',
                    bg: 'bg-gradient-to-br from-red-50/50 via-rose-50/30 to-red-50/50',
                    text: 'text-red-700',
                    border: 'border-red-200/60',
                  },
                  medium: {
                    badge: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20',
                    bg: 'bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-amber-50/50',
                    text: 'text-amber-700',
                    border: 'border-amber-200/60',
                  },
                  low: {
                    badge: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/20',
                    bg: 'bg-gradient-to-br from-blue-50/50 via-indigo-50/30 to-blue-50/50',
                    text: 'text-blue-700',
                    border: 'border-blue-200/60',
                  },
                };
                const impactStyle = impactStyles[log.impactLevel] || impactStyles.low;
                const date = new Date(log.createdAt);
                const formattedDate = date.toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });
                
                const fieldLabels: Record<string, string> = {
                  bankAccountNumber: 'Account Number',
                  mobileMoneyNumber: 'Mobile Money Number',
                  bankName: 'Bank Name',
                  bankAccountName: 'Account Name',
                  bankBranch: 'Branch',
                  mobileMoneyProvider: 'Provider',
                  payoutPreferred: 'Preferred Method',
                  fullName: 'Full Name',
                  email: 'Email',
                  phone: 'Phone',
                  tin: 'TIN',
                  address: 'Address',
                };
                
                return (
                  <div 
                    key={log.id} 
                    className={`group relative p-5 rounded-xl border ${impactStyle.border} ${impactStyle.bg} backdrop-blur-sm transition-all duration-300 hover:shadow-lg hover:scale-[1.01] hover:border-opacity-100 animate-in fade-in slide-in-from-bottom-2`}
                  >
                    {/* Decorative gradient overlay */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 to-transparent pointer-events-none"></div>
                    
                    <div className="relative">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-2.5 flex-wrap">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-wide uppercase ${impactStyle.badge} shadow-sm`}>
                              {log.impactLevel} Impact
                            </span>
                            <span className="text-xs font-medium text-slate-500 bg-white/60 px-2 py-1 rounded-md">
                              {log.impactScore} points
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1.5">
                            {log.action === 'USER_PASSWORD_CHANGE' && <KeyRound className="h-4 w-4 text-amber-600 flex-shrink-0" />}
                            {log.action === 'USER_LOGIN' && <LogIn className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                            {log.action === 'USER_LOGOUT' && <LogOut className="h-4 w-4 text-slate-600 flex-shrink-0" />}
                            {(log.action === 'USER_SESSION_REVOKE' || log.action === 'USER_SESSION_REVOKE_OTHERS') && <Shield className="h-4 w-4 text-purple-600 flex-shrink-0" />}
                            <h3 className="text-base font-bold text-slate-900 leading-tight">
                              {log.action === 'USER_PAYOUT_UPDATE' ? 'Payout Details Updated' : 
                               log.action === 'USER_PROFILE_UPDATE' ? 'Profile Updated' :
                               log.action === 'USER_PASSWORD_CHANGE' ? 'Password Changed' :
                               log.action === 'USER_LOGIN' ? 'Login' :
                               log.action === 'USER_LOGOUT' ? 'Logout' :
                               log.action === 'USER_SESSION_REVOKE' ? 'Session Revoked' :
                               log.action === 'USER_SESSION_REVOKE_OTHERS' ? 'Other Sessions Revoked' :
                               'Account Action'}
                            </h3>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-white/70 px-2.5 py-1.5 rounded-lg flex-shrink-0 shadow-sm">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="whitespace-nowrap">{formattedDate}</span>
                        </div>
                      </div>
                      
                      {/* Changed Fields */}
                      {log.changedFields && log.changedFields.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Changed Fields</div>
                          <div className="flex flex-wrap gap-2">
                            {log.changedFields.map((f: string, idx: number) => (
                              <span 
                                key={idx}
                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white/80 text-slate-700 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                              >
                                {fieldLabels[f] || f}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* IP Address */}
                      {log.ip && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200/40">
                          <div className="h-1.5 w-1.5 rounded-full bg-slate-300"></div>
                          <span className="font-mono">IP: {log.ip}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
                })}
              </div>
              
              {/* View More/Less Button */}
              {auditHistory.length > 2 && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setShowAllAuditHistory(!showAllAuditHistory)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-slate-200/60 shadow-sm hover:shadow"
                  >
                    {showAllAuditHistory ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span>Show Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span>View More ({auditHistory.length - 2} more)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" 
          onClick={() => setShowConfirmDialog(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 max-w-md w-full p-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/10">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 mb-1.5">Confirm Sensitive Change</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{confirmMessage}</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingSave(null);
                  setConfirmMessage("");
                }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConfirmDialog(false);
                  if (pendingSave) {
                    await pendingSave();
                  }
                  setPendingSave(null);
                  setConfirmMessage("");
                }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg shadow-emerald-500/20"
              >
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

