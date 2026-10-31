/**
 * One set of words and colours for a featured placement.
 *
 * The same row is read on two desks — the seller's own and the store team's
 * board — so a shelf that is lit, lapsed or pulled early has to look the same
 * on both, and the reason it went quiet has to be spelled the same way. Only
 * the point of view differs, so the source line asks who is reading it.
 */

import type { FeaturedPlacement, PromotionState } from "@/types";
import { formatOrderDate } from "./dateTime";

export interface PromotionStateStyle {
  /** How the state is spelled on screen. */
  label: string;
  /** Pill classes: background, text colour and border. */
  badge: string;
}

const PROMOTION_STATE_STYLES: Record<PromotionState, PromotionStateStyle> = {
  live: {
    label: "Featured",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  ended: {
    label: "Ended",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300",
  },
  cancelled: {
    label: "Cancelled",
    badge: "border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground-muted)]",
  },
};

/** A state the API did not send falls back to the neutral row, never a crash. */
export function getPromotionStateStyle(state?: string | null): PromotionStateStyle {
  return PROMOTION_STATE_STYLES[(state || "") as PromotionState] ?? PROMOTION_STATE_STYLES.cancelled;
}

/** The window, written once — and only the end when there is no start to show. */
export function promotionWindowWords(placement: FeaturedPlacement): string {
  const start = formatOrderDate(placement.startsAt);
  const end = formatOrderDate(placement.endsAt);
  if (!start && !end) return "No dates set";
  if (!start) return `Until ${end}`;
  if (!end) return `From ${start}`;
  return `${start} → ${end}`;
}

/** Who paid for the shelf, told to whoever is reading the row. */
export function promotionSourceWords(
  placement: FeaturedPlacement,
  audience: "seller" | "staff" = "seller"
): string {
  if (placement.source === "admin") {
    return audience === "seller"
      ? "Granted by the store team"
      : "Granted by this desk — not billed to the shop";
  }
  return audience === "seller"
    ? `From your ${placement.plan} plan`
    : `The shop bought it on the ${placement.plan} plan`;
}

/** When the shelf went quiet, in the tense the row is being read in. */
export function promotionEndWords(placement: FeaturedPlacement): string {
  if (!placement.endedAt) return "";
  const when = formatOrderDate(placement.endedAt);
  if (placement.state === "ended") return `came off ${when}`;
  if (placement.state === "cancelled") return `ended ${when}`;
  return `closed ${when}`;
}
