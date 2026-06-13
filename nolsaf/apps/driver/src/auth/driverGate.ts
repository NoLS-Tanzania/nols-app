import { AuthUser } from "./types";

export type DriverGateState =
  | "pending_kyc"
  | "action_required"
  | "rejected"
  | "suspended"
  | "incomplete_onboarding"
  | "ok";

const REQUIRED_DRIVER_DOCUMENT_GROUPS = [
  ["DRIVER_LICENSE", "DRIVING_LICENSE", "DRIVER_LICENCE", "DRIVING_LICENCE", "LICENSE"],
  ["NATIONAL_ID", "ID", "PASSPORT"],
  ["VEHICLE_REGISTRATION", "LATRA", "VEHICLE_REG"],
  ["INSURANCE"]
];

function isDriverOnboardingComplete(account: AuthUser): boolean {
  const requiredTextFields = [
    account.name,
    account.email,
    account.phone,
    account.gender,
    account.nationality,
    account.nin,
    account.region,
    account.district,
    account.operationArea,
    account.vehicleType,
    account.plateNumber,
    account.licenseNumber,
    account.paymentPhone
  ];
  if (requiredTextFields.some((value) => !String(value ?? "").trim())) return false;
  if (!account.paymentVerified) return false;

  const docs = Array.isArray(account.documents) ? account.documents : [];
  const docTypes = new Set(
    docs.filter((doc) => doc?.url).map((doc) => String(doc?.type ?? "").toUpperCase())
  );

  return REQUIRED_DRIVER_DOCUMENT_GROUPS.every((group) => group.some((type) => docTypes.has(type)));
}

/** Mirrors the gate logic in apps/web/app/(driver)/driver/layout.tsx. */
export function getDriverGateState(user: AuthUser): DriverGateState {
  if (user.kycStatus === "PENDING_KYC") {
    return user.kycNote ? "action_required" : "pending_kyc";
  }

  if (user.kycStatus == null && !isDriverOnboardingComplete(user)) {
    return "incomplete_onboarding";
  }

  if (user.suspendedAt || user.isDisabled) {
    return "suspended";
  }

  if (user.kycStatus === "REJECTED_KYC") {
    return "rejected";
  }

  return "ok";
}
