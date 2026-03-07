"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Eye,
  FileText,
  Lock,
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
  href?: string
  externalUrl?: string | null
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

function getDocFileName(doc: DocumentRecord | null) {
  const meta = doc?.metadata as Record<string, unknown> | null | undefined
  const raw = meta?.fileName
  return typeof raw === "string" && raw.trim() ? raw : null
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

function StatCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className={`rounded-[28px] border px-5 py-5 shadow-sm ${tone}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  )
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-5 py-3 text-sm font-semibold transition-all",
        active
          ? "border-[#0d8f6f] bg-[#0d8f6f] text-white shadow-[0_12px_35px_rgba(13,143,111,0.24)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
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
      href: "/driver/management/license",
    },
    {
      key: "insurance",
      title: "Insurance",
      subtitle: "Coverage certificate synced from your driver profile.",
      icon: <Shield className="h-5 w-5" />,
      tint: "bg-amber-50 text-amber-700",
      doc: insuranceDoc,
      fallbackUrl: account?.insuranceUrl,
      href: "/driver/management/insurance",
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

  return (
    <div className="w-full max-w-full space-y-8 overflow-x-hidden pb-8">
      <section className="relative overflow-hidden rounded-[34px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(13,143,111,0.16),_transparent_35%),linear-gradient(135deg,_#f8f6ef_0%,_#ffffff_55%,_#eef8f2_100%)] px-6 py-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:px-8 lg:px-10">
        <div className="absolute -right-12 top-8 h-40 w-40 rounded-full bg-[#0d8f6f]/10 blur-3xl" aria-hidden />
        <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-amber-200/25 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#0d8f6f]/20 bg-[#0d8f6f]/10 text-[#0d8f6f]">
              <Settings className="h-7 w-7" aria-hidden />
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Management</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Review the records already attached to your driver profile, keep expiry-sensitive documents current, and access your account controls from one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-700">
              <span className="rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-sm">Profile-backed document state</span>
              <span className="rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-sm">Live expiry overview</span>
              <span className="rounded-full border border-white/70 bg-white/80 px-4 py-2 shadow-sm">Quick links to review pages</span>
            </div>
          </div>

          <div className="grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="On file" value={`${availableCount}/4`} tone="border-white/80 bg-white/80" />
            <StatCard label="Pending review" value={String(pendingCount)} tone="border-white/80 bg-white/80" />
            <StatCard label="Expiring soon" value={String(expiringCount)} tone="border-white/80 bg-white/80" />
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-slate-200 bg-white/95 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="flex flex-wrap gap-3">
          <TabButton active={tab === "documents"} onClick={() => setTab("documents")}>Documents</TabButton>
          <TabButton active={tab === "safety"} onClick={() => setTab("safety")}>Safety Measures</TabButton>
          <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>Settings</TabButton>
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
            <section className="grid gap-5 xl:grid-cols-[1.45fr_0.55fr]">
              <div className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-7">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Document vault</h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                      This view reads the latest document records already saved on your driver profile. If a file is missing here, update it on your profile and the management dashboard will reflect it.
                    </p>
                  </div>
                  <Link
                    href="/driver/profile"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                  >
                    <span>Open profile</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {docCards.map((card) => {
                    const fileUrl = card.doc?.url ?? card.fallbackUrl ?? null
                    const status = normalizeStatus(card.doc?.status)
                    const pill = statusPill(status, Boolean(fileUrl))
                    const PillIcon = pill.Icon
                    const expiry = getDocExpiry(card.doc)
                    const uploadedAt = getDocUploadedAt(card.doc)
                    const fileName = getDocFileName(card.doc)
                    const expiryRelative = formatRelativeDate(expiry)

                    return (
                      <article key={card.key} className="group rounded-[26px] border border-slate-200 bg-[linear-gradient(180deg,_#ffffff_0%,_#fbfbfc_100%)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_36px_rgba(15,23,42,0.08)]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${card.tint}`}>
                              {card.icon}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-lg font-semibold text-slate-950">{card.title}</h3>
                              <p className="mt-1 text-sm leading-6 text-slate-500">{card.subtitle}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${pill.className}`}>
                            <PillIcon className="h-3.5 w-3.5" />
                            {pill.label}
                          </span>
                        </div>

                        <div className="mt-5 space-y-3 rounded-[22px] border border-slate-100 bg-slate-50/80 p-4">
                          <div className="flex items-start justify-between gap-4 text-sm">
                            <span className="text-slate-500">File</span>
                            <span className="max-w-[60%] text-right font-medium text-slate-900">{fileName ?? (fileUrl ? "Stored on profile" : "Not uploaded")}</span>
                          </div>
                          <div className="flex items-start justify-between gap-4 text-sm">
                            <span className="text-slate-500">Submitted</span>
                            <span className="text-right font-medium text-slate-900">{uploadedAt ? formatDisplayDate(uploadedAt) : "Not recorded"}</span>
                          </div>
                          <div className="flex items-start justify-between gap-4 text-sm">
                            <span className="text-slate-500">Expiry</span>
                            <span className="text-right font-medium text-slate-900">{expiry ? formatDisplayDate(expiry) : "No expiry attached"}</span>
                          </div>
                          {expiryRelative && (
                            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                              <Calendar className="h-3.5 w-3.5" />
                              {expiryRelative}
                            </div>
                          )}
                        </div>

                        <div className="mt-5 flex flex-wrap gap-3">
                          {card.href && fileUrl ? (
                            <Link
                              href={card.href}
                              className="inline-flex items-center gap-2 rounded-full bg-[#0d8f6f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b7d61]"
                            >
                              <Eye className="h-4 w-4" />
                              Review file
                            </Link>
                          ) : card.externalUrl ? (
                            <a
                              href={card.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-[#0d8f6f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b7d61]"
                            >
                              <Eye className="h-4 w-4" />
                              Open file
                            </a>
                          ) : (
                            <Link
                              href="/driver/profile"
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <span>Upload on profile</span>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          )}
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <aside className="rounded-[30px] border border-slate-200 bg-[#0f172a] p-6 text-white shadow-[0_22px_48px_rgba(15,23,42,0.22)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Compliance pulse</h3>
                      <p className="mt-1 text-sm text-white/70">A quick operational view of your document readiness.</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Ready now</div>
                      <div className="mt-2 text-3xl font-semibold">{availableCount}</div>
                      <p className="mt-2 text-sm text-white/70">Records with an attached file and visible link.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Needs review</div>
                      <div className="mt-2 text-3xl font-semibold">{pendingCount}</div>
                      <p className="mt-2 text-sm text-white/70">Submitted files still awaiting final approval or correction.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Action lane</div>
                      <p className="mt-2 text-sm leading-6 text-white/75">
                        Keep licence and insurance documents current first. Those two records drive expiry reminders and admin follow-up.
                      </p>
                    </div>
                  </div>
                </aside>

                <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">Contract</h3>
                      <p className="mt-1 text-sm text-slate-500">Access the signed operating terms tied to your driver account.</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[22px] border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-500">Status</span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${contractUrl ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600"}`}>
                        {contractUrl ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                        {contractUrl ? "Available" : "Not available"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {contractUrl
                        ? "Your contract can be opened from the linked review page."
                        : "No contract file is exposed for self-service review yet."}
                    </p>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href="/driver/management/contract"
                      className="inline-flex items-center gap-2 rounded-full bg-[#0d8f6f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b7d61]"
                    >
                      <Eye className="h-4 w-4" />
                      Open contract
                    </Link>
                  </div>
                </article>
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
            <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-950">Security</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Password controls, sign-in protection, and account access settings.</p>
                <Link
                  href="/driver/security"
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#0d8f6f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b7d61]"
                >
                  <Eye className="h-4 w-4" />
                  Open security
                </Link>
              </article>

              <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <Truck className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-950">Vehicle profile</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Update core vehicle details and related registration records from your driver profile.</p>
                <Link
                  href="/driver/profile"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowRight className="h-4 w-4" />
                  Manage profile
                </Link>
              </article>

              <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm md:col-span-2 xl:col-span-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Settings className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-950">Profile records</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">If a document appears missing in management, the fix belongs in the main driver profile workflow.</p>
                <Link
                  href="/driver/profile"
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <ArrowRight className="h-4 w-4" />
                  Go to profile
                </Link>
              </article>
            </section>
          )}
        </>
      )}
    </div>
  )
}
