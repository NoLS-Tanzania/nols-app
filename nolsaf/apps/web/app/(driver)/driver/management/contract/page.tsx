"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronLeft } from 'lucide-react'
import DriverPageHeader from "@/components/DriverPageHeader"

type ContractResponse = {
  url?: string
  // future: other metadata like mime, filename
}

export default function ContractPage() {
  const [loading, setLoading] = useState(true)
  const [contractUrl, setContractUrl] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadContract() {
      setLoading(true)
      setUnauthorized(false)
      setError(null)

      try {
        // Try to fetch contract URL from the backend. The endpoint is expected
        // to return JSON like { url: 'https://...' } where the URL points to
        // a PDF or other viewable resource. Adjust endpoint as needed.
        const res = await fetch('/api/driver/contract', { credentials: 'include' })

        if (!mounted) return

        if (res.status === 401) {
          setUnauthorized(true)
          setLoading(false)
          return
        }

        if (!res.ok) {
          setError(`Failed to load contract (status ${res.status})`)
          setLoading(false)
          return
        }

        const body: ContractResponse = await res.json()
        if (body.url) setContractUrl(body.url)
        else setError('No contract available.')
      } catch (err: any) {
        setError(err?.message ?? String(err))
      } finally {
        setLoading(false)
      }
    }

    loadContract()

    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center">
  <DriverPageHeader title="Agreed Contract" />
    {/* Page subtitle removed to keep the header (icon + title) as the single visible label */}
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
        {loading ? (
          <div className="py-12 text-center">
            <div className="dot-spinner dot-md mx-auto" aria-hidden>
              <span className="dot dot-blue" />
              <span className="dot dot-black" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <p className="text-sm text-slate-500 mt-4">Loading contract…</p>
          </div>
        ) : unauthorized ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-700">You must be signed in to view your contract.</p>
            <div className="mt-4">
              <Link href="/login" className="text-sky-600">Sign in</Link>
            </div>
          </div>
        ) : contractUrl ? (
          <div className="space-y-4">
            <div className="h-[700px] border rounded overflow-hidden">
              {/* iframe will embed the contract PDF or document. The URL should be
                  a direct link to a PDF or an embeddable document. */}
              <iframe src={contractUrl} title="Contract" className="w-full h-full" />
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-600">If the document does not display, you can download it.</div>
              <a href={contractUrl} target="_blank" rel="noreferrer" className="text-sky-600 text-sm">Open / Download</a>
            </div>
          </div>
        ) : (
          <div>
            <p className="mt-2 text-sm text-slate-600">{error ?? 'No contract is available at the moment.'}</p>
            <div className="mt-6">
              <p className="text-xs text-slate-500">If you expect a contract but don’t see it, contact support or check back later.</p>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Link
            href="/driver/management"
            className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1"
            aria-label="Back to Management"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span className="sr-only">Back to Management</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
