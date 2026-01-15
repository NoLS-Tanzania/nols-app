"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Image from "next/image";
import { User, Upload, CreditCard, Wallet, X, CheckCircle, Save, Lock, LogOut, Trash2, Calendar, MapPin, Globe, Phone, Mail, FileText, Truck, Car, Pencil, AlertCircle, UserCircle, Shield } from 'lucide-react';
// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function DriverProfile() {
  const [form, setForm] = useState<any>({});
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[] | null>(null);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const licenseFileInputRef = useRef<HTMLInputElement>(null);
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const vehicleRegFileInputRef = useRef<HTMLInputElement>(null);
  const insuranceFileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [vehicleRegFile, setVehicleRegFile] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);

  type CloudinarySig = {
    timestamp: number;
    apiKey: string;
    signature: string;
    folder: string;
    cloudName: string;
  };

  async function uploadToCloudinary(file: File, folder: string) {
    // Use relative path in browser to leverage Next.js rewrites and avoid CORS
    const sig = await api.get(`/uploads/cloudinary/sign?folder=${encodeURIComponent(folder)}`);
    const sigData = sig.data as CloudinarySig;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('timestamp', String(sigData.timestamp));
    fd.append('api_key', sigData.apiKey);
    fd.append('signature', sigData.signature);
    fd.append('folder', sigData.folder);
    // Signature currently includes overwrite=true on the server
    fd.append('overwrite', 'true');
    const resp = await axios.post(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/auto/upload`, fd);
    return (resp.data as { secure_url: string }).secure_url;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.get("/api/account/me");
        if (!mounted) return;
        const meData = r.data?.data ?? r.data;
        // Normalize common naming differences across environments
        const normalized = {
          ...(meData ?? {}),
          fullName: (meData as any)?.fullName ?? (meData as any)?.name ?? '',
        };
        setForm(normalized);
        setMe(normalized);
        try { (window as any).ME = normalized; } catch (e) { /* ignore */ }
        // fetch payment methods (best-effort)
        try {
          setLoadingPaymentMethods(true);
          const pm = await api.get('/api/account/payment-methods');
          if (!mounted) return;
          const pmData = pm.data?.data ?? pm.data;
          setPaymentMethods(pmData?.methods ?? null);
          // attach payout data to form if present (for editing payouts inline)
          if (pmData?.payout) setForm((prev:any)=>({ ...prev, ...pmData.payout }));
        } catch (e) {
          // ignore payment-methods fetch errors
        } finally {
          if (mounted) setLoadingPaymentMethods(false);
        }
      } catch (err: any) {
        console.error('Failed to load profile', err);
        if (mounted) setError(String(err?.message ?? err));
        if (typeof window !== 'undefined') window.location.href = '/login';
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    setEditingField(null); // Close any open edit fields
    try {
      // Upload avatar/documents first (so we persist HTTPS URLs, not data: URLs)
      let avatarUrl = form.avatarUrl;
      if (avatarFile) {
        avatarUrl = await uploadToCloudinary(avatarFile, 'avatars');
      }

      let drivingLicenseUrl = form.drivingLicenseUrl || form.licenseFileUrl || null;
      let nationalIdUrl = form.nationalIdUrl || form.idFileUrl || null;
      let vehicleRegistrationUrl = form.vehicleRegistrationUrl || form.vehicleRegFileUrl || null;
      let insuranceUrl = form.insuranceUrl || form.insuranceFileUrl || null;

      if (licenseFile) drivingLicenseUrl = await uploadToCloudinary(licenseFile, 'driver-documents/license');
      if (idFile) nationalIdUrl = await uploadToCloudinary(idFile, 'driver-documents/id');
      if (vehicleRegFile) vehicleRegistrationUrl = await uploadToCloudinary(vehicleRegFile, 'driver-documents/vehicle-registration');
      if (insuranceFile) insuranceUrl = await uploadToCloudinary(insuranceFile, 'driver-documents/insurance');

      // Driver profile endpoint currently supports a limited set of fields.
      // Keep the request aligned so it doesn't 404 (Next rewrites only proxy /api/*).
      const payload: any = {
        fullName: form.fullName ?? form.name,
        phone: form.phone,
        nationality: form.nationality,
        avatarUrl,
        timezone: form.timezone,
        region: form.region,
        district: form.district,
        nin: form.nin || form.nationalId,
        licenseNumber: form.licenseNumber,
        plateNumber: form.plateNumber,
        vehicleType: form.vehicleType,
        vehicleMake: form.vehicleMake,
        vehiclePlate: form.vehiclePlate,
        operationArea: form.operationArea || form.parkingArea,
        paymentPhone: form.paymentPhone,
        drivingLicenseUrl,
        nationalIdUrl,
        vehicleRegistrationUrl,
        insuranceUrl,
      };
      if (typeof form.dateOfBirth !== 'undefined') payload.dateOfBirth = form.dateOfBirth;
      if (typeof form.gender !== 'undefined') payload.gender = form.gender;

      await api.put("/api/driver/profile", payload);

      // Update UI with new URLs and clear pending file selections
      setForm((prev: any) => ({
        ...prev,
        avatarUrl,
        drivingLicenseUrl,
        nationalIdUrl,
        vehicleRegistrationUrl,
        insuranceUrl,
      }));
      setAvatarFile(null);
      setLicenseFile(null);
      setIdFile(null);
      setVehicleRegFile(null);
      setInsuranceFile(null);
      // also save payout details (owner fields) if present
      try {
        const payoutPayload: any = {
          bankAccountName: form.bankAccountName,
          bankName: form.bankName,
          bankAccountNumber: form.bankAccountNumber,
          bankBranch: form.bankBranch,
          mobileMoneyProvider: form.mobileMoneyProvider,
          mobileMoneyNumber: form.mobileMoneyNumber,
          payoutPreferred: form.payoutPreferred,
        };
        // Only call payouts endpoint if any payout field exists
        if (Object.values(payoutPayload).some(v => typeof v !== 'undefined' && v !== null && v !== '')) {
          await api.put('/api/account/payouts', payoutPayload);
        }
      } catch (e) {
        // ignore payout save errors
        console.warn('Failed to save payout details', e);
      }
      setSuccess("Profile saved successfully!");
      setError(null);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      // update local `me` shortcut and global window.ME
      try {
        const updatedMe = { ...(me ?? {}), ...payload, bankAccountName: form.bankAccountName, bankName: form.bankName, bankAccountNumber: form.bankAccountNumber, bankBranch: form.bankBranch, mobileMoneyProvider: form.mobileMoneyProvider, mobileMoneyNumber: form.mobileMoneyNumber, payoutPreferred: form.payoutPreferred };
        setMe(updatedMe);
        try { (window as any).ME = updatedMe; } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
    } catch (err: any) {
      console.error('Failed to save profile', err);
      const apiError = err?.response?.data?.message || err?.response?.data?.error;
      setError('Could not save profile: ' + String(apiError ?? err?.message ?? err));
      setSuccess(null);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-full flex items-center justify-center py-12">
        <div className="text-center">
          <div className="dot-spinner dot-md mx-auto" aria-hidden>
            <span className="dot dot-blue" />
            <span className="dot dot-black" />
            <span className="dot dot-yellow" />
            <span className="dot dot-green" />
          </div>
          <p className="text-sm text-slate-500 mt-4">Loading profile…</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="w-full max-w-full">
        <div className="rounded-md bg-red-50 border-2 border-red-200 p-4">
          <div className="text-sm font-medium text-red-800">Error loading profile: {error}</div>
        </div>
      </div>
    );
  }

  const renderField = (label: string, value: any, icon: any, required: boolean = false, fieldKey?: string, fieldType: 'text' | 'select' | 'date' = 'text', selectOptions?: { value: string; label: string }[]) => {
    const Icon = icon;
    const displayValue = value || (required ? 'Not provided' : '—');
    const isEmpty = !value;
    
    return (
      <div className="p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-slate-500" />
            {label}
            {required && <span className="text-red-500">*</span>}
          </label>
          {fieldKey && (
            <button 
              type="button" 
              onClick={() => setEditingField(editingField === fieldKey ? null : fieldKey)}
              className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-medium flex items-center gap-1"
            >
              <Pencil className="w-3 h-3" />
              {editingField === fieldKey ? 'Cancel' : 'Edit'}
            </button>
          )}
        </div>
        {editingField === fieldKey && fieldKey ? (
          fieldType === 'select' && selectOptions ? (
            <select
              value={value || ''}
              onChange={(e) => setForm({...form, [fieldKey]: e.target.value})}
              className="block w-full rounded-md border-2 border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
              autoFocus
              onBlur={() => setEditingField(null)}
            >
              <option value="">Select</option>
              {selectOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : fieldType === 'date' ? (
            <input
              type="date"
              value={value || ''}
              onChange={(e) => setForm({...form, [fieldKey]: e.target.value})}
              className="block w-full rounded-md border-2 border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
              autoFocus
              onBlur={() => setEditingField(null)}
            />
          ) : (
            <input
              type="text"
              value={value || ''}
              onChange={(e) => setForm({...form, [fieldKey]: e.target.value})}
              className="block w-full rounded-md border-2 border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
              autoFocus
              onBlur={() => setEditingField(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setEditingField(null);
              }}
            />
          )
        ) : (
          <div className={`text-sm font-medium ${isEmpty ? 'text-slate-400 italic' : 'text-slate-900'}`}>
            {fieldType === 'date' && value ? new Date(value).toLocaleDateString() : displayValue}
          </div>
        )}
      </div>
    );
  };

  const renderFileField = (label: string, file: File | null, fileUrl: string | null, icon: any, inputRef: React.RefObject<HTMLInputElement>, onFileChange: (file: File | null) => void, accept: string = "image/*,.pdf") => {
    const Icon = icon;
    const hasFile = file || fileUrl;
    
    return (
      <div className="p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900">{label}</div>
              <div className="text-xs text-slate-500 truncate">
                {hasFile ? (
                  file ? file.name : (fileUrl ? 'Uploaded' : 'Not uploaded')
                ) : (
                  <span className="text-slate-400 italic">Not uploaded</span>
                )}
              </div>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={(e) => {
              const f = e.target.files?.[0] || null;
              onFileChange(f);
              if (f && inputRef.current) {
                const reader = new FileReader();
                reader.onload = () => {
                  // Handle file upload logic here
                };
                reader.readAsDataURL(f);
              }
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-medium flex items-center gap-1 flex-shrink-0 ml-2"
          >
            <Upload className="w-3 h-3" />
            {hasFile ? 'Change' : 'Upload'}
          </button>
        </div>
        {fileUrl && (
          <div className="mt-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-700 hover:underline"
            >
              View uploaded file
            </a>
          </div>
        )}
        {file && (
          <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded flex items-center justify-between">
            <span className="text-xs text-emerald-700 font-medium truncate flex-1">{file.name}</span>
            <button
              type="button"
              onClick={() => {
                onFileChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="text-emerald-600 hover:text-emerald-700 ml-2"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="w-full text-center">
        <div className="flex flex-col items-center mb-6">
          {form.avatarUrl ? (
            <div className="relative mb-4">
              <Image 
                src={form.avatarUrl} 
                alt="avatar" 
                width={80} 
                height={80} 
                className="rounded-full object-cover border-4 border-emerald-200 shadow-lg transition-all hover:scale-105" 
              />
              <button
                type="button"
                onClick={() => avatarFileInputRef.current?.click()}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-all shadow-md hover:scale-110"
                aria-label="Change avatar"
              >
                <Upload className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="relative mb-4">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center border-4 border-emerald-200 shadow-lg">
                <User className="h-10 w-10 text-emerald-600" />
              </div>
              <button
                type="button"
                onClick={() => avatarFileInputRef.current?.click()}
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-all shadow-md hover:scale-110"
                aria-label="Upload avatar"
              >
                <Upload className="h-4 w-4" />
              </button>
            </div>
          )}
          <input
            ref={avatarFileInputRef}
            type="file"
            id="avatarInput"
            accept="image/*"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setAvatarFile(f);
              const reader = new FileReader();
              reader.onload = () => {
                setForm((prev: any) => ({ ...prev, avatarUrl: String(reader.result) }));
              };
              reader.readAsDataURL(f);
            }}
            className="hidden"
          />
          <h1 className="text-2xl font-semibold text-gray-900">Your Profile</h1>
          <p className="mt-1 text-sm text-slate-600">Review and update your information</p>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-md bg-green-50 border-2 border-green-200 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-sm font-medium text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span>{success}</span>
          </div>
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border-2 border-red-200 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-sm font-medium text-red-800">
            <X className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Personal Details Section */}
      <section className="w-full max-w-full bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
          <User className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Personal Details</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField("Full name", form.fullName, User, true, 'fullName')}
          {renderField("Email", form.email, Mail, true)}
          {renderField(
            "Gender", 
            form.gender ? form.gender.charAt(0).toUpperCase() + form.gender.slice(1) : null, 
            User, 
            false, 
            'gender',
            'select',
            [
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
              { value: 'prefer_not_to_say', label: 'Prefer not to say' }
            ]
          )}
          {renderField("Nationality", form.nationality, Globe, false, 'nationality')}
          {renderField("NIN", form.nin || form.nationalId, CreditCard, false, 'nin')}
          {renderField("Phone", form.phone, Phone, false, 'phone')}
          {renderField("Region", form.region, MapPin, false, 'region')}
          {renderField("District", form.district, MapPin, false, 'district')}
          {renderField("Date of birth", form.dateOfBirth, Calendar, false, 'dateOfBirth', 'date')}
          {renderField("Timezone", form.timezone, Globe, false, 'timezone')}
        </div>
      </section>

      {/* Driving Details Section */}
      <section className="w-full max-w-full bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
          <Truck className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Driving Details</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField("License number", form.licenseNumber, FileText, true, 'licenseNumber')}
          {renderField(
            "Vehicle type", 
            form.vehicleType ? form.vehicleType.charAt(0).toUpperCase() + form.vehicleType.slice(1) : null, 
            Car, 
            true, 
            'vehicleType',
            'select',
            [
              { value: 'bajaji', label: 'Bajaji' },
              { value: 'bodaboda', label: 'Bodaboda' },
              { value: 'vehicle', label: 'Vehicle' }
            ]
          )}
          {renderField("Plate number", form.plateNumber, Truck, true, 'plateNumber')}
          {renderField("Operation / Parking area", form.operationArea || form.parkingArea, MapPin, false, 'operationArea')}
        </div>
      </section>

      {/* Payment Details Section */}
      <section className="w-full max-w-full bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
          <CreditCard className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Payment Details</h2>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-white border-2 border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                Payment phone
                <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {form.paymentVerified || form.paymentPhoneVerified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                    <AlertCircle className="w-3 h-3" />
                    Not verified
                  </span>
                )}
                <button 
                  type="button" 
                  onClick={() => setEditingField(editingField === 'paymentPhone' ? null : 'paymentPhone')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-medium flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" />
                  {editingField === 'paymentPhone' ? 'Cancel' : 'Edit'}
                </button>
              </div>
            </div>
            {editingField === 'paymentPhone' ? (
              <input
                type="tel"
                value={form.paymentPhone || ''}
                onChange={(e) => setForm({...form, paymentPhone: e.target.value})}
                className="block w-full rounded-md border-2 border-emerald-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-colors"
                autoFocus
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingField(null);
                }}
              />
            ) : (
              <div className={`text-sm font-medium ${!form.paymentPhone ? 'text-slate-400 italic' : 'text-slate-900'}`}>
                {form.paymentPhone || 'Not provided'}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Uploaded Files Section */}
      <section className="w-full max-w-full bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-200">
          <Upload className="w-5 h-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Uploaded Files</h2>
        </div>
        
        <div className="space-y-3">
          {renderFileField(
            "Driving license",
            licenseFile,
            form.licenseFileUrl || form.drivingLicenseUrl,
            FileText,
            licenseFileInputRef,
            setLicenseFile,
            "image/*,.pdf"
          )}
          {renderFileField(
            "National ID",
            idFile,
            form.idFileUrl || form.nationalIdUrl,
            UserCircle,
            idFileInputRef,
            setIdFile,
            "image/*,.pdf"
          )}
          {renderFileField(
            "Vehicle registration",
            vehicleRegFile,
            form.vehicleRegFileUrl || form.vehicleRegistrationUrl,
            Truck,
            vehicleRegFileInputRef,
            setVehicleRegFile,
            "image/*,.pdf"
          )}
          {renderFileField(
            "Insurance",
            insuranceFile,
            form.insuranceFileUrl || form.insuranceUrl,
            Shield,
            insuranceFileInputRef,
            setInsuranceFile,
            "image/*,.pdf"
          )}
        </div>
      </section>

      {/* Payment Methods Section */}
      <section className="w-full max-w-full bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden hover:shadow-md transition-shadow duration-300">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Wallet className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Payment Methods</h2>
        </div>
        
        {loadingPaymentMethods ? (
          <div className="py-8 text-center">
            <div className="dot-spinner dot-sm mx-auto" aria-hidden>
              <span className="dot dot-blue" />
              <span className="dot dot-black" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <p className="text-sm text-slate-500 mt-4">Loading payment methods…</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Payout details from user record */}
            {(form.bankAccountNumber || form.mobileMoneyNumber || form.bankName) ? (
              <div className="p-4 border-2 border-slate-200 rounded-lg bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="font-semibold text-gray-900">Saved payout details</div>
                </div>
                <div className="space-y-2 text-sm text-slate-700">
                  {form.bankName && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-500" />
                      <span>Bank: <strong>{form.bankName}</strong> — Account: <strong className="font-mono">{maskAccount(form.bankAccountNumber)}</strong></span>
                    </div>
                  )}
                  {form.mobileMoneyProvider && form.mobileMoneyNumber && (
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-500" />
                      <span>Mobile money (<strong>{form.mobileMoneyProvider}</strong>): <strong className="font-mono">{maskPhone(form.mobileMoneyNumber)}</strong></span>
                    </div>
                  )}
                  {form.payoutPreferred && (
                    <div className="text-xs text-slate-500 mt-2">Preferred: {form.payoutPreferred}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-slate-200 rounded-lg bg-slate-50">
                <Wallet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <div className="text-sm font-medium text-slate-600 mb-1">No saved payout details</div>
                <div className="text-xs text-slate-500">Add payout details to receive payments</div>
              </div>
            )}

            {/* Recent payment methods used for payments */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-5 w-5 text-slate-600" />
                <div className="font-semibold text-gray-900">Recent payment sources</div>
              </div>
              {(!paymentMethods || paymentMethods.length === 0) ? (
                <div className="p-6 text-center border-2 border-slate-200 rounded-lg bg-slate-50">
                  <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <div className="text-sm font-medium text-slate-600 mb-1">No recent payment methods found</div>
                  <div className="text-xs text-slate-500">Your payment methods will appear here</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {paymentMethods.map((m:any, i:number) => (
                    <div key={i} className="flex items-center justify-between p-3 border-2 border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{String(m.method || m.ref || 'Unknown').toUpperCase()}</div>
                          {m.ref && <div className="text-xs text-slate-500 font-mono">Ref: {maskRef(String(m.ref))}</div>}
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">{m.paidAt ? new Date(m.paidAt).toLocaleDateString() : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Actions Section */}
      <section className="w-full max-w-full bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-200">
          <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center">
            <Lock className="h-5 w-5 text-slate-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Account Actions</h2>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            className={`inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 border-2 shadow-sm hover:shadow-md ${
              saving 
                ? 'text-slate-400 bg-slate-50 border-slate-200 opacity-60 cursor-wait' 
                : 'text-white bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700 hover:scale-105'
            }`}
            onClick={save}
            disabled={saving}
            aria-live="polite"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving…' : 'Save Changes'}</span>
          </button>
          
          <button 
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 border-2 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md hover:scale-105" 
            onClick={() => { window.location.href = '/driver/security'; }}
          >
            <Lock className="h-4 w-4" />
            <span>Change Password</span>
          </button>
          
          <button 
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-200 border-2 border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md hover:scale-105" 
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
              } catch {}
              window.location.href = "/login";
            }}
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
          
          <button
            className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-200 border-2 border-red-600 hover:border-red-700 shadow-sm hover:shadow-md hover:scale-105"
            onClick={async () => {
              const ok = confirm('Are you sure you want to delete your account? This is irreversible.');
              if (!ok) return;
              try {
                await api.delete('/api/account');
                // clear session and redirect
                try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
                alert('Account deleted');
                window.location.href = '/';
              } catch (err: any) {
                console.error('Failed to delete account', err);
                alert('Could not delete account: ' + String(err?.message ?? err));
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Account</span>
          </button>
        </div>
      </section>
    </div>
  );
}

// Helpers to mask sensitive values for display
function maskAccount(v?: string | null) {
  if (!v) return '';
  const s = String(v).replace(/\s+/g, '');
  if (s.length <= 4) return '****' + s;
  return '****' + s.slice(-4);
}
function maskPhone(v?: string | null) {
  if (!v) return '';
  const s = String(v);
  if (s.length <= 6) return s.replace(/.(?=.{2})/g, '*');
  return s.slice(0, 4) + '••••' + s.slice(-2);
}
function maskRef(v?: string | null) {
  if (!v) return '';
  const s = String(v);
  if (s.length <= 8) return s.slice(0,2) + '••••' + s.slice(-2);
  return s.slice(0,4) + '••••' + s.slice(-4);
}
