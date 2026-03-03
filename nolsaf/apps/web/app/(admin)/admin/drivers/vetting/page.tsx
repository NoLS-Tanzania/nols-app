"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
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
  Send,
  Loader2,
  Mail,
  Phone,
  UserCircle2,
  Globe,
  IdCard,
  Star,
  BadgeCheck,
  UploadCloud,
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
  vehicleType: string | null;
  plateNumber: string | null;
  licenseNumber: string | null;
  operationArea: string | null;
  region: string | null;
  isVipDriver: boolean;
  createdAt: string;
  paymentVerified: boolean | null;
};

type DriverDetail = DriverRow & {
  gender: string | null;
  nationality: string | null;
  nin: string | null;
  district: string | null;
  paymentPhone: string | null;
  payout: any;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function KycBadge({ status }: { status: KycStatus | null }) {
  if (status === "PENDING_KYC")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3 h-3" /> Pending Review
      </span>
    );
  if (status === "APPROVED_KYC")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <ShieldCheck className="w-3 h-3" /> Approved
      </span>
    );
  if (status === "REJECTED_KYC")
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <ShieldX className="w-3 h-3" /> Rejected
      </span>
    );
  return <span className="text-xs text-slate-400">—</span>;
}

function InfoRow({ label, value, icon: Icon, accent }: { label: string; value: string | null | undefined; icon?: any; accent?: string }) {
  const isEmpty = !value;
  return (
    <div className="grid grid-cols-2 gap-4 py-2.5 px-3 rounded-xl odd:bg-slate-50/60 even:bg-transparent transition-colors group">
      <div className="flex items-center gap-2 min-w-0">
        {Icon && (
          <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${accent ?? 'bg-slate-100'}`}>
            <Icon className="w-3 h-3 text-slate-500" />
          </span>
        )}
        <span className="text-xs font-semibold text-slate-400 truncate uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-right">
        {isEmpty
          ? <span className="text-xs text-slate-300 italic">Not provided</span>
          : <span className="text-sm font-semibold text-slate-800">{value}</span>}
      </div>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url?: string | null }) {
  if (!url)
    return (
      <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-slate-50 border border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
          </span>
          <span className="text-sm text-slate-500 font-medium">{label}</span>
        </div>
        <span className="text-xs text-slate-300 italic font-medium">Not uploaded</span>
      </div>
    );
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-3 px-4 rounded-xl bg-white border border-slate-200 hover:border-[#02665e]/40 hover:bg-emerald-50/60 transition-all group no-underline shadow-sm hover:shadow"
    >
      <div className="flex items-center gap-2.5">
        <span className="w-7 h-7 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
          <FileText className="w-3.5 h-3.5 text-emerald-600" />
        </span>
        <span className="text-sm text-slate-700 group-hover:text-[#02665e] font-semibold transition-colors">{label}</span>
      </div>
      <div className="flex items-center gap-1.5 text-[#02665e] bg-emerald-50 group-hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors">
        <Eye className="w-3.5 h-3.5" />
        <span className="text-xs font-bold">View</span>
      </div>
    </a>
  );
}

export default function DriverVettingPage() {
  const [tab, setTab] = useState<Tab>("PENDING_KYC");
  const [items, setItems] = useState<DriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<Tab, number>>({ PENDING_KYC: 0, APPROVED_KYC: 0, REJECTED_KYC: 0 });

  // Detail panel
  const [selected, setSelected] = useState<DriverDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Action state
  const [actionLoading, setActionLoading] = useState(false);
  const [actionNote, setActionNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState<"reject" | "request_info" | null>(null);
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Insurance upload state
  const [uploadingInsurance, setUploadingInsurance] = useState(false);
  const [insuranceUploadMsg, setInsuranceUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async (activeTab: Tab) => {
    setLoading(true);
    try {
      const r = await api.get("/api/admin/drivers", {
        params: { status: activeTab, page: 1, pageSize: 50 },
      });
      setItems(r.data?.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load counts for all tabs
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

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  async function openDetail(row: DriverRow) {
    setSelected(row as DriverDetail);
    setDetailLoading(true);
    setActionMsg(null);
    setActionNote("");
    setShowNoteInput(null);
    try {
      const r = await api.get(`/api/admin/drivers/${row.id}`);
      const d = r.data?.driver ?? r.data;
      if (d) setSelected({ ...row, ...d });
    } catch { /* keep row data */ } finally {
      setDetailLoading(false);
    }
  }

  async function uploadInsuranceDoc(file: File) {
    if (!selected) return;
    setUploadingInsurance(true);
    setInsuranceUploadMsg(null);
    try {
      // 1. Get Cloudinary signature
      const sigResp = await api.get(`/api/uploads/cloudinary/sign?folder=driver-documents%2Finsurance`);
      const { cloudName, apiKey, timestamp, folder, signature } = sigResp.data as any;
      // 2. Upload to Cloudinary
      const cld = new FormData();
      cld.append("file", file);
      cld.append("api_key", apiKey);
      cld.append("timestamp", String(timestamp));
      cld.append("folder", folder);
      cld.append("overwrite", "true");
      cld.append("signature", signature);
      const uploadResp = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: "POST", body: cld });
      if (!uploadResp.ok) throw new Error("Cloudinary upload failed");
      const uploadData = await uploadResp.json();
      const docUrl: string = uploadData.secure_url;
      // 3. Save URL to driver record
      await api.post(`/api/admin/drivers/${selected.id}/upload-doc`, { docType: "INSURANCE", docUrl });
      // 4. Update local state
      setSelected(prev => {
        if (!prev) return prev;
        const payout = (typeof prev.payout === "object" && prev.payout !== null) ? { ...prev.payout } : {};
        return { ...prev, payout: { ...payout, insuranceUrl: docUrl } };
      });
      setInsuranceUploadMsg({ type: "success", text: "Insurance document uploaded successfully." });
    } catch (e: any) {
      setInsuranceUploadMsg({ type: "error", text: e?.response?.data?.message || e?.message || "Upload failed" });
    } finally {
      setUploadingInsurance(false);
    }
  }

  async function doAction(action: "approve" | "reject" | "request_info") {
    if (!selected) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      await api.patch(`/api/admin/drivers/${selected.id}/kyc`, {
        action,
        reason: action === "reject" ? actionNote : undefined,
        note: action === "request_info" ? actionNote : undefined,
      });
      const newStatus =
        action === "approve" ? "APPROVED_KYC" :
        action === "reject" ? "REJECTED_KYC" : "PENDING_KYC";
      setSelected(prev => prev ? { ...prev, kycStatus: newStatus as KycStatus } : prev);
      setItems(prev => prev.map(d => d.id === selected.id ? { ...d, kycStatus: newStatus as KycStatus } : d));
      // Remove from current tab list if status changed away from this tab
      if (action !== "request_info") {
        setItems(prev => prev.filter(d => d.id !== selected.id));
      }
      setActionMsg({
        type: "success",
        text: action === "approve" ? "Driver approved successfully." :
              action === "reject" ? "Driver application rejected." :
              "Information request sent to driver.",
      });
      setShowNoteInput(null);
      setActionNote("");
      loadCounts();
    } catch (e: any) {
      setActionMsg({ type: "error", text: e?.response?.data?.message || e?.message || "Action failed" });
    } finally {
      setActionLoading(false);
    }
  }

  const tabs: { key: Tab; label: string; icon: any; color: string }[] = [
    { key: "PENDING_KYC", label: "Pending Review", icon: Clock, color: "amber" },
    { key: "APPROVED_KYC", label: "Approved", icon: ShieldCheck, color: "emerald" },
    { key: "REJECTED_KYC", label: "Rejected", icon: ShieldX, color: "red" },
  ];

  const payoutObj = (selected?.payout && typeof selected.payout === "object") ? selected.payout as any : {};

  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div
        className="rounded-2xl overflow-hidden mb-5 p-6"
        style={{ background: "linear-gradient(135deg, #0e2a7a 0%, #0a5c82 38%, #02665e 100%)" }}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Driver Vetting</h1>
            <p className="text-white/70 text-sm mt-0.5">Review and approve new driver applications before they access the platform</p>
          </div>

        </div>

        {/* Tab stat cards */}
        <div className="flex gap-2 mt-5 flex-wrap">
          {tabs.map(({ key, label, icon: Icon, color }) => {
            const active = tab === key;
            const cfg = {
              amber:   { activeBg: "bg-amber-50/90",   iconColor: "text-amber-500",   num: "text-amber-600",   lbl: "text-amber-700",   border: "border-amber-300/70",   dot: "bg-amber-400" },
              emerald: { activeBg: "bg-emerald-50/90", iconColor: "text-emerald-500", num: "text-emerald-600", lbl: "text-emerald-700", border: "border-emerald-300/70", dot: "bg-emerald-400" },
              red:     { activeBg: "bg-red-50/90",     iconColor: "text-red-500",     num: "text-red-600",     lbl: "text-red-700",     border: "border-red-300/70",     dot: "bg-red-400" },
            }[color]!;
            return (
              <button
                key={key}
                onClick={() => { setTab(key); setSelected(null); }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-200 border ${
                  active
                    ? `${cfg.activeBg} ${cfg.border} shadow-sm`
                    : "bg-white/10 border-white/20 hover:bg-white/20"
                }`}
              >
                {/* Dot indicator */}
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? cfg.dot : "bg-white/30"}`} />
                {/* Icon */}
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? cfg.iconColor : "text-white/60"}`} />
                {/* Count + Label */}
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-bold leading-none ${active ? cfg.num : "text-white font-semibold"}`}>
                    {counts[key]}
                  </span>
                  <span className={`text-xs font-semibold uppercase tracking-wide ${active ? cfg.lbl : "text-white/60"}`}>
                    {label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        {/* List panel */}
        <div className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all ${selected ? "w-96 flex-shrink-0" : "flex-1"}`}>
          {/* List */}
          <div className="divide-y divide-slate-100" style={{ maxHeight: 640, overflowY: "auto" }}>
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Loading drivers…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-500">
                  {tab === "PENDING_KYC" ? "No pending applications" :
                   tab === "APPROVED_KYC" ? "No approved drivers yet" :
                   "No rejected applications"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {tab === "PENDING_KYC" ? "New registrations will appear here for review" : ""}
                </p>
              </div>
            ) : items.map(d => (
              <button
                key={d.id}
                onClick={() => openDetail(d)}
                className={`w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 ${selected?.id === d.id ? "bg-[#02665e]/5 border-l-2 border-[#02665e]" : ""}`}
              >
                <div className="w-10 h-10 rounded-xl bg-slate-800 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {String(d.name || "?").trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">{d.name}</p>
                    <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 truncate">{d.email}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {d.vehicleType && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{d.vehicleType}</span>
                    )}
                    {d.isVipDriver && (
                      <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-semibold">VIP</span>
                    )}
                    <span className="text-xs text-slate-400">{formatDate(d.createdAt)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 720 }}>
            {/* Detail header */}
            <div
              className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4"
              style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl text-white font-black text-lg flex items-center justify-center shadow-md flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #0e2a7a 0%, #02665e 100%)" }}
                >
                  {String(selected.name || "?").trim().split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">{selected.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{selected.email}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <KycBadge status={selected.kycStatus} />
                    <span className="text-xs text-slate-400">Joined {formatDate(selected.createdAt)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 hover:shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 flex-shrink-0 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
              {detailLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Loading full details…</p>
                </div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Action result */}
                  {actionMsg && (
                    <div className={`p-3 rounded-xl flex items-center gap-3 ${
                      actionMsg.type === "success" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
                    }`}>
                      {actionMsg.type === "success"
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        : <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                      <p className={`text-sm font-medium ${actionMsg.type === "success" ? "text-emerald-800" : "text-red-800"}`}>
                        {actionMsg.text}
                      </p>
                    </div>
                  )}

                  {/* Contact */}
                  <section>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                      </span>
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Personal Information</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden px-2 py-1">
                      <InfoRow label="Full name" value={selected.name} icon={User} accent="bg-blue-50" />
                      <InfoRow label="Email" value={selected.email} icon={Mail} accent="bg-violet-50" />
                      <InfoRow label="Phone" value={selected.phone} icon={Phone} accent="bg-emerald-50" />
                      <InfoRow label="Gender" value={(selected as DriverDetail).gender} icon={UserCircle2} accent="bg-pink-50" />
                      <InfoRow label="Nationality" value={(selected as DriverDetail).nationality} icon={Globe} accent="bg-sky-50" />
                      <InfoRow label="NIN" value={(selected as DriverDetail).nin} icon={IdCard} accent="bg-amber-50" />
                    </div>
                  </section>

                  {/* Location */}
                  <section>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      </span>
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Location</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden px-2 py-1">
                      <InfoRow label="Region" value={selected.region} icon={MapPin} accent="bg-emerald-50" />
                      <InfoRow label="District" value={(selected as DriverDetail).district} icon={MapPin} accent="bg-teal-50" />
                      <InfoRow label="Operation area" value={selected.operationArea} icon={MapPin} accent="bg-cyan-50" />
                    </div>
                  </section>

                  {/* Vehicle */}
                  <section>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Car className="w-3.5 h-3.5 text-amber-600" />
                      </span>
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Vehicle &amp; Licence</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden px-2 py-1">
                      <InfoRow label="Vehicle type" value={selected.vehicleType} icon={Car} accent="bg-amber-50" />
                      <InfoRow label="Plate number" value={selected.plateNumber} icon={IdCard} accent="bg-orange-50" />
                      <InfoRow label="Licence number" value={selected.licenseNumber} icon={FileText} accent="bg-yellow-50" />
                      <InfoRow
                        label="VIP class"
                        value={selected.isVipDriver ? "VIP declared" : "Standard"}
                        icon={Star}
                        accent="bg-violet-50"
                      />
                    </div>
                  </section>

                  {/* Payment */}
                  <section>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                      </span>
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Payment</h3>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden px-2 py-1">
                      <InfoRow label="Payment phone" value={(selected as DriverDetail).paymentPhone} icon={Phone} accent="bg-indigo-50" />
                      <InfoRow
                        label="Phone verified"
                        value={selected.paymentVerified ? "Verified" : "Not verified"}
                        icon={BadgeCheck}
                        accent={selected.paymentVerified ? "bg-emerald-50" : "bg-red-50"}
                      />
                    </div>
                  </section>

                  {/* Documents */}
                  <section>
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                      </span>
                      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Uploaded Documents</h3>
                    </div>
                    <div className="space-y-2">
                      <DocLink label="Driving licence" url={payoutObj?.drivingLicenseUrl || selected.payout?.drivingLicenseUrl} />
                      <DocLink label="National ID" url={payoutObj?.nationalIdUrl || selected.payout?.nationalIdUrl} />
                      <DocLink label="LATRA Certificate" url={payoutObj?.latraUrl || payoutObj?.vehicleRegistrationUrl || selected.payout?.latraUrl || selected.payout?.vehicleRegistrationUrl} />

                      {/* Insurance — admin can upload */}
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        {(payoutObj?.insuranceUrl || selected.payout?.insuranceUrl) ? (
                          <a
                            href={payoutObj?.insuranceUrl || selected.payout?.insuranceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between py-3 px-4 hover:border-[#02665e]/40 hover:bg-emerald-50/60 transition-all group no-underline"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                              </span>
                              <span className="text-sm text-slate-700 group-hover:text-[#02665e] font-semibold transition-colors">Insurance</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 text-[#02665e] bg-emerald-50 group-hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors">
                                <Eye className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">View</span>
                              </div>
                            </div>
                          </a>
                        ) : (
                          <div className="flex items-center justify-between py-3 px-4 bg-slate-50">
                            <div className="flex items-center gap-2.5">
                              <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                              </span>
                              <span className="text-sm text-slate-500 font-medium">Insurance</span>
                            </div>
                            <span className="text-xs text-slate-300 italic font-medium">Not uploaded</span>
                          </div>
                        )}
                        {/* Admin upload button */}
                        <div className="border-t border-slate-100 px-4 py-2.5 bg-slate-50/60 flex items-center justify-between gap-3">
                          {insuranceUploadMsg && (
                            <span className={`text-xs font-medium ${insuranceUploadMsg.type === "success" ? "text-emerald-700" : "text-red-600"}`}>
                              {insuranceUploadMsg.text}
                            </span>
                          )}
                          <label className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                            uploadingInsurance
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                              : "bg-[#0e2a7a] hover:bg-[#0e2a7a]/90 text-white"
                          }`}>
                            {uploadingInsurance
                              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…</>
                              : <><UploadCloud className="w-3.5 h-3.5" /> {(payoutObj?.insuranceUrl || selected.payout?.insuranceUrl) ? "Replace" : "Upload Insurance"}</>}
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              disabled={uploadingInsurance}
                              className="hidden"
                              onChange={e => {
                                const f = e.target.files?.[0];
                                if (f) uploadInsuranceDoc(f);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>

            {/* Action bar */}
            <div className="border-t border-slate-100 px-4 py-4 bg-slate-50 space-y-3 flex-shrink-0 overflow-hidden">
              {/* Note / reason input */}
              {showNoteInput && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    {showNoteInput === "reject" ? "Rejection reason (sent to driver)" : "What information is needed? (sent to driver)"}
                  </label>
                  <textarea
                    rows={3}
                    value={actionNote}
                    onChange={e => setActionNote(e.target.value)}
                    placeholder={
                      showNoteInput === "reject"
                        ? "e.g. Driving licence image is not clear"
                        : "e.g. Please upload a clearer photo of your vehicle registration"
                    }
                    className="w-full block px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none resize-none bg-white box-border"
                  />
                  <div className="flex gap-2">
                    <button
                      disabled={actionLoading}
                      onClick={() => doAction(showNoteInput === "reject" ? "reject" : "request_info")}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-colors ${
                        showNoteInput === "reject"
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-[#02665e] hover:bg-[#02665e]/90 text-white"
                      } disabled:opacity-50`}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {showNoteInput === "reject" ? "Confirm Reject" : "Send Request"}
                    </button>
                    <button
                      onClick={() => { setShowNoteInput(null); setActionNote(""); }}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Main action buttons */}
              {!showNoteInput && (
                <div className="flex gap-2 flex-wrap">
                  {selected.kycStatus !== "APPROVED_KYC" && (
                    <button
                      disabled={actionLoading}
                      onClick={() => doAction("approve")}
                      className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve
                    </button>
                  )}

                  <button
                    disabled={actionLoading}
                    onClick={() => setShowNoteInput("request_info")}
                    className="flex-1 min-w-[130px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors disabled:opacity-50"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Request Info
                  </button>

                  {selected.kycStatus !== "REJECTED_KYC" && (
                    <button
                      disabled={actionLoading}
                      onClick={() => setShowNoteInput("reject")}
                      className="flex-1 min-w-[100px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  )}

                  {selected.kycStatus === "APPROVED_KYC" && (
                    <button
                      disabled={actionLoading}
                      onClick={() => setShowNoteInput("reject")}
                      className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-600 border border-slate-200 transition-colors disabled:opacity-50"
                    >
                      <ShieldX className="w-4 h-4" />
                      Revoke Approval
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
