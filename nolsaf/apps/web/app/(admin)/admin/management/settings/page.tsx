"use client";
// AdminPageHeader removed in favor of a centered, compact header for this page
import { ChevronDown, RefreshCw, Settings, Shield, Lock, AlertTriangle, Network, Clock } from "lucide-react";
import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeTrustedHtml } from "@/utils/html";
import { AnimatePresence, motion } from "framer-motion";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function SystemSettingsPage(){
  const inputClass =
    "w-full rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#02665e] focus:ring-2 focus:ring-inset focus:ring-[#02665e]/18";
  const cardClass =
    "group relative min-w-0 overflow-visible rounded-2xl border border-slate-200/60 bg-white/70 p-6 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-xl transition-all duration-200 hover:z-10 focus-within:z-10 motion-safe:hover:-translate-y-0.5 hover:shadow-md";
  const cardTitleClass = "text-base font-semibold tracking-tight text-slate-900";
  const cardHintClass = "mt-1 text-sm text-slate-600";
  const labelClass = "block text-xs font-medium text-slate-600";
  const helpClass = "mt-1 text-xs text-slate-500";
  const rowClass =
    "flex min-w-0 items-start justify-between gap-4 rounded-xl border border-slate-200/70 bg-white/60 p-4 shadow-sm transition-colors duration-200 hover:bg-slate-50/70";
  const toggleTrackClass =
    "relative h-6 w-11 shrink-0 rounded-full bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#02665e]/15 peer-checked:bg-[#02665e] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-200 after:bg-white after:transition-all peer-checked:after:translate-x-full";
  const btnPrimary =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#02776d] to-[#015b54] px-4 py-2 text-sm font-semibold text-white shadow-sm ring-1 ring-[#02665e]/20 transition-all duration-200 hover:from-[#026e65] hover:to-[#014f49] focus:outline-none focus:ring-4 focus:ring-[#02665e]/20 disabled:cursor-not-allowed disabled:opacity-60";
  const btnSecondary =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#02665e]/10";

  const formatMoney = (value: unknown) => {
    const currency = (s?.currency || 'TZS').toUpperCase();
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'number' && Number.isFinite(value)) return `${value.toLocaleString()} ${currency}`;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return `${parsed.toLocaleString()} ${currency}`;
      return value;
    }
    return String(value);
  };

  const formatPercent = (value: unknown) => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'number' && Number.isFinite(value)) return `${value}%`;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return `${parsed}%`;
      return value;
    }
    return String(value);
  };

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
    requirePasswordUppercase?: boolean;
    requirePasswordLowercase?: boolean;
    requirePasswordNumber?: boolean;
    requirePasswordSpecial?: boolean;
    sessionIdleMinutes: number;
    maxSessionDurationHours?: number;
    forceLogoutOnPasswordChange?: boolean;
    sessionMaxMinutesAdmin?: number | null;
    sessionMaxMinutesOwner?: number | null;
    sessionMaxMinutesDriver?: number | null;
    sessionMaxMinutesCustomer?: number | null;
    ipAllowlist?: string | null;
    enableIpAllowlist?: boolean;
    apiRateLimitPerMinute?: number;
    maxLoginAttempts?: number;
    accountLockoutDurationMinutes?: number;
    enableSecurityAuditLogging?: boolean;
    logFailedLoginAttempts?: boolean;
    alertOnSuspiciousActivity?: boolean;
    supportEmail?: string | null;
    supportPhone?: string | null;
    featureFlags?: any;
    notificationTemplates?: any;
    invoiceTemplate?: string;
    payoutCron?: string;
  }

  type SessionPolicyAuditEntry = {
    id: string;
    createdAt: string;
    actorId: number | null;
    actorRole: string | null;
    actor: { id: number; email?: string | null; name?: string | null; role?: string | null } | null;
    ip: string | null;
    changes: Record<string, { from: any; to: any }> | null;
  };

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
    requirePasswordUppercase: false,
    requirePasswordLowercase: false,
    requirePasswordNumber: false,
    requirePasswordSpecial: false,
    sessionIdleMinutes: 60,
    maxSessionDurationHours: 24,
    forceLogoutOnPasswordChange: true,
    sessionMaxMinutesAdmin: null,
    sessionMaxMinutesOwner: null,
    sessionMaxMinutesDriver: null,
    sessionMaxMinutesCustomer: null,
    ipAllowlist: null,
    enableIpAllowlist: false,
    apiRateLimitPerMinute: 100,
    maxLoginAttempts: 5,
    accountLockoutDurationMinutes: 30,
    enableSecurityAuditLogging: true,
    logFailedLoginAttempts: true,
    alertOnSuspiciousActivity: false,
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
  const [bonusOwnerLookup, setBonusOwnerLookup] = useState<{ id: number; name?: string | null; email?: string | null } | null>(null);
  const [bonusOwnerLookupLoading, setBonusOwnerLookupLoading] = useState<boolean>(false);
  const [bonusOwnerLookupError, setBonusOwnerLookupError] = useState<string | null>(null);
  const lastAutoPreviewKeyRef = useRef<string>('');
  const autoPreviewTimerRef = useRef<number | null>(null);
  // support contact (editable by admin)
  const [supportEmail, setSupportEmail] = useState<string>('');
  const [supportPhone, setSupportPhone] = useState<string>('');

  const [toast, setToast] = useState<string | null>(null);
  const [sessionPolicyAudit, setSessionPolicyAudit] = useState<SessionPolicyAuditEntry[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const load = useCallback(async ()=>{
    try {
      setLoading(true);
      const r = await api.get('/admin/settings');
      if (r?.data) setS(r.data);
    } finally {
      setLoading(false);
    }
  },[]);

  const loadSessionPolicyAudit = useCallback(async ()=>{
    try {
      // Add cache-busting to ensure fresh audit data
      const r = await api.get('/admin/settings/audit/session-policy', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        params: {
          _t: Date.now(), // timestamp cache buster
        },
      });
      const items = Array.isArray(r?.data) ? r.data : [];
      setSessionPolicyAudit(items);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(()=>{ load(); },[load]);
  useEffect(()=>{ loadSessionPolicyAudit(); },[loadSessionPolicyAudit]);

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

  // CIDR validation helper
  function isValidCIDR(cidr: string): boolean {
    const cidrRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[12][0-9]|3[0-2])$/;
    if (!cidrRegex.test(cidr.trim())) return false;
    const [ip, prefix] = cidr.split('/');
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4) return false;
    if (parts.some(p => p < 0 || p > 255)) return false;
    if (Number(prefix) < 0 || Number(prefix) > 32) return false;
    return true;
  }

  function validateIPAllowlist(value: string): { valid: boolean; error?: string } {
    if (!value || value.trim() === '') return { valid: true };
    const entries = value.split(',').map(s => s.trim()).filter(s => s);
    for (const entry of entries) {
      if (!isValidCIDR(entry)) {
        return { valid: false, error: `Invalid CIDR format: "${entry}". Use format like 192.168.1.0/24` };
      }
    }
    return { valid: true };
  }

  const validateField = (field: string, value: any): string | null => {
    // Skip validation for undefined/null values (they'll use defaults)
    if (value === undefined || value === null || value === '') {
      return null;
    }

    switch (field) {
      case 'ipAllowlist':
        const ipValidation = validateIPAllowlist(String(value || ''));
        if (!ipValidation.valid) return ipValidation.error || 'Invalid IP allowlist format';
        break;
      case 'minPasswordLength':
        const minLen = Number(value);
        if (isNaN(minLen) || minLen < 6 || minLen > 128) {
          return 'Password length must be between 6 and 128 characters';
        }
        break;
      case 'sessionIdleMinutes':
        const idle = Number(value);
        if (isNaN(idle) || idle < 5 || idle > 1440) {
          return 'Session idle timeout must be between 5 and 1440 minutes';
        }
        break;
      case 'maxSessionDurationHours':
        const duration = Number(value);
        if (isNaN(duration) || duration < 1 || duration > 720) {
          return 'Max session duration must be between 1 and 720 hours';
        }
        break;
      case 'apiRateLimitPerMinute':
        const rateLimit = Number(value);
        if (isNaN(rateLimit) || rateLimit < 10 || rateLimit > 10000) {
          return 'API rate limit must be between 10 and 10000 requests per minute';
        }
        break;
      case 'maxLoginAttempts':
        const attempts = Number(value);
        if (isNaN(attempts) || attempts < 3 || attempts > 20) {
          return 'Max login attempts must be between 3 and 20';
        }
        break;
      case 'accountLockoutDurationMinutes':
        const lockout = Number(value);
        if (isNaN(lockout) || lockout < 5 || lockout > 1440) {
          return 'Account lockout duration must be between 5 and 1440 minutes';
        }
        break;
    }
    return null;
  };

  const saveSystemSettings = async () => {
    // Validate all fields before saving - use actual values or defaults
    const errors: Record<string, string> = {};
    
    // Validate with actual values (using defaults if not set)
    const valuesToValidate = {
      ipAllowlist: s.ipAllowlist || '',
      minPasswordLength: s.minPasswordLength ?? 10,
      sessionIdleMinutes: s.sessionIdleMinutes ?? 60,
      maxSessionDurationHours: s.maxSessionDurationHours ?? 24,
      apiRateLimitPerMinute: s.apiRateLimitPerMinute ?? 100,
      maxLoginAttempts: s.maxLoginAttempts ?? 5,
      accountLockoutDurationMinutes: s.accountLockoutDurationMinutes ?? 30,
    };
    
    // Only validate ipAllowlist if it has a value (it's optional)
    if (valuesToValidate.ipAllowlist && valuesToValidate.ipAllowlist.trim() !== '') {
      const error = validateField('ipAllowlist', valuesToValidate.ipAllowlist);
      if (error) errors.ipAllowlist = error;
    }
    
    // Validate numeric fields
    const numericFields: Array<keyof typeof valuesToValidate> = [
      'minPasswordLength', 'sessionIdleMinutes', 'maxSessionDurationHours',
      'apiRateLimitPerMinute', 'maxLoginAttempts', 'accountLockoutDurationMinutes'
    ];
    
    numericFields.forEach(field => {
      const error = validateField(field, valuesToValidate[field]);
      if (error) errors[field] = error;
    });
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const errorMessages = Object.values(errors);
      setToast(`Please fix validation errors: ${errorMessages[0]}${errorMessages.length > 1 ? ` (+${errorMessages.length - 1} more)` : ''}`);
      return;
    }
    
    setValidationErrors({});
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
      requirePasswordUppercase: Boolean(s.requirePasswordUppercase ?? false),
      requirePasswordLowercase: Boolean(s.requirePasswordLowercase ?? false),
      requirePasswordNumber: Boolean(s.requirePasswordNumber ?? false),
      requirePasswordSpecial: Boolean(s.requirePasswordSpecial ?? false),
  sessionIdleMinutes: Number(s.sessionIdleMinutes || 60),
  maxSessionDurationHours: Number(s.maxSessionDurationHours || 24),
  forceLogoutOnPasswordChange: Boolean(s.forceLogoutOnPasswordChange ?? true),
  sessionMaxMinutesAdmin: (s.sessionMaxMinutesAdmin == null || Number(s.sessionMaxMinutesAdmin) <= 0) ? null : Number(s.sessionMaxMinutesAdmin),
  sessionMaxMinutesOwner: (s.sessionMaxMinutesOwner == null || Number(s.sessionMaxMinutesOwner) <= 0) ? null : Number(s.sessionMaxMinutesOwner),
  sessionMaxMinutesDriver: (s.sessionMaxMinutesDriver == null || Number(s.sessionMaxMinutesDriver) <= 0) ? null : Number(s.sessionMaxMinutesDriver),
  sessionMaxMinutesCustomer: (s.sessionMaxMinutesCustomer == null || Number(s.sessionMaxMinutesCustomer) <= 0) ? null : Number(s.sessionMaxMinutesCustomer),
  ipAllowlist: s.ipAllowlist || null,
  enableIpAllowlist: Boolean(s.enableIpAllowlist ?? false),
  apiRateLimitPerMinute: Number(s.apiRateLimitPerMinute || 100),
  maxLoginAttempts: Number(s.maxLoginAttempts || 5),
  accountLockoutDurationMinutes: Number(s.accountLockoutDurationMinutes || 30),
  enableSecurityAuditLogging: Boolean(s.enableSecurityAuditLogging ?? true),
  logFailedLoginAttempts: Boolean(s.logFailedLoginAttempts ?? true),
  alertOnSuspiciousActivity: Boolean(s.alertOnSuspiciousActivity ?? false),
  supportEmail: supportEmail || s.supportEmail,
  supportPhone: supportPhone || s.supportPhone,
    };
    try {
      await api.put('/admin/settings', payload);
      setToast('System settings saved (audit recorded)');
      await load();
      await loadSessionPolicyAudit();
    } catch (err) {
      console.error(err);
      setToast('Failed to save system settings');
    }
  };

  const renderAuditChanges = (changes: Record<string, { from: any; to: any }> | null) => {
    if (!changes || !Object.keys(changes).length) return 'No field-level diff available.';
    const parts = Object.entries(changes).map(([k, v]) => {
      const from = v?.from;
      const to = v?.to;
      return `${k}: ${from ?? 'null'} → ${to ?? 'null'}`;
    });
    return parts.join('\n');
  };

  const saveFlagsAndTemplates = async () => {
    // For now we don't persist feature flags/templates in SystemSetting; backend work needed
    setToast('Feature flags & templates saving needs backend support. This is a client-only preview.');
  };

  const saveInvoicingSettings = async () => {
    // Save taxPercent and invoicePrefix (persisted via SystemSetting) and keep invoiceTemplate client-side
    try {
      await api.put('/admin/settings', { taxPercent: Number(s.taxPercent || 0), invoicePrefix: s.invoicePrefix || 'INV-' });
      setToast('Invoicing settings saved');
    } catch (err) {
      console.error(err);
      setToast('Failed to save invoicing settings');
    }
  };

  const previewBonus = async () => {
    const ownerId = Number(bonusOwnerId);
    if (!Number.isFinite(ownerId) || ownerId <= 0) {
      setToast('Valid Owner ID is required');
      return;
    }
    if (!Number.isFinite(bonusPercentInput) || bonusPercentInput < 0) {
      setToast('Valid Bonus (%) is required');
      return;
    }
    try {
      const r = await api.post('/admin/bonuses/grant', { ownerId, bonusPercent: Number(bonusPercentInput) });
      setBonusPreview(r.data);
    } catch (err) {
      console.error(err);
      setToast('Failed to preview bonus');
    }
  };

  const grantBonus = async () => {
    const ownerId = Number(bonusOwnerId);
    if (!Number.isFinite(ownerId) || ownerId <= 0) {
      setToast('Valid Owner ID is required');
      return;
    }
    if (!Number.isFinite(bonusPercentInput) || bonusPercentInput < 0) {
      setToast('Valid Bonus (%) is required');
      return;
    }
    if (!confirm('Grant bonus to owner? This action will be recorded in the admin audit log.')) return;
    try {
      const r = await api.post('/admin/bonuses/grant', { ownerId, bonusPercent: Number(bonusPercentInput), reason: 'Manual grant from settings UI' });
      setBonusPreview(r.data);
      setToast('Bonus grant recorded (audit only)');
    } catch (err) {
      console.error(err);
      setToast('Failed to grant bonus');
    }
  };

  // Auto-detect owner from pasted/typed Owner ID
  useEffect(() => {
    const ownerId = Number(bonusOwnerId);
    setBonusOwnerLookup(null);
    setBonusOwnerLookupError(null);
    if (!Number.isFinite(ownerId) || ownerId <= 0) return;

    let cancelled = false;
    setBonusOwnerLookupLoading(true);

    (async () => {
      try {
        const r = await api.get<{ owner?: { id: number; name?: string | null; email?: string | null } }>(`/api/admin/owners/${ownerId}`);
        if (cancelled) return;
        const owner = (r.data as any)?.owner;
        if (!owner?.id) {
          setBonusOwnerLookup(null);
          setBonusOwnerLookupError('Owner not found');
          return;
        }
        setBonusOwnerLookup({ id: owner.id, name: owner.name ?? null, email: owner.email ?? null });
      } catch (err) {
        if (cancelled) return;
        setBonusOwnerLookup(null);
        setBonusOwnerLookupError('Owner not found');
      } finally {
        if (!cancelled) setBonusOwnerLookupLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bonusOwnerId]);

  // Auto-preview bonus once we have a valid owner (debounced)
  useEffect(() => {
    const ownerId = Number(bonusOwnerId);
    if (!Number.isFinite(ownerId) || ownerId <= 0) return;
    if (!bonusOwnerLookup?.id || bonusOwnerLookup.id !== ownerId) return;
    if (!Number.isFinite(bonusPercentInput) || bonusPercentInput < 0) return;

    const key = `${ownerId}:${bonusPercentInput}`;
    if (key === lastAutoPreviewKeyRef.current) return;

    if (autoPreviewTimerRef.current) window.clearTimeout(autoPreviewTimerRef.current);
    autoPreviewTimerRef.current = window.setTimeout(() => {
      lastAutoPreviewKeyRef.current = key;
      void previewBonus();
    }, 450);

    return () => {
      if (autoPreviewTimerRef.current) window.clearTimeout(autoPreviewTimerRef.current);
    };
  }, [bonusOwnerId, bonusPercentInput, bonusOwnerLookup?.id]);

  const previewInvoice = async () => {
    try {
      const r = await api.post('/admin/settings/numbering/preview', { type: 'invoice' });
      const sample = r.data?.sample || '';
      // simple preview using invoiceTemplate + sample number
      const rawPreview = (invoiceTemplate || '<div>Invoice {{invoiceNumber}}</div>').replace(/{{\s*invoiceNumber\s*}}/g, sample);
      setInvoicePreviewHtml(sanitizeTrustedHtml(rawPreview));
      setToast('Invoice preview generated');
    } catch (err) {
      console.error(err);
      setToast('Failed to generate preview');
    }
  };

  const updatePayoutCron = async () => {
    setToast('Saving cron expressions requires backend support; not implemented yet.');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="min-h-screen w-full bg-[radial-gradient(1200px_circle_at_30%_-10%,rgba(2,102,94,0.12),transparent_55%),radial-gradient(900px_circle_at_90%_0%,rgba(15,23,42,0.06),transparent_55%)] bg-slate-50"
    >
      <div className="mx-auto w-full min-w-0 max-w-3xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4">
          <div className="rounded-3xl border border-slate-200/60 bg-white/70 p-6 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-xl">
            <div className="flex flex-col items-center gap-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="rounded-2xl bg-[#02665e]/10 p-3 ring-1 ring-[#02665e]/15">
                  <Settings className="h-6 w-6 text-[#02665e]" />
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">System Settings</h1>
                  <p className="mt-1 text-sm text-slate-600">Premium controls for platform configuration and security.</p>
                  {loading && <div className="mt-2 text-xs text-slate-500">Syncing latest settings…</div>}
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="fixed top-4 z-50 left-4 right-4 sm:left-auto sm:right-4 sm:w-[28rem]"
              >
                <div className="w-full max-w-full break-words rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl ring-1 ring-white/10">
                  {toast}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-8 flex w-full min-w-0 flex-col gap-6">
          {/* Payment */}
          <section className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={cardTitleClass}>Payments</h3>
                <p className={cardHintClass}>Platform fee and currency formatting.</p>
              </div>
              <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/60 px-2.5 py-1 text-xs font-medium text-slate-600">Finance</span>
            </div>

            <div className="mt-5 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
              <div className="flex h-full min-w-0 flex-col overflow-visible rounded-xl border border-emerald-200/70 bg-emerald-50/30 p-4 shadow-sm">
                <label htmlFor="commissionPercent" className={labelClass}>Commission Rate</label>
                <div className="mt-2 flex w-full min-w-0 overflow-hidden rounded-lg border border-emerald-200/70 bg-white/70 shadow-sm transition-all duration-200 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-500/20">
                  <input
                    id="commissionPercent"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="10"
                    value={s?.commissionPercent ?? 0}
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    onChange={e=>setS((prev: any)=>({...(prev||{}), commissionPercent: Number(e.target.value)}))}
                  />
                  <div className="flex shrink-0 items-center border-l border-emerald-200/70 bg-emerald-50/70 px-3 text-xs font-semibold text-emerald-700">
                    %
                  </div>
                </div>
              </div>

              <div className="flex h-full min-w-0 flex-col overflow-visible rounded-xl border border-indigo-200/70 bg-indigo-50/30 p-4 shadow-sm">
                <label htmlFor="currency" className={labelClass}>Currency</label>
                <div className="mt-2 flex w-full min-w-0 overflow-hidden rounded-lg border border-indigo-200/70 bg-white/70 shadow-sm transition-all duration-200 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500/20">
                  <select
                    id="currency"
                    className="min-w-0 flex-1 appearance-none bg-none border-0 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none"
                    value={s?.currency||'TZS'}
                    onChange={e=>setS((prev: any)=>({...(prev||{}), currency: e.target.value}))}
                  >
                    <option value="TZS">TZS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="KSH">KSH</option>
                    <option value="AED">AED</option>
                  </select>
                  <div className="flex shrink-0 items-center border-l border-indigo-200/70 bg-indigo-50/70 px-3 text-indigo-600">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Notifications + Support */}
          <section className={cardClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className={cardTitleClass}>Notifications</h3>
                <p className={cardHintClass}>Channels and customer support contact.</p>
              </div>
              <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/60 px-2.5 py-1 text-xs font-medium text-slate-600">Live</span>
            </div>

            <div className="mt-5 space-y-3">
              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Email notifications</div>
                  <div className={helpClass}>Send emails for invoices and key actions.</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-label="Email notifications"
                    checked={Boolean(s.emailEnabled)}
                    className="peer sr-only"
                    onChange={e=>setS({...s, emailEnabled: e.target.checked})}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>

              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">SMS alerts</div>
                  <div className={helpClass}>Urgent events and operational alerts.</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-label="SMS alerts"
                    checked={Boolean(s.smsEnabled)}
                    className="peer sr-only"
                    onChange={e=>setS({...s, smsEnabled: e.target.checked})}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
                <div className="flex h-full min-w-0 flex-col overflow-visible rounded-xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
                  <label className={labelClass}>Support email</label>
                  <input
                    className={`${inputClass} mt-2`}
                    value={supportEmail}
                    onChange={e=>setSupportEmail(e.target.value)}
                    placeholder="support@nolsaf.com"
                  />
                </div>
                <div className="flex h-full min-w-0 flex-col overflow-visible rounded-xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
                  <label className={labelClass}>Support phone</label>
                  <input
                    className={`${inputClass} mt-2`}
                    value={supportPhone}
                    onChange={e=>setSupportPhone(e.target.value)}
                    placeholder="+255 736 766 726"
                  />
                </div>
              </div>

              <div className="mt-2 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Feature flags & templates</div>
                    <div className={helpClass}>Client preview only (backend persistence pending).</div>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Preview</span>
                </div>
                <div className="mt-3 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
                  <div className="flex h-full min-w-0 flex-col overflow-visible rounded-xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
                    <label htmlFor="featureFlags" className={labelClass}>Feature Flags (JSON)</label>
                    <textarea
                      id="featureFlags"
                      className={`${inputClass} mt-2 h-28 font-mono text-[12px]`}
                      value={featureFlags}
                      onChange={e=>setFeatureFlags(e.target.value)}
                      placeholder='{"new_ui": true}'
                    />
                  </div>
                  <div className="flex h-full min-w-0 flex-col overflow-visible rounded-xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
                    <label htmlFor="notificationTemplates" className={labelClass}>Notification Templates (JSON)</label>
                    <textarea
                      id="notificationTemplates"
                      className={`${inputClass} mt-2 h-28 font-mono text-[12px]`}
                      value={notificationTemplates}
                      onChange={e=>setNotificationTemplates(e.target.value)}
                      placeholder='{"owner_payout": "Your payout of {{amount}} was processed"}'
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <button onClick={saveFlagsAndTemplates} className={btnSecondary} type="button">Save (preview)</button>
                </div>
              </div>
            </div>
          </section>

          {/* Security & Sessions */}
          <section className={cardClass}>
            <div>
              <h3 className={cardTitleClass}>Security & Sessions</h3>
              <p className={cardHintClass}>Role-based session TTL is enforced server-side and audited.</p>
            </div>

            <div className="mt-5 space-y-3">
              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Require 2FA for admins</div>
                  <div className={helpClass}>Enforce two-factor authentication for all admin accounts.</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    id="admin2fa"
                    type="checkbox"
                    aria-label="Require 2FA for admins"
                    checked={Boolean(s?.requireAdmin2FA)}
                    className="peer sr-only"
                    onChange={e=>setS(prev=>({...(prev||{}), requireAdmin2FA: e.target.checked}))}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Session TTL by role (minutes)</div>
                    <div className={helpClass}>Blank role values fall back to Default.</div>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-slate-200/70 bg-white/60 px-2.5 py-1 text-xs font-medium text-slate-600">Audited</span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                  <div className="min-w-0 rounded-xl border border-slate-200/70 bg-gradient-to-b from-slate-50/70 to-white/70 p-4 shadow-sm ring-1 ring-slate-900/[0.03]">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        <label htmlFor="sessionTtlDefault" className="text-sm font-semibold text-slate-900">Default</label>
                      </div>
                    </div>
                    <input
                      id="sessionTtlDefault"
                      type="number"
                      min={5}
                      className={`${inputClass} mt-3 bg-white/70 shadow-none`}
                      value={(s?.sessionIdleMinutes ?? 60) as any}
                      onChange={e=>setS(prev=>({...(prev||{}), sessionIdleMinutes: Number(e.target.value)}))}
                    />
                  </div>

                  <div className="min-w-0 rounded-xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/70 to-white/70 p-4 shadow-sm ring-1 ring-emerald-500/10">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <label htmlFor="sessionTtlAdmin" className="text-sm font-semibold text-slate-900">Admin</label>
                      </div>
                    </div>
                    <input
                      id="sessionTtlAdmin"
                      type="number"
                      min={5}
                      placeholder="(default)"
                      className={`${inputClass} mt-3 bg-white/70 shadow-none`}
                      value={(s?.sessionMaxMinutesAdmin ?? '') as any}
                      onChange={e=>setS(prev=>({...(prev||{}), sessionMaxMinutesAdmin: e.target.value === '' ? null : Number(e.target.value)}))}
                    />
                  </div>

                  <div className="min-w-0 rounded-xl border border-indigo-200/70 bg-gradient-to-b from-indigo-50/70 to-white/70 p-4 shadow-sm ring-1 ring-indigo-500/10">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        <label htmlFor="sessionTtlOwner" className="text-sm font-semibold text-slate-900">Owner</label>
                      </div>
                    </div>
                    <input
                      id="sessionTtlOwner"
                      type="number"
                      min={5}
                      placeholder="(default)"
                      className={`${inputClass} mt-3 bg-white/70 shadow-none`}
                      value={(s?.sessionMaxMinutesOwner ?? '') as any}
                      onChange={e=>setS(prev=>({...(prev||{}), sessionMaxMinutesOwner: e.target.value === '' ? null : Number(e.target.value)}))}
                    />
                  </div>

                  <div className="min-w-0 rounded-xl border border-amber-200/70 bg-gradient-to-b from-amber-50/70 to-white/70 p-4 shadow-sm ring-1 ring-amber-500/10">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <label htmlFor="sessionTtlDriver" className="text-sm font-semibold text-slate-900">Driver</label>
                      </div>
                    </div>
                    <input
                      id="sessionTtlDriver"
                      type="number"
                      min={5}
                      placeholder="(default)"
                      className={`${inputClass} mt-3 bg-white/70 shadow-none`}
                      value={(s?.sessionMaxMinutesDriver ?? '') as any}
                      onChange={e=>setS(prev=>({...(prev||{}), sessionMaxMinutesDriver: e.target.value === '' ? null : Number(e.target.value)}))}
                    />
                  </div>

                  <div className="min-w-0 rounded-xl border border-sky-200/70 bg-gradient-to-b from-sky-50/70 to-white/70 p-4 shadow-sm ring-1 ring-sky-500/10">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-sky-500" />
                        <label htmlFor="sessionTtlCustomer" className="text-sm font-semibold text-slate-900">Customer</label>
                      </div>
                    </div>
                    <input
                      id="sessionTtlCustomer"
                      type="number"
                      min={5}
                      placeholder="(default)"
                      className={`${inputClass} mt-3 bg-white/70 shadow-none`}
                      value={(s?.sessionMaxMinutesCustomer ?? '') as any}
                      onChange={e=>setS(prev=>({...(prev||{}), sessionMaxMinutesCustomer: e.target.value === '' ? null : Number(e.target.value)}))}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4 text-xs text-slate-600">
                  Reducing a role TTL forces re-login on the next request.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-slate-900">Max session duration (hours)</div>
                    <div className={helpClass}>Maximum session lifetime before requiring re-authentication</div>
                  </div>
                </div>
                <input
                  id="maxSessionDurationHours"
                  type="number"
                  min={1}
                  max={720}
                  className={`${inputClass} ${validationErrors.maxSessionDurationHours ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={(s?.maxSessionDurationHours ?? 24) as any}
                  onChange={e=>setS(prev=>({...(prev||{}), maxSessionDurationHours: Number(e.target.value)}))}
                  aria-label="Max session duration hours"
                />
                {validationErrors.maxSessionDurationHours && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.maxSessionDurationHours}</p>
                )}
              </div>

              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Force logout on password change</div>
                  <div className={helpClass}>Automatically logout all sessions when password is changed</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-label="Force logout on password change"
                    checked={Boolean(s?.forceLogoutOnPasswordChange ?? true)}
                    className="peer sr-only"
                    onChange={e=>setS(prev=>({...(prev||{}), forceLogoutOnPasswordChange: e.target.checked}))}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* Password Requirements */}
          <section className={cardClass}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                <Lock className="h-5 w-5 text-[#02665e]" />
              </div>
              <div>
                <h3 className={cardTitleClass}>Password Requirements</h3>
                <p className={cardHintClass}>Configure password complexity and security policies</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4">
                <label htmlFor="minPasswordLength" className={labelClass}>Minimum password length</label>
                <input
                  id="minPasswordLength"
                  type="number"
                  min={6}
                  max={128}
                  className={`${inputClass} mt-2 ${validationErrors.minPasswordLength ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={(s?.minPasswordLength ?? 10) as any}
                  onChange={e=>setS(prev=>({...(prev||{}), minPasswordLength: Number(e.target.value)}))}
                />
                {validationErrors.minPasswordLength && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.minPasswordLength}</p>
                )}
                <p className={helpClass}>Minimum number of characters required for passwords</p>
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Require uppercase letters</div>
                  <div className={helpClass}>Passwords must contain at least one uppercase letter</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-label="Require uppercase letters in password"
                    checked={Boolean(s?.requirePasswordUppercase ?? false)}
                    className="peer sr-only"
                    onChange={e=>setS(prev=>({...(prev||{}), requirePasswordUppercase: e.target.checked}))}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>

              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Require lowercase letters</div>
                  <div className={helpClass}>Passwords must contain at least one lowercase letter</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-label="Require lowercase letters in password"
                    checked={Boolean(s?.requirePasswordLowercase ?? false)}
                    className="peer sr-only"
                    onChange={e=>setS(prev=>({...(prev||{}), requirePasswordLowercase: e.target.checked}))}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>

              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Require numbers</div>
                  <div className={helpClass}>Passwords must contain at least one number</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-label="Require numbers in password"
                    checked={Boolean(s?.requirePasswordNumber ?? false)}
                    className="peer sr-only"
                    onChange={e=>setS(prev=>({...(prev||{}), requirePasswordNumber: e.target.checked}))}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>

              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Require special characters</div>
                  <div className={helpClass}>Passwords must contain at least one special character (!@#$%^&*)</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-label="Require special characters in password"
                    checked={Boolean(s?.requirePasswordSpecial ?? false)}
                    className="peer sr-only"
                    onChange={e=>setS(prev=>({...(prev||{}), requirePasswordSpecial: e.target.checked}))}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* Network Security */}
          <section className={cardClass}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center">
                <Network className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className={cardTitleClass}>Network Security</h3>
                <p className={cardHintClass}>Restrict admin access by IP address and configure network policies</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="ipAllowlist" className={labelClass}>Admin IP Allowlist (CIDR format)</label>
                <textarea
                  id="ipAllowlist"
                  className={`${inputClass} mt-2 font-mono text-xs ${validationErrors.ipAllowlist ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={s?.ipAllowlist || ''}
                  onChange={e=>setS(prev=>({...(prev||{}), ipAllowlist: e.target.value}))}
                  onBlur={(e) => {
                    const error = validateIPAllowlist(e.target.value);
                    if (!error.valid && error.error) {
                      setValidationErrors(prev => ({ ...prev, ipAllowlist: error.error || 'Invalid IP allowlist format' }));
                    } else {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.ipAllowlist;
                        return newErrors;
                      });
                    }
                  }}
                  placeholder="192.168.1.0/24, 10.0.0.0/8, 172.16.0.0/12"
                  rows={4}
                />
                {validationErrors.ipAllowlist && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.ipAllowlist}</p>
                )}
                <p className={helpClass}>
                  Enter IP addresses or CIDR ranges separated by commas. Leave empty to allow all IPs.
                  <br />
                  <span className="font-semibold">Example:</span> 192.168.1.0/24, 10.0.0.0/8
                </p>
              </div>

              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Enable IP allowlist enforcement</div>
                  <div className={helpClass}>Enable IP allowlist to restrict admin access (requires IP allowlist to be configured)</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-label="Enable IP allowlist enforcement"
                    checked={Boolean(s?.enableIpAllowlist ?? false)}
                    className="peer sr-only"
                    onChange={e=>setS(prev=>({...(prev||{}), enableIpAllowlist: e.target.checked}))}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* Rate Limiting & DDoS Protection */}
          <section className={cardClass}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <Shield className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className={cardTitleClass}>Rate Limiting & DDoS Protection</h3>
                <p className={cardHintClass}>Configure API rate limits and protection against abuse</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4">
                <label htmlFor="apiRateLimitPerMinute" className={labelClass}>API requests per minute</label>
                <input
                  id="apiRateLimitPerMinute"
                  type="number"
                  min={10}
                  max={10000}
                  className={`${inputClass} mt-2 ${validationErrors.apiRateLimitPerMinute ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={(s?.apiRateLimitPerMinute ?? 100) as any}
                  onChange={e=>setS(prev=>({...(prev||{}), apiRateLimitPerMinute: Number(e.target.value)}))}
                />
                {validationErrors.apiRateLimitPerMinute && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.apiRateLimitPerMinute}</p>
                )}
                <p className={helpClass}>Maximum API requests allowed per minute per IP</p>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4">
                <label htmlFor="maxLoginAttempts" className={labelClass}>Login attempts before lockout</label>
                <input
                  id="maxLoginAttempts"
                  type="number"
                  min={3}
                  max={20}
                  className={`${inputClass} mt-2 ${validationErrors.maxLoginAttempts ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={(s?.maxLoginAttempts ?? 5) as any}
                  onChange={e=>setS(prev=>({...(prev||{}), maxLoginAttempts: Number(e.target.value)}))}
                />
                {validationErrors.maxLoginAttempts && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.maxLoginAttempts}</p>
                )}
                <p className={helpClass}>Number of failed login attempts before account lockout</p>
              </div>

              <div className="rounded-xl border border-slate-200/70 bg-white/60 p-4">
                <label htmlFor="accountLockoutDurationMinutes" className={labelClass}>Account lockout duration (minutes)</label>
                <input
                  id="accountLockoutDurationMinutes"
                  type="number"
                  min={5}
                  max={1440}
                  className={`${inputClass} mt-2 ${validationErrors.accountLockoutDurationMinutes ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={(s?.accountLockoutDurationMinutes ?? 30) as any}
                  onChange={e=>setS(prev=>({...(prev||{}), accountLockoutDurationMinutes: Number(e.target.value)}))}
                />
                {validationErrors.accountLockoutDurationMinutes && (
                  <p className="mt-1 text-xs text-red-600">{validationErrors.accountLockoutDurationMinutes}</p>
                )}
                <p className={helpClass}>Duration of account lockout after max login attempts</p>
              </div>
            </div>
          </section>

          {/* Security Audit & Monitoring */}
          <section className={cardClass}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className={cardTitleClass}>Security Audit & Monitoring</h3>
                <p className={cardHintClass}>Configure security auditing and monitoring policies</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Enable security audit logging</div>
                  <div className={helpClass}>Log all security-related events and admin actions</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-label="Enable security audit logging"
                    checked={Boolean(s?.enableSecurityAuditLogging ?? true)}
                    className="peer sr-only"
                    onChange={e=>setS(prev=>({...(prev||{}), enableSecurityAuditLogging: e.target.checked}))}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>

              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Log failed login attempts</div>
                  <div className={helpClass}>Record all failed login attempts for security analysis</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-label="Log failed login attempts"
                    checked={Boolean(s?.logFailedLoginAttempts ?? true)}
                    className="peer sr-only"
                    onChange={e=>setS(prev=>({...(prev||{}), logFailedLoginAttempts: e.target.checked}))}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>

              <div className={rowClass}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900">Alert on suspicious activity</div>
                  <div className={helpClass}>Send alerts when suspicious security events are detected</div>
                </div>
                <label className="group relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    aria-label="Alert on suspicious activity"
                    checked={Boolean(s?.alertOnSuspiciousActivity ?? false)}
                    className="peer sr-only"
                    onChange={e=>setS(prev=>({...(prev||{}), alertOnSuspiciousActivity: e.target.checked}))}
                  />
                  <div className={toggleTrackClass}>
                    <Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" />
                  </div>
                </label>
              </div>
            </div>
          </section>

          {/* Security Best Practices */}
          <section className={cardClass}>
            <div className="bg-amber-50/60 border-2 border-amber-200/70 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-amber-900 mb-2 text-lg">Security Best Practices</h4>
                  <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside">
                    <li><strong>2FA:</strong> Always require 2FA for admin accounts in production environments</li>
                    <li><strong>Password Policy:</strong> Use strong password policies (minimum 12 characters with mixed case, numbers, and special characters recommended)</li>
                    <li><strong>IP Allowlist:</strong> Configure IP allowlist to restrict admin access to trusted networks only</li>
                    <li><strong>Session Management:</strong> Set appropriate session timeout based on your security requirements (shorter for high-security environments)</li>
                    <li><strong>Rate Limiting:</strong> Enable rate limiting to protect against brute force attacks and DDoS</li>
                    <li><strong>Audit Logging:</strong> Keep security audit logging enabled to track all security events</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Audit */}
          <section className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={cardTitleClass}>Session Policy Audit</h3>
                <p className={cardHintClass}>Last 10 updates (ADMIN_SESSION_POLICY_UPDATE).</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {sessionPolicyAudit.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm text-slate-600">No recent entries.</div>
              ) : (
                sessionPolicyAudit.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm transition-shadow duration-200 hover:shadow-md">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                      <span className="font-medium text-slate-900">{new Date(row.createdAt).toLocaleString()}</span>
                      <span>•</span>
                      <span className="min-w-0 truncate">
                        {(row.actor?.name || row.actor?.email || row.actorRole || 'Admin')}
                        {row.actorId ? ` (#${row.actorId})` : ''}
                      </span>
                      {row.ip ? (
                        <>
                          <span>•</span>
                          <span className="text-slate-500">IP {row.ip}</span>
                        </>
                      ) : null}
                    </div>
                    <pre className="mt-2 max-w-full overflow-x-hidden whitespace-pre-wrap break-words rounded-xl bg-slate-50/70 p-3 text-[11px] text-slate-700 ring-1 ring-slate-200/60">{renderAuditChanges(row.changes)}</pre>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Tax & Invoicing */}
          <section className={cardClass}>
            <div>
              <h3 className={cardTitleClass}>Tax & Invoicing</h3>
              <p className={cardHintClass}>Numbering, tax rate, and invoice template preview.</p>
            </div>
            <div className="mt-5 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
              <div className="flex h-full min-w-0 flex-col overflow-visible rounded-xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
                <label htmlFor="taxRate" className={labelClass}>Tax Rate (%)</label>
                <input
                  id="taxRate"
                  type="number"
                  min={0}
                  step="0.01"
                  className={`${inputClass} mt-2`}
                  value={s?.taxPercent ?? 0}
                  onChange={e=>setS(prev=>({...(prev||{}), taxPercent: Number(e.target.value)}))}
                />
              </div>
              <div className="flex h-full min-w-0 flex-col overflow-visible rounded-xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
                <label htmlFor="invoicePrefix" className={labelClass}>Invoice Prefix</label>
                <input
                  id="invoicePrefix"
                  className={`${inputClass} mt-2`}
                  value={s?.invoicePrefix || 'INV-'}
                  onChange={e=>setS(prev=>({...(prev||{}), invoicePrefix: e.target.value}))}
                />
              </div>
            </div>

            <div className="mt-4 flex min-w-0 flex-col overflow-visible rounded-xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
              <label htmlFor="invoiceTemplate" className={labelClass}>Invoice Template (HTML)</label>
              <textarea
                id="invoiceTemplate"
                className={`${inputClass} mt-2 h-28 font-mono text-[12px]`}
                value={invoiceTemplate}
                onChange={e=>setInvoiceTemplate(e.target.value)}
                placeholder="<h1>Invoice {{invoiceNumber}}</h1>"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={saveInvoicingSettings} className={btnPrimary} type="button">Save</button>
              <button onClick={previewInvoice} className={btnSecondary} type="button">Preview</button>
            </div>
            <div
              id="invoicePreviewArea"
              className="mt-4 max-h-64 max-w-full overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200/70 bg-white/60 p-4 text-sm text-slate-700 shadow-sm [&_*]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_pre]:whitespace-pre-wrap [&_code]:break-words [&_p]:break-words [&_span]:break-words [&_a]:break-words [&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:table-fixed [&_th]:break-words [&_td]:break-words"
              dangerouslySetInnerHTML={{__html: invoicePreviewHtml || ''}}
            />
          </section>

          {/* Scheduling */}
          <section className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={cardTitleClass}>Scheduling</h3>
                <p className={cardHintClass}>Operational automation (cron policy backend pending).</p>
              </div>
              <span className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Coming soon</span>
            </div>

            <div className="mt-5 flex min-w-0 flex-col overflow-visible rounded-xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
              <label htmlFor="payoutCron" className={labelClass}>Cron Expression</label>
              <input
                id="payoutCron"
                className={`${inputClass} mt-2 min-w-0`}
                placeholder="e.g. 0 2 1 * *"
                value={payoutCron}
                onChange={e=>setPayoutCron(e.target.value)}
              />
              <p className={helpClass}>Default: 02:00 on the 1st of each month.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={updatePayoutCron} className={btnSecondary} type="button">Save (pending)</button>
                <button onClick={()=>alert('Preview not implemented')} className={btnSecondary} type="button">Run Preview</button>
                <button onClick={()=>alert('Execute not implemented')} className={btnSecondary} type="button">Execute Now</button>
              </div>
              <pre
                id="payoutCronResult"
                className="mt-4 max-h-48 max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200/70 bg-white/60 p-4 text-[12px] text-slate-700"
              />
            </div>
          </section>

          {/* Bonuses */}
          <section className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className={cardTitleClass}>Bonuses</h3>
                <p className={cardHintClass}>Manual owner bonus preview/grant (recorded via admin audit).</p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">Grant owner bonus</div>
                  <p className="mt-1 text-xs text-slate-600">Preview uses owner paid invoices (last 30 days). Grant writes an audit entry.</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={previewBonus}
                    className={btnSecondary}
                    type="button"
                    disabled={!bonusOwnerId || !Number.isFinite(Number(bonusOwnerId)) || Number(bonusOwnerId) <= 0}
                  >
                    Preview
                  </button>
                  <button
                    onClick={grantBonus}
                    className={btnPrimary}
                    type="button"
                    disabled={!bonusOwnerId || !Number.isFinite(Number(bonusOwnerId)) || Number(bonusOwnerId) <= 0}
                  >
                    Grant
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 items-stretch gap-4 border-t border-slate-200/70 pt-4 md:grid-cols-2">
                <div className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
                  <label htmlFor="bonusOwnerId" className={labelClass}>Owner ID</label>
                  <div className="mt-2 flex w-full min-w-0 overflow-hidden rounded-lg border border-slate-200/70 bg-white/70 shadow-sm transition-all duration-200 focus-within:border-[#02665e] focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#02665e]/18">
                    <input
                      id="bonusOwnerId"
                      className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      value={bonusOwnerId}
                      onChange={e=>setBonusOwnerId(String(e.target.value || '').replace(/\D+/g, ''))}
                      placeholder="e.g. 13"
                      inputMode="numeric"
                    />
                    <div className="flex shrink-0 items-center border-l border-slate-200/70 bg-white/50 px-3 text-xs font-semibold text-slate-600">#</div>
                  </div>
                  {!bonusOwnerId ? (
                    <p className={`${helpClass} min-h-4`}>Paste an Owner ID to auto-load the owner.</p>
                  ) : !Number.isFinite(Number(bonusOwnerId)) || Number(bonusOwnerId) <= 0 ? (
                    <p className="mt-1 min-h-4 text-xs font-medium text-rose-600">Enter a valid numeric owner ID.</p>
                  ) : bonusOwnerLookupLoading ? (
                    <p className={`${helpClass} min-h-4`}>Looking up owner…</p>
                  ) : bonusOwnerLookupError ? (
                    <p className="mt-1 min-h-4 text-xs font-medium text-rose-600">{bonusOwnerLookupError}</p>
                  ) : bonusOwnerLookup ? (
                    <p className={`${helpClass} min-h-4`}>Owner: <span className="font-semibold text-slate-700">{bonusOwnerLookup.name || `#${bonusOwnerLookup.id}`}</span>{bonusOwnerLookup.email ? <span className="text-slate-400"> · {bonusOwnerLookup.email}</span> : null}</p>
                  ) : (
                    <p className={`${helpClass} min-h-4`}>Owner receiving the bonus.</p>
                  )}
                </div>

                <div className="flex h-full min-w-0 flex-col rounded-xl border border-slate-200/70 bg-white/70 p-4 shadow-sm">
                  <label htmlFor="bonusPercentInput" className={labelClass}>Bonus (%)</label>
                  <div className="mt-2 flex w-full min-w-0 overflow-hidden rounded-lg border border-slate-200/70 bg-white/70 shadow-sm transition-all duration-200 focus-within:border-[#02665e] focus-within:ring-2 focus-within:ring-inset focus-within:ring-[#02665e]/18">
                    <input
                      id="bonusPercentInput"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                      value={bonusPercentInput}
                      onChange={e=>setBonusPercentInput(Number(e.target.value))}
                      placeholder="e.g. 5"
                    />
                    <div className="flex shrink-0 items-center border-l border-slate-200/70 bg-white/50 px-3 text-xs font-semibold text-slate-600">%</div>
                  </div>
                  <p className={`${helpClass} min-h-4`}>Percent applied to eligible revenue for the preview window.</p>
                </div>
              </div>

              {bonusPreview && (
                <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/70 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">Preview result</div>
                      <p className="mt-1 text-xs text-slate-600">Review computed values before granting.</p>
                    </div>
                    <span className="inline-flex w-fit items-center rounded-full border border-slate-200/70 bg-white/70 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {(bonusPreview as any)?.ok === true ? 'OK' : 'Result'}
                    </span>
                  </div>

                  {(bonusPreview as any)?.data && (
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3">
                        <div className="text-xs font-medium text-slate-500">Owner</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">#{String((bonusPreview as any).data.ownerId ?? bonusOwnerId)}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3">
                        <div className="text-xs font-medium text-slate-500">Bonus</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{formatPercent((bonusPreview as any).data.bonusPercent ?? bonusPercentInput)}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3">
                        <div className="text-xs font-medium text-slate-500">Eligible revenue</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{formatMoney((bonusPreview as any).data.totalRevenue)}</div>
                      </div>
                      <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3">
                        <div className="text-xs font-medium text-slate-500">Bonus amount</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{formatMoney((bonusPreview as any).data.bonusAmount)}</div>
                      </div>

                      <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3">
                        <div className="text-xs font-medium text-slate-500">Commission</div>
                        <div className="mt-1 flex items-baseline justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900">{formatPercent((bonusPreview as any).data.commissionPercent)}</div>
                          <div className="text-xs font-semibold text-slate-700">{formatMoney((bonusPreview as any).data.commissionAmount)}</div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200/70 bg-white/60 p-3">
                        <div className="text-xs font-medium text-slate-500">Reference</div>
                        <div className="mt-1 truncate font-mono text-xs font-semibold text-slate-800">{String((bonusPreview as any).data.bonusPaymentRef ?? '—')}</div>
                      </div>
                    </div>
                  )}

                  <details className="mt-4 rounded-xl border border-slate-200/70 bg-white/60 p-3">
                    <summary className="cursor-pointer select-none text-xs font-semibold text-slate-700">Raw response</summary>
                    <pre className="mt-3 max-h-64 max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-200/70 bg-white/70 p-4 text-[12px] text-slate-700">{JSON.stringify(bonusPreview, null, 2)}</pre>
                  </details>
                </div>
              )}
            </div>
          </section>
        </div>

          <div className="sticky bottom-4 mt-8 flex items-center justify-end">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-2 shadow-lg ring-1 ring-black/[0.03] backdrop-blur">
              <button
                onClick={saveSystemSettings}
                disabled={loading}
                className={btnPrimary}
                type="button"
              >
                <Settings className="h-4 w-4" />
                Save Settings
              </button>
            </div>
          </div>
      </div>
    </motion.div>
  );
}
