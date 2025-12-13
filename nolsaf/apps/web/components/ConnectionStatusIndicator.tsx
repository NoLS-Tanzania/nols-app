"use client";
import React from "react";
import { Wifi, WifiOff, AlertCircle } from "lucide-react";
import { ConnectionStatus } from "@/hooks/useConnectionStatus";

interface ConnectionStatusIndicatorProps {
  status: ConnectionStatus;
  className?: string;
}

export default function ConnectionStatusIndicator({ status, className = "" }: ConnectionStatusIndicatorProps) {
  const config = {
    online: {
      icon: Wifi,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-200",
      label: "Online",
    },
    offline: {
      icon: WifiOff,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      label: "Offline",
    },
    slow: {
      icon: AlertCircle,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      label: "Slow Connection",
    },
  };

  const currentConfig = config[status];
  const Icon = currentConfig.icon;

  return (
    <div
      className={`${currentConfig.bgColor} ${currentConfig.borderColor} border rounded-lg px-3 py-1.5 flex items-center gap-2 ${className}`}
      title={currentConfig.label}
    >
      <Icon className={`${currentConfig.color} h-4 w-4`} />
      <span className={`${currentConfig.color} text-xs font-medium`}>{currentConfig.label}</span>
    </div>
  );
}

