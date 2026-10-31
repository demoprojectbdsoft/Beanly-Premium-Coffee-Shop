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
