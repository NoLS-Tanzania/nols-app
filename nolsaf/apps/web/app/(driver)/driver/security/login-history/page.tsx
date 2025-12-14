"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import TableRow from '@/components/TableRow'
import { ChevronLeft, LogIn, CheckCircle, XCircle } from 'lucide-react'

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

  const renderResultBadge = (success: boolean | null) => {
    if (success === null) return <span className="text-slate-500">—</span>;
    
    if (success) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3" />
          Success
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      );
    }
  };

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="w-full text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
            <LogIn className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Login History</h1>
        </div>
      </div>

      <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden">
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
                        <LogIn className="h-12 w-12 text-slate-300 mb-3" />
                        <div className="text-sm font-medium text-slate-600 mb-1">No login history available</div>
                        <div className="text-xs text-slate-500">Your login attempts will appear here</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map(r => (
                    <TableRow key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">{new Date(r.at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-mono">{r.ip ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{r.username ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700">{r.platform ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 whitespace-pre-wrap max-w-xs">{r.details ?? '—'}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{formatDuration(r.timeUsed)}</td>
                      <td className="px-6 py-4 text-sm whitespace-nowrap">{renderResultBadge(r.success ?? null)}</td>
                    </TableRow>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-start pt-4 border-t border-slate-200">
          <Link 
            href="/driver/security" 
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors border border-slate-200 hover:border-slate-300 no-underline"
            aria-label="Back to Security"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Security</span>
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
