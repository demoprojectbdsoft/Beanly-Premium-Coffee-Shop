import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { Coupon, CouponListResult } from "@/types";

/**
 * The seller's own discount codes.
 *
 * The reads go through the token, never through a vendor id, so this desk can
 * only ever list the signed-in seller's codes. The arithmetic behind a code is
 * the API's business: the screen shows what the server returned.
 */

export type VendorCouponQuery = {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export const getMyCoupons = async (params?: VendorCouponQuery) => {
  return serverFetch(withQuery("/vendor-coupons", params), true);
};

export const getMyCoupon = async (id: string) => {
  return serverFetch(`/vendor-coupons/${id}`, true);
};

/** A null read becomes an empty table rather than a crashed render. */
export const asCouponList = (payload: unknown): CouponListResult | null => {
  return (payload as { data?: CouponListResult } | null)?.data ?? null;
};

export const asCoupon = (payload: unknown): Coupon | null => {
  return (payload as { data?: Coupon } | null)?.data ?? null;
};
