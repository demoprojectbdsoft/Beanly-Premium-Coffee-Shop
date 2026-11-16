import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";

/**
 * Read-only warranty API helpers. Mutations live in `@/lib/action/warranty`.
 */

export const getWarranties = async (
  params?: Record<string, string | number | boolean | undefined>
) => {
  return serverFetch(withQuery("/warranties", params), true);
};

/**
 * The warranties issued on one seller's own products. The server resolves the
 * scope from the caller, so no id travels in the query.
 */
export const getVendorWarranties = async (
  params?: Record<string, string | number | boolean | undefined>
) => {
  return serverFetch(withQuery("/warranties/vendor", params), true);
};

export const getMyWarranties = async (params?: { page?: number; limit?: number }) => {
  return serverFetch(withQuery("/warranties/mine", params), true);
};

/**
 * Fetch the warranty record for a single order item.
 * Returns null when no warranty exists for this (user, order, product) triple.
 */
export const getWarrantyForOrderItem = async (orderId: string, productId: string) => {
  return serverFetch(`/warranties/order/${orderId}/product/${productId}`, true);
};