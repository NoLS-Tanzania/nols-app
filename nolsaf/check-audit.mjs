// check-audit.mjs — run with: npx tsx --tsconfig tsconfig.json check-audit.mjs
import { prisma } from './apps/api/src/lib/prisma.ts';

try {
  const rows = await prisma.auditLog.findMany({
    where: { entity: 'settings:system' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, action: true, entity: true, createdAt: true, actorId: true, afterJson: true },
  });
  console.log('Rows found:', rows.length);
  console.log(JSON.stringify(rows, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
} catch (e) {
  console.error('Error:', e.message);
} finally {
  await prisma.$disconnect();
}
