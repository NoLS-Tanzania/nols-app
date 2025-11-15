export type GroupBy = "day" | "week" | "month";

export function startOfDayTZ(d: Date) {
  const dt = new Date(d); dt.setHours(0,0,0,0); return dt;
}
export function addDays(d: Date, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate()+n); return dt;
}
export function fmtKey(d: Date, g: GroupBy) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
  if (g === "day") return `${y}-${m}-${day}`;
  if (g === "week") return `${y}-W${weekOfYear(d)}`;
  return `${y}-${m}`; // month
}
function weekOfYear(d: Date) {
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const diff = (startOfDayTZ(d).getTime() - startOfDayTZ(oneJan).getTime()) / (86400*1000);
  return Math.ceil((diff + oneJan.getDay()+1) / 7);
}
export function eachDay(from: Date, to: Date) {
  const days: Date[] = [];
  for (let d = startOfDayTZ(from); d <= to; d = addDays(d, 1)) days.push(new Date(d));
  return days;
}
