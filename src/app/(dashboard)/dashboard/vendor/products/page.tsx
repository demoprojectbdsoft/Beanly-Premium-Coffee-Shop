import React from "react";
import { getRequiredRole } from "@/lib/core/session";
import { asProductList, getMyProducts } from "@/lib/api/vendorProducts";
import type { VendorProductListResult } from "@/types/vendor";
import VendorProductsClient from "./VendorProductsClient";

export const dynamic = "force-dynamic";

/**
 * The vendor's catalogue.
 *
 * The plan usage and the rows come from one read, so the "x / y used" line can
 * never describe a different moment than the table beneath it.
 */
interface VendorProductsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function VendorProductsPage({ searchParams }: VendorProductsPageProps) {
  await getRequiredRole("vendor");

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const requestedLimit = Number(params?.limit);
  const limit = [10, 20, 50].includes(requestedLimit) ? requestedLimit : 10;
  const status = params?.status || "all";
  const search = params?.search?.trim() || "";

  const result: VendorProductListResult | null = asProductList(
    await getMyProducts({ status, search, page, limit })
  );

  const fallbackPlan = {
    id: "free" as const,
    name: "Free",
    maxProducts: 10,
    used: 0,
    isLive: false,
    effectiveUntil: null,
  };

  return (
    <VendorProductsClient
      products={result?.products ?? []}
      typeCounts={result?.typeCounts ?? {}}
      pagination={result?.pagination ?? { page, limit, total: 0, totalPages: 1 }}
      plan={result?.plan ?? fallbackPlan}
      filters={{ status, search }}
    />
  );
}
