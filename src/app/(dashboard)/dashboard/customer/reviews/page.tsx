import React from "react";
import { getUserSession } from "@/lib/core/session";
import { getAllReviews } from "@/lib/api/reviews";
import CustomerReviewsClient from "./CustomerReviewsClient";

export const dynamic = "force-dynamic";

interface CustomerReviewsPageProps {
  searchParams: Promise<{
    search?: string;
    rating?: string;
    sort?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function CustomerReviewsPage({
  searchParams,
}: CustomerReviewsPageProps) {
  const user = await getUserSession();
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 10;

  let reviews: any[] = [];
  let pagination = {
    page,
    limit,
    total: 0,
    totalPages: 1,
  };

  if (user?.id) {
    try {
      // Build query string here in page.tsx
      const query = new URLSearchParams();
      query.set("userId", user.id);
      if (params?.search) query.set("search", params.search);
      if (params?.rating) query.set("rating", params.rating);
      if (params?.sort) query.set("sort", params.sort);
      query.set("page", String(page));
      query.set("limit", String(limit));

      const reviewsRes = await getAllReviews(query.toString());

      reviews = Array.isArray(reviewsRes?.data?.reviews)
        ? reviewsRes.data.reviews
        : Array.isArray(reviewsRes?.data)
        ? reviewsRes.data
        : Array.isArray(reviewsRes)
        ? reviewsRes
        : [];

      pagination = reviewsRes?.data?.pagination ?? {
        page,
        limit,
        total: reviewsRes?.data?.total ?? reviews.length,
        totalPages: Math.max(1, Math.ceil((reviewsRes?.data?.total ?? reviews.length) / limit)),
      };
    } catch (err) {
      console.error("Failed to fetch customer reviews:", err);
    }
  }

  return (
    <CustomerReviewsClient
      initialReviews={reviews}
      pagination={pagination}
      currentUserId={user?.id || ""}
    />
  );
}
