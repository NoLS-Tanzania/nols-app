/**
 * Tanzania phone helpers, ported from the web booking flow.
 * The API expects +255XXXXXXXXX. We accept the common local forms and
 * normalize, returning null when the number can't be a valid TZ mobile.
 */

export function normalizeTzPhone(value: string): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const compact = raw.replace(/\s+/g, "").replace(/-/g, "");
  const digits = compact.replace(/^\+/, "").replace(/\D+/g, "");

  // 9 digits => local without the leading 0 (e.g. 7XXXXXXXX)
  if (digits.length === 9) return `+255${digits}`;
  // 0XXXXXXXXX
  if (digits.length === 10 && digits.startsWith("0")) return `+255${digits.slice(1)}`;
  // 255XXXXXXXXX or +255XXXXXXXXX
  if (digits.length === 12 && digits.startsWith("255")) return `+255${digits.slice(3)}`;

  return null;
}

/** Keep typing friendly: allow digits, spaces and a single leading +. */
export function sanitizePhoneInput(value: string): string {
  const keep = String(value ?? "").replace(/[^0-9+\s-]/g, "");
  const compact = keep.replace(/-/g, " ").replace(/\s+/g, " ");
  return compact.replace(/\+/g, (m, offset) => (offset === 0 ? m : ""));
}

/**
 * Phone entry policy: keep an optional leading +, digits only, and cap to the
 * exact length a valid Tanzania mobile needs for the prefix being typed, so a
 * user can never enter a runaway string of digits.
 *   +255 / 255 + 9 digits  -> 12 digits
 *   0 + 9 digits           -> 10 digits
 *   7 + 8 digits           -> 9 digits
 */
export function capTzPhoneInput(value: string): string {
  const raw = String(value ?? "").trim();
  const hasPlus = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");

  let max = 9;
  if (hasPlus || digits.startsWith("255")) max = 12;
  else if (digits.startsWith("0")) max = 10;

  digits = digits.slice(0, max);
  return (hasPlus ? "+" : "") + digits;
}
