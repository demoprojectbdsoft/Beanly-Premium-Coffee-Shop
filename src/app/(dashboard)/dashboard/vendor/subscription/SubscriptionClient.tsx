"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  CreditCard,
  Crown,
  Layers,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Tag,
  Ticket,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { cancelVendorRenewal, checkoutVendorSubscription } from "@/lib/action/vendor";
import { formatPrice } from "@/lib/currency";
import { formatOrderDate } from "@/lib/dateTime";
import { planPrice } from "@/lib/vendorPlan";
import type {
  BillingCycle,
  VendorPlan,
  VendorPlanId,
  VendorSubscriptionOverview,
} from "@/types/vendor";

/**
 * Plan and billing.
 *
 * The comparison cards show the prices the API sent; the checkout sticker is
 * the same number the server will charge. A plan change is only ever a request:
 * the API decides the price, records the payment against an idempotency key and
 * replaces the live period in one transaction.
 */

interface SubscriptionClientProps {
  overview: VendorSubscriptionOverview;
  currency: string;
}

const PLAN_RANK: Record<VendorPlanId, number> = { free: 0, premium: 1, advanced: 2 };

const METHODS: { id: "wallet" | "bkash" | "nagad" | "rocket"; label: string; hint: string }[] = [
  { id: "wallet", label: "Demo wallet", hint: "Instant, no transaction id needed" },
  { id: "bkash", label: "bKash", hint: "Paste the TrxID from the SMS" },
  { id: "nagad", label: "Nagad", hint: "Paste the TrxID from the SMS" },
  { id: "rocket", label: "Rocket", hint: "Paste the TxnID from the SMS" },
];

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  active: {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200",
    label: "Active",
  },
  grace: {
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200",
    label: "Grace period",
  },
  expired: {
    badge:
      "border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground-muted)]",
    label: "Expired",
  },
  cancelled: {
    badge:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200",
    label: "Cancelled",
  },
  pending: {
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200",
    label: "Pending",
  },
  success: {
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200",
    label: "Paid",
  },
  failed: {
    badge:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200",
    label: "Failed",
  },
};

