export type AfricaCountryGroup = "EAST_AFRICA" | "SOUTHERN_AFRICA";

export type AfricaCountryOption = {
  value: string;
  label: string;
  group: AfricaCountryGroup;
};

// Pinned to the top of the selector (per product requirement)
export const PINNED_NATIONALITIES: AfricaCountryOption[] = [
  { value: "Tanzania", label: "Tanzania", group: "EAST_AFRICA" },
  { value: "Kenya", label: "Kenya", group: "EAST_AFRICA" },
  { value: "Uganda", label: "Uganda", group: "EAST_AFRICA" },
  { value: "Rwanda", label: "Rwanda", group: "EAST_AFRICA" },
];

export const EAST_AFRICA_COUNTRIES: AfricaCountryOption[] = [
  { value: "Burundi", label: "Burundi", group: "EAST_AFRICA" },
  { value: "Democratic Republic of the Congo", label: "Democratic Republic of the Congo", group: "EAST_AFRICA" },
  { value: "Djibouti", label: "Djibouti", group: "EAST_AFRICA" },
  { value: "Eritrea", label: "Eritrea", group: "EAST_AFRICA" },
  { value: "Ethiopia", label: "Ethiopia", group: "EAST_AFRICA" },
  { value: "Somalia", label: "Somalia", group: "EAST_AFRICA" },
  { value: "South Sudan", label: "South Sudan", group: "EAST_AFRICA" },
  // Include pinned countries here too so the full list remains complete.
  ...PINNED_NATIONALITIES,
];

export const SOUTHERN_AFRICA_COUNTRIES: AfricaCountryOption[] = [
  { value: "Angola", label: "Angola", group: "SOUTHERN_AFRICA" },
  { value: "Botswana", label: "Botswana", group: "SOUTHERN_AFRICA" },
  { value: "Eswatini", label: "Eswatini", group: "SOUTHERN_AFRICA" },
  { value: "Lesotho", label: "Lesotho", group: "SOUTHERN_AFRICA" },
  { value: "Madagascar", label: "Madagascar", group: "SOUTHERN_AFRICA" },
  { value: "Malawi", label: "Malawi", group: "SOUTHERN_AFRICA" },
  { value: "Mauritius", label: "Mauritius", group: "SOUTHERN_AFRICA" },
  { value: "Mozambique", label: "Mozambique", group: "SOUTHERN_AFRICA" },
  { value: "Namibia", label: "Namibia", group: "SOUTHERN_AFRICA" },
  { value: "South Africa", label: "South Africa", group: "SOUTHERN_AFRICA" },
  { value: "Zambia", label: "Zambia", group: "SOUTHERN_AFRICA" },
  { value: "Zimbabwe", label: "Zimbabwe", group: "SOUTHERN_AFRICA" },
];

export const AFRICA_NATIONALITY_OPTIONS: AfricaCountryOption[] = [
  ...PINNED_NATIONALITIES,
  ...EAST_AFRICA_COUNTRIES.filter((c) => !PINNED_NATIONALITIES.some((p) => p.value === c.value)),
  ...SOUTHERN_AFRICA_COUNTRIES,
];

export const AFRICA_NATIONALITY_VALUES = new Set(
  AFRICA_NATIONALITY_OPTIONS.map((c) => c.value)
);
