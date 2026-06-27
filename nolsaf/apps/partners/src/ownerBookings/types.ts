export type OwnerBookingStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "PENDING_CHECKIN"
  | "CANCELLED"
  | "CANCELED"
  | string;

export type OwnerBooking = {
  id: number;
  property?: { id?: number; title?: string | null } | string | null;
  propertyId?: number | null;
  code?: { codeVisible?: string | null; usedAt?: string | null; status?: string | null } | null;
  codeVisible?: string | null;
  guestName?: string | null;
  customerName?: string | null;
  guestPhone?: string | null;
  phone?: string | null;
  guestEmail?: string | null;
  roomType?: string | null;
  roomCode?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  status?: OwnerBookingStatus | null;
  totalAmount?: number | string | null;
  transportFare?: number | string | null;
  ownerBaseAmount?: number | string | null;
  validatedAt?: string | null;
  checkedInAt?: string | null;
  checkoutConfirmedAt?: string | null;
  overdueHours?: number | null;
  overdueDays?: number | null;
  checkoutTiming?: "OVERDUE" | "NORMAL" | "UNKNOWN" | string | null;
  createdAt?: string | null;
};

export type OwnerBookingLane = "all" | "recent" | "checkedIn" | "checkoutDue" | "checkedOut";

export type OwnerBookingCounts = {
  all: number;
  recent: number;
  checkedIn: number;
  checkoutDue: number;
  checkedOut: number;
};

export type BookingValidationPreview = {
  bookingId: number;
  code?: string | null;
  property: { id: number; title: string; type: string };
  personal: {
    fullName: string;
    phone: string;
    nationality: string;
    sex: string;
    ageGroup: string;
  };
  booking: {
    roomType: string;
    rooms: number;
    nights: number;
    checkIn: string;
    checkOut: string;
    status: string;
    totalAmount: string;
    transportFare?: string;
    ownerBaseAmount?: string;
    includeTransport?: boolean;
  };
};

export type BookingValidationEligibility =
  | { canValidate: true; status: "IN_WINDOW"; reason?: undefined }
  | {
      canValidate: false;
      status: "BEFORE_CHECKIN" | "AFTER_CHECKOUT" | "INVALID_DATES" | "CODE_NOT_ACTIVE" | string;
      reason: string;
    };

export type BookingValidationResponse = {
  ok?: boolean;
  details?: BookingValidationPreview | null;
  eligibility?: BookingValidationEligibility | null;
};
