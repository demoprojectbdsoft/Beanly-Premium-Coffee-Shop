/**
 * Pricing arithmetic for the marketplace plans.
 *
 * The numbers themselves come from the API, never from this file: an admin can
 * change a price or a limit and the cards follow. What lives here is only the
 * three sums every screen would otherwise redo — the price of the chosen cycle,
 * its monthly equivalent, and what a year saves.
 */

import type { BillingCycle, VendorPlan } from "@/types/vendor";

/** The price charged once per cycle. */
export function planPrice(plan: VendorPlan, cycle: BillingCycle): number {
  return cycle === "yearly" ? Number(plan.yearlyPrice) || 0 : Number(plan.monthlyPrice) || 0;
}

/** The same price expressed per month, for the "≈ ৳416 / month" line. */
export function planMonthlyEquivalent(plan: VendorPlan, cycle: BillingCycle): number {
  const price = planPrice(plan, cycle);
  return cycle === "yearly" ? price / 12 : price;
}

/**
 * What paying for a year saves, in percent, rounded to a whole number.
 *
 * A plan whose yearly price is not cheaper returns 0, so the badge is simply
 * not shown rather than claiming a discount that does not exist.
 */
export function planYearlySaving(plan: VendorPlan): number {
  const monthly = Number(plan.monthlyPrice) || 0;
  const yearly = Number(plan.yearlyPrice) || 0;
  if (monthly <= 0 || yearly <= 0) return 0;

  const fullYear = monthly * 12;
  if (yearly >= fullYear) return 0;

  return Math.round(((fullYear - yearly) / fullYear) * 100);
}

/** A paid plan is the only one that goes through the demo checkout. */
export function isPaidPlan(plan: VendorPlan): boolean {
  return (Number(plan.monthlyPrice) || 0) > 0;
}
