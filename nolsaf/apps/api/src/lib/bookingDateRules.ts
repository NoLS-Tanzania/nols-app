const DEFAULT_BOOKING_TIME_ZONE = "Africa/Dar_es_Salaam";

function calendarDateKey(date: Date, timeZone = DEFAULT_BOOKING_TIME_ZONE): string | null {
  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return year && month && day ? `${year}-${month}-${day}` : null;
}

export function isCheckInBeforeToday(
  checkIn: Date,
  now: Date = new Date(),
  timeZone = DEFAULT_BOOKING_TIME_ZONE
): boolean {
  const checkInDay = calendarDateKey(checkIn, timeZone);
  const today = calendarDateKey(now, timeZone);

  if (!checkInDay || !today) {
    return true;
  }

  return checkInDay < today;
}
