import { prisma } from "@nolsaf/prisma";

type DbLike = typeof prisma;

type AvailabilityBlockLike = {
  id: number;
  source?: string | null;
  notes?: string | null;
  [key: string]: any;
};

type GroupStayHoldInput = {
  id: number;
  confirmedPropertyId?: number | null;
  assignedOwnerId?: number | null;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  roomsNeeded?: number | null;
};

export function groupStayHoldNotes(groupBookingId: number) {
  return `Reserved for group stay request #${groupBookingId}`;
}

function groupBookingIdFromBlock(block: AvailabilityBlockLike): number | null {
  if (String(block.source || "").toUpperCase() !== "GROUP_STAY") return null;
  const match = String(block.notes || "").match(/group stay request #(\d+)/i);
  const id = match ? Number(match[1]) : NaN;
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function filterPayableAvailabilityBlocks<T extends AvailabilityBlockLike>(
  blocks: T[],
  db: DbLike = prisma,
): Promise<T[]> {
  const groupBookingIds = Array.from(
    new Set(
      blocks
        .map(groupBookingIdFromBlock)
        .filter((id): id is number => typeof id === "number"),
    ),
  );

  if (!groupBookingIds.length) {
    return blocks.filter((block) => String(block.source || "").toUpperCase() !== "GROUP_STAY");
  }

  const paidGroupBookings = await (db as any).groupBooking.findMany({
    where: {
      id: { in: groupBookingIds },
      depositPaid: true,
    },
    select: { id: true },
  });
  const paidIds = new Set(paidGroupBookings.map((booking: { id: number }) => booking.id));

  return blocks.filter((block) => {
    const source = String(block.source || "").toUpperCase();
    if (source !== "GROUP_STAY") return true;
    const groupBookingId = groupBookingIdFromBlock(block);
    return groupBookingId != null && paidIds.has(groupBookingId);
  });
}

export async function ensurePaidGroupStayAvailabilityBlock(groupBooking: GroupStayHoldInput, db: DbLike = prisma) {
  if (!groupBooking.confirmedPropertyId || !groupBooking.assignedOwnerId || !groupBooking.checkIn || !groupBooking.checkOut) {
    return;
  }

  const notes = groupStayHoldNotes(groupBooking.id);
  await (db as any).propertyAvailabilityBlock.deleteMany({
    where: {
      propertyId: groupBooking.confirmedPropertyId,
      source: "GROUP_STAY",
      notes,
    },
  });

  await (db as any).propertyAvailabilityBlock.create({
    data: {
      propertyId: groupBooking.confirmedPropertyId,
      ownerId: groupBooking.assignedOwnerId,
      startDate: groupBooking.checkIn,
      endDate: groupBooking.checkOut,
      source: "GROUP_STAY",
      notes,
      bedsBlocked: groupBooking.roomsNeeded || 1,
    },
  });
}
