"use client";
import React, { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    iconColor: "text-emerald-600",
    titleColor: "text-emerald-900",
    messageColor: "text-emerald-700",
  },
  error: {
    icon: AlertCircle,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    iconColor: "text-red-600",
    titleColor: "text-red-900",
    messageColor: "text-red-700",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconColor: "text-amber-600",
    titleColor: "text-amber-900",
    messageColor: "text-amber-700",
  },
  info: {
    icon: Info,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    iconColor: "text-blue-600",
    titleColor: "text-blue-900",
    messageColor: "text-blue-700",
  },
};

export default function Toast({ id, type, title, message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(id), 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg p-4 mb-3 min-w-[300px] max-w-md animate-slide-in-right`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`${config.iconColor} h-5 w-5 flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`${config.titleColor} font-semibold text-sm`}>{title}</p>
          {message && <p className={`${config.messageColor} text-xs mt-1`}>{message}</p>}
        </div>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(id), 300);
          }}
          className={`${config.iconColor} hover:opacity-70 transition-opacity flex-shrink-0`}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
  }>;
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onClose={onClose} />
        ))}
      </div>
    </div>
  );
}

