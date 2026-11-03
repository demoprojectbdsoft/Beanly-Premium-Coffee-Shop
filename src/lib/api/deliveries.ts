import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";

/**
 * Reads for the three delivery audiences.
 *
 * Everything here resolves to null when the API is unreachable, so a page can
 * render an empty state instead of crashing the render. Writes live in
 * `lib/action/deliveries` because only a form ever needs one.
 */

// ─── Rider ────────────────────────────────────────────────────────────────────

/** The rider's own dashboard numbers and chart series. */
export const getRiderStats = async (params?: Record<string, string | number | undefined>) => {
  return serverFetch(withQuery("/deliveries/stats", params), true);
};

/** The rider's own jobs, filtered and paged. */
export const getRiderDeliveries = async (params?: Record<string, string | number | undefined>) => {
  return serverFetch(withQuery("/deliveries", params), true);
};

/** One job, for the rider's detail view. */
export const getRiderDelivery = async (id: string) => {
  return serverFetch(`/deliveries/${id}`, true);
};

// ─── Store ────────────────────────────────────────────────────────────────────

/** Every job on the store's delivery board. */
export const getAdminDeliveries = async (params?: Record<string, string | number | undefined>) => {
  return serverFetch(withQuery("/deliveries/admin", params), true);
};

/** The counters above the store's board. */
export const getAdminDeliveryOverview = async () => {
  return serverFetch("/deliveries/admin/overview", true);
};

/** The riders the store can hand a job to, best first. */
export const getAssignableRiders = async (orderId?: string) => {
  return serverFetch(withQuery("/deliveries/admin/riders", { orderId }), true);
};

/**
 * The payout record: every fee a delivered job paid to a rider, folded into a
 * graph, listed row by row, and summed against what is still owed.
 */
export const getAdminPayouts = async (params?: Record<string, string | number | undefined>) => {
  return serverFetch(withQuery("/deliveries/admin/payouts", params), true);
};

/** Every assignment an order has had, newest first. */
export const getOrderDeliveries = async (orderId: string) => {
  return serverFetch(`/deliveries/admin/order/${orderId}`, true);
};

// ─── Buyer ────────────────────────────────────────────────────────────────────

/** The tracking page's single read: stage, rider, position, ETA and code. */
export const getDeliveryTracking = async (orderId: string) => {
  return serverFetch(`/deliveries/tracking/${orderId}`, true);
};
