"use client"

import React from "react"
import PasskeysManager from "@/components/security/PasskeysManager"

export default function OwnerPasskeysPage() {
  return (
    <PasskeysManager
      apiBasePath="/api/account/security/passkeys"
      backHref="/owner/settings"
      title="Passkeys"
      description="Passwordless sign-in with biometrics or security keys."
      containerClassName="public-container w-full"
    />
  )
}
