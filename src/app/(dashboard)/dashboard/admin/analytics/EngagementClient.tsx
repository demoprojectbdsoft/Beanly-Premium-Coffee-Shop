"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Eye, Heart, MousePointerClick, Package, TrendingUp } from "lucide-react";
import type { EngagementProductRow, ProductEngagementReport } from "@/types/vendor";
import { formatPrice } from "@/lib/currency";

/**
 * The attention half of the analytics desk.
 *
 * Three numbers per listing, because each one answers a different question:
 * views are how many people found it, clicks are how many wanted it, and
 * wishlists are how many kept it for later. A high view count with no clicks is
 * a pricing or photo problem; a high wishlist count with no orders is a
 * checkout problem.
 */

interface EngagementClientProps {
  report: ProductEngagementReport | null;
  range: number;
  currency: string;
}

const RANGE_CHOICES = [7, 30, 90, 365];

function Tile({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Eye;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          {label}
        </p>
        <span className="rounded-lg bg-[var(--surface-alt)] p-1.5 text-[var(--foreground-muted)]">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 text-xl font-extrabold tracking-tight text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--foreground-muted)]">{note}</p>
    </div>
  );
}

/** One product cell, shared by both rankings. */
function ProductCell({ row, currency }: { row: EngagementProductRow; currency: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {row.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.image}
          alt=""
          className="h-9 w-9 shrink-0 rounded-lg border border-[var(--border-color)] object-cover"
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground-muted)]">
          <Package className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold text-[var(--foreground)]">
          {row.slug ? (
            <Link href={`/shop/${row.slug}`} className="hover:underline">
              {row.title}
            </Link>
          ) : (
            row.title
          )}
        </span>
        <span className="block text-[10px] text-[var(--foreground-muted)]">
          {formatPrice(row.price, currency, { showDecimals: false })}
        </span>
      </span>
    </div>
  );
}

export default function EngagementClient({ report, range, currency }: EngagementClientProps) {
  const totals = report?.totals ?? { views: 0, clicks: 0, wishlists: 0, products: 0 };
  const clickRate = totals.views > 0 ? Math.round((totals.clicks / totals.views) * 100) : 0;

  return (
    <div className="space-y-5 border-t border-[var(--border-color)] pt-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <header>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Product attention</h2>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Views, clicks and wishlist saves in the last {range} days — the demand that has not
            ordered yet.
          </p>
        </header>

        <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-alt)] p-1">
          {RANGE_CHOICES.map((choice) => (
            <Link
              key={choice}
              href={`/dashboard/admin/analytics?range=${choice}`}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                choice === range
                  ? "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-2xs"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {choice}d
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Product views"
          value={totals.views.toLocaleString()}
          note="Listing pages opened"
          icon={Eye}
        />
        <Tile
          label="Product clicks"
          value={totals.clicks.toLocaleString()}
          note={`${clickRate}% of views turned into a press`}
          icon={MousePointerClick}
        />
        <Tile
          label="Wishlist saves"
          value={totals.wishlists.toLocaleString()}
          note="Products kept for later right now"
          icon={Heart}
        />
        <Tile
          label="Products with traffic"
          value={totals.products.toLocaleString()}
          note="Listings someone touched in this window"
          icon={TrendingUp}
        />
      </div>

      {!report || (report.top.length === 0 && report.topWishlisted.length === 0) ? (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-2xs">
          <p className="text-xs font-bold text-[var(--foreground)]">Nothing counted yet</p>
          <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[var(--foreground-muted)]">
            Views, clicks and wishlist saves are counted from the moment this board went live. Open
            a product page in the shop and the first numbers appear here.
          </p>
          <Link
            href="/shop"
            className="mt-3 inline-flex items-center gap-1 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
          >
            Open the shop
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Most viewed */}
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-[var(--foreground)]">Most viewed</h2>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  Ranked by listing opens, with what they led to
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-[var(--surface-alt)] px-2 py-1 text-[10px] font-bold text-[var(--foreground-muted)]">
                Top {report.top.length}
              </span>
            </div>

            <table className="mt-4 w-full text-left text-[11px]">
              <thead className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                <tr>
                  <th className="pb-2 font-bold">Product</th>
                  <th className="pb-2 text-right font-bold">Views</th>
                  <th className="pb-2 text-right font-bold">Clicks</th>
                  <th className="pb-2 text-right font-bold">Saved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {report.top.map((row, index) => (
                  <tr key={row.id}>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-3 shrink-0 text-[10px] font-bold text-[var(--foreground-muted)]">
                          {index + 1}
                        </span>
                        <ProductCell row={row} currency={currency} />
                      </div>
                    </td>
                    <td className="py-2 text-right font-bold text-[var(--foreground)]">
                      {row.views.toLocaleString()}
                    </td>
                    <td className="py-2 text-right text-[var(--foreground-muted)]">
                      {row.clicks.toLocaleString()}
                      <span className="ml-1 text-[9px]">({row.clickRate}%)</span>
                    </td>
                    <td className="py-2 text-right text-[var(--foreground-muted)]">
                      {row.wishlists.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Most wishlisted */}
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
                  <Heart className="h-3.5 w-3.5 text-rose-500" />
                  On the most wishlists
                </h2>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  Saved for later — demand that has not bought yet
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-[var(--surface-alt)] px-2 py-1 text-[10px] font-bold text-[var(--foreground-muted)]">
                {report.topWishlisted.length > 0 ? `Top ${report.topWishlisted.length}` : "None yet"}
              </span>
            </div>

            {report.topWishlisted.length === 0 ? (
              <p className="mt-6 text-[11px] text-[var(--foreground-muted)]">
                Nobody has saved a product yet. Wishlist saves appear here the moment a shopper taps
                the heart.
              </p>
            ) : (
              <table className="mt-4 w-full text-left text-[11px]">
                <thead className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                  <tr>
                    <th className="pb-2 font-bold">Product</th>
                    <th className="pb-2 text-right font-bold">Wishlists</th>
                    <th className="pb-2 text-right font-bold">Views</th>
                    <th className="pb-2 text-right font-bold">Clicks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {report.topWishlisted.map((row, index) => (
                    <tr key={row.id}>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-3 shrink-0 text-[10px] font-bold text-[var(--foreground-muted)]">
                            {index + 1}
                          </span>
                          <ProductCell row={row} currency={currency} />
                        </div>
                      </td>
                      <td className="py-2 text-right font-bold text-[var(--foreground)]">
                        {row.wishlists.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-[var(--foreground-muted)]">
                        {row.views.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-[var(--foreground-muted)]">
                        {row.clicks.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
