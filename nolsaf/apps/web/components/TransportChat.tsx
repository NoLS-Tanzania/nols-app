"use client";

import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Send, Phone, MessageCircle, Loader2 } from "lucide-react";
import axios from "axios";

interface Message {
  id: number;
  message: string;
  senderType: "DRIVER" | "PASSENGER" | "ADMIN";
  senderId: number;
  messageType: "TEXT" | "IMAGE" | "LOCATION" | "SYSTEM";
  readAt: string | null;
  createdAt: string;
}

interface TransportChatProps {
  bookingId: number;
  currentUserId: number;
  currentUserType: "DRIVER" | "PASSENGER" | "ADMIN";
  otherUserName?: string;
  otherUserPhone?: string;
  className?: string;
}

const api = axios.create({ baseURL: "", withCredentials: true });

export default function TransportChat({
  bookingId,
  currentUserId,
  currentUserType,
  otherUserName,
  otherUserPhone,
  className = "",
}: TransportChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Fetch messages on mount
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await api.get(`/api/transport-bookings/${bookingId}/messages`);
        setMessages(response.data.items || []);
        
        // Mark all as read
        try {
          await api.post(`/api/transport-bookings/${bookingId}/messages/read-all`);
        } catch (e) {
          // Ignore read-all errors
        }
      } catch (error) {
        console.error("Failed to fetch messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [bookingId]);

  // Setup Socket.IO connection
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const newSocket = io(apiUrl, {
      transports: ["websocket"],
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected for transport chat");
      // Join user room for receiving messages
      if (currentUserType === "DRIVER") {
        newSocket.emit("join-driver-room", { driverId: currentUserId });
      } else {
        newSocket.emit("join-user-room", { userId: currentUserId });
      }
    });

    // Listen for new messages
    newSocket.on("transport:message:new", (data: { bookingId: number; message: Message }) => {
      if (data.bookingId === bookingId) {
        setMessages((prev) => {
          // Check if message already exists
          const exists = prev.some((m) => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        
        // Mark as read if not sent by current user
        if (data.message.senderId !== currentUserId) {
          api.post(`/api/transport-bookings/${bookingId}/messages/${data.message.id}/read`).catch(() => {});
        }
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [bookingId, currentUserId, currentUserType]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setSending(true);

    try {
      const response = await api.post(`/api/transport-bookings/${bookingId}/messages`, {
        message: messageText,
        messageType: "TEXT",
      });

      // Add message optimistically
      setMessages((prev) => [...prev, response.data]);
    } catch (error: any) {
      console.error("Failed to send message:", error);
      // Restore message on error
      setNewMessage(messageText);
      alert("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleCall = () => {
    if (otherUserPhone) {
      window.location.href = `tel:${otherUserPhone}`;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const isMyMessage = (message: Message) => {
    return message.senderId === currentUserId;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="w-6 h-6 animate-spin text-[#02665e]" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#02665e] flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Chat</h3>
            {otherUserName && (
              <p className="text-xs text-slate-600">{otherUserName}</p>
            )}
          </div>
        </div>
        {otherUserPhone && (
          <button
            onClick={handleCall}
            className="p-2 rounded-lg bg-[#02665e] text-white hover:bg-[#014e47] transition-colors"
            title="Call"
          >
            <Phone className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/50 to-white"
        style={{ maxHeight: "400px" }}
      >
        {messages.length === 0 ? (
          <div className="text-center text-slate-500 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isMine = isMyMessage(message);
            return (
              <div
                key={message.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    isMine
                      ? "bg-gradient-to-r from-[#02665e] to-[#014e47] text-white"
                      : "bg-white border border-slate-200 text-slate-900"
                  }`}
                >
                  {message.messageType === "SYSTEM" && (
                    <p className="text-xs opacity-75 mb-1">
                      {message.senderType === "ADMIN" ? "Admin" : "System"}
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMine ? "text-white/70" : "text-slate-500"
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] text-sm"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-2.5 rounded-xl bg-[#02665e] text-white hover:bg-[#014e47] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}


