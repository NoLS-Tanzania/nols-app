export type UserRole = "CUSTOMER" | "USER" | "TRAVELLER" | "OWNER" | "DRIVER" | "AGENT" | "ADMIN" | string;

export type KycStatus = "PENDING_KYC" | "APPROVED_KYC" | "REJECTED_KYC" | null;

export type DriverDocument = {
  id?: number | string;
  type?: string | null;
  url?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type AuthUser = {
  id: number;
  role: UserRole;
  email?: string | null;
  name?: string | null;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  gender?: string | null;
  nationality?: string | null;
  createdAt?: string | null;

  // Driver KYC / account status gate fields
  kycStatus?: KycStatus;
  kycNote?: string | null;
  suspendedAt?: string | null;
  isDisabled?: boolean | null;

  // Driver onboarding completeness fields
  nin?: string | null;
  region?: string | null;
  district?: string | null;
  operationArea?: string | null;
  vehicleType?: string | null;
  plateNumber?: string | null;
  licenseNumber?: string | null;
  paymentPhone?: string | null;
  paymentVerified?: boolean | null;
  documents?: DriverDocument[] | null;
};

export type LoginResponse = {
  ok: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
  message?: string;
};

export type AuthState = {
  status: "loading" | "guest" | "authenticated";
  token: string | null;
  user: AuthUser | null;
  error: string | null;
};
