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

export type PayoutItem = {
  id: number;
  invoiceId?: number;
  invoiceNumber?: string | null;
  tripCode: string | null;
  paidAt: string | null;
  paidTo: string | null;
  gross: number | null;
  commissionAmount: number | null;
  netPaid: number | null;
  receiptNumber: string | null;
};

export type PayoutsResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: PayoutItem[];
};

export type InvoiceStatus = "DRAFT" | "REQUESTED" | "VERIFIED" | "APPROVED" | "PAID" | "REJECTED" | "PROCESSING";

export type InvoiceItem = PayoutItem & {
  invoiceId: number;
  status: InvoiceStatus;
  issuedAt: string | null;
};

export type InvoicesResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: InvoiceItem[];
};

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, "pending" | "paid" | "failed" | "cancelled" | "completed" | "awaiting"> = {
  DRAFT: "pending",
  REQUESTED: "awaiting",
  VERIFIED: "awaiting",
  PROCESSING: "awaiting",
  APPROVED: "awaiting",
  PAID: "paid",
  REJECTED: "failed"
};

export type BonusStatus = "pending" | "approved" | "paid" | "rejected";

export type BonusHistoryItem = {
  id: string;
  date: string;
  amount: number;
  period: string;
  status: BonusStatus;
  reason?: string;
  paidAt?: string;
};

export const BONUS_STATUS_TONE: Record<BonusStatus, "pending" | "paid" | "failed" | "cancelled" | "completed" | "awaiting"> = {
  pending: "pending",
  approved: "awaiting",
  paid: "paid",
  rejected: "failed"
};

export type BonusEligibility = {
  eligible: boolean;
  currentPeriod: string;
  tripsRequired: number;
  tripsCompleted: number;
  ratingRequired: number;
  currentRating: number;
  earningsRequired: number;
  currentEarnings: number;
  nextBonusDate?: string;
  progress: {
    trips: number;
    rating: number;
    earnings: number;
  };
};

export type DriverPerformance = {
  driver: { id: number; name: string; email: string };
  metrics: {
    rating: number;
    completionRate: number;
    cancellationRate: number;
    meetsPerformanceExcellence: boolean;
    monthlyTrips: number;
    totalTrips: number;
    activeDaysThisMonth: number;
    meetsVolumeMilestone: boolean;
    monthsOfService: number;
    meetsLoyaltyCriteria: boolean;
  };
  progress: {
    performanceExcellence: { rating: number; completionRate: number; cancellationRate: number };
    volumeAchievement: { trips: number; activeDays: number };
    loyaltyRetention: { monthsOfService: number; activeDays: number };
  };
  period: { current: string; startOfMonth: string; endOfMonth: string };
  totalReviews: number;
};

export type DriverLevel = {
  currentLevel: number;
  levelName: string;
  nextLevel: number;
  nextLevelName: string;
  totalEarnings: number;
  earningsForNextLevel: number;
  totalTrips: number;
  tripsForNextLevel: number;
  averageRating: number;
  ratingForNextLevel: number;
  totalReviews: number;
  reviewsForNextLevel: number;
  goalsCompleted: number;
  goalsForNextLevel: number;
  progress: {
    earnings: number;
    trips: number;
    rating: number;
    reviews: number;
    goals: number;
  };
  levelBenefits: string[];
  nextLevelBenefits: string[];
};

export type SendLevelMessageResponse = {
  success: boolean;
  message: string;
};

export type ReferralListItem = {
  id: string;
  name: string;
  email: string;
  status: "pending" | "active" | "completed";
  joinedAt: string;
  registeredAt?: string;
  linkSharedAt?: string;
  region?: string;
  district?: string;
  spend?: number;
  creditsEarned: number;
};

export type DriverReferral = {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  activeReferrals: number;
  totalCredits: number;
  pendingCredits: number;
  referrals: ReferralListItem[];
};

export type ReferralEarningStatus = "PENDING" | "PAID_AS_BONUS" | "AVAILABLE_FOR_WITHDRAWAL" | "WITHDRAWN";

