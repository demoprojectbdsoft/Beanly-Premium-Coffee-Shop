"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Input,
  Button,
  Select,
  ListBox,
  Modal,
  Pagination,
} from "@heroui/react";
import {
  ShoppingBag,
  Package,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  User as UserIcon,
  MapPin,
  CreditCard,
  Mail,
  Phone,
  ArrowUpDown,
  RotateCcw,
  AlertTriangle,
  Truck,
} from "lucide-react";
import { toast } from "react-toastify";
import { Order } from "@/types";
import type { DeliveryRecord } from "@/types/delivery";
import { updateOrderStatus } from "@/lib/action/orders";
import { getOrderStatusStyle } from "@/lib/orderStatusStyles";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import AssignRiderModal from "@/components/dashboard/admin/AssignRiderModal";
import { formatOrderDate, formatOrderDateTime } from "@/lib/dateTime";
import { useSiteSettings } from "@/context/SiteSettingsContext";

const STATUS_OPTIONS = [
  { id: "confirmed",  label: "Confirmed" },
  { id: "processing", label: "Processing" },
  { id: "shipped",    label: "Shipped" },
  { id: "delivered",  label: "Delivered" },
  { id: "cancelled",  label: "Cancelled" },
];

/**
 * The stages an order is allowed to move to next.
 * The backend enforces the same rules, this map only hides illegal choices.
 *
 * Both ends of the story are closed. A cancelled order has been refunded, and a
 * delivered one changed hands — what happens after that is a refund or a
 * warranty claim, not a status that rewrites the sale.
 */
const ORDER_FLOW: Record<string, string[]> = {
  confirmed:  ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped:    ["delivered", "cancelled"],
  delivered:  [],
  cancelled:  [],
};

const FILTER_TABS = ["All", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "total_desc", label: "Total: High to Low" },
  { key: "total_asc", label: "Total: Low to High" },
];

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface OrdersClientProps {
  initialOrders: Order[];
  pagination: PaginationMeta;
}

