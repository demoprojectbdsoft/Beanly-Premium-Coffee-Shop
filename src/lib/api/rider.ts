import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { RiderApplication, RiderApplicationQuery, RiderPagination } from "@/types/rider";

/**
 * The rider reads: an applicant's own application and the store team's queue.
 *
 * Every function resolves to the API envelope (`{ success, message, data }`)
 * or to null when the API is unreachable, so a page can render an empty state
 * instead of crashing the render. Writes live in `lib/action/rider`.
 */

/**
 * The signed-in account's rider application, or null when it never applied.
 *
 * A rejected applicant still gets their row back, which is what the status
 * screen reads to show the reason and the reapplication offer.
 */
export const getMyRiderApplication = async () => {
  return serverFetch("/rider-applications/mine", true);
};

/** The store team's queue, filtered and paged. */
export const getRiderApplications = async (params?: RiderApplicationQuery) => {
  return serverFetch(withQuery("/rider-applications", params), true);
};

/** One application plus the account behind it, for the review drawer. */
export const getRiderApplication = async (id: string) => {
  return serverFetch(`/rider-applications/${id}`, true);
};

/** Narrowing helper for the pages, so a null read becomes an empty state. */
export const asRiderApplication = (payload: unknown): RiderApplication | null => {
  return (payload as { data?: RiderApplication } | null)?.data ?? null;
};

export const asRiderApplications = (
  payload: unknown
): { applications: RiderApplication[]; pagination?: RiderPagination } => {
  const data = (payload as { data?: Record<string, unknown> } | null)?.data;
  const applications = Array.isArray(data?.applications)
    ? (data?.applications as RiderApplication[])
    : [];
  return {
    applications,
    pagination: data?.pagination as RiderPagination | undefined,
  };
};
