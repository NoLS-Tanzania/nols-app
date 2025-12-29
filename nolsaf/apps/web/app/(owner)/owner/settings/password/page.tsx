"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Eye, EyeOff, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function OwnerPasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!newPassword) { setError('Please enter a new password'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/account/password/change', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      if (!res.ok) {
        const b = await res.json().catch(() => null)
        const reasons = b?.reasons || []
        if (Array.isArray(reasons) && reasons.length) {
          setError('Password change failed:\n' + reasons.join('\n'))
        } else {
          setError((b && b.error) || `Failed (status ${res.status})`)
        }
      } else {
        setSuccess('Password updated successfully')
        // show global toast
        try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'success', title: 'Password updated', message: 'Your password was changed.', duration: 3500 } })); } catch (e) {}
        // redirect back to settings page after a short delay
        setTimeout(() => router.push('/owner/settings'), 800)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err: any) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <div className="w-full text-center">
          <div className="flex flex-col items-center mb-6">
            <div className="inline-flex items-center justify-center h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-emerald-50 text-emerald-600 transition-all duration-300">
              <Lock className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
            </div>
            <h1 className="mt-3 text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Change Password</h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">Update your account password to keep it secure.</p>
          </div>
        </div>

        <section className="w-full max-w-full bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50 box-border">
          <form onSubmit={submit} className="w-full max-w-full space-y-4 sm:space-y-5">
            {/* Current Password */}
            <div className="w-full max-w-full min-w-0">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">Current password</label>
              <div className="relative w-full max-w-full">
                <input 
                  type={showCurrentPassword ? "text" : "password"} 
                  value={currentPassword} 
                  onChange={(e) => setCurrentPassword(e.target.value)} 
                  placeholder="Enter your current password" 
                  className="block w-full max-w-full min-w-0 rounded-lg border-2 border-slate-200 px-3 sm:px-4 py-2.5 pr-10 text-xs sm:text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200 box-border" 
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent outline-none focus:outline-none p-0"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="w-full max-w-full min-w-0">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">New password</label>
              <div className="relative w-full max-w-full">
                <input 
                  type={showNewPassword ? "text" : "password"} 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  placeholder="Enter your new password" 
                  className="block w-full max-w-full min-w-0 rounded-lg border-2 border-slate-200 px-3 sm:px-4 py-2.5 pr-10 text-xs sm:text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200 box-border" 
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent outline-none focus:outline-none p-0"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="w-full max-w-full min-w-0">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">Confirm new password</label>
              <div className="relative w-full max-w-full">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  placeholder="Confirm your new password" 
                  className="block w-full max-w-full min-w-0 rounded-lg border-2 border-slate-200 px-3 sm:px-4 py-2.5 pr-10 text-xs sm:text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200 box-border" 
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent outline-none focus:outline-none p-0"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="rounded-xl bg-red-50 border-2 border-red-200 p-3 sm:p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-xs sm:text-sm font-semibold text-red-800 whitespace-pre-line">{error}</div>
              </div>
            )}
            {success && (
              <div className="rounded-xl bg-green-50 border-2 border-green-200 p-3 sm:p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="text-xs sm:text-sm font-semibold text-green-800">{success}</div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4">
              <Link 
                href="/owner/settings" 
                className="inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-300 border-2 border-slate-200 hover:border-slate-300 no-underline"
              >
                Cancel
              </Link>
              <button 
                type="submit" 
                disabled={loading} 
                className="inline-flex items-center justify-center px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all duration-300 border-2 border-emerald-600 hover:border-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
              >
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>

          <div className="mt-6 flex justify-start pt-4 border-t border-slate-200">
            <Link 
              href="/owner/settings" 
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all duration-300 border border-slate-200 hover:border-slate-300 no-underline"
              aria-label="Back to Settings"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Settings</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}

