"use client"

import React from "react"
import LoginHistoryTable from "@/components/security/LoginHistoryTable"

export default function AccountLoginHistoryPage() {
  return (
    <LoginHistoryTable
      apiUrl="/api/account/security/logins"
      backHref="/account/security"
      containerClassName="public-container w-full"
    />
  )
}
