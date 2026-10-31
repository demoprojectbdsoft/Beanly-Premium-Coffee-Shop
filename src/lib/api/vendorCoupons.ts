import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";

/**
 * The seller's own discount codes.
 *
 * The reads go through the token, never through a vendor id, so this desk can
 * only ever list the signed-in seller's codes. The arithmetic behind a code is
 * the API's business: the screen shows what the server returned. The row
 * narrowing both desks need lives with the staff read, in `coupons`.
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
