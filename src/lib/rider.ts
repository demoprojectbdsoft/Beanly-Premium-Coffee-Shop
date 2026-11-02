import type {
  DeliveryRecord,
  DeliveryStatus,
  RiderStatCardData,
  RiderStats,
} from "@/types/delivery";

/**
 * The delivery screens' shared vocabulary.
 *
 * Every label, chip colour and stat card lives here, so the rider's lists, the
 * store's board and the buyer's tracking page describe a delivery the same way.
 */

/** What a rider sees: a fresh offer is waiting on them. */
export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  assigned: "Awaiting you",
  accepted: "Accepted",
  picked_up: "Picked up",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  declined: "Declined",
};

/**
 * What everybody else sees. The same stage reads differently from the store's
 * side or the customer's: nobody is "awaiting me" on those screens.
 */
export const DELIVERY_STATUS_NEUTRAL_LABELS: Record<DeliveryStatus, string> = {
  assigned: "Awaiting rider",
  accepted: "Accepted",
  picked_up: "Picked up",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  declined: "Declined",
};

/** Chip colours: calm for a new job, brand for work in progress, green at the door. */
export const DELIVERY_STATUS_STYLES: Record<DeliveryStatus, string> = {
  assigned: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
  accepted: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
  picked_up: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25",
  out_for_delivery: "bg-[var(--brand-flat)]/10 text-[var(--brand-flat)] border-[var(--brand-flat)]/25",
  delivered: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
  declined: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25",
};

/** Statuses that mean the rider is working on the job right now. */
export const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = [
  "accepted",
  "picked_up",
  "out_for_delivery",
];

export function isActiveDelivery(status: DeliveryStatus): boolean {
  return ACTIVE_DELIVERY_STATUSES.includes(status);
}

/**
 * The happy path, in order.
 *
 * `cancelled` and `declined` are not steps: they are the two ways a job leaves
 * this line, so a progress bar built from this list can never show them.
 */
export const DELIVERY_STAGE_SEQUENCE: DeliveryStatus[] = [
  "assigned",
  "accepted",
  "picked_up",
  "out_for_delivery",
  "delivered",
];

/** A plain-language name for the customer's stepper. */
export const DELIVERY_STAGE_LABELS: Record<string, string> = {
  assigned: "Rider assigned",
  accepted: "Rider accepted",
  picked_up: "Picked up",
  out_for_delivery: "On the way",
  delivered: "Delivered",
};

/** How far a delivery has come, 0–100, for the progress bar. */
export function deliveryProgressPercent(status: DeliveryStatus): number {
  const index = DELIVERY_STAGE_SEQUENCE.indexOf(status);
  if (index < 0) return 0;
  return Math.round((index / (DELIVERY_STAGE_SEQUENCE.length - 1)) * 100);
}

/** Whether a stage has been reached, so the stepper can tick it. */
export function hasReachedStage(current: DeliveryStatus, stage: DeliveryStatus): boolean {
  const currentIndex = DELIVERY_STAGE_SEQUENCE.indexOf(current);
  const stageIndex = DELIVERY_STAGE_SEQUENCE.indexOf(stage);
  if (currentIndex < 0 || stageIndex < 0) return false;
  return currentIndex >= stageIndex;
}

/**
 * The rider's one next action, or null when there is nothing left to do.
 *
 * `delivered` never appears here: a hand-over is confirmed with the customer's
 * code, not with a button.
 */
export function nextRiderStep(
  status: DeliveryStatus
): { status: DeliveryStatus; label: string } | null {
  if (status === "accepted") return { status: "picked_up", label: "Mark picked up" };
  if (status === "picked_up") return { status: "out_for_delivery", label: "Start delivery" };
  return null;
}

/**
 * The stages with the parcel physically on the rider. This is when the
 * customer's map becomes worth watching, so it is what the rider's own device
 * starts reporting for on its own.
 */
export const CARRIED_DELIVERY_STATUSES: DeliveryStatus[] = ["picked_up", "out_for_delivery"];

/** Whether a job has been picked up and not yet handed over. */
export function isCarriedDelivery(delivery: { status: DeliveryStatus }): boolean {
  return CARRIED_DELIVERY_STATUSES.includes(delivery.status);
}

/**
 * The job a rider's phone should report for: the carried one that has come
 * furthest, and the most recently moved when two are level. A rider who takes a
 * second parcel should not leave the first customer watching a frozen dot.
 */
export function pickCarriedDelivery(deliveries: DeliveryRecord[]): DeliveryRecord | null {
  const carried = deliveries.filter(isCarriedDelivery);
  if (carried.length === 0) return null;

  const rank = (status: DeliveryStatus) => DELIVERY_STAGE_SEQUENCE.indexOf(status);
  const moved = (delivery: DeliveryRecord) => new Date(delivery.updatedAt).getTime() || 0;

  return [...carried].sort(
    (a, b) => rank(b.status) - rank(a.status) || moved(b) - moved(a)
  )[0];
}

/**
 * The rider's vehicle as a marker on the customer's map.
 *
 * A Leaflet divIcon is HTML rather than an image, so a glyph costs no asset, no
 * licence and no work to keep it in step with the theme. Order matters:
 * "motorcycle" ends in "cycle" and "autorickshaw" contains "auto", so the
 * unmistakable words are tested first. A vehicle none of them matches gets no
 * marker, and the map draws its plain live dot instead.
 */
