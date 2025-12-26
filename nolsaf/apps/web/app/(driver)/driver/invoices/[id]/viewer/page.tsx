"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import DriverPageHeader from "@/components/DriverPageHeader"
import PDFViewer from "@/components/PDFViewer"
import Image from "next/image"
import QRCode from "@/components/QRCode"

export default function InvoiceViewerPage() {
  const params = useParams()
  const id = params?.id
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/driver/invoices/${id}`, { credentials: "include" })
        if (!res.ok) return
        const data = await res.json()
        const url = data.pdf_url || data.preview_url || data.file_url || data.download_url
        if (!cancelled) {
          setPreviewUrl(url)
          setInvoice(data)
        }
      } catch (e) {
        // network/error — no local sample fallback; viewer will show no preview
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])


  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center">
        <DriverPageHeader title="Driver Invoice" />
        <div className="mt-4 relative">
          {/* Watermark (centered, light) */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10 print:opacity-10">
            <svg width="420" height="120" viewBox="0 0 420 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform rotate-[-18deg]">
              <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="48" fontFamily="Arial, Helvetica, sans-serif" fill="#02665e">NoLSAF</text>
            </svg>
          </div>
          <div className="flex items-center justify-center gap-4 relative">
            <Image src="/assets/nolsnewlog.png" alt="NoLSAF" width={48} height={48} unoptimized />
            <div>
              <div className="text-2xl font-bold">NoLSAF Driver Invoice</div>
              <div className="mt-2 text-sm text-slate-700">
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
      </div>

      <section className="mx-auto max-w-4xl bg-white rounded-lg p-6 border print-invoice">
        {loading ? (
          <div className="py-12 text-center">Loading…</div>
        ) : previewUrl ? (
          <PDFViewer url={previewUrl} />
        ) : (
          <div className="py-12 text-center text-slate-500">No preview available for this invoice.</div>
        )}
      </section>

      {/* Print footer (hidden on-screen, displayed when printing) */}
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

