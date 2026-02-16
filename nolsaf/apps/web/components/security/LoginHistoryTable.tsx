"use client"

import React, { useEffect, useState } from "react"
import TableRow from "@/components/TableRow"
import { LogIn, CheckCircle, XCircle } from "lucide-react"
import SecuritySettingsShell from "@/components/security/SecuritySettingsShell"

type LoginRecord = {
  id: string
  at: string | Date
  ip?: string
  username?: string | null
  platform?: string | null
  details?: string | null
  timeUsed?: number | null
  success?: boolean | null
}

export type LoginHistoryTableProps = {
  apiUrl: string
  backHref: string
  containerClassName?: string
}

export default function LoginHistoryTable({ apiUrl, backHref, containerClassName }: LoginHistoryTableProps) {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<LoginRecord[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(apiUrl, { credentials: "include" })
        if (!mounted) return
        if (!res.ok) {
          const b = await res.json().catch(() => null)
          const msg = (b && (b.error || b.message || b.details)) || null
          setError(`Failed to load login history (status ${res.status})${msg ? `: ${msg}` : ""}`)
          setRecords([])
          return
        }
        const b = await res.json()
        setRecords((b && (b.records || b.items)) || [])
      } catch (_err: any) {
        const msg = _err?.message ? String(_err.message) : String(_err)
        setError(`Failed to load login history: ${msg}`)
        setRecords([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [apiUrl])

  const renderResultBadge = (success: boolean | null) => {
    if (success === null) return <span className="text-slate-500">—</span>

    if (success) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3" />
          Success
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    )
  }

  return (
    <SecuritySettingsShell
      containerClassName={containerClassName}
      title="Login History"
      description="Review sign-in activity and recent access attempts."
      icon={LogIn}
      iconBgClassName="bg-emerald-50"
      iconClassName="text-emerald-700"
      backHref={backHref}
      backLabel="Back to Security"
      backAriaLabel="Back to Security"
    >
      <div className="rounded-3xl border border-slate-200/70 bg-white/75 backdrop-blur shadow-card ring-1 ring-slate-900/5 overflow-hidden">
        <div className="p-5 sm:p-6">
          {error ? (
            <div className="mb-5 rounded-md bg-red-50 border-2 border-red-200 p-3">
              <div className="text-sm font-medium text-red-800">{error}</div>
              <div className="mt-1 text-xs text-red-700/80">Tip: make sure the API server is running and `API_ORIGIN` points to it (Next proxies `/api/*`).</div>
            </div>
          ) : null}
          {loading ? (
          <div className="py-12 text-center">
            <div className="dot-spinner dot-md mx-auto" aria-hidden>
              <span className="dot dot-blue" />
              <span className="dot dot-black" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <p className="text-sm text-slate-500 mt-4">Loading login history…</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-full">
            <table className="w-full divide-y divide-slate-200 table-auto">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Other details</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Time used</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Result</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <LogIn className="h-12 w-12 text-slate-300 mb-3" aria-hidden />
                        <div className="text-sm font-medium text-slate-600 mb-1">No login history available</div>
                        <div className="text-xs text-slate-500">Your login attempts will appear here</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <TableRow key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">{new Date(r.at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-mono">{r.ip ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{r.username ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{r.platform ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 whitespace-pre-wrap max-w-xs">{r.details ?? "—"}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{formatDuration(r.timeUsed)}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">{renderResultBadge(r.success ?? null)}</td>
                    </TableRow>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </SecuritySettingsShell>
  )
}

function formatDuration(sec?: number | null) {
  if (sec == null) return "—"
  const s = Number(sec)
  if (!isFinite(s) || s <= 0) return "—"
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = Math.floor(s % 60)
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}
