"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { User, Mail, Phone, CalendarDays, Car, Users, ArrowRight, ClipboardList, Shield, Settings, CheckCircle, AlertCircle, Share2, Copy, Check, Upload, Save } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const api = axios.create({ baseURL: "", withCredentials: true });

function SkeletonLine({ w = "w-full", className = "" }: { w?: string; className?: string }) {
  return <div className={`h-4 ${w} rounded-full bg-slate-200/80 animate-pulse ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="h-12 w-12 rounded-2xl bg-slate-200/80 animate-pulse" />
          <div className="flex-1">
            <SkeletonLine w="w-12" />
            <SkeletonLine w="w-24" className="mt-2" />
          </div>
        </div>
        <div className="h-5 w-5 rounded-full bg-slate-200/80 animate-pulse" />
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
  const [stats, setStats] = useState<{ bookings: number; rides: number; groupStays: number; eventPlans: number }>({
    bookings: 0,
    rides: 0,
    groupStays: 0,
    eventPlans: 0,
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
      try {
        if (typeof window !== "undefined") window.location.href = "/login";
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

  const handleEmail = () => {
    if (!referralLink) {
      setError('No referral link available');
      setTimeout(() => setError(null), 3000);
      return;
    }
    const subject = encodeURIComponent('Join me on NoLSAF!');
    const body = encodeURIComponent(`Join me on NoLSAF! Use my referral link: ${referralLink}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="text-center">
          <div className="mx-auto max-w-md">
            <div className="h-8 w-56 mx-auto rounded-full bg-slate-200/80 animate-pulse" />
            <div className="mt-3 h-4 w-72 mx-auto rounded-full bg-slate-200/70 animate-pulse" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-200/80 animate-pulse" />
              <div className="flex-1">
                <SkeletonLine w="w-48" />
                <SkeletonLine w="w-24" className="mt-2" />
              </div>
            </div>
            <div className="h-9 w-20 rounded-xl bg-slate-200/80 animate-pulse" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-slate-200/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-300/80 animate-pulse" />
                  <div className="flex-1">
                    <SkeletonLine w="w-24" />
                    <SkeletonLine w="w-32" className="mt-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
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
      {/* Page Header Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div 
            className={`h-16 w-16 rounded-full ${(form.avatarUrl || user?.avatarUrl) ? 'bg-white border-2 border-slate-200' : 'bg-gradient-to-br from-[#02665e]/10 to-[#014d47]/10'} flex items-center justify-center mb-4 cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-md group relative overflow-hidden`}
            onClick={handleAvatarClick}
          >
            {form.avatarUrl || user?.avatarUrl ? (
              // Use regular img for blob/data URLs, Next.js Image for http(s) URLs
              /^https?:\/\//i.test(form.avatarUrl || user?.avatarUrl || '') ? (
                <Image
                  src={form.avatarUrl || user?.avatarUrl}
                  alt={form.fullName || form.name || "Profile"}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.avatarUrl || user?.avatarUrl}
                  alt={form.fullName || form.name || "Profile"}
                  className="w-full h-full object-cover rounded-full"
                />
              )
            ) : (
              <User className="h-8 w-8 text-[#02665e] group-hover:text-[#014d47] transition-colors" />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-full">
              <Upload className="h-5 w-5 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your personal information and preferences</p>
          {!(form.avatarUrl || user?.avatarUrl) && (
            <p className="text-xs text-slate-500 mt-2">Click on the icon above to upload your profile picture</p>
          )}
          <input
            ref={avatarFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
            title="Upload profile picture"
          />
        </div>
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

      {/* TOP SECTION: Quick Stats - Overview at a glance */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link
          href="/account/bookings"
          className="group no-underline rounded-2xl border border-[#02665e]/20 bg-gradient-to-br from-[#02665e]/5 to-[#014d47]/5 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-[2px] hover:border-[#02665e]/30 hover:from-[#02665e]/10 hover:to-[#014d47]/10 active:scale-[0.99] relative overflow-hidden"
        >
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 group-hover:h-1.5"></div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <CalendarDays className="h-6 w-6 text-[#02665e] flex-shrink-0 transition-transform duration-200 group-hover:scale-110" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-extrabold text-slate-900 leading-none">{stats.bookings || 0}</div>
                <div className="mt-1.5 text-sm font-medium text-slate-600">Total Bookings</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-[#02665e] group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
          </div>
        </Link>

        <Link
          href="/account/rides"
          className="group no-underline rounded-2xl border border-[#02665e]/20 bg-gradient-to-br from-[#02665e]/5 to-[#014d47]/5 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-[2px] hover:border-[#02665e]/30 hover:from-[#02665e]/10 hover:to-[#014d47]/10 active:scale-[0.99] relative overflow-hidden"
        >
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-300 group-hover:h-1.5"></div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Car className="h-6 w-6 text-[#02665e] flex-shrink-0 transition-transform duration-200 group-hover:scale-110" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-extrabold text-slate-900 leading-none">{stats.rides || 0}</div>
                <div className="mt-1.5 text-sm font-medium text-slate-600">Total Rides</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-[#02665e] group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
          </div>
        </Link>

        <Link
          href="/account/group-stays"
          className="group no-underline rounded-2xl border border-[#02665e]/20 bg-gradient-to-br from-[#02665e]/5 to-[#014d47]/5 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-[2px] hover:border-[#02665e]/30 hover:from-[#02665e]/10 hover:to-[#014d47]/10 active:scale-[0.99] relative overflow-hidden"
        >
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600 transition-all duration-300 group-hover:h-1.5"></div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Users className="h-6 w-6 text-[#02665e] flex-shrink-0 transition-transform duration-200 group-hover:scale-110" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-extrabold text-slate-900 leading-none">{stats.groupStays || 0}</div>
                <div className="mt-1.5 text-sm font-medium text-slate-600">Group Stays</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-[#02665e] group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
          </div>
        </Link>

        <Link
          href="/account/event-plans"
          className="group no-underline rounded-2xl border border-[#02665e]/20 bg-gradient-to-br from-[#02665e]/5 to-[#014d47]/5 p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-[2px] hover:border-[#02665e]/30 hover:from-[#02665e]/10 hover:to-[#014d47]/10 active:scale-[0.99] relative overflow-hidden"
        >
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300 group-hover:h-1.5"></div>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <ClipboardList className="h-6 w-6 text-[#02665e] flex-shrink-0 transition-transform duration-200 group-hover:scale-110" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                <div className="text-2xl font-extrabold text-slate-900 leading-none">{stats.eventPlans || 0}</div>
                <div className="mt-1.5 text-sm font-medium text-slate-600">Event Plans</div>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-[#02665e] group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
          </div>
        </Link>
      </div>

      {/* MIDDLE SECTION: Profile Card with Editable Fields - Main Content */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md">
        <div className="p-6 sm:p-8">
          {/* Profile Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {/* Name Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110">
                  <User className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-500">Full Name</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900 break-words">
                    {form.fullName || form.name || user?.name || 'Not set'}
                  </div>
                </div>
              </div>
            </div>

            {/* Email Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110">
                  <Mail className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-slate-500">Email Address</div>
                  <div className="mt-0.5 text-sm font-semibold text-slate-900 break-all">
                    {form.email || user?.email || 'Not provided'}
                  </div>
                </div>
              </div>
            </div>

            {/* Phone Card */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all duration-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm">
              <label className="text-sm grid gap-2 cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110">
                    <Phone className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-500">Phone</div>
                    <input
                      className="mt-0.5 text-sm font-semibold text-slate-900 bg-transparent border-none outline-none w-full focus:text-[#02665e] transition-colors"
                      value={form.phone || ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="Not set"
                    />
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Referral Section */}
          <div className="pt-6 border-t border-slate-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Share2 className="h-5 w-5 text-[#02665e]" />
                Invite Friends
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                Share your referral link and get rewards when friends sign up.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm grid gap-2">
                <span className="font-medium text-slate-700 flex items-center gap-2">
                  <Share2 className="h-4 w-4 text-[#02665e]" />
                  Referral Link
                </span>
                <input
                  readOnly
                  value={referralLink ?? ''}
                  placeholder="Generating link…"
                  className="border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50/50 focus:border-[#02665e]/50 focus:outline-none focus:ring-1 focus:ring-[#02665e]/20 focus:bg-white hover:border-slate-300 hover:bg-white transition-all duration-300 ease-out"
                  onFocus={(e) => e.currentTarget.select()}
                />
              </label>

              <div className="flex flex-col justify-end gap-2">
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="group inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-[#02665e] hover:text-[#02665e] active:scale-[0.98] transition-all duration-200 flex-1"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleEmail}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-[#02665e] hover:text-[#02665e] active:scale-[0.98] transition-all duration-200 flex-1"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <button
              onClick={save}
              disabled={saving}
              className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#02665e] text-white font-semibold text-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#02665e]"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* BOTTOM SECTION: Account Security & Quick Actions - Settings & Secondary Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Account Security Card */}
        <Link
          href="/account/security"
          className="group no-underline rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-[2px] hover:border-[#02665e]/20 active:scale-[0.99]"
        >
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#02665e]/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 group-hover:bg-[#02665e]/15 flex-shrink-0">
              <Shield className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">Account Security</div>
              <div className="mt-2 flex items-center gap-2">
                {user?.twoFactorEnabled ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-green-700">2FA Enabled</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span className="text-xs font-medium text-amber-700">2FA Not Enabled</span>
                  </>
                )}
              </div>
              <div className="mt-2 text-xs text-slate-600">Manage password, 2FA, and sessions</div>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-[#02665e] group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
          </div>
        </Link>

        {/* Quick Actions Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
              <Settings className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 mb-3">Quick Actions</div>
              <div className="space-y-2">
                <Link
                  href="/account/security"
                  className="block text-xs text-[#02665e] hover:text-[#014d47] hover:underline transition-colors"
                >
                  Security Settings
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
