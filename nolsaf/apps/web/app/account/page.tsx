"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { User, Mail, Phone, CalendarDays, Car, Users, ArrowRight, ClipboardList, Shield, CheckCircle, AlertCircle, Share2, Copy, Check, Upload, Save, MessageCircle, Heart } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const api = axios.create({ baseURL: "", withCredentials: true });

function SkeletonLine({ w = "w-full", className = "" }: { w?: string; className?: string }) {
  return <div className={`h-4 ${w} rounded-full bg-slate-200/80 animate-pulse ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-slate-200/80 animate-pulse" />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="h-10 w-10 rounded-2xl bg-slate-200/80 animate-pulse" />
        <div className="h-5 w-5 rounded-full bg-slate-100 animate-pulse" />
      </div>
      <div className="mt-3 space-y-2">
        <SkeletonLine w="w-12" />
        <SkeletonLine w="w-24" />
      </div>
    </div>
  );
}

export default function AccountIndex() {
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entered, setEntered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ bookings: number; rides: number; groupStays: number; eventPlans: number; savedProperties: number }>({
    bookings: 0,
    rides: 0,
    groupStays: 0,
    eventPlans: 0,
    savedProperties: 0,
  });
  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  // Gentle mount animation
  useEffect(() => {
    const t = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(t);
  }, []);

  // referral link best-effort
  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      try {
        const r = await api.get('/api/account/referral');
        if (!mounted) return;
        if (r?.data?.link) { setReferralLink(String(r.data.link)); return; }
        if (r?.data?.code) { setReferralLink(`${window.location.origin}/r/${encodeURIComponent(String(r.data.code))}`); return; }
      } catch (e) {
        // ignore
      }
      try {
        const id = (user as any).id || (user as any)._id || (user as any).email || String(Math.random()).slice(2,10);
        if (mounted) setReferralLink(`${window.location.origin}/r/${encodeURIComponent(String(id))}`);
      } catch (e) {
        if (mounted) setReferralLink(null);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  const loadProfile = async () => {
    try {
      const response = await api.get("/api/account/me");
      setUser(response.data);
      setForm(response.data);
    } catch (err) {
      console.error("Failed to load profile", err);
      const anyErr: any = err as any;
      const status = anyErr?.response?.status;
      const code = anyErr?.response?.data?.code;
      if (status === 403 && code === "ACCOUNT_SUSPENDED") {
        return;
      }
      try {
        if (typeof window !== "undefined") window.location.href = "/account/login";
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Fetch bookings count
      try {
        const bookingsRes = await api.get("/api/customer/bookings?page=1&pageSize=1");
        setStats((prev) => ({ ...prev, bookings: bookingsRes.data?.total || 0 }));
      } catch {}

      // Fetch rides count
      try {
        const ridesRes = await api.get("/api/customer/rides?page=1&pageSize=1");
        setStats((prev) => ({ ...prev, rides: ridesRes.data?.total || 0 }));
      } catch {}

      // Fetch group stays count
      try {
        const groupStaysRes = await api.get("/api/customer/group-stays?page=1&pageSize=1");
        setStats((prev) => ({ ...prev, groupStays: groupStaysRes.data?.total || 0 }));
      } catch {}

      // Fetch event plans count
      try {
        const eventPlansRes = await api.get("/api/customer/plan-requests?page=1&pageSize=1");
        setStats((prev) => ({ ...prev, eventPlans: eventPlansRes.data?.total || 0 }));
      } catch {}

      // Fetch saved properties count
      try {
        const savedRes = await api.get("/api/customer/saved-properties?page=1&pageSize=1");
        setStats((prev) => ({ ...prev, savedProperties: savedRes.data?.total || 0 }));
      } catch {}
    } catch (err) {
      // Stats are optional, don't fail the page
      console.debug("Failed to load stats", err);
    }
  };

  const handleAvatarClick = () => {
    avatarFileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to process image', err);
    }
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: any = {
        fullName: form.fullName || form.name,
        phone: form.phone,
        avatarUrl: form.avatarUrl,
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
        await api.put('/account/profile', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.put('/account/profile', payload);
      }

      setSuccess('Profile saved successfully!');
      setUser({ ...(user ?? {}), ...payload });
      setTimeout(() => setSuccess(null), 3000);
      // Reload profile to get updated data
      await loadProfile();
    } catch (err: any) {
      console.error('Failed to save profile', err);
      setError(err?.response?.data?.error || 'Could not save profile');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!referralLink) {
      setError('No referral link available');
      setTimeout(() => setError(null), 3000);
      return;
    }
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError('Could not copy to clipboard');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleWhatsApp = () => {
    if (!referralLink) {
      setError('No referral link available');
      setTimeout(() => setError(null), 3000);
      return;
    }
    const message = encodeURIComponent(`Join me on NoLSAF! Use my referral link: ${referralLink}`);
    // Open WhatsApp with the referral link message
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="w-full space-y-6">
        {/* Hero skeleton */}
        <div className="relative overflow-hidden rounded-3xl animate-pulse"
          style={{ background: "linear-gradient(135deg, #011a18 0%, #023d38 52%, #02665e 100%)", minHeight: 260 }}>
          <div className="flex flex-col items-center justify-center gap-4 py-14">
            <div className="h-24 w-24 rounded-full bg-white/10" />
            <div className="h-7 w-48 rounded-full bg-white/10" />
            <div className="h-4 w-36 rounded-full bg-white/10" />
            <div className="flex gap-3 mt-1">
              {[72, 88, 72].map((w, i) => (
                <div key={i} className="h-7 rounded-full bg-white/10" style={{ width: w }} />
              ))}
            </div>
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        {/* Profile card skeleton */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-4 w-40 rounded-full bg-slate-100 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={[
        "w-full space-y-6 transition-all duration-300 ease-out",
        entered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1",
      ].join(" ")}
    >
      {/* ══════ PREMIUM HERO HEADER ══════ */}
      <div
        className="relative overflow-hidden rounded-3xl shadow-[0_4px_32px_rgba(14,42,122,0.38)]"
        style={{ background: "linear-gradient(135deg, #0c1222 0%, #0f2460 52%, #1d4ed8 100%)" }}
      >
        {/* Radial glows — revenue card style */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0" style={{
            background: "radial-gradient(520px circle at 18% 22%, rgba(56,189,248,0.22), transparent 56%), radial-gradient(520px circle at 88% 35%, rgba(59,130,246,0.18), transparent 62%)"
          }} />
          <div className="absolute inset-0 opacity-[0.05]">
            {[12, 32, 52, 70].map((top, i) => (
              <div key={i} className="absolute h-px"
                style={{ top: `${top}%`, left: `${6 + i * 2}%`, right: `${6 + i * 2}%`,
                  background: "linear-gradient(90deg, transparent, white, transparent)" }} />
            ))}
          </div>
        </div>

        <div className="relative px-6 py-10 sm:px-10 sm:py-12 flex flex-col items-center text-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full blur-md scale-110" style={{ background: "rgba(56,189,248,0.22)" }} />
            <div
              className="relative h-24 w-24 rounded-full border-2 border-white/20 shadow-xl cursor-pointer group overflow-hidden flex items-center justify-center"
              style={{ background: (form.avatarUrl || user?.avatarUrl) ? undefined : "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(59,130,246,0.12))" }}
              onClick={handleAvatarClick}
            >
              {form.avatarUrl || user?.avatarUrl ? (
                /^https?:\/\//i.test(form.avatarUrl || user?.avatarUrl || '') ? (
                  <Image src={form.avatarUrl || user?.avatarUrl} alt={form.fullName || form.name || "Profile"}
                    width={96} height={96} className="w-full h-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.avatarUrl || user?.avatarUrl} alt={form.fullName || form.name || "Profile"}
                    className="w-full h-full object-cover" />
                )
              ) : (
                <User className="h-10 w-10 text-blue-200" />
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <Upload className="h-6 w-6 text-white" />
              </div>
            </div>
            {/* Upload hint badge */}
            <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full border-2 flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg, #38bdf8, #3b82f6)", borderColor: "#0f2460" }}>
              <Upload className="h-3.5 w-3.5 text-white" />
            </div>
          </div>

          {/* Name + subtitle */}
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow">
              {form.fullName || form.name || user?.name || 'My Account'}
            </h1>
            <p className="mt-1 text-sm text-blue-200/70 font-medium">
              {form.email || user?.email || 'Manage your personal information and preferences'}
            </p>
          </div>

          {/* Quick stat chips */}
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm"
              style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.28)", color: "#7dd3fc" }}>
              <CalendarDays className="h-3.5 w-3.5" />
              {stats.bookings} Bookings
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm"
              style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.28)", color: "#93c5fd" }}>
              <Car className="h-3.5 w-3.5" />
              {stats.rides} Rides
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm"
              style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.28)", color: "#c4b5fd" }}>
              <Heart className="h-3.5 w-3.5" />
              {stats.savedProperties} Saved
            </span>
          </div>
        </div>

        <input ref={avatarFileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" title="Upload profile picture" />
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3 transition-all duration-300">
          <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
          <span className="text-sm font-medium text-green-800">{success}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3 transition-all duration-300">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="text-sm font-medium text-red-800">{error}</span>
        </div>
      )}

      {/* ══════ STATS GRID ══════ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { href: "/account/bookings", icon: CalendarDays, label: "Total Bookings", count: stats.bookings, topColor: "from-blue-500 to-blue-600", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
          { href: "/account/rides", icon: Car, label: "Total Rides", count: stats.rides, topColor: "from-purple-500 to-purple-600", iconBg: "bg-purple-50", iconColor: "text-purple-600" },
          { href: "/account/group-stays", icon: Users, label: "Group Stays", count: stats.groupStays, topColor: "from-orange-500 to-orange-600", iconBg: "bg-orange-50", iconColor: "text-orange-600" },
          { href: "/account/event-plans", icon: ClipboardList, label: "Event Plans", count: stats.eventPlans, topColor: "from-emerald-500 to-emerald-600", iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
          { href: "/account/saved", icon: Heart, label: "Saved Properties", count: stats.savedProperties, topColor: "from-rose-500 to-rose-600", iconBg: "bg-rose-50", iconColor: "text-rose-600" },
        ].map(({ href, icon: Icon, label, count, topColor, iconBg, iconColor }) => (
          <Link key={href} href={href}
            className="group no-underline relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(0,0,0,0.10)] hover:-translate-y-[2px] active:scale-[0.98]">
            {/* Top accent */}
            <div className={`absolute top-0 left-0 right-0 h-[3px] rounded-t-3xl bg-gradient-to-r ${topColor} transition-all duration-300 group-hover:h-1`} />
            <div className="pt-1 flex items-start justify-between">
              <div className={`h-10 w-10 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={2} />
              </div>
              <ArrowRight className="h-4 w-4 text-slate-200 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-extrabold text-slate-900 leading-none">{count || 0}</div>
              <div className="mt-1 text-xs font-medium text-slate-500 leading-tight">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* ══════ PROFILE SECTION ══════ */}
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        {/* Section header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #011a18, #02665e)" }}>
            <User className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Personal Information</h2>
            <p className="text-xs text-slate-500">Your profile details</p>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {/* Name — read only */}
          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3.5 transition-colors hover:bg-slate-50/80">
            <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-[#02665e]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Full Name</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900">
                {form.fullName || form.name || user?.name || 'Not set'}
              </div>
            </div>
          </div>

          {/* Email — read only */}
          <div className="flex items-center gap-4 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3.5 transition-colors hover:bg-slate-50/80">
            <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-[#02665e]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Email Address</div>
              <div className="mt-0.5 text-sm font-semibold text-slate-900 break-all">
                {form.email || user?.email || 'Not provided'}
              </div>
            </div>
          </div>

          {/* Phone — editable */}
          <label className="flex items-center gap-4 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3.5 cursor-text transition-all duration-200 hover:border-teal-200 focus-within:border-teal-300 focus-within:ring-2 focus-within:ring-teal-100">
            <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
              <Phone className="h-5 w-5 text-[#02665e]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Phone</div>
              <input
                className="mt-0.5 text-sm font-semibold text-slate-900 bg-transparent border-none outline-none w-full placeholder:text-slate-300 focus:text-[#02665e] transition-colors"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Add phone number"
              />
            </div>
            <span className="text-[10px] text-teal-500 font-semibold flex-shrink-0">EDIT</span>
          </label>
        </div>

        {/* Save button */}
        <div className="px-6 pb-6">
          <button
            onClick={save}
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl text-white font-semibold text-sm py-3 hover:opacity-90 hover:shadow-md active:scale-[0.99] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #011a18 0%, #02665e 100%)" }}
          >
            {saving ? (
              <><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
            ) : (
              <><Save className="h-4 w-4" />Save Changes</>
            )}
          </button>
        </div>
      </div>

      {/* ══════ REFERRAL CARD ══════ */}
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
        {/* Teal left accent */}
        <div className="flex">
          <div className="w-1 flex-shrink-0 rounded-l-3xl" style={{ background: "linear-gradient(180deg, #5eead4 0%, #02665e 100%)" }} />
          <div className="flex-1 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ccfbf1, #99f6e4)" }}>
                <Share2 className="h-5 w-5 text-[#02665e]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Invite Friends</h3>
                <p className="text-xs text-slate-500">Share your link and earn rewards</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                <input
                  readOnly
                  value={referralLink ?? ''}
                  placeholder="Generating link…"
                  className="flex-1 text-sm text-slate-700 bg-transparent border-none outline-none min-w-0"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  onClick={handleCopy}
                  className="flex-shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-[0.97]"
                  style={copied ? { background: "#d1fae5", color: "#065f46" } : { background: "linear-gradient(135deg, #011a18, #02665e)", color: "white" }}
                >
                  {copied ? <><Check className="h-3.5 w-3.5" />Copied!</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
                </button>
              </div>
              <button
                onClick={handleWhatsApp}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-medium text-sm py-3 hover:bg-slate-100 active:scale-[0.99] transition-all"
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                Share via WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ SECURITY CARD ══════ */}
      <Link
        href="/account/security"
        className="group no-underline relative overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.05)] transition-all duration-200 hover:shadow-[0_6px_32px_rgba(2,102,94,0.12)] hover:-translate-y-[2px] active:scale-[0.99] block"
      >
        {/* Left accent */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-3xl" style={{ background: user?.twoFactorEnabled ? "linear-gradient(180deg, #86efac 0%, #16a34a 100%)" : "linear-gradient(180deg, #fde68a 0%, #f59e0b 100%)" }} />
        <div className="flex items-center gap-4 pl-6 pr-5 py-5">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105"
            style={{ background: "linear-gradient(135deg, #ccfbf1, #99f6e4)" }}>
            <Shield className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-900">Account Security</div>
            <div className="mt-1.5 flex items-center gap-1.5">
              {user?.twoFactorEnabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                  <CheckCircle className="h-3 w-3" />2FA Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
                  <AlertCircle className="h-3 w-3" />2FA Not Enabled
                </span>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">Manage password, 2FA, and sessions</div>
          </div>
          <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-[#02665e] group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
        </div>
      </Link>
    </div>
  );
}
