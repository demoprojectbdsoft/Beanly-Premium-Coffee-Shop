/**
 * Where the store team's read state lives.
 *
 * The store feed is one shared list: every admin sees the same lines, so a read
 * mark cannot be written on the row (it would clear the dot for the whole team).
 * It is kept on the device instead, and this module is the only place that
 * touches it — the bell and the activity page read and write through here, so a
 * line opened in one is already read in the other.
 *
 * Two marks are kept:
 *   - the ids of lines opened one at a time, and
 *   - a watermark: "everything stamped at or before this moment has been read",
 *     which is what "mark all as read" writes (including lines not loaded yet).
 */

const SEEN_IDS_KEY = "sparq:activities:seen-ids";
const SEEN_UNTIL_KEY = "sparq:activities:seen-until";

/** Keys written by earlier versions of the bell; removed so they cannot linger. */
const LEGACY_KEYS = ["sparq:activities:seen", "sparq:activities:seen-at"];

/** How many read ids are remembered; the watermark covers everything older. */
const SEEN_IDS_LIMIT = 300;

const hasStorage = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

/** Milliseconds of a timestamp, or 0 when it is missing or unreadable. */
function timeOf(value: string | null | undefined): number {
  if (!value) return 0;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/** The ids saved by previous visits, or an empty list when the value is junk. */
function readIds(): string[] {
  if (!hasStorage()) return [];

  try {
    const raw = localStorage.getItem(SEEN_IDS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** The moment everything before it counts as read, in milliseconds (0 = never). */
export function storeReadWatermark(): number {
  if (!hasStorage()) return 0;
  return timeOf(localStorage.getItem(SEEN_UNTIL_KEY));
}

/** Both marks in one read, so a list can judge every row from one snapshot. */
export interface StoreReadSnapshot {
  ids: string[];
  /** Milliseconds; 0 when nothing was ever marked read in bulk. */
  until: number;
}

export function storeReadSnapshot(): StoreReadSnapshot {
  return { ids: readIds(), until: storeReadWatermark() };
}

/** True when this line has been read on this device. */
export function isStoreActivitySeen(id: string, createdAt: string): boolean {
  const { ids, until } = storeReadSnapshot();
  if (ids.includes(id)) return true;

  return until > 0 && timeOf(createdAt) <= until;
}

/** The same answer as `isStoreActivitySeen`, for a snapshot already in hand. */
export function isSeenInSnapshot(
  snapshot: StoreReadSnapshot | null,
  id: string,
  createdAt: string
): boolean {
  if (!snapshot) return false;
  if (snapshot.ids.includes(id)) return true;

  return snapshot.until > 0 && timeOf(createdAt) <= snapshot.until;
}

/** Reads the given lines: their dots go, the others keep theirs. */
export function markStoreActivitiesSeen(ids: string[]): void {
  if (!hasStorage() || !ids.length) return;

  const merged = Array.from(new Set([...ids, ...readIds()])).slice(0, SEEN_IDS_LIMIT);
  localStorage.setItem(SEEN_IDS_KEY, JSON.stringify(merged));
}

/**
 * Reads everything up to `iso`, which is the API clock handed over with the
 * feed — never this device's clock, so a wrong system time cannot mark the
 * future as read.
 */
export function markStoreActivitiesSeenUntil(iso: string): void {
  if (!hasStorage()) return;

  const next = timeOf(iso);
  if (!next || next <= storeReadWatermark()) return;

  localStorage.setItem(SEEN_UNTIL_KEY, new Date(next).toISOString());
}

/** Drops the keys earlier builds left behind. */
export function forgetLegacyStoreReadKeys(): void {
  if (!hasStorage()) return;
  LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
}
