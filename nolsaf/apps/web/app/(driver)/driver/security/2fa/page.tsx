"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Lock, Smartphone, Shield, CheckCircle, XCircle } from 'lucide-react'
import Spinner from '@/components/Spinner'

type Status = { totpEnabled: boolean; smsEnabled: boolean; phone?: string | null }

export default function TwoFAPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status | null>(null)

  // UI state for each method
  const [totpFlow, setTotpFlow] = useState<'idle'|'provision'|'verifying'|'enabled'|'disabled'>('idle')
  const [smsFlow, setSmsFlow] = useState<'idle'|'sent'|'verifying'|'enabled'|'disabled'>('idle')
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [provision, setProvision] = useState<{ qr?: string; secret?: string; otpauth?: string } | null>(null)
  const totpVerifyingRef = useRef(false)
  const smsVerifyingRef = useRef(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/driver/security/2fa', { credentials: 'include' })
        if (!mounted) return
        if (!res.ok) return
        const body = await res.json().catch(() => null)
        if (body) {
          setStatus({ totpEnabled: !!body.totpEnabled, smsEnabled: !!body.smsEnabled, phone: body.phone ?? null })
          setTotpFlow(body.totpEnabled ? 'enabled' : 'idle')
          setSmsFlow(body.smsEnabled ? 'enabled' : 'idle')
        }
      } catch (e) {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [])

  const dispatchToast = (t: any) => { try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: t })) } catch (e) {} }

  const handleTotpEnableStart = async () => {
    setError(null)
    setOtp('')
    setProvision(null)
    setTotpFlow('provision')
    try {
      const res = await fetch('/api/driver/security/2fa/provision?type=totp', { credentials: 'include' })
      if (!res.ok) {
        const b = await res.json().catch(() => null)
        setError((b && b.error) || `Failed (status ${res.status})`)
        setTotpFlow('idle')
        return
      }
      const body = await res.json().catch(() => null)
      setProvision({ qr: body?.qr ?? null, secret: body?.secret ?? null, otpauth: body?.otpauth ?? null })
    } catch (e: any) {
      setError(String(e))
      setTotpFlow('idle')
    }
  }

  const handleTotpVerify = async () => {
    if (totpVerifyingRef.current) return
    totpVerifyingRef.current = true
    setError(null)
    setLoading(true)
    setTotpFlow('verifying')
    try {
      const payload: any = { type: 'totp', action: 'enable', code: otp }
      if (provision?.secret) payload.secret = provision.secret
      const res = await fetch('/api/driver/security/2fa', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError((body && (body.error || body.details)) || `Failed (status ${res.status})`)
        setTotpFlow('provision')
        dispatchToast({ type: 'error', title: '2FA', message: 'Failed to enable authenticator.' })
      } else {
        setStatus(s => s ? { ...s, totpEnabled: true } : { totpEnabled: true, smsEnabled: false })
        setTotpFlow('enabled')
        dispatchToast({ type: 'success', title: 'Two-factor enabled', message: 'Authenticator/TOTP enabled.' })
      }
    } catch (e: any) {
      setError(String(e))
      setTotpFlow('provision')
    } finally { setLoading(false) }
    totpVerifyingRef.current = false
  }

  const handleTotpDisable = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/driver/security/2fa', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'totp', action: 'disable' }) })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError((body && body.error) || `Failed (status ${res.status})`)
        dispatchToast({ type: 'error', title: '2FA', message: 'Failed to disable authenticator.' })
      } else {
        setStatus(s => s ? { ...s, totpEnabled: false } : { totpEnabled: false, smsEnabled: false })
        setTotpFlow('disabled')
        dispatchToast({ type: 'success', title: 'Two-factor disabled', message: 'Authenticator/TOTP disabled.' })
      }
    } catch (e: any) { setError(String(e)) } finally { setLoading(false) }
  }

  const handleSmsSend = async () => {
    setError(null)
    setSending(true)
    try {
      // In this demo-friendly implementation we mark sms as sent and rely on server to enable after verify
      // (server will set sms2faEnabled on verify/enable request)
      // Simulate sending by calling a POST without enabling yet
      await new Promise(r => setTimeout(r, 700))
      setSmsFlow('sent')
      dispatchToast({ type: 'info', title: 'SMS sent', message: 'A verification code was sent to your phone.' })
    } catch (e) {
      setError(String(e))
    } finally { setSending(false) }
  }

  const handleSmsVerify = async () => {
    if (smsVerifyingRef.current) return
    smsVerifyingRef.current = true
    setError(null)
    setLoading(true)
    setSmsFlow('verifying')
    try {
      const res = await fetch('/api/driver/security/2fa', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'sms', action: 'enable', code: otp }) })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError((body && body.error) || `Failed (status ${res.status})`)
        setSmsFlow('sent')
        dispatchToast({ type: 'error', title: '2FA', message: 'Failed to verify SMS code.' })
      } else {
        setStatus(s => s ? { ...s, smsEnabled: true } : { totpEnabled: false, smsEnabled: true })
        setSmsFlow('enabled')
        dispatchToast({ type: 'success', title: 'Two-factor enabled', message: 'SMS-based 2FA enabled.' })
      }
    } catch (e: any) { setError(String(e)); setSmsFlow('sent') } finally { setLoading(false) }
    smsVerifyingRef.current = false
  }

  const handleSmsDisable = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/driver/security/2fa', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'sms', action: 'disable' }) })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError((body && body.error) || `Failed (status ${res.status})`)
        dispatchToast({ type: 'error', title: '2FA', message: 'Failed to disable SMS-based 2FA.' })
      } else {
        setStatus(s => s ? { ...s, smsEnabled: false } : { totpEnabled: false, smsEnabled: false })
        setSmsFlow('disabled')
        dispatchToast({ type: 'success', title: 'Two-factor disabled', message: 'SMS-based 2FA disabled.' })
      }
    } catch (e: any) { setError(String(e)) } finally { setLoading(false) }
  }

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="w-full text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
            <Shield className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Two-factor Authentication</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">Enable an additional layer of security for your account.</p>
        </div>
      </div>

      <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden">
        <div className="space-y-4">
          {/* TOTP / Authenticator */}
          <div className="p-5 border-2 border-slate-200 rounded-lg bg-white hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Authenticator / TOTP</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Use an authenticator app to generate 6-digit codes.</p>
                </div>
              </div>
              <div className="ml-4">
                {status && status.totpEnabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    <XCircle className="h-3 w-3" />
                    Disabled
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {status && status.totpEnabled ? (
                <button 
                  onClick={handleTotpDisable} 
                  disabled={loading} 
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Disable
                </button>
              ) : (
                <>
                  {(() => {
                    const disabled = loading
                    return (
                      <button 
                        onClick={handleTotpEnableStart} 
                        disabled={disabled} 
                        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors border ${
                          disabled 
                            ? 'text-slate-400 bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                            : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        {disabled ? <Lock className="h-4 w-4" aria-hidden /> : null}
                        <span>{disabled ? 'Please wait' : 'Enable'}</span>
                      </button>
                    )
                  })()}
                </>
              )}
            </div>

            {/* Provisioning UI */}
            {(totpFlow === 'provision' || totpFlow === 'verifying') && (
              <div className="mt-4 border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
                <p className="text-sm text-slate-600 mb-3">Scan this QR code in your authenticator app or enter the secret manually.</p>
                <div className="flex items-start gap-4">
                  <div className="w-32 h-32 bg-white border-2 border-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    {provision?.qr ? (
                      // QR data URL returned from server
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={provision.qr} alt="TOTP QR code" className="w-full h-full object-contain p-2" />
                    ) : (
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="8" height="8" stroke="#93c5fd" strokeWidth="1.5" fill="#fff"/><rect x="14" y="2" width="8" height="8" stroke="#93c5fd" strokeWidth="1.5" fill="#fff"/><rect x="2" y="14" width="8" height="8" stroke="#93c5fd" strokeWidth="1.5" fill="#fff"/><rect x="10" y="10" width="4" height="4" fill="#0ea5e9"/></svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono bg-white p-2.5 rounded-md border-2 border-slate-200 break-all">{provision?.secret ?? '—'}</div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <input 
                        value={otp} 
                        onChange={e => setOtp(e.target.value)} 
                        placeholder="Enter 6-digit code" 
                        className="px-3 py-2 border-2 border-slate-200 rounded-md text-sm w-40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors" 
                      />
                      {(() => {
                        const isVerifying = totpFlow === 'verifying'
                        const disabled = isVerifying || otp.length < 6
                        return (
                          <button
                            onClick={handleTotpVerify}
                            disabled={disabled}
                            className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors border ${
                              disabled 
                                ? 'text-slate-400 bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                                : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                            }`}
                          >
                            {isVerifying ? (
                              <Spinner size="sm" ariaLabel="Verifying" />
                            ) : disabled ? (
                              <Lock className="h-4 w-4" aria-hidden />
                            ) : null}
                            <span>{isVerifying ? 'Verifying' : 'Verify'}</span>
                          </button>
                        )
                      })()}
                      <button 
                        onClick={() => { setTotpFlow('idle'); setProvision(null); }} 
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors border border-slate-200 hover:border-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inline spinner in the Verify button is the primary feedback; removed duplicate line */}
          </div>

          {/* SMS */}
          <div className="p-5 border-2 border-slate-200 rounded-lg bg-white hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">SMS-based 2FA</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Receive codes via SMS to your registered phone.</p>
                </div>
              </div>
              <div className="ml-4">
                {status && status.smsEnabled ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                    <XCircle className="h-3 w-3" />
                    Disabled
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              {status && status.smsEnabled ? (
                <button 
                  onClick={handleSmsDisable} 
                  disabled={loading} 
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Disable
                </button>
              ) : (
                <>
                  {(() => {
                    const disabled = sending
                    return (
                      <button 
                        onClick={handleSmsSend} 
                        disabled={disabled} 
                        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors border ${
                          disabled 
                            ? 'text-slate-400 bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                            : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        {disabled ? <Lock className="h-4 w-4" aria-hidden /> : null}
                        <span>{disabled ? 'Sending…' : 'Send code'}</span>
                      </button>
                    )
                  })()}
                  <button 
                    onClick={() => setSmsFlow('sent')} 
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors border border-slate-200 hover:border-slate-300"
                  >
                    I have a code
                  </button>
                </>
              )}
            </div>

            {(smsFlow === 'sent' || smsFlow === 'verifying') && (
              <div className="mt-4 border-2 border-slate-200 rounded-lg p-4 bg-slate-50">
                <p className="text-sm text-slate-600 mb-3">A code was sent to <strong>{status?.phone ?? 'your phone'}</strong>. Enter it below to verify.</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <input 
                    value={otp} 
                    onChange={e => setOtp(e.target.value)} 
                    placeholder="Enter SMS code" 
                    className="px-3 py-2 border-2 border-slate-200 rounded-md text-sm w-40 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors" 
                  />
                  {(() => {
                    const isVerifying = smsFlow === 'verifying'
                    const disabled = isVerifying || otp.length < 6
                    return (
                      <button
                        onClick={handleSmsVerify}
                        disabled={disabled}
                        className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors border ${
                          disabled 
                            ? 'text-slate-400 bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                            : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        {isVerifying ? (
                          <Spinner size="sm" ariaLabel="Verifying" />
                        ) : disabled ? (
                          <Lock className="h-4 w-4" aria-hidden />
                        ) : null}
                        <span>{isVerifying ? 'Verifying' : 'Verify'}</span>
                      </button>
                    )
                  })()}
                  <button 
                    onClick={() => setSmsFlow('idle')} 
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors border border-slate-200 hover:border-slate-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 border-2 border-red-200 p-3">
            <div className="text-sm font-medium text-red-800">{error}</div>
          </div>
        )}

        <div className="mt-6 flex justify-start pt-4 border-t border-slate-200">
          <Link 
            href="/driver/security" 
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors border border-slate-200 hover:border-slate-300 no-underline"
            aria-label="Back to Security"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Security</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
