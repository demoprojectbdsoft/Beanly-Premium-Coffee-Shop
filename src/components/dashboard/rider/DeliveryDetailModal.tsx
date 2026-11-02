"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button, Chip, Modal } from "@heroui/react";
import {
  Banknote,
  Building2,
  Clock,
  FileText,
  History,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  ReceiptText,
  Store,
  User as UserIcon,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_STYLES,
  formatDistance,
  formatMoment,
  isActiveDelivery,
  paymentMethodLabel,
  shippingMethodLabel,
} from "@/lib/rider";
import { fetchDeliveryInvoiceAction } from "@/lib/action/deliveries";
import { downloadDeliveryInvoicePdf } from "@/lib/deliveryInvoicePdf";
import { useRiderLocationShare } from "@/context/RiderLocationContext";
import DeliveryActions from "./DeliveryActions";
import type { DeliveryRecord } from "@/types/delivery";

/**
 * One job, in full.
 *
 * The rider sees everything needed at the door — who, where, what, and how much
 * — plus the only two things the app asks of them: move the job forward, and
 * share where they are while they carry it.
 *
 * The row a list hands over only carries the delivery's own copy of the order,
 * so the list client reads the job properly the moment a row is clicked and
 * merges that read into what it passes down: the lines in the bag, the money the
 * customer was charged, the cash to collect at the door and the postcode.
 * Nothing here is invented when that read is missing or slow — the shorter copy
 * from the list is still enough to finish a delivery.
 */

interface DeliveryDetailModalProps {
  /**
   * The job to show.
   *
   * The list row is already enough to render, so the caller merges the fuller
   * read into it once it arrives and this sheet never has to fetch on its own.
   */
  delivery: DeliveryRecord | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  expired?: boolean;
  onChanged?: () => void;
  /** The order read is still running. */
  orderLoading?: boolean;
  /** The order read failed, so only the delivery's own copy is on show. */
  orderFailed?: boolean;
  /** Ask for the order read again. */
  onRetryOrder?: () => void;
}

