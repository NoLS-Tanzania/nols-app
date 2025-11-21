"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import DriverPageHeader from "@/components/DriverPageHeader"
import TableRow from "@/components/TableRow"
import { FileText, Eye, Printer, Send, Check } from "lucide-react"

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
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const url = `${process.env.NEXT_PUBLIC_API_URL}/driver/invoices?page=${pageToFetch}&pageSize=${pageSize}`
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (res.status === 204 || res.status === 404) {
        const arr: any[] = []
        setInvoices(arr)
        try {
          window.dispatchEvent(
            new CustomEvent("nols:toast", {
              detail: { type: "info", title: "No invoices found", message: "Maybe no invoices exist.", duration: 3000 },
            })
          )
        } catch (e) {
          // ignore
        }
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

      if (arr.length === 0 && pageToFetch === 1) {
        try {
          window.dispatchEvent(
            new CustomEvent("nols:toast", {
              detail: { type: "info", title: "No invoices found", message: "Maybe no invoices exist.", duration: 3000 },
            })
          )
        } catch (e) {
          // ignore
        }
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

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center">
        <DriverPageHeader />
        <h1 className="mt-4 text-xl font-semibold inline-flex items-center justify-center">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-slate-100 text-slate-700 mr-2">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          Invoices
        </h1>
        {/* removed sample/demo loader button - invoices are loaded from the API */}
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
        <div>
          {loading && (
            <div className="flex items-center justify-center space-x-3 text-gray-600 mb-4">
              <span aria-hidden className="dot-spinner dot-sm" aria-live="polite">
                <span className="dot dot-blue" />
                <span className="dot dot-black" />
                <span className="dot dot-yellow" />
                <span className="dot dot-green" />
              </span>
              <span>Loading invoices…</span>
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y table-auto">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Invoice #</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Trip Code</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Due</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Status</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Amount</th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoices && invoices.length > 0 ? (
                  invoices.map((inv: any) => (
                    <TableRow key={inv.id || inv.invoice_number || JSON.stringify(inv)}>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(inv.date || inv.created_at)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{inv.invoice_number || inv.number || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 font-mono">{inv.trip_code || inv.code || inv.reference || inv.tripCode || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{renderStatusBadge(inv.status || inv.state)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right">{formatAmount(inv.amount || inv.total)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 text-right relative">
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
                                  className="p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200"
                                  title="Actions"
                                >
                                  <Eye className="h-5 w-5 text-sky-600 cursor-pointer" aria-hidden />
                                </button>

                                {openMenuId === idKey && (
                                  <div className="absolute right-0 mt-2 w-36 bg-white border rounded shadow z-10 invoice-actions-popover">
                                    <div className="py-1">
                                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleView(inv) }} className="w-full text-left px-3 py-2 text-sm text-sky-600 hover:bg-slate-50 flex items-center space-x-2">
                                        <Eye className="h-4 w-4" />
                                        <span>View</span>
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handlePrint(inv) }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-2">
                                        <Printer className="h-4 w-4" />
                                        <span>Print</span>
                                      </button>
                                      {!isSent && (
                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); handleSendAction(inv) }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-2">
                                          <Send className="h-4 w-4" />
                                          <span>Send</span>
                                        </button>
                                      )}
                                      {isSent && (
                                        <div className="w-full text-left px-3 py-2 text-sm text-slate-400 flex items-center space-x-2">
                                          <Check className="h-4 w-4 text-slate-400" />
                                          <span>Already sent</span>
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
                    <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500 text-right">—</td>
                    <td className="px-4 py-3 text-sm text-slate-500 text-right">—</td>
                  </tr>
                )}
              </tbody>
            </table>
            {hasMore && (
              <div className="mt-4 text-center">
                <button onClick={handleLoadMore} className="inline-flex items-center px-4 py-2 border border-slate-200 rounded-md text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900">
                  Load more
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
