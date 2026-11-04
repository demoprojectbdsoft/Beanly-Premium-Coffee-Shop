"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeftRight,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  ShoppingBag,
  Star,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import { COMPARE_LIMIT, useCompare, type CompareProduct } from "@/lib/compare";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { addToCart } from "@/lib/action/cart";
import { isProductOutOfStock, unitsLeft } from "@/lib/stock";

// ── Small helpers ───────────────────────────────────────────────────────────

function discountOf(item: CompareProduct): number {
  if (item.discountPercentage) return item.discountPercentage;
  if (!item.originalPrice || item.originalPrice <= item.price) return 0;
  return Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100);
}

function warrantyLabel(item: CompareProduct): string {
  if (!item.warrantyPeriodMonths) return "No warranty";

  const months = item.warrantyPeriodMonths;
  const period =
    months % 12 === 0 ? `${months / 12} year${months > 12 ? "s" : ""}` : `${months} months`;

  const type = item.warrantyType
    ? item.warrantyType.replace(/-/g, " ").replace(/\bwarranty\b/i, "").trim()
    : "";

  return type ? `${period} (${type})` : period;
}

/** Spec keys are free text, so look for a brand-ish key instead of assuming one. */
function brandOf(item: CompareProduct): string {
  const entry = Object.entries(item.specifications).find(([key]) =>
    /brand|manufacturer|make/i.test(key)
  );
  return entry ? entry[1] : "—";
}

const DASH = "—";

// ── Component ───────────────────────────────────────────────────────────────

