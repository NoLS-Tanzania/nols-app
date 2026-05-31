import dotenv from "dotenv";
import { prisma } from "@nolsaf/prisma";
import { generateTransportTripCode } from "../src/lib/tripCode.js";

dotenv.config({ path: ".env" });

const SMOKE_PREFIX = "SMOKE-DRIVER-PAYOUT";
const COMMISSION_PERCENT = 10;

type SmokeCase = {
  index: number;
  driverName: string;
  driverEmail: string;
  driverPhone: string;
  vehicleType: string;
  vehiclePlate: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "PAID";
  fromAddress: string;
  toAddress: string;
  paymentMethod: string;
};

const smokeCases: SmokeCase[] = [
  {
    index: 1,
    driverName: "Smoke Payout Driver One",
    driverEmail: "smoke.driver.payout.1@nolsaf.test",
    driverPhone: "+255710900001",
    vehicleType: "CAR",
    vehiclePlate: "SMK 101",
    amount: 85_000,
    status: "PENDING",
    fromAddress: "Julius Nyerere International Airport, Dar es Salaam",
    toAddress: "Masaki, Dar es Salaam",
    paymentMethod: "M-Pesa",
  },
  {
    index: 2,
    driverName: "Smoke Payout Driver Two",
    driverEmail: "smoke.driver.payout.2@nolsaf.test",
    driverPhone: "+255710900002",
    vehicleType: "XL",
    vehiclePlate: "SMK 202",
    amount: 125_000,
    status: "APPROVED",
    fromAddress: "Kivukoni Ferry, Dar es Salaam",
    toAddress: "Mbezi Beach, Dar es Salaam",
    paymentMethod: "Airtel Money",
  },
  {
    index: 3,
    driverName: "Smoke Payout Driver Three",
    driverEmail: "smoke.driver.payout.3@nolsaf.test",
    driverPhone: "+255710900003",
    vehicleType: "PREMIUM",
    vehiclePlate: "SMK 303",
    amount: 180_000,
    status: "PAID",
    fromAddress: "Arusha Airport",
    toAddress: "Njiro, Arusha",
    paymentMethod: "Bank Transfer",
  },
];

function requireSafeEnvironment() {
  if (process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) {
    throw new Error(
      "Refusing to seed smoke payout data while NODE_ENV=production. Re-run with --allow-production only if this is an intentional staging seed.",
    );
  }
}

function daysAgo(days: number, hour = 9) {
  const value = new Date();
  value.setDate(value.getDate() - days);
  value.setHours(hour, 0, 0, 0);
  return value;
}

