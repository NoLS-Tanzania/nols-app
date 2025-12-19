"use client";

import React, { useEffect, useState } from "react";
import { Bell, ChevronDown, ChevronUp, ExternalLink, User, Calendar, Building2 } from "lucide-react";
import Link from "next/link";

type Message = {
  id: string;
  title: string;
  body: string;
  time?: string;
  date?: string; // ISO date string used for sorting
  createdAt?: string; // ISO date string
  unread: boolean;
  meta?: any; // Additional metadata (propertyId, propertyTitle, ownerId, etc.)
};

export default function Page() {
  const [tab, setTab] = useState<'unread' | 'viewed'>('unread');
  const [unread, setUnread] = useState<Message[]>([]);
  const [viewed, setViewed] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const fetchTab = async (tab: 'unread' | 'viewed') => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ tab, page: '1', pageSize: '50' });
      // Use relative paths in browser to leverage Next.js rewrites (avoids CORS issues)
      const url = `/api/admin/notifications?${q.toString()}`;
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) throw new Error(`Fetch failed ${r.status}`);
      const data = await r.json();
      // Format time for each notification
      const formatted = (data.items ?? []).map((item: any) => ({
        ...item,
        time: formatTime(item.createdAt || item.date),
      }));
      if (tab === 'unread') setUnread(formatted);
      else setViewed(formatted);
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
              <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                <div className="pt-4 space-y-3">
                  {/* Main body text */}
                  <p className="text-sm text-gray-700 leading-relaxed">{m.body}</p>
                  
                  {/* Detailed information from meta */}
                  {m.meta && (
                    <div className="space-y-2 pt-2 border-t border-gray-200">
                      {/* Property Information */}
                      {m.meta.propertyId && (
                        <div className="flex items-start gap-2">
                          <Building2 className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-500">Property</div>
                            <div className="text-sm text-gray-900 mt-0.5">
                              {m.meta.propertyTitle || `Property #${m.meta.propertyId}`}
                            </div>
                            <Link 
                              href={`/admin/properties/${m.meta.propertyId}`}
                              className="inline-flex items-center gap-1 text-xs text-[#02665e] hover:text-[#014e47] mt-1 font-medium"
                            >
                              View Property <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </div>
                      )}
                      
                      {/* Owner Information */}
                      {(m.meta.ownerId || m.meta.ownerName) && (
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-500">Property Owner</div>
                            <div className="text-sm text-gray-900 mt-0.5">
                              {m.meta.ownerName || `Owner #${m.meta.ownerId}`}
                            </div>
                            {m.meta.ownerId && (
                              <Link 
                                href={`/admin/owners/${m.meta.ownerId}`}
                                className="inline-flex items-center gap-1 text-xs text-[#02665e] hover:text-[#014e47] mt-1 font-medium"
                              >
                                View Owner <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Approved By Information */}
                      {m.meta.approvedBy && (
                        <div className="flex items-start gap-2">
                          <User className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-500">Approved By</div>
                            <div className="text-sm text-gray-900 mt-0.5">
                              {m.meta.approvedByName || `Admin #${m.meta.approvedBy}`}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      {m.createdAt && (
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-500">Date & Time</div>
                            <div className="text-sm text-gray-900 mt-0.5">
                              {new Date(m.createdAt).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Additional notes/reasons */}
                      {m.meta.note && (
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-500">Note</div>
                            <div className="text-sm text-gray-900 mt-0.5">{m.meta.note}</div>
                          </div>
                        </div>
                      )}
                      
                      {m.meta.reasons && (
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-500">Reasons</div>
                            <div className="text-sm text-gray-900 mt-0.5">
                              {Array.isArray(m.meta.reasons) 
                                ? m.meta.reasons.join(', ')
                                : m.meta.reasons}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Fallback: Show timestamp if no meta but createdAt exists */}
                  {!m.meta && m.createdAt && (
                    <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                      <Calendar className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-500">Date & Time</div>
                        <div className="text-sm text-gray-900 mt-0.5">
                          {new Date(m.createdAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
