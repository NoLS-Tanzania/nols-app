"use client"

import SecurityHub from "@/components/security/SecurityHub"
import { Shield, Lock, Smartphone, Fingerprint, LogIn, ArrowRight } from "lucide-react"

export default function AgentSecurityHubPage() {
  return (
    <SecurityHub
      title="Security"
      description="Manage your password, 2FA, passkeys, and view sign-in activity."
      headerIcon={Shield}
      headerIconBgClassName="bg-emerald-50"
      headerIconClassName="text-emerald-600"
      template="settings"
      backHref="/account/agent"
      backLabel="Back to Portal"
      items={[
        {
          title: "Password",
          description: "Change your password to keep your account safe.",
          href: "/account/agent/security/password",
          icon: Lock,
          iconBgClassName: "bg-purple-50",
          iconClassName: "text-purple-600",
          tone: "light",
          actionLabel: "Update",
          actionIcon: ArrowRight,
          actionAriaLabel: "Update password",
        },
        {
          title: "Two-factor authentication",
          description: "Enable 2FA to protect your account.",
          href: "/account/agent/security/2fa",
          icon: Smartphone,
          iconBgClassName: "bg-blue-50",
          iconClassName: "text-blue-600",
          tone: "soft",
          actionLabel: "Manage",
          actionIcon: ArrowRight,
          actionAriaLabel: "Manage two-factor authentication",
        },
        {
          title: "Passkeys",
          description: "Passwordless sign-in with biometrics or security keys.",
          href: "/account/agent/security/passkeys",
          icon: Fingerprint,
          iconBgClassName: "bg-emerald-50",
          iconClassName: "text-emerald-600",
          tone: "soft",
          actionLabel: "Manage",
          actionIcon: ArrowRight,
          actionAriaLabel: "Manage passkeys",
        },
        {
          title: "Login history",
          description: "Review recent sign-in attempts for suspicious activity.",
          href: "/account/agent/security/login-history",
          icon: LogIn,
          iconBgClassName: "bg-slate-50",
          iconClassName: "text-slate-700",
          tone: "light",
          actionLabel: "View",
          actionIcon: ArrowRight,
          actionAriaLabel: "View login history",
        },
      ]}
    />
  )
}
