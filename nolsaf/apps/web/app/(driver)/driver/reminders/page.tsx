"use client";
import { useEffect, useState, useRef } from "react";
import { Bell, AlertCircle, Info, AlertTriangle, Shield, Calendar, FileWarning, CheckCircle, X, ExternalLink, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { io, Socket } from "socket.io-client";

const api = axios.create({ baseURL: "", withCredentials: true });

type Reminder = {
  id: string;
  type: "INFO" | "WARNING" | "ALERT" | "POLICY_VIOLATION" | "SAFETY" | "LICENSE_EXPIRY" | "INSURANCE_EXPIRY";
  message: string;
  action: string | null;
  actionLink: string | null;
  expiresAt: string | null;
  isRead: boolean;
  createdAt: string;
  meta?: any;
};

const getReminderIcon = (type: string) => {
  switch (type) {
    case "WARNING":
      return AlertTriangle;
    case "ALERT":
      return AlertCircle;
    case "POLICY_VIOLATION":
      return FileWarning;
    case "SAFETY":
      return Shield;
    case "LICENSE_EXPIRY":
    case "INSURANCE_EXPIRY":
      return Calendar;
    default:
      return Info;
  }
};

const getReminderColor = (type: string) => {
  switch (type) {
    case "WARNING":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "ALERT":
      return "bg-red-100 text-red-700 border-red-200";
    case "POLICY_VIOLATION":
      return "bg-red-100 text-red-700 border-red-200";
    case "SAFETY":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "LICENSE_EXPIRY":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "INSURANCE_EXPIRY":
      return "bg-purple-100 text-purple-700 border-purple-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export default function DriverRemindersPage() {
  const router = useRouter();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ" | "EXPIRED">("ALL");
  const socketRef = useRef<Socket | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadReminders();

    // Setup Socket.IO for real-time updates
    const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", {
      transports: ["websocket"],
    });

    socket.on("connect", async () => {
      console.log("Socket connected for reminders");
      try {
        const me = await fetch("/api/account/me", { credentials: "include" }).then((r) => (r.ok ? r.json() : null));
        if (me?.id) socket.emit("join-driver-room", { driverId: me.id });
      } catch {
        // ignore
      }
    });

      // Listen for new reminders
      socket.on("new-reminder", (data: Reminder) => {
        setNotification({ message: `New reminder: ${data.message.substring(0, 50)}...`, type: 'success' });
        setTimeout(() => setNotification(null), 5000);
        loadReminders(); // Refresh reminders list
      });

    socketRef.current = socket;

    return () => {
      try { socket.emit("leave-driver-room", { driverId: undefined }); } catch {}
      socket.disconnect();
    };
  }, []);

  async function loadReminders() {
    setLoading(true);
    try {
      const r = await api.get<Reminder[]>("/api/driver/reminders");
      setReminders(r.data || []);
    } catch (err) {
      console.error("Failed to load reminders", err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(reminderId: string) {
    try {
      await api.post(`/api/driver/reminders/${reminderId}/read`);
      setReminders(prev => prev.map(r => r.id === reminderId ? { ...r, isRead: true } : r));
    } catch (err) {
      console.error("Failed to mark reminder as read", err);
    }
  }

  const filteredReminders = reminders.filter(r => {
    if (filter === "UNREAD") return !r.isRead;
    if (filter === "READ") return r.isRead;
    if (filter === "EXPIRED") return r.expiresAt && new Date(r.expiresAt) < new Date();
    return true;
  });

  const unreadCount = reminders.filter(r => !r.isRead).length;
  const expiredCount = reminders.filter(r => r.expiresAt && new Date(r.expiresAt) < new Date()).length;

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {/* Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        } animate-fade-in`}>
          <CheckCircle className="h-5 w-5" />
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-2xl p-8 border border-emerald-100 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4">
            <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
              <Bell className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Reminders</h1>
            <p className="text-base text-gray-600">View and manage your reminders and notifications</p>
          </div>
          {unreadCount > 0 && (
            <div className="mt-6 px-5 py-2.5 bg-red-500 text-white rounded-full font-semibold shadow-md">
              {unreadCount} Unread Reminder{unreadCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-400 opacity-0 group-hover:opacity-30 transition-opacity"></div>
          <p className="text-sm font-medium text-gray-500 mb-2">Total Reminders</p>
          <p className="text-3xl font-bold text-gray-900">{reminders.length}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-amber-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 opacity-0 group-hover:opacity-30 transition-opacity"></div>
          <p className="text-sm font-medium text-gray-500 mb-2">Unread</p>
          <p className="text-3xl font-bold text-amber-600">{unreadCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-red-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 opacity-0 group-hover:opacity-30 transition-opacity"></div>
          <p className="text-sm font-medium text-gray-500 mb-2">Expired</p>
          <p className="text-3xl font-bold text-red-600">{expiredCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-emerald-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 opacity-0 group-hover:opacity-30 transition-opacity"></div>
          <p className="text-sm font-medium text-gray-500 mb-2">Active</p>
          <p className="text-3xl font-bold text-emerald-600">
            {reminders.filter(r => !r.expiresAt || new Date(r.expiresAt) > new Date()).length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all ${
              filter === "ALL"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                : "bg-white text-gray-700 border-gray-300 hover:border-emerald-400 hover:bg-emerald-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("UNREAD")}
            className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all ${
              filter === "UNREAD"
                ? "bg-amber-600 text-white border-amber-600 shadow-md"
                : "bg-white text-gray-700 border-gray-300 hover:border-amber-400 hover:bg-amber-50"
            }`}
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            onClick={() => setFilter("READ")}
            className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all ${
              filter === "READ"
                ? "bg-blue-600 text-white border-blue-600 shadow-md"
                : "bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:bg-blue-50"
            }`}
          >
            Read
          </button>
          <button
            onClick={() => setFilter("EXPIRED")}
            className={`px-5 py-2.5 rounded-full text-sm font-medium border transition-all ${
              filter === "EXPIRED"
                ? "bg-red-600 text-white border-red-600 shadow-md"
                : "bg-white text-gray-700 border-gray-300 hover:border-red-400 hover:bg-red-50"
            }`}
          >
            Expired {expiredCount > 0 && `(${expiredCount})`}
          </button>
        </div>
      </div>

      {/* Reminders List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading reminders...</div>
        ) : filteredReminders.length === 0 ? (
          <div className="bg-white rounded-xl p-16 border border-gray-200 shadow-sm text-center">
            <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
              <Bell className="h-10 w-10 text-gray-400" />
            </div>
            <p className="text-gray-700 text-xl font-semibold mb-2">No reminders found</p>
            <p className="text-gray-500 text-sm">
              {filter === "ALL" 
                ? "You don't have any reminders yet." 
                : `No ${filter.toLowerCase()} reminders found.`}
            </p>
          </div>
        ) : (
          filteredReminders.map((reminder) => {
            const Icon = getReminderIcon(reminder.type);
            const isExpired = reminder.expiresAt && new Date(reminder.expiresAt) < new Date();
            
            return (
              <div
                key={reminder.id}
                className={`bg-white rounded-xl p-6 border shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                  getReminderColor(reminder.type)
                } ${!reminder.isRead ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${
                    reminder.type === "ALERT" || reminder.type === "POLICY_VIOLATION" 
                      ? "bg-red-100" 
                      : reminder.type === "WARNING"
                      ? "bg-amber-100"
                      : reminder.type === "SAFETY"
                      ? "bg-blue-100"
                      : "bg-gray-100"
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-white/80">
                            {reminder.type.replace('_', ' ')}
                          </span>
                          {!reminder.isRead && (
                            <span className="px-2.5 py-1 bg-red-500 text-white text-xs font-medium rounded-full">New</span>
                          )}
                          {isExpired && (
                            <span className="px-2.5 py-1 bg-gray-500 text-white text-xs font-medium rounded-full">Expired</span>
                          )}
                        </div>
                        <p className="text-base font-semibold mb-3 leading-relaxed">{reminder.message}</p>
                      </div>
                      {!reminder.isRead && (
                        <button
                          onClick={() => markAsRead(reminder.id)}
                          className="ml-4 p-2 hover:bg-white/70 rounded-lg transition-colors"
                          title="Mark as read"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                    
                    {reminder.action && reminder.actionLink && (
                      <div className="mt-4">
                        <button
                          onClick={() => router.push(reminder.actionLink!)}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md font-medium"
                        >
                          <span>{reminder.action}</span>
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500">
                      {reminder.expiresAt && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Expires: {new Date(reminder.expiresAt).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Created: {new Date(reminder.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

