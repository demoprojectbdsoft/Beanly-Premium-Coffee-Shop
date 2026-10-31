import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { VendorProduct, VendorProductListResult } from "@/types/vendor";

/**
 * The vendor's own catalogue.
 *
 * Every read goes through the token, never through a vendor id in the URL, so
 * the list can only ever contain the signed-in seller's rows.
 */

export type VendorProductQuery = {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export const getMyProducts = async (params?: VendorProductQuery) => {
  return serverFetch(withQuery("/vendor-products", params), true);
};

export const getMyProduct = async (id: string) => {
  return serverFetch(`/vendor-products/${id}`, true);
};

/** A null read becomes an empty table rather than a crashed render. */
export const asProductList = (payload: unknown): VendorProductListResult | null => {
  return (payload as { data?: VendorProductListResult } | null)?.data ?? null;
};

export const asProduct = (payload: unknown): VendorProduct | null => {
  return (payload as { data?: VendorProduct } | null)?.data ?? null;
};
