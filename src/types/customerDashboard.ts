// ─── Customer Dashboard Types ───────────────────────────────────────────────

export interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  wishlistCount: number;
  rewardPoints: number;
  totalSavings: number;
}

export interface SpendingDataPoint {
  month: string;
  amount: number;
  orders: number;
}

export interface CustomerSpendingVsSavings {
  month: string;
  spending: number;
  savings: number;
  orders: number;
}

export interface CategoryPurchaseData {
  name: string;
  value: number;
  amount: number;
  color: string;
}

export interface CustomerOrderStatusItem {
  name: string;
  value: number;
  count?: number;
  color: string;
}

export interface CustomerPaymentMethodItem {
  name: string;
  value: number;
  count: number;
  amount: number;
  color: string;
}

export interface OrderTimelineStep {
  title: string;
  date: string;
  completed: boolean;
  current?: boolean;
  description: string;
}

export interface CustomerOrderItem {
  id: string;
  productId?: string;
  name: string;
  slug: string;
  image: string;
  price: number;
  quantity: number;
  inStock?: boolean;
  /** null means the product is not stock-tracked. */
  stockQuantity?: number | null;
  /** Warranty record attached to this order item, when one exists. */
  warranty?: CustomerWarranty;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  date: string;
  /** Raw creation time, so the list can be sorted exactly rather than by the display text. */
  createdAt?: string;
  status: "Confirmed" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Refunded" | "Pending";
  rawStatus?: string;
  customerResponse?: "received" | "not_received" | "cancelled" | null;
  customerResponseNote?: string;
  customerResponseAt?: string | Date | null;
  paymentStatus: "Paid" | "Pending" | "Failed" | "Refunded";
  paymentMethod: string;
  total: number;
  itemCount: number;
  /** Loyalty points spent on this order, and the money they saved. */
  pointsRedeemed?: number;
  pointsDiscount?: number;
  /**
   * The discount code written on this order, and what it took off. Kept on the
   * order itself, so an old invoice still explains its own total.
   */
  couponCode?: string;
  couponDiscount?: number;
  /** Points this order will pay out once it is delivered. */
  pointsEarned?: number;
  items: CustomerOrderItem[];
  trackingNumber?: string;
  carrier?: string;
  /** Shipping option chosen at checkout: free | standard | express */
  shippingMethod?: "free" | "standard" | "express";
  /** Estimated delivery window copied from site settings at checkout */
  estimatedDelivery?: string;
  shippingAddress: string;
  timeline: OrderTimelineStep[];
}

export interface CustomerWarranty {
  id: string;
  productId: string;
  orderId: string;
  activationDate: string | Date;
  expiryDate: string | Date;
  status:
    | "active"
    | "expired"
    | "claim_submitted"
    | "under_review"
    | "resolved";
  /** Why the record is closed: the date ran out, a claim was rejected, or it voided. */
  closedReason?: "date" | "rejected" | "void";
  /** The terms copied onto the record at delivery, so they survive a product edit. */
  warrantyType?: string;
  warrantyPeriodMonths?: number;
  warrantyTerms?: string;
  /** Every extra period the store has granted, oldest first. */
  extensions?: {
    months: number;
    previousExpiryDate: string | Date;
    newExpiryDate: string | Date;
    reason?: string;
    extendedBy?: string;
    createdAt?: string | Date;
  }[];
  /** What went wrong, picked from the claim form. */
  claimProblem?: string;
  claimReason?: string;
  claimDescription?: string;
  claimImages?: string[];
  claimAdminNote?: string;
  resolutionDetails?: string;
  product?: {
    id?: string;
    title?: string;
    slug?: string;
    image?: string;
    price?: number;
    warrantyPeriodMonths?: number;
    warrantyType?: string;
    warrantyTerms?: string;
  };
  order?: {
    id?: string;
    orderNumber?: string;
    orderStatus?: string;
    totalAmount?: number;
  };
}

export interface CustomerWishlistItem {
  id: string;
  productId: string;
  title: string;
  slug: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  image: string;
  inStock: boolean;
  rating: number;
  category: string;
  addedAt: string;
  ownerId?: string;
}

export interface CustomerTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  date: string;
  amount: number;
  status: "Completed" | "Pending" | "Failed" | "Refunded";
  paymentMethod: string;
  cardLast4?: string;
  type: "Payment" | "Refund" | "Cashback";
  invoiceNumber: string;
}

export interface SavedPaymentCard {
  id: string;
  brand: "visa" | "mastercard" | "amex";
  last4: string;
  expMonth: string;
  expYear: string;
  holderName: string;
  isDefault: boolean;
}

export interface CustomerAddress {
  id: string;
  title: string;
  isDefault: boolean;
  recipientName: string;
  phone: string;
  street: string;
  apartment?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: "Shipping" | "Billing" | "Both";
}

export interface CustomerProfileData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar: string;
  birthDate: string;
  gender: "Male" | "Female" | "Other" | "Prefer not to say";
  bio: string;
  memberSince: string;
  membershipTier: "Silver" | "Gold" | "Platinum" | "Diamond" | string;
  member?: "silver" | "gold" | "platinum" | "diamond" | string;
  points?: number;
  addresses: CustomerAddress[];
}

export interface CustomerSettingsData {
  notifications: {
    orderUpdatesEmail: boolean;
    orderUpdatesSms: boolean;
    promotionsEmail: boolean;
    promotionsSms: boolean;
    newsletter: boolean;
    securityAlerts: boolean;
  };
  preferences: {
    currency: "USD" | "EUR" | "GBP" | "BDT";
    language: "en" | "es" | "fr" | "bn";
    theme: "system" | "light" | "dark";
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    activeSessions: {
      id: string;
      device: string;
      browser: string;
      location: string;
      lastActive: string;
      isCurrent: boolean;
    }[];
  };
}