function money(value: number) {
  return value.toFixed(2);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

async function findAdminId() {
  const admin = await (prisma as any).user.findFirst({
    where: { role: "ADMIN" },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return admin?.id ? Number(admin.id) : null;
}

async function upsertSmokeCustomer() {
  return (prisma as any).user.upsert({
    where: { email: "smoke.payout.customer@nolsaf.test" },
    update: {
      name: "Smoke Payout Customer",
      fullName: "Smoke Payout Customer",
      phone: "+255710900000",
      role: "CUSTOMER",
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
    create: {
      name: "Smoke Payout Customer",
      fullName: "Smoke Payout Customer",
      email: "smoke.payout.customer@nolsaf.test",
      phone: "+255710900000",
      role: "CUSTOMER",
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
    },
  });
}

async function upsertSmokeDriver(item: SmokeCase) {
  return (prisma as any).user.upsert({
    where: { email: item.driverEmail },
    update: {
      name: item.driverName,
      fullName: item.driverName,
      phone: item.driverPhone,
      role: "DRIVER",
      kycStatus: "APPROVED_KYC",
      available: true,
      isAvailable: true,
      vehicleType: item.vehicleType,
      vehiclePlate: item.vehiclePlate,
      plateNumber: item.vehiclePlate,
      paymentPhone: item.driverPhone,
      paymentVerified: true,
      region: item.index === 3 ? "Arusha" : "Dar es Salaam",
      operationArea: item.index === 3 ? "Arusha" : "Dar es Salaam",
    },
    create: {
      name: item.driverName,
      fullName: item.driverName,
      email: item.driverEmail,
      phone: item.driverPhone,
      role: "DRIVER",
      kycStatus: "APPROVED_KYC",
      available: true,
      isAvailable: true,
      vehicleType: item.vehicleType,
      vehiclePlate: item.vehiclePlate,
      plateNumber: item.vehiclePlate,
      paymentPhone: item.driverPhone,
      paymentVerified: true,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: new Date(),
      region: item.index === 3 ? "Arusha" : "Dar es Salaam",
      operationArea: item.index === 3 ? "Arusha" : "Dar es Salaam",
      rating: "4.80",
    },
  });
}

async function createBookingWithUniqueTripCode(data: Record<string, any>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { tripCode, tripCodeHash } = generateTransportTripCode();
    try {
      return await (prisma as any).transportBooking.create({
        data: { ...data, tripCode, tripCodeHash },
      });
    } catch (error: any) {
      const isUnique = error?.code === "P2002" || String(error?.message ?? "").includes("Unique constraint");
      if (isUnique && attempt < 4) continue;
      throw error;
    }
  }
  throw new Error("Unable to generate a unique smoke trip code");
}

async function upsertCompletedTrip(item: SmokeCase, customerId: number, driverId: number) {
  const paymentRef = `${SMOKE_PREFIX}-TRIP-${item.index}`;
  const marker = `${SMOKE_PREFIX}:trip:${item.index}`;
  const scheduledDate = daysAgo(item.index + 1, 9 + item.index);
  const pickupTime = new Date(scheduledDate.getTime() + 15 * 60 * 1000);
  const dropoffTime = new Date(scheduledDate.getTime() + 75 * 60 * 1000);
  const data = {
    userId: customerId,
    driverId,
    status: "COMPLETED",
    scheduledDate,
    pickupTime,
    dropoffTime,
    fromRegion: item.index === 3 ? "Arusha" : "Dar es Salaam",
    fromDistrict: item.index === 3 ? "Arusha Urban" : "Ilala",
    fromAddress: item.fromAddress,
    fromLatitude: item.index === 3 ? "-3.386900" : "-6.878100",
    fromLongitude: item.index === 3 ? "36.682900" : "39.202600",
    toRegion: item.index === 3 ? "Arusha" : "Dar es Salaam",
    toDistrict: item.index === 3 ? "Arusha Urban" : "Kinondoni",
    toAddress: item.toAddress,
    toLatitude: item.index === 3 ? "-3.399300" : "-6.746700",
    toLongitude: item.index === 3 ? "36.731400" : "39.262400",
    vehicleType: item.vehicleType,
    amount: money(item.amount),
    currency: "TZS",
    numberOfPassengers: item.index + 1,
    notes: `${marker}\nCompleted smoke trip used to verify admin driver payout and invoice claim screens.`,
    userRating: "5.00",
    userReview: "Smoke passenger confirmed the trip was completed.",
    driverRating: "5.00",
    driverReview: "Smoke driver requested payout after completion.",
    paymentStatus: "PAID",
    paymentMethod: item.paymentMethod,
    paymentRef,
  };

  const existing = await (prisma as any).transportBooking.findFirst({
    where: { paymentRef },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (existing) {
    return (prisma as any).transportBooking.update({
      where: { id: existing.id },
      data,
    });
  }

  return createBookingWithUniqueTripCode(data);
}

async function upsertTransportPayout(item: SmokeCase, bookingId: number, driverId: number, adminId: number | null) {
  const grossAmount = item.amount;
  const commissionAmount = roundMoney(grossAmount * (COMMISSION_PERCENT / 100));
  const netPaid = grossAmount - commissionAmount;
  const now = new Date();
  const approvedAt = item.status === "APPROVED" || item.status === "PAID" ? now : null;
  const paidAt = item.status === "PAID" ? now : null;

  return (prisma as any).transportPayout.upsert({
    where: { transportBookingId: bookingId },
    update: {
      driverId,
      currency: "TZS",
      grossAmount: money(grossAmount),
      commissionPercent: money(COMMISSION_PERCENT),
      commissionAmount: money(commissionAmount),
      netPaid: money(netPaid),
      status: item.status,
      approvedAt,
      approvedBy: approvedAt ? adminId : null,
      paidAt,
      paidBy: paidAt ? adminId : null,
      paymentMethod: item.paymentMethod,
      paymentRef: item.status === "PAID" ? `${SMOKE_PREFIX}-PAID-${item.index}` : `${SMOKE_PREFIX}-CLAIM-${item.index}`,
    },
    create: {
      transportBookingId: bookingId,
      driverId,
      currency: "TZS",
      grossAmount: money(grossAmount),
      commissionPercent: money(COMMISSION_PERCENT),
      commissionAmount: money(commissionAmount),
      netPaid: money(netPaid),
      status: item.status,
      approvedAt,
      approvedBy: approvedAt ? adminId : null,
      paidAt,
      paidBy: paidAt ? adminId : null,
      paymentMethod: item.paymentMethod,
      paymentRef: item.status === "PAID" ? `${SMOKE_PREFIX}-PAID-${item.index}` : `${SMOKE_PREFIX}-CLAIM-${item.index}`,
    },
  });
}

async function upsertInvoiceClaim(item: SmokeCase, driverId: number, adminId: number | null, netPaid: number) {
  const paymentRef = `${SMOKE_PREFIX}-INVOICE-${item.index}`;
  const existing = await (prisma as any).referralWithdrawal.findFirst({
    where: { paymentRef },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  const approvedAt = item.status === "APPROVED" || item.status === "PAID" ? new Date() : null;
  const paidAt = item.status === "PAID" ? new Date() : null;
  const data = {
    driverId,
    totalAmount: money(netPaid),
    currency: "TZS",
    status: item.status,
    paymentMethod: item.paymentMethod,
    paymentRef,
    processedBy: approvedAt || paidAt ? adminId : null,
    adminNotes: `${SMOKE_PREFIX}: invoice claim for completed trip ${item.index}`,
    approvedAt,
    rejectedAt: null,
    paidAt,
  };

  if (existing) {
    return (prisma as any).referralWithdrawal.update({
      where: { id: existing.id },
      data,
    });
  }

  return (prisma as any).referralWithdrawal.create({ data });
}

async function main() {
  requireSafeEnvironment();

  const adminId = await findAdminId();
  const customer = await upsertSmokeCustomer();
  const results: any[] = [];

  for (const item of smokeCases) {
    const driver = await upsertSmokeDriver(item);
    const booking = await upsertCompletedTrip(item, Number(customer.id), Number(driver.id));
    const payout = await upsertTransportPayout(item, Number(booking.id), Number(driver.id), adminId);
    const invoiceClaim = await upsertInvoiceClaim(item, Number(driver.id), adminId, Number(payout.netPaid ?? 0));

    results.push({
      status: item.status,
      driver: driver.name,
      driverEmail: driver.email,
      tripId: Number(booking.id),
      tripCode: booking.tripCode,
      transportPayoutId: Number(payout.id),
      invoiceClaimId: Number(invoiceClaim.id),
      grossAmount: Number(payout.grossAmount),
      netPaid: Number(payout.netPaid),
      paymentRef: invoiceClaim.paymentRef,
    });
  }

  console.log("Driver payout smoke data is ready.");
  console.table(results);
  console.log("");
  console.log("Open these admin screens and search for SMOKE-DRIVER-PAYOUT:");
  console.log("  /admin/drivers/trips?status=COMPLETED");
  console.log("  /admin/drivers/invoices");
  console.log("  /admin/drivers/paid");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
