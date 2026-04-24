#!/usr/bin/env tsx
/**
 * Show park fees classification by nationality
 */

import 'dotenv/config';
import { prisma } from '@nolsaf/prisma';

async function main() {
  console.log('\n🌳 Park Entry Fees — Classification by Nationality\n');
  console.log('═'.repeat(110));
  
  const header = `${'PARK NAME'.padEnd(35)} ${'FOREIGNER'.padEnd(15)} ${'EAC/TANZANIAN'.padEnd(15)} ${'CHILD (For.)'.padEnd(15)} ${'CHILD (EAC/TZ)'.padEnd(15)}`;
  console.log(header);
  console.log('═'.repeat(110));

  const parkFees = await (prisma as any).parkFee.findMany({
    where: { isActive: true },
    orderBy: { adultForeignerFee: 'desc' },
  });

  for (const park of parkFees) {
    const name = park.parkName.substring(0, 34).padEnd(35);
    const foreignerAdult = `US$ ${park.adultForeignerFee.toFixed(2)}`.padEnd(15);
    const residentAdult = `US$ ${park.adultResidentFee.toFixed(2)}`.padEnd(15);
    const foreignerChild = (park.childForeignerFee ? `US$ ${park.childForeignerFee.toFixed(2)}` : 'N/A').padEnd(15);
    const residentChild = (park.childResidentFee ? `US$ ${park.childResidentFee.toFixed(2)}` : 'N/A').padEnd(15);

    console.log(`${name} ${foreignerAdult} ${residentAdult} ${foreignerChild} ${residentChild}`);
  }

  console.log('═'.repeat(110));
  console.log('\n📝 Note:');
  console.log('  • EAC Citizens: Kenya (KE), Uganda (UG), Rwanda (RW), Burundi (BI), Tanzania (TZ)');
  console.log('  • EAC/TZ rates shown in USD equivalent of Tanzanian Shillings (Tsh 10,000 ≈ US$ 4.50)');
  console.log('  • Children: Ages 5-15 years. Under 5 years: FREE for all nationalities');
  console.log('  • Expatriates pay same rate as foreigners: US$ 83 for premium parks\n');

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
