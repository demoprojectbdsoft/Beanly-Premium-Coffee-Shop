"use server";

import { serverMutation } from "../core/server";
import { getUserSession } from "../core/session";
import { isAdminRole } from "../core/roles";
import type { PromotionGrantDraft } from "@/types";

/**
 * The store team's promotions board.
 *
 * Hiding the button is not a permission: each write checks the role again on the
 * server. A grant says what to lift and for how many days — never whose shop it
 * is, which the API reads from the product or the seller named.
 *
 * A clash answers `409` with how much time is already booked on that shelf, so
 * the message is shown rather than swallowed.
 */

/** Lifts one product, or a whole shop, for the days asked for. */
export const grantPromotion = async (data: PromotionGrantDraft) => {
  const user = await getUserSession();
  if (!isAdminRole(user)) {
    return { success: false as const, message: "Admin access required." };
  }
  return serverMutation("/promotions", data, "POST");
};

/**
 * Ends a placement early, with the reason the seller will read.
 *
 * An empty box sends no reason at all rather than an empty string, so the API's
 * own "Ended by the store team" is what lands on the row.
 */
export const revokePromotion = async (id: string, reason: string) => {
  const user = await getUserSession();
  if (!isAdminRole(user)) {
    return { success: false as const, message: "Admin access required." };
  }
  const trimmed = reason.trim();
  return serverMutation(`/promotions/${id}`, trimmed ? { reason: trimmed } : {}, "DELETE");
};

/**
 * Runs the daily sweep by hand.
 *
 * The scheduled job does this every night; the button exists so the board can be
 * brought back in line the moment someone notices a shelf that should have gone
 * dark. The API answers with how many rows it closed.
 */
export const runPromotionSweep = async () => {
  const user = await getUserSession();
  if (!isAdminRole(user)) {
    return { success: false as const, message: "Admin access required." };
  }
  return serverMutation("/promotions/expire", null, "GET");
};
