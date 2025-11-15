"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Hourglass } from "lucide-react";
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function PendingProps() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minWaitElapsed, setMinWaitElapsed] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  useEffect(() => {
    let mounted = true;
  const timer = setTimeout(() => setMinWaitElapsed(true), 5000);

    api.get<any[]>("/owner/properties/mine", { params: { status: "PENDING" } })
      .then(r => { if (!mounted) return; setList(r.data || []); })
      .catch(() => { if (!mounted) return; setList([]); })
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
        <div className="text-sm opacity-90 mt-2">Includes awaiting approval & requested fixes.</div>
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
          </div>
        ))}
      </div>
    </div>
  );
}
