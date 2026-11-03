"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip, Input, Modal } from "@heroui/react";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  History,
  Inbox,
  Loader2,
  LocateFixed,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  UserCheck,
  Wifi,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import AppSelect from "@/components/shared/AppSelect";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_NEUTRAL_LABELS,
  DELIVERY_STATUS_STYLES,
  formatDistance,
  formatMoment,
} from "@/lib/rider";
import { cancelDeliveryById, expireDeliveriesAction } from "@/lib/action/deliveries";
import AssignRiderModal, { type AssignRiderOrder } from "@/components/dashboard/admin/AssignRiderModal";
import type {
  AdminDeliveryOverview,
  DeliveryPagination,
  DeliveryRecord,
  DeliveryStatus,
} from "@/types/delivery";

/**
 * The store's delivery board.
 *
 * Every row is one parcel, and the only two things the store decides are who
 * carries it and whether it still goes. The rider decides the rest, and the
 * customer's code closes it.
 */

interface AdminDeliveriesClientProps {
  deliveries: DeliveryRecord[];
  pagination: DeliveryPagination;
  overview: AdminDeliveryOverview;
  filters: { status: string; search: string; sort: string; limit: number };
}

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "assigned", label: "Waiting" },
  { key: "active", label: "On the road" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

/** Live statuses mean the store may still cancel or hand the job over. */
const LIVE_STATUSES: DeliveryStatus[] = ["assigned", "accepted", "picked_up", "out_for_delivery"];

export default function AdminDeliveriesClient({
  deliveries,
  pagination,
  overview,
  filters,
}: AdminDeliveriesClientProps) {
  const router = useRouter();
  const { formatPrice } = useSiteSettings();

  const [search, setSearch] = useState(filters.search);
  const [status, setStatus] = useState(filters.status);
  const [sort, setSort] = useState(filters.sort);
  const [limit, setLimit] = useState(String(filters.limit));

  const [detail, setDetail] = useState<DeliveryRecord | null>(null);
  const [assignTarget, setAssignTarget] = useState<AssignRiderOrder | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<DeliveryRecord | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSweeping, setIsSweeping] = useState(false);

  const go = (next: { page?: number; search?: string; status?: string; sort?: string; limit?: string }) => {
    const params = new URLSearchParams();
    const nextSearch = (next.search ?? search).trim();
    const nextStatus = next.status ?? status;
    const nextSort = next.sort ?? sort;
    const nextLimit = next.limit ?? limit;
    const page = next.page ?? 1;

    if (nextSearch) params.set("search", nextSearch);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextSort && nextSort !== "newest") params.set("sort", nextSort);
    if (nextLimit && nextLimit !== "10") params.set("limit", nextLimit);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    router.push(query ? `/dashboard/admin/deliveries?${query}` : "/dashboard/admin/deliveries");
  };

  const openAssign = (delivery: DeliveryRecord) => {
    setAssignTarget({
      _id: delivery.orderId,
      orderNumber: delivery.orderNumber,
      customerName: delivery.customerName,
      city: delivery.city,
      orderStatus: "shipped",
    });
    setDetail(null);
    setIsAssignOpen(true);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      const res = await cancelDeliveryById(cancelTarget._id, cancelReason.trim() || undefined);
      if (res?.success === false) {
        toast.error(res?.message || "The delivery could not be cancelled");
        return;
      }
      toast.success("Delivery cancelled. The rider and the customer were told.");
      setCancelTarget(null);
      setCancelReason("");
      setDetail(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The delivery could not be cancelled");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSweep = async () => {
    setIsSweeping(true);
    try {
      const res = await expireDeliveriesAction();
      const expired = res?.data?.expired;
      toast.success(
        expired ? `Closed ${expired} unanswered request${expired === 1 ? "" : "s"}` : "Nothing to close"
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The sweep failed");
    } finally {
      setIsSweeping(false);
    }
  };

  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);
  const hasFilters = Boolean(search) || status !== "all" || sort !== "newest";

  const stats = [
    {
      label: "Waiting for a rider",
      value: overview.waiting,
      icon: Inbox,
      tone: "text-amber-600 dark:text-amber-400",
      note: "Offers nobody has answered",
    },
    {
      label: "On the road",
      value: overview.onTheRoad,
      icon: Truck,
      tone: "text-[var(--brand-flat)]",
      note: "Out for delivery right now",
    },
    {
      label: "Active jobs",
      value: overview.active,
      icon: Bike,
      tone: "text-sky-600 dark:text-sky-400",
      note: "Accepted, picked up or out",
    },
    {
      label: "Delivered today",
      value: overview.deliveredToday,
      icon: CheckCircle2,
      tone: "text-emerald-600 dark:text-emerald-400",
      note: "Closed with a code",
    },
    {
      label: "Riders online",
      value: overview.onlineRiders,
      icon: Wifi,
      tone: "text-indigo-600 dark:text-indigo-400",
      note: "Available for new jobs",
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary">Deliveries</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Delivery <span className="text-primary">Board</span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Who is carrying what, where it is, and which parcels still need a rider.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onPress={handleSweep}
            isDisabled={isSweeping}
            className="h-9 px-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] text-[11px] font-bold"
          >
            <span className="inline-flex items-center gap-1.5">
              {isSweeping ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Close stale offers
            </span>
          </Button>
          <Link
            href="/dashboard/admin/orders"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-[11px] font-bold shadow-xs"
          >
            <Package className="w-3.5 h-3.5" />
            Orders
          </Link>
        </div>
      </div>

      {/* ── Counters ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                {stat.label}
              </span>
              <stat.icon className={`w-4 h-4 ${stat.tone}`} />
            </div>
            <p className="text-2xl font-extrabold text-[var(--foreground)] mt-1">{stat.value}</p>
            <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">{stat.note}</p>
          </Card>
        ))}
      </div>

      {/* Shipped with nobody carrying it: the one thing that needs a fix. */}
      {overview.shippedWithoutRider > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                {overview.shippedWithoutRider} shipped order
                {overview.shippedWithoutRider === 1 ? "" : "s"} with no rider
              </p>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Open the order and assign a rider so somebody is actually carrying it.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/admin/orders?status=shipped"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl bg-amber-500 text-white text-[11px] font-bold shrink-0"
          >
            Review shipped orders
          </Link>
        </div>
      )}

      {/* ── Filters ── */}
      <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => {
            const isActive = status === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setStatus(tab.key);
                  go({ status: tab.key, page: 1 });
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-xs font-bold"
                    : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border-color)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col lg:flex-row gap-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              go({ search, page: 1 });
            }}
            className="flex-1 flex items-center gap-2 bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl px-3 py-2"
          >
            <Search className="w-4 h-4 text-[var(--foreground-muted)] shrink-0" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order, customer, phone or city"
              className="w-full bg-transparent outline-none text-xs text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]"
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  go({ search: "", page: 1 });
                }}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <AppSelect
              size="sm"
              ariaLabel="Sort deliveries"
              icon={<SlidersHorizontal />}
              value={sort}
              onChange={(next) => {
                setSort(next);
                go({ sort: next, page: 1 });
              }}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "fee_desc", label: "Highest fee" },
              ]}
            />

            <AppSelect
              size="sm"
              ariaLabel="Rows per page"
              value={limit}
              onChange={(next) => {
                setLimit(next);
                go({ limit: next, page: 1 });
              }}
              options={[
                { value: "10", label: "10 rows" },
                { value: "20", label: "20 rows" },
                { value: "50", label: "50 rows" },
              ]}
            />

            {hasFilters && (
              <Button
                size="sm"
                onPress={() => {
                  setSearch("");
                  setStatus("all");
                  setSort("newest");
                  setLimit("10");
                  router.push("/dashboard/admin/deliveries");
                }}
                className="h-9 text-[11px] font-bold rounded-xl bg-[var(--surface-alt)] text-[var(--foreground)] border border-[var(--border-color)]"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ── Rows ── */}
      <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl shadow-xs overflow-hidden">
        {deliveries.length === 0 ? (
          <div className="p-10 flex flex-col items-center text-center gap-3">
            <Inbox className="w-10 h-10 text-[var(--foreground-muted)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">No deliveries here</p>
            <p className="text-xs text-[var(--foreground-muted)] max-w-md">
              Assign a rider from an order to start a delivery. Every parcel gets one row here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-alt)] text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3 font-bold">Order</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Rider</th>
                  <th className="px-4 py-3 font-bold">Drop-off</th>
                  <th className="px-4 py-3 font-bold">Fee</th>
                  <th className="px-4 py-3 font-bold">Stage</th>
                  <th className="px-5 py-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {deliveries.map((delivery) => {
                  const live = LIVE_STATUSES.includes(delivery.status);
                  return (
                    <tr key={delivery._id} className="hover:bg-[var(--surface-alt)]/60 transition-colors align-top">
                      <td className="px-5 py-4 font-bold text-[var(--foreground)] whitespace-nowrap">
                        <button
                          onClick={() => setDetail(delivery)}
                          className="hover:text-primary transition-colors cursor-pointer"
                        >
                          {delivery.orderNumber}
                        </button>
                        <span className="block text-[10px] font-medium text-[var(--foreground-muted)]">
                          {delivery.items} item{delivery.items === 1 ? "" : "s"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-[var(--foreground)]">
                        <span className="font-semibold">{delivery.customerName || "Customer"}</span>
                        <span className="block text-[10px] text-[var(--foreground-muted)]">
                          {delivery.customerPhone || "No phone"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        {delivery.rider ? (
                          <span className="block">
                            <span className="font-semibold text-[var(--foreground)]">
                              {delivery.rider.name}
                            </span>
                            <span className="block text-[10px] text-[var(--foreground-muted)]">
                              {delivery.rider.vehicleNumber || delivery.rider.vehicleType || delivery.rider.phone}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <UserCheck className="w-3 h-3" />
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-[var(--foreground-muted)] max-w-[200px]">
                        <span className="inline-flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>
                            {delivery.address || "Address not recorded"}
                            {delivery.city && (
                              <span className="block text-[10px] font-semibold text-[var(--foreground)]">
                                {delivery.city}
                                {delivery.distanceKm ? ` · ${formatDistance(delivery.distanceKm)}` : ""}
                              </span>
                            )}
                          </span>
                        </span>
                      </td>

                      <td className="px-4 py-4 font-bold text-[var(--foreground)] whitespace-nowrap">
                        {formatPrice(delivery.fee)}
                        <span className="block text-[10px] font-medium text-[var(--foreground-muted)]">
                          order {formatPrice(delivery.orderTotal)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <Chip
                          size="sm"
                          className={`border text-[10px] font-bold ${DELIVERY_STATUS_STYLES[delivery.status]}`}
                        >
                          {DELIVERY_STATUS_NEUTRAL_LABELS[delivery.status]}
                        </Chip>
                        <span className="block text-[10px] text-[var(--foreground-muted)] mt-1">
                          {formatMoment(delivery.updatedAt)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/track-order/${delivery.orderId}`}
                            title="Track this delivery"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground-muted)] hover:text-primary transition-colors"
                          >
                            <LocateFixed className="w-3.5 h-3.5" />
                          </Link>
                          {live && (
                            <>
                              <Button
                                size="sm"
                                onPress={() => openAssign(delivery)}
                                aria-label="Assign or hand over"
                                className="h-8 min-w-8 px-0 rounded-lg bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)]"
                              >
                                <Truck className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                onPress={() => {
                                  setCancelReason("");
                                  setCancelTarget(delivery);
                                }}
                                aria-label="Cancel this delivery"
                                className="h-8 min-w-8 px-0 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pager ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-[var(--border-color)] bg-[var(--surface-alt)]/40">
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Showing <span className="font-bold text-[var(--foreground)]">{from}</span>–
            <span className="font-bold text-[var(--foreground)]">{to}</span> of{" "}
            <span className="font-bold text-[var(--foreground)]">{pagination.total}</span> deliveries
          </p>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              isDisabled={pagination.page <= 1}
              onPress={() => go({ page: pagination.page - 1 })}
              className="h-8 text-[11px] font-bold rounded-lg bg-[var(--surface)] border border-[var(--border-color)] text-[var(--foreground)]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <span className="text-[11px] font-bold text-[var(--foreground-muted)] px-1">
              {pagination.page} / {Math.max(1, pagination.totalPages)}
            </span>
            <Button
              size="sm"
              isDisabled={pagination.page >= pagination.totalPages}
              onPress={() => go({ page: pagination.page + 1 })}
              className="h-8 text-[11px] font-bold rounded-lg bg-[var(--surface)] border border-[var(--border-color)] text-[var(--foreground)]"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ── One delivery, with its history ── */}
      <Modal isOpen={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto text-[var(--foreground)]">
              {detail && (
                <>
                  <Modal.Header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Modal.Heading className="text-base font-extrabold text-[var(--foreground)]">
                          {detail.orderNumber}
                        </Modal.Heading>
                        <Chip
                          size="sm"
                          className={`border text-[10px] font-bold ${DELIVERY_STATUS_STYLES[detail.status]}`}
                        >
                          {DELIVERY_STATUS_NEUTRAL_LABELS[detail.status]}
                        </Chip>
                      </div>
                      <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                        Assigned {formatMoment(detail.createdAt)}
                        {detail.deliveredAt ? ` · Delivered ${formatMoment(detail.deliveredAt)}` : ""}
                      </p>
                    </div>
                    <Modal.CloseTrigger className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer p-1 rounded-lg self-end sm:self-auto">
                      ✕
                    </Modal.CloseTrigger>
                  </Modal.Header>

                  <Modal.Body className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                          Customer
                        </p>
                        <p className="text-xs font-bold text-[var(--foreground)] mt-1">
                          {detail.customerName || "Customer"}
                        </p>
                        {detail.customerPhone && (
                          <a
                            href={`tel:${detail.customerPhone}`}
                            className="inline-flex items-center gap-1 text-[11px] text-primary font-semibold mt-0.5"
                          >
                            <Phone className="w-3 h-3" />
                            {detail.customerPhone}
                          </a>
                        )}
                        <p className="text-[11px] text-[var(--foreground-muted)] mt-1 flex items-start gap-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          {[detail.address, detail.city].filter(Boolean).join(", ") || "No address"}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                          Rider
                        </p>
                        {detail.rider ? (
                          <>
                            <p className="text-xs font-bold text-[var(--foreground)] mt-1">
                              {detail.rider.name}
                            </p>
                            <p className="text-[11px] text-[var(--foreground-muted)]">
                              {[detail.rider.vehicleType, detail.rider.vehicleNumber]
                                .filter(Boolean)
                                .join(" · ") || "No vehicle on file"}
                            </p>
                          </>
                        ) : (
                          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-1">
                            No rider assigned
                          </p>
                        )}
                        <p className="text-[11px] font-bold text-[var(--foreground)] mt-2">
                          Fee {formatPrice(detail.fee)}
                          <span className="font-medium text-[var(--foreground-muted)]">
                            {" "}
                            · order {formatPrice(detail.orderTotal)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {detail.declineReason && (
                      <div className="p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                          Reason on record
                        </p>
                        <p className="text-[11px] text-rose-900 dark:text-rose-200 mt-1">
                          {detail.declineReason}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        History
                      </p>
                      {detail.history.length === 0 ? (
                        <p className="text-[11px] text-[var(--foreground-muted)]">
                          This delivery has not moved yet.
                        </p>
                      ) : (
                        <ol className="space-y-2">
                          {detail.history.map((event, index) => (
                            <li
                              key={`${event.status}-${index}`}
                              className="flex items-start gap-2.5 text-[11px]"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-flat)] mt-1.5 shrink-0" />
                              <div className="min-w-0">
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
                  </Modal.Body>

                  <Modal.Footer className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-[var(--border-color)]">
                    <Link
                      href={`/track-order/${detail.orderId}`}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] text-[11px] font-bold"
                    >
                      <LocateFixed className="w-3.5 h-3.5" />
                      Live tracking
                    </Link>

                    <div className="flex items-center gap-2">
                      {LIVE_STATUSES.includes(detail.status) && (
                        <>
                          <Button
                            size="sm"
                            onPress={() => {
                              setCancelReason("");
                              setCancelTarget(detail);
                            }}
                            className="h-9 px-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-[11px] font-bold"
                          >
                            Cancel delivery
                          </Button>
                          <Button
                            size="sm"
                            onPress={() => openAssign(detail)}
                            className="h-9 px-3 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-[11px] font-bold"
                          >
                            {detail.rider ? "Hand over" : "Assign a rider"}
                          </Button>
                        </>
                      )}
                      {!LIVE_STATUSES.includes(detail.status) && (
                        <Button
                          size="sm"
                          onPress={() => setDetail(null)}
                          className="h-9 px-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] text-[11px] font-bold"
                        >
                          Close
                        </Button>
                      )}
                    </div>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ── Cancelling: the reason reaches the rider ── */}
      <Modal isOpen={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
              {cancelTarget && (
                <>
                  <Modal.Header className="space-y-1">
                    <Modal.Heading className="text-base font-extrabold text-[var(--foreground)]">
                      Cancel {cancelTarget.orderNumber}?
                    </Modal.Heading>
                    <p className="text-[11px] text-[var(--foreground-muted)]">
                      The rider is told why, and the customer is told a new delivery is coming.
                      The order itself is left alone.
                    </p>
                  </Modal.Header>

                  <Modal.Body className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                      Reason
                    </label>
                    <Input
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Store closed, customer unreachable…"
                      className="h-10 bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl text-xs font-semibold text-[var(--foreground)]"
                    />
                  </Modal.Body>

                  <Modal.Footer className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      onPress={() => setCancelTarget(null)}
                      className="h-9 px-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] text-[11px] font-bold"
                    >
                      Keep it
                    </Button>
                    <Button
                      size="sm"
                      onPress={handleCancel}
                      isDisabled={isCancelling}
                      className="h-9 px-4 rounded-xl bg-rose-600 text-white text-[11px] font-bold disabled:opacity-60"
                    >
                      {isCancelling ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Cancelling
                        </span>
                      ) : (
                        "Cancel delivery"
                      )}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ── Rider picker ── */}
      <AssignRiderModal
        isOpen={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        order={assignTarget}
        onAssigned={() => {
          setAssignTarget(null);
          router.refresh();
        }}
      />
    </div>
  );
}
