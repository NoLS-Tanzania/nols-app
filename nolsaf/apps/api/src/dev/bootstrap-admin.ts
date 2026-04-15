import { config } from "dotenv";
import { resolve } from "path";

// Load .env from apps/api/ — works in both CJS (tsc) and tsx
config({ path: resolve(process.cwd(), ".env") });

import { prisma } from "@nolsaf/prisma";
import { hashPassword } from "../lib/crypto.js";
import { sendSms } from "../lib/sms.js";
import { sendMail } from "../lib/mailer.js";
import { getAdminWelcomeEmail, getAdminWelcomeSms } from "../lib/adminEmailTemplates.js";

function requiredEnv(name: string): string {
  const v = String(process.env[name] ?? "").trim();
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function sendAdminNotifications(user: { id: number; email: string; name: string | null; phone: string | null }, isNewlyCreated: boolean) {
  const adminName = user.name || "Admin";

  // Send SMS notification
  if (user.phone) {
    try {
      const smsMessage = getAdminWelcomeSms({ name: adminName, isNewlyCreated });
      await sendSms(user.phone, smsMessage);
      console.log(`📱 SMS sent to ${user.phone}`);
    } catch (err) {
      console.warn(`⚠️  Failed to send SMS: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Send email notification
  try {
    const { subject, html } = getAdminWelcomeEmail({
      name: adminName,
      email: user.email,
      isNewlyCreated,
    });
    await sendMail(user.email, subject, html);
    console.log(`📧 Email sent to ${user.email}`);
  } catch (err) {
    console.warn(`⚠️  Failed to send email: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  // Safety: require an explicit confirmation so this can't be run accidentally.
  // Strip non-alphabetic chars to handle any encoding artefacts (e.g. trailing \r or :)
  const confirm = String(process.env.BOOTSTRAP_ADMIN_CONFIRM ?? "").replace(/[^A-Za-z]/g, "").toUpperCase();
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
        `\n❌ BLOCKED: Database already has ${existingAdminCount} ADMIN user(s).\n` +
        `   This prevents accidental duplicate admins.\n` +
        `   If you truly intend to add another admin, set BOOTSTRAP_ADMIN_ALLOW_WHEN_ADMIN_EXISTS=YES.`
      );
    }
  }

  // --- Duplicate detection (fail-fast, no silent skipping) ---

  // 1. Find any user matching the provided email
  const byEmail = await (prisma.user as any).findUnique({
    where: { email },
    select: { id: true, role: true, email: true, phone: true, name: true },
  });

  // 2. Find any user matching the provided phone (if supplied)
  const byPhone = phone
    ? await (prisma.user as any).findUnique({
        where: { phone },
        select: { id: true, role: true, email: true, phone: true, name: true },
      })
    : null;

  // 3. If phone belongs to a DIFFERENT account than the email match → hard stop
  if (byPhone && byEmail && byPhone.id !== byEmail.id) {
    throw new Error(
      `\n❌ CONFLICT DETECTED — Cannot continue safely:\n` +
      `   Email  "${email}" belongs to userId=${byEmail.id} (${byEmail.role})\n` +
      `   Phone  "${phone}" belongs to userId=${byPhone.id} (${byPhone.role}) — a DIFFERENT account\n\n` +
      `   Fix options:\n` +
      `   A) Use a different phone number that isn't already registered\n` +
      `   B) Leave BOOTSTRAP_ADMIN_PHONE blank to skip phone assignment\n` +
      `   C) Use the email that already owns that phone number`
    );
  }

  // 4. If only a phone match exists (no email match) → that account owns this phone, must use its email
  if (byPhone && !byEmail) {
    throw new Error(
      `\n❌ PHONE ALREADY REGISTERED:\n` +
      `   Phone "${phone}" is already used by userId=${byPhone.id} (role=${byPhone.role}, email=${byPhone.email ?? "none"})\n\n` +
      `   Fix options:\n` +
      `   A) Set BOOTSTRAP_ADMIN_EMAIL=${byPhone.email ?? "<their email>"} to promote that existing account\n` +
      `   B) Use a different phone number\n` +
      `   C) Leave BOOTSTRAP_ADMIN_PHONE blank`
    );
  }

  // --- From here: either byEmail matches (same account as byPhone), or neither exists ---

  const existing = byEmail; // byPhone.id === byEmail.id if both set
  const passwordHash = await hashPassword(password);
  const now = new Date();

  if (existing) {
    const currentRole = String(existing.role ?? "").toUpperCase();

    if (currentRole === "ADMIN") {
      console.log(`\nℹ️  No changes made — userId=${existing.id} (${email}) is already an ADMIN.`);
      return;
    }

    if (!allowPromoteExisting) {
      throw new Error(
        `\n❌ EMAIL ALREADY REGISTERED:\n` +
        `   "${email}" exists as userId=${existing.id} with role=${currentRole}\n\n` +
        `   This account will NOT be touched unless you explicitly allow promotion.\n` +
        `   To promote this existing user to ADMIN, set BOOTSTRAP_ADMIN_PROMOTE_EXISTING=YES`
      );
    }

    console.log(`\n⚠️  Existing account found: userId=${existing.id} | role=${currentRole} | email=${email}`);
    console.log(`   Promoting to ADMIN as requested (BOOTSTRAP_ADMIN_PROMOTE_EXISTING=YES)...`);

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

    console.log(`✅ Promoted userId=${existing.id} to ADMIN successfully.`);
    await sendAdminNotifications(
      { id: existing.id, email, name: name || null, phone: phone || null },
      false
    );
    return;
  }

  // --- No existing user — create fresh admin ---
  console.log(`\n Creating new ADMIN account for ${email}...`);

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
    select: { id: true, email: true, role: true, name: true, phone: true },
  });

  console.log(`✅ Created ADMIN: userId=${created.id} | email=${created.email} | phone=${created.phone ?? "none"}`);
  await sendAdminNotifications(
    { id: created.id, email: created.email, name: created.name || name, phone: created.phone || phone },
    true
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ bootstrap-admin failed:", err?.message || err);
    process.exit(1);
  });
