"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Copy,
  Check,
  ShoppingBag,
  Truck,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  CreditCard,
  Coins,
  MapPin,
  Calendar,
  Sparkles,
  CircleDot,
  Download,
} from "lucide-react";
import { toast } from "react-toastify";
import { getOrderById } from "@/lib/api/orders";
import { OrderSuccessClientProps, Order, OrderItem, Product } from "@/types";
import { useSiteSettings } from "@/context/SiteSettingsContext";

/**
 * Resilient image renderer for order receipt items.
 * Uses <img> with fallback, referrerPolicy="no-referrer" for reliable CDN/third-party image loading.
 */
function ReceiptItemImage({
  src,
  alt,
}: {
  src?: string | null;
  alt: string;
}) {
  const [hasError, setHasError] = useState(false);
  const validSrc = src && src.trim().length > 0 && !hasError ? src.trim() : null;

  return (
    <div className="relative w-12 h-12 rounded-xl bg-[var(--surface-alt)] overflow-hidden shrink-0 border border-[var(--border-color)] shadow-2xs flex items-center justify-center">
      {validSrc ? (
        <img
          src={validSrc}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
          referrerPolicy="no-referrer"
          loading="eager"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
          <ShoppingBag className="w-5 h-5 opacity-80" />
        </div>
      )}
    </div>
  );
}

