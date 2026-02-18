import { prisma } from "@nolsaf/prisma";
import { generateTransportTripCode } from "../src/lib/tripCode.js";

async function main() {
  const batchSize = Number(process.env.BATCH_SIZE ?? 200);
  const max = Number(process.env.MAX_UPDATES ?? 50_000);

  let updated = 0;
  for (;;) {
    const rows = await (prisma as any).transportBooking.findMany({
      where: {
        OR: [{ tripCode: null }, { tripCodeHash: null }],
      },
      select: { id: true },
      orderBy: { id: "asc" },
      take: batchSize,
    });

    if (!rows?.length) break;

    for (const row of rows) {
      if (updated >= max) break;

      let done = false;
      for (let attempt = 0; attempt < 5; attempt++) {
        const { tripCode, tripCodeHash } = generateTransportTripCode();
        try {
          await (prisma as any).transportBooking.update({
            where: { id: row.id },
            data: { tripCode, tripCodeHash },
          });
          updated++;
          done = true;
          break;
        } catch (e: any) {
          const isUnique = e?.code === "P2002" || String(e?.message ?? "").includes("Unique constraint");
          if (isUnique && attempt < 4) continue;
          throw e;
        }
      }

      if (!done) {
        throw new Error(`Failed to backfill trip code for transportBooking:${row.id}`);
      }
    }

    if (updated >= max) break;
  }

  console.log(JSON.stringify({ ok: true, updated }));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
