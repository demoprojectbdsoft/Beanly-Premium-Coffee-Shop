"use server";

import { serverMutation } from "../core/server";
import { getUserSession } from "../core/session";
import { isVendorRole } from "../core/roles";
import type { CouponDraft } from "@/types";

/**
 * The seller's own discount codes.
 *
 * A 403 from this desk is a plan message rather than a break-in — hitting the
 * coupon allowance, or trading from a suspended shop, both have a reason the
 * seller needs to read. So every write here asks for the reason instead of being
 * bounced to the forbidden page.
 *
 * The owner is never in the payload: the API reads it from the token, so one of
 * these calls cannot be pointed at another shop's code.
 */

/** Writes a new code, if the plan still has an empty slot for it. */
export const createVendorCoupon = async (data: CouponDraft) => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation("/vendor-coupons", data, "POST", { explainForbidden: true });
};

/** Edits one of the caller's own codes; waking a stopped one costs a slot. */
export const updateVendorCoupon = async (id: string, data: Partial<CouponDraft>) => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation(`/vendor-coupons/${id}`, data, "PATCH", { explainForbidden: true });
};

/** Flips one switch without resending the code, so a live code can be stopped. */
export const setVendorCouponActive = async (id: string, isActive: boolean) => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation(`/vendor-coupons/${id}`, { isActive }, "PATCH", {
    explainForbidden: true,
  });
};

/** Clears a code nobody has used yet; a spent one is only stopped. */
export const deleteVendorCoupon = async (id: string) => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation(`/vendor-coupons/${id}`, {}, "DELETE", { explainForbidden: true });
};
