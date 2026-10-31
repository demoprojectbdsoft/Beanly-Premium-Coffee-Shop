import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { PublicStore, PublicStoreListResult } from "@/types/stores";

/**
 * Reading the shops a shopper can browse without signing in.
 *
 * Both reads are public and answer only for trading shops, so a null data here
 * means the same thing as the API's 404: there is no shop to show, whether it
 * never existed or was suspended last week. The pages should not explain the
 * difference — the API deliberately does not.
 */

export type PublicStoreListQuery = {
  search?: string;
  category?: string;
  /** Only the shops a paid placement is lighting up right now. */
  featured?: boolean;
  /** `featured` (default), `rating`, `newest`, `popular`. */
  sort?: string;
  page?: number;
  limit?: number;
};

export const getPublicStores = async (params?: PublicStoreListQuery) => {
  return serverFetch(withQuery("/vendor-store/public", params));
};

export const getPublicStoreBySlug = async (slug: string) => {
  return serverFetch(`/vendor-store/public/${encodeURIComponent(slug)}`);
};

/** A null read becomes an empty table rather than a crashed render. */
export const asStoreList = (payload: unknown): PublicStoreListResult | null => {
  return (payload as { data?: PublicStoreListResult } | null)?.data ?? null;
};

export const asStore = (payload: unknown): PublicStore | null => {
  const data = (payload as { data?: PublicStore } | null)?.data ?? null;
  return data && data.slug ? data : null;
};
