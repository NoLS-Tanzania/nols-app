"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Icons from 'lucide-react';
import { User, Mail, UserCircle, Globe, CreditCard, FileText, Upload, CheckCircle2, Truck, MapPin, Phone, ChevronDown, AlertCircle, ChevronLeft, ChevronRight, Loader2, Car, X, Clock, Building2, UserCircle2, ArrowLeft } from 'lucide-react';

export default function OnboardRole({ params }: { params: { role: string } }) {
  const role = (params.role || '').toLowerCase();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Get referral code from URL
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const referralCode = searchParams?.get('ref') || null;
  // driver fields
  
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  // new driver onboarding fields
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('Tanzanian');
  const [nin, setNin] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<string>(''); // single pick: Bajaji, Bodaboda, Vehicle
  const [operationArea, setOperationArea] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  // OTP verification state for payment phone
  const [paymentOtp, setPaymentOtp] = useState('');
  const [paymentSent, setPaymentSent] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [paymentCountdown, setPaymentCountdown] = useState<number>(0);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [vehicleRegFile, setVehicleRegFile] = useState<File | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(1); // 1..4 for driver onboarding steps
  // owner fields removed: owner uses existing owner dashboard for property creation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const IdIcon: any = (props: any) => (
    <svg suppressHydrationWarning viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M16 8v6" />
      <path d="M13 14h6" />
    </svg>
  );

  const title = role === 'driver' ? 'Welcome, Driver' : role === 'owner' ? 'Welcome, Property Owner' : 'Welcome, Traveller';
  const help = role === 'driver'
    ? 'Please provide driver details, vehicle information, and verification documents.'
    : role === 'owner'
      ? 'Add your property details, rates, and availability to start receiving bookings.'
      : 'Update your profile and start searching for stays.';

  const submitProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);
    // Basic validation: require name/email at minimum
    if (!name || !email) {
      setError('Please provide both name and email');
      return;
    }
    // Additional driver required fields validation
    if (role === 'driver') {
      if (!licenseNumber.trim() || !vehicleType.trim() || !plateNumber.trim() || !paymentPhone.trim()) {
        setError('Please complete all required driver fields before submitting');
        return;
      }
    }
    setLoading(true);
    try {
      // Build FormData to include files and all driver fields
      const fd = new FormData();
      fd.append('role', role);
      fd.append('name', name);
      fd.append('email', email);
      if (referralCode) {
        fd.append('referralCode', referralCode);
      }
      if (role === 'driver') {
      fd.append('gender', gender || '');
      fd.append('nationality', nationality || '');
      fd.append('nin', nin || '');
      fd.append('licenseNumber', licenseNumber || '');
      fd.append('plateNumber', plateNumber || '');
      fd.append('vehicleType', vehicleType || '');
      fd.append('operationArea', operationArea || '');
      fd.append('paymentPhone', paymentPhone || '');
      fd.append('paymentVerified', paymentVerified ? '1' : '0');
        if (licenseFile) fd.append('licenseFile', licenseFile, licenseFile.name);
        if (idFile) fd.append('idFile', idFile, idFile.name);
        if (vehicleRegFile) fd.append('vehicleRegFile', vehicleRegFile, vehicleRegFile.name);
      }

      const resp = await fetch('/api/auth/profile', { method: 'POST', body: fd });
      if (!resp.ok) {
        const data: any = await resp.json().catch(() => ({}));
        if (data?.error === 'role_mismatch') {
          throw new Error(
            data?.message ||
              `You're signed in with a different account role and can't complete onboarding for “${role}”. Please sign in with the correct role account.`
          );
        }
        throw new Error(data?.message || data?.error || 'Failed to save profile');
      }
      setSuccess('Profile saved');
      // navigate to role dashboard or public account area
      setTimeout(() => {
        if (role === 'driver') router.push('/driver');
        else if (role === 'owner') router.push('/owner');
        else router.push('/account');
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // small transition on step change
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, [stepIndex]);

  // Basic per-step validation to gate advancing
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isStepValid = () => {
    if (role !== 'driver') return true;
    switch (stepIndex) {
      case 1:
        return name.trim().length > 0 && emailRe.test(email.trim());
      case 2:
        return licenseNumber.trim().length > 0 && vehicleType.trim().length > 0 && plateNumber.trim().length > 0;
      case 3:
        // require the payment phone to have been OTP-verified
        return paymentVerified === true;
      default:
        return true;
    }
  };

  // Comprehensive validation for all required driver steps before submission
  const isAllDriverStepsValid = () => {
    if (role !== 'driver') return true;
    
    // Step 1: Personal Details
    const step1Valid = name.trim().length > 0 && emailRe.test(email.trim());
    
    // Step 2: Driving Details
    const step2Valid = licenseNumber.trim().length > 0 && 
                       vehicleType.trim().length > 0 && 
                       plateNumber.trim().length > 0;
    
    // Step 3: Payment Details
    const step3Valid = paymentPhone.trim().length > 0 && paymentVerified === true;
    
    // Step 4: Uploads (driving license and national ID are required)
    const step4Valid = licenseFile !== null && idFile !== null;
    
    return step1Valid && step2Valid && step3Valid && step4Valid;
  };

  // Per-field touched/errors to show inline messages
  const [touched, setTouched] = useState<Record<string, boolean>>({
    name: false,
    email: false,
    licenseNumber: false,
    vehicleType: false,
    plateNumber: false,
    paymentPhone: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Refs to focus the first invalid input when progressing
  const nameRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const licenseRef = useRef<HTMLInputElement | null>(null);
  const vehicleTypeRef = useRef<HTMLDivElement | null>(null);
  const plateRef = useRef<HTMLInputElement | null>(null);
  const paymentRef = useRef<HTMLInputElement | null>(null);
  const paymentOtpRef = useRef<HTMLInputElement | null>(null);

  const validateField = (field: string) => {
    switch (field) {
      case 'name':
        return name.trim() ? '' : 'Full name is required';
      case 'email':
        return email.trim() ? (emailRe.test(email.trim()) ? '' : 'Enter a valid email') : 'Email is required';
      case 'licenseNumber':
        return licenseNumber.trim() ? '' : 'License number is required';
      case 'vehicleType':
        return vehicleType.trim() ? '' : 'Select a vehicle type';
      case 'plateNumber':
        return plateNumber.trim() ? '' : 'Plate number is required';
      case 'paymentPhone':
        return paymentPhone.trim() ? '' : 'Payment phone is required';
      default:
        return '';
    }
  };

  // validateStepFields replaced by inline validation in handleNext (keeps single-source focus behavior)

  const maxSteps = role === 'driver' ? 5 : 2; // Traveller and owner have 2 steps

  const handleNext = () => {
    if (isStepValid()) {
      setStepIndex(i => Math.min(maxSteps, i + 1));
      return;
    }

    // Validate fields for the current step and focus the first invalid one
    if (stepIndex === 1) {
      const nameErr = validateField('name');
      const emailErr = validateField('email');
      setTouched(prev => ({ ...prev, name: true, email: true }));
      setFieldErrors(prev => ({ ...prev, name: nameErr, email: emailErr }));
      if (nameErr) { nameRef.current?.focus(); return; }
      if (emailErr) { emailRef.current?.focus(); return; }
    }

    if (stepIndex === 2) {
      const licErr = validateField('licenseNumber');
      const vehErr = validateField('vehicleType');
      const plateErr = validateField('plateNumber');
      setTouched(prev => ({ ...prev, licenseNumber: true, vehicleType: true, plateNumber: true }));
      setFieldErrors(prev => ({ ...prev, licenseNumber: licErr, vehicleType: vehErr, plateNumber: plateErr }));
      if (licErr) { licenseRef.current?.focus(); return; }
      if (vehErr) { vehicleTypeRef.current?.focus(); return; }
      if (plateErr) { plateRef.current?.focus(); return; }
    }

    if (stepIndex === 3) {
      // If payment phone is not yet verified, prompt user to verify
      if (!paymentVerified) {
        const payErr = validateField('paymentPhone');
        setTouched(prev => ({ ...prev, paymentPhone: true }));
        setFieldErrors(prev => ({ ...prev, paymentPhone: payErr }));
        if (payErr) { paymentRef.current?.focus(); return; }
        // otherwise, focus the OTP input or send button so user can verify
        if (paymentSent) { paymentOtpRef.current?.focus(); } else { paymentRef.current?.focus(); }
        return;
      }
    }
  };

  const sendPaymentOtp = async () => {
    setPaymentMessage(null);
    if (!paymentPhone || paymentPhone.trim().length < 5) {
      setFieldErrors(prev => ({ ...prev, paymentPhone: 'Please enter a valid phone number' }));
      setTouched(prev => ({ ...prev, paymentPhone: true }));
      paymentRef.current?.focus();
      return;
    }
    
    setPaymentLoading(true);
    try {
      // Call API to send payment verification OTP
      const resp = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: paymentPhone, role: 'driver' }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send OTP');
      }
      setPaymentSent(true);
      setPaymentMessage('OTP sent. Enter the code you received.');
      setPaymentCountdown(60);
      const iv = setInterval(() => {
        setPaymentCountdown(c => {
          if (c <= 1) { clearInterval(iv); return 0; }
          return c - 1;
        });
      }, 1000);
      // focus OTP input shortly
      setTimeout(() => paymentOtpRef.current?.focus(), 200);
    } catch (err: any) {
      setPaymentMessage(err?.message || 'Failed to send OTP');
    } finally {
      setPaymentLoading(false);
    }
  };

  const verifyPaymentOtp = async () => {
    setPaymentMessage(null);
    if (!paymentOtp || paymentOtp.trim().length < 3) {
      setPaymentMessage('Enter the OTP you received');
      paymentOtpRef.current?.focus();
      return;
    }
    
    setPaymentLoading(true);
    try {
      // Verify payment OTP with API
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: paymentPhone, otp: paymentOtp, role: 'driver' }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'OTP verification failed');
      }
      setPaymentVerified(true);
      // don't show textual 'verified' message; the icon indicates verification
      setPaymentMessage(null);
    } catch (err: any) {
      setPaymentMessage(err?.message || 'OTP verification failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  const resendPaymentOtp = async () => {
    if (paymentCountdown > 0) return;
    await sendPaymentOtp();
  };

  

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50 py-6 px-4">
      <div className={`${role !== 'driver' ? 'max-w-md' : 'max-w-4xl'} w-full bg-white rounded-xl shadow-lg overflow-hidden border border-slate-100`}>
        {/* Modern Header */}
        <div className={`relative bg-gradient-to-r from-[#02665e] to-[#014e47] ${role !== 'driver' ? 'px-4 py-3' : 'px-6 py-5'}`}>
          <div className="flex flex-col items-center text-center gap-1.5">
            <div className={`${role !== 'driver' ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center`}>
              {role === 'driver' ? (
                <Truck className="w-6 h-6 text-white" />
              ) : role === 'owner' ? (
                <Building2 className="w-5 h-5 text-white" />
              ) : (
                <UserCircle2 className="w-5 h-5 text-white" />
              )}
            </div>
            <h1 className={`${role !== 'driver' ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'} font-bold text-white`}>{title}</h1>
            <p className={`${role !== 'driver' ? 'text-xs' : 'text-xs sm:text-sm'} text-white/90 ${role !== 'driver' ? 'max-w-xs' : 'max-w-2xl'} mx-auto`}>{help}</p>
            </div>

          {/* Modern Step Indicator */}
          <div className={`${role !== 'driver' ? 'mt-3' : 'mt-5'} w-full`}>
            <div className="w-full overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2">
              <nav className={`${role !== 'driver' ? 'flex items-center justify-center' : 'min-w-max flex items-center'} gap-4 sm:justify-center`}>
                {(role === 'driver' ? [
                  { num: 1, label: 'Personal', icon: User },
                  { num: 2, label: 'Driving', icon: Truck },
                  { num: 3, label: 'Payment', icon: CreditCard },
                  { num: 4, label: 'Uploads', icon: Upload },
                  { num: 5, label: 'Review', icon: CheckCircle2 }
                ] : [
                  { num: 1, label: 'Personal', icon: User },
                  { num: 2, label: 'Review', icon: CheckCircle2 }
                ]).map((step, i) => {
                  const Icon = step.icon;
                  const isActive = stepIndex === step.num;
                  const isCompleted = stepIndex > step.num;
                  return (
                    <div key={step.num} className="snap-center flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setStepIndex(step.num)}
                        className={`group flex flex-col items-center gap-2 transition-all duration-300 ${
                          isActive ? 'scale-110' : 'hover:scale-105'
                        }`}
                        aria-current={isActive ? 'step' : undefined}
                        aria-label={`Step ${step.num}: ${step.label}`}
                      >
                        {role !== 'driver' ? (
                          // For travellers/owners: show icon instead of number
                          <div className={`relative flex items-center justify-center ${role !== 'driver' ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg text-xs font-semibold transition-all duration-300 ${
                            isActive 
                              ? 'bg-white text-[#02665e] shadow-lg ring-2 ring-white/30' 
                              : isCompleted
                              ? 'bg-white text-[#02665e] shadow-md'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className={`${role !== 'driver' ? 'w-5 h-5' : 'w-4 h-4'} text-[#02665e]`} />
                            ) : (
                              <Icon className={`${role !== 'driver' ? 'w-5 h-5' : 'w-4 h-4'} ${isActive ? 'text-[#02665e]' : 'text-white/70'}`} />
                            )}
                          </div>
                        ) : (
                          // For drivers: keep numbers
                          <div className={`relative flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold transition-all duration-300 ${
                            isActive 
                              ? 'bg-white text-[#02665e] shadow-lg ring-2 ring-white/30' 
                              : isCompleted
                              ? 'bg-white text-[#02665e] shadow-md'
                              : 'bg-white/10 text-white/70 hover:bg-white/20'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle2 className="w-4 h-4 text-[#02665e]" />
                            ) : (
                              <span className={isActive ? 'text-[#02665e]' : 'text-white/70'}>{step.num}</span>
                            )}
                          </div>
                        )}
                        <span className={`text-[9px] sm:text-[10px] font-medium transition-colors ${
                          isActive 
                            ? 'text-white' 
                            : isCompleted
                            ? 'text-[#02665e] font-semibold'
                            : 'text-white/80'
                        }`}>
                          {step.label}
                        </span>
                      </button>
                      {i < (role === 'driver' ? 4 : 1) && (
                        <div className={`w-6 sm:w-10 h-0.5 rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-white' : 'bg-white/30'
                        }`} />
                      )}
                    </div>
                  );
                })}
                  </nav>
            </div>
          </div>
        </div>

        <div className={role !== 'driver' ? 'p-4' : 'p-6'}>
          {error && !(error === 'Please provide both name and email' && role === 'driver' && stepIndex !== 5) && (
            <div className={`mb-4 ${role !== 'driver' ? 'p-2.5' : 'p-3'} bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-2`}>
              <AlertCircle className={`${role !== 'driver' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-red-500 flex-shrink-0 mt-0.5`} />
              <p className={`${role !== 'driver' ? 'text-xs' : 'text-sm'} text-red-700 flex-1`}>{error}</p>
            </div>
          )}
          {success && (
            <div className={`mb-4 ${role !== 'driver' ? 'p-2.5' : 'p-3'} bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg flex items-start gap-2`}>
              <CheckCircle2 className={`${role !== 'driver' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-emerald-500 flex-shrink-0 mt-0.5`} />
              <p className={`${role !== 'driver' ? 'text-xs' : 'text-sm'} text-emerald-700 flex-1`}>{success}</p>
            </div>
          )}

          {/* Content area */}
          {role !== 'driver' ? (
            <form onSubmit={submitProfile} className={role !== 'driver' ? 'space-y-4' : 'space-y-6'}>
              {/* Step contents for traveller/owner */}
              {stepIndex === 1 && (
                <div className={`space-y-4 rounded-xl p-5 border-2 border-slate-100 bg-gradient-to-br from-white to-slate-50/50 shadow-sm transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-[#02665e]" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Personal Details</h3>
                  </div>

                  <div className="space-y-4">
              <div>
                      <label className={`block ${role !== 'driver' ? 'text-xs' : 'text-sm'} font-semibold text-slate-900 ${role !== 'driver' ? 'mb-1' : 'mb-1.5'} flex items-center gap-2`}>
                        <User className={`${role !== 'driver' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-slate-500`} />
                        Full name
                        <span className="text-red-500">*</span>
                      </label>
                      <input 
                        ref={nameRef} 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        onBlur={() => { setTouched(prev => ({ ...prev, name: true })); setFieldErrors(prev => ({ ...prev, name: validateField('name') })); }} 
                        className={`w-full ${role !== 'driver' ? 'px-3 py-2 text-xs' : 'px-3 py-2.5 text-sm'} border-2 rounded-lg transition-all duration-200 ${
                          touched.name && fieldErrors.name
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-slate-200 focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10'
                        } bg-white shadow-sm hover:shadow-md focus:outline-none`}
                        placeholder="Your full name"
                      />
                      {touched.name && fieldErrors.name && (
                        <div className={`${role !== 'driver' ? 'text-[10px] mt-1' : 'text-xs mt-1.5'} text-red-600 flex items-center gap-1`}>
                          <AlertCircle className={`${role !== 'driver' ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                          {fieldErrors.name}
                        </div>
                      )}
              </div>

              <div>
                      <label className={`block ${role !== 'driver' ? 'text-xs' : 'text-sm'} font-semibold text-slate-900 ${role !== 'driver' ? 'mb-1' : 'mb-1.5'} flex items-center gap-2`}>
                        <Mail className={`${role !== 'driver' ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-slate-500`} />
                        Email
                        <span className="text-red-500">*</span>
                      </label>
                      <input 
                        ref={emailRef} 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        onBlur={() => { setTouched(prev => ({ ...prev, email: true })); setFieldErrors(prev => ({ ...prev, email: validateField('email') })); }} 
                        className={`w-full ${role !== 'driver' ? 'px-3 py-2 text-xs' : 'px-3 py-2.5 text-sm'} border-2 rounded-lg transition-all duration-200 ${
                          touched.email && fieldErrors.email
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                            : 'border-slate-200 focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10'
                        } bg-white shadow-sm hover:shadow-md focus:outline-none`}
                        placeholder="you@example.com"
                      />
                      {touched.email && fieldErrors.email && (
                        <div className={`${role !== 'driver' ? 'text-[10px] mt-1' : 'text-xs mt-1.5'} text-red-600 flex items-center gap-1`}>
                          <AlertCircle className={`${role !== 'driver' ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                          {fieldErrors.email}
              </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {stepIndex === 2 && (
                <div className={`${role !== 'driver' ? 'space-y-3 rounded-lg p-4' : 'space-y-4 rounded-xl p-5'} border-2 border-slate-100 bg-gradient-to-br from-white to-slate-50/50 shadow-sm transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <div className={`flex items-center gap-2 ${role !== 'driver' ? 'pb-2' : 'pb-3'} border-b border-slate-200`}>
                    <div className={`${role !== 'driver' ? 'w-7 h-7' : 'w-8 h-8'} rounded-lg bg-[#02665e]/10 flex items-center justify-center`}>
                      <CheckCircle2 className={`${role !== 'driver' ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-[#02665e]`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`${role !== 'driver' ? 'text-base' : 'text-lg'} font-bold text-slate-900`}>Review your details</h3>
                      <p className={`${role !== 'driver' ? 'text-[10px]' : 'text-xs'} text-slate-600 mt-0.5`}>Please confirm the information below before submitting your profile.</p>
                    </div>
                  </div>

                  <div className={role !== 'driver' ? 'space-y-3' : 'space-y-4'}>
                    <div className={role !== 'driver' ? 'space-y-2' : 'space-y-3'}>
                      <div className={`flex items-center gap-2 ${role !== 'driver' ? 'pb-1.5' : 'pb-2'} border-b border-slate-400`}>
                        <h4 className={`${role !== 'driver' ? 'text-xs' : 'text-sm'} font-semibold text-slate-700`}>Personal Details</h4>
                      </div>
                      <div className={`grid grid-cols-1 ${role !== 'driver' ? '' : 'md:grid-cols-2'} ${role !== 'driver' ? 'gap-2' : 'gap-3'}`}>
                        <div className={`${role !== 'driver' ? 'p-2.5' : 'p-3'} bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors`}>
                          <div className={`flex items-center justify-between ${role !== 'driver' ? 'mb-1.5' : 'mb-2'}`}>
                            <label className={`${role !== 'driver' ? 'text-[10px]' : 'text-xs'} font-semibold text-slate-700 flex items-center gap-1.5`}>
                              <User className={`${role !== 'driver' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-slate-400`} />
                              Full name
                              <span className="text-red-500">*</span>
                            </label>
                            <button type="button" onClick={() => setStepIndex(1)} className={`${role !== 'driver' ? 'text-[10px]' : 'text-xs'} text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium`}>Edit</button>
                          </div>
                          <div className={`${role !== 'driver' ? 'text-xs' : 'text-sm'} text-slate-900 font-medium`}>{name || <span className="text-slate-400 italic">Not provided</span>}</div>
                          {touched.name && fieldErrors.name && (
                            <div className={`${role !== 'driver' ? 'text-[10px] mt-0.5' : 'text-xs mt-1'} text-red-600 flex items-center gap-1`}>
                              <AlertCircle className={`${role !== 'driver' ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                              {fieldErrors.name}
                            </div>
                          )}
                        </div>

                        <div className={`${role !== 'driver' ? 'p-2.5' : 'p-3'} bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors`}>
                          <div className={`flex items-center justify-between ${role !== 'driver' ? 'mb-1.5' : 'mb-2'}`}>
                            <label className={`${role !== 'driver' ? 'text-[10px]' : 'text-xs'} font-semibold text-slate-700 flex items-center gap-1.5`}>
                              <Mail className={`${role !== 'driver' ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-slate-400`} />
                              Email
                              <span className="text-red-500">*</span>
                            </label>
                            <button type="button" onClick={() => setStepIndex(1)} className={`${role !== 'driver' ? 'text-[10px]' : 'text-xs'} text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium`}>Edit</button>
                          </div>
                          <div className={`${role !== 'driver' ? 'text-xs' : 'text-sm'} text-slate-900 font-medium`}>{email || <span className="text-slate-400 italic">Not provided</span>}</div>
                          {touched.email && fieldErrors.email && (
                            <div className={`${role !== 'driver' ? 'text-[10px] mt-0.5' : 'text-xs mt-1'} text-red-600 flex items-center gap-1`}>
                              <AlertCircle className={`${role !== 'driver' ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                              {fieldErrors.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className={`flex items-center justify-between ${role !== 'driver' ? 'pt-3' : 'pt-4'} border-t border-slate-200`}>
                <div className="flex items-center gap-2">
                  {stepIndex > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setStepIndex(i => Math.max(1, i-1))} 
                      className={`${role !== 'driver' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'} border-2 border-slate-300 rounded-lg bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 shadow-sm hover:shadow-md`}
                    >
                      <span className="flex items-center gap-1.5">
                        <ChevronLeft className={`${role !== 'driver' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                        Back
                      </span>
                    </button>
                  )}
                  <Link 
                    href="/public" 
                    className={`flex items-center gap-2 ${role !== 'driver' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'} text-slate-600 hover:text-[#02665e] hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium group no-underline`}
                  >
                    <ArrowLeft className={`${role !== 'driver' ? 'w-3.5 h-3.5' : 'w-4 h-4'} group-hover:-translate-x-0.5 transition-transform`} />
                    <span>Return to public site</span>
                  </Link>
                </div>
                <div className="flex items-center gap-2">
                  {stepIndex < 2 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!isStepValid()}
                      className={`${role !== 'driver' ? 'px-4 py-2 text-xs' : 'px-6 py-2.5 text-sm'} rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 ${
                        isStepValid() 
                          ? 'bg-[#02665e] hover:bg-[#014e47] text-white' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        Next
                        <ChevronRight className={`${role !== 'driver' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                      </span>
                    </button>
                  ) : (
                    <button 
                      type="submit" 
                      disabled={loading || (role !== 'driver' && (!name.trim() || !emailRe.test(email.trim())))} 
                      className={`${role !== 'driver' ? 'px-4 py-2 text-xs' : 'px-6 py-2.5 text-sm'} rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:hover:shadow-md ${
                        loading || (role !== 'driver' && (!name.trim() || !emailRe.test(email.trim())))
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-[#02665e] hover:bg-[#014e47] text-white'
                      }`}
                    >
                      {loading ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className={`${role !== 'driver' ? 'w-3 h-3' : 'w-3.5 h-3.5'} animate-spin`} />
                          Saving...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className={`${role !== 'driver' ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
                          Save and continue
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={submitProfile} className="space-y-6">
              {/* Step contents with small animation */}
              {stepIndex === 1 && (
                <div className={`space-y-4 rounded-xl p-5 border-2 border-slate-100 bg-gradient-to-br from-white to-slate-50/50 shadow-sm transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-[#02665e]" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Personal Details</h3>
                  </div>

                  <div className="space-y-4">
                  <div>
                      <label className="text-sm font-semibold text-slate-900 mb-1.5 flex items-center gap-2">
                        <UserCircle className="w-3.5 h-3.5 text-slate-500" />
                        Full name
                        <span className="text-red-500">*</span>
                      </label>
                      <input 
                        ref={nameRef} 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        onBlur={() => { setTouched(prev => ({ ...prev, name: true })); setFieldErrors(prev => ({ ...prev, name: validateField('name') })); }} 
                        className={`w-full px-3 py-2.5 border-2 rounded-lg transition-all duration-200 ${
                          touched.name && fieldErrors.name 
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' 
                            : 'border-slate-200 focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10'
                        } bg-white shadow-sm hover:shadow-md text-sm`}
                        placeholder="Enter your full name"
                      />
                      {touched.name && fieldErrors.name && (
                        <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {fieldErrors.name}
                  </div>
                      )}
                    </div>

                  <div>
                      <label className="text-sm font-semibold text-slate-900 mb-1.5 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        Email
                        <span className="text-red-500">*</span>
                      </label>
                      <input 
                        ref={emailRef} 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        onBlur={() => { setTouched(prev => ({ ...prev, email: true })); setFieldErrors(prev => ({ ...prev, email: validateField('email') })); }} 
                        className={`w-full px-3 py-2.5 border-2 rounded-lg transition-all duration-200 ${
                          touched.email && fieldErrors.email 
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' 
                            : 'border-slate-200 focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10'
                        } bg-white shadow-sm hover:shadow-md text-sm`}
                        placeholder="you@example.com"
                      />
                      {touched.email && fieldErrors.email && (
                        <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {fieldErrors.email}
                        </div>
                      )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                        <label htmlFor="gender-select" className="block text-sm font-semibold text-slate-900 mb-1.5">
                          Gender
                        </label>
                        <div className="relative">
                          <select 
                            id="gender-select" 
                            value={gender} 
                            onChange={e => setGender(e.target.value)} 
                            className="onboard-select w-full px-3 pr-10 py-2.5 border-2 border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-md focus:outline-none focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10 transition-all duration-200 cursor-pointer text-sm"
                          >
                            <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="nationality-select" className="text-sm font-semibold text-slate-900 mb-1.5 flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-slate-500" />
                          Nationality
                        </label>
                        <div className="relative">
                          <select 
                            id="nationality-select" 
                            value={nationality} 
                            onChange={e => setNationality(e.target.value)} 
                            className="onboard-select w-full px-3 pr-10 py-2.5 border-2 border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-md focus:outline-none focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10 transition-all duration-200 cursor-pointer text-sm"
                          >
                        <option value="Tanzanian">Tanzanian</option>
                        <option value="Kenyan">Kenyan</option>
                        <option value="Ugandan">Ugandan</option>
                        <option value="Rwandese">Rwandese</option>
                        <option value="Burundian">Burundian</option>
                        <option value="Other">Other</option>
                      </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                          NIN <span className="text-slate-500 font-normal">(optional)</span>
                        </label>
                        <input 
                          value={nin} 
                          onChange={e => setNin(e.target.value)} 
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-md focus:outline-none focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10 transition-all duration-200 text-sm" 
                          placeholder="National ID number"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {stepIndex === 2 && (
                <div className={`space-y-4 rounded-xl p-5 border-2 border-slate-100 bg-gradient-to-br from-white to-slate-50/50 shadow-sm transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                      <Truck className="w-4 h-4 text-[#02665e]" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Driving Details</h3>
                  </div>

                  <div className="space-y-4">
                  <div>
                      <label className="text-sm font-semibold text-slate-900 mb-1.5 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        License number
                        <span className="text-red-500">*</span>
                      </label>
                      <input 
                        ref={licenseRef} 
                        value={licenseNumber} 
                        onChange={e => setLicenseNumber(e.target.value)} 
                        onBlur={() => { setTouched(prev => ({ ...prev, licenseNumber: true })); setFieldErrors(prev => ({ ...prev, licenseNumber: validateField('licenseNumber') })); }} 
                        className={`w-full px-3 py-2.5 border-2 rounded-lg transition-all duration-200 text-sm ${
                          touched.licenseNumber && fieldErrors.licenseNumber 
                            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' 
                            : 'border-slate-200 focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10'
                        } bg-white shadow-sm hover:shadow-md`}
                        placeholder="e.g., DL-12345"
                      />
                      {touched.licenseNumber && fieldErrors.licenseNumber && (
                        <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {fieldErrors.licenseNumber}
                        </div>
                      )}
                  </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        Type of vehicle
                        <span className="text-red-500">*</span>
                      </label>
                      <div ref={vehicleTypeRef} tabIndex={-1} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {[
                          { label: 'Bajaji', icon: Car },
                          { label: 'Bodaboda', icon: Icons.Bike },
                          { label: 'Vehicle', icon: Truck }
                        ].map(({ label, icon: Icon }) => (
                          <label 
                            key={label} 
                            className={`group relative flex items-center justify-center gap-2 px-4 py-3 rounded-lg cursor-pointer border-2 transition-all duration-200 ${
                              vehicleType === label 
                                ? 'bg-[#02665e] text-white border-[#02665e] shadow-md scale-105' 
                                : 'bg-white text-slate-700 border-slate-200 hover:border-[#02665e]/50 hover:shadow-md'
                            }`}
                          >
                            <input 
                              type="radio" 
                              name="vehicleType" 
                              checked={vehicleType === label} 
                              onChange={() => { setVehicleType(label); setTouched(prev => ({ ...prev, vehicleType: true })); setFieldErrors(prev => ({ ...prev, vehicleType: validateField('vehicleType') })); }} 
                              className="sr-only" 
                            />
                            <Icon className={`w-4 h-4 ${vehicleType === label ? 'text-white' : 'text-slate-400'}`} />
                            <span className="font-medium text-xs sm:text-sm">{label}</span>
                        </label>
                      ))}
                    </div>
                      {touched.vehicleType && fieldErrors.vehicleType && (
                        <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {fieldErrors.vehicleType}
                        </div>
                      )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm font-semibold text-slate-900 mb-1.5 flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          Plate number
                          <span className="text-red-500">*</span>
                        </label>
                        <input 
                          ref={plateRef} 
                          value={plateNumber} 
                          onChange={e => setPlateNumber(e.target.value)} 
                          onBlur={() => { setTouched(prev => ({ ...prev, plateNumber: true })); setFieldErrors(prev => ({ ...prev, plateNumber: validateField('plateNumber') })); }} 
                          className={`w-full px-3 py-2.5 border-2 rounded-lg transition-all duration-200 text-sm ${
                            touched.plateNumber && fieldErrors.plateNumber 
                              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100' 
                              : 'border-slate-200 focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10'
                          } bg-white shadow-sm hover:shadow-md`}
                          placeholder="Plate number"
                        />
                        {touched.plateNumber && fieldErrors.plateNumber && (
                          <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.plateNumber}
                          </div>
                        )}
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-900 mb-1.5 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          Operation / Parking area
                        </label>
                        <input 
                          value={operationArea} 
                          onChange={e => setOperationArea(e.target.value)} 
                          className="w-full px-3 py-2.5 border-2 border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-md focus:outline-none focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10 transition-all duration-200 text-sm" 
                          placeholder="e.g., Dar es Salaam - Ilala"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {stepIndex === 3 && (
                <div className={`space-y-4 rounded-xl p-5 border-2 border-slate-100 bg-gradient-to-br from-white to-slate-50/50 shadow-sm transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-[#02665e]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900">Payment Details</h3>
                      <p className="text-xs text-slate-600 mt-0.5">Provide a phone number used to receive payments (any supported mobile-money provider).</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                  <div>
                      <label className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        Payment phone
                        <span className="text-red-500">*</span>
                      </label>
                      <div className="relative min-w-0">
                        <div className="flex gap-2 items-stretch min-w-0">
                          <div className="relative flex-1 min-w-0">
                            <input 
                              ref={paymentRef} 
                              value={paymentPhone} 
                              onChange={e => { setPaymentPhone(e.target.value); if (!paymentVerified) setPaymentVerified(false); }} 
                              onBlur={() => { setTouched(prev => ({ ...prev, paymentPhone: true })); setFieldErrors(prev => ({ ...prev, paymentPhone: validateField('paymentPhone') })); }} 
                              readOnly={paymentVerified} 
                              aria-readonly={paymentVerified} 
                              className={`w-full max-w-full px-3 py-2.5 text-sm border-2 rounded-lg transition-all duration-200 box-border ${
                                paymentVerified 
                                  ? 'bg-slate-50 text-slate-700 border-slate-200 pr-10' 
                                  : touched.paymentPhone && fieldErrors.paymentPhone
                                  ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                                  : 'border-slate-200 focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10'
                              } bg-white shadow-sm hover:shadow-md focus:outline-none`}
                              placeholder="e.g., +255712345678"
                            />
                            {paymentVerified && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex-shrink-0">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              </div>
                            )}
                          </div>
                        {!paymentVerified && (
                            <button 
                              type="button" 
                              onClick={sendPaymentOtp} 
                              disabled={paymentLoading || !paymentPhone.trim()} 
                              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 flex-shrink-0 whitespace-nowrap ${
                                paymentSent 
                                  ? 'bg-slate-100 text-slate-700 cursor-not-allowed' 
                                  : paymentLoading || !paymentPhone.trim()
                                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                  : 'bg-[#02665e] text-white hover:bg-[#02665e]/90 hover:shadow-md active:scale-95'
                              }`}
                            >
                              {paymentLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                                  <span className="hidden sm:inline">Sending...</span>
                                </>
                              ) : paymentSent ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                  <span className="hidden sm:inline">Sent</span>
                                </>
                              ) : (
                                <>
                                  <Phone className="w-4 h-4 flex-shrink-0" />
                                  <span className="hidden sm:inline">Send code</span>
                                </>
                              )}
                            </button>
                        )}
                      </div>
                        {touched.paymentPhone && fieldErrors.paymentPhone && (
                          <div className="text-xs text-red-600 mt-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.paymentPhone}
                          </div>
                      )}
                    </div>
                    </div>

                    {paymentSent && !paymentVerified && (
                      <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-lg space-y-3">
                        <label className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                          Enter verification code
                        </label>
                        <div className="flex gap-2 items-center flex-wrap">
                          <input 
                            ref={paymentOtpRef} 
                            inputMode="numeric" 
                            maxLength={6}
                            value={paymentOtp} 
                            onChange={e => setPaymentOtp(e.target.value.replace(/[^0-9]/g, ''))} 
                            className="flex-1 min-w-[140px] px-3 py-2.5 text-sm font-medium border-2 border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-md focus:outline-none focus:border-[#02665e] focus:ring-2 focus:ring-[#02665e]/10 transition-all duration-200" 
                            placeholder="123456"
                          />
                          <button 
                            type="button" 
                            onClick={verifyPaymentOtp} 
                            disabled={paymentLoading || !paymentOtp.trim()} 
                            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                              paymentLoading || !paymentOtp.trim()
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-[#02665e] text-white hover:bg-[#02665e]/90 hover:shadow-md active:scale-95'
                            }`}
                          >
                            {paymentLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Verify</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="text-xs text-slate-600 flex items-center gap-1">
                            {paymentCountdown > 0 ? (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>Resend code in {paymentCountdown}s</span>
                              </>
                            ) : (
                              <button 
                                type="button" 
                                onClick={resendPaymentOtp} 
                                disabled={paymentLoading} 
                                className="text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium flex items-center gap-1"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Resend code</span>
                              </button>
                            )}
                      </div>
                        </div>
                        {paymentMessage && (
                          <div className={`text-xs p-2 rounded-lg flex items-start gap-2 ${
                            paymentMessage.toLowerCase().includes('success') || paymentMessage.toLowerCase().includes('verified')
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                              : 'bg-red-50 border border-red-200 text-red-700'
                          }`}>
                            {paymentMessage.toLowerCase().includes('success') || paymentMessage.toLowerCase().includes('verified') ? (
                              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            )}
                            <span className="flex-1">{paymentMessage}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentVerified && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-emerald-700">Payment phone verified</p>
                          <p className="text-xs text-emerald-600">{paymentPhone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {stepIndex === 4 && (
                <div className={`space-y-4 rounded-xl p-5 border-2 border-slate-100 bg-gradient-to-br from-white to-slate-50/50 shadow-sm transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                      <Upload className="w-4 h-4 text-[#02665e]" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Upload verification documents</h3>
                  </div>

                  <div className="space-y-4">
                  <div>
                      <label htmlFor="license-upload" className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        Upload driving license
                        <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-slate-500">(jpg, png, pdf)</span>
                      </label>
                      <label htmlFor="license-upload" className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-[#02665e] transition-all duration-200 group">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#02665e] transition-colors" />
                          <p className="text-sm text-slate-600 group-hover:text-slate-900">
                            <span className="font-medium text-[#02665e]">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-slate-500">JPG, PNG or PDF (MAX. 5MB)</p>
                  </div>
                        <input 
                          id="license-upload" 
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={e => setLicenseFile(e.target.files?.[0] ?? null)} 
                          className="hidden"
                        />
                      </label>
                      {licenseFile && (
                        <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span className="text-xs text-emerald-700 font-medium truncate">{licenseFile.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLicenseFile(null)}
                            className="text-emerald-600 hover:text-emerald-700 flex-shrink-0"
                            aria-label="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                  <div>
                      <label htmlFor="id-upload" className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <IdIcon className="w-3.5 h-3.5 text-slate-500" />
                        Upload national ID
                        <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-slate-500">(jpg, png, pdf)</span>
                      </label>
                      <label htmlFor="id-upload" className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-[#02665e] transition-all duration-200 group">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#02665e] transition-colors" />
                          <p className="text-sm text-slate-600 group-hover:text-slate-900">
                            <span className="font-medium text-[#02665e]">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-slate-500">JPG, PNG or PDF (MAX. 5MB)</p>
                  </div>
                        <input 
                          id="id-upload" 
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={e => setIdFile(e.target.files?.[0] ?? null)} 
                          className="hidden"
                        />
                      </label>
                      {idFile && (
                        <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span className="text-xs text-emerald-700 font-medium truncate">{idFile.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIdFile(null)}
                            className="text-emerald-600 hover:text-emerald-700 flex-shrink-0"
                            aria-label="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                  <div>
                      <label htmlFor="vehicle-reg-upload" className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 text-slate-500" />
                        Upload vehicle registration
                        <span className="text-xs font-normal text-slate-500">(optional)</span>
                      </label>
                      <label htmlFor="vehicle-reg-upload" className="flex flex-col items-center justify-center w-full px-4 py-6 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 hover:border-[#02665e] transition-all duration-200 group">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-[#02665e] transition-colors" />
                          <p className="text-sm text-slate-600 group-hover:text-slate-900">
                            <span className="font-medium text-[#02665e]">Click to upload</span> or drag and drop
                          </p>
                          <p className="text-xs text-slate-500">JPG, PNG or PDF (MAX. 5MB)</p>
                        </div>
                        <input 
                          id="vehicle-reg-upload" 
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={e => setVehicleRegFile(e.target.files?.[0] ?? null)} 
                          className="hidden"
                        />
                      </label>
                      {vehicleRegFile && (
                        <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            <span className="text-xs text-emerald-700 font-medium truncate">{vehicleRegFile.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setVehicleRegFile(null)}
                            className="text-emerald-600 hover:text-emerald-700 flex-shrink-0"
                            aria-label="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {stepIndex === 5 && (
                <div className={`space-y-4 rounded-xl p-5 border-2 border-slate-100 bg-gradient-to-br from-white to-slate-50/50 shadow-sm transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-[#02665e]" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-900">Review your details</h3>
                      <p className="text-xs text-slate-600 mt-0.5">Please confirm the information below before submitting your profile.</p>
                    </div>
                    <div className="hidden sm:flex items-center">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Ready to submit
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Personal Details Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <User className="w-4 h-4 text-slate-500" />
                        <h4 className="text-sm font-semibold text-slate-900">Personal Details</h4>
                            </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <User className="w-3 h-3 text-slate-400" />
                              Full name
                              <span className="text-red-500">*</span>
                            </label>
                            <button type="button" onClick={() => setStepIndex(1)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium">Edit</button>
                      </div>
                          <div className="text-sm text-slate-900 font-medium">{name || <span className="text-slate-400 italic">Not provided</span>}</div>
                          {touched.name && fieldErrors.name && (
                            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {fieldErrors.name}
                            </div>
                          )}
                    </div>

                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              Email
                              <span className="text-red-500">*</span>
                            </label>
                            <button type="button" onClick={() => setStepIndex(1)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium">Edit</button>
                          </div>
                          <div className="text-sm text-slate-900 font-medium">{email || <span className="text-slate-400 italic">Not provided</span>}</div>
                          {touched.email && fieldErrors.email && (
                            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {fieldErrors.email}
                      </div>
                          )}
                    </div>

                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <UserCircle className="w-3 h-3 text-slate-400" />
                              Gender
                            </label>
                            <button type="button" onClick={() => setStepIndex(1)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium">Edit</button>
                      </div>
                          <div className="text-sm text-slate-900 font-medium capitalize">{gender || <span className="text-slate-400 italic">—</span>}</div>
                    </div>

                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Globe className="w-3 h-3 text-slate-400" />
                              Nationality
                            </label>
                            <button type="button" onClick={() => setStepIndex(1)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium">Edit</button>
                      </div>
                          <div className="text-sm text-slate-900 font-medium">{nationality || <span className="text-slate-400 italic">—</span>}</div>
                    </div>

                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <CreditCard className="w-3 h-3 text-slate-400" />
                              NIN
                            </label>
                            <button type="button" onClick={() => setStepIndex(1)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium">Edit</button>
                          </div>
                          <div className="text-sm text-slate-900 font-medium">{nin || <span className="text-slate-400 italic">—</span>}</div>
                        </div>
                      </div>
                    </div>

                    {/* Driving Details Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Truck className="w-4 h-4 text-slate-500" />
                        <h4 className="text-sm font-semibold text-slate-900">Driving Details</h4>
                          </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <FileText className="w-3 h-3 text-slate-400" />
                              License number
                              <span className="text-red-500">*</span>
                            </label>
                            <button type="button" onClick={() => setStepIndex(2)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium">Edit</button>
                      </div>
                          <div className="text-sm text-slate-900 font-medium">{licenseNumber || <span className="text-slate-400 italic">Not provided</span>}</div>
                          {touched.licenseNumber && fieldErrors.licenseNumber && (
                            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {fieldErrors.licenseNumber}
                            </div>
                          )}
                    </div>

                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Car className="w-3 h-3 text-slate-400" />
                              Vehicle type
                              <span className="text-red-500">*</span>
                            </label>
                            <button type="button" onClick={() => setStepIndex(2)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium">Edit</button>
                        </div>
                          <div className="text-sm text-slate-900 font-medium capitalize">{vehicleType || <span className="text-slate-400 italic">Not selected</span>}</div>
                          {touched.vehicleType && fieldErrors.vehicleType && (
                            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {fieldErrors.vehicleType}
                      </div>
                          )}
                    </div>

                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Truck className="w-3 h-3 text-slate-400" />
                              Plate number
                              <span className="text-red-500">*</span>
                            </label>
                            <button type="button" onClick={() => setStepIndex(2)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium">Edit</button>
                        </div>
                          <div className="text-sm text-slate-900 font-medium">{plateNumber || <span className="text-slate-400 italic">Not provided</span>}</div>
                          {touched.plateNumber && fieldErrors.plateNumber && (
                            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {fieldErrors.plateNumber}
                      </div>
                          )}
                    </div>

                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              Operation / Parking area
                            </label>
                            <button type="button" onClick={() => setStepIndex(2)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium">Edit</button>
                          </div>
                          <div className="text-sm text-slate-900 font-medium">{operationArea || <span className="text-slate-400 italic">—</span>}</div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Details Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        <h4 className="text-sm font-semibold text-slate-900">Payment Details</h4>
                        </div>
                      <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            Payment phone
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-2">
                            {paymentVerified ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium">
                                <AlertCircle className="w-3 h-3" />
                                Not verified
                              </span>
                            )}
                            <button type="button" onClick={() => setStepIndex(3)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium">Edit</button>
                        </div>
                      </div>
                        <div className="text-sm text-slate-900 font-medium">{paymentPhone || <span className="text-slate-400 italic">Not provided</span>}</div>
                        {touched.paymentPhone && fieldErrors.paymentPhone && (
                          <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.paymentPhone}
                          </div>
                        )}
                    </div>
                  </div>

                    {/* Uploaded Files Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                        <Upload className="w-4 h-4 text-slate-500" />
                        <h4 className="text-sm font-semibold text-slate-900">Uploaded Files</h4>
                        </div>
                      <div className="space-y-2">
                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-900">Driving license</div>
                              <div className="text-xs text-slate-500 truncate">{licenseFile ? licenseFile.name : <span className="text-slate-400 italic">Not uploaded</span>}</div>
                            </div>
                          </div>
                          <button type="button" onClick={() => setStepIndex(4)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium flex-shrink-0 ml-2">Edit</button>
                      </div>

                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                              <IdIcon className="w-5 h-5 text-emerald-600" />
                        </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-900">National ID</div>
                              <div className="text-xs text-slate-500 truncate">{idFile ? idFile.name : <span className="text-slate-400 italic">Not uploaded</span>}</div>
                            </div>
                          </div>
                          <button type="button" onClick={() => setStepIndex(4)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium flex-shrink-0 ml-2">Edit</button>
                      </div>

                        <div className="p-3 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                              <Truck className="w-5 h-5 text-amber-600" />
                        </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-slate-900">Vehicle registration</div>
                              <div className="text-xs text-slate-500 truncate">{vehicleRegFile ? vehicleRegFile.name : <span className="text-slate-400 italic">Not uploaded</span>}</div>
                            </div>
                          </div>
                          <button type="button" onClick={() => setStepIndex(4)} className="text-xs text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium flex-shrink-0 ml-2">Edit</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  {stepIndex > 1 && (
                    <button 
                      type="button" 
                      onClick={() => setStepIndex(i => Math.max(1, i-1))} 
                      className="px-4 py-2 border-2 border-slate-300 rounded-lg bg-white text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 shadow-sm hover:shadow-md text-sm"
                    >
                      <span className="flex items-center gap-1.5">
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Back
                      </span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {stepIndex < maxSteps ? (
                      <button
                        type="button"
                        onClick={handleNext}
                      disabled={!isStepValid()}
                      className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 text-sm ${
                        isStepValid() 
                          ? 'bg-[#02665e] hover:bg-[#014e47] text-white' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        Next
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                      </button>
                    ) : (
                    <button 
                      type="submit" 
                      disabled={loading || !isAllDriverStepsValid()} 
                      className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:transform-none disabled:hover:shadow-md text-sm ${
                        loading || !isAllDriverStepsValid()
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                          : 'bg-[#02665e] hover:bg-[#014e47] text-white'
                      }`}
                    >
                      {loading ? (
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Submit and finish
                        </span>
                      )}
                    </button>
                    )}
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
