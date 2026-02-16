"use client"

import React, { useEffect, useState } from "react"
import { Shield } from "lucide-react"

import PasswordChangeForm from "@/components/security/PasswordChangeForm"
import TotpSettingsSection from "@/components/security/TotpSettingsSection"
import ActiveSessionsSection from "@/components/security/ActiveSessionsSection"

export type AccountSecurityPanelProps = {
  variant?: "page" | "embedded"
  roleLabelOverride?: string
}

type Me = {
  role?: string | null
  twoFactorEnabled?: boolean
}

async function fetchJson(url: string) {
  const res = await fetch(url, { credentials: "include" })
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error((body && body.error) || `Failed (status ${res.status})`)
  return body?.data ?? body
}

export default function AccountSecurityPanel({ variant = "page", roleLabelOverride }: AccountSecurityPanelProps) {
  const embedded = variant === "embedded"
  const [me, setMe] = useState<Me | null>(null)

  const refreshMe = async () => {
    try {
      const meData = await fetchJson("/api/account/me")
      setMe(meData)
    } catch {
      setMe(null)
    }
  }

  useEffect(() => {
    void refreshMe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const roleUpper = String(roleLabelOverride || me?.role || "").toUpperCase()
  const isPrivileged = roleUpper === "ADMIN" || roleUpper === "OWNER"

  return (
    <div className={`w-full ${embedded ? "space-y-4" : "space-y-6"}`}>
      {!embedded ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col items-center text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#02665e]/10 to-[#014d47]/10 flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-[#02665e]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Security</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your account security settings</p>
          </div>
        </div>
      ) : null}

      <TotpSettingsSection
        enabled={!!me?.twoFactorEnabled}
        setupUrl="/api/account/2fa/totp/setup"
        verifyUrl="/api/account/2fa/totp/verify"
        disableUrl="/api/account/2fa/disable"
        embedded={embedded}
      />

      <PasswordChangeForm
        apiUrl="/api/account/password/change"
        variant="section"
        roleLabel={roleUpper || "ACCOUNT"}
        minLength={isPrivileged ? 12 : 8}
        maxLength={12}
        exactLength={isPrivileged ? 12 : undefined}
        requireCurrentPassword
        submitLabel="Update Password"
      />

      <ActiveSessionsSection
        listUrl="/api/account/sessions"
        revokeUrl="/api/account/sessions/revoke"
        revokeOthersUrl="/api/account/sessions/revoke-others"
        embedded={embedded}
      />
    </div>
  )
}
