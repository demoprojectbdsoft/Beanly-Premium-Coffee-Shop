"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, ChevronUp, Sparkles } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import type { Product } from "@/types";

/** One row of a five-up shelf; "Show more" adds another row at a time. */
const SHELF_STEP = 5;

/**
 * The featured-products shelf.
 *
 * The rows are the listings a running placement is lifting right now. The store
 * team's own stock leads, then each seller by the plan that paid for its shelf —
 * so what a buyer reads at the top is genuinely the most-promoted stock, not the
 * newest row that happens to be flagged.
 *
 * The header is the same one every other homepage section uses, with reusable
 * copy: the home page introduces the shelf, a product page asks for "more like
 * this", and both pass their own words. Only one row is drawn at first; the
 * rest arrive on "Show more". An empty list renders nothing at all, never an
 * empty promise.
 */
export default function FeaturedProducts({
  products,
  eyebrow = "Paid placements",
  title = "Featured Products",
  slogan = "The front shelf, bought and granted. Hand-picked by the store and its top sellers — these are the listings the marketplace is pushing hardest today.",
  href = "/shop?isFeatured=true",
  linkLabel = "See all featured",
}: {
  products: Product[];
  eyebrow?: string;
  title?: string;
  slogan?: string;
  href?: string;
  linkLabel?: string;
}) {
  const [visibleCount, setVisibleCount] = useState(SHELF_STEP);

  if (products.length === 0) return null;

  const visible = products.slice(0, visibleCount);
  const hiddenCount = products.length - visible.length;
  const canToggle = products.length > SHELF_STEP;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-10">
      {/* ── Section header, the same one the other homepage sections draw ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[var(--border-color)] pb-3 mb-6 gap-3">
        <div className="relative inline-block min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl md:text-2xl font-light text-[var(--foreground)]">{title}</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" /> {eyebrow}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[var(--foreground-muted)]">
            {slogan}
          </p>
          <div className="absolute -bottom-[13px] left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-primary-hover rounded-full" />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
            {products.length} listing{products.length === 1 ? "" : "s"} on the shelf
          </span>
          <Link
            href={href}
            className="group text-xs text-[var(--foreground-muted)] hover:text-primary transition-colors flex items-center gap-1 font-medium cursor-pointer"
          >
            <span>{linkLabel}</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

      {/* ── The shelf: one row of five, then whatever "Show more" reveals ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xs bg-[var(--surface-elevated)]">
        {visible.map((product, index) => (
          <ProductCard
            key={product.id || product._id || index}
            product={product}
            hasRightBorder={index < visible.length - 1}
            showDiscountBadge={false}
          />
        ))}
      </div>

      {canToggle && (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={() =>
              setVisibleCount((count) =>
                hiddenCount > 0 ? count + SHELF_STEP : SHELF_STEP
              )
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--surface-elevated)] px-5 py-2 text-xs font-semibold text-[var(--foreground)] transition-colors hover:border-primary/50 hover:text-primary cursor-pointer"
          >
            {hiddenCount > 0
              ? `Show ${Math.min(SHELF_STEP, hiddenCount)} more`
              : "Show less"}
            {hiddenCount > 0 ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
    </section>
  );
}
