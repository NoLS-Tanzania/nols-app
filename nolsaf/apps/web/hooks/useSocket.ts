"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

// For WebSocket connections, connect directly to the API server because Next.js
// rewrites do not support WebSocket upgrades. NEXT_PUBLIC_SOCKET_URL must be set
// explicitly in production/staging Vercel env vars.
const getSocketUrl = () => {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    return "http://localhost:4000";
  }
  return "";
};

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

    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      autoConnect: true,
      withCredentials: true,
    });

    newSocket.on("connect", () => {
      console.log("Socket connected:", newSocket.id);
      setConnected(true);
      if (joinDriverRoom && driverId) {
        newSocket.emit("join-driver-room", { driverId });
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setConnected(false);
    });

    newSocket.on("connect_error", (error) => {
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
