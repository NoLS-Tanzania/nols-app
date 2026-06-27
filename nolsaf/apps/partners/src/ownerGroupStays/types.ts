export type OwnerGroupStaySegment = "assigned" | "available" | "myBids";

export type OwnerGroupStayUser = {
  id?: number | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type OwnerGroupStay = {
  id: number;
  groupType?: string | null;
  accommodationType?: string | null;
  headcount?: number | null;
  roomsNeeded?: number | null;
  toRegion?: string | null;
  toDistrict?: string | null;
  toWard?: string | null;
  toLocation?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: string | null;
  arrPickup?: boolean | null;
  arrTransport?: boolean | null;
  arrMeals?: boolean | null;
  arrGuide?: boolean | null;
  arrEquipment?: boolean | null;
  pickupLocation?: string | null;
  pickupTime?: string | null;
  arrangementNotes?: string | null;
  totalAmount?: number | string | null;
  currency?: string | null;
  existingClaimsCount?: number | null;
  submissionDeadline?: string | null;
  minDiscountPercent?: number | null;
  minHotelStar?: number | null;
  createdAt?: string | null;
  user?: OwnerGroupStayUser | null;
  confirmedProperty?: {
    id?: number | null;
    title?: string | null;
    type?: string | null;
    status?: string | null;
  } | null;
};

export type OwnerGroupStayClaim = {
  id: number;
  groupBookingId: number;
  propertyId: number;
  offeredPricePerNight?: number | string | null;
  discountPercent?: number | string | null;
  specialOffers?: string | null;
  notes?: string | null;
  totalAmount?: number | string | null;
  currency?: string | null;
  status?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  groupBooking?: OwnerGroupStay | null;
  property?: {
    id?: number | null;
    title?: string | null;
    type?: string | null;
    regionName?: string | null;
  } | null;
};

export type OwnerGroupStayProperty = {
  id: number;
  title: string;
  type?: string | null;
  status?: string | null;
  regionName?: string | null;
  district?: string | null;
  hotelStar?: string | number | null;
  basePrice?: number | string | null;
  currency?: string | null;
  roomsSpec?: unknown;
  services?: unknown;
};

export type OwnerGroupStayCounts = {
  assigned: number;
  available: number;
  myBids: number;
};
