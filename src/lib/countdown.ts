// Every deal timer in the storefront (hero slider, product card, product page)
// counts down the same way so one screen cannot drift from another: the time
// left is split into whole days, hours, minutes and seconds, and each part is
// formatted with a fixed width so the boxes keep their size while they tick.

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** True when there is no target date left or the target date has passed. */
  ended: boolean;
}

export const EMPTY_COUNTDOWN: CountdownParts = {
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  ended: true,
};

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Turns a date value from the API or a form into a usable date, or null. */
export function parseCountdownTarget(
  value?: string | number | Date | null
): Date | null {
  if (value === undefined || value === null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Breaks the time left until `target` into days/hours/minutes/seconds.
 * A missing or passed target counts as ended, which is what hides every timer.
 */
export function countdownParts(
  target: Date | null,
  now: number = Date.now()
): CountdownParts {
  if (!target) return EMPTY_COUNTDOWN;
  const diff = target.getTime() - now;
  if (diff <= 0) return EMPTY_COUNTDOWN;
  return {
    days: Math.floor(diff / DAY),
    hours: Math.floor(diff / HOUR) % 24,
    minutes: Math.floor(diff / MINUTE) % 60,
    seconds: Math.floor(diff / SECOND) % 60,
    ended: false,
  };
}

/**
 * Always two digits, but a longer value is kept whole instead of being cut,
 * so a 100-hour or 10-day countdown widens its box instead of overflowing.
 */
export function padCountdown(value: number): string {
  const whole = Math.max(0, Math.trunc(Number(value) || 0));
  return String(whole).padStart(2, "0");
}
