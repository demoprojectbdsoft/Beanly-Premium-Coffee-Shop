import { serverFetch } from "../core/server"
import { withQuery } from "../core/query"

export const getReviewsByProductId = async (productId: string) => {
  return serverFetch(withQuery("/reviews", { productId }));
}

export const getReviewsByUserId = async (userId: string) => {
  return serverFetch(withQuery("/reviews", { userId }));
}

/** Admin listing — accepts a pre-built query string from the dashboard. */
export const getAllReviews = async (query?: string) => {
  return serverFetch(`/reviews${query ? `?${query}` : ""}`, true);
};

/** The seller's own feed, scoped on the server to the listings they own. */
export const getVendorReviews = async (query?: string) => {
  return serverFetch(`/reviews/vendor${query ? `?${query}` : ""}`, true);
};