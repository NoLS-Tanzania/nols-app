"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function PublicProfile() {
  const [me, setMe] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    const t = localStorage.getItem("token");
    if (!t) {
      if (typeof window !== 'undefined') window.location.href = '/login';
      return;
    }
    api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.get('/account/me');
        if (!mounted) return;
        setMe(r.data);
        setForm(r.data);
      } catch (err: any) {
        console.error('Failed to load profile', err);
        if (mounted) setError(String(err?.message ?? err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // referral link best-effort
  useEffect(() => {
    if (!me) return;
    let mounted = true;
    (async () => {
      try {
        const r = await api.get('/account/referral');
        if (!mounted) return;
        if (r?.data?.link) { setReferralLink(String(r.data.link)); return; }
        if (r?.data?.code) { setReferralLink(`${window.location.origin}/r/${encodeURIComponent(String(r.data.code))}`); return; }
      } catch (e) {
        // ignore
      }
      try {
        const id = (me as any).id || (me as any)._id || (me as any).email || String(Math.random()).slice(2,10);
        if (mounted) setReferralLink(`${window.location.origin}/r/${encodeURIComponent(String(id))}`);
      } catch (e) {
        if (mounted) setReferralLink(null);
      }
    })();
    return () => { mounted = false; };
  }, [me]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { fullName: form.fullName, phone: form.phone, avatarUrl: form.avatarUrl };
      await api.put('/account/profile', payload);
      alert('Saved');
      setMe({ ...(me ?? {}), ...payload });
    } catch (err: any) {
      console.error('Failed to save profile', err);
      alert('Could not save profile: ' + String(err?.message ?? err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading…</div>;
  if (error) return <div className="text-rose-600">Error loading profile: {error}</div>;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="border rounded-lg p-6 bg-white shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gray-100 overflow-hidden border flex items-center justify-center">
            {form.avatarUrl ? (
              // Next/Image expects a valid src; in many cases avatarUrl will be a data URL or absolute URL
              <Image src={form.avatarUrl} alt="avatar" width={64} height={64} className="object-cover" />
            ) : (
              <div className="text-sm opacity-70">No avatar</div>
            )}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{form.fullName || 'Your profile'}</h1>
            <div className="text-sm opacity-70">{form.email}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm grid gap-1">
            <span className="opacity-70">Full name</span>
            <input className="border rounded-xl px-3 py-2" value={form.fullName||''} onChange={e=>setForm({...form, fullName: e.target.value})} />
          </label>

          <label className="text-sm grid gap-1">
            <span className="opacity-70">Phone</span>
            <input className="border rounded-xl px-3 py-2" value={form.phone||''} onChange={e=>setForm({...form, phone: e.target.value})} />
          </label>
        </div>

        <div className="pt-4 border-t">
          <h2 className="text-lg font-medium">Invite Friends</h2>
          <div className="py-3 space-y-2">
            <div className="text-sm opacity-80">Share your referral link and get rewards when friends sign up.</div>
            <div className="flex gap-2 items-center">
              <input readOnly value={referralLink ?? ''} placeholder="Generating link…" className="flex-1 border rounded-xl px-3 py-2 bg-gray-50" onFocus={(e)=>e.currentTarget.select()} />
              <button className="px-3 py-2 rounded-xl border" onClick={async ()=>{
                if (!referralLink) return alert('No referral link available');
                try { await navigator.clipboard.writeText(referralLink); setCopied(true); setTimeout(()=>setCopied(false),2000); } catch(e){ alert('Could not copy to clipboard'); }
              }}>{copied ? 'Copied' : 'Copy'}</button>
              <button className="px-3 py-2 rounded-xl border" onClick={()=>{
                if (!referralLink) return alert('No referral link available');
                const subject = encodeURIComponent('Join me on NOLS');
                const body = encodeURIComponent(`Hi — join using my referral link: ${referralLink}`);
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
              }}>Email</button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className={`px-3 py-2 rounded-xl border ${saving ? 'opacity-80 cursor-wait' : ''}`} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="px-3 py-2 rounded-xl border" onClick={()=>{ localStorage.removeItem('token'); window.location.href = '/login'; }}>Logout</button>
        </div>
      </div>
    </div>
  );
}
