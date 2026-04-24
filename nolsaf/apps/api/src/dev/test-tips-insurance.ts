#!/usr/bin/env tsx
/**
 * Test tips & gratuities and travel insurance calculations
 */

import 'dotenv/config';

async function testTipsAndInsurance() {
  console.log('\n💰 Testing Tips & Travel Insurance Calculations\n');
  console.log('═'.repeat(90));

  // Sample trip: 2 adults, 3 days in Serengeti (safari park)
  const adults = 2;
  const safariDays = 3;
  const totalDays = 3;
  const activityCount = 2;

  console.log('📋 Trip Details:');
  console.log(`   • ${adults} adults`);
  console.log(`   • ${safariDays} days in safari parks (Serengeti)`);
  console.log(`   • ${activityCount} activities (e.g., crater tour, spice tour)`);
  console.log(`   • ${totalDays} total accommodation nights\n`);

  console.log('═'.repeat(90));
  console.log('💵 TIPS & GRATUITIES BREAKDOWN\n');

  // Safari guides + drivers
  const guideTipsMin = safariDays * 12;
  const guideTipsAvg = safariDays * 17;
  const guideTipsMax = safariDays * 22;
  
  console.log('🦁 Safari guides & drivers:');
  console.log(`   Range: $12-22/day × ${safariDays} days`);
  console.log(`   Min: $${guideTipsMin}, Avg: $${guideTipsAvg}, Max: $${guideTipsMax}\n`);

  // Hotel/lodge staff
  const accommodationTipsMin = totalDays * 2;
  const accommodationTipsAvg = totalDays * 4;
  const accommodationTipsMax = totalDays * 6;
  
  console.log('🏨 Hotel/lodge staff:');
  console.log(`   Range: $2-6/night × ${totalDays} nights`);
  console.log(`   Min: $${accommodationTipsMin}, Avg: $${accommodationTipsAvg}, Max: $${accommodationTipsMax}\n`);

  // Activity guides
  const activityTips = activityCount * 5;
  
  console.log('🤿 Activity guides:');
  console.log(`   $5/activity × ${activityCount} activities`);
  console.log(`   Total: $${activityTips}\n`);

  // Total tips
  const tipsMin = guideTipsMin + accommodationTipsMin + activityTips;
  const tipsAvg = guideTipsAvg + accommodationTipsAvg + activityTips;
  const tipsMax = guideTipsMax + accommodationTipsMax + activityTips;
  
  console.log('💰 TOTAL TIPS:');
  console.log(`   Min: $${tipsMin}, Avg: $${tipsAvg}, Max: $${tipsMax}\n`);

  console.log('═'.repeat(90));
  console.log('🛡️  TRAVEL INSURANCE\n');

  // Example base subtotal (visa + parks + transport + activities + accommodation)
  const exampleSubtotal = 0 + 27 + 79 + 0 + 594; // From user's screenshot
  
  const insuranceMin = Math.round(exampleSubtotal * 0.05 * 100) / 100;
  const insuranceAvg = Math.round(exampleSubtotal * 0.06 * 100) / 100;
  const insuranceMax = Math.round(exampleSubtotal * 0.07 * 100) / 100;
  
  console.log(`   Based on trip subtotal: $${exampleSubtotal}`);
  console.log(`   Insurance rates: 5-7% of trip cost`);
  console.log(`   Min (5%): $${insuranceMin}`);
  console.log(`   Avg (6%): $${insuranceAvg}`);
  console.log(`   Max (7%): $${insuranceMax}\n`);

  console.log('═'.repeat(90));
  console.log('📊 UPDATED BREAKDOWN (with tips & insurance)\n');
  
  const originalTotal = 0 + 147 + 79 + 0 + 594 + 41; // Original from screenshot
  const newTotal = exampleSubtotal + tipsAvg + insuranceAvg + 41; // With tips & insurance
  
  console.log('Original breakdown:');
  console.log('   Visa: $0');
  console.log('   Park fees: $27 (Tanzanian resident)');
  console.log('   Transport: $79');
  console.log('   Activities: $0');
  console.log('   Accommodation: $594');
  console.log('   Service charge: $41');
  console.log(`   SUBTOTAL: $${originalTotal}\n`);
  
  console.log('NEW breakdown (with awareness items):');
  console.log('   Visa: $0');
  console.log('   Park fees: $27');
  console.log('   Transport: $79');
  console.log('   Activities: $0');
  console.log('   Accommodation: $594');
  console.log(`   Tips & gratuities: $${tipsAvg} ⭐ NEW`);
  console.log(`   Travel insurance: $${insuranceAvg} ⭐ NEW`);
  console.log(`   Service charge: $41`);
  console.log(`   NEW TOTAL: $${newTotal}\n`);

  console.log('═'.repeat(90));
  console.log('📝 Important Notes:\n');
  console.log('✅ Tips are culturally expected in Tanzania — not optional');
  console.log('✅ Insurance is highly recommended for international travel');
  console.log('✅ Safari lodges typically include meals (no separate meal cost)');
  console.log('✅ NoLScope provides awareness estimates, not exact quotes');
  console.log('✅ Actual costs vary by season, availability, and operator\n');
}

testTipsAndInsurance().catch((e) => {
  console.error(e);
  process.exit(1);
});
