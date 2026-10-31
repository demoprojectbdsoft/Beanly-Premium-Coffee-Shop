import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";

/**
 * The notification feed, for any signed-in account.
 *
 * One endpoint answers every role: the API takes the owner from the token and
 * decides which list "mine" means — the store team's shared board for an admin,
 * that account's own lines for everybody else. That is why no user id is ever
 * passed, and why there is no second feed to keep in step.
 *
 * Mutations live in `@/lib/action/notifications`.
 */

/**
 * The filters one read of the feed accepts.
 *
 * A type alias rather than an interface on purpose: it is handed straight to
 * the query-string helper, which takes any plain record of values.
 */
export type NotificationQuery = {
  page?: number;
  limit?: number;
  unread?: "true" | "false";
  /** Matched against the title and the detail, case-insensitively. */
  search?: string;
  /** Comma-separated types, for the filter chips. */
  type?: string;
  sort?: "newest" | "oldest" | "unread";
};

export const getMyFeed = async (params?: NotificationQuery) => {
  return serverFetch(withQuery("/activities/mine", params), true);
};

export const getMyUnreadCount = async () => {
  return serverFetch("/activities/mine/unread-count", true);
};
