"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Crown, Star, Store } from "lucide-react";
import type { PublicStore } from "@/types/stores";

/**
 * The featured-shops rail.
 *
 * The rows come from the homepage, which asks the API for the shops a paid
 * placement is lighting up. When no shop is promoted the section is not
 * rendered at all — an empty "Featured" header over an empty box would advertise
 * a feature the store does not currently have.
 */
export default function FeaturedStores({ stores }: { stores: PublicStore[] }) {
  if (stores.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto px-4 my-10">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3 mb-6">
        <div className="relative inline-block">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-light text-[var(--foreground)]">
              Featured Shops
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300/60 dark:border-amber-600/50">
              <Crown className="w-3 h-3" /> On the marquee
            </span>
          </div>
          <div className="absolute -bottom-[13px] left-0 w-full h-[2.5px] bg-gradient-to-r from-primary to-primary-hover rounded-full" />
        </div>

        <Link
          href="/stores"
          className="text-xs text-[var(--foreground-muted)] hover:text-primary transition-colors flex items-center gap-1 font-medium cursor-pointer group"
        >
          <span>All shops</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {/* ── Shop Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stores.map((store) => (
          <Link
            key={store._id}
            href={`/stores/${store.slug}`}
            className="group flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] overflow-hidden shadow-2xs hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/40 hover:border-primary/40 transition-all duration-300 cursor-pointer"
          >
            {/* Cover, or the gradient the shop would have painted */}
            <div className="relative h-24 bg-brand-gradient">
              {store.coverImage && (
                <Image
                  src={store.coverImage}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 100vw, 25vw"
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              {/* Logo sitting on the cover's bottom edge */}
              <div className="absolute -bottom-5 left-4 w-12 h-12 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] overflow-hidden shadow-xs flex items-center justify-center">
                {store.logo ? (
                  <Image
                    src={store.logo}
                    alt={`${store.name} logo`}
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
                  {store.name}
                </h3>
                {store.category && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] shrink-0 mt-0.5">
                    {store.category}
                  </span>
                )}
              </div>
              {store.description && (
                <p className="text-[11px] text-[var(--foreground-muted)] line-clamp-2 leading-relaxed">
                  {store.description}
                </p>
              )}
              <div className="mt-auto pt-2 flex items-center gap-3 text-[10px] sm:text-[11px] text-[var(--foreground-muted)]">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-500">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {store.rating > 0 ? store.rating.toFixed(1) : "New"}
                </span>
                <span>{store.productCount} products</span>
                <span className="ml-auto font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Visit shop
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
