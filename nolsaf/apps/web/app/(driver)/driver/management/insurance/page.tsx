"use client"

import React, { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AlertCircle, ChevronLeft, FileText, Shield, ShieldCheck } from "lucide-react"
import DriverPageHeader from "@/components/DriverPageHeader"

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
  insuranceUrl?: string | null
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "Not recorded"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function getInsuranceDoc(docs: DocumentRecord[] | undefined) {
  return (docs ?? []).find((doc) => String(doc?.type ?? "").toUpperCase() === "INSURANCE") ?? null
}

function getMetaString(doc: DocumentRecord | null, keys: string[]) {
  const meta = doc?.metadata as Record<string, unknown> | null | undefined
  for (const key of keys) {
    const value = meta?.[key]
    if (typeof value === "string" && value.trim()) return value
  }
  return null
}

export default function InsurancePage() {
  const [loading, setLoading] = useState(true)
  const [insuranceDoc, setInsuranceDoc] = useState<DocumentRecord | null>(null)
  const [insuranceUrl, setInsuranceUrl] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadInsurance() {
      setLoading(true)
      setUnauthorized(false)
      setError(null)

      try {
        const res = await fetch("/api/account/me", { credentials: "include" })

        if (!mounted) return

        if (res.status === 401) {
          setUnauthorized(true)
          setLoading(false)
          return
        }

        if (!res.ok) {
          setError(`Failed to load insurance (status ${res.status})`)
          setLoading(false)
          return
        }

        const body = await res.json()
        const account = (body?.data ?? body) as AccountPayload
        const doc = getInsuranceDoc(account.documents)
        const url = doc?.url ?? account?.insuranceUrl ?? null

        setInsuranceDoc(doc)
        setInsuranceUrl(url)
        if (!url) setError("No insurance file is currently attached to your profile.")
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load insurance")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadInsurance()
    return () => {
      mounted = false
    }
  }, [])

  const fileName = useMemo(() => getMetaString(insuranceDoc, ["fileName"]), [insuranceDoc])
  const uploadedAt = useMemo(() => getMetaString(insuranceDoc, ["uploadedAt"]) ?? insuranceDoc?.createdAt ?? null, [insuranceDoc])
  const expiresAt = useMemo(() => getMetaString(insuranceDoc, ["expiresAt", "expiresOn", "expires", "expirationDate", "expiration_date"]), [insuranceDoc])
  const lowerUrl = String(insuranceUrl ?? "").toLowerCase()
  const isPdf = lowerUrl.endsWith(".pdf") || lowerUrl.includes(".pdf?")
  const isImage = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"].some((ext) => lowerUrl.includes(ext))

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-5xl text-center">
        <DriverPageHeader title="Insurance Certificate" />
      </div>

      <section className="mx-auto max-w-5xl overflow-hidden rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(13,143,111,0.14),_transparent_30%),linear-gradient(135deg,_#fffdf7_0%,_#ffffff_58%,_#eef8f2_100%)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-700">
              <Shield className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">Profile-linked insurance record</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
              This screen reads the insurance document currently attached to your driver profile. If the wrong file appears here, update it from your profile records and reopen this page.
            </p>
          </div>

          <div className="grid w-full max-w-md gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <div className="rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Status</div>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
                {insuranceUrl ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-rose-600" />}
                {insuranceUrl ? "Available" : "Missing"}
              </div>
            </div>
            <div className="rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Uploaded</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{formatDisplayDate(uploadedAt)}</div>
            </div>
            <div className="rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Expires</div>
              <div className="mt-2 text-sm font-semibold text-slate-900">{formatDisplayDate(expiresAt)}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-8">
        {loading ? (
          <div className="py-16 text-center">
            <div className="dot-spinner dot-md mx-auto" aria-hidden>
              <span className="dot dot-blue" />
              <span className="dot dot-black" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <p className="mt-4 text-sm text-slate-500">Loading insurance record...</p>
          </div>
        ) : unauthorized ? (
          <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-sm text-slate-700">You must be signed in to view your insurance document.</p>
            <div className="mt-4">
              <Link href="/driver/login" className="text-sm font-semibold text-[#0d8f6f]">Sign in</Link>
            </div>
          </div>
        ) : insuranceUrl ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-slate-950">Current insurance file</h3>
                <p className="mt-1 text-sm text-slate-500">{fileName ?? "Insurance document stored on your profile."}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-slate-50">
              {isPdf ? (
                <iframe src={insuranceUrl} title="Insurance certificate" className="h-[720px] w-full" />
              ) : isImage ? (
                <div className="relative h-[720px] w-full bg-white">
                  <Image src={insuranceUrl} alt="Insurance certificate" fill className="object-contain" />
                </div>
              ) : (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 bg-white p-8 text-center">
                  <FileText className="h-10 w-10 text-slate-400" />
                  <p className="max-w-md text-sm leading-6 text-slate-600">
                    The file type cannot be previewed inline here, but the stored insurance document is available from the open button above.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[26px] border border-rose-200 bg-rose-50 p-6 text-rose-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <div>
                <h3 className="text-base font-semibold">No insurance record found</h3>
                <p className="mt-1 text-sm leading-6">{error ?? "No insurance file is currently attached to your profile."}</p>
                <Link href="/driver/profile" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#0d8f6f]">
                  Update from profile
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Link
            href="/driver/management"
            className="inline-flex items-center rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="Back to Management"
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            Back to management
          </Link>
        </div>
      </section>
    </div>
  )
}
