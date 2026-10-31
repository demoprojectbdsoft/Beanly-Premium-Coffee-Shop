import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";

/**
 * The seller's featured placements.
 *
 * Read through the token, never through a vendor id, so this desk can only ever
 * list the signed-in shop's own shelves. The length and the countdown come from
 * the API: the screen draws `daysRemaining`, it does not subtract two dates.
 * The row narrowing is shared with the store team's board, because it is the
 * same row.
 */

export { asPromotion, asPromotionList } from "./promotions";

export type VendorPromotionQuery = {
  status?: string;
  kind?: string;
  page?: number;
  limit?: number;
};

export const getMyPromotions = async (params?: VendorPromotionQuery) => {
  return serverFetch(withQuery("/vendor-promotions", params), true);
};