export default function OrdersClient({
  initialOrders = [],
  pagination,
}: OrdersClientProps) {
  const { formatPrice } = useSiteSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [orders, setOrders] = useState<Order[]>(initialOrders);

  useEffect(() => {
    setOrders(Array.isArray(initialOrders) ? initialOrders : []);
  }, [initialOrders]);

  const currentTab = searchParams.get("status")
    ? (searchParams.get("status")!.charAt(0).toUpperCase() + searchParams.get("status")!.slice(1).toLowerCase())
    : "All";
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "newest";

  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  // Update URL params helper
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (val === undefined || val === "" || (key === "status" && val.toLowerCase() === "all")) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });

      if (!("page" in updates)) {
        params.delete("page");
      }

      const qs = params.toString();
      startTransition(() => {
        router.push(`/dashboard/admin/orders${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateParams({ search: searchInput.trim() });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    startTransition(() => {
      router.push("/dashboard/admin/orders", { scroll: false });
    });
  };

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Shipping is a rider decision now: choosing "shipped" opens the picker, and
  // the order only leaves the store once a rider has the job.
  const [assignOrder, setAssignOrder] = useState<Order | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  const openAssignPicker = (order: Order) => {
    setAssignOrder(order);
    setIsAssignOpen(true);
  };

  const handleAssigned = (orderId: string, job?: DeliveryRecord | null) => {
    // The rider now answers for the parcel, so the row needs its claim straight
    // away: the backend sends it with the next page load, and until then the
    // local copy keeps the status dropdown locked in this open modal.
    const claim: Order["delivery"] = {
      _id: job ? String(job._id) : "",
      status: job?.status || "assigned",
      fee: job?.fee ?? 0,
      expiresAt: job?.expiresAt ?? null,
      holds: true,
      rider: job?.rider ? { name: job.rider.name } : null,
    };
    setOrders((prev) =>
      prev.map((o) =>
        (o._id || o.id) === orderId
          ? { ...o, orderStatus: "shipped" as Order["orderStatus"], status: "shipped" as Order["status"], delivery: claim }
          : o
      )
    );
    setSelectedOrder((prev) =>
      prev && (prev._id || prev.id) === orderId
        ? { ...prev, orderStatus: "shipped" as Order["orderStatus"], status: "shipped" as Order["status"], delivery: claim }
        : prev
    );
    router.refresh();
  };

  // Status badge - colour and icon come from the shared status palette, so a
  // shipped order is never brand-blue text on an amber pill again.
  const getStatusBadge = (status?: string) => <OrderStatusBadge status={status} size="sm" />;

  // Open Details Modal
  const handleOpenDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  // Update Status
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedOrder || !newStatus) return;

    // The dropdown only offers legal moves and the backend checks them again.
    const orderId = selectedOrder._id || selectedOrder.id;
    if (!orderId) return;

    // "Shipped" without a rider is a parcel nobody is carrying, so that choice
    // hands over to the picker instead of calling the status endpoint.
    if (newStatus === "shipped") {
      openAssignPicker(selectedOrder);
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res?.success !== false) {
        toast.success(`Order status updated to "${newStatus}"`);
        setOrders((prev) =>
          prev.map((o) =>
            (o._id || o.id) === orderId
              ? { ...o, orderStatus: newStatus as any, status: newStatus as any }
              : o
          )
        );
        setSelectedOrder((prev) =>
          prev ? { ...prev, orderStatus: newStatus as any, status: newStatus as any } : prev
        );
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to update order status");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error updating order status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const { page, limit, total, totalPages } = pagination || {
    page: 1,
    limit: 10,
    total: orders.length,
    totalPages: 1,
  };
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);

  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary">Orders</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Customer{" "}
            <span className="text-primary">
              Orders
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Track and process fulfillment, inspect line items, verify shipping and update statuses.
          </p>
        </div>

        <div className="text-xs font-semibold text-[var(--foreground-muted)]">
          Total orders: <span className="font-extrabold text-[var(--foreground)]">{total}</span>
        </div>
      </div>

      {/* ── Toolbar: Tabs, Search & Sort ── */}
      <div className="space-y-4 bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border-color)] shadow-xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {FILTER_TABS.map((tab) => {
            const isActive = currentTab.toLowerCase() === tab.toLowerCase();
            return (
              <button
                key={tab}
                onClick={() => updateParams({ status: tab === "All" ? undefined : tab.toLowerCase() })}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-xs font-bold"
                    : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)]/80 hover:text-[var(--foreground)] border border-[var(--border-color)]"
                }`}
              >
                <span>{tab}</span>
              </button>
            );
          })}
        </div>

        {/* Search, Sort & Reset Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] z-10" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by Order ID, name, city, payment..."
                className="w-full pl-9 pr-4 h-10 bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--foreground)]"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs cursor-pointer shrink-0"
            >
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Sort Select */}
            <div className="w-48">
              <Select
                aria-label="Sort Orders"
                selectedKey={currentSort}
                onSelectionChange={(key) => updateParams({ sort: key ? String(key) : "newest" })}
              >
                <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-semibold text-[var(--foreground-secondary)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                  <Select.Value className="text-xs font-semibold truncate" />
                  <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[var(--foreground-muted)] shrink-0" />
                </Select.Trigger>
                <Select.Popover className="w-52 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50">
                  <ListBox>
                    {SORT_OPTIONS.map((opt) => (
                      <ListBox.Item
                        key={opt.key}
                        id={opt.key}
                        textValue={opt.label}
                        className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10 dark:hover:bg-[var(--surface)] text-[var(--foreground)] cursor-pointer flex items-center justify-between"
                      >
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {(currentSearch || currentTab !== "All" || currentSort !== "newest") && (
              <Button
                size="sm"
                onPress={handleResetFilters}
                className="h-10 px-3 rounded-xl bg-[var(--surface-alt)] text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:hover:text-[var(--foreground)] text-xs font-semibold cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Orders Table ── */}
      {isPending ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[var(--foreground-muted)]">Loading orders...</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              No orders found
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              {currentSearch
                ? "No orders matched your search query."
                : `There are currently no ${currentTab !== "All" ? currentTab.toLowerCase() : ""} orders.`}
            </p>
          </div>
          {(currentSearch || currentTab !== "All") && (
            <Button
              onPress={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--surface-alt)]/80 dark:bg-[var(--surface-alt)]/40 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4 text-center">Items</th>
                  <th className="py-3.5 px-4">Total</th>
                  <th className="py-3.5 px-4">Payment</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 text-xs">
                {orders.map((order) => {
                  const id = order._id || order.id || "";
                  const shortId = id ? `#${id.slice(-8).toUpperCase()}` : "#ORDER";
                  const customerName =
                    (typeof order.userId === "object" ? order.userId?.name : "") ||
                    order.shippingAddress?.fullName ||
                    "Customer";
                  const customerEmail =
                    typeof order.userId === "object"
                      ? order.userId?.email || ""
                      : "";
                  const itemsCount = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || order.items?.length || 0;
                  const dateStr = formatOrderDate(order.createdAt) || "Recent";

                  return (
                    <tr
                      key={id}
                      onClick={() => handleOpenDetail(order)}
                      className="hover:bg-[var(--surface-alt)]/80 dark:hover:bg-[var(--surface)]/40 transition-colors cursor-pointer group"
                    >
                      {/* Order ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                        {shortId}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--surface-alt)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[11px] text-[var(--foreground)] shrink-0">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 max-w-[160px]">
                            <p className="font-bold text-[var(--foreground)] truncate">
                              {customerName}
                            </p>
                            {customerEmail && (
                              <p className="text-[11px] text-[var(--foreground-muted)] truncate">
                                {customerEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-semibold text-[var(--foreground)]">
                          {itemsCount} {itemsCount === 1 ? "item" : "items"}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-[var(--foreground)]">
                        {formatPrice(order.totalAmount)}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[var(--surface-alt)] text-[var(--foreground)] text-[11px] font-semibold uppercase">
                          <CreditCard className="w-3 h-3 text-primary" />
                          {order.paymentMethod}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {getStatusBadge(order.orderStatus || order.status)}
                          {order.customerResponse ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                order.customerResponse === "received"
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40"
                                  : order.customerResponse === "not_received"
                                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40"
                                  : "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40"
                              }`}
                            >
                              {order.customerResponse === "received" && "✓ Received"}
                              {order.customerResponse === "not_received" && "⚠ Not Received"}
                              {order.customerResponse === "cancelled" && "✕ Cancelled"}
                            </span>
                          ) : (
                            /*
                              Nothing is awaited from the customer any more, so an
                              unreported order says who is carrying it instead —
                              that is what limits what the store can still do.
                            */
                            order.delivery?.holds && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--surface-alt)] text-[var(--foreground-muted)] dark:bg-[var(--surface)] dark:text-[var(--foreground-muted)] border border-[var(--border-color)]/60 dark:border-[var(--border-color)]">
                                <Truck className="w-2.5 h-2.5" />
                                {order.delivery.rider?.name
                                  ? `With ${order.delivery.rider.name}`
                                  : "With a rider"}
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[var(--foreground-muted)] whitespace-nowrap text-[11px]">
                        {dateStr}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onPress={() => handleOpenDetail(order)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 dark:hover:bg-[var(--accent)]/10 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-alt)]/40 dark:bg-[var(--surface-elevated)]/40">
              <Pagination className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--foreground-muted)]">
                <Pagination.Summary className="text-xs">
                  Showing <span className="text-[var(--foreground)] font-bold">{startItem}–{endItem}</span> of{" "}
                  <span className="text-primary font-bold">{total}</span> orders
                </Pagination.Summary>

                <Pagination.Content className="flex items-center gap-1">
                  <Pagination.Item>
                    <Pagination.Previous
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-primary/10 dark:hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      isDisabled={page === 1 || isPending}
                      onPress={() => updateParams({ page: String(page - 1) })}
                    >
                      <Pagination.PreviousIcon />
                      <span>Prev</span>
                    </Pagination.Previous>
                  </Pagination.Item>

                  {getPageNumbers().map((p, i) =>
                    p === "ellipsis" ? (
                      <Pagination.Item key={`ellipsis-${i}`}>
                        <Pagination.Ellipsis className="px-2 text-[var(--foreground-muted)] select-none text-xs" />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={p}>
                        <Pagination.Link
                          isActive={p === page}
                          isDisabled={isPending}
                          onPress={() => updateParams({ page: String(p) })}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            p === page
                              ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm shadow-primary/30"
                              : "hover:bg-primary/10 dark:hover:bg-[var(--surface)] text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)]"
                          }`}
                        >
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    )
                  )}

                  <Pagination.Item>
                    <Pagination.Next
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-primary/10 dark:hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      isDisabled={page === totalPages || isPending}
                      onPress={() => updateParams({ page: String(page + 1) })}
                    >
                      <span>Next</span>
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </div>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════
          ORDER DETAIL MODAL (HeroUI v3 Modal)
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto text-[var(--foreground)]">
              {selectedOrder && (
                <>
                  {/* Modal Header */}
                  <Modal.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Modal.Heading className="text-base font-extrabold text-[var(--foreground)]">
                          Order Details: #{selectedOrder._id?.slice(-8).toUpperCase()}
                        </Modal.Heading>
                        {getStatusBadge(selectedOrder.orderStatus || selectedOrder.status)}
                      </div>
                      <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                        Placed on{" "}
                        {formatOrderDateTime(selectedOrder.createdAt) || "N/A"}
                      </p>
                    </div>

                    <Modal.CloseTrigger className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer p-1 rounded-lg self-end sm:self-auto">
                      ✕
                    </Modal.CloseTrigger>
                  </Modal.Header>

                  <Modal.Body className="space-y-6">
                    {/* Status Changer Bar */}
                    {(() => {
                      const currentStatus = (
                        selectedOrder.orderStatus ||
                        selectedOrder.status ||
                        "confirmed"
                      ).toLowerCase();
                      const allowedNext = ORDER_FLOW[currentStatus] ?? [];

                      // A cancelled order is closed: there is nothing to move to.
                      // So is a delivered one — the parcel changed hands and the
                      // sale is finished, whatever the customer reports after it.
                      if (allowedNext.length === 0) {
                        const delivered = currentStatus === "delivered";
                        return (
                          <div className="p-4 bg-[var(--surface-alt)] rounded-2xl border border-[var(--border-color)] flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                delivered
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : "bg-rose-500/10 text-rose-500"
                              }`}
                            >
                              {delivered ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[var(--foreground)]">
                                This order is closed
                              </p>
                              <p className="text-[11px] text-[var(--foreground-muted)]">
                                {delivered
                                  ? "The parcel was handed over and the sale is settled, so the rider's fee is booked. Refund the order or handle a warranty claim instead of rewriting the delivery."
                                  : "A cancelled order keeps its final status."}
                              </p>
                            </div>
                          </div>
                        );
                      }

                      const isShipped = currentStatus === "shipped";
                      /*
                        A rider holding the job owns the parcel, so the store can
                        neither mark it delivered (it is not carrying it) nor cancel
                        it under the rider. An offer that expired unanswered is not
                        a hold: the backend already counts that one dead.
                      */
                      const riderHolds = Boolean(selectedOrder.delivery?.holds);
                      // "assigned" is the offer, not the job: the rider has still
                      // to say whether they are taking it.
                      const claimOffered =
                        (selectedOrder.delivery?.status || "").toLowerCase() ===
                        "assigned";
                      // The customer asked for this to be called off. Honouring it
                      // stands the rider down, so it stays the store's decision.
                      const cancelRequested =
                        selectedOrder.customerResponse === "cancelled";
                      // The customer says the parcel never reached them, which
                      // rules out closing the order as delivered from here. The
                      // rider can still deliver it with the code at the door.
                      const customerDisagrees =
                        selectedOrder.customerResponse === "not_received" ||
                        cancelRequested;
                      /*
                        The customer says it arrived. That answer now settles the
                        sale on the server, so an order carrying it is delivered
                        and the rider has been paid: cancelling it from here would
                        undo money that has already moved.
                      */
                      const customerConfirmed =
                        selectedOrder.customerResponse === "received";

                      const canDeliver = !riderHolds && !customerDisagrees;
                      const canCancel = (!riderHolds || cancelRequested) && !customerConfirmed;

                      // The current stage plus the stages it may move to.
                      const visibleOptions = STATUS_OPTIONS.filter(
                        (opt) => opt.id === currentStatus || allowedNext.includes(opt.id)
                      );

                      const disabledKeys: string[] = [currentStatus];
                      if (!canDeliver) disabledKeys.push("delivered");
                      if (!canCancel) disabledKeys.push("cancelled");

                      const lockReason = (id: string) => {
                        if (id === currentStatus) return "(Current)";
                        if (id === "delivered" && riderHolds) return "(Rider carries it)";
                        if (id === "delivered" && customerDisagrees) return "(Customer disagreed)";
                        if (id === "cancelled" && riderHolds) return "(Rider assigned)";
                        if (id === "cancelled" && customerConfirmed) return "(Customer confirmed)";
                        return null;
                      };

                      /*
                        The one line the rider panel needs. It answers "why can't I
                        pick this stage?" in the order the store actually asks it,
                        so a panel never tells somebody to stand down a rider who
                        was never on the job.
                      */
                      const riderNote =
                        riderHolds && cancelRequested
                          ? "The customer asked to cancel. Cancelling it here refunds them and stands the rider down."
                          : claimOffered
                            ? "The offer is with the rider until they answer or it lapses. Cancel the delivery from the deliveries page to take the order back."
                            : riderHolds
                              ? "The rider closes this order with the customer's delivery code, so Delivered stays with them. The store cannot cancel the order over a rider who holds the job — close it on the deliveries page first."
                              : "Nobody is carrying it yet. Assign a rider, and only they can close it with the customer's code at the door.";

                      return (
                        <div className="space-y-3">
                          <div className="p-4 bg-[var(--surface-alt)] rounded-2xl border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-[var(--foreground)]">
                                Update Fulfillment Status
                              </p>
                              <p className="text-[11px] text-[var(--foreground-muted)]">
                                Only the next valid stage is offered
                              </p>
                            </div>

                            <div className="w-56 shrink-0">
                              <Select
                                aria-label="Update Fulfillment Status"
                                selectedKey={currentStatus}
                                onSelectionChange={(key) => key && handleStatusChange(String(key))}
                                isDisabled={isUpdatingStatus}
                                disabledKeys={disabledKeys}
                                placeholder="Select Status"
                              >
                                <Select.Trigger className="w-full h-10 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--foreground)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${getOrderStatusStyle(currentStatus).dot}`} />
                                  <Select.Value className="text-xs font-semibold truncate capitalize" />
                                  <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[var(--foreground-muted)] shrink-0" />
                                </Select.Trigger>
                                <Select.Popover className="w-56 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50">
                                  <ListBox disabledKeys={disabledKeys}>
                                    {visibleOptions.map((opt) => {
                                      const reason = lockReason(opt.id);
                                      return (
                                        <ListBox.Item
                                          key={opt.id}
                                          id={opt.id}
                                          textValue={opt.label}
                                          isDisabled={Boolean(reason)}
                                          className={`text-xs font-medium px-3 py-2 rounded-lg flex items-center justify-between ${
                                            reason
                                              ? "opacity-45 cursor-not-allowed bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
                                              : "hover:bg-primary/10 dark:hover:bg-[var(--surface)] text-[var(--foreground)] cursor-pointer"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span
                                              className={`w-2 h-2 rounded-full shrink-0 ${getOrderStatusStyle(opt.id).dot}`}
                                            />
                                            <span>{opt.label}</span>
                                            {reason && (
                                              <span className="text-[10px] text-amber-500 font-bold">
                                                {reason}
                                              </span>
                                            )}
                                          </div>
                                          <ListBox.ItemIndicator />
                                        </ListBox.Item>
                                      );
                                    })}
                                  </ListBox>
                                </Select.Popover>
                              </Select>
                            </div>
                          </div>

                          {/* One rider panel tells the whole last-mile story: who
                              is carrying the parcel, and therefore which stages
                              are still the store's to decide. */}
                          {(isShipped || riderHolds) && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-color)]">
                              <div className="flex items-start gap-2.5">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    riderHolds
                                      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                      : "bg-[var(--brand-flat)]/10 text-[var(--brand-flat)]"
                                  }`}
                                >
                                  <Truck className="w-4 h-4" />
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[11px] font-bold text-[var(--foreground)]">
                                    {riderHolds
                                      ? claimOffered
                                        ? "Waiting on the rider's answer"
                                        : selectedOrder.delivery?.rider?.name
                                          ? `${selectedOrder.delivery.rider.name} is carrying this delivery`
                                          : "A rider is carrying this delivery"
                                      : "No rider on this job yet"}
                                  </p>
                                  <p className="text-[11px] text-[var(--foreground-muted)]">
                                    {riderNote}
                                  </p>
                                  {riderHolds && (
                                    <Link
                                      href="/dashboard/admin/deliveries"
                                      className="inline-block text-[11px] font-bold text-primary hover:underline"
                                    >
                                      Open deliveries
                                    </Link>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onPress={() => openAssignPicker(selectedOrder)}
                                className="h-9 px-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] text-[11px] font-bold shrink-0"
                              >
                                Assign or hand over
                              </Button>
                            </div>
                          )}

                          {selectedOrder.customerResponse && (
                            <div
                              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
                                selectedOrder.customerResponse === "received"
                                  ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200"
                                  : selectedOrder.customerResponse === "not_received"
                                  ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200"
                                  : "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                    selectedOrder.customerResponse === "received"
                                      ? "bg-emerald-500 text-white"
                                      : selectedOrder.customerResponse === "not_received"
                                      ? "bg-amber-500 text-white"
                                      : "bg-rose-500 text-white"
                                  }`}
                                >
                                  {selectedOrder.customerResponse === "received" && (
                                    <CheckCircle2 className="w-4 h-4" />
                                  )}
                                  {selectedOrder.customerResponse === "not_received" && (
                                    <AlertTriangle className="w-4 h-4" />
                                  )}
                                  {selectedOrder.customerResponse === "cancelled" && (
                                    <XCircle className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-extrabold text-xs">
                                      Customer Response:{" "}
                                      {selectedOrder.customerResponse === "received"
                                        ? "Order Received"
                                        : selectedOrder.customerResponse === "not_received"
                                        ? "Order Not Received"
                                        : "Order Cancelled / Rejected"}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--surface-elevated)]/70 dark:bg-[var(--surface)]/70 border border-current">
                                      {selectedOrder.customerResponse === "received"
                                        ? "Delivered · rider paid"
                                        : selectedOrder.customerResponse === "not_received"
                                          ? "Delivered is blocked"
                                          : "Cancellation requested"}
                                    </span>
                                  </div>
                                  {selectedOrder.customerResponseNote && (
                                    <p className="text-[11px] text-[var(--foreground)] italic">
                                      "{selectedOrder.customerResponseNote}"
                                    </p>
                                  )}
                                  {selectedOrder.customerResponseAt && (
                                    <p className="text-[10px] text-[var(--foreground-muted)]">
                                      Submitted:{" "}
                                      {formatOrderDateTime(selectedOrder.customerResponseAt)}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Order Items List */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-muted)] flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Ordered Items (
                        {selectedOrder.items?.length || 0})
                      </h3>

                      <div className="border border-[var(--border-color)] rounded-2xl overflow-hidden divide-y divide-[var(--border-color)]">
                        {selectedOrder.items?.map((item: any, idx: number) => {
                          const productTitle =
                            item.title ||
                            (typeof item.productId === "object" ? item.productId?.title : "") ||
                            "Product";
                          const productImage =
                            item.image ||
                            (typeof item.productId === "object" ? item.productId?.image : "") ||
                            "";
                          const unitPrice = item.price || 0;
                          const qty = item.quantity || 1;
                          const lineTotal = unitPrice * qty;

                          return (
                            <div
                              key={idx}
                              className="p-3.5 flex items-center justify-between gap-4 bg-[var(--surface-elevated)]"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative w-12 h-12 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-center shrink-0 overflow-hidden">
                                  {productImage ? (
                                    <Image
                                      src={productImage}
                                      alt={productTitle}
                                      fill
                                      sizes="48px"
                                      className="object-cover"
                                      unoptimized
                                    />
                                  ) : (
                                    <Package className="w-5 h-5 text-[var(--foreground-muted)]" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-[var(--foreground)] text-xs sm:text-sm truncate">
                                    {productTitle}
                                  </p>
                                  <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                                    Qty: {qty} × {formatPrice(unitPrice)}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-extrabold text-[var(--foreground)] text-xs sm:text-sm">
                                  {formatPrice(lineTotal)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pricing Calculation Summary */}
                      <div className="p-4 bg-[var(--surface-alt)] rounded-2xl border border-[var(--border-color)]/60 space-y-2 text-xs">
                        <div className="flex justify-between text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)]">
                          <span>Subtotal</span>
                          <span className="font-semibold">
                            {formatPrice(selectedOrder.subtotal ?? (selectedOrder.totalAmount - (selectedOrder.shippingFee || 0)))}
                          </span>
                        </div>
                        {/* The code comes off the subtotal and the points cover what
                            it left, so both are read before the fee — the same order
                            the total was worked out in. */}
                        {Boolean(selectedOrder.couponDiscount) && (
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                            <span>
                              Discount Code
                              {selectedOrder.couponCode ? ` · ${selectedOrder.couponCode}` : ""}
                            </span>
                            <span className="font-semibold">
                              -{formatPrice(selectedOrder.couponDiscount || 0)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)]">
                          <span>Shipping Fee</span>
                          <span className="font-semibold">
                            {formatPrice(selectedOrder.shippingFee || 0)}
                          </span>
                        </div>
                        {Boolean(selectedOrder.pointsDiscount) && (
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                            <span>
                              Points Redeemed ({selectedOrder.pointsRedeemed || 0} pts)
                            </span>
                            <span className="font-semibold">
                              -{formatPrice(selectedOrder.pointsDiscount || 0)}
                            </span>
                          </div>
                        )}
                        {selectedOrder.shippingMethod && (
                          <div className="flex justify-between text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)]">
                            <span>Shipping Method</span>
                            <span className="font-semibold capitalize">
                              {selectedOrder.shippingMethod}
                            </span>
                          </div>
                        )}
                        {selectedOrder.estimatedDelivery && (
                          <div className="flex justify-between text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)]">
                            <span>Est. Delivery</span>
                            <span className="font-semibold">
                              {selectedOrder.estimatedDelivery}
                            </span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-[var(--border-color)] flex justify-between text-sm font-black text-[var(--foreground)]">
                          <span>Total Amount</span>
                          <span className="text-primary">
                            {formatPrice(selectedOrder.totalAmount)}
                          </span>
                        </div>
                        {Boolean(selectedOrder.pointsEarned) && (
                          <div className="flex justify-between text-[10px] text-[var(--foreground-muted)]">
                            <span>Points Earned (credited on delivery)</span>
                            <span className="font-semibold">
                              +{selectedOrder.pointsEarned} pts
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Customer & Shipping 2-col info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Customer Info */}
                      <div className="p-4 bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-color)] space-y-2 text-xs">
                        <h4 className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4 text-primary" />
                          Customer Info
                        </h4>
                        <div className="space-y-1 text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] pt-1">
                          <p className="font-bold text-[var(--foreground)]">
                            {(typeof selectedOrder.userId === "object"
                              ? selectedOrder.userId?.name
                              : "") ||
                              selectedOrder.shippingAddress?.fullName ||
                              "Customer"}
                          </p>
                          {typeof selectedOrder.userId === "object" && selectedOrder.userId?.email && (
                            <p className="flex items-center gap-1.5 text-[11px]">
                              <Mail className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                              {selectedOrder.userId.email}
                            </p>
                          )}
                          {selectedOrder.shippingAddress?.phone && (
                            <p className="flex items-center gap-1.5 text-[11px]">
                              <Phone className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                              {selectedOrder.shippingAddress.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Shipping Address */}
                      <div className="p-4 bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-color)] space-y-2 text-xs">
                        <h4 className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-primary" />
                          Shipping Destination
                        </h4>
                        <div className="space-y-1 text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] pt-1">
                          <p className="font-semibold text-[var(--foreground)]">
                            {selectedOrder.shippingAddress?.address}
                          </p>
                          <p>
                            {selectedOrder.shippingAddress?.city}
                            {selectedOrder.shippingAddress?.postalCode
                              ? `, ${selectedOrder.shippingAddress.postalCode}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Payment & Transaction Card */}
                    <div className="p-4 bg-[var(--surface-alt)] rounded-2xl border border-[var(--border-color)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[var(--foreground-muted)] block">
                          Payment Reference
                        </span>
                        <span className="font-mono font-bold text-[var(--foreground)]">
                          {selectedOrder.transactionId || `REF-${selectedOrder._id?.slice(-8).toUpperCase()}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-color)] font-semibold uppercase text-[11px]">
                          Method: {selectedOrder.paymentMethod}
                        </span>
                        {selectedOrder.paymentStatus && (
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold capitalize ${
                              selectedOrder.paymentStatus === "success"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-amber-50 text-amber-600 border border-amber-200"
                            }`}
                          >
                            {selectedOrder.paymentStatus}
                          </span>
                        )}
                      </div>
                    </div>
                  </Modal.Body>

                  <Modal.Footer className="flex items-center justify-end pt-4 border-t border-[var(--border-color)]">
                    <Button
                      onPress={() => setIsDetailOpen(false)}
                      className="px-5 py-2 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-xs font-bold shadow-xs cursor-pointer hover:opacity-95 transition-all"
                    >
                      Close Details
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ── Rider picker: the step that turns "shipped" into somebody's job ── */}
      <AssignRiderModal
        isOpen={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        order={
          assignOrder
            ? {
                _id: assignOrder._id || assignOrder.id || "",
                orderNumber: `#ORD-${(assignOrder._id || assignOrder.id || "").slice(-6).toUpperCase()}`,
                customerName:
                  (typeof assignOrder.userId === "object"
                    ? assignOrder.userId?.name
                    : undefined) || assignOrder.shippingAddress?.fullName,
                city: assignOrder.shippingAddress?.city,
                shippingFee: assignOrder.shippingFee,
                orderStatus: assignOrder.orderStatus || assignOrder.status,
              }
            : null
        }
        onAssigned={(job) => {
          const id = assignOrder?._id || assignOrder?.id;
          if (id) handleAssigned(id, job);
          setAssignOrder(null);
        }}
      />
    </div>
  );
}
