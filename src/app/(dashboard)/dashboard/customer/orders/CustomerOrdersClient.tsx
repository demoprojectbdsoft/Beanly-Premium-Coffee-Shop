"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  Button,
  Input,
  Select,
  ListBox,
  Modal,
  TextArea,
} from "@heroui/react";
import {
  ShoppingBag,
  Package,
  Truck,
  Navigation,
  Calendar,
  CheckCircle2,
  Clock,
  Search,
  Download,
  RotateCcw,
  Star,
  Copy,
  XCircle,
  X,
  PackageCheck,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  FileText,
  ImagePlus,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";
import SuspendedAccountModal from "@/components/shared/SuspendedAccountModal";
import { CustomerOrder, CustomerOrderItem, CustomerWarranty } from "@/types/customerDashboard";
import { submitCustomerOrderResponse } from "@/lib/action/orders";
import { addToCart } from "@/lib/action/cart";
import { submitWarrantyClaim } from "@/lib/action/warranty";
import { downloadOrderInvoicePdf } from "@/lib/orderInvoicePdf";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import { formatOrderDateTime } from "@/lib/dateTime";
import { isProductOutOfStock } from "@/lib/stock";
import {
  claimProblemLabel,
  closedReasonText,
  extensionUsageText,
  formatWarrantyDuration,
  hasWarrantyCoverage,
  totalCoverageMonths,
  warrantyTypeInfo,
  warrantyTypeLabel,
} from "@/lib/warranty";
import { useSiteSettings } from "@/context/SiteSettingsContext";

/** Options for the status filter, in the order a shopper expects to see them. */
const STATUS_OPTIONS = ["All Orders", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

/** Orders shown at once. The cards are tall, so a short page reads better. */
const ORDERS_PER_PAGE = 5;

/** How the list can be ordered. */
const SORT_OPTIONS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "highest", label: "Total: high to low" },
  { key: "lowest", label: "Total: low to high" },
];

/** Human-readable label for the shipping option stored on an order.
 *  Pre-existing orders have no method stored — assume Standard Delivery. */
function shippingMethodLabel(method?: CustomerOrder["shippingMethod"]): string {
  switch (method) {
    case "free":    return "Free Shipping";
    case "express": return "Express Delivery";
    case "standard":return "Standard Delivery";
    default:        return "Standard Delivery";
  }
}

// ── Delivery response rules ──────────────────────────────────────────────────

/** The customer's final answers. Once sent, the response is locked. */
const FINAL_RESPONSES = ["received", "cancelled"];

/** True when the delivery response can no longer be changed. */
function isResponseLocked(response?: string | null): boolean {
  return Boolean(response && FINAL_RESPONSES.includes(response));
}

// ── Warranty helpers ─────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

/** Format a warranty date for display, tolerating nulls and bad input. */
function formatWarrantyDate(value?: string | Date): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Whole days left before expiry. Negative once lapsed, null when unknown. */
function daysUntilExpiry(warranty: CustomerWarranty): number | null {
  if (!warranty.expiryDate) return null;
  const end = new Date(warranty.expiryDate).getTime();
  if (Number.isNaN(end)) return null;
  return Math.ceil((end - Date.now()) / DAY_MS);
}

/** The type and period the record promised: the live product, else the copy. */
function coverageOf(warranty: CustomerWarranty) {
  return {
    type: warranty.product?.warrantyType || warranty.warrantyType,
    months:
      warranty.product?.warrantyPeriodMonths ?? warranty.warrantyPeriodMonths,
  };
}

/** A warranty takes one claim, and only while it is still active. */
function canClaim(warranty: CustomerWarranty | null): boolean {
  if (!warranty) return false;
  // A record with no coverage can never be claimed, whatever its status says.
  const { type, months } = coverageOf(warranty);
  if (!hasWarrantyCoverage(type, months)) return false;
  if (warranty.status !== "active") return false;
  const days = daysUntilExpiry(warranty);
  return days === null || days > 0;
}

/** True while the coverage is still being honoured: not closed, not past its date. */
function isWarrantyLive(warranty?: CustomerWarranty | null): boolean {
  if (!warranty) return false;
  if (warranty.status === "expired" || warranty.status === "resolved") return false;
  // The nightly sweep can lag behind the date, so the date is checked here too.
  const days = daysUntilExpiry(warranty);
  return days === null || days > 0;
}

/** An order counts as covered while at least one of its items still is. */
function orderHasLiveWarranty(order: CustomerOrder): boolean {
  return order.items.some((item) => isWarrantyLive(item.warranty));
}

