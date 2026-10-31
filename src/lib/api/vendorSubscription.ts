import { serverFetch } from "../core/server";
import type { VendorSubscriptionOverview } from "@/types/vendor";

/**
 * The vendor's own subscription.
 *
 * The read is scoped to the token, so this page can only ever describe the
 * signed-in seller's plan, payments and history.
 */

export const getMySubscription = async () => {
  return serverFetch("/vendor-subscription/mine", true);
};

export const asSubscription = (payload: unknown): VendorSubscriptionOverview | null => {
  return (payload as { data?: VendorSubscriptionOverview } | null)?.data ?? null;
};
