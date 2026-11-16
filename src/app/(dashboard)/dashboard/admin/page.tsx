import React from "react";
import OverviewClient from "./OverviewClient";
import { getAdminDashboardData } from "@/lib/adminDashboardData";

export const dynamic = "force-dynamic";

/**
 * The morning page: the counts, the health bar and the orders that just came
 * in. Every chart, product ranking and report export moved to
 * /dashboard/admin/analytics, so this page stays readable at a glance.
 */
export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <OverviewClient
      stats={data.stats}
      kpis={data.kpis}
      recentOrders={data.recentOrders}
    />
  );
}
