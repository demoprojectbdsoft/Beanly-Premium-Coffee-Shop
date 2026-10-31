import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { VendorStore, VendorStoreListResult, VendorStoreRow } from "@/types/vendor";

/**
 * The storefronts.
 *
 * Two reads that look alike and are not the same thing: the seller's own row and
 * the store team's list of everyone's. The public storefront pages read a third
 * endpoint later, because a hidden or suspended shop must never be served from
 * the dashboard's cache.
 */

/** The filters the store team's pickers ask for. */
export type StoreListQuery = {
  search?: string;
  status?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
};

export const getMyStore = async () => {
  return serverFetch("/vendor-store/mine", true);
};

/** Every shop on one page, so a desk can name the seller it is granting to. */
export const getAllStores = async (params?: StoreListQuery) => {
  return serverFetch(withQuery("/vendor-store", params), true);
};

/** Narrowing helper so a null read renders the "no store yet" card instead of crashing. */
export const asStore = (payload: unknown): VendorStore | null => {
  return (payload as { data?: VendorStore } | null)?.data ?? null;
};

/** A null read becomes an empty list rather than a crashed render. */
export const asStoreList = (payload: unknown): VendorStoreListResult | null => {
  const data = (payload as { data?: VendorStoreListResult } | null)?.data ?? null;
  if (!data) return null;
  return {
    stores: (data.stores ?? []).map((store) => ({
      ...store,
      userId: store.userId || "",
      ownerName: store.ownerName || "",
      ownerEmail: store.ownerEmail || "",
    })) as VendorStoreRow[],
    total: Number(data.total) || 0,
    pagination: data.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 1 },
  };
};
