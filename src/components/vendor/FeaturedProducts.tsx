import Link from "next/link";
import { ChevronRight, Sparkles } from "lucide-react";
import ProductCard from "@/components/shared/ProductCard";
import type { Product } from "@/types";

/**
 * The featured-products rail.
 *
 * The rows are the listings a running placement is lifting right now — a
 * seller's product carries a dated placement, the store's own stock its
 * editorial switch — newest first, so the rail reads as "what was just
 * featured" rather than an old favourite. An empty list renders nothing.
 */
export default function FeaturedProducts({
  products,
  title = "Featured Products",
  badge = "Paid placements",
  href = "/shop?isFeatured=true",
  linkLabel = "See all featured",
}: {
  products: Product[];
  title?: string;
  badge?: string;
  href?: string;
  linkLabel?: string;
}) {
  // One row of five fills a desktop shelf; the rest live behind "see all".
  const rail = products.slice(0, 10);
  if (rail.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-10">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-6">
        <div className="relative inline-block">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-light text-[var(--foreground)]">{title}</h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="w-3 h-3" /> {badge}
            </span>
          </div>
          <div className="absolute -bottom-[13px] left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-primary-hover rounded-full" />
        </div>

        <Link
          href={href}
          className="text-xs text-[var(--foreground-muted)] hover:text-primary transition-colors flex items-center gap-1 font-medium cursor-pointer group"
        >
          <span>{linkLabel}</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Product shelf ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 border border-[var(--border-color)] rounded-xl overflow-hidden shadow-xs bg-[var(--surface-elevated)]">
        {rail.map((product, index) => (
          <ProductCard
            key={product.id || product._id || index}
            product={product}
            hasRightBorder={index < rail.length - 1}
            showDiscountBadge={false}
          />
        ))}
      </div>
    </section>
  );
}
