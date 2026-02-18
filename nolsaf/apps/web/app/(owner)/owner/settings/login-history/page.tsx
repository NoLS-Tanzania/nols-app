"use client"

import React from "react"
import LoginHistoryTable from "@/components/security/LoginHistoryTable"

export default function OwnerLoginHistoryPage() {
  return (
    <LoginHistoryTable
      apiUrl="/api/account/security/logins"
      backHref="/owner/settings"
      containerClassName="public-container w-full"
    />
  )
}
