"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, Modal } from "@heroui/react";
import {
  Bike,
  CheckCircle2,
  CircleDot,
  Loader2,
  MapPin,
  Package,
  RefreshCw,
  Search,
  ShieldAlert,
  Truck,
  User as UserIcon,
  WifiOff,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  assignDelivery,
  fetchAssignableRidersAction,
  reassignDelivery,
} from "@/lib/action/deliveries";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import type { AssignableRiderFeed, DeliveryRecord } from "@/types/delivery";

/**
 * The store's rider picker.
 *
 * One component serves both jobs: handing an order to a rider (which also ships
 * it, so the two clicks that must agree can never disagree) and moving a live
 * job to somebody else. The live job is read from the API rather than passed in,
 * so the same picker works from the orders page and the delivery board. Offline
 * riders stay on the list, greyed out, so an empty picker never looks broken.
 */

export interface AssignRiderOrder {
  _id: string;
  orderNumber: string;
  customerName?: string;
  city?: string;
  shippingFee?: number;
  /** "shipped" or later means the order is already out, so nothing to ship. */
  orderStatus?: string;
}

interface AssignRiderModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: AssignRiderOrder | null;
  onAssigned?: (delivery: DeliveryRecord) => void;
}

/** A rider's vehicle decides the icon, and the icon is the scannable part. */
function vehicleIcon(vehicleType: string) {
  const value = vehicleType.toLowerCase();
  if (value.includes("bike") || value.includes("cycle") || value.includes("motor")) return Bike;
  return Truck;
}

