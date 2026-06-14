import { Router } from "express";
import { prisma } from "@nolsaf/prisma";

const router = Router();

const LICENSE_TYPES = new Set(["DRIVER_LICENSE", "DRIVING_LICENSE", "DRIVER_LICENCE", "DRIVING_LICENCE", "LICENSE"]);

function parseDriverId(value: string) {
  const text = String(value || "").trim();
  const modernMatch = text.match(/^NLS\/D\/(\d+)\/[A-Z0-9]{4}\/\d{4}$/i);
  const legacyMatch = text.match(/^NLS-(\d+)-\d{4}$/i);
  const id = Number(modernMatch?.[1] ?? legacyMatch?.[1]);
  return Number.isFinite(id) ? id : null;
}

function getExpiry(metadata: any) {
  const raw =
    metadata?.expiresAt ??
    metadata?.expiresOn ??
    metadata?.expiryDate ??
    metadata?.expiry ??
    metadata?.licenseExpiresOn ??
    metadata?.licenseExpiryDate;
  if (!raw) return null;
  const date = new Date(String(raw).includes("T") ? String(raw) : `${String(raw)}T23:59:59.999Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

router.get("/:driverId", async (req, res) => {
  const publicId = String(req.params.driverId || "").trim().toUpperCase();
  const userId = parseDriverId(publicId);
  if (!userId) return res.status(400).json({ ok: false, error: "Invalid driver ID." });

  try {
    const driver = await prisma.user.findFirst({
      where: { id: userId, role: "DRIVER" } as any,
      select: {
        id: true,
        fullName: true,
        name: true,
        avatarUrl: true,
        region: true,
        district: true,
        operationArea: true,
        vehicleType: true,
        vehicleMake: true,
        vehiclePlate: true,
        plateNumber: true,
        isVipDriver: true,
        kycStatus: true,
        suspendedAt: true,
        isDisabled: true
      } as any
    });

    if (!driver) return res.status(404).json({ ok: false, error: "Driver not found." });

    const documents = await (prisma as any).userDocument?.findMany?.({
      where: { userId },
      orderBy: { id: "desc" },
      select: { type: true, url: true, status: true, metadata: true, createdAt: true }
    });
    const licenseDoc = Array.isArray(documents)
      ? documents.find((doc: any) => LICENSE_TYPES.has(String(doc?.type ?? "").toUpperCase()) && doc?.url)
      : null;
    const licenseExpiry = getExpiry(licenseDoc?.metadata);
    const now = Date.now();
    const active =
      !(driver as any).suspendedAt &&
      !(driver as any).isDisabled &&
      (driver as any).kycStatus !== "REJECTED_KYC" &&
      Boolean(licenseExpiry && licenseExpiry.getTime() >= now);

    res.json({
      ok: true,
      driver: {
        id: publicId,
        name: (driver as any).fullName || (driver as any).name || "NoLSAF driver",
        avatarUrl: (driver as any).avatarUrl || null,
        certification: (driver as any).isVipDriver ? "Premium Driver" : "Certified Driver",
        status: active ? "ACTIVE" : "NOT_ACTIVE",
        vehiclePlate: (driver as any).plateNumber || (driver as any).vehiclePlate || null,
        vehicleType: (driver as any).vehicleType || null,
        vehicleMake: (driver as any).vehicleMake || null,
        operatingArea: (driver as any).operationArea || (driver as any).region || (driver as any).district || "Tanzania",
        validUntil: licenseExpiry ? licenseExpiry.toISOString() : null,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error("[public driver verification] failed", err);
    res.status(500).json({ ok: false, error: "Could not verify this driver." });
  }
});

export default router;
