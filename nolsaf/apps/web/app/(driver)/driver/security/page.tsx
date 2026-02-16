"use client"

import React from "react"
import { LogIn, Smartphone, Lock, Fingerprint, Shield } from "lucide-react"
import SecurityHub from "@/components/security/SecurityHub"

export default function SecurityPage() {
  return (
    <SecurityHub
      title="Security"
      description="Manage your security settings — password, two-factor auth, active sessions and other security-related tools."
      headerIcon={Shield}
      headerIconBgClassName="bg-emerald-50"
      headerIconClassName="text-emerald-600"
      template="settings"
      items={[
        {
          title: "Password",
          description: "Change your account password.",
          href: "/driver/security/password",
          icon: Lock,
          iconBgClassName: "bg-emerald-50",
          iconClassName: "text-emerald-600",
          tone: "light",
          actionLabel: "Manage password",
          actionIcon: Lock,
          actionAriaLabel: "Manage password",
        },
        {
          title: "Two-factor authentication",
          description: "Enable or manage 2FA (TOTP, SMS, or authenticator app).",
          href: "/driver/security/2fa",
          icon: Smartphone,
          iconBgClassName: "bg-blue-50",
          iconClassName: "text-blue-600",
          tone: "soft",
          actionLabel: "Manage two-factor authentication",
          actionIcon: Smartphone,
          actionAriaLabel: "Manage two-factor authentication",
        },
        {
          title: "Passkeys",
          description: "Passwordless sign-in with biometrics or security keys.",
          href: "/driver/security/passkeys",
          icon: Fingerprint,
          iconBgClassName: "bg-purple-50",
          iconClassName: "text-purple-600",
          tone: "soft",
          actionLabel: "Manage passkeys",
          actionIcon: Fingerprint,
          actionAriaLabel: "Manage passkeys",
        },
        {
          title: "Login history",
          description: "View recent login attempts and history.",
          href: "/driver/security/login-history",
          icon: LogIn,
          iconBgClassName: "bg-amber-50",
          iconClassName: "text-amber-600",
          tone: "light",
          actionLabel: "View login history",
          actionIcon: LogIn,
          actionAriaLabel: "View login history",
        },
      ]}
      backHref="/driver/management"
      backLabel="Back to Management"
      backAriaLabel="Back to Management"
    />
  )
}
