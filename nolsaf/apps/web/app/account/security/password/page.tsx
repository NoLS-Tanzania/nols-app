"use client"

import React from "react"
import PasswordChangeForm from "@/components/security/PasswordChangeForm"

export default function PasswordPage() {
  return (
    <PasswordChangeForm
      apiUrl="/api/account/password/change"
      redirectHref="/account/security"
      backHref="/account/security"
      roleLabel="ACCOUNT"
      variant="page"
      minLength={8}
      maxLength={12}
      requireCurrentPassword
      submitLabel="Update Password"
    />
  )
}
