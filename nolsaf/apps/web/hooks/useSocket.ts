"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function useSocket(userId?: string | number) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Initialize socket connection
    const newSocket = io(API_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
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

