"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import DriverPageHeader from "@/components/DriverPageHeader"
import TableRow from "@/components/TableRow"
import Image from "next/image"
import QRCode from "@/components/QRCode"

export default function InvoiceDetailPage() {
  const params = useParams()
  const id = params?.id
  const [invoice, setInvoice] = useState<any | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/driver/invoices/${id}`, { credentials: "include" })
        if (!res.ok) {
          // invoice not found on server
          setInvoice(null)
        } else {
          const data = await res.json()
          if (!cancelled) setInvoice(data)
        }
      } catch (e) {
        // network error or CORS — show not found
        setInvoice(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  const handleDownload = async () => {
    if (!invoice) return
    try {
      const downloadUrl = invoice.download_url || invoice.pdf_url || invoice.preview_url || invoice.file_url
      if (!downloadUrl) throw new Error("No download url")
      const res = await fetch(downloadUrl, { credentials: "include" })
      if (!res.ok) throw new Error("Download failed")
      const blob = await res.blob()
      const filename = invoice.filename || `invoice-${invoice.invoice_number || id}.pdf`
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(blobUrl)
      try {
        window.dispatchEvent(new CustomEvent("nols:toast", { detail: { type: "success", title: "Download started", duration: 2500 } }))
      } catch {}
    } catch (e) {
      try {
        window.dispatchEvent(new CustomEvent("nols:toast", { detail: { type: "error", title: "Could not download invoice" } }))
      } catch {}
    }
  }
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

  const previewUrl = invoice?.pdf_url || invoice?.preview_url || invoice?.file_url || invoice?.download_url

  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null)

  const [sentNotice, setSentNotice] = useState<string | null>(null)

  // show a persistent notice on the detail page if the invoice was just sent
  useEffect(() => {
    try {
      const last = sessionStorage.getItem('nols:last_sent_invoice')
      if (last && id && String(last) === String(id)) {
        setSentNotice('Invoice successfully sent to nolsaf — please wait for processing/confirmation.')
        sessionStorage.removeItem('nols:last_sent_invoice')
      }
    } catch (e) {
      // ignore
    }
  }, [id])

  

  // Attempt to fetch the preview as an authenticated blob (cookie session).
  useEffect(() => {
    let cancelled = false
    const loadPreview = async () => {
      if (!previewUrl) return
      try {
        const res = await fetch(previewUrl, { credentials: "include" })
        if (!res.ok) throw new Error("preview fetch failed")
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        if (!cancelled) setPreviewBlobUrl(url)
      } catch (e) {
        // failed to fetch preview with auth; leave previewBlobUrl null and fallback to link
      }
    }

    loadPreview()

    return () => {
      cancelled = true
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl)
      }
    }
  }, [previewUrl, previewBlobUrl])

  const router = useRouter()

  const goBack = () => {
    // prefer router.back(); falls back to history.back
    try {
      router.back()
    } catch {
      window.history.back()
    }
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center">
        <DriverPageHeader />
        <div className="mt-4 relative">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10">
            <svg width="420" height="120" viewBox="0 0 420 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform -rotate-18">
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="48" fontFamily="Arial, Helvetica, sans-serif" fill="#02665e">NoLSAF</text>
            </svg>
          </div>
          <div className="text-center relative">
            <div className="flex items-center justify-center gap-4 mb-2">
              <Image src="/assets/nolsnewlog.png" alt="NoLSAF" width={48} height={48} unoptimized />
            </div>
            <div className="text-2xl font-bold">NoLSAF Driver Invoice</div>
            <div className="mt-3 text-sm text-slate-700">
              <div>{invoice?.driver?.name || invoice?.driver_name || invoice?.driverName || '—'}</div>
              <div>Driver ID: {invoice?.driver?.id || invoice?.driver_id || invoice?.driverId || '—'}</div>
              <div>Phone: {invoice?.driver?.phone || invoice?.driver_phone || invoice?.driverPhone || '—'}</div>
              <div>
                Location: {invoice?.driver?.location?.region || invoice?.driver_region || invoice?.driverLocation?.region || invoice?.region || '—'}{(invoice?.driver?.location?.district || invoice?.driver_district || invoice?.driverLocation?.district) ? `, ${invoice?.driver?.location?.district || invoice?.driver_district || invoice?.driverLocation?.district}` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border print-invoice">
        {sentNotice && (
          <div className="mb-4 rounded-md bg-amber-50 border border-amber-100 p-3 text-amber-800">
            {sentNotice}
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span aria-hidden className="dot-spinner dot-sm">
              <span className="dot dot-blue" />
              <span className="dot dot-black" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </span>
          </div>
        ) : invoice ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-slate-500">Invoice #</div>
                    <div className="font-medium text-lg">{invoice.invoice_number || invoice.number || invoice.id}</div>
                    <div className="text-sm text-slate-500">Date: {formatDate(invoice.date || invoice.created_at)}</div>
                    {invoice.due_date && <div className="text-sm text-slate-500">Due: {formatDate(invoice.due_date)}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">Status</div>
                      <div className="font-medium">
                        {(() => {
                          const s = String(invoice.status || invoice.state || '').toLowerCase()
                          if (s === 'unpaid') return 'New'
                          if (s === 'sent' || s === 'sending' || s === 'sent_to_nolsaf' || invoice.sent === true) return 'Sent'
                          if (s === 'paid') return 'Paid'
                          if (s === 'overdue') return 'Overdue'
                          return invoice.status || invoice.state || '—'
                        })()}
                      </div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-600">Bill To</h4>
                    <div className="mt-2 text-sm text-slate-700">
                      {invoice.customer?.name || invoice.customer_name || invoice.client?.name || '—'}
                      <div>{invoice.customer?.email || invoice.customer_email || invoice.client?.email}</div>
                      {invoice.customer?.address && <div className="mt-1 text-sm text-slate-500">{invoice.customer.address}</div>}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-slate-600">From</h4>
                    <div className="mt-2 text-sm text-slate-700">{invoice.vendor?.name || invoice.company_name || 'NOLS'}</div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-slate-600">Items</h4>
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full divide-y table-auto">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Description</th>
                          <th className="px-4 py-2 text-left text-sm font-medium text-slate-600">Qty</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Unit</th>
                          <th className="px-4 py-2 text-right text-sm font-medium text-slate-600">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {(invoice.items && invoice.items.length > 0 ? invoice.items : []).map((it: any, i: number) => (
                          <TableRow key={i}>
                            <td className="px-4 py-3 text-sm text-slate-700">{it.description || it.label || '—'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700">{it.quantity ?? it.qty ?? '—'}</td>
                            <td className="px-4 py-3 text-sm text-slate-700 text-right">{formatAmount(it.unit_price ?? it.price)}</td>
                            <td className="px-4 py-3 text-sm text-slate-700 text-right">{formatAmount(it.total ?? (it.qty && it.price ? it.qty * it.price : it.amount))}</td>
                          </TableRow>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                  <div className="mt-6 flex justify-between items-center">
                  <div>
                    <button onClick={goBack} className="inline-flex items-center px-3 py-1 border rounded text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900">← Back</button>
                  </div>
                  <div className="w-full sm:w-1/2 lg:w-1/3">
                    <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span>{formatAmount(invoice.subtotal || invoice.amount || invoice.total)}</span></div>
                    {invoice.tax && <div className="flex justify-between text-sm text-slate-600 mt-1"><span>Tax</span><span>{formatAmount(invoice.tax)}</span></div>}
                    <div className="flex justify-between text-sm font-medium mt-2"><span>Total</span><span>{formatAmount(invoice.total || invoice.amount)}</span></div>
                      <div className="mt-4 flex space-x-2 justify-end">
                      <a href={`/driver/invoices/${id}/viewer`} className="inline-flex items-center px-3 py-1 border rounded text-sm text-sky-600 hover:bg-sky-50">Open in Viewer</a>
                      {!(String(invoice.status || invoice.state || '').toLowerCase() === 'sent' || String(invoice.status || invoice.state || '').toLowerCase() === 'sending' || invoice.sent === true) && (
                        <a href={`/driver/invoices/${id}/send`} className="inline-flex items-center px-3 py-1 border rounded text-sm text-emerald-700 hover:bg-emerald-50">Send Invoice</a>
                      )}
                      <a href={`/driver/invoices/${id}/print`} className="inline-flex items-center px-3 py-1 border rounded text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900">Print view</a>
                      <button onClick={handleDownload} className="inline-flex items-center px-3 py-1 border rounded text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900">Download PDF</button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hidden md:block">
                {previewBlobUrl ? (
                  <div className="border rounded overflow-hidden">
                    <iframe src={previewBlobUrl} title="Invoice preview" className="w-full h-96" />
                  </div>
                ) : previewUrl ? (
                  <div className="border rounded overflow-hidden">
                    <iframe src={previewUrl} title="Invoice preview" className="w-full h-96" />
                  </div>
                ) : (
                  <div className="h-96 flex items-center justify-center text-slate-500">No preview available</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">Invoice not found.</div>
        )}
      </section>
      {/* Print footer */}
      <div className="invoice-footer" aria-hidden>
        <div className="invoice-footer-left">
          <Image src="/assets/nolsnewlog.png" alt="NoLSAF" width={36} height={36} unoptimized className="invoice-footer-logo" />
          <span className="invoice-footer-company">NoLSAF Inc Limited</span>
        </div>
        <div className="invoice-footer-center pagenum" />
        <div className="invoice-footer-right">
          {id ? <QRCode value={`${typeof window !== 'undefined' ? window.location.origin : ''}/driver/invoices/${id}/print`} size={64} /> : null}
        </div>
      </div>
    </div>
  )
}
