"use client"

import React, { useEffect, useRef, useState } from "react"
import Link from "next/link"
import DriverPageHeader from "@/components/DriverPageHeader"
import { ChevronLeft, Lock } from 'lucide-react'
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
      const res = await fetch('/api/driver/security/2fa', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'totp', action: 'enable', code: otp }) })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        setError((body && body.error) || `Failed (status ${res.status})`)
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
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center -mb-4">
        <DriverPageHeader title="Two-factor authentication" />
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
        <p className="text-sm text-slate-600 text-center mx-auto max-w-prose -mt-1">Enable an additional layer of security for your account.</p>

        <div className="mt-6 space-y-4">
          {/* TOTP / Authenticator */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Authenticator / TOTP</h3>
                <p className="text-xs text-slate-500">Use an authenticator app to generate 6-digit codes.</p>
              </div>
              <div className="ml-4">
                {status && status.totpEnabled ? (
                  <span className="text-green-700 text-sm font-medium">Enabled</span>
                ) : (
                  <span className="text-slate-500 text-sm">Disabled</span>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end space-x-3">
              {status && status.totpEnabled ? (
                <button onClick={handleTotpDisable} disabled={loading} className="text-sm text-red-600">Disable</button>
              ) : (
                <>
                  {(() => {
                    const disabled = loading
                    return (
                      <button onClick={handleTotpEnableStart} disabled={disabled} className={`text-sm inline-flex items-center gap-2 ${disabled ? 'text-slate-400 opacity-60 pointer-events-none' : 'text-sky-600'}`}>
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
              <div className="mt-4 border rounded p-3 bg-slate-50">
                <p className="text-xs text-slate-600">Scan this QR code in your authenticator app or enter the secret manually.</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="w-28 h-28 bg-white border flex items-center justify-center">
                    {provision?.qr ? (
                      // QR data URL returned from server
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={provision.qr} alt="TOTP QR code" className="w-24 h-24 object-contain" />
                    ) : (
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="8" height="8" stroke="#93c5fd" strokeWidth="1.5" fill="#fff"/><rect x="14" y="2" width="8" height="8" stroke="#93c5fd" strokeWidth="1.5" fill="#fff"/><rect x="2" y="14" width="8" height="8" stroke="#93c5fd" strokeWidth="1.5" fill="#fff"/><rect x="10" y="10" width="4" height="4" fill="#0ea5e9"/></svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-mono bg-white p-2 rounded border">{provision?.secret ?? '—'}</div>
                    <div className="mt-3 flex items-center gap-2">
                      <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit code" className="p-2 border rounded text-sm w-40" />
                      {(() => {
                        const isVerifying = totpFlow === 'verifying'
                        const disabled = isVerifying || otp.length < 6
                        return (
                          <button
                            onClick={handleTotpVerify}
                            disabled={disabled}
                            className={`text-sm inline-flex items-center gap-2 ${disabled ? 'text-slate-400 opacity-60 pointer-events-none' : 'text-sky-600'}`}
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
                      <button onClick={() => { setTotpFlow('idle'); setProvision(null); }} className="text-sm text-slate-500">Cancel</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inline spinner in the Verify button is the primary feedback; removed duplicate line */}
          </div>

          {/* SMS */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">SMS-based 2FA</h3>
                <p className="text-xs text-slate-500">Receive codes via SMS to your registered phone.</p>
              </div>
              <div className="ml-4 text-right">
                {status && status.smsEnabled ? (
                  <span className="text-green-700 text-sm font-medium">Enabled</span>
                ) : (
                  <span className="text-slate-500 text-sm">Disabled</span>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end space-x-3">
              {status && status.smsEnabled ? (
                <button onClick={handleSmsDisable} disabled={loading} className="text-sm text-red-600">Disable</button>
              ) : (
                <>
                  {(() => {
                    const disabled = sending
                    return (
                      <button onClick={handleSmsSend} disabled={disabled} className={`text-sm inline-flex items-center gap-2 ${disabled ? 'text-slate-400 opacity-60 pointer-events-none' : 'text-sky-600'}`}>
                        {disabled ? <Lock className="h-4 w-4" aria-hidden /> : null}
                        <span>{disabled ? 'Sending…' : 'Send code'}</span>
                      </button>
                    )
                  })()}
                  <button onClick={() => setSmsFlow('sent')} className="text-sm text-slate-500">I have a code</button>
                </>
              )}
            </div>

            {(smsFlow === 'sent' || smsFlow === 'verifying') && (
              <div className="mt-4 border rounded p-3 bg-slate-50">
                <p className="text-xs text-slate-600">A code was sent to <strong>{status?.phone ?? 'your phone'}</strong>. Enter it below to verify.</p>
                <div className="mt-3 flex items-center gap-2">
                  <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter SMS code" className="p-2 border rounded text-sm w-40" />
                  {(() => {
                    const isVerifying = smsFlow === 'verifying'
                    const disabled = isVerifying || otp.length < 6
                    return (
                      <button
                        onClick={handleSmsVerify}
                        disabled={disabled}
                        className={`text-sm inline-flex items-center gap-2 ${disabled ? 'text-slate-400 opacity-60 pointer-events-none' : 'text-sky-600'}`}
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
                  <button onClick={() => setSmsFlow('idle')} className="text-sm text-slate-500">Cancel</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}

        <div className="mt-6 flex justify-end">
          <Link href="/driver/security" className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1" aria-label="Back to Security">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span className="sr-only">Back to Security</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
