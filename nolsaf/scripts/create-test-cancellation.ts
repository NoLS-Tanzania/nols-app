/**
 * Test script to create a sample cancellation request for testing the admin interface.
 * 
 * Usage:
 *   cd nolsaf && npx tsx scripts/create-test-cancellation.ts
 * 
 * To clean up:
 *   cd nolsaf && npx tsx scripts/create-test-cancellation.ts --cleanup <requestId>
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file in the root or API directory
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), 'apps/api/.env') });

import { prisma } from '@nolsaf/prisma';
import crypto from 'crypto';

function generateReadableCode(length = 8): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0, O, I, 1)
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

async function createTestCancellation() {
  console.log('🔍 Looking for a booking with an active check-in code...');

  // Find a booking with an active check-in code
  let checkinCode = await prisma.checkinCode.findFirst({
    where: {
      status: 'ACTIVE',
    },
    include: {
      booking: {
        include: {
          user: true,
          property: true,
        },
      },
    },
    orderBy: {
      id: 'desc', // Get a recent one
    },
  });

  // If no booking exists, create a complete test scenario
  if (!checkinCode) {
    console.log('📦 No booking found. Creating complete test scenario...');
    
    // Find or create a test customer
    let customer = await prisma.user.findFirst({
      where: { email: 'test-cancellation@example.com' },
    });
    
    if (!customer) {
      customer = await prisma.user.create({
        data: {
          email: 'test-cancellation@example.com',
          name: 'Test Customer (Cancellation)',
          phone: '+255700000999',
          role: 'CUSTOMER',
        } as any,
      });
      console.log(`   ✅ Created test customer: ${customer.name}`);
    }

    // Find or create a test owner
    let owner = await prisma.user.findFirst({
      where: { email: 'test-owner-cancellation@example.com' },
    });
    
    if (!owner) {
      owner = await prisma.user.create({
        data: {
          email: 'test-owner-cancellation@example.com',
          name: 'Test Owner (Cancellation)',
          phone: '+255700000998',
          role: 'OWNER',
        } as any,
      });
      console.log(`   ✅ Created test owner: ${owner.name}`);
    }

    // Find or create a test property
    let property = await prisma.property.findFirst({
      where: { ownerId: owner.id, title: { contains: 'Test Property (Cancellation)' } },
    });
    
    if (!property) {
      property = await prisma.property.create({
        data: {
          ownerId: owner.id,
          title: 'Test Property (Cancellation)',
          type: 'APARTMENT',
          status: 'APPROVED',
          regionName: 'Dar es Salaam',
          city: 'Dar es Salaam',
          totalBedrooms: 2,
          totalBathrooms: 1,
          maxGuests: 4,
          basePrice: 50000,
          currency: 'TZS',
        } as any,
      });
      console.log(`   ✅ Created test property: ${property.title}`);
    }

    // Create a booking with check-in in the future (5 days from now)
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 5);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 3);

    const booking = await prisma.booking.create({
      data: {
        propertyId: property.id,
        userId: customer.id,
        status: 'CONFIRMED',
        checkIn,
        checkOut,
        totalAmount: 150000,
        guestName: customer.name,
        guestPhone: customer.phone,
      } as any,
    });
    console.log(`   ✅ Created test booking #${booking.id}`);

    // Create an active check-in code
    const codeVisible = generateReadableCode(8);
    const codeHash = hashCode(codeVisible);
    
    const code = await prisma.checkinCode.create({
      data: {
        bookingId: booking.id,
        code: codeVisible, // The visible code
        codeHash,
        codeVisible,
        status: 'ACTIVE',
      } as any,
    });
    console.log(`   ✅ Created check-in code: ${codeVisible}`);

    // Fetch the complete checkinCode with relations
    checkinCode = await prisma.checkinCode.findUnique({
      where: { id: code.id },
      include: {
        booking: {
          include: {
            user: true,
            property: true,
          },
        },
      },
    });

    if (!checkinCode) {
      console.error('❌ Failed to create test scenario.');
      process.exit(1);
    }
  }

  const booking = checkinCode.booking;
  const userId = booking.userId;

  if (!userId) {
    console.error('❌ Booking has no associated user.');
    process.exit(1);
  }

  console.log(`✅ Found booking #${booking.id} with code: ${checkinCode.code || checkinCode.codeVisible || 'N/A'}`);
  console.log(`   Property: ${booking.property?.title || 'N/A'}`);
  console.log(`   User: ${booking.user?.name || `User #${userId}`}`);
  console.log(`   Check-in: ${new Date(booking.checkIn).toLocaleString()}`);

  // Check if there's already a pending cancellation request
  const existing = await prisma.cancellationRequest.findFirst({
    where: {
      bookingId: booking.id,
      status: { in: ['SUBMITTED', 'REVIEWING', 'NEED_INFO', 'PROCESSING'] },
    },
  });

  if (existing) {
    console.log(`⚠️  A pending cancellation request already exists for this booking (ID: ${existing.id})`);
    console.log(`   View it at: /admin/cancellations/${existing.id}`);
    process.exit(0);
  }

  // Calculate eligibility based on cancellation policy
  const now = new Date();
  const checkIn = new Date(booking.checkIn);
  const createdAt = new Date(booking.createdAt);
  
  const hoursSinceBooking = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const hoursBeforeCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

  let policyEligible = false;
  let policyRefundPercent: number | null = null;
  let policyRule: string | null = null;

  if (now >= checkIn) {
    policyRule = 'AFTER_CHECKIN';
  } else if (hoursSinceBooking <= 24 && hoursBeforeCheckIn >= 72) {
    policyEligible = true;
    policyRefundPercent = 100;
    policyRule = 'FREE_24H_72H';
  } else if (hoursBeforeCheckIn >= 96) {
    policyEligible = true;
    policyRefundPercent = 50;
    policyRule = 'PARTIAL_50_96H';
  } else {
    policyRule = 'NOT_ELIGIBLE';
  }

  // Create the cancellation request
  const cancellationRequest = await prisma.cancellationRequest.create({
    data: {
      bookingId: booking.id,
      userId,
      bookingCode: checkinCode.code || checkinCode.codeVisible || `TEST-${booking.id}`,
      status: 'SUBMITTED',
      reason: 'Test cancellation request - created for admin interface testing. This can be deleted after testing.',
      policyEligible,
      policyRefundPercent,
      policyRule,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true },
      },
      booking: {
        include: {
          property: {
            select: { title: true, regionName: true, city: true, district: true },
          },
        },
      },
    },
  });

  console.log('\n✅ Test cancellation request created successfully!');
  console.log(`\n📋 Request Details:`);
  console.log(`   Request ID: ${cancellationRequest.id}`);
  console.log(`   Status: ${cancellationRequest.status}`);
  console.log(`   Policy Eligible: ${cancellationRequest.policyEligible ? 'Yes' : 'No'}`);
  console.log(`   Refund Percent: ${cancellationRequest.policyRefundPercent ?? 0}%`);
  console.log(`   Policy Rule: ${cancellationRequest.policyRule || 'N/A'}`);
  console.log(`\n🔗 View in admin panel:`);
  console.log(`   http://localhost:3000/admin/cancellations/${cancellationRequest.id}`);
  console.log(`\n🗑️  To delete this test request, run:`);
  console.log(`   npx tsx scripts/create-test-cancellation.ts --cleanup ${cancellationRequest.id}`);
}

async function cleanupTestCancellation(requestId: string) {
  const id = parseInt(requestId, 10);
  if (!Number.isFinite(id)) {
    console.error('❌ Invalid request ID');
    process.exit(1);
  }

  console.log(`🗑️  Looking for cancellation request #${id}...`);

  const request = await prisma.cancellationRequest.findUnique({
    where: { id },
    include: {
      messages: true,
    },
  });

  if (!request) {
    console.error(`❌ Cancellation request #${id} not found.`);
    process.exit(1);
  }

  // Delete messages first (due to foreign key constraint)
  if (request.messages.length > 0) {
    await prisma.cancellationMessage.deleteMany({
      where: { cancellationRequestId: id },
    });
    console.log(`   Deleted ${request.messages.length} message(s)`);
  }

  // Delete the request
  await prisma.cancellationRequest.delete({
    where: { id },
  });

  console.log(`✅ Cancellation request #${id} deleted successfully.`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args[0] === '--cleanup' || args[0] === '--delete') {
    const requestId = args[1];
    if (!requestId) {
      console.error('❌ Please provide a request ID to delete.');
      console.log('   Usage: npx tsx scripts/create-test-cancellation.ts --cleanup <requestId>');
      process.exit(1);
    }
    await cleanupTestCancellation(requestId);
  } else {
    await createTestCancellation();
  }
}

main()
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

