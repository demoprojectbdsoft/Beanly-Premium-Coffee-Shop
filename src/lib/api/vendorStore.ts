import { serverFetch } from "../core/server";
import type { VendorStore } from "@/types/vendor";

/**
 * The vendor's own storefront.
 *
 * One read: the store row the signed-in vendor edits. The public storefront
 * reads a different endpoint later, because a hidden or suspended shop must
 * never be served from the dashboard's cache.
 */

export const getMyStore = async () => {
  return serverFetch("/vendor-store/mine", true);
};

/** Narrowing helper so a null read renders the "no store yet" card instead of crashing. */
export const asStore = (payload: unknown): VendorStore | null => {
  return (payload as { data?: VendorStore } | null)?.data ?? null;
};
