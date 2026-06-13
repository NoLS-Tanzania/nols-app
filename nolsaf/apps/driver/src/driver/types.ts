export type PeakHours = {
  active: boolean;
  start: string;
  end: string;
  multiplier: number;
  timeLeft: string;
} | null;

export type EarningsChartPoint = {
  day: string;
  amount: number;
};

export type TripsChartPoint = {
  hour: string;
  trips: number;
};

export type DemandZone = {
  name: string;
  level: "high" | "medium" | "low";
};

export type RecentTrip = {
  id: string;
  time: string;
  from: string;
  to: string;
  distance: string;
  amount: number;
};

export type DashboardReminder = {
  id: string;
  type: "warning" | "info";
  message: string;
  action?: string;
  actionLink?: string;
};

export type DashboardResponse = {
  todayGoal: number;
  todayEarnings: number;
  goalProgress: number;
  todaysRides: number;
  acceptanceRate: number;
  earningsBreakdown: {
    base: number;
    tips: number;
    bonus: number;
  };
  rating: number;
  totalReviews: number;
  onlineHours: number;
  peakHours: PeakHours;
  earningsChart: EarningsChartPoint[];
  tripsChart: TripsChartPoint[];
  demandZones: DemandZone[];
  recentTrips: RecentTrip[];
  reminders: DashboardReminder[];
};

export type AvailabilityResponse = {
  ok: boolean;
  available: boolean;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  kind: "reminder" | "notification";
  severity: "warning" | "info";
  action?: string | null;
  actionLink?: string | null;
  sourceLabel?: string | null;
};

export type NotificationsResponse = {
  items: NotificationItem[];
  total: number;
  totalUnread: number;
  totalViewed: number;
  page: number;
  pageSize: number;
};

export type TripStatus = "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED";

export type TripListItem = {
  id: number;
  date: string | null;
  scheduledDate: string | null;
  pickupTime: string | null;
  dropoffTime: string | null;
  pickup: string | null;
  dropoff: string | null;
  tripCode: string | null;
  amount: number | null;
  currency: string;
  status: TripStatus;
  assignmentSource: "ADMIN" | "AUTO";
};

export type TripsResponse = {
  total: number;
  page: number;
  pageSize: number;
  trips: TripListItem[];
};

export type TripDetail = {
  id: number;
  status: TripStatus;
  scheduledDate: string | null;
  pickupTime: string | null;
  dropoffTime: string | null;
  pickup: string | null;
  dropoff: string | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  passengerUserId: number;
  passengerName: string | null;
  phoneNumber: string | null;
  tripCode: string | null;
  amount: number | null;
  currency: string | null;
  paymentStatus: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  messagesCount: number;
  locationPingsCount: number;
  assignmentSource: "ADMIN" | "AUTO";
};

export type TripStage =
  | "arrived_at_pickup"
  | "passenger_picked_up"
  | "in_transit"
  | "arrived_at_destination"
  | "completed";

export const TRIP_STAGE_FLOW: TripStage[] = [
  "arrived_at_pickup",
  "passenger_picked_up",
  "in_transit",
  "arrived_at_destination",
  "completed"
];

export const TRIP_STAGE_LABELS: Record<TripStage, string> = {
  arrived_at_pickup: "Arrived at pickup",
  passenger_picked_up: "Start trip",
  in_transit: "On the way",
  arrived_at_destination: "Arrived at destination",
  completed: "Complete trip"
};

export type TripStageResponse = {
  ok: boolean;
  trip: {
    id: number;
    stage: TripStage;
    status: TripStatus;
    pickupTime: string | null;
    dropoffTime: string | null;
    route: unknown;
    at: string;
  };
};

export type MessageTemplate = {
  key: string;
  text: string;
};

export type ScheduledTripPassenger = {
  id: number;
  name: string;
  phone?: string;
  email?: string;
};

export type ScheduledTripProperty = {
  id: number;
  title: string;
  regionName?: string;
  district?: string;
  ward?: string;
};

export type ScheduledTripItem = {
  id: number;
  vehicleType?: string;
  claimCount: number;
  claimsRemaining: number;
  claimLimit: number;
  claimWindowHours: number;
  claimOpensAt: string;
  canClaim: boolean;
  claimIneligibilityReason?: string | null;
  scheduledDate: string;
  pickupTime?: string;
  fromAddress?: string;
  fromLatitude?: number;
  fromLongitude?: number;
  toAddress?: string;
  toLatitude?: number;
  toLongitude?: number;
  amount?: number;
  currency?: string;
  numberOfPassengers?: number;
  arrivalType?: string;
  arrivalNumber?: string;
  transportCompany?: string;
  arrivalTime?: string;
  pickupLocation?: string;
  notes?: string;
  passenger?: ScheduledTripPassenger;
  property?: ScheduledTripProperty;
  tripCode: string;
  createdAt: string;
};

export type ScheduledTripsResponse = {
  items: ScheduledTripItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ClaimItem = ScheduledTripItem & {
  claimId: number;
  claimStatus: string;
  claimCreatedAt: string;
};

export type ClaimsPendingResponse = {
  items: ClaimItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type FinishedClaimItem = ScheduledTripItem & {
  userRating?: number;
  userReview?: string;
  driverRating?: number;
  driverReview?: string;
};

export type ClaimsFinishedResponse = {
  items: FinishedClaimItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ClaimResponse = {
  ok: boolean;
  claim: {
    id: number;
    status: string;
    createdAt: string;
  };
  trip: unknown;
};

export type ReminderItem = {
  id: string;
  type: "INFO" | "WARNING";
  message: string;
  action?: string | null;
  actionLink?: string | null;
  expiresAt: string | null;
  isRead: boolean;
  createdAt: string;
  meta: Record<string, unknown>;
};

export type RatingSummary = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  rating: number | null;
  monthlyTrips: number;
  monthsOfService: number;
  completedTrips: number;
  cancelledTrips: number;
  activeDays: number;
  totalTrips: number;
};
