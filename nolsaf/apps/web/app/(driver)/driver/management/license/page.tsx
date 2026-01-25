"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import DriverPageHeader from "@/components/DriverPageHeader"
import Image from "next/image"
import { ChevronLeft } from 'lucide-react'

type LicenseResponse = {
  url?: string
  number?: string
  expires?: string
}

export default function LicensePage() {
  const [loading, setLoading] = useState(true)
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null)
  const [number, setNumber] = useState<string | null>(null)
  const [expires, setExpires] = useState<string | null>(null)
  const [unauthorized, setUnauthorized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      setLoading(true)
      setUnauthorized(false)
      setError(null)
      try {
        const res = await fetch('/api/driver/license', { credentials: 'include' })
        if (!mounted) return
        if (res.status === 401) {
          setUnauthorized(true)
          setLoading(false)
          return
        }
        if (!res.ok) {
          setError(`Failed to load license (status ${res.status})`)
          setLoading(false)
          return
        }
        const body: LicenseResponse = await res.json()
        if (body.url) setLicenseUrl(body.url)
        if (body.number) setNumber(body.number)
        if (body.expires) setExpires(body.expires)
      } catch (err: any) {
        setError(err?.message ?? String(err))
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => { mounted = false }
  }, [])

  // helper: choose viewer type
  const renderViewer = () => {
    if (!licenseUrl) return null
    const lc = licenseUrl.toLowerCase()
    if (lc.endsWith('.pdf')) {
      return <iframe src={licenseUrl} title="Driver License" className="w-full h-[700px]" />
    }
    // image fallback: use next/image for optimization inside a positioned container
    return (
      <div className="w-full h-full relative">
        <Image src={licenseUrl} alt="Driver License" fill className="object-contain" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center">
        <DriverPageHeader title="Driver License" />
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
        {loading ? (
          <div className="py-12 text-center">
            <div className="dot-spinner dot-md mx-auto" aria-hidden>
              <span className="dot dot-blue" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <p className="text-sm text-slate-500 mt-4">Loading license…</p>
          </div>
        ) : unauthorized ? (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-700">You must be signed in to view your license.</p>
            <div className="mt-4">
              <Link href="/driver/login" className="text-sky-600">Sign in</Link>
            </div>
          </div>
        ) : licenseUrl ? (
          <div className="space-y-4">
            <div className="text-sm text-slate-700">
              <div>License No: <strong>{number ?? '—'}</strong></div>
              <div>Expires: <strong>{expires ?? '—'}</strong></div>
            </div>

            <div className="h-[700px] border rounded overflow-hidden">
              {renderViewer()}
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-slate-600">If the document does not display, you can download it.</div>
              <a href={licenseUrl} target="_blank" rel="noreferrer" className="text-sky-600 text-sm">Open / Download</a>
            </div>
          </div>
        ) : (
          <div>
            <p className="mt-2 text-sm text-slate-600">{error ?? 'No license is available at the moment.'}</p>
            <div className="mt-6">
              <p className="text-xs text-slate-500">If you expect a license but don’t see it, contact support or check back later.</p>
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