export type ReferralEarning = {
  id: number;
  amount: number;
  currency: string;
  status: ReferralEarningStatus;
  referredUser?: { id: number; name: string; email: string };
  createdAt: string;
  paidAsBonusAt?: string;
  availableAt?: string;
  withdrawnAt?: string;
};

export type ReferralEarningsSummary = {
  total: number;
  pending: number;
  paidAsBonus: number;
  availableForWithdrawal: number;
  withdrawn: number;
};

export type ReferralEarningsResponse = {
  earnings: ReferralEarning[];
  summary: ReferralEarningsSummary;
};

export const REFERRAL_EARNING_STATUS_TONE: Record<ReferralEarningStatus, "pending" | "paid" | "failed" | "cancelled" | "completed" | "awaiting"> = {
  PENDING: "pending",
  AVAILABLE_FOR_WITHDRAWAL: "awaiting",
  PAID_AS_BONUS: "paid",
  WITHDRAWN: "completed"
};

export type ReferralWithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "PAID";

export type ReferralWithdrawal = {
  id: number;
  totalAmount: number;
  currency: string;
  status: ReferralWithdrawalStatus;
  paymentMethod?: string;
  paymentRef?: string;
  rejectionReason?: string;
  createdAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  paidAt?: string;
};

export type ReferralWithdrawalsResponse = {
  withdrawals: ReferralWithdrawal[];
};

export const REFERRAL_WITHDRAWAL_STATUS_TONE: Record<ReferralWithdrawalStatus, "pending" | "paid" | "failed" | "cancelled" | "completed" | "awaiting"> = {
  PENDING: "pending",
  APPROVED: "awaiting",
  REJECTED: "failed",
  PAID: "paid"
};

export type ApplyWithdrawalResponse = {
  success: true;
  withdrawal: {
    id: number;
    totalAmount: number;
    currency: string;
    status: string;
    createdAt: string;
  };
};

export type ReferralPerformance = {
  driver: { id: number };
  referrals: {
    total: number;
    active: number;
    completed: number;
    conversionRate: number;
    avgCreditsPerReferral: number;
    list: Array<{ id: number; name: string; email: string; role: string; isActive: boolean; isCompleted: boolean; joinedAt: string }>;
  };
  earnings: {
    summary: ReferralEarningsSummary;
    monthly: number;
    yearly: number;
    recent: ReferralEarning[];
  };
  withdrawals: {
    summary: { total: number; pending: number; approved: number; rejected: number; paid: number };
    recent: ReferralWithdrawal[];
  };
  period: {
    current: string;
    startOfMonth: string;
    startOfYear: string;
  };
};

// Phase 4: Profile, management, security, and policies

export type DocumentType = "DRIVER_LICENSE" | "NATIONAL_ID" | "VEHICLE_REGISTRATION" | "INSURANCE";

export type DocumentStatus = "PENDING" | "APPROVED" | "REJECTED";

export const DOCUMENT_STATUS_TONE: Record<DocumentStatus, "pending" | "paid" | "failed" | "cancelled" | "completed" | "awaiting"> = {
  PENDING: "pending",
  APPROVED: "paid",
  REJECTED: "failed"
};

export type ProfileDocument = {
  id: number;
  type: DocumentType;
  url: string;
  status: DocumentStatus;
  metadata?: Record<string, unknown> | null;
  reason?: string | null;
  createdAt: string;
};

export type DriverProfile = {
  id: number;
  role: string;
  email: string;
  phone?: string | null;
  name?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
  timezone?: string | null;
  region?: string | null;
  district?: string | null;
  nationality?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: string | null;
  nin?: string | null;
  licenseNumber?: string | null;
  plateNumber?: string | null;
  vehicleType?: string | null;
  vehicleMake?: string | null;
  vehiclePlate?: string | null;
  operationArea?: string | null;
  paymentPhone?: string | null;
  paymentVerified?: boolean;
  isVipDriver?: boolean;
  kycStatus?: string | null;
  kycNote?: string | null;
  bankAccountName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankBranch?: string | null;
  mobileMoneyProvider?: string | null;
  mobileMoneyNumber?: string | null;
  payoutPreferred?: "BANK" | "MOBILE_MONEY" | null;
  drivingLicenseUrl?: string | null;
  nationalIdUrl?: string | null;
  latraUrl?: string | null;
  insuranceUrl?: string | null;
  documents?: ProfileDocument[];
  payout?: {
    profileExtras?: Record<string, unknown> | null;
  } | null;
};

