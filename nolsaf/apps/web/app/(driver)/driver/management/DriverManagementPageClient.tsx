"use client"

import React, { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileText,
  Lock,
  X,
  Settings,
  Shield,
  ShieldCheck,
  Truck,
  UserCircle,
} from "lucide-react"

type ManagementTab = "documents" | "safety" | "settings"

type DocumentRecord = {
  id?: number | string
  type?: string | null
  url?: string | null
  status?: string | null
  metadata?: Record<string, unknown> | null
  createdAt?: string | null
}

type AccountPayload = {
  documents?: DocumentRecord[]
  drivingLicenseUrl?: string | null
  insuranceUrl?: string | null
  latraUrl?: string | null
  nationalIdUrl?: string | null
}

type ContractPayload = {
  url?: string
}

type DocCardModel = {
  key: string
  title: string
  subtitle: string
  icon: React.ReactNode
  tint: string
  doc: DocumentRecord | null
  fallbackUrl?: string | null
  externalUrl?: string | null
}

type PreviewState = {
  title: string
  subtitle: string
  url: string
  metaLine: string
}

const LICENSE_TYPES = ["DRIVER_LICENSE", "DRIVING_LICENSE", "DRIVER_LICENCE", "DRIVING_LICENCE", "LICENSE"]
const INSURANCE_TYPES = ["INSURANCE"]
const NATIONAL_ID_TYPES = ["NATIONAL_ID", "ID", "PASSPORT"]
const VEHICLE_TYPES = ["VEHICLE_REGISTRATION", "LATRA", "VEHICLE_REG"]

