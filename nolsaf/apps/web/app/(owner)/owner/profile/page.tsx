"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Image from "next/image";
import { User, Upload, CreditCard, Wallet, X, CheckCircle, Save, Lock, LogOut, Trash2, Mail, Phone, MapPin, Building2, FileText, Pencil, AlertCircle, Globe } from 'lucide-react';
// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function OwnerProfile() {
  const [form, setForm] = useState<any>({});
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.get("/api/account/me");
        if (!mounted) return;
        // Check if user is an owner
        if (r.data.role !== 'OWNER') {
          window.location.href = '/login';
          return;
        }
        setForm(r.data);
        setMe(r.data);
        try { (window as any).ME = r.data; } catch (e) { /* ignore */ }
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
      const payload: any = {
        fullName: form.fullName || form.name,
        phone: form.phone,
        email: form.email,
        avatarUrl: form.avatarUrl,
        tin: form.tin,
        address: form.address,
      };

      // Handle file uploads if any
      const formData = new FormData();
      Object.keys(payload).forEach(key => {
        if (payload[key] !== null && payload[key] !== undefined) {
          formData.append(key, payload[key]);
        }
      });
      
      if (avatarFileInputRef.current?.files?.[0]) {
        formData.append('avatarFile', avatarFileInputRef.current.files[0]);
      }

      // Use FormData if files exist, otherwise use JSON
      if (avatarFileInputRef.current?.files?.[0]) {
        // For file uploads, we'll need to handle this via a file upload service
        // For now, if avatarUrl is set from FileReader, it will be included in payload
        await api.put("/api/account/profile", payload);
      } else {
        await api.put("/api/account/profile", payload);
      }
      
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
      setError('Could not save profile: ' + String(err?.message ?? err));
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

  const renderField = (label: string, value: any, icon: any, required: boolean = false, fieldKey?: string, fieldType: 'text' | 'textarea' = 'text') => {
    const Icon = icon;
    const displayValue = value || (required ? 'Not provided' : '—');
    const isEmpty = !value;
    
    return (
      <div className="w-full max-w-full min-w-0 p-3 sm:p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-emerald-300 transition-all duration-300 hover:shadow-md group overflow-hidden box-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 w-full max-w-full min-w-0 overflow-hidden">
          <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 transition-colors duration-300 group-hover:text-emerald-600 flex-shrink-0" />
            <span className="truncate min-w-0">{label}</span>
            {required && <span className="text-red-500 flex-shrink-0">*</span>}
          </label>
          {fieldKey && (
            <button 
              type="button" 
              onClick={() => setEditingField(editingField === fieldKey ? null : fieldKey)}
              className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 hover:underline font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105 self-start sm:self-auto flex-shrink-0 whitespace-nowrap"
            >
              <Pencil className="w-3 h-3 flex-shrink-0" />
              <span>{editingField === fieldKey ? 'Cancel' : 'Edit'}</span>
            </button>
          )}
        </div>
        <div className="w-full max-w-full min-w-0 overflow-hidden">
          {editingField === fieldKey && fieldKey ? (
            fieldType === 'textarea' ? (
              <textarea
                value={value || ''}
                onChange={(e) => setForm({...form, [fieldKey]: e.target.value})}
                className="block w-full max-w-full rounded-lg border-2 border-emerald-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200 resize-none min-w-0 box-border"
                rows={3}
                autoFocus
                onBlur={() => setEditingField(null)}
              />
            ) : (
              <input
                type={fieldKey === 'email' ? 'email' : fieldKey === 'phone' ? 'tel' : 'text'}
                value={value || ''}
                onChange={(e) => setForm({...form, [fieldKey]: e.target.value})}
                className="block w-full max-w-full rounded-lg border-2 border-emerald-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200 min-w-0 box-border"
                autoFocus
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingField(null);
                }}
              />
            )
          ) : (
            <div className={`text-xs sm:text-sm font-medium transition-colors duration-200 break-words overflow-wrap-anywhere w-full max-w-full ${isEmpty ? 'text-slate-400 italic' : 'text-slate-900'}`}>
              {displayValue}
            </div>
          )}
        </div>
      </div>
    );
  };

  const maskAccount = (str: string | null | undefined) => {
    if (!str) return '—';
    const s = String(str);
    if (s.length <= 4) return s;
    return s.slice(0, 4) + '•'.repeat(Math.min(4, s.length - 4)) + s.slice(-4);
  };

  const maskPhone = (str: string | null | undefined) => {
    if (!str) return '—';
    const s = String(str).replace(/\D/g, '');
    if (s.length <= 4) return s;
    return s.slice(0, 3) + '•'.repeat(Math.min(4, s.length - 4)) + s.slice(-3);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-50 py-4 sm:py-6 lg:py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50">
          <div className="flex flex-col items-center text-center">
            {form.avatarUrl ? (
              <div className="relative mb-4 sm:mb-6 group">
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl group-hover:bg-emerald-400/30 transition-all duration-300"></div>
                <Image 
                  src={form.avatarUrl} 
                  alt="avatar" 
                  width={96} 
                  height={96} 
                  className="relative rounded-full object-cover border-4 border-emerald-200 shadow-xl transition-all duration-300 hover:scale-105 hover:border-emerald-300" 
                />
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95"
                  aria-label="Change avatar"
                >
                  <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            ) : (
              <div className="relative mb-4 sm:mb-6 group">
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl group-hover:bg-emerald-400/30 transition-all duration-300"></div>
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-gradient-to-br from-emerald-100 to-blue-100 flex items-center justify-center border-4 border-emerald-200 shadow-xl transition-all duration-300 hover:scale-105 hover:border-emerald-300">
                  <User className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-600 transition-transform duration-300 group-hover:scale-110" />
                </div>
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95"
                  aria-label="Upload avatar"
                >
                  <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            )}
            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setForm((prev: any) => ({ ...prev, avatarUrl: String(reader.result) }));
                };
                reader.readAsDataURL(f);
              }}
              className="hidden"
            />
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 transition-all duration-300">Your Profile</h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-md">Review and update your information</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-white rounded-xl shadow-md border-2 border-green-200 p-4 animate-in fade-in slide-in-from-top-2 duration-300 transition-all">
            <div className="flex items-center gap-2 text-sm sm:text-base font-medium text-green-800">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-white rounded-xl shadow-md border-2 border-red-200 p-4 animate-in fade-in slide-in-from-top-2 duration-300 transition-all">
            <div className="flex items-center gap-2 text-sm sm:text-base font-medium text-red-800">
              <X className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Registration Details Section */}
        <section className="bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50 animate-in fade-in slide-in-from-bottom-4 box-border">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 border-b border-slate-200">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center transition-all duration-300 group-hover:bg-emerald-100">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">Registration Details</h2>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-full overflow-hidden">
            <div className="min-w-0 max-w-full overflow-hidden">
              {renderField("Full name", form.fullName || form.name, User, true, 'fullName')}
            </div>
            <div className="min-w-0 max-w-full overflow-hidden">
              {renderField("Email", form.email, Mail, true, 'email')}
            </div>
            <div className="min-w-0 max-w-full overflow-hidden">
              {renderField("Phone", form.phone, Phone, false, 'phone')}
            </div>
            <div className="min-w-0 max-w-full overflow-hidden">
              {renderField("Business TIN", form.tin, FileText, false, 'tin')}
            </div>
            <div className="col-span-2 min-w-0 max-w-full overflow-hidden">
              {renderField("Address", form.address, MapPin, false, 'address', 'textarea')}
            </div>
          </div>
        </section>

        {/* Payout Details Section */}
        <section className="bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50 animate-in fade-in slide-in-from-bottom-4 box-border">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 border-b border-slate-200">
            <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center transition-all duration-300 group-hover:bg-blue-100">
              <CreditCard className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900">Payout Details</h2>
          </div>
          
          <div className="space-y-4 sm:space-y-6">
            {/* Bank Account Details */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border-2 border-slate-200 transition-all duration-300 hover:border-emerald-200 hover:shadow-md w-full max-w-full overflow-hidden min-w-0 box-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Bank Account</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-full overflow-hidden">
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField("Bank name", form.bankName, Building2, false, 'bankName')}
                </div>
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField("Account name", form.bankAccountName, User, false, 'bankAccountName')}
                </div>
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField("Account number", form.bankAccountNumber, CreditCard, false, 'bankAccountNumber')}
                </div>
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField("Branch", form.bankBranch, MapPin, false, 'bankBranch')}
                </div>
              </div>
            </div>

            {/* Mobile Money Details */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl border-2 border-slate-200 transition-all duration-300 hover:border-emerald-200 hover:shadow-md w-full max-w-full overflow-hidden min-w-0 box-border">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Phone className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Mobile Money</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-full overflow-hidden">
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField(
                    "Provider", 
                    form.mobileMoneyProvider, 
                    Phone, 
                    false, 
                    'mobileMoneyProvider',
                    'text'
                  )}
                </div>
                <div className="min-w-0 max-w-full overflow-hidden">
                  {renderField("Mobile Money Number", form.mobileMoneyNumber, Phone, false, 'mobileMoneyNumber')}
                </div>
              </div>
            </div>

            {/* Payout Preference */}
            <div className="p-4 sm:p-5 bg-white border-2 border-slate-200 rounded-xl transition-all duration-300 hover:border-emerald-200 hover:shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                  Preferred payout method
                </label>
                <button 
                  type="button" 
                  onClick={() => setEditingField(editingField === 'payoutPreferred' ? null : 'payoutPreferred')}
                  className="text-xs sm:text-sm text-emerald-600 hover:text-emerald-700 hover:underline font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105"
                >
                  <Pencil className="w-3 h-3" />
                  {editingField === 'payoutPreferred' ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {editingField === 'payoutPreferred' ? (
                <select
                  value={form.payoutPreferred || ''}
                  onChange={(e) => setForm({...form, payoutPreferred: e.target.value})}
                  className="block w-full rounded-lg border-2 border-emerald-200 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all duration-200"
                  autoFocus
                  onBlur={() => setEditingField(null)}
                >
                  <option value="">Select preference</option>
                  <option value="BANK">Bank Account</option>
                  <option value="MOBILE_MONEY">Mobile Money</option>
                </select>
              ) : (
                <div className={`text-sm sm:text-base font-medium transition-colors duration-200 ${!form.payoutPreferred ? 'text-slate-400 italic' : 'text-slate-900'}`}>
                  {form.payoutPreferred === 'BANK' ? 'Bank Account' : form.payoutPreferred === 'MOBILE_MONEY' ? 'Mobile Money' : 'Not set'}
                </div>
              )}
            </div>

            {/* Display saved payout details */}
            {(form.bankAccountNumber || form.mobileMoneyNumber || form.bankName) ? (
              <div className="p-4 sm:p-5 border-2 border-emerald-200 rounded-xl bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 transition-all duration-300 hover:shadow-md hover:border-emerald-300">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div className="font-bold text-gray-900 text-sm sm:text-base">Saved payout details</div>
                </div>
                <div className="space-y-2 text-xs sm:text-sm text-slate-700">
                  {form.bankName && form.bankAccountNumber && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Building2 className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="break-words">Bank: <strong>{form.bankName}</strong> — Account: <strong className="font-mono">{maskAccount(form.bankAccountNumber)}</strong></span>
                    </div>
                  )}
                  {form.mobileMoneyProvider && form.mobileMoneyNumber && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Phone className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="break-words">Mobile money (<strong>{form.mobileMoneyProvider}</strong>): <strong className="font-mono">{maskPhone(form.mobileMoneyNumber)}</strong></span>
                    </div>
                  )}
                  {form.payoutPreferred && (
                    <div className="text-xs text-slate-500 mt-2">Preferred: {form.payoutPreferred === 'BANK' ? 'Bank Account' : form.payoutPreferred === 'MOBILE_MONEY' ? 'Mobile Money' : form.payoutPreferred}</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8 text-center border-2 border-slate-200 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/50 transition-all duration-300 hover:border-slate-300">
                <Wallet className="h-10 w-10 sm:h-12 sm:w-12 text-slate-300 mx-auto mb-3 transition-transform duration-300" />
                <div className="text-sm sm:text-base font-medium text-slate-600 mb-1">No saved payout details</div>
                <div className="text-xs sm:text-sm text-slate-500">Add payout details to receive payments</div>
              </div>
            )}
          </div>
        </section>

        {/* Actions Section */}
        <section className="bg-white rounded-2xl shadow-lg border-2 border-slate-200/50 p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-emerald-200/50 animate-in fade-in slide-in-from-bottom-4 box-border">
          <div className="flex items-center gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-slate-200">
            <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center transition-all duration-300 group-hover:bg-slate-100">
              <Lock className="h-5 w-5 text-slate-600" />
            </div>
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Account Actions</h2>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full max-w-full min-w-0 overflow-hidden">
            <button
              className={`w-full max-w-full min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl transition-all duration-300 border-2 shadow-md hover:shadow-lg box-border overflow-hidden ${
                saving 
                  ? 'text-slate-400 bg-slate-50 border-slate-200 opacity-60 cursor-wait' 
                  : 'text-white bg-emerald-600 hover:bg-emerald-700 border-emerald-600 hover:border-emerald-700 hover:scale-105 active:scale-95'
              }`}
              onClick={save}
              disabled={saving}
              aria-live="polite"
            >
              <Save className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate min-w-0">{saving ? 'Saving…' : 'Save Changes'}</span>
            </button>
            
            <button 
              className="w-full max-w-full min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all duration-300 border-2 border-slate-200 hover:border-slate-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 box-border overflow-hidden" 
              onClick={() => { window.location.href = '/owner/settings/password'; }}
            >
              <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate min-w-0">Change Password</span>
            </button>
            
            <button 
              className="w-full max-w-full min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all duration-300 border-2 border-slate-200 hover:border-slate-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 box-border overflow-hidden" 
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                } catch {}
                window.location.href = "/login";
              }}
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate min-w-0">Logout</span>
            </button>
            
            <button
              className="w-full max-w-full min-w-0 inline-flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all duration-300 border-2 border-red-600 hover:border-red-700 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 box-border overflow-hidden"
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
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate min-w-0">Delete Account</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

