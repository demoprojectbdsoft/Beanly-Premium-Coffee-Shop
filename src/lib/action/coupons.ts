"use server";

import { serverMutation } from "../core/server";
import { getUserSession } from "../core/session";
import { isAdminRole, shopperBlockedResult } from "../core/roles";
import type { CouponDraft } from "@/types";

/**
 * Asking the API what a code is worth on this basket.
 *
 * The cart sends product ids and quantities and nothing else. Prices, sellers and
 * categories are read back by the API, so the discount on screen is the discount
 * the checkout will settle on — a browser cannot price its own deal, and a code
 * that belongs to one seller quietly ignores another shop's goods.
 */
export const checkCouponCode = async (
  code: string,
  items: { productId: string; quantity: number }[]
) => {
  const user = await getUserSession();
  if (!user?.id) {
    return { success: false as const, message: "Sign in to use a promo code." };
  }

  const blocked = shopperBlockedResult(user, "check a promo code");
  if (blocked) return blocked;

  return serverMutation("/coupons/validate", { code, items });
};

/**
 * The store team's own codes.
 *
 * These write store-wide codes: the API sets `ownerType` from the route, never
 * from the body, and it refuses a write aimed at a seller's row. So this desk
 * cannot renew a shop's code behind their back and cannot discount somebody
 * else's goods by accident — the reach of a code is decided by who owns it.
 *
 * Hiding the button is not a permission: each write checks the role again here.
 */

/** Publishes a code that can touch anything in the store. */
export const createStoreCoupon = async (data: CouponDraft) => {
  const user = await getUserSession();
  if (!isAdminRole(user)) {
    return { success: false as const, message: "Admin access required." };
  }
  return serverMutation("/coupons", data, "POST");
};

/** Edits a store code. Every field is optional, so one switch can be flipped alone. */
export const updateStoreCoupon = async (id: string, data: Partial<CouponDraft>) => {
  const user = await getUserSession();
  if (!isAdminRole(user)) {
    return { success: false as const, message: "Admin access required." };
  }
  return serverMutation(`/coupons/${id}`, data, "PATCH");
};

/** Stops a running code, or brings a stopped one back. */
export const setStoreCouponActive = async (id: string, isActive: boolean) => {
  const user = await getUserSession();
  if (!isAdminRole(user)) {
    return { success: false as const, message: "Admin access required." };
  }
  return serverMutation(`/coupons/${id}`, { isActive }, "PATCH");
};

/** Clears a code nobody has used yet; a spent one is only stopped, and the API says which. */
export const deleteStoreCoupon = async (id: string) => {
  const user = await getUserSession();
  if (!isAdminRole(user)) {
    return { success: false as const, message: "Admin access required." };
  }
  return serverMutation(`/coupons/${id}`, {}, "DELETE");
};
