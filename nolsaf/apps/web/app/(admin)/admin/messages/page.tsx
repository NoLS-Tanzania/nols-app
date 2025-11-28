"use client";

import React, { useEffect, useState } from "react";
import { Bell, ChevronDown, ChevronUp } from "lucide-react";

type Message = {
  id: string;
  title: string;
  body: string;
  time?: string;
  date?: string; // ISO date string used for sorting
  unread: boolean;
};

export default function Page() {
  const [tab, setTab] = useState<'unread' | 'viewed'>('unread');
  const [unread, setUnread] = useState<Message[]>([]);
  const [viewed, setViewed] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTab = async (tab: 'unread' | 'viewed') => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ tab, page: '1', pageSize: '50' });
      // Use relative paths in browser to leverage Next.js rewrites (avoids CORS issues)
      const url = `/api/admin/notifications?${q.toString()}`;
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
      const data = await r.json();
      if (tab === 'unread') setUnread(data.items ?? []);
      else setViewed(data.items ?? []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // initial load for both tabs (small page size)
    fetchTab('unread');
    fetchTab('viewed');
  }, []);
  const [openId, setOpenId] = useState<string | null>(null);

  const renderList = (items: Message[]) => {
    if (items.length === 0) return (
      <div className="text-center text-gray-500 py-6">No messages in this list.</div>
    );

    return (
      <div className="space-y-3">
        {items.map((m) => (
          <div key={m.id} className={`border rounded-md ${m.unread ? 'bg-white' : 'bg-gray-50'}`}>
            <button
              className="w-full text-left px-4 py-3 flex items-start justify-between gap-4"
              onClick={async () => {
                const next = openId === m.id ? null : m.id;
                setOpenId(next);
                // optimistically mark as read when opening an unread message
                if (m.unread && next === m.id) {
                  try {
                    // Use relative paths in browser to leverage Next.js rewrites (avoids CORS issues)
                    const url = `/api/admin/notifications/${m.id}/mark-read`;
                    await fetch(url, { method: 'POST', credentials: 'include' });
                    // update local state
                    setUnread((u) => u.filter((x) => x.id !== m.id));
                    setViewed((v) => [{ ...m, unread: false }, ...v]);
                  } catch (err) {
                    console.error('mark read failed', err);
                  }
                }
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-900 truncate">{m.title}</div>
                  {m.unread && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500 text-white">Unread</span>}
                </div>
                <div className="text-xs text-gray-500 truncate">{m.time}</div>
              </div>
              <div className="flex items-center">
                {openId === m.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </button>
            {openId === m.id && (
              <div className="px-4 pb-4 text-sm text-gray-700">{m.body}</div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center justify-center rounded-full bg-indigo-50 p-3">
          <Bell className="h-6 w-6 text-indigo-600" />
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-gray-900">Notifications</h1>
        <p className="mt-1 text-sm text-gray-600">No messages yet. New messages will appear here.</p>
      </div>

      <div className="max-w-3xl mx-auto">
        <div className="flex gap-2 items-center justify-center mb-4">
          <button
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${tab === 'unread' ? 'text-indigo-600 border-indigo-300 bg-white' : 'text-gray-700 bg-white hover:bg-gray-50'}`}
            onClick={() => setTab('unread')}
          >
            Unread
          </button>
          <button
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${tab === 'viewed' ? 'text-indigo-600 border-indigo-300 bg-white' : 'text-gray-700 bg-white hover:bg-gray-50'}`}
            onClick={() => setTab('viewed')}
          >
            Viewed
          </button>
        </div>

        <div className="card">
          <div className="card-section">
            {loading ? (
              <div className="text-center py-6 text-gray-500">Loading...</div>
            ) : tab === 'unread' ? (
              unread.length === 0 ? <div className="text-center text-gray-500 py-6">No new notifications </div> : renderList(unread)
            ) : (
              renderList(viewed)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