export type UpdateProfileBody = Partial<{
  fullName: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  timezone: string | null;
  region: string | null;
  district: string | null;
  nationality: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nin: string | null;
  licenseNumber: string | null;
  plateNumber: string | null;
  vehiclePlate: string | null;
  vehicleType: string | null;
  vehicleMake: string | null;
  operationArea: string | null;
  paymentPhone: string | null;
}>;

export type UpdateProfileResponse = {
  ok: true;
  message: string;
};

export type PaymentMethodsResponse = {
  ok: true;
  data: {
    payout: {
      bankAccountName?: string | null;
      bankName?: string | null;
      bankAccountNumber?: string | null;
      bankBranch?: string | null;
      mobileMoneyProvider?: string | null;
      mobileMoneyNumber?: string | null;
      payoutPreferred?: "BANK" | "MOBILE_MONEY" | null;
      profileExtras?: {
        fullName?: string | null;
        name?: string | null;
        phone?: string | null;
        email?: string | null;
        region?: string | null;
        district?: string | null;
        timezone?: string | null;
        dateOfBirth?: string | null;
        nationality?: string | null;
        gender?: string | null;
        nin?: string | null;
        licenseNumber?: string | null;
        plateNumber?: string | null;
        vehiclePlate?: string | null;
        vehicleType?: string | null;
        vehicleMake?: string | null;
        operationArea?: string | null;
        paymentPhone?: string | null;
      };
    } | null;
    methods: Array<{ method: string; ref: string; paidAt: string }>;
  };
};

export type UpdatePayoutsBody = Partial<{
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankBranch: string | null;
  mobileMoneyProvider: string | null;
  mobileMoneyNumber: string | null;
  payoutPreferred: "BANK" | "MOBILE_MONEY";
}>;

export type UpdatePayoutsResponse = {
  ok: true;
  message: string;
};

export type UpdateDocumentBody = {
  type: DocumentType;
  url: string;
  metadata?: Record<string, unknown>;
};

export type UpdateDocumentResponse = {
  ok: true;
  data: { doc: ProfileDocument };
};

export type UploadFileResponse = {
  secure_url: string;
};

export type DeleteAccountResponse = {
  ok: true;
  message: string;
};

export type LicenseInfo = {
  url: string | null;
  number: string | null;
  expires: string | null;
};

export type TwoFactorStatus = {
  totpEnabled: boolean;
  smsEnabled: boolean;
  phone?: string | null;
};

export type TwoFactorProvisionResponse = {
  qr: string;
  secret: string;
  otpauth: string;
};

export type Update2FABody = {
  type: "totp";
  action: "enable" | "disable";
  code: string;
  secret?: string;
};

export type Update2FAResponse = {
  ok: true;
  backupCodes?: string[];
};

export type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResponse = {
  ok: true;
  data: { forceLogout: boolean; cooldownUntil?: string | null };
  message: string;
};

export type LoginHistoryRecord = {
  id: number | string;
  at: string;
  ip?: string | null;
  username?: string | null;
  platform?: string | null;
  details?: string | null;
  timeUsed?: string | null;
  success: boolean;
};

export type LoginHistoryResponse = {
  records: LoginHistoryRecord[];
};

// Phase 5: Live map and dispatch

export type DriverMapLocation = {
  lat: number;
  lng: number;
  headingDeg?: number | null;
  speedMps?: number | null;
  updatedAt?: string | null;
} | null;

export type DriverMapData = {
  driverLocation: DriverMapLocation;
  assignments: unknown[];
  nearbyDrivers: unknown[];
};

export type SafetyEventFlag = "HARD_BRAKING" | "HARSH_ACCELERATION" | "SPEEDING" | "RULE_VIOLATION" | string;

export type SafetyEvent = {
  id: string | number;
  date: string;
  flag: SafetyEventFlag;
  message?: string | null;
  tripCode?: string | null;
};

export type SafetyResponse = {
  items: SafetyEvent[];
};
