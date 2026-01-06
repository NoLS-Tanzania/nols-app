"use client";

import React, { useEffect, useState, useCallback } from "react";
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

  const formatTime = useCallback((dateString?: string) => {
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
  }, []);

  const fetchTab = useCallback(async (tab: 'unread' | 'viewed') => {
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
  }, [formatTime]);

  useEffect(() => {
    // initial load for both tabs (small page size)
    fetchTab('unread');
    fetchTab('viewed');
  }, [fetchTab]);
  const [openId, setOpenId] = useState<string | null>(null);

  const renderList = (items: Message[]) => {
    if (items.length === 0) return (
      <div className="text-center text-gray-500 py-12">
        <p className="text-sm">No messages in this list.</p>
      </div>
    );

    return (
      <div className="space-y-4">
        {items.map((m) => (
          <div 
            key={m.id} 
            className={`bg-white rounded-lg border transition-all duration-200 overflow-hidden ${
              m.unread 
                ? 'border-gray-200 shadow-sm hover:shadow-md' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Header Bar */}
            <div className={`px-5 py-3 ${m.unread ? 'bg-gray-50' : 'bg-white'} border-b border-gray-100`}>
              <button
                className="w-full flex items-center justify-between gap-4"
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
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">{m.title}</div>
                  {m.unread && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-500 text-white flex-shrink-0">
                      Unread
                    </span>
                  )}
                  <div className="text-xs text-gray-500 flex-shrink-0">{m.time}</div>
                </div>
                <div className="flex items-center flex-shrink-0">
                  {openId === m.id ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>
            </div>

            {/* Expanded Content */}
            {openId === m.id && (
              <div className="px-5 py-5 bg-white">
                {/* Main Message */}
                <div className="mb-5">
                  <p className="text-sm text-gray-700 leading-relaxed">{m.body}</p>
                </div>
                
                {/* Details Section */}
                {m.meta && (
                  <div className="space-y-4 pt-4 border-t border-gray-200">
                    {/* Property Information */}
                    {m.meta.propertyId && (
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#02665e]/10 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4.5 h-4.5 text-[#02665e]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                            PROPERTY
                          </div>
                          <div className="text-sm font-semibold text-gray-900 mb-2">
                            {m.meta.propertyTitle || `Property #${m.meta.propertyId}`}
                          </div>
                          <Link 
                            href={`/admin/properties?previewId=${m.meta.propertyId}`}
                            className="inline-flex items-center gap-1.5 text-xs text-[#02665e] hover:text-[#014e47] font-medium underline transition-colors"
                          >
                            View Property <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    )}
                    
                    {/* Owner Information */}
                    {(m.meta.ownerId || m.meta.ownerName) && (
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <User className="w-4.5 h-4.5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                            PROPERTY OWNER
                          </div>
                          <div className="text-sm font-semibold text-gray-900 mb-2">
                            {m.meta.ownerName || `Owner #${m.meta.ownerId}`}
                          </div>
                          {m.meta.ownerId && (
                            <Link 
                              href={`/admin/owners/${m.meta.ownerId}`}
                              className="inline-flex items-center gap-1.5 text-xs text-[#02665e] hover:text-[#014e47] font-medium underline transition-colors"
                            >
                              View Owner <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Approved By Information */}
                    {m.meta.approvedBy && (
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <User className="w-4.5 h-4.5 text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                            APPROVED BY
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
                            {m.meta.approvedByName || `Admin #${m.meta.approvedBy}`}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Timestamp */}
                    {m.createdAt && (
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                          <Calendar className="w-4.5 h-4.5 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                            DATE & TIME
                          </div>
                          <div className="text-sm font-semibold text-gray-900">
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
                      <div className="pt-4 border-t border-gray-200">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                          NOTE
                        </div>
                        <div className="text-sm text-gray-900 leading-relaxed">{m.meta.note}</div>
                      </div>
                    )}
                    
                    {m.meta.reasons && (
                      <div className="pt-4 border-t border-gray-200">
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                          REASONS
                        </div>
                        <div className="text-sm text-gray-900 leading-relaxed">
                          {Array.isArray(m.meta.reasons) 
                            ? m.meta.reasons.join(', ')
                            : m.meta.reasons}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Fallback: Show timestamp if no meta but createdAt exists */}
                {!m.meta && m.createdAt && (
                  <div className="flex items-start gap-3 pt-4 border-t border-gray-200">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4.5 h-4.5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        DATE & TIME
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
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
            )}
          </div>
        ))}
      </div>
    );
  };

  const currentItems = tab === 'unread' ? unread : viewed;
  const hasItems = currentItems.length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
            <Bell className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
            <p className="mt-1 text-sm text-gray-600">
              {hasItems 
                ? `${currentItems.length} ${currentItems.length === 1 ? 'notification' : 'notifications'} in ${tab === 'unread' ? 'unread' : 'viewed'} list`
                : `Manage your system notifications`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex gap-2 items-center justify-center">
          <button
            onClick={() => setTab('unread')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              tab === 'unread' 
                ? 'bg-[#02665e] text-white shadow-sm' 
                : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700'
            }`}
          >
            Unread
            {unread.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                tab === 'unread' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {unread.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('viewed')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              tab === 'viewed' 
                ? 'bg-[#02665e] text-white shadow-sm' 
                : 'bg-white hover:bg-gray-50 border border-gray-300 text-gray-700'
            }`}
          >
            Viewed
            {viewed.length > 0 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                tab === 'viewed' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {viewed.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-emerald-600"></div>
            </div>
          ) : hasItems ? (
            renderList(currentItems)
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Bell className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-medium">No {tab === 'unread' ? 'unread' : 'viewed'} notifications</p>
              <p className="text-sm text-gray-400 mt-1">
                {tab === 'unread' 
                  ? 'All notifications have been read' 
                  : 'No viewed notifications yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
