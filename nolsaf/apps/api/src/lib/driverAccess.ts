import { prisma } from "@nolsaf/prisma";

export type ProtectedDriverState = {
  id: number;
  role: string | null;
  suspendedAt?: Date | string | null;
  isDisabled?: boolean | null;
  kycStatus?: string | null;
  available?: boolean | null;
  isAvailable?: boolean | null;
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

  return null;
}

export async function getProtectedDriverState(userId: number): Promise<ProtectedDriverState | null> {
  try {
    const user = await prisma.user.findUnique({
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
    });

    return (user as ProtectedDriverState | null) ?? null;
  } catch {
    return null;
  }
}