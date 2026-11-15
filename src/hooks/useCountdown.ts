"use client";

import { useEffect, useMemo, useState } from "react";
import {
  countdownParts,
  EMPTY_COUNTDOWN,
  parseCountdownTarget,
  type CountdownParts,
} from "@/lib/countdown";

/**
 * One second-by-second countdown for every deal timer on the site.
 *
 * The hook stores the current clock reading, not the remaining time: the parts
 * are derived on each render from the live target, so a slide switch, a product
 * reload or a target that turns invalid can never leave a stale countdown
 * ticking into the next offer.
 *
 * The clock starts null so the first paint matches the server render (no
 * hydration mismatch), and the interval is re-armed whenever the target
 * changes, which also drops the timer of the previous offer.
 */
export function useCountdown(
  target?: string | number | Date | null
): CountdownParts {
  const [now, setNow] = useState<number | null>(null);

  // The date may arrive as a fresh Date object on every render, so the effect
  // depends on its timestamp instead of the object identity.
  const targetTime = useMemo(() => {
    const date = parseCountdownTarget(target);
    return date ? date.getTime() : null;
  }, [target]);

  useEffect(() => {
    if (targetTime === null) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    // The first reading is taken right after mount so the timer shows up
    // immediately, then every whole second while the target is alive.
    const start = setTimeout(() => {
      setNow(Date.now());
      interval = setInterval(() => setNow(Date.now()), 1000);
    }, 0);

    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [targetTime]);

  return useMemo(() => {
    if (targetTime === null || now === null) return EMPTY_COUNTDOWN;
    return countdownParts(new Date(targetTime), now);
  }, [targetTime, now]);
}
