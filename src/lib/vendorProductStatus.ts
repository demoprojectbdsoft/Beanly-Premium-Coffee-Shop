/**
 * One palette for every vendor product badge.
 *
 * The catalogue list, the editor and the storefront preview all name the same
 * six states, so the wording and colours live once. An unknown state falls back
 * to the neutral "draft" look instead of rendering an unreadable pill.
 */

import type { LucideIcon } from "lucide-react";
import { Archive, CheckCircle2, Clock, FileEdit, PackageX, XCircle } from "lucide-react";

export interface VendorProductStatusStyle {
  label: string;
  description: string;
  badge: string;
  dot: string;
  icon: LucideIcon;
}

const STYLES: Record<string, VendorProductStatusStyle> = {
  draft: {
    label: "Draft",
    description: "Only you can see this product.",
    badge:
      "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-500/15 dark:text-slate-200 dark:border-slate-500/30",
    dot: "bg-slate-400 dark:bg-slate-300",
    icon: FileEdit,
  },
  pending_review: {
    label: "Pending review",
    description: "The store team is checking this product.",
    badge:
      "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/30",
    dot: "bg-sky-500 dark:bg-sky-400",
    icon: Clock,
  },
  published: {
    label: "Published",
    description: "Buyers can find and order this product.",
    badge:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    description: "Fix the reason, then submit it again.",
    badge:
      "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30",
    dot: "bg-rose-500 dark:bg-rose-400",
    icon: XCircle,
  },
  archived: {
    label: "Archived",
    description: "Hidden from the storefront. Past orders still reference it.",
    badge:
      "bg-zinc-100 text-zinc-600 border border-zinc-300 dark:bg-zinc-500/15 dark:text-zinc-300 dark:border-zinc-500/30",
    dot: "bg-zinc-400 dark:bg-zinc-300",
    icon: Archive,
  },
  out_of_stock: {
    label: "Out of stock",
    description: "Published but nothing left to sell right now.",
    badge:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30",
    dot: "bg-amber-500 dark:bg-amber-400",
    icon: PackageX,
  },
};

export function getVendorProductStatusStyle(status?: string | null): VendorProductStatusStyle {
  return STYLES[(status || "draft").trim().toLowerCase()] ?? STYLES.draft;
}

export function formatTaka(amount?: number | null): string {
  const value = Number(amount) || 0;
  return `৳${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