export default function OrderSuccessClient({
  orderId,
  initialOrder,
}: OrderSuccessClientProps) {
  const { settings, formatPrice } = useSiteSettings();
  const siteName = settings.siteName || "Sparq";
  const [order, setOrder] = useState<Order | null>(initialOrder || null);
  const [isCopiedId, setIsCopiedId] = useState<boolean>(false);
  const [isCopiedTrx, setIsCopiedTrx] = useState<boolean>(false);
  const [isFetchingOrder, setIsFetchingOrder] = useState<boolean>(!initialOrder);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If order already has items with images, no need to refetch
    const hasItemImages = order?.items?.some(
      (it) => Boolean(it.image) || (typeof it.productId === "object" && Boolean((it.productId as unknown as Product)?.image))
    );

    if (order && (hasItemImages || !orderId)) {
      setIsFetchingOrder(false);
      return;
    }

    // Fallback/refresh: fetch from backend
    const loadOrder = async () => {
      try {
        const res = await getOrderById(orderId);
        if (res?.data) {
          setOrder(res.data as Order);
        } else if (!order) {
          toast.error("Could not load order details. Please check your order history.");
        }
      } catch (err) {
        console.error("Error fetching order:", err);
        if (!order) {
          toast.error("Failed to fetch order details.");
        }
      } finally {
        setIsFetchingOrder(false);
      }
    };
    loadOrder();
  }, [orderId]);

  const handleCopyOrderId = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(orderId);
      setIsCopiedId(true);
      toast.success("Order ID copied to clipboard!");
      setTimeout(() => setIsCopiedId(false), 2000);
    }
  };

  const handleCopyTrxId = () => {
    if (order?.transactionId && typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(order.transactionId);
      setIsCopiedTrx(true);
      toast.success("Transaction ID copied to clipboard!");
      setTimeout(() => setIsCopiedTrx(false), 2000);
    }
  };

  const handleDownloadReceipt = () => {
    const receiptElement = document.getElementById("order-receipt");
    if (!receiptElement) {
      window.print();
      return;
    }

    const printWindow = window.open("", "_blank", "width=850,height=950");
    if (!printWindow) {
      window.print();
      return;
    }

    const stylesheets = Array.from(
      document.querySelectorAll("link[rel='stylesheet'], style")
    )
      .map((el) => el.outerHTML)
      .join("\n");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${siteName}-Receipt-${orderId}</title>
          ${stylesheets}
          <style>
            @page {
              size: auto;
              margin: 10mm;
            }
            body {
              background-color: #ffffff !important;
              color: #0f172a !important;
              padding: 16px;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              justify-content: center;
              overflow: visible !important;
              height: auto !important;
            }
            #order-receipt {
              max-width: 650px;
              width: 100%;
              box-shadow: none !important;
              border: 1px solid #e2e8f0 !important;
              border-radius: 1.5rem !important;
              background: #ffffff !important;
              color: #0f172a !important;
              padding-bottom: 20px;
              overflow: visible !important;
              height: auto !important;
            }
            .print\\:hidden, button, a {
              display: none !important;
            }
            * {
              overflow: visible !important;
              max-height: none !important;
            }
            img {
              max-width: 100%;
              display: block;
            }
          </style>
        </head>
        <body>
          ${receiptElement.outerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.onafterprint = function() {
                  window.close();
                };
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const paymentMethodLabel = (method?: string) => {
    switch (method) {
      case "bkash":
        return {
          name: "bKash Direct",
          badgeBg: "bg-[#E2136E]/10 text-[#E2136E] border-[#E2136E]/30",
          icon: <Smartphone className="w-3.5 h-3.5 text-[#E2136E]" />,
        };
      case "nagad":
        return {
          name: "Nagad Wallet",
          badgeBg: "bg-[#F7941D]/10 text-[#F7941D] border-[#F7941D]/30",
          icon: <CreditCard className="w-3.5 h-3.5 text-[#F7941D]" />,
        };
      case "rocket":
        return {
          name: "Rocket DBBL",
          badgeBg: "bg-[#8C3494]/10 text-[#8C3494] border-[#8C3494]/30",
          icon: <ShieldCheck className="w-3.5 h-3.5 text-[#8C3494]" />,
        };
      case "cod":
      default:
        return {
          name: "Cash on Delivery",
          badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
          icon: <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
        };
    }
  };

  const paymentBadge = paymentMethodLabel(order?.paymentMethod);

  const orderDate = order?.createdAt ? new Date(order.createdAt) : new Date();
  const formattedDate = orderDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Estimated delivery date (3 days from order date)
  const deliveryDate = new Date(orderDate);
  deliveryDate.setDate(deliveryDate.getDate() + 3);
  const formattedDeliveryDate = deliveryDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const getItemImage = (item: OrderItem): string => {
    if (item.image && typeof item.image === "string" && item.image.trim() !== "") {
      return item.image;
    }

    if (typeof item.productId === "object" && item.productId !== null) {
      const prod = item.productId as unknown as Record<string, unknown>;
      if (typeof prod.image === "string" && prod.image.trim() !== "") {
        return prod.image;
      }
      if (Array.isArray(prod.additionalImages) && prod.additionalImages.length > 0 && typeof prod.additionalImages[0] === "string") {
        return prod.additionalImages[0];
      }
      if (Array.isArray(prod.images) && prod.images.length > 0 && typeof prod.images[0] === "string") {
        return prod.images[0];
      }
    }

    if (item.product) {
      if (typeof item.product.image === "string" && item.product.image.trim() !== "") {
        return item.product.image;
      }
      if (Array.isArray(item.product.additionalImages) && item.product.additionalImages.length > 0 && typeof item.product.additionalImages[0] === "string") {
        return item.product.additionalImages[0];
      }
    }

    return "";
  };

  return (
    <div className="py-8 md:py-14 max-w-2xl mx-auto px-4 space-y-8 relative">
      {/* ── Ambient Background Lighting Effects ── */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* ── Loading State ── */}
      {isFetchingOrder ? (
        <div className="text-center space-y-6 py-16">
          <div className="w-16 h-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[var(--foreground-muted)]">
            Loading your order details…
          </p>
        </div>
      ) : !order ? (
        <div className="text-center space-y-4 py-16">
          <p className="text-base font-bold text-[var(--foreground)]">Order not found</p>
          <p className="text-sm text-[var(--foreground-muted)]">
            We couldn&apos;t retrieve order <span className="font-mono font-bold">#{orderId}</span>.
            It may still be processing.
          </p>
          <Link
            href="/dashboard/customer/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm transition-colors"
          >
            My Orders <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* ── Top Celebration Header ── */}
          <div className="text-center space-y-3.5 print:hidden">
            {/* Animated Celebration Badge */}
            <div className="relative inline-flex items-center justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-xl shadow-emerald-500/25 ring-8 ring-emerald-500/10 animate-in fade-in zoom-in duration-500">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 stroke-[2.5]" />
              </div>
              <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center shadow-md animate-bounce">
                <Sparkles className="w-4 h-4 fill-slate-900" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1">
                <CircleDot className="w-2 h-2 fill-emerald-500 animate-pulse text-emerald-500" />
                Order Placed &amp; Processing
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-[var(--foreground)]">
                Thank You for Your Order!
              </h1>
              <p className="text-xs sm:text-sm text-[var(--foreground-muted)] max-w-md mx-auto">
                Your package has entered fulfillment and is scheduled for fast delivery by{" "}
                <span className="font-bold text-[var(--foreground)]">
                  {formattedDeliveryDate}
                </span>.
              </p>
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════
              BESPOKE DIGITAL RECEIPT TICKET (VINTAGE TICKET MOTIF)
          ════════════════════════════════════════════════════════ */}
          <div
            ref={receiptRef}
            id="order-receipt"
            className="relative bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden print:border-none print:shadow-none print:p-0 print:m-0"
          >
            {/* Top Decorative Gradient Line */}
            <div className="h-2 w-full bg-gradient-primary" />

            {/* ── Section A: Header & Meta ── */}
            <div className="p-6 sm:p-8 pb-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black tracking-tight text-gradient-primary">
                      {siteName.toUpperCase()}
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-primary/10 text-primary tracking-wider uppercase border border-primary/20">
                      Tax Invoice
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--foreground-muted)] font-medium">
                    Official Purchase Receipt &amp; Warranty Certificate
                  </p>
                </div>

                {/* Order Reference Badge & Actions */}
                <div className="flex flex-col sm:items-end gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-xs font-mono font-bold text-[var(--foreground)]">
                    <span>#{orderId}</span>
                    <button
                      type="button"
                      onClick={handleCopyOrderId}
                      className="hover:text-primary transition-colors p-0.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] print:hidden cursor-pointer"
                      title="Copy Order ID"
                    >
                      {isCopiedId ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadReceipt}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-[11px] shadow-xs transition-colors cursor-pointer print:hidden"
                      title="Download or Print Receipt"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download Receipt
                    </button>

                    <p className="text-[10px] text-[var(--foreground-muted)] flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-[var(--foreground-muted)]" />
                      {formattedDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mini Live Order Status Tracker */}
              <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="font-bold text-[var(--foreground)] text-xs">
                      Status:{" "}
                      {order?.orderStatus
                        ? order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1)
                        : "Processing"}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-primary flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5" />
                    Est. Delivery: {formattedDeliveryDate}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Perforated Tear Line with Notches ── */}
            <div className="relative flex items-center my-1 print:hidden">
              {/* Left Notch */}
              <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-950 -ml-3 border-r border-slate-200/90 dark:border-slate-800/90 shadow-inner" />
              {/* Dashed Line */}
              <div className="flex-1 border-b-2 border-dashed border-slate-200 dark:border-slate-700 mx-1" />
              {/* Right Notch */}
              <div className="w-6 h-6 rounded-full bg-slate-50 dark:bg-slate-950 -mr-3 border-l border-slate-200/90 dark:border-slate-800/90 shadow-inner" />
            </div>

            {/* ── Section B: Shipping & Payment Cards ── */}
            <div className="p-6 sm:p-8 pt-4 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Delivery Destination */}
                <div className="p-4 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-xs space-y-2">
                  <div className="flex items-center gap-1.5 text-[var(--foreground-muted)] font-bold uppercase tracking-wider text-[10px]">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    Shipping Destination
                  </div>
                  <div>
                    <p className="font-bold text-[var(--foreground)] text-sm">
                      {order?.shippingAddress?.fullName || "Valued Customer"}
                    </p>
                    <p className="text-[var(--foreground-muted)] font-medium text-[11px] mt-0.5">
                      📞 {order?.shippingAddress?.phone || "Phone on file"}
                    </p>
                    <p className="text-[var(--foreground-muted)] text-[11px] mt-1 leading-relaxed">
                      {order?.shippingAddress?.address ? (
                        <>
                          {order.shippingAddress.address}, {order.shippingAddress.city} - {order.shippingAddress.postalCode}
                        </>
                      ) : (
                        "Standard Registered Delivery Address"
                      )}
                    </p>
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="p-4 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-xs space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-primary" />
                      Payment Details
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Authorized
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-bold text-xs text-[var(--foreground)] bg-[var(--surface-elevated)] border-[var(--border-color)]">
                        {paymentBadge.icon}
                        {paymentBadge.name}
                      </div>

                      {/* Payment status badge from transaction record */}
                      {order?.paymentStatus && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            order.paymentStatus === "success"
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                              : order.paymentStatus === "failed"
                              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                              : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                          }`}
                        >
                          {order.paymentStatus.charAt(0).toUpperCase() + order.paymentStatus.slice(1)}
                        </span>
                      )}
                    </div>

                    {order?.transactionId && order.paymentMethod !== "cod" ? (
                      <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-primary/10 border border-primary/20">
                        <span className="text-[10px] text-primary font-medium">Trx ID:</span>
                        <span className="font-mono font-bold text-[11px] text-primary flex items-center gap-1">
                          {order.transactionId}
                          <button
                            type="button"
                            onClick={handleCopyTrxId}
                            className="hover:text-primary p-0.5 print:hidden cursor-pointer"
                            title="Copy Trx ID"
                          >
                            {isCopiedTrx ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-[var(--foreground-muted)] mt-2">
                        Payment collection upon parcel receipt at doorstep.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Purchased Items Table (Full List - No Scroll Limit) ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider px-1 pb-1 border-b border-[var(--border-color)]">
                  <span>Item &amp; Specification</span>
                  <span>Total Price</span>
                </div>

                <div className="divide-y divide-[var(--border-color)]">
                  {order?.items && order.items.length > 0 ? (
                    order.items.map((item, idx) => {
                      const productObj =
                        typeof item.productId === "object" && item.productId !== null
                          ? (item.productId as unknown as Product)
                          : null;
                      const title =
                        item.title ||
                        productObj?.title ||
                        item.product?.title ||
                        `Item #${idx + 1}`;
                      const price = Number(
                        item.price ?? productObj?.price ?? item.product?.price ?? 0
                      );
                      const image = getItemImage(item);
                      const total =
                        item.lineTotal ?? price * (item.quantity || 1);

                      return (
                        <div
                          key={idx}
                          className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <ReceiptItemImage src={image} alt={title} />
                            <div className="min-w-0">
                              <p className="font-bold text-[var(--foreground)] truncate text-xs sm:text-sm">
                                {title}
                              </p>
                              <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                                Unit: {formatPrice(price)} × Qty:{" "}
                                <span className="font-bold text-[var(--foreground)]">
                                  {item.quantity}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-bold text-[var(--foreground)] text-xs sm:text-sm">
                              {formatPrice(total)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-4 text-center text-xs text-[var(--foreground-muted)]">
                      Items verified and recorded.
                    </div>
                  )}
                </div>
              </div>

              {/* ── Financial Breakdown ── */}
              <div className="pt-4 border-t-2 border-[var(--border-color)] space-y-2.5 text-xs text-[var(--foreground-muted)]">
                <div className="flex items-center justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-bold text-[var(--foreground)]">
                    {formatPrice(order?.subtotal || order?.totalAmount || 0)}
                  </span>
                </div>

                {/* The code comes off the subtotal, so it is read before the fee */}
                {(order?.couponDiscount ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>
                      Discount Code
                      {order?.couponCode ? ` · ${order.couponCode}` : ""}
                    </span>
                    <span className="font-bold">
                      -{formatPrice(order?.couponDiscount || 0)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span>Delivery &amp; Shipping Fee</span>
                  <span className="font-bold text-[var(--foreground)]">
                    {order?.shippingFee === 0 || !order?.shippingFee ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        FREE DELIVERY
                      </span>
                    ) : (
                      formatPrice(order.shippingFee)
                    )}
                  </span>
                </div>

                {(order?.pointsDiscount ?? 0) > 0 && (
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Reward Points Redeemed</span>
                    <span className="font-bold">
                      -{formatPrice(order?.pointsDiscount || 0)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span>Estimated Tax &amp; VAT</span>
                  <span className="text-[var(--foreground-muted)] text-[11px]">Included in total (0% extra)</span>
                </div>

                {/* Grand Total Highlight */}
                <div className="pt-4 border-t-2 border-dashed border-[var(--border-color)] flex items-baseline justify-between">
                  <div>
                    <span className="text-base font-black text-[var(--foreground)]">
                      Total Paid / Payable
                    </span>
                    <p className="text-[10px] text-[var(--foreground-muted)]">
                      Official Authorized Invoice Total
                    </p>
                  </div>
                  <span className="text-2xl sm:text-3xl font-black text-gradient-primary">
                    {formatPrice(order?.totalAmount || 0)}
                  </span>
                </div>

                {(order?.pointsEarned ?? 0) > 0 && (
                  <p className="text-[10px] text-[var(--foreground-muted)]">
                    You will earn{" "}
                    <span className="font-bold text-amber-600 dark:text-amber-400">
                      {order?.pointsEarned} points
                    </span>{" "}
                    once this order is delivered.
                  </p>
                )}
              </div>

              {/* ── Security Stamp & Barcode Footer ── */}
              <div className="pt-6 border-t border-[var(--border-color)] flex flex-col items-center justify-center space-y-3">
                {/* Realistic Barcode Generator */}
                <div className="flex items-center justify-center gap-1 opacity-70">
                  {[3, 1, 5, 2, 4, 1, 6, 2, 3, 5, 1, 4, 2, 6, 3, 1, 5, 2, 4, 1, 6, 2, 3, 5, 1, 4, 2].map((h, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[var(--foreground)] rounded-2xs"
                      style={{ height: `${h * 3.5 + 8}px` }}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 text-[10px] text-[var(--foreground-muted)] font-mono text-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>OFFICIAL {siteName.toUpperCase()} VERIFIED DIGITAL RECEIPT • #{orderId}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Quick Navigation Action Buttons ── */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 print:hidden">

            <Link
              href="/shop"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-extrabold text-xs shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              Continue Shopping
            </Link>

            <Link
              href={`/track-order/${orderId}`}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-alt)] text-[var(--foreground)] font-bold text-xs border border-[var(--border-color)] transition-colors text-center flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Truck className="w-4 h-4 text-primary" />
              Track Order Live
            </Link>

            <Link
              href="/dashboard/customer/orders"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[var(--surface-elevated)] hover:bg-[var(--surface-alt)] text-[var(--foreground)] font-bold text-xs border border-[var(--border-color)] transition-colors text-center flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              My Orders
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
