"use client"

import React from "react"
import Link from "next/link"
import DriverPageHeader from "@/components/DriverPageHeader"
import { ChevronLeft, LogIn, Smartphone, Lock, Fingerprint } from 'lucide-react'

export default function SecurityPage() {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center -mb-4">
        <DriverPageHeader title="Security" />
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
          <div className="prose max-w-none">
          <h2 className="sr-only">Security</h2>
          <p className="text-sm text-slate-600 text-center mx-auto max-w-prose">Manage your security settings — password, two-factor auth, active sessions and other security-related tools.</p>

          <div className="mt-6 space-y-4">
            <div className="p-4 border rounded-lg flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Password</h3>
                <p className="text-xs text-slate-500">Change your account password.</p>
              </div>
              <Link href="/driver/security/password" title="Manage password" className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors" aria-label="Manage password">
                <Lock className="h-4 w-4" aria-hidden />
                <span className="sr-only">Manage password</span>
              </Link>
            </div>

            <div className="p-4 border rounded-lg flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Two-factor authentication</h3>
                <p className="text-xs text-slate-500">Enable or manage 2FA (TOTP, SMS, or authenticator app).</p>
              </div>
              <Link href="/driver/security/2fa" title="Manage two-factor authentication" className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors" aria-label="Manage two-factor authentication">
                <Smartphone className="h-4 w-4" aria-hidden />
                <span className="sr-only">Manage two-factor authentication</span>
              </Link>
            </div>

            <div className="p-4 border rounded-lg flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Passkeys</h3>
                <p className="text-xs text-slate-500">Passwordless sign-in with biometrics or security keys.</p>
              </div>
              <Link href="/driver/security/passkeys" title="Manage passkeys" className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors" aria-label="Manage passkeys">
                <Fingerprint className="h-4 w-4" aria-hidden />
                <span className="sr-only">Manage passkeys</span>
              </Link>
            </div>

            {/* Active sessions removed per request */}

            <div className="p-4 border rounded-lg flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Login history</h3>
                <p className="text-xs text-slate-500">View recent login attempts and history.</p>
              </div>
              <Link href="/driver/security/login-history" title="View login history" className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors" aria-label="View login history">
                <LogIn className="h-4 w-4" aria-hidden />
                <span className="sr-only">View login history</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Link href="/driver/management" className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1" aria-label="Back to Management">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span className="sr-only">Back to Management</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
