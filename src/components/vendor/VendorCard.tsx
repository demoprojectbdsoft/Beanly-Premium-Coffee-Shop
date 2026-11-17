import Link from "next/link";
import Image from "next/image";
import { BadgeCheck, Crown, MapPin, Package, Star, Store } from "lucide-react";
import type { PublicStore } from "@/types/stores";

/**
 * One shop, drawn the same everywhere it appears.
 *
 * The home rail, the vendor directory and a product page's "sold by" block all
 * read the same public row, so they all get the same card: a cover, the
 * signboard, and the four numbers the platform keeps honest — rating, reviews,
 * parcels delivered and how many of them actually arrived.
 *
 * `compact` drops the description and the location for narrow side rails; it
 * never hides a number, because the numbers are the reason to trust the shop.
 */
export default function VendorCard({
  vendor,
  compact = false,
}: {
  vendor: PublicStore;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      className="group relative flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] overflow-hidden shadow-2xs hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/40 hover:border-primary/40 transition-all duration-300 cursor-pointer"
    >
      {/* Cover, or the gradient the shop would have painted */}
      <div className="relative h-24 shrink-0 bg-brand-gradient">
        {vendor.coverImage && (
          <Image
            src={vendor.coverImage}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 25vw"
            className="object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        {vendor.isFeatured && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/95 text-white text-[9px] font-extrabold uppercase tracking-wider shadow-sm">
            <Crown className="w-2.5 h-2.5" /> Featured
          </span>
        )}
        {/* Logo sitting on the cover's bottom edge */}
        <div className="absolute -bottom-5 left-4 w-12 h-12 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] overflow-hidden shadow-xs flex items-center justify-center">
          {vendor.logo ? (
            <Image
              src={vendor.logo}
              alt={`${vendor.name} logo`}
              fill
              sizes="48px"
              className="object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <Store className="w-5 h-5 text-[var(--foreground-muted)]" />
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1 pt-7 px-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-[var(--foreground)] leading-snug line-clamp-1 group-hover:text-primary transition-colors">
            {vendor.name}
          </h3>
          {vendor.category && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] shrink-0 mt-0.5">
              {vendor.category}
            </span>
          )}
        </div>

        {!compact && vendor.description && (
          <p className="text-[11px] text-[var(--foreground-muted)] line-clamp-2 leading-relaxed">
            {vendor.description}
          </p>
        )}

        {!compact && (vendor.address.city || vendor.address.area) && (
          <p className="text-[10px] text-[var(--foreground-muted)] inline-flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />
            {[vendor.address.area, vendor.address.city].filter(Boolean).join(", ")}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-center gap-2.5 text-[10px] sm:text-[11px] text-[var(--foreground-muted)] flex-wrap">
          <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {vendor.rating > 0 ? vendor.rating.toFixed(1) : "New"}
            {vendor.reviewCount > 0 && (
              <span className="font-normal text-[var(--foreground-muted)]">
                ({vendor.reviewCount})
              </span>
            )}
          </span>
          <span className="inline-flex items-center gap-1">
            <Package className="w-3 h-3" />
            {vendor.productCount}
          </span>
          {vendor.successRate > 0 && (
            <span
              className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400"
              title="Delivered parcels against every parcel the shop closed"
            >
              <BadgeCheck className="w-3 h-3" />
              {vendor.successRate}% success
            </span>
          )}
          <span className="ml-auto font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            Visit shop
          </span>
        </div>
      </div>
    </Link>
  );
}
