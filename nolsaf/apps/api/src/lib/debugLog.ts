export async function debugLog(_line: Record<string, unknown>) {
  // Intentionally a no-op.
  // Debug file logging caused stability issues (writes into .cursor, local-only side effects).
}


