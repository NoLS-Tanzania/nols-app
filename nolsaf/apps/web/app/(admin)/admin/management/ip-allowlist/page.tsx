"use client";
import { useEffect, useState } from "react";

export default function IpAllowlistPage() {
  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/admin/settings', { credentials: 'include' });
        if (!res.ok) throw new Error('failed to load');
        const s = await res.json();
        if (!mounted) return;
        setValue(s.ipAllowlist ?? '');
      } catch (err) {
        console.error(err);
        setMessage('Failed to load settings');
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
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">IP Allowlist</h1>

      <div className="rounded-md border bg-white p-6">
        <p className="text-sm text-gray-600 mb-4">Manage IP addresses or CIDR ranges (comma or newline separated) that are allowed to access admin tools. Leave blank to disable the allowlist.</p>

        {loading ? (
          <div>Loading…</div>
        ) : (
          <>
            <label className="block text-sm font-medium text-gray-700">Allowed IPs / CIDRs</label>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={6}
              className="mt-2 block w-full rounded-md border-gray-200 shadow-sm"
              placeholder="e.g. 203.0.113.5, 198.51.100.0/24"
            />

            {errors.length > 0 && (
              <div className="mt-2 text-sm text-red-600">
                Invalid entries: {errors.join(', ')}
              </div>
            )}

            {message && (
              <div className="mt-3 text-sm text-gray-700">{message}</div>
            )}

            <div className="mt-4 flex items-center gap-3">
              <button onClick={onSave} disabled={saving} className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setValue(''); setMessage(null); setErrors([]); }} className="px-3 py-2 border rounded-md">Clear</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
