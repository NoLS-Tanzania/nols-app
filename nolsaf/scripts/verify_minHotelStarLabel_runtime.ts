import 'dotenv/config';
import { prisma } from '@nolsaf/prisma';

async function main() {
  const latest = await (prisma as any).groupBooking.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true, accommodationType: true, minHotelStarLabel: true, userId: true },
  });

  console.log('Latest groupBooking (via Prisma model):', latest);

  try {
    const raw1 = await (prisma as any).$queryRawUnsafe(
      'SELECT id, accommodationType, minHotelStarLabel, userId FROM `GroupBooking` ORDER BY id DESC LIMIT 1',
    );
    console.log('Latest row from `GroupBooking` table:', raw1);
  } catch (e: any) {
    console.log('Raw query against `GroupBooking` failed:', String(e?.message || e));
  }

  try {
    const raw2 = await (prisma as any).$queryRawUnsafe(
      'SELECT id, accommodationType, minHotelStarLabel, userId FROM `groupbooking` ORDER BY id DESC LIMIT 1',
    );
    console.log('Latest row from `groupbooking` table:', raw2);
  } catch (e: any) {
    console.log('Raw query against `groupbooking` failed:', String(e?.message || e));
  }
}

main()
  .catch((e) => {
    console.error('verify_minHotelStarLabel_runtime failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await (prisma as any).$disconnect();
    } catch {
      // ignore
    }
  });
