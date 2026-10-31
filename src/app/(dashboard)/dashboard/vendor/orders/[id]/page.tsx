import React from "react";
import { notFound } from "next/navigation";
import { getRequiredRole } from "@/lib/core/session";
import { asOrder, getMyOrder } from "@/lib/api/vendorOrders";
import { getSiteSettings } from "@/lib/api/siteSettings";
import VendorOrderDetailClient from "./VendorOrderDetailClient";

export const dynamic = "force-dynamic";

/**
 * One fulfilment group.
 *
 * The read is scoped to the token on the server, so another seller's id answers
 * exactly like an id that does not exist: a 404, not a forbidden page that
 * would confirm the row is real.
 */
export default async function VendorOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getRequiredRole("vendor");

  const { id } = await params;
  const [orderRes, settingsRes] = await Promise.all([getMyOrder(id), getSiteSettings()]);

  const order = asOrder(orderRes);
  if (!order) notFound();

  return (
    <VendorOrderDetailClient order={order} currency={settingsRes?.data?.currency || "BDT"} />
  );
}
