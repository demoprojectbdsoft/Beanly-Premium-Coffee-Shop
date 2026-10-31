import React from "react";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { getRequiredRole } from "@/lib/core/session";
import { asSubscription, getMySubscription } from "@/lib/api/vendorSubscription";
import { getSiteSettings } from "@/lib/api/siteSettings";
import SubscriptionClient from "./SubscriptionClient";

export const dynamic = "force-dynamic";

/**
 * Plan and billing.
 *
 * The page renders whatever the subscription endpoint reports — the live plan,
 * its usage, every payment and every earlier period — so what a vendor sees
 * here is exactly what the limit checks read. Nothing is recomputed in the
 * browser.
 */
export default async function VendorSubscriptionPage() {
  await getRequiredRole("vendor");

  const [subscriptionRes, settingsRes] = await Promise.all([
    getMySubscription(),
    getSiteSettings(),
  ]);

  const overview = asSubscription(subscriptionRes);

  if (!overview) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Plan &amp; billing</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Your subscription could not be read just now.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[var(--surface-alt)] p-2 text-[var(--foreground-muted)]">
              <CreditCard className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">No plan details available</p>
              <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                Nothing was changed. Reload the page, or open your products to keep working — the
                limits you already have still apply.
              </p>
              <Link
                href="/dashboard/vendor"
                className="mt-3 inline-flex items-center gap-1 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
              >
                Back to overview
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <SubscriptionClient
      overview={overview}
      currency={settingsRes?.data?.currency || "BDT"}
    />
  );
}
