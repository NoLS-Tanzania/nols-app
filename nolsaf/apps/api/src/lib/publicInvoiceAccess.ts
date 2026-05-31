// apps/api/src/lib/publicInvoiceAccess.ts
// Shared helpers for short-lived public invoice access tokens.
// Used by the public invoice flow (public.invoices.ts) and by the authenticated
// bookings list (customer.bookings.ts) to deep-link unpaid drafts to the payment page.
import jwt from "jsonwebtoken";

export type PublicInvoiceAccessPayload = {
  typ: "PUBLIC_INVOICE_ACCESS";
  invoiceId: number;
  bookingId: number;
};

export function getPublicInvoiceAccessSecret(): string {
  const secret =
    process.env.PUBLIC_LINK_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== "production" ? process.env.DEV_JWT_SECRET || "dev_jwt_secret" : "");

  if (!secret) {
    throw new Error("public_invoice_access_secret_missing");
  }

  return secret;
}

export function signPublicInvoiceAccessToken(invoiceId: number, bookingId: number): string {
  const payload: PublicInvoiceAccessPayload = {
    typ: "PUBLIC_INVOICE_ACCESS",
    invoiceId,
    bookingId,
  };

  return jwt.sign(payload, getPublicInvoiceAccessSecret(), {
    expiresIn: "24h",
    issuer: "nolsaf-public",
    subject: String(invoiceId),
  });
}

export function verifyPublicInvoiceAccessToken(token: string, invoiceId: number): boolean {
  try {
    const decoded = jwt.verify(token, getPublicInvoiceAccessSecret(), {
      issuer: "nolsaf-public",
    }) as PublicInvoiceAccessPayload;

    return decoded?.typ === "PUBLIC_INVOICE_ACCESS" && Number(decoded.invoiceId) === invoiceId;
  } catch {
    return false;
  }
}
