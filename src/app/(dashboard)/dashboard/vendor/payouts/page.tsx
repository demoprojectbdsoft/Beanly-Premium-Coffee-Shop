import React from "react";
import { getRequiredRole } from "@/lib/core/session";
import { getVendorPayouts } from "@/lib/api/deliveries";
import PayoutsClient from "@/app/(dashboard)/dashboard/admin/payouts/PayoutsClient";
import type { PayoutRange, PayoutsFeed } from "@/types/delivery";

export const dynamic = "force-dynamic";

interface VendorPayoutsPageProps {
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
 * What the riders carrying a seller's orders were paid.
 *
 * The store's payout record, scoped on the server to the orders this seller has
 * a row in. The fee is the store's own charge for the job and is shown in full;
 * the "sales" beside it are the seller's own subtotals, so the ratio on the
 * board is theirs and not the whole cart's.
 */
export default async function VendorPayoutsPage({ searchParams }: VendorPayoutsPageProps) {
  await getRequiredRole("vendor");

  const params = await searchParams;
  const range: PayoutRange = RANGES.includes(params?.range as PayoutRange)
    ? (params.range as PayoutRange)
    : "365";
  const page = Math.max(1, Number(params?.page) || 1);
  const requestedLimit = Number(params?.limit);
  const limit = [20, 50, 100].includes(requestedLimit) ? requestedLimit : 20;
  const sort = SORTS.includes(params?.sort || "") ? (params?.sort as string) : "newest";
  const riderId = params?.riderId?.trim() || "";

  let feed: PayoutsFeed = {
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

  try {
    const res = await getVendorPayouts({
      range,
      page,
      limit,
      sort,
      ...(riderId ? { riderId } : {}),
    });
    feed = res?.data ?? feed;
  } catch (err) {
    console.error("Failed to fetch vendor rider payouts:", err);
  }

  return <PayoutsClient feed={feed} filters={{ range, riderId, sort, page, limit }} />;
}
