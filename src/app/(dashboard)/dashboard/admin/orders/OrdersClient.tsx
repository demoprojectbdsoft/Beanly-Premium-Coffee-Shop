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
  Clock,
  Truck,
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
} from "lucide-react";
import { toast } from "react-toastify";
import { Order } from "@/types";
import { updateOrderStatus } from "@/lib/action/orders";
import { useDemoAdmin } from "@/hooks/useDemoAdmin";

const STATUS_OPTIONS = [
  { id: "confirmed",  label: "Confirmed",  color: "sky" },
  { id: "processing", label: "Processing", color: "amber" },
  { id: "shipped",    label: "Shipped",    color: "blue" },
  { id: "delivered",  label: "Delivered",  color: "emerald" },
  { id: "cancelled",  label: "Cancelled",  color: "rose" },
];

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { guardDemo } = useDemoAdmin();
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

  // Status badge helper
  const getStatusBadge = (status?: string) => {
    const s = (status || "processing").toLowerCase();
    switch (s) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
            <CheckCircle2 className="w-3 h-3" />
            Delivered
          </span>
        );
      case "shipped":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40">
            <Truck className="w-3 h-3" />
            Shipped
          </span>
        );
      case "confirmed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/40">
            <CheckCircle2 className="w-3 h-3" />
            Confirmed
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
      case "processing":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40">
            <Clock className="w-3 h-3" />
            Processing
          </span>
        );
    }
  };

  // Open Details Modal
  const handleOpenDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  // Update Status
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedOrder || !newStatus) return;
    if (guardDemo()) return;

    const currentStatus = (selectedOrder.orderStatus || selectedOrder.status || "").toLowerCase();
    if (
      currentStatus === "shipped" &&
      !selectedOrder.customerResponse &&
      (newStatus === "cancelled" || newStatus === "delivered")
    ) {
      toast.warning(
        `Customer response is required before marking this shipped order as "${newStatus}".`
      );
      return;
    }

    const orderId = selectedOrder._id || selectedOrder.id;
    if (!orderId) return;
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
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/dashboard/admin" className="hover:text-sky-600 transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-sky-600 dark:text-sky-400">Orders</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Customer{" "}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              Orders
            </span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track and process fulfillment, inspect line items, verify shipping and update statuses.
          </p>
        </div>

        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Total orders: <span className="font-extrabold text-gray-900 dark:text-white">{total}</span>
        </div>
      </div>

      {/* ── Toolbar: Tabs, Search & Sort ── */}
      <div className="space-y-4 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-xs">
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
                    ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs"
                    : "bg-slate-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200/60 dark:border-gray-700"
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
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by Order ID, name, city, payment..."
                className="w-full pl-9 pr-4 h-10 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-xs"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs cursor-pointer shrink-0"
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
                <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-between gap-1.5 cursor-pointer hover:border-sky-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                  <Select.Value className="text-xs font-semibold truncate" />
                  <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
                </Select.Trigger>
                <Select.Popover className="w-52 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                  <ListBox>
                    {SORT_OPTIONS.map((opt) => (
                      <ListBox.Item
                        key={opt.key}
                        id={opt.key}
                        textValue={opt.label}
                        className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between"
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
                className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-semibold cursor-pointer flex items-center gap-1"
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
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-gray-500">Loading orders...</p>
        </Card>
      ) : orders.length === 0 ? (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No orders found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentSearch
                ? "No orders matched your search query."
                : `There are currently no ${currentTab !== "All" ? currentTab.toLowerCase() : ""} orders.`}
            </p>
          </div>
          {(currentSearch || currentTab !== "All") && (
            <Button
              onPress={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/40 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60 text-xs">
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
                  const dateStr = order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recent";

                  return (
                    <tr
                      key={id}
                      onClick={() => handleOpenDetail(order)}
                      className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Order ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-600 dark:text-sky-400 whitespace-nowrap">
                        {shortId}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center font-bold text-[11px] text-gray-700 dark:text-gray-300 shrink-0">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 max-w-[160px]">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {customerName}
                            </p>
                            {customerEmail && (
                              <p className="text-[11px] text-gray-400 truncate">
                                {customerEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                          {itemsCount} {itemsCount === 1 ? "item" : "items"}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-gray-900 dark:text-white">
                        ${order.totalAmount?.toFixed(2)}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[11px] font-semibold uppercase">
                          <CreditCard className="w-3 h-3 text-sky-500" />
                          {order.paymentMethod}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {getStatusBadge(order.orderStatus || order.status)}
                          {((order.orderStatus || order.status || "").toLowerCase() === "shipped" || order.customerResponse) && (
                            order.customerResponse ? (
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
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 dark:bg-gray-800 dark:text-gray-400 border border-slate-200/60 dark:border-gray-700">
                                <Clock className="w-2.5 h-2.5" />
                                Awaiting Response
                              </span>
                            )
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-[11px]">
                        {dateStr}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onPress={() => handleOpenDetail(order)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40 text-xs font-bold transition-colors cursor-pointer"
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
            <div className="p-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/40 dark:bg-gray-900/40">
              <Pagination className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 dark:text-gray-400">
                <Pagination.Summary className="text-xs">
                  Showing <span className="text-gray-800 dark:text-gray-200 font-bold">{startItem}–{endItem}</span> of{" "}
                  <span className="text-sky-600 dark:text-sky-400 font-bold">{total}</span> orders
                </Pagination.Summary>

                <Pagination.Content className="flex items-center gap-1">
                  <Pagination.Item>
                    <Pagination.Previous
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-sky-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
                        <Pagination.Ellipsis className="px-2 text-gray-400 select-none text-xs" />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={p}>
                        <Pagination.Link
                          isActive={p === page}
                          isDisabled={isPending}
                          onPress={() => updateParams({ page: String(p) })}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            p === page
                              ? "bg-sky-500 text-white shadow-sm shadow-sky-500/30"
                              : "hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    )
                  )}

                  <Pagination.Item>
                    <Pagination.Next
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-sky-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
            <Modal.Dialog className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              {selectedOrder && (
                <>
                  {/* Modal Header */}
                  <Modal.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-gray-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Modal.Heading className="text-base font-extrabold text-gray-900 dark:text-white">
                          Order Details: #{selectedOrder._id?.slice(-8).toUpperCase()}
                        </Modal.Heading>
                        {getStatusBadge(selectedOrder.orderStatus || selectedOrder.status)}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Placed on{" "}
                        {selectedOrder.createdAt
                          ? new Date(selectedOrder.createdAt).toLocaleString()
                          : "N/A"}
                      </p>
                    </div>

                    <Modal.CloseTrigger className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 rounded-lg self-end sm:self-auto">
                      ✕
                    </Modal.CloseTrigger>
                  </Modal.Header>

                  <Modal.Body className="space-y-6">
                    {/* Status Changer Bar */}
                    {(() => {
                      const currentStatus = (selectedOrder.orderStatus || selectedOrder.status || "").toLowerCase();
                      const isShipped = currentStatus === "shipped";
                      const isResponseLocked = isShipped && !selectedOrder.customerResponse;
                      // Only show "delivered" once the order has been shipped
                      const visibleOptions = STATUS_OPTIONS.filter(
                        (opt) => opt.id !== "delivered" || isShipped
                      );
                      const disabledKeys = isResponseLocked ? ["cancelled", "delivered"] : [];

                      return (
                        <div className="space-y-3">
                          <div className="p-4 bg-slate-50 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white">
                                Update Fulfillment Status
                              </p>
                              <p className="text-[11px] text-gray-400">
                                Select the new stage for this customer order
                              </p>
                            </div>

                            <div className="w-56 shrink-0">
                              <Select
                                aria-label="Update Fulfillment Status"
                                selectedKey={
                                  (selectedOrder.orderStatus || selectedOrder.status || "processing").toLowerCase()
                                }
                                onSelectionChange={(key) => key && handleStatusChange(String(key))}
                                isDisabled={isUpdatingStatus}
                                disabledKeys={disabledKeys}
                                placeholder="Select Status"
                              >
                                <Select.Trigger className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-between gap-1.5 cursor-pointer hover:border-sky-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                                  <Select.Value className="text-xs font-semibold truncate capitalize" />
                                  <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
                                </Select.Trigger>
                                <Select.Popover className="w-56 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                                  <ListBox disabledKeys={disabledKeys}>
                                    {visibleOptions.map((opt) => {
                                      const isLocked = isResponseLocked && (opt.id === "cancelled" || opt.id === "delivered");
                                      return (
                                        <ListBox.Item
                                          key={opt.id}
                                          id={opt.id}
                                          textValue={opt.label}
                                          isDisabled={isLocked}
                                          className={`text-xs font-medium px-3 py-2 rounded-lg flex items-center justify-between ${
                                            isLocked
                                              ? "opacity-45 cursor-not-allowed bg-slate-50 dark:bg-gray-800/40 text-gray-400"
                                              : "hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5">
                                            <span>{opt.label}</span>
                                            {isLocked && (
                                              <span className="text-[10px] text-amber-500 font-bold">
                                                (Awaiting customer)
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

                          {/* Customer Response Status Banner */}
                          {isShipped && !selectedOrder.customerResponse && (
                            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3 shadow-xs">
                              <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                                <Clock className="w-4 h-4" />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold">Awaiting Customer Response</p>
                                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">
                                  This order is marked as <strong>Shipped</strong>. The <strong>Delivered</strong> and <strong>Cancelled</strong> options will become available once the customer confirms or reports their order status on their dashboard.
                                </p>
                              </div>
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
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/70 dark:bg-gray-800/70 border border-current">
                                      Delivered &amp; Cancelled Unlocked
                                    </span>
                                  </div>
                                  {selectedOrder.customerResponseNote && (
                                    <p className="text-[11px] text-gray-700 dark:text-gray-300 italic">
                                      "{selectedOrder.customerResponseNote}"
                                    </p>
                                  )}
                                  {selectedOrder.customerResponseAt && (
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                      Submitted:{" "}
                                      {new Date(selectedOrder.customerResponseAt).toLocaleString()}
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
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" /> Ordered Items (
                        {selectedOrder.items?.length || 0})
                      </h3>

                      <div className="border border-slate-200/80 dark:border-gray-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-gray-800">
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
                              className="p-3.5 flex items-center justify-between gap-4 bg-white dark:bg-gray-900"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="relative w-12 h-12 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
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
                                    <Package className="w-5 h-5 text-gray-400" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                                    {productTitle}
                                  </p>
                                  <p className="text-[11px] text-gray-400 mt-0.5">
                                    Qty: {qty} × ${unitPrice.toFixed(2)}
                                  </p>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">
                                  ${lineTotal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pricing Calculation Summary */}
                      <div className="p-4 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-800 space-y-2 text-xs">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Subtotal</span>
                          <span className="font-semibold">
                            ${(selectedOrder.subtotal ?? (selectedOrder.totalAmount - (selectedOrder.shippingFee || 0))).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Shipping Fee</span>
                          <span className="font-semibold">
                            ${(selectedOrder.shippingFee || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 dark:border-gray-700 flex justify-between text-sm font-black text-gray-900 dark:text-white">
                          <span>Total Amount</span>
                          <span className="text-sky-600 dark:text-sky-400">
                            ${selectedOrder.totalAmount?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer & Shipping 2-col info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Customer Info */}
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 space-y-2 text-xs">
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <UserIcon className="w-4 h-4 text-sky-500" />
                          Customer Info
                        </h4>
                        <div className="space-y-1 text-gray-600 dark:text-gray-400 pt-1">
                          <p className="font-bold text-gray-900 dark:text-white">
                            {(typeof selectedOrder.userId === "object"
                              ? selectedOrder.userId?.name
                              : "") ||
                              selectedOrder.shippingAddress?.fullName ||
                              "Customer"}
                          </p>
                          {typeof selectedOrder.userId === "object" && selectedOrder.userId?.email && (
                            <p className="flex items-center gap-1.5 text-[11px]">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              {selectedOrder.userId.email}
                            </p>
                          )}
                          {selectedOrder.shippingAddress?.phone && (
                            <p className="flex items-center gap-1.5 text-[11px]">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              {selectedOrder.shippingAddress.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Shipping Address */}
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-slate-200/80 dark:border-gray-800 space-y-2 text-xs">
                        <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-sky-500" />
                          Shipping Destination
                        </h4>
                        <div className="space-y-1 text-gray-600 dark:text-gray-400 pt-1">
                          <p className="font-semibold text-gray-900 dark:text-white">
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
                    <div className="p-4 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/60 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-400 block">
                          Payment Reference
                        </span>
                        <span className="font-mono font-bold text-gray-900 dark:text-white">
                          {selectedOrder.transactionId || `REF-${selectedOrder._id?.slice(-8).toUpperCase()}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 font-semibold uppercase text-[11px]">
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

                  <Modal.Footer className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-gray-800">
                    <Button
                      onPress={() => setIsDetailOpen(false)}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-sm cursor-pointer"
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
    </div>
  );
}
