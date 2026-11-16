import React from "react";
import { getProductEngagement, asEngagement } from "@/lib/api/engagement";
import { getSiteSettings } from "@/lib/api/siteSettings";
import EngagementClient from "./EngagementClient";

export const dynamic = "force-dynamic";

/** The windows the desk may ask for; the API clamps anything else. */
const RANGE_CHOICES = [7, 30, 90, 365];

interface AdminAnalyticsPageProps {
  searchParams: Promise<{ range?: string }>;
}

/**
 * How the whole catalogue is being shopped.
 *
 * The money page (Overview) can only see orders that were placed. This board
 * sees the step before that: which listings got opened, which got pressed and
 * which got saved for later — the difference between a product nobody finds and
 * a product everybody wants and never buys.
 */
export default async function AdminAnalyticsPage({ searchParams }: AdminAnalyticsPageProps) {
  const params = await searchParams;
  const requested = Number(params?.range);
  const range = RANGE_CHOICES.includes(requested) ? requested : 30;

  const [engagementRes, settingsRes] = await Promise.all([
    getProductEngagement({ range, limit: 20 }),
    getSiteSettings(),
  ]);

  return (
    <EngagementClient
      report={asEngagement(engagementRes)}
      range={range}
      currency={settingsRes?.data?.currency || "BDT"}
    />
  );
}
