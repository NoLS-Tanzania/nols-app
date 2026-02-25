"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ChevronLeft, Eye, EyeOff, Lock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Password validation function with DoS protection (12 characters for OWNER)
function validatePasswordStrength(password: string, _role?: string | null) {
  // Backend enforces 12 characters minimum for OWNER/ADMIN roles
  const minLength = 12; // DoS protection: minimum 12 characters for OWNER
  const maxLength = 12; // DoS protection: maximum 12 characters
  const requireUpper = true;
  const requireLower = true;
  const requireNumber = true;
  const requireSpecial = true;
  const noSpaces = true;

  const reasons: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let score = 0;

  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, reasons: [], strength: 'weak' as const, score: 0 };
  }

  // DoS protection: enforce length limits (12 characters for OWNER)
  // If password is exactly 12 characters, it passes length check (no reason added)
  if (password.length < minLength) {
    reasons.push(`Password must be at least ${minLength} characters long`);
  } else if (password.length > maxLength) {
    reasons.push(`Password must not exceed ${maxLength} characters`);
  } else {
    // Password length is valid (8-12 characters)
    score += 2;
  }

  // Check requirements
  if (noSpaces && /\s/.test(password)) reasons.push('Password must not contain spaces');
  
  if (requireUpper && !/[A-Z]/.test(password)) {
    reasons.push('Password must include at least one uppercase letter');
  } else {
    score += 1;
  }
  
  if (requireLower && !/[a-z]/.test(password)) {
    reasons.push('Password must include at least one lowercase letter');
  } else {
    score += 1;
  }
  
  if (requireNumber && !/[0-9]/.test(password)) {
    reasons.push('Password must include at least one digit');
  } else {
    score += 1;
  }
  
  if (requireSpecial && !/[!@#\$%\^&\*\(\)\-_=+\[\]{};:'"\\|,<.>/?`~]/.test(password)) {
    reasons.push('Password must include at least one special character (e.g. !@#$%)');
  } else {
    score += 1;
  }

  // Determine strength
  if (reasons.length === 0) {
    strength = score >= 5 ? 'strong' : 'medium';
  } else if (reasons.length <= 2) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  return { valid: reasons.length === 0, reasons, strength, score };
}

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
  const [passwordValidation, setPasswordValidation] = useState<{
    valid: boolean;
    reasons: string[];
    strength: 'weak' | 'medium' | 'strong';
    score: number;
  }>({ valid: false, reasons: [], strength: 'weak', score: 0 })
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null) // null = not checked yet, true = match, false = mismatch
  const [inputLocked, setInputLocked] = useState(false) // Lock input after 12 characters
  const [confirmInputLocked, setConfirmInputLocked] = useState(false) // Lock confirm input after 12 characters
  const [consecutiveFailures, setConsecutiveFailures] = useState(0) // Track consecutive failures
  const [timeoutUntil, setTimeoutUntil] = useState<number | null>(null) // Timeout timestamp
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null) // Cooldown after successful change
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0) // Remaining seconds countdown
  const router = useRouter()

  const progressBarRef = useRef<HTMLDivElement>(null)

  // Real-time password validation
  useEffect(() => {
    if (newPassword) {
      const validation = validatePasswordStrength(newPassword, 'OWNER');
      setPasswordValidation(validation);
    } else {
      setPasswordValidation({ valid: false, reasons: [], strength: 'weak', score: 0 });
    }
  }, [newPassword])

  // Update progress bar width without inline styles
  useEffect(() => {
    if (progressBarRef.current) {
      const width = Math.min(100, (passwordValidation.score / 6) * 100);
      progressBarRef.current.style.width = `${width}%`;
    }
  }, [passwordValidation.score])

  // Real-time password match validation
  useEffect(() => {
    if (confirmPassword && newPassword) {
      setPasswordMatch(newPassword === confirmPassword);
    } else if (confirmPassword && !newPassword) {
      setPasswordMatch(false); // Can't match if new password is empty
    } else {
      setPasswordMatch(null); // Reset when confirm password is cleared
    }
  }, [newPassword, confirmPassword])

  // Real-time validation: Check if new password matches current password
  const isSameAsCurrent = currentPassword && newPassword && currentPassword === newPassword

  // DoS protection: Lock inputs only when both passwords are 12 characters AND they match
  useEffect(() => {
    const shouldLock = newPassword.length === 12 && 
                       confirmPassword.length === 12 && 
                       newPassword === confirmPassword;
    setInputLocked(shouldLock);
    setConfirmInputLocked(shouldLock);
  }, [newPassword, confirmPassword])

  // Check timeout and cooldown status, update countdown
  useEffect(() => {
    const checkTimers = () => {
      const now = Date.now();
      if (timeoutUntil && now < timeoutUntil) {
        setRemainingSeconds(Math.ceil((timeoutUntil - now) / 1000));
      } else if (timeoutUntil && now >= timeoutUntil) {
        setTimeoutUntil(null);
        setConsecutiveFailures(0);
        setRemainingSeconds(0);
      } else {
        setRemainingSeconds(0);
      }
      if (cooldownUntil && now >= cooldownUntil) {
        setCooldownUntil(null);
      }
    };
    checkTimers(); // Run immediately
    const interval = setInterval(checkTimers, 1000);
    return () => clearInterval(interval);
  }, [timeoutUntil, cooldownUntil])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Check timeout
    if (timeoutUntil && Date.now() < timeoutUntil) {
      return // Message is shown in UI, no need for error message
    }

    // Check cooldown
    if (cooldownUntil && Date.now() < cooldownUntil) {
      const remaining = Math.ceil((cooldownUntil - Date.now()) / 60000)
      setError(`Password was recently changed. Please wait ${remaining} minute(s) before changing it again.`)
      return
    }

    if (!newPassword) { setError('Please enter a new password'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return }
    if (newPassword.length !== 12) {
      setError('Password must be exactly 12 characters')
      return
    }
    // Enforce policy: Prevent reusing current password
    if (currentPassword && newPassword === currentPassword) {
      setError('The new password must be different from your current password. Please choose a different password.')
      return
    }

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
        
        // Track consecutive failures
        const newFailureCount = consecutiveFailures + 1
        setConsecutiveFailures(newFailureCount)
        if (newFailureCount >= 3) {
          // Lock for 5 minutes after 3 consecutive failures
          const lockoutDuration = 5 * 60 * 1000 // 5 minutes
          setTimeoutUntil(Date.now() + lockoutDuration)
          setRemainingSeconds(300) // 5 minutes = 300 seconds
        } else {
          if (Array.isArray(reasons) && reasons.length) {
            setError('Password change failed:\n' + reasons.join('\n'))
          } else {
            setError((b && b.error) || `Failed (status ${res.status})`)
          }
        }
      } else {
        // Success: reset failures and set cooldown
        setConsecutiveFailures(0)
        setTimeoutUntil(null)
        const cooldownDuration = 30 * 60 * 1000 // 30 minutes
        setCooldownUntil(Date.now() + cooldownDuration)
        
        setSuccess('Password updated successfully')
        // show global toast
        try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'success', title: 'Password updated', message: 'Your password was changed. You cannot change it again for 30 minutes.', duration: 5000 } })); } catch (e) {}
        // redirect back to settings page after a short delay
        setTimeout(() => router.push('/owner/settings'), 800)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err: any) {
      const newFailureCount = consecutiveFailures + 1
      setConsecutiveFailures(newFailureCount)
      if (newFailureCount >= 3) {
        const lockoutDuration = 5 * 60 * 1000
        setTimeoutUntil(Date.now() + lockoutDuration)
        setRemainingSeconds(300) // 5 minutes = 300 seconds
      } else {
        setError(err?.message ?? String(err))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-600 transition-all duration-200 border-0 bg-transparent outline-none focus:outline-none p-1.5 rounded-md hover:bg-slate-100/50 focus:bg-slate-100/50 cursor-pointer"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
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
                  onChange={(e) => {
                    if (timeoutUntil && Date.now() < timeoutUntil) return // Block during timeout
                    const value = e.target.value
                    // Strictly enforce 12 character limit - always truncate immediately
                    const truncated = value.slice(0, 12)
                    setNewPassword(truncated)
                  }}
                  onPaste={(e) => {
                    e.preventDefault()
                    if (timeoutUntil && Date.now() < timeoutUntil) return // Block during timeout
                    const pastedText = e.clipboardData.getData('text')
                    // Strictly enforce 12 character limit - always truncate immediately
                    const truncated = pastedText.slice(0, 12)
                    setNewPassword(truncated)
                  }}
                  maxLength={12}
                  disabled={inputLocked || (timeoutUntil !== null && Date.now() < timeoutUntil)}
                  placeholder="Enter your new password (8-12 characters)" 
                  className={`block w-full max-w-full min-w-0 rounded-lg border-2 px-3 sm:px-4 py-2.5 pr-10 text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all duration-200 box-border ${
                    inputLocked || (timeoutUntil !== null && Date.now() < timeoutUntil) ? 'bg-slate-100 cursor-not-allowed border-red-400' :
                    !newPassword ? 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200' :
                    passwordValidation.strength === 'strong' ? 'border-green-500 focus:border-green-600 focus:ring-green-200' :
                    passwordValidation.strength === 'medium' ? 'border-yellow-500 focus:border-yellow-600 focus:ring-yellow-200' :
                    'border-red-300 focus:border-red-400 focus:ring-red-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-600 transition-all duration-200 border-0 bg-transparent outline-none focus:outline-none p-1.5 rounded-md hover:bg-slate-100/50 focus:bg-slate-100/50 cursor-pointer"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-3 space-y-2">
                  {/* Strength Meter */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-semibold transition-colors duration-200 ${
                        passwordValidation.strength === 'strong' ? 'text-green-600' :
                        passwordValidation.strength === 'medium' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {passwordValidation.strength === 'strong' && '✓ Strong password'}
                        {passwordValidation.strength === 'medium' && '⚠ Password needs improvement'}
                        {passwordValidation.strength === 'weak' && '✗ Password is too weak'}
                      </span>
                      <span className="text-xs text-slate-500">
                        {passwordValidation.score}/6
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        ref={progressBarRef}
                        className={`h-full rounded-full transition-all duration-300 ease-out ${
                          passwordValidation.strength === 'strong' ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                          passwordValidation.strength === 'medium' ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                          'bg-gradient-to-r from-red-400 to-red-600'
                        }`}
                      />
                    </div>
                  </div>
                  
                  {/* Requirements Checklist */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-xs font-semibold text-slate-600 mb-1.5">Password requirements:</div>
                    <div className="space-y-1.5">
                      {[
                        { check: newPassword.length === 12, label: 'Exactly 12 characters' },
                        { check: /[A-Z]/.test(newPassword), label: 'One uppercase letter (A-Z)' },
                        { check: /[a-z]/.test(newPassword), label: 'One lowercase letter (a-z)' },
                        { check: /[0-9]/.test(newPassword), label: 'One number (0-9)' },
                        { check: /[!@#\$%\^&\*\(\)\-_=+\[\]{};:'"\\|,<.>/?`~]/.test(newPassword), label: 'One special character (!@#$%&*)' },
                        { check: !/\s/.test(newPassword), label: 'No spaces' },
                      ].map((req, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          {req.check ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                          )}
                          <span className={req.check ? 'text-green-700 font-medium' : 'text-slate-500'}>
                            {req.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Warning: Same as current password */}
                  {isSameAsCurrent && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium animate-in fade-in slide-in-from-top-1 duration-200 bg-red-50 border border-red-200 rounded-lg p-2">
                      <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>The new password must be different from your current password.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="w-full max-w-full min-w-0">
              <label className="block text-xs sm:text-sm font-bold text-slate-700 mb-2">Confirm new password</label>
              <div className="relative w-full max-w-full">
                <input 
                  type={showConfirmPassword ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={(e) => {
                    if (timeoutUntil && Date.now() < timeoutUntil) return // Block during timeout
                    const value = e.target.value
                    // Strictly enforce 12 character limit - always truncate immediately
                    const truncated = value.slice(0, 12)
                    setConfirmPassword(truncated)
                  }}
                  onPaste={(e) => {
                    e.preventDefault()
                    if (timeoutUntil && Date.now() < timeoutUntil) return // Block during timeout
                    const pastedText = e.clipboardData.getData('text')
                    // Strictly enforce 12 character limit - always truncate immediately
                    const truncated = pastedText.slice(0, 12)
                    setConfirmPassword(truncated)
                  }}
                  maxLength={12}
                  disabled={confirmInputLocked || (timeoutUntil !== null && Date.now() < timeoutUntil)}
                  placeholder="Confirm your new password (12 characters)" 
                  className={`block w-full max-w-full min-w-0 rounded-lg border-2 px-3 sm:px-4 py-2.5 pr-10 text-xs sm:text-sm focus:outline-none focus:ring-2 transition-all duration-200 box-border ${
                    confirmInputLocked || (timeoutUntil !== null && Date.now() < timeoutUntil) ? 'bg-slate-100 cursor-not-allowed border-red-400' :
                    passwordMatch === null ? 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200' :
                    passwordMatch === true ? 'border-green-500 focus:border-green-600 focus:ring-green-200' :
                    'border-red-300 focus:border-red-400 focus:ring-red-200'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-600 transition-all duration-200 border-0 bg-transparent outline-none focus:outline-none p-1.5 rounded-md hover:bg-slate-100/50 focus:bg-slate-100/50 cursor-pointer"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={0}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="mt-2">
                  {passwordMatch === true ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                      <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Passwords match</span>
                    </div>
                  ) : passwordMatch === false ? (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium animate-in fade-in slide-in-from-top-1 duration-200">
                      <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>Passwords do not match</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Timeout Warning - Consolidated message with countdown and attempt count */}
            {timeoutUntil && Date.now() < timeoutUntil && (
              <div className="rounded-xl bg-red-50 border-2 border-red-200 p-3 sm:p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs sm:text-sm font-bold text-red-800 mb-1">
                      Account temporarily locked due to {consecutiveFailures >= 3 ? 3 : consecutiveFailures} failed attempt{consecutiveFailures >= 3 ? 's' : consecutiveFailures > 1 ? 's' : ''}
                    </div>
                    <div className="text-xs sm:text-sm text-red-700">
                      Please wait <span className="font-bold text-red-800">{remainingSeconds}</span> second{remainingSeconds !== 1 ? 's' : ''} before trying again.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cooldown Warning */}
            {cooldownUntil && Date.now() < cooldownUntil && (
              <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-3 sm:p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  <div className="text-xs sm:text-sm font-semibold text-blue-800">
                    Password was recently changed. You can change it again in {Math.ceil((cooldownUntil - Date.now()) / 60000)} minute(s).
                  </div>
                </div>
              </div>
            )}

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
                disabled={loading || !passwordValidation.valid || newPassword !== confirmPassword || !currentPassword || isSameAsCurrent || (timeoutUntil !== null && Date.now() < timeoutUntil) || (cooldownUntil !== null && Date.now() < cooldownUntil)} 
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

