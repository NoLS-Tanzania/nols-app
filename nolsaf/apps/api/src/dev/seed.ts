import { prisma } from '@nolsaf/prisma';
import { hashPassword } from '../lib/crypto';

async function main() {
  console.log('Seeding demo data...');

  // Sample driver users — idempotent via upsert
  const drivers = [
    {
      email: 'driver+seed@example.com',
      name: 'Seed Driver',
      phone: '+255700000001',
      password: 'driver1234',
    },
  ];

  for (const d of drivers) {
    try {
      const passwordHash = await hashPassword(d.password);
      await prisma.user.upsert({
        where: { email: d.email },
        // cast to any to keep this seed script usable across slightly different local schemas
        update: {
          name: d.name,
          phone: d.phone,
          role: 'DRIVER',
          passwordHash,
        } as any,
        create: ({
          email: d.email,
          name: d.name,
          phone: d.phone,
          role: 'DRIVER',
          passwordHash,
        } as any),
      });
      console.log(`Upserted driver: ${d.email}`);
    } catch (err) {
      console.warn(`Failed to upsert driver ${d.email}:`, (err as any).message || err);
      // Continue — seed may be run later after DB migration if role enum is missing
    }
  }

  console.log('Seeding demo data complete (types + seed only).');
}

main()
  .then(() => {
    console.log('Seed done');
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
