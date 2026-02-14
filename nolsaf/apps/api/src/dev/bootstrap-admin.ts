import "dotenv/config";
import { prisma } from "@nolsaf/prisma";
import { hashPassword } from "../lib/crypto.js";

function requiredEnv(name: string): string {
  const v = String(process.env[name] ?? "").trim();
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function main() {
  // Safety: require an explicit confirmation so this can't be run accidentally.
  const confirm = String(process.env.BOOTSTRAP_ADMIN_CONFIRM ?? "").trim().toUpperCase();
  if (confirm !== "YES") {
    throw new Error(
      "Refusing to run. Set BOOTSTRAP_ADMIN_CONFIRM=YES to confirm you want to create/promote an admin account."
    );
  }

  const email = requiredEnv("BOOTSTRAP_ADMIN_EMAIL").toLowerCase();
  const password = requiredEnv("BOOTSTRAP_ADMIN_PASSWORD");
  const name = String(process.env.BOOTSTRAP_ADMIN_NAME ?? "").trim() || null;
  const phone = String(process.env.BOOTSTRAP_ADMIN_PHONE ?? "").trim() || null;

  // Default: do NOT take over an existing non-admin account unless explicitly allowed.
  const allowPromoteExisting = String(process.env.BOOTSTRAP_ADMIN_PROMOTE_EXISTING ?? "")
    .trim()
    .toUpperCase() === "YES";

  // If an admin already exists, refuse by default (prevents accidental second bootstrap on prod).
  const existingAdminCount = await prisma.user.count({ where: { role: "ADMIN" as any } });
  if (existingAdminCount > 0) {
    const allowWhenAdminExists = String(process.env.BOOTSTRAP_ADMIN_ALLOW_WHEN_ADMIN_EXISTS ?? "")
      .trim()
      .toUpperCase() === "YES";
    if (!allowWhenAdminExists) {
      throw new Error(
        `Refusing to run: database already has ${existingAdminCount} ADMIN user(s). ` +
          "If you really intend to add another admin via this bootstrap script, set BOOTSTRAP_ADMIN_ALLOW_WHEN_ADMIN_EXISTS=YES."
      );
    }
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, email: true },
  });

  const passwordHash = await hashPassword(password);
  const now = new Date();

  if (existing) {
    const currentRole = String(existing.role ?? "").toUpperCase();
    if (currentRole === "ADMIN") {
      console.log(`✅ Admin already exists: userId=${existing.id} email=${email}`);
      return;
    }

    if (!allowPromoteExisting) {
      throw new Error(
        `User already exists (userId=${existing.id}, role=${currentRole}). ` +
          "Refusing to promote automatically. Set BOOTSTRAP_ADMIN_PROMOTE_EXISTING=YES if you want to promote this existing user to ADMIN."
      );
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "ADMIN" as any,
        passwordHash: passwordHash as any,
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        emailVerifiedAt: now as any,
        phoneVerifiedAt: phone ? (now as any) : (undefined as any),
      } as any,
    });

    console.log(`✅ Promoted existing user to ADMIN: userId=${existing.id} email=${email}`);
    return;
  }

  const created = await prisma.user.create({
    data: {
      email,
      name,
      phone,
      role: "ADMIN" as any,
      passwordHash: passwordHash as any,
      emailVerifiedAt: now as any,
      phoneVerifiedAt: phone ? (now as any) : (undefined as any),
    } as any,
    select: { id: true, email: true, role: true },
  });

  console.log(`✅ Created ADMIN: userId=${created.id} email=${created.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ bootstrap-admin failed:", err?.message || err);
    process.exit(1);
  });
