"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import axios from "axios";
import Image from "next/image";
import { ArrowLeft, Briefcase, Clock, Globe, GraduationCap, Mail, MapPin, Phone, UserRound, ArrowRight, Pencil, Plus, Eye, X, Info } from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";

const api = axios.create({ baseURL: "", withCredentials: true });

type AccountMe = {
  id: number;
  role?: string;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  nationality?: string | null;
  region?: string | null;
  district?: string | null;
  timezone?: string | null;
  documents?: Array<{
    id: number;
    type?: string | null;
    url?: string | null;
    status?: string | null;
    metadata?: any;
    createdAt?: string | null;
  }>;
};

type AgentMe = {
  ok: boolean;
  agent?: {
    id: number;
    status?: string;
    level?: string | null;
    educationLevel?: string | null;
    areasOfOperation?: any;
    languages?: any;
    yearsOfExperience?: number | null;
    specializations?: any;
    bio?: string | null;
    isAvailable?: boolean | null;
    maxActiveRequests?: number | null;
    currentActiveRequests?: number | null;
    employmentCommencedAt?: string | null;
    employmentType?: string | null;
    employmentTitle?: string | null;
    user?: { id: number; name?: string | null; fullName?: string | null; email?: string | null; phone?: string | null; nationality?: string | null; region?: string | null; district?: string | null };
  };
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function asStringList(value: any): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return [];
}

function InfoItem({
  icon,
  label,
  value,
  accent = "brand",
  tone = "light",
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accent?: "brand" | "amber";
  tone?: "light" | "dark";
}) {
  const isDark = tone === "dark";

  const iconWrapClass = isDark
    ? accent === "amber"
      ? "h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-300/20 flex items-center justify-center text-amber-200"
      : "h-10 w-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand-200"
    : accent === "amber"
      ? "h-10 w-10 rounded-2xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-amber-600"
      : "h-10 w-10 rounded-2xl bg-brand/5 border border-brand/15 flex items-center justify-center text-brand";

  return (
    <div className="flex items-start gap-3">
      <div className={iconWrapClass}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className={isDark ? "text-xs font-semibold text-white/60" : "text-xs font-semibold text-slate-600"}>{label}</div>
        <div className={isDark ? "text-sm font-bold text-white mt-0.5 break-words" : "text-sm font-bold text-slate-900 mt-0.5 break-words"}>{value}</div>
      </div>
    </div>
  );
}

function PillList({ items, tone = "light" }: { items: string[]; tone?: "light" | "dark" }) {
  const isDark = tone === "dark";
  if (!items.length) return <div className={isDark ? "text-sm text-white/60" : "text-sm text-slate-600"}>—</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((t, idx) => (
        <span
          key={`${t}-${idx}`}
          className={
            isDark
              ? "inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80"
              : "inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800"
          }
        >
          {t}
        </span>
      ))}
    </div>
  );
}

