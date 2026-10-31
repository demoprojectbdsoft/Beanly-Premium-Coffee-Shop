import React from "react";
import NotificationsPageBody from "@/components/dashboard/NotificationsPageBody";

/**
 * The seller feed. The API decides whose lines these are from the token, so a
 * vendor sees only the updates addressed to this store.
 */
export default function VendorNotificationsPage() {
  return <NotificationsPageBody view="vendor" />;
}
