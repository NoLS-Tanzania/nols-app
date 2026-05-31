type OperatorProfileSeedContext = {
  fullName?: unknown;
  email?: unknown;
  phone?: unknown;
  region?: unknown;
  district?: unknown;
};

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function asFleetVehicles(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;
      const vehicle = item as Record<string, unknown>;
      const type = toText(vehicle.type);
      if (!type) return null;

      return {
        id: `seed-${index}-${type.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "vehicle"}`,
        type,
        quantity: Number.isFinite(Number(vehicle.count)) ? String(Number(vehicle.count)) : "",
        seatsPerVehicle: Number.isFinite(Number(vehicle.capacity)) ? String(Number(vehicle.capacity)) : "",
        registrationNumber: toText(vehicle.registrationNumber),
        ownedBy: toText(vehicle.ownership),
        serviceMode: toText(vehicle.serviceMode),
        notes: toText(vehicle.condition),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;
}

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

export function buildOperatorProfileSeed(applicationData: unknown, context: OperatorProfileSeedContext = {}): Record<string, unknown> {
  const source = applicationData && typeof applicationData === "object" && !Array.isArray(applicationData)
    ? (applicationData as Record<string, unknown>)
    : {};
  const partnership = source.partnershipProfile && typeof source.partnershipProfile === "object" && !Array.isArray(source.partnershipProfile)
    ? (source.partnershipProfile as Record<string, unknown>)
    : null;

  if (!partnership) return {};

  const seed: Record<string, unknown> = {};
  const contactPersonName = toText(partnership.contactPersonName) || toText(context.fullName);
  const contactPersonEmail = toText(partnership.contactPersonEmail) || toText(context.email);
  const contactPersonPhone = toText(partnership.contactPersonPhone) || toText(context.phone);
  const contactPersonNationality = toText(partnership.contactPersonNationality);
  const companyName = toText(partnership.companyName) || toText(context.fullName);
  const businessAddress = toText(partnership.businessAddress);
  const companyEmail = toText(partnership.companyEmail) || toText(context.email);
  const companyPhone = toText(partnership.companyPhone) || toText(context.phone);
  const companyWebsite = toText(partnership.companyWebsite);
  const businessRegistrationNumber = toText(partnership.businessRegistrationNumber);
  const tinNumber = toText(partnership.tinNumber);
  const businessLicenseNumber = toText(partnership.businessLicenseNumber);
  const tourismPermitNumber = toText(partnership.tourismPermitNumber ?? partnership.tourismLicenseNumber);
  const vehiclePermitNumber = toText(partnership.vehiclePermitNumber);
  const yearsInOperation = Number.isFinite(Number(partnership.yearsInOperation)) ? Number(partnership.yearsInOperation) : null;
  const teamSize = Number.isFinite(Number(partnership.teamSize)) ? Number(partnership.teamSize) : null;
  const languages = toText(partnership.languages);
  const serviceClassification = partnership.serviceClassification && typeof partnership.serviceClassification === "object" && !Array.isArray(partnership.serviceClassification)
    ? Object.fromEntries(
        Object.entries(partnership.serviceClassification as Record<string, unknown>)
          .map(([key, values]) => [String(key), asStrings(values)])
          .filter(([, values]) => Array.isArray(values) && values.length > 0),
      )
    : {};
  const registeredParks = asStrings(partnership.registeredParks);
  const hasVehicles = typeof partnership.hasVehicles === "boolean"
    ? partnership.hasVehicles
    : asFleetVehicles(partnership.fleet ?? partnership.vehicles).length > 0;
  const region = toText(context.region);
  const district = toText(context.district);
  const operatingRegion = asStrings(partnership.operatingRegions).length > 0
    ? asStrings(partnership.operatingRegions)
    : region || district
      ? [region && district ? `${region} / ${district}` : region || district].filter(Boolean)
      : [];
  const physicalLocation = toText(partnership.physicalLocation) || (operatingRegion[0] ?? "");

  const tourismTypes = asStrings(partnership.tourismTypes);
  const tools = asStrings(partnership.toolsAndAssets ?? partnership.tools);
  const services = asStrings(partnership.services);
  const specializations = asStrings(source.specializations ?? partnership.specializations);
  const vehicles = asFleetVehicles(partnership.fleet ?? partnership.vehicles);

  if (contactPersonName) seed.contactPersonName = contactPersonName;
  if (contactPersonEmail) seed.contactPersonEmail = contactPersonEmail;
  if (contactPersonPhone) seed.contactPersonPhone = contactPersonPhone;
  if (contactPersonNationality) seed.contactPersonNationality = contactPersonNationality;
  if (companyName) seed.companyName = companyName;
  if (businessAddress) seed.businessAddress = businessAddress;
  if (physicalLocation) seed.physicalLocation = physicalLocation;
  if (companyEmail) seed.companyEmail = companyEmail;
  if (companyPhone) {
    seed.companyPhone = companyPhone;
    seed.contactPhone = companyPhone;
    seed.whatsapp = companyPhone;
  }
  if (companyWebsite) seed.companyWebsite = companyWebsite;
  if (businessRegistrationNumber) seed.businessRegistrationNumber = businessRegistrationNumber;
  if (tinNumber) seed.tinNumber = tinNumber;
  if (businessLicenseNumber) seed.businessLicenseNumber = businessLicenseNumber;
  if (tourismPermitNumber) seed.tourismPermitNumber = tourismPermitNumber;
  if (vehiclePermitNumber) seed.vehiclePermitNumber = vehiclePermitNumber;
  if (yearsInOperation != null) seed.yearsInOperation = yearsInOperation;
  if (teamSize != null) seed.teamSize = teamSize;
  if (languages) seed.languages = languages;
  if (Object.keys(serviceClassification).length > 0) seed.serviceClassification = serviceClassification;
  if (registeredParks.length > 0) seed.registeredParks = registeredParks;
  seed.hasVehicles = hasVehicles;
  if (operatingRegion.length > 0) seed.operatingRegions = operatingRegion;
  if (tourismTypes.length > 0) seed.tourismTypes = tourismTypes;
  if (tools.length > 0) seed.tools = tools;
  if (services.length > 0) seed.services = services;
  if (specializations.length > 0) seed.specializations = specializations;
  if (vehicles.length > 0) seed.vehicles = vehicles;

  return seed;
}

export function mergeOperatorProfileSeed(existingProfile: unknown, seed: Record<string, unknown>): Record<string, unknown> {
  const current = existingProfile && typeof existingProfile === "object" && !Array.isArray(existingProfile)
    ? { ...(existingProfile as Record<string, unknown>) }
    : {};

  for (const [key, value] of Object.entries(seed)) {
    if (isBlank(current[key])) {
      current[key] = value;
    }
  }

  return current;
}
