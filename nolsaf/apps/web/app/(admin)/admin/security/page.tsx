"use client";
import AdminPageHeader from "@/components/AdminPageHeader";
import { Shield, Lock, AlertTriangle, CheckCircle, X, Key, Clock, Network } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

// Use same-origin relative paths so Next.js rewrites proxy to the API in dev
const api = axios.create({ baseURL: "", withCredentials: true });

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

// Validate IP allowlist
function validateIPAllowlist(value: string): { valid: boolean; error?: string } {
  if (!value || value.trim() === '') return { valid: true }; // Empty is allowed
  
  const entries = value.split(',').map(s => s.trim()).filter(s => s);
  for (const entry of entries) {
    if (!isValidCIDR(entry)) {
      return { valid: false, error: `Invalid CIDR format: "${entry}". Use format like 192.168.1.0/24` };
    }
  }
  return { valid: true };
}

export default function No4PSecurityPage() {
  const [s,setS]=useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(()=>{ 
    api.get("/admin/settings").then(r=>setS(r.data)).catch(err => {
      console.error('Failed to load settings:', err);
      setSaveMessage({type: 'error', text: 'Failed to load settings'});
    });
  },[]);
  
  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'ipAllowlist':
        const ipValidation = validateIPAllowlist(value || '');
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

  const handleFieldChange = (field: string, value: any) => {
    const error = validateField(field, value);
    if (error) {
      setValidationErrors(prev => ({ ...prev, [field]: error }));
    } else {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
    setS({...s, [field]: value});
  };
  
  const save = async () => { 
    // Validate all fields before saving
    const errors: Record<string, string> = {};
    const fieldsToValidate = [
      'ipAllowlist', 'minPasswordLength', 'sessionIdleMinutes', 
      'maxSessionDurationHours', 'apiRateLimitPerMinute', 
      'maxLoginAttempts', 'accountLockoutDurationMinutes'
    ];
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, s[field]);
      if (error) errors[field] = error;
    });
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setSaveMessage({type: 'error', text: 'Please fix validation errors before saving'});
      return;
    }
    
    setSaving(true);
    setSaveMessage(null);
    try {
      await api.put("/admin/settings", s);
      setSaveMessage({type: 'success', text: 'Security settings saved successfully!'});
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setSaveMessage({type: 'error', text: err?.response?.data?.error || 'Failed to save settings'});
    } finally {
      setSaving(false);
    }
  };

  if (!s) return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="dot-spinner dot-md mx-auto" aria-hidden>
          <span className="dot dot-blue" />
          <span className="dot dot-black" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <p className="text-sm text-slate-500 mt-4">Loading security settings…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {saveMessage && (
        <div className={`rounded-lg border-2 p-4 ${
          saveMessage.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <div className="flex items-center gap-2">
            {saveMessage.type === 'success' ? (
              <CheckCircle className="h-5 w-5" />
            ) : (
              <X className="h-5 w-5" />
            )}
            <span className="font-medium">{saveMessage.text}</span>
          </div>
        </div>
      )}

      <No4PSecurity s={s} setS={handleFieldChange} validationErrors={validationErrors} />

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-gray-200">
        <button 
          className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
            saving
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-[#02665e] text-white hover:bg-[#014d47] hover:shadow-md active:scale-95'
          }`} 
          onClick={save}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Security Settings'}
        </button>
        {saving && (
          <span className="text-sm text-gray-500">Please wait while settings are being saved...</span>
        )}
      </div>
    </div>
  );
}

