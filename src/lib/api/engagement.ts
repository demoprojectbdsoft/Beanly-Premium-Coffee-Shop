import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { ProductEngagementReport } from "@/types/vendor";

/**
 * How the catalogue is being shopped.
 *
 * Views and clicks are counted on the public product page; the wishlist figure
 * is the live list. Only the window and the number of rows are chosen here —
 * every total is folded by the API.
 */

export const getProductEngagement = async (params?: {
  range?: number;
  limit?: number;
}) => {
  return serverFetch(withQuery("/engagement/products", params), true);
};

export const asEngagement = (
  payload: unknown
): ProductEngagementReport | null => {
  return (payload as { data?: ProductEngagementReport } | null)?.data ?? null;
};
