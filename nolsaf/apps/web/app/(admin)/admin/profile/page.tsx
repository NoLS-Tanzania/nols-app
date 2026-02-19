"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import Image from "next/image";
import { User, Upload, X, CheckCircle, Save, Lock, LogOut, Mail, Phone, MapPin, Pencil, Shield } from 'lucide-react';
// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function AdminProfile() {
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
        const user = (r as any)?.data?.data ?? (r as any)?.data;
        // Check if user is an admin
        if (user?.role !== 'ADMIN') {
          window.location.href = '/admin/login';
          return;
        }
        setForm(user);
        setMe(user);
        try { (window as any).ME = user; } catch (e) { /* ignore */ }
      } catch (err: any) {
        console.error('Failed to load profile', err);
        if (mounted) setError(String(err?.message ?? err));
        const status = err?.response?.status;
        const code = err?.response?.data?.code;
        if (status === 403 && code === 'ACCOUNT_SUSPENDED') {
          return;
        }
        if (typeof window !== 'undefined') window.location.href = '/admin/login';
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
        address: form.address,
      };

      // API expects JSON (req.body). Avatar is stored via `avatarUrl`.
      await api.put("/api/account/profile", payload);
      
      setSuccess("Profile saved successfully!");
      setError(null);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      // update local `me` shortcut and global window.ME
      try {
        const updatedMe = { ...(me ?? {}), ...payload };
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
      <div className="w-full max-w-full min-w-0 p-3 sm:p-4 bg-white border-2 border-slate-200 rounded-xl hover:border-[#02665e]/30 transition-all duration-300 hover:shadow-md group overflow-hidden box-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 w-full max-w-full min-w-0 overflow-hidden">
          <label className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 transition-colors duration-300 group-hover:text-[#02665e] flex-shrink-0" />
            <span className="truncate min-w-0">{label}</span>
            {required && <span className="text-red-500 flex-shrink-0">*</span>}
          </label>
          {fieldKey && (
            <button 
              type="button" 
              onClick={() => setEditingField(editingField === fieldKey ? null : fieldKey)}
              className="text-xs sm:text-sm text-[#02665e] hover:text-[#02665e]/80 hover:underline font-medium flex items-center gap-1 transition-all duration-200 hover:scale-105 self-start sm:self-auto flex-shrink-0 whitespace-nowrap"
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
                className="block w-full max-w-full rounded-lg border-2 border-[#02665e]/20 px-3 py-2.5 text-sm focus:border-[#02665e] focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 transition-all duration-200 resize-none min-w-0 box-border"
                rows={3}
                autoFocus
              />
            ) : (
              <input
                type={fieldKey === 'email' ? 'email' : fieldKey === 'phone' ? 'tel' : 'text'}
                value={value || ''}
                onChange={(e) => setForm({...form, [fieldKey]: e.target.value})}
                className="block w-full max-w-full rounded-lg border-2 border-[#02665e]/20 px-3 py-2.5 text-sm focus:border-[#02665e] focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 transition-all duration-200 min-w-0 box-border"
                autoFocus
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

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 via-[#02665e]/5 to-slate-50 py-4 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-slate-200/50 p-4 transition-all duration-300 hover:shadow-xl hover:border-[#02665e]/20">
          <div className="flex flex-col items-center text-center">
            {form.avatarUrl ? (
              <div className="relative mb-3 group">
                <div className="absolute inset-0 rounded-full bg-[#02665e]/20 blur-xl group-hover:bg-[#02665e]/30 transition-all duration-300"></div>
                <Image 
                  src={form.avatarUrl} 
                  alt="avatar" 
                  width={80} 
                  height={80} 
                  className="relative rounded-full object-cover border-4 border-[#02665e]/20 shadow-xl transition-all duration-300 hover:scale-105 hover:border-[#02665e]/30" 
                />
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#02665e] text-white flex items-center justify-center hover:bg-[#014d47] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95"
                  aria-label="Change avatar"
                >
                  <Upload className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative mb-3 group">
                <div className="absolute inset-0 rounded-full bg-[#02665e]/20 blur-xl group-hover:bg-[#02665e]/30 transition-all duration-300"></div>
                <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-[#02665e]/10 to-slate-100 flex items-center justify-center border-4 border-[#02665e]/20 shadow-xl transition-all duration-300 hover:scale-105 hover:border-[#02665e]/30">
                  <Shield className="h-10 w-10 text-[#02665e] transition-transform duration-300 group-hover:scale-110" />
                </div>
                <button
                  type="button"
                  onClick={() => avatarFileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-[#02665e] text-white flex items-center justify-center hover:bg-[#014d47] transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 active:scale-95"
                  aria-label="Upload avatar"
                >
                  <Upload className="h-3.5 w-3.5" />
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
            <h1 className="text-xl font-bold text-gray-900 mb-1 transition-all duration-300">Administrator Profile</h1>
            <p className="text-xs text-slate-600 max-w-md">Manage your administrative account information</p>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="bg-white rounded-lg shadow-md border-2 border-green-200 p-3 animate-in fade-in slide-in-from-top-2 duration-300 transition-all">
            <div className="flex items-center gap-2 text-sm font-medium text-green-800">
              <CheckCircle className="h-4 w-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-white rounded-lg shadow-md border-2 border-red-200 p-3 animate-in fade-in slide-in-from-top-2 duration-300 transition-all">
            <div className="flex items-center gap-2 text-sm font-medium text-red-800">
              <X className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Profile Details Section */}
        <section className="bg-white rounded-xl shadow-lg border-2 border-slate-200/50 p-4 w-full max-w-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-[#02665e]/20 box-border">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
            <div className="h-8 w-8 rounded-lg bg-[#02665e]/10 flex items-center justify-center transition-all duration-300 group-hover:bg-[#02665e]/20">
              <Shield className="w-4 h-4 text-[#02665e]" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Profile Information</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-full overflow-hidden">
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
              {renderField("Role", "Administrator", Shield, false)}
            </div>
            <div className="col-span-1 sm:col-span-2 min-w-0 max-w-full overflow-hidden">
              {renderField("Address", form.address, MapPin, false, 'address', 'textarea')}
            </div>
          </div>
        </section>

        {/* Actions Section */}
        <section className="bg-white rounded-xl shadow-lg border-2 border-slate-200/50 p-4 w-full max-w-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-[#02665e]/20 box-border">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-200">
            <div className="h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center transition-all duration-300 group-hover:bg-slate-100">
              <Lock className="h-4 w-4 text-slate-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Account Actions</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-full min-w-0 overflow-hidden">
            <button
              className={`w-full max-w-full min-w-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 border-2 shadow-md hover:shadow-lg box-border overflow-hidden ${
                saving 
                  ? 'text-slate-400 bg-slate-50 border-slate-200 opacity-60 cursor-wait' 
                  : 'text-white bg-[#02665e] hover:bg-[#014d47] border-[#02665e] hover:border-[#014d47] hover:scale-105 active:scale-95'
              }`}
              onClick={save}
              disabled={saving}
              aria-live="polite"
            >
              <Save className="h-4 w-4 flex-shrink-0" />
              <span className="truncate min-w-0">{saving ? 'Saving…' : 'Save Changes'}</span>
            </button>
            
            <button 
              className="w-full max-w-full min-w-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all duration-300 border-2 border-slate-200 hover:border-slate-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 box-border overflow-hidden" 
              onClick={() => { window.location.href = '/admin/settings/password'; }}
            >
              <Lock className="h-4 w-4 flex-shrink-0" />
              <span className="truncate min-w-0">Change Password</span>
            </button>
            
            <button 
              className="w-full max-w-full min-w-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all duration-300 border-2 border-red-600 hover:border-red-700 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 box-border overflow-hidden" 
              onClick={async () => {
                const ok = confirm('Are you sure you want to logout?');
                if (!ok) return;
                try {
                  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
                } catch {}
                window.location.href = "/admin/login";
              }}
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span className="truncate min-w-0">Logout</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

