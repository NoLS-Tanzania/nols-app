"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import TableRow from "@/components/TableRow"
import { FileText, Eye, Printer, Send, Check, RefreshCcw, Clock, AlertTriangle } from "lucide-react"

function RevenueVisualization({ amounts }: { amounts: number[] }) {
  const raw = amounts.length >= 4 ? amounts.slice(-18) : [40, 65, 50, 80, 55, 90, 70, 60, 85, 75, 95, 65, 78, 88, 60, 72, 55, 82]
  const max = Math.max(...raw, 1)
  const W = 480
  const H = 110
  const count = raw.length
  const slot = W / count
  const barW = Math.max(8, slot - 6)
  const pts = raw.map((v, i) => {
    const x = i * slot + slot / 2
    const y = H - Math.max(8, (v / max) * (H - 16)) - 4
    return [x, y] as [number, number]
  })
  let linePath = ""
  if (pts.length >= 2) {
    linePath = `M ${pts[0][0]} ${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
      const cpx = (pts[i - 1][0] + pts[i][0]) / 2
      linePath += ` C ${cpx} ${pts[i - 1][1]} ${cpx} ${pts[i][1]} ${pts[i][0]} ${pts[i][1]}`
    }
  }
  const areaPath = linePath + ` L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 w-full h-full"
      aria-hidden
    >
      <defs>
        <linearGradient id="rvGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.25" />
          <stop offset="100%" stopColor="white" stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {raw.map((v, i) => {
        const h = Math.max(8, (v / max) * (H - 16))
        return (
          <rect
            key={i}
            x={i * slot + (slot - barW) / 2}
            y={H - h}
            width={barW}
            height={h}
            rx={4}
            fill="white"
            fillOpacity={0.08}
          />
        )
      })}
      {pts.length >= 2 && <path d={areaPath} fill="url(#rvGrad)" />}
      {pts.length >= 2 && <path d={linePath} fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.45" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="white" fillOpacity="0.5" />
      ))}
    </svg>
  )
}

