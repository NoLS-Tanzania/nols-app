"use client"

import React from "react"
import { LogIn, Smartphone, Lock, Fingerprint, Shield, Monitor } from "lucide-react"
import SecurityHub from "@/components/security/SecurityHub"

export default function SecurityPage() {
  return (
    <SecurityHub
      title="Security"
      description="Manage your account security password, two-factor authentication, passkeys (fingerprint / face ID), active sessions and login history."
      headerIcon={Shield}
      headerIconBgClassName="bg-blue-900/40"
      headerIconClassName="text-blue-300"
      template="settings"
      items={[
        {
          title: "Password",
          description: "Update your account password. Pick a strong, unique password.",
          href: "/account/security/password",
          icon: Lock,
          iconBgClassName: "bg-emerald-50",
          iconClassName: "text-emerald-700",
          tone: "light",
          actionLabel: "Change password",
          actionIcon: Lock,
          actionAriaLabel: "Change account password",
        },
        {
          title: "Two-Factor Authentication",
          description: "Add a TOTP authenticator app (Google Authenticator, Authy) for extra sign-in security.",
          href: "/account/security/2fa",
          icon: Smartphone,
          iconBgClassName: "bg-blue-50",
          iconClassName: "text-blue-600",
          tone: "soft",
          actionLabel: "Manage 2FA",
          actionIcon: Smartphone,
          actionAriaLabel: "Manage two-factor authentication",
        },
        {
          title: "Passkeys & Biometrics",
          description: "Sign in with fingerprint, face ID or a hardware security key no password needed.",
          href: "/account/security/passkeys",
          icon: Fingerprint,
          iconBgClassName: "bg-purple-50",
          iconClassName: "text-purple-600",
          tone: "soft",
          actionLabel: "Manage passkeys",
          actionIcon: Fingerprint,
          actionAriaLabel: "Manage passkeys and biometrics",
        },
        {
          title: "Active Sessions",
          description: "See all devices currently signed in and revoke any you don't recognise.",
          href: "/account/security/sessions",
          icon: Monitor,
          iconBgClassName: "bg-slate-100",
          iconClassName: "text-slate-600",
          tone: "light",
          actionLabel: "View sessions",
          actionIcon: Monitor,
          actionAriaLabel: "View active sessions",
        },
        {
          title: "Login History",
          description: "Review recent sign-in attempts and spot any suspicious activity.",
          href: "/account/security/login-history",
          icon: LogIn,
          iconBgClassName: "bg-amber-50",
          iconClassName: "text-amber-600",
          tone: "light",
          actionLabel: "View login history",
          actionIcon: LogIn,
          actionAriaLabel: "View login history",
        },
      ]}
      backHref="/account"
      backLabel="Back to Account"
      backAriaLabel="Back to My Account"
    />
  )
}
