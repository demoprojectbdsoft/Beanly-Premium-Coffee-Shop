import type { Coupon, CouponDraft } from "@/types";

/**
 * The one place a code's shape is worked out before the API sees it.
 *
 * Both coupon desks — the seller's and the store team's — fill the same draft and
 * would otherwise repeat the same typos-and-dates checks. Nothing here decides
 * what a code is worth: these are only the shapes the API would reject anyway,
 * caught before the round trip.
 */

/** A `datetime-local` input wants the wall-clock form, not the ISO string. */
export function toInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function daysFromNow(days: number): string {
  return toInputValue(new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString());
}

/** A week from now, which is the window a code is usually written for. */
export function blankCouponDraft(): CouponDraft {
  return {
    code: "",
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    startDate: toInputValue(new Date().toISOString()),
    endDate: daysFromNow(7),
    totalUsageLimit: 0,
    perCustomerLimit: 0,
    productIds: [],
    categoryIds: [],
    isActive: true,
  };
}

/** Every field is sent back as the form holds it, so editing changes what is shown. */
export function couponDraftFrom(coupon: Coupon): CouponDraft {
  return {
    code: coupon.code,
    title: coupon.title,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderAmount: coupon.minOrderAmount,
    maxDiscountAmount: coupon.maxDiscountAmount,
    startDate: toInputValue(coupon.startDate),
    endDate: toInputValue(coupon.endDate),
    totalUsageLimit: coupon.totalUsageLimit,
    perCustomerLimit: coupon.perCustomerLimit,
    productIds: [...coupon.productIds],
    categoryIds: [...coupon.categoryIds],
    isActive: coupon.isActive,
  };
}

/** The rules the validator shares, in the order a person fills the form in. */
export function validateCouponDraft(draft: CouponDraft): string | null {
  const code = draft.code.trim().toUpperCase();

  if (code.length < 3) return "A code needs at least 3 characters";
  if (code.length > 32) return "A code cannot be longer than 32 characters";
  if (!/^[A-Z0-9_-]+$/.test(code)) {
    return "Use capital letters, numbers, hyphens and underscores only";
  }
  if (!(draft.discountValue > 0)) return "A coupon has to take something off";
  if (draft.discountType === "percentage" && draft.discountValue > 100) {
    return "A percentage is between 1 and 100";
  }
  if (!draft.startDate || !draft.endDate) return "Pick the day it starts and the day it ends";

  const starts = new Date(draft.startDate).getTime();
  const ends = new Date(draft.endDate).getTime();
  if (Number.isNaN(starts) || Number.isNaN(ends)) return "Those dates do not read correctly";
  if (ends <= starts) return "A coupon has to end after it starts";

  return null;
}

/** The payload the API wants: upper-cased code, real ISO dates. */
export function couponPayload(draft: CouponDraft): CouponDraft {
  return {
    ...draft,
    code: draft.code.trim().toUpperCase(),
    startDate: new Date(draft.startDate).toISOString(),
    endDate: new Date(draft.endDate).toISOString(),
  };
}
