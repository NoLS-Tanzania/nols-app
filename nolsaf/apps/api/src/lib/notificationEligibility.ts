import { prisma } from "@nolsaf/prisma";

type LookupInput = {
  email?: string | null;
  phone?: string | null;
};

type NotificationEligibility = {
  allowed: boolean;
  matchedUserId?: number;
  reason?: string;
};

function normalizeEmail(email?: string | null): string | null {
  const value = String(email ?? "").trim().toLowerCase();
  return value || null;
}

function buildPhoneVariants(phone?: string | null): string[] {
  const raw = String(phone ?? "").trim();
  if (!raw) return [];

  const digits = raw.replace(/\D/g, "");
  const variants = new Set<string>();

  variants.add(raw);
  if (digits) {
    variants.add(digits);
    variants.add(`+${digits}`);
    if (digits.startsWith("255")) {
      variants.add(`+${digits}`);
      variants.add(`0${digits.slice(3)}`);
    }
    if (digits.startsWith("0")) {
      variants.add(`+255${digits.slice(1)}`);
      variants.add(`255${digits.slice(1)}`);
    }
  }

  return Array.from(variants).filter(Boolean);
}

export async function canReceiveNotifications(input: LookupInput): Promise<NotificationEligibility> {
  const email = normalizeEmail(input.email);
  const phoneVariants = buildPhoneVariants(input.phone);

  if (!email && phoneVariants.length === 0) {
    return { allowed: true };
  }

  const orWhere: Array<Record<string, unknown>> = [];
  if (email) {
    orWhere.push({ email });
  }
  for (const phone of phoneVariants) {
    orWhere.push({ phone });
  }

  if (orWhere.length === 0) {
    return { allowed: true };
  }

  const matchedUser = await prisma.user.findFirst({
    where: { OR: orWhere } as any,
    select: {
      id: true,
      suspendedAt: true,
      isDisabled: true,
    } as any,
  });

  if (!matchedUser) {
    return { allowed: true };
  }

  if ((matchedUser as any).suspendedAt) {
    return {
      allowed: false,
      matchedUserId: matchedUser.id,
      reason: "user_suspended",
    };
  }

  if ((matchedUser as any).isDisabled === true) {
    return {
      allowed: false,
      matchedUserId: matchedUser.id,
      reason: "user_disabled",
    };
  }

  return { allowed: true, matchedUserId: matchedUser.id };
}