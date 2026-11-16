import React from "react";
import { getRequiredRole } from "@/lib/core/session";
import { getVendorReviews } from "@/lib/api/reviews";
import ReviewsClient from "@/app/(dashboard)/dashboard/admin/reviews/ReviewsClient";

export const dynamic = "force-dynamic";

interface VendorReviewsPageProps {
  searchParams: Promise<{
    search?: string;
    rating?: string;
    sort?: string;
    page?: string;
    limit?: string;
  }>;
}

/**
 * What customers said about this seller's listings.
 *
 * The store's review board, not a copy: the same rating tabs, search and detail
 * view. Only the read changes — `/reviews/vendor` is scoped on the server to
 * the products this seller owns — and the delete action refuses anything else.
 */
export default async function VendorReviewsPage({ searchParams }: VendorReviewsPageProps) {
  await getRequiredRole("vendor");

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = [10, 20, 50].includes(Number(params?.limit)) ? Number(params?.limit) : 10;

  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.rating) query.set("rating", params.rating);
  if (params?.sort) query.set("sort", params.sort);
  query.set("page", String(page));
  query.set("limit", String(limit));

  let reviewsRes: Awaited<ReturnType<typeof getVendorReviews>> = null;
  try {
    reviewsRes = await getVendorReviews(query.toString());
  } catch (err) {
    console.error("Failed to fetch vendor reviews:", err);
  }

  const reviews = Array.isArray(reviewsRes?.data?.reviews)
    ? reviewsRes.data.reviews
    : Array.isArray(reviewsRes?.data)
    ? reviewsRes.data
    : Array.isArray(reviewsRes)
    ? reviewsRes
    : [];

  const pagination = reviewsRes?.data?.pagination ?? {
    page,
    limit,
    total: reviewsRes?.data?.total ?? reviews.length,
    totalPages: Math.max(1, Math.ceil((reviewsRes?.data?.total ?? reviews.length) / limit)),
  };

  return <ReviewsClient initialReviews={reviews} pagination={pagination} />;
}
