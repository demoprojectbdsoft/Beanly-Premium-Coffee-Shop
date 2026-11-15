"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@heroui/react";
import {
  ArrowLeft,
  Package,
  Layers,
  Sparkles,
  DollarSign,
  CheckCircle2,
  XCircle,
  Star,
  Tag,
  Hash,
  Info,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ShoppingBag,
  Boxes,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  UserCheck,
  AlertTriangle,
  Maximize2,
  Shield,
  FileText,
} from "lucide-react";
import ImageGalleryModal from "@/components/shared/ImageGalleryModal";
import { Product } from "@/types";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { isStockTracked } from "@/lib/stock";
import { hasOfferDiscount } from "@/lib/offer";

interface ProductDetailClientProps {
  product: Product;
}

function formatDate(dateValue?: string | Date | null) {
  if (!dateValue) return "—";
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const { formatPrice, currencySymbol } = useSiteSettings();
  const allImages = [
    product.image,
    ...(product.additionalImages || []),
  ].filter(Boolean);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryInitialIndex, setGalleryInitialIndex] = useState(0);

  const openGallery = (index: number) => {
    setGalleryInitialIndex(index >= 0 && index < allImages.length ? index : 0);
    setIsGalleryOpen(true);
  };

  const catName =
    product.categoryId?.name ||
    (product.categories && product.categories[0]) ||
    "Uncategorized";

  // ── Financial & Sales Computations ──────────────────────────
  // Units and money come from the delivered order lines: an old sale keeps the
  // price it was charged at, and a unit returned with its order stops counting.
  const sales = product.sales;
  const sellCount = sales?.units ?? (typeof product.sellCount === "number" ? product.sellCount : 0);
  // A product saved without a stock number is not stock-tracked: it has no units
  // to value, so the stock cards say so instead of showing zeros.
  const stockTracked = isStockTracked(product.stockQuantity);
  const stockQuantity = stockTracked ? (product.stockQuantity as number) : 0;
  const price = typeof product.price === "number" ? product.price : 0;
  const originalPrice = product.originalPrice;
  const investPrice = product.investPrice;

  const hasInvestPrice = investPrice != null && !isNaN(investPrice);
  const unitProfit =
    product.unitProfit ?? (hasInvestPrice ? price - investPrice : null);
  const isUnitProfitable = unitProfit != null && unitProfit > 0;

  // Profit margin %: (Selling Price - Cost) / Selling Price * 100
  const profitMargin =
    product.profitMargin ??
    (hasInvestPrice && price > 0 ? ((price - investPrice) / price) * 100 : null);

  // Markup %: (Selling Price - Cost) / Cost * 100
  const markupPercent =
    hasInvestPrice && investPrice > 0
      ? ((price - investPrice) / investPrice) * 100
      : null;

  // Realized Gross Revenue & Realized Net Profit / Loss
  const totalRevenue = sales?.revenue ?? price * sellCount;
  const totalCost = sales ? sales.cost : hasInvestPrice ? investPrice * sellCount : null;
  const totalProfitLoss = sales
    ? sales.profit
    : hasInvestPrice && unitProfit != null
      ? unitProfit * sellCount
      : null;
  const isTotalProfitable = totalProfitLoss != null && totalProfitLoss > 0;

  // Inventory Valuations
  const inventoryRetailValue = price * stockQuantity;
  const inventoryCostValue = hasInvestPrice ? investPrice * stockQuantity : null;

  // Offer Status — a countdown only runs while the price is really discounted.
  const offerEnd = product.offerEndsAt ?? product.offerEndDate;
  const hasOfferEnd = Boolean(offerEnd);
  const isOfferExpired =
    product.isOfferExpired || (hasOfferEnd && new Date(offerEnd as string).getTime() <= Date.now());
  // A dated offer is one of three things: running with a discount, running at
  // full price (nothing to advertise), or lapsed. The deadline decides.
  const offerDiscountLive =
    !isOfferExpired && hasOfferDiscount(product.price, product.originalPrice);
  const offerRunning = offerDiscountLive;

  // A zero result is break-even, not a loss, and it carries no sign.
  const unitProfitWord =
    unitProfit == null ? "" : unitProfit > 0 ? "Profit" : unitProfit < 0 ? "Loss" : "Break-even";
  const unitProfitSign =
    unitProfit == null || unitProfit === 0 ? "" : unitProfit > 0 ? "+" : "-";
  const totalProfitSign =
    totalProfitLoss == null || totalProfitLoss === 0 ? "" : totalProfitLoss > 0 ? "+" : "-";

  // Warranty Type label (dynamic — never a static string)
  const warrantyTypeLabel =
    product.warrantyType === "seller-warranty"
      ? "Seller Warranty"
      : product.warrantyType === "extended-warranty"
      ? "Extended Warranty"
      : product.warrantyType === "other"
      ? "Other"
      : product.warrantyType === "none"
      ? "No Warranty"
      : "Manufacturer Warranty";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* ── Breadcrumb & Action Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)]">
          <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
            Admin
          </Link>
          <span>/</span>
          <Link href="/dashboard/admin/products" className="hover:text-primary transition-colors">
            Products
          </Link>
          <span>/</span>
          <span className="text-primary font-bold truncate max-w-xs">
            {product.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/shop/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View in Store</span>
          </Link>

          <Link
            href="/dashboard/admin/products"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Products</span>
          </Link>
        </div>
      </div>

      {/* ── Main Product Header & Summary ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[var(--surface-elevated)] p-6 rounded-3xl border border-[var(--border-color)] shadow-xs">
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20">
              <Layers className="w-3.5 h-3.5" />
              {catName}
            </span>

            {!stockTracked ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--surface-alt)] text-[var(--foreground-muted)] border border-[var(--border-color)]">
                <Boxes className="w-3 h-3" />
                Not Tracked
              </span>
            ) : product.inStock ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                <CheckCircle2 className="w-3 h-3" />
                In Stock ({stockQuantity} units)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40">
                <XCircle className="w-3 h-3" />
                Out of Stock
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/40">
              <ShoppingBag className="w-3 h-3" />
              {sellCount} Units Sold
            </span>

            {product.isFeatured && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                <Sparkles className="w-3 h-3" /> Featured Item
              </span>
            )}

            {offerRunning && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${
                  isOfferExpired
                    ? "bg-[var(--surface-alt)] text-gray-500 border-[var(--border-color)]"
                    : "bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border-red-200/60 dark:border-red-800/40"
                }`}
              >
                <Clock className="w-3 h-3" />
                {isOfferExpired ? "Offer Lapsed" : "Active Special Offer"}
              </span>
            )}

            {product.badges?.map((b) => (
              <span
                key={b}
                className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary uppercase tracking-wider border border-primary/20"
              >
                {b}
              </span>
            ))}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            {product.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--foreground-muted)] font-mono">
            {product.sku && <span>SKU: {product.sku}</span>}
            <span>Slug: /{product.slug}</span>
            <span>ID: {product.id || product._id}</span>
            {product.ownerId && <span>Owner: {product.ownerId}</span>}
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="flex md:flex-col items-baseline md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 border-[var(--border-color)] shrink-0">
          <span className="text-[11px] uppercase font-bold text-[var(--foreground-muted)]">Current Selling Price</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[var(--foreground)]">
              {formatPrice(price)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-sm font-semibold text-[var(--foreground-muted)] line-through">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
          {product.discountPercentage ? (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              Save {product.discountPercentage}%
            </span>
          ) : null}
          {hasInvestPrice && (
            <span className="text-[11px] text-[var(--foreground-muted)] mt-1">
              Cost: <strong className="text-[var(--foreground)] font-mono">{formatPrice(investPrice)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          FINANCIAL PERFORMANCE & PROFIT / LOSS DASHBOARD
      ══════════════════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Financial Performance &amp; Profit / Loss Analytics
          </h2>
          <span className="text-xs text-[var(--foreground-muted)] font-medium">
            Based on {sellCount} delivered unit{sellCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Units Sold (Sell Count) */}
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                Total Units Sold
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-[var(--foreground)] font-mono">
                {sellCount}
              </span>
              <span className="ml-1.5 text-xs text-[var(--foreground-muted)] font-semibold">units</span>
            </div>
            <div className="mt-2 text-[11px] text-[var(--foreground-muted)]">
              {sellCount > 0 ? (
                <span>Units purchased across customer orders</span>
              ) : (
                <span>No units sold yet</span>
              )}
            </div>
          </Card>

          {/* 2. Total Gross Sales Revenue */}
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                Total Revenue
              </span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-[var(--foreground)] font-mono">
                {formatPrice(totalRevenue)}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-[var(--foreground-muted)]">
              {sellCount > 0 ? (
                <span>Gross sales from delivered orders</span>
              ) : (
                <span>No delivered orders yet</span>
              )}
            </div>
          </Card>

          {/* 3. Unit Profit / Loss */}
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                Unit Profit / Loss
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  !hasInvestPrice
                    ? "bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
                    : isUnitProfitable
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                }`}
              >
                {!hasInvestPrice ? (
                  <Percent className="w-4 h-4" />
                ) : isUnitProfitable ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
            </div>

            <div className="mt-3">
              {hasInvestPrice && unitProfit != null ? (
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-3xl font-black font-mono ${
                      isUnitProfitable
                        ? "text-emerald-600 dark:text-emerald-400"
                        : unitProfit === 0
                          ? "text-[var(--foreground)]"
                          : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {unitProfitSign}{formatPrice(Math.abs(unitProfit))}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      isUnitProfitable
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                        : unitProfit === 0
                          ? "bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
                          : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    {unitProfitWord}
                  </span>
                </div>
              ) : (
                <span className="text-xl font-bold text-[var(--foreground-muted)] italic">Cost Not Set</span>
              )}
            </div>

            <div className="mt-2 text-[11px] text-[var(--foreground-muted)]">
              {hasInvestPrice && profitMargin != null ? (
                <span>
                  Margin: <strong className="text-[var(--foreground)]">{profitMargin.toFixed(1)}%</strong>
                  {markupPercent != null && (
                    <span className="ml-1 text-[var(--foreground-muted)]">({markupPercent.toFixed(1)}% markup)</span>
                  )}
                </span>
              ) : (
                <span>Set cost price in Quick Edit</span>
              )}
            </div>
          </Card>

          {/* 4. Total Realized Profit / Loss */}
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                Total Realized P/L
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  !hasInvestPrice
                    ? "bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
                    : isTotalProfitable
                    ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                }`}
              >
                {!hasInvestPrice ? (
                  <TrendingUp className="w-4 h-4" />
                ) : isTotalProfitable ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
              </div>
            </div>

            <div className="mt-3">
              {hasInvestPrice && totalProfitLoss != null ? (
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-3xl font-black font-mono ${
                      isTotalProfitable
                        ? "text-emerald-600 dark:text-emerald-400"
                        : totalProfitLoss === 0
                          ? "text-[var(--foreground)]"
                          : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {totalProfitSign}{formatPrice(Math.abs(totalProfitLoss))}
                  </span>
                </div>
              ) : (
                <span className="text-xl font-bold text-[var(--foreground-muted)] italic">—</span>
              )}
            </div>

            <div className="mt-2 text-[11px] text-[var(--foreground-muted)]">
              {hasInvestPrice && totalCost != null ? (
                <span>
                  Total COGS: <strong className="text-[var(--foreground)]">{formatPrice(totalCost)}</strong>
                </span>
              ) : (
                <span>Requires cost price to compute</span>
              )}
            </div>
          </Card>
        </div>

        {/* Financial Breakdown Secondary Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[var(--surface-alt)] rounded-2xl border border-[var(--border-color)] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">Inventory Stock Value</span>
              <span className="text-base font-black text-[var(--foreground)] font-mono">
                {stockTracked ? formatPrice(inventoryRetailValue) : "Not tracked"}
              </span>
              <span className="text-[10px] text-[var(--foreground-muted)] block mt-0.5">
                {stockTracked ? `${stockQuantity} units @ current price` : "No stock count on this product"}
              </span>
            </div>
            <Boxes className="w-6 h-6 text-primary/60" />
          </div>

          <div className="p-4 bg-[var(--surface-alt)] rounded-2xl border border-[var(--border-color)] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">Capital Tied in Stock</span>
              <span className="text-base font-black text-[var(--foreground)] font-mono">
                {!stockTracked
                  ? "Not tracked"
                  : hasInvestPrice && inventoryCostValue != null
                    ? `${currencySymbol}${inventoryCostValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "Cost not set"}
              </span>
              <span className="text-[10px] text-[var(--foreground-muted)] block mt-0.5">
                {!stockTracked
                  ? "No stock count on this product"
                  : hasInvestPrice
                    ? `${stockQuantity} units @ ${formatPrice(investPrice)} cost`
                    : "Add cost price"}
              </span>
            </div>
            <DollarSign className="w-6 h-6 text-emerald-500/60" />
          </div>

          <div className="p-4 bg-[var(--surface-alt)] rounded-2xl border border-[var(--border-color)] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">Promotion &amp; Offer Status</span>
              <span className="text-sm font-bold text-[var(--foreground)] block mt-0.5">
                {offerRunning
                  ? isOfferExpired
                    ? "Lapsed on " + formatDate(product.offerEndDate)
                    : "Ends " + formatDate(product.offerEndDate)
                  : "Standard Pricing"}
              </span>
              <span className="text-[10px] text-[var(--foreground-muted)] block">
                {product.discountPercentage ? `${product.discountPercentage}% active discount` : "No special discount applied"}
              </span>
            </div>
            <Clock className="w-6 h-6 text-amber-500/60" />
          </div>
        </div>
      </div>

      {/* ── Grid: Media + Full Details ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Images Gallery (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-4 overflow-hidden shadow-xs">
            {/* Active Image */}
            <div
              onClick={() => openGallery(activeImageIndex)}
              className="relative w-full aspect-square bg-[var(--surface-alt)] rounded-2xl overflow-hidden border border-[var(--border-color)] cursor-zoom-in group"
            >
              {allImages[activeImageIndex] ? (
                <>
                  <Image
                    src={allImages[activeImageIndex]}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 500px"
                    className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                    unoptimized
                  />
                  {/* Click to Expand Button Badge */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openGallery(activeImageIndex);
                    }}
                    title="Click to expand gallery"
                    className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md border border-white/20 shadow-md transition-all hover:scale-105 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-primary" />
                    <span>View Gallery ({allImages.length})</span>
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--foreground-muted)]">
                  <Package className="w-16 h-16" />
                </div>
              )}
            </div>

            {/* Thumbnail previews */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pt-4">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    onDoubleClick={() => openGallery(idx)}
                    title="Click to preview, double click to expand gallery"
                    className={`relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer bg-[var(--surface-alt)] p-1 ${
                      activeImageIndex === idx
                        ? "border-primary shadow-xs ring-2 ring-primary/20"
                        : "border-[var(--border-color)] hover:border-primary/50 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`Thumb ${idx + 1}`}
                      fill
                      sizes="64px"
                      className="object-contain"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Stats: Ratings & Inventory */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                Customer Rating
              </span>
              <div className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-base font-black text-[var(--foreground)]">
                  {product.rating ?? 0}
                </span>
                <span className="text-xs text-[var(--foreground-muted)]">
                  ({product.reviewCount ?? 0} reviews)
                </span>
              </div>
            </Card>

            <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                Inventory Units
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-black text-[var(--foreground)] font-mono">
                  {stockTracked ? stockQuantity : "—"}
                </span>
                <span className="text-xs text-[var(--foreground-muted)]">
                  {stockTracked ? "in stock" : "not tracked"}
                </span>
              </div>
            </Card>
          </div>

          {/* System & Audit Information */}
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--foreground)] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Audit &amp; System Timestamps
            </h3>

            <div className="space-y-2 text-xs divide-y divide-[var(--border-color)]">
              <div className="flex items-center justify-between pt-1">
                <span className="text-[var(--foreground-muted)]">Created At:</span>
                <span className="font-mono text-[var(--foreground)] font-semibold">
                  {formatDate(product.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[var(--foreground-muted)]">Last Updated:</span>
                <span className="font-mono text-[var(--foreground)] font-semibold">
                  {formatDate(product.updatedAt)}
                </span>
              </div>

              {product.offerEndDate && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[var(--foreground-muted)]">Offer Expiration:</span>
                  <span className="font-mono text-[var(--foreground)] font-semibold">
                    {formatDate(product.offerEndDate)}
                  </span>
                </div>
              )}

              {product.ownerId && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-[var(--foreground-muted)]">Owner User ID:</span>
                  <span className="font-mono text-[var(--foreground)] font-semibold truncate max-w-[160px]">
                    {product.ownerId}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Specifications, Description & Hierarchy (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Description */}
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Product Description
            </h2>
            <div className="text-xs sm:text-sm text-[var(--foreground-muted)] leading-relaxed whitespace-pre-line">
              {product.description || "No product description provided."}
            </div>
          </Card>

          {/* Pricing & Profit Architecture */}
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Complete Pricing &amp; Margin Breakdown
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">Selling Price</span>
                <span className="text-base font-black text-[var(--foreground)] font-mono block mt-0.5">
                  {formatPrice(price)}
                </span>
              </div>

              <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">Original Price (MSRP)</span>
                <span className="text-base font-black text-[var(--foreground)] font-mono block mt-0.5">
                  {originalPrice ? formatPrice(originalPrice) : "—"}
                </span>
              </div>

              <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">Cost / Invest Price</span>
                <span className="text-base font-black text-[var(--foreground)] font-mono block mt-0.5">
                  {hasInvestPrice ? formatPrice(investPrice) : "—"}
                </span>
              </div>

              <div className="p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">Discount %</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono block mt-0.5">
                  {product.discountPercentage ? `${product.discountPercentage}%` : "0%"}
                </span>
              </div>
            </div>
          </Card>

          {/* Technical Specifications */}
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Technical Specifications
            </h2>

            {product.specifications && Object.keys(product.specifications).length > 0 ? (
              <div className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-2xl overflow-hidden text-xs">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div
                    key={key}
                    className="grid grid-cols-3 p-3 bg-[var(--surface-elevated)] even:bg-[var(--surface-alt)]"
                  >
                    <span className="font-semibold text-[var(--foreground-muted)]">
                      {key}
                    </span>
                    <span className="col-span-2 font-medium text-[var(--foreground)]">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[var(--foreground-muted)] italic">
                No technical specifications available for this product.
              </p>
            )}
          </Card>

          {/* Hierarchy & Taxonomy */}
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Categorization &amp; Hierarchy
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                  Primary Category
                </span>
                <p className="font-bold text-[var(--foreground)] text-sm">
                  {catName}
                </p>
                {product.categoryId?.slug && (
                  <span className="text-[11px] font-mono text-[var(--foreground-muted)] block">
                    /{product.categoryId.slug}
                  </span>
                )}
              </div>

              <div className="p-3.5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                  Subcategories
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {product.subCategoryIds && product.subCategoryIds.length > 0 ? (
                    product.subCategoryIds.map((s: any, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20"
                      >
                        {typeof s === "object" ? s.name : s}
                      </span>
                    ))
                  ) : (
                    <span className="text-[var(--foreground-muted)] italic text-[11px]">None assigned</span>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Warranty Coverage */}
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Warranty Coverage
            </h2>

            {product.warrantyPeriodMonths && product.warrantyPeriodMonths > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                    <Shield className="w-3 h-3" />
                    Warranty Enabled
                  </span>
                  <span className="text-sm font-black text-[var(--foreground)]">
                    {product.warrantyPeriodMonths} month{product.warrantyPeriodMonths === 1 ? "" : "s"}
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 uppercase">
                    {warrantyTypeLabel}
                  </span>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                  When a customer buys this product and the order is delivered, a
                  warranty record is automatically created for{" "}
                  <strong className="text-[var(--foreground)]">
                    {product.warrantyPeriodMonths} month{product.warrantyPeriodMonths === 1 ? "" : "s"}
                  </strong>{" "}
                  starting from the delivery date. Customers can submit claims
                  through their dashboard while the warranty is active.
                </p>
                {product.warrantyTerms && (
                  <div className="pt-3 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider mb-1.5">
                      <FileText className="w-3.5 h-3.5" /> Warranty Terms
                    </div>
                    <p className="text-xs text-[var(--foreground-muted)] leading-relaxed whitespace-pre-line">
                      {product.warrantyTerms}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--surface-alt)] text-[var(--foreground-muted)] border border-[var(--border-color)]">
                  <Shield className="w-3 h-3" />
                  No Warranty
                </span>
                <p className="text-xs text-[var(--foreground-muted)]">
                  This product is not covered by warranty. Set a warranty period in
                  Quick Edit to enable coverage.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={allImages}
        initialIndex={galleryInitialIndex}
        productTitle={product.title}
      />
    </div>
  );
}
