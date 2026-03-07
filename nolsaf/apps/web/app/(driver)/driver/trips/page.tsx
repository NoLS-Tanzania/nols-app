"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import TableRow from "@/components/TableRow"
import { ArrowRight, CalendarClock, CheckCircle2, Eye, Flag, ListChecks, MapPin, Navigation, Sparkles, Wallet, Waves, X, XCircle, Zap } from "lucide-react"
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

  const allTrips = trips ?? []
  const adminTrips = allTrips.filter((t: any) => normalizeAssignmentSource(t) === "ADMIN")
  const autoTrips = allTrips.filter((t: any) => normalizeAssignmentSource(t) === "AUTO")
  const completedTrips = allTrips.filter((t: any) => isCompletedStatus(t?.status))
  const activeTrips = allTrips.filter((t: any) => {
    const statusLower = String(t?.status ?? "").toLowerCase()
    return !isCompletedStatus(t?.status) && !statusLower.includes("cancel")
  })
  const totalTripValue = allTrips.reduce((sum: number, t: any) => {
    const raw = t?.amount ?? t?.fare ?? t?.total ?? 0
    const amount = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, ""))
    return Number.isFinite(amount) ? sum + amount : sum
  }, 0)

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <section className="relative w-full max-w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef8f4_32%,#e9f4ff_100%)] p-6 shadow-[0_24px_70px_-30px_rgba(15,23,42,0.35)] sm:p-7">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -left-24 top-10 h-48 w-48 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-sky-200/35 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-indigo-100/40 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-700 shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Driver Operations
              </div>
              <div className="mt-5 flex items-start gap-4">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-emerald-300 shadow-[0_18px_40px_-18px_rgba(15,23,42,0.7)]">
                  <ListChecks className="h-7 w-7" aria-hidden />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">My Trips</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                    A cleaner command view for admin-assigned work and on-demand allocations, designed for faster reading, stronger focus, and more premium trip control.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
              {[
                {
                  label: "Total trips",
                  value: allTrips.length,
                  tone: "from-slate-950 to-slate-800 text-white border-slate-800",
                  icon: ListChecks,
                },
                {
                  label: "Live queue",
                  value: activeTrips.length,
                  tone: "from-emerald-500 to-emerald-600 text-white border-emerald-500",
                  icon: Zap,
                },
                {
                  label: "Completed",
                  value: completedTrips.length,
                  tone: "from-sky-500 to-sky-600 text-white border-sky-500",
                  icon: CheckCircle2,
                },
                {
                  label: "Trip value",
                  value: formatAmount(totalTripValue, "TZS"),
                  tone: "from-white to-slate-50 text-slate-900 border-slate-200",
                  icon: Wallet,
                },
              ].map((card) => {
                const Icon = card.icon
                return (
                  <div
                    key={card.label}
                    className={`rounded-2xl border bg-gradient-to-br p-4 shadow-[0_18px_40px_-22px_rgba(15,23,42,0.45)] ${card.tone}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-75">{card.label}</div>
                      <Icon className="h-4 w-4 opacity-80" />
                    </div>
                    <div className="mt-3 text-2xl font-black tracking-tight">{card.value}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">Assigned by Admin</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">High-intent trips manually awarded or re-routed by operations.</div>
                </div>
                <div className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-bold text-indigo-700">{adminTrips.length}</div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-indigo-700">
                <Waves className="h-4 w-4" />
                Priority dispatch lane with direct admin oversight
              </div>
            </div>

            <div className="rounded-3xl border border-white/70 bg-white/75 p-5 shadow-[0_14px_40px_-24px_rgba(15,23,42,0.45)] backdrop-blur">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-slate-900">Auto allocated / On-demand</div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">Trips accepted organically through the live demand stream and automatic matching.</div>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">{autoTrips.length}</div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-700">
                <ArrowRight className="h-4 w-4" />
                Faster response flow with driver-led pickup behavior
              </div>
            </div>
          </div>
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
            const TripsTable = ({ items, defaultAction }: { items: any[]; defaultAction: "START" | "VIEW" }) => (
              <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white/90 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.55)] backdrop-blur">
                <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-950 px-4 py-3 text-white">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Trip Ledger</div>
                    <div className="mt-1 text-sm text-slate-100">Operational view with route, payment, and next action control.</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                    {items.length} record{items.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="overflow-x-auto max-w-full">
                <table className="w-full min-w-[1360px] divide-y divide-slate-200 table-auto">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Date</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Time</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Pickup At</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Drop-off At</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200">Pick-Up</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200">Drop-off</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Trip Code</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Type</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Status</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Amount</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Action</th>
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
                          <TableRow key={t.id} className="hover:bg-slate-50/90 transition-colors">
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
                                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold shadow-sm hover:bg-emerald-100"
                                  title="Start this trip on the map"
                                >
                                  <Navigation className="h-4 w-4" />
                                  Start Trip
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setViewTripId(Number(t.id))}
                                  className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-slate-50"
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
                        <td colSpan={11} className="px-6 py-14">
                          <div className="mx-auto flex max-w-md flex-col items-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-6 py-8 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                              <ListChecks className="h-6 w-6" />
                            </div>
                            <div className="mt-4 text-base font-semibold text-slate-900">
                              {loading ? 'Loading trips...' : 'No trips found'}
                            </div>
                            <div className="mt-1 text-sm leading-6 text-slate-500">
                              {loading
                                ? 'We are preparing your trip ledger and live actions.'
                                : 'This lane is empty for now. New trips will appear here with route, amount, and next-step controls.'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  <span>Optimized for quick route review, payout awareness, and next action clarity.</span>
                  <span className="hidden sm:inline">Scroll horizontally for the full route ledger.</span>
                </div>
              </div>
            )

            return (
              <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-5">
                <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/70 p-5 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-bold text-slate-950">Assigned by Admin</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">Trips assigned manually or awarded by admin for structured execution and direct oversight.</div>
                    </div>
                    <div className="shrink-0 flex h-11 min-w-[3rem] items-center justify-center rounded-2xl bg-indigo-50 px-3 text-sm font-black text-indigo-700 shadow-sm">
                      {adminTrips.length}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                    <div>
                      <div className="uppercase tracking-[0.16em] text-slate-400">Mode</div>
                      <div className="mt-1 font-semibold text-slate-900">Managed dispatch</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.16em] text-slate-400">Preferred action</div>
                      <div className="mt-1 font-semibold text-slate-900">Start trip</div>
                    </div>
                  </div>
                  <TripsTable items={adminTrips} defaultAction="START" />
                </div>

                <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/70 p-5 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.4)] backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-bold text-slate-950">Auto allocated / On-demand</div>
                      <div className="mt-1 text-sm leading-6 text-slate-600">Trips picked up automatically or accepted by drivers through live demand and instant matching.</div>
                    </div>
                    <div className="shrink-0 flex h-11 min-w-[3rem] items-center justify-center rounded-2xl bg-emerald-50 px-3 text-sm font-black text-emerald-700 shadow-sm">
                      {autoTrips.length}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                    <div>
                      <div className="uppercase tracking-[0.16em] text-slate-400">Mode</div>
                      <div className="mt-1 font-semibold text-slate-900">Live demand stream</div>
                    </div>
                    <div>
                      <div className="uppercase tracking-[0.16em] text-slate-400">Preferred action</div>
                      <div className="mt-1 font-semibold text-slate-900">Review flow</div>
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
          <div className="fixed inset-0 bg-slate-950/55 transition-opacity" onClick={closeView} />
          <div className="min-h-full w-full flex items-start sm:items-center justify-center p-4 sm:p-6">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-[1.8rem] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(15,23,42,0.65)] flex max-h-[88vh] flex-col">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a_0%,#0b3b5a_54%,#047857_100%)] p-4 text-white sm:p-5">
              <div className="pointer-events-none absolute inset-0 opacity-40">
                <div className="absolute -top-10 right-0 h-36 w-36 rounded-full bg-sky-300/30 blur-3xl" />
                <div className="absolute bottom-0 left-10 h-24 w-24 rounded-full bg-emerald-300/20 blur-2xl" />
              </div>
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300">Trip Flow</div>
                  <div className="mt-1 text-xl font-black tracking-tight text-white">Trip #{viewTripId}</div>
                  {viewTrip?.tripCode ? (
                    <div className="mt-1 text-xs text-slate-200">
                      Trip code: <span className="font-mono font-semibold text-white">{viewTrip.tripCode}</span>
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={closeView}
                  className="rounded-xl border border-white/10 bg-white/10 p-2 text-white/80 hover:bg-white/20 hover:text-white"
                  aria-label="Close"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50/70 p-3 sm:p-4">
              {viewLoading ? (
                <div className="text-sm text-slate-600">Loading trip…</div>
              ) : viewError ? (
                <div className="text-sm text-red-600">{viewError}</div>
              ) : !viewTrip ? (
                <div className="text-sm text-slate-600">No details found.</div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_300px]">
                      <div className="p-4 sm:p-5">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.22em]">Route</div>
                        <div className="mt-2 text-sm font-semibold text-slate-900 leading-6 break-words">
                          {viewTrip.pickup ?? "—"}
                        </div>
                        <div className="mt-2 text-sm text-slate-700 leading-6 break-words">
                          → {viewTrip.dropoff ?? "—"}
                        </div>
                      </div>

                      <div className="bg-slate-950 p-4 text-white sm:border-l sm:border-slate-800 sm:p-5">
                        <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-[0.22em]">Status & Payment</div>
                        <div className="mt-3 flex flex-col gap-3">
                          <div className="min-w-0">{renderStatusBadge(viewTrip.status || "—")}</div>
                          <div className="text-2xl font-black tracking-tight text-white whitespace-nowrap">
                            {formatAmount(viewTrip.amount, viewTrip.currency || "TZS")}
                          </div>
                          {renderAssignmentBadge(normalizeAssignmentSource(viewTrip))}
                          {viewTrip.paymentStatus ? (
                            <div className="text-xs text-slate-300">Payment: <span className="font-semibold text-white">{viewTrip.paymentStatus}</span></div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.22em]">Route status</div>
                    <div className="mt-4 space-y-2.5">
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
                          <div key={s.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 sm:px-4">
                            <div className="flex items-start gap-3">
                              <div className="flex flex-col items-center">
                                <div className={`h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center ${s.state === "done" ? "text-emerald-700" : s.state === "active" ? "text-blue-700" : "text-slate-500"}`}>
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
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.22em]">Notes</div>
                      <div className="mt-2 text-sm text-slate-700 leading-6 break-words">{viewTrip.notes}</div>
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
