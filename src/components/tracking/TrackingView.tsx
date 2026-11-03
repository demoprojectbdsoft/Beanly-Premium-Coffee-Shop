"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, Card, Chip } from "@heroui/react";
import {
  ArrowLeft,
  Bike,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  MapPin,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Truck,
} from "lucide-react";
import { toast } from "react-toastify";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import {
  DELIVERY_STATUS_NEUTRAL_LABELS,
  DELIVERY_STATUS_STYLES,
  DELIVERY_STAGE_LABELS,
  formatDistance,
  formatEta,
  formatMoment,
  isCarriedDelivery,
  vehicleMarker,
} from "@/lib/rider";
import { fetchTrackingAction, regenerateDeliveryCodeAction } from "@/lib/action/deliveries";
import DeliveryMap from "@/components/tracking/DeliveryMap";
import UserAvatar from "@/components/shared/UserAvatar";
import type { DeliveryDestination, DeliveryTracking } from "@/types/delivery";

/**
 * The customer's tracking screen.
 *
 * One poll every eight seconds carries the whole picture — stage, rider,
 * position, ETA and the code read out at the door — so nothing here needs a
 * socket. The poll stops the moment the job ends.
 */

const POLL_MS = 8_000;

/** A ping older than this is called stale rather than live. */
const STALE_MS = 90_000;

/*
 * Wider than this and the pin is a neighbourhood, not a person: the device
 * answered with a network location rather than its GPS. Saying "±50000 m" is
 * technically true and useless to read, so the line says what it means.
 */
const COARSE_ACCURACY_M = 2_000;

interface TrackingViewProps {
  initial: DeliveryTracking;
  destination: DeliveryDestination | null;
}

interface Step {
  key: string;
  label: string;
  at: string | null;
  note?: string;
}

