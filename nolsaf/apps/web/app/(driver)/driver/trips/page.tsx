"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import TableRow from "@/components/TableRow"
import { ListChecks } from "lucide-react"

export default function DriverTripsPage() {
  const [trips, setTrips] = useState<any[] | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const refreshInterval = useRef<number | null>(null)
  const toastShown = useRef(false)

  const fetchTrips = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/driver/trips`, {
        credentials: "include",
      })

      // Treat explicit 'no content' or not found as empty result rather than an error
      if (res.status === 204 || res.status === 404) {
        const arr: any[] = []
        setTrips(arr)
        try {
          window.dispatchEvent(
            new CustomEvent("nols:toast", {
              detail: { type: "info", title: "No trips found", message: "Maybe no trips exist.", duration: 3000 },
            })
          )
        } catch (e) {
          // ignore
        }
        // allow future error toasts to reset
        toastShown.current = false
        setLoading(false)
        return
      }

      if (!res.ok) throw new Error("Network response was not ok")

      const data = await res.json()
      const arr = Array.isArray(data) ? data : data?.trips ?? []
      setTrips(arr)

      if (arr.length === 0) {
        try {
          window.dispatchEvent(
            new CustomEvent("nols:toast", {
              detail: { type: "info", title: "No trips found", message: "Maybe no trips exist.", duration: 3000 },
            })
          )
        } catch (e) {
          // ignore
        }
      }
      // on successful load allow future error toasts
      toastShown.current = false
    } catch (err) {
      // show the failure toast only once per failure cycle
      if (!toastShown.current) {
        try {
          window.dispatchEvent(
            new CustomEvent("nols:toast", {
              detail: {
                type: "error",
                title: "Could not load trips",
                message: "There was a problem loading trips. Please try again later.",
                duration: 5000,
              },
            })
          )
        } catch (e) {
          // ignore
        }
        toastShown.current = true
      }

      // on error we keep the trips state empty; the periodic hourly refresh will attempt again

      setTrips([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // initial fetch
    fetchTrips()

    // set up an hourly refresh (1 hour = 3_600_000 ms)
    refreshInterval.current = window.setInterval(() => {
      fetchTrips()
    }, 3_600_000) as unknown as number

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
        refreshInterval.current = null
      }
    }
  }, [fetchTrips])

  const formatAmount = (amt: any) => {
    if (amt == null) return "—"
    if (typeof amt === "number") {
      try {
        return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amt)
      } catch {
        return String(amt)
      }
    }
    return String(amt)
  }

  const formatDate = (iso?: string) => {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleDateString()
  }

  const formatTime = (iso?: string) => {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  const renderStatusBadge = (status: string) => {
    const statusLower = (status || '').toLowerCase();
    let bgColor = 'bg-gray-100 text-gray-700';
    if (statusLower.includes('completed') || statusLower.includes('finished') || statusLower.includes('done')) {
      bgColor = 'bg-green-100 text-green-700';
    } else if (statusLower.includes('pending') || statusLower.includes('waiting')) {
      bgColor = 'bg-amber-100 text-amber-700';
    } else if (statusLower.includes('cancelled') || statusLower.includes('canceled')) {
      bgColor = 'bg-red-100 text-red-700';
    } else if (statusLower.includes('in_progress') || statusLower.includes('active')) {
      bgColor = 'bg-blue-100 text-blue-700';
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
        {status || '—'}
      </span>
    );
  };

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
            <ListChecks className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">My Trips</h1>
        </div>

        <div className="mt-6">
          {loading && (
            <div className="flex items-center justify-center space-x-3 text-gray-600 mb-4">
              <span aria-hidden className="dot-spinner dot-sm" aria-live="polite">
                <span className="dot dot-blue" />
                <span className="dot dot-black" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </span>
              <span>Loading trips…</span>
            </div>
          )}

          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 max-w-full">
            <table className="w-full divide-y divide-slate-200 table-auto">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Pick-Up</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Drop-off</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Trip Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Amount</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {trips && trips.length > 0 ? (
                  trips.map((t: any) => (
                    <TableRow key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">{formatDate(t.datetime || t.date)}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{formatTime(t.datetime || t.date)}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{t.pickup || t.from || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{t.dropoff || t.to || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 font-mono font-medium">{t.trip_code || t.code || t.reference || t.tripCode || '—'}</td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">{renderStatusBadge(t.status)}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-right whitespace-nowrap">{formatAmount(t.amount ?? t.fare ?? t.total)}</td>
                      </TableRow>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-500">
                      {loading ? 'Loading trips…' : 'No trips found'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
}
