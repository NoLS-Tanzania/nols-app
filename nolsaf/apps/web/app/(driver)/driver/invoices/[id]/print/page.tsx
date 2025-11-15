"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import DriverPageHeader from "@/components/DriverPageHeader"
import Image from "next/image"
import QRCode from "@/components/QRCode"

export default function InvoicePrintPage() {
  const params = useParams()
  const id = params?.id
  const [invoice, setInvoice] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/driver/invoices/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setInvoice(data)
      } catch (e) {
        // network/error — no local sample fallback; print view will show invoice not found
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  const print = () => {
    window.print()
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
          <div className="flex items-center justify-center gap-4 relative">
            <Image src="/assets/nolsnewlog.png" alt="NoLSAF" width={48} height={48} unoptimized />
            <div>
              <h1 className="text-xl font-semibold">Print Invoice</h1>
            </div>
          </div>
        </div>
      </div>

  <section className="mx-auto max-w-4xl bg-white rounded-lg p-6 border print-invoice">
        {loading ? (
          <div className="py-12 text-center">Loading…</div>
        ) : invoice ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <div className="text-sm text-slate-500">Invoice #</div>
                <div className="font-medium">{invoice.invoice_number || invoice.number || invoice.id}</div>
              </div>
              <div>
                <button onClick={print} className="px-3 py-1 border rounded">Print</button>
              </div>
            </div>

            <div className="text-center mb-4">
              <div className="text-xl font-bold">NoLSAF Driver Invoice</div>
              <div className="mt-3 text-sm text-slate-700">
                <div>{invoice.driver?.name || invoice.driver_name || invoice.driverName || '—'}</div>
                <div>Driver ID: {invoice.driver?.id || invoice.driver_id || invoice.driverId || '—'}</div>
                <div>Phone: {invoice.driver?.phone || invoice.driver_phone || invoice.driverPhone || '—'}</div>
                <div>
                  Location: {invoice.driver?.location?.region || invoice.driver_region || invoice.driverLocation?.region || invoice.region || '—'}{(invoice.driver?.location?.district || invoice.driver_district || invoice.driverLocation?.district) ? `, ${invoice.driver?.location?.district || invoice.driver_district || invoice.driverLocation?.district}` : ''}
                </div>
              </div>
            </div>

            <hr className="my-4 border-slate-200" />

            <div className="prose max-w-none">
              <h4 className="font-medium">Bill To: NoLSAF Inc Limited</h4>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-3 py-2 border">Description</th>
                      <th className="text-left px-3 py-2 border">Qty</th>
                      <th className="text-right px-3 py-2 border">Unit</th>
                      <th className="text-right px-3 py-2 border">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items || []).map((it: any, i: number) => (
                      <tr key={i} className="border-t">
                        <td className="px-3 py-2 align-top">{it.description || it.label || '—'}</td>
                        <td className="px-3 py-2 align-top">{it.quantity ?? it.qty ?? '—'}</td>
                        <td className="px-3 py-2 align-top text-right">{it.unit_price ?? it.price ?? '—'}</td>
                        <td className="px-3 py-2 align-top text-right">{it.total ?? (it.qty && it.price ? it.qty * it.price : it.amount) ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 text-right font-medium">Total: {invoice.total || invoice.amount || '—'}</div>
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
