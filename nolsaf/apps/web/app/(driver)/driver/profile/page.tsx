"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function DriverProfile() {
  const [form, setForm] = useState<any>({});
  const [me, setMe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<any[] | null>(null);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const t = localStorage.getItem("token");
    const isDev = process.env.NODE_ENV !== 'production';
    const demoMode = !t && isDev;
    if (demoMode) {
      setForm({
        fullName: 'Demo Driver',
        email: 'driver@example.com',
        phone: '+255700000001',
        region: 'Dar es Salaam',
        district: 'CBD',
        nationality: 'Tanzanian',
        timezone: 'Africa/Dar_es_Salaam',
        avatarUrl: '',
        dateOfBirth: '1990-01-01',
        gender: 'male',
      });
      setLoading(false);
      return;
    }
    if (!t) {
      if (typeof window !== 'undefined') window.location.href = '/login';
      return;
    }
    api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await api.get("/account/me");
        if (!mounted) return;
        setForm(r.data);
        setMe(r.data);
        try { (window as any).ME = r.data; } catch (e) { /* ignore */ }
        // fetch payment methods (best-effort)
        try {
          setLoadingPaymentMethods(true);
          const pm = await api.get('/account/payment-methods');
          if (!mounted) return;
          setPaymentMethods(pm.data?.methods ?? null);
          // attach payout data to form if present (for editing payouts inline)
          if (pm.data?.payout) setForm((prev:any)=>({ ...prev, ...pm.data.payout }));
        } catch (e) {
          // ignore payment-methods fetch errors
        } finally {
          if (mounted) setLoadingPaymentMethods(false);
        }
      } catch (err: any) {
        console.error('Failed to load profile', err);
        if (mounted) setError(String(err?.message ?? err));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload: any = {
        fullName: form.fullName,
        phone: form.phone,
        nationality: form.nationality,
        avatarUrl: form.avatarUrl,
        timezone: form.timezone,
      };
      // include optional driver fields
      if (typeof form.dateOfBirth !== 'undefined') payload.dateOfBirth = form.dateOfBirth;
      if (typeof form.gender !== 'undefined') payload.gender = form.gender;

      await api.put("/account/profile", payload);
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
          await api.put('/account/payouts', payoutPayload);
        }
      } catch (e) {
        // ignore payout save errors
        console.warn('Failed to save payout details', e);
      }
      alert("Saved");
      // update local `me` shortcut and global window.ME
      try {
        const updatedMe = { ...(me ?? {}), ...payload, bankAccountName: form.bankAccountName, bankName: form.bankName, bankAccountNumber: form.bankAccountNumber, bankBranch: form.bankBranch, mobileMoneyProvider: form.mobileMoneyProvider, mobileMoneyNumber: form.mobileMoneyNumber, payoutPreferred: form.payoutPreferred };
        setMe(updatedMe);
        try { (window as any).ME = updatedMe; } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
    } catch (err: any) {
      console.error('Failed to save profile', err);
      alert('Could not save profile: ' + String(err?.message ?? err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-rose-600">Error loading profile: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="border rounded-lg p-6 bg-white shadow-sm space-y-4">
        <h1 className="text-2xl font-semibold mb-6">Your Profile</h1>
        <div className="grid md:grid-cols-2 gap-3">
        <Input label="Full name" value={form.fullName||""} onChange={v=>setForm({...form, fullName:v})}/>
        <Input label="Email" value={form.email||""} onChange={v=>setForm({...form, email:v})} disabled />
        <Input label="Phone" value={form.phone||""} onChange={v=>setForm({...form, phone:v})}/>
        <Input label="Region" value={form.region||""} onChange={v=>setForm({...form, region:v})}/>
        <Input label="District" value={form.district||""} onChange={v=>setForm({...form, district:v})}/>
        <Input label="Nationality" value={form.nationality||""} onChange={v=>setForm({...form, nationality:v})}/>
        <Input label="Timezone" value={form.timezone||""} onChange={v=>setForm({...form, timezone:v})}/>

        <label className="text-sm grid gap-1">
          <span className="opacity-70">Date of birth</span>
          <input className="border rounded-xl px-3 py-2" type="date" value={form.dateOfBirth||""} onChange={e=>setForm({...form, dateOfBirth: e.target.value})} />
        </label>

        <label className="text-sm grid gap-1">
          <span className="opacity-70">Gender</span>
          <select className="border rounded-xl px-3 py-2" value={form.gender||""} onChange={e=>setForm({...form, gender: e.target.value})}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </label>

        <label className="text-sm grid gap-1">
          <span className="opacity-70">Avatar</span>
          <div className="flex items-center gap-3">
            <input
              type="file"
              id="avatarInput"
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
            />
            {form.avatarUrl ? (
              <Image src={form.avatarUrl} alt="avatar" width={48} height={48} className="rounded-full object-cover border" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center border">No avatar</div>
            )}
          </div>
        </label>
      </div>

      <div className="pt-6 border-t">
        <h2 className="text-lg font-medium">Payment Methods</h2>
        {loadingPaymentMethods ? (
          <div className="py-4">Loading payment methods…</div>
        ) : (
          <div className="space-y-3 py-4">
            {/* Payout details from user record */}
            {(form.bankAccountNumber || form.mobileMoneyNumber || form.bankName) ? (
              <div className="p-3 border rounded-lg">
                <div className="font-medium">Saved payout details</div>
                {form.bankName && (
                  <div className="text-sm">Bank: {form.bankName} — Account: {maskAccount(form.bankAccountNumber)}</div>
                )}
                {form.mobileMoneyProvider && form.mobileMoneyNumber && (
                  <div className="text-sm">Mobile money ({form.mobileMoneyProvider}): {maskPhone(form.mobileMoneyNumber)}</div>
                )}
                {form.payoutPreferred && <div className="text-sm opacity-70">Preferred: {form.payoutPreferred}</div>}
              </div>
            ) : (
              <div className="p-3 text-sm opacity-70">No saved payout details.</div>
            )}

            {/* Recent payment methods used for payments */}
            <div>
              <div className="font-medium">Recent payment sources</div>
              {(!paymentMethods || paymentMethods.length === 0) ? (
                <div className="text-sm opacity-70 py-2">No recent payment methods found.</div>
              ) : (
                <div className="space-y-2 py-2">
                  {paymentMethods.map((m:any, i:number) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <div className="text-sm">{String(m.method || m.ref || 'Unknown').toUpperCase()}</div>
                        {m.ref && <div className="text-xs opacity-70">Ref: {maskRef(String(m.ref))}</div>}
                      </div>
                      <div className="text-xs opacity-60">{m.paidAt ? new Date(m.paidAt).toLocaleDateString() : ''}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          className={`px-3 py-2 rounded-xl border ${saving ? 'opacity-80 cursor-wait' : ''}`}
          onClick={save}
          disabled={saving}
          aria-live="polite"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        
        <button className="px-3 py-2 rounded-xl border" onClick={() => { window.location.href = '/driver/security'; }}>Change password</button>
        <button className="px-3 py-2 rounded-xl border" onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}>Logout</button>
        <button
          className="px-3 py-2 rounded-xl border text-white bg-rose-600 hover:bg-rose-700"
          onClick={async () => {
            const ok = confirm('Are you sure you want to delete your account? This is irreversible.');
            if (!ok) return;
            try {
              const t = localStorage.getItem('token');
              if (!t) { window.location.href = '/login'; return; }
              api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
              await api.delete('/account');
              // clear local session and redirect to goodbye/login
              localStorage.removeItem('token');
              alert('Account deleted');
              window.location.href = '/';
            } catch (err: any) {
              console.error('Failed to delete account', err);
              alert('Could not delete account: ' + String(err?.message ?? err));
            }
          }}
        >
          Delete Account
        </button>
      </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, disabled=false, type = "text" }:{label:string; value:string; onChange:(v:string)=>void; disabled?:boolean; type?:string}) {
  return <label className="text-sm grid gap-1">
    <span className="opacity-70">{label}</span>
    <input className="border rounded-xl px-3 py-2" value={value} onChange={e=>onChange(e.target.value)} disabled={disabled} type={type} />
  </label>;
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
