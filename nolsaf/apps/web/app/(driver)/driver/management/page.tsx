"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import DriverPageHeader from "@/components/DriverPageHeader"
import { Eye, Upload, Lock, Truck, Pencil } from 'lucide-react'

export default function DriverManagementPage() {
  const [tab, setTab] = useState<'documents' | 'safety' | 'settings'>('documents')
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [loadingSafety, setLoadingSafety] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [licenseNumber, setLicenseNumber] = useState<string | null>(null)
  const [licenseExpires, setLicenseExpires] = useState<string | null>(null)

  const isDocuments = tab === 'documents'
  const isSafety = tab === 'safety'
  const isSettings = tab === 'settings'

  useEffect(() => {
    let mounted = true
    async function loadMeta() {
      try {
        const res = await fetch('/api/driver/license/meta', { credentials: 'include' })
        if (!mounted) return
        if (!res.ok) return
        const body = await res.json()
        if (body?.number) setLicenseNumber(String(body.number))
        if (body?.expires) setLicenseExpires(String(body.expires))
      } catch (e) {
        // silent
      }
    }
    loadMeta()
    return () => { mounted = false }
  }, [])

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center">
        <DriverPageHeader title="Management" />
        <p className="mt-2 text-sm text-slate-600">Central area to manage driver documents, safety records and account settings.</p>
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
        <div className="flex gap-3 justify-center flex-wrap">
          <button
            onClick={() => {
              const willOpen = tab !== 'documents'
              setLoadingSafety(false)
              setLoadingSettings(false)
              setTab('documents')
              setLoadingDocs(willOpen)
              if (willOpen) setTimeout(() => setLoadingDocs(false), 700)
            }}
            className={`px-4 py-2 rounded-md border ${isDocuments ? 'bg-slate-50 border-slate-200' : 'bg-white hover:bg-slate-50'}`}
          >
            {isDocuments ? (
              loadingDocs ? (
                <div className="flex items-center justify-center">
                  <span aria-hidden className="dot-spinner dot-sm">
                    <span className="dot dot-blue" />
                    <span className="dot dot-black" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span aria-hidden className={`inline-block h-2 w-2 rounded-full transition-colors ${isDocuments ? 'bg-white' : 'bg-slate-300'}`} />
                  <span>Documents</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <span aria-hidden className={`inline-block h-2 w-2 rounded-full transition-colors ${isDocuments ? 'bg-white' : 'bg-slate-300'}`} />
                <span>Documents</span>
              </div>
            )}
          </button>

          <button
            onClick={() => {
              const willOpen = tab !== 'safety'
              setLoadingDocs(false)
              setLoadingSettings(false)
              setTab('safety')
              setLoadingSafety(willOpen)
              if (willOpen) setTimeout(() => setLoadingSafety(false), 700)
            }}
            className={`px-4 py-2 rounded-md border ${isSafety ? 'bg-slate-50 border-slate-200' : 'bg-white hover:bg-slate-50'}`}
          >
            {isSafety ? (
              loadingSafety ? (
                <div className="flex items-center justify-center">
                  <span aria-hidden className="dot-spinner dot-sm">
                    <span className="dot dot-blue" />
                    <span className="dot dot-black" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span aria-hidden className={`inline-block h-2 w-2 rounded-full transition-colors ${isSafety ? 'bg-white' : 'bg-slate-300'}`} />
                  <span>Safety Measures</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <span aria-hidden className={`inline-block h-2 w-2 rounded-full transition-colors ${isSafety ? 'bg-white' : 'bg-slate-300'}`} />
                <span>Safety Measures</span>
              </div>
            )}
          </button>

          <button
            onClick={() => {
              const willOpen = tab !== 'settings'
              setLoadingDocs(false)
              setLoadingSafety(false)
              setTab('settings')
              setLoadingSettings(willOpen)
              if (willOpen) setTimeout(() => setLoadingSettings(false), 700)
            }}
            className={`px-4 py-2 rounded-md border ${isSettings ? 'bg-slate-50 border-slate-200' : 'bg-white hover:bg-slate-50'}`}
          >
            {isSettings ? (
              loadingSettings ? (
                <div className="flex items-center justify-center">
                  <span aria-hidden className="dot-spinner dot-sm">
                    <span className="dot dot-blue" />
                    <span className="dot dot-black" />
                    <span className="dot dot-yellow" />
                    <span className="dot dot-green" />
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span aria-hidden className={`inline-block h-2 w-2 rounded-full transition-colors ${isSettings ? 'bg-white' : 'bg-slate-300'}`} />
                  <span>Settings</span>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2">
                <span aria-hidden className={`inline-block h-2 w-2 rounded-full transition-colors ${isSettings ? 'bg-white' : 'bg-slate-300'}`} />
                <span>Settings</span>
              </div>
            )}
          </button>
        </div>

        <div className="mt-6">
          {tab === 'documents' && (
            <div>
              <p className="mt-2 text-sm text-slate-600 text-center mx-auto max-w-prose">Upload or review your documents (license, ID, insurance).</p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Driver License</h3>
                      <p className="text-xs text-slate-500">License No: {licenseNumber ?? '—'}</p>
                      <p className="text-xs text-slate-500">Expires: {licenseExpires ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/driver/management/license" className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1" aria-label="View driver license">
                        <Eye className="h-4 w-4" aria-hidden />
                        <span className="sr-only">View driver license</span>
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Insurance</h3>
                      <p className="text-xs text-slate-500">Status: Not provided</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors" aria-label="Upload insurance">
                        <Upload className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Upload insurance</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Contract</h3>
                      <p className="text-xs text-slate-500">View the agreed contract between you and the platform.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/driver/management/contract" className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors" aria-label="View contract">
                        <Eye className="h-4 w-4" aria-hidden />
                        <span className="sr-only">View contract</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'safety' && (
            <div>
              <p className="mt-2 text-sm text-slate-600 text-center mx-auto max-w-prose">View safety incidents and monthly safety summary.</p>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="text-sm font-semibold">Monthly Summary</h3>
                  <p className="text-xs text-slate-500 mt-1">No incidents recorded in the selected period.</p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="text-sm font-semibold">Incident Log</h3>
                  <p className="text-xs text-slate-500 mt-1">No safety events to display.</p>
                </div>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div>
              <p className="mt-2 text-sm text-slate-600 text-center mx-auto max-w-prose">Update your account and vehicle settings.</p>

              <div className="mt-4 space-y-3">
                <div className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                      <Lock className="h-4 w-4 text-slate-600" aria-hidden />
                      <span>Security</span>
                    </h3>
                    <p className="text-xs text-slate-500">Change password, contact details.</p>
                  </div>
                  <Link href="/driver/security" title="Open" className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1" aria-label="Open security settings">
                    <Eye className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Open security settings</span>
                  </Link>
                </div>

                <div className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold inline-flex items-center gap-2">
                      <Truck className="h-4 w-4 text-slate-600" aria-hidden />
                      <span>Vehicle</span>
                    </h3>
                    <p className="text-xs text-slate-500">Vehicle details and registration.</p>
                  </div>
                  <button title="Edit" className="text-sky-600 inline-flex items-center p-1 rounded bg-white hover:bg-white hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1 border-0" aria-label="Edit vehicle">
                    <Pencil className="h-4 w-4" aria-hidden />
                    <span className="sr-only">Edit vehicle</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

