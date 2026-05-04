import { Router } from "express";
import type { RequestHandler, Response } from "express";
import { prisma } from "@nolsaf/prisma";
import { z } from "zod";
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

function sendError(res: Response, status: number, message: string, details?: any) {
  return res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
}
function sendSuccess(res: Response, data?: any, message?: string) {
  return res.status(200).json({ success: true, message, data });
}

// Best-effort audit helper (same pattern used across all driver routes)
async function audit(
  req: AuthedRequest,
  action: string,
  target: string,
  before?: any,
  after?: any,
) {
  try {
    const maybeAudit = (req.app?.get as any)?.("audit");
    if (typeof maybeAudit === "function") {
      await maybeAudit({ req, action, target, before, after });
    }
  } catch {
    // best-effort – never throw
  }
}

function getUserId(req: AuthedRequest): number {
  const id = (req as any).user?.id ?? (req as any).userId;
  if (!id) throw new Error("Unauthenticated");
  return Number(id);
}

/** Validation schema – all fields optional/nullish so partial saves and null-clears work */
const updateDriverProfileSchema = z.object({
  fullName:     z.string().max(160).nullish(),
  name:         z.string().max(160).nullish(),
  phone:        z.string().max(30).nullish(),
  email:        z.string().email().nullish(),
  avatarUrl:    z.string().url().max(500).nullish(),
  timezone:     z.string().max(80).nullish(),
  region:       z.string().max(120).nullish(),
  district:     z.string().max(120).nullish(),
  nationality:  z.string().max(80).nullish(),
  gender:       z.string().max(20).nullish(),
  dateOfBirth:  z.string().nullish(),           // ISO date string, date-only, or empty
  nin:          z.string().max(50).nullish(),
  // Vehicle / license
  licenseNumber: z.string().max(80).nullish(),
  plateNumber:   z.string().max(30).nullish(),
  vehiclePlate:  z.string().max(30).nullish(),
  vehicleType:   z.string().max(50).nullish(),
  vehicleMake:   z.string().max(100).nullish(),
  operationArea: z.string().max(200).nullish(),
  paymentPhone:  z.string().max(30).nullish(),
});

/** Helper: strip one unknown Prisma field from an error message */
function extractUnknownArg(err: any): string | null {
  const msg = String(err?.message ?? "");
  const m = msg.match(/Unknown argument `([^`]+)`/);
  return m?.[1] ?? null;
}

/** PUT /api/driver/profile */
const updateDriverProfile: RequestHandler = async (req, res) => {
  try {
    const userId = getUserId(req as AuthedRequest);

    // Validate body
    const parsed = updateDriverProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, "Invalid input", parsed.error.issues);
    }
    const data = parsed.data;

    // Confirm the caller is actually a DRIVER
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return sendError(res, 404, "User not found");
    if (user.role !== "DRIVER") {
      return sendError(res, 403, "Only drivers can use this endpoint");
    }

    // Capture before-state for audit (best-effort)
    let before: any = null;
    try {
      before = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          fullName: true, name: true, phone: true, avatarUrl: true,
          nationality: true, gender: true, region: true, district: true,
          nin: true, licenseNumber: true, plateNumber: true, vehiclePlate: true,
          vehicleType: true, vehicleMake: true, operationArea: true, paymentPhone: true,
        },
      });
    } catch { /* best-effort */ }

    // Build update payload – only include explicitly-defined (non-undefined) fields
    // null values are allowed to clear a field; skip only if the key was absent entirely
    const str = (v: any) => (v == null ? null : String(v));
    const updateData: any = {};
    if (data.fullName     !== undefined) updateData.fullName     = str(data.fullName);
    if (data.name         !== undefined) updateData.name         = str(data.name);
    if (data.phone        !== undefined) updateData.phone        = str(data.phone);
    if (data.email        !== undefined) updateData.email        = str(data.email);
    if (data.avatarUrl    !== undefined) updateData.avatarUrl    = str(data.avatarUrl);
    if (data.timezone     !== undefined) updateData.timezone     = str(data.timezone);
    if (data.region       !== undefined) updateData.region       = str(data.region);
    if (data.district     !== undefined) updateData.district     = str(data.district);
    if (data.nationality  !== undefined) updateData.nationality  = str(data.nationality);
    if (data.gender       !== undefined) updateData.gender       = str(data.gender);
    if (data.nin          !== undefined) updateData.nin          = str(data.nin);
    if (data.licenseNumber !== undefined) updateData.licenseNumber = str(data.licenseNumber);
    // Sync both plate fields: whichever is set, keep them in sync
    if (data.plateNumber !== undefined || data.vehiclePlate !== undefined) {
      const plateVal = str(data.plateNumber !== undefined ? data.plateNumber : data.vehiclePlate);
      updateData.plateNumber  = plateVal;
      updateData.vehiclePlate = plateVal;
    }
    if (data.vehicleType   !== undefined) updateData.vehicleType   = str(data.vehicleType);
    if (data.vehicleMake   !== undefined) updateData.vehicleMake   = str(data.vehicleMake);
    if (data.operationArea !== undefined) updateData.operationArea = str(data.operationArea);
    if (data.paymentPhone  !== undefined) updateData.paymentPhone  = str(data.paymentPhone);

    // Handle dateOfBirth: accept ISO string, date-only (YYYY-MM-DD), or empty/null (clear)
    if (data.dateOfBirth !== undefined) {
      if (!data.dateOfBirth) {
        updateData.dateOfBirth = null;
      } else {
        // Append noon UTC time if only a date is supplied (avoids timezone shift to prior day)
        const iso = /^\d{4}-\d{2}-\d{2}$/.test(data.dateOfBirth)
          ? data.dateOfBirth + "T12:00:00.000Z"
          : data.dateOfBirth;
        const d = new Date(iso);
        if (!Number.isNaN(d.getTime())) {
          updateData.dateOfBirth = d;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return sendSuccess(res, null, "Nothing to update");
    }

    // Perform the update with retry-on-unknown-field (guards against stale Prisma client)
    let updated: any;
    try {
      updated = await prisma.user.update({ where: { id: userId }, data: updateData } as any);
    } catch (err: any) {
      const badField = extractUnknownArg(err);
      if (badField) {
        console.warn(`[driver/profile] Field '${badField}' unknown in Prisma client – retrying`);
        delete updateData[badField];
        updated = await prisma.user.update({ where: { id: userId }, data: updateData } as any);
      } else {
        throw err;
      }
    }

    // Audit (best-effort)
    try {
      await audit(
        req as AuthedRequest,
        "DRIVER_PROFILE_UPDATE",
        `user:${updated.id}`,
        before,
        updateData,
      );
    } catch { /* best-effort */ }

    return sendSuccess(res, null, "Profile updated successfully");
  } catch (error: any) {
    console.error("[driver/profile] update failed", error);
    return sendError(res, 500, "Failed to update profile");
  }
};

export const router = Router();
router.put("/", requireAuth as unknown as RequestHandler, updateDriverProfile);
