"use client"

import React from "react"
import ActiveSessionsSection from "@/components/security/ActiveSessionsSection"
import SecuritySettingsShell from "@/components/security/SecuritySettingsShell"
import { Monitor } from "lucide-react"

export default function AccountSessionsPage() {
  return (
    <SecuritySettingsShell
      containerClassName="public-container w-full"
      title="Active Sessions"
      description="Devices currently signed into your account. Revoke any session you don't recognise."
      icon={Monitor}
      iconBgClassName="bg-slate-100"
      iconClassName="text-slate-700"
      backHref="/account/security"
      backLabel="Back to Security"
    >
      <ActiveSessionsSection
        listUrl="/api/account/sessions"
        revokeUrl="/api/account/sessions/revoke"
        revokeOthersUrl="/api/account/sessions/revoke-others"
      />
    </SecuritySettingsShell>
  )
}
