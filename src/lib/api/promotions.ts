import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { FeaturedPlacement, PromotionListResult } from "@/types";

/**
 * The store team's promotions board.
 *
 * The board reads everyone's placements or one seller's, and the narrowing
 * helpers live here because the shape is the same one the seller's own desk
 * uses — one row, one reader, whichever desk asked for it.
 */

export type PromotionQuery = {
  status?: string;
  kind?: string;
  vendorId?: string;
  page?: number;
  limit?: number;
};

export const getPromotions = async (params?: PromotionQuery) => {
  return serverFetch(withQuery("/promotions", params), true);
};

/** A null read becomes an empty board rather than a crashed render. */
export const asPromotionList = (payload: unknown): PromotionListResult | null => {
  return (payload as { data?: PromotionListResult } | null)?.data ?? null;
};

export const asPromotion = (payload: unknown): FeaturedPlacement | null => {
  return (payload as { data?: FeaturedPlacement } | null)?.data ?? null;
};
