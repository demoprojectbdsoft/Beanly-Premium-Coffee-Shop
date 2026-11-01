import React from "react";
import { notFound } from "next/navigation";
import { getRequiredRole } from "@/lib/core/session";
import { getUserById } from "@/lib/api/user";
import { getVendorApplication } from "@/lib/api/vendor";
import { getRiderApplication } from "@/lib/api/rider";
import { getUserOrdersAction } from "@/lib/action/orders";
import type { VendorApplicationDetail } from "@/types/vendor";
import type { RiderApplicationDetail } from "@/types/rider";
import UserDetailClient from "./UserDetailClient";

export const dynamic = "force-dynamic";

/**
 * One account, seen by the store team, across every role it holds.
 *
 * A person can be a shopper, a rider and a seller at the same time, so the
 * screen is assembled from the reads each role needs: the user row for the
 * authorities and suspensions, the purchase list for the customer panel, and
 * the marketplace applications for the rider and vendor panels. The writes —
 * grant/revoke, per-role suspend, whole-account status — happen in the client,
 * which re-reads through the router afterwards.
 *
 * Every fetch is here rather than in the client so the page never renders from
 * a stale claim about who someone is: the API is asked fresh on each visit.
 */
interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  await getRequiredRole("admin");

  const { id } = await params;

  const userResponse = await getUserById(id);
  const user = (userResponse?.data ?? null) as Record<string, unknown> | null;
  if (!user || !(user._id || user.id)) {
    notFound();
  }

  // The panels only fetch what the account actually reached for: an approved
  // shopper's orders, and the application rows behind a marketplace role. A
  // pending/rejected applicant still has a file, so we read it by the stored id
  // rather than by whether the role is granted yet.
  const vendorApplicationId = user.vendorApplicationId
    ? String(user.vendorApplicationId)
    : "";
  const riderApplicationId = user.riderApplicationId
    ? String(user.riderApplicationId)
    : "";

  const [orders, vendorResponse, riderResponse] = await Promise.all([
    getUserOrdersAction(id),
    vendorApplicationId ? getVendorApplication(vendorApplicationId) : Promise.resolve(null),
    riderApplicationId ? getRiderApplication(riderApplicationId) : Promise.resolve(null),
  ]);

  const vendorDetail = (vendorResponse?.data ?? null) as VendorApplicationDetail | null;
  const riderDetail = (riderResponse?.data ?? null) as RiderApplicationDetail | null;

  return (
    <UserDetailClient
      user={user}
      orders={Array.isArray(orders) ? orders : []}
      vendorDetail={vendorDetail}
      riderDetail={riderDetail}
    />
  );
}
