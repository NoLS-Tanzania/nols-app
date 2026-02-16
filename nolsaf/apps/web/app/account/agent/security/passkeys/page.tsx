"use client"

import React from "react"
import PasskeysManager from "@/components/security/PasskeysManager"

export default function AgentPasskeysPage() {
  return (
    <PasskeysManager
      apiBasePath="/api/account/security/passkeys"
      backHref="/account/agent/security"
      title="Passkeys"
      description="Passwordless sign-in with biometrics or security keys."
      containerClassName="public-container w-full"
    />
  )
}
