import { CartData, Product, User } from "./index";

export type PaymentMethod = "cod" | "bkash" | "rocket" | "nagad";

export interface ShippingAddress {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface CreateOrderItemPayload {
  productId: string;
  quantity: number;
}

export interface CreateOrderPayload {
  userId: string;
  items: CreateOrderItemPayload[];
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  transactionId?: string;
}

export interface SendOtpPayload {
  phone: string;
}

export interface SendOtpResponse {
  otp: string;
  expiresInMinutes: number;
}

export interface VerifyOtpPayload {
  phone: string;
  otp: string;
}

export interface VerifyOtpResponse {
  transactionId: string;
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
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  /** Reference/transaction ID — returned by backend's getOrderById via the transaction record */
  transactionId?: string;
  /** Payment status from the linked Transaction document */
  paymentStatus?: "pending" | "success" | "failed";
  totalAmount: number;
  subtotal?: number;
  shippingFee?: number;
  /** Backend field name for order status */
  orderStatus?: "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  /** Legacy / frontend-only status field */
  status?: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  customerResponse?: "received" | "not_received" | "cancelled" | null;
  customerResponseNote?: string;
  customerResponseAt?: string | Date | null;
  pointsEarned?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CheckoutClientProps {
  initialCart?: CartData | null;
  user?: User | null;
}

export interface OrderSuccessClientProps {
  orderId: string;
  initialOrder?: Order | null;
  user?: User | null;
}
