import { OwnerGroupStay, OwnerGroupStayClaim } from "./types";

export function formatGroupStayDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function formatGroupStayMoney(value?: number | string | null, currency = "TZS") {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${currency || "TZS"} ${n.toLocaleString()}`;
}

export function groupStayLocation(item: OwnerGroupStay | null | undefined) {
  return [item?.toLocation, item?.toWard, item?.toDistrict, item?.toRegion].filter(Boolean).join(", ") || "Destination not set";
}

export function groupStayTitle(item: OwnerGroupStay | null | undefined) {
  if (!item) return "Group stay";
  return `${item.groupType || "Group stay"} #${item.id}`;
}

export function groupStayDates(item: OwnerGroupStay | null | undefined) {
  const checkIn = formatGroupStayDate(item?.checkIn);
  const checkOut = formatGroupStayDate(item?.checkOut);
  if (checkIn === "-" && checkOut === "-") return "Dates not specified";
  return `${checkIn} - ${checkOut}`;
}

export function claimSearchText(claim: OwnerGroupStayClaim) {
  return [
    claim.status,
    claim.property?.title,
    claim.groupBooking?.toRegion,
    claim.groupBooking?.toDistrict,
    claim.groupBooking?.user?.name
  ].filter(Boolean).join(" ").toLowerCase();
}

export function staySearchText(stay: OwnerGroupStay) {
  return [
    stay.id,
    stay.status,
    stay.groupType,
    stay.accommodationType,
    stay.toRegion,
    stay.toDistrict,
    stay.toLocation,
    stay.user?.name
  ].filter(Boolean).join(" ").toLowerCase();
}
