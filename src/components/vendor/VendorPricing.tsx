"use client";

import React, { useState } from "react";
import type { BillingCycle, VendorPlan } from "@/types/vendor";
import PlanCards from "./PlanCards";

/**
 * The landing page's pricing block.
 *
 * Only the chosen cycle is state here; every number comes from the plan table
 * the API returned, so an admin edit is visible on the public page without a
 * deploy.
 */
export default function VendorPricing({
  plans,
  currency,
}: {
  plans: VendorPlan[];
  currency?: string;
}) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return <PlanCards plans={plans} currency={currency} cycle={cycle} onCycleChange={setCycle} />;
}
