"use server";

import { serverMutation } from "../core/server";
import { getUserSession } from "../core/session";
import { isVendorRole } from "../core/roles";

/**
 * The seller's featured placements.
 *
 * A placement is bought, so every refusal here is a plan answer the seller has
 * to be able to read — no slots left, a listing that cannot be bought, a shop
 * that is suspended, a plan that has ended. That is why both writes ask the
 * shared mutation helper for the reason instead of being bounced to the
 * forbidden page.
 *
 * Nothing in the payload names the seller or the length in days: the API reads
 * the account from the token and the window from the live plan.
 */

/** Pins one of the seller's own listings for the window the plan states. */
export const featureMyProduct = async (productId: string) => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation("/vendor-promotions", { productId }, "POST", {
    explainForbidden: true,
  });
};

/**
 * Frees the shelf early.
 *
 * The row is kept by the API, so the desk can still say what ran and when it
 * stopped — a cancel is not an erasure.
 */
export const cancelMyPromotion = async (id: string) => {
  const user = await getUserSession();
  if (!isVendorRole(user)) {
    return { success: false as const, message: "Vendor access required." };
  }
  return serverMutation(`/vendor-promotions/${id}`, {}, "DELETE", {
    explainForbidden: true,
  });
};
