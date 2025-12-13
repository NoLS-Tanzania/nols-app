"use client";
import React from "react";
import { Menu} from "lucide-react";
import DriverAvailabilitySwitch from "./DriverAvailabilitySwitch";
import Notifications, { NotificationItem } from "./Notifications";

interface DriverLiveMapTopControlsProps {
  onMenuClick?: () => void;
  notifications: NotificationItem[];
  onNotificationRead?: (id: string) => void;
  onNotificationDelete?: (id: string) => void;
  onNotificationReply?: (id: string, message: string) => void;
  onNotificationsOpen?: () => void;
  onNotificationsClose?: () => void;
  hideAvailability?: boolean;
}

export default function DriverLiveMapTopControls({ 
  onMenuClick,
  notifications,
  onNotificationRead,
  onNotificationDelete,
  onNotificationReply,
  onNotificationsOpen,
  onNotificationsClose,
  hideAvailability = false,
}: DriverLiveMapTopControlsProps) {

  return (
    <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-4 pb-2 pointer-events-none">
      <div className="flex items-center justify-between max-w-6xl mx-auto">
        {/* Left: Menu Button */}
        <button
          onClick={onMenuClick}
          className="pointer-events-auto bg-white rounded-full p-2.5 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 border border-slate-200"
          aria-label="Menu"
        >
          <Menu className="h-4 w-4 text-slate-700" />
        </button>

        {/* Center: Status Indicator */}
        {!hideAvailability && (
          <div className="pointer-events-auto">
            <div className="bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
              <DriverAvailabilitySwitch />
            </div>
          </div>
        )}

        {/* Right: Notifications */}
        <div className="relative pointer-events-auto">
          <Notifications
            items={notifications}
            onRead={onNotificationRead}
            onDelete={onNotificationDelete}
            onReply={onNotificationReply}
            onOpen={onNotificationsOpen}
            onClose={onNotificationsClose}
          />
        </div>
      </div>
    </div>
  );
}