export default function AgentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [account, setAccount] = useState<AccountMe | null>(null);
  const [agent, setAgent] = useState<AgentMe["agent"] | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSuccess, setPhotoSuccess] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [docUploading, setDocUploading] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [docDragOver, setDocDragOver] = useState(false);
  const [docPreview, setDocPreview] = useState<{ type?: string; label: string; url: string; contentType?: string | null } | null>(null);
  const [docBlockedForPrint, setDocBlockedForPrint] = useState(false);
  const [docHelpOpen, setDocHelpOpen] = useState(false);
  const docHelpRef = useRef<HTMLDivElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [selectedDocType, setSelectedDocType] = useState<string>("");

  const requiredDocTypes = useMemo(
    () =>
      [
        { type: "ACADEMIC_CERTIFICATES", label: "Academic certificates" },
        { type: "NDA", label: "Signed NDA" },
        { type: "NATIONAL_ID_OR_PASSPORT", label: "National ID / Travel Passport" },
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

  const displayName = useMemo(() => account?.fullName || account?.name || agent?.user?.name || "—", [account, agent]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setAuthRequired(false);

        const [meRes, agentRes] = await Promise.all([
          api.get("/api/account/me"),
          api.get("/api/agent/me").catch(() => ({ data: null })),
        ]);

        if (!alive) return;

        const meData = (meRes as any)?.data?.data ?? (meRes as any)?.data;
        setAccount(meData || null);
        setAgent((agentRes as any)?.data?.agent ?? null);
      } catch (e: any) {
        if (!alive) return;
        if (e?.response?.status === 401) {
          setAuthRequired(true);
          setAccount(null);
          setAgent(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const areas = asStringList(agent?.areasOfOperation);
  const langs = asStringList(agent?.languages);
  const specs = asStringList(agent?.specializations);

  const avatarUrl = account?.avatarUrl || null;
  const needsPhoto = !avatarUrl;

  const requiredDocsOk = useMemo(() => {
    return requiredDocTypes.every((t) => {
      const doc = getLatestDocByType(account?.documents, t.type);
      const hasUrl = Boolean(doc?.url);
      const status = (doc?.status ? String(doc.status) : "").toUpperCase();
      if (!hasUrl) return false;
      if (status === "REJECTED") return false;
      return true;
    });
  }, [account?.documents, requiredDocTypes]);

  const profileCompletion = useMemo(() => {
    const checks: Array<boolean> = [
      Boolean(avatarUrl),
      Boolean(displayName && displayName !== "—"),
      Boolean(account?.email || agent?.user?.email),
      Boolean(account?.phone || agent?.user?.phone),
      Boolean(account?.nationality || agent?.user?.nationality),
      Boolean(account?.region || agent?.user?.region),
      Boolean(account?.district || agent?.user?.district),
      areas.length > 0,
      langs.length > 0,
      requiredDocsOk,
    ];

    const total = checks.length;
    const done = checks.filter(Boolean).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { pct, done, total };
  }, [
    account?.district,
    account?.email,
    account?.nationality,
    account?.phone,
    account?.region,
    agent?.user?.district,
    agent?.user?.email,
    agent?.user?.nationality,
    agent?.user?.phone,
    agent?.user?.region,
    areas.length,
    avatarUrl,
    displayName,
    langs.length,
    requiredDocsOk,
  ]);

  const completionTone = useMemo(() => {
    const pct = profileCompletion.pct;
    if (pct >= 80) return "good" as const;
    if (pct >= 50) return "warn" as const;
    return "bad" as const;
  }, [profileCompletion.pct]);

  const onUploadPhoto = async (file: File | null) => {
    if (!file) return;
    setPhotoError(null);
    setPhotoSuccess(null);

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please choose an image file (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setPhotoError("Image is too large. Maximum size is 10MB.");
      return;
    }

    try {
      setPhotoUploading(true);
      const url = await uploadToCloudinary(file, "avatars");
      await api.put("/api/account/profile", { avatarUrl: url });
      setAccount((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
      try {
        window.dispatchEvent(new CustomEvent("account:avatarUrl", { detail: { avatarUrl: url } }));
      } catch {
        // ignore
      }
      setPhotoSuccess("Photo updated.");
    } catch (e: any) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setPhotoError(String(serverMsg || e?.message || "Failed to upload photo"));
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  function getLatestDocByType(docs: AccountMe["documents"], type: string) {
    const normalizedType = String(type).toUpperCase();
    const items = Array.isArray(docs) ? docs : [];
    for (const d of items) {
      if (String(d?.type ?? "").toUpperCase() === normalizedType) return d;
    }
    return null;
  }

  const allowedDocTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ]);

  const uploadDocumentForType = async (type: string, file: File | null) => {
    if (!file || !type) return;

    setDocError(null);
    setDocSuccess(null);

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
      const url = await uploadToCloudinary(file, "agent-documents");
      const resp = await api.put("/api/account/documents", {
        type,
        url,
        metadata: {
          fileName: file.name,
          contentType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        },
      });

      const saved = (resp as any)?.data?.data?.doc ?? (resp as any)?.data?.doc ?? null;

      setAccount((prev) => {
        if (!prev) return prev;
        const docs = Array.isArray(prev.documents) ? prev.documents : [];
        return {
          ...prev,
          documents: saved ? [saved, ...docs] : docs,
        };
      });

      setDocSuccess("Document uploaded.");
    } catch (e: any) {
      const serverMsg = e?.response?.data?.error || e?.response?.data?.message;
      setDocError(serverMsg || "Failed to upload document. Please try again.");
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
    return requiredDocTypes.filter((t) => {
      const doc = getLatestDocByType(account?.documents, t.type);
      const hasUrl = Boolean(doc?.url);
      const status = (doc?.status ? String(doc.status) : "").toUpperCase();

      if (!hasUrl) return true;
      if (status === "REJECTED") return true;
      return false;
    });
  }, [account?.documents, requiredDocTypes]);

  const showUploader = actionableDocTypes.length > 0;

  useEffect(() => {
    if (!selectedDocType) return;
    const stillSelectable = actionableDocTypes.some((t) => t.type === selectedDocType);
    if (!stillSelectable) setSelectedDocType("");
  }, [actionableDocTypes, selectedDocType]);

  useEffect(() => {
    if (!docPreview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDocPreview(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [docPreview]);

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

  useEffect(() => {
    const isConfidential = String(docPreview?.type ?? "").toUpperCase() === "NDA";
    if (!docPreview || !isConfidential) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = String(e.key || "").toLowerCase();
      const combo = e.ctrlKey || e.metaKey;
      if (!combo) return;

      if (key === "p" || key === "c" || key === "x" || key === "s") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onBeforePrint = () => {
      setDocBlockedForPrint(true);
    };

    const onAfterPrint = () => {
      setDocBlockedForPrint(false);
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [docPreview]);

  return (
    <div className="w-full py-2 sm:py-4">
      {docPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`${docPreview.label} preview`}>
          <style>{"@media print { .nolsaf-confidential { display:none !important; } }"}</style>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDocPreview(null)} aria-hidden />
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-4">
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{docPreview.label}</div>
                <div className="text-xs text-slate-600 mt-0.5">Preview</div>
              </div>
              <button
                type="button"
                onClick={() => setDocPreview(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              >
                <span className="sr-only">Close</span>
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="p-3 sm:p-4">
              {(() => {
                const contentType = String(docPreview.contentType ?? "").toLowerCase();
                const url = docPreview.url;
                const isPdf = contentType === "application/pdf" || url.toLowerCase().includes(".pdf");
                const isConfidential = String(docPreview.type ?? "").toUpperCase() === "NDA";

                if (docBlockedForPrint && isConfidential) {
                  return (
                    <div className="w-full h-[70vh] rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                      <div className="text-sm text-slate-700">Confidential document. Printing is disabled.</div>
                    </div>
                  );
                }

                if (isPdf) {
                  return (
                    <div className={
                      isConfidential
                        ? "relative w-full h-[70vh] rounded-xl border border-slate-200 bg-white overflow-hidden nolsaf-confidential select-none"
                        : "relative w-full h-[70vh] rounded-xl border border-slate-200 bg-white overflow-hidden"
                    }>
                      {isConfidential ? (
                        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                          <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 place-items-center gap-16">
                            {Array.from({ length: 9 }).map((_, idx) => (
                              <div
                                key={idx}
                                className="select-none -rotate-12 text-slate-900/10 font-extrabold tracking-widest uppercase text-lg sm:text-xl"
                              >
                                CONFIDENTIAL
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <iframe
                        title={`${docPreview.label} document`}
                        src={url}
                        className="relative z-10 w-full h-full"
                      />
                    </div>
                  );
                }

                return (
                  <div className={
                    isConfidential
                      ? "relative w-full h-[70vh] rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden nolsaf-confidential select-none"
                      : "relative w-full h-[70vh] rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden"
                  }>
                    {isConfidential ? (
                      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                        <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 place-items-center gap-16">
                          {Array.from({ length: 9 }).map((_, idx) => (
                            <div
                              key={idx}
                              className="select-none -rotate-12 text-slate-900/10 font-extrabold tracking-widest uppercase text-lg sm:text-xl"
                            >
                              CONFIDENTIAL
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={docPreview.label} className="relative z-10 max-h-[70vh] w-full object-contain" />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 relative rounded-3xl border border-white/10 bg-slate-950 shadow-card overflow-hidden">
        <div
          className="absolute inset-0 bg-gradient-to-br from-brand/20 via-slate-950 to-slate-900"
          aria-hidden
        />
        <div className="relative p-5 sm:p-7">
          <div className="relative min-h-10">
            <Link
              href="/account/agent"
              aria-label="Back"
              className="absolute left-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 shadow-card transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Link>

            <div
              className="absolute right-0 top-0 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur"
              aria-label={`Profile completion ${profileCompletion.pct}%`}
            >
              <div className="relative h-11 w-11">
                <svg viewBox="0 0 36 36" className="h-11 w-11" aria-hidden>
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                      className="text-white/10"
                    strokeWidth="3.5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="16"
                    fill="none"
                    stroke="currentColor"
                    className={
                      completionTone === "good"
                        ? "text-emerald-600"
                        : completionTone === "warn"
                          ? "text-amber-500"
                          : "text-rose-600"
                    }
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    pathLength="100"
                    strokeDasharray={`${profileCompletion.pct} 100`}
                    transform="rotate(-90 18 18)"
                  />
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-xs font-bold text-white tabular-nums">{profileCompletion.pct}%</div>
                </div>
              </div>

              <div className="hidden sm:block text-left">
                <div className="text-[11px] font-semibold text-white/70 leading-tight">Profile status</div>
                <div className="text-[11px] font-semibold text-white/60 leading-tight">
                  {profileCompletion.done}/{profileCompletion.total} items
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-2xl px-12 sm:px-16">
              <div className="pt-0.5 text-center">
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight leading-tight">My Profile</h1>
                <p className="mt-2 text-sm sm:text-base text-white/70 leading-relaxed">
                  Personal details, specialization, and employment context.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LogoSpinner size="lg" className="mb-4" ariaLabel="Loading profile" />
          <p className="text-sm text-slate-600">Loading profile...</p>
        </div>
      ) : authRequired ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <div className="text-sm font-bold text-slate-900">Sign in required</div>
          <div className="text-sm text-slate-600 mt-1">Log in to view your agent profile.</div>
          <div className="mt-4">
            <Link
              href="/account/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold no-underline hover:bg-brand-700 shadow-card transition-colors"
            >
              Sign in
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">
              <div>
                <div className="text-sm font-bold text-slate-900">Personal details</div>
                <div className="text-sm text-slate-600 mt-1">Contact and location details.</div>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-100">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="relative h-14 w-14 rounded-full border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="Profile photo" fill sizes="56px" className="object-cover" />
                    ) : (
                      <UserRound className="h-6 w-6 text-slate-400" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 truncate">Profile photo</div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {needsPhoto ? "Required: upload your current photo." : "Keep your photo up to date."}
                    </div>
                    {photoError ? <div className="text-xs text-rose-600 mt-1">{photoError}</div> : null}
                    {photoSuccess ? <div className="text-xs text-emerald-600 mt-1">{photoSuccess}</div> : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onUploadPhoto(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                    className="group inline-flex items-center justify-center border-0 bg-transparent p-0 m-0 appearance-none text-emerald-700 disabled:opacity-60 focus:outline-none focus-visible:outline-none"
                  >
                    <span className="sr-only">{needsPhoto ? "Upload photo" : "Change photo"}</span>
                    {photoUploading ? (
                      <span className="h-4 w-4 rounded-full border-2 border-emerald-200 border-t-emerald-700 animate-spin" aria-hidden />
                    ) : (
                      <Pencil className="h-4 w-4 transition-colors duration-150 group-hover:text-emerald-800" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-5 grid grid-cols-2 gap-4">
              <InfoItem icon={<UserRound className="w-5 h-5" aria-hidden />} label="Full name" value={displayName} />
              <InfoItem icon={<Mail className="w-5 h-5" aria-hidden />} label="Email" value={account?.email || agent?.user?.email || "—"} />
              <InfoItem icon={<Phone className="w-5 h-5" aria-hidden />} label="Phone" value={account?.phone || agent?.user?.phone || "—"} />
              <InfoItem icon={<Globe className="w-5 h-5" aria-hidden />} label="Nationality" value={account?.nationality || agent?.user?.nationality || "—"} />
              <InfoItem icon={<MapPin className="w-5 h-5" aria-hidden />} label="Region" value={account?.region || agent?.user?.region || "—"} />
              <InfoItem icon={<MapPin className="w-5 h-5" aria-hidden />} label="District" value={account?.district || agent?.user?.district || "—"} />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">
              <div className="text-sm font-bold text-slate-900">Employment</div>
              <div className="text-sm text-slate-600 mt-1">Role and employment metadata.</div>
            </div>
            <div className="p-5 sm:p-6 grid grid-cols-2 gap-4">
              <InfoItem icon={<Briefcase className="w-5 h-5" aria-hidden />} label="Employment title" value={agent?.employmentTitle || "—"} />
              <InfoItem icon={<Briefcase className="w-5 h-5" aria-hidden />} label="Employment type" value={agent?.employmentType || "—"} />
              <InfoItem icon={<Briefcase className="w-5 h-5" aria-hidden />} label="Employment commenced" value={formatDate(agent?.employmentCommencedAt)} />
              <InfoItem icon={<Briefcase className="w-5 h-5" aria-hidden />} label="Agent level" value={agent?.level || "—"} />
            </div>
          </div>

          <div className="lg:col-span-6 relative rounded-2xl border border-white/10 bg-slate-950/70 shadow-card overflow-hidden backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/20 via-slate-950/80 to-slate-950" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />

            <div className="relative p-5 sm:p-6 border-b border-white/10 bg-white/5">
              <div className="text-sm font-bold text-white">Specialization</div>
              <div className="text-sm text-white/70 mt-1">Your specialization focus and experience.</div>
            </div>
            <div className="relative p-5 sm:p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem tone="dark" accent="amber" icon={<GraduationCap className="w-5 h-5" aria-hidden />} label="Education level" value={agent?.educationLevel || "—"} />
                <InfoItem tone="dark" accent="amber" icon={<Clock className="w-5 h-5" aria-hidden />} label="Years of experience" value={typeof agent?.yearsOfExperience === "number" ? agent.yearsOfExperience : "—"} />
              </div>

              <div>
                <div className="text-xs font-semibold text-white/60">Specializations</div>
                <div className="mt-2">
                  <PillList tone="dark" items={specs} />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-white/60">Bio</div>
                <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
                  {agent?.bio ? agent.bio : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 relative rounded-2xl border border-white/10 bg-slate-950/70 shadow-card overflow-hidden backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/15 via-slate-950/85 to-slate-950" aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/10 to-transparent" aria-hidden />

            <div className="relative p-5 sm:p-6 border-b border-white/10 bg-white/5">
              <div className="text-sm font-bold text-white">Operations</div>
              <div className="text-sm text-white/70 mt-1">Areas of operation and languages.</div>
            </div>
            <div className="relative p-5 sm:p-6 space-y-5">
              <div>
                <div className="text-xs font-semibold text-white/60">Areas of operation</div>
                <div className="mt-2">
                  <PillList tone="dark" items={areas} />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-white/60">Languages</div>
                <div className="mt-2">
                  <PillList tone="dark" items={langs} />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">
              <div className="text-sm font-bold text-slate-900">Work capacity</div>
              <div className="text-sm text-slate-600 mt-1">Availability and workload.</div>
            </div>
            <div className="p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold text-slate-600">Availability</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{agent?.isAvailable === null || agent?.isAvailable === undefined ? "—" : agent.isAvailable ? "Available" : "Not available"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold text-slate-600">Max active requests</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{typeof agent?.maxActiveRequests === "number" ? agent.maxActiveRequests : "—"}</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="text-xs font-semibold text-slate-600">Current active requests</div>
                <div className="text-sm font-bold text-slate-900 mt-1">{typeof agent?.currentActiveRequests === "number" ? agent.currentActiveRequests : "—"}</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-12 rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-200 bg-slate-50/60">
              <div ref={docHelpRef} className="relative inline-flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Required documents help"
                  aria-expanded={docHelpOpen}
                  aria-controls="required-docs-help"
                  onClick={() => setDocHelpOpen((v) => !v)}
                  className="inline-flex items-center justify-center border-0 bg-transparent p-0 m-0 appearance-none text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 rounded"
                >
                  <Info className="h-4 w-4" aria-hidden />
                </button>
                <div className="text-sm font-bold text-slate-900">Required documents</div>

                {docHelpOpen && (
                  <div
                    id="required-docs-help"
                    role="tooltip"
                    className="absolute left-0 top-full mt-2 w-[min(340px,calc(100vw-3rem))] rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-card"
                  >
                    <div className="font-semibold text-slate-900">Upload your documents</div>
                    <div className="mt-1 text-slate-600">Clear scan/photo. Supported: PDF, JPG, PNG, WebP.</div>
                    <div className="mt-2 text-slate-600">Please upload exactly what we asked for.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <input
                ref={docInputRef}
                type="file"
                className="hidden"
                accept="application/pdf,image/*"
                onChange={(e) => onUploadDocumentFromPicker(e.target.files?.[0] ?? null)}
              />

              {(docError || docSuccess) && (
                <div className="space-y-1">
                  {docError && <div className="text-sm text-rose-700">{docError}</div>}
                  {docSuccess && <div className="text-sm text-emerald-700">{docSuccess}</div>}
                </div>
              )}

              {showUploader && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                    <div className="lg:col-span-4">
                      <div className="text-xs font-semibold text-slate-600">Document type</div>
                      <select
                        value={selectedDocType}
                        onChange={(e) => setSelectedDocType(e.target.value)}
                        disabled={actionableDocTypes.length === 0}
                        className="mt-2 w-full h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                      >
                        <option value="">Select document</option>
                        {actionableDocTypes.map((t) => (
                          <option key={t.type} value={t.type}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <div className="text-xs text-slate-600 mt-2 leading-relaxed">Choose what you want to upload, then drag & drop (or click).</div>
                    </div>

                    <div className="lg:col-span-8">
                      {(() => {
                        const selectedMeta = requiredDocTypes.find((t) => t.type === selectedDocType) ?? null;
                        const selectedDoc = selectedDocType ? getLatestDocByType(account?.documents, selectedDocType) : null;
                        const hasSelectedUrl = Boolean(selectedDoc?.url);
                        const isUploading = docUploading != null;
                        const disabled = isUploading || !selectedDocType || actionableDocTypes.length === 0;
                        const dropzoneClass =
                          "w-full rounded-2xl border-2 border-dashed px-4 py-4 sm:py-5 transition " +
                          (disabled
                            ? "border-slate-200 bg-slate-50/60 opacity-70"
                            : docDragOver
                              ? "border-brand bg-brand/5"
                              : "border-slate-200 bg-slate-50/60 hover:bg-slate-50");

                        return (
                          <div>
                            <div
                              role="button"
                              tabIndex={0}
                              aria-label={selectedMeta ? (hasSelectedUrl ? `Replace ${selectedMeta.label}` : `Upload ${selectedMeta.label}`) : "Upload document"}
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
                                const dropped = e.dataTransfer?.files?.[0] ?? null;
                                void uploadDocumentForType(selectedDocType, dropped);
                              }}
                            >
                              <div className="flex items-center justify-center gap-3 text-center">
                                <div className="h-10 w-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-brand shrink-0">
                                  <Plus className="w-5 h-5" aria-hidden />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-900">
                                    {isUploading ? "Uploading…" : !selectedDocType ? "Select a document type to upload" : "Drag & drop to upload"}
                                  </div>
                                  <div className="text-xs font-semibold text-slate-600 mt-0.5">or click to browse</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {requiredDocTypes.map((item) => {
                  const doc = getLatestDocByType(account?.documents, item.type);
                  const status = (doc?.status ? String(doc.status) : "").toUpperCase();
                  const hasUrl = Boolean(doc?.url);
                  const statusText = hasUrl ? (status || "PENDING") : "NOT_UPLOADED";

                  const badgeClass =
                    statusText === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : statusText === "REJECTED"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : statusText === "PENDING"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-50 text-slate-700 border-slate-200";

                  return (
                    <div key={item.type} className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900 leading-snug">{item.label}</div>
                        </div>
                        {hasUrl && typeof doc?.url === "string" && (
                          <button
                            type="button"
                            aria-label={`View ${item.label}`}
                            className="inline-flex items-center justify-center border-0 bg-transparent p-0 m-0 appearance-none text-brand hover:text-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 rounded-lg"
                            onClick={() => setDocPreview({ type: item.type, label: item.label, url: doc.url as string, contentType: doc?.metadata?.contentType ?? null })}
                          >
                            <Eye className="w-5 h-5" aria-hidden />
                          </button>
                        )}
                      </div>

                      <div className="mt-2">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                          {statusText === "NOT_UPLOADED" ? "Not uploaded" : statusText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
