/**
 * The vendor's order badges.
 *
 * The seller's stages are their own — "ready for shipment" is not a parent
 * order status — so the palette maps each one onto the shared order colours
 * instead of inventing a second set of class names.
 */

import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  CircleCheck,
  Clock,
  Package,
  PackageCheck,
  PackageSearch,
  Truck,
  XCircle,
} from "lucide-react";
import { getOrderStatusStyle, type OrderStatusStyle } from "./orderStatusStyles";

export interface VendorOrderStatusStyle {
  label: string;
  badge: string;
  accent: string;
  icon: LucideIcon;
}

const BASE: Record<
  "pending" | "accepted" | "processing" | "ready_for_shipment" | "shipped" | "delivered" | "rejected" | "cancelled",
  { label: string; tone: string; icon: LucideIcon }
> = {
  pending: { label: "New", tone: "pending", icon: Clock },
  accepted: { label: "Accepted", tone: "confirmed", icon: CircleCheck },
  processing: { label: "Preparing", tone: "processing", icon: PackageSearch },
  ready_for_shipment: { label: "Ready", tone: "shipped", icon: PackageCheck },
  shipped: { label: "Shipped", tone: "shipped", icon: Truck },
  delivered: { label: "Delivered", tone: "delivered", icon: CheckCircle2 },
  rejected: { label: "Rejected", tone: "cancelled", icon: XCircle },
  cancelled: { label: "Cancelled", tone: "cancelled", icon: Package },
};

function tone(status?: string | null): OrderStatusStyle {
  const entry = BASE[(status || "") as keyof typeof BASE];
  return getOrderStatusStyle(entry?.tone || status);
}

export function getVendorOrderStatusStyle(status?: string | null): VendorOrderStatusStyle {
  const entry = BASE[(status || "") as keyof typeof BASE];
  const palette = tone(status);

  return {
    label: entry?.label || palette.label,
    badge: palette.badge,
    accent: palette.accent,
    icon: entry?.icon || palette.icon,
  };
}

/** The steps a seller can take from a status, in the order the buttons show. */
export function vendorOrderActions(status?: string | null) {
  switch (status) {
    case "pending":
      return [
        { status: "accepted" as const, label: "Accept order" },
        { status: "rejected" as const, label: "Reject" },
      ];
    case "accepted":
      return [{ status: "processing" as const, label: "Start preparing" }];
    case "processing":
      return [{ status: "ready_for_shipment" as const, label: "Mark ready for shipment" }];
    default:
      return [];
  }
}
