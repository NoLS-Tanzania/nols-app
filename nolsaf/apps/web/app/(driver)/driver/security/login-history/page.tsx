"use client"

import React from "react"
import LoginHistoryTable from "@/components/security/LoginHistoryTable"

export default function LoginHistoryPage() {
  return (
    <LoginHistoryTable
      apiUrl="/api/driver/security/logins"
      backHref="/driver/security"
      containerClassName="w-full max-w-6xl mx-auto px-4"
    />
  )
}
