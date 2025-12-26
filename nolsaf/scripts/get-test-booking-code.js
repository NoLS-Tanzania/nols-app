/**
 * Script to get valid booking codes for cancellation testing
 * Run with: node scripts/get-test-booking-code.js
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getTestBookingCodes() {
  try {
    const checkinCodes = await prisma.checkinCode.findMany({
      where: {
        status: 'ACTIVE',
        booking: {
          status: { in: ['CONFIRMED', 'PENDING_CHECKIN'] },
          checkIn: { gt: new Date() }, // Future check-in
        },
      },
      include: {
        booking: {
          include: {
            property: {
              select: {
                id: true,
                title: true,
                regionName: true,
                city: true,
              },
            },
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        booking: {
          checkIn: 'asc',
        },
      },
      take: 10,
    });

    if (checkinCodes.length === 0) {
      console.log('❌ No valid booking codes found for testing.');
      console.log('\nTo create test data, you can:');
      console.log('1. Create a booking through the app');
      console.log('2. Use the seed script if available');
      console.log('3. Manually insert test data into the database');
      return;
    }

    console.log(`\n✅ Found ${checkinCodes.length} valid booking code(s) for testing:\n`);
    console.log('='.repeat(80));

    checkinCodes.forEach((cc, index) => {
      const booking = cc.booking;
      const now = new Date();
      const hoursSinceBooking = (now.getTime() - booking.createdAt.getTime()) / (1000 * 60 * 60);
      const hoursBeforeCheckIn = (booking.checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

      let eligibility = '';
      if (hoursSinceBooking <= 24 && hoursBeforeCheckIn >= 72) {
        eligibility = '✅ Eligible: Free cancellation (100% refund)';
      } else if (hoursBeforeCheckIn >= 96) {
        eligibility = '✅ Eligible: Partial refund (50%)';
      } else {
        eligibility = '❌ Not eligible (contact admin)';
      }

      console.log(`\n${index + 1}. Booking Code: ${cc.code}`);
      console.log(`   Code Visible: ${cc.codeVisible || cc.code}`);
      console.log(`   Booking ID: ${booking.id}`);
      console.log(`   User ID: ${booking.userId}`);
      console.log(`   User: ${booking.user?.name || booking.user?.email || 'N/A'}`);
      console.log(`   Property: ${booking.property.title}`);
      console.log(`   Check-in: ${booking.checkIn.toLocaleDateString()}`);
      console.log(`   Check-out: ${booking.checkOut.toLocaleDateString()}`);
      console.log(`   Amount: ${booking.totalAmount} TZS`);
      console.log(`   Hours since booking: ${Math.round(hoursSinceBooking)}h`);
      console.log(`   Hours before check-in: ${Math.round(hoursBeforeCheckIn)}h`);
      console.log(`   ${eligibility}`);
      console.log(`   Status: ${booking.status}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 To test cancellation:');
    console.log('1. Log in as the user shown above (userId)');
    console.log('2. Go to /account/cancellations');
    console.log('3. Enter the booking code');
    console.log('4. Test the cancellation flow\n');
  } catch (error) {
    console.error('Error fetching booking codes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getTestBookingCodes();

