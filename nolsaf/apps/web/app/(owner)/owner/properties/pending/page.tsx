"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Hourglass, Edit, AlertCircle, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
// Use same-origin requests + secure httpOnly cookie session
const api = axios.create({ baseURL: "", withCredentials: true, responseType: "json" });

export default function PendingProps() {
  const router = useRouter();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [minWaitElapsed, setMinWaitElapsed] = useState(false);

  useEffect(() => {
    let mounted = true;
  const timer = setTimeout(() => setMinWaitElapsed(true), 5000);

    // Fetch both PENDING and DRAFT so users can find saved drafts here too
    Promise.all([
      api.get<{ items: any[] }>("/api/owner/properties/mine", { params: { status: "PENDING", pageSize: 50 } }),
      api.get<{ items: any[] }>("/api/owner/properties/mine", { params: { status: "DRAFT", pageSize: 50 } }),
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

  const handleReopen = (propertyId: number) => {
    // Navigate to edit page with property ID
    router.push(`/owner/properties/add?id=${propertyId}`);
  };

  const getRejectionReasons = (property: any): string[] => {
    if (!property.rejectionReasons) return [];
    try {
      if (typeof property.rejectionReasons === 'string') {
        const parsed = JSON.parse(property.rejectionReasons);
        return Array.isArray(parsed) ? parsed : [parsed];
      }
      return Array.isArray(property.rejectionReasons) ? property.rejectionReasons : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pending</h1>
      <p className="text-sm opacity-70">Includes awaiting approval & requested fixes.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map(p => {
          const rejectionReasons = getRejectionReasons(p);
          const needsFixes = rejectionReasons.length > 0;
          
          return (
            <div key={p.id} className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-lg transition-all duration-200">
              <div className="space-y-3">
                <div>
                  <div className="font-semibold text-gray-900 mb-1">{p.title || "Untitled Property"}</div>
                  <div className="text-xs text-gray-600 uppercase">{p.type || "Property"}</div>
                </div>
                
                {p.status && (
                  <div className="flex items-center gap-2">
                    <span className={`inline-block text-[10px] px-2.5 py-1 rounded-full border font-medium ${
                      p.status === "DRAFT" 
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : p.status === "PENDING"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-gray-50 text-gray-700 border-gray-200"
                    }`}>
                      {p.status}
                    </span>
                  </div>
                )}

                {needsFixes && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                      <span className="text-xs font-semibold text-red-800">Fixes Required</span>
                    </div>
                    <div className="space-y-1">
                      {rejectionReasons.map((reason: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-red-700">
                          <span className="text-red-500 mt-0.5">•</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleReopen(p.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#02665e] text-white rounded-lg font-medium text-sm hover:bg-[#024d47] transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <Edit className="w-4 h-4" />
                  <span>{needsFixes ? "Fix & Resubmit" : "Reopen & Edit"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
