import { useIsFocused } from "@react-navigation/native";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

import { useAuth } from "../auth/AuthProvider";
import { env } from "../lib/env";

export type DriverSocketEvent =
  | "driver:availability:update"
  | "transport:booking:claim_awarded"
  | "transport:booking:created"
  | "referral-update"
  | "referral-notification"
  | "bonus-granted"
  | "driver-payout-invoice-approved"
  | "driver-payout-invoice-paid"
  | "trip:update"
  | "admin-level-message-response";

type DriverSocketHandlers = Partial<Record<DriverSocketEvent, (payload: unknown) => void>>;

const SOCKET_EVENTS: DriverSocketEvent[] = [
  "driver:availability:update",
  "transport:booking:claim_awarded",
  "transport:booking:created",
  "referral-update",
  "referral-notification",
  "bonus-granted",
  "driver-payout-invoice-approved",
  "driver-payout-invoice-paid",
  "trip:update",
  "admin-level-message-response"
];

export function useDriverSocket(handlers: DriverSocketHandlers, options: { enabled?: boolean; requireFocus?: boolean } = {}) {
  const { status, token } = useAuth();
  const requireFocus = options.requireFocus ?? true;
  const focused = useIsFocused();
  const isFocused = requireFocus ? focused : true;
  const enabled = options.enabled ?? true;
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !isFocused || status !== "authenticated" || !token || !env.socketUrl) return;

    const socket: Socket = io(env.socketUrl, {
      auth: { token },
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true
    });

    SOCKET_EVENTS.forEach((event) => {
      socket.on(event, (payload: unknown) => {
        handlersRef.current[event]?.(payload);
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [enabled, isFocused, status, token]);
}
