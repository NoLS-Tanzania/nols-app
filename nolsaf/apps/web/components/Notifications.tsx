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
  isDark?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onReply?: (id: string, message: string) => void;
  show?: boolean;
  title?: string;
  panelAlign?: "left" | "right";
};

// Reusable notifications panel: supports read, delete, reply (for message-like items)
export default function Notifications({
  items,
  isDark,
  onOpen,
  onClose,
  onRead,
  onDelete,
  onReply,
  show = false,
  title = "Notifications",
  panelAlign = "right",
}: Props) {
  const [open, setOpen] = useState(show);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const unreadCount = useMemo(() => items.filter((i) => i.unread).length, [items]);
  const themed = (light: string, dark: string) => (isDark ? dark : light);

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
        className={[
          "h-11 w-11 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 relative border",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          themed("bg-white border-slate-200 focus-visible:ring-slate-300 focus-visible:ring-offset-white", "bg-slate-950/55 border-white/15 backdrop-blur-md focus-visible:ring-white/30 focus-visible:ring-offset-slate-950"),
        ].join(" ")}
        aria-label="Notifications"
      >
        <Bell className={["h-[18px] w-[18px]", themed("text-slate-700", "text-slate-100")].join(" ")} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold rounded-full h-[18px] w-[18px] flex items-center justify-center text-[10px] leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={[
            "absolute mt-2 rounded-2xl overflow-hidden z-50",
            // Modern translucent card
            themed(
              "bg-white/55 backdrop-blur-md border border-white/55 ring-1 ring-black/5 shadow-[0_22px_60px_rgba(15,23,42,0.18)]",
              "bg-slate-950/70 backdrop-blur-md border border-white/15 ring-1 ring-white/10 shadow-[0_22px_60px_rgba(0,0,0,0.45)]"
            ),
            // Smaller + responsive width so it never gets clipped off-screen on small devices.
            "w-[min(320px,calc(100vw-1.25rem))] max-w-[calc(100vw-1.25rem)]",
            panelAlign === "left" ? "left-0 origin-top-left" : "right-0 origin-top-right",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center justify-between px-3 py-2 border-b",
              themed("border-white/50 bg-white/35", "border-white/12 bg-slate-950/35"),
            ].join(" ")}
          >
            <div className="flex items-center gap-2">
              <Bell className={["h-4 w-4", themed("text-slate-600", "text-slate-200/85")].join(" ")} />
              <span className={["text-[13px] font-semibold", themed("text-slate-900", "text-slate-50")].join(" ")}>
                {title}
              </span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[11px] font-semibold rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={handleToggle}
              className={["p-1.5 rounded-full transition-colors", themed("hover:bg-white/60", "hover:bg-white/10")].join(" ")}
              aria-label="Close notifications"
            >
              <X className={["h-4 w-4", themed("text-slate-600", "text-slate-200/85")].join(" ")} />
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <div className={["p-5 text-center", themed("text-slate-600", "text-slate-200/80")].join(" ")}>
                <Bell className={["h-8 w-8 mx-auto mb-2", themed("text-slate-300", "text-slate-400/70")].join(" ")} />
                <p className="text-xs">No notifications</p>
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {items.map((item) => {
                  const isMessage = item.type === "message";
                  return (
                    <div
                      key={item.id}
                      className={[
                        "rounded-xl border p-2.5 transition-colors",
                        themed("border-white/55 bg-white/35 hover:bg-white/50", "border-white/15 bg-white/5 hover:bg-white/10"),
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={["text-[13px] font-semibold truncate", themed("text-slate-900", "text-slate-50")].join(" ")}>
                              {item.title}
                            </p>
                            {!item.unread && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                            )}
                          </div>
                          {item.from && (
                            <p className={["text-[11px]", themed("text-slate-500", "text-slate-300/70")].join(" ")}>
                              From: {item.from}
                            </p>
                          )}
                          {item.body && (
                            <p className={["text-[12px] mt-1 line-clamp-2", themed("text-slate-700/90", "text-slate-200/85")].join(" ")}>
                              {item.body}
                            </p>
                          )}
                          {item.createdAt && (
                            <p className={["text-[11px] mt-1", themed("text-slate-500", "text-slate-300/70")].join(" ")}>
                              {item.createdAt}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {item.unread && (
                            <button
                              onClick={() => onRead?.(item.id)}
                              className={["p-1.5 rounded-full transition-colors", themed("hover:bg-white/60", "hover:bg-white/10")].join(" ")}
                              aria-label="Mark as read"
                            >
                              <Mail className="h-4 w-4 text-emerald-600" />
                            </button>
                          )}
                          <button
                            onClick={() => onDelete?.(item.id)}
                            className={["p-1.5 rounded-full transition-colors", themed("hover:bg-white/60", "hover:bg-white/10")].join(" ")}
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
                            className={["inline-flex items-center gap-1 text-xs font-medium transition-colors", themed("text-emerald-600 hover:text-emerald-700", "text-emerald-300 hover:text-emerald-200")].join(" ")}
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
                                className={[
                                  "w-full rounded-xl border px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300",
                                  themed("border-white/60 bg-white/55 text-slate-900", "border-white/15 bg-white/5 text-slate-50 placeholder:text-slate-400/70"),
                                ].join(" ")}
                                placeholder="Type your reply..."
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText("");
                                  }}
                                  className={[
                                    "text-xs px-3 py-1.5 rounded-xl border",
                                    themed("border-white/60 bg-white/40 hover:bg-white/55 text-slate-800", "border-white/15 bg-white/5 hover:bg-white/10 text-slate-100"),
                                  ].join(" ")}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleReplySend}
                                  className="text-xs px-3 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
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

