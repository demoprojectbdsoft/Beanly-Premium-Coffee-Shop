import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";
import type { VendorOrder, VendorOrderListResult, VendorOrderSummary } from "@/types/vendor";

/**
 * The seller's order board.
 *
 * Both reads are scoped to the token on the server: there is no vendor id to
 * pass, so the list can only ever contain this shop's fulfilment groups.
 */

export type VendorOrderQuery = {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export const getMyOrders = async (params?: VendorOrderQuery) => {
  return serverFetch(withQuery("/vendor-orders", params), true);
};

export const getMyOrder = async (id: string) => {
  return serverFetch(`/vendor-orders/${id}`, true);
};

export const getMyOrderSummary = async () => {
  return serverFetch("/vendor-orders/summary", true);
};

export const asOrderList = (payload: unknown): VendorOrderListResult | null => {
  return (payload as { data?: VendorOrderListResult } | null)?.data ?? null;
};

export const asOrder = (payload: unknown): VendorOrder | null => {
  return (payload as { data?: VendorOrder } | null)?.data ?? null;
};

export const asOrderSummary = (payload: unknown): VendorOrderSummary | null => {
  return (payload as { data?: VendorOrderSummary } | null)?.data ?? null;
};
