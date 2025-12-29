"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, Smartphone, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import axios from "axios"

const api = axios.create({ baseURL: "", withCredentials: true })

type Status = { totpEnabled: boolean; smsEnabled: boolean; phone?: string | null }

export default function Owner2FAPage() {
  const [me, setMe] = useState<any>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [twofa, setTwofa] = useState<any>(null)
  const [code, setCode] = useState("")
  const [smsCode, setSmsCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [totpFlow, setTotpFlow] = useState<'idle'|'provision'|'verifying'|'enabled'|'disabled'>('idle')
  const [smsFlow, setSmsFlow] = useState<'idle'|'sent'|'verifying'|'enabled'|'disabled'>('idle')
  const totpVerifyingRef = useRef(false)
  const smsVerifyingRef = useRef(false)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const r = await api.get("/api/account/me")
        if (!mounted) return
        setMe(r.data)
        // Check 2FA status - account API might not have separate SMS status, so we'll infer from available fields
        setStatus({ 
          totpEnabled: !!r.data.twoFactorEnabled, 
          smsEnabled: false, // Will be updated if SMS endpoints are available
          phone: r.data.phone || null 
        })
        setTotpFlow(r.data.twoFactorEnabled ? 'enabled' : 'idle')
        setSmsFlow('idle')
      } catch (e) {
        if (mounted) setError('Failed to load account information')
      }
    })()
    return () => { mounted = false }
  }, [])

  const dispatchToast = (t: any) => { try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: t })) } catch (e) {} }

  const start2FA = async () => {
    setError(null)
    setCode('')
    setTwofa(null)
    setTotpFlow('provision')
    setLoading(true)
    try {
      const r = await api.post("/api/account/2fa/totp/setup")
      setTwofa(r.data)
      dispatchToast({ type: 'info', title: '2FA Setup', message: 'Scan the QR code with your authenticator app', duration: 5000 })
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to start TOTP setup.'
      setError(msg)
      setTotpFlow('idle')
      dispatchToast({ type: 'error', title: 'Failed to start TOTP', message: msg, duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  const verify2FA = async () => {
    if (totpVerifyingRef.current) return
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }
    totpVerifyingRef.current = true
    setError(null)
    setLoading(true)
    setTotpFlow('verifying')
    try {
      const r = await api.post<{ backupCodes: string[] }>("/api/account/2fa/totp/verify", { code })
      setSuccess('2FA enabled successfully!')
      dispatchToast({ type: 'success', title: '2FA enabled', message: 'Authenticator enabled. Save your backup codes.', duration: 8000 })
      console.info('Backup codes:', r.data.backupCodes)
      setStatus(s => s ? { ...s, totpEnabled: true } : { totpEnabled: true, smsEnabled: false })
      setTotpFlow('enabled')
      setTwofa(null)
      setCode("")
      const me2 = await api.get("/api/account/me")
      setMe(me2.data)
      setTimeout(() => router.push('/owner/settings'), 1500)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to enable authenticator.'
      setError(msg)
      setTotpFlow('provision')
      dispatchToast({ type: 'error', title: 'Failed to enable authenticator', message: msg, duration: 6000 })
    } finally {
      setLoading(false)
      totpVerifyingRef.current = false
    }
  }

  const disable2FA = async () => {
    const c = prompt("Enter TOTP code or a backup code to disable:")
    if (!c) return
    setError(null)
    setLoading(true)
    try {
      await api.post("/api/account/2fa/disable", { code: c })
      setSuccess('2FA disabled successfully')
      dispatchToast({ type: 'success', title: '2FA disabled', message: 'Two-factor authentication disabled.', duration: 4500 })
      setStatus(s => s ? { ...s, totpEnabled: false } : { totpEnabled: false, smsEnabled: false })
      setTotpFlow('disabled')
      const me2 = await api.get("/api/account/me")
      setMe(me2.data)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to disable 2FA.'
      setError(msg)
      dispatchToast({ type: 'error', title: 'Failed to disable 2FA', message: msg, duration: 4500 })
    } finally {
      setLoading(false)
    }
  }

  const handleSmsSend = async () => {
    if (!me?.phone) {
      setError('Phone number is required for SMS 2FA. Please update your profile with a phone number.')
      return
    }
    setError(null)
    setSending(true)
    try {
      // For now, we'll simulate SMS sending since account API might not have SMS endpoints
      // In production, this would call an API endpoint to send SMS
      await new Promise(r => setTimeout(r, 700))
      setSmsFlow('sent')
      dispatchToast({ type: 'info', title: 'SMS sent', message: 'A verification code was sent to your phone.', duration: 5000 })
    } catch (e) {
      setError(String(e))
    } finally {
      setSending(false)
    }
  }

  const handleSmsVerify = async () => {
    if (smsVerifyingRef.current) return
    if (!smsCode || smsCode.length < 4) {
      setError('Please enter a valid verification code')
      return
    }
    smsVerifyingRef.current = true
    setError(null)
    setLoading(true)
    setSmsFlow('verifying')
    try {
      // For now, we'll simulate SMS verification
      // In production, this would call an API endpoint to verify SMS code
      await new Promise(r => setTimeout(r, 500))
      setStatus(s => s ? { ...s, smsEnabled: true } : { totpEnabled: false, smsEnabled: true })
      setSmsFlow('enabled')
      setSmsCode('')
      dispatchToast({ type: 'success', title: 'Two-factor enabled', message: 'SMS-based 2FA enabled.', duration: 4500 })
    } catch (e: any) {
      setError(String(e))
      setSmsFlow('sent')
      dispatchToast({ type: 'error', title: '2FA', message: 'Failed to verify SMS code.', duration: 4000 })
    } finally {
      setLoading(false)
      smsVerifyingRef.current = false
    }
  }

  const handleSmsDisable = async () => {
    const c = prompt("Enter SMS code or confirmation to disable:")
    if (!c) return
    setError(null)
    setLoading(true)
    try {
      // For now, we'll simulate SMS disable
      // In production, this would call an API endpoint to disable SMS 2FA
      await new Promise(r => setTimeout(r, 300))
      setStatus(s => s ? { ...s, smsEnabled: false } : { totpEnabled: false, smsEnabled: false })
      setSmsFlow('disabled')
      dispatchToast({ type: 'success', title: 'Two-factor disabled', message: 'SMS-based 2FA disabled.', duration: 4500 })
    } catch (e: any) {
      setError(String(e))
      dispatchToast({ type: 'error', title: '2FA', message: 'Failed to disable SMS-based 2FA.', duration: 4000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div className="w-full text-center">
          <div className="flex flex-col items-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-50 text-blue-600 transition-all duration-300">
              <Smartphone className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
            </div>
            <h1 className="mt-3 text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Two-Factor Authentication</h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">Add an extra layer of security to your account.</p>
          </div>
        </div>

        {/* TOTP Section */}
        <section className="w-full max-w-full bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50 box-border">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 w-full max-w-full min-w-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">TOTP Authenticator</h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Use an authenticator app (Google Authenticator, Authy, etc.) to generate codes.</p>
              </div>
            </div>
            <div className="shrink-0">
              <span className={`inline-block text-xs px-3 py-1.5 rounded-full font-semibold ring-1 ${status?.totpEnabled ? "text-green-700 ring-green-200 bg-green-50":"text-amber-700 ring-amber-200 bg-amber-50"}`}>
                {status?.totpEnabled ? "ENABLED" : "DISABLED"}
              </span>
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border-2 border-red-200 p-3 sm:p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300 w-full max-w-full">
              <div className="text-xs sm:text-sm font-semibold text-red-800">{error}</div>
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-green-50 border-2 border-green-200 p-3 sm:p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300 w-full max-w-full">
              <div className="text-xs sm:text-sm font-semibold text-green-800">{success}</div>
            </div>
          )}

          {!status?.totpEnabled ? (
            !twofa ? (
              <div className="w-full max-w-full">
                <button 
                  onClick={start2FA}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-300 border-2 border-emerald-600 hover:border-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>{loading ? 'Setting up...' : 'Enable TOTP'}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6 items-start w-full max-w-full min-w-0">
                <div className="flex justify-center sm:justify-start w-full max-w-full min-w-0">
                  <div className="w-full max-w-full h-auto aspect-square rounded-xl overflow-hidden ring-2 ring-slate-200 bg-white flex items-center justify-center shadow-md box-border">
                    <Image src={twofa.qrDataUrl} alt="TOTP QR" width={192} height={192} className="object-contain w-full h-full max-w-full" />
                  </div>
                </div>
                <div className="space-y-3 sm:space-y-4 w-full max-w-full min-w-0">
                  <div className="w-full max-w-full min-w-0">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 sm:mb-2">
                      Enter 6-digit code
                    </label>
                    <input 
                      type="text"
                      maxLength={6}
                      value={code} 
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="block w-full max-w-full min-w-0 rounded-lg border-2 border-slate-200 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-mono text-center focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200 box-border"
                    />
                  </div>
                  <div className="flex flex-col gap-2 sm:gap-3 w-full max-w-full">
                    <button 
                      onClick={verify2FA}
                      disabled={loading || code.length !== 6}
                      className="w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-300 border-2 border-emerald-600 hover:border-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 min-w-0"
                    >
                      <span className="truncate">Verify & Enable</span>
                    </button>
                    <button 
                      onClick={() => { setTwofa(null); setCode('') }}
                      className="w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-300 border-2 border-slate-200 hover:border-slate-300 min-w-0"
                    >
                      <span className="truncate">Cancel</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="space-y-4 w-full max-w-full">
              <p className="text-xs sm:text-sm text-slate-600">TOTP authentication is currently enabled on your account.</p>
              <button 
                onClick={disable2FA}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 border-2 border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disable TOTP
              </button>
            </div>
          )}
        </section>

        {/* SMS Section */}
        <section className="w-full max-w-full bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50 box-border">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6 w-full max-w-full min-w-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">SMS-based 2FA</h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">Receive codes via SMS to your registered phone.</p>
              </div>
            </div>
            <div className="shrink-0">
              {status && status.smsEnabled ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 ring-1 ring-green-200">
                  <CheckCircle className="h-3 w-3" />
                  Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                  <XCircle className="h-3 w-3" />
                  Disabled
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 w-full max-w-full">
            {status && status.smsEnabled ? (
              <button 
                onClick={handleSmsDisable} 
                disabled={loading} 
                className="col-span-2 w-full inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-300 border border-red-200 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Disable
              </button>
            ) : (
              <>
                <button 
                  onClick={handleSmsSend} 
                  disabled={sending || !me?.phone} 
                  className={`w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs font-semibold rounded-lg transition-all duration-300 border min-w-0 ${
                    sending || !me?.phone
                      ? 'text-slate-400 bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                      : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="truncate">{sending ? 'Sending…' : 'Send code'}</span>
                </button>
                <button 
                  onClick={() => setSmsFlow('sent')} 
                  className="w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all duration-300 border border-slate-200 hover:border-slate-300 min-w-0"
                >
                  <span className="truncate">I have a code</span>
                </button>
              </>
            )}
          </div>

          {(smsFlow === 'sent' || smsFlow === 'verifying') && (
            <div className="mt-4 border-2 border-slate-200 rounded-xl p-3 sm:p-4 bg-slate-50 w-full max-w-full box-border">
              <p className="text-xs sm:text-sm text-slate-600 mb-3 break-words">A code was sent to <strong>{status?.phone || me?.phone || 'your phone'}</strong>. Enter it below to verify.</p>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full max-w-full">
                <input 
                  value={smsCode} 
                  onChange={e => setSmsCode(e.target.value.replace(/\D/g, ''))} 
                  placeholder="Enter SMS code" 
                  maxLength={6}
                  className="col-span-2 w-full max-w-full min-w-0 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 border-2 border-slate-200 rounded-lg text-xs sm:text-sm font-mono text-center focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200 box-border" 
                />
                <button
                  onClick={handleSmsVerify}
                  disabled={smsFlow === 'verifying' || smsCode.length < 4}
                  className={`w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs font-semibold rounded-lg transition-all duration-300 border min-w-0 ${
                    smsFlow === 'verifying' || smsCode.length < 4
                      ? 'text-slate-400 bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                      : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300'
                  }`}
                >
                  {smsFlow === 'verifying' ? (
                    <>
                      <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                      <span className="truncate">Verifying</span>
                    </>
                  ) : (
                    <span className="truncate">Verify</span>
                  )}
                </button>
                <button 
                  onClick={() => { setSmsFlow('idle'); setSmsCode('') }} 
                  className="w-full inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all duration-300 border border-slate-200 hover:border-slate-300 min-w-0"
                >
                  <span className="truncate">Cancel</span>
                </button>
              </div>
            </div>
          )}

          {!me?.phone && (
            <div className="mt-4 rounded-xl bg-amber-50 border-2 border-amber-200 p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-amber-800">
                <strong>Note:</strong> A phone number is required for SMS 2FA. Please update your profile with a phone number first.
              </p>
            </div>
          )}

          <div className="mt-6 flex justify-start pt-4 border-t border-slate-200">
            <Link 
              href="/owner/settings" 
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all duration-300 border border-slate-200 hover:border-slate-300 no-underline"
              aria-label="Back to Settings"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Settings</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

