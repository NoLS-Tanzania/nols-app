"use client";
// AdminPageHeader removed in favor of a centered, compact header for this page
import { Settings } from "lucide-react";
import * as ipaddr from 'ipaddr.js';
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function SystemSettingsPage(){
  interface SystemSettings {
    commissionPercent: number;
    taxPercent: number;
    currency: string;
    invoicePrefix: string;
    receiptPrefix: string;
    emailEnabled: boolean;
    smsEnabled: boolean;
    requireAdmin2FA: boolean;
    minPasswordLength: number;
    sessionIdleMinutes: number;
    supportEmail?: string | null;
    supportPhone?: string | null;
  // ipAllowlist is intentionally not part of SystemSettings here; manage allowlist under Management/Allowlist
    featureFlags?: any;
    notificationTemplates?: any;
    invoiceTemplate?: string;
    payoutCron?: string;
  }

  const [s,setS] = useState<SystemSettings>({
    commissionPercent: 0,
    taxPercent: 0,
    currency: 'TZS',
    invoicePrefix: 'INV-',
    receiptPrefix: 'RCT-',
    emailEnabled: true,
    smsEnabled: false,
    requireAdmin2FA: true,
    minPasswordLength: 10,
    sessionIdleMinutes: 60,
  // ipAllowlist removed from System Settings initial state
  });
  const [loading, setLoading] = useState<boolean>(true);
  // Local-only fields (feature flags / templates) kept in local state; backend integration can be added later
  const [featureFlags, setFeatureFlags] = useState<string>('{}');
  const [notificationTemplates, setNotificationTemplates] = useState<string>('{}');
  const [gatewayProvider, setGatewayProvider] = useState<string>('');
  const [gatewayApiKey, setGatewayApiKey] = useState<string>('');
  const [invoiceTemplate, setInvoiceTemplate] = useState<string>('');
  const [payoutCron, setPayoutCron] = useState<string>('');
  const [invoicePreviewHtml, setInvoicePreviewHtml] = useState<string>('');
  const [bonusOwnerId, setBonusOwnerId] = useState<string>('');
  const [bonusPercentInput, setBonusPercentInput] = useState<number>(0);
  const [bonusPreview, setBonusPreview] = useState<any>(null);
  const [quickIps, setQuickIps] = useState<string>('');
  const [quickSaving, setQuickSaving] = useState<boolean>(false);
  const [quickErrors, setQuickErrors] = useState<string[]>([]);
  // support contact (editable by admin)
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [supportPhone, setSupportPhone] = useState<string>('');

  // parse comma/newline separated entries into trimmed tokens
  const parseIps = (text: string) => {
    return text
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  const isValidIpOrCidr = (s: string) => {
    try{
      if (s.includes('/')){
        const [addr, mask] = s.split('/');
        if (!addr || !mask) return false;
        const parsed = ipaddr.parse(addr);
        // will throw if invalid
        const m = Number(mask);
        if (parsed.kind() === 'ipv4') return Number.isInteger(m) && m >= 0 && m <= 32;
        if (parsed.kind() === 'ipv6') return Number.isInteger(m) && m >= 0 && m <= 128;
        return false;
      } else {
        ipaddr.parse(s);
        return true;
      }
    }catch(e){ return false; }
  };

  const [toast, setToast] = useState<string | null>(null);

  const handleQuickSave = async () => {
    const entries = parseIps(quickIps);
    if (entries.length === 0) return alert('Enter IPs first');
    const invalid = entries.filter(e => !isValidIpOrCidr(e));
    setQuickErrors(invalid);
    if (invalid.length > 0) {
      alert('Some entries are not valid IPs/CIDRs. Please fix them.');
      return;
    }

    try{
      setQuickSaving(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || '') + '/admin/allowlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: JSON.stringify({ ips: entries })
      });
      if(res.ok){ setToast('Allowlist updated'); setQuickIps(''); setQuickErrors([]); setTimeout(()=>setToast(null), 3000); } else { const t = await res.text(); console.error(t); alert('Failed to update allowlist'); }
    }catch(err){ console.error(err); alert('Failed to update allowlist'); }
    finally{ setQuickSaving(false); }
  };

  const load = useCallback(async ()=>{
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (t) api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    try {
      setLoading(true);
      const r = await api.get('/admin/settings');
      if (r?.data) setS(r.data);
    } finally {
      setLoading(false);
    }
  },[]);
  useEffect(()=>{ load(); },[load]);

  // sync some fields from s
  useEffect(()=>{
    if (!s) return;
    setFeatureFlags(JSON.stringify(s.featureFlags ?? {}, null, 2));
    setNotificationTemplates(JSON.stringify(s.notificationTemplates ?? {}, null, 2));
    setGatewayProvider('');
    setGatewayApiKey('');
    setInvoiceTemplate(s.invoiceTemplate ?? '');
    setPayoutCron(s.payoutCron ?? '');
    setSupportEmail(s.supportEmail ?? '');
    setSupportPhone(s.supportPhone ?? '');
  }, [s]);

  // show a subtle loading hint while fetching but keep the form visible

  const saveSystemSettings = async () => {
    // only send fields that exist on SystemSetting model
  const payload: any = {
      commissionPercent: Number(s.commissionPercent ?? 0),
      taxPercent: Number(s.taxPercent ?? 0),
      currency: s.currency || 'TZS',
      invoicePrefix: s.invoicePrefix || 'INV-',
      receiptPrefix: s.receiptPrefix || 'RCT-',
      emailEnabled: Boolean(s.emailEnabled),
      smsEnabled: Boolean(s.smsEnabled),
      requireAdmin2FA: Boolean(s.requireAdmin2FA),
      minPasswordLength: Number(s.minPasswordLength || 10),
  sessionIdleMinutes: Number(s.sessionIdleMinutes || 60),
  supportEmail: supportEmail || s.supportEmail,
  supportPhone: supportPhone || s.supportPhone,
  // ipAllowlist intentionally excluded from System Settings payload
    };
    try {
      await api.put('/admin/settings', payload);
      alert('System settings saved');
      await load();
    } catch (err) {
      console.error(err);
      alert('Failed to save system settings');
    }
  };

  const saveGatewaySettings = async () => {
    // Payment gateway keys should be stored securely on server; placeholder action for now
    alert('Saving gateway settings is not implemented on the backend yet. Please provide a secure endpoint.');
  };

  const testGatewayConnection = async () => {
    // Placeholder: show a fake result or call a dedicated endpoint when available
    setTimeout(()=>{
      const ok = gatewayProvider && gatewayApiKey;
      document.getElementById('gatewayTestResult')!.textContent = ok ? 'Connection OK (simulated)' : 'Missing provider or API key';
    }, 300);
  };

  const saveFlagsAndTemplates = async () => {
    // For now we don't persist feature flags/templates in SystemSetting; backend work needed
    alert('Feature flags & templates saving needs backend support. This is a client-only preview.');
  };

  const saveInvoicingSettings = async () => {
    // Save taxPercent and invoicePrefix (persisted via SystemSetting) and keep invoiceTemplate client-side
    try {
      await api.put('/admin/settings', { taxPercent: Number(s.taxPercent || 0), invoicePrefix: s.invoicePrefix || 'INV-' });
      alert('Invoicing settings saved');
    } catch (err) {
      console.error(err);
      alert('Failed to save invoicing settings');
    }
  };

  const previewBonus = async () => {
    if (!bonusOwnerId) return alert('owner id required');
    try {
      const r = await api.post('/admin/bonuses/grant', { ownerId: Number(bonusOwnerId), bonusPercent: Number(bonusPercentInput) });
      setBonusPreview(r.data);
    } catch (err) {
      console.error(err);
      alert('Failed to preview bonus');
    }
  };

  const grantBonus = async () => {
    if (!bonusOwnerId) return alert('owner id required');
    if (!confirm('Grant bonus to owner? This action will be recorded in the admin audit log.')) return;
    try {
      const r = await api.post('/admin/bonuses/grant', { ownerId: Number(bonusOwnerId), bonusPercent: Number(bonusPercentInput), reason: 'Manual grant from settings UI' });
      setBonusPreview(r.data);
      alert('Bonus grant recorded (audit only)');
    } catch (err) {
      console.error(err);
      alert('Failed to grant bonus');
    }
  };

  const previewInvoice = async () => {
    try {
      const r = await api.post('/admin/settings/numbering/preview', { type: 'invoice' });
      const sample = r.data?.sample || '';
      // simple preview using invoiceTemplate + sample number
      setInvoicePreviewHtml((invoiceTemplate || '<div>Invoice {{invoiceNumber}}</div>').replace(/{{\s*invoiceNumber\s*}}/g, sample));
    } catch (err) {
      console.error(err);
      alert('Failed to generate preview');
    }
  };

  const updatePayoutCron = async () => {
    alert('Saving cron expressions requires backend support; not implemented yet.');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col items-center text-center">
        <div className="rounded-full bg-blue-50 p-3 inline-flex items-center justify-center">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
        <h1 className="mt-3 text-2xl font-semibold">System Settings</h1>
        <p className="text-sm text-gray-500">Edit global platform settings</p>
        {loading && <div className="mt-2 text-sm text-gray-500">Loading...</div>}
        {toast && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-green-600 text-white px-4 py-2 rounded shadow">{toast}</div>
          </div>
        )}
      </div>

  <div className="bg-white rounded-lg shadow-md p-6">
        {/* main settings card content */}

        <div className="space-y-6">
          {/* Payment Settings */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="commissionPercent" className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
                <input id="commissionPercent" type="number" placeholder="Commission rate (%)" value={s?.commissionPercent ?? 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg" onChange={e=>setS((prev: any)=>({...(prev||{}), commissionPercent: Number(e.target.value)}))} />
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select id="currency" className="w-full px-3 py-2 border border-gray-300 rounded-lg" value={s?.currency||'TZS'} onChange={e=>setS((prev: any)=>({...(prev||{}), currency: e.target.value}))}>
                  <option value="USD">USD - US Dollar</option>
                  <option value="TZS">TZS - Tanzanian Shilling</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>

              <div className="md:col-span-2 mt-4 border-t pt-4">
                <h4 className="text-md font-semibold mb-2">Payment Gateway</h4>
                <label htmlFor="gatewayProvider" className="text-sm text-gray-600">Provider</label>
                <input id="gatewayProvider" className="w-full mt-1 px-3 py-2 border rounded" placeholder="stripe|paypal" value={gatewayProvider} onChange={e=>setGatewayProvider(e.target.value)} />
                <label htmlFor="gatewayApiKey" className="text-sm text-gray-600 mt-2">API Key</label>
                <input id="gatewayApiKey" className="w-full mt-1 px-3 py-2 border rounded" placeholder="sk_test_..." value={gatewayApiKey} onChange={e=>setGatewayApiKey(e.target.value)} />
                <div className="mt-3 flex gap-2">
                  <button onClick={testGatewayConnection} className="px-3 py-2 bg-indigo-600 text-white rounded">Test Connection</button>
                  <button onClick={saveGatewaySettings} className="px-3 py-2 bg-green-600 text-white rounded">Save Gateway</button>
                </div>
                <div id="gatewayTestResult" className="mt-3 text-sm text-gray-700"></div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" checked={Boolean(s.emailEnabled)} className="mr-2" onChange={e=>setS({...s, emailEnabled: e.target.checked})} />
                <span className="text-sm text-gray-700">Email notifications for new invoices</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" checked={Boolean(s.smsEnabled)} className="mr-2" onChange={e=>setS({...s, smsEnabled: e.target.checked})} />
                <span className="text-sm text-gray-700">SMS alerts for urgent matters</span>
              </label>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Support email</label>
                  <input className="w-full mt-1 px-3 py-2 border rounded" value={supportEmail} onChange={e=>setSupportEmail(e.target.value)} placeholder="support@nolsapp.com" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Support phone</label>
                  <input className="w-full mt-1 px-3 py-2 border rounded" value={supportPhone} onChange={e=>setSupportPhone(e.target.value)} placeholder="+255 736 766 726" />
                </div>
              </div>
              <label className="flex items-center">
                <input type="checkbox" className="mr-2" defaultChecked={false} />
                <span className="text-sm text-gray-700">Weekly summary reports</span>
              </label>

              <div className="mt-4 border-t pt-4">
                <h4 className="text-md font-semibold mb-2">Feature Flags & Notification Templates</h4>
                <label htmlFor="featureFlags" className="text-sm text-gray-600">Feature Flags (JSON)</label>
                <textarea id="featureFlags" className="w-full mt-1 px-3 py-2 border rounded h-28" value={featureFlags} onChange={e=>setFeatureFlags(e.target.value)} placeholder='{"new_ui": true}' />
                <label htmlFor="notificationTemplates" className="text-sm text-gray-600 mt-2">Notification Templates (JSON)</label>
                <textarea id="notificationTemplates" className="w-full mt-1 px-3 py-2 border rounded h-28" value={notificationTemplates} onChange={e=>setNotificationTemplates(e.target.value)} placeholder='{"owner_payout": "Your payout of {{amount}} was processed"}' />
                <div className="mt-3 flex gap-2">
                  <button onClick={saveFlagsAndTemplates} className="px-3 py-2 bg-green-600 text-white rounded">Save Flags & Templates</button>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Sessions & Tax & Invoicing etc. */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security & Sessions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center gap-3"><input id="admin2fa" type="checkbox" checked={Boolean(s?.requireAdmin2FA)} onChange={e=>setS(prev=>({...(prev||{}), requireAdmin2FA: e.target.checked}))} /> <span className="text-sm text-gray-700">Require 2FA for admin users</span></label>
              <div>
                <label htmlFor="sessionTtl" className="text-sm text-gray-600 mt-2">Session TTL (minutes)</label>
                <input id="sessionTtl" type="number" min={5} className="w-32 mt-1 px-3 py-2 border rounded" value={s?.sessionIdleMinutes ?? 60} onChange={e=>setS(prev=>({...(prev||{}), sessionIdleMinutes: Number(e.target.value)}))} />
              </div>
            </div>

            <div className="mt-6 border-t pt-4">
              <h4 className="text-md font-semibold mb-2">Tax & Invoicing</h4>
              <label htmlFor="taxRate" className="text-sm text-gray-600">Tax Rate (%)</label>
              <input id="taxRate" type="number" min={0} step="0.01" className="w-full mt-1 px-3 py-2 border rounded" value={s?.taxPercent ?? 0} onChange={e=>setS(prev=>({...(prev||{}), taxPercent: Number(e.target.value)}))} />
              <label htmlFor="invoicePrefix" className="text-sm text-gray-600 mt-2">Invoice Prefix</label>
              <input id="invoicePrefix" className="w-full mt-1 px-3 py-2 border rounded" value={s?.invoicePrefix || 'INV-'} onChange={e=>setS(prev=>({...(prev||{}), invoicePrefix: e.target.value}))} />
              <label htmlFor="invoiceTemplate" className="text-sm text-gray-600 mt-2">Invoice Template (simple HTML)</label>
              <textarea id="invoiceTemplate" className="w-full mt-1 px-3 py-2 border rounded h-28" value={invoiceTemplate} onChange={e=>setInvoiceTemplate(e.target.value)} placeholder="<h1>Invoice {{invoiceNumber}}</h1>" />
              <div className="mt-3 flex gap-2">
                <button onClick={saveInvoicingSettings} className="px-3 py-2 bg-green-600 text-white rounded">Save Invoicing</button>
                <button onClick={previewInvoice} className="px-3 py-2 bg-gray-200 rounded">Preview Invoice</button>
              </div>
              <div id="invoicePreviewArea" className="mt-3 text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-64 overflow-auto" dangerouslySetInnerHTML={{__html: invoicePreviewHtml || ''}} />
            </div>
          </div>

          {/* IP Allowlist (informational; managed under Management/Allowlist) */}
          <div className="border rounded-lg p-6">
            <h4 className="text-md font-semibold mb-2">IP Allowlist</h4>
            <p className="text-sm text-gray-700">Manage IP addresses or CIDR ranges (comma or newline separated) that are allowed to access admin tools. Leave blank to disable the allowlist.</p>
            <p className="text-sm text-gray-500 mt-2 font-medium">Allowed IPs / CIDRs</p>

            <textarea
              id="ipAllowlistQuick"
              rows={6}
              className="mt-2 block w-full rounded-md border-gray-200 shadow-sm"
              placeholder="e.g. 203.0.113.5, 198.51.100.0/24"
              value={quickIps}
              onChange={e=>setQuickIps(e.target.value)}
            />

            <div className="mt-3 flex gap-2">
              <button onClick={handleQuickSave} className={`px-3 py-2 rounded ${quickSaving ? 'bg-gray-300 text-gray-700' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                {quickSaving ? 'Saving...' : 'Save to Allowlist'}
              </button>

              <button onClick={()=>{ navigator.clipboard?.writeText(quickIps || '') }} className="px-3 py-2 bg-gray-200 rounded">Copy</button>

              <a href="/admin/management/allowlist" className="px-3 py-2 bg-indigo-600 text-white rounded">Open Allowlist</a>
            </div>

            {quickErrors.length > 0 && (
              <div className="mt-2 text-sm text-red-600">
                <div>Invalid entries:</div>
                <ul className="list-disc ml-5">
                  {quickErrors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Scheduling */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduling</h3>
            <label htmlFor="payoutCron" className="text-sm text-gray-600">Cron Expression</label>
            <input id="payoutCron" className="w-full mt-1 px-3 py-2 border rounded" placeholder="e.g. 0 2 1 * *" value={payoutCron} onChange={e=>setPayoutCron(e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">Use cron format. Default: run 02:00 on the 1st of each month.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={updatePayoutCron} className="px-3 py-2 bg-blue-600 text-white rounded">Save Cron & Apply</button>
              <button onClick={()=>alert('Preview not implemented')} className="px-3 py-2 bg-yellow-500 text-white rounded">Run Preview</button>
              <button onClick={()=>alert('Execute not implemented')} className="px-3 py-2 bg-green-600 text-white rounded">Execute Now</button>
            </div>
            <pre id="payoutCronResult" className="mt-3 text-xs text-gray-700 bg-gray-50 p-3 rounded max-h-48 overflow-auto" />
          </div>

          {/* Bonus Settings (UI only) */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bonus Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label htmlFor="systemBonusPercent" className="block text-sm font-medium text-gray-700 mb-2">Default Bonus (%)</label>
                <input id="systemBonusPercent" type="number" min={0} step="0.1" defaultValue={0} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label htmlFor="commissionMin" className="block text-sm font-medium text-gray-700 mb-2">Commission Min (%)</label>
                <input id="commissionMin" type="number" min={0} step="0.1" defaultValue={9} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label htmlFor="commissionMax" className="block text-sm font-medium text-gray-700 mb-2">Commission Max (%)</label>
                <input id="commissionMax" type="number" min={0} step="0.1" defaultValue={12} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-md font-semibold">Recent Bonuses</h4>
                <div>
                  <button onClick={()=>alert('Not implemented')} className="text-sm px-3 py-1 bg-gray-100 rounded">Refresh</button>
                </div>
              </div>
              <div id="recentBonusesList" className="mt-3 space-y-2 text-sm text-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div>
                    <label htmlFor="bonusOwnerId" className="text-sm text-gray-600">Owner ID</label>
                    <input id="bonusOwnerId" className="w-full mt-1 px-3 py-2 border rounded" value={bonusOwnerId} onChange={e=>setBonusOwnerId(e.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="bonusPercentInput" className="text-sm text-gray-600">Bonus (%)</label>
                    <input id="bonusPercentInput" type="number" className="w-full mt-1 px-3 py-2 border rounded" value={bonusPercentInput} onChange={e=>setBonusPercentInput(Number(e.target.value))} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={previewBonus} className="px-3 py-2 bg-gray-200 rounded">Preview</button>
                    <button onClick={grantBonus} className="px-3 py-2 bg-green-600 text-white rounded">Grant</button>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Preview shows computed bonus based on owner paid invoices in the last 30 days.</div>
                  </div>
                </div>
                {bonusPreview && (
                  <pre className="mt-3 bg-gray-50 p-3 rounded text-sm overflow-auto">{JSON.stringify(bonusPreview, null, 2)}</pre>
                )}
              </div>
            </div>
          </div>

        </div>

        <div className="mt-6">
          <button onClick={saveSystemSettings} disabled={loading} className={`px-6 py-2 rounded-lg ${loading ? 'bg-gray-300 text-gray-700' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>Save Settings</button>
        </div>
      </div>
    </div>
  );
}
