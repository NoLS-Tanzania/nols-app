export function toAdminPropertyDTO(p: any) {
  return {
    id: p.id,
    status: p.status,
    title: p.title,
    type: p.type,
    description: p.description ?? null,
    hotelStar: p.hotelStar ?? null,
    buildingType: p.buildingType ?? null,
    totalFloors: p.totalFloors ?? null,
    owner: p.owner ? { id: p.owner.id, name: p.owner.name, email: p.owner.email, phone: p.owner.phone ?? null } : null,
    location: {
      regionId: p.regionId, regionName: p.regionName, district: p.district,
      street: p.street, apartment: p.apartment ?? null, city: p.city, zip: p.zip, country: p.country,
      lat: p.latitude, lng: p.longitude, ward: p.ward ?? null,
    },
    photos: p.photos ?? [],
    roomsSpec: p.roomsSpec ?? [],
    services: p.services ?? null, // Preserve full services object (may contain commissionPercent, discountRules)
    basePrice: p.basePrice,
    currency: p.currency,
    totalBedrooms: p.totalBedrooms ?? null,
    totalBathrooms: p.totalBathrooms ?? null,
    maxGuests: p.maxGuests ?? null,
    layout: p.layout ?? null,
    // Convert Date objects to ISO strings for JSON serialization
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
    lastSubmittedAt: p.lastSubmittedAt instanceof Date ? p.lastSubmittedAt.toISOString() : (p.lastSubmittedAt ?? null),
    rejectionReasons: p.rejectionReasons ?? [],
  };
}
