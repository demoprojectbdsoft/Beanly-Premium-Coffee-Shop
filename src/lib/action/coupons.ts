"use server";

import { serverMutation } from "../core/server";
import { getUserSession } from "../core/session";
import { shopperBlockedResult } from "../core/roles";

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
