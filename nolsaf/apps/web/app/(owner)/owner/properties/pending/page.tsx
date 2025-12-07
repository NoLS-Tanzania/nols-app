"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Hourglass } from "lucide-react";
// Ensure API requests hit the correct JSON endpoint
const baseURL =
  typeof window !== "undefined" && (process.env.NEXT_PUBLIC_API_URL || window.location.origin)
    ? (process.env.NEXT_PUBLIC_API_URL as string) || window.location.origin
    : process.env.NEXT_PUBLIC_API_URL || "";
const api = axios.create({ baseURL, responseType: "json" });

export default function PendingProps() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minWaitElapsed, setMinWaitElapsed] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  useEffect(() => {
    let mounted = true;
  const timer = setTimeout(() => setMinWaitElapsed(true), 5000);

    // Fetch both PENDING and DRAFT so users can find saved drafts here too
    Promise.all([
      api.get<{ items: any[] }>("/owner/properties/mine", { params: { status: "PENDING", pageSize: 50 } }),
      api.get<{ items: any[] }>("/owner/properties/mine", { params: { status: "DRAFT", pageSize: 50 } }),
    ])
      .then(([pending, draft]) => {
        if (!mounted) return;
        const pendingItems = Array.isArray((pending.data as any)?.items) ? (pending.data as any).items : [];
        const draftItems = Array.isArray((draft.data as any)?.items) ? (draft.data as any).items : [];
        setList([...pendingItems, ...draftItems]);
      })
      .catch((err) => {
        if (!mounted) return;
        // Gracefully handle non-JSON or network errors
        console.error("Failed to load owner properties:", err?.message || err);
        setList([]);
      })
      .finally(() => { if (!mounted) return; setLoading(false); });

    return () => { mounted = false; clearTimeout(timer); };
  }, []);

  // Empty state: centered icon above the title with supporting copy
  if (loading && !minWaitElapsed) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
        <span aria-hidden className="dot-spinner mb-2" aria-live="polite">
          <span className="dot dot-blue" />
          <span className="dot dot-black" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </span>
        <h1 className="text-2xl font-semibold">Pending</h1>
        <div className="text-sm opacity-60 mt-2">Checking for pending properties…</div>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="min-h-[260px] flex flex-col items-center justify-center text-center">
        <Hourglass className="h-12 w-12 text-blue-500 mb-2" />
        <h1 className="text-2xl font-semibold">Pending</h1>
        <div className="text-sm opacity-90 mt-2">Includes awaiting approval, requested fixes, and saved drafts.</div>
        <div className="text-sm opacity-90 mt-2">Nothing pending.</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pending</h1>
      <p className="text-sm opacity-70">Includes awaiting approval & requested fixes.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {list.map(p => (
          <div key={p.id} className="bg-white border rounded-2xl p-3">
            <div className="font-medium">{p.title}</div>
            <div className="text-xs opacity-70">{p.type}</div>
            {p.status && (
              <div className="mt-1 inline-block text-[10px] px-2 py-1 rounded-full border bg-white">
                {p.status}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
