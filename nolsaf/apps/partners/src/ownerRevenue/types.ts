export type OwnerRevenueSegment = "all" | "requested" | "paid" | "rejected";

export type OwnerRevenueStats = {
  totalRevenue: number;
  paidRevenue: number;
  pendingRevenue: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
};

export type OwnerRevenueInvoice = {
  id: number;
  invoiceNumber: string;
  status: string;
  title?: string | null;
  createdAt?: string | null;
  issuedAt?: string | null;
  verifiedAt?: string | null;
  approvedAt?: string | null;
  paidAt?: string | null;
  total?: number | string | null;
  netPayable?: number | string | null;
  receiptNumber?: string | null;
  paymentMethod?: string | null;
  paymentRef?: string | null;
  bookingId?: number | null;
  senderName?: string | null;
  senderPhone?: string | null;
  senderAddress?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
  receiverAddress?: string | null;
  owner?: {
    fullName?: string | null;
    name?: string | null;
    phone?: string | null;
    city?: string | null;
  } | null;
  booking?: {
    id?: number | null;
    bookingId?: number | null;
    checkIn?: string | null;
    checkOut?: string | null;
    guestName?: string | null;
    guestPhone?: string | null;
    user?: {
      fullName?: string | null;
      name?: string | null;
      phone?: string | null;
    } | null;
    totalAmount?: number | string | null;
    transportFare?: number | string | null;
    property?: {
      id?: number | null;
      title?: string | null;
      type?: string | null;
      regionName?: string | null;
      district?: string | null;
      city?: string | null;
      country?: string | null;
      services?: unknown;
    } | null;
    code?: {
      codeVisible?: string | null;
      code?: string | null;
    } | null;
  } | null;
  rejectedReason?: string | null;
  rejectionReason?: string | null;
};

export type OwnerRevenueInvoicesResponse = {
  items?: OwnerRevenueInvoice[];
  hasMore?: boolean;
  nextBeforeId?: number | null;
};

export type OwnerRevenueReceipt = {
  invoice?: OwnerRevenueInvoice;
  qrPayload?: unknown;
};
