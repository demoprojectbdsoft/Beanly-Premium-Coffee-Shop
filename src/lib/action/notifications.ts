"use server";

import { serverMutation } from "../core/server";
import { getMyFeed, type NotificationQuery } from "../api/notifications";
import type { NotificationItem, NotificationPage } from "@/types";

/**
 * The one feed, for every role.
 *
 * Reads go through `lib/api`, writes through `serverMutation`: the token always
 * comes from the session, so the caller can only ever touch their own lines. A
 * customer, a rider and — once it ships — a vendor read the same endpoint, and
 * so does the store team, whose "own" feed is the shared board.
 */

/** The head of the feed, for the header bell. */
export const loadMyFeed = async (limit: number = 8): Promise<NotificationPage> => {
  return readFeed({ limit });
};

/** One page, for the notifications page: search, chips, order and pager. */
export const loadFeedPage = async (params: NotificationQuery = {}): Promise<NotificationPage> => {
  return readFeed({ limit: 20, ...params });
};

/** Both reads share one shape, so the bell and the page cannot drift apart. */
async function readFeed(params: NotificationQuery): Promise<NotificationPage> {
  const res = await getMyFeed(params);
  const list = res?.data?.lines;

  return {
    // A failed request is not an empty feed: the bell must keep what it has.
    ok: Array.isArray(list),
    items: Array.isArray(list) ? (list as NotificationItem[]) : [],
    total: Number(res?.data?.total) || 0,
    unreadCount: Number(res?.data?.unreadCount) || 0,
    shared: Boolean(res?.data?.shared),
    typeCounts: res?.data?.typeCounts || {},
    pagination:
      res?.data?.pagination ||
      { page: params.page || 1, limit: params.limit || 20, total: 0, totalPages: 1 },
    serverTime: res?.data?.serverTime || new Date().toISOString(),
  };
}

export const markNotificationRead = async (id: string) => {
  return serverMutation(`/activities/mine/${encodeURIComponent(id)}/read`, "", "PATCH");
};

export const markAllNotificationsRead = async () => {
  return serverMutation("/activities/mine/read-all", "", "PATCH");
};
