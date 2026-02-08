"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import TableRow from "@/components/TableRow"
import { CalendarClock, CheckCircle2, Eye, Flag, MapPin, Navigation, ListChecks, X, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

type TripDetails = {
  id: number
  status: string | null
  scheduledDate: string | null
  pickupTime: string | null
  dropoffTime: string | null
  pickup: string | null
  dropoff: string | null
  tripCode: string | null
  amount: number | string | null
  currency: string | null
  paymentStatus: string | null
  notes: string | null
  createdAt: string | null
  updatedAt: string | null
  messagesCount?: number
  locationPingsCount?: number
  assignmentSource?: "ADMIN" | "AUTO" | string | null
}

export default function DriverTripsPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<any[] | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const [viewTripId, setViewTripId] = useState<number | null>(null)
  const [viewTrip, setViewTrip] = useState<TripDetails | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)

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

  const formatAmount = (amt: any, currency?: string | null) => {
    if (amt == null) return "—"
    const currencyCode = (currency || "TZS").toUpperCase()
    const n = typeof amt === "number" ? amt : Number(String(amt).replace(/,/g, ""))
    if (!Number.isFinite(n)) return String(amt)
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: currencyCode === "TZS" ? 0 : 2,
      }).format(n)
    } catch {
      return `${n.toLocaleString()} ${currencyCode}`
    }
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

  const isCompletedStatus = (status?: string | null) => {
    const s = String(status ?? "").toLowerCase()
    return s.includes("completed") || s.includes("finished") || s.includes("done")
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

  const normalizeAssignmentSource = (t: any): "ADMIN" | "AUTO" => {
    const raw = (t?.assignmentSource ?? t?.assignment_source ?? t?.assignment ?? t?.source ?? "") as any
    const s = String(raw || "").toUpperCase()
    return s === "ADMIN" ? "ADMIN" : "AUTO"
  }

  const renderAssignmentBadge = (source: "ADMIN" | "AUTO") => {
    const cls = source === "ADMIN" ? "bg-indigo-100 text-indigo-800" : "bg-emerald-100 text-emerald-800"
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
        {source === "ADMIN" ? "Admin assigned" : "Auto allocated"}
      </span>
    )
  }

  const closeView = () => {
    setViewTripId(null)
    setViewTrip(null)
    setViewError(null)
    setViewLoading(false)
  }

  useEffect(() => {
    if (!viewTripId) return
    let cancelled = false
    setViewLoading(true)
    setViewError(null)
    setViewTrip(null)

    ;(async () => {
      try {
        const res = await fetch(`/api/driver/trips/${encodeURIComponent(String(viewTripId))}`, {
          credentials: "include",
        })
        if (!res.ok) {
          throw new Error(`Failed to load trip (${res.status})`)
        }
        const data = (await res.json()) as TripDetails
        if (!cancelled) setViewTrip(data)
      } catch (e: any) {
        if (!cancelled) setViewError(e?.message || "Failed to load trip")
      } finally {
        if (!cancelled) setViewLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [viewTripId])

  const fmtDateTime = (iso?: string | null) => {
    if (!iso) return "—"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
  }

  const routeStatusSteps = (trip?: TripDetails | null) => {
    const status = String(trip?.status ?? "").toLowerCase()
    const isCancelled = status.includes("cancel")
    const isInProgress = status.includes("in_progress") || status.includes("in progress") || status.includes("active")
    const isCompleted = isCompletedStatus(trip?.status)

    const pickedUpDone = Boolean(trip?.pickupTime) || isInProgress || isCompleted
    const droppedOffDone = Boolean(trip?.dropoffTime) || isCompleted
    const inTransitActive = pickedUpDone && !droppedOffDone && !isCancelled

    if (isCancelled) {
      return [
        {
          key: "cancelled",
          label: "Cancelled",
          icon: XCircle,
          state: "done" as const,
          at: trip?.updatedAt ?? null,
        },
      ]
    }

    return [
      {
        key: "scheduled",
        label: "Scheduled",
        icon: CalendarClock,
        state: trip?.scheduledDate ? ("done" as const) : ("pending" as const),
        at: trip?.scheduledDate ?? null,
      },
      {
        key: "picked-up",
        label: "Picked up",
        icon: MapPin,
        state: pickedUpDone ? ("done" as const) : ("pending" as const),
        at: trip?.pickupTime ?? null,
      },
      {
        key: "in-transit",
        label: "On the way",
        icon: Navigation,
        state: droppedOffDone ? ("done" as const) : inTransitActive ? ("active" as const) : ("pending" as const),
        at: inTransitActive ? (trip?.pickupTime ?? null) : null,
      },
      {
        key: "dropped-off",
        label: "Dropped off",
        icon: Flag,
        state: droppedOffDone ? ("done" as const) : ("pending" as const),
        at: trip?.dropoffTime ?? null,
      },
      {
        key: "completed",
        label: "Completed",
        icon: CheckCircle2,
        state: isCompleted ? ("done" as const) : ("pending" as const),
        at: isCompleted ? (trip?.updatedAt ?? null) : null,
      },
    ]
  }

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <section className="w-full max-w-full bg-white rounded-2xl p-6 border border-slate-200 shadow-sm overflow-x-hidden">
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

          {(() => {
            const allTrips = trips ?? []
            const adminTrips = allTrips.filter((t: any) => normalizeAssignmentSource(t) === "ADMIN")
            const autoTrips = allTrips.filter((t: any) => normalizeAssignmentSource(t) === "AUTO")

            const TripsTable = ({ items, defaultAction }: { items: any[]; defaultAction: "START" | "VIEW" }) => (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 max-w-full bg-white">
                <table className="w-full min-w-[1360px] divide-y divide-slate-200 table-auto">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">Date</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">Time</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">Pickup At</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">Drop-off At (Completed)</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">Pick-Up</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">Drop-off</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">Trip Code</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">Type</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">Status</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">Amount</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {items.length > 0 ? (
                      items.map((t: any) => {
                        const source = normalizeAssignmentSource(t)
                        const statusLower = String(t?.status ?? "").toLowerCase()
                        const isClosed = isCompletedStatus(t?.status) || statusLower.includes("cancel")
                        const pickupIso = t.pickupTime || null
                        const dropoffIso = t.dropoffTime || null
                        const canShowDropoff = Boolean(dropoffIso) && isCompletedStatus(t.status)
                        return (
                          <TableRow key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-4 text-sm font-medium text-slate-900 whitespace-nowrap align-top">{formatDate(t.datetime || t.date)}</td>
                            <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap align-top">{formatTime(t.datetime || t.date)}</td>
                            <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap align-top">
                              {pickupIso ? `${formatDate(pickupIso)} ${formatTime(pickupIso)}` : "—"}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap align-top">
                              {canShowDropoff ? `${formatDate(dropoffIso)} ${formatTime(dropoffIso)}` : "—"}
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700 max-w-[280px] break-words leading-5 align-top">{t.pickup || t.from || '—'}</td>
                            <td className="px-5 py-4 text-sm text-slate-700 max-w-[280px] break-words leading-5 align-top">{t.dropoff || t.to || '—'}</td>
                            <td className="px-5 py-4 text-sm text-slate-700 font-mono font-medium whitespace-nowrap align-top">{t.trip_code || t.code || t.reference || t.tripCode || '—'}</td>
                            <td className="px-5 py-4 text-sm whitespace-nowrap align-top">{renderAssignmentBadge(source)}</td>
                            <td className="px-5 py-4 text-sm whitespace-nowrap align-top">{renderStatusBadge(t.status)}</td>
                            <td className="px-5 py-4 text-sm font-semibold text-slate-900 text-right whitespace-nowrap align-top">{formatAmount(t.amount ?? t.fare ?? t.total, t.currency ?? t.currencyCode ?? "TZS")}</td>
                            <td className="px-5 py-4 text-right whitespace-nowrap align-top">
                              {defaultAction === "START" && !isClosed ? (
                                <button
                                  type="button"
                                  onClick={() => router.push(`/driver/map?tripId=${encodeURIComponent(String(t.id))}`)}
                                  className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold hover:bg-emerald-100"
                                  title="Start this trip on the map"
                                >
                                  <Navigation className="h-4 w-4" />
                                  Start Trip
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setViewTripId(Number(t.id))}
                                  className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
                                  title="View trip flow"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </button>
                              )}
                            </td>
                          </TableRow>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={11} className="px-6 py-10 text-center text-sm text-slate-500">
                          {loading ? 'Loading trips…' : 'No trips found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )

            return (
              <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">Assigned by Admin</div>
                      <div className="mt-0.5 text-xs text-slate-500">Trips assigned manually or awarded by admin</div>
                    </div>
                    <div className="shrink-0 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                      {adminTrips.length}
                    </div>
                  </div>
                  <TripsTable items={adminTrips} defaultAction="START" />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">Auto allocated / On-demand</div>
                      <div className="mt-0.5 text-xs text-slate-500">Trips picked up automatically or accepted by drivers</div>
                    </div>
                    <div className="shrink-0 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1">
                      {autoTrips.length}
                    </div>
                  </div>
                  <TripsTable items={autoTrips} defaultAction="VIEW" />
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      {viewTripId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/40 transition-opacity" onClick={closeView} />
          <div className="min-h-full w-full flex items-start sm:items-center justify-center p-4 sm:p-6">
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
            <div className="sticky top-0 z-10 bg-white p-3 sm:p-4 border-b border-slate-200 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Trip #{viewTripId}</div>
                <div className="mt-0.5 text-lg font-bold text-slate-900 truncate">Trip flow</div>
                {viewTrip?.tripCode ? (
                  <div className="mt-1 text-xs text-slate-600">
                    Trip code: <span className="font-mono font-semibold text-slate-800">{viewTrip.tripCode}</span>
                  </div>
                ) : null}
              </div>
              <button
                onClick={closeView}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                aria-label="Close"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              {viewLoading ? (
                <div className="text-sm text-slate-600">Loading trip…</div>
              ) : viewError ? (
                <div className="text-sm text-red-600">{viewError}</div>
              ) : !viewTrip ? (
                <div className="text-sm text-slate-600">No details found.</div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_300px]">
                      <div className="p-3 sm:p-4">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Route</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900 leading-5 break-words">
                          {viewTrip.pickup ?? "—"}
                        </div>
                        <div className="mt-1 text-sm text-slate-700 leading-5 break-words">
                          → {viewTrip.dropoff ?? "—"}
                        </div>
                      </div>

                      <div className="p-3 sm:p-4 sm:border-l border-slate-200 bg-slate-50/60">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status & Payment</div>
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="min-w-0">{renderStatusBadge(viewTrip.status || "—")}</div>
                          <div className="text-base font-bold text-slate-900 whitespace-nowrap">
                            {formatAmount(viewTrip.amount, viewTrip.currency || "TZS")}
                          </div>
                        </div>
                        <div className="mt-2">
                          {renderAssignmentBadge(normalizeAssignmentSource(viewTrip))}
                        </div>
                        {viewTrip.paymentStatus ? (
                          <div className="mt-1 text-xs text-slate-600">Payment: <span className="font-semibold text-slate-800">{viewTrip.paymentStatus}</span></div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Route status</div>
                    <div className="mt-3 space-y-2">
                      {routeStatusSteps(viewTrip).map((s, idx, arr) => {
                        const Icon = s.icon
                        const badgeClass =
                          s.state === "done"
                            ? "bg-emerald-100 text-emerald-800"
                            : s.state === "active"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-slate-100 text-slate-600"
                        const dotClass =
                          s.state === "done"
                            ? "bg-emerald-600"
                            : s.state === "active"
                              ? "bg-blue-600"
                              : "bg-slate-300"

                        return (
                          <div key={s.key} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`h-9 w-9 rounded-full border border-slate-200 bg-white flex items-center justify-center ${s.state === "done" ? "text-emerald-700" : s.state === "active" ? "text-blue-700" : "text-slate-500"}`}>
                                  <Icon className="h-4 w-4" />
                                </div>
                                {idx < arr.length - 1 ? <div className={`w-px flex-1 my-1 ${dotClass}`} style={{ opacity: 0.35 }} /> : null}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-900">{s.label}</div>
                                    <div className="mt-0.5 text-xs text-slate-600">{fmtDateTime(s.at)}</div>
                                  </div>
                                  <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}>
                                    {s.state === "done" ? "Done" : s.state === "active" ? "Active" : "Pending"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {viewTrip.notes ? (
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Notes</div>
                      <div className="mt-1.5 text-sm text-slate-700 leading-6 break-words">{viewTrip.notes}</div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
