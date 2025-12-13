"use client";
import React, { useMemo, useState } from "react";
import { Bell, Mail, Trash2, Reply, CheckCircle2, X } from "lucide-react";

export type NotificationType = "info" | "warning" | "error" | "message";

export type NotificationItem = {
  id: string;
  title: string;
  body?: string;
  from?: string;
  createdAt?: string; // ISO or human-friendly string
  unread?: boolean;
  type?: NotificationType;
};

type Props = {
  items: NotificationItem[];
  onOpen?: () => void;
  onClose?: () => void;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReply?: (id: string, message: string) => void;
  show?: boolean;
  title?: string;
};

// Reusable notifications panel: supports read, delete, reply (for message-like items)
export default function Notifications({
  items,
  onOpen,
  onClose,
  onRead,
  onDelete,
  onReply,
  show = false,
  title = "Notifications",
}: Props) {
  const [open, setOpen] = useState(show);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const unreadCount = useMemo(() => items.filter((i) => i.unread).length, [items]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) onOpen?.();
    else onClose?.();
  };

  const handleReplySend = () => {
    if (replyingTo && replyText.trim()) {
      onReply?.(replyingTo, replyText.trim());
      setReplyText("");
      setReplyingTo(null);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="bg-white rounded-full p-2.5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 relative border border-slate-200"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4 text-slate-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center text-[10px]">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 min-w-[340px] max-w-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-900">{title}</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[11px] font-semibold rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={handleToggle}
              className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Close notifications"
            >
              <X className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-xs">No notifications</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {items.map((item) => {
                  const isMessage = item.type === "message";
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {item.title}
                            </p>
                            {!item.unread && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                            )}
                          </div>
                          {item.from && (
                            <p className="text-[11px] text-slate-500">From: {item.from}</p>
                          )}
                          {item.body && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{item.body}</p>
                          )}
                          {item.createdAt && (
                            <p className="text-[11px] text-slate-500 mt-1">{item.createdAt}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {item.unread && (
                            <button
                              onClick={() => onRead?.(item.id)}
                              className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                              aria-label="Mark as read"
                            >
                              <Mail className="h-4 w-4 text-emerald-600" />
                            </button>
                          )}
                          <button
                            onClick={() => onDelete?.(item.id)}
                            className="p-1.5 rounded-full hover:bg-slate-100 transition-colors"
                            aria-label="Delete notification"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </div>

                      {isMessage && (
                        <div className="mt-3 space-y-2">
                          <button
                            onClick={() =>
                              setReplyingTo((prev) => (prev === item.id ? null : item.id))
                            }
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                          >
                            <Reply className="h-4 w-4" />
                            Reply
                          </button>
                          {replyingTo === item.id && (
                            <div className="space-y-2">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={3}
                                className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                                placeholder="Type your reply..."
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText("");
                                  }}
                                  className="text-xs px-3 py-1.5 rounded-md border border-slate-200 hover:bg-slate-50"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleReplySend}
                                  className="text-xs px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  Send
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

