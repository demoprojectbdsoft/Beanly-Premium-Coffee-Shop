import React from "react";
import { getRequiredRole } from "@/lib/core/session";
import { getAdminPayouts } from "@/lib/api/deliveries";
import PayoutsClient from "./PayoutsClient";
import type { PayoutRange, PayoutsFeed } from "@/types/delivery";

export const dynamic = "force-dynamic";

interface AdminPayoutsPageProps {
  searchParams: Promise<{
    range?: string;
    riderId?: string;
    sort?: string;
    page?: string;
    limit?: string;
  }>;
}

const RANGES: PayoutRange[] = ["30", "90", "365", "all"];
const SORTS = ["newest", "oldest", "fee_desc"];

/**
 * The store's payout record.
 *
 * One read carries everything the board needs: the totals, the graph buckets, the
 * per-rider split and the first page of rows. The graph is folded in the database,
 * so asking for ten years of payouts costs the same as asking for a week.
 */
export default async function AdminPayoutsPage({ searchParams }: AdminPayoutsPageProps) {
  await getRequiredRole("admin");

  const params = await searchParams;
  const range: PayoutRange = RANGES.includes(params?.range as PayoutRange)
    ? (params.range as PayoutRange)
    : "365";
  const page = Math.max(1, Number(params?.page) || 1);
  const requestedLimit = Number(params?.limit);
  const limit = [20, 50, 100].includes(requestedLimit) ? requestedLimit : 20;
  const sort = SORTS.includes(params?.sort || "") ? (params?.sort as string) : "newest";
  const riderId = params?.riderId?.trim() || "";

  const res = await getAdminPayouts({
    range,
    page,
    limit,
    sort,
    ...(riderId ? { riderId } : {}),
  });

  const feed: PayoutsFeed = res?.data ?? {
    range,
    totals: {
      jobs: 0,
      paid: 0,
      sales: 0,
      feeSharePct: 0,
      avgPerJob: 0,
      paidThisMonth: 0,
      monthJobs: 0,
    },
    outstanding: { jobs: 0, amount: 0 },
    series: [],
    byRider: [],
    records: [],
    pagination: { page, limit, total: 0, totalPages: 1 },
  };

  return (
    <PayoutsClient
      feed={feed}
      filters={{ range, riderId, sort, page, limit }}
    />
  );
}