export default function DeliveryDetailModal({
  delivery,
  isOpen,
  onOpenChange,
  expired = false,
  onChanged,
  orderLoading = false,
  orderFailed = false,
  onRetryOrder,
}: DeliveryDetailModalProps) {
  const { formatPrice } = useSiteSettings();
  // One record drives the whole sheet: whatever the caller last merged in.
  const view = delivery;
  const order = view?.order ?? null;
  const pickup = view?.pickup ?? null;
  const active = delivery ? isActiveDelivery(delivery.status) : false;
  /*
   * The position feed is the workspace's, not this sheet's: it starts on its
   * own at "picked up" and keeps running after the sheet closes. So this is a
   * window onto it, and the one thing it can do is stop the phone reporting for
   * the job in hand.
   */
  const share = useRiderLocationShare();
  const { isSharing, error, lastSentAt, points } = share;
  // The feed reports one job at a time, which is not always the one open here.
  const reportingHere = Boolean(delivery && share.reported?._id === delivery._id);
  const handleReport = () => {
    if (!delivery) return;
    if (reportingHere) share.toggle();
    else share.startFor(delivery);
  };
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  const handleChanged = () => {
    onChanged?.();
    onOpenChange(false);
  };

  /**
   * The sheet is assembled on the server from the order itself, so it always
   * matches what the store charged. It is fetched on the click, not with the
   * job, because a rider only papers one of them at the door.
   */
  const handleInvoice = async () => {
    if (!delivery || isLoadingInvoice) return;
    setIsLoadingInvoice(true);
    try {
      const invoice = await fetchDeliveryInvoiceAction(delivery._id);
      if (!invoice) {
        toast.error("That invoice is not available for this job");
        return;
      }
      await downloadDeliveryInvoicePdf(invoice, formatPrice);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not build the invoice");
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto text-[var(--foreground)]">
            {view && (
              <>
                <Modal.Header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Modal.Heading className="text-base font-extrabold text-[var(--foreground)]">
                        {view.orderNumber}
                      </Modal.Heading>
                      <Chip
                        size="sm"
                        className={`border text-[10px] font-bold ${DELIVERY_STATUS_STYLES[view.status]}`}
                      >
                        {DELIVERY_STATUS_LABELS[view.status]}
                      </Chip>
                    </div>
                    <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                      Assigned {formatMoment(view.createdAt)}
                      {view.distanceKm ? ` · ${formatDistance(view.distanceKm)}` : ""}
                    </p>
                    <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                      {order
                        ? `Ordered ${formatMoment(order.placedAt)} · ${shippingMethodLabel(order.shippingMethod)}`
                        : `Ordered ${view.items} item${view.items === 1 ? "" : "s"} · ${formatPrice(view.orderTotal)}`}
                    </p>
                  </div>
                  <Modal.CloseTrigger className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer p-1 rounded-lg self-end sm:self-auto">
                    ✕
                  </Modal.CloseTrigger>
                </Modal.Header>

                <Modal.Body className="space-y-4">
                  {/* The answer window, while there is one. */}
                  {view.status === "assigned" && view.expiresAt && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                      <Clock className="w-4 h-4 shrink-0" />
                      {expired
                        ? "This request expired before you answered it."
                        : `Answer before ${formatMoment(view.expiresAt)}`}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)] space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                        Collect from
                      </p>
                      <p className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                        {pickup?.name || "Sparq store"}
                      </p>
                      {pickup?.address && (
                        <p className="text-[11px] text-[var(--foreground-muted)] flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          {pickup.address}
                        </p>
                      )}
                      {pickup?.phone && (
                        <a
                          href={`tel:${pickup.phone}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
                        >
                          <Phone className="w-3 h-3" />
                          {pickup.phone}
                        </a>
                      )}
                      <p className="text-[11px] text-[var(--foreground-muted)]">
                        {view.items} item{view.items === 1 ? "" : "s"} ·{" "}
                        {formatPrice(view.orderTotal)} order
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)] space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                        Deliver to
                      </p>
                      <p className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                        {order?.address.fullName || view.customerName || "Customer"}
                      </p>
                      {(order?.address.phone || view.customerPhone) && (
                        <a
                          href={`tel:${order?.address.phone || view.customerPhone}`}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"
                        >
                          <Phone className="w-3 h-3" />
                          {order?.address.phone || view.customerPhone}
                        </a>
                      )}
                      <p className="text-[11px] text-[var(--foreground-muted)] flex items-start gap-1">
                        <Building2 className="w-3 h-3 mt-0.5 shrink-0" />
                        {[
                          order?.address.address || view.address,
                          order?.address.city || view.city,
                          order?.address.postalCode,
                        ]
                          .filter(Boolean)
                          .join(", ") || "No address recorded"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                      Your fee
                    </span>
                    <span className="text-lg font-extrabold text-[var(--foreground)]">
                      {formatPrice(view.fee)}
                    </span>
                  </div>

                  {/* ── The order itself ── */}
                  {orderLoading && !order && (
                    <div className="flex items-center gap-2 p-3 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--foreground-muted)]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Reading the order…
                    </div>
                  )}

                  {orderFailed && !order && !orderLoading && (
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[11px] text-[var(--foreground-muted)]">
                      <span>The order lines could not be read right now.</span>
                      <button
                        type="button"
                        onClick={() => onRetryOrder?.()}
                        className="font-bold text-primary hover:underline cursor-pointer"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {order && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
                        <ReceiptText className="w-3.5 h-3.5" />
                        In the bag
                      </p>
                      <ul className="space-y-2">
                        {order.items.map((line, index) => (
                          <li
                            key={`${line.title}-${index}`}
                            className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)]"
                          >
                            <div className="relative w-9 h-9 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] shrink-0 overflow-hidden">
                              {line.image ? (
                                <Image
                                  src={line.image}
                                  alt=""
                                  fill
                                  sizes="36px"
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <Package className="w-4 h-4 text-[var(--foreground-muted)] absolute inset-0 m-auto" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-[var(--foreground)] leading-snug">
                                {line.title}
                              </p>
                              <p className="text-[10px] text-[var(--foreground-muted)]">
                                {formatPrice(line.price)} each
                              </p>
                            </div>
                            <p className="text-[11px] font-bold text-[var(--foreground)] whitespace-nowrap">
                              ×{line.quantity}
                              <span className="block text-[10px] font-medium text-[var(--foreground-muted)] text-right">
                                {formatPrice(line.price * line.quantity)}
                              </span>
                            </p>
                          </li>
                        ))}
                      </ul>

                      <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)] space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between text-[var(--foreground-muted)]">
                          <span>Items</span>
                          <span className="font-semibold text-[var(--foreground)]">
                            {formatPrice(order.totals.subtotal)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[var(--foreground-muted)]">
                          <span>Delivery charge</span>
                          <span className="font-semibold text-[var(--foreground)]">
                            {order.totals.shipping > 0
                              ? formatPrice(order.totals.shipping)
                              : "Free"}
                          </span>
                        </div>
                        {order.totals.discount > 0 && (
                          <div className="flex items-center justify-between text-[var(--foreground-muted)]">
                            <span>
                              Discount
                              {order.totals.couponCode ? ` (${order.totals.couponCode})` : ""}
                            </span>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                              −{formatPrice(order.totals.discount)}
                            </span>
                          </div>
                        )}
                        {order.totals.pointsRedeemed > 0 && (
                          <div className="flex items-center justify-between text-[var(--foreground-muted)]">
                            <span>Points used</span>
                            <span className="font-semibold text-[var(--foreground)]">
                              {order.totals.pointsRedeemed}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[var(--border-color)]">
                          <span className="font-bold text-[var(--foreground)]">Order total</span>
                          <span className="text-sm font-extrabold text-[var(--foreground)]">
                            {formatPrice(order.totals.total)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)]">
                        <div className="flex items-center gap-2">
                          <Banknote
                            className={`w-4 h-4 shrink-0 ${
                              order.amountToCollect > 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-[var(--foreground-muted)]"
                            }`}
                          />
                          <div>
                            <p className="text-[11px] font-bold text-[var(--foreground)]">
                              {paymentMethodLabel(order.paymentMethod)}
                            </p>
                            <p className="text-[10px] text-[var(--foreground-muted)]">
                              {order.amountToCollect > 0
                                ? "Collect this at the door, hand over the parcel only after it"
                                : "Already paid — collect nothing"}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-sm font-extrabold ${
                            order.amountToCollect > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-[var(--foreground-muted)]"
                          }`}
                        >
                          {order.amountToCollect > 0
                            ? formatPrice(order.amountToCollect)
                            : "Paid in full"}
                        </span>
                      </div>

                      {order.estimatedDelivery && (
                        <p className="text-[10px] text-[var(--foreground-muted)]">
                          The customer was told to expect it: {order.estimatedDelivery}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Position sharing, only while carrying. */}
                  {active && (
                    <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)] space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <Navigation
                            className={`w-4 h-4 mt-0.5 shrink-0 ${
                              isSharing ? "text-emerald-500" : "text-[var(--foreground-muted)]"
                            }`}
                          />
                          <div>
                            <p className="text-[11px] font-bold text-[var(--foreground)]">
                              My live location
                            </p>
                            <p className="text-[10px] text-[var(--foreground-muted)]">
                              {isSharing && reportingHere
                                ? lastSentAt
                                  ? `Sending every 15s · ${points} update${points === 1 ? "" : "s"} sent`
                                  : "Waiting for the first position…"
                                : reportingHere
                                  ? "Stopped for this job. Start it again and the customer sees you on their map."
                                  : share.reported
                                    ? `Your phone is reporting for ${share.reported.orderNumber}. Switch it to this job if that is the one you are on.`
                                    : "It starts on its own once you pick the parcel up."}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onPress={handleReport}
                          className={`h-8 px-3 rounded-xl text-[10px] font-bold shrink-0 ${
                            isSharing && reportingHere
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                              : "bg-[var(--surface-elevated)] text-[var(--foreground)] border border-[var(--border-color)]"
                          }`}
                        >
                          {isSharing && reportingHere
                            ? "Stop"
                            : reportingHere
                              ? "Start"
                              : "Report this job"}
                        </Button>
                      </div>
                      {error && (
                        <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <X className="w-3 h-3" />
                          {error}
                        </p>
                      )}
                    </div>
                  )}

                  {/* History */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      History
                    </p>
                    {view.history.length === 0 ? (
                      <p className="text-[11px] text-[var(--foreground-muted)]">
                        Nothing has moved yet.
                      </p>
                    ) : (
                      <ol className="space-y-2">
                        {view.history.map((event, index) => (
                          <li key={`${event.status}-${index}`} className="flex items-start gap-2.5 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-flat)] mt-1.5 shrink-0" />
                            <div>
                              <p className="font-bold text-[var(--foreground)]">
                                {DELIVERY_STATUS_LABELS[event.status]}
                                <span className="font-medium text-[var(--foreground-muted)]">
                                  {" "}
                                  · {formatMoment(event.at)}
                                </span>
                              </p>
                              {event.note && (
                                <p className="text-[var(--foreground-muted)]">{event.note}</p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>

                  {view.declineReason && (
                    <div className="p-3 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-[11px] text-rose-900 dark:text-rose-200">
                      <span className="font-bold">Reason on record: </span>
                      {view.declineReason}
                    </div>
                  )}
                </Modal.Body>

                <Modal.Footer className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[var(--border-color)]">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link
                      href="/dashboard/rider/deliveries"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary"
                    >
                      <Package className="w-3.5 h-3.5" />
                      All my deliveries
                    </Link>

                    <Button
                      size="sm"
                      onPress={handleInvoice}
                      isDisabled={isLoadingInvoice}
                      className="h-8 px-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] text-[10px] font-bold disabled:opacity-60"
                    >
                      {isLoadingInvoice ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5" />
                      )}
                      Invoice PDF
                    </Button>
                  </div>

                  <DeliveryActions
                    delivery={view}
                    expired={expired}
                    onChanged={handleChanged}
                  />
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
