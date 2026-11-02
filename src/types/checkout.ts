import { CartData, Product, User } from "./index";

export type PaymentMethod = "cod" | "bkash" | "rocket" | "nagad";

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

/**
 * An address the customer asked us to keep, so the next order only needs a pick
 * from a list. Owned by one user and never shared, like the cart.
 */
export interface SavedAddress extends ShippingAddress {
  _id: string;
  /** A short nickname, e.g. "Home" or "Office". */
  label: string;
  /** Only one address is the default; checkout pre-fills from it. */
  isDefault: boolean;
  createdAt?: string;
}

export interface CreateOrderItemPayload {
  productId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  userId: string;
  items: CreateOrderItemPayload[];
  shippingAddress?: ShippingAddress;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  /** Explicit shipping choice from checkout: free | standard | express.
   *  When omitted the backend resolves it from the live site settings. */
  shippingMethod?: "free" | "standard" | "express";
  /** Loyalty points the customer chose to spend (100 points = 1 currency unit). */
  pointsToRedeem?: number;
  /**
   * The discount code from the cart, sent as a name only. What it is worth is
   * worked out again by the API from the stored prices, so a stale estimate on
   * screen can never change what the order pays.
   */
  couponCode?: string;
}

export interface OrderItem {
  productId: string | Product;
  product?: Product;
  quantity: number;
  price?: number;
  lineTotal?: number;
  title?: string;
  image?: string;
}

export interface Order {
  _id: string;
  id?: string;
  userId:
    | string
    | {
        _id?: string;
        name?: string;
        email?: string;
        image?: string;
        avatar?: string;
      };
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  paymentMethod: PaymentMethod;
  /** Reference/transaction ID — returned by backend's getOrderById via the transaction record */
  transactionId?: string;
  /** Payment status from the linked Transaction document */
  paymentStatus?: "pending" | "success" | "failed";
  totalAmount: number;
  subtotal?: number;
  shippingFee?: number;
  /** Shipping option chosen at checkout: free | standard | express */
  shippingMethod?: "free" | "standard" | "express";
  /** Estimated delivery window copied from site settings at checkout */
  estimatedDelivery?: string;
  /** Backend field name for order status */
  orderStatus?: "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  /** Legacy / frontend-only status field */
  status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  customerResponse?: "received" | "not_received" | "cancelled" | null;
  customerResponseNote?: string;
  customerResponseAt?: string | Date | null;
  /**
   * The delivery currently on this order, live stages only (assigned through
   * out\_for\_delivery). "holds" says a rider still answers for the parcel: an
   * offer that has run past its window is counted dead even before the sweep
   * closes it. While a rider holds the job, the store cannot deliver or cancel
   * the order — only stand the rider down first.
   */
  delivery?: {
    _id: string;
    status: string;
    fee?: number;
    expiresAt?: string | null;
    holds?: boolean;
    rider?: { name?: string } | null;
  } | null;
  pointsEarned?: number;
  /** Points this order used up, and the money they took off the total. */
  pointsRedeemed?: number;
  pointsDiscount?: number;
  /** The code this order was bought with, and what it took off. */
  couponId?: string | null;
  couponCode?: string;
  couponDiscount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutClientProps {
  initialCart?: CartData | null;
  user?: User | null;
  /** The customer's address book, newest first with the default at the top. */
  savedAddresses?: SavedAddress[];
  /**
   * The code the shopper applied in the cart, handed over as a name. Checkout
   * asks the API what it is worth on this order instead of trusting the number
   * the cart showed, because a price or a basket can change between the two.
   */
  initialCouponCode?: string;
}

export interface OrderSuccessClientProps {
  orderId: string;
  initialOrder?: Order | null;
  user?: User | null;
}
