/**
 * Marketplace types, mirroring the server's vendor module.
 *
 * The screens never invent a status or a plan id: every union here matches the
 * enum the API validates against, so a typo is a TypeScript error instead of a
 * label nobody can explain.
 */

export type VendorApplicationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "cancelled";

export type VendorPlanId = "free" | "premium" | "advanced";
export type BillingCycle = "monthly" | "yearly";

export interface VendorPlan {
  id: VendorPlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxProducts: number;
  featuredProducts: number;
  featuredDurationDays: number;
  activeCoupons: number;
  analytics: "basic" | "detailed" | "advanced";
  salesReports: "basic" | "advanced";
  exports: "limited" | "full";
  storeCustomization: "basic" | "enhanced" | "full";
  promotionalCampaigns: "none" | "limited" | "priority";
  storeVisibility: "standard" | "enhanced" | "priority";
  support: "standard" | "priority";
  highlights: string[];
  isActive: boolean;
}

export interface VendorApplicationEvent {
  status: VendorApplicationStatus;
  at: string;
  note?: string;
}

export interface VendorPersonalInfo {
  fullName: string;
  email: string;
  phone?: string;
  contactInfo?: string;
}

export interface VendorSocialLinks {
  facebook?: string;
  instagram?: string;
  x?: string;
  linkedin?: string;
}

export interface VendorStoreInfo {
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  email?: string;
  phone?: string;
  category?: string;
  website?: string;
  socialLinks?: VendorSocialLinks;
}

