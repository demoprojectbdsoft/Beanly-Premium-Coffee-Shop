/**
 * What happened, as far as the notification feed is concerned.
 *
 * The store's lines and each person's own lines are the same document in the
 * same collection — only an owner separates them — so they are one type here
 * too. The API and the app have to agree on these names, because the feed picks
 * the icon and the screen to open from the type.
 */
export type NotificationType =
  // Addressed to the store team.
  | "order"
  | "transaction"
  | "user"
  | "user_deleted"
  | "order_cancelled"
  | "warranty"
  | "message"
  | "review"
  | "delivery"
  // Addressed to the store team, about a marketplace account. The review desk
  // writes these, so they must never be confused with an applicant's own
  // `rider_application` / `vendor_application` line.
  | "rider"
  | "vendor"
  // Addressed to one account.
  | "order_placed"
  | "order_confirmed"
  | "order_processing"
  | "order_shipped"
  | "order_delivered"
  | "delivery_assigned"
  | "delivery_update"
  | "delivery_declined"
  // Rider-specific
  | "rider_application"
  // Vendor-specific
  | "vendor_application"
  | "vendor_subscription"
  | "vendor_order"
  | "vendor_product"
  | "vendor_promotion"
  | "vendor_coupon"
  | "vendor_review"
  | "vendor_stock"
  | "vendor_limit"
  | "vendor_payment";

/** One line, exactly as the API returns it. */
export interface NotificationItem {
  _id: string;
  type: NotificationType;
  /** "New order #ORD-A1B2C3" */
  title: string;
  /** "Nihal Ahmed · 2 items · $129.00" */
  detail?: string;
  /** The value the matching screen can search for. */
  ref?: string;
  /**
   * When its owner opened it. Empty until they do — and always empty on a
   * shared store line, whose dot is kept on the device instead.
   */
  readAt?: string | null;
  createdAt: string;
}

/**
 * Who a personal feed can belong to. The seller side ships later and reuses the
 * same feed, so it is already a first-class audience here.
 */
export type NotificationAudience = "customer" | "rider" | "vendor";

/** Where a paged feed is: what the pager prints. */
export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** How many lines of each kind the current filters would hold, per chip. */
export type NotificationTypeCounts = Record<string, number>;

/**
 * One read of the feed: a page of lines plus everything the screen needs to
 * draw itself — the totals, the per-type counts, and the API clock that stamped
 * the lines (so "3m ago" is measured with the same clock, whatever the
 * visitor's system time happens to say).
 */
export interface NotificationPage {
  items: NotificationItem[];
  total: number;
  /** Unread lines for this account. Always 0 on a shared list. */
  unreadCount: number;
  /**
   * True when these are the store team's shared lines. Their read marks live on
   * the device, because one admin's read must not clear the whole team's.
   */
  shared: boolean;
  typeCounts: NotificationTypeCounts;
  pagination: NotificationPagination;
  /** ISO timestamp of the API at the moment it answered. */
  serverTime: string;
  /**
   * False when the API could not be reached or refused the caller. The bell
   * then keeps the lines it already has instead of blanking itself.
   */
  ok: boolean;
}