function No4PSecurity({s,setS,validationErrors}:{s:any;setS:(field:string,value:any)=>void;validationErrors:Record<string,string>}){
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-[#02665e]/10 to-slate-50 border-2 border-[#02665e]/20 rounded-2xl p-6">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-[#02665e] flex items-center justify-center shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">No4P Security</h2>
            <p className="text-sm text-gray-600 mt-1">NoLS Platform Security & Cybersecurity Configuration</p>
          </div>
        </div>
      </div>

      {/* Authentication & Access Control */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="h-10 w-10 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-[#02665e]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Authentication & Access Control</h3>
            <p className="text-sm text-gray-600">Configure login and access security policies</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="min-w-0">
            <Toggle 
              label="Require admin 2FA" 
              value={s.requireAdmin2FA || false} 
              onChange={v=>setS('requireAdmin2FA', v)}
              description="Enforce two-factor authentication for all admin accounts"
            />
          </div>
          <div className="min-w-0">
            <Num 
              label="Min password length" 
              value={s.minPasswordLength || 8} 
              onChange={v=>setS('minPasswordLength', v)}
              description="Minimum number of characters required for passwords"
              min={6}
              max={128}
              error={validationErrors.minPasswordLength}
            />
          </div>
          <Toggle 
            label="Require uppercase in password" 
            value={s.requirePasswordUppercase || false} 
            onChange={v=>setS('requirePasswordUppercase', v)}
            description="Passwords must contain at least one uppercase letter"
          />
          <Toggle 
            label="Require lowercase in password" 
            value={s.requirePasswordLowercase || false} 
            onChange={v=>setS('requirePasswordLowercase', v)}
            description="Passwords must contain at least one lowercase letter"
          />
          <Toggle 
            label="Require numbers in password" 
            value={s.requirePasswordNumber || false} 
            onChange={v=>setS('requirePasswordNumber', v)}
            description="Passwords must contain at least one number"
          />
          <Toggle 
            label="Require special characters in password" 
            value={s.requirePasswordSpecial || false} 
            onChange={v=>setS('requirePasswordSpecial', v)}
            description="Passwords must contain at least one special character (!@#$%^&*)"
          />
        </div>
      </div>

      {/* Session Management */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">Session Management</h3>
            <p className="text-sm text-gray-600">Configure session timeout and security policies</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="min-w-0">
            <Num 
              label="Session idle minutes" 
              value={s.sessionIdleMinutes || 30} 
              onChange={v=>setS('sessionIdleMinutes', v)}
              description="Auto-logout after this many minutes of inactivity"
              min={5}
              max={1440}
              error={validationErrors.sessionIdleMinutes}
            />
          </div>
          <div className="min-w-0">
            <Num 
              label="Max session duration (hours)" 
              value={s.maxSessionDurationHours || 24} 
              onChange={v=>setS('maxSessionDurationHours', v)}
              description="Maximum session lifetime before requiring re-authentication"
              min={1}
              max={720}
              error={validationErrors.maxSessionDurationHours}
            />
          </div>
          <div className="min-w-0">
            <Toggle 
              label="Force logout on password change" 
              value={s.forceLogoutOnPasswordChange !== false} 
              onChange={v=>setS('forceLogoutOnPasswordChange', v)}
              description="Automatically logout all sessions when password is changed"
            />
          </div>
        </div>
      </div>

      {/* Network Security */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="h-10 w-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
            <Network className="h-5 w-5 text-orange-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">Network Security</h3>
            <p className="text-sm text-gray-600">Restrict admin access by IP address and configure network policies</p>
          </div>
        </div>
        <div className="space-y-6">
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin IP Allowlist (CIDR format)
            </label>
            <div className="w-full max-w-2xl mx-auto">
              <textarea
                className={`w-full border-2 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:ring-2 focus:ring-[#02665e]/20 outline-none transition-all duration-200 font-mono resize-none ${
                  validationErrors.ipAllowlist 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-gray-300 focus:border-[#02665e]'
                }`}
                value={s.ipAllowlist||""}
                onChange={e=>setS('ipAllowlist', e.target.value)}
                onBlur={(e) => {
                  const error = validateIPAllowlist(e.target.value);
                  if (!error.valid && error.error) {
                    // Error will be shown via validationErrors prop
                  }
                }}
                placeholder="192.168.1.0/24, 10.0.0.0/8, 172.16.0.0/12"
                rows={4}
                style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
              />
              {validationErrors.ipAllowlist && (
                <p className="mt-1 text-xs text-red-600">{validationErrors.ipAllowlist}</p>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500 break-words max-w-2xl mx-auto">
              Enter IP addresses or CIDR ranges separated by commas. Leave empty to allow all IPs.
              <br className="hidden sm:inline" />
              <span className="block sm:inline mt-1 sm:mt-0">
                <span className="font-semibold">Example:</span> 192.168.1.0/24, 10.0.0.0/8
              </span>
            </p>
          </div>
          <Toggle 
            label="Enable IP allowlist enforcement" 
            value={s.enableIpAllowlist || false} 
            onChange={v=>setS('enableIpAllowlist', v)}
            description="Enable IP allowlist to restrict admin access (requires IP allowlist to be configured)"
          />
        </div>
      </div>

      {/* Rate Limiting & DDoS Protection */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">Rate Limiting & DDoS Protection</h3>
            <p className="text-sm text-gray-600">Configure API rate limits and protection against abuse</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Num 
            label="API requests per minute" 
            value={s.apiRateLimitPerMinute || 100} 
            onChange={v=>setS('apiRateLimitPerMinute', v)}
            description="Maximum API requests allowed per minute per IP"
            min={10}
            max={10000}
            error={validationErrors.apiRateLimitPerMinute}
          />
          <Num 
            label="Login attempts before lockout" 
            value={s.maxLoginAttempts || 5} 
            onChange={v=>setS('maxLoginAttempts', v)}
            description="Number of failed login attempts before account lockout"
            min={3}
            max={20}
            error={validationErrors.maxLoginAttempts}
          />
          <Num 
            label="Account lockout duration (minutes)" 
            value={s.accountLockoutDurationMinutes || 30} 
            onChange={v=>setS('accountLockoutDurationMinutes', v)}
            description="Duration of account lockout after max login attempts"
            min={5}
            max={1440}
            error={validationErrors.accountLockoutDurationMinutes}
          />
        </div>
      </div>

      {/* Audit & Monitoring */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-purple-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">Audit & Monitoring</h3>
            <p className="text-sm text-gray-600">Configure security auditing and monitoring policies</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="min-w-0">
            <Toggle 
              label="Enable security audit logging" 
              value={s.enableSecurityAuditLogging !== false} 
              onChange={v=>setS('enableSecurityAuditLogging', v)}
              description="Log all security-related events and admin actions"
            />
          </div>
          <div className="min-w-0">
            <Toggle 
              label="Log failed login attempts" 
              value={s.logFailedLoginAttempts !== false} 
              onChange={v=>setS('logFailedLoginAttempts', v)}
              description="Record all failed login attempts for security analysis"
            />
          </div>
          <div className="min-w-0">
            <Toggle 
              label="Alert on suspicious activity" 
              value={s.alertOnSuspiciousActivity || false} 
              onChange={v=>setS('alertOnSuspiciousActivity', v)}
              description="Send alerts when suspicious security events are detected"
            />
          </div>
        </div>
      </div>

      {/* Security Warning */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
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
    </div>
  );
}

       function Toggle({label,value,onChange,description}:{label:string;value:boolean;onChange:(v:boolean)=>void;description?:string}){
         return (
           <label className="text-sm grid gap-2 w-full min-w-0">
             <div className="flex items-center justify-between gap-2">
               <span className="font-medium text-gray-700 flex-1 min-w-0">{label}</span>
               <div className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                 <input 
                   type="checkbox" 
                   checked={value || false} 
                   onChange={e=>onChange(e.target.checked)}
                   className="sr-only peer"
                 />
                 <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#02665e]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#02665e]"></div>
               </div>
             </div>
             {description && <span className="text-xs text-gray-500">{description}</span>}
           </label>
         );
       }

function Num({label,value,onChange,description,min,max,error}:{label:string;value:number;onChange:(v:number)=>void;description?:string;min?:number;max?:number;error?:string}){
  return (
    <label className="text-sm grid gap-2 w-full min-w-0">
      <span className="font-medium text-gray-700">{label}</span>
      <div className="w-full min-w-0">
        <input 
          type="number" 
          className={`w-full min-w-0 border-2 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-[#02665e]/20 outline-none transition-all duration-200 box-border ${
            error 
              ? 'border-red-300 focus:border-red-500' 
              : 'border-gray-300 focus:border-[#02665e]'
          }`}
          value={value || 0} 
          onChange={e=>onChange(Number(e.target.value))}
          min={min}
          max={max}
        />
        {error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>
      {description && <span className="text-xs text-gray-500">{description}</span>}
    </label>
  );
}
