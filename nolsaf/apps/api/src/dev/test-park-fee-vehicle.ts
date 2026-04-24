#!/usr/bin/env tsx
/**
 * Test park fee calculation WITH and WITHOUT vehicle fees
 */

import 'dotenv/config';
import { prisma } from '@nolsaf/prisma';

async function testVehicleFees() {
  console.log('\n🚗 Testing Park Fee Calculation — Vehicle Fee Logic\n');
  console.log('═'.repeat(100));

  const park = await (prisma as any).parkFee.findFirst({
    where: { parkCode: 'SERENGETI', isActive: true },
  });

  if (!park) {
    console.error('❌ Serengeti not found');
    return;
  }

  const adults = 2;
  const days = 3;
  const nationality = 'TZ';
  const isResident = true;

  const adultFee = park.adultResidentFee; // $4.50
  const vehicleFeePerDay = park.vehicleFee; // $40

  console.log(`📍 Park: ${park.parkName}`);
  console.log(`👥 Travelers: ${adults} adults`);
  console.log(`📅 Days: ${days}`);
  console.log(`🇹🇿 Nationality: Tanzania (Resident Rate)\n`);
  console.log('═'.repeat(100));

  // WITHOUT vehicle fees (flights, safari operators, etc.)
  const personFeesOnly = adultFee * adults * days;
  console.log('✈️  WITHOUT Vehicle Fees (using flights or safari operators):');
  console.log(`   Person entry fees: ${adults} adults × ${days} days × $${adultFee} = $${personFeesOnly.toFixed(2)}`);
  console.log(`   Vehicle fees: $0 (not applicable)`);
  console.log(`   TOTAL: $${personFeesOnly.toFixed(2)}\n`);

  // WITH vehicle fees (private car/self-drive)
  const vehicleFees = vehicleFeePerDay * days;
  const totalWithVehicle = personFeesOnly + vehicleFees;
  console.log('🚙 WITH Vehicle Fees (private car/self-drive):');
  console.log(`   Person entry fees: ${adults} adults × ${days} days × $${adultFee} = $${personFeesOnly.toFixed(2)}`);
  console.log(`   Vehicle fees: ${days} days × $${vehicleFeePerDay} = $${vehicleFees.toFixed(2)}`);
  console.log(`   TOTAL: $${totalWithVehicle.toFixed(2)}\n`);

  console.log('═'.repeat(100));
  console.log('\n📝 Expected behavior:');
  console.log('   • Default (flights/safari): $27.00 — person entry only');
  console.log('   • Private car: $147.00 — person entry + vehicle fees');
  console.log('   • Vehicle fees ONLY apply when transport preference = "private-car"\n');

  await prisma.$disconnect();
}

testVehicleFees().catch((e) => {
  console.error(e);
  process.exit(1);
});
