/**
 * Script to create a new test booking for user@nolsaf.com
 * This creates a booking with an active checkin code for testing cancellation flow
 * 
 * Run with: node scripts/create-test-booking.js
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateBookingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

async function createTestBooking() {
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

    // Find an available property
    console.log('🔍 Finding an available property...\n');
    const property = await prisma.property.findFirst({
      where: {
        status: { in: ['APPROVED', 'PENDING'] },
      },
      select: {
        id: true,
        title: true,
        ownerId: true,
      },
    });

    if (!property) {
      console.error('❌ No available property found! Please create a property first.');
      process.exit(1);
    }

    console.log(`✅ Found property:`);
    console.log(`   ID: ${property.id}`);
    console.log(`   Title: ${property.title}\n`);

    // Create booking dates (future dates for cancellation testing)
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 7); // 7 days from now
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 3); // 3 nights

    console.log('📅 Creating booking with dates:');
    console.log(`   Check-in: ${checkIn.toLocaleDateString()}`);
    console.log(`   Check-out: ${checkOut.toLocaleDateString()}\n`);

    // Generate booking code
    const bookingCode = generateBookingCode();
    const codeHash = hashCode(bookingCode);

    console.log('🔐 Generated booking code:', bookingCode);
    console.log('\n🔄 Creating booking and checkin code...\n');

    // Create booking with checkin code in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create booking
      const booking = await tx.booking.create({
        data: {
          propertyId: property.id,
          userId: testUser.id,
          status: 'CONFIRMED',
          checkIn: checkIn,
          checkOut: checkOut,
          totalAmount: 150000, // 150,000 TZS
          guestName: testUser.name || 'Test Customer',
          guestPhone: '+255700000001',
        },
      });

      // Create checkin code
      const checkinCode = await tx.checkinCode.create({
        data: {
          bookingId: booking.id,
          code: bookingCode,
          codeHash: codeHash,
          codeVisible: bookingCode,
          status: 'ACTIVE',
        },
      });

      return { booking, checkinCode };
    });

    console.log('✅ Successfully created test booking!\n');
    console.log('='.repeat(80));
    console.log('\n📋 Booking Details:');
    console.log(`   Booking ID: ${result.booking.id}`);
    console.log(`   Property: ${property.title}`);
    console.log(`   Check-in: ${checkIn.toLocaleDateString()}`);
    console.log(`   Check-out: ${checkOut.toLocaleDateString()}`);
    console.log(`   Amount: 150,000 TZS`);
    console.log(`   Status: ${result.booking.status}`);
    console.log(`\n🔑 Booking Code: ${bookingCode}`);
    console.log(`   Code Status: ${result.checkinCode.status}`);
    console.log('\n' + '='.repeat(80));
    console.log('\n💡 To test cancellation:');
    console.log('1. Log in as user@nolsaf.com / password123');
    console.log('2. Go to /account/cancellations');
    console.log(`3. Enter booking code: ${bookingCode}`);
    console.log('4. Test the cancellation flow\n');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error.message.includes('DATABASE_URL')) {
      console.error('\n⚠️  Ensure your .env file has DATABASE_URL set correctly.');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestBooking();

