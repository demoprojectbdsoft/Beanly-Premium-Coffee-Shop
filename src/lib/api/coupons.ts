import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { Coupon, CouponListResult } from "@/types";

/**
 * Reading discount codes.
 *
 * The staff list is the only one that asks for every owner's codes at once, so
 * this is where the shop behind a seller's code and the names a code covers come
 * back with the row. The seller's own desk reads are in `vendorCoupons`, and they
 * share the two narrowings below: the same document, whichever desk asks for it.
 */

export type CouponListQuery = {
  /** `all` keeps the store's own codes and every seller's together. */
  owner?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export const getCoupons = async (params?: CouponListQuery) => {
  return serverFetch(withQuery("/coupons", params), true);
};

/**
 * One code by id.
 *
 * The board only opens an editor for a row it has already read, so this is the
 * fallback for a code reached by a link rather than a filter. It carries no
 * names: the staff list is what looks the shop and the covered lines up.
 */
export const getCoupon = async (id: string) => {
  return serverFetch(`/coupons/${id}`, true);
};

/** A null read becomes an empty table rather than a crashed render. */
export const asCouponList = (payload: unknown): CouponListResult | null => {
  return (payload as { data?: CouponListResult } | null)?.data ?? null;
};

export const asCoupon = (payload: unknown): Coupon | null => {
  return (payload as { data?: Coupon } | null)?.data ?? null;
};
