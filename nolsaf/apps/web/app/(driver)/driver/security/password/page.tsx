"use client"

import React, { useState } from "react"
import Link from "next/link"
import DriverPageHeader from "@/components/DriverPageHeader"
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function PasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center">
        <DriverPageHeader title="Change password" />
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Current password</label>
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" title="Current password" className="mt-1 block w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">New password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" title="New password" className="mt-1 block w-full rounded border px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Confirm new password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" title="Confirm new password" className="mt-1 block w-full rounded border px-3 py-2" />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
          {success && <div className="text-sm text-green-600">{success}</div>}

          <div className="flex items-center justify-between">
            <div />
            <div className="space-x-2">
              <Link href="/driver/security" className="text-slate-600">Cancel</Link>
              <button type="submit" disabled={loading} className="bg-sky-600 text-white px-4 py-2 rounded disabled:opacity-50">{loading ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </form>

        <div className="mt-6 flex justify-end">
          <Link href="/driver/security" className="text-sky-600 inline-flex items-center p-1 rounded hover:text-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1" aria-label="Back to Security">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span className="sr-only">Back to Security</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
