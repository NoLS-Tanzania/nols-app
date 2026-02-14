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

  // Dev default: use the same hostname as the current page.
  // This avoids a common auth pitfall where cookies are set on `localhost` but the socket connects to `127.0.0.1`
  // (or vice-versa), which results in sockets showing up as unauthenticated.
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:4000`;
  }
  return "";
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

export type UseSocketOptions = {
  enabled?: boolean;
  joinDriverRoom?: boolean;
  driverId?: string | number;
};

export function useSocket(userId?: string | number, options?: UseSocketOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const enabled = options?.enabled ?? Boolean(userId);
  const joinDriverRoom = options?.joinDriverRoom ?? Boolean(userId);
  const driverId = options?.driverId ?? userId;

  useEffect(() => {
    if (!enabled) return;

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
      ...(token ? { auth: { token } } : {}),
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
      // Join driver-specific room for real-time updates (driver-only feature)
      if (joinDriverRoom && driverId) {
        newSocket.emit("join-driver-room", { driverId });
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
        if (joinDriverRoom && driverId) {
          socketRef.current.emit("leave-driver-room", { driverId });
        }
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
    };
  }, [enabled, joinDriverRoom, driverId]);

  return { socket, connected };
}

