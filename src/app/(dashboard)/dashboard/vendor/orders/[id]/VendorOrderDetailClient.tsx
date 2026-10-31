"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bike,
  CircleCheck,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Phone,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "react-toastify";
import type { VendorOrder } from "@/types/vendor";
import { getVendorOrderStatusStyle, vendorOrderActions } from "@/lib/vendorOrderStatus";
import { getOrderStatusStyle } from "@/lib/orderStatusStyles";
import { updateVendorOrderStatus } from "@/lib/action/vendor";
import { formatOrderDate, formatOrderMoment } from "@/lib/dateTime";
import { formatPrice } from "@/lib/currency";

/**
 * One seller's slice of an order.
 *
 * The right column is the only place that writes. Every button here is a move
 * the API also checks, so a stale tab gets the API's explanation rather than
 * silently skipping a stage. Rejecting is deliberate: it needs a reason, puts
 * the lines back in stock and tells the store team to settle the money.
 */

interface VendorOrderDetailClientProps {
  order: VendorOrder;
  currency: string;
}

type MoveStatus = "accepted" | "processing" | "ready_for_shipment" | "rejected";

/** The next-step buttons carry a status; the labels come from the shared palette. */
function actionIntent(status: string): MoveStatus {
  return status as MoveStatus;
}