export default function DriverInvoicesPage() {
  const [invoices, setInvoices] = useState<any[] | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [page, setPage] = useState<number>(1)
  const [pageSize] = useState<number>(20)
  const [hasMore, setHasMore] = useState<boolean>(false)

  const refreshInterval = useRef<number | null>(null)
  const toastShown = useRef(false)

  const fetchInvoices = useCallback(async (pageToFetch = 1) => {
    setLoading(true)
    try {
      const url = `/api/driver/invoices?page=${pageToFetch}&pageSize=${pageSize}`
      const res = await fetch(url, {
        credentials: "include",
      })

      if (res.status === 204 || res.status === 404) {
        setInvoices([])
        toastShown.current = false
        setLoading(false)
        setHasMore(false)
        return
      }

      if (!res.ok) throw new Error("Network response was not ok")

      const data = await res.json()
      const arr = Array.isArray(data) ? data : data?.invoices ?? []

      if (pageToFetch > 1) {
        setInvoices((prev) => [...(prev ?? []), ...arr])
      } else {
        setInvoices(arr)
      }

      const serverHasMore = !!data.next_page || (Array.isArray(arr) && arr.length === pageSize)
      setHasMore(serverHasMore)
      setPage(pageToFetch)

      toastShown.current = false
    } catch (err) {
      if (!toastShown.current) {
        try {
          window.dispatchEvent(
            new CustomEvent("nols:toast", {
              detail: {
                type: "error",
                title: "Could not load invoices",
                message: "There was a problem loading invoices. Please try again later.",
                duration: 5000,
              },
            })
          )
        } catch (e) {
          // ignore
        }
        toastShown.current = true
      }

      setInvoices([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    fetchInvoices(1)

    refreshInterval.current = window.setInterval(() => {
      fetchInvoices(1)
    }, 3_600_000) as unknown as number

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
        refreshInterval.current = null
      }
    }
  }, [fetchInvoices])

  // close actions menu when clicking outside or pressing Escape
  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      const t = ev.target as HTMLElement | null
      // if click is inside any open popover/menu, ignore
      if (t && t.closest && t.closest('.invoice-actions-popover')) return
      if (t && t.closest && t.closest('[aria-label="Invoice actions"]')) return
      setOpenMenuId(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenuId(null)
    }
    document.addEventListener("click", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("click", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  const formatAmount = (amt: any, currency?: string | null) => {
    if (amt == null) return "—"
    const n = typeof amt === "number" ? amt : Number(String(amt).replace(/,/g, ""))
    if (!Number.isFinite(n)) return String(amt)
    const code = (currency || "TZS").toUpperCase()
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        maximumFractionDigits: code === "TZS" ? 0 : 2,
      }).format(n)
    } catch {
      return `${n.toLocaleString()} ${code}`
    }
  }

  const formatDate = (iso?: string) => {
    if (!iso) return "-"
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "-"
    return d.toLocaleDateString()
  }

  const renderStatusBadge = (statusVal?: any) => {
    const raw = String(statusVal || '').toLowerCase()
    // map values: unpaid -> New, paid -> Paid, overdue -> Overdue, sent/sending -> Sent
    let label = statusVal || '—'
    let classes = 'bg-slate-100 text-slate-700'

    if (raw === 'paid') {
      label = 'Paid'
      classes = 'bg-green-50 text-green-700'
    } else if (raw === 'unpaid') {
      label = 'New'
      classes = 'bg-rose-50 text-rose-700'
    } else if (raw === 'overdue') {
      label = 'Overdue'
      classes = 'bg-amber-50 text-amber-700'
    } else if (raw === 'sent' || raw === 'sending' || raw === 'sent_to_nolsaf') {
      label = 'Sent'
      classes = 'bg-sky-50 text-sky-700'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
        {label}
      </span>
    )
  }

  const handleView = (inv: any) => {
    try {
      // Navigate to the in-app invoice detail route
      const id = inv.id || inv.invoice_number || inv.number
      if (!id) throw new Error("Missing invoice id")
      window.location.href = `/driver/invoices/${id}`
    } catch (e) {
      try {
        window.dispatchEvent(new CustomEvent("nols:toast", { detail: { type: "error", title: "Could not open invoice" } }))
      } catch {}
    }
  }

  // NOTE: Download action removed from primary actions menu per UX change.

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const handlePrint = (inv: any) => {
    try {
      const id = inv.id || inv.invoice_number || inv.number
      if (!id) throw new Error("Missing invoice id")
      window.location.href = `/driver/invoices/${id}/print`
    } catch (e) {
      try {
        window.dispatchEvent(new CustomEvent("nols:toast", { detail: { type: "error", title: "Could not open print view" } }))
      } catch {}
    }
  }

  const handleSendAction = (inv: any) => {
    try {
      const id = inv.id || inv.invoice_number || inv.number
      if (!id) throw new Error("Missing invoice id")
      window.location.href = `/driver/invoices/${id}/send`
    } catch (e) {
      try {
        window.dispatchEvent(new CustomEvent("nols:toast", { detail: { type: "error", title: "Could not open send view" } }))
      } catch {}
    }
  }

  const handleLoadMore = () => {
    if (!hasMore) return
    fetchInvoices(page + 1)
  }

  // sample/demo loaders removed — invoices are loaded from the backend only

  // Computed stats
  const allInvoices = invoices ?? []
  const totalAmount = allInvoices.reduce((s: number, inv: any) => s + (Number(inv.amount || inv.total) || 0), 0)
  const paidInvoices = allInvoices.filter((inv: any) => String(inv.status || inv.state || '').toLowerCase() === 'paid')
  const paidAmount = paidInvoices.reduce((s: number, inv: any) => s + (Number(inv.amount || inv.total) || 0), 0)
  const dominantCurrency = (allInvoices.find((inv: any) => inv.currency)?.currency as string | undefined) ?? "TZS"
  const overdueCount = allInvoices.filter((inv: any) => String(inv.status || inv.state || '').toLowerCase() === 'overdue').length
  const pendingCount = allInvoices.filter((inv: any) => { const st = String(inv.status || inv.state || '').toLowerCase(); return st === 'unpaid' || st === 'new' || st === 'pending' }).length
  const amounts = allInvoices.map((inv: any) => Number(inv.amount || inv.total) || 0).filter((n: number) => n > 0)

  return (
    <div className="w-full max-w-full space-y-5 pb-8">

      {/* ── Hero header with revenue visualization ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #02665e 0%, #014e47 55%, #013d38 100%)", minHeight: 210 }}
      >
        <RevenueVisualization amounts={amounts} />
        <div className="relative z-10 px-5 pt-6 pb-5">
          {/* Title row */}
          <div className="flex items-start gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/20">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white tracking-tight">Invoices</h1>
              <p className="text-white/55 text-sm">Your earnings &amp; billing records</p>
            </div>
            <button
              onClick={() => fetchInvoices(1)}
              disabled={loading}
              className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors flex-shrink-0"
              title="Refresh"
            >
              <RefreshCcw className={`h-4 w-4 text-white ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          {/* Stats tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
              <p className="text-white/55 text-xs font-medium mb-1">Total Revenue</p>
              <p className="text-white font-bold text-base leading-tight">{formatAmount(totalAmount, dominantCurrency)}</p>
              <p className="text-white/45 text-xs mt-0.5">{allInvoices.length} invoice{allInvoices.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
              <p className="text-white/55 text-xs font-medium mb-1 flex items-center gap-1"><Check className="h-3 w-3" /> Paid</p>
              <p className="text-emerald-300 font-bold text-base leading-tight">{formatAmount(paidAmount, dominantCurrency)}</p>
              <p className="text-white/45 text-xs mt-0.5">{paidInvoices.length} paid</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
              <p className="text-white/55 text-xs font-medium mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</p>
              <p className="text-amber-300 font-bold text-base leading-tight">{pendingCount}</p>
              <p className="text-white/45 text-xs mt-0.5">awaiting payment</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
              <p className="text-white/55 text-xs font-medium mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overdue</p>
              <p className="text-rose-300 font-bold text-base leading-tight">{overdueCount}</p>
              <p className="text-white/45 text-xs mt-0.5">need attention</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Invoice table card ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-[#02665e]/10 text-[#02665e] flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <span className="font-semibold text-slate-800">Invoice Records</span>
          {loading && (
            <span aria-hidden className="dot-spinner dot-sm ml-auto" aria-live="polite">
              <span className="dot dot-blue" />
              <span className="dot dot-black" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] table-auto">
            <thead>
              <tr className="bg-[#02665e]/5 border-b border-[#02665e]/10">
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#02665e] uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#02665e] uppercase tracking-wider">Invoice #</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#02665e] uppercase tracking-wider">Trip Code</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#02665e] uppercase tracking-wider">Due</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-[#02665e] uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#02665e] uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-[#02665e] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices && invoices.length > 0 ? (
                invoices.map((inv: any) => (
                  <TableRow key={inv.id || inv.invoice_number || JSON.stringify(inv)}>
                    <td className="px-5 py-3.5 text-sm text-slate-700 whitespace-nowrap">{formatDate(inv.date || inv.created_at)}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{inv.invoice_number || inv.number || '—'}</td>
                    <td className="px-5 py-3.5 text-xs font-mono text-slate-600 whitespace-nowrap">{inv.trip_code || inv.code || inv.reference || inv.tripCode || '—'}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-700 whitespace-nowrap">{formatDate(inv.due_date)}</td>
                    <td className="px-5 py-3.5">{renderStatusBadge(inv.status || inv.state)}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-900 text-right whitespace-nowrap">{formatAmount(inv.amount || inv.total, inv.currency)}</td>
                    <td className="px-5 py-3.5 text-right relative whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        {(() => {
                          const idKey = String(inv.id || inv.invoice_number || inv.number || JSON.stringify(inv))
                          const invStatus = String(inv.status || inv.state || '').toLowerCase()
                          const isSent = inv.sent === true || invStatus === 'sent' || invStatus === 'sending' || invStatus === 'sent_to_nolsaf'
                          return (
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === idKey ? null : idKey) }}
                                aria-haspopup="true"
                                aria-label="Invoice actions"
                                className="p-1.5 rounded-lg hover:bg-[#02665e]/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 transition-colors"
                                title="Actions"
                              >
                                <Eye className="h-5 w-5 text-[#02665e] cursor-pointer" aria-hidden />
                              </button>
                              {openMenuId === idKey && (
                                <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-10 invoice-actions-popover">
                                  <div className="py-1.5">
                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleView(inv) }} className="w-full text-left px-4 py-2 text-sm text-[#02665e] hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                      <Eye className="h-4 w-4" /><span>View</span>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlePrint(inv) }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                      <Printer className="h-4 w-4" /><span>Print</span>
                                    </button>
                                    {!isSent && (
                                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleSendAction(inv) }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                                        <Send className="h-4 w-4" /><span>Send</span>
                                      </button>
                                    )}
                                    {isSent && (
                                      <div className="w-full text-left px-4 py-2 text-sm text-slate-400 flex items-center gap-2">
                                        <Check className="h-4 w-4" /><span>Already sent</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </td>
                  </TableRow>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    {!loading && (
                      <div className="flex flex-col items-center">
                        <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                          <FileText className="h-7 w-7 text-slate-300" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600 mb-1">No invoices found</p>
                        <p className="text-xs text-slate-400">Invoices will appear here once created</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {hasMore && (
            <div className="px-5 py-4 border-t border-slate-50">
              <button
                onClick={handleLoadMore}
                className="w-full py-2.5 rounded-xl border border-[#02665e]/20 text-sm font-semibold text-[#02665e] hover:bg-[#02665e]/5 transition-colors"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
