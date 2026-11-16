import React from "react";
import { asAllPlans, getVendorPlans } from "@/lib/api/vendor";
import { getSiteSettings } from "@/lib/api/siteSettings";
import VendorPlansClient from "./VendorPlansClient";

export const dynamic = "force-dynamic";

/**
 * The store's price list for vendors.
 *
 * Every plan the collection holds is read here — retired ones included, so a
 * plan switched off can be switched back on. The board never prices a
 * subscription itself: the plan rows it writes are the same rows the pricing
 * cards, the limit checks and the checkout read.
 */
export default async function AdminVendorPlansPage() {
  const [plansRes, settingsRes] = await Promise.all([getVendorPlans(), getSiteSettings()]);

  return (
    <VendorPlansClient
      initialPlans={asAllPlans(plansRes)}
      currency={settingsRes?.data?.currency || "BDT"}
    />
  );
}
