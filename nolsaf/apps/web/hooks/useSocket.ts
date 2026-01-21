"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// For WebSocket connections, we need to connect directly to the API server
// because Next.js rewrites don't support WebSocket upgrades
// In production, use NEXT_PUBLIC_API_URL or NEXT_PUBLIC_SOCKET_URL env vars
const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Default to 127.0.0.1:4000 for development (more reliable than localhost on some systems due to IPv6 ::1 binding)
  return typeof window !== 'undefined' ? "http://127.0.0.1:4000" : "";
};

// Helper function to get authentication token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Try localStorage first
  const lsToken =
    window.localStorage.getItem("token") ||
    window.localStorage.getItem("nolsaf_token") ||
    window.localStorage.getItem("__Host-nolsaf_token");
  
  if (lsToken) return lsToken;
  
  // Fallback to cookies (for httpOnly cookies, they'll be sent automatically)
  const m = String(document.cookie || "").match(/(?:^|;\s*)(?:nolsaf_token|__Host-nolsaf_token|token)=([^;]+)/);
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export function useSocket(userId?: string | number) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    const socketUrl = getSocketUrl();
    if (!socketUrl) {
      console.warn("Socket.IO: No API URL configured, skipping connection");
      return;
    }

    // Get authentication token
    const token = getAuthToken();
    
    // Initialize socket connection - connect directly to API server
    // WebSocket upgrades don't work through Next.js rewrites
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      autoConnect: true,
      withCredentials: true, // Send cookies automatically
      ...(token ? {
        transportOptions: {
          polling: {
            extraHeaders: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      } : {}),
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setConnected(true);
      // Join driver-specific room for real-time updates
      if (userId) {
        newSocket.emit("join-driver-room", { driverId: userId });
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setConnected(false);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave-driver-room", { driverId: userId });
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
    };
  }, [userId]);

  return { socket, connected };
}

