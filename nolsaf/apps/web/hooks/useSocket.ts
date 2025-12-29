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
  // Default to localhost:4000 for development
  return typeof window !== 'undefined' ? "http://localhost:4000" : "";
};

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

    // Initialize socket connection - connect directly to API server
    // WebSocket upgrades don't work through Next.js rewrites
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      autoConnect: true,
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

