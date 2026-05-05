"use client";
// AdminPageHeader removed in favor of a centered, compact header for this page
import { ChevronDown, Settings, Shield, Lock, AlertTriangle, Network, Clock } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { useCallback, useEffect, useRef, useState } from "react";
import { sanitizeTrustedHtml } from "@/utils/html";
import { AnimatePresence, motion } from "framer-motion";

// Use same-origin calls + secure httpOnly cookie session.
const api = apiClient;

export default function SystemSettingsPage(){
  const inputClass =
    "w-full rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-[#02665e] focus:ring-2 focus:ring-inset focus:ring-[#02665e]/18";
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
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

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
    setSaving(true);
    try {
      await api.put('/admin/settings', payload);
      setToast('System settings saved (audit recorded)');
      setLastSavedAt(new Date());
      await load();
      await loadSessionPolicyAudit();
    } catch (err) {
      console.error(err);
      setToast('Failed to save system settings');
    } finally {
      setSaving(false);
    }
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

  const previewBonus = useCallback(async () => {
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
  }, [bonusOwnerId, bonusPercentInput]);

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
  }, [bonusOwnerId, bonusPercentInput, bonusOwnerLookup?.id, previewBonus]);

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
    <div className="bg-slate-50 min-h-screen">
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

      <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <div className="space-y-5">

          {/* Header */}
          <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[#02665e] via-emerald-400 to-[#02665e]" />
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-[#02665e]/10 flex items-center justify-center shrink-0">
                  <Settings className="h-7 w-7 text-[#02665e]" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">System Settings</h1>
                  <p className="mt-0.5 text-sm text-slate-500">Premium controls for platform configuration and security.</p>
                  {loading && <p className="mt-1 text-xs text-[#02665e] animate-pulse">Syncing latest settings...</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {lastSavedAt && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#02665e]/20 bg-[#02665e]/[0.07] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#02665e]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#02665e]" />
                    Saved {lastSavedAt.toLocaleTimeString()}
                  </span>
                )}
                <button
                  onClick={saveSystemSettings}
                  disabled={loading || saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#02665e] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_-4px_rgba(2,102,94,0.45)] transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 disabled:opacity-60 disabled:cursor-not-allowed"
                  type="button"
                >
                  <Settings className="h-4 w-4" />
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>

          {/* Settings Audit Trail */}
          <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-purple-400 to-violet-500" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">Settings Audit Trail</h3>
                    <p className="text-sm text-slate-500">Every settings save is recorded here with who changed what.</p>
                  </div>
                </div>
                <button
                  onClick={loadSessionPolicyAudit}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-[0.10em] text-slate-600 shadow-sm transition hover:bg-slate-50"
                  type="button"
                >
                  Refresh
                </button>
              </div>
              {sessionPolicyAudit.length === 0 ? (
                <div className="rounded-[14px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                  <p className="text-sm font-medium text-slate-400">No audit entries yet.</p>
                  <p className="mt-1 text-xs text-slate-300">Save settings to start recording changes.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Latest applied banner */}
                  <div className="rounded-[14px] border border-[#02665e]/20 bg-[#02665e]/[0.06] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#02665e] mb-0.5">Last Applied</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {new Date(sessionPolicyAudit[0].createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-medium text-slate-400">applied by</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {sessionPolicyAudit[0].actor?.name || sessionPolicyAudit[0].actor?.email || sessionPolicyAudit[0].actorRole || "Admin"}
                          {sessionPolicyAudit[0].actorId ? ` (#${sessionPolicyAudit[0].actorId})` : ""}
                        </p>
                        {sessionPolicyAudit[0].ip && <p className="text-[11px] text-slate-400">from IP {sessionPolicyAudit[0].ip}</p>}
                      </div>
                    </div>
                    {sessionPolicyAudit[0].changes && Object.keys(sessionPolicyAudit[0].changes).length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#02665e]/15">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#02665e] mb-2">Fields changed</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(sessionPolicyAudit[0].changes).slice(0, 8).map(([k, v]) => (
                            <span key={k} className="inline-flex items-center gap-1 rounded-lg border border-[#02665e]/15 bg-white px-2.5 py-1 text-[11px] font-mono text-slate-700">
                              <span className="font-bold text-[#02665e]">{k}</span>
                              <span className="text-slate-400">{String(v?.from ?? "null")}</span>
                              <span className="text-slate-300">&#8594;</span>
                              <span className="font-semibold">{String(v?.to ?? "null")}</span>
                            </span>
                          ))}
                          {Object.keys(sessionPolicyAudit[0].changes).length > 8 && (
                            <span className="text-[11px] text-slate-400">+{Object.keys(sessionPolicyAudit[0].changes).length - 8} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* History rows */}
                  {sessionPolicyAudit.slice(1).map((row) => (
                    <div key={row.id} className="rounded-[14px] border border-slate-100 bg-slate-50/60 p-4">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        <span className="font-semibold text-slate-700">{new Date(row.createdAt).toLocaleString()}</span>
                        <span className="text-slate-300">&bull;</span>
                        <span className="text-slate-500">{row.actor?.name || row.actor?.email || row.actorRole || "Admin"}{row.actorId ? ` (#${row.actorId})` : ""}</span>
                        {row.ip && <><span className="text-slate-300">&bull;</span><span className="text-slate-400">IP {row.ip}</span></>}
                        {row.changes && Object.keys(row.changes).length > 0 && (
                          <><span className="text-slate-300">&bull;</span><span className="font-medium text-[#02665e]">{Object.keys(row.changes).length} fields changed</span></>
                        )}
                      </div>
                      {row.changes && Object.keys(row.changes).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {Object.entries(row.changes).slice(0, 5).map(([k, v]) => (
                            <span key={k} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600">
                              {k}: {String(v?.from ?? "null")} &#8594; {String(v?.to ?? "null")}
                            </span>
                          ))}
                          {Object.keys(row.changes).length > 5 && (
                            <span className="text-[10px] text-slate-400">+{Object.keys(row.changes).length - 5} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Payments */}
          <section id="payments" className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[#02665e] via-emerald-400 to-[#02665e]" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center shrink-0">
                    <Settings className="h-5 w-5 text-[#02665e]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">Payments</h3>
                    <p className="text-sm text-slate-500">Platform fee and currency formatting.</p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.10em] text-emerald-700">Finance</span>
              </div>
              <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="commissionPercent" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Commission Rate</label>
                  <div className="flex overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50/50 shadow-sm transition-all focus-within:border-[#02665e]/40 focus-within:ring-2 focus-within:ring-[#02665e]/15">
                    <input
                      id="commissionPercent"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="10"
                      value={s?.commissionPercent ?? 0}
                      className="min-w-0 flex-1 border-0 bg-transparent px-4 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-300"
                      onChange={e=>setS((prev: any)=>({...(prev||{}), commissionPercent: Number(e.target.value)}))}
                    />
                    <div className="flex shrink-0 items-center border-l border-slate-200 bg-[#02665e]/10 px-3 text-sm font-bold text-[#02665e]">%</div>
                  </div>
                </div>
                <div>
                  <label htmlFor="currency" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Currency</label>
                  <div className="flex overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50/50 shadow-sm transition-all focus-within:border-[#02665e]/40 focus-within:ring-2 focus-within:ring-[#02665e]/15">
                    <select
                      id="currency"
                      className="min-w-0 flex-1 appearance-none border-0 bg-transparent px-4 py-2.5 text-sm text-slate-900 outline-none"
                      value={s?.currency||"TZS"}
                      onChange={e=>setS((prev: any)=>({...(prev||{}), currency: e.target.value}))}
                    >
                      <option value="TZS">TZS</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="KSH">KSH</option>
                      <option value="AED">AED</option>
                    </select>
                    <div className="flex shrink-0 items-center border-l border-slate-200 bg-slate-100 px-3 text-slate-500">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Notifications */}
          <section id="notifications" className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-blue-400 to-indigo-500" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">Notifications</h3>
                    <p className="text-sm text-slate-500">Channels and customer support contact.</p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.10em] text-indigo-700">Live</span>
              </div>
              <div className="space-y-3">
                <div className="flex min-w-0 items-center justify-between gap-4 rounded-[14px] border border-slate-100 bg-slate-50/50 px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Email notifications</div>
                    <div className="mt-0.5 text-xs text-slate-500">Send emails for invoices and key actions.</div>
                  </div>
                  <label className="group relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" aria-label="Email notifications" checked={Boolean(s.emailEnabled)} className="peer sr-only" onChange={e=>setS({...s, emailEnabled: e.target.checked})} />
                    <div className={toggleTrackClass}><Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" /></div>
                  </label>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-4 rounded-[14px] border border-slate-100 bg-slate-50/50 px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">SMS alerts</div>
                    <div className="mt-0.5 text-xs text-slate-500">Urgent events and operational alerts.</div>
                  </div>
                  <label className="group relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" aria-label="SMS alerts" checked={Boolean(s.smsEnabled)} className="peer sr-only" onChange={e=>setS({...s, smsEnabled: e.target.checked})} />
                    <div className={toggleTrackClass}><Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" /></div>
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-2">
                  <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Support Email</label>
                    <input className={inputClass} value={supportEmail} onChange={e=>setSupportEmail(e.target.value)} placeholder="support@nolsaf.com" type="email" />
                  </div>
                  <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                    <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Support Phone</label>
                    <input className={inputClass} value={supportPhone} onChange={e=>setSupportPhone(e.target.value)} placeholder="+255 736 766 726" type="tel" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Feature Flags & Templates */}
          <section id="featureflags" className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-300 to-amber-400" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                    <Settings className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">Feature Flags &amp; Templates</h3>
                    <p className="text-sm text-slate-500">Client-side preview only — backend persistence is pending.</p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.10em] text-amber-700">Preview</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                  <label htmlFor="featureFlags" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Feature Flags (JSON)</label>
                  <textarea id="featureFlags" className={`${inputClass} h-28 font-mono text-[12px]`} value={featureFlags} onChange={e=>setFeatureFlags(e.target.value)} placeholder='{"new_ui": true}' />
                </div>
                <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                  <label htmlFor="notificationTemplates" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Notification Templates (JSON)</label>
                  <textarea id="notificationTemplates" className={`${inputClass} h-28 font-mono text-[12px]`} value={notificationTemplates} onChange={e=>setNotificationTemplates(e.target.value)} placeholder='{"owner_payout": "Payout of {{amount}} processed"}' />
                </div>
              </div>
              <div className="mt-4">
                <button onClick={saveFlagsAndTemplates} className={btnSecondary} type="button">Save (preview)</button>
              </div>
            </div>
          </section>

          {/* Security & Sessions */}
          <section id="security" className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-rose-500 via-red-400 to-rose-500" />
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <Shield className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Security & Sessions</h3>
                    <p className="text-sm text-slate-500">Role-based session TTL is enforced server-side and audited.</p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.10em] text-rose-700">Audited</span>
              </div>
              <div className="space-y-3">
                <div className="flex min-w-0 items-center justify-between gap-4 rounded-[14px] border border-slate-100 bg-slate-50/50 px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Require 2FA for admins</div>
                    <div className="mt-0.5 text-xs text-slate-500">Enforce two-factor authentication for all admin accounts.</div>
                  </div>
                  <label className="group relative inline-flex cursor-pointer items-center">
                    <input id="admin2fa" type="checkbox" aria-label="Require 2FA for admins" checked={Boolean(s?.requireAdmin2FA)} className="peer sr-only" onChange={e=>setS(prev=>({...(prev||{}), requireAdmin2FA: e.target.checked}))} />
                    <div className={toggleTrackClass}><Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" /></div>
                  </label>
                </div>

                <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Session TTL by role (minutes)</div>
                      <div className="mt-0.5 text-xs text-slate-500">Blank role values fall back to Default.</div>
                    </div>
                    <span className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.10em] text-slate-600">Audited</span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                    <div className="rounded-[12px] border border-slate-200 bg-white p-3.5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-slate-400" />
                        <label htmlFor="sessionTtlDefault" className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Default</label>
                      </div>
                      <input id="sessionTtlDefault" type="number" min={5} className={inputClass} value={(s?.sessionIdleMinutes ?? 60) as any} onChange={e=>setS(prev=>({...(prev||{}), sessionIdleMinutes: Number(e.target.value)}))} />
                    </div>
                    <div className="rounded-[12px] border border-[#02665e]/20 bg-[#02665e]/[0.04] p-3.5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-[#02665e]" />
                        <label htmlFor="sessionTtlAdmin" className="text-xs font-bold uppercase tracking-[0.12em] text-[#02665e]">Admin</label>
                      </div>
                      <input id="sessionTtlAdmin" type="number" min={5} placeholder="(default)" className={inputClass} value={(s?.sessionMaxMinutesAdmin ?? "") as any} onChange={e=>setS(prev=>({...(prev||{}), sessionMaxMinutesAdmin: e.target.value === "" ? null : Number(e.target.value)}))} />
                    </div>
                    <div className="rounded-[12px] border border-indigo-200 bg-indigo-50/40 p-3.5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        <label htmlFor="sessionTtlOwner" className="text-xs font-bold uppercase tracking-[0.12em] text-indigo-700">Owner</label>
                      </div>
                      <input id="sessionTtlOwner" type="number" min={5} placeholder="(default)" className={inputClass} value={(s?.sessionMaxMinutesOwner ?? "") as any} onChange={e=>setS(prev=>({...(prev||{}), sessionMaxMinutesOwner: e.target.value === "" ? null : Number(e.target.value)}))} />
                    </div>
                    <div className="rounded-[12px] border border-amber-200 bg-amber-50/40 p-3.5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        <label htmlFor="sessionTtlDriver" className="text-xs font-bold uppercase tracking-[0.12em] text-amber-700">Driver</label>
                      </div>
                      <input id="sessionTtlDriver" type="number" min={5} placeholder="(default)" className={inputClass} value={(s?.sessionMaxMinutesDriver ?? "") as any} onChange={e=>setS(prev=>({...(prev||{}), sessionMaxMinutesDriver: e.target.value === "" ? null : Number(e.target.value)}))} />
                    </div>
                    <div className="rounded-[12px] border border-sky-200 bg-sky-50/40 p-3.5 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="h-2 w-2 rounded-full bg-sky-500" />
                        <label htmlFor="sessionTtlCustomer" className="text-xs font-bold uppercase tracking-[0.12em] text-sky-700">Customer</label>
                      </div>
                      <input id="sessionTtlCustomer" type="number" min={5} placeholder="(default)" className={inputClass} value={(s?.sessionMaxMinutesCustomer ?? "") as any} onChange={e=>setS(prev=>({...(prev||{}), sessionMaxMinutesCustomer: e.target.value === "" ? null : Number(e.target.value)}))} />
                    </div>
                  </div>
                  <div className="mt-3 rounded-[12px] border border-slate-200 bg-white p-3 text-xs text-slate-500">
                    Reducing a role TTL forces re-login on the next request.
                  </div>
                </div>

                <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <div className="text-sm font-semibold text-slate-900">Max session duration (hours)</div>
                  </div>
                  <input
                    id="maxSessionDurationHours"
                    type="number"
                    min={1}
                    max={720}
                    className={`${inputClass} ${validationErrors.maxSessionDurationHours ? "border-red-300" : ""}`}
                    value={(s?.maxSessionDurationHours ?? 24) as any}
                    onChange={e=>setS(prev=>({...(prev||{}), maxSessionDurationHours: Number(e.target.value)}))}
                  />
                  {validationErrors.maxSessionDurationHours && <p className="mt-1 text-xs text-red-600">{validationErrors.maxSessionDurationHours}</p>}
                  <p className="mt-1.5 text-xs text-slate-400">Maximum session lifetime before requiring re-authentication.</p>
                </div>

                <div className="flex min-w-0 items-center justify-between gap-4 rounded-[14px] border border-slate-100 bg-slate-50/50 px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Force logout on password change</div>
                    <div className="mt-0.5 text-xs text-slate-500">Automatically logout all sessions when password is changed.</div>
                  </div>
                  <label className="group relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" aria-label="Force logout on password change" checked={Boolean(s?.forceLogoutOnPasswordChange ?? true)} className="peer sr-only" onChange={e=>setS(prev=>({...(prev||{}), forceLogoutOnPasswordChange: e.target.checked}))} />
                    <div className={toggleTrackClass}><Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" /></div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Password Requirements */}
          <section id="passwords" className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <Lock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Password Requirements</h3>
                  <p className="text-sm text-slate-500">Configure password complexity and security policies.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                  <label htmlFor="minPasswordLength" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Min password length</label>
                  <input
                    id="minPasswordLength"
                    type="number"
                    min={6}
                    max={128}
                    className={`${inputClass} ${validationErrors.minPasswordLength ? "border-red-300" : ""}`}
                    value={(s?.minPasswordLength ?? 10) as any}
                    onChange={e=>setS(prev=>({...(prev||{}), minPasswordLength: Number(e.target.value)}))}
                  />
                  {validationErrors.minPasswordLength && <p className="mt-1 text-xs text-red-600">{validationErrors.minPasswordLength}</p>}
                  <p className="mt-1.5 text-xs text-slate-400">Minimum number of characters required.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: "Require uppercase letters", key: "requirePasswordUppercase", val: s?.requirePasswordUppercase, hint: "Must contain at least one uppercase letter." },
                  { label: "Require lowercase letters", key: "requirePasswordLowercase", val: s?.requirePasswordLowercase, hint: "Must contain at least one lowercase letter." },
                  { label: "Require numbers", key: "requirePasswordNumber", val: s?.requirePasswordNumber, hint: "Must contain at least one number." },
                  { label: "Require special characters", key: "requirePasswordSpecial", val: s?.requirePasswordSpecial, hint: "Must contain at least one special character (!@#$%^&*)." },
                ].map(({ label, key, val, hint }) => (
                  <div key={key} className="flex items-center justify-between gap-4 rounded-[14px] border border-slate-100 bg-slate-50/50 px-4 py-3.5">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{label}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{hint}</div>
                    </div>
                    <label className="group relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" aria-label={label} checked={Boolean(val ?? false)} className="peer sr-only" onChange={e=>setS(prev=>({...(prev||{}), [key]: e.target.checked}))} />
                      <div className={toggleTrackClass}><Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" /></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Network Security */}
          <section id="network" className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                  <Network className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Network Security</h3>
                  <p className="text-sm text-slate-500">Restrict admin access by IP address and configure network policies.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label htmlFor="ipAllowlist" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Admin IP Allowlist (CIDR format)</label>
                  <textarea
                    id="ipAllowlist"
                    className={`${inputClass} font-mono text-xs ${validationErrors.ipAllowlist ? "border-red-300" : ""}`}
                    value={s?.ipAllowlist || ""}
                    onChange={e=>setS(prev=>({...(prev||{}), ipAllowlist: e.target.value}))}
                    onBlur={(e) => {
                      const error = validateIPAllowlist(e.target.value);
                      if (!error.valid && error.error) {
                        setValidationErrors(prev => ({ ...prev, ipAllowlist: error.error || "Invalid IP allowlist format" }));
                      } else {
                        setValidationErrors(prev => { const n = { ...prev }; delete n.ipAllowlist; return n; });
                      }
                    }}
                    placeholder="192.168.1.0/24, 10.0.0.0/8, 172.16.0.0/12"
                    rows={4}
                  />
                  {validationErrors.ipAllowlist && <p className="mt-1 text-xs text-red-600">{validationErrors.ipAllowlist}</p>}
                  <p className="mt-1.5 text-xs text-slate-400">Enter IP addresses or CIDR ranges separated by commas. Leave empty to allow all IPs.</p>
                </div>
                <div className="flex min-w-0 items-center justify-between gap-4 rounded-[14px] border border-slate-100 bg-slate-50/50 px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Enable IP allowlist enforcement</div>
                    <div className="mt-0.5 text-xs text-slate-500">Restrict admin access to trusted networks only.</div>
                  </div>
                  <label className="group relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" aria-label="Enable IP allowlist enforcement" checked={Boolean(s?.enableIpAllowlist ?? false)} className="peer sr-only" onChange={e=>setS(prev=>({...(prev||{}), enableIpAllowlist: e.target.checked}))} />
                    <div className={toggleTrackClass}><Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" /></div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* Rate Limiting */}
          <section id="ratelimit" className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-red-600 via-rose-400 to-red-600" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Rate Limiting & DDoS Protection</h3>
                  <p className="text-sm text-slate-500">Configure API rate limits and protect against abuse.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                  <label htmlFor="apiRateLimitPerMinute" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">API requests / minute</label>
                  <input id="apiRateLimitPerMinute" type="number" min={10} max={10000} className={`${inputClass} ${validationErrors.apiRateLimitPerMinute ? "border-red-300" : ""}`} value={(s?.apiRateLimitPerMinute ?? 100) as any} onChange={e=>setS(prev=>({...(prev||{}), apiRateLimitPerMinute: Number(e.target.value)}))} />
                  {validationErrors.apiRateLimitPerMinute && <p className="mt-1 text-xs text-red-600">{validationErrors.apiRateLimitPerMinute}</p>}
                  <p className="mt-1.5 text-xs text-slate-400">Max API requests allowed per minute per IP.</p>
                </div>
                <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                  <label htmlFor="maxLoginAttempts" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Login attempts before lockout</label>
                  <input id="maxLoginAttempts" type="number" min={3} max={20} className={`${inputClass} ${validationErrors.maxLoginAttempts ? "border-red-300" : ""}`} value={(s?.maxLoginAttempts ?? 5) as any} onChange={e=>setS(prev=>({...(prev||{}), maxLoginAttempts: Number(e.target.value)}))} />
                  {validationErrors.maxLoginAttempts && <p className="mt-1 text-xs text-red-600">{validationErrors.maxLoginAttempts}</p>}
                  <p className="mt-1.5 text-xs text-slate-400">Failed attempts before account lockout.</p>
                </div>
                <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                  <label htmlFor="accountLockoutDurationMinutes" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Lockout duration (minutes)</label>
                  <input id="accountLockoutDurationMinutes" type="number" min={5} max={1440} className={`${inputClass} ${validationErrors.accountLockoutDurationMinutes ? "border-red-300" : ""}`} value={(s?.accountLockoutDurationMinutes ?? 30) as any} onChange={e=>setS(prev=>({...(prev||{}), accountLockoutDurationMinutes: Number(e.target.value)}))} />
                  {validationErrors.accountLockoutDurationMinutes && <p className="mt-1 text-xs text-red-600">{validationErrors.accountLockoutDurationMinutes}</p>}
                  <p className="mt-1.5 text-xs text-slate-400">Duration of account lockout after max login attempts.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Security Audit & Monitoring */}
          <section id="auditmon" className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-purple-600 via-purple-400 to-purple-600" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Security Audit & Monitoring</h3>
                  <p className="text-sm text-slate-500">Configure security auditing and monitoring policies.</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { label: "Enable security audit logging", key: "enableSecurityAuditLogging", val: s?.enableSecurityAuditLogging ?? true, hint: "Log all security-related events and admin actions." },
                  { label: "Log failed login attempts", key: "logFailedLoginAttempts", val: s?.logFailedLoginAttempts ?? true, hint: "Record all failed login attempts for security analysis." },
                  { label: "Alert on suspicious activity", key: "alertOnSuspiciousActivity", val: s?.alertOnSuspiciousActivity ?? false, hint: "Send alerts when suspicious security events are detected." },
                ].map(({ label, key, val, hint }) => (
                  <div key={key} className="flex items-center justify-between gap-4 rounded-[14px] border border-slate-100 bg-slate-50/50 px-4 py-3.5">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{label}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{hint}</div>
                    </div>
                    <label className="group relative inline-flex cursor-pointer items-center">
                      <input type="checkbox" aria-label={label} checked={Boolean(val)} className="peer sr-only" onChange={e=>setS(prev=>({...(prev||{}), [key]: e.target.checked}))} />
                      <div className={toggleTrackClass}><Lock className="absolute left-[6px] top-1/2 h-3 w-3 -translate-y-1/2 text-white opacity-0 transition-opacity duration-200 group-has-[:checked]:opacity-100 pointer-events-none" /></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Security Best Practices */}
          <div className="rounded-[20px] border-2 border-amber-200/80 bg-amber-50/60 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-amber-900 mb-3">Security Best Practices</h4>
                <ul className="space-y-2">
                  {[
                    ["2FA", "Always require 2FA for admin accounts in production environments."],
                    ["Password Policy", "Minimum 12 characters with mixed case, numbers, and special characters recommended."],
                    ["IP Allowlist", "Configure IP allowlist to restrict admin access to trusted networks only."],
                    ["Session Mgmt", "Set appropriate session timeout based on your security requirements."],
                    ["Rate Limiting", "Enable rate limiting to protect against brute force and DDoS attacks."],
                    ["Audit Logging", "Keep security audit logging enabled to track all security events."],
                  ].map(([k, v]) => (
                    <li key={k} className="flex items-start gap-2.5 text-sm text-amber-800">
                      <span className="mt-1 h-4 w-4 rounded-full bg-amber-200 flex items-center justify-center shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-700" />
                      </span>
                      <span><strong>{k}:</strong> {v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Tax & Invoicing */}
          <section id="invoicing" className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[#02665e] via-teal-400 to-[#02665e]" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center shrink-0">
                  <Settings className="h-5 w-5 text-[#02665e]" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tax & Invoicing</h3>
                  <p className="text-sm text-slate-500">Numbering, tax rate, and invoice template preview.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 mb-4">
                <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                  <label htmlFor="taxRate" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Tax Rate (%)</label>
                  <input id="taxRate" type="number" min={0} step="0.01" className={inputClass} value={s?.taxPercent ?? 0} onChange={e=>setS(prev=>({...(prev||{}), taxPercent: Number(e.target.value)}))} />
                </div>
                <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                  <label htmlFor="invoicePrefix" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Invoice Prefix</label>
                  <input id="invoicePrefix" className={inputClass} value={s?.invoicePrefix || "INV-"} onChange={e=>setS(prev=>({...(prev||{}), invoicePrefix: e.target.value}))} />
                </div>
              </div>
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4 mb-4">
                <label htmlFor="invoiceTemplate" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Invoice Template (HTML)</label>
                <textarea id="invoiceTemplate" className={`${inputClass} h-28 font-mono text-[12px]`} value={invoiceTemplate} onChange={e=>setInvoiceTemplate(e.target.value)} placeholder="<h1>Invoice {{invoiceNumber}}</h1>" />
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                <button onClick={saveInvoicingSettings} className={btnPrimary} type="button">Save</button>
                <button onClick={previewInvoice} className={btnSecondary} type="button">Preview</button>
              </div>
              <div
                id="invoicePreviewArea"
                className="max-h-64 max-w-full overflow-x-hidden overflow-y-auto rounded-[14px] border border-slate-200 bg-white p-4 text-sm text-slate-700 [&_*]:max-w-full [&_img]:h-auto [&_img]:max-w-full [&_pre]:whitespace-pre-wrap [&_code]:break-words [&_p]:break-words [&_span]:break-words [&_a]:break-words [&_table]:block [&_table]:w-full [&_table]:max-w-full [&_table]:table-fixed [&_th]:break-words [&_td]:break-words"
                dangerouslySetInnerHTML={{__html: invoicePreviewHtml || ""}}
              />
            </div>
          </section>

          {/* Scheduling */}
          <section id="scheduling" className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-sky-500" />
            <div className="p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">Scheduling</h3>
                    <p className="text-sm text-slate-500">Operational automation (cron policy backend pending).</p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.10em] text-amber-700">Coming soon</span>
              </div>
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                <label htmlFor="payoutCron" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Cron Expression</label>
                <input id="payoutCron" className={`${inputClass} font-mono`} placeholder="e.g. 0 2 1 * *" value={payoutCron} onChange={e=>setPayoutCron(e.target.value)} />
                <p className="mt-1.5 text-xs text-slate-400">Default: 02:00 on the 1st of each month.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={updatePayoutCron} className={btnSecondary} type="button">Save (pending)</button>
                  <button onClick={()=>alert("Preview not implemented")} className={btnSecondary} type="button">Run Preview</button>
                  <button onClick={()=>alert("Execute not implemented")} className={btnSecondary} type="button">Execute Now</button>
                </div>
                <pre id="payoutCronResult" className="mt-4 max-h-48 max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words rounded-[12px] border border-slate-200 bg-white p-4 text-[12px] text-slate-700" />
              </div>
            </div>
          </section>

          {/* Bonuses */}
          <section id="bonuses" className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-violet-600 via-purple-400 to-violet-600" />
            <div className="p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Bonuses</h3>
                  <p className="text-sm text-slate-500">Manual owner bonus preview/grant (recorded via admin audit).</p>
                </div>
              </div>
              <div className="rounded-[14px] border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">Grant owner bonus</div>
                    <p className="mt-0.5 text-xs text-slate-500">Preview uses owner paid invoices (last 30 days). Grant writes an audit entry.</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={previewBonus} className={btnSecondary} type="button" disabled={!bonusOwnerId || !Number.isFinite(Number(bonusOwnerId)) || Number(bonusOwnerId) <= 0}>Preview</button>
                    <button onClick={grantBonus} className={btnPrimary} type="button" disabled={!bonusOwnerId || !Number.isFinite(Number(bonusOwnerId)) || Number(bonusOwnerId) <= 0}>Grant</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 items-stretch gap-4 border-t border-slate-200/70 pt-4 sm:grid-cols-2">
                  <div className="flex h-full min-w-0 flex-col rounded-[12px] border border-slate-200 bg-white p-4">
                    <label htmlFor="bonusOwnerId" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Owner ID</label>
                    <div className="flex overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50/50 shadow-sm transition-all focus-within:border-[#02665e]/40 focus-within:ring-2 focus-within:ring-[#02665e]/15">
                      <input id="bonusOwnerId" className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300" value={bonusOwnerId} onChange={e=>setBonusOwnerId(String(e.target.value || "").replace(/\D+/g, ""))} placeholder="e.g. 13" inputMode="numeric" />
                      <div className="flex shrink-0 items-center border-l border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-500">#</div>
                    </div>
                    {!bonusOwnerId ? (
                      <p className="mt-1.5 text-xs text-slate-400">Paste an Owner ID to auto-load the owner.</p>
                    ) : !Number.isFinite(Number(bonusOwnerId)) || Number(bonusOwnerId) <= 0 ? (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">Enter a valid numeric owner ID.</p>
                    ) : bonusOwnerLookupLoading ? (
                      <p className="mt-1.5 text-xs text-slate-400">Looking up owner...</p>
                    ) : bonusOwnerLookupError ? (
                      <p className="mt-1.5 text-xs font-medium text-rose-600">{bonusOwnerLookupError}</p>
                    ) : bonusOwnerLookup ? (
                      <p className="mt-1.5 text-xs text-slate-500">Owner: <span className="font-semibold text-slate-700">{bonusOwnerLookup.name || `#${bonusOwnerLookup.id}`}</span>{bonusOwnerLookup.email ? <span className="text-slate-400"> &middot; {bonusOwnerLookup.email}</span> : null}</p>
                    ) : (
                      <p className="mt-1.5 text-xs text-slate-400">Owner receiving the bonus.</p>
                    )}
                  </div>
                  <div className="flex h-full min-w-0 flex-col rounded-[12px] border border-slate-200 bg-white p-4">
                    <label htmlFor="bonusPercentInput" className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 mb-1.5">Bonus (%)</label>
                    <div className="flex overflow-hidden rounded-[10px] border border-slate-200 bg-slate-50/50 shadow-sm transition-all focus-within:border-[#02665e]/40 focus-within:ring-2 focus-within:ring-[#02665e]/15">
                      <input id="bonusPercentInput" type="number" min={0} step="0.01" inputMode="decimal" className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-300" value={bonusPercentInput} onChange={e=>setBonusPercentInput(Number(e.target.value))} placeholder="e.g. 5" />
                      <div className="flex shrink-0 items-center border-l border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-500">%</div>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">Percent applied to eligible revenue for the preview window.</p>
                  </div>
                </div>
                {bonusPreview && (
                  <div className="mt-4 rounded-[14px] border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">Preview result</div>
                        <p className="mt-0.5 text-xs text-slate-500">Review computed values before granting.</p>
                      </div>
                      <span className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.10em] text-slate-600">
                        {(bonusPreview as any)?.ok === true ? "OK" : "Result"}
                      </span>
                    </div>
                    {(bonusPreview as any)?.data && (
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-4">
                        {[
                          { label: "Owner", value: `#${String((bonusPreview as any).data.ownerId ?? bonusOwnerId)}` },
                          { label: "Bonus", value: formatPercent((bonusPreview as any).data.bonusPercent ?? bonusPercentInput) },
                          { label: "Eligible revenue", value: formatMoney((bonusPreview as any).data.totalRevenue) },
                          { label: "Bonus amount", value: formatMoney((bonusPreview as any).data.bonusAmount) },
                          { label: "Commission %", value: formatPercent((bonusPreview as any).data.commissionPercent) },
                          { label: "Reference", value: String((bonusPreview as any).data.bonusPaymentRef ?? "\u2014") },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-[10px] border border-slate-100 bg-slate-50 p-3">
                            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 truncate font-mono">{value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <details className="rounded-[12px] border border-slate-200 bg-slate-50 p-3">
                      <summary className="cursor-pointer select-none text-xs font-semibold text-slate-600">Raw response</summary>
                      <pre className="mt-3 max-h-64 max-w-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-words rounded-[10px] border border-slate-200 bg-white p-4 text-[12px] text-slate-700">{JSON.stringify(bonusPreview, null, 2)}</pre>
                    </details>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div>
            {lastSavedAt ? (
              <span className="text-xs text-slate-500">
                Last saved: <span className="font-semibold text-slate-700">{lastSavedAt.toLocaleTimeString()}</span>
              </span>
            ) : (
              <span className="text-xs text-slate-400">Unsaved changes will be lost on reload.</span>
            )}
          </div>
          <button
            onClick={saveSystemSettings}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[#02665e] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_-4px_rgba(2,102,94,0.45)] transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 disabled:opacity-60 disabled:cursor-not-allowed"
            type="button"
          >
            <Settings className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