export default function VendorOrderDetailClient({ order, currency }: VendorOrderDetailClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<MoveStatus | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const style = getVendorOrderStatusStyle(order.status);
  const StatusIcon = style.icon;
  const parentStyle = getOrderStatusStyle(order.parentStatus);
  const actions = vendorOrderActions(order.status);
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const move = async (status: MoveStatus, note?: string) => {
    if (busy) return;

    if (status === "rejected" && (note || "").trim().length < 5) {
      toast.warning("Tell the store why you cannot fulfil this order (at least 5 characters).");
      return;
    }

    setBusy(status);
    try {
      const res = await updateVendorOrderStatus(order._id, status, note?.trim());
      if (res?.success === false) {
        toast.error(res.message || "The order could not be updated");
        return;
      }
      toast.success(
        status === "rejected"
          ? "Order rejected and the stock is back"
          : status === "ready_for_shipment"
            ? "Marked ready — the store team is asked for a rider"
            : "Order updated"
      );
      setRejecting(false);
      setReason("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setBusy(null);
    }
  };

  const deliveryLine = () => {
    if (order.delivery?.rider) {
      return (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--foreground)]">
            <Bike className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
            {order.delivery.rider.name || "Rider"}
            <span className="rounded-md bg-[var(--surface-alt)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              {order.delivery.status.replace(/_/g, " ")}
            </span>
          </p>
          {order.delivery.rider.phone && (
            <a
              href={`tel:${order.delivery.rider.phone}`}
              className="flex items-center gap-1.5 text-[11px] text-[var(--brand-flat)] hover:underline"
            >
              <Phone className="h-3 w-3" />
              {order.delivery.rider.phone}
            </a>
          )}
          {(order.delivery.rider.vehicleType || order.delivery.rider.vehicleNumber) && (
            <p className="text-[10px] text-[var(--foreground-muted)]">
              {[order.delivery.rider.vehicleType, order.delivery.rider.vehicleNumber]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      );
    }

    if (order.pickupRequestedAt || order.status === "ready_for_shipment") {
      return (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
          Pickup requested{order.pickupRequestedAt ? ` on ${formatOrderMoment(order.pickupRequestedAt)}` : ""}.
          The store team assigns the rider and the order moves to shipped.
        </p>
      );
    }

    return (
      <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
        <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Mark the order ready for shipment and the store team will assign a rider.
      </p>
    );
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/dashboard/vendor/orders"
            className="mb-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3 w-3" />
            All orders
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-mono text-lg font-bold text-[var(--foreground)]">
              {order.orderNumber || "Order"}
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}
            >
              <StatusIcon className="h-3 w-3" />
              {style.label}
            </span>
          </div>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Placed {formatOrderDate(order.placedAt) || "—"} · {units} item{units === 1 ? "" : "s"} ·
            your subtotal {formatPrice(order.subtotal, currency, { showDecimals: false })}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Whole order
          </p>
          <span
            className={`mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${parentStyle.badge}`}
          >
            {parentStyle.label}
          </span>
        </div>
      </header>

      {order.status === "rejected" && order.rejectionReason && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          You rejected these lines: {order.rejectionReason}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-4">
          {/* Lines */}
          <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
            <h2 className="flex items-center gap-1.5 border-b border-[var(--border-color)] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              <Package className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
              Your lines
            </h2>

            <ul className="divide-y divide-[var(--border-color)]">
              {order.items.map((item) => (
                <li key={`${item.productId}-${item.title}`} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-4 w-4 text-[var(--foreground-muted)]" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-[var(--foreground)]">{item.title}</p>
                    <p className="text-[10px] text-[var(--foreground-muted)]">
                      {formatPrice(item.price, currency, { showDecimals: false })} × {item.quantity}
                    </p>
                  </div>

                  <p className="text-xs font-bold text-[var(--foreground)]">
                    {formatPrice(item.price * item.quantity, currency, { showDecimals: false })}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-[var(--border-color)] px-4 py-3">
              <p className="text-[11px] font-semibold text-[var(--foreground-muted)]">
                Your subtotal
              </p>
              <p className="text-sm font-bold text-[var(--foreground)]">
                {formatPrice(order.subtotal, currency, { showDecimals: false })}
              </p>
            </div>
          </section>

          {/* History */}
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
            <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              <Clock className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
              History
            </h2>

            <ol className="mt-3 space-y-2.5">
              {order.history.map((event, index) => {
                const eventStyle = getVendorOrderStatusStyle(event.status);
                const EventIcon = eventStyle.icon;

                return (
                  <li key={`${event.status}-${index}`} className="flex items-start gap-2">
                    <span className={`mt-0.5 rounded-lg p-1 ${eventStyle.badge}`}>
                      <EventIcon className="h-2.5 w-2.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-[var(--foreground)]">
                        {eventStyle.label}
                        <span className="ml-1.5 font-normal text-[var(--foreground-muted)]">
                          {formatOrderMoment(event.at)}
                        </span>
                      </p>
                      {event.note && (
                        <p className="text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                          {event.note}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        <div className="space-y-4">
          {/* Customer */}
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
            <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              <User className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
              Customer
            </h2>

            <p className="mt-2 text-xs font-bold text-[var(--foreground)]">
              {order.customerName || "Customer"}
            </p>
            {order.customerPhone && (
              <a
                href={`tel:${order.customerPhone}`}
                className="flex items-center gap-1.5 text-[11px] text-[var(--brand-flat)] hover:underline"
              >
                <Phone className="h-3 w-3" />
                {order.customerPhone}
              </a>
            )}
            {order.shippingAddress?.address && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {[order.shippingAddress.address, order.shippingAddress.city, order.shippingAddress.postalCode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}

            <p className="mt-2 flex items-center gap-1.5 text-[10px] text-[var(--foreground-muted)]">
              <Wallet className="h-3 w-3" />
              {order.paymentMethod ? order.paymentMethod.replace(/_/g, " ") : "Payment method not set"}
              {order.totalAmount !== null
                ? ` · order total ${formatPrice(order.totalAmount, currency, { showDecimals: false })}`
                : ""}
            </p>
          </section>

          {/* Delivery */}
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
            <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              <Truck className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
              Delivery
            </h2>
            <div className="mt-2">{deliveryLine()}</div>
          </section>

          {/* Actions */}
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
            <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              <CircleCheck className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
              What you can do
            </h2>

            {actions.length === 0 ? (
              <p className="mt-2 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                {order.status === "shipped" || order.status === "delivered"
                  ? "The parcel is with the rider or already delivered. Nothing is waiting on you."
                  : order.status === "rejected"
                    ? "You rejected these lines. The store team settles the customer's money and the stock is back on the shelf."
                    : "This order is closed. Nothing is waiting on you."}
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {actions.map((action) => {
                  const intent = actionIntent(action.status);
                  const isReject = intent === "rejected";

                  return (
                    <button
                      key={action.status}
                      type="button"
                      onClick={() => (isReject ? setRejecting(true) : move(intent))}
                      disabled={Boolean(busy)}
                      className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-opacity disabled:opacity-60 cursor-pointer ${
                        isReject
                          ? "border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
                          : "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                      }`}
                    >
                      {busy === intent && <Loader2 className="h-3 w-3 animate-spin" />}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            )}

            {rejecting && (
              <div className="mt-3 space-y-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
                  Why can&apos;t you fulfil this order?
                </label>
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  placeholder="Out of stock, damaged, or cannot deliver to this area"
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-[11px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
                />
                <p className="text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                  Rejecting puts the lines back in stock and asks the store team to refund the
                  customer.
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => move("rejected", reason)}
                    disabled={Boolean(busy)}
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-[10px] font-bold text-white transition-opacity disabled:opacity-60 cursor-pointer"
                  >
                    {busy === "rejected" && <Loader2 className="h-3 w-3 animate-spin" />}
                    Confirm rejection
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRejecting(false);
                      setReason("");
                    }}
                    className="rounded-lg border border-[var(--border-color)] px-3 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
                  >
                    Keep the order
                  </button>
                </div>
              </div>
            )}

            <p className="mt-3 flex items-center gap-1.5 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              <CreditCard className="h-3 w-3 shrink-0" />
              The customer is charged one order total. The store team settles your share after
              delivery.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
