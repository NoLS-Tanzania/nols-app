"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import DriverPageHeader from "@/components/DriverPageHeader"
import TableRow from '@/components/TableRow'
import { ChevronLeft } from 'lucide-react'

type LoginRecord = { id: string; at: string | Date; ip?: string; username?: string | null; platform?: string | null; details?: string | null; timeUsed?: number | null; success?: boolean | null }

export default function LoginHistoryPage() {
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<LoginRecord[]>([])

  useEffect(() => {
    let mounted = true
    async function load() {
  setLoading(true)
      try {
        const res = await fetch('/api/driver/security/logins', { credentials: 'include' })
        if (!mounted) return
        if (!res.ok) { setRecords([]); setLoading(false); return }
        const b = await res.json()
        setRecords(b.records || [])
      } catch (_err: any) {
        // on error, show an empty table instead of an error message
        setRecords([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center">
        <DriverPageHeader title="Login history" />
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
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
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">IP Address</th>
                  <th className="px-3 py-2">Username</th>
                  <th className="px-3 py-2">Platform</th>
                  <th className="px-3 py-2">Other details</th>
                  <th className="px-3 py-2">Time used</th>
                  <th className="px-3 py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <TableRow>
                    <td className="px-3 py-4 text-sm text-slate-500" colSpan={7}>No login history available.</td>
                  </TableRow>
                ) : (
                  records.map(r => (
                    <TableRow key={r.id} className="align-top">
                      <td className="px-3 py-2 align-top text-sm text-slate-700">{new Date(r.at).toLocaleString()}</td>
                      <td className="px-3 py-2 align-top text-sm text-slate-700">{r.ip ?? '—'}</td>
                      <td className="px-3 py-2 align-top text-sm text-slate-700">{r.username ?? '—'}</td>
                      <td className="px-3 py-2 align-top text-sm text-slate-700">{r.platform ?? '—'}</td>
                      <td className="px-3 py-2 align-top text-sm text-slate-700 whitespace-pre-wrap">{r.details ?? '—'}</td>
                      <td className="px-3 py-2 align-top text-sm text-slate-700">{formatDuration(r.timeUsed)}</td>
                      <td className="px-3 py-2 align-top text-sm">{r.success === null ? '—' : r.success ? <span className="text-green-600">Success</span> : <span className="text-red-600">Failed</span>}</td>
                    </TableRow>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Link href="/driver/security" className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1" aria-label="Back to Security">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span className="sr-only">Back to Security</span>
          </Link>
        </div>
      </section>
    </div>
  )
}

function formatDuration(sec?: number | null) {
  if (sec == null) return '—'
  const s = Number(sec)
  if (!isFinite(s) || s <= 0) return '—'
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = Math.floor(s % 60)
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`
  if (mins > 0) return `${mins}m ${secs}s`
  return `${secs}s`
}
