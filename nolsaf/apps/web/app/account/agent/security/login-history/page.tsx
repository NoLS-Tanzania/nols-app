"use client"

import React from "react"
import LoginHistoryTable from "@/components/security/LoginHistoryTable"

export default function AgentLoginHistoryPage() {
  return (
    <LoginHistoryTable
      apiUrl="/api/account/security/logins"
      backHref="/account/agent/security"
      containerClassName="public-container w-full"
    />
  )
}
