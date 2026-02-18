export type BookingValidationWindowStatus =
  | {
      canValidate: true;
      status: "IN_WINDOW";
      reason?: undefined;
    }
  | {
      canValidate: false;
      status: "BEFORE_CHECKIN" | "AFTER_CHECKOUT" | "INVALID_DATES";
      reason: string;
    };

function startOfDayLocal(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatLocalDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Booking-code validation is only allowed within the calendar-date window:
 * check-in date <= today <= check-out date.
 */
export function getBookingValidationWindowStatus(
  checkIn: Date,
  checkOut: Date,
  now: Date = new Date()
): BookingValidationWindowStatus {
  const checkInDay = startOfDayLocal(checkIn);
  const checkOutDay = startOfDayLocal(checkOut);
  const today = startOfDayLocal(now);

  if (!Number.isFinite(checkInDay.getTime()) || !Number.isFinite(checkOutDay.getTime())) {
    return { canValidate: false, status: "INVALID_DATES", reason: "Invalid booking dates." };
  }

  if (checkOutDay.getTime() < checkInDay.getTime()) {
    return { canValidate: false, status: "INVALID_DATES", reason: "Invalid booking dates." };
  }

  if (today.getTime() < checkInDay.getTime()) {
    return {
      canValidate: false,
      status: "BEFORE_CHECKIN",
      reason: `Check-in is on ${formatLocalDate(checkInDay)}. You can validate this booking code on the check-in date.`,
    };
  }

  if (today.getTime() > checkOutDay.getTime()) {
    return {
      canValidate: false,
      status: "AFTER_CHECKOUT",
      reason: `Check-out was on ${formatLocalDate(checkOutDay)}. This booking code can no longer be validated after check-out.`,
    };
  }

  return { canValidate: true, status: "IN_WINDOW" };
}
