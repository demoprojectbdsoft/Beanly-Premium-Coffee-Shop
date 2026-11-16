import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { VendorDeskReport } from "@/types/vendorDesk";

/**
 * The store team's view of seller money: subscriptions, commission and sales.
 * Read-only, and admin-only on the API.
 */
export const getVendorDesk = async (params?: { months?: number }) => {
  return serverFetch(withQuery("/vendor-desk", params), true);
};

/** The report, or an empty desk when the API could not answer. */
export function asVendorDesk(res: unknown, months: number): VendorDeskReport {
  const data = (res as { data?: Partial<VendorDeskReport> } | null | undefined)?.data;
  return {
    months: data?.months ?? months,
    totals:
      data?.totals ?? {
        vendors: 0,
        activePlans: 0,
        subscriptionIncome: 0,
        monthlyRecurring: 0,
        vendorSales: 0,
        vendorOrders: 0,
        commissionEarned: 0,
        expiringSoon: 0,
        inGrace: 0,
      },
    series: data?.series ?? [],
    plans: data?.plans ?? [],
    topVendors: data?.topVendors ?? [],
  };
}
