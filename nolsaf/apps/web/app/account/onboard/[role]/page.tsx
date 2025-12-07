"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import * as Icons from 'lucide-react';
import VerifiedIcon from '../../../../components/VerifiedIcon';

export default function OnboardRole({ params }: { params: { role: string } }) {
  const role = (params.role || '').toLowerCase();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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

  // Fallbacks for lucide icons in case the named exports are undefined at runtime
  const FileTextIcon: any = (Icons as any).FileText ?? ((props: any) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
    </svg>
  ));

  const IdIcon: any = (props: any) => (
    <svg suppressHydrationWarning viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="M16 8v6" />
      <path d="M13 14h6" />
    </svg>
  );

  const TruckIcon: any = (Icons as any).Truck ?? ((props: any) => (
    <svg suppressHydrationWarning viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4v5" />
      <circle cx="5.5" cy="18.5" r="1.5" />
      <circle cx="18.5" cy="18.5" r="1.5" />
    </svg>
  ));

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
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to save profile');
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

  const handleNext = () => {
    if (isStepValid()) {
      setStepIndex(i => Math.min(5, i + 1));
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
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 bg-gradient-to-b from-white via-slate-50 to-white">
          <div className="flex flex-col items-center text-center gap-2">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-semibold">{title}</h1>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl mx-auto">{help}</p>
            </div>

            <div className="mt-4 w-full">
                <div className="w-full -mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto snap-x snap-mandatory scroll-smooth">
                  <nav className="min-w-max flex items-center gap-6 sm:justify-center">
                  {[1,2,3,4,5].map((s, i) => (
                    <div key={s} className="snap-center flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setStepIndex(s)}
                        className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-transform transform ${stepIndex===s ? 'bg-emerald-600 text-white shadow-md scale-105' : 'bg-slate-100 text-slate-700 hover:scale-105'} focus:outline-none focus:ring-2 focus:ring-emerald-200`}
                        aria-current={stepIndex===s ? 'step' : undefined}
                        aria-label={`Step ${s}`}
                      >
                        {s}
                      </button>
                      <div className="hidden sm:block text-xs text-slate-600">{s === 1 ? 'Personal' : s === 2 ? 'Driving' : s === 3 ? 'Payment' : s === 4 ? 'Uploads' : 'Review'}</div>
                      {i < 4 ? <div className={`w-12 h-1 rounded ${stepIndex > s ? 'bg-emerald-500' : 'bg-slate-200'} transition-colors`} /> : null}
                    </div>
                  ))}
                  </nav>
                </div>

                {/* Progress bars removed: inline connectors between step buttons are sufficient */}
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && !(error === 'Please provide both name and email' && role === 'driver' && stepIndex !== 5) && (
            <div className="mb-4 text-sm text-red-700">{error}</div>
          )}
          {success && <div className="mb-4 text-sm text-green-700">{success}</div>}

          {/* Non-driver simple form */}
          {role !== 'driver' ? (
            <form onSubmit={submitProfile} className="space-y-4">
              <div>
                <label htmlFor="onboard-name" className="block text-sm font-medium text-slate-700">Full name</label>
                <input id="onboard-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="Your full name" />
              </div>

              <div>
                <label htmlFor="onboard-email" className="block text-sm font-medium text-slate-700">Email</label>
                <input id="onboard-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="you@example.com" />
              </div>

              <div className="flex items-center gap-3">
                <button type="submit" disabled={loading} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md disabled:opacity-60">{loading ? 'Saving...' : 'Save and continue'}</button>
                <Link href="/public" className="text-sm text-slate-600">Return to public site</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={submitProfile} className="space-y-6">
              {/* Step contents with small animation */}
              {stepIndex === 1 && (
                <div className={`space-y-4 rounded-md p-5 border border-slate-100 bg-white transition-transform duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <h3 className="text-lg font-medium text-slate-800">Personal Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Full name</label>
                    <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} onBlur={() => { setTouched(prev => ({ ...prev, name: true })); setFieldErrors(prev => ({ ...prev, name: validateField('name') })); }} className="mt-1 block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="Your full name" />
                    {touched.name && fieldErrors.name && <div className="text-xs text-red-600 mt-1">{fieldErrors.name}</div>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Email</label>
                    <input ref={emailRef} type="email" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => { setTouched(prev => ({ ...prev, email: true })); setFieldErrors(prev => ({ ...prev, email: validateField('email') })); }} className="mt-1 block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="you@example.com" />
                    {touched.email && fieldErrors.email && <div className="text-xs text-red-600 mt-1">{fieldErrors.email}</div>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="gender-select" className="block text-sm font-medium text-slate-700">Gender</label>
                      <select id="gender-select" value={gender} onChange={e => setGender(e.target.value)} className="mt-1 block w-full border border-slate-200 rounded-md px-2 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="nationality-select" className="block text-sm font-medium text-slate-700">Nationality</label>
                      <select id="nationality-select" value={nationality} onChange={e => setNationality(e.target.value)} className="mt-1 block w-full border border-slate-200 rounded-md px-2 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                        <option value="Tanzanian">Tanzanian</option>
                        <option value="Kenyan">Kenyan</option>
                        <option value="Ugandan">Ugandan</option>
                        <option value="Rwandese">Rwandese</option>
                        <option value="Burundian">Burundian</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700">NIN (optional)</label>
                      <input value={nin} onChange={e => setNin(e.target.value)} className="mt-1 block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="National ID number" />
                    </div>
                  </div>
                </div>
              )}

              {stepIndex === 2 && (
                <div className={`space-y-4 rounded-md p-5 border border-slate-100 bg-white transition-transform duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <h3 className="text-lg font-medium text-slate-800">Driving Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">License number</label>
                    <input ref={licenseRef} value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} onBlur={() => { setTouched(prev => ({ ...prev, licenseNumber: true })); setFieldErrors(prev => ({ ...prev, licenseNumber: validateField('licenseNumber') })); }} className="mt-1 block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="e.g., DL-12345" />
                    {touched.licenseNumber && fieldErrors.licenseNumber && <div className="text-xs text-red-600 mt-1">{fieldErrors.licenseNumber}</div>}
                  </div>

                    <div>
                    <label className="block text-sm font-medium text-slate-700">Type of vehicle</label>
                    <div ref={vehicleTypeRef} tabIndex={-1} className="flex flex-col sm:flex-row sm:justify-center gap-2 mt-2">
                      {['Bajaji','Bodaboda','Vehicle'].map(t => (
                        <label key={t} className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded cursor-pointer border text-center ${vehicleType === t ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                          <input type="radio" name="vehicleType" checked={vehicleType === t} onChange={() => { setVehicleType(t); setTouched(prev => ({ ...prev, vehicleType: true })); setFieldErrors(prev => ({ ...prev, vehicleType: validateField('vehicleType') })); }} className="sr-only" />
                          <span className="text-sm">{t}</span>
                        </label>
                      ))}
                      {touched.vehicleType && fieldErrors.vehicleType && <div className="text-xs text-red-600 mt-2">{fieldErrors.vehicleType}</div>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Plate number</label>
                      <input ref={plateRef} value={plateNumber} onChange={e => setPlateNumber(e.target.value)} onBlur={() => { setTouched(prev => ({ ...prev, plateNumber: true })); setFieldErrors(prev => ({ ...prev, plateNumber: validateField('plateNumber') })); }} className="mt-1 block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="Plate number" />
                      {touched.plateNumber && fieldErrors.plateNumber && <div className="text-xs text-red-600 mt-1">{fieldErrors.plateNumber}</div>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700">Operation / Parking area</label>
                      <input value={operationArea} onChange={e => setOperationArea(e.target.value)} className="mt-1 block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300" placeholder="e.g., Dar es Salaam - Ilala" />
                    </div>
                  </div>
                </div>
              )}

              {stepIndex === 3 && (
                <div className={`space-y-4 rounded-md p-5 border border-slate-100 bg-white transition-transform duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <h3 className="text-lg font-medium text-slate-800">Payment Details</h3>
                  <p className="text-sm text-slate-600">Provide a phone number used to receive payments (any supported mobile-money provider).</p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Payment phone</label>
                    <div className="mt-1 relative">
                      <div className="flex gap-2">
                        <input ref={paymentRef} value={paymentPhone} onChange={e => { setPaymentPhone(e.target.value); if (!paymentVerified) setPaymentVerified(false); }} onBlur={() => { setTouched(prev => ({ ...prev, paymentPhone: true })); setFieldErrors(prev => ({ ...prev, paymentPhone: validateField('paymentPhone') })); }} readOnly={paymentVerified} aria-readonly={paymentVerified} className={`flex-1 block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm ${paymentVerified ? 'bg-slate-50 text-slate-700 pr-12' : 'focus:outline-none focus:ring-2 focus:ring-teal-300'}`} placeholder="e.g., +2557xxxxxxxx" />
                        {!paymentVerified && (
                          <button type="button" onClick={sendPaymentOtp} disabled={paymentLoading} className={`px-3 py-2 rounded-md ${paymentSent ? 'bg-slate-100 text-slate-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>{paymentSent ? (paymentLoading ? 'Sending...' : 'Sent') : (paymentLoading ? 'Sending...' : 'Send code')}</button>
                        )}
                      </div>

                      {paymentVerified && (
                        <VerifiedIcon size={5} className="" />
                      )}
                    </div>
                    {touched.paymentPhone && fieldErrors.paymentPhone && <div className="text-xs text-red-600 mt-1">{fieldErrors.paymentPhone}</div>}

                    {paymentSent && !paymentVerified && (
                      <div className="mt-3">
                        <label className="block text-sm font-medium text-slate-700">Enter OTP</label>
                        <div className="mt-1 flex gap-2 items-center">
                          <input ref={paymentOtpRef} inputMode="numeric" value={paymentOtp} onChange={e => setPaymentOtp(e.target.value.replace(/[^0-9]/g, ''))} className="block w-40 border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="123456" />
                          <button type="button" onClick={verifyPaymentOtp} disabled={paymentLoading} className={`px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700`}>{paymentLoading ? 'Verifying...' : 'Verify'}</button>
                          <div className="text-sm text-slate-600">{paymentCountdown > 0 ? `Resend in ${paymentCountdown}s` : <button type="button" onClick={resendPaymentOtp} disabled={paymentLoading} className="text-sky-600">Resend</button>}</div>
                        </div>
                        {paymentMessage && <div className="text-xs mt-2 text-slate-700">{paymentMessage}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {stepIndex === 4 && (
                <div className={`space-y-4 rounded-md p-5 border border-slate-100 bg-white transition-transform duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <h3 className="text-lg font-medium text-slate-800">Upload verification documents</h3>
                  <div>
                    <label htmlFor="license-upload" className="block text-sm font-medium text-slate-700">Upload driving license (jpg, png, pdf)</label>
                    <input id="license-upload" type="file" accept="image/*,.pdf" onChange={e => setLicenseFile(e.target.files?.[0] ?? null)} />
                    {licenseFile && <div className="text-xs text-slate-600">Selected: {licenseFile.name}</div>}
                  </div>
                  <div>
                    <label htmlFor="id-upload" className="block text-sm font-medium text-slate-700">Upload national ID (jpg, png, pdf)</label>
                    <input id="id-upload" type="file" accept="image/*,.pdf" onChange={e => setIdFile(e.target.files?.[0] ?? null)} />
                    {idFile && <div className="text-xs text-slate-600">Selected: {idFile.name}</div>}
                  </div>
                  <div>
                    <label htmlFor="vehicle-reg-upload" className="block text-sm font-medium text-slate-700">Upload vehicle registration (optional)</label>
                    <input id="vehicle-reg-upload" type="file" accept="image/*,.pdf" onChange={e => setVehicleRegFile(e.target.files?.[0] ?? null)} />
                    {vehicleRegFile && <div className="text-xs text-slate-600">Selected: {vehicleRegFile.name}</div>}
                  </div>
                </div>
              )}

              {stepIndex === 5 && (
                <div className={`space-y-4 rounded-md p-6 border border-slate-100 bg-white transition-transform duration-200 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Review your details</h3>
                      <p className="text-sm text-slate-500 mt-1">Please confirm the information below before submitting your profile.</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">Ready to submit</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/** Info cards */}
                    <div className="col-span-1">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500">Full name <span className="text-red-500 ml-1" aria-hidden>*</span></div>
                            <div className="mt-1">
                              <input id="onboard-name" value={name} onChange={e => setName(e.target.value)} onBlur={() => { setTouched(prev => ({ ...prev, name: true })); setFieldErrors(prev => ({ ...prev, name: validateField('name') })); }} className="block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300 text-sm" placeholder="Full name" />
                              {touched.name && fieldErrors.name && <div className="text-xs text-red-600 mt-1">{fieldErrors.name}</div>}
                            </div>
                              <button type="button" onClick={() => setStepIndex(1)} className="mt-2 text-xs text-blue-600 hover:underline">Edit</button>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500">Email <span className="text-red-500 ml-1" aria-hidden>*</span></div>
                          <div className="mt-1">
                            <input id="onboard-email" type="email" value={email} onChange={e => setEmail(e.target.value)} onBlur={() => { setTouched(prev => ({ ...prev, email: true })); setFieldErrors(prev => ({ ...prev, email: validateField('email') })); }} className="block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300 text-sm" placeholder="you@example.com" />
                            {touched.email && fieldErrors.email && <div className="text-xs text-red-600 mt-1">{fieldErrors.email}</div>}
                          </div>
                          <button type="button" onClick={() => setStepIndex(1)} className="mt-2 text-xs text-blue-600 hover:underline">Edit</button>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500">Gender</div>
                        <div className="mt-1 text-sm text-slate-900">{gender || <span className="text-slate-400">—</span>}</div>
                        <button type="button" onClick={() => setStepIndex(1)} className="mt-2 text-xs text-blue-600 hover:underline">Edit</button>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500">Nationality</div>
                        <div className="mt-1 text-sm text-slate-900">{nationality || <span className="text-slate-400">—</span>}</div>
                        <button type="button" onClick={() => setStepIndex(1)} className="mt-2 text-xs text-blue-600 hover:underline">Edit</button>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500">NIN</div>
                        <div className="mt-1 text-sm text-slate-900">{nin || <span className="text-slate-400">—</span>}</div>
                        <button type="button" onClick={() => setStepIndex(1)} className="mt-2 text-xs text-blue-600 hover:underline">Edit</button>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500">License number <span className="text-red-500 ml-1" aria-hidden>*</span></div>
                          <div className="mt-1">
                            <input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} onBlur={() => { setTouched(prev => ({ ...prev, licenseNumber: true })); setFieldErrors(prev => ({ ...prev, licenseNumber: validateField('licenseNumber') })); }} className="block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300 text-sm" placeholder="e.g., DL-12345" />
                            {touched.licenseNumber && fieldErrors.licenseNumber && <div className="text-xs text-red-600 mt-1">{fieldErrors.licenseNumber}</div>}
                            <button type="button" onClick={() => setStepIndex(2)} className="mt-2 text-xs text-blue-600 hover:underline">Edit</button>
                          </div>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500">Vehicle type <span className="text-red-500 ml-1" aria-hidden>*</span></div>
                        <div className="mt-1">
                          <div className="text-sm text-slate-900">{vehicleType || <span className="text-slate-400">—</span>}</div>
                          {touched.vehicleType && fieldErrors.vehicleType && <div className="text-xs text-red-600 mt-1">{fieldErrors.vehicleType}</div>}
                          <button type="button" onClick={() => setStepIndex(2)} className="mt-2 text-xs text-blue-600 hover:underline">Edit</button>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500">Plate number <span className="text-red-500 ml-1" aria-hidden>*</span></div>
                        <div className="mt-1">
                          <input value={plateNumber} onChange={e => setPlateNumber(e.target.value)} onBlur={() => { setTouched(prev => ({ ...prev, plateNumber: true })); setFieldErrors(prev => ({ ...prev, plateNumber: validateField('plateNumber') })); }} className="block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300 text-sm" placeholder="Plate number" />
                          {touched.plateNumber && fieldErrors.plateNumber && <div className="text-xs text-red-600 mt-1">{fieldErrors.plateNumber}</div>}
                          <button type="button" onClick={() => setStepIndex(2)} className="mt-2 text-xs text-blue-600 hover:underline">Edit</button>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-1">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="text-xs text-slate-500">Operation / Parking area</div>
                        <div className="mt-1 text-sm text-slate-900">{operationArea || <span className="text-slate-400">—</span>}</div>
                        <button type="button" onClick={() => setStepIndex(2)} className="mt-2 text-xs text-blue-600 hover:underline">Edit</button>
                      </div>
                    </div>

                    <div className="col-span-1 md:col-span-2">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 relative">
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-slate-500">Payment phone <span className="text-red-500 ml-1" aria-hidden>*</span></div>
                          <div>{paymentVerified ? <VerifiedIcon size={4} /> : <span className="text-xs inline-flex items-center px-2 py-0.5 rounded bg-yellow-50 text-yellow-700">Not verified</span>}</div>
                        </div>
                        <div className="mt-1">
                          <input value={paymentPhone} onChange={e => { setPaymentPhone(e.target.value); if (!paymentVerified) setPaymentVerified(false); }} onBlur={() => { setTouched(prev => ({ ...prev, paymentPhone: true })); setFieldErrors(prev => ({ ...prev, paymentPhone: validateField('paymentPhone') })); }} readOnly={paymentVerified} aria-readonly={paymentVerified} className={`block w-full border border-slate-200 rounded-md px-3 py-2 shadow-sm ${paymentVerified ? 'bg-slate-50 text-slate-700' : 'focus:outline-none focus:ring-2 focus:ring-teal-300'} text-sm`} placeholder="e.g., +2557xxxxxxxx" />
                          {touched.paymentPhone && fieldErrors.paymentPhone && <div className="text-xs text-red-600 mt-1">{fieldErrors.paymentPhone}</div>}
                        </div>
                        <button type="button" onClick={() => setStepIndex(3)} className="mt-2 text-xs text-blue-600 hover:underline">Edit</button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs text-slate-500">Uploaded files</div>
                    <div className="mt-2 flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-sky-50 text-sky-600"><FileTextIcon className="w-4 h-4" /></span>
                        <div className="flex-1">
                          <div className="text-sm text-slate-900">Driving license</div>
                          <div className="text-xs text-slate-500">{licenseFile ? licenseFile.name : 'Not uploaded'}</div>
                        </div>
                        <button type="button" onClick={() => setStepIndex(4)} className="text-xs text-blue-600">Edit</button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-sky-50 text-sky-600"><IdIcon className="w-4 h-4" /></span>
                        <div className="flex-1">
                          <div className="text-sm text-slate-900">National ID</div>
                          <div className="text-xs text-slate-500">{idFile ? idFile.name : 'Not uploaded'}</div>
                        </div>
                        <button type="button" onClick={() => setStepIndex(4)} className="text-xs text-blue-600">Edit</button>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-sky-50 text-sky-600"><TruckIcon className="w-4 h-4" /></span>
                        <div className="flex-1">
                          <div className="text-sm text-slate-900">Vehicle registration</div>
                          <div className="text-xs text-slate-500">{vehicleRegFile ? vehicleRegFile.name : 'Not uploaded'}</div>
                        </div>
                        <button type="button" onClick={() => setStepIndex(4)} className="text-xs text-blue-600">Edit</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {stepIndex > 1 && <button type="button" onClick={() => setStepIndex(i => Math.max(1, i-1))} className="px-3 py-2 border rounded-md bg-white text-slate-700">Back</button>}
                </div>
                <div className="flex items-center gap-3">
                  {stepIndex < 5 ? (
                      <button
                        type="button"
                        onClick={handleNext}
                        className={`px-4 py-2 rounded-md ${isStepValid() ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'bg-slate-200 text-slate-400'}`}
                      >
                        Next
                      </button>
                    ) : (
                      <button type="submit" disabled={loading} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md disabled:opacity-60">{loading ? 'Saving...' : 'Submit and finish'}</button>
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
