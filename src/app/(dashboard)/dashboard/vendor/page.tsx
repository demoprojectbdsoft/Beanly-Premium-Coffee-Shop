import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Check,
  CircleDashed,
  CreditCard,
  Layers,
  Store,
  Tag,
  Ticket,
} from "lucide-react";
import { getRequiredRole } from "@/lib/core/session";
import { asApplication, getMyVendorApplication } from "@/lib/api/vendor";
import { asSubscription, getMySubscription } from "@/lib/api/vendorSubscription";
import { getSiteSettings } from "@/lib/api/siteSettings";
import { formatOrderDate } from "@/lib/dateTime";
import { formatPrice } from "@/lib/currency";
import { isPaidPlan, planPrice } from "@/lib/vendorPlan";

export const dynamic = "force-dynamic";

/**
 * The vendor's home.
 *
 * Everything here is read from what the API already knows: the approved
 * application, the plan table and the account session. No counter is invented —
 * product and order totals arrive with the catalogue and order screens, and
 * until then this page shows the store, its plan and what the profile still
 * needs.
 */
export default async function VendorOverviewPage() {
  const user = await getRequiredRole("vendor");

  const [application, subscriptionOverview, settingsRes] = await Promise.all([
    getMyVendorApplication().then(asApplication),
    getMySubscription().then(asSubscription),
    getSiteSettings(),
  ]);

  const currency = settingsRes?.data?.currency;
  const plan = subscriptionOverview?.plan ?? null;
  const billingCycle = subscriptionOverview?.subscription?.billingCycle || "monthly";
  const usage = subscriptionOverview?.usage;
  const planIsLive = subscriptionOverview?.isLive ?? false;
  const approvedAt = application?.reviewedAt || application?.submittedAt;
  const store = application?.storeInfo;
  const address = application?.businessAddress;

  const planPriceLabel = plan
    ? isPaidPlan(plan)
      ? `${formatPrice(planPrice(plan, billingCycle), currency, {
          showDecimals: false,
        })} / ${billingCycle === "yearly" ? "year" : "month"}`
      : "Free"
    : "—";

  // The profile checklist is derived from real fields, so a tick always means
  // the store actually has that information.
  const readiness = [
    { label: "Store description", done: Boolean(store?.description) },
    { label: "Store logo", done: Boolean(store?.logo) },
    { label: "Cover image", done: Boolean(store?.coverImage) },
    { label: "Business address", done: Boolean(address?.address && address?.city) },
    { label: "Verification document", done: Boolean(application?.verification?.documentUrl) },
  ];
  const completed = readiness.filter((item) => item.done).length;

  return (
    <div className="space-y-5">
      {/* Store header */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="h-20 bg-brand-gradient" />
        <div className="px-5 pb-5">
          <div className="-mt-8 flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-end gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border-4 border-[var(--surface-elevated)] bg-[var(--surface-alt)] text-[var(--brand-flat)] shadow-sm">
                {store?.logo ? (
                  // The logo is a URL the applicant supplied; next/image would
                  // need every host configured, so this stays a plain image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={store.logo} alt={store.name} className="h-full w-full object-cover" />
                ) : (
                  <Store className="h-6 w-6" />
                )}
              </div>
              <div className="pb-1">
                <h1 className="text-lg font-bold leading-tight text-[var(--foreground)]">
                  {store?.name || user.name || "Your store"}
                </h1>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  /store/{store?.slug || "—"}
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200">
              <BadgeCheck className="h-3 w-3" />
              Approved vendor
            </span>
          </div>
        </div>
      </section>

      {/* Three facts */}
      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Plan
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
            <Layers className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
            {plan?.name || "—"}
            {!planIsLive && plan && (
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-500/15 dark:text-amber-200">
                Inactive
              </span>
            )}
          </p>
          <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">{planPriceLabel}</p>
        </article>

        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Vendor since
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
            <CreditCard className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
            {formatOrderDate(approvedAt) || "—"}
          </p>
          <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
            Same account as your customer profile
          </p>
        </article>

        <article className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Reference
          </p>
          <p className="mt-1 font-mono text-xs font-bold text-[var(--foreground)]">
            {application?.reference || "—"}
          </p>
          <Link
            href="/become-a-vendor/status"
            className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-flat)] hover:underline"
          >
            Application history
            <ArrowRight className="h-2.5 w-2.5" />
          </Link>
        </article>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Plan limits */}
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--foreground)]">What your plan allows</h2>
            <Link
              href="/dashboard/vendor/subscription"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--brand-flat)] hover:underline"
            >
              Manage plan
              <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          </div>

          <ul className="mt-3 space-y-2.5">
            {[
              {
                icon: Layers,
                label: "Active products",
                value: `${usage?.products ?? 0} / ${plan?.maxProducts ?? 0}`,
              },
              {
                icon: Ticket,
                label: "Active coupons",
                value: `${usage?.activeCoupons ?? 0} / ${plan?.activeCoupons ?? 0}`,
              },
              {
                icon: Tag,
                label: "Featured products",
                value: `${usage?.featuredProducts ?? 0} / ${plan?.featuredProducts ?? 0}`,
              },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <li
                  key={row.label}
                  className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2"
                >
                  <span className="flex items-center gap-2 text-[11px] text-[var(--foreground-muted)]">
                    <Icon className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
                    {row.label}
                  </span>
                  <span className="text-[11px] font-bold text-[var(--foreground)]">
                    {row.value}
                  </span>
                </li>
              );
            })}
          </ul>

          <p className="mt-3 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
            {planIsLive
              ? "Limits are counted from publishing, not from drafts. Archiving a product frees a slot immediately."
              : "Your period is not active, so publishing is on hold. Everything you already have is kept — renew from Plan & billing to publish again."}
          </p>
        </section>

        {/* Profile readiness */}
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-[var(--foreground)]">Store profile</h2>
            <span className="text-[10px] font-semibold text-[var(--foreground-muted)]">
              {completed} of {readiness.length} done
            </span>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
            <div
              className="h-full rounded-full bg-brand-gradient transition-all"
              style={{ width: `${Math.round((completed / readiness.length) * 100)}%` }}
            />
          </div>

          <ul className="mt-3 space-y-2">
            {readiness.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-[11px]">
                {item.done ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <CircleDashed className="h-3.5 w-3.5 shrink-0 text-[var(--foreground-muted)]" />
                )}
                <span
                  className={
                    item.done
                      ? "text-[var(--foreground-muted)] line-through"
                      : "text-[var(--foreground)]"
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>

          <Link
            href="/dashboard/vendor/profile"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
          >
            Open store profile
            <ArrowRight className="h-3 w-3" />
          </Link>
        </section>
      </div>
    </div>
  );
}
