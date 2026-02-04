// apps/api/src/routes/payments.azampay.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { sendSms } from "../lib/sms.js";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { z } from "zod";

const router = Router();

// Rate limiting for payment initiation (5 requests per 15 minutes)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per window
  message: "Too many payment requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation schema for payment initiation
const initiatePaymentSchema = z.object({
  invoiceId: z.number().int().positive(),
  phoneNumber: z.string().min(10).max(20),
  provider: z.enum(["Airtel", "Tigo", "M-Pesa", "Halopesa"]).optional(),
  idempotencyKey: z.string().optional(),
});

// AzamPay configuration
const AZAMPAY_API_URL = process.env.AZAMPAY_API_URL || "https://api.azampay.co.tz";
const AZAMPAY_API_KEY = process.env.AZAMPAY_API_KEY || "";
const AZAMPAY_CLIENT_ID = process.env.AZAMPAY_CLIENT_ID || "";
const AZAMPAY_CLIENT_SECRET = process.env.AZAMPAY_CLIENT_SECRET || "";
const AZAMPAY_WEBHOOK_SECRET = process.env.AZAMPAY_WEBHOOK_SECRET || "";

// In-memory store for idempotency keys (in production, use Redis or database)
const idempotencyStore = new Map<string, { result: any; expiresAt: number }>();

// Clean up expired idempotency keys every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (value.expiresAt < now) {
      idempotencyStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Generate AzamPay signature for authentication
 */
