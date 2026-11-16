import React from "react";
import { getRequiredRole } from "@/lib/core/session";
import { getVendorTransactions } from "@/lib/api/transactions";
import TransactionsClient from "@/app/(dashboard)/dashboard/admin/transactions/TransactionsClient";

export const dynamic = "force-dynamic";

interface VendorTransactionsPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    method?: string;
    sort?: string;
    page?: string;
    limit?: string;
  }>;
}

/**
 * The payments behind a seller's own orders.
 *
 * The store's ledger, read-only, scoped on the server to the orders this
 * seller has a row in. A customer pays once for the whole cart, so each row's
 * amount is replaced by this seller's subtotal on that order: what the payment
 * actually carried for them.
 */
export default async function VendorTransactionsPage({
  searchParams,
}: VendorTransactionsPageProps) {
  await getRequiredRole("vendor");

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const requestedLimit = Number(params?.limit);
  const limit = [10, 20, 50].includes(requestedLimit) ? requestedLimit : 10;

  let transactions: Awaited<ReturnType<typeof getVendorTransactions>> = [];
  let total = 0;

  try {
    const res = await getVendorTransactions({
      search: params?.search,
      status: params?.status,
      method: params?.method,
      sort: params?.sort,
      page,
      limit,
    });

    const data = res?.data;
    transactions = Array.isArray(data?.transactions)
      ? data.transactions
      : Array.isArray(data)
      ? data
      : Array.isArray(res)
      ? res
      : [];
    total = Number(data?.pagination?.total ?? data?.total ?? transactions.length);
  } catch (err) {
    console.error("Failed to fetch vendor transactions:", err);
  }

  const pagination = {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };

  return <TransactionsClient initialTransactions={transactions} pagination={pagination} />;
}
