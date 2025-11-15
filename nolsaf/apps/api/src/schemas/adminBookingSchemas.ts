import { z } from "zod";

export const ConfirmBookingInput = z.object({
  generateCode: z.boolean().optional().default(true),
});

export const CancelBookingInput = z.object({
  reason: z.string().min(3).max(300),
});

export const ReassignRoomInput = z.object({
  roomCode: z.string().min(1).max(64),
});
