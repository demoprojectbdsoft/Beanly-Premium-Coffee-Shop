import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { VendorAnalyticsReport } from "@/types/vendor";

/**
 * The seller's report.
 *
 * There is no vendor id in the query: the token decides whose shop is folded
 * into the numbers, and the API decides how far back the caller's plan may look.
 */

export const getMyAnalytics = async (range: number) => {
  return serverFetch(withQuery("/vendor-analytics", { range }), true);
};

export const asAnalytics = (payload: unknown): VendorAnalyticsReport | null => {
  return (payload as { data?: VendorAnalyticsReport } | null)?.data ?? null;
};
