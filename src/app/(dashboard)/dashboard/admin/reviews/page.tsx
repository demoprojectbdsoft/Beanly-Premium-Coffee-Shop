import React from "react";
import { getAllReviews } from "@/lib/api/reviews";
import ReviewsClient from "./ReviewsClient";

export const dynamic = "force-dynamic";

interface AdminReviewsPageProps {
  searchParams: Promise<{
    search?: string;
    rating?: string;
    sort?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function AdminReviewsPage({ searchParams }: AdminReviewsPageProps) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 10;

  // Build query string here in page.tsx
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.rating) query.set("rating", params.rating);
  if (params?.sort) query.set("sort", params.sort);
  query.set("page", String(page));
  query.set("limit", String(limit));

  const reviewsRes = await getAllReviews(query.toString());

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

  return (
    <ReviewsClient
      initialReviews={reviews}
      pagination={pagination}
    />
  );
}
