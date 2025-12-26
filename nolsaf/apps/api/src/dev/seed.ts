import 'dotenv/config';
import { prisma } from '@nolsaf/prisma';
import { hashPassword } from '../lib/crypto.js';

async function main() {
  console.log('Seeding default test accounts...');

  // Default test accounts for all roles - idempotent via upsert
  const testAccounts = [
    {
      email: 'user@nolsaf.com',
      name: 'Test Customer',
      phone: '+255700000001',
      password: 'password123',
      role: 'CUSTOMER' as const,
    },
    {
      email: 'admin@nolsaf.com',
      name: 'Test Admin',
      phone: '+255700000002',
      password: 'password123',
      role: 'ADMIN' as const,
    },
    {
      email: 'driver@nolsaf.com',
      name: 'Test Driver',
      phone: '+255700000003',
      password: 'password123',
      role: 'DRIVER' as const,
    },
    {
      email: 'owner@nolsaf.com',
      name: 'Test Owner',
      phone: '+255700000004',
      password: 'password123',
      role: 'OWNER' as const,
    },
  ];

  for (const account of testAccounts) {
    try {
      const passwordHash = await hashPassword(account.password);
      await prisma.user.upsert({
        where: { email: account.email },
        // cast to any to keep this seed script usable across slightly different local schemas
        update: {
          name: account.name,
          phone: account.phone,
          role: account.role,
          passwordHash,
        } as any,
        create: {
          email: account.email,
          name: account.name,
          phone: account.phone,
          role: account.role,
          passwordHash,
        } as any,
      });
      console.log(`✅ Upserted ${account.role.toLowerCase()}: ${account.email} (password: ${account.password})`);
    } catch (err) {
      console.warn(`⚠️  Failed to upsert ${account.role.toLowerCase()} ${account.email}:`, (err as any).message || err);
      // Continue — seed may be run later after DB migration if role enum is missing
    }
  }

  console.log('\n📋 Default Test Accounts Created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('│ Email              │ Role    │ Password     │ Access                          │');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('│ user@nolsaf.com   │ CUSTOMER│ password123  │ Customer dashboard             │');
  console.log('│ admin@nolsaf.com  │ ADMIN   │ password123  │ Admin dashboard                │');
  console.log('│ driver@nolsaf.com  │ DRIVER  │ password123  │ Driver dashboard               │');
  console.log('│ owner@nolsaf.com  │ OWNER   │ password123  │ Owner dashboard                │');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ Seeding complete! You can now log in with any of these accounts.\n');
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
