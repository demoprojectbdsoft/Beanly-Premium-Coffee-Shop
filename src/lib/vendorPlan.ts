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
  const price = planEffectivePrice(plan, cycle);
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

/**
 * True while a plan's price offer is running.
 *
 * The API decides it when the plan is read (`offerActive`), so a card renders
 * the same answer the checkout will charge instead of comparing clocks in the
 * browser.
 */
export function planOfferLive(plan: VendorPlan): boolean {
  return plan.offerActive === true && (Number(plan.offerPercent) || 0) > 0;
}

/**
 * What one period costs today, after any running offer.
 *
 * The API charges this figure at checkout, so every card prints it too.
 */
export function planEffectivePrice(plan: VendorPlan, cycle: BillingCycle): number {
  const price = planPrice(plan, cycle);
  if (price <= 0 || !planOfferLive(plan)) return price;
  const percent = Number(plan.offerPercent) || 0;
  return Math.round(price * (1 - percent / 100) * 100) / 100;
}

/** The words a card uses for each limit, from the same values the API enforces. */
export const ANALYTICS_LABELS: Record<VendorPlan["analytics"], string> = {
  basic: "30-day sales analytics",
  detailed: "90-day detailed analytics",
  advanced: "1-year advanced analytics",
};

export const EXPORT_LABELS: Record<VendorPlan["exports"], string> = {
  none: "No report export",
  csv: "CSV report export",
  "csv+pdf": "CSV + PDF report export",
};

export const CUSTOMIZATION_LABELS: Record<VendorPlan["storeCustomization"], string> = {
  basic: "Basic storefront",
  enhanced: "Enhanced storefront",
  full: "Full storefront customisation",
};

export const CAMPAIGN_LABELS: Record<VendorPlan["promotionalCampaigns"], string> = {
  none: "No promotional campaigns",
  limited: "Limited promotional campaigns",
  priority: "Priority promotional campaigns",
};

export const VISIBILITY_LABELS: Record<VendorPlan["storeVisibility"], string> = {
  standard: "Standard store visibility",
  enhanced: "Enhanced store visibility",
  priority: "Priority store visibility",
};

export const SUPPORT_LABELS: Record<VendorPlan["support"], string> = {
  standard: "Standard support",
  priority: "Priority support",
};

/**
 * The bullet list a plan card prints.
 *
 * Built from the limits the API actually enforces, so editing a plan can never
 * leave a stale sentence on the card promising a feature the plan no longer
 * carries.
 */
export function planFeatureList(plan: VendorPlan): string[] {
  const products = Number(plan.maxProducts) || 0;
  const featured = Number(plan.featuredProducts) || 0;
  const featuredDays = Number(plan.featuredDurationDays) || 0;
  const coupons = Number(plan.activeCoupons) || 0;

  const list = products > 0 ? [`${products} active products`] : [];
  if (featured > 0) {
    list.push(
      featuredDays > 0
        ? `${featured} featured products for ${featuredDays} days`
        : `${featured} featured products`
    );
  }
  list.push(coupons > 0 ? `${coupons} active coupons` : "No active coupons");
  list.push(ANALYTICS_LABELS[plan.analytics] ?? "Basic analytics");
  list.push(EXPORT_LABELS[plan.exports] ?? "No report export");
  list.push(CUSTOMIZATION_LABELS[plan.storeCustomization] ?? "Basic storefront");
  list.push(SUPPORT_LABELS[plan.support] ?? "Standard support");

  return list;
}

/** The cycles a plan is actually sold in; an empty list means both. */
export function planCycles(plan: VendorPlan): BillingCycle[] {
  const cycles = plan.billingCycles?.filter(
    (cycle): cycle is BillingCycle => cycle === "monthly" || cycle === "yearly"
  );
  return cycles && cycles.length > 0 ? cycles : ["monthly", "yearly"];
}

/**
 * The card the pricing page calls "Popular" once the ladder is editable: the
 * cheapest paid rung, which is what a shop buys first.
 */
export function popularPlanId(plans: VendorPlan[]): string | null {
  const paid = plans.filter(isPaidPlan);
  if (paid.length === 0) return null;

  return paid.reduce((best, plan) =>
    (Number(plan.monthlyPrice) || 0) < (Number(best.monthlyPrice) || 0) ? plan : best
  ).id;
}
