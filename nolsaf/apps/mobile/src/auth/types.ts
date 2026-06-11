export type UserRole = "CUSTOMER" | "USER" | "TRAVELLER" | "OWNER" | "DRIVER" | "AGENT" | "ADMIN" | string;

export type AuthUser = {
  id: number;
  role: UserRole;
  email?: string | null;
  name?: string | null;
  fullName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  address?: string | null;
  tin?: string | null;
  twoFactorEnabled?: boolean | null;
  emailVerifiedAt?: string | null;
  phoneVerifiedAt?: string | null;
  createdAt?: string | null;
};

export type LoginResponse = {
  ok: boolean;
  token?: string;
  user?: AuthUser;
  error?: string;
  message?: string;
};

export type RegisterCustomerInput = {
  name: string;
  email: string;
  phone?: string;
  password: string;
};

export type UpdateProfileInput = {
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  address?: string;
  tin?: string;
};

export type AuthState = {
  status: "loading" | "guest" | "authenticated";
  token: string | null;
  user: AuthUser | null;
  error: string | null;
};