function statusStyle(status?: string) {
  return STATUS_STYLES[status || ""] || STATUS_STYLES.expired;
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** A random key per checkout attempt, so a double click is one payment. */
function newIdempotencyKey(): string {
  const cryptoRef = globalThis.crypto;
  if (cryptoRef && typeof cryptoRef.randomUUID === "function") return cryptoRef.randomUUID();
  return `sub-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function planFacts(plan: VendorPlan): { label: string; value: string | number }[] {
  return [
    { label: "Active products", value: plan.maxProducts },
    { label: "Featured products", value: plan.featuredProducts },
    { label: "Active coupons", value: plan.activeCoupons },
    { label: "Analytics", value: titleCase(plan.analytics) },
    { label: "Sales reports", value: titleCase(plan.salesReports) },
    { label: "Support", value: titleCase(plan.support) },
  ];
}

export default function SubscriptionClient({ overview, currency }: SubscriptionClientProps) {
  const router = useRouter();

  const [cycle, setCycle] = useState<BillingCycle>(
    overview.subscription?.billingCycle || "monthly"
  );
  const [checkoutPlan, setCheckoutPlan] = useState<VendorPlan | null>(null);
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("wallet");
  const [transactionId, setTransactionId] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showAllPeriods, setShowAllPeriods] = useState(false);

  const money = (amount: number) =>
    formatPrice(amount, currency, { showDecimals: amount % 1 !== 0 });

  const { plan, subscription, usage, plans } = overview;
  const style = statusStyle(overview.inGrace ? "grace" : overview.isLive ? "active" : "expired");

  const usageRows = useMemo(
    () => [
      { icon: Layers, label: "Products", used: usage.products, limit: plan.maxProducts },
      { icon: Tag, label: "Featured products", used: usage.featuredProducts, limit: plan.featuredProducts },
      { icon: Ticket, label: "Active coupons", used: usage.activeCoupons, limit: plan.activeCoupons },
    ],
    [usage, plan]
  );

  const actionFor = (candidate: VendorPlan) => {
    const isCurrent = candidate.id === plan.id;
    if (isCurrent) {
      return overview.isLive
        ? { label: "Current plan", tone: "current" as const }
        : { label: "Reactivate", tone: "renew" as const };
    }
    return PLAN_RANK[candidate.id] > PLAN_RANK[plan.id]
      ? { label: "Upgrade", tone: "up" as const }
      : { label: "Downgrade", tone: "down" as const };
  };

  const openCheckout = (target: VendorPlan) => {
    setCheckoutPlan(target);
    setMethod("wallet");
    setTransactionId("");
    setIdempotencyKey(newIdempotencyKey());
  };

  const closeCheckout = () => {
    if (paying) return;
    setCheckoutPlan(null);
    setConfirmCancel(false);
  };

  const pay = async () => {
    if (!checkoutPlan || paying) return;

    if (method !== "wallet" && transactionId.trim().length < 8) {
      toast.warning("Paste the transaction id from the wallet confirmation SMS.");
      return;
    }

    setPaying(true);
    try {
      const res = await checkoutVendorSubscription({
        planId: checkoutPlan.id,
        billingCycle: cycle,
        method,
        transactionId: method === "wallet" ? undefined : transactionId.trim(),
        idempotencyKey,
      });

      if (res?.success === false) {
        toast.error(res.message || "The plan could not be activated");
        return;
      }

      toast.success(
        checkoutPlan.id === "free"
          ? "You are back on the Free plan"
          : `${checkoutPlan.name} is active until ${formatOrderDate(
              res?.data?.subscription?.endDate
            )}`
      );
      setCheckoutPlan(null);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "An error occurred");
    } finally {
      setPaying(false);
    }
  };

  const cancelRenewal = async () => {
    if (cancelling) return;

    setCancelling(true);
    try {
      const res = await cancelVendorRenewal();
      if (res?.success === false) {
        toast.error(res.message || "The renewal could not be cancelled");
        return;
      }
      toast.success("Renewal cancelled — your current period still runs");
      setConfirmCancel(false);
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "An error occurred");
    } finally {
      setCancelling(false);
    }
  };

  const checkoutAmount = checkoutPlan ? planPrice(checkoutPlan, cycle) : 0;
  const periodEnd = subscription?.endDate ? formatOrderDate(subscription.endDate) : "—";

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Plan &amp; billing</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            What you are on, what it allows, and every payment that got you here.
          </p>
        </div>

        <Link
          href="/dashboard/vendor/products"
          className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--foreground-muted)] hover:text-[var(--brand-flat)]"
        >
          Back to products
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>

      {/* Current plan */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--surface-alt)]/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-brand-gradient p-2 text-[var(--on-grad-text)] shadow-xs">
              <Crown className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">{plan.name} plan</p>
              <p className="text-[10px] text-[var(--foreground-muted)]">
                {planPrice(plan, subscription?.billingCycle || cycle) > 0
                  ? `${money(planPrice(plan, subscription?.billingCycle || cycle))} / ${
                      subscription?.billingCycle === "yearly" ? "year" : "month"
                    }`
                  : "No charge"}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}
          >
            <BadgeCheck className="h-3 w-3" />
            {overview.isLive ? style.label : "Not active"}
          </span>
        </div>

        <div className="grid gap-4 px-4 py-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Started
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--foreground)]">
              <CalendarDays className="h-3 w-3 text-[var(--brand-flat)]" />
              {formatOrderDate(subscription?.startDate) || "Not started"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              {overview.inGrace ? "Grace ends" : "Expires"}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--foreground)]">
              <CalendarDays className="h-3 w-3 text-[var(--brand-flat)]" />
              {overview.effectiveUntil
                ? formatOrderDate(overview.effectiveUntil)
                : formatOrderDate(subscription?.endDate) || "—"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Renewal
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--foreground)]">
              <RefreshCw className="h-3 w-3 text-[var(--brand-flat)]" />
              {subscription?.autoRenew ? "Automatic" : "Manual"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-color)] px-4 py-3">
          <p className="text-[10px] leading-relaxed text-[var(--foreground-muted)]">
            {overview.isLive
              ? subscription?.autoRenew
                ? `Renews automatically on ${periodEnd}.`
                : `This period ends ${periodEnd}. Renew before then to avoid a gap.`
              : overview.isExpired
                ? "Your last period ended. Your products, orders and history are all still here — renew to publish again."
                : "No paid period has started yet. The Free limits apply."}
          </p>

          <div className="flex items-center gap-2">
            {overview.isLive && subscription?.autoRenew && !confirmCancel && (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
              >
                Cancel renewal
              </button>
            )}

            {confirmCancel && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--foreground-muted)]">Stop renewing?</span>
                <button
                  type="button"
                  onClick={cancelRenewal}
                  disabled={cancelling}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[10px] font-bold text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10 cursor-pointer"
                >
                  {cancelling ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                  Yes, cancel
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmCancel(false)}
                  className="rounded-lg px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] cursor-pointer"
                >
                  Keep
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => openCheckout(plan)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[10px] font-bold text-[var(--on-grad-text)] shadow-xs cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" />
              {overview.isLive ? "Renew now" : "Reactivate"}
            </button>
          </div>
        </div>
      </section>

      {/* Usage */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          What you have used
        </h2>

        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {usageRows.map((row) => {
            const Icon = row.icon;
            const percent = row.limit > 0 ? Math.min(100, Math.round((row.used / row.limit) * 100)) : 100;
            const atLimit = row.used >= row.limit;

            return (
              <li
                key={row.label}
                className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--foreground-muted)]">
                    <Icon className="h-3 w-3 text-[var(--brand-flat)]" />
                    {row.label}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--foreground)]">
                    {row.used} / {row.limit}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
                  <div
                    className={`h-full rounded-full ${atLimit ? "bg-rose-500" : "bg-brand-gradient"}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                {atLimit && (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-semibold text-rose-600 dark:text-rose-400">
                    <TriangleAlert className="h-2.5 w-2.5" />
                    Limit reached
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Comparison */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Compare plans
          </h2>

          <div className="inline-flex rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-0.5">
            {(["monthly", "yearly"] as BillingCycle[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCycle(option)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                  cycle === option
                    ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          {plans.map((candidate) => {
            const action = actionFor(candidate);
            const isCurrent = candidate.id === plan.id;
            const price = planPrice(candidate, cycle);
            const highlight = candidate.id === "premium";

            return (
              <article
                key={candidate.id}
                className={`relative flex flex-col rounded-2xl border bg-[var(--surface-elevated)] p-4 shadow-2xs ${
                  isCurrent
                    ? "border-[var(--brand-flat)]/60 ring-1 ring-[var(--brand-flat)]/20"
                    : "border-[var(--border-color)]"
                }`}
              >
                {highlight && !isCurrent && (
                  <span className="absolute -top-2 right-3 rounded-md bg-brand-gradient px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--on-grad-text)] shadow-xs">
                    Popular
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
                    {candidate.name}
                  </h3>
                  {isCurrent && (
                    <span className="rounded-md bg-[var(--brand-flat)]/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--brand-flat)]">
                      Yours
                    </span>
                  )}
                </div>

                <p className="mt-2 text-lg font-bold text-[var(--foreground)]">
                  {price > 0 ? money(price) : "Free"}
                  {price > 0 && (
                    <span className="ml-1 text-[10px] font-semibold text-[var(--foreground-muted)]">
                      / {cycle === "yearly" ? "year" : "month"}
                    </span>
                  )}
                </p>

                <ul className="mt-3 space-y-1.5">
                  {planFacts(candidate).map((fact) => (
                    <li
                      key={fact.label}
                      className="flex items-center justify-between gap-2 text-[10px]"
                    >
                      <span className="text-[var(--foreground-muted)]">{fact.label}</span>
                      <span className="font-semibold text-[var(--foreground)]">{fact.value}</span>
                    </li>
                  ))}
                </ul>

                {candidate.highlights?.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {candidate.highlights.slice(0, 3).map((line) => (
                      <li
                        key={line}
                        className="flex items-start gap-1 text-[10px] leading-relaxed text-[var(--foreground-muted)]"
                      >
                        <Check className="mt-0.5 h-2.5 w-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        {line}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-auto pt-4">
                  {action.tone === "current" ? (
                    <span className="flex items-center justify-center gap-1 rounded-xl border border-[var(--border-color)] py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                      <Check className="h-3 w-3" />
                      Current plan
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openCheckout(candidate)}
                      className={`w-full rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        action.tone === "up" || action.tone === "renew"
                          ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                          : "border border-[var(--border-color)] text-[var(--foreground)] hover:bg-[var(--surface-alt)]"
                      }`}
                    >
                      {action.label}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Payment history */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
          <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <ReceiptText className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
            Payment history
          </h2>
          <span className="text-[10px] text-[var(--foreground-muted)]">
            {overview.payments.length} {overview.payments.length === 1 ? "payment" : "payments"}
          </span>
        </div>

        {overview.payments.length === 0 ? (
          <p className="px-4 py-8 text-center text-[11px] text-[var(--foreground-muted)]">
            No payments yet. The Free plan activates without a checkout.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {overview.payments.map((payment) => {
              const payStyle = statusStyle(payment.status);
              return (
                <li key={payment._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-[var(--foreground)]">
                      {payment.plan ? titleCase(payment.plan) : "Plan"} ·{" "}
                      <span className="font-semibold text-[var(--foreground-muted)]">
                        {payment.billingCycle}
                      </span>
                    </p>
                    <p className="truncate text-[10px] text-[var(--foreground-muted)]">
                      {formatOrderDate(payment.paidAt || payment.createdAt) || "—"} ·{" "}
                      {payment.method} · {payment.reference}
                      {payment.purpose ? ` · ${payment.purpose}` : ""}
                    </p>
                  </div>

                  <p className="text-xs font-bold text-[var(--foreground)]">{money(payment.amount)}</p>

                  <span
                    className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${payStyle.badge}`}
                  >
                    {payStyle.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Previous periods */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] px-4 py-3">
          <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <CreditCard className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
            Previous subscriptions
          </h2>
          {overview.history.length > 3 && (
            <button
              type="button"
              onClick={() => setShowAllPeriods((value) => !value)}
              className="text-[10px] font-semibold text-[var(--brand-flat)] hover:underline cursor-pointer"
            >
              {showAllPeriods ? "Show less" : `Show all ${overview.history.length}`}
            </button>
          )}
        </div>

        {overview.history.length === 0 ? (
          <p className="px-4 py-8 text-center text-[11px] text-[var(--foreground-muted)]">
            No earlier periods.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {(showAllPeriods ? overview.history : overview.history.slice(0, 3)).map((row) => {
              const rowStyle = statusStyle(row.status);
              return (
                <li key={row._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold text-[var(--foreground)]">
                      {titleCase(row.plan)} ·{" "}
                      <span className="font-semibold text-[var(--foreground-muted)]">
                        {row.billingCycle}
                      </span>
                    </p>
                    <p className="text-[10px] text-[var(--foreground-muted)]">
                      {formatOrderDate(row.startDate)} — {formatOrderDate(row.endDate)}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  </div>

                  <p className="text-[11px] font-semibold text-[var(--foreground)]">
                    {money(Number(row.pricePaid) || 0)}
                  </p>

                  <span
                    className={`rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${rowStyle.badge}`}
                  >
                    {rowStyle.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Checkout */}
      {checkoutPlan && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 backdrop-blur-xs sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  {checkoutPlan.id === plan.id ? "Renew" : actionFor(checkoutPlan).label} ·{" "}
                  {cycle}
                </p>
                <p className="text-sm font-bold text-[var(--foreground)]">{checkoutPlan.name} plan</p>
              </div>

              <button
                type="button"
                onClick={closeCheckout}
                className="rounded-lg p-1.5 text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] cursor-pointer"
                aria-label="Close checkout"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              <div className="flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]/60 px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                  Total
                </span>
                <span className="text-base font-bold text-[var(--foreground)]">
                  {money(checkoutAmount)}
                </span>
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  Pay with
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {METHODS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMethod(option.id)}
                      className={`rounded-xl border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                        method === option.id
                          ? "border-[var(--brand-flat)] bg-[var(--brand-flat)]/10"
                          : "border-[var(--border-color)] hover:bg-[var(--surface-alt)]"
                      }`}
                    >
                      <span className="block text-[11px] font-bold text-[var(--foreground)]">
                        {option.label}
                      </span>
                      <span className="block text-[9px] text-[var(--foreground-muted)]">
                        {option.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {method !== "wallet" && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Transaction id
                  </label>
                  <input
                    value={transactionId}
                    onChange={(event) => setTransactionId(event.target.value.toUpperCase())}
                    placeholder="e.g. 8N7A2K4Q1Z"
                    className="h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 font-mono text-[11px] uppercase text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/60 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
                  />
                  <p className="mt-1 text-[9px] text-[var(--foreground-muted)]">
                    8 to 20 letters or digits. A wrong id is recorded as a failed payment and
                    changes nothing.
                  </p>
                </div>
              )}

              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[9px] leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                This is a demo checkout — no real money moves. The amount and the period are decided
                by the server, and clicking Pay twice charges once.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--border-color)] px-4 py-3">
              <button
                type="button"
                onClick={closeCheckout}
                disabled={paying}
                className="rounded-xl px-3 py-2 text-[10px] font-semibold text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] disabled:opacity-60 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={pay}
                disabled={paying}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[var(--on-grad-text)] shadow-xs disabled:opacity-70 cursor-pointer"
              >
                {paying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5" />
                )}
                {checkoutAmount > 0 ? `Pay ${money(checkoutAmount)}` : "Activate Free"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
