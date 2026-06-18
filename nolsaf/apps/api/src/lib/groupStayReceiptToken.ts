// apps/api/src/lib/groupStayReceiptToken.ts
//
// Short-lived signed token for downloading a group stay deposit receipt PDF.
//
// The mobile app cannot attach an Authorization header when opening a PDF in
// the device browser/viewer, so the authenticated customer first exchanges
// their session for a short-lived (10 min) token scoped to one booking, then
// opens the public receipt URL with that token.

import jwt, { type Algorithm } from "jsonwebtoken";

export type GroupStayReceiptTokenPayload = {
  typ: "GROUP_STAY_RECEIPT";
  bookingId: number;
  userId: number;
};

const ISSUER = "nolsaf-group-stay-receipt";
const ALGS: Algorithm[] = ["HS256"];
const MAX_TOKEN_LENGTH = 2048;

function getSecret(): string {
  const secret =
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== "production" ? process.env.DEV_JWT_SECRET || "dev_jwt_secret" : "");

  if (!secret) {
    throw new Error("group_stay_receipt_secret_missing");
  }

  return secret;
}

export function signGroupStayReceiptToken(bookingId: number, userId: number): string {
  const payload: Omit<GroupStayReceiptTokenPayload, never> = {
    typ: "GROUP_STAY_RECEIPT",
    bookingId,
    userId,
  };
  return jwt.sign(payload, getSecret(), { issuer: ISSUER, algorithm: "HS256", expiresIn: "10m" });
}

export function verifyGroupStayReceiptToken(token: string): GroupStayReceiptTokenPayload | null {
  try {
    if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
    const decoded = jwt.verify(token, getSecret(), { issuer: ISSUER, algorithms: ALGS }) as GroupStayReceiptTokenPayload;
    if (decoded?.typ !== "GROUP_STAY_RECEIPT") return null;
    return decoded;
  } catch {
    return null;
  }
}
