import React from "react";
import { getRequiredRole } from "@/lib/core/session";
import { getVendorApplications } from "@/lib/api/vendor";
import type { VendorApplicationListResult } from "@/types/vendor";
import VendorApplicationsClient from "./VendorApplicationsClient";

export const dynamic = "force-dynamic";

/**
 * The store team's review queue.
 *
 * One read answers both the table and the chips above it, so the counts and the
 * rows can never describe different moments. Nothing is cached: a decision made
 * a second ago must be gone from the "pending" chip on the next render.
 */
interface AdminVendorsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function AdminVendorsPage({ searchParams }: AdminVendorsPageProps) {
  await getRequiredRole("admin");

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const requestedLimit = Number(params?.limit);
  const limit = [10, 20, 50].includes(requestedLimit) ? requestedLimit : 10;
  const status = params?.status || "all";
  const search = params?.search?.trim() || "";

  const response = await getVendorApplications({ status, search, page, limit });

  const fallbackPagination = { page, limit, total: 0, totalPages: 1 };
  const result: VendorApplicationListResult = response?.data ?? {
    applications: [],
    total: 0,
    typeCounts: {},
    pagination: fallbackPagination,
  };

  return (
    <VendorApplicationsClient
      applications={result.applications ?? []}
      typeCounts={result.typeCounts ?? {}}
      pagination={result.pagination ?? fallbackPagination}
      filters={{ status, search, limit }}
    />
  );
}
