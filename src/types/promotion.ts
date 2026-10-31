/**
 * One featured placement — a shelf bought for a window, not a checkbox.
 *
 * The same row serves both desks: a seller pins one of their own listings for
 * the length their plan states, and the store team grants a placement either on
 * a product or on a whole shop. `state` is the server's reading of the status
 * and the clock together, so a screen never calls a lapsed placement "live"
 * while the daily sweep is still on its way.
 */

import type { VendorPagination } from "./vendor";

export type PromotionKind = "product" | "store";

/** Who paid for the shelf: the seller's plan, or the store team. */
export type PromotionSource = "subscription" | "admin";

/** `state` read against `endsAt`; `status` is the stored row. */
export type PromotionState = "live" | "ended" | "cancelled";

export interface PromotionProduct {
  _id: string;
  title: string;
  image: string;
  price: number;
  vendorProductStatus: string;
  isFeatured: boolean;
}

/** Enough of the shop to draw a row that says whose shelf this is. */
export interface PromotionStore {
  _id: string;
  name: string;
  slug: string;
  logo: string;
}

export interface FeaturedPlacement {
  _id: string;
  kind: PromotionKind;
  /** The stored row — `active` even after its date, until the sweep runs. */
  status: string;
  state: PromotionState;
  source: PromotionSource;
  plan: string;
  vendorId: string | null;
  storeId: string | null;
  subscriptionId: string | null;
  productId: string | null;
  /** Attached so the row can be drawn without a second read per placement. */
  product: PromotionProduct | null;
  store: PromotionStore | null;
  vendorName: string;
  startsAt: string | null;
  endsAt: string | null;
  endedAt: string | null;
  /** Why the shelf went quiet, in words the seller reads. */
  endedReason: string;
  daysRemaining: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PromotionListResult {
  promotions: FeaturedPlacement[];
  total: number;
  stateCounts: Record<string, number>;
  pagination: VendorPagination;
}

/**
 * What the store team may ask for.
 *
 * The shop a grant belongs to is never in the payload: it is read from the
 * product or the seller named here, so a request cannot park one shop's goods on
 * another's shelf.
 */
export interface PromotionGrantDraft {
  kind: PromotionKind;
  productId?: string;
  vendorId?: string;
  days: number;
  reason?: string;
}
