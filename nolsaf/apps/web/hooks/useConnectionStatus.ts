"use client";
import { useState, useEffect } from "react";

export type ConnectionStatus = "online" | "offline" | "slow";

export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("online");
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);
    setStatus(navigator.onLine ? "online" : "offline");

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      setStatus("online");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Monitor connection quality (if available)
    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      const updateConnectionStatus = () => {
        if (!navigator.onLine) {
          setStatus("offline");
          return;
        }

        const effectiveType = connection.effectiveType;
        if (effectiveType === "slow-2g" || effectiveType === "2g") {
          setStatus("slow");
        } else {
          setStatus("online");
        }
      };

      updateConnectionStatus();
      connection.addEventListener("change", updateConnectionStatus);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        connection.removeEventListener("change", updateConnectionStatus);
      };
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { status, isOnline };
}

