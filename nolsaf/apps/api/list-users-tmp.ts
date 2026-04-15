import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { prisma } from '@nolsaf/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, phone: true, role: true },
    orderBy: { id: 'asc' }
  });
  users.forEach(u =>
    console.log(u.id + ' | ' + u.role.padEnd(8) + ' | ' + u.email + ' | ' + (u.phone ?? '-') + ' | ' + (u.name ?? '-'))
  );
  process.exit(0);
}
main();
