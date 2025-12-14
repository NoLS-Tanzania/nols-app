"use client";
import React from "react";
import { Menu} from "lucide-react";
import DriverAvailabilitySwitch from "./DriverAvailabilitySwitch";
import Notifications, { NotificationItem } from "./Notifications";

interface DriverLiveMapTopControlsProps {
  isDark?: boolean;
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
  isDark,
  onMenuClick,
  notifications,
  onNotificationRead,
  onNotificationDelete,
  onNotificationReply,
  onNotificationsOpen,
  onNotificationsClose,
  hideAvailability = false,
}: DriverLiveMapTopControlsProps) {
  const themed = (light: string, dark: string) => (isDark ? dark : light);
  const icon = themed("text-slate-700", "text-slate-100");
  // Fixed-size circular buttons to keep icon alignment consistent everywhere.
  const buttonBase = [
    "pointer-events-auto h-11 w-11 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110 active:scale-95 border",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    themed("bg-white border-slate-200 focus-visible:ring-slate-300 focus-visible:ring-offset-white", "bg-slate-950/55 border-white/15 backdrop-blur-md focus-visible:ring-white/30 focus-visible:ring-offset-slate-950"),
  ].join(" ");
  const pillBase = themed("bg-white", "bg-slate-950/55 backdrop-blur-md");
  const pillBorder = themed("", "border border-white/15");

  return (
    <div className="absolute top-0 left-0 right-0 z-30 px-4 pt-4 pb-2 pointer-events-none">
      {/* Use a 3-column layout so center stays centered and right stays free (Mapbox controls live top-right). */}
      <div className="grid grid-cols-3 items-center max-w-6xl mx-auto">
        {/* Left: Menu + Notifications (moved away from top-right to avoid covering Mapbox controls) */}
        <div className="flex items-center gap-2 justify-start">
          <button
            onClick={onMenuClick}
            className={buttonBase}
            aria-label="Menu"
          >
            <Menu className={["h-[18px] w-[18px]", icon].join(" ")} />
          </button>

          <div className="relative pointer-events-auto">
            <Notifications
              items={notifications}
              isDark={isDark}
              onRead={onNotificationRead}
              onDelete={onNotificationDelete}
              onReply={onNotificationReply}
              onOpen={onNotificationsOpen}
              onClose={onNotificationsClose}
              panelAlign="left"
            />
          </div>
        </div>

        {/* Center: Status Indicator */}
        <div className="flex justify-center">
          {!hideAvailability && (
            <div className="pointer-events-auto">
              <div className={["rounded-full px-4 py-2 shadow-lg flex items-center gap-2", pillBase, pillBorder].join(" ")}>
                <DriverAvailabilitySwitch />
              </div>
            </div>
          )}
        </div>

        {/* Right: Keep empty to give room to Mapbox zoom/compass controls */}
        <div />
      </div>
    </div>
  );
}

