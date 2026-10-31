import {
  Bell,
  CircleCheck,
  CircleX,
  CreditCard,
  Inbox,
  Mail,
  Navigation,
  Package,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
  UserPlus,
  UserX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { NotificationAudience, NotificationItem, NotificationType } from "@/types";

/**
 * How a notification looks, what it is called and where it goes.
 *
 * One table for every role. A store line and a personal line are the same
 * document in the same collection — only an owner separates them — so they are
 * also the same type, the same icon and the same word here. What changes is
 * only which screen a line opens, and that is the single place the reader's
 * side of the app is taken into account.
 */

/** Which side of the app is reading. "store" is the admin team's shared board. */
export type NotificationView = NotificationAudience | "store";

/** One icon per type, so a glance tells the story. */
export const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  // Addressed to the store team.
  order: ShoppingBag,
  transaction: CreditCard,
  user: UserPlus,
  user_deleted: UserX,
  order_cancelled: CircleX,
  warranty: ShieldCheck,
  message: Mail,
  review: Star,
  delivery: Truck,
  // Addressed to one account.
  order_placed: ShoppingBag,
  order_confirmed: CircleCheck,
  order_processing: Package,
  order_shipped: Truck,
  order_delivered: PackageCheck,
  delivery_assigned: Inbox,
  delivery_update: Navigation,
  delivery_declined: CircleX,
};

/** The bell, used whenever a line carries a type this build predates. */
export const NOTIFICATION_FALLBACK_ICON = Bell;

/** The word printed on a filter chip. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  order: "Orders",
  transaction: "Payments",
  user: "New accounts",
  user_deleted: "Deleted accounts",
  order_cancelled: "Cancellations",
  warranty: "Warranties",
  message: "Messages",
  review: "Reviews",
  delivery: "Deliveries",
  order_placed: "Placed",
  order_confirmed: "Confirmed",
  order_processing: "Processing",
  order_shipped: "Shipped",
  order_delivered: "Delivered",
  delivery_assigned: "Requests",
  delivery_update: "Delivery updates",
  delivery_declined: "Declined",
};

/**
 * The chips in the order they are written. A chip with no lines under the
 * current search is dropped by the page itself, so a customer never sees the
 * store's words and an admin never sees a customer's.
 */
export const NOTIFICATION_TYPE_ORDER = Object.keys(
  NOTIFICATION_TYPE_LABELS
) as NotificationType[];

/**
 * Where one line sends its reader.
 *
 * A line only stores the value to look for, never a route, so a line saved
 * months ago still opens the right page after a rename. A rider has one screen
 * per kind of work: a request is answered, a delivery is opened. A customer's
 * delivery update carries the order id, so it opens the live tracking page —
 * the only screen with the rider's position and the code to read at the door.
 * The seller workspace ships later and keeps reading from this same centre
 * until then, which is why its route is the centre itself.
 */
export function notificationHref(
  notification: Pick<NotificationItem, "type" | "ref">,
  view: NotificationView
): string {
  const ref = encodeURIComponent(notification.ref || "");

  if (view === "store") {
    switch (notification.type) {
      case "order":
      case "order_cancelled":
      case "delivery":
        // The orders list searches ids, so the full order id finds exactly one.
        return `/dashboard/admin/orders${ref ? `?search=${ref}` : ""}`;
      case "transaction":
        return `/dashboard/admin/transactions${ref ? `?search=${ref}` : ""}`;
      case "user":
        return `/dashboard/admin/users${ref ? `?search=${ref}` : ""}`;
      case "user_deleted":
        // The account is gone, so there is nothing left to search for.
        return "/dashboard/admin/users";
      case "warranty":
        // "all" because new coverage is not claimed yet, and the claims view
        // that the page opens on would hide exactly the record this line is
        // about.
        return `/dashboard/admin/warranties?status=all${ref ? `&orderId=${ref}` : ""}`;
      case "message":
        return `/dashboard/admin/messages${ref ? `?search=${ref}` : ""}`;
      case "review":
        return `/dashboard/admin/reviews${ref ? `?search=${ref}` : ""}`;
      default:
        return "/dashboard/admin";
    }
  }

  if (view === "customer") {
    if (notification.type === "delivery_update" && ref) return `/track-order/${ref}`;
    return `/dashboard/customer/orders${ref ? `?search=${ref}` : ""}`;
  }

  if (view === "rider") {
    if (notification.type === "delivery_assigned") return "/dashboard/rider/requests";
    return `/dashboard/rider/deliveries${ref ? `?search=${ref}` : ""}`;
  }

  return `/dashboard/vendor/notifications${ref ? `?search=${ref}` : ""}`;
}

/** What an empty feed says, which depends on what the account can be told. */
export const NOTIFICATION_EMPTY: Record<NotificationView, string> = {
  customer: "Order and delivery updates show up here.",
  rider: "Delivery requests and delivery updates show up here.",
  vendor: "Seller updates show up here.",
  store: "Orders, payments, new users, warranties, messages and deliveries show up here.",
};

/** Where the "see everything" link under the bell points for each view. */
export const NOTIFICATION_CENTRE_HREF: Record<NotificationView, string> = {
  customer: "/dashboard/customer/notifications",
  rider: "/dashboard/rider/notifications",
  vendor: "/dashboard/vendor/notifications",
  store: "/dashboard/admin/notifications",
};

/** The heading and the one-line description of each notifications page. */
export const NOTIFICATION_PAGE_COPY: Record<
  NotificationView,
  { title: string; description: string }
> = {
  customer: {
    title: "Notifications",
    description: "Order confirmations, shipping updates and delivery news.",
  },
  rider: {
    title: "Notifications",
    description: "New delivery requests and updates about the deliveries you own.",
  },
  vendor: {
    title: "Notifications",
    description: "Order, payout and listing news for your shop.",
  },
  store: {
    title: "Notifications",
    description: "Every order, payment, account, warranty, message and delivery the store handled.",
  },
};

/** The one-word title the bell's panel carries for each view. */
export const NOTIFICATION_PANEL_TITLE: Record<NotificationView, string> = {
  customer: "Notifications",
  rider: "Notifications",
  vendor: "Notifications",
  store: "Notifications",
};
