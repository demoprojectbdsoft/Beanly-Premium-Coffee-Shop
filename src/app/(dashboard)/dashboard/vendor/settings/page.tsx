import React from "react";
import VendorSettingsClient from "./VendorSettingsClient";
import { getRequiredRole } from "@/lib/core/session";
import { asStore, getMyStore } from "@/lib/api/vendorStore";

export const dynamic = "force-dynamic";

/**
 * The seller's account settings.
 *
 * Every role gets its own settings screen, and this one holds what a seller
 * controls about the account rather than about the shop: the password, the
 * session, and the pointers to the places that finish the rest. The storefront
 * itself is edited on the profile, and the plan is bought on the subscription
 * desk — a setting is never a second way to do either.
 */
export default async function VendorSettingsPage() {
  const session = await getRequiredRole("vendor");

  // A missing store row is not a reason to lose the screen: signing out and
  // changing the password still have to be reachable.
  const store = asStore(await getMyStore().catch(() => null));

  return (
    <VendorSettingsClient
      vendorName={session.name || "Seller"}
      email={session.email || ""}
      storeName={store?.name || ""}
      storeStatus={store?.status || ""}
    />
  );
}
