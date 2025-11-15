import { prisma } from "@nolsaf/prisma";
import crypto from "crypto";

function randomCode(len = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[crypto.randomInt(0, alphabet.length)];
  return out;
}

/** Generate a unique, ACTIVE code for a booking (idempotent if one already ACTIVE). */
export async function ensureActiveCheckinCode(bookingId: number) {
  // If one ACTIVE exists, return it (idempotent).
  const existing = await prisma.checkinCode.findFirst({
    where: { bookingId, status: "ACTIVE" },
  });
  if (existing) return existing;

  // Try a few times to avoid rare collision.
  for (let i = 0; i < 5; i++) {
    const code = randomCode(8);
    try {
      const created = await prisma.checkinCode.create({
        data: {
          bookingId,
          code,
          status: "ACTIVE",
          issuedAt: new Date(),
        },
      });
      return created;
    } catch (e: any) {
      // Unique constraint on `code` might throw, loop and retry.
      if (String(e?.message ?? "").toLowerCase().includes("unique")) continue;
      throw e;
    }
  }
  throw new Error("Unable to generate unique check-in code");
}

export async function voidCodeById(codeId: number, reason?: string) {
  return prisma.checkinCode.update({
    where: { id: codeId },
    data: { status: "VOID", voidReason: reason ?? null, voidedAt: new Date() },
  });
}
