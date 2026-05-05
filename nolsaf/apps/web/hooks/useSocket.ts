"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// For WebSocket connections, we need to connect directly to the API server
// because Next.js rewrites don't support WebSocket upgrades.
// NEXT_PUBLIC_SOCKET_URL must be set explicitly in production/staging Vercel env vars.
const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Dev only: fall back to localhost:4000.
  // In production this env var must be set — returning "" disables the socket.
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return `http://localhost:4000`;
  }
  return "";
};

// Helper function to get authentication token.
// Checks localStorage first (most reliable for cross-origin socket connections),
// then falls back to readable cookies. httpOnly cookies cannot be read here but
// are forwarded automatically via withCredentials: true for same-site requests.
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  // localStorage is the primary store for the JWT in this app
  const fromStorage =
    localStorage.getItem("token") ||
    localStorage.getItem("nolsaf_token") ||
    localStorage.getItem("__Host-nolsaf_token");
  if (fromStorage) return fromStorage;
  // Fallback: readable (non-httpOnly) cookies
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
      // Suppress noisy errors in staging/production when socket server is unavailable.
      // Socket.IO will retry automatically up to reconnectionAttempts.
      console.warn("Socket connection error:", error.message);
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

