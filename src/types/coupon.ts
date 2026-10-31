/**
 * One discount code, whichever desk wrote it.
 *
 * The store team's global codes and a seller's own codes are the same document
 * with a different `ownerType`, so the storefront needs one type for both. The
 * money is always recomputed by the API: `discount` on a quote is what the
 * server says the code is worth on this exact basket, not what the browser
 * hopes it is.
 */

export type CouponOwnerType = "admin" | "vendor";
export type CouponDiscountType = "percentage" | "fixed";

/** Read from `isActive`, the two dates and the usage counter — never stored. */
export type CouponState = "live" | "upcoming" | "expired" | "stopped";

export interface Coupon {
  _id: string;
  code: string;
  title: string;
  description: string;
  ownerType: CouponOwnerType;
  /** The seller who wrote it. Null on a store-wide code. */
  vendorId: string | null;
  storeId: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  minOrderAmount: number;
  /** Caps a percentage code; 0 means no cap. */
  maxDiscountAmount: number;
  startDate: string | null;
  endDate: string | null;
  /** 0 means unlimited. */
  totalUsageLimit: number;
  perCustomerLimit: number;
  /** Empty means everything this owner may discount. */
  productIds: string[];
  categoryIds: string[];
  isActive: boolean;
  usedCount: number;
  discountGiven: number;
  /** 0 when the code has no cap, so the desk shows "No limit" not a zero. */
  remaining: number;
  redemptionCount: number;
  state: CouponState;
  createdAt: string | null;
  updatedAt: string | null;
}

/** The same code with this basket's verdict on it, from the validate call. */
export interface CouponQuote extends Coupon {
  /** Only the lines the code may touch, at the stored prices. */
  eligibleSubtotal: number;
  discount: number;
}

export interface CouponListResult {
  coupons: Coupon[];
  total: number;
  typeCounts: Record<string, number>;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * What an owner may write. The owner, the ledger and the totals are not here.
 *
 * Every number is spelled out rather than left out, because a code that caps
 * nothing and a code whose cap was not sent look the same on screen but not in
 * the API. 0 is the honest way of saying "no limit".
 */
export interface CouponDraft {
  code: string;
  title?: string;
  description?: string;
  discountType: CouponDiscountType;
  discountValue: number;
  /** 0 means the basket qualifies at any size. */
  minOrderAmount: number;
  /** Caps a percentage code; 0 means no cap. */
  maxDiscountAmount: number;
  startDate: string;
  endDate: string;
  totalUsageLimit: number;
  perCustomerLimit: number;
  productIds: string[];
  categoryIds: string[];
  isActive: boolean;
}
