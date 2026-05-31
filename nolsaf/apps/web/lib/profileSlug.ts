export function slugifyProfile(name: string, agentId?: number | null) {
  const base = String(name || `agent-${agentId || "profile"}`)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "operator-profile"}${agentId ? `-${agentId}` : ""}`;
}
