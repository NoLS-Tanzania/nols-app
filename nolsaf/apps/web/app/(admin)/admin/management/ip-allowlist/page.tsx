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
    <div className="min-h-full w-full bg-[radial-gradient(1200px_circle_at_30%_-10%,rgba(2,102,94,0.10),transparent_55%),radial-gradient(900px_circle_at_90%_0%,rgba(15,23,42,0.05),transparent_55%)] px-4 py-5 sm:px-6 sm:py-6">
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-4 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-brand/10 p-3 ring-1 ring-brand/15">
                <ListFilter className="h-6 w-6 text-brand" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">IP Allowlist</h1>
                <p className="mt-0.5 text-sm text-slate-600">
                  Control which IPs can access admin tools.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <span
                className={
                  isEnabled
                    ? "inline-flex items-center rounded-xl border border-brand/20 bg-brand/10 px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-black/[0.03]"
                    : "inline-flex items-center rounded-xl border border-slate-200/70 bg-white/60 px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-black/[0.03]"
                }
              >
                {isEnabled ? "Enabled" : "Disabled"}
              </span>
              <span className="text-xs font-medium text-slate-600">
                Entries: {parsedItems.length}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 shadow-sm ring-1 ring-black/[0.03] backdrop-blur-xl nls-flipbook">
          <div className="h-1.5 w-full bg-gradient-to-r from-brand-700 via-brand-600 to-brand-700" />

          <div className="p-5 sm:p-6">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <label className="block text-xs font-semibold tracking-wide text-slate-700 uppercase">Allowed IPs / CIDRs</label>
                    <p className="mt-1 text-sm text-slate-600">
                      Paste IP addresses or CIDR ranges, separated by comma or new line.
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  {loading ? (
                    <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm">
                      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200/70" />
                      <div className="mt-3 h-32 w-full animate-pulse rounded-xl bg-slate-200/60" />
                      <div className="mt-3 h-10 w-44 animate-pulse rounded-xl bg-slate-200/60" />
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
                        className="block w-full resize-none rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-3 font-mono text-[13px] leading-relaxed text-slate-900 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand/20"
                        placeholder={"203.0.113.5\n198.51.100.0/24\n10.0.0.0/8"}
                      />

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                        <div>
                          Leave blank to disable the allowlist (allow all IPs).
                        </div>
                        <div className="font-medium">
                          IPv4 or IPv4/CIDR only (e.g. <span className="font-mono">192.168.0.0/24</span>)
                        </div>
                      </div>

                      {errors.length > 0 ? (
                        <div className="mt-4 rounded-2xl border border-rose-200/70 bg-rose-50/70 p-4 text-sm text-rose-700 shadow-sm ring-1 ring-black/[0.03]">
                          <div className="font-semibold text-rose-800">Invalid entries</div>
                          <div className="mt-1 text-xs text-rose-700">Fix these values then save again.</div>
                          <ul className="mt-3 list-disc space-y-1 pl-5 font-mono text-[12px]">
                            {errors.slice(0, 20).map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                          {errors.length > 20 ? (
                            <div className="mt-2 text-xs">+{errors.length - 20} more…</div>
                          ) : null}
                        </div>
                      ) : null}

                      {message ? (
                        <div
                          className={
                            message.includes("Failed")
                              ? "mt-4 rounded-2xl border border-rose-200/70 bg-rose-50/70 p-3 text-sm text-rose-700 shadow-sm ring-1 ring-black/[0.03]"
                              : "mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-3 text-sm text-emerald-700 shadow-sm ring-1 ring-black/[0.03]"
                          }
                        >
                          {message}
                        </div>
                      ) : null}

                      <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                          onClick={onSave}
                          disabled={saving}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-brand-700/30 transition-all duration-200 hover:bg-brand-700 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Save className="h-4 w-4" aria-hidden="true" />
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          onClick={() => {
                            setValue("");
                            setMessage(null);
                            setErrors([]);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-black/[0.03] transition-all duration-200 hover:bg-white hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-brand/10"
                          type="button"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          Clear
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm ring-1 ring-black/[0.03]">
                  <div className="text-xs font-semibold tracking-wide text-slate-700 uppercase">Operating principles</div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                      <span>
                        Prefer CIDR ranges for office/VPN networks; keep lists short.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                      <span>
                        Don’t lock yourself out: always include your current admin IP before saving.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                      <span>
                        Changes apply immediately for admin access checks.
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                      <span>
                        Leave blank to disable allowlisting when troubleshooting.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/60 p-4 shadow-sm ring-1 ring-black/[0.03]">
                  <div className="text-xs font-semibold tracking-wide text-slate-700 uppercase">Examples</div>
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-[12px] leading-relaxed text-slate-800">
203.0.113.5
198.51.100.0/24
10.0.0.0/8
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
