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
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/driver/trips`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
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

  return (
    <div className="space-y-6">
      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border text-center">
        <div className="flex flex-col items-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 text-blue-600">
            <ListChecks className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold">My Trips</h1>
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

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y table-auto">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Time</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Pick-Up</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Drop-off</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Trip Code</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Status</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {trips && trips.length > 0 ? (
                  trips.map((t: any) => (
                    <TableRow key={t.id}>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatDate(t.datetime || t.date)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatTime(t.datetime || t.date)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{t.pickup || t.from || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{t.dropoff || t.to || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 font-mono">{t.trip_code || t.code || t.reference || t.tripCode || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{t.status || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700 text-right">{formatAmount(t.amount ?? t.fare ?? t.total)}</td>
                      </TableRow>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500 text-right">—</td>
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
