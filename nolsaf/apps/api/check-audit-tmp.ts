import { prisma } from "@nolsaf/prisma";

async function main() {
  const rows = await prisma.auditLog.findMany({
    where: { entity: "settings:system" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, action: true, entity: true, createdAt: true, actorId: true, afterJson: true },
  });
  console.log("settings:system rows found:", rows.length);
  if (rows.length > 0) {
    console.log(JSON.stringify(rows, (_, v) => typeof v === "bigint" ? v.toString() : v, 2));
  } else {
    console.log("Still 0 — API server may need restart for new audit code to take effect.");
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e.message); process.exit(1); });

main().catch((e) => { console.error(e.message); process.exit(1); });
