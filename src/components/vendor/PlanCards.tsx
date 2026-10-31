"use client";

import React from "react";
import Link from "next/link";
import { Check, Crown, Sparkles } from "lucide-react";
import type { BillingCycle, VendorPlan, VendorPlanId } from "@/types/vendor";
import { formatPrice } from "@/lib/currency";
import { planMonthlyEquivalent, planPrice, planYearlySaving } from "@/lib/vendorPlan";

/**
 * The three pricing cards.
 *
 * The same component prices the landing page and the plan step of the
 * application, so a visitor never sees one number before signing up and a
 * different one inside the form. When `onSelect` is missing the card is a link
 * (the landing page); when it is present the card is a radio (the wizard).
 */

interface PlanCardsProps {
  plans: VendorPlan[];
  currency?: string;
  cycle: BillingCycle;
  onCycleChange: (cycle: BillingCycle) => void;
  selected?: VendorPlanId;
  onSelect?: (planId: VendorPlanId) => void;
  /** Used only in link mode, e.g. "/become-a-vendor/apply". */
  hrefBase?: string;
}

/** Yearly-first wording, because that is the plan most stores should pick. */
const CYCLE_LABELS: { id: BillingCycle; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

export default function PlanCards({
  plans,
  currency,
  cycle,
  onCycleChange,
  selected,
  onSelect,
  hrefBase = "/become-a-vendor/apply",
}: PlanCardsProps) {
  return (
    <div className="space-y-6">
      {/* Billing switch */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
          {CYCLE_LABELS.map((option) => {
            const active = cycle === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onCycleChange(option.id)}
                aria-pressed={active}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  active
                    ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => {
          const price = planPrice(plan, cycle);
          const monthly = planMonthlyEquivalent(plan, cycle);
          const saving = cycle === "yearly" ? planYearlySaving(plan) : 0;
          const isSelected = selected === plan.id;
          const isFree = price === 0;
          const popular = plan.id === "premium";

          const body = (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    {plan.name}
                  </p>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-[var(--foreground)]">
                      {isFree ? "Free" : formatPrice(price, currency, { showDecimals: false })}
                    </span>
                    {!isFree && (
                      <span className="text-[11px] font-semibold text-[var(--foreground-muted)]">
                        / {cycle === "yearly" ? "year" : "month"}
                      </span>
                    )}
                  </div>
                  {!isFree && cycle === "yearly" && (
                    <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
                      ≈ {formatPrice(monthly, currency, { showDecimals: false })} a month
                    </p>
                  )}
                </div>

                {popular ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand-flat)]/12 border border-[var(--brand-flat)]/25 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand-flat)]">
                    <Crown className="w-3 h-3" />
                    Popular
                  </span>
                ) : saving > 0 ? (
                  <span className="rounded-lg bg-emerald-500/12 border border-emerald-500/25 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    −{saving}%
                  </span>
                ) : null}
              </div>

              <ul className="mt-4 space-y-2">
                {plan.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2 text-[11px] text-[var(--foreground-muted)]">
                    <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {onSelect ? (
                  <span
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                        : "border border-[var(--border-color)] text-[var(--foreground)]"
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Selected
                      </>
                    ) : (
                      <>Choose {plan.name}</>
                    )}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold border border-[var(--border-color)] text-[var(--foreground)] group-hover:border-[var(--brand-flat)]/40 group-hover:text-[var(--brand-flat)] transition-colors">
                    <Sparkles className="w-3.5 h-3.5" />
                    Start with {plan.name}
                  </span>
                )}
              </div>
            </>
          );

          const shell = `group relative flex flex-col rounded-2xl border p-5 transition-all ${
            isSelected
              ? "border-[var(--brand-flat)]/60 bg-[var(--surface-elevated)] shadow-md ring-1 ring-[var(--brand-flat)]/25"
              : "border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs hover:shadow-md hover:border-[var(--brand-flat)]/35"
          }`;

          if (onSelect) {
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSelect(plan.id as VendorPlanId)}
                aria-pressed={isSelected}
                className={`${shell} text-left cursor-pointer`}
              >
                {body}
              </button>
            );
          }

          return (
            <Link key={plan.id} href={`${hrefBase}?plan=${plan.id}`} className={shell}>
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
