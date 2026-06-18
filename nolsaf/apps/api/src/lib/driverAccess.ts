import { prisma } from "@nolsaf/prisma";

export type ProtectedDriverState = {
  id: number;
  role: string | null;
  suspendedAt?: Date | string | null;
  isDisabled?: boolean | null;
  kycStatus?: string | null;
  available?: boolean | null;
  isAvailable?: boolean | null;
  licenseExpiresAt?: Date | string | null;
};

export function normalizeDriverKycStatus(value: unknown): string | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized || null;
}

export function isDriverApprovedForProtectedAccess(driver: ProtectedDriverState | null | undefined): boolean {
  if (!driver) return false;
  if (String(driver.role ?? "").toUpperCase() !== "DRIVER") return false;
  if (Boolean(driver.isDisabled) || Boolean(driver.suspendedAt)) return false;

  const kycStatus = normalizeDriverKycStatus(driver.kycStatus);
  return kycStatus === null || kycStatus === "APPROVED_KYC";
}

export function getProtectedDriverAccessDenial(driver: ProtectedDriverState | null | undefined): {
  status: number;
  code: string;
  message: string;
} | null {
  if (!driver || String(driver.role ?? "").toUpperCase() !== "DRIVER") {
    return {
      status: 403,
      code: "DRIVER_ACCESS_REQUIRED",
      message: "Driver access required.",
    };
  }

  if (Boolean(driver.isDisabled) || Boolean(driver.suspendedAt)) {
    return {
      status: 403,
      code: "ACCOUNT_SUSPENDED",
      message: "This driver account cannot use protected driver features right now.",
    };
  }

  const kycStatus = normalizeDriverKycStatus(driver.kycStatus);
  if (kycStatus === "PENDING_KYC") {
    return {
      status: 403,
      code: "DRIVER_KYC_PENDING",
      message: "Driver approval is still pending. Protected driver features are unavailable until approval.",
    };
  }

  if (kycStatus === "REJECTED_KYC") {
    return {
      status: 403,
      code: "DRIVER_KYC_REJECTED",
      message: "This driver application was not approved. Protected driver features are unavailable.",
    };
  }

  if (!driver.licenseExpiresAt) {
    return {
      status: 403,
      code: "DRIVER_LICENSE_EXPIRY_REQUIRED",
      message: "Driving license expiry date is required before protected driver features can be used.",
    };
  }

  const licenseExpiry = new Date(driver.licenseExpiresAt);
  if (Number.isNaN(licenseExpiry.getTime()) || licenseExpiry.getTime() < Date.now()) {
    return {
      status: 403,
      code: "DRIVER_LICENSE_EXPIRED",
      message: "Driving license has expired. Upload a renewed license before using protected driver features.",
    };
  }

  return null;
}

function readDocumentExpiry(metadata: any): Date | null {
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

export async function getProtectedDriverState(userId: number): Promise<ProtectedDriverState | null> {
  try {
    const [user, docs] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          suspendedAt: true,
          isDisabled: true,
          kycStatus: true,
          available: true,
          isAvailable: true,
        } as any,
      }),
      (prisma as any).userDocument?.findMany?.({
        where: { userId },
        orderBy: { id: "desc" },
        select: { type: true, url: true, metadata: true }
      }).catch(() => [])
    ]);

    if (user && Array.isArray(docs)) {
      const licenseDoc = docs.find((doc: any) => {
        const type = String(doc?.type ?? "").toUpperCase();
        return ["DRIVER_LICENSE", "DRIVING_LICENSE", "DRIVER_LICENCE", "DRIVING_LICENCE", "LICENSE"].includes(type) && doc?.url;
      });
      (user as any).licenseExpiresAt = readDocumentExpiry(licenseDoc?.metadata);
    }

    return (user as ProtectedDriverState | null) ?? null;
  } catch {
    return null;
  }
}
