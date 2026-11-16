import React from "react";
import { getProductEngagement, asEngagement } from "@/lib/api/engagement";
import { getSiteSettings } from "@/lib/api/siteSettings";
import { getAdminDashboardData } from "@/lib/adminDashboardData";
import SalesAnalyticsClient from "./SalesAnalyticsClient";
import EngagementClient from "./EngagementClient";

export const dynamic = "force-dynamic";

/** The windows the desk may ask for; the API clamps anything else. */
const RANGE_CHOICES = [7, 30, 90, 365];

interface AdminAnalyticsPageProps {
  searchParams: Promise<{ range?: string }>;
}

/**
 * Where the store is measured.
 *
 * The sales half answers the money question — what came in, what it cost, what
 * sold and which products earned it — and owns the CSV/PDF exports. The
 * attention half answers the step before a sale: which listings got opened,
 * which got pressed and which got saved for later.
 */
export default async function AdminAnalyticsPage({ searchParams }: AdminAnalyticsPageProps) {
  const params = await searchParams;
  const requested = Number(params?.range);
  const range = RANGE_CHOICES.includes(requested) ? requested : 30;

  const [data, engagementRes, settingsRes] = await Promise.all([
    getAdminDashboardData(),
    getProductEngagement({ range, limit: 20 }),
    getSiteSettings(),
  ]);

  return (
    <div className="space-y-8">
      <SalesAnalyticsClient
        stats={data.stats}
        revenueData={data.revenueData}
        categoryData={data.categoryData}
        orderStatusData={data.orderStatusData}
        paymentMethodData={data.paymentMethodData}
        topProducts={data.topProducts}
        recentOrders={data.recentOrders}
        kpis={data.kpis}
        dailyProfitData={data.dailyProfitData}
        weeklyProfitData={data.weeklyProfitData}
        monthlyProfitData={data.monthlyProfitData}
        yearlyProfitData={data.yearlyProfitData}
        topSellingByPeriod={data.topSellingByPeriod}
      />

      <EngagementClient
        report={asEngagement(engagementRes)}
        range={range}
        currency={settingsRes?.data?.currency || "BDT"}
      />
    </div>
  );
}
