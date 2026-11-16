import React from "react";
import { getRequiredRole } from "@/lib/core/session";
import { getVendorDeliveries, getVendorDeliveryOverview } from "@/lib/api/deliveries";
import AdminDeliveriesClient from "@/app/(dashboard)/dashboard/admin/deliveries/AdminDeliveriesClient";
import type {
  AdminDeliveryOverview,
  DeliveryFeed,
  DeliveryPagination,
} from "@/types/delivery";

export const dynamic = "force-dynamic";

interface VendorDeliveriesPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    sort?: string;
    page?: string;
    limit?: string;
  }>;
}

const EMPTY_OVERVIEW: AdminDeliveryOverview = {
  statusCounts: {},
  total: 0,
  active: 0,
  waiting: 0,
  deliveredToday: 0,
  onlineRiders: 0,
  shippedWithoutRider: 0,
  onTheRoad: 0,
};

/**
 * The parcels from a seller's own orders.
 *
 * The store's board itself, read-only: `/deliveries/vendor` and its overview
 * are scoped on the server to the orders this seller has a row in. Assigning
 * and cancelling stay with the store team, because only they see every shop's
 * load at once — the page simply does not offer those buttons here.
 */
export default async function VendorDeliveriesPage({ searchParams }: VendorDeliveriesPageProps) {
  await getRequiredRole("vendor");

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const requestedLimit = Number(params?.limit);
  const limit = [10, 20, 50].includes(requestedLimit) ? requestedLimit : 10;
  const status = params?.status || "all";
  const search = params?.search?.trim() || "";
  const sort = ["newest", "oldest", "fee_desc"].includes(params?.sort || "")
    ? (params?.sort as string)
    : "newest";

  const fallbackPagination: DeliveryPagination = { page, limit, total: 0, totalPages: 1 };
  let feed: DeliveryFeed = {
    deliveries: [],
    total: 0,
    pendingRequests: 0,
    pagination: fallbackPagination,
  };
  let overview: AdminDeliveryOverview = EMPTY_OVERVIEW;

  try {
    const [feedRes, overviewRes] = await Promise.all([
      getVendorDeliveries({ status, search, sort, page, limit }),
      getVendorDeliveryOverview(),
    ]);
    feed = feedRes?.data ?? feed;
    overview = overviewRes?.data ?? overview;
  } catch (err) {
    console.error("Failed to fetch vendor deliveries:", err);
  }

  return (
    <AdminDeliveriesClient
      deliveries={feed.deliveries}
      pagination={feed.pagination ?? fallbackPagination}
      overview={overview}
      filters={{ status, search, sort, limit }}
    />
  );
}
