"use client"

import React from "react"
import PasswordChangeForm from "@/components/security/PasswordChangeForm"

export default function AgentPasswordPage() {
  return (
    <PasswordChangeForm
      apiUrl="/api/account/password/change"
      redirectHref="/account/agent/security"
      backHref="/account/agent/security"
      roleLabel="AGENT"
    />
  )
}
