import React from "react";
import { getRequiredRole } from "@/lib/core/session";
import { asOrderList, getMyOrders } from "@/lib/api/vendorOrders";
import { getSiteSettings } from "@/lib/api/siteSettings";
import type { VendorOrderListResult } from "@/types/vendor";
import VendorOrdersClient from "./VendorOrdersClient";

export const dynamic = "force-dynamic";

/**
 * The seller's order board.
 *
 * The rows are the vendor's own fulfilment groups, never the parent orders:
 * an order containing three sellers appears here three times, once per shop.
 */
interface VendorOrdersPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function VendorOrdersPage({ searchParams }: VendorOrdersPageProps) {
  await getRequiredRole("vendor");

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const requestedLimit = Number(params?.limit);
  const limit = [10, 20, 50].includes(requestedLimit) ? requestedLimit : 10;
  const status = params?.status || "all";
  const search = params?.search?.trim() || "";

  const [ordersRes, settingsRes] = await Promise.all([
    getMyOrders({ status, search, page, limit }),
    getSiteSettings(),
  ]);

  const result: VendorOrderListResult | null = asOrderList(ordersRes);

  return (
    <VendorOrdersClient
      orders={result?.orders ?? []}
      typeCounts={result?.typeCounts ?? {}}
      pagination={result?.pagination ?? { page, limit, total: 0, totalPages: 1 }}
      filters={{ status, search }}
      currency={settingsRes?.data?.currency || "BDT"}
    />
  );
}
