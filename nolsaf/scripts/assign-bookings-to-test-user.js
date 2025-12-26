/**
 * Script to assign existing bookings to the test user (user@nolsaf.com)
 * This allows testing the cancellation flow with real booking codes
 * 
 * Run with: node scripts/assign-bookings-to-test-user.js
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function assignBookingsToTestUser() {
  try {
    console.log('🔍 Finding test user (user@nolsaf.com)...\n');
    
    // Find the test user
    const testUser = await prisma.user.findUnique({
      where: { email: 'user@nolsaf.com' },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!testUser) {
      console.error('❌ Test user not found! Please run: npm run seed:test-accounts');
      process.exit(1);
    }

    console.log(`✅ Found test user:`);
    console.log(`   ID: ${testUser.id}`);
    console.log(`   Email: ${testUser.email}`);
    console.log(`   Name: ${testUser.name}`);
    console.log(`   Role: ${testUser.role}\n`);

    // Find bookings that have checkin codes
    console.log('🔍 Finding bookings with checkin codes...\n');
    
    // First find active checkin codes, then get their bookings
    // Include bookings that are NOT already assigned to test user
    const activeCodes = await prisma.checkinCode.findMany({
      where: {
        status: 'ACTIVE',
        booking: {
          status: { in: ['CONFIRMED', 'PENDING_CHECKIN', 'NEW'] },
          userId: { not: testUser.id }, // Exclude bookings already assigned to test user
        },
      },
      include: {
        booking: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      take: 20, // Limit to 20 bookings
    });

    // Transform to bookings with codes
    const bookingsWithCodes = activeCodes.map(cc => ({
      ...cc.booking,
      code: {
        id: cc.id,
        code: cc.code,
        codeVisible: cc.codeVisible,
        status: cc.status,
      },
    }));

    if (bookingsWithCodes.length === 0) {
      console.log('❌ No bookings with active checkin codes found.');
      console.log('\n💡 To create test bookings:');
      console.log('1. Log in as admin and create a booking');
      console.log('2. Or manually create bookings in the database');
      process.exit(0);
    }

    console.log(`✅ Found ${bookingsWithCodes.length} booking(s) with checkin codes:\n`);
    console.log('='.repeat(80));
    
    bookingsWithCodes.forEach((booking, index) => {
      console.log(`\n${index + 1}. Booking ID: ${booking.id}`);
      console.log(`   Current User: ${booking.user?.email || booking.user?.name || 'None'} (ID: ${booking.userId || 'None'})`);
      console.log(`   Property: ${booking.property.title}`);
      console.log(`   Check-in: ${booking.checkIn.toLocaleDateString()}`);
      console.log(`   Check-out: ${booking.checkOut.toLocaleDateString()}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Code: ${booking.code?.code || booking.code?.codeVisible || 'N/A'}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log(`\n🔄 Updating ${bookingsWithCodes.length} booking(s) to belong to test user...\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const booking of bookingsWithCodes) {
      try {
        // Skip if already assigned to test user
        if (booking.userId === testUser.id) {
          console.log(`⏭️  Booking ${booking.id} already belongs to test user, skipping...`);
          skippedCount++;
          continue;
        }

        // Update the booking to belong to test user
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            userId: testUser.id,
            // Also update guest info to match test user
            guestName: testUser.name || 'Test Customer',
            guestPhone: '+255700000001', // Test user's phone
          },
        });

        console.log(`✅ Updated booking ${booking.id} → Test user (${testUser.email})`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update booking ${booking.id}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} booking(s)`);
    console.log(`   ⏭️  Skipped: ${skippedCount} booking(s) (already assigned)`);
    console.log(`   ❌ Failed: ${bookingsWithCodes.length - updatedCount - skippedCount} booking(s)\n`);

      // Show the updated booking codes
      if (updatedCount > 0) {
        console.log('📋 Updated Booking Codes for Testing:\n');
        // Find checkin codes for bookings belonging to test user
        const updatedCodes = await prisma.checkinCode.findMany({
          where: {
            status: 'ACTIVE',
            booking: {
              userId: testUser.id,
            },
          },
          include: {
            booking: {
              include: {
                property: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        });
        
        const updatedBookings = updatedCodes.map(cc => ({
          ...cc.booking,
          code: {
            code: cc.code,
            codeVisible: cc.codeVisible,
          },
        }));

      updatedBookings.forEach((booking, index) => {
        const codeValue = booking.code?.code || booking.code?.codeVisible || 'N/A';
        console.log(`   ${index + 1}. Code: ${codeValue}`);
        console.log(`      Property: ${booking.property.title}`);
        console.log(`      Check-in: ${booking.checkIn.toLocaleDateString()}\n`);
      });

      console.log('💡 To test cancellation:');
      console.log('1. Log in as user@nolsaf.com / password123');
      console.log('2. Go to /account/cancellations');
      console.log('3. Enter one of the booking codes above');
      console.log('4. Test the cancellation flow\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.message.includes('DATABASE_URL')) {
      console.error('\n⚠️  Ensure your .env file has DATABASE_URL set correctly.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

assignBookingsToTestUser();

