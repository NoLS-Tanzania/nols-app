import { config } from "dotenv";
import { resolve } from "path";
import * as readline from "readline";

// Load base .env first, then optionally .env.production to override DATABASE_URL / RESEND_API_KEY.
// Usage:  npm run bootstrap:admin              → uses local .env (local DB)
//         npm run bootstrap:admin -- --production → also loads .env.production (prod DB + keys)
const envPath = resolve(__dirname, "../../.env");
config({ path: envPath, override: true });

const isProd = process.argv.includes("--production");
if (isProd) {
  const prodEnvPath = resolve(__dirname, "../../.env.production");
  config({ path: prodEnvPath, override: true });
  console.log("[bootstrap] Mode: PRODUCTION (loaded .env.production)");
} else {
  console.log("[bootstrap] Mode: local dev  (tip: use --production flag to target prod DB)");
}

import { prisma } from "@nolsaf/prisma";
import { hashPassword } from "../lib/crypto.js";
import { sendSms } from "../lib/sms.js";
import { sendMail } from "../lib/mailer.js";
import { getAdminWelcomeEmail, getAdminWelcomeSms } from "../lib/adminEmailTemplates.js";

// ─── Prompt helpers ──────────────────────────────────────────────────────────

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, resolve));
}

function askPassword(prompt: string): Promise<string> {
  return new Promise(resolve => {
    process.stdout.write(prompt);
    let password = "";
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    const onData = (char: string) => {
      if (char === "\r" || char === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.removeAllListeners("data");
        process.stdout.write("\n");
        resolve(password);
      } else if (char === "\x03") {
        console.log("\nAborted.");
        process.exit(0);
      } else if (char === "\x7F") {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(prompt + "*".repeat(password.length));
        }
      } else {
        password += char;
        process.stdout.write("*");
      }
    };
    process.stdin.on("data", onData);
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────

async function sendAdminNotifications(
  user: { id: number; email: string; name: string | null; phone: string | null },
  isNewlyCreated: boolean
) {
  const adminName = user.name || "Admin";
  if (user.phone) {
    try {
      await sendSms(user.phone, getAdminWelcomeSms({ name: adminName, isNewlyCreated }));
      console.log(`📱 SMS sent to ${user.phone}`);
    } catch (err) {
      console.warn(`⚠️  SMS failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  try {
    const { subject, html } = getAdminWelcomeEmail({ name: adminName, email: user.email, isNewlyCreated });
    await sendMail(user.email, subject, html);
    console.log(`📧 Email sent to ${user.email}`);
  } catch (err) {
    console.warn(`⚠️  Email failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║     NoLSAF  Bootstrap Admin Setup        ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // Guard: block if admin already exists (env flag can override)
  const existingAdminCount = await prisma.user.count({ where: { role: "ADMIN" as any } });
  if (existingAdminCount > 0) {
    const allowWhenExists = String(process.env.BOOTSTRAP_ADMIN_ALLOW_WHEN_ADMIN_EXISTS ?? "")
      .trim().toUpperCase() === "YES";
    if (!allowWhenExists) {
      throw new Error(
        `\n❌ BLOCKED: Database already has ${existingAdminCount} ADMIN user(s).\n` +
        `   Set BOOTSTRAP_ADMIN_ALLOW_WHEN_ADMIN_EXISTS=YES in .env to allow adding another.`
      );
    }
    console.log(`⚠️  Warning: ${existingAdminCount} ADMIN user(s) already exist in the DB.\n`);
  }

  // ── Collect inputs interactively ─────────────────────────────────────────
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const emailRaw = (await ask(rl, "📧 Admin email address        : ")).trim().toLowerCase();
  if (!emailRaw || !emailRaw.includes("@")) {
    rl.close();
    throw new Error("❌ Invalid email address.");
  }

  rl.close(); // must close before raw-mode password prompt

  const password = await askPassword("🔑 Password (hidden input)    : ");
  if (password.length < 8) {
    throw new Error("❌ Password must be at least 8 characters.");
  }

  const rl2 = readline.createInterface({ input: process.stdin, output: process.stdout });
  const nameRaw  = (await ask(rl2, "👤 Full name   (Enter to skip): ")).trim() || null;
  const phoneRaw = (await ask(rl2, "📱 Phone +255…  (Enter to skip): ")).trim() || null;
  rl2.close();

  const email = emailRaw;
  const name  = nameRaw;
  const phone = phoneRaw;

  // ── Review summary ───────────────────────────────────────────────────────
  console.log("\n──────────────────────────────────────────────");
  console.log("  Review before proceeding:");
  console.log(`  Email : ${email}`);
  console.log(`  Name  : ${name  ?? "(not set)"}`);
  console.log(`  Phone : ${phone ?? "(not set)"}`);
  console.log("──────────────────────────────────────────────");

  const rl3 = readline.createInterface({ input: process.stdin, output: process.stdout });
  const confirm = (await ask(rl3, "\n  Type YES to confirm: ")).trim().replace(/[^A-Za-z]/g, "").toUpperCase();
  rl3.close();

  if (confirm !== "YES") {
    console.log("Aborted — nothing was changed.");
    return;
  }

  // ── Duplicate detection ──────────────────────────────────────────────────
  const byEmail = await (prisma.user as any).findUnique({
    where: { email },
    select: { id: true, role: true, email: true, phone: true, name: true },
  });

  const byPhone = phone
    ? await (prisma.user as any).findUnique({
        where: { phone },
        select: { id: true, role: true, email: true, phone: true, name: true },
      })
    : null;

  if (byPhone && byEmail && byPhone.id !== byEmail.id) {
    throw new Error(
      `\n❌ CONFLICT: Email "${email}" is userId=${byEmail.id} but phone "${phone}" belongs to userId=${byPhone.id} — different accounts.\n` +
      `   Use a different phone number or leave phone blank.`
    );
  }

  if (byPhone && !byEmail) {
    throw new Error(
      `\n❌ PHONE ALREADY REGISTERED:\n` +
      `   Phone "${phone}" belongs to userId=${byPhone.id} (${byPhone.role}, email=${byPhone.email ?? "none"}).\n` +
      `   Use a different phone number or leave phone blank.`
    );
  }

  const existing = byEmail;
  const passwordHash = await hashPassword(password);
  const now = new Date();

  // ── Promote existing user ────────────────────────────────────────────────
  if (existing) {
    const currentRole = String(existing.role ?? "").toUpperCase();

    if (currentRole === "ADMIN") {
      console.log(`\nℹ️  No changes — userId=${existing.id} (${email}) is already an ADMIN.`);
      return;
    }

    const allowPromote = String(process.env.BOOTSTRAP_ADMIN_PROMOTE_EXISTING ?? "")
      .trim().toUpperCase() === "YES";

    if (!allowPromote) {
      throw new Error(
        `\n❌ EMAIL ALREADY REGISTERED as userId=${existing.id} (role=${currentRole}).\n` +
        `   To promote this existing user to ADMIN, set BOOTSTRAP_ADMIN_PROMOTE_EXISTING=YES in .env`
      );
    }

    console.log(`\n⚠️  Existing account userId=${existing.id} | role=${currentRole} — promoting to ADMIN...`);

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

    console.log(`✅ Promoted userId=${existing.id} to ADMIN.`);
    await sendAdminNotifications({ id: existing.id, email, name, phone }, false);
    return;
  }

  // ── Create new admin ─────────────────────────────────────────────────────
  console.log(`\n  Creating new ADMIN account...`);

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
  .catch(err => {
    console.error("\n❌ bootstrap-admin failed:", err?.message || err);
    process.exit(1);
  });
