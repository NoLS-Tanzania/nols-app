#!/usr/bin/env tsx
/**
 * Test park fee calculation for different nationalities
 */

import 'dotenv/config';
import { prisma } from '@nolsaf/prisma';

async function testParkFeeCalc() {
  console.log('\n🧪 Testing Park Fee Calculation Logic\n');
  console.log('═'.repeat(80));

  const parkFees = await (prisma as any).parkFee.findMany({
    where: { isActive: true, parkCode: 'SERENGETI' },
  });

  const park = parkFees[0];
  if (!park) {
    console.error('❌ Serengeti park fee not found in database');
    return;
  }

  console.log(`\n📍 Testing: ${park.parkName}`);
  console.log(`   Database values:`);
  console.log(`   - adultForeignerFee: $${park.adultForeignerFee}`);
  console.log(`   - adultResidentFee:  $${park.adultResidentFee}`);

  const testCases = [
    { nationality: 'TZ', label: 'Tanzania (TZ)', expected: 'resident' },
    { nationality: 'KE', label: 'Kenya (KE)', expected: 'resident' },
    { nationality: 'US', label: 'United States (US)', expected: 'foreigner' },
    { nationality: 'GB', label: 'United Kingdom (GB)', expected: 'foreigner' },
  ];

  console.log('\n═'.repeat(80));
  console.log('NATIONALITY          IS RESIDENT?    RATE APPLIED        COST (2 adults, 3 days)');
  console.log('═'.repeat(80));

  for (const test of testCases) {
    const nationality = test.nationality.toUpperCase();
    const isResident = ['TZ', 'KE', 'UG', 'RW', 'BI'].includes(nationality);
    const adultFee = isResident ? park.adultResidentFee : park.adultForeignerFee;
    const total = adultFee * 2 * 3; // 2 adults, 3 days

    const resident = isResident ? 'YES' : 'NO';
    const rate = isResident ? `US$ ${park.adultResidentFee}` : `US$ ${park.adultForeignerFee}`;
    const status = (isResident && test.expected === 'resident') || (!isResident && test.expected === 'foreigner') ? '✅' : '❌';

    console.log(
      `${status} ${test.label.padEnd(18)} ${resident.padEnd(13)} ${rate.padEnd(18)} US$ ${total.toFixed(2)}`
    );
  }

  console.log('═'.repeat(80));
  console.log('\n📝 Expected Results:');
  console.log('   - TZ, KE should get resident rate ($4.50) → $27.00 total');
  console.log('   - US, GB should get foreigner rate ($83.00) → $498.00 total\n');

  await prisma.$disconnect();
}

testParkFeeCalc().catch((e) => {
  console.error(e);
  process.exit(1);
});
