import React from "react";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { getRequiredRole } from "@/lib/core/session";
import { asAnalytics, getMyAnalytics } from "@/lib/api/vendorAnalytics";
import { asStore, getMyStore } from "@/lib/api/vendorStore";
import { getSiteSettings } from "@/lib/api/siteSettings";
import VendorAnalyticsClient from "./VendorAnalyticsClient";

export const dynamic = "force-dynamic";

/** Only these windows may be asked for, so a hand-typed range cannot slip through. */
const RANGE_CHOICES = [7, 30, 90, 365];

interface VendorAnalyticsPageProps {
  searchParams: Promise<{ range?: string }>;
}

/**
 * The seller's sales report.
 *
 * The window comes from the URL, but the plan decides how far back it reaches:
 * the API answers with the range it allowed and the page reports that range, so a
 * vendor can never be shown numbers their plan does not include.
 */
export default async function VendorAnalyticsPage({ searchParams }: VendorAnalyticsPageProps) {
  await getRequiredRole("vendor");

  const params = await searchParams;
  const requested = Number(params?.range);
  const range = RANGE_CHOICES.includes(requested) ? requested : 30;

  const [report, store, settingsRes] = await Promise.all([
    getMyAnalytics(range).then(asAnalytics),
    getMyStore().then(asStore),
    getSiteSettings(),
  ]);

  if (!report) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Analytics</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Your sales report could not be read just now.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[var(--surface-alt)] p-2 text-[var(--foreground-muted)]">
              <BarChart3 className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">No figures to show</p>
              <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                Nothing was changed and nothing is lost — your orders are still on the order board.
                Reload this page to try the report again.
              </p>
              <Link
                href="/dashboard/vendor/orders"
                className="mt-3 inline-flex items-center gap-1 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
              >
                Open orders
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <VendorAnalyticsClient
      report={report}
      requestedRange={range}
      vendorName={store?.name || ""}
      currency={settingsRes?.data?.currency || "BDT"}
      siteName={settingsRes?.data?.siteName || "Sparq"}
    />
  );
}
