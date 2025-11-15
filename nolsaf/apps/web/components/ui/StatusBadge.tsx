"use client";

export function StatusBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    NEW: "border-slate-300 text-slate-700",
    CONFIRMED: "border-brand-300 text-brand-700",
    CHECKED_IN: "border-emerald-300 text-emerald-700",
  // treat pending check-in as checked in in the UI
  PENDING_CHECKIN: "border-emerald-300 text-emerald-700",
    CHECKED_OUT: "border-sky-300 text-sky-700",
    CANCELED: "border-rose-300 text-rose-700",
    REQUESTED: "border-slate-300 text-slate-700",
    VERIFIED: "border-blue-300 text-blue-700",
    APPROVED: "border-indigo-300 text-indigo-700",
    PAID: "border-emerald-300 text-emerald-700",
    REJECTED: "border-rose-300 text-rose-700",
    DRAFT: "border-slate-300 text-slate-700",
    PENDING: "border-amber-300 text-amber-700",
    SUSPENDED: "border-red-300 text-red-700",
  };
  const label = (code: string) => {
    switch (code) {
      case "NEW":
        return "New";
      case "CONFIRMED":
        return "Confirmed";
      case "CHECKED_IN":
        return "Checked in";
      case "PENDING_CHECKIN":
        return "Checked in";
      case "CHECKED_OUT":
        return "Checked out";
      case "CANCELED":
        return "Canceled";
      case "REQUESTED":
        return "Requested";
      case "VERIFIED":
        return "Verified";
      case "APPROVED":
        return "Approved";
      case "PAID":
        return "Paid";
      case "REJECTED":
        return "Rejected";
      case "DRAFT":
        return "Draft";
      case "PENDING":
        return "Pending";
      case "SUSPENDED":
        return "Suspended";
      default:
        return code ? code.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (t) => t.toUpperCase()) : "Unknown";
    }
  };

  return (
    <span className={`badge ${map[s] || "border-slate-300 text-slate-700"}`} title={label(s)} aria-label={`Status: ${label(s)}`}>
      {label(s)}
    </span>
  );
}

export default StatusBadge;
