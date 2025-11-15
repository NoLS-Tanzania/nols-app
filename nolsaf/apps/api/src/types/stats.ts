export interface SeriesResponse {
  labels: string[];
  data: number[];
}

export interface BreakdownResponse {
  labels: string[];
  data: number[];
}

export interface OverviewResponse {
  grossAmount: number;
  companyRevenue: number;
  propertiesCount: number;
  ownersCount: number;
  lastUpdated: string;
}

export interface TimeRangeParams {
  from?: string;
  to?: string;
  region?: string;
  groupBy?: string;
}