/** Milliseconds since the epoch, used to order the cards; a bad date sorts last. */
function orderTimestamp(order: CustomerOrder): number {
  const time = new Date(order.createdAt || order.date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/**
 * Claim and Review are revealed by the same rule: only a delivered order can be
 * reviewed or have coverage, so both buttons share this single check.
 */
function isDeliveredOrder(order: CustomerOrder): boolean {
  return order.status === "Delivered";
}

/** Badge presentation for each warranty status. */
function warrantyStatusMeta(warranty: CustomerWarranty) {
  switch (warranty.status) {
    case "active":
      return {
        label: "Active",
        icon: ShieldCheck,
        className:
          "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
      };
    case "claim_submitted":
      return {
        label: "Claim Submitted",
        icon: ShieldAlert,
        className:
          "border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
      };
    case "under_review":
      return {
        label: "Under Review",
        icon: ShieldAlert,
        className: "border-primary/25 bg-primary/10 text-primary",
      };
    case "resolved":
      return {
        label: "Resolved",
        icon: ShieldCheck,
        className:
          "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
      };
    default:
      return {
        label: "Expired",
        icon: ShieldX,
        className:
          "border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400",
      };
  }
}

/** Why a warranty can no longer be claimed, phrased for the customer. */
function warrantyBlockReason(warranty: CustomerWarranty): string {
  switch (warranty.status) {
    case "claim_submitted":
      return "You already submitted a claim for this warranty. Our team will review it and get back to you.";
    case "under_review":
      return "Your claim is under review. We will contact you as soon as a decision is made.";
    case "resolved":
      return "This claim has already been resolved. The outcome is shown below.";
    case "expired":
      // Rejected and voided records also read "expired", so use the stored
      // reason instead of always blaming the calendar.
      return warranty.closedReason === "date" || !warranty.closedReason
        ? `This warranty expired on ${formatWarrantyDate(warranty.expiryDate)} and can no longer be claimed.`
        : closedReasonText(warranty);
    default: {
      const days = daysUntilExpiry(warranty);
      if (days !== null && days <= 0) {
        return `This warranty expired on ${formatWarrantyDate(warranty.expiryDate)} and can no longer be claimed.`;
      }
      // Active, unexpired, and still not claimable: the product promised nothing.
      if (!hasWarrantyCoverage(coverageOf(warranty).type, coverageOf(warranty).months)) {
        return "This item was sold without warranty coverage, so there is nothing to claim.";
      }
      return "This warranty cannot be claimed right now.";
    }
  }
}

/** One cell in the warranty detail grid. */
function WarrantyDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)]">
      <p className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">{label}</p>
      <p className="text-xs font-semibold text-[var(--foreground)] mt-0.5 break-words">{value}</p>
    </div>
  );
}

/** Status pill for a warranty record. */
function WarrantyStatusBadge({ warranty }: { warranty: CustomerWarranty }) {
  const meta = warrantyStatusMeta(warranty);
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${meta.className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {meta.label}
    </span>
  );
}

interface CustomerOrdersClientProps {
  initialOrders: CustomerOrder[];
  /** Pre-fills the search box, so a notification link can land on the exact order. */
  initialSearch?: string;
}

