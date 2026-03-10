"use client";
import { useEffect, useState } from "react";
import { ListFilter, Save, X } from "lucide-react";

export default function IpAllowlistPage() {
  const SETTINGS_URL = "/api/admin/settings";

  const [value, setValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  async function readJsonOrText(res: Response): Promise<{ isJson: boolean; data?: any; text?: string }> {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return { isJson: true, data: await res.json() };
      } catch {
        return { isJson: false, text: "" };
      }
    }
    try {
      return { isJson: false, text: await res.text() };
    } catch {
      return { isJson: false, text: "" };
    }
  }

  function toFriendlyAuthMessage(status: number) {
    if (status === 401 || status === 403) return "Your admin session isn’t active. Please sign in again.";
    return "Couldn’t load settings. Please retry.";
  }

  function isValidIPv4(ip: string) {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;
    for (const part of parts) {
      if (!/^[0-9]{1,3}$/.test(part)) return false;
      const n = Number(part);
      if (!Number.isInteger(n) || n < 0 || n > 255) return false;
    }
    return true;
  }

  function isValidIPv4OrCidr(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (!trimmed.includes("/")) return isValidIPv4(trimmed);
    const [ip, prefix] = trimmed.split("/");
    if (!isValidIPv4(ip)) return false;
    if (!/^[0-9]{1,2}$/.test(prefix)) return false;
    const p = Number(prefix);
    return Number.isInteger(p) && p >= 0 && p <= 32;
  }

  function parseList(text: string) {
    return text
      .split(/[\n,]/)
      .map((x) => x.trim())
      .filter(Boolean);
  }

  function validateList(text: string) {
    const items = parseList(text);
    const errs: string[] = [];
    items.forEach((it) => {
      if (!isValidIPv4OrCidr(it)) errs.push(it);
    });
    return { items, errs };
  }

  useEffect(() => {
    let mounted = true;
    setMessage(null);
    (async () => {
      try {
        const res = await fetch(SETTINGS_URL, { credentials: "include", cache: "no-store" });
        const parsed = await readJsonOrText(res);
        if (!mounted) return;

        if (!res.ok) {
          setMessage(toFriendlyAuthMessage(res.status));
          return;
        }

        if (!parsed.isJson) {
          // Most commonly: a redirect/login HTML response.
          setMessage("Your admin session isn’t active. Please sign in again.");
          return;
        }

        setValue(parsed.data?.ipAllowlist ?? "");
        setMessage(null);
      } catch (err) {
        if (mounted) setMessage("Couldn’t load settings. Please retry.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

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
      const res = await fetch(SETTINGS_URL, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAllowlist: value }),
      });
      if (!res.ok) {
        setMessage(toFriendlyAuthMessage(res.status));
        return;
      }
      setMessage('Saved');

      // Reload once to reflect any backend normalization.
      try {
        const refreshed = await fetch(SETTINGS_URL, { credentials: "include", cache: "no-store" });
        const parsed = await readJsonOrText(refreshed);
        if (refreshed.ok && parsed.isJson) setValue(parsed.data?.ipAllowlist ?? "");
      } catch {
        // ignore
      }
    } catch (err) {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const { items: parsedItems } = validateList(value);
  const isEnabled = value.trim().length > 0;

  return (
    <div className="bg-slate-50 min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-5">

        {/* Header card */}
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-[#02665e]/10 flex items-center justify-center shrink-0">
                <ListFilter className="h-6 w-6 text-[#02665e]" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">IP Allowlist</h1>
                <p className="mt-0.5 text-sm text-slate-500">Control which IPs can access admin tools.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={"inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] " + (isEnabled ? "border-[#02665e]/20 bg-[#02665e]/[0.08] text-[#02665e]" : "border-slate-200 bg-slate-100 text-slate-500")}>
                <span className={"h-1.5 w-1.5 rounded-full " + (isEnabled ? "bg-[#02665e]" : "bg-slate-400")} />
                {isEnabled ? "Enabled" : "Disabled"}
              </span>
              {parsedItems.length > 0 && (
                <span className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 shadow-sm">
                  {parsedItems.length} {parsedItems.length === 1 ? "entry" : "entries"}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Main content card */}
        <div className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-[#02665e] via-emerald-500 to-[#02665e]" />
          <div className="grid grid-cols-1 lg:grid-cols-5">

            {/* Left: editor */}
            <div className="lg:col-span-3 p-6 sm:p-8">
              <label className="block text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5">
                Allowed IPs / CIDRs
              </label>
              <p className="text-sm text-slate-500 mb-5">
                One entry per line, or comma-separated. Accepts IPv4 and CIDR ranges.
              </p>

              {loading ? (
                <div className="space-y-3">
                  <div className="h-44 w-full animate-pulse rounded-[14px] bg-slate-100" />
                  <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-100" />
                </div>
              ) : (
                <>
                  <textarea
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      if (message) setMessage(null);
                      if (errors.length) setErrors([]);
                    }}
                    rows={10}
                    className="block w-full resize-y rounded-[14px] border border-slate-200 bg-slate-50/50 px-4 py-3.5 font-mono text-[13px] leading-relaxed text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-300 focus:border-[#02665e]/40 focus:bg-white focus:ring-2 focus:ring-[#02665e]/15"
                    placeholder={"203.0.113.5\n198.51.100.0/24\n10.0.0.0/8"}
                  />

                  <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-400">Leave blank to allow all IPs (disable enforcement).</span>
                    <span className="text-[11px] text-slate-400 font-mono">IPv4 / CIDR only</span>
                  </div>

                  {errors.length > 0 && (
                    <div className="mt-4 rounded-[14px] border border-red-200/70 bg-red-50 p-4">
                      <p className="text-sm font-bold text-red-700 mb-1">Invalid entries</p>
                      <p className="text-xs text-red-600 mb-3">Fix these values then save again.</p>
                      <ul className="space-y-1 font-mono text-[12px] text-red-700 list-disc pl-5">
                        {errors.slice(0, 20).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                      {errors.length > 20 && (
                        <p className="mt-2 text-xs text-red-500">+{errors.length - 20} more...</p>
                      )}
                    </div>
                  )}

                  {message && (
                    <div className={"mt-4 rounded-[14px] border p-4 text-sm font-medium " + (message.includes("Failed") || message.includes("Validation") ? "border-red-200/70 bg-red-50 text-red-700" : "border-[#02665e]/20 bg-[#02665e]/[0.06] text-[#02665e]")}>
                      {message}
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                      onClick={onSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#02665e] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_-4px_rgba(2,102,94,0.45)] transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                    <button
                      onClick={() => { setValue(""); setMessage(null); setErrors([]); }}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20"
                      type="button"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                      Clear
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Right: sidebar */}
            <div className="lg:col-span-2 flex flex-col gap-6 bg-slate-50/60 p-6 sm:p-8 border-t border-slate-100 lg:border-t-0 lg:border-l">

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-4">Operating Principles</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-[#02665e]/10 flex items-center justify-center shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#02665e]" />
                    </span>
                    <span className="text-sm text-slate-600 leading-relaxed">Prefer CIDR ranges for office/VPN networks; keep lists short.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-[#02665e]/10 flex items-center justify-center shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#02665e]" />
                    </span>
                    <span className="text-sm text-slate-600 leading-relaxed">Do not lock yourself out: always include your current admin IP before saving.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-[#02665e]/10 flex items-center justify-center shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#02665e]" />
                    </span>
                    <span className="text-sm text-slate-600 leading-relaxed">Changes apply immediately for admin access checks.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 rounded-full bg-[#02665e]/10 flex items-center justify-center shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#02665e]" />
                    </span>
                    <span className="text-sm text-slate-600 leading-relaxed">Leave blank to disable allowlisting when troubleshooting.</span>
                  </li>
                </ul>
              </div>

              <div className="h-px bg-slate-200/70" />

              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-3">Examples</p>
                <div className="rounded-[14px] border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
                  <p className="font-mono text-[12px] leading-[2] text-slate-700">203.0.113.5</p>
                  <p className="font-mono text-[12px] leading-[2] text-slate-700">198.51.100.0/24</p>
                  <p className="font-mono text-[12px] leading-[2] text-slate-700">10.0.0.0/8</p>
                </div>
                <p className="mt-2.5 text-[11px] text-slate-400">One per line or comma separated.</p>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}