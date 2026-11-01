/**
 * Rider application status badges.
 *
 * Mirrors `vendorStatus.ts` so the applicant's screen and the admin review desk
 * read the same five states the same way. The wording is rider-specific: an
 * open application never pauses sign-in — the account keeps living as a
 * customer — it only means the delivery authority has not been granted yet.
 */

import type { LucideIcon } from "lucide-react";
import { CheckCircle2, Clock, Eye, Undo2, XCircle } from "lucide-react";
import type { RiderApplicationStatus } from "@/types/rider";

export interface RiderStatusStyle {
  label: string;
  description: string;
  badge: string;
  dot: string;
  icon: LucideIcon;
}

const RIDER_STATUS_STYLES: Record<RiderApplicationStatus, RiderStatusStyle> = {
  pending: {
    label: "Pending review",
    description: "Your application is queued for the delivery team.",
    badge:
      "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30",
    dot: "bg-amber-500 dark:bg-amber-400",
    icon: Clock,
  },
  under_review: {
    label: "Under review",
    description: "The delivery team is checking your vehicle and documents.",
    badge:
      "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/30",
    dot: "bg-sky-500 dark:bg-sky-400",
    icon: Eye,
  },
  approved: {
    label: "Approved",
    description: "You are a Sparq rider. Open the rider dashboard to start receiving deliveries.",
    badge:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30",
    dot: "bg-emerald-500 dark:bg-emerald-400",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Not approved",
    description: "You can keep shopping as usual and apply again once you fix the reason below.",
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
export function getRiderStatusStyle(status?: string | null): RiderStatusStyle {
  const key = (status || "").trim().toLowerCase() as RiderApplicationStatus;
  return RIDER_STATUS_STYLES[key] ?? RIDER_STATUS_STYLES.pending;
}

export function getRiderStatusLabel(status?: string | null): string {
  return getRiderStatusStyle(status).label;
}

/**
 * Whether the application is still open.
 *
 * Unlike the old vendor flow, an open rider application never blocks sign-in —
 * the account keeps its customer dashboard the whole time. This flag only
 * decides whether the applicant sees "waiting" or "apply again" on screen.
 */
export function isRiderApplicationOpen(status?: string | null): boolean {
  const key = (status || "").trim().toLowerCase();
  return key === "pending" || key === "under_review";
}
