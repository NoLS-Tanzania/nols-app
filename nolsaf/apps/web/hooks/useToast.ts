"use client";
import { useState, useCallback } from "react";
import { ToastType } from "@/components/Toast";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration?: number) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
      return id;
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    return showToast("success", title, message, duration);
  }, [showToast]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return showToast("error", title, message, duration);
  }, [showToast]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return showToast("info", title, message, duration);
  }, [showToast]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return showToast("warning", title, message, duration);
  }, [showToast]);

  return {
    toasts,
    showToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };
}

