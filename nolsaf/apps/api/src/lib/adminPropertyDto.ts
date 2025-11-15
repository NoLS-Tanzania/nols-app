export function toAdminPropertyDTO(p: any) {
  return {
    id: p.id,
    status: p.status,
    title: p.title,
    type: p.type,
    owner: p.owner ? { id: p.owner.id, name: p.owner.name, email: p.owner.email } : null,
    location: {
      regionId: p.regionId, regionName: p.regionName, district: p.district,
      street: p.street, city: p.city, zip: p.zip, country: p.country,
      lat: p.latitude, lng: p.longitude,
    },
    photos: p.photos ?? [],
    roomsSpec: p.roomsSpec ?? [],
    services: p.services ?? {},
    basePrice: p.basePrice,
    currency: p.currency,
    layout: p.layout ?? null,
    createdAt: p.createdAt, updatedAt: p.updatedAt,
    lastSubmittedAt: p.lastSubmittedAt ?? null,
    rejectionReasons: p.rejectionReasons ?? [],
  };
}