export const RIDER_VEHICLE_MARKERS: { pattern: RegExp; glyph: string; label: string }[] = [
  { pattern: /(rickshaw|rick)/i, glyph: "🛺", label: "Rickshaw" },
  { pattern: /(foot|walk|ped)/i, glyph: "🚶", label: "On foot" },
  { pattern: /(motor|moto|scoot|bike)/i, glyph: "🛵", label: "Motorbike" },
  { pattern: /(bicycle|cycle)/i, glyph: "🚲", label: "Bicycle" },
  { pattern: /(van|truck|lorry)/i, glyph: "🚚", label: "Van" },
  { pattern: /(car|auto|sedan|hatch)/i, glyph: "🚗", label: "Car" },
];

/** The marker for a vehicle type, or null when the rider has none recorded. */
export function vehicleMarker(vehicleType?: string | null) {
  const value = (vehicleType || "").trim();
  if (!value) return null;
  return RIDER_VEHICLE_MARKERS.find((marker) => marker.pattern.test(value)) || null;
}

/** "Arriving in 12 min" for the tracking page. */
export function formatEta(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "Arriving soon";
  if (minutes < 60) return `Arriving in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `Arriving in ${hours}h ${rest}m` : `Arriving in ${hours}h`;
}

/**
 * A request that nobody answered in time. The rider can still see it in the
 * inbox, but it is no longer a job the store is waiting on.
 */
export function isDeliveryExpired(delivery: DeliveryRecord, nowMs: number): boolean {
  if (delivery.status !== "assigned" || !delivery.expiresAt) return false;
  return new Date(delivery.expiresAt).getTime() < nowMs;
}

/** The ids of every request in the list whose answer window has closed. */
export function expiredDeliveryIds(deliveries: DeliveryRecord[]): string[] {
  const nowMs = Date.now();
  return deliveries
    .filter((delivery) => isDeliveryExpired(delivery, nowMs))
    .map((delivery) => delivery._id);
}

/** 42 -> "42 min", 95 -> "1h 35m", 0 -> "—" (never measured yet). */
export function formatMinutes(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

/** "3.4 km" — or an empty string when the store has not measured it. */
export function formatDistance(km: number | null): string {
  if (km === null || km === undefined || !Number.isFinite(km)) return "";
  return `${km.toFixed(1)} km`;
}

/**
 * How the storefront spells a payment method.
 *
 * The rider screen has to say "Cash on Delivery" rather than "cod", because the
 * line under it is the money they are meant to collect at the door.
 */
export function paymentMethodLabel(method?: string | null): string {
  switch ((method || "").toLowerCase()) {
    case "bkash":
      return "bKash";
    case "nagad":
      return "Nagad";
    case "rocket":
      return "Rocket";
    case "cod":
      return "Cash on Delivery";
    default:
      return method || "—";
  }
}

/** "free" / "standard" / "express" in the words the customer was shown. */
export function shippingMethodLabel(method?: string | null): string {
  switch ((method || "").toLowerCase()) {
    case "free":
      return "Free shipping";
    case "express":
      return "Express delivery";
    default:
      return "Standard delivery";
  }
}

/** "2026-10-31" -> "Oct 31", read as a local date so the day never shifts. */
export function formatDayLabel(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  if (isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** "Oct 31, 02:15 PM" — the rider's clock, not a UTC one. */
export function formatMoment(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The eight overview cards, in the order the brief lists them: the work first,
 * then the money, then the clock.
 */
export function riderStatCards(
  stats: RiderStats,
  money: (value: number) => string
): RiderStatCardData[] {
  return [
    {
      title: "Total Deliveries",
      value: String(stats.totalDeliveries),
      change: `${stats.completed} delivered`,
      isPositive: true,
      iconName: "PackageCheck",
    },
    {
      title: "Completed",
      value: String(stats.completed),
      change: `${stats.successRate}% success rate`,
      isPositive: stats.successRate >= 50,
      iconName: "CheckCircle2",
    },
    {
      title: "Active Now",
      value: String(stats.active),
      change: stats.active > 0 ? "Jobs on the road" : "Nothing in hand",
      isPositive: true,
      iconName: "Navigation",
    },
    {
      title: "Pending Requests",
      value: String(stats.pendingRequests),
      change: stats.pendingRequests > 0 ? "Waiting for your answer" : "Inbox is clear",
      isPositive: stats.pendingRequests === 0,
      iconName: "Inbox",
    },
    {
      title: "Cancelled",
      value: String(stats.cancelled),
      change: stats.cancelled > 0 ? "Stopped before delivery" : "None cancelled",
      isPositive: stats.cancelled === 0,
      iconName: "XCircle",
    },
    {
      title: "Total Earnings",
      value: money(stats.earnings),
      change: "Delivered jobs only",
      isPositive: true,
      iconName: "Wallet",
    },
    {
      title: "This Month",
      value: money(stats.earningsThisMonth),
      change: "Since the 1st",
      isPositive: true,
      iconName: "CalendarDays",
    },
    {
      title: "Avg Delivery Time",
      value: formatMinutes(stats.avgDeliveryMinutes),
      change: "Accept to doorstep",
      isPositive: true,
      iconName: "Timer",
    },
  ];
}
