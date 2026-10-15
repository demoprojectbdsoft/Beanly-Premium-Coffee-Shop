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
  stockQuantity?: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  date: string;
  status: "Confirmed" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Refunded" | "Pending";
  rawStatus?: string;
  customerResponse?: "received" | "not_received" | "cancelled" | null;
  customerResponseNote?: string;
  customerResponseAt?: string | Date | null;
  paymentStatus: "Paid" | "Pending" | "Failed" | "Refunded";
  paymentMethod: string;
  total: number;
  itemCount: number;
  items: CustomerOrderItem[];
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  shippingAddress: string;
  timeline: OrderTimelineStep[];
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
