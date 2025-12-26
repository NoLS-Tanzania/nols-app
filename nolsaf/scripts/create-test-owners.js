/**
 * Script to create test owners with all necessary information
 * This creates two owners with different KYC statuses and properties
 * 
 * Run with: node scripts/create-test-owners.js
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestOwners() {
  try {
    console.log('🏗️  Creating test owners...\n');

    // Owner 1: Active with Approved KYC
    console.log('Creating Owner 1: Active with Approved KYC...');
    const owner1 = await prisma.user.upsert({
      where: { email: 'owner1@nolsaf.com' },
      update: {},
      create: {
        email: 'owner1@nolsaf.com',
        name: 'John Mwangi',
        phone: '+255712345678',
        role: 'OWNER',
        kycStatus: 'APPROVED_KYC',
        suspendedAt: null,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      },
    });
    console.log(`✅ Created Owner 1: ${owner1.name} (ID: ${owner1.id})`);

    // Create properties for Owner 1
    const property1 = await prisma.property.create({
      data: {
        ownerId: owner1.id,
        title: 'Luxury Beach Villa',
        type: 'VILLA',
        status: 'APPROVED',
        regionName: 'Dar es Salaam',
        regionId: '11',
        district: 'Kinondoni',
        ward: 'Msasani',
        totalBedrooms: 4,
        totalBathrooms: 3,
        maxGuests: 8,
        photos: [],
        roomsSpec: [],
        services: [],
      },
    });

    const property2 = await prisma.property.create({
      data: {
        ownerId: owner1.id,
        title: 'City Center Apartment',
        type: 'APARTMENT',
        status: 'APPROVED',
        regionName: 'Dar es Salaam',
        regionId: '11',
        district: 'Ilala',
        ward: 'Kariakoo',
        totalBedrooms: 2,
        totalBathrooms: 1,
        maxGuests: 4,
        photos: [],
        roomsSpec: [],
        services: [],
      },
    });

    const property3 = await prisma.property.create({
      data: {
        ownerId: owner1.id,
        title: 'Mountain View Hotel',
        type: 'HOTEL',
        status: 'APPROVED',
        regionName: 'Arusha',
        regionId: '2',
        district: 'Arusha City',
        ward: 'Central',
        totalBedrooms: 20,
        totalBathrooms: 20,
        maxGuests: 40,
        hotelStar: 'high',
        photos: [],
        roomsSpec: [],
        services: [],
      },
    });

    console.log(`   Created 3 properties for Owner 1\n`);

    // Owner 2: Active with Pending KYC
    console.log('Creating Owner 2: Active with Pending KYC...');
    const owner2 = await prisma.user.upsert({
      where: { email: 'owner2@nolsaf.com' },
      update: {},
      create: {
        email: 'owner2@nolsaf.com',
        name: 'Sarah Hassan',
        phone: '+255798765432',
        role: 'OWNER',
        kycStatus: 'PENDING_KYC',
        suspendedAt: null,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      },
    });
    console.log(`✅ Created Owner 2: ${owner2.name} (ID: ${owner2.id})`);

    // Create properties for Owner 2
    const property4 = await prisma.property.create({
      data: {
        ownerId: owner2.id,
        title: 'Serengeti Safari Lodge',
        type: 'HOTEL',
        status: 'APPROVED',
        regionName: 'Arusha',
        regionId: '2',
        district: 'Arusha City',
        ward: 'Njiro',
        totalBedrooms: 15,
        totalBathrooms: 15,
        maxGuests: 30,
        hotelStar: 'luxury',
        photos: [],
        roomsSpec: [],
        services: [],
      },
    });

    console.log(`   Created 1 property for Owner 2\n`);

    // Summary
    console.log('📊 Summary:');
    console.log(`   Owner 1: ${owner1.name} - ${owner1.kycStatus} - 3 properties`);
    console.log(`   Owner 2: ${owner2.name} - ${owner2.kycStatus} - 1 property`);
    console.log('\n✅ Test owners created successfully!');
    console.log('   You can now view them at /admin/owners\n');

  } catch (error) {
    console.error('❌ Error creating test owners:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestOwners()
  .then(() => {
    console.log('✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

