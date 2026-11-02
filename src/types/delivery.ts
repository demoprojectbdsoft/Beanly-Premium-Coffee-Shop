/**
 * The delivery domain as the app reads it.
 *
 * The backend mirrors these names in `delivery.model.ts`; the rider screens
 * only ever see their own rows, and every id is a string by the time it
 * reaches the browser.
 */

export const DELIVERY_STATUSES = [
  "assigned",
  "accepted",
  "picked_up",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "declined",
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** The status shortcuts the API understands, on top of one exact stage. */
export type DeliveryStatusFilter = "all" | "active" | "finished" | DeliveryStatus;

/** The rider carrying a delivery, as the store and the buyer see them. */
export interface DeliveryRider {
  _id: string;
  name: string;
  phone: string;
  /** Avatar URL; empty when the rider never uploaded one. */
  image: string;
  vehicleType: string;
  vehicleNumber: string;
}

/** One line of a delivery's own history, oldest first. */
export interface DeliveryEvent {
  status: DeliveryStatus;
  at: string | null;
  note: string;
}

export interface DeliveryRecord {
  _id: string;
  orderId: string;
  /** "#ORD-A1B2C3" — the short form the dashboards show. */
  orderNumber: string;
  status: DeliveryStatus;
  customerName: string;
  customerPhone: string;
  address: string;
  city: string;
  items: number;
  orderTotal: number;
  /** What the rider is paid for this job. */
  fee: number;
  distanceKm: number | null;
  declineReason: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  pickedUpAt: string | null;
  outForDeliveryAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Null on the rider's own lists, filled in for the store and the buyer. */
  rider: DeliveryRider | null;
  history: DeliveryEvent[];
  /**
   * The order behind the job.
   *
   * Only the rider's detail read fills this in — the rows returned by a list
   * carry the delivery's own copy, which is the shorter version of the truth.
   */
  order?: DeliveryOrderDetails | null;
  /** The store the parcel comes from, on the same detail read. */
  pickup?: DeliveryPickupPoint | null;
}

/** A rider the store can pick from when it hands out a job. */
export interface AssignableRider {
  _id: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  availability: "online" | "offline";
  vehicleType: string;
  vehicleNumber: string;
  /** Jobs this rider is carrying right now. */
  activeJobs: number;
  completedJobs: number;
  /** Suspended riders stay on the list but cannot be handed a job. */
  suspended: boolean;
  available: boolean;
}

export interface AssignableRiderFeed {
  riders: AssignableRider[];
  /** The rider who already holds this order's live job, if any. */
  currentRiderId: string | null;
  /**
   * The job currently claiming this order, so the picker can say whose hands
   * the order is in instead of letting the store double-book a parcel. A request
   * whose answer window ran out is still reported, but flagged `expired`: it no
   * longer blocks a new rider.
   */
  currentDelivery: {
    _id: string;
    status: DeliveryStatus;
    riderId: string;
    /** Comes from the server, so the panel can name a rider even when the list is filtered. */
    riderName: string;
    fee: number;
    /** End of the answer window; only an unanswered request has one. */
    expiresAt: string | null;
    /** When the request was sent. */
    assignedAt: string;
    /** Whole minutes left to answer, counted by the server. Zero once accepted. */
    minutesLeft: number;
    expired: boolean;
  } | null;
}

/** The numbers at the top of the store's delivery board. */
export interface AdminDeliveryOverview {
  statusCounts: Partial<Record<DeliveryStatus, number>>;
  total: number;
  active: number;
  waiting: number;
  deliveredToday: number;
  onlineRiders: number;
  /** Shipped orders with no rider holding them — the store's fix list. */
  shippedWithoutRider: number;
  onTheRoad: number;
}

/** One position ping from the rider's phone. */
export interface DeliveryLocation {
  lat: number;
  lng: number;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  updatedAt: string;
  trail: { lat: number; lng: number; at: string | null }[];
}

export interface DeliveryEta {
  minutes: number;
  at: string;
}

/** The code the buyer reads at the door. Never present in a rider list. */
export interface DeliveryCode {
  code: string;
  expiresAt: string;
  expired: boolean;
  verified: boolean;
  attemptsLeft: number;
  regenerated: number;
}

export interface DeliveryTrackingOrder {
  _id: string;
  orderNumber: string;
  status: string;
  estimatedDelivery: string;
  shippingMethod: string;
  address: string;
  city: string;
  /** When the customer placed it, for the first step of the timeline. */
  createdAt: string;
}

/** One line on the rider's invoice PDF. */
export interface DeliveryInvoiceItem {
  title: string;
  quantity: number;
  price: number;
}

/** One line of the order behind a job, as the rider's detail view reads it. */
export interface DeliveryOrderLine {
  title: string;
  quantity: number;
  price: number;
  /** Product image URL; empty when the line was never given one. */
  image: string;
}

/**
 * The order as the rider sees it.
 *
 * Only ever present on the detail read: the lists stay light because a rider
 * scrolling their inbox needs the drop-off, not the money.
 */
export interface DeliveryOrderDetails {
  _id: string;
  orderNumber: string;
  placedAt: string;
  /** The sale's own stage, which the delivery can be behind or ahead of. */
  status: string;
  estimatedDelivery: string;
  shippingMethod: string;
  paymentMethod: string;
  /** What the rider collects at the door on a cash order; 0 when prepaid. */
  amountToCollect: number;
  address: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
  items: DeliveryOrderLine[];
  totals: {
    subtotal: number;
    shipping: number;
    discount: number;
    couponCode: string;
    pointsRedeemed: number;
    total: number;
  };
}

/** Where the parcel is picked up, and who to call if it does not scan. */
export interface DeliveryPickupPoint {
  name: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
}

/**
 * The rider's invoice, as the API assembles it from the order.
 *
 * The rider only ever sees their own job's invoice; the store's own details are
 * included because the sheet is meant to be printed and shown at a door.
 */
export interface DeliveryInvoice {
  invoiceNumber: string;
  issuedAt: string;
  order: {
    _id: string;
    orderNumber: string;
    placedAt: string;
    status: string;
    paymentMethod: string;
    shippingMethod: string;
  };
  store: {
    name: string;
    address: string;
    email: string;
    phone: string;
    currency: string;
  };
  customer: {
    name: string;
    phone: string;
    address: string;
    postalCode: string;
  };
  rider: DeliveryRider | null;
  delivery: {
    status: DeliveryStatus;
    fee: number;
    distanceKm: number | null;
    assignedAt: string;
  };
  items: DeliveryInvoiceItem[];
  totals: {
    subtotal: number;
    shipping: number;
    discount: number;
    pointsRedeemed: number;
    total: number;
  };
}

/** Where the parcel is going, once the address has been put on the map. */
export interface DeliveryDestination {
  lat: number;
  lng: number;
  /** The address as OpenStreetMap matched it; may be coarser than the order. */
  label: string;
}

/**
 * The tracking page's single read: the stage, the rider, the newest position,
 * the short trail, an ETA, and the code the customer will read out.
 */
export interface DeliveryTracking {
  order: DeliveryTrackingOrder;
  delivery: DeliveryRecord | null;
  location: DeliveryLocation | null;
  eta: DeliveryEta | null;
  otp: (DeliveryCode & { progress: number }) | null;
  isOwner: boolean;
  serverTime: string;
}

/** One point in the rider's daily chart. Every day in the range is present. */
export interface RiderSeriesPoint {
  /** Local date key, "2026-10-31". */
  date: string;
  delivered: number;
  cancelled: number;
  earnings: number;
}

export interface RiderStats {
  totalDeliveries: number;
  completed: number;
  active: number;
  pendingRequests: number;
  cancelled: number;
  /** All-time fee total for delivered jobs. */
  earnings: number;
  earningsThisMonth: number;
  /** Fee total for the charted range only. */
  earningsInWindow: number;
  /** Percent of finished jobs that were delivered. */
  successRate: number;
  /** Average minutes from accept to delivered. */
  avgDeliveryMinutes: number;
}

export type DeliveryStatusCounts = Record<DeliveryStatus, number>;

export interface RiderStatsResult {
  stats: RiderStats;
  statusCounts: DeliveryStatusCounts;
  series: RiderSeriesPoint[];
  recent: DeliveryRecord[];
  range: { days: number; from: string; to: string };
}

export interface DeliveryPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DeliveryFeed {
  deliveries: DeliveryRecord[];
  total: number;
  /** Offers this rider still has to answer; the sidebar badge reads it. */
  pendingRequests: number;
  pagination: DeliveryPagination;
}

/** Which icon a stat card draws; resolved by the client component. */
export type RiderStatIcon =
  | "PackageCheck"
  | "CheckCircle2"
  | "Navigation"
  | "Inbox"
  | "XCircle"
  | "Wallet"
  | "CalendarDays"
  | "Timer";

export interface RiderStatCardData {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  iconName: RiderStatIcon;
}
