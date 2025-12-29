"use client"

import React from "react"
import Link from "next/link"
import { ChevronLeft, LogIn, Smartphone, Lock, Shield, Settings as SettingsIcon } from 'lucide-react'

export default function OwnerSettingsPage() {
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        <div className="w-full text-center">
          <div className="flex flex-col items-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-emerald-50 text-emerald-600 transition-all duration-300">
              <Shield className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
            </div>
            <h1 className="mt-3 text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-2xl">Manage your security settings — password, two-factor auth, active sessions and other security-related tools.</p>
          </div>
        </div>

        <section className="w-full max-w-full bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50">
          <div className="space-y-4">
            {/* Password Card */}
            <div className="p-4 sm:p-5 border-2 border-slate-200 rounded-xl bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                    <Lock className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Password</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Change your account password.</p>
                  </div>
                </div>
                <Link 
                  href="/owner/settings/password" 
                  title="Manage password" 
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all duration-300 border border-emerald-200 hover:border-emerald-300 no-underline whitespace-nowrap flex-shrink-0"
                  aria-label="Manage password"
                >
                  <Lock className="h-4 w-4" />
                  <span>Manage password</span>
                </Link>
              </div>
            </div>

            {/* Two-factor authentication Card */}
            <div className="p-4 sm:p-5 border-2 border-slate-200 rounded-xl bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Two-factor authentication</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Enable or manage 2FA (TOTP, SMS, or authenticator app).</p>
                  </div>
                </div>
                <Link 
                  href="/owner/settings/2fa" 
                  title="Manage two-factor authentication" 
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all duration-300 border border-emerald-200 hover:border-emerald-300 no-underline whitespace-nowrap flex-shrink-0"
                  aria-label="Manage two-factor authentication"
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Manage 2FA</span>
                </Link>
              </div>
            </div>

            {/* Active Sessions Card */}
            <div className="p-4 sm:p-5 border-2 border-slate-200 rounded-xl bg-white hover:border-emerald-300 hover:shadow-md transition-all duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <LogIn className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Active Sessions</h3>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">View and manage your active login sessions.</p>
                  </div>
                </div>
                <Link 
                  href="/owner/settings/sessions" 
                  title="View active sessions" 
                  className="inline-flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all duration-300 border border-emerald-200 hover:border-emerald-300 no-underline whitespace-nowrap flex-shrink-0"
                  aria-label="View active sessions"
                >
                  <LogIn className="h-4 w-4" />
                  <span>View sessions</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-start pt-4 border-t border-slate-200">
            <Link 
              href="/owner" 
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all duration-300 border border-slate-200 hover:border-slate-300 no-underline"
              aria-label="Back to Dashboard"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