export interface VendorBusinessAddress {
  country?: string;
  division?: string;
  city?: string;
  area?: string;
  address?: string;
  postalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface VendorVerification {
  businessType?: string;
  registrationNumber?: string;
  documentUrl?: string;
  notes?: string;
}

export interface VendorApplication {
  _id: string;
  reference: string;
  status: VendorApplicationStatus;
  personalInfo: VendorPersonalInfo;
  storeInfo: VendorStoreInfo;
  businessAddress: VendorBusinessAddress;
  verification?: VendorVerification;
  selectedPlan: VendorPlanId;
  billingCycle: BillingCycle;
  rejectionReason?: string;
  reviewNotes?: string;
  reviewedAt?: string | null;
  submittedAt: string;
  resubmissionCount?: number;
  storeId?: string | null;
  history: VendorApplicationEvent[];
  createdAt?: string;
  updatedAt?: string;
}

/** What the six-step form holds while it is being filled in. */
export interface VendorApplicationDraft {
  personalInfo: VendorPersonalInfo;
  storeInfo: VendorStoreInfo;
  businessAddress: VendorBusinessAddress;
  verification: VendorVerification;
  selectedPlan: VendorPlanId;
  billingCycle: BillingCycle;
}

export interface VendorStore {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  email?: string;
  phone?: string;
  category?: string;
  website?: string;
  socialLinks?: VendorSocialLinks;
  address?: VendorBusinessAddress;
  status?: "active" | "suspended" | "closed";
  isVisible?: boolean;
  isFeatured?: boolean;
  featuredUntil?: string | null;
  productCount?: number;
  reviewCount?: number;
  rating?: number;
  /** Set by the store team when a shop is suspended, and shown to its owner. */
  suspendedReason?: string;
}

/** The plan state the vendor dashboard and its limit checks read. */
export interface VendorPlanState {
  plan: VendorPlan;
  isLive: boolean;
  inGrace: boolean;
  isExpired: boolean;
  effectiveUntil: string | null;
  usage: {
    products: number;
    featuredProducts: number;
    activeCoupons: number;
  };
  subscription: {
    _id: string;
    plan: VendorPlanId;
    billingCycle: BillingCycle;
    status: "active" | "grace" | "expired" | "cancelled";
    startDate: string;
    endDate: string;
    graceEndsAt?: string | null;
    autoRenew?: boolean;
    pricePaid?: number;
  } | null;
}

/** The status payload the sign-in screen renders instead of a session. */
export interface VendorApplicationStatusView {
  reference: string;
  status: VendorApplicationStatus;
  storeName: string;
  submittedAt: string;
  rejectionReason?: string;
  reviewNotes?: string;
  history: VendorApplicationEvent[];
  plan: VendorPlanId;
}

/** Paging, identical in shape to the other admin boards. */
export interface VendorPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** One row of the review queue: the application as the table needs it. */
export interface VendorApplicationListResult {
  applications: VendorApplication[];
  total: number;
  /** How many applications sit in each state, for the filter chips. */
  typeCounts: Record<string, number>;
  pagination: VendorPagination;
}

/** The account that applied, as the review screen names it. */
export interface VendorApplicantSummary {
  _id: string;
  name: string;
  email: string;
  image?: string;
  phone?: string;
  role?: string;
  status?: string;
  createdAt?: string;
}

/** The store the approval created, when there is one. */
export interface VendorStoreSummary {
  _id: string;
  slug: string;
  status?: string;
  isVisible?: boolean;
}

/** The review screen's single read: the file plus who and what it made. */
export interface VendorApplicationDetail {
  application: VendorApplication;
  applicant: VendorApplicantSummary | null;
  store: VendorStoreSummary | null;
}

/**
 * A shop as the store team's desks read it: the public row plus whose account
 * it belongs to, because a storefront placement is granted to the seller.
 */
export interface VendorStoreRow extends VendorStore {
  userId: string;
  ownerName: string;
  ownerEmail: string;
}

/** One page of shops, for the desks that have to choose one among everyone's. */
export interface VendorStoreListResult {
  stores: VendorStoreRow[];
  total: number;
  pagination: VendorPagination;
}

/** One labelled set of choices, e.g. Colour: red, blue. */
export interface VendorProductVariant {
  name: string;
  values: string[];
}

export interface VendorProductShipping {
  weightKg?: number | null;
  deliveryDays?: number | null;
  freeShipping?: boolean;
  note?: string;
}

/** What the product form holds while it is being filled in. */
export interface VendorProductDraft {
  title: string;
  slug?: string;
  categoryId: string;
  subCategoryIds: string[];
  price: number;
  originalPrice?: number | null;
  image: string;
  additionalImages: string[];
  stockQuantity: number | null;
  sku: string;
  brand: string;
  description: string;
  specifications: Record<string, string>;
  variantOptions: VendorProductVariant[];
  shippingInfo: VendorProductShipping;
  isVisible: boolean;
}

/** A product as the vendor's own screens read it. */
export interface VendorProduct {
  _id: string;
  id?: string;
  title: string;
  slug: string;
  price: number;
  originalPrice?: number | null;
  image: string;
  additionalImages?: string[];
  stockQuantity?: number | null;
  inStock?: boolean;
  sku?: string;
  brand?: string;
  description?: string;
  specifications?: Record<string, string>;
  variantOptions?: VendorProductVariant[];
  shippingInfo?: VendorProductShipping;
  isVisible?: boolean;
  isFeatured?: boolean;
  vendorProductStatus?: string;
  categoryId?: { name: string; slug: string; _id?: string; id?: string } | string;
  subCategoryIds?: { name: string; slug: string; _id?: string; id?: string }[];
  rating?: number;
  reviewCount?: number;
  sellCount?: number;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** The vendor's plan, as the catalogue screen shows its usage. */
export interface VendorProductPlan {
  id: VendorPlanId;
  name: string;
  maxProducts: number;
  used: number;
  isLive: boolean;
  effectiveUntil: string | null;
}

export interface VendorProductListResult {
  products: VendorProduct[];
  total: number;
  typeCounts: Record<string, number>;
  pagination: VendorPagination;
  plan: VendorProductPlan;
}

/** One period the vendor bought. Old rows are the subscription history. */
export interface VendorSubscriptionRecord {
  _id: string;
  plan: VendorPlanId;
  billingCycle: BillingCycle;
  status: "active" | "grace" | "expired" | "cancelled";
  pricePaid?: number;
  startDate: string;
  endDate: string;
  graceEndsAt?: string | null;
  autoRenew?: boolean;
  cancelledAt?: string | null;
  note?: string;
  history?: { action: string; at: string; note?: string; toPlan?: string }[];
  createdAt?: string;
}

/** One demo payment for a plan period. */
export interface VendorSubscriptionPayment {
  _id: string;
  plan: VendorPlanId;
  billingCycle: BillingCycle;
  amount: number;
  method: string;
  status: "pending" | "success" | "failed";
  reference: string;
  purpose?: "activation" | "renewal" | "upgrade" | "downgrade" | "admin";
  isDemo?: boolean;
  failureReason?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  paidAt?: string | null;
  createdAt?: string;
}

/** Everything the subscription page reads in one call. */
export interface VendorSubscriptionOverview {
  subscription: VendorSubscriptionRecord | null;
  plan: VendorPlan;
  isLive: boolean;
  inGrace: boolean;
  isExpired: boolean;
  usage: { products: number; featuredProducts: number; activeCoupons: number };
  effectiveUntil: string | null;
  plans: VendorPlan[];
  payments: VendorSubscriptionPayment[];
  history: VendorSubscriptionRecord[];
}

/** The seller's own fulfilment stages for one group of an order. */
export type VendorOrderStatus =
  | "pending"
  | "accepted"
  | "processing"
  | "ready_for_shipment"
  | "shipped"
  | "delivered"
  | "rejected"
  | "cancelled";

export interface VendorOrderItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  image: string;
}

export interface VendorOrderRider {
  _id: string;
  name: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber?: string;
}

/** One seller's slice of a customer order. */
export interface VendorOrder {
  _id: string;
  orderId: string;
  orderNumber: string;
  status: VendorOrderStatus;
  rejectionReason?: string;
  items: VendorOrderItem[];
  subtotal: number;
  customerName: string;
  customerPhone: string;
  city: string;
  paymentMethod: string;
  /** The parent order's own stage, which the seller does not control. */
  parentStatus: string | null;
  totalAmount: number | null;
  shippingAddress?: {
    fullName?: string;
    phone?: string;
    address?: string;
    city?: string;
    postalCode?: string;
  } | null;
  estimatedDelivery?: string;
  placedAt: string | null;
  /** Set when the seller asked the store team for a rider. */
  pickupRequestedAt?: string | null;
  deliveryId: string | null;
  rider: VendorOrderRider | null;
  history: { status: VendorOrderStatus; at: string | null; note?: string }[];
  createdAt?: string | null;
  updatedAt?: string | null;
  /** Only on the detail read: the live job carrying this group. */
  delivery?: {
    status: string;
    rider: VendorOrderRider | null;
    expiresAt: string | null;
  } | null;
}

export interface VendorOrderListResult {
  orders: VendorOrder[];
  total: number;
  typeCounts: Record<string, number>;
  pagination: VendorPagination;
}

/** The counters on the overview card, counted from the seller's own rows. */
export interface VendorOrderSummary {
  pending: number;
  active: number;
  completed: number;
  total: number;
}

/** One seller's report, folded from their own fulfilment groups. */
export interface VendorAnalyticsReport {
  /** The window actually used, which is the request capped by the plan. */
  range: number;
  maxRange: number;
  monthly: boolean;
  level: "basic" | "detailed" | "advanced";
  plan: {
    id: string;
    name: string;
    analytics: "basic" | "detailed" | "advanced";
    exports: "limited" | "full";
  };
  isLive: boolean;
  totals: {
    revenue: number;
    orders: number;
    units: number;
    avgOrderValue: number;
    /** Delivered is earned; this is the value still on the way. */
    inFlight: number;
    commission: number;
    commissionTaken: number;
    netPayout: number;
    fulfilmentRate: number;
    stopped: number;
    placed: number;
  };
  previous: {
    revenue: number;
    orders: number;
    revenueChange: number | null;
  };
  series: { label: string; revenue: number; orders: number }[];
  statusCounts: Record<string, number>;
  topProducts: { title: string; image: string; units: number; revenue: number }[];
  recent: {
    id: string;
    orderNumber: string;
    status: VendorOrderStatus;
    subtotal: number;
    units: number;
    city: string;
    placedAt: string;
  }[];
}
