import Link from "next/link";
import { ArrowUpRight, ChevronRight, Sparkles } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import type { Product } from "@/types";

/**
 * The featured-products rail.
 *
 * The rows are the listings a running placement is lifting right now. The store
 * team's own stock leads, then each seller by the plan that paid for its shelf —
 * so what a buyer reads at the top is genuinely the most-promoted stock, not the
 * newest row that happens to be flagged.
 *
 * The banner above the shelf is reusable copy: the home page asks for listings,
 * a product page asks for "more like this", and both render the same band with
 * their own words. An empty list renders nothing at all, never an empty promise.
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
  // One row of five fills a desktop shelf; the rest live behind "see all".
  const rail = products.slice(0, 10);
  if (rail.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-10">
      {/* ── The band: eyebrow, promise, way out ── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-xs">
        {/* A hairline of brand colour along the top edge, so the band reads as
            the marquee it is even before the copy is read. */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary via-amber-400 to-primary" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" /> {eyebrow}
            </span>

            <h2 className="mt-2 text-2xl font-light tracking-tight text-[var(--foreground)] md:text-3xl">
              {title}
            </h2>

            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[var(--foreground-muted)] md:text-[13px]">
              {slogan}
            </p>

            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]/80">
              {rail.length} listing{rail.length === 1 ? "" : "s"} on the shelf right now
            </p>
          </div>

          <Link
            href={href}
            className="group inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3.5 py-2 text-[11px] font-bold text-[var(--foreground)] transition-colors hover:border-primary/40 hover:text-primary md:self-auto"
          >
            {linkLabel}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>

      {/* ── The shelf ── */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xs bg-[var(--surface-elevated)]">
        {rail.map((product, index) => (
          <ProductCard
            key={product.id || product._id || index}
            product={product}
            hasRightBorder={index < rail.length - 1}
            showDiscountBadge={false}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-end">
        <Link
          href={href}
          className="flex items-center gap-1 text-[11px] font-semibold text-[var(--foreground-muted)] transition-colors hover:text-primary"
        >
          {linkLabel}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
