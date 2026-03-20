"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import TableRow from "@/components/TableRow"
import { ArrowUpDown, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, Eye, Flag, ListChecks, MapPin, Navigation, Sparkles, X, XCircle, Zap } from "lucide-react"
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

type LocationSummary = {
  title: string
  street: string | null
  region: string | null
}

type SortField = "scheduled" | "pickupAt" | "dropoffAt" | "amount"
type SortDirection = "asc" | "desc"

export default function DriverTripsPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<any[] | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const [viewTripId, setViewTripId] = useState<number | null>(null)
  const [viewTrip, setViewTrip] = useState<TripDetails | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>("scheduled")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

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

  const toTitleCase = (value: string) =>
    value
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => {
        if (word.length <= 3 && /^(cbd|usa|uk|tzs)$/i.test(word)) return word.toUpperCase()
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(" ")

  const normalizeLocationToken = (value: string) => value.replace(/[^a-z0-9]/gi, "").toLowerCase()

  const summarizeLocation = (value?: string | null): LocationSummary => {
    const raw = String(value ?? "").trim()
    if (!raw) {
      return { title: "—", street: null, region: null }
    }

    const tokens = raw
      .split(/\s+-\s+|,\s*/)
      .map((part) => part.trim())
      .filter(Boolean)

    const uniqueTokens = tokens.filter((token, index, arr) => {
      const key = normalizeLocationToken(token)
      return arr.findIndex((entry) => normalizeLocationToken(entry) === key) === index
    })

    const [first = raw, ...rest] = uniqueTokens
    const title = toTitleCase(first)

    if (rest.length === 0) {
      return { title, street: null, region: null }
    }

    if (rest.length === 1) {
      return { title, street: toTitleCase(rest[0]), region: null }
    }

    const streetParts = rest.slice(0, Math.min(2, rest.length - 1)).map(toTitleCase)
    const regionParts = rest.slice(Math.min(2, rest.length - 1)).map(toTitleCase)

    return {
      title,
      street: streetParts.join(", "),
      region: regionParts.join(", "),
    }
  }

  const renderLocationSummary = (value?: string | null) => {
    const location = summarizeLocation(value)
    return (
      <div className="space-y-1">
        <div className="font-semibold text-slate-900">{location.title}</div>
        {location.street ? <div className="text-slate-700">Street: {location.street}</div> : null}
        {location.region ? <div className="text-slate-500">Region: {location.region}</div> : null}
      </div>
    )
  }

  // Compact single-line version for table cells
  const renderLocationCell = (value?: string | null) => {
    const location = summarizeLocation(value)
    // Build a short representative string: title + first part of street/region if available
    const subtitle = location.street || location.region || null
    return (
      <div>
        <div className="font-semibold text-slate-900 truncate">{location.title || '—'}</div>
        {subtitle && (
          <div className="text-[11px] text-slate-400 truncate mt-0.5">{subtitle}</div>
        )}
      </div>
    )
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

  const getSortValue = (trip: any, field: SortField) => {
    if (field === "amount") {
      const raw = trip?.amount ?? trip?.fare ?? trip?.total ?? 0
      const amount = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, ""))
      return Number.isFinite(amount) ? amount : 0
    }

    const raw =
      field === "pickupAt"
        ? trip?.pickupTime
        : field === "dropoffAt"
          ? trip?.dropoffTime
          : trip?.scheduledDate ?? trip?.datetime ?? trip?.date ?? trip?.createdAt

    const value = raw ? new Date(raw).getTime() : 0
    return Number.isFinite(value) ? value : 0
  }

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
      return
    }

    setSortField(field)
    setSortDirection(field === "amount" ? "desc" : "asc")
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.2} aria-hidden />
    }
    return sortDirection === "asc"
      ? <ChevronUp className="h-4 w-4 shrink-0 text-[#02665e]" strokeWidth={2.4} aria-hidden />
      : <ChevronDown className="h-4 w-4 shrink-0 text-[#02665e]" strokeWidth={2.4} aria-hidden />
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
    <div className="w-full max-w-full space-y-5 overflow-x-hidden">
      <div
        className="relative overflow-hidden rounded-2xl text-white shadow-xl"
        style={{ background: "linear-gradient(135deg, #031c22 0%, #02423d 45%, #0b7a71 100%)" }}
      >
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full opacity-20 blur-3xl" style={{ background: "#35a79c" }} aria-hidden />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full opacity-10 blur-2xl" style={{ background: "#02665e" }} aria-hidden />
        <div className="relative p-5 sm:p-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/65">
            <Sparkles className="h-3 w-3" />
            Driver Operations
          </span>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10">
              <ListChecks className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">My Trips</h1>
              <p className="mt-0.5 text-xs text-white/50">Trip command center &middot; assigned &amp; live demand</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 divide-x divide-white/10 overflow-hidden rounded-xl border border-white/10 bg-white/5">
            {([
              { label: "Total", value: String(allTrips.length), compact: false },
              { label: "Active", value: String(activeTrips.length), compact: false },
              { label: "Done", value: String(completedTrips.length), compact: false },
              { label: "Value", value: `TSh\u00a0${totalTripValue.toLocaleString()}`, compact: true },
            ]).map((stat) => (
              <div key={stat.label} className="flex flex-col items-center justify-center py-4 text-center">
                <div className={`font-black text-white ${stat.compact ? "text-sm sm:text-base" : "text-2xl"}`}>{stat.value}</div>
                <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">{stat.label}</div>
              </div>
            ))}
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
            const TripsTable = ({ items, defaultAction }: { items: any[]; defaultAction: "START" | "VIEW" }) => {
              const sortedItems = items.slice().sort((left: any, right: any) => {
                const leftValue = getSortValue(left, sortField)
                const rightValue = getSortValue(right, sortField)
                return sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue
              })

              return (
              <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white/90 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.55)] backdrop-blur">
                <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-950 px-4 py-3 text-white">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">Trip Ledger</div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
                    {items.length} record{items.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="overflow-x-auto max-w-full">
                <table className="w-full min-w-[1360px] divide-y divide-slate-200 table-auto">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">
                        <button type="button" onClick={() => toggleSort("scheduled")} className="inline-flex items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-inherit shadow-none outline-none">
                          <span>Date</span>
                          {renderSortIcon("scheduled")}
                        </button>
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">
                        <button type="button" onClick={() => toggleSort("scheduled")} className="inline-flex items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-inherit shadow-none outline-none">
                          <span>Time</span>
                          {renderSortIcon("scheduled")}
                        </button>
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">
                        <button type="button" onClick={() => toggleSort("pickupAt")} className="inline-flex items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-inherit shadow-none outline-none">
                          <span>Pickup At</span>
                          {renderSortIcon("pickupAt")}
                        </button>
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">
                        <button type="button" onClick={() => toggleSort("dropoffAt")} className="inline-flex items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-inherit shadow-none outline-none">
                          <span>Drop-off At</span>
                          {renderSortIcon("dropoffAt")}
                        </button>
                      </th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200">Pick-Up</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200">Drop-off</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Trip Code</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Type</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Status</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">
                        <button type="button" onClick={() => toggleSort("amount")} className="ml-auto inline-flex items-center gap-1.5 rounded-none border-0 bg-transparent p-0 text-inherit shadow-none outline-none">
                          <span>Amount</span>
                          {renderSortIcon("amount")}
                        </button>
                      </th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-[0.18em] border-b border-slate-200 whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {sortedItems.length > 0 ? (
                      sortedItems.map((t: any) => {
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
                            <td className="px-5 py-4 text-sm text-slate-700 max-w-[180px] align-top">{renderLocationCell(t.pickup || t.from || '—')}</td>
                            <td className="px-5 py-4 text-sm text-slate-700 max-w-[180px] align-top">{renderLocationCell(t.dropoff || t.to || '—')}</td>
                            <td className="px-5 py-4 text-sm text-slate-700 font-mono font-medium whitespace-nowrap align-top">{t.trip_code || t.code || t.reference || t.tripCode || '—'}</td>
                            <td className="px-5 py-4 text-sm whitespace-nowrap align-top">{renderAssignmentBadge(source)}</td>
                            <td className="px-5 py-4 text-sm whitespace-nowrap align-top">{renderStatusBadge(t.status)}</td>
                            <td className="px-5 py-4 text-sm font-semibold text-slate-900 text-right whitespace-nowrap align-top">{formatAmount(t.amount ?? t.fare ?? t.total, t.currency ?? t.currencyCode ?? "TZS")}</td>
                            <td className="px-5 py-4 text-right whitespace-nowrap align-top">
                              {defaultAction === "START" && !isClosed ? (
                                <button
                                  type="button"
                                  onClick={() => router.push(`/driver/map?live=1&tripId=${encodeURIComponent(String(t.id))}&source=${encodeURIComponent(source)}`)}
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
                            <div className="mt-1 text-sm text-slate-500">
                              {loading
                                ? 'Preparing the trip ledger.'
                                : 'This lane is empty for now.'}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
              )
            }

            return (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                        <ListChecks className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">Admin Assigned</div>
                        <div className="text-xs text-slate-400">Directly managed operational trips</div>
                      </div>
                    </div>
                    <div className="flex h-7 min-w-[1.75rem] flex-shrink-0 items-center justify-center rounded-full bg-indigo-50 px-2.5 text-xs font-bold text-indigo-700">
                      {adminTrips.length}
                    </div>
                  </div>
                  <TripsTable items={adminTrips} defaultAction="START" />
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                        <Zap className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">On-demand / Auto</div>
                        <div className="text-xs text-slate-400">Driver-led instant matching</div>
                      </div>
                    </div>
                    <div className="flex h-7 min-w-[1.75rem] flex-shrink-0 items-center justify-center rounded-full bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700">
                      {autoTrips.length}
                    </div>
                  </div>
                  <TripsTable items={autoTrips} defaultAction="VIEW" />
                </div>
              </div>
            )
          })()}
        </div>

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
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Pick-up</div>
                            <div className="mt-2 text-sm leading-5">{renderLocationSummary(viewTrip.pickup)}</div>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Drop-off</div>
                            <div className="mt-2 text-sm leading-5">{renderLocationSummary(viewTrip.dropoff)}</div>
                          </div>
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
                    <div className="relative mt-4 space-y-2.5">
                      {routeStatusSteps(viewTrip).map((s, idx, arr) => {
                        const Icon = s.icon
                        const isStart = idx === 0
                        const isEnd = idx === arr.length - 1
                        const routeHint = isStart ? "Start point" : isEnd ? "End point" : "Route stop"
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
                          <div key={s.key} className="relative rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 sm:px-4">
                            {idx < arr.length - 1 ? (
                              <div
                                className="pointer-events-none absolute left-[1.1rem] top-[3.05rem] w-7"
                                style={{ height: "calc(100% + 1rem)" }}
                                aria-hidden
                              >
                                <svg className="h-full w-full overflow-visible" viewBox="0 0 28 140" preserveAspectRatio="none">
                                  <defs>
                                    <linearGradient id={`driver-route-thread-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                      {s.state === "done" ? (
                                        <>
                                          <stop offset="0%" stopColor="#10b981" />
                                          <stop offset="55%" stopColor="#6ee7b7" stopOpacity="0.72" />
                                          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.3" />
                                        </>
                                      ) : s.state === "active" ? (
                                        <>
                                          <stop offset="0%" stopColor="#02665e" />
                                          <stop offset="52%" stopColor="#35a79c" stopOpacity="0.75" />
                                          <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.3" />
                                        </>
                                      ) : (
                                        <>
                                          <stop offset="0%" stopColor="#cbd5e1" />
                                          <stop offset="60%" stopColor="#e2e8f0" stopOpacity="0.72" />
                                          <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.2" />
                                        </>
                                      )}
                                    </linearGradient>
                                  </defs>
                                  <path
                                    d={idx % 2 === 0 ? "M14 0 C14 16 22 22 22 42 C22 64 8 72 8 95 C8 113 14 122 14 140" : "M14 0 C14 16 6 22 6 42 C6 64 20 72 20 95 C20 113 14 122 14 140"}
                                    fill="none"
                                    stroke={`url(#driver-route-thread-${idx})`}
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                  />
                                  <path
                                    d={idx % 2 === 0 ? "M14 0 C14 16 22 22 22 42 C22 64 8 72 8 95 C8 113 14 122 14 140" : "M14 0 C14 16 6 22 6 42 C6 64 20 72 20 95 C20 113 14 122 14 140"}
                                    fill="none"
                                    stroke="rgba(255,255,255,0.45)"
                                    strokeWidth="5.5"
                                    strokeLinecap="round"
                                    opacity="0.18"
                                  />
                                </svg>
                              </div>
                            ) : null}
                            <div className="flex items-start gap-2">
                              <div className="flex w-12 flex-col items-center pt-1">
                                <div className={`relative h-10 w-10 rounded-full border border-slate-200 bg-white flex items-center justify-center ${s.state === "done" ? "text-emerald-700" : s.state === "active" ? "text-[#02665e]" : "text-slate-500"}`}>
                                  <span className={`pointer-events-none absolute inset-0 rounded-full ${s.state === "done" ? "bg-emerald-100/50" : s.state === "active" ? "bg-[#02665e]/10" : "bg-slate-100/60"}`} aria-hidden />
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className={`mt-1 h-2 w-2 rounded-full ${dotClass}`} style={{ opacity: 0.7 }} aria-hidden />
                              </div>

                              <div className={`relative min-w-0 flex-1 ${idx % 2 === 0 ? "pl-2 sm:pl-3" : "pl-5 sm:pl-6"}`}>
                                <div className="pointer-events-none absolute left-[-1.1rem] top-5 h-10 w-10 sm:left-[-1.35rem]" aria-hidden>
                                  <svg className="h-full w-full overflow-visible" viewBox="0 0 40 40" preserveAspectRatio="none">
                                    <path
                                      d={idx % 2 === 0 ? "M2 18 C10 18 10 8 20 8 C28 8 30 12 38 12" : "M2 18 C12 18 14 30 24 30 C30 30 32 24 38 24"}
                                      fill="none"
                                      stroke={s.state === "done" ? "rgba(16,185,129,0.75)" : s.state === "active" ? "rgba(2,102,94,0.78)" : "rgba(148,163,184,0.55)"}
                                      strokeWidth="2.1"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </div>

                                <div className="rounded-[1.15rem] border border-white/80 bg-white px-3 py-3 shadow-sm sm:px-4">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${isStart ? "text-emerald-700" : isEnd ? "text-[#02665e]" : "text-slate-400"}`}>
                                        {routeHint}
                                      </div>
                                      <div className="mt-1 text-sm font-semibold text-slate-900">{s.label}</div>
                                      <div className="mt-0.5 text-xs text-slate-600">{fmtDateTime(s.at)}</div>
                                    </div>
                                    <span className={`mt-0.5 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeClass}`}>
                                      {s.state === "done" ? "Done" : s.state === "active" ? "Active" : "Pending"}
                                    </span>
                                  </div>
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
