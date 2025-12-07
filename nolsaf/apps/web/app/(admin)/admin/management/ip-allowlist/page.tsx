"use client";
import { useEffect, useState } from "react";
import { ListFilter, Save, X } from "lucide-react";

export default function IpAllowlistPage() {
  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    setMessage(null);
    (async () => {
      try {
        const res = await fetch('/admin/settings', { credentials: 'include' });
        if (!res.ok) throw new Error('failed to load');
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const s = await res.json();
          if (!mounted) return;
          setValue(s.ipAllowlist ?? '');
          setMessage(null);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  function validateList(text: string) {
    const items = text
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean);
    const errs: string[] = [];
    const cidrOrIp = /^(?:\d{1,3}(?:\.\d{1,3}){3})(?:\/\d{1,2})?$/; // basic IPv4/CIDR check
    items.forEach((it) => {
      if (!cidrOrIp.test(it)) errs.push(it);
    });
    return { items, errs };
  }

  async function onSave() {
    setMessage(null);
    setErrors([]);
    const { errs } = validateList(value);
    if (errs.length > 0) {
      setErrors(errs);
      setMessage('Validation failed: some entries look invalid');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/admin/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAllowlist: value }),
      });
      if (!res.ok) throw new Error('save failed');
      setMessage('Saved');
    } catch (err) {
      console.error(err);
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <ListFilter className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            IP Allowlist
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage IP addresses or CIDR ranges that are allowed to access admin tools
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed IPs / CIDRs
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Enter IP addresses or CIDR ranges (comma or newline separated). Leave blank to disable the allowlist.
            </p>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                Loading…
              </div>
            ) : (
              <>
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none box-border font-mono text-sm"
                  placeholder="e.g. 203.0.113.5, 198.51.100.0/24"
                />

                {errors.length > 0 && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm font-medium text-red-800 mb-1">Invalid entries:</p>
                    <ul className="text-sm text-red-700 list-disc list-inside">
                      {errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {message && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${
                    message.includes('Failed') 
                      ? 'bg-red-50 border border-red-200 text-red-700' 
                      : 'bg-green-50 border border-green-200 text-green-700'
                  }`}>
                    {message}
                  </div>
                )}

                <div className="mt-6 flex items-center gap-3">
                  <button 
                    onClick={onSave} 
                    disabled={saving || value.trim() === ''} 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#02665e] text-white rounded-lg hover:bg-[#015b54] transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 font-medium text-sm"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save Configuration'}
                  </button>
                  <button 
                    onClick={() => { setValue(''); setMessage(null); setErrors([]); }} 
                    className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 font-medium text-sm"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
