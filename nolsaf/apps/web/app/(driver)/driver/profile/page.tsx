"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Image from "next/image";
import {
  ArrowLeft, Car, CheckCircle, CheckCircle2, Clock, CreditCard, Eye, FileText,
  Globe, Lock, LogOut, Mail, MapPin, Pencil, Phone, Plus, Save, Shield, Trash2,
  Truck, Upload, User, UserCircle, Wallet, X, AlertCircle, Calendar,
} from "lucide-react";
import DatePickerField from "@/components/DatePickerField";

// ─── Driver document types ──────────────────────────────────────────────────
const DRIVER_DOC_TYPES = [
  { type: "DRIVER_LICENSE",       label: "Driving Licence",              hasExpiry: true,  expiryLabel: "Licence expiry date" },
  { type: "NATIONAL_ID",          label: "National ID",                  hasExpiry: false },
  { type: "VEHICLE_REGISTRATION", label: "Vehicle Registration (LATRA)", hasExpiry: false },
  { type: "INSURANCE",            label: "Insurance Certificate",        hasExpiry: true,  expiryLabel: "Insurance expiry date" },
] as const;

function getLatestDriverDoc(docs: any[], type: string) {
  const t = type.toUpperCase();
  return (docs ?? []).find((d: any) => String(d?.type ?? "").toUpperCase() === t) ?? null;
}
function todayIso() { return new Date().toISOString().slice(0, 10); }

function maskAccount(v?: string | null) {
  if (!v) return "—";
  const s = String(v).replace(/\s+/g, "");
  return s.length <= 4 ? "****" + s : "****" + s.slice(-4);
}
function maskPhone(v?: string | null) {
  if (!v) return "—";
  const s = String(v);
  return s.length <= 6 ? s.replace(/.(?=.{2})/g, "*") : s.slice(0, 4) + "••••" + s.slice(-2);
}
function maskRef(v?: string | null) {
  if (!v) return "—";
  const s = String(v);
  return s.length <= 8 ? s.slice(0, 2) + "••••" + s.slice(-2) : s.slice(0, 4) + "••••" + s.slice(-4);
}

const api = axios.create({ baseURL: "", withCredentials: true });

