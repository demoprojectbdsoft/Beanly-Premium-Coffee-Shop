"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchRiderActiveDeliveriesAction } from "@/lib/action/deliveries";
import { useRiderLocation } from "@/hooks/useRiderLocation";
import { pickCarriedDelivery } from "@/lib/rider";
import type { DeliveryRecord } from "@/types/delivery";

/**
 * One live position feed for the whole rider workspace.
 *
 * The customer's map only earns its keep if the phone keeps reporting while the
 * rider is on the road, so the watch belongs to the layout — which stays mounted
 * across every rider page — and not to whichever sheet happened to be open when
 * the parcel was picked up. It used to live inside the job sheet, and closing
 * that sheet took the rider's position off the customer's map.
 *
 * Reporting starts by itself at "picked up" and ends with the job. A rider can
 * still stop it for the job in hand, or point it at a different live job; the
 * choice belongs to that job and is dropped as soon as it is no longer active.
 */

/**
 * How often the tracker re-reads the rider's live jobs. Pressing a stage button
 * asks for an immediate re-read, so this is only the net underneath: a job the
 * rider picked up on another device is found here within a minute.
 */
const POLL_MS = 60_000;

interface RiderLocationValue {
  /** Whether the phone is reporting right now, for whichever job is chosen. */
  isSharing: boolean;
  error: string;
  lastSentAt: string | null;
  points: number;
  /** The job the phone reports for — the rider's pick, or the furthest along. */
  reported: DeliveryRecord | null;
  /** Start reporting for a job the rider chose over the automatic one. */
  startFor: (job: DeliveryRecord) => void;
  /** Stop, and hand the choice back to the automatic job. */
  stop: () => void;
  toggle: () => void;
  /** Re-read the rider's jobs, for the moment a stage button is pressed. */
  refresh: () => void;
}

const RiderLocationContext = createContext<RiderLocationValue | null>(null);

/** The workspace's shared live-location feed. */
export function useRiderLocationShare(): RiderLocationValue {
  const value = useContext(RiderLocationContext);
  if (!value) {
    throw new Error("useRiderLocationShare needs a RiderLocationProvider above it");
  }
  return value;
}

export default function RiderLocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // The job the rider pointed the phone at, and the job the app would have
  // chosen by itself. Only ever one is reported: a phone has one battery.
  const [manual, setManual] = useState<DeliveryRecord | null>(null);
  const [carried, setCarried] = useState<DeliveryRecord | null>(null);
  const reported = manual ?? carried;

  const read = useCallback(() => {
    fetchRiderActiveDeliveriesAction()
      .then((rows) => {
        setCarried(pickCarriedDelivery(rows));
        // A hand-picked job that has finished is no longer a job to report for.
        setManual((current) =>
          current && rows.some((row) => row._id === current._id) ? current : null
        );
      })
      // A failed read keeps the job already known, so a network hiccup never
      // cuts a live watch out from under the customer.
      .catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    const poll = () => {
      if (alive) read();
    };

    poll();
    const timer = setInterval(() => {
      // A hidden phone does not need asking every minute.
      if (document.visibilityState === "visible") poll();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [read]);

  const { isSharing, error, lastSentAt, points, stop: stopWatch, toggle } = useRiderLocation(
    reported?._id ?? null,
    { autoStart: true }
  );

  const startFor = useCallback((job: DeliveryRecord) => setManual(job), []);

  // Stopping is the rider's answer for this job. The automatic choice is handed
  // back with it, so a second job still on the road keeps the customer's map.
  const stop = useCallback(() => {
    setManual(null);
    stopWatch();
  }, [stopWatch]);

  const value = useMemo(
    () => ({
      isSharing,
      error,
      lastSentAt,
      points,
      reported,
      startFor,
      stop,
      toggle,
      refresh: read,
    }),
    [isSharing, error, lastSentAt, points, reported, startFor, stop, toggle, read]
  );

  return (
    <RiderLocationContext.Provider value={value}>{children}</RiderLocationContext.Provider>
  );
}
