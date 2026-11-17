import Link from "next/link";
import { ArrowUpRight, ChevronRight, Crown } from "lucide-react";
import VendorCard from "./VendorCard";
import type { PublicStore } from "@/types/stores";

/**
 * The featured-vendors rail.
 *
 * The rows are the shops a paid placement is lighting up right now. The band
 * above them is the same reusable marquee the featured listings use, with the
 * shops' own words: the home page introduces the sellers, a product page says
 * "shops like this one", and both hand the component the copy.
 *
 * When nothing is promoted the section is not rendered at all — an empty
 * "Featured" header over an empty box would advertise a feature the marketplace
 * does not currently have.
 */
export default function FeaturedVendors({
  vendors,
  eyebrow = "On the marquee",
  title = "Featured Vendors",
  slogan = "Shops that bought the spotlight this month. Verified sellers, real delivery records, and a storefront worth walking into.",
  href = "/vendors",
  linkLabel = "All vendors",
  compact = false,
}: {
  vendors: PublicStore[];
  eyebrow?: string;
  title?: string;
  slogan?: string;
  href?: string;
  linkLabel?: string;
  compact?: boolean;
}) {
  if (vendors.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-10">
      {/* ── The band: eyebrow, promise, way out ── */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-xs">
        {/* A hairline of amber along the top edge: the featured shops carry the
            same marquee mark the cards do. */}
        <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-amber-400 via-primary to-amber-400" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:border-amber-600/50 dark:text-amber-400">
              <Crown className="h-3 w-3" /> {eyebrow}
            </span>

            <h2 className="mt-2 text-2xl font-light tracking-tight text-[var(--foreground)] md:text-3xl">
              {title}
            </h2>

            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[var(--foreground-muted)] md:text-[13px]">
              {slogan}
            </p>

            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]/80">
              {vendors.length} shop{vendors.length === 1 ? "" : "s"} in the spotlight
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

      {/* ── Vendor cards ── */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {vendors.map((vendor) => (
          <VendorCard key={vendor._id} vendor={vendor} compact={compact} />
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
