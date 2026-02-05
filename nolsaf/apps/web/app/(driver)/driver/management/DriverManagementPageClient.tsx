"use client"

import React, { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Eye, Upload, Lock, Truck, Pencil, Settings, FileText, Shield, CheckCircle, AlertCircle, X } from 'lucide-react'

export default function DriverManagementPageClient() {
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
            <Settings className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Management</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">Central area to manage driver documents, safety records and account settings.</p>
        </div>
      </div>

      <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden">
        <div className="flex gap-3 justify-center flex-wrap mb-6">
          <button
            onClick={() => {
              const willOpen = tab !== 'documents'
              setLoadingSafety(false)
              setLoadingSettings(false)
              setTab('documents')
              setLoadingDocs(willOpen)
              if (willOpen) setTimeout(() => setLoadingDocs(false), 700)
            }}
            className={`px-4 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
              isDocuments
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {loadingDocs ? (
              <div className="flex items-center justify-center">
                <span aria-hidden className="dot-spinner dot-sm">
                  <span className="dot dot-blue" />
                  <span className="dot dot-black" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </span>
              </div>
            ) : (
              <span>Documents</span>
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
            className={`px-4 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
              isSafety
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {loadingSafety ? (
              <div className="flex items-center justify-center">
                <span aria-hidden className="dot-spinner dot-sm">
                  <span className="dot dot-blue" />
                  <span className="dot dot-black" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </span>
              </div>
            ) : (
              <span>Safety Measures</span>
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
            className={`px-4 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
              isSettings
                ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            {loadingSettings ? (
              <div className="flex items-center justify-center">
                <span aria-hidden className="dot-spinner dot-sm">
                  <span className="dot dot-blue" />
                  <span className="dot dot-black" />
                  <span className="dot dot-yellow" />
                  <span className="dot dot-green" />
                </span>
              </div>
            ) : (
              <span>Settings</span>
            )}
          </button>
        </div>

        <div className="mt-6">
          {tab === 'documents' && (
            <div>
              <p className="mb-6 text-sm text-slate-600 text-center mx-auto max-w-prose">Upload or review your documents (license, ID, insurance).</p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 border-2 border-slate-200 rounded-lg bg-white hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-emerald-600" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Driver License</h3>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">License No:</span>
                      <span className="font-medium text-slate-900">{licenseNumber ?? '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Expires:</span>
                      <span className="font-medium text-slate-900">{licenseExpires ?? '—'}</span>
                    </div>
                  </div>
                  <Link 
                    href="/driver/management/license" 
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 hover:border-emerald-300 no-underline"
                    aria-label="View driver license"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View License</span>
                  </Link>
                </div>

                <div className="p-5 border-2 border-slate-200 rounded-lg bg-white hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-amber-600" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Insurance</h3>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Status:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Not provided
                      </span>
                    </div>
                  </div>
                  
                  <input
                    ref={insuranceFileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => setInsuranceFile(e.target.files?.[0] ?? null)}
                    className="hidden"
                    id="insurance-upload"
                  />
                  
                  {!insuranceFile ? (
                    <label
                      htmlFor="insurance-upload"
                      className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-emerald-500 transition-all duration-200 group"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                        <p className="text-sm text-slate-600 group-hover:text-slate-900">
                          <span className="font-medium text-emerald-600">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-slate-500">JPG, PNG or PDF (MAX. 5MB)</p>
                      </div>
                    </label>
                  ) : (
                    <div className="p-3 bg-emerald-50 border-2 border-emerald-200 rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-xs text-emerald-700 font-medium truncate">{insuranceFile.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInsuranceFile(null)
                          if (insuranceFileInputRef.current) {
                            insuranceFileInputRef.current.value = ''
                          }
                        }}
                        className="text-emerald-600 hover:text-emerald-700 flex-shrink-0"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-5 border-2 border-slate-200 rounded-lg bg-white hover:border-emerald-300 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Lock className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">Contract</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Review your driver contract and terms.</p>
                      </div>
                    </div>
                    <Link
                      href="/driver/terms"
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 hover:border-emerald-300 no-underline"
                      aria-label="Open contract"
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
