"use client"

import React from "react"
import PasskeysManager from "@/components/security/PasskeysManager"

export default function PasskeysPage() {
  return (
    <PasskeysManager
      apiBasePath="/api/driver/security/passkeys"
      backHref="/driver/security"
      title="Passkeys"
      description="Passwordless sign-in with biometrics or security keys."
      containerClassName="w-full max-w-6xl mx-auto px-4"
    />
  )
}
