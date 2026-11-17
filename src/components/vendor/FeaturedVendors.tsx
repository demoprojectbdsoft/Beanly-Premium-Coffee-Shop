import Link from "next/link";
import { ChevronRight, Crown } from "lucide-react";
import VendorCard from "./VendorCard";
import type { PublicStore } from "@/types/stores";

/**
 * The featured-vendors rail.
 *
 * The rows are the shops a paid placement is lighting up right now, newest
 * grant first. When nothing is promoted the section is not rendered at all — an
 * empty "Featured" header over an empty box would advertise a feature the
 * marketplace does not currently have.
 */
export default function FeaturedVendors({
  vendors,
  title = "Featured Vendors",
  badge = "On the marquee",
  href = "/vendors",
  linkLabel = "All vendors",
  compact = false,
}: {
  vendors: PublicStore[];
  title?: string;
  badge?: string;
  href?: string;
  linkLabel?: string;
  compact?: boolean;
}) {
  if (vendors.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-10">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-6">
        <div className="relative inline-block">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-light text-[var(--foreground)]">{title}</h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300/60 dark:border-amber-600/50">
              <Crown className="w-3 h-3" /> {badge}
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

      {/* ── Vendor Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {vendors.map((vendor) => (
          <VendorCard key={vendor._id} vendor={vendor} compact={compact} />
        ))}
      </div>
    </section>
  );
}
