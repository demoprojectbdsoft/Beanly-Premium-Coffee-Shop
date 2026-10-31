/**
 * One palette for every vendor application badge.
 *
 * The five states are read in three places — the applicant's status screen, the
 * review queue and the review detail — so the wording and the colours are
 * defined once. A state the API adds later falls back to the neutral "pending"
 * look instead of rendering an unreadable label.
 */

import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  Clock,
  Eye,
  Undo2,
  XCircle,
} from "lucide-react";
import type { VendorApplicationStatus } from "@/types/vendor";

export interface VendorStatusStyle {
  /** How the state is spelled on screen. */
  label: string;
  /** One sentence an applicant understands without asking support. */
  description: string;
  /** Pill classes: background, text colour and border. */
  badge: string;
  /** Solid colour for a status dot. */
  dot: string;
  icon: LucideIcon;
}

const VENDOR_STATUS_STYLES: Record<VendorApplicationStatus, VendorStatusStyle> = {
  pending: {
    label: "Pending review",
    description: "Your application is queued for the store team.",
    badge:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30",
    dot: "bg-amber-500 dark:bg-amber-400",
    icon: Clock,
  },
  under_review: {
    label: "Under review",
    description: "The store team is checking your documents and store details.",
    badge:
      "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/30",
    dot: "bg-sky-500 dark:bg-sky-400",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    description: "Your store is live. You can sign in with the same account.",
    badge:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Not approved",
    description: "You can keep shopping and apply again once you fix the reason below.",
    badge:
      "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30",
    dot: "bg-rose-500 dark:bg-rose-400",
    icon: XCircle,
  },
  cancelled: {
    label: "Withdrawn",
    description: "You withdrew this application. You can apply again at any time.",
    badge:
      "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-500/15 dark:text-slate-200 dark:border-slate-500/30",
    dot: "bg-slate-400 dark:bg-slate-300",
    icon: Undo2,
  },
};

/** Missing or unknown states fall back to the neutral "pending" look. */
export function getVendorStatusStyle(status?: string | null): VendorStatusStyle {
  const key = (status || "").trim().toLowerCase() as VendorApplicationStatus;
  return VENDOR_STATUS_STYLES[key] ?? VENDOR_STATUS_STYLES.pending;
}

export function getVendorStatusLabel(status?: string | null): string {
  return getVendorStatusStyle(status).label;
}

/**
 * A pending or in-review applicant holds no session at all.
 *
 * The same rule lives on the API (`BLOCKING_APPLICATION_STATUSES`) and in the
 * auth hook; this copy only decides whether the applicant sees "wait" or
 * "apply again" on screen.
 */
export function isApplicationBlocking(status?: string | null): boolean {
  const key = (status || "").trim().toLowerCase();
  return key === "pending" || key === "under_review";
}
