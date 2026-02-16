"use client"

import React, { useState } from "react"
import Image from "next/image"
import { AlertCircle, CheckCircle, Key, Smartphone } from "lucide-react"

export type TotpSettingsSectionProps = {
  enabled: boolean
  setupUrl: string
  verifyUrl: string
  disableUrl: string
  onStatusChangeAction?: () => void
  embedded?: boolean
}

type SetupData = {
  otpauthUrl?: string
  qrDataUrl?: string
  secretMasked?: string
}

export default function TotpSettingsSection({
  enabled,
  setupUrl,
  verifyUrl,
  disableUrl,
  onStatusChangeAction,
}: TotpSettingsSectionProps) {
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [code, setCode] = useState("")
  const [showDisableInput, setShowDisableInput] = useState(false)
  const [disableCode, setDisableCode] = useState("")
  const [loading, setLoading] = useState(false)

  const toast = (detail: any) => {
    try {
      window.dispatchEvent(new CustomEvent("nols:toast", { detail }))
    } catch (e) {}
  }

  const startSetup = async () => {
    setLoading(true)
    try {
      const res = await fetch(setupUrl, { method: "POST", credentials: "include" })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = (body && (body.error || body.details)) || `Failed (status ${res.status})`
        toast({ type: "error", title: "Failed to start TOTP", message: msg, duration: 5000 })
        return
      }
      const data = body?.data ?? body
      setSetup({
        otpauthUrl: data?.otpauthUrl ?? undefined,
        qrDataUrl: data?.qrDataUrl ?? undefined,
        secretMasked: data?.secretMasked ?? undefined,
      })
      setCode("")
    } catch (e: any) {
      toast({ type: "error", title: "Failed to start TOTP", message: String(e), duration: 5000 })
    } finally {
      setLoading(false)
    }
  }

  const verify = async () => {
    setLoading(true)
    try {
      const res = await fetch(verifyUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = (body && (body.error || body.details)) || `Failed (status ${res.status})`
        toast({ type: "error", title: "Failed to enable authenticator", message: msg, duration: 6000 })
        return
      }

      const responseData = body?.data ?? body
      const backupCodes = responseData?.backupCodes || []
      // eslint-disable-next-line no-console
      console.info("Backup codes:", backupCodes)

      toast({
        type: "success",
        title: "2FA enabled",
        message: "Authenticator enabled. Save your backup codes.",
        duration: 8000,
      })
      setSetup(null)
      setCode("")
      onStatusChangeAction?.()
    } catch (e: any) {
      toast({ type: "error", title: "Failed to enable authenticator", message: String(e), duration: 6000 })
    } finally {
      setLoading(false)
    }
  }

  const disable = async () => {
    const trimmed = disableCode.trim()
    if (!trimmed) {
      toast({ type: "error", title: "Error", message: "Please enter a TOTP code or backup code", duration: 4500 })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(disableUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = (body && (body.error || body.details)) || `Failed (status ${res.status})`
        toast({ type: "error", title: "Failed to disable 2FA", message: msg, duration: 4500 })
        return
      }

      toast({ type: "success", title: "2FA disabled", message: "Two-factor authentication disabled.", duration: 4500 })
      setShowDisableInput(false)
      setDisableCode("")
      onStatusChangeAction?.()
    } catch (e: any) {
      toast({ type: "error", title: "Failed to disable 2FA", message: String(e), duration: 4500 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md p-4 sm:p-6 overflow-hidden break-words">
      <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-[#02665e]/10 flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110">
            <Smartphone className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg text-slate-900">Two-Factor Authentication (TOTP)</div>
            <p className="text-sm text-slate-600 mt-1">
              Add an extra layer of security to your account using a TOTP app (Google Authenticator, Authy).
            </p>
          </div>
        </div>
        <div className="shrink-0 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ring-1 ${
              enabled ? "text-green-700 ring-green-200 bg-green-50" : "text-amber-700 ring-amber-200 bg-amber-50"
            }`}
          >
            {enabled ? (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                ENABLED
              </>
            ) : (
              <>
                <AlertCircle className="h-3.5 w-3.5" />
                DISABLED
              </>
            )}
          </span>
        </div>
      </div>

      <div className="mt-4">
        {!enabled ? (
          !setup ? (
            <button
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-[#02665e] text-white font-semibold text-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
              onClick={() => void startSetup()}
              type="button"
              disabled={loading}
            >
              <Key className="h-4 w-4" />
              {loading ? "Starting…" : "Enable TOTP"}
            </button>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 items-start w-full">
              <div className="flex justify-center md:justify-start w-full min-w-0">
                <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                  {setup?.qrDataUrl ? (
                    <Image src={setup.qrDataUrl} alt="TOTP QR" width={160} height={160} className="object-contain" />
                  ) : (
                    <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center text-slate-400 text-sm">Loading QR...</div>
                  )}
                </div>
              </div>
              <div className="w-full min-w-0">
                <label className="text-sm grid gap-2 w-full min-w-0">
                  <span className="font-medium text-slate-700">Enter 6-digit code</span>
                  <input
                    className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-[#02665e]/50 focus:outline-none focus:ring-1 focus:ring-[#02665e]/20 transition-all duration-200 ease-out w-full bg-white min-w-0 max-w-full"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="000000"
                  />
                </label>
                <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full">
                  <button
                    className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-[#02665e] text-white font-semibold text-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.98] transition-all duration-200 w-full sm:w-auto disabled:opacity-60"
                    onClick={() => void verify()}
                    type="button"
                    disabled={loading || !code.trim()}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {loading ? "Verifying…" : "Verify & Enable"}
                  </button>
                  <button
                    className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all duration-200 w-full sm:w-auto"
                    onClick={() => setSetup(null)}
                    type="button"
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )
        ) : !showDisableInput ? (
          <button
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl border border-red-300 bg-white text-red-700 font-semibold text-sm hover:bg-red-50 hover:border-red-400 active:scale-[0.98] transition-all duration-200"
            onClick={() => {
              setShowDisableInput(true)
              setDisableCode("")
            }}
            type="button"
            disabled={loading}
          >
            Disable 2FA
          </button>
        ) : (
          <div className="space-y-3 sm:space-y-4 w-full max-w-full">
            <div className="w-full max-w-full min-w-0">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 sm:mb-2">Enter TOTP code or backup code to disable</label>
              <input
                type="text"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value)}
                placeholder="Enter code"
                className="block w-full max-w-full min-w-0 rounded-lg border-2 border-slate-200 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-mono focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition-all duration-200 box-border"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-slate-500">Enter a 6-digit TOTP code from your authenticator app or a backup code.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full max-w-full">
              <button
                onClick={() => void disable()}
                disabled={loading || !disableCode.trim()}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-300 border-2 border-red-600 hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {loading ? "Disabling…" : "Disable 2FA"}
              </button>
              <button
                onClick={() => {
                  setShowDisableInput(false)
                  setDisableCode("")
                }}
                className="sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-300 border-2 border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
                type="button"
                disabled={loading}
              >
                <span className="truncate">Cancel</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