// ─── Shared display components ───────────────────────────────────────────────
function InfoItem({
  icon, label, value, tone = "light", accent = "brand",
}: {
  icon: React.ReactNode; label: string; value: React.ReactNode;
  tone?: "light" | "dark"; accent?: "brand" | "amber";
}) {
  const dark = tone === "dark";
  const iconCls = dark
    ? accent === "amber"
      ? "h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-300/20 flex items-center justify-center text-amber-300 flex-shrink-0"
      : "h-10 w-10 rounded-2xl bg-[#02665e]/10 border border-[#02665e]/20 flex items-center justify-center text-[#02665e] flex-shrink-0"
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
  editingField, onStartEdit, onStopEdit, onChange,
}: {
  icon: React.ReactNode; label: string; value: any; fieldKey: string;
  fieldType?: "text" | "select" | "date" | "tel";
  selectOptions?: { value: string; label: string }[];
  editingField: string | null;
  onStartEdit: (k: string) => void;
  onStopEdit: () => void;
  onChange: (k: string, v: string) => void;
}) {
  const editing = editingField === fieldKey;
  const display = value || "—";
  return (
    <div className="flex items-start gap-3 group">
      <div className="h-10 w-10 rounded-2xl bg-[#02665e]/5 border border-[#02665e]/15 flex items-center justify-center text-[#02665e] flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-slate-600">{label}</div>
          <button
            type="button"
            onClick={() => editing ? onStopEdit() : onStartEdit(fieldKey)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#02665e] hover:text-[#02665e]/80 focus-visible:opacity-100 focus-visible:outline-none"
            aria-label={editing ? "Cancel" : `Edit ${label}`}
          >
            {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
          </button>
        </div>
        {editing ? (
          fieldType === "select" && selectOptions ? (
            <select
              value={value || ""}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              autoFocus
              onBlur={onStopEdit}
              className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30"
            >
              <option value="">Select</option>
              {selectOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input
              type={fieldType === "tel" ? "tel" : fieldType === "date" ? "date" : "text"}
              value={value || ""}
              onChange={(e) => onChange(fieldKey, e.target.value)}
              autoFocus
              onBlur={onStopEdit}
              onKeyDown={(e) => { if (e.key === "Enter") onStopEdit(); }}
              className="mt-0.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30"
            />
          )
        ) : (
          <div className={`text-sm font-bold mt-0.5 break-words ${!value ? "text-slate-400" : "text-slate-900"}`}>
            {fieldType === "date" && value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : display}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function DriverProfile() {
  const [form, setForm] = useState<any>({});
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[] | null>(null);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Per-document upload
  const docInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [docUploading, setDocUploading] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [docDragOver, setDocDragOver] = useState(false);
  const [licenseExpiresOn, setLicenseExpiresOn] = useState("");
  const [insuranceExpiresOn, setInsuranceExpiresOn] = useState("");
  const [inlineExpiryType, setInlineExpiryType] = useState<string | null>(null);

  type CloudinarySig = { timestamp: number; signature: string; folder: string; cloudName: string; apiKey: string };

  async function uploadToCloudinary(file: File, folder: string) {
    const sig = await api.get(`/api/uploads/cloudinary/sign?folder=${encodeURIComponent(folder)}`);
    const s = sig.data as CloudinarySig;
    const fd = new FormData();
    fd.append("file", file); fd.append("timestamp", String(s.timestamp));
    fd.append("api_key", s.apiKey); fd.append("signature", s.signature);
    fd.append("folder", s.folder); fd.append("overwrite", "true");
    const r = await axios.post(`https://api.cloudinary.com/v1_1/${s.cloudName}/auto/upload`, fd);
    return (r.data as { secure_url: string }).secure_url;
  }

  const uploadDocumentForType = async (type: string, file: File | null) => {
    if (!file || !type) return;
    setDocError(null); setDocSuccess(null);
    const dt = DRIVER_DOC_TYPES.find(d => d.type === type);
    if (!dt) return;
    if (dt.hasExpiry) {
      const ev = type === "DRIVER_LICENSE" ? licenseExpiresOn : insuranceExpiresOn;
      if (!ev) { setDocError(`Please enter the ${dt.expiryLabel} before uploading.`); return; }
      if (!Number.isFinite(new Date(`${ev}T23:59:59.999Z`).getTime())) { setDocError("Please enter a valid expiry date."); return; }
      if (ev < todayIso()) { setDocError("Expiry date must be today or later."); return; }
    }
    const allowed = new Set(["application/pdf","image/jpeg","image/png","image/webp","image/gif"]);
    if (!allowed.has(file.type)) { setDocError("Please choose a PDF or image file (PDF, JPG, PNG, WebP)."); return; }
    if (file.size > 15 * 1024 * 1024) { setDocError("File is too large. Maximum size is 15 MB."); return; }
    try {
      setDocUploading(type);
      const url = await uploadToCloudinary(file, "driver-documents");
      const ev = dt.hasExpiry ? (type === "DRIVER_LICENSE" ? licenseExpiresOn : insuranceExpiresOn) : null;
      const expiresAtIso = ev ? new Date(`${ev}T23:59:59.999Z`).toISOString() : null;
      const resp = await api.put("/api/account/documents", {
        type, url,
        metadata: { fileName: file.name, contentType: file.type, size: file.size, uploadedAt: new Date().toISOString(), ...(expiresAtIso ? { expiresAt: expiresAtIso, expiresOn: ev } : null) },
      });
      const saved = (resp as any)?.data?.data?.doc ?? (resp as any)?.data?.doc ?? null;
      setMe((prev: any) => {
        if (!prev) return prev;
        const docs = Array.isArray(prev.documents) ? prev.documents : [];
        return { ...prev, documents: saved ? [saved, ...docs.filter((d: any) => d?.id !== saved?.id)] : docs };
      });
      setDocSuccess("Document uploaded. Pending admin review.");
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.message;
      setDocError(String(msg || e?.message || "Failed to upload document."));
    } finally {
      setDocUploading(null); setDocDragOver(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true); setLoadError(null);
      try {
        const r = await api.get("/api/account/me");
        if (!mounted) return;
        const d = r.data?.data ?? r.data;
        const norm = { ...(d ?? {}), fullName: (d as any)?.fullName ?? (d as any)?.name ?? "" };
        setForm(norm); setMe(norm);
        try { (window as any).ME = norm; } catch { /* ignore */ }
        try {
          setLoadingPaymentMethods(true);
          const pm = await api.get("/api/account/payment-methods");
          if (!mounted) return;
          const pd = pm.data?.data ?? pm.data;
          setPaymentMethods(pd?.methods ?? null);
          if (pd?.payout) setForm((prev: any) => ({ ...prev, ...pd.payout }));
        } catch { /* ignore */ } finally { if (mounted) setLoadingPaymentMethods(false); }
      } catch (err: any) {
        if (!mounted) return;
        setLoadError(String(err?.message ?? err));
        const st = err?.response?.status; const code = err?.response?.data?.code;
        if (st === 403 && code === "ACCOUNT_SUSPENDED") return;
        if (typeof window !== "undefined") window.location.href = "/driver/login";
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const profileCompletion = useMemo(() => {
    const docs = Array.isArray(me?.documents) ? me.documents : [];
    const checks = [
      Boolean(form.avatarUrl),
      Boolean(form.fullName),
      Boolean(form.phone),
      Boolean(form.nationality),
      Boolean(form.region),
      Boolean(form.licenseNumber),
      Boolean(form.vehicleType),
      Boolean(form.plateNumber || form.vehiclePlate),
      ...DRIVER_DOC_TYPES.map(dt => Boolean(getLatestDriverDoc(docs, dt.type)?.url)),
    ];
    const done = checks.filter(Boolean).length;
    return { pct: Math.round((done / checks.length) * 100), done, total: checks.length };
  }, [form, me]);

  const completionTone = profileCompletion.pct >= 80 ? "good" : profileCompletion.pct >= 50 ? "warn" : "bad";

  const save = async () => {
    setSaving(true); setEditingField(null);
    try {
      const avatarUrl = form.avatarUrl;
      const payload: any = {
        fullName: form.fullName ?? form.name, phone: form.phone,
        nationality: form.nationality, avatarUrl,
        timezone: form.timezone, region: form.region, district: form.district,
        nin: form.nin || form.nationalId, licenseNumber: form.licenseNumber,
        plateNumber: form.plateNumber, vehicleType: form.vehicleType,
        vehicleMake: form.vehicleMake, vehiclePlate: form.vehiclePlate,
        operationArea: form.operationArea || form.parkingArea, paymentPhone: form.paymentPhone,
      };
      if (typeof form.dateOfBirth !== "undefined") payload.dateOfBirth = form.dateOfBirth;
      if (typeof form.gender !== "undefined") payload.gender = form.gender;
      await api.put("/api/driver/profile", payload);
      setForm((p: any) => ({ ...p, avatarUrl }));
      try {
        const pp: any = { bankAccountName: form.bankAccountName, bankName: form.bankName, bankAccountNumber: form.bankAccountNumber, bankBranch: form.bankBranch, mobileMoneyProvider: form.mobileMoneyProvider, mobileMoneyNumber: form.mobileMoneyNumber, payoutPreferred: form.payoutPreferred };
        if (Object.values(pp).some(v => v != null && v !== "")) await api.put("/api/account/payouts", pp);
      } catch { /* ignore */ }
      setSaveSuccess("Profile saved."); setSaveError(null);
      setTimeout(() => setSaveSuccess(null), 3000);
      const updated = { ...(me ?? {}), ...payload };
      setMe(updated);
      try { (window as any).ME = updated; } catch { /* ignore */ }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.response?.data?.error;
      setSaveError("Could not save: " + String(msg ?? err?.message ?? err));
      setSaveSuccess(null);
    } finally { setSaving(false); }
  };

  const onUploadAvatar = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAvatarError("Please choose an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { setAvatarError("Image too large. Max 10 MB."); return; }
    try {
      setAvatarUploading(true); setAvatarError(null);
      const url = await uploadToCloudinary(file, "avatars");
      await api.put("/api/driver/profile", { avatarUrl: url });
      setForm((p: any) => ({ ...p, avatarUrl: url }));
      setMe((p: any) => p ? { ...p, avatarUrl: url } : p);
      try { window.dispatchEvent(new CustomEvent("account:avatarUrl", { detail: { avatarUrl: url } })); } catch { /* ignore */ }
    } catch (e: any) {
      setAvatarError("Failed to upload photo.");
    } finally { setAvatarUploading(false); if (avatarFileInputRef.current) avatarFileInputRef.current.value = ""; }
  };

  if (loading) {
    return (
      <div className="w-full flex flex-col items-center justify-center py-20">
        <div className="dot-spinner dot-md mx-auto" aria-hidden>
          <span className="dot dot-blue" /><span className="dot dot-black" />
          <span className="dot dot-yellow" /><span className="dot dot-green" />
        </div>
        <p className="text-sm text-slate-600 mt-4">Loading profile…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <div className="text-sm font-bold text-rose-900">Error loading profile</div>
        <div className="text-sm text-rose-700 mt-1">{loadError}</div>
      </div>
    );
  }

  const avatarUrl = form.avatarUrl || null;

  const editProps = {
    editingField,
    onStartEdit: (k: string) => setEditingField(k),
    onStopEdit: () => setEditingField(null),
    onChange: (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v })),
  };

  const allDocs = Array.isArray(me?.documents) ? me.documents : [];
  const missingDocTypes = DRIVER_DOC_TYPES.filter(dt => !getLatestDriverDoc(allDocs, dt.type)?.url);

  return (
    <div className="w-full py-2 sm:py-4">

      {/* ── Hero banner ─────────────────────────────────────────────────── */}
      <div className="mb-6 relative rounded-3xl border border-white/10 bg-slate-950 shadow-card overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#02665e]/20 via-slate-950 to-slate-900" aria-hidden />
        <div className="relative p-5 sm:p-7">
          <div className="relative min-h-10">
            <Link href="/driver" aria-label="Back"
              className="absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 shadow-card transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>

            {/* Completion ring */}
            <div className="absolute right-0 top-0 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur">
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
              <p className="mt-2 text-sm sm:text-base text-white/70 leading-relaxed">Personal details, vehicle info, and required documents.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Save feedback ──────────────────────────────────────────────── */}
      {(saveSuccess || saveError) && (
        <div className={`mb-5 rounded-2xl border px-5 py-3.5 text-sm font-semibold ${saveSuccess ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
          {saveSuccess ?? saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Personal details ──────────────────────────────────────────── */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">
            <div className="text-sm font-bold text-slate-900">Personal details</div>
            <div className="text-sm text-slate-600 mt-1">Contact and identity information.</div>
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
                  <div className="text-xs text-slate-600 mt-0.5">{!avatarUrl ? "Required — upload your photo." : "Keep your photo up to date."}</div>
                  {avatarError && <div className="text-xs text-rose-600 mt-1">{avatarError}</div>}
                </div>
              </div>
              <div className="shrink-0">
                <input ref={avatarFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onUploadAvatar(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => avatarFileInputRef.current?.click()} disabled={avatarUploading}
                  className="inline-flex items-center justify-center text-[#02665e] disabled:opacity-60 focus-visible:outline-none">
                  <span className="sr-only">{avatarUrl ? "Change photo" : "Upload photo"}</span>
                  {avatarUploading
                    ? <span className="h-4 w-4 rounded-full border-2 border-[#02665e]/20 border-t-[#02665e] animate-spin" aria-hidden />
                    : <Pencil className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </div>

            <div className="pt-5 grid grid-cols-2 gap-4">
              <EditableInfoItem icon={<User className="w-5 h-5" />} label="Full name" value={form.fullName} fieldKey="fullName" {...editProps} />
              <EditableInfoItem icon={<Mail className="w-5 h-5" />} label="Email" value={form.email} fieldKey="email" {...editProps} />
              <EditableInfoItem icon={<Phone className="w-5 h-5" />} label="Phone" value={form.phone} fieldKey="phone" fieldType="tel" {...editProps} />
              <EditableInfoItem icon={<Globe className="w-5 h-5" />} label="Nationality" value={form.nationality} fieldKey="nationality" {...editProps} />
              <EditableInfoItem icon={<MapPin className="w-5 h-5" />} label="Region" value={form.region} fieldKey="region" {...editProps} />
              <EditableInfoItem icon={<MapPin className="w-5 h-5" />} label="District" value={form.district} fieldKey="district" {...editProps} />
              <EditableInfoItem icon={<Calendar className="w-5 h-5" />} label="Date of birth" value={form.dateOfBirth} fieldKey="dateOfBirth" fieldType="date" {...editProps} />
              <EditableInfoItem icon={<User className="w-5 h-5" />} label="Gender" value={form.gender} fieldKey="gender" fieldType="select"
                selectOptions={[{value:"male",label:"Male"},{value:"female",label:"Female"},{value:"other",label:"Other"},{value:"prefer_not_to_say",label:"Prefer not to say"}]}
                {...editProps} />
            </div>
          </div>
        </div>

        {/* ── Driving details ───────────────────────────────────────────── */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">
            <div className="text-sm font-bold text-slate-900">Driving details</div>
            <div className="text-sm text-slate-600 mt-1">Vehicle and licence information.</div>
          </div>
          <div className="p-5 sm:p-6 grid grid-cols-2 gap-4">
            <EditableInfoItem icon={<FileText className="w-5 h-5" />} label="Licence number" value={form.licenseNumber} fieldKey="licenseNumber" {...editProps} />
            <EditableInfoItem icon={<Car className="w-5 h-5" />} label="Vehicle type" value={form.vehicleType} fieldKey="vehicleType" fieldType="select"
              selectOptions={[{value:"bajaji",label:"Bajaji"},{value:"bodaboda",label:"Bodaboda"},{value:"vehicle",label:"Vehicle"}]}
              {...editProps} />
            <EditableInfoItem icon={<Truck className="w-5 h-5" />} label="Plate number" value={form.plateNumber || form.vehiclePlate} fieldKey="plateNumber" {...editProps} />
            <EditableInfoItem icon={<Car className="w-5 h-5" />} label="Vehicle make" value={form.vehicleMake} fieldKey="vehicleMake" {...editProps} />
            <EditableInfoItem icon={<MapPin className="w-5 h-5" />} label="Operation area" value={form.operationArea || form.parkingArea} fieldKey="operationArea" {...editProps} />
            <EditableInfoItem icon={<FileText className="w-5 h-5" />} label="NIN" value={form.nin || form.nationalId} fieldKey="nin" {...editProps} />
            {/* VIP badge */}
            <div className="col-span-2 flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-amber-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-600">VIP vehicle class</div>
                {form.isVipDriver
                  ? <span className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">VIP — Premium eligible</span>
                  : <div className="text-sm font-bold text-slate-900 mt-0.5">Standard class</div>}
                <div className="text-[10px] text-slate-400 mt-1">Set during registration, reviewed by our team.</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Payment phone — dark card ─────────────────────────────────── */}
        <div className="lg:col-span-6 relative rounded-2xl border border-white/10 bg-slate-950/70 shadow-card overflow-hidden backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#02665e]/20 via-slate-950/80 to-slate-950" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />
          <div className="relative p-5 sm:p-6 border-b border-white/10 bg-white/5">
            <div className="text-sm font-bold text-white">Payment phone</div>
            <div className="text-sm text-white/70 mt-1">M-Pesa / Tigo / Airtel number for payouts.</div>
          </div>
          <div className="relative p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3 group">
              <div className="h-10 w-10 rounded-2xl bg-[#02665e]/10 border border-[#02665e]/20 flex items-center justify-center text-[#02665e] flex-shrink-0"><Phone className="w-5 h-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-white/60">Payment phone number</div>
                  <button type="button" onClick={() => setEditingField(editingField === "paymentPhone" ? null : "paymentPhone")}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white/90 focus-visible:opacity-100 focus-visible:outline-none">
                    {editingField === "paymentPhone" ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {editingField === "paymentPhone"
                  ? <input type="tel" value={form.paymentPhone || ""} onChange={(e) => setForm((p: any) => ({ ...p, paymentPhone: e.target.value }))}
                      autoFocus onBlur={() => setEditingField(null)} onKeyDown={(e) => { if (e.key === "Enter") setEditingField(null); }}
                      className="mt-0.5 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-[#02665e]/40" />
                  : <div className={`text-sm font-bold mt-0.5 ${!form.paymentPhone ? "text-white/40" : "text-white"}`}>{form.paymentPhone || "—"}</div>}
                {form.paymentVerified || form.paymentPhoneVerified
                  ? <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400"><CheckCircle className="w-3 h-3" />Verified</span>
                  : <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400"><AlertCircle className="w-3 h-3" />Not verified</span>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Payout details — dark card ────────────────────────────────── */}
        <div className="lg:col-span-6 relative rounded-2xl border border-white/10 bg-slate-950/70 shadow-card overflow-hidden backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#0a5c82]/15 via-slate-950/85 to-slate-950" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />
          <div className="relative p-5 sm:p-6 border-b border-white/10 bg-white/5">
            <div className="text-sm font-bold text-white">Payout details</div>
            <div className="text-sm text-white/70 mt-1">Bank and mobile money for earnings.</div>
          </div>
          <div className="relative p-5 sm:p-6 grid grid-cols-2 gap-4">
            <InfoItem tone="dark" icon={<CreditCard className="w-5 h-5" />} label="Bank name" value={form.bankName || "—"} />
            <InfoItem tone="dark" icon={<CreditCard className="w-5 h-5" />} label="Account number" value={maskAccount(form.bankAccountNumber)} />
            <InfoItem tone="dark" icon={<Wallet className="w-5 h-5" />} label="Mobile money" value={form.mobileMoneyProvider ? `${form.mobileMoneyProvider} — ${maskPhone(form.mobileMoneyNumber)}` : "—"} />
            <InfoItem tone="dark" icon={<CreditCard className="w-5 h-5" />} label="Preferred payout" value={form.payoutPreferred || "—"} />
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
              onChange={(e) => { void uploadDocumentForType(selectedDocType, e.target.files?.[0] ?? null); }} />

            {(docError || docSuccess) && (
              <div className="space-y-1">
                {docError  && <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{docError}</div>}
                {docSuccess && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">{docSuccess}</div>}
              </div>
            )}

            {/* Upload widget — only when any doc is missing */}
            {missingDocTypes.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-4">
                    <div className="text-xs font-semibold text-slate-600">Document type</div>
                    <select value={selectedDocType} onChange={(e) => { setSelectedDocType(e.target.value); setDocError(null); setInlineExpiryType(null); }}
                      className="mt-2 w-full h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30">
                      <option value="">Select document…</option>
                      {missingDocTypes.map(dt => <option key={dt.type} value={dt.type}>{dt.label}</option>)}
                    </select>
                    <div className="text-xs text-slate-600 mt-2">Select type, then drag & drop or click to upload.</div>
                    {selectedDocType === "DRIVER_LICENSE" && (
                      <div className="mt-3">
                        <div className="text-[11px] font-semibold text-slate-700 mb-1.5">Licence expiry date <span className="text-red-500">*</span></div>
                        <DatePickerField label="Licence expiry date" value={licenseExpiresOn} onChangeAction={setLicenseExpiresOn} min={todayIso()} allowPast={false} twoMonths={false} widthClassName="w-full" size="sm" />
                        <div className="text-[10px] text-slate-400 mt-1">Reminders sent before expiry.</div>
                      </div>
                    )}
                    {selectedDocType === "INSURANCE" && (
                      <div className="mt-3">
                        <div className="text-[11px] font-semibold text-slate-700 mb-1.5">Insurance expiry date <span className="text-red-500">*</span></div>
                        <DatePickerField label="Insurance expiry date" value={insuranceExpiresOn} onChangeAction={setInsuranceExpiresOn} min={todayIso()} allowPast={false} twoMonths={false} widthClassName="w-full" size="sm" />
                        <div className="text-[10px] text-slate-400 mt-1">Reminders sent before expiry.</div>
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-8">
                    <div
                      role="button" tabIndex={0}
                      aria-label="Upload document"
                      className={`w-full rounded-2xl border-2 border-dashed px-4 py-4 sm:py-5 transition cursor-pointer ${!selectedDocType || docUploading ? "border-slate-200 bg-slate-50/60 opacity-70" : docDragOver ? "border-[#02665e] bg-[#02665e]/5" : "border-slate-200 bg-slate-50/60 hover:bg-slate-50"}`}
                      onClick={() => { if (!selectedDocType || docUploading) return; docInputRef.current?.click(); }}
                      onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !docUploading && selectedDocType) { e.preventDefault(); docInputRef.current?.click(); } }}
                      onDragOver={(e) => { if (!selectedDocType || !!docUploading) return; e.preventDefault(); setDocDragOver(true); }}
                      onDragLeave={() => setDocDragOver(false)}
                      onDrop={(e) => { if (!selectedDocType || !!docUploading) return; e.preventDefault(); setDocDragOver(false); void uploadDocumentForType(selectedDocType, e.dataTransfer.files?.[0] ?? null); }}
                    >
                      <div className="flex items-center justify-center gap-3 text-center">
                        <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-[#02665e] shrink-0">
                          <Plus className="w-5 h-5" aria-hidden />
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

            {/* Doc status cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {DRIVER_DOC_TYPES.map((dt) => {
                const doc = getLatestDriverDoc(allDocs, dt.type);
                const status = (doc?.status ? String(doc.status) : "").toUpperCase();
                const hasUrl = Boolean(doc?.url);
                const statusText = hasUrl ? (status || "PENDING") : "NOT_UPLOADED";
                const expiresOn = doc?.metadata?.expiresOn ?? null;
                const expiresAt = doc?.metadata?.expiresAt ? new Date(doc.metadata.expiresAt) : null;
                const isExpired = expiresAt ? expiresAt.getTime() < Date.now() : false;
                const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / 86400000) : null;
                const DocIcon = dt.type === "NATIONAL_ID" ? UserCircle : dt.type === "VEHICLE_REGISTRATION" ? Truck : dt.type === "INSURANCE" ? Shield : FileText;
                const badgeCls = statusText === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : statusText === "REJECTED" ? "bg-rose-50 text-rose-700 border-rose-200" : statusText === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200";
                return (
                  <div key={dt.type} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-[#02665e]/5 border border-[#02665e]/15 flex items-center justify-center text-[#02665e] shrink-0">
                          <DocIcon className="w-4 h-4" />
                        </div>
                        <div className="text-sm font-semibold text-slate-900 leading-snug">{dt.label}</div>
                      </div>
                      {hasUrl && doc?.url && (
                        <a href={doc.url} target="_blank" rel="noreferrer" title="View document"
                          className="text-[#02665e] hover:text-[#02665e]/80 focus-visible:outline-none">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <div className="mt-2.5">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeCls}`}>
                        {statusText === "PENDING" && <Clock className="w-3 h-3" />}
                        {statusText === "APPROVED" && <CheckCircle2 className="w-3 h-3" />}
                        {statusText === "NOT_UPLOADED" ? "Not uploaded" : statusText === "PENDING" ? "Pending review" : statusText.charAt(0) + statusText.slice(1).toLowerCase()}
                      </span>
                    </div>
                    {expiresOn && (
                      <div className={`mt-1.5 text-[10px] font-medium ${isExpired ? "text-rose-600" : typeof daysLeft === "number" && daysLeft <= 10 ? "text-orange-600" : "text-slate-500"}`}>
                        {isExpired ? "⚠ Expired: " : "Expires: "}{expiresOn}
                        {!isExpired && typeof daysLeft === "number" && daysLeft <= 30 && ` (${daysLeft}d left)`}
                      </div>
                    )}
                    {statusText === "REJECTED" && doc?.reason && (
                      <div className="mt-2 text-xs text-rose-700 bg-rose-50 rounded-lg px-2.5 py-2 border border-rose-200">
                        <span className="font-semibold">Reason:</span> {doc.reason}
                      </div>
                    )}
                    {/* Inline expiry picker for hasExpiry card's Change button */}
                    {inlineExpiryType === dt.type && (
                      <div className="mt-3 p-3 rounded-xl border-2 border-[#02665e]/20 bg-[#02665e]/5 space-y-2">
                        <div className="text-[11px] font-semibold text-slate-700">{dt.type === "DRIVER_LICENSE" ? "Licence" : "Insurance"} expiry date <span className="text-red-500">*</span></div>
                        <DatePickerField
                          label={dt.type === "DRIVER_LICENSE" ? "Licence expiry date" : "Insurance expiry date"}
                          value={dt.type === "DRIVER_LICENSE" ? licenseExpiresOn : insuranceExpiresOn}
                          onChangeAction={(v) => { if (dt.type === "DRIVER_LICENSE") setLicenseExpiresOn(v); else setInsuranceExpiresOn(v); }}
                          min={todayIso()} allowPast={false} twoMonths={false} widthClassName="w-full" size="sm"
                        />
                        <div className="text-[10px] text-slate-400">Reminders sent before expiry.</div>
                        <div className="flex items-center gap-2 pt-1">
                          <button type="button"
                            disabled={!(dt.type === "DRIVER_LICENSE" ? licenseExpiresOn : insuranceExpiresOn)}
                            onClick={() => { setSelectedDocType(dt.type); setInlineExpiryType(null); setTimeout(() => docInputRef.current?.click(), 50); }}
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#02665e] text-white hover:bg-[#02665e]/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                            <Upload className="w-3 h-3" />Choose file
                          </button>
                          <button type="button" onClick={() => setInlineExpiryType(null)} className="text-[11px] text-slate-500 hover:text-slate-700 underline">Cancel</button>
                        </div>
                      </div>
                    )}
                    {/* Upload / Change button — only available when not yet uploaded or rejected */}
                    {(() => {
                      const canUpload = !hasUrl || statusText === "REJECTED";
                      if (!canUpload) {
                        return (
                          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                            <Lock className="w-3 h-3" />
                            {statusText === "APPROVED" ? "Approved — locked" : "Under review — locked"}
                          </div>
                        );
                      }
                      if (inlineExpiryType === dt.type) return null;
                      return (
                        <button type="button" disabled={!!docUploading}
                          onClick={() => {
                            setDocError(null); setDocSuccess(null);
                            if (dt.type === "DRIVER_LICENSE" && doc?.metadata?.expiresOn) setLicenseExpiresOn(doc.metadata.expiresOn);
                            if (dt.type === "INSURANCE" && doc?.metadata?.expiresOn) setInsuranceExpiresOn(doc.metadata.expiresOn);
                            if (dt.hasExpiry) { setInlineExpiryType(dt.type); }
                            else { setSelectedDocType(dt.type); setInlineExpiryType(null); setTimeout(() => docInputRef.current?.click(), 50); }
                          }}
                          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50">
                          <Upload className="w-3 h-3" />{hasUrl ? "Upload new" : "Upload"}
                        </button>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Payment methods ───────────────────────────────────────────── */}
        <div className="lg:col-span-12 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">
            <div className="text-sm font-bold text-slate-900">Payment methods</div>
            <div className="text-sm text-slate-600 mt-1">Recent payment sources used for bookings.</div>
          </div>
          <div className="p-5 sm:p-6">
            {loadingPaymentMethods ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="dot-spinner dot-sm" aria-hidden><span className="dot dot-blue" /><span className="dot dot-black" /><span className="dot dot-yellow" /><span className="dot dot-green" /></div>
                <p className="text-sm text-slate-500">Loading…</p>
              </div>
            ) : !paymentMethods || paymentMethods.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-3 text-center">
                <div className="h-14 w-14 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center"><CreditCard className="h-6 w-6 text-slate-300" /></div>
                <div className="text-sm font-semibold text-slate-600">No recent payment methods</div>
                <div className="text-xs text-slate-400">Your payment methods will appear here after bookings.</div>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map((m: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 sm:p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center"><CreditCard className="h-4 w-4 text-slate-500" /></div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{String(m.method || m.ref || "Unknown").toUpperCase()}</div>
                        {m.ref && <div className="text-xs text-slate-500 font-mono">Ref: {maskRef(String(m.ref))}</div>}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500">{m.paidAt ? new Date(m.paidAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" }) : ""}</div>
                  </div>
                ))}
              </div>
            )}
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
            <button onClick={() => { window.location.href = "/driver/security"; }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 shadow-card transition-colors">
              <Lock className="h-4 w-4" />Change password
            </button>
            <button onClick={async () => { try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {} window.location.href = "/driver/login"; }}
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

      </div>
    </div>
  );
}
