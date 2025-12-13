export function toAdminPropertyDTO(p: any) {
  return {
    id: p.id,
    status: p.status,
    title: p.title,
    type: p.type,
    description: p.description ?? null,
    hotelStar: p.hotelStar ?? null,
    owner: p.owner ? { id: p.owner.id, name: p.owner.name, email: p.owner.email, phone: p.owner.phone ?? null } : null,
    location: {
      regionId: p.regionId, regionName: p.regionName, district: p.district,
      street: p.street, apartment: p.apartment ?? null, city: p.city, zip: p.zip, country: p.country,
      lat: p.latitude, lng: p.longitude, ward: p.ward ?? null,
    },
    photos: p.photos ?? [],
    roomsSpec: p.roomsSpec ?? [],
    services: Array.isArray(p.services) ? p.services : (p.services ?? []),
    basePrice: p.basePrice,
    currency: p.currency,
    totalBedrooms: p.totalBedrooms ?? null,
    totalBathrooms: p.totalBathrooms ?? null,
    maxGuests: p.maxGuests ?? null,
    layout: p.layout ?? null,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
    lastSubmittedAt: p.lastSubmittedAt ?? null,
    rejectionReasons: p.rejectionReasons ?? [],
  };
}
