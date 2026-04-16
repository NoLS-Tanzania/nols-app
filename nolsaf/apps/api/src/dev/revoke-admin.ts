import { config } from "dotenv";
import { resolve } from "path";
import * as readline from "readline";

const envPath = resolve(__dirname, "../../.env");
config({ path: envPath, override: true });

const isProd = process.argv.includes("--production");
if (isProd) {
  config({ path: resolve(__dirname, "../../.env.production"), override: true });
  console.log("[revoke-admin] Mode: PRODUCTION");
} else {
  console.log("[revoke-admin] Mode: local dev");
}

import { prisma } from "@nolsaf/prisma";
import { sendSms } from "../lib/sms.js";
import { sendMail } from "../lib/mailer.js";
import { getAdminRevocationEmail, getAdminRevocationSms } from "../lib/adminEmailTemplates.js";

function ask(rl: readline.Interface, q: string): Promise<string> {
  return new Promise(r => rl.question(q, r));
}

(async () => {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║     NoLSAF  Revoke Admin Access          ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // List current admins
  const admins = await (prisma.user as any).findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true, name: true, phone: true },
    orderBy: { id: "asc" },
  });

  if (admins.length === 0) {
    console.log("No ADMIN users found.");
    await prisma.$disconnect();
    return;
  }

  console.log("Current ADMIN users:");
  console.table(admins);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const emailRaw = (await ask(rl, "\n📧 Email of admin to revoke: ")).trim().toLowerCase();
  const target = admins.find((a: any) => a.email === emailRaw);

  if (!target) {
    rl.close();
    console.log(`❌ No ADMIN found with email "${emailRaw}".`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\n  Found: userId=${target.id} | ${target.email} | ${target.name ?? "(no name)"}`);
  const confirm = (await ask(rl, "  Type YES to demote this user to CUSTOMER: "))
    .trim().replace(/[^A-Za-z]/g, "").toUpperCase();
  rl.close();

  if (confirm !== "YES") {
    console.log("Aborted — nothing changed.");
    await prisma.$disconnect();
    return;
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { role: "CUSTOMER" as any },
  });

  // Immediately revoke ALL active sessions — forces JWT re-check to fail server-side
  const revokedSessions = await (prisma.session as any).updateMany({
    where: { userId: target.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // Generate reference code — e.g. REV-20260416-A3F7X2
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randPart = Math.random().toString(36).toUpperCase().slice(2, 8);
  const referenceCode = `REV-${datePart}-${randPart}`;

  console.log(`\n✅ userId=${target.id} (${target.email}) demoted to CUSTOMER.`);
  console.log(`🔒 Sessions revoked: ${revokedSessions.count} active session(s) terminated.`);
  console.log(`📋 Reference code: ${referenceCode}`);

  // Send notifications
  const adminName = target.name || "User";

  if (target.phone) {
    try {
      await sendSms(target.phone, getAdminRevocationSms({ name: adminName, referenceCode }));
      console.log(`📱 SMS sent to ${target.phone}`);
    } catch (err) {
      console.warn(`⚠️  SMS failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (target.email) {
    try {
      const { subject, html } = getAdminRevocationEmail({ name: adminName, email: target.email, referenceCode });
      await sendMail(target.email, subject, html);
      console.log(`📧 Email sent to ${target.email}`);
    } catch (err) {
      console.warn(`⚠️  Email failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await prisma.$disconnect();
})().catch(err => {
  console.error("❌ revoke-admin failed:", err?.message || err);
  process.exit(1);
});
