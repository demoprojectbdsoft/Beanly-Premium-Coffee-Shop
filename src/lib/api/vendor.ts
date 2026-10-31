import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { VendorApplication, VendorPlan } from "@/types/vendor";

/**
 * The marketplace reads: the plan table, one applicant's own application, and
 * the store team's review queue.
 *
 * Every function resolves to the API envelope (`{ success, message, data }`) or
 * to null when the API is unreachable, so a page can render an empty state
 * instead of crashing the render. Writes live in `lib/action/vendor`.
 */

/** The review desk's filters. */
export type VendorApplicationQuery = {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

/**
 * The three plans, in their fixed order.
 *
 * Public on purpose: the pricing cards are shown to a signed-out visitor before
 * they have an account, and the plan step of the application reads the same
 * table so a price can never be shown twice with two different numbers.
 */
export const getVendorPlans = async () => {
  return serverFetch("/vendor-plans");
};

/**
 * The signed-in account's application, or null when it never applied.
 *
 * A rejected applicant still gets their row back, which is what the status
 * screen reads to show the reason and the resubmission offer.
 */
export const getMyVendorApplication = async () => {
  return serverFetch("/vendor-applications/mine", true);
};

/** The store team's queue, filtered and paged. */
export const getVendorApplications = async (params?: VendorApplicationQuery) => {
  return serverFetch(withQuery("/vendor-applications", params), true);
};

/** One application plus the account and store it belongs to. */
export const getVendorApplication = async (id: string) => {
  return serverFetch(`/vendor-applications/${id}`, true);
};

/** Narrowing helper for the pages, so a null read becomes an empty table. */
export const asApplication = (payload: unknown): VendorApplication | null => {
  return (payload as { data?: VendorApplication } | null)?.data ?? null;
};

/** Narrowing helper for the pricing cards. */
export const asPlans = (payload: unknown): VendorPlan[] => {
  return (payload as { data?: VendorPlan[] } | null)?.data ?? [];
};
