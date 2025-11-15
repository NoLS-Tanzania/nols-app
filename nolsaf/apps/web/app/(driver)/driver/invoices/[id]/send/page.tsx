"use client"

import React, { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import DriverPageHeader from "@/components/DriverPageHeader"

export default function InvoiceSendPage() {
  const params = useParams()
  const id = params?.id
  const router = useRouter()
  const [invoice, setInvoice] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  // tripCode removed — sending will use the existing invoice->trip association (or server-side logic)

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
        if (!res.ok) {
          setInvoice(null)
        } else {
          const data = await res.json()
          if (!cancelled) {
            setInvoice(data)
          }
        }
      } catch (e) {
        setInvoice(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  const handleSend = async () => {
    if (!id) return

    const confirmed = window.confirm("Are you sure you want to send this invoice to nolsaf in claiming for payment?")
    if (!confirmed) return

    setSending(true)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/driver/invoices/${id}/send`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!res.ok) {
        const errText = await res.text()
        try {
          window.dispatchEvent(new CustomEvent("nols:toast", { detail: { type: "error", title: "Send failed", message: errText || "Could not send invoice." } }))
        } catch {}
      } else {
        try {
          // persist a short-lived marker so the invoice detail page can show a persistent notification after redirect
          try {
            sessionStorage.setItem('nols:last_sent_invoice', String(id))
          } catch {}
          // update any locally persisted sample invoices so UI reflects sent state
          // removed sample-data mutation: do not persist demo/sample invoices to localStorage

          window.dispatchEvent(new CustomEvent("nols:toast", { detail: { type: "success", title: "Invoice sent to nolsaf", message: "The invoice was successfully sent to nolsaf — please wait for processing/confirmation.", duration: 4000 } }))
        } catch {}
        // redirect back to invoice details
        router.push(`/driver/invoices/${id}`)
      }
    } catch (e) {
      try {
        window.dispatchEvent(new CustomEvent("nols:toast", { detail: { type: "error", title: "Send failed" } }))
      } catch {}
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center">
        <DriverPageHeader />
  <h1 className="mt-4 text-xl font-semibold">Send Invoice</h1>
  <p className="mt-2 text-sm text-slate-500">Confirm and send this invoice to nolsaf for claiming payment.</p>
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
        {loading ? (
          <div className="py-12 text-center">Loading…</div>
        ) : invoice ? (
            <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-500">Invoice #</div>
              <div className="font-medium">{invoice.invoice_number || invoice.id}</div>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={handleSend} disabled={sending} className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded disabled:opacity-60">{sending ? 'Sending…' : 'Send Invoice'}</button>
              <button onClick={() => router.push(`/driver/invoices/${id}`)} className="inline-flex items-center px-4 py-2 border rounded">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500">Invoice not found.</div>
        )}
      </section>
    </div>
  )
}
