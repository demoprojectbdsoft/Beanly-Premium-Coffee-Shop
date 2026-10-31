import type { Coupon, CouponState } from "@/types";
import { formatPrice } from "@/lib/currency";
import { formatOrderDate } from "@/lib/dateTime";

/**
 * What a discount code says about itself, in the words both desks use.
 *
 * The seller's coupons desk and the store team's see the same rows from two
 * points of view, so the badge colours, the money and the window are written once
 * here. Only the empty scope differs: a seller's uncovered code covers their shop,
 * a staff one covers the whole store.
 */

export const COUPON_STATE_STYLES: Record<CouponState, { label: string; badge: string }> = {
  live: {
    label: "Running",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  upcoming: {
    label: "Scheduled",
    badge:
      "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-300",
  },
  expired: {
    label: "Ended",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  stopped: {
    label: "Stopped",
    badge: "border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground-muted)]",
  },
};

export const getCouponStateStyle = (state: CouponState) => COUPON_STATE_STYLES[state] || COUPON_STATE_STYLES.stopped;

/** What the code takes off, in the words an owner would use. */
export function couponDiscountWords(coupon: Coupon, currency: string): string {
  if (coupon.discountType === "percentage") {
    const cap =
      coupon.maxDiscountAmount > 0
        ? `, up to ${formatPrice(coupon.maxDiscountAmount, currency)}`
        : "";
    return `${coupon.discountValue}% off${cap}`;
  }
  return `${formatPrice(coupon.discountValue, currency)} off`;
}

/** The window, written once when only one end matters. */
export function couponWindowWords(coupon: Coupon): string {
  const start = formatOrderDate(coupon.startDate);
  const end = formatOrderDate(coupon.endDate);
  if (!start && !end) return "No dates set";
  if (!start) return `Until ${end}`;
  if (!end) return `From ${start}`;
  return `${start} → ${end}`;
}

/**
 * What the code is allowed to touch.
 *
 * The staff list reads the names behind the ids, so it can say "Laptops" where
 * the seller's desk can only count. A code that names nothing covers everything
 * its owner may discount — which is why the last word depends on who is asking.
 */
export function couponScopeWords(coupon: Coupon, view: "seller" | "staff"): string {
  const parts: string[] = [];

  // A code may name up to a hundred lines, which is a list nobody reads on a
  // row. The first few carry the meaning; the rest are counted.
  const named = (ids: string[], names: string[], one: string, many: string) => {
    if (names.length !== ids.length) return `${ids.length} ${ids.length === 1 ? one : many}`;
    return names.length > 3
      ? `${names.slice(0, 3).join(", ")} +${names.length - 3} more`
      : names.join(", ");
  };

  if (coupon.categoryIds.length > 0) {
    parts.push(named(coupon.categoryIds, coupon.categoryNames, "category", "categories"));
  }

  if (coupon.productIds.length > 0) {
    parts.push(named(coupon.productIds, coupon.productNames, "named product", "named products"));
  }

  if (parts.length === 0) return view === "seller" ? "Whole shop" : "Everything in the store";
  return parts.join(" · ");
}

/** How much of the code has been spent. */
export function couponUsageWords(coupon: Coupon): string {
  if (coupon.totalUsageLimit > 0) {
    return `${coupon.usedCount} of ${coupon.totalUsageLimit} used · ${coupon.remaining} left`;
  }
  return `${coupon.usedCount} used · no cap`;
}
