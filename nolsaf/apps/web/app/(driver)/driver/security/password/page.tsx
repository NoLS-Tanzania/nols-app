"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Eye, EyeOff, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PasswordPage() {
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
      const res = await fetch('/api/driver/security/password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      if (!res.ok) {
        const b = await res.json().catch(() => null)
        setError((b && b.error) || `Failed (status ${res.status})`)
      } else {
        setSuccess('Password updated')
        // show global toast
        try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'success', title: 'Password updated', message: 'Your password was changed.', duration: 3500 } })); } catch (e) {}
        // redirect back to security page after a short delay
        setTimeout(() => router.push('/driver/security'), 800)
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
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="w-full text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
            <Lock className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Change Password</h1>
        </div>
      </div>

      <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden">
        <form onSubmit={submit} className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Current password</label>
            <div className="relative">
              <input 
                type={showCurrentPassword ? "text" : "password"} 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)} 
                placeholder="Enter your current password" 
                className="block w-full rounded-md border-2 border-slate-200 px-4 py-2.5 pr-10 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors" 
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent outline-none focus:outline-none p-0"
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">New password</label>
            <div className="relative">
              <input 
                type={showNewPassword ? "text" : "password"} 
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                placeholder="Enter your new password" 
                className="block w-full rounded-md border-2 border-slate-200 px-4 py-2.5 pr-10 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors" 
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent outline-none focus:outline-none p-0"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm new password</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                placeholder="Confirm your new password" 
                className="block w-full rounded-md border-2 border-slate-200 px-4 py-2.5 pr-10 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors" 
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors border-0 bg-transparent outline-none focus:outline-none p-0"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="rounded-md bg-red-50 border-2 border-red-200 p-3">
              <div className="text-sm font-medium text-red-800">{error}</div>
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-50 border-2 border-green-200 p-3">
              <div className="text-sm font-medium text-green-800">{success}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Link 
              href="/driver/security" 
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors border-2 border-slate-200 hover:border-slate-300 no-underline"
            >
              Cancel
            </Link>
            <button 
              type="submit" 
              disabled={loading} 
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors border-2 border-emerald-600 hover:border-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>

        <div className="mt-6 flex justify-start pt-4 border-t border-slate-200">
          <Link 
            href="/driver/security" 
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors border border-slate-200 hover:border-slate-300 no-underline"
            aria-label="Back to Security"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Security</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
