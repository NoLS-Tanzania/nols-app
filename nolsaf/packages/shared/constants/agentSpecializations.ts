export const AGENT_SPECIALIZATIONS = [
  "Safari Tours",
  "Beach Holidays",
  "Cultural Tours",
  "Mountain Trekking",
  "City Tours",
  "Group Travel",
  "Honeymoon",
  "Family Travel",
  "Luxury Travel",
  "Budget Travel",
  "Corporate Travel",
  "Adventure Travel",
] as const;

export const AGENT_SPECIALIZATION_VALUES = new Set<string>(AGENT_SPECIALIZATIONS as readonly string[]);
