"use client"

import React from "react"
import Link from "next/link"
import { ChevronLeft, LogIn, Smartphone, Lock, Fingerprint, Shield } from 'lucide-react'

export default function SecurityPage() {
  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="w-full text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
            <Shield className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Security</h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl">Manage your security settings — password, two-factor auth, active sessions and other security-related tools.</p>
        </div>
      </div>

      <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden">
        <div className="space-y-4">
          {/* Password Card */}
          <div className="p-5 border-2 border-slate-200 rounded-lg bg-white hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Password</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Change your account password.</p>
                </div>
              </div>
              <Link 
                href="/driver/security/password" 
                title="Manage password" 
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 hover:border-emerald-300 no-underline"
                aria-label="Manage password"
              >
                <Lock className="h-4 w-4" />
                <span>Manage password</span>
              </Link>
            </div>
          </div>

          {/* Two-factor authentication Card */}
          <div className="p-5 border-2 border-slate-200 rounded-lg bg-white hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Two-factor authentication</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Enable or manage 2FA (TOTP, SMS, or authenticator app).</p>
                </div>
              </div>
              <Link 
                href="/driver/security/2fa" 
                title="Manage two-factor authentication" 
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 hover:border-emerald-300 no-underline"
                aria-label="Manage two-factor authentication"
              >
                <Smartphone className="h-4 w-4" />
                <span>Manage two-factor authentication</span>
              </Link>
            </div>
          </div>

          {/* Passkeys Card */}
          <div className="p-5 border-2 border-slate-200 rounded-lg bg-white hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Fingerprint className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Passkeys</h3>
                  <p className="text-sm text-slate-500 mt-0.5">Passwordless sign-in with biometrics or security keys.</p>
                </div>
              </div>
              <Link 
                href="/driver/security/passkeys" 
                title="Manage passkeys" 
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 hover:border-emerald-300 no-underline"
                aria-label="Manage passkeys"
              >
                <Fingerprint className="h-4 w-4" />
                <span>Manage passkeys</span>
              </Link>
            </div>
          </div>

          {/* Login history Card */}
          <div className="p-5 border-2 border-slate-200 rounded-lg bg-white hover:border-emerald-300 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <LogIn className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Login history</h3>
                  <p className="text-sm text-slate-500 mt-0.5">View recent login attempts and history.</p>
                </div>
              </div>
              <Link 
                href="/driver/security/login-history" 
                title="View login history" 
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200 hover:border-emerald-300 no-underline"
                aria-label="View login history"
              >
                <LogIn className="h-4 w-4" />
                <span>View login history</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-start">
          <Link 
            href="/driver/management" 
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors border border-slate-200 hover:border-slate-300 no-underline"
            aria-label="Back to Management"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Management</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
