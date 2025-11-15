"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import DriverPageHeader from "@/components/DriverPageHeader"
import { ChevronLeft, Key, Trash } from 'lucide-react'

export default function PasskeysPage() {
  const [loading, setLoading] = useState(false)
  const [keys, setKeys] = useState<Array<{ id: string; name: string; createdAt?: string }>>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/driver/security/passkeys', { credentials: 'include' })
        if (!mounted) return
        if (!res.ok) return
        const body = await res.json().catch(() => null)
        if (body && Array.isArray(body.items)) setKeys(body.items)
      } catch (e) { /* ignore */ } finally { setLoading(false) }
    })()
    return () => { mounted = false }
  }, [])

  const register = async () => {
    setError(null)
    setLoading(true)
    try {
      // 1) request creation options (challenge) from server
      const optRes = await fetch('/api/driver/security/passkeys', { method: 'POST', credentials: 'include' })
      if (!optRes.ok) { const b = await optRes.json().catch(() => null); setError((b && b.error) || `Failed (status ${optRes.status})`); return }
      const body = await optRes.json()
      const publicKey = body.publicKey as any

      // convert challenge & user.id to Uint8Array if present
      // Use a robust base64url -> Uint8Array helper to avoid InvalidCharacterError
      const base64UrlToUint8Array = (input: string) => {
        let str = String(input).trim()
        // remove common whitespace/newline padding characters that may appear
        str = str.replace(/\s+/g, '')
        // permissively strip characters not in base64url
        str = str.replace(/[^A-Za-z0-9-_]/g, '')
        // base64url -> base64
        str = str.replace(/-/g, '+').replace(/_/g, '/')
        const pad = (4 - (str.length % 4)) % 4
        if (pad) str += '='.repeat(pad)
        try {
          const binary = atob(str)
          const len = binary.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
          return bytes
        } catch (err) {
          return null
        }
      }

      const coerceToUint8 = (val: any) : Uint8Array | null => {
        if (!val && val !== 0) return null
        // already a TypedArray / ArrayBuffer
        if (val instanceof Uint8Array) return val
        if (val instanceof ArrayBuffer) return new Uint8Array(val)
        // array-like of numbers
        if (Array.isArray(val) && val.every(n => typeof n === 'number')) return Uint8Array.from(val)
        // Node.js Buffer-like object { type: 'Buffer', data: [...] }
        if (val && typeof val === 'object' && Array.isArray((val as any).data)) return Uint8Array.from((val as any).data)
        // string: try base64url decode
        if (typeof val === 'string') {
          // if looks like JSON array, try parse
          if (val.trim().startsWith('[')) {
            try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return Uint8Array.from(parsed) } catch (e) { /* ignore */ }
          }
          const b = base64UrlToUint8Array(val)
          if (b) return b
          // Last-resort: encode the UTF-8 bytes of the string so the browser
          // receives a BufferSource and can open the prompt. This may not
          // match server expectations but prevents the "could not be converted" TypeError.
          try {
            return new TextEncoder().encode(val)
          } catch (e) {
            return null
          }
        }
        return null
      }

      // Attempt to coerce publicKey.challenge and publicKey.user.id to Uint8Array,
      // but if coercion fails we proceed and let the browser attempt creation (it may still work).
      try {
        if (publicKey.challenge != null) {
          const coerced = coerceToUint8(publicKey.challenge)
          if (coerced) publicKey.challenge = coerced
        }
      } catch (e) { /* swallow */ }
      try {
        if (publicKey.user && publicKey.user.id != null) {
          const coerced = coerceToUint8(publicKey.user.id)
          if (coerced) publicKey.user.id = coerced
        }
      } catch (e) { /* swallow */ }

      // 2) call WebAuthn API
      const cred: any = await navigator.credentials.create({ publicKey }) as any
      if (!cred) { setError('Credential creation was cancelled'); return }

      // prepare attestation for server (base64url)
      const arrToB64 = (buf: ArrayBuffer) => {
        const bytes = new Uint8Array(buf)
        let str = ''
        for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i])
        return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
      }

      const rawId = arrToB64(cred.rawId)
      const attObj = arrToB64(cred.response.attestationObject)
      const clientData = arrToB64(cred.response.clientDataJSON)

      const verifyRes = await fetch('/api/driver/security/passkeys/verify', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: rawId, rawId, response: { attestationObject: attObj, clientDataJSON: clientData }, name: 'My device' }) })
      if (!verifyRes.ok) { const b = await verifyRes.json().catch(() => null); setError((b && b.error) || `Failed (status ${verifyRes.status})`); return }
      const vbody = await verifyRes.json().catch(() => null)
      if (vbody && vbody.ok && vbody.item) {
        setKeys(prev => [vbody.item, ...prev])
        setSuccess('Passkey registered and saved')
        setError(null)
        // auto-clear success after a short delay
        setTimeout(() => setSuccess(null), 4000)
      }
      } catch (e: any) {
        // Show a short friendly message; avoid exposing low-level encoding details
        console.error('Passkey registration error:', e)
        setError('Registration failed; please try again.')
      } finally { setLoading(false) }
  }

  const remove = async (id: string) => {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/driver/security/passkeys/${id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        const b = await res.json().catch(() => null)
        setError((b && b.error) || `Failed (status ${res.status})`)
      } else {
        setKeys(prev => prev.filter(k => k.id !== id))
      }
    } catch (e: any) { setError(String(e)) } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl text-center -mb-4">
        <DriverPageHeader title="Passkeys" />
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
        <p className="text-sm text-slate-600 text-center mx-auto max-w-prose -mt-1">Passwordless sign-in with biometrics or security keys.</p>

        <div className="mt-6 space-y-4">
          <div className="mb-2 text-sm text-slate-600">
            <strong>How to register a passkey:</strong>
            <ol className="list-decimal list-inside mt-1 text-xs text-slate-500">
              <li>Click the Register passkey button</li>
              <li>When the browser prompt appears, choose your security key or biometric option</li>
              <li>Complete the device interaction (PIN / touch / biometric)</li>
              <li>If registration fails, check the server challenge encoding (must be base64url)</li>
            </ol>
          </div>
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Registered passkeys</h3>
                <p className="text-xs text-slate-500">Manage devices and security keys registered for passwordless sign-in.</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={register} disabled={loading} className={`text-sm inline-flex items-center gap-2 ${loading ? 'text-slate-400 opacity-60 pointer-events-none' : 'text-sky-600'}`}>
                  <Key className="h-4 w-4" aria-hidden />
                  <span>{loading ? 'Registering…' : 'Register passkey'}</span>
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {keys.length === 0 && <div className="text-sm text-slate-500">No passkeys registered.</div>}
              {keys.map(k => (
                <div key={k.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="text-sm font-medium">{k.name}</div>
                    <div className="text-xs text-slate-500">{k.createdAt ? new Date(k.createdAt).toLocaleString() : '—'}</div>
                  </div>
                  <div>
                    <button onClick={() => remove(k.id)} disabled={loading} className="text-sm text-red-600 inline-flex items-center gap-2">
                      <Trash className="h-4 w-4" aria-hidden />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
        {success && <div className="mt-4 text-sm text-green-600">{success}</div>}

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
