import DriverManagementPageClient from "./DriverManagementPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DriverManagementPage() {
  return <DriverManagementPageClient />;
}

/*
"use client"

import React, { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Eye, Upload, Lock, Truck, Pencil, Settings, FileText, Shield, CheckCircle, AlertCircle, X } from 'lucide-react'

export default function DriverManagementPage() {
  const searchParams = useSearchParams()
  const tabParam = searchParams?.get('tab') ?? null
  const [tab, setTab] = useState<'documents' | 'safety' | 'settings'>('documents')
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [loadingSafety, setLoadingSafety] = useState(false)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [licenseNumber, setLicenseNumber] = useState<string | null>(null)
  const [licenseExpires, setLicenseExpires] = useState<string | null>(null)
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null)
  const insuranceFileInputRef = useRef<HTMLInputElement>(null)

  const isDocuments = tab === 'documents'
  const isSafety = tab === 'safety'
  const isSettings = tab === 'settings'

  // Update tab based on URL parameter
  useEffect(() => {
    if (tabParam === 'safety') {
      setTab('safety')
    } else if (tabParam === 'settings') {
      setTab('settings')
    } else if (tabParam === 'documents') {
      setTab('documents')
    }
  }, [tabParam])

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
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="w-full text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Contract</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {tab === 'safety' && (
            <div>
              <p className="mb-6 text-sm text-slate-600 text-center mx-auto max-w-prose">View safety incidents and monthly safety summary.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 border-2 border-slate-200 rounded-lg bg-white">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-emerald-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">Monthly Summary</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>No incidents recorded in the selected period.</span>
                  </div>
                </div>

                <div className="p-5 border-2 border-slate-200 rounded-lg bg-white">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <h3 className="text-base font-semibold text-gray-900">Incident Log</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>No safety events to display.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div>
              <p className="mb-6 text-sm text-slate-600 text-center mx-auto max-w-prose">Update your account and vehicle settings.</p>

              <div className="space-y-4">
                <div className="p-5 border-2 border-slate-200 rounded-lg bg-white hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Lock className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Security</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Change password, contact details.</p>
                      </div>
                    </div>
                    <Link 
                      href="/driver/security" 
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 hover:border-emerald-300 no-underline"
                      aria-label="Open security settings"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Open</span>
                    </Link>
                  </div>
                </div>

                <div className="p-5 border-2 border-slate-200 rounded-lg bg-white hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Truck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Vehicle</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Vehicle details and registration.</p>
                      </div>
                    </div>
                    <button 
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 hover:border-emerald-300"
                      aria-label="Edit vehicle"
                    >
                      <Pencil className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

*/