export default function AssignRiderModal({
  isOpen,
  onOpenChange,
  order,
  onAssigned,
}: AssignRiderModalProps) {
  const { formatPrice } = useSiteSettings();
  const [feed, setFeed] = useState<AssignableRiderFeed | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [fee, setFee] = useState("");
  const [distance, setDistance] = useState("");
  const [note, setNote] = useState("");
  // A read that failed is not a read that came back empty. Telling the store
  // "no rider accounts yet" when the API never answered sends them off to
  // promote someone who is already a rider, so the two cases get different
  // screens and the failure gets a retry.
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // A fresh open resets everything: a leftover fee from the last order would be
  // applied to an order it was never meant for.
  useEffect(() => {
    if (!isOpen || !order?._id) return;

    setSelectedId("");
    setSearch("");
    setNote("");
    setDistance("");
    setFee(String(order.shippingFee || 5));

    let cancelled = false;
    setIsLoading(true);
    fetchAssignableRidersAction(order._id)
      .then((data) => {
        if (cancelled) return;
        setFeed(data);
        setLoadFailed(data === null);
      })
      .catch(() => {
        if (!cancelled) {
          setFeed(null);
          setLoadFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, order?._id, order?.shippingFee, attempt]);

  const riders = feed?.riders ?? [];
  // A live job means this picker is a hand-over, not a first assignment.
  const handover = feed?.currentDelivery ?? null;
  // Only an unanswered offer can be handed on. Once the rider accepts, the job
  // is theirs and the store is told to ask them, not to move it quietly.
  const lockedByRider = Boolean(handover && handover.status !== "assigned");

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return riders;
    return riders.filter(
      (rider) =>
        rider.name.toLowerCase().includes(q) ||
        rider.phone.toLowerCase().includes(q) ||
        rider.vehicleNumber.toLowerCase().includes(q)
    );
  }, [riders, search]);

  const selectedRider = riders.find((rider) => rider._id === selectedId) || null;
  const currentRider = riders.find((rider) => rider._id === feed?.currentRiderId) || null;

  const handleSubmit = async () => {
    if (lockedByRider) {
      toast.error("The rider has accepted this job, so it cannot be handed over");
      return;
    }
    if (!order || !selectedId) {
      toast.error("Pick a rider first");
      return;
    }

    setIsSubmitting(true);
    try {
      const feeValue = fee.trim() === "" ? undefined : Number(fee);
      const distanceValue = distance.trim() === "" ? undefined : Number(distance);
      const isShipped = order.orderStatus === "shipped";

      const res = handover
        ? await reassignDelivery(handover._id, {
            riderId: selectedId,
            fee: feeValue,
            note: note.trim() || undefined,
          })
        : await assignDelivery({
            orderId: order._id,
            riderId: selectedId,
            fee: feeValue,
            distanceKm: distanceValue,
            ship: !isShipped,
            note: note.trim() || undefined,
          });

      if (res?.success === false) {
        toast.error(res?.message || "The delivery could not be assigned");
        return;
      }

      toast.success(
        handover
          ? `Moved to ${selectedRider?.name ?? "the new rider"}`
          : `Assigned to ${selectedRider?.name ?? "the rider"}. ${
              isShipped ? "The order already shipped." : "The order is shipped."
            }`
      );
      onAssigned?.(res?.data);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The delivery could not be assigned");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-[var(--foreground)]">
            <Modal.Header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div>
                <Modal.Heading className="text-base font-extrabold text-[var(--foreground)]">
                  {lockedByRider
                    ? "This job is with the rider"
                    : handover
                    ? "Hand this delivery over"
                    : "Who is carrying this order?"}
                </Modal.Heading>
                <p className="text-xs text-[var(--foreground-muted)] mt-1">
                  {order
                    ? `${order.orderNumber}${order.customerName ? ` · ${order.customerName}` : ""}${
                        order.city ? ` · ${order.city}` : ""
                      }`
                    : "No order selected"}
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
                  {lockedByRider
                    ? "The rider has accepted this delivery, so the last word is theirs. Ask them to cancel it from their dashboard if it cannot go ahead."
                    : handover
                    ? "The current rider is told the job moved. The order keeps its shipped status."
                    : order?.orderStatus === "shipped"
                    ? "This order shipped without a rider. Assigning one now puts it on somebody's route."
                    : "Assigning a rider also ships the order, so a parcel never leaves without one."}
                </p>
              </div>
              <Modal.CloseTrigger className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer p-1 rounded-lg self-end sm:self-auto">
                ✕
              </Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="space-y-5">
              {lockedByRider && (
                <div className="flex items-start gap-2 p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                  <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                      {`${currentRider?.name || "The rider"} is carrying this job`}
                    </p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                      A delivery cannot be handed to somebody else once it is
                      accepted. If it has to stop, the rider cancels it from their
                      dashboard and the store then settles the order.
                    </p>
                  </div>
                </div>
              )}

              {/* ── Rider list ── */}
              <div className={`space-y-2 ${lockedByRider ? "opacity-60 pointer-events-none" : ""}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Riders
                  </p>
                  <span className="text-[11px] font-semibold text-[var(--foreground-muted)]">
                    {riders.filter((rider) => rider.available).length} online of {riders.length}
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                  <Search className="w-4 h-4 text-[var(--foreground-muted)] shrink-0" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search a rider by name or phone"
                    className="w-full bg-transparent outline-none text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]"
                  />
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-xs font-semibold text-[var(--foreground-muted)]">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading riders…
                  </div>
                ) : visible.length === 0 ? (
                  <div className="py-8 text-center">
                    {loadFailed && riders.length === 0 ? (
                      <>
                        <WifiOff className="w-8 h-8 mx-auto text-[var(--foreground-muted)]" />
                        <p className="text-xs font-semibold text-[var(--foreground)] mt-2">
                          Could not load the riders
                        </p>
                        <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
                          The store API did not answer, so this is not an empty list.
                        </p>
                        <button
                          type="button"
                          onClick={() => setAttempt((value) => value + 1)}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] text-[11px] font-bold text-[var(--foreground)] hover:border-[var(--brand-flat)]/50 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Try again
                        </button>
                      </>
                    ) : (
                      <>
                        <UserIcon className="w-8 h-8 mx-auto text-[var(--foreground-muted)]" />
                        <p className="text-xs font-semibold text-[var(--foreground)] mt-2">
                          {riders.length === 0
                            ? "No rider accounts yet"
                            : "No rider matches that search"}
                        </p>
                        <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
                          {riders.length === 0
                            ? "Promote a user to the rider role from the Users page."
                            : "Try a shorter search."}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {visible.map((rider) => {
                      const Icon = vehicleIcon(rider.vehicleType);
                      const isSelected = rider._id === selectedId;
                      const isCurrent = feed?.currentRiderId === rider._id;

                      return (
                        <button
                          key={rider._id}
                          type="button"
                          disabled={rider.suspended}
                          onClick={() => setSelectedId(rider._id)}
                          className={`text-left rounded-2xl border p-3 transition-all ${
                            rider.suspended ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                          } ${
                            isSelected
                              ? "border-[var(--brand-flat)] bg-[var(--brand-flat)]/10 shadow-xs"
                              : "border-[var(--border-color)] bg-[var(--surface)] hover:border-[var(--brand-flat)]/50"
                          } ${rider.available ? "" : "opacity-70"}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-[var(--foreground)]" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[var(--foreground)] truncate">
                                  {rider.name}
                                </p>
                                <p className="text-[10px] text-[var(--foreground-muted)] truncate">
                                  {rider.vehicleNumber || rider.vehicleType || rider.phone || "No vehicle on file"}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-[var(--brand-flat)] shrink-0" />
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wide ${
                                rider.available
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25"
                              }`}
                            >
                              {rider.available ? (
                                <CircleDot className="w-2.5 h-2.5" />
                              ) : (
                                <WifiOff className="w-2.5 h-2.5" />
                              )}
                              {rider.available ? "Online" : "Offline"}
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--surface-alt)] border border-[var(--border-color)] text-[9px] font-bold text-[var(--foreground-muted)]">
                              <Package className="w-2.5 h-2.5" />
                              {rider.activeJobs} active
                            </span>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[var(--surface-alt)] border border-[var(--border-color)] text-[9px] font-bold text-[var(--foreground-muted)]">
                              <MapPin className="w-2.5 h-2.5" />
                              {rider.completedJobs} done
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/25 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                                Current rider
                              </span>
                            )}
                            {rider.suspended && (
                              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/25 text-[9px] font-bold text-rose-600 dark:text-rose-400">
                                Suspended
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── The terms ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Rider fee
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={fee}
                    onChange={(event) => setFee(event.target.value)}
                    className="h-10 bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl text-xs font-semibold text-[var(--foreground)]"
                  />
                  <span className="block text-[10px] text-[var(--foreground-muted)]">
                    Defaults to the shipping the customer paid
                    {order?.shippingFee ? ` (${formatPrice(order.shippingFee)})` : ""}
                  </span>
                </label>

                <label className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                    Road distance (km)
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    value={distance}
                    onChange={(event) => setDistance(event.target.value)}
                    placeholder="Optional"
                    className="h-10 bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl text-xs font-semibold text-[var(--foreground)]"
                  />
                  <span className="block text-[10px] text-[var(--foreground-muted)]">
                    Feeds the ETA the customer sees
                  </span>
                </label>
              </div>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  Note for the rider
                </span>
                <Input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Gate code, landmark, fragile parcel…"
                  className="h-10 bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl text-xs font-semibold text-[var(--foreground)]"
                />
              </label>
            </Modal.Body>

            <Modal.Footer className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border-color)]">
              <p className="text-[11px] text-[var(--foreground-muted)]">
                {selectedRider
                  ? `${selectedRider.name} has ${selectedRider.activeJobs} job${
                      selectedRider.activeJobs === 1 ? "" : "s"
                    } in hand`
                  : "The rider has 30 minutes to answer"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onPress={() => onOpenChange(false)}
                  className="h-9 px-4 rounded-xl bg-[var(--surface-alt)] text-[var(--foreground)] border border-[var(--border-color)] text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleSubmit}
                  isDisabled={!selectedId || isSubmitting || lockedByRider}
                  className="h-9 px-4 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving
                    </span>
                  ) : lockedByRider ? (
                    "With the rider"
                  ) : handover ? (
                    "Hand over"
                  ) : order?.orderStatus === "shipped" ? (
                    "Assign rider"
                  ) : (
                    "Assign & ship"
                  )}
                </Button>
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