export default function TrackingView({ initial, destination }: TrackingViewProps) {
  const { formatPrice } = useSiteSettings();
  const [data, setData] = useState<DeliveryTracking>(initial);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const inFlight = useRef(false);

  const orderId = initial.order._id;
  const delivery = data.delivery;
  const isLive = delivery
    ? !["delivered", "cancelled", "declined"].includes(delivery.status)
    : false;

  /*
    The map exists only while somebody is actually carrying the parcel.

    Before the pickup there is nothing to show: the rider has the job, not the
    box, and a map that draws the destination pin over an empty city reads like a
    live position when it is a guess. After the hand-over the position is history
    — keeping the last dot on screen invites the customer to watch a rider who has
    already gone. Both ends of the delivery get words instead of a picture, and
    only the carried middle gets the road.
  */
  const isCarried = delivery ? isCarriedDelivery(delivery) : false;

  // ── Polling ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLive) return;
    let stopped = false;

    const tick = async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const next = await fetchTrackingAction(orderId);
        if (!stopped && next) setData(next);
      } finally {
        inFlight.current = false;
      }
    };

    const timer = setInterval(tick, POLL_MS);

    // Coming back to the tab should not wait for the next tick.
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isLive, orderId]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const steps = useMemo<Step[]>(() => {
    const placed: Step = { key: "placed", label: "Order placed", at: data.order.createdAt };
    if (!delivery) return [placed];

    const rows: Step[] = [
      placed,
      {
        key: "assigned",
        label: DELIVERY_STAGE_LABELS.assigned,
        at: delivery.createdAt,
        note: delivery.rider ? `${delivery.rider.name} is carrying this one` : undefined,
      },
      { key: "accepted", label: DELIVERY_STAGE_LABELS.accepted, at: delivery.acceptedAt },
      { key: "picked_up", label: DELIVERY_STAGE_LABELS.picked_up, at: delivery.pickedUpAt },
      {
        key: "out_for_delivery",
        label: DELIVERY_STAGE_LABELS.out_for_delivery,
        at: delivery.outForDeliveryAt,
      },
      { key: "delivered", label: DELIVERY_STAGE_LABELS.delivered, at: delivery.deliveredAt },
    ];

    if (delivery.status === "cancelled" || delivery.status === "declined") {
      rows.push({
        key: "closed",
        label: delivery.status === "cancelled" ? "Delivery cancelled" : "Delivery declined",
        at: delivery.cancelledAt ?? delivery.updatedAt,
        note: delivery.declineReason || undefined,
      });
    }

    return rows;
  }, [data.order.createdAt, delivery]);

  const currentStepIndex = steps.findIndex((step) => !step.at);

  // The rider's own clock, so a stalled feed reads as stalled.
  const lastSeenMs = data.location
    ? new Date(data.serverTime).getTime() - new Date(data.location.updatedAt).getTime()
    : null;
  const isStale = lastSeenMs !== null && lastSeenMs > STALE_MS;

  // The vehicle the marker shows, named once so the words under the map match
  // the glyph on it.
  const vehicle = vehicleMarker(delivery?.rider?.vehicleType);

  const handleCopyCode = async () => {
    if (!data.otp) return;
    try {
      await navigator.clipboard.writeText(data.otp.code);
      toast.success("Delivery code copied");
    } catch {
      toast.error("This browser would not copy the code");
    }
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const code = await regenerateDeliveryCodeAction(orderId);
      if (!code) {
        toast.error("A new code could not be generated right now");
        return;
      }
      setData((previous) => ({ ...previous, otp: code }));
      toast.success("A new delivery code is ready");
    } finally {
      setIsRegenerating(false);
    }
  };

  const statusLabel = delivery
    ? DELIVERY_STATUS_NEUTRAL_LABELS[delivery.status]
    : data.order.status === "delivered"
    ? "Delivered"
    : "Not handed to a rider yet";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/track-order"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--foreground-muted)] hover:text-primary"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All my orders
          </Link>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
              {data.order.orderNumber}
            </h1>
            <Chip
              size="sm"
              className={`border text-[10px] font-bold ${
                delivery
                  ? DELIVERY_STATUS_STYLES[delivery.status]
                  : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border-color)]"
              }`}
            >
              {statusLabel}
            </Chip>
            {/* "Live" means a position is moving on the map — nothing else. */}
            {isCarried && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--foreground-muted)] mt-1">
            {data.order.shippingMethod} delivery to{" "}
            {[data.order.address, data.order.city].filter(Boolean).join(", ") || "your address"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.eta && isLive && (
            <div className="px-3.5 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Arrival
              </p>
              <p className="text-xs font-extrabold text-[var(--foreground)]">
                {formatEta(data.eta.minutes)}
                <span className="font-semibold text-[var(--foreground-muted)]">
                  {" "}
                  · {formatMoment(data.eta.at)}
                </span>
              </p>
            </div>
          )}
          {data.order.estimatedDelivery && (
            <div className="px-3.5 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Promised
              </p>
              <p className="text-xs font-extrabold text-[var(--foreground)]">
                {formatMoment(data.order.estimatedDelivery)}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Map + rider ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-4 shadow-xs space-y-3">
          {isCarried ? (
            <>
              <DeliveryMap
                rider={data.location}
                trail={data.location?.trail ?? []}
                destination={destination}
                vehicleType={delivery?.rider?.vehicleType}
                destinationUnavailable={Boolean(data.order.address) && !destination}
              />

              {data.location ? (
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <p className="text-[11px] font-semibold text-[var(--foreground)] flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-500" />
                    {vehicle ? `${vehicle.label} last seen` : "Last position"}{" "}
                    {formatMoment(data.location.updatedAt)}
                    {data.location.accuracy !== null &&
                      (data.location.accuracy > COARSE_ACCURACY_M ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          · approximate — the device is not reporting a precise
                          position
                        </span>
                      ) : (
                        <span className="font-medium text-[var(--foreground-muted)]">
                          · ±{Math.round(data.location.accuracy)} m
                        </span>
                      ))}
                  </p>
                  {isStale ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      <TriangleAlert className="w-3 h-3" />
                      Not updated recently — showing the last known spot
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-[var(--foreground-muted)]">
                      Updating every few seconds
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-[var(--foreground-muted)] px-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Your rider has not shared a position yet.
                </p>
              )}
            </>
          ) : delivery?.status === "delivered" ? (
            <PositionPlaceholder
              tone="done"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
              title="Delivered"
              text={`Handed over${
                delivery.deliveredAt ? ` at ${formatMoment(delivery.deliveredAt)}` : ""
              } and closed. The position feed stops here — nothing is being tracked any more.`}
            >
              {/* The order summary the customer came for: what arrived, what it
                  cost, who brought it and when it was signed off. */}
              <dl className="grid grid-cols-2 gap-2 w-full max-w-md text-[11px]">
                <SummaryRow
                  label="Parcel"
                  value={`${delivery.items} item${delivery.items === 1 ? "" : "s"}`}
                />
                <SummaryRow label="Paid" value={formatPrice(delivery.orderTotal)} />
                <SummaryRow label="Rider" value={delivery.rider?.name || "—"} />
                <SummaryRow
                  label="Closed"
                  value={delivery.deliveredAt ? formatMoment(delivery.deliveredAt) : "—"}
                />
              </dl>
            </PositionPlaceholder>
          ) : delivery?.status === "cancelled" || delivery?.status === "declined" ? (
            <PositionPlaceholder
              tone="closed"
              icon={<TriangleAlert className="w-5 h-5 text-rose-500" />}
              title={delivery.status === "cancelled" ? "Delivery cancelled" : "Rider declined the job"}
              text={
                delivery.declineReason ||
                "No rider is carrying this parcel, so there is no position to show."
              }
            />
          ) : (
            <PositionPlaceholder
              tone="wait"
              icon={<Clock className="w-5 h-5 text-[var(--brand-flat)]" />}
              title={delivery ? "Awaiting pickup" : "Not with a rider yet"}
              text={
                delivery
                  ? `The map opens the moment ${
                      delivery.rider?.name ? delivery.rider.name : "your rider"
                    } collects the parcel. Until then there is no position to draw.`
                  : "The store hands your order to a rider, and the map opens when they pick it up."
              }
            />
          )}
        </Card>

        <div className="space-y-4">
          {/* Rider card */}
          <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs space-y-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Your rider
            </p>

            {delivery?.rider ? (
              <>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    src={delivery.rider.image}
                    name={delivery.rider.name}
                    size={48}
                    alt={delivery.rider.name}
                    className="rounded-2xl bg-brand-gradient text-[var(--on-grad-text)] text-sm font-extrabold border border-[var(--border-color)]"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-[var(--foreground)] truncate">
                      {delivery.rider.name}
                    </p>
                    <p className="text-[11px] text-[var(--foreground-muted)] flex items-center gap-1">
                      <Bike className="w-3 h-3" />
                      {[delivery.rider.vehicleType, delivery.rider.vehicleNumber]
                        .filter(Boolean)
                        .join(" · ") || "No vehicle recorded"}
                    </p>
                  </div>
                </div>

                {delivery.rider.phone ? (
                  <a
                    href={`tel:${delivery.rider.phone}`}
                    className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call {delivery.rider.phone}
                  </a>
                ) : (
                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    No phone number on file for this rider.
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  No rider yet
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  The store will hand this order to a rider when it ships. You will
                  see their name and number here.
                </p>
              </div>
            )}
          </Card>

          {/* Delivery code */}
          <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Delivery code
              </p>
              <ShieldCheck className="w-4 h-4 text-[var(--foreground-muted)]" />
            </div>

            {data.otp ? (
              <>
                <div className="flex items-center justify-center gap-3 py-2">
                  <p className="text-3xl font-black tracking-[0.35em] text-[var(--foreground)]">
                    {data.otp.code}
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    aria-label="Copy delivery code"
                    className="p-2 rounded-lg bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground-muted)] hover:text-primary cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-[11px] text-[var(--foreground-muted)] text-center">
                  Read this to the rider at the door. It works until{" "}
                  <span className="font-bold text-[var(--foreground)]">
                    {formatMoment(data.otp.expiresAt)}
                  </span>
                  {data.otp.attemptsLeft < 5 && ` · ${data.otp.attemptsLeft} attempts left`}
                </p>

                {data.otp.expired && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 text-center">
                    This code has expired.
                  </p>
                )}

                <Button
                  size="sm"
                  isDisabled={isRegenerating}
                  onPress={handleRegenerate}
                  className="w-full h-9 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] text-[11px] font-bold flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
                  {isRegenerating ? "Generating…" : "Generate a new code"}
                </Button>
              </>
            ) : (
              <p className="text-[11px] text-[var(--foreground-muted)]">
                {isLive
                  ? "Your code appears here as soon as the rider sets off. Nobody can mark this order delivered without it."
                  : "A code is only issued while a delivery is on its way."}
              </p>
            )}
          </Card>
        </div>
      </div>

      {/* ── Timeline ── */}
      <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--foreground)]">Progress</h2>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            {isLive ? "Refreshing automatically" : "This delivery is closed"}
          </p>
        </div>

        <ol className="space-y-0">
          {steps.map((step, index) => {
            const done = Boolean(step.at);
            const isCurrent = index === currentStepIndex;
            const isLast = index === steps.length - 1;

            return (
              <li key={step.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-2 shrink-0 ${
                      done
                        ? "bg-primary border-primary text-white"
                        : isCurrent
                        ? "bg-[var(--surface)] border-primary text-primary"
                        : "bg-[var(--surface-alt)] border-[var(--border-color)] text-[var(--foreground-muted)]"
                    }`}
                  >
                    {done ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <span className="text-[10px] font-extrabold">{index + 1}</span>
                    )}
                  </span>
                  {!isLast && (
                    <span
                      className={`w-0.5 flex-1 min-h-6 ${
                        done ? "bg-primary/40" : "bg-[var(--border-color)]"
                      }`}
                    />
                  )}
                </div>

                <div className={`pb-5 ${isLast ? "pb-0" : ""}`}>
                  <p
                    className={`text-xs font-bold ${
                      done || isCurrent
                        ? "text-[var(--foreground)]"
                        : "text-[var(--foreground-muted)]"
                    }`}
                  >
                    {step.label}
                    {step.at && (
                      <span className="ml-2 font-semibold text-[var(--foreground-muted)]">
                        {formatMoment(step.at)}
                      </span>
                    )}
                  </p>
                  {step.note && (
                    <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                      {step.note}
                    </p>
                  )}
                  {isCurrent && isLive && (
                    <p className="text-[11px] font-semibold text-primary mt-0.5">
                      In progress
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>

      {/* ── Parcel ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Going to
          </p>
          <p className="text-xs font-bold text-[var(--foreground)] flex items-start gap-1.5">
            <MapPin className="w-3.5 h-3.5 mt-0.5 text-[var(--foreground-muted)] shrink-0" />
            {[data.order.address, data.order.city].filter(Boolean).join(", ") ||
              "No address recorded"}
          </p>
          {destination && (
            <p className="text-[10px] text-[var(--foreground-muted)]">
              Placed on the map as “{destination.label}”. Street position is
              approximate.
            </p>
          )}
        </Card>

        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Parcel
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
              <Package className="w-3.5 h-3.5" />
              {delivery ? `${delivery.items} item${delivery.items === 1 ? "" : "s"}` : "Items"}
            </span>
            <span className="font-extrabold text-[var(--foreground)]">
              {formatPrice(delivery?.orderTotal ?? 0)}
            </span>
          </div>
          {delivery?.distanceKm ? (
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[var(--foreground-muted)]">
                <Truck className="w-3.5 h-3.5" />
                Road distance
              </span>
              <span className="font-bold text-[var(--foreground)]">
                {formatDistance(delivery.distanceKm)}
              </span>
            </div>
          ) : null}
          {delivery?.history && delivery.history.length > 0 && (
            <p className="text-[10px] text-[var(--foreground-muted)]">
              {delivery.history.length} recorded step
              {delivery.history.length === 1 ? "" : "s"} in this delivery.
            </p>
          )}
        </Card>
      </div>

      {delivery?.status === "cancelled" && (
        <div className="p-4 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-[11px] text-rose-900 dark:text-rose-200 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <TriangleAlert className="w-3.5 h-3.5 shrink-0" />
            This delivery was cancelled
          </p>
          {delivery.declineReason && <p>{delivery.declineReason}</p>}
          <p>
            Nothing more will be tracked. If you still need this order, contact the
            store.
          </p>
        </div>
      )}
    </div>
  );
}

/*
  Words in place of the map.

  A map earns its space only while something is moving on it. Both ends of a
  delivery get a panel that says where the parcel actually is, and the ring
  keeps its own colour so a finished job cannot be read as an open one.
*/
const PLACEHOLDER_TONES = {
  wait: "border-[var(--border-color)] bg-[var(--surface-alt)]/60",
  done: "border-emerald-500/30 bg-emerald-500/5",
  closed: "border-rose-500/30 bg-rose-500/5",
} as const;

type PlaceholderTone = keyof typeof PLACEHOLDER_TONES;

function PositionPlaceholder({
  tone,
  icon,
  title,
  text,
  children,
}: {
  tone: PlaceholderTone;
  icon: React.ReactNode;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`w-full max-w-full rounded-2xl border border-dashed px-5 py-10 sm:py-14 text-center space-y-3 ${PLACEHOLDER_TONES[tone]}`}
    >
      <div className="mx-auto w-11 h-11 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-center">
        {icon}
      </div>
      <p className="text-sm font-extrabold text-[var(--foreground)]">{title}</p>
      <p className="text-[11px] text-[var(--foreground-muted)] max-w-sm mx-auto leading-relaxed">
        {text}
      </p>
      {children && <div className="pt-2 flex justify-center min-w-0">{children}</div>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 text-left p-2.5 rounded-xl bg-[var(--surface)] border border-[var(--border-color)]">
      <dt className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
        {label}
      </dt>
      <dd className="text-[11px] font-bold text-[var(--foreground)] truncate">{value}</dd>
    </div>
  );
}
