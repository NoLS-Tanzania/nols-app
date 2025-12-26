"use client";
// AdminPageHeader removed in favor of a centered, compact header for this page
import { Settings } from "lucide-react";
import axios from "axios";
import { useCallback, useEffect, useState } from "react";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

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
  const [invoiceTemplate, setInvoiceTemplate] = useState<string>('');
  const [payoutCron, setPayoutCron] = useState<string>('');
  const [invoicePreviewHtml, setInvoicePreviewHtml] = useState<string>('');
  const [bonusOwnerId, setBonusOwnerId] = useState<string>('');
  const [bonusPercentInput, setBonusPercentInput] = useState<number>(0);
  const [bonusPreview, setBonusPreview] = useState<any>(null);
  // support contact (editable by admin)
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [supportPhone, setSupportPhone] = useState<string>('');

  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async ()=>{
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
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Settings className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            System Settings
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Edit global platform settings
          </p>
          {loading && <div className="mt-2 text-sm text-gray-500">Loading...</div>}
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">{toast}</div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        {/* main settings card content */}

        <div className="space-y-6">
          {/* Payment Settings */}
          <div className="border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="commissionPercent" className="block text-sm font-medium text-gray-700 mb-2">Commission Rate (%)</label>
                <input id="commissionPercent" type="number" placeholder="Commission rate (%)" value={s?.commissionPercent ?? 0} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none" onChange={e=>setS((prev: any)=>({...(prev||{}), commissionPercent: Number(e.target.value)}))} />
              </div>
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                <select id="currency" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none" value={s?.currency||'TZS'} onChange={e=>setS((prev: any)=>({...(prev||{}), currency: e.target.value}))}>
                  <option value="USD">USD - US Dollar</option>
                  <option value="TZS">TZS - Tanzanian Shilling</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">Email notifications for new invoices</span>
                  <span className="text-xs text-gray-500 mt-1">Enable email notifications when new invoices are created</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={Boolean(s.emailEnabled)} 
                    className="sr-only peer" 
                    onChange={e=>setS({...s, emailEnabled: e.target.checked})} 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#02665e] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#02665e]"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">SMS alerts for urgent matters</span>
                  <span className="text-xs text-gray-500 mt-1">Enable SMS notifications for urgent system alerts</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={Boolean(s.smsEnabled)} 
                    className="sr-only peer" 
                    onChange={e=>setS({...s, smsEnabled: e.target.checked})} 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#02665e] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#02665e]"></div>
                </label>
              </div>
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
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">Weekly summary reports</span>
                  <span className="text-xs text-gray-500 mt-1">Receive weekly email summaries of platform activity</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    defaultChecked={false}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#02665e] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#02665e]"></div>
                </label>
              </div>

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
          <div className="border border-gray-200 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Security & Sessions</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">Require 2FA for admin users</span>
                  <span className="text-xs text-gray-500 mt-1">Enforce two-factor authentication for all admin accounts</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    id="admin2fa"
                    type="checkbox" 
                    checked={Boolean(s?.requireAdmin2FA)} 
                    className="sr-only peer" 
                    onChange={e=>setS(prev=>({...(prev||{}), requireAdmin2FA: e.target.checked}))} 
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#02665e] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#02665e]"></div>
                </label>
              </div>
              <div>
                <label htmlFor="sessionTtl" className="block text-sm font-medium text-gray-700 mb-2">Session TTL (minutes)</label>
                <input 
                  id="sessionTtl" 
                  type="number" 
                  min={5} 
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none" 
                  value={s?.sessionIdleMinutes ?? 60} 
                  onChange={e=>setS(prev=>({...(prev||{}), sessionIdleMinutes: Number(e.target.value)}))} 
                />
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


          {/* Scheduling */}
          <div className="border border-gray-200 rounded-lg p-6 shadow-sm">
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
          <div className="border border-gray-200 rounded-lg p-6 shadow-sm">
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
              <div id="recentBonusesList" className="mt-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="bonusOwnerId" className="block text-sm font-medium text-gray-700 mb-2">Owner ID</label>
                    <input 
                      id="bonusOwnerId" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none" 
                      value={bonusOwnerId} 
                      onChange={e=>setBonusOwnerId(e.target.value)} 
                      placeholder="Enter owner ID"
                    />
                  </div>
                  <div>
                    <label htmlFor="bonusPercentInput" className="block text-sm font-medium text-gray-700 mb-2">Bonus (%)</label>
                    <input 
                      id="bonusPercentInput" 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none" 
                      value={bonusPercentInput} 
                      onChange={e=>setBonusPercentInput(Number(e.target.value))} 
                      placeholder="Enter bonus percentage"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="flex gap-2">
                    <button 
                      onClick={previewBonus} 
                      className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 font-medium text-sm cursor-pointer"
                    >
                      Preview
                    </button>
                    <button 
                      onClick={grantBonus} 
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#02665e] text-white rounded-lg hover:bg-[#015b54] transition-all duration-200 font-medium text-sm cursor-pointer"
                    >
                      Grant
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 sm:ml-2">
                    Preview shows computed bonus based on owner paid invoices in the last 30 days.
                  </p>
                </div>
                {bonusPreview && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <pre className="text-sm text-gray-700 overflow-auto whitespace-pre-wrap">{JSON.stringify(bonusPreview, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        <div className="mt-6">
          <button 
            onClick={saveSystemSettings} 
            disabled={loading} 
            className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
              loading 
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                : 'bg-[#02665e] text-white hover:bg-[#015b54] cursor-pointer'
            }`}
          >
            <Settings className="h-4 w-4" />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
