type AnyRole = string | null | undefined;

type ActiveRecord = {
  role: string;
  lastSeenMs: number;
};

// In-memory presence/activity tracker.
// Definition: a user is considered "online" if they have been seen (HTTP or Socket.IO)
// within the configured active window (default 15 minutes).
//
// Note: This is process-local. In a multi-instance deployment, counts will be per instance
// unless backed by a shared store (e.g., Redis).
const activeByUserId = new Map<number, ActiveRecord>();

function normalizeRole(role: AnyRole): string {
  const raw = String(role || "").trim().toUpperCase();
  if (!raw) return "USER";
  if (raw === "CUSTOMER") return "USER";
  return raw;
}

function bucketRole(role: string): "admins" | "owners" | "drivers" | "users" {
  if (role === "ADMIN") return "admins";
  if (role === "OWNER") return "owners";
  if (role === "DRIVER") return "drivers";
  return "users";
}

export function touchActiveUser(userId: number, role: AnyRole) {
  if (!Number.isFinite(userId) || userId <= 0) return;
  activeByUserId.set(userId, { role: normalizeRole(role), lastSeenMs: Date.now() });
}

export function getActiveSnapshot(windowMs = 15 * 60 * 1000) {
  const cutoff = Date.now() - Math.max(0, windowMs);

  let total = 0;
  let users = 0;
  let drivers = 0;
  let owners = 0;
  let admins = 0;

  // Opportunistic cleanup to avoid unbounded growth.
  for (const [userId, rec] of activeByUserId.entries()) {
    if (!rec || !Number.isFinite(rec.lastSeenMs) || rec.lastSeenMs < cutoff) {
      activeByUserId.delete(userId);
      continue;
    }

    total += 1;
    const bucket = bucketRole(rec.role);
    if (bucket === "admins") admins += 1;
    else if (bucket === "owners") owners += 1;
    else if (bucket === "drivers") drivers += 1;
    else users += 1;
  }

  return {
    total,
    byRole: { users, drivers, owners, admins },
    windowMs,
    cutoff: new Date(cutoff).toISOString(),
  };
}
