"use server";

import { serverMutation, serverFetch } from "../core/server";
import type { DeliveryInvoice, DeliveryRecord, DeliveryTracking } from "@/types/delivery";

/**
 * Every delivery write, plus the reads a screen asks for after it rendered.
 *
 * A `serverMutation` never throws: an API error comes back as
 * `{ success: false, message }`, which is what the screens show in a toast.
 */

// ─── Store ────────────────────────────────────────────────────────────────────

export interface AssignDeliveryInput {
  orderId: string;
  riderId: string;
  /** What the rider is paid. Left out, the API uses the order's shipping. */
  fee?: number;
  distanceKm?: number;
  /** Move the order to "shipped" in the same request. */
  ship?: boolean;
  note?: string;
}

/** Offers an order to a rider, optionally shipping it at the same time. */
export const assignDelivery = async (data: AssignDeliveryInput) => {
  return serverMutation("/deliveries", data);
};

/**
 * Hands a request nobody answered in time to another rider.
 *
 * The store's picker does not use this: while a rider still has an open request
 * or is working an accepted job, the order is theirs, and the way to send
 * somebody else is to cancel the delivery first. Kept for a lapsed request the
 * sweep has not closed yet.
 */
export const reassignDelivery = async (
  id: string,
  data: { riderId: string; fee?: number; note?: string }
) => {
  return serverMutation(`/deliveries/${id}/reassign`, data, "PATCH");
};

export const cancelDeliveryById = async (id: string, reason?: string) => {
  return serverMutation(`/deliveries/${id}/cancel`, { reason }, "PATCH");
};

/** Closes offers nobody answered; the same sweep Vercel Cron runs daily. */
export const expireDeliveriesAction = async () => {
  return serverFetch("/deliveries/expire", true);
};

/**
 * The rider picker's read.
 *
 * It is an action rather than a plain `lib/api` read because the modal opens on
 * a click, long after the page was rendered, and the list must be current.
 */
export const fetchAssignableRidersAction = async (orderId?: string) => {
  const res = await serverFetch(
    orderId ? `/deliveries/admin/riders?orderId=${orderId}` : "/deliveries/admin/riders",
    true
  );
  return res?.data ?? null;
};

// ─── Rider ────────────────────────────────────────────────────────────────────

export const acceptDeliveryAction = async (id: string) => {
  return serverMutation(`/deliveries/${id}/accept`, {});
};

export const declineDeliveryAction = async (id: string, reason: string) => {
  return serverMutation(`/deliveries/${id}/decline`, { reason });
};

export const advanceDeliveryAction = async (
  id: string,
  status: "picked_up" | "out_for_delivery" | "cancelled",
  note?: string
) => {
  return serverMutation(`/deliveries/${id}/status`, { status, note }, "PATCH");
};

/** Closes the job with the customer's code. */
export const completeDeliveryAction = async (id: string, code: string) => {
  return serverMutation(`/deliveries/${id}/complete`, { code });
};

/** One position ping, sent from the rider's phone while the job is live. */
export const shareLocationAction = async (
  id: string,
  point: { lat: number; lng: number; accuracy?: number; heading?: number; speed?: number }
) => {
  return serverMutation(`/deliveries/${id}/location`, point);
};

/**
 * One job, with the order behind it.
 *
 * A list row only carries the copy the delivery keeps for itself — name, phone,
 * address, one total — so opening a job reads the whole order: the lines, what
 * the customer was charged, whether the door expects cash, and the postcode. It
 * is an action rather than a page read because the modal opens on a click.
 */
export const fetchMyDeliveryAction = async (id: string): Promise<DeliveryRecord | null> => {
  const res = await serverFetch(`/deliveries/${id}`, true);
  return res?.data ?? null;
};

/** The figures the rider's own invoice prints. Read on demand, never in a list. */
export const fetchDeliveryInvoiceAction = async (id: string): Promise<DeliveryInvoice | null> => {
  const res = await serverFetch(`/deliveries/${id}/invoice`, true);
  return res?.data ?? null;
};

// ─── Buyer ────────────────────────────────────────────────────────────────────

/**
 * The tracking page's read, as an action so the client can poll it.
 *
 * It goes through `serverFetch` rather than a bare fetch so the session token
 * never leaves the server.
 */
export const fetchTrackingAction = async (orderId: string): Promise<DeliveryTracking | null> => {
  const res = await serverFetch(`/deliveries/tracking/${orderId}`, true);
  return res?.data ?? null;
};

export const fetchDeliveryCodeAction = async (orderId: string) => {
  const res = await serverFetch(`/deliveries/tracking/${orderId}/code`, true);
  return res?.data ?? null;
};

export const regenerateDeliveryCodeAction = async (orderId: string) => {
  const res = await serverMutation(`/deliveries/tracking/${orderId}/code`, {});
  return res?.data ?? null;
};
