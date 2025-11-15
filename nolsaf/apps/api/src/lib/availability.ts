export async function invalidateAvailability(propertyId: number) {
  try {
    // If you used Redis for availability keys, delete patterns here.
    console.log("[cache] invalidate availability for property", propertyId);
  } catch {}
}