function generateAzamPaySignature(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * POST /api/payments/azampay/initiate
 * Initiates AzamPay payment with idempotency protection
 * Body: { invoiceId: number, idempotencyKey?: string, phoneNumber: string, provider?: string }
 * 
 * Security:
 * - Rate limiting (5 requests per 15 minutes)
 * - Input validation
 * - Invoice validation
 * - Server-side amount verification
 * - Idempotency protection
 */
router.post("/initiate", paymentLimiter, async (req, res) => {
  try {
    // Fail fast if AzamPay is not configured (do not attempt outbound calls).
    if (!AZAMPAY_API_KEY || !AZAMPAY_CLIENT_ID || !AZAMPAY_CLIENT_SECRET) {
      return res.status(503).json({
        error: "Payment provider not configured",
        message: "AzamPay keys are missing on the server",
      });
    }

    // Validate request body
    const validationResult = initiatePaymentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: "Invalid request data",
        details: validationResult.error.errors,
      });
    }

    const { invoiceId, idempotencyKey, phoneNumber, provider } = validationResult.data;

    // Validate provider
    const validProviders = ["Airtel", "Tigo", "M-Pesa", "Halopesa"];
    const selectedProvider = provider && validProviders.includes(provider) ? provider : "Airtel";

    // Generate idempotency key if not provided
    const key = idempotencyKey || `azampay-${invoiceId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    // Check idempotency: if we've seen this key recently, return the cached result
    const cached = idempotencyStore.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({
        ok: true,
        idempotencyKey: key,
        cached: true,
        ...cached.result,
      });
    }

    // Fetch invoice
    const invoice = await prisma.invoice.findUnique({
      where: { id: Number(invoiceId) },
      include: { 
        booking: { 
          include: { 
            property: {
              select: {
                id: true,
                title: true,
                currency: true,
              },
            },
            user: true 
          } 
        } 
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Safety: this endpoint is intended for customer payment invoices (INV-...).
    // Prevent initiating payments against owner-submitted invoices (OINV-...).
    if (invoice.invoiceNumber && String(invoice.invoiceNumber).startsWith("OINV-")) {
      return res.status(400).json({ error: "This invoice cannot be paid via AzamPay" });
    }

    if (invoice.status === "DRAFT" || invoice.status === "REJECTED") {
      return res.status(400).json({ error: "Invoice is not payable" });
    }

    if (invoice.status === "PAID") {
      return res.status(400).json({ error: "Invoice is already paid" });
    }

    // Ensure paymentRef exists
    const paymentRef = invoice.paymentRef || `INV-${invoice.id}-${Date.now()}`;
    
    // Update invoice with paymentRef and selected payment method if not set
    if (!invoice.paymentRef) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { 
          paymentRef,
          // Store selected payment method in paymentMethod field
          paymentMethod: selectedProvider,
          status: invoice.status === "PROCESSING" ? invoice.status : "PROCESSING",
        },
      });
    } else if (provider) {
      // Update payment method if provider is specified
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentMethod: selectedProvider, status: invoice.status === "PROCESSING" ? invoice.status : "PROCESSING" },
      });
    } else if (invoice.status !== "PROCESSING") {
      // Mark as processing when payment is initiated (helps UI/reporting).
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "PROCESSING" },
      });
    }

    // Get phone number from request (required) - allows different numbers per booking
    const userPhone = phoneNumber || invoice.booking?.user?.phone || null;
    if (!userPhone) {
      return res.status(400).json({ error: "Phone number is required for payment" });
    }

    // Normalize phone number
    const normalizePhone = (phone: string): string => {
      let cleaned = phone.replace(/[^\d+]/g, "");
      if (!cleaned.startsWith("+")) {
        if (cleaned.startsWith("255")) {
          cleaned = "+" + cleaned;
        } else if (cleaned.startsWith("0")) {
          cleaned = "+255" + cleaned.substring(1);
        } else {
          cleaned = "+255" + cleaned;
        }
      }
      return cleaned;
    };

    const normalizedPhone = normalizePhone(userPhone);

    // Prepare AzamPay payment request
    // Customer payment invoices (INV-...) may have `netPayable` representing owner receivable.
    // Always charge the customer using the invoice `total`.
    const amount = Number(invoice.total || invoice.netPayable || 0);
    const currency = invoice.booking?.property?.currency || "TZS";
    
    const paymentData = {
      accountNumber: normalizedPhone,
      amount: amount.toString(),
      currency: currency,
      externalId: paymentRef,
      provider: selectedProvider, // Use selected provider
      additionalProperties: {
        invoiceId: invoice.id.toString(),
        invoiceNumber: invoice.invoiceNumber || "",
        bookingId: invoice.bookingId?.toString() || "",
        phoneNumber: normalizedPhone, // Store phone number used for this payment
      },
    };

    // Generate signature for AzamPay API
    const timestamp = Date.now().toString();
    const signatureData = JSON.stringify(paymentData) + timestamp;
    const signature = generateAzamPaySignature(signatureData, AZAMPAY_CLIENT_SECRET);

    // Call AzamPay API to initiate payment
    const azampayResponse = await fetch(`${AZAMPAY_API_URL}/api/v1/Partner/PostCheckout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AZAMPAY_API_KEY,
        "X-Client-Id": AZAMPAY_CLIENT_ID,
        "X-Timestamp": timestamp,
        "X-Signature": signature,
      },
      body: JSON.stringify(paymentData),
    });

    const azampayData = await azampayResponse.json();

    if (!azampayResponse.ok) {
      console.error("AzamPay API error:", azampayData);
      return res.status(azampayResponse.status).json({
        error: "Payment initiation failed",
        details: azampayData,
      });
    }

    // Store payment event for tracking (includes phone number and provider)
    try {
      await prisma.paymentEvent.create({
        data: {
          provider: "AZAMPAY",
          eventId: azampayData.transactionId || paymentRef,
          invoiceId: invoice.id,
          amount: amount,
          currency: currency,
          status: "PENDING",
          payload: {
            ...azampayData,
            phoneNumber: normalizedPhone,
            provider: selectedProvider,
            paymentMethod: selectedProvider,
          },
        },
      });
    } catch (err) {
      console.warn("Failed to create payment event:", err);
    }

    // Cache the result for idempotency (expires in 10 minutes)
    const result = {
      transactionId: azampayData.transactionId || paymentRef,
      paymentRef,
      status: "PENDING",
      message: azampayData.message || "Payment initiated successfully",
      checkoutUrl: azampayData.checkoutUrl || null,
    };

    idempotencyStore.set(key, {
      result,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    res.json({
      ok: true,
      idempotencyKey: key,
      ...result,
    });
  } catch (err: any) {
    console.error("Error initiating AzamPay payment:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
});

/**
 * GET /api/payments/azampay/status/:paymentRef
 * Check payment status by payment reference
 */
router.get("/status/:paymentRef", async (req, res) => {
  try {
    const { paymentRef } = req.params;

    // Find invoice by paymentRef
    const invoice = await prisma.invoice.findFirst({
      where: { paymentRef },
      include: { 
        booking: { 
          include: { 
            user: true,
            property: {
              select: {
                id: true,
                currency: true,
              },
            },
          } 
        } 
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Payment not found" });
    }

    // Find latest payment event
    const paymentEvent = await prisma.paymentEvent.findFirst({
      where: {
        invoiceId: invoice.id,
        provider: "AZAMPAY",
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      ok: true,
      invoiceId: invoice.id,
      invoiceStatus: invoice.status,
      paymentRef,
      paymentStatus: paymentEvent?.status || "UNKNOWN",
      amount: invoice.total || invoice.netPayable,
      currency: invoice.booking?.property?.currency || "TZS",
      lastEvent: paymentEvent ? {
        status: paymentEvent.status,
        amount: paymentEvent.amount,
        createdAt: paymentEvent.createdAt,
      } : null,
    });
  } catch (err: any) {
    console.error("Error checking payment status:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
  }
});

export default router;