function formatDisplayDate(value?: string | null) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function formatRelativeDate(value?: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`
  if (diffDays === 0) return "Due today"
  if (diffDays === 1) return "Due tomorrow"
  return `${diffDays} days remaining`
}

function normalizeStatus(status?: string | null) {
  const value = String(status ?? "").trim().toUpperCase()
  return value || "AVAILABLE"
}

function getLatestDoc(docs: DocumentRecord[] | undefined, types: string[]) {
  const normalized = new Set(types.map((type) => type.toUpperCase()))
  return (docs ?? []).find((doc) => normalized.has(String(doc?.type ?? "").toUpperCase())) ?? null
}

function getDocExpiry(doc: DocumentRecord | null) {
  const meta = doc?.metadata as Record<string, unknown> | null | undefined
  const raw = meta?.expiresAt ?? meta?.expiresOn ?? meta?.expires ?? meta?.expirationDate ?? meta?.expiration_date ?? meta?.expires_at
  return typeof raw === "string" ? raw : null
}

function getDocUploadedAt(doc: DocumentRecord | null) {
  const meta = doc?.metadata as Record<string, unknown> | null | undefined
  const raw = meta?.uploadedAt
  if (typeof raw === "string") return raw
  return doc?.createdAt ?? null
}

function isDocExpiringSoon(doc: DocumentRecord | null) {
  const expiry = getDocExpiry(doc)
  if (!expiry) return false
  const date = new Date(expiry)
  if (Number.isNaN(date.getTime())) return false
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000)
  return diffDays >= 0 && diffDays <= 45
}

function statusPill(status: string, hasFile: boolean) {
  if (!hasFile) {
    return {
      label: "Missing",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      Icon: AlertCircle,
    }
  }

  if (status === "APPROVED") {
    return {
      label: "Verified",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      Icon: CheckCircle2,
    }
  }

  if (status === "REJECTED") {
    return {
      label: "Needs attention",
      className: "border-rose-200 bg-rose-50 text-rose-700",
      Icon: AlertCircle,
    }
  }

  return {
    label: "Submitted",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    Icon: Shield,
  }
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15 flex flex-col gap-0.5">
      <span className="text-white/55 text-xs font-medium">{label}</span>
      <span className={`text-xl font-bold leading-tight tabular-nums ${accent ?? "text-white"}`}>{value}</span>
    </div>
  )
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200",
        active
          ? "bg-white text-[#02665e] shadow-sm"
          : "text-white/80 hover:text-white hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

export default function DriverManagementPageClient() {
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get("tab") ?? null
  const [tab, setTab] = useState<ManagementTab>("documents")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<AccountPayload | null>(null)
  const [contractUrl, setContractUrl] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)

  useEffect(() => {
    if (tabParam === "safety" || tabParam === "settings" || tabParam === "documents") {
      setTab(tabParam)
    }
  }, [tabParam])

  useEffect(() => {
    let mounted = true

    async function loadData() {
      setLoading(true)
      setError(null)

      try {
        const [accountRes, contractRes] = await Promise.allSettled([
          fetch("/api/account/me", { credentials: "include" }),
          fetch("/api/driver/contract", { credentials: "include" }),
        ])

        if (!mounted) return

        if (accountRes.status === "fulfilled") {
          if (!accountRes.value.ok) {
            throw new Error(`Failed to load management data (${accountRes.value.status})`)
          }
          const body = await accountRes.value.json()
          setAccount((body?.data ?? body) as AccountPayload)
        } else {
          throw accountRes.reason instanceof Error ? accountRes.reason : new Error("Failed to load management data")
        }

        if (contractRes.status === "fulfilled" && contractRes.value.ok) {
          const body = (await contractRes.value.json()) as ContractPayload
          setContractUrl(body?.url ?? null)
        } else {
          setContractUrl(null)
        }
      } catch (err: unknown) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : "Failed to load management data")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [])

  const documents = useMemo(() => (Array.isArray(account?.documents) ? account.documents : []), [account?.documents])

  const licenseDoc = useMemo(() => getLatestDoc(documents, LICENSE_TYPES), [documents])
  const insuranceDoc = useMemo(() => getLatestDoc(documents, INSURANCE_TYPES), [documents])
  const nationalIdDoc = useMemo(() => getLatestDoc(documents, NATIONAL_ID_TYPES), [documents])
  const vehicleDoc = useMemo(() => getLatestDoc(documents, VEHICLE_TYPES), [documents])

  const docCards = useMemo<DocCardModel[]>(() => ([
    {
      key: "license",
      title: "Driver Licence",
      subtitle: "Your licence number, expiry, and file record.",
      icon: <FileText className="h-5 w-5" />,
      tint: "bg-emerald-50 text-emerald-700",
      doc: licenseDoc,
      fallbackUrl: account?.drivingLicenseUrl,
    },
    {
      key: "insurance",
      title: "Insurance",
      subtitle: "Coverage certificate synced from your driver profile.",
      icon: <Shield className="h-5 w-5" />,
      tint: "bg-amber-50 text-amber-700",
      doc: insuranceDoc,
      fallbackUrl: account?.insuranceUrl,
    },
    {
      key: "national-id",
      title: "National ID",
      subtitle: "Identity proof used for compliance review.",
      icon: <UserCircle className="h-5 w-5" />,
      tint: "bg-sky-50 text-sky-700",
      doc: nationalIdDoc,
      fallbackUrl: account?.nationalIdUrl,
      externalUrl: nationalIdDoc?.url ?? account?.nationalIdUrl ?? null,
    },
    {
      key: "vehicle",
      title: "Vehicle Registration",
      subtitle: "Vehicle paperwork available for verification.",
      icon: <Truck className="h-5 w-5" />,
      tint: "bg-violet-50 text-violet-700",
      doc: vehicleDoc,
      fallbackUrl: account?.latraUrl,
      externalUrl: vehicleDoc?.url ?? account?.latraUrl ?? null,
    },
  ]), [account?.drivingLicenseUrl, account?.insuranceUrl, account?.latraUrl, account?.nationalIdUrl, insuranceDoc, licenseDoc, nationalIdDoc, vehicleDoc])

  const availableCount = docCards.filter((card) => Boolean(card.doc?.url ?? card.fallbackUrl)).length
  const pendingCount = docCards.filter((card) => {
    const hasFile = Boolean(card.doc?.url ?? card.fallbackUrl)
    return hasFile && normalizeStatus(card.doc?.status) !== "APPROVED"
  }).length
  const expiringCount = [licenseDoc, insuranceDoc].filter((doc) => isDocExpiringSoon(doc)).length

  function openPreview(card: DocCardModel, metaLine: string) {
    const url = card.doc?.url ?? card.fallbackUrl ?? card.externalUrl ?? null
    if (!url) return
    setPreview({
      title: card.title,
      subtitle: card.subtitle,
      url,
      metaLine,
    })
  }

  const previewUrl = preview?.url ?? null
  const previewLowerUrl = String(previewUrl ?? "").toLowerCase()
  const previewIsPdf = previewLowerUrl.endsWith(".pdf") || previewLowerUrl.includes(".pdf?")
  const previewIsImage = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"].some((ext) => previewLowerUrl.includes(ext))

  return (
    <div className="w-full max-w-full space-y-8 overflow-x-hidden pb-8">
      <section
        className="relative overflow-hidden rounded-2xl"
        style={{ background: "linear-gradient(135deg, #02665e 0%, #014e47 55%, #013d38 100%)", minHeight: 210 }}
      >
        {/* Dot-grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden
        />
        {/* Teal radial glow */}
        <div className="pointer-events-none absolute inset-x-0 -top-16 flex justify-center" aria-hidden>
          <div className="h-[320px] w-[320px] rounded-full" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 65%)" }} />
        </div>
        {/* Watermark gear — bottom-right */}
        <div className="pointer-events-none absolute -bottom-10 -right-10 opacity-[0.05]" aria-hidden>
          <Settings className="h-[220px] w-[220px] text-white" />
        </div>

        <div className="relative px-5 pt-7 pb-6 sm:px-8">
          <div className="flex flex-col items-center text-center">
            {/* Icon */}
            <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 shadow-lg backdrop-blur-sm mb-4">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Management</h1>
            <p className="mt-2 text-white/55 text-sm">Driver document control and account access in one place.</p>
          </div>

          {/* Stats tiles */}
          <div className="mx-auto mt-6 max-w-sm">
            <div className="grid grid-cols-3 gap-2.5">
              <StatCard label="On File" value={`${availableCount}/4`} />
              <StatCard label="Pending" value={String(pendingCount)} accent={pendingCount > 0 ? "text-amber-300" : undefined} />
              <StatCard label="Expiring" value={String(expiringCount)} accent={expiringCount > 0 ? "text-rose-300" : undefined} />
            </div>
          </div>

          {/* Tab selector */}
          <div className="mt-5 flex justify-center">
            <div className="flex gap-1 rounded-2xl border border-white/20 bg-black/20 p-1 backdrop-blur-sm">
              <TabButton active={tab === "documents"} onClick={() => setTab("documents")}>Documents</TabButton>
              <TabButton active={tab === "safety"} onClick={() => setTab("safety")}>Safety Measures</TabButton>
              <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>Settings</TabButton>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="h-6 w-44 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-[24px] border border-slate-100 p-5">
                  <div className="h-5 w-24 animate-pulse rounded-full bg-slate-100" />
                  <div className="mt-5 h-24 animate-pulse rounded-2xl bg-slate-50" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="h-6 w-32 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-4 h-48 animate-pulse rounded-[24px] bg-slate-50" />
          </div>
        </section>
      ) : error ? (
        <section className="rounded-[30px] border border-rose-200 bg-rose-50 p-6 text-rose-800 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <h2 className="text-base font-semibold">Management data could not be loaded</h2>
              <p className="mt-1 text-sm leading-6">{error}</p>
            </div>
          </div>
        </section>
      ) : (
        <>
          {tab === "documents" && (
            <section className="space-y-5">
              <div className="rounded-[28px] border border-slate-200/90 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">Documents</h2>
                    <p className="mt-1 text-sm text-slate-500">Compact view of your current driver records.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">{availableCount}/4 on file</span>
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700">{pendingCount} pending</span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">{expiringCount} expiring</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {docCards.map((card) => {
                  const fileUrl = card.doc?.url ?? card.fallbackUrl ?? null
                  const status = normalizeStatus(card.doc?.status)
                  const pill = statusPill(status, Boolean(fileUrl))
                  const PillIcon = pill.Icon
                  const expiry = getDocExpiry(card.doc)
                  const uploadedAt = getDocUploadedAt(card.doc)
                  const expiryRelative = formatRelativeDate(expiry)
                  const metaLine = expiry
                    ? `Expires ${formatDisplayDate(expiry)}`
                    : uploadedAt
                      ? `Updated ${formatDisplayDate(uploadedAt)}`
                      : fileUrl
                        ? "Document on file"
                        : "Not uploaded yet"

                  return (
                    <article key={card.key} className="relative overflow-hidden rounded-[26px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_52px_rgba(15,23,42,0.10)]">
                      <div
                        className={`pointer-events-none absolute inset-y-0 left-0 w-[3px] ${card.key === "license" ? "bg-emerald-400" : card.key === "insurance" ? "bg-amber-400" : card.key === "national-id" ? "bg-sky-400" : "bg-violet-400"}`}
                        aria-hidden
                      />
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] ring-1 ring-black/5 ${card.tint}`}>
                            {card.icon}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-950">{card.title}</h3>
                            <p className="mt-1 max-w-[18rem] text-sm leading-6 text-slate-500">{card.subtitle}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${pill.className}`}>
                          <PillIcon className="h-3.5 w-3.5" />
                          {pill.label}
                        </span>
                      </div>

                      <div className="mt-5 rounded-[20px] border border-slate-100 bg-white/75 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                        <div className="text-sm font-medium text-slate-900">{metaLine}</div>
                        {expiryRelative ? <div className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-700">{expiryRelative}</div> : null}
                      </div>

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{fileUrl ? "Ready to review" : "Profile update needed"}</div>
                        {fileUrl ? (
                          <button
                            type="button"
                            onClick={() => openPreview(card, metaLine)}
                            className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f2d68_0%,#0c6b5f_100%)] px-4 py-2 text-sm font-semibold text-white no-underline shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:brightness-105"
                          >
                            <Eye className="h-4 w-4" />
                            Open
                          </button>
                        ) : (
                          <Link
                            href="/driver/profile"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            Update
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    </article>
                  )
                })}

                <article className="relative overflow-hidden rounded-[26px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_24px_52px_rgba(15,23,42,0.10)]">
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-teal-400" aria-hidden />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-700 ring-1 ring-black/5">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-950">Contract</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-500">Signed operating terms for your driver account.</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${contractUrl ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
                      {contractUrl ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                      {contractUrl ? "Available" : "Unavailable"}
                    </span>
                  </div>

                  <div className="mt-5 rounded-[20px] border border-slate-100 bg-white/75 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <div className="text-sm font-medium text-slate-900">
                      {contractUrl ? "Contract file ready to review" : "No contract file exposed yet"}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Contract access</div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!contractUrl) return
                        setPreview({
                          title: "Contract",
                          subtitle: "Signed operating terms for your driver account.",
                          url: contractUrl,
                          metaLine: contractUrl ? "Contract file ready to review" : "No contract file exposed yet",
                        })
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f2d68_0%,#0c6b5f_100%)] px-4 py-2 text-sm font-semibold text-white no-underline shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:brightness-105"
                      disabled={!contractUrl}
                    >
                      <Eye className="h-4 w-4" />
                      Open
                    </button>
                  </div>
                </article>
              </div>

              <div className="flex justify-end">
                <Link
                  href="/driver/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Manage profile records
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          )}

          {tab === "safety" && (
            <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-[30px] border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Safety posture</h2>
                    <p className="mt-1 text-sm text-slate-500">Operational guidance and compliance cues that support safe driving standards.</p>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/70 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">Current standing</div>
                    <div className="mt-3 text-xl font-semibold text-slate-950">No active safety incidents</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">There are no visible incidents or disciplinary records surfaced on this dashboard right now.</p>
                  </div>
                  <div className="rounded-[24px] border border-amber-100 bg-amber-50/70 p-5">
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Preventive focus</div>
                    <div className="mt-3 text-xl font-semibold text-slate-950">Keep expiry-sensitive docs current</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Licence and insurance updates reduce avoidable safety and compliance interruptions.</p>
                  </div>
                </div>
              </article>

              <article className="rounded-[30px] border border-slate-200 bg-[linear-gradient(180deg,_#fffef9_0%,_#ffffff_100%)] p-7 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-950">Checklist</h3>
                <div className="mt-5 space-y-3">
                  {[
                    "Check that your licence details match the latest uploaded file.",
                    "Renew insurance before the listed expiry date.",
                    "Review admin reminders if the operations team flags a document issue.",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                      <p className="text-sm leading-6 text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          )}

          {tab === "settings" && (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-700 ring-1 ring-black/5">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">Security</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Password controls and account protection.</p>
                <Link
                  href="/driver/security"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f2d68_0%,#0c6b5f_100%)] px-4 py-2 text-sm font-semibold text-white no-underline shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:brightness-105"
                >
                  <Eye className="h-4 w-4" />
                  Open security
                </Link>
              </article>

              <article className="rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-sky-50 text-sky-700 ring-1 ring-black/5">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">Vehicle profile</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Update vehicle and registration details.</p>
                <Link
                  href="/driver/profile"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowRight className="h-4 w-4" />
                  Manage profile
                </Link>
              </article>

              <article className="rounded-[24px] border border-slate-200/90 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)] md:col-span-2 xl:col-span-1">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-amber-50 text-amber-700 ring-1 ring-black/5">
                  <Settings className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">Profile records</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Use the main profile flow if a record is missing here.</p>
                <Link
                  href="/driver/profile"
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowRight className="h-4 w-4" />
                  Go to profile
                </Link>
              </article>
            </section>
          )}
        </>
      )}

      {preview ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={preview.title}>
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{preview.title}</h2>
                <p className="mt-1 text-sm text-slate-500">{preview.metaLine}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-auto bg-slate-50 p-4 sm:p-5">
              {previewIsPdf ? (
                <iframe src={preview.url} title={preview.title} className="h-[78vh] min-h-[520px] w-full rounded-[20px] border border-slate-200 bg-white" />
              ) : previewIsImage ? (
                <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white p-3">
                  <div className="relative h-[72vh] min-h-[420px] w-full">
                    <Image src={preview.url} alt={preview.title} fill className="object-contain" />
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[20px] border border-slate-200 bg-white p-8 text-center">
                  <FileText className="h-10 w-10 text-slate-400" />
                  <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">This file type cannot be previewed inline here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
