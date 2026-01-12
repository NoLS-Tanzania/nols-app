"use client";

import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { AlertCircle, Check, UserPlus, Lock, LogIn, User, Truck, Building2, Mail, ArrowLeft, Eye, EyeOff, Phone } from 'lucide-react';
import { useRouter, useSearchParams } from "next/navigation";
import AuthPageFlip from "@/components/AuthPageFlip";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const referralCode = searchParams?.get('ref') || null;
  const api = axios.create();

  // Register state
  const [role, setRole] = useState<'traveller' | 'driver' | 'owner'>('traveller');
  const [countryCode, setCountryCode] = useState<string>('+255');
  const [phone, setPhone] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [step, setStep] = useState<'phone' | 'otp' | 'done'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const otpRef = useRef<HTMLInputElement | null>(null);
  
  // Login state
  const [authMode, setAuthMode] = useState<'register' | 'login' | 'forgot'>('register');
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginOtp, setLoginOtp] = useState<string>('');
  const [loginSent, setLoginSent] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'credentials'>('phone');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  
  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotPhone, setForgotPhone] = useState<string>('');
  const [forgotCountryCode, setForgotCountryCode] = useState<string>('+255');
  const [forgotOtp, setForgotOtp] = useState<string>('');
  const [forgotMethod, setForgotMethod] = useState<'email' | 'otp'>('email');
  const [forgotStep, setForgotStep] = useState<'input' | 'otp' | 'sent'>('input');
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [forgotSent, setForgotSent] = useState<boolean>(false);
  const [forgotCountdown, setForgotCountdown] = useState<number>(0);
  const [, setForgotResetToken] = useState<string | null>(null);
  const forgotOtpRef = useRef<HTMLInputElement | null>(null);
  
  const router = useRouter();
  const [visible, setVisible] = useState<boolean>(true);

  const sendOtp = async () => {
    setError(null);
    if (!phone || phone.trim().length < 5) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `${countryCode}${phone}`, role }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send OTP');
      }
      setSuccess('OTP sent. Please check your phone.');
      setStep('otp');
      setCountdown(60);
      const iv = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(iv);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    if (!otp || otp.trim().length < 3) {
      setError('Enter the OTP you received');
      return;
    }
    if (!agreed) {
      setError('You must agree to the terms and conditions');
      return;
    }
    setLoading(true);
    try {
      // Verify OTP with API
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `${countryCode}${phone}`, otp, role }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'OTP verification failed');
      }
      setSuccess('Verified — account created');
      setStep('done');
      // Include referral code in URL if present
      const onboardUrl = referralCode 
        ? `/account/onboard/${role}?ref=${encodeURIComponent(referralCode)}`
        : `/account/onboard/${role}`;
      setTimeout(() => router.push(onboardUrl), 900);
    } catch (err: any) {
      setError(err?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    await sendOtp();
  };

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      setVisible(true);
      if (step === 'otp' && otpRef.current) {
        try { otpRef.current.focus(); } catch (e) {}
      }
    }, 20);
    return () => clearTimeout(t);
  }, [step]);

  const handlePageChange = (page: number) => {
    if (page === 0) setAuthMode('register');
    else if (page === 1) setAuthMode('login');
    else setAuthMode('forgot');
  };

  const getCurrentPage = () => {
    if (authMode === 'register') return 0;
    if (authMode === 'login') return 1;
    return 2;
  };

  // Register Page
  const renderRegisterPage = () => {
    return (
      <div className="w-full h-full flex flex-col bg-white relative overflow-hidden box-border">
        <div className="h-1 bg-[#02665e]" />
        
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-[#02665e]" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">Create Account</h1>
              <p className="text-xs text-slate-600 mt-0.5">Sign up to get started</p>
            </div>
            {step !== 'phone' && (
              <div className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                {step === 'otp' ? 'Step 2' : 'Done'}
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50/50">
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-[#02665e] rounded-full transition-all duration-500 ${step === 'phone' ? 'w-1/3' : step === 'otp' ? 'w-2/3' : 'w-full'}`} 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-sm text-emerald-800">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1">{success}</span>
            </div>
          )}

          <div className={`space-y-4 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {step === 'phone' && (
              <>
                <div className="space-y-2.5 min-w-0">
                  <label className="block text-sm font-semibold text-slate-900">Phone Number</label>
                  <div className="relative flex items-center border-2 border-slate-200 rounded-xl overflow-hidden focus-within:border-[#02665e] focus-within:ring-2 focus-within:ring-[#02665e]/20 transition-all duration-200 shadow-sm hover:shadow-md w-full max-w-full box-border">
                    <div className="flex items-center px-3 py-2.5 bg-gradient-to-b from-slate-50 to-slate-100 border-r-2 border-slate-200 relative flex-shrink-0">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="country-code-select text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer text-slate-700 pr-0"
                      >
                        <option value="+255">+255</option>
                        <option value="+1">+1</option>
                        <option value="+256">+256</option>
                        <option value="+254">+254</option>
                      </select>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="712345678"
                      className="flex-1 min-w-0 px-4 py-2.5 text-sm font-medium focus:outline-none placeholder:text-slate-400 bg-white box-border"
                    />
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-slate-400 rounded-full flex-shrink-0" />
                    <span>We&apos;ll send you a verification code</span>
                  </p>
                </div>

                <div className="space-y-2.5">
                  <label className="block text-sm font-medium text-slate-900">I am a</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRole('traveller')}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                        role === 'traveller'
                          ? 'bg-blue-50 border-blue-300 text-blue-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <User className={`w-5 h-5 mb-1.5 ${role === 'traveller' ? 'text-blue-600' : 'text-slate-500'}`} />
                      <div className="text-xs font-medium">Traveller</div>
                      {role === 'traveller' && (
                        <Check className="w-3.5 h-3.5 mt-1.5 text-blue-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('driver')}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                        role === 'driver'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Truck className={`w-5 h-5 mb-1.5 ${role === 'driver' ? 'text-emerald-600' : 'text-slate-500'}`} />
                      <div className="text-xs font-medium">Driver</div>
                      {role === 'driver' && (
                        <Check className="w-3.5 h-3.5 mt-1.5 text-emerald-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('owner')}
                      className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center ${
                        role === 'owner'
                          ? 'bg-amber-50 border-amber-300 text-amber-900'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <Building2 className={`w-5 h-5 mb-1.5 ${role === 'owner' ? 'text-amber-600' : 'text-slate-500'}`} />
                      <div className="text-xs font-medium">Owner</div>
                      {role === 'owner' && (
                        <Check className="w-3.5 h-3.5 mt-1.5 text-amber-600" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full mt-6 px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Sending...</span>
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="w-full text-sm text-slate-600 hover:text-slate-900 py-2 flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Already have an account?</span>
                  <LogIn className="w-4 h-4" />
                </button>
              </>
            )}

            {step === 'otp' && (
              <>
                <div className="space-y-2 min-w-0">
                  <label className="block text-sm font-semibold text-slate-900">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    ref={otpRef}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full max-w-full px-4 py-3 text-xl tracking-widest text-center font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] box-border"
                  />
                </div>

                <div className="p-3 bg-white rounded-lg border-2 border-slate-200 hover:border-slate-300 transition-colors min-w-0">
                  <label className="flex items-center gap-3 cursor-pointer min-w-0 group">
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                        agreed 
                          ? 'bg-[#02665e] border-[#02665e] shadow-sm' 
                          : 'bg-white border-slate-500 group-hover:border-[#02665e] shadow-sm ring-1 ring-slate-200'
                      }`}>
                        {agreed && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-700 leading-relaxed min-w-0 break-words flex-1">
                      I agree to the{' '}
                      <a 
                        href="/terms" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#02665e] hover:text-[#014e47] hover:underline font-semibold transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Terms and Conditions
                      </a>
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="text-xs text-slate-600 min-w-0 flex-shrink-0">
                    {countdown > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse flex-shrink-0" />
                        <span className="whitespace-nowrap">Resend in {countdown}s</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={resend}
                        className="text-[#02665e] hover:underline font-medium whitespace-nowrap"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <button
                    onClick={verifyOtp}
                    disabled={loading || !agreed}
                    className="px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 box-border"
                  >
                    {loading ? 'Verifying...' : 'Continue'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Login Page
  const renderLoginPage = () => {
    return (
      <div className="w-full h-full flex flex-col bg-white relative overflow-hidden box-border">
        <div className="h-1 bg-[#02665e]" />
        
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
              <LogIn className="w-5 h-5 text-[#02665e]" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">Sign In</h1>
              <p className="text-xs text-slate-600 mt-0.5">Welcome back</p>
            </div>
            {loginSent && (
              <div className="px-2.5 py-1 rounded-md bg-slate-100 text-xs font-medium text-slate-700">
                Enter OTP
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50/50">
          <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-[#02665e] rounded-full transition-all duration-500 ${loginSent ? 'w-2/3' : 'w-1/3'}`} 
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-w-0">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1 min-w-0 break-words">{error}</span>
            </div>
          )}

          <div className={`space-y-4 transition-opacity duration-300 min-w-0 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {!loginSent ? (
              <>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('phone')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      loginMethod === 'phone'
                        ? 'bg-[#02665e] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Phone
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('credentials')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                      loginMethod === 'credentials'
                        ? 'bg-[#02665e] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Username
                  </button>
                </div>

                {loginMethod === 'phone' ? (
                  <>
                      <div className="space-y-2.5 min-w-0">
                        <label className="block text-sm font-semibold text-slate-900">Phone Number</label>
                        <div className="relative w-full">
                          <input
                            type="tel"
                            value={loginPhone}
                            onChange={(e) => setLoginPhone(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="712345678"
                            className="w-full max-w-full px-4 py-2.5 text-sm font-medium border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all duration-200 shadow-sm hover:shadow-md placeholder:text-slate-400 box-border"
                          />
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5">
                          <span className="w-1 h-1 bg-slate-400 rounded-full flex-shrink-0" />
                          <span>We&apos;ll send you a verification code</span>
                        </p>
                      </div>
                    <button
                      onClick={async () => {
                        setLoginLoading(true);
                        // Test mode - skip API call
                        // Call API to send login OTP
                        try {
                          const response = await api.post('/api/auth/send-otp', {
                            phone: loginPhone.trim(),
                          });
                          if (response.status === 200) {
                            setSuccess('OTP sent to your phone. Please check and enter the code.');
                            setLoginSent(true);
                          }
                        } catch (err: any) {
                          setError(err?.response?.data?.error || 'Failed to send OTP. Please try again.');
                        } finally {
                          setLoginLoading(false);
                        }
                      }}
                      disabled={loginLoading}
                      className="w-full px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loginLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-3 min-w-0">
                      <div className="space-y-2 min-w-0">
                        <label className="block text-sm font-semibold text-slate-900">Username</label>
                        <input
                          type="text"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value)}
                          placeholder="username"
                          className="w-full max-w-full px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] box-border"
                        />
                      </div>
                      <div className="space-y-2 min-w-0">
                        <label className="block text-sm font-semibold text-slate-900">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full max-w-full px-3 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] box-border"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none border-none bg-transparent p-0"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAuthMode('forgot')}
                          className="text-xs text-[#02665e] hover:underline flex items-center gap-1.5"
                        >
                          <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Forgot password?</span>
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        setLoginLoading(true);
                        await new Promise(r => setTimeout(r, 600));
                        setLoginLoading(false);
                        router.push('/');
                      }}
                      disabled={loginLoading}
                      className="w-full px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loginLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className="w-full text-sm text-slate-600 hover:text-slate-900 py-2 flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Don&apos;t have an account?</span>
                  <UserPlus className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <div className="space-y-2 min-w-0">
                  <label className="block text-sm font-semibold text-slate-900">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full max-w-full px-4 py-3 text-lg tracking-widest text-center font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] box-border"
                  />
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setLoginSent(false)}
                    className="flex-1 min-w-0 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors box-border"
                  >
                    Edit phone
                  </button>
                    <button
                      onClick={async () => {
                        setLoginLoading(true);
                        // Verify login OTP with API
                        try {
                          const response = await api.post('/api/auth/verify-otp', {
                            phone: loginPhone.trim(),
                            otp: loginOtp.trim(),
                          });
                          
                          if (response.status === 200) {
                            // Auth cookie is set httpOnly by the API; no localStorage token needed.
                            router.push('/');
                          }
                        } catch (err: any) {
                          setError(err?.response?.data?.error || 'Invalid OTP. Please try again.');
                      } finally {
                        setLoginLoading(false);
                      }
                      }}
                      disabled={loginLoading || !loginOtp}
                      className="flex-1 min-w-0 px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed box-border"
                    >
                      {loginLoading ? 'Verifying...' : 'Verify & Sign in'}
                    </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Email validation helper
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = (email: string) => {
    return email.trim().length > 0 && email.includes('@') && emailRe.test(email.trim());
  };

  // Forgot Password Helper Functions
  const sendForgotOtp = async () => {
    setError(null);
    if (!forgotPhone || forgotPhone.trim().length < 5) {
      setError('Please enter a valid phone number');
      return;
    }
    setForgotLoading(true);
    try {
      // Call API to send password reset OTP
      const response = await api.post('/api/auth/forgot-password', {
        phone: forgotPhone.trim(),
      });
      
      if (response.status === 200) {
        setSuccess('OTP sent to your phone. Please check and enter the code.');
        setForgotStep('otp');
        setForgotCountdown(300); // 5 minutes countdown
        setForgotLoading(false);
        setTimeout(() => {
          if (forgotOtpRef.current) {
            try { forgotOtpRef.current.focus(); } catch (e) {}
          }
        }, 200);
        return;
      }

      const resp = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `${forgotCountryCode}${forgotPhone}`, role: 'RESET' }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send OTP');
      }
      setSuccess('OTP sent. Please check your phone.');
      setForgotStep('otp');
      setForgotCountdown(60);
      const iv = setInterval(() => {
        setForgotCountdown(c => {
          if (c <= 1) {
            clearInterval(iv);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const verifyForgotOtp = async () => {
    setError(null);
    if (!forgotOtp || forgotOtp.trim().length < 3) {
      setError('Enter the OTP you received');
      return;
    }
    setForgotLoading(true);
    try {

      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `${forgotCountryCode}${forgotPhone}`, otp: forgotOtp, role: 'RESET' }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Invalid OTP');
      }
      const data = await resp.json();
      // The API returns a link with both token and id, or we can extract from the response
      if (data.link) {
        setForgotResetToken(data.resetToken || '');
        setForgotStep('sent');
        // Use the link from API which includes both token and id
        router.push(data.link);
      } else if (data.resetToken && data.user && data.user.id) {
        // Fallback: construct the link ourselves if API doesn't provide it
        router.push(`/account/reset-password?token=${data.resetToken}&id=${data.user.id}&method=otp`);
      } else {
        throw new Error('Failed to get reset token');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const sendForgotEmail = async () => {
    setError(null);
    if (!isValidEmail(forgotEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    setForgotLoading(true);
    try {
      const resp = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send reset email');
      }
      setForgotSent(true);
      setSuccess('Reset link sent. Please check your email.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password Page
  const renderForgotPasswordPage = () => {
    return (
      <div className="w-full flex flex-col bg-white relative overflow-hidden box-border">
        <div className="h-1 bg-[#02665e]" />
        
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setAuthMode('login');
                setForgotStep('input');
                setForgotMethod('email');
                setForgotEmail('');
                setForgotPhone('');
                setForgotOtp('');
                setForgotSent(false);
              }}
              className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900">Reset Password</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                {forgotMethod === 'email' ? 'Enter your email to reset' : 'Enter your phone to reset'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 min-w-0">
          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1 min-w-0 break-words">{error}</span>
            </div>
          )}

          {success && !error && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-sm text-emerald-800">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1 min-w-0 break-words">{success}</span>
            </div>
          )}

          {/* Method Selection */}
          {forgotStep === 'input' && !forgotSent && (
            <div className="mb-4 flex gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setForgotMethod('email')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                  forgotMethod === 'email'
                    ? 'bg-white text-[#02665e] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5 inline-block mr-1.5" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setForgotMethod('otp')}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
                  forgotMethod === 'otp'
                    ? 'bg-white text-[#02665e] shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5 inline-block mr-1.5" />
                OTP
              </button>
            </div>
          )}

          {forgotStep === 'sent' && forgotMethod === 'email' ? (
            <div className="space-y-3 min-w-0">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-center min-w-0">
                <Mail className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-emerald-900 mb-1">Check your email</h3>
                <p className="text-xs text-emerald-700 break-words">
                  We&apos;ve sent a password reset link to {forgotEmail}
                </p>
              </div>
              <button
                onClick={() => {
                  setForgotSent(false);
                  setForgotEmail('');
                  setForgotStep('input');
                }}
                className="w-full max-w-full px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors box-border"
              >
                Resend Email
              </button>
            </div>
          ) : forgotStep === 'otp' ? (
            <div className="space-y-3 min-w-0">
              <div className="space-y-2 min-w-0">
                <label className="block text-sm font-semibold text-slate-900">Enter OTP</label>
                <input
                  ref={forgotOtpRef}
                  type="text"
                  inputMode="numeric"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full max-w-full px-4 py-3 text-lg tracking-widest text-center font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] box-border"
                />
                <p className="text-xs text-slate-500 text-center">
                  OTP sent to {forgotCountryCode}{forgotPhone}
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setForgotStep('input');
                    setForgotOtp('');
                  }}
                  className="flex-1 min-w-0 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors box-border"
                >
                  Edit phone
                </button>
                <button
                  onClick={verifyForgotOtp}
                  disabled={forgotLoading || !forgotOtp || forgotOtp.length < 6}
                  className="flex-1 min-w-0 px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed box-border"
                >
                  {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
              {forgotCountdown > 0 && (
                <button
                  type="button"
                  disabled={true}
                  className="w-full text-xs text-slate-500 py-1"
                >
                  Resend OTP in {forgotCountdown}s
                </button>
              )}
              {forgotCountdown === 0 && forgotStep === 'otp' && (
                <button
                  type="button"
                  onClick={sendForgotOtp}
                  className="w-full text-xs text-[#02665e] hover:underline py-1"
                >
                  Resend OTP
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 min-w-0">
              {forgotMethod === 'email' ? (
                <>
                  <div className="space-y-2 min-w-0">
                    <label className="block text-sm font-semibold text-slate-900">Email Address</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setError(null); // Clear error on input change
                      }}
                      placeholder="your@email.com"
                      className={`w-full max-w-full px-3 py-2.5 text-sm border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 box-border transition-all ${
                        forgotEmail && !isValidEmail(forgotEmail)
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-slate-300 focus:border-[#02665e]'
                      }`}
                    />
                    {forgotEmail && !isValidEmail(forgotEmail) && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Please enter a valid email address
                      </p>
                    )}
                  </div>
                  <button
                    onClick={sendForgotEmail}
                    disabled={forgotLoading || !isValidEmail(forgotEmail)}
                    className={`w-full max-w-full px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors box-border ${
                      forgotLoading || !isValidEmail(forgotEmail)
                        ? 'bg-slate-300 cursor-not-allowed opacity-50'
                        : 'bg-[#02665e] hover:bg-[#014e47]'
                    }`}
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-2 min-w-0">
                    <label className="block text-sm font-semibold text-slate-900">Phone Number</label>
                    <div className="flex gap-2 min-w-0">
                      <select
                        value={forgotCountryCode}
                        onChange={(e) => setForgotCountryCode(e.target.value)}
                        className="px-3 py-2.5 text-sm border border-slate-300 rounded-lg bg-gradient-to-b from-slate-50 to-slate-100 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] country-code-select flex-shrink-0"
                      >
                        <option value="+255">+255</option>
                        <option value="+256">+256</option>
                        <option value="+254">+254</option>
                        <option value="+250">+250</option>
                        <option value="+251">+251</option>
                      </select>
                      <input
                        type="tel"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="7XX XXX XXX"
                        className="flex-1 min-w-0 px-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] box-border"
                      />
                    </div>
                  </div>
                  <button
                    onClick={sendForgotOtp}
                    disabled={forgotLoading || !forgotPhone || forgotPhone.length < 5}
                    className="w-full max-w-full px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed box-border"
                  >
                    {forgotLoading ? 'Sending...' : 'Send OTP'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setForgotStep('input');
                  setForgotMethod('email');
                  setForgotEmail('');
                  setForgotPhone('');
                  setForgotOtp('');
                  setForgotSent(false);
                }}
                className="w-full max-w-full text-sm text-slate-600 hover:text-slate-900 py-2 flex items-center justify-center gap-2 transition-colors box-border"
              >
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                <span>Back to Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="w-full flex items-center justify-center">
        <AuthPageFlip
          currentPage={getCurrentPage()}
          onPageChange={handlePageChange}
          width={440}
          height={640}
        >
          {renderRegisterPage()}
          {renderLoginPage()}
          {renderForgotPasswordPage()}
        </AuthPageFlip>
      </div>
    </main>
  );
}
