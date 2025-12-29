"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronLeft, LogIn, Trash2 } from 'lucide-react'
import axios from "axios"

const api = axios.create({ baseURL: "", withCredentials: true })

export default function OwnerSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const r = await api.get("/api/account/sessions")
        if (!mounted) return
        setSessions(r.data || [])
      } catch (err: any) {
        if (mounted) setError(err?.response?.data?.error || 'Failed to load sessions')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  const revokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return
    try {
      await api.post("/api/account/sessions/revoke", { sessionId })
      setSessions(sessions.filter(s => s.id !== sessionId))
      try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'success', title: 'Session revoked', message: 'The session has been revoked.', duration: 3000 } })); } catch (e) {}
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to revoke session'
      try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'error', title: 'Error', message: msg, duration: 4000 } })); } catch (e) {}
    }
  }

  const revokeOtherSessions = async () => {
    if (!confirm('Are you sure you want to revoke all other sessions? You will remain logged in on this device.')) return
    try {
      await api.post("/api/account/sessions/revoke-others")
      setSessions(sessions.filter(s => s.revokedAt === null))
      try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'success', title: 'Sessions revoked', message: 'All other sessions have been revoked.', duration: 3000 } })); } catch (e) {}
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to revoke sessions'
      try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'error', title: 'Error', message: msg, duration: 4000 } })); } catch (e) {}
    }
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return 'Unknown'
    return new Date(date).toLocaleString()
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="w-full text-center">
          <div className="flex flex-col items-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-amber-50 text-amber-600 transition-all duration-300">
              <LogIn className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
            </div>
            <h1 className="mt-3 text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Active Sessions</h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">View and manage your active login sessions.</p>
          </div>
        </div>

        <section className="w-full max-w-full bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50">
          {error && (
            <div className="rounded-xl bg-red-50 border-2 border-red-200 p-3 sm:p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="text-xs sm:text-sm font-semibold text-red-800">{error}</div>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center">
              <div className="dot-spinner dot-md mx-auto" aria-hidden>
                <span className="dot dot-blue" />
                <span className="dot dot-black" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-4">Loading sessions…</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center">
              <LogIn className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600">No active sessions found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.length > 1 && (
                <div className="flex justify-end pb-4 border-b border-slate-200">
                  <button
                    onClick={revokeOtherSessions}
                    className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 border border-red-200 hover:border-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Revoke All Other Sessions</span>
                  </button>
                </div>
              )}
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 border-2 border-slate-200 rounded-xl hover:border-emerald-300 transition-all duration-300 hover:shadow-md"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <LogIn className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                              Session {session.id}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Last seen: {formatDate(session.lastSeenAt)}
                            </div>
                            {session.ipAddress && (
                              <div className="text-xs text-slate-500 mt-0.5">
                                IP: {session.ipAddress}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {!session.revokedAt && (
                        <button
                          onClick={() => revokeSession(session.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 border border-red-200 hover:border-red-300 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Revoke</span>
                        </button>
                      )}
                      {session.revokedAt && (
                        <span className="inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-500 bg-slate-50 rounded-lg border border-slate-200 flex-shrink-0">
                          Revoked
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-start pt-4 border-t border-slate-200">
            <Link 
              href="/owner/settings" 
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all duration-300 border border-slate-200 hover:border-slate-300 no-underline"
              aria-label="Back to Settings"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Settings</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

