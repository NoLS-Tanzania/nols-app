"use client"

import React from "react"
import PasswordChangeForm from "@/components/security/PasswordChangeForm"

export default function PasswordPage() {
  return (
    <PasswordChangeForm
      apiUrl="/api/driver/security/password"
      redirectHref="/driver/security"
      backHref="/driver/security"
      roleLabel="DRIVER"
    />
  )
}