export default function CustomerOrdersClient({ initialOrders = [], initialSearch = "" }: CustomerOrdersClientProps) {
  const { formatPrice, settings: siteSettings } = useSiteSettings();
  const siteName = siteSettings.siteName || "Sparq";
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const isSuspended = ((user as { status?: string })?.status || "").toLowerCase() === "suspended";
  const [showSuspendedAlert, setShowSuspendedAlert] = useState(false);

  const [orders, setOrders] = useState<CustomerOrder[]>(
    Array.isArray(initialOrders) ? initialOrders : []
  );
  const [selectedTab, setSelectedTab] = useState("All Orders");
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  // Six tabs used to eat the whole toolbar, so the three filters live in one
  // row: a status select, a sort select and an on/off switch for coverage.
  const [warrantyOnly, setWarrantyOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [trackingModalOrder, setTrackingModalOrder] = useState<CustomerOrder | null>(null);

  // Customer Response State
  const [responseModalOrder, setResponseModalOrder] = useState<CustomerOrder | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<"received" | "not_received" | "cancelled">("received");
  const [responseNote, setResponseNote] = useState("");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);

  // Warranty Claim State
  const [selectedWarranty, setSelectedWarranty] = useState<CustomerWarranty | null>(null);
  const [selectedWarrantyItem, setSelectedWarrantyItem] = useState<CustomerOrderItem | null>(null);
  const [selectedWarrantyOrderNumber, setSelectedWarrantyOrderNumber] = useState("");
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [claimReason, setClaimReason] = useState("");
  const [claimDescription, setClaimDescription] = useState("");
  const [claimImages, setClaimImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY ?? "";

  const openWarrantyModal = (
    warranty: CustomerWarranty | null,
    item: CustomerOrderItem | null,
    orderNumber = ""
  ) => {
    setSelectedWarranty(warranty);
    setSelectedWarrantyItem(item);
    setSelectedWarrantyOrderNumber(orderNumber);
    // A fresh form every time, so a claim typed for one item is never sent for
    // another.
    setClaimReason("");
    setClaimDescription("");
    setClaimImages([]);
    setIsWarrantyModalOpen(true);
  };

  const handleClaimImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (claimImages.length + files.length > 5) {
      toast.warning("Maximum 5 images per claim.");
      return;
    }
    if (!IMGBB_API_KEY) {
      toast.error("Image upload is not configured. Please submit the claim without photos.");
      return;
    }
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const body = new FormData();
        body.append("image", file);
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: "POST",
          body,
        });
        const data = await res.json();
        if (data.success) uploaded.push(data.data.url as string);
      }
      setClaimImages((prev) => [...prev, ...uploaded]);
    } catch {
      toast.error("Failed to upload image(s).");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleSubmitClaim = async () => {
    if (!selectedWarranty) return;
    if (!claimReason.trim() || !claimDescription.trim()) {
      toast.warning("Please provide a reason and description for your claim.");
      return;
    }
    setIsSubmittingClaim(true);
    try {
      const res = await submitWarrantyClaim(selectedWarranty.id, {
        reason: claimReason.trim(),
        description: claimDescription.trim(),
        images: claimImages,
      });
      if (res?.success !== false) {
        toast.success("Warranty claim submitted successfully!");
        setIsWarrantyModalOpen(false);

        // Mirror the claim locally so the row and a reopened modal stay accurate
        // without waiting for a round-trip.
        const submitted = {
          reason: claimReason.trim(),
          description: claimDescription.trim(),
          images: claimImages,
        };
        setClaimReason("");
        setClaimDescription("");
        setClaimImages([]);

        // A first claim simply writes the description.
        const mirroredWarranty = (warranty: CustomerWarranty): CustomerWarranty => ({
          ...warranty,
          status: "claim_submitted",
          claimReason: submitted.reason,
          claimDescription: submitted.description,
        });

        setSelectedWarranty((prev) => (prev ? mirroredWarranty(prev) : prev));
        setOrders((prev) =>
          prev.map((order) => ({
            ...order,
            items: order.items.map((item) =>
              item.warranty?.id === selectedWarranty.id && item.warranty
                ? { ...item, warranty: mirroredWarranty(item.warranty) }
                : item
            ),
          }))
        );
      } else {
        toast.error(res?.message || "Failed to submit claim.");
      }
    } catch {
      toast.error("Failed to submit claim.");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  // Orders that still carry live coverage, used by the switch and its count.
  const liveWarrantyCount = orders.filter(orderHasLiveWarranty).length;
  const query = searchQuery.trim().toLowerCase();

  // Filter first, then order, then cut the page, so the count shown in the
  // footer always describes what is actually visible.
  const filteredOrders = orders
    .filter((order) => {
      const matchesTab =
        selectedTab === "All Orders" ||
        order.status.toLowerCase() === selectedTab.toLowerCase();
      const matchesSearch =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.items.some((item) => item.name.toLowerCase().includes(query));
      const matchesWarranty = !warrantyOnly || orderHasLiveWarranty(order);
      return matchesTab && matchesSearch && matchesWarranty;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return orderTimestamp(a) - orderTimestamp(b);
        case "highest":
          return b.total - a.total;
        case "lowest":
          return a.total - b.total;
        default:
          return orderTimestamp(b) - orderTimestamp(a);
      }
    });

  // The page is clamped rather than reset in an effect, so a filter that shrinks
  // the list drops the shopper onto the last page instead of an empty one.
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * ORDERS_PER_PAGE;
  const visibleOrders = filteredOrders.slice(pageStart, pageStart + ORDERS_PER_PAGE);

  // Every filter change goes back to page one, so a narrowed list is never
  // hidden on a page the shopper happened to be sitting on.
  const goToPage = (next: number) => {
    setPage(next);
    // The cards are tall, so a new page starts from the toolbar again.
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const userRole = ((user as { role?: string })?.role || "").toLowerCase();
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  // Id of the order whose invoice is being generated right now.
  const [downloadingOrderId, setDownloadingOrderId] = useState<string | null>(null);

  const handleDownloadInvoice = async (order: CustomerOrder) => {
    setDownloadingOrderId(order.id);
    try {
      await downloadOrderInvoicePdf(order, {
        siteName,
        formatMoney: formatPrice,
      });
      toast.success(`Invoice ${order.orderNumber} downloaded.`);
    } catch {
      toast.error("Could not create the invoice PDF. Please try again.");
    } finally {
      setDownloadingOrderId(null);
    }
  };

  const handleBuyAgain = async (item: CustomerOrderItem) => {
    if (isSuspended) {
      setShowSuspendedAlert(true);
      return;
    }

    if (userRole === "admin" || userRole === "demoadmin") {
      toast.warning(
        userRole === "demoadmin"
          ? "Demo admin cannot add products to cart!"
          : "Admin cannot add products to cart!"
      );
      return;
    }

    // A product with no stock count is not tracked, so Buy Again is always allowed.
    if (isProductOutOfStock(item)) {
      toast.warning(`"${item.name}" is currently out of stock!`, {
        icon: <span>⚠️</span>,
      });
      return;
    }

    const productId = item.productId || item.id;
    if (!productId) {
      toast.error("Product information unavailable to reorder.");
      return;
    }

    try {
      setLoadingItemId(item.id);
      const res = await addToCart(productId, 1);
      if (res?.success) {
        toast.success(`"${item.name}" added to cart!`, {
          icon: <span>🛒</span>,
        });
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else {
        const errorMsg = res?.message || "Failed to add to cart";
        if (
          errorMsg.toLowerCase().includes("out of stock") ||
          errorMsg.toLowerCase().includes("stock")
        ) {
          toast.warning(errorMsg, {
            icon: <span>⚠️</span>,
          });
        } else {
          toast.error(errorMsg);
        }
      }
    } catch {
      toast.error("Failed to add product to cart");
    } finally {
      setLoadingItemId(null);
    }
  };

  const copyTracking = (tracking: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(tracking);
      toast.info(`Tracking #${tracking} copied to clipboard!`);
    }
  };

  const handleOpenResponseModal = (order: CustomerOrder) => {
    // A received or cancelled answer is final, so there is nothing to edit.
    if (isResponseLocked(order.customerResponse)) {
      toast.info("This response is final. Please contact support if it needs to change.");
      return;
    }

    setResponseModalOrder(order);
    setSelectedResponse(order.customerResponse || "received");
    setResponseNote(order.customerResponseNote || "");
  };

  const handleSubmitResponse = async () => {
    if (!responseModalOrder) return;

    // Extra guard: the modal should never open for a locked order.
    if (isResponseLocked(responseModalOrder.customerResponse)) {
      toast.info("This response is final. Please contact support if it needs to change.");
      setResponseModalOrder(null);
      return;
    }

    setIsSubmittingResponse(true);

    try {
      const res = await submitCustomerOrderResponse(
        responseModalOrder.id,
        selectedResponse,
        responseNote.trim()
      );

      if (res?.success !== false) {
        toast.success(
          selectedResponse === "received"
            ? "Thank you! Your delivery confirmation has been sent to the store."
            : selectedResponse === "not_received"
            ? "Your report has been submitted. The store admin has been alerted."
            : "Cancellation request submitted. The store admin has been alerted."
        );

        setOrders((prev) =>
          prev.map((o) =>
            o.id === responseModalOrder.id
              ? {
                  ...o,
                  customerResponse: selectedResponse,
                  customerResponseNote: responseNote.trim(),
                  customerResponseAt: new Date().toISOString(),
                }
              : o
          )
        );
        setResponseModalOrder(null);
      } else {
        toast.error(res?.message || "Failed to submit response");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error submitting response");
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const activeWarrantyDaysLeft = selectedWarranty ? daysUntilExpiry(selectedWarranty) : null;
  const activeWarrantyClaimable = canClaim(selectedWarranty);

  return (
    <>
    <SuspendedAccountModal
      isOpen={showSuspendedAlert}
      onOpenChange={setShowSuspendedAlert}
      message="Your account has been suspended. You are not allowed to add items to the cart or reorder. Please contact support for assistance."
    />

    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/customer" className="hover:text-primary transition-colors">
              Customer Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">My Orders</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Order History &amp;{" "}
            <span className="text-gradient-primary">
              Tracking
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Track active shipments, manage past deliveries, and download receipts.
          </p>
        </div>

        <Link
          href="/shop"
          className="bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer self-start sm:self-auto h-10 px-4 rounded-xl flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Shop More Items</span>
        </Link>
      </div>

      {/* ── Search, Filters & Sort ── */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] z-10" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by order number (e.g. #ORD-9582) or product title..."
            className="w-full pl-9 pr-4 h-10 bg-[var(--surface-alt)] border border-[var(--border-color)] focus:border-primary rounded-xl text-xs transition-all text-[var(--foreground)] shadow-xs"
          />
        </div>

        {/* Status, sort and coverage now share one row instead of a long strip */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-40">
            <Select
              aria-label="Filter orders by status"
              selectedKey={selectedTab}
              onSelectionChange={(key) => {
                setSelectedTab(String(key ?? "All Orders"));
                setPage(1);
              }}
            >
              <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-xs font-semibold text-[var(--foreground)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                {/* Only the tab's name goes in the trigger. The dropdown rows also
                    carry a count badge, and without this render prop that badge
                    was printed under the label inside the closed select. */}
                <Select.Value className="text-xs font-semibold truncate">
                  {({ selectedText }) => (
                    <span className="truncate">{selectedText}</span>
                  )}
                </Select.Value>
                <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[var(--foreground-muted)] shrink-0" />
              </Select.Trigger>
              <Select.Popover className="w-56 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50">
                <ListBox>
                  {STATUS_OPTIONS.map((tab) => {
                    // Each option carries its own count, so the old pill badges
                    // are still readable inside the dropdown.
                    const count =
                      tab === "All Orders"
                        ? orders.length
                        : orders.filter((o) => o.status.toLowerCase() === tab.toLowerCase()).length;

                    return (
                      <ListBox.Item
                        key={tab}
                        id={tab}
                        textValue={tab}
                        className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10 dark:hover:bg-[var(--surface-alt)] text-[var(--foreground)] cursor-pointer flex items-center justify-between gap-2"
                      >
                        <span>{tab}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground-muted)]">
                            {count}
                          </span>
                          <ListBox.ItemIndicator />
                        </span>
                      </ListBox.Item>
                    );
                  })}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="w-44">
            <Select
              aria-label="Sort orders"
              selectedKey={sortBy}
              onSelectionChange={(key) => {
                setSortBy(String(key ?? "newest"));
                setPage(1);
              }}
            >
              <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-xs font-semibold text-[var(--foreground)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                <Select.Value className="text-xs font-semibold truncate">
                  {({ selectedText }) => (
                    <span className="truncate">{selectedText}</span>
                  )}
                </Select.Value>
                <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[var(--foreground-muted)] shrink-0" />
              </Select.Trigger>
              <Select.Popover className="w-52 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50">
                <ListBox>
                  {SORT_OPTIONS.map((opt) => (
                    <ListBox.Item
                      key={opt.key}
                      id={opt.key}
                      textValue={opt.label}
                      className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10 dark:hover:bg-[var(--surface-alt)] text-[var(--foreground)] cursor-pointer flex items-center justify-between"
                    >
                      {opt.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {/* Only orders that still carry a warranty */}
          <button
            type="button"
            aria-pressed={warrantyOnly}
            onClick={() => {
              setWarrantyOnly((prev) => !prev);
              setPage(1);
            }}
            className={`h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border ${
              warrantyOnly
                ? "bg-primary text-white border-primary shadow-xs"
                : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border-color)] hover:text-[var(--foreground)]"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Active warranty</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                warrantyOnly
                  ? "bg-[var(--surface-elevated)]/20 text-white"
                  : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border border-[var(--border-color)]/50"
              }`}
            >
              {liveWarrantyCount}
            </span>
          </button>
        </div>
      </div>

      {/* ── Orders Cards List ── */}
      {filteredOrders.length === 0 ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-12 text-center space-y-4 max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-[var(--foreground)]">
              No orders found
            </h2>
            <p className="text-xs text-[var(--foreground-muted)]">
              {searchQuery
                ? "No orders matched your search keyword."
                : warrantyOnly
                ? "None of your orders has an active warranty right now."
                : `You do not have any ${selectedTab !== "All Orders" ? selectedTab.toLowerCase() : ""} orders yet.`}
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all"
          >
            <span>Start Shopping</span>
          </Link>
        </Card>
      ) : (
        <div className="space-y-5">
          {visibleOrders.map((order) => (
            <Card
              key={order.id}
              className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs space-y-4 p-0"
            >
              {/* Order Card Header */}
              <div className="p-4 sm:p-5 bg-[var(--surface-alt)] border-b border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div>
                    <span className="text-[var(--foreground-muted)] text-[10px] uppercase font-bold block">
                      Order Number
                    </span>
                    <span className="font-extrabold text-[var(--foreground)]">
                      {order.orderNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--foreground-muted)] text-[10px] uppercase font-bold block">
                      Date Placed
                    </span>
                    <span className="font-semibold text-[var(--foreground)] opacity-90">
                      {order.date}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--foreground-muted)] text-[10px] uppercase font-bold block">
                      Total Amount
                    </span>
                    <span className="font-black text-[var(--foreground)]">
                      {formatPrice(order.total)}
                    </span>
                  </div>
                  {Boolean(order.couponDiscount) && (
                    <div>
                      <span className="text-[var(--foreground-muted)] text-[10px] uppercase font-bold block">
                        Discount code
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(order.couponDiscount || 0)}{" "}
                        <span className="text-[10px] opacity-80">{order.couponCode}</span>
                      </span>
                    </div>
                  )}
                  {Boolean(order.pointsDiscount) && (
                    <div>
                      <span className="text-[var(--foreground-muted)] text-[10px] uppercase font-bold block">
                        Points Saved
                      </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPrice(order.pointsDiscount || 0)} ({order.pointsRedeemed} pts)
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-[var(--foreground-muted)] text-[10px] uppercase font-bold block">
                      Shipping Method
                    </span>
                    <span className="font-semibold text-[var(--foreground)] opacity-90">
                      {shippingMethodLabel(order.shippingMethod)}
                    </span>
                  </div>
                  {order.estimatedDelivery && (
                    <div>
                      <span className="text-[var(--foreground-muted)] text-[10px] uppercase font-bold block">
                        Est. Delivery
                      </span>
                      <span className="font-semibold text-[var(--foreground)] opacity-90">
                        {order.estimatedDelivery}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Status Badge */}
                  <OrderStatusBadge status={order.status} pulse={order.status === "Shipped"} />

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadInvoice(order)}
                    isDisabled={downloadingOrderId === order.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-alt)] text-xs font-semibold text-[var(--foreground)] transition-colors cursor-pointer h-8 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Download
                      className={`w-3.5 h-3.5 ${
                        downloadingOrderId === order.id ? "animate-pulse" : ""
                      }`}
                    />
                    <span className="hidden sm:inline">
                      {downloadingOrderId === order.id ? "Preparing" : "Invoice"}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Order Items List */}
              <div className="p-4 sm:p-5 space-y-4">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)] last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="relative w-16 h-16 rounded-xl bg-[var(--surface-alt)] p-1.5 border border-[var(--border-color)] shrink-0 overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/shop/${item.slug}`}
                          className="text-xs sm:text-sm font-bold text-[var(--foreground)] hover:text-primary transition-colors line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                          Qty: {item.quantity} • {formatPrice(item.price)} each
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {isProductOutOfStock(item) && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                          Out of Stock
                        </span>
                      )}
                      {/* Claim sits first; revealed on delivery, exactly like Review. */}
                      {isDeliveredOrder(order) && item.warranty && (
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() =>
                            openWarrantyModal(item.warranty!, item, order.orderNumber)
                          }
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer h-8 ${
                            canClaim(item.warranty)
                              ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              : "border-[var(--border-color)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)]"
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Claim</span>
                        </Button>
                      )}

                      <Button
                        size="sm"
                        isDisabled={loadingItemId === item.id}
                        onClick={() => handleBuyAgain(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer h-8 ${
                          isProductOutOfStock(item)
                            ? "bg-rose-50/80 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200/80 dark:border-rose-900/40"
                            : "bg-[var(--surface-alt)] hover:bg-[var(--surface-alt)]/80 text-[var(--foreground)] border border-[var(--border-color)]"
                        }`}
                      >
                        <RotateCcw className={`w-3.5 h-3.5 ${loadingItemId === item.id ? "animate-spin" : ""}`} />
                        <span>{loadingItemId === item.id ? "Adding..." : "Buy Again"}</span>
                      </Button>

                      {isDeliveredOrder(order) && (
                        <Link
                          href={`/shop/${item.slug}#reviews`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-xs font-semibold transition-colors h-8 flex items-center"
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Customer Delivery Response Banner (Available when Shipped) ── */}
              {((order.status === "Shipped" || order.rawStatus === "shipped") || order.customerResponse) && (
                <div className="px-4 sm:px-5">
                  {!order.customerResponse ? (
                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 sm:mt-0">
                          <PackageCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-[var(--foreground)]">
                              Shipment in Transit — Response Requested
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary text-white animate-pulse">
                              Action Required
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                            Please submit a response confirming whether you received your package, did not receive it, or want to cancel.
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleOpenResponseModal(order)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer self-start sm:self-auto h-9 shrink-0"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submit Response</span>
                      </Button>
                    </div>
                  ) : (
                    <div
                      className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs ${
                        order.customerResponse === "received"
                          ? "bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-900 dark:text-emerald-200"
                          : order.customerResponse === "not_received"
                          ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200"
                          : "bg-rose-50/80 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            order.customerResponse === "received"
                              ? "bg-emerald-500 text-white"
                              : order.customerResponse === "not_received"
                              ? "bg-amber-500 text-white"
                              : "bg-rose-500 text-white"
                          }`}
                        >
                          {order.customerResponse === "received" && <CheckCircle2 className="w-4 h-4" />}
                          {order.customerResponse === "not_received" && <AlertTriangle className="w-4 h-4" />}
                          {order.customerResponse === "cancelled" && <XCircle className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs">
                              Your Response:{" "}
                              {order.customerResponse === "received"
                                ? "Order Received"
                                : order.customerResponse === "not_received"
                                ? "Order Not Received"
                                : "Order Cancelled"}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-[var(--surface-elevated)]/70 dark:bg-[var(--surface)]/70 border border-current">
                              Admin Notified
                            </span>
                          </div>
                          {order.customerResponseNote && (
                            <p className="text-[11px] text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] mt-0.5 italic">
                              &ldquo;{order.customerResponseNote}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-[var(--foreground-muted)] flex items-center gap-2 self-end sm:self-auto">
                        {order.customerResponseAt && (
                          <span>{formatOrderDateTime(order.customerResponseAt)}</span>
                        )}
                        {order.customerResponse === "not_received" &&
                          (order.status === "Shipped" || order.rawStatus === "shipped") && (
                            <button
                              onClick={() => handleOpenResponseModal(order)}
                              className="text-primary hover:underline font-semibold text-[11px] cursor-pointer ml-1"
                            >
                              Update
                            </button>
                          )}
                        {isResponseLocked(order.customerResponse) && (
                          <span className="italic ml-1">Final — contact support to change</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Order Footer with Tracking CTA */}
              <div className="p-4 sm:p-5 pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[var(--foreground-muted)]">
                <div>
                  <span>Paid with {order.paymentMethod}</span>
                  {order.trackingNumber && (
                    <span className="ml-2 font-mono text-[11px] text-primary">
                      • {order.carrier}: #{order.trackingNumber}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {order.timeline && (
                    <Button
                      size="sm"
                      onClick={() => setTrackingModalOrder(order)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 font-bold transition-colors cursor-pointer h-8 border border-primary/20"
                    >
                      <Truck className="w-4 h-4" />
                      <span>Track Shipment</span>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {filteredOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-[var(--foreground-muted)]">
            Showing{" "}
            <span className="font-bold text-[var(--foreground)]">
              {pageStart + 1}–{Math.min(pageStart + ORDERS_PER_PAGE, filteredOrders.length)}
            </span>{" "}
            of <span className="font-bold text-[var(--foreground)]">{filteredOrders.length}</span> orders
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                isDisabled={currentPage <= 1}
                onPress={() => goToPage(currentPage - 1)}
                className="h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Previous
              </Button>
              <span className="px-1 font-semibold text-[var(--foreground-muted)]">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                isDisabled={currentPage >= totalPages}
                onPress={() => goToPage(currentPage + 1)}
                className="h-9 px-3 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Order Tracking Modal ── */}
      {trackingModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface)]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6 text-[var(--foreground)]">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    Tracking: {trackingModalOrder.orderNumber}
                  </h3>
                  <OrderStatusBadge status={trackingModalOrder.status} size="sm" />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-[var(--foreground-muted)]">
                    {trackingModalOrder.carrier} • #{trackingModalOrder.trackingNumber}
                  </p>
                  {trackingModalOrder.trackingNumber && (
                    <button
                      onClick={() => copyTracking(trackingModalOrder.trackingNumber!)}
                      className="text-primary hover:underline cursor-pointer"
                      title="Copy Tracking #"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                isIconOnly
                variant="ghost"
                onClick={() => setTrackingModalOrder(null)}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] text-sm font-bold p-1 h-8 w-8 min-w-0"
              >
                ✕
              </Button>
            </div>

            {/* Shipping Method + Estimated Delivery */}
            <div className="flex flex-wrap items-center gap-2.5 -mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-alt)] border border-[var(--border-color)] text-[11px] font-bold text-[var(--foreground)]">
                <Truck className="w-3.5 h-3.5 text-primary" />
                {shippingMethodLabel(trackingModalOrder.shippingMethod)}
              </span>
              {trackingModalOrder.estimatedDelivery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-alt)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--foreground-secondary)]">
                  <Calendar className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                  Est. {trackingModalOrder.estimatedDelivery}
                </span>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-4 py-2">
              {trackingModalOrder.timeline.map((step, idx) => (
                <div key={idx} className="flex gap-4 items-start relative">
                  {idx !== trackingModalOrder.timeline.length - 1 && (
                    <div
                      className={`absolute left-3.5 top-7 w-0.5 h-10 ${
                        step.completed ? "bg-primary" : "bg-[var(--border-color)]"
                      }`}
                    />
                  )}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      step.completed
                        ? "bg-primary text-white shadow-xs"
                        : step.current
                          ? "bg-amber-400 text-amber-950 ring-4 ring-amber-100 dark:ring-amber-950/60 animate-pulse"
                          : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border border-[var(--border-color)]"
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[var(--foreground)]">
                        {step.title}
                      </p>
                      <span className="text-[10px] text-[var(--foreground-muted)] font-medium">
                        {step.date}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-[var(--foreground-muted)]">
                <span>Shipping to: </span>
                <span className="font-semibold text-[var(--foreground)] block sm:inline">
                  {trackingModalOrder.shippingAddress}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* The stepper above is the order's own story; this is the map
                    with the rider carrying it, which only the live page has. */}
                <Link
                  href={`/track-order/${trackingModalOrder.id}`}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] font-bold transition-colors hover:text-primary"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Live map &amp; rider
                </Link>
                <Button
                  onClick={() => setTrackingModalOrder(null)}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all cursor-pointer shrink-0 h-9"
                >
                  Close
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Order Delivery Response Modal ── */}
      {responseModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--surface)]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-[var(--foreground)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                  <span>Order Delivery Feedback</span>
                  <span className="text-xs font-mono text-primary">
                    {responseModalOrder.orderNumber}
                  </span>
                </h3>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  Let the store know if you received this package or have an issue.
                </p>
              </div>
              <Button
                size="sm"
                isIconOnly
                variant="ghost"
                onClick={() => setResponseModalOrder(null)}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] dark:hover:text-[var(--foreground)] text-sm font-bold p-1 h-8 w-8 min-w-0"
              >
                ✕
              </Button>
            </div>

            {/* Response Options */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--foreground)] block">
                Select Your Delivery Status:
              </label>

              {/* Option 1: Received */}
              <div
                onClick={() => setSelectedResponse("received")}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                  selectedResponse === "received"
                    ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                    : "border-[var(--border-color)] dark:border-[var(--border-color)] hover:border-[var(--border-color)] dark:hover:border-[var(--border-color)] bg-[var(--surface-elevated)]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedResponse === "received"
                      ? "bg-emerald-500 text-white"
                      : "bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[var(--foreground)]">
                      Order Received
                    </p>
                    <input
                      type="radio"
                      name="orderResponse"
                      checked={selectedResponse === "received"}
                      onChange={() => setSelectedResponse("received")}
                      className="accent-emerald-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                    I have received my package safely with all items in good condition.
                  </p>
                </div>
              </div>

              {/* Option 2: Not Received */}
              <div
                onClick={() => setSelectedResponse("not_received")}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                  selectedResponse === "not_received"
                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs"
                    : "border-[var(--border-color)] dark:border-[var(--border-color)] hover:border-[var(--border-color)] dark:hover:border-[var(--border-color)] bg-[var(--surface-elevated)]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedResponse === "not_received"
                      ? "bg-amber-500 text-white"
                      : "bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[var(--foreground)]">
                      Order Not Received
                    </p>
                    <input
                      type="radio"
                      name="orderResponse"
                      checked={selectedResponse === "not_received"}
                      onChange={() => setSelectedResponse("not_received")}
                      className="accent-amber-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                    The shipment has not arrived yet, courier was unavailable, or delivery failed.
                  </p>
                </div>
              </div>

              {/* Option 3: Cancelled / Return */}
              <div
                onClick={() => setSelectedResponse("cancelled")}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                  selectedResponse === "cancelled"
                    ? "border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs"
                    : "border-[var(--border-color)] dark:border-[var(--border-color)] hover:border-[var(--border-color)] dark:hover:border-[var(--border-color)] bg-[var(--surface-elevated)]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedResponse === "cancelled"
                      ? "bg-rose-500 text-white"
                      : "bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[var(--foreground)]">
                      Cancel Order / Reject Delivery
                    </p>
                    <input
                      type="radio"
                      name="orderResponse"
                      checked={selectedResponse === "cancelled"}
                      onChange={() => setSelectedResponse("cancelled")}
                      className="accent-rose-600 cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                    I want to reject the parcel, request return, or cancel this shipment.
                  </p>
                </div>
              </div>
            </div>

            {/* Optional Note / Remarks */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--foreground)] flex items-center justify-between">
                <span>Notes or Details (Optional):</span>
                <span className="text-[10px] text-[var(--foreground-muted)] font-normal">Visible to store admin</span>
              </label>
              <textarea
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                rows={3}
                placeholder={
                  selectedResponse === "received"
                    ? "e.g., Everything arrived in perfect condition, thank you!"
                    : selectedResponse === "not_received"
                    ? "e.g., Courier contacted me earlier but didn't show up today..."
                    : "e.g., Need to cancel due to damaged box or wrong timing..."
                }
                className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-xs text-[var(--foreground)] focus:outline-hidden focus:border-primary resize-none shadow-xs"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-end gap-2.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setResponseModalOrder(null)}
                isDisabled={isSubmittingResponse}
                className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer h-9 text-[var(--foreground)] border-[var(--border-color)]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitResponse}
                isDisabled={isSubmittingResponse}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 cursor-pointer h-9"
              >
                {isSubmittingResponse ? "Submitting..." : "Submit Response"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Warranty Detail & Claim Modal */}
      <Modal isOpen={isWarrantyModalOpen} onOpenChange={setIsWarrantyModalOpen}>
        {/*
          Never put onClick on Modal.Backdrop: it is the react-aria overlay that
          WRAPS the dialog, so clicks inside the form bubble up and close the
          modal. Outside-click dismissal is already built in; we only switch it
          off while a claim is uploading or being submitted so typed text is
          not lost.
        */}
        <Modal.Backdrop isDismissable={!isSubmittingClaim && !isUploading}>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-[var(--foreground)]">
                      Warranty Details
                    </h2>
                    <p className="text-[11px] text-[var(--foreground-muted)] truncate">
                      {selectedWarrantyItem?.name || selectedWarranty?.product?.title || "Order item"}
                      {selectedWarrantyOrderNumber ? ` • ${selectedWarrantyOrderNumber}` : ""}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsWarrantyModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[var(--surface-alt)] transition-colors cursor-pointer text-[var(--foreground-muted)]"
                  aria-label="Close warranty details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedWarranty ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <WarrantyStatusBadge warranty={selectedWarranty} />
                    {selectedWarranty.status === "active" && activeWarrantyDaysLeft !== null && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground-muted)]">
                        <Clock className="w-3.5 h-3.5" />
                        {activeWarrantyDaysLeft > 0
                          ? `${activeWarrantyDaysLeft} day${activeWarrantyDaysLeft === 1 ? "" : "s"} remaining`
                          : "Expired"}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <WarrantyDetail
                      label="Duration"
                      value={`${formatWarrantyDuration(
                        totalCoverageMonths(
                          coverageOf(selectedWarranty).months,
                          selectedWarranty.extensions
                        )
                      )}${
                        selectedWarranty.extensions?.length
                          ? ` (+${formatWarrantyDuration(
                              totalCoverageMonths(0, selectedWarranty.extensions)
                            )} extended)`
                          : ""
                      }`}
                    />
                    <WarrantyDetail
                      label="Type"
                      value={warrantyTypeLabel(coverageOf(selectedWarranty).type)}
                    />
                    <WarrantyDetail
                      label="Activated"
                      value={formatWarrantyDate(selectedWarranty.activationDate)}
                    />
                    <WarrantyDetail
                      label="Expires"
                      value={formatWarrantyDate(selectedWarranty.expiryDate)}
                    />
                  </div>

                  {/* Who carries the repair, in the same words the store uses
                      internally, so the customer knows where to turn. */}
                  <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                    <span className="font-semibold text-[var(--foreground)]">
                      Covered by {warrantyTypeInfo(coverageOf(selectedWarranty).type).coveredBy}.
                    </span>{" "}
                    {warrantyTypeInfo(coverageOf(selectedWarranty).type).customerAction}
                  </p>

                  {/* Extra months the store has granted, shown so an extended
                      date never appears without an explanation. */}
                  {!!selectedWarranty.extensions?.length && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
                      <p className="text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-300">
                        Extended by the store{" "}
                        <span className="font-semibold normal-case">
                          ({extensionUsageText(selectedWarranty.extensions.length)})
                        </span>
                      </p>
                      {selectedWarranty.extensions.map((entry, i) => (
                        <p
                          key={i}
                          className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed"
                        >
                          +{formatWarrantyDuration(entry.months)} on{" "}
                          {formatWarrantyDate(entry.createdAt)} — now valid until{" "}
                          {formatWarrantyDate(entry.newExpiryDate)}
                          {entry.reason ? `. ${entry.reason}` : "."}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] space-y-1">
                    <p className="text-[10px] font-bold uppercase text-[var(--foreground-muted)]">
                      Warranty Terms
                    </p>
                    {/* Shown even when the product has no terms, so the customer
                        always knows what is covered before claiming. */}
                    <p className="text-[11px] leading-relaxed text-[var(--foreground-muted)] whitespace-pre-line">
                      {selectedWarranty.product?.warrantyTerms ||
                        selectedWarranty.warrantyTerms ||
                        "Covers manufacturing defects within the warranty period. Keep your order number as proof of purchase."}
                    </p>
                  </div>

                  {(selectedWarranty.claimProblem ||
                    selectedWarranty.claimReason ||
                    selectedWarranty.claimDescription) && (
                    <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)] space-y-2">
                      <p className="text-[10px] font-bold uppercase text-[var(--foreground-muted)]">
                        Your submitted claim
                      </p>
                      {selectedWarranty.claimProblem && (
                        <p className="text-xs text-[var(--foreground)]">
                          <span className="font-semibold">Problem: </span>
                          {claimProblemLabel(selectedWarranty.claimProblem)}
                        </p>
                      )}
                      {selectedWarranty.claimReason && (
                        <p className="text-xs text-[var(--foreground)]">
                          <span className="font-semibold">Reason: </span>
                          {selectedWarranty.claimReason}
                        </p>
                      )}
                      {selectedWarranty.claimDescription && (
                        <p className="text-xs text-[var(--foreground-muted)] whitespace-pre-line">
                          {selectedWarranty.claimDescription}
                        </p>
                      )}
                      {!!selectedWarranty.claimImages?.length && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {selectedWarranty.claimImages.map((img, i) => (
                            <a
                              key={i}
                              href={img}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-14 h-14 rounded-lg overflow-hidden border border-[var(--border-color)] bg-white"
                            >
                              <img
                                src={img}
                                alt={`Claim evidence ${i + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedWarranty.claimAdminNote && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60">
                      <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                        <FileText className="w-3.5 h-3.5" />
                        Note from our team
                      </p>
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        {selectedWarranty.claimAdminNote}
                      </p>
                    </div>
                  )}

                  {selectedWarranty.resolutionDetails && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60">
                      <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolution
                      </p>
                      <p className="text-xs text-emerald-800 dark:text-emerald-300">
                        {selectedWarranty.resolutionDetails}
                      </p>
                    </div>
                  )}

                  {activeWarrantyClaimable ? (
                    <div className="space-y-4 pt-1">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[var(--foreground)]">
                          Claim Reason
                        </label>
                        <Input
                          placeholder="e.g. Defective battery, Not turning on..."
                          value={claimReason}
                          maxLength={200}
                          onChange={(e) => setClaimReason(e.target.value)}
                          className="bg-[var(--surface-alt)]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[var(--foreground)]">
                          Description
                        </label>
                        <TextArea
                          placeholder="Describe the issue in detail..."
                          value={claimDescription}
                          maxLength={2000}
                          onChange={(e) => setClaimDescription(e.target.value)}
                          className="bg-[var(--surface-alt)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                            <ImagePlus className="w-4 h-4 text-primary" />
                            Evidence Photos
                          </p>
                          <span className="text-[10px] font-bold text-[var(--foreground-muted)]">
                            {claimImages.length}/5
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 p-3 bg-[var(--surface-alt)] rounded-2xl border border-dashed border-[var(--border-color)]">
                          {claimImages.map((img, i) => (
                            <div
                              key={i}
                              className="w-16 h-16 relative bg-white border border-[var(--border-color)] rounded-xl overflow-hidden group"
                            >
                              <img
                                src={img}
                                className="w-full h-full object-cover"
                                alt={`Evidence ${i + 1}`}
                              />
                              <button
                                onClick={() =>
                                  setClaimImages((prev) => prev.filter((_, idx) => idx !== i))
                                }
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                                aria-label={`Remove evidence ${i + 1}`}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          {claimImages.length < 5 && (
                            <label
                              className={`w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)]/60 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all ${
                                isUploading ? "opacity-50 pointer-events-none" : ""
                              }`}
                            >
                              {isUploading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                              ) : (
                                <ImagePlus className="w-5 h-5 text-[var(--foreground-muted)]" />
                              )}
                              <input
                                type="file"
                                className="hidden"
                                multiple
                                accept="image/*"
                                onChange={handleClaimImageUpload}
                                disabled={isUploading}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-center">
                      <ShieldX className="w-7 h-7 mx-auto mb-2 text-amber-500 dark:text-amber-400" />
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                        {warrantyBlockReason(selectedWarranty)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-center text-xs text-[var(--foreground-muted)]">
                  <ShieldX className="w-7 h-7 mx-auto mb-2 opacity-60" />
                  No warranty record is attached to this item.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <Button
                  variant="ghost"
                  onClick={() => setIsWarrantyModalOpen(false)}
                  className="h-9 px-6 text-xs font-bold rounded-xl cursor-pointer text-[var(--foreground)]"
                >
                  Close
                </Button>
                {activeWarrantyClaimable && (
                  <Button
                    onClick={handleSubmitClaim}
                    isDisabled={
                      isSubmittingClaim ||
                      isUploading ||
                      !claimReason.trim() ||
                      !claimDescription.trim()
                    }
                    className="h-9 px-6 bg-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 cursor-pointer"
                  >
                    {isSubmittingClaim ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Submit Claim"
                    )}
                  </Button>
                )}
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
    </>
  );
}
