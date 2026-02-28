"use client"

import React, { useEffect, useState } from "react"
import { Monitor } from "lucide-react"

export type ActiveSessionsSectionProps = {
  listUrl: string
  revokeUrl: string
  revokeOthersUrl: string
  embedded?: boolean
}

type Session = {
  id: string | number
  userAgent?: string | null
  ip?: string | null
  createdAt?: string | null
  lastSeenAt?: string | null
}

export default function ActiveSessionsSection({ listUrl, revokeUrl, revokeOthersUrl }: ActiveSessionsSectionProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(listUrl, { credentials: "include" })
      if (!res.ok) {
        setSessions([])
        return
      }
      const body = await res.json().catch(() => null)

      let list: any[] = []
      if (body?.data?.sessions && Array.isArray(body.data.sessions)) list = body.data.sessions
      else if (body?.sessions && Array.isArray(body.sessions)) list = body.sessions
      else if (Array.isArray(body)) list = body

      setSessions(list)
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listUrl])

  const revoke = async (id: string | number) => {
    try {
      const res = await fetch(revokeUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: String(id) }),
      })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => String(s.id) !== String(id)))
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to revoke session", e)
    }
  }

  const revokeOthers = async () => {
    try {
      const res = await fetch(revokeOthersUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) await load()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Failed to revoke other sessions", e)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-[#0f1923] shadow-lg transition-all duration-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
        <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110">
          <Monitor className="h-6 w-6 text-emerald-400" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-lg text-slate-100">Active Sessions</div>
          <p className="text-sm text-slate-400 mt-1">Review and manage devices currently signed into your account.</p>
        </div>
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => {
              void revokeOthers()
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-700 hover:border-slate-600 active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
            disabled={loading}
          >
            Revoke other sessions
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="text-sm text-slate-500">No active sessions found.</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={String(s.id)} className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-100 truncate">{s.userAgent || "Unknown device"}</div>
                <div className="text-xs text-slate-500 mt-1">
                  {s.ip ? `IP: ${s.ip}` : null}
                  {s.ip && (s.createdAt || s.lastSeenAt) ? " • " : null}
                  {s.lastSeenAt
                    ? `Last seen: ${new Date(s.lastSeenAt).toLocaleString()}`
                    : s.createdAt
                      ? `Created: ${new Date(s.createdAt).toLocaleString()}`
                      : null}
                </div>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    void revoke(s.id)
                  }}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-red-300 bg-white text-red-700 font-semibold text-sm hover:bg-red-50 hover:border-red-400 active:scale-[0.98] transition-all duration-200"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
