"use client"

import React from "react"
import PasskeysManager from "@/components/security/PasskeysManager"

export default function AccountPasskeysPage() {
  return (
    <PasskeysManager
      apiBasePath="/api/account/security/passkeys"
      backHref="/account/security"
      title="Passkeys & Biometrics"
      description="Register fingerprint, face ID or a hardware security key for passwordless sign-in."
      containerClassName="public-container w-full"
    />
  )
}
