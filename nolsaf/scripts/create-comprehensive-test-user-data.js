/**
 * Script to create comprehensive test data for user@nolsaf.com
 * This creates multiple bookings with different statuses, invoices, and related data
 * to fully test the user detail page
 * 
 * Run with: node scripts/create-comprehensive-test-user-data.js
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function generateBookingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function hashCode(code) {
  return crypto.createHash('sha256').update(code.toUpperCase()).digest('hex');
}

async function createComprehensiveTestData() {
  try {
    console.log('🔍 Finding test user (user@nolsaf.com)...\n');
    
    // Find the test user
    let testUser = await prisma.user.findUnique({
      where: { email: 'user@nolsaf.com' },
    });

    if (!testUser) {
      console.log('⚠️  Test user not found. Creating test user...\n');
      testUser = await prisma.user.create({
        data: {
          email: 'user@nolsaf.com',
          name: 'Test Customer',
          phone: '+255700000001',
          role: 'CUSTOMER',
          emailVerifiedAt: new Date(),
          phoneVerifiedAt: new Date(),
        },
      });
      console.log('✅ Created test user\n');
    } else {
      console.log(`✅ Found test user:`);
      console.log(`   ID: ${testUser.id}`);
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Name: ${testUser.name}`);
      console.log(`   Role: ${testUser.role}\n`);
    }

    // Find an available property and owner
    console.log('🔍 Finding properties...\n');
    const property = await prisma.property.findFirst({
      where: { status: 'APPROVED' },
      include: { owner: true },
    });

    if (!property) {
      console.error('❌ No approved properties found! Please create at least one approved property.');
      process.exit(1);
    }

    console.log(`✅ Found property: ${property.title} (ID: ${property.id})`);
    console.log(`   Owner: ${property.owner.email}\n`);

    // Create bookings with different statuses
    const now = new Date();
    const bookings = [];

    // 1. CONFIRMED booking (future dates)
    const confirmedCheckIn = new Date(now);
    confirmedCheckIn.setDate(confirmedCheckIn.getDate() + 7);
    const confirmedCheckOut = new Date(confirmedCheckIn);
    confirmedCheckOut.setDate(confirmedCheckOut.getDate() + 3);

    const bookingCode1 = generateBookingCode();
    const confirmedBooking = await prisma.booking.create({
      data: {
        propertyId: property.id,
        userId: testUser.id,
        status: 'CONFIRMED',
        checkIn: confirmedCheckIn,
        checkOut: confirmedCheckOut,
        totalAmount: 150000,
        guestName: testUser.name,
        guestPhone: testUser.phone,
        roomCode: 'Standard Double',
        code: {
          create: {
            code: bookingCode1,
            codeHash: hashCode(bookingCode1),
            codeVisible: bookingCode1,
            status: 'ACTIVE',
          },
        },
      },
      include: { code: true },
    });
    bookings.push(confirmedBooking);
    console.log(`✅ Created CONFIRMED booking (ID: ${confirmedBooking.id}, Code: ${bookingCode1})`);

    // 2. CHECKED_IN booking (current dates)
    const checkedInCheckIn = new Date(now);
    checkedInCheckIn.setDate(checkedInCheckIn.getDate() - 1);
    const checkedInCheckOut = new Date(now);
    checkedInCheckOut.setDate(checkedInCheckOut.getDate() + 2);

    const bookingCode2 = generateBookingCode();
    const checkedInBooking = await prisma.booking.create({
      data: {
        propertyId: property.id,
        userId: testUser.id,
        status: 'CHECKED_IN',
        checkIn: checkedInCheckIn,
        checkOut: checkedInCheckOut,
        totalAmount: 200000,
        guestName: testUser.name,
        guestPhone: testUser.phone,
        roomCode: 'Deluxe Suite',
        code: {
          create: {
            code: bookingCode2,
            codeHash: hashCode(bookingCode2),
            codeVisible: bookingCode2,
            status: 'USED',
            usedAt: new Date(),
          },
        },
      },
      include: { code: true },
    });
    bookings.push(checkedInBooking);
    console.log(`✅ Created CHECKED_IN booking (ID: ${checkedInBooking.id}, Code: ${bookingCode2})`);

    // 3. CHECKED_OUT booking (past dates)
    const checkedOutCheckIn = new Date(now);
    checkedOutCheckIn.setDate(checkedOutCheckIn.getDate() - 10);
    const checkedOutCheckOut = new Date(now);
    checkedOutCheckOut.setDate(checkedOutCheckOut.getDate() - 7);

    const bookingCode3 = generateBookingCode();
    const checkedOutBooking = await prisma.booking.create({
      data: {
        propertyId: property.id,
        userId: testUser.id,
        status: 'CHECKED_OUT',
        checkIn: checkedOutCheckIn,
        checkOut: checkedOutCheckOut,
        totalAmount: 180000,
        guestName: testUser.name,
        guestPhone: testUser.phone,
        roomCode: 'Standard Single',
        code: {
          create: {
            code: bookingCode3,
            codeHash: hashCode(bookingCode3),
            codeVisible: bookingCode3,
            status: 'USED',
            usedAt: checkedOutCheckOut,
          },
        },
      },
      include: { code: true },
    });
    bookings.push(checkedOutBooking);
    console.log(`✅ Created CHECKED_OUT booking (ID: ${checkedOutBooking.id}, Code: ${bookingCode3})`);

    // 4. CANCELED booking
    const canceledCheckIn = new Date(now);
    canceledCheckIn.setDate(canceledCheckIn.getDate() + 14);
    const canceledCheckOut = new Date(canceledCheckIn);
    canceledCheckOut.setDate(canceledCheckOut.getDate() + 2);

    const canceledBooking = await prisma.booking.create({
      data: {
        propertyId: property.id,
        userId: testUser.id,
        status: 'CANCELED',
        checkIn: canceledCheckIn,
        checkOut: canceledCheckOut,
        totalAmount: 120000,
        guestName: testUser.name,
        guestPhone: testUser.phone,
        roomCode: 'Budget Room',
      },
    });
    bookings.push(canceledBooking);
    console.log(`✅ Created CANCELED booking (ID: ${canceledBooking.id})`);

    // Create invoices for confirmed, checked-in, and checked-out bookings
    console.log('\n📄 Creating invoices...\n');

    // Invoice for CHECKED_OUT booking (PAID)
    const total1 = Number(checkedOutBooking.totalAmount);
    const invoice1 = await prisma.invoice.create({
      data: {
        ownerId: property.ownerId,
        bookingId: checkedOutBooking.id,
        status: 'PAID',
        total: total1,
        commissionPercent: 15,
        commissionAmount: total1 * 0.15,
        netPayable: total1 * 0.85,
        issuedAt: checkedOutCheckIn,
        approvedAt: checkedOutCheckIn,
        paidAt: checkedOutCheckOut,
      },
    });
    console.log(`✅ Created PAID invoice (ID: ${invoice1.id}) for CHECKED_OUT booking`);

    // Invoice for CHECKED_IN booking (APPROVED)
    const total2 = Number(checkedInBooking.totalAmount);
    const invoice2 = await prisma.invoice.create({
      data: {
        ownerId: property.ownerId,
        bookingId: checkedInBooking.id,
        status: 'APPROVED',
        total: total2,
        commissionPercent: 15,
        commissionAmount: total2 * 0.15,
        netPayable: total2 * 0.85,
        issuedAt: checkedInCheckIn,
        approvedAt: checkedInCheckIn,
      },
    });
    console.log(`✅ Created APPROVED invoice (ID: ${invoice2.id}) for CHECKED_IN booking`);

    // Invoice for CONFIRMED booking (REQUESTED)
    const total3 = Number(confirmedBooking.totalAmount);
    const invoice3 = await prisma.invoice.create({
      data: {
        ownerId: property.ownerId,
        bookingId: confirmedBooking.id,
        status: 'REQUESTED',
        total: total3,
        commissionPercent: 15,
        commissionAmount: total3 * 0.15,
        netPayable: total3 * 0.85,
        issuedAt: now,
      },
    });
    console.log(`✅ Created REQUESTED invoice (ID: ${invoice3.id}) for CONFIRMED booking`);

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   User: ${testUser.name} (${testUser.email})`);
    console.log(`   Total Bookings: ${bookings.length}`);
    console.log(`   - CONFIRMED: 1`);
    console.log(`   - CHECKED_IN: 1`);
    console.log(`   - CHECKED_OUT: 1`);
    console.log(`   - CANCELED: 1`);
    console.log(`   Total Invoices: 3`);
    console.log(`   - PAID: 1`);
    console.log(`   - APPROVED: 1`);
    console.log(`   - REQUESTED: 1`);
    
    const totalRevenue = Number(invoice1.total) + Number(invoice2.total);
    console.log(`   Total Revenue (PAID + APPROVED): ${totalRevenue.toLocaleString()} TZS`);
    console.log('\n✅ Test data created successfully!');
    console.log(`\n🌐 You can now view the user detail page at:`);
    console.log(`   http://localhost:3000/admin/users/${testUser.id}\n`);

  } catch (error) {
    console.error('\n❌ Error creating test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createComprehensiveTestData()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