export default function CompareClient() {
  const { items, count, isFull, remove, clear } = useCompare();
  const { formatPrice } = useSiteSettings();
  const [addingId, setAddingId] = useState<string | null>(null);

  // Every specification key used by at least one product becomes a table row.
  // Brand-ish keys are skipped here because the dedicated "Brand" row already
  // surfaces them through brandOf, so listing them again would show brand twice.
  const specKeys = Array.from(
    new Set(items.flatMap((item) => Object.keys(item.specifications || {})))
  )
    .filter((key) => !/brand|manufacturer|make/i.test(key))
    .sort();

  // With two or more products, mark the cheapest price so it is easy to spot.
  const cheapestId =
    items.length > 1
      ? items.reduce((cheapest, item) => (item.price < cheapest.price ? item : cheapest)).id
      : null;

  const handleRemove = (item: CompareProduct) => {
    remove(item.id);
    toast.info(`"${item.title}" removed from compare.`);
  };

  const handleClear = () => {
    clear();
    toast.info("Compare list cleared.");
  };

  const handleAddToCart = async (item: CompareProduct) => {
    setAddingId(item.id);
    try {
      const res = await addToCart(item.id, 1);
      if (res?.success === false) {
        toast.error(res?.message || "Could not add this product to the cart.");
        return;
      }
      toast.success(`"${item.title}" added to your cart!`);
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch {
      toast.error("Could not add this product to the cart.");
    } finally {
      setAddingId(null);
    }
  };

  // ── Rows shown in the table (label + how each column renders it) ──
  const rows: Array<{ label: string; render: (item: CompareProduct) => ReactNode }> = [
    {
      label: "Price",
      render: (item) => {
        const discount = discountOf(item);
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="font-black text-base text-[var(--foreground)]">
                {formatPrice(item.price)}
              </span>
              {item.id === cheapestId && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold border border-emerald-500/20">
                  Lowest
                </span>
              )}
            </div>
            {item.originalPrice && discount > 0 && (
              <div className="flex items-center justify-center gap-1.5 text-[11px]">
                <span className="line-through text-[var(--foreground-muted)]">
                  {formatPrice(item.originalPrice)}
                </span>
                <span className="text-rose-500 font-bold">-{discount}%</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      label: "Availability",
      // A product with no stock count is not tracked, so it is always in stock.
      render: (item) => {
        const left = unitsLeft(item.stockQuantity);
        return isProductOutOfStock(item) ? (
          <span className="inline-flex items-center gap-1 text-rose-500 text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" /> Out of stock
          </span>
        ) : (
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> In stock
            </span>
            {left !== null && left > 0 && (
              <p className="text-[10px] text-[var(--foreground-muted)]">
                {left} available
              </p>
            )}
          </div>
        );
      },
    },
    {
      label: "Rating",
      render: (item) => (
        <div className="flex items-center justify-center gap-1 text-xs">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="font-bold text-[var(--foreground)]">
            {item.rating ? item.rating.toFixed(1) : "0.0"}
          </span>
          <span className="text-[var(--foreground-muted)]">({item.reviewCount || 0})</span>
        </div>
      ),
    },
    {
      label: "Category",
      render: (item) => (
        <span className="text-xs text-[var(--foreground)]">
          {item.categories.length > 0 ? item.categories.join(" / ") : DASH}
        </span>
      ),
    },
    {
      label: "Brand",
      render: (item) => <span className="text-xs text-[var(--foreground)]">{brandOf(item)}</span>,
    },
    {
      label: "Warranty",
      render: (item) => <span className="text-xs text-[var(--foreground)]">{warrantyLabel(item)}</span>,
    },
    {
      label: "Product code",
      render: (item) => (
        <span className="text-xs text-[var(--foreground-muted)]">{item.sku || DASH}</span>
      ),
    },
    ...specKeys.map((key) => ({
      label: key,
      render: (item: CompareProduct) => (
        <span className="text-xs text-[var(--foreground)]">{item.specifications[key] || DASH}</span>
      ),
    })),
    {
      label: "Description",
      render: (item) => (
        <p className="text-xs text-[var(--foreground-muted)] line-clamp-4 text-left">
          {item.description || "No description provided."}
        </p>
      ),
    },
  ];

  return (
    <div className="py-6 sm:py-8">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-[var(--foreground-muted)]">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Compare</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)] flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-primary" />
            Compare{" "}
            <span className="text-gradient-primary">Products</span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Put up to {COMPARE_LIMIT} products side by side and pick the best one.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-3 py-1.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[11px] font-bold text-[var(--foreground)]">
            {count} of {COMPARE_LIMIT}
          </span>

          {count > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] text-[11px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear all
            </button>
          )}

          <Link
            href="/shop"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-[11px] font-bold shadow-md shadow-primary/20 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add product
          </Link>
        </div>
      </div>

      {/* ── Empty state ── */}
      {count === 0 ? (
        <div className="flex flex-col items-center justify-center text-center gap-4 py-16 px-6 rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--surface-elevated)]">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <ArrowLeftRight className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Nothing to compare yet
            </h2>
            <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1 max-w-md">
              Open any product and press the compare button (or hover a product card and click the
              arrows icon). Add up to {COMPARE_LIMIT} products to see their price, rating, warranty
              and specifications side by side.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Browse products
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-xs">
          <table className="w-full border-collapse min-w-[680px]">
            <thead>
              <tr>
                {/* Label column */}
                <th className="sticky left-0 z-10 bg-[var(--surface-elevated)] w-[140px] sm:w-[170px] p-3 text-left text-[10px] uppercase tracking-wider font-extrabold text-[var(--foreground-muted)] align-bottom">
                  Product
                </th>

                {items.map((item) => (
                  <th
                    key={item.id}
                    className="p-3 align-top border-l border-[var(--border-color)] min-w-[190px]"
                  >
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        aria-label={`Remove ${item.title} from compare`}
                        className="absolute -top-1 -right-1 z-10 w-6 h-6 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-color)] text-[var(--foreground-muted)] hover:text-rose-500 hover:border-rose-300 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <Link href={`/shop/${item.slug}`} className="block group">
                        <div className="relative w-full h-28 sm:h-32 rounded-xl overflow-hidden bg-[var(--surface-alt)] border border-[var(--border-color)]/60">
                          <Image
                            src={item.image}
                            alt={item.title}
                            fill
                            sizes="200px"
                            className="object-contain transition-transform duration-300 group-hover:scale-105"
                          />
                        </div>
                        <p className="mt-2 text-xs font-bold text-[var(--foreground)] group-hover:text-primary transition-colors line-clamp-2 text-left">
                          {item.title}
                        </p>
                      </Link>
                    </div>
                  </th>
                ))}

                {/* Empty slot that invites the 2nd / 3rd product */}
                {!isFull && (
                  <th className="p-3 border-l border-[var(--border-color)] align-middle min-w-[190px]">
                    <Link
                      href="/shop"
                      className="flex flex-col items-center justify-center gap-2 h-36 rounded-xl border border-dashed border-[var(--border-color)] text-[var(--foreground-muted)] hover:text-primary hover:border-primary/50 transition-colors"
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-[11px] font-bold">Add product</span>
                      <span className="text-[10px]">
                        {COMPARE_LIMIT - count} slot{COMPARE_LIMIT - count === 1 ? "" : "s"} left
                      </span>
                    </Link>
                  </th>
                )}
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-[var(--border-color)]">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-[var(--surface-elevated)] p-3 text-left align-middle text-[11px] font-bold text-[var(--foreground-muted)]"
                  >
                    {row.label}
                  </th>

                  {items.map((item) => (
                    <td
                      key={`${row.label}-${item.id}`}
                      className="p-3 border-l border-[var(--border-color)] align-middle text-center"
                    >
                      {row.render(item)}
                    </td>
                  ))}

                  {!isFull && <td className="border-l border-[var(--border-color)]" />}
                </tr>
              ))}

              {/* Actions */}
              <tr className="border-t border-[var(--border-color)]">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-[var(--surface-elevated)] p-3 text-left text-[11px] font-bold text-[var(--foreground-muted)]"
                >
                  Actions
                </th>

                {items.map((item) => (
                  <td
                    key={`actions-${item.id}`}
                    className="p-3 border-l border-[var(--border-color)]"
                  >
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item)}
                        disabled={isProductOutOfStock(item) || addingId === item.id}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-[11px] font-bold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShoppingBag className="w-3.5 h-3.5" />
                        )}
                        {isProductOutOfStock(item) ? "Out of stock" : "Add to cart"}
                      </button>

                      <Link
                        href={`/shop/${item.slug}`}
                        className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-[var(--border-color)] text-[11px] font-bold text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-colors"
                      >
                        View details
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </td>
                ))}

                {!isFull && <td className="border-l border-[var(--border-color)]" />}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
