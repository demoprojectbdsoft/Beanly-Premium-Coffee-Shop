import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Crown,
  ExternalLink,
  Globe,
  MapPin,
  Package,
  ShoppingBag,
  Star,
  Store,
  TrendingUp,
} from "lucide-react";
import { asStore, getPublicStoreBySlug } from "@/lib/api/stores";
import { getProducts } from "@/lib/api/products";
import VendorShelf from "./VendorShelf";

export const dynamic = "force-dynamic";

interface VendorPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}

const SORT_KEYS = ["", "featured", "rating", "price_asc", "price_desc"];

/** The shop name as a page title, read from the row the render is about to use. */
export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const store = asStore(await getPublicStoreBySlug(slug));
  if (!store) return { title: "Vendor" };
  return {
    title: store.name,
    description:
      store.description ||
      `Shop ${store.name}'s shelf on Sparq — ratings, delivery record and every listing in one place.`,
  };
}

/**
 * A seller's public storefront.
 *
 * The shop row and its first shelf of products are both read before render, so
 * the page arrives complete. A slug that does not answer — never existed,
 * hidden, suspended, closed — is the same `not-found` either way; the API
 * refuses to tell shoppers which shops exist behind a wrong link, and this page
 * repeats that silence rather than inventing its own.
 *
 * The record panel is the point of the page: the rating a buyer gave, the
 * parcels the shop closed, and the share of those that actually arrived. All
 * three are platform numbers — none of them is typed by the seller.
 */
export default async function VendorPage({ params, searchParams }: VendorPageProps) {
  const { slug } = await params;
  const query = await searchParams;

  const store = asStore(await getPublicStoreBySlug(slug));
  if (!store) notFound();

  const page = Math.max(1, Number(query.page) || 1);
  const shelfSearch = (query.q || "").trim();
  const shelfSort = SORT_KEYS.includes(query.sort || "") ? (query.sort as string) : "";

  const shelfRes = await getProducts({
    storeSlug: store.slug,
    search: shelfSearch || undefined,
    sort: shelfSort || undefined,
    page,
    limit: 12,
  });

  const products = shelfRes?.data?.products ?? [];
  const pagination = shelfRes?.data?.pagination ?? {
    page: 1,
    limit: 12,
    total: products.length,
    totalPages: 1,
  };

  // No brand glyphs in this icon set, so the network's name is the label and
  // every social row shares one honest "leave the site" icon.
  const socials = [
    { key: "facebook", label: "Facebook", href: store.socialLinks.facebook },
    { key: "instagram", label: "Instagram", href: store.socialLinks.instagram },
    { key: "x", label: "X", href: store.socialLinks.x },
    { key: "linkedin", label: "LinkedIn", href: store.socialLinks.linkedin },
  ].filter((social) => Boolean(social.href));

  const where = [store.address.area, store.address.city, store.address.division]
    .filter(Boolean)
    .join(", ");

  const joined = store.createdAt
    ? new Date(store.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* ── Breadcrumb ── */}
      <nav className="flex items-center gap-2 text-xs text-[var(--foreground-muted)] flex-wrap">
        <Link href="/" className="hover:text-primary transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          All vendors
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--foreground)]">{store.name}</span>
      </nav>

      {/* ── Banner ── */}
      <div className="rounded-3xl overflow-hidden border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="relative h-36 md:h-52 bg-brand-gradient">
          {store.coverImage && (
            <Image
              src={store.coverImage}
              alt=""
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          {store.isFeatured && (
            <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/95 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              <Crown className="w-3 h-3" /> Featured vendor
            </span>
          )}
        </div>

        <div className="px-5 md:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-14">
            <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-md overflow-hidden flex items-center justify-center shrink-0">
              {store.logo ? (
                <Image
                  src={store.logo}
                  alt={`${store.name} logo`}
                  fill
                  sizes="112px"
                  className="object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <Store className="w-8 h-8 text-[var(--foreground-muted)]" />
              )}
            </div>

            <div className="flex-1 min-w-0 sm:pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
                  {store.name}
                </h1>
                {store.category && (
                  <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider">
                    {store.category}
                  </span>
                )}
              </div>
              {where && (
                <p className="text-xs text-[var(--foreground-muted)] mt-1 inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  {where}
                  {store.address.country ? `, ${store.address.country}` : ""}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:pb-1">
              {store.website && (
                <a
                  href={store.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-[11px] font-semibold text-[var(--foreground)] hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  Website
                </a>
              )}
              {socials.map((social) => (
                <a
                  key={social.key}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${store.name} on ${social.key}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-[11px] font-semibold text-[var(--foreground)] hover:text-primary hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {social.label}
                </a>
              ))}
            </div>
          </div>

          {store.description && (
            <p className="text-sm text-[var(--foreground-muted)] leading-relaxed mt-4 max-w-3xl">
              {store.description}
            </p>
          )}
        </div>
      </div>

      {/* ── The record: four numbers the seller cannot type ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            Rating
          </div>
          <p className="mt-1 text-xl font-extrabold text-[var(--foreground)]">
            {store.rating > 0 ? store.rating.toFixed(1) : "—"}
            <span className="text-[11px] font-medium text-[var(--foreground-muted)]"> / 5</span>
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)]">
            {store.reviewCount > 0
              ? `${store.reviewCount.toLocaleString()} review${store.reviewCount === 1 ? "" : "s"}`
              : "no reviews yet"}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <ShoppingBag className="w-3 h-3 text-primary" />
            Orders delivered
          </div>
          <p className="mt-1 text-xl font-extrabold text-[var(--foreground)]">
            {store.completedOrders.toLocaleString()}
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)]">parcels completed</p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <BadgeCheck className="w-3 h-3 text-emerald-500" />
            Success rate
          </div>
          <p className="mt-1 text-xl font-extrabold text-[var(--foreground)]">
            {store.successRate > 0 ? `${store.successRate}%` : "—"}
          </p>
          <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--surface-alt)] overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(100, Math.max(0, store.successRate))}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            <Package className="w-3 h-3 text-primary" />
            On the shelf
          </div>
          <p className="mt-1 text-xl font-extrabold text-[var(--foreground)]">
            {store.productCount.toLocaleString()}
          </p>
          <p className="text-[10px] text-[var(--foreground-muted)]">
            {store.productCount === 1 ? "listing" : "listings"} for sale
          </p>
        </div>
      </div>

      {/* ── About & the shop's record, side by side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
            <Store className="w-4 h-4 text-primary" />
            About this vendor
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[var(--foreground-muted)]">
            {store.description ||
              `${store.name} has not written a description yet, but its shelf and its record speak for it.`}
          </p>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {store.category && (
              <p className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] px-3 py-2 text-[11px] text-[var(--foreground)]">
                <Package className="w-3.5 h-3.5 text-[var(--foreground-muted)] shrink-0" />
                Sells in <span className="font-semibold">{store.category}</span>
              </p>
            )}
            {where && (
              <p className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] px-3 py-2 text-[11px] text-[var(--foreground)]">
                <MapPin className="w-3.5 h-3.5 text-[var(--foreground-muted)] shrink-0" />
                Based in <span className="font-semibold">{where}</span>
              </p>
            )}
            {joined && (
              <p className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] px-3 py-2 text-[11px] text-[var(--foreground)]">
                <CalendarDays className="w-3.5 h-3.5 text-[var(--foreground-muted)] shrink-0" />
                Trading since <span className="font-semibold">{joined}</span>
              </p>
            )}
            <p className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] px-3 py-2 text-[11px] text-[var(--foreground)]">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--foreground-muted)] shrink-0" />
              Delivered <span className="font-semibold">{store.completedOrders.toLocaleString()}</span>{" "}
              orders
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <h2 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-emerald-500" />
            Delivery record
          </h2>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
            Delivered parcels against every parcel this shop has closed. Orders still on the way
            are not counted either way.
          </p>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-3xl font-extrabold text-[var(--foreground)]">
              {store.successRate > 0 ? `${store.successRate}%` : "—"}
            </span>
            <span className="pb-1 text-[10px] text-[var(--foreground-muted)]">arrived</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-[var(--surface-alt)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              style={{ width: `${Math.min(100, Math.max(0, store.successRate))}%` }}
            />
          </div>
          <p className="mt-3 text-[10px] text-[var(--foreground-muted)]">
            {store.successRate > 0
              ? "A record this shop earns one parcel at a time."
              : "This shop has not closed a parcel yet, so there is no record to read."}
          </p>
          {socials.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Reach the shop
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {socials.map((social) => (
                  <a
                    key={social.key}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--surface-alt)] text-[10px] font-semibold text-[var(--foreground)] hover:text-primary hover:border-primary/50 transition-colors"
                  >
                    {social.label}
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── The shelf ── */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-[var(--foreground)] mb-4">
          What {store.name} sells
        </h2>
        <VendorShelf
          storeSlug={store.slug}
          initialProducts={products}
          initialPagination={pagination}
          initialFilters={{ search: shelfSearch, sort: shelfSort }}
        />
      </div>
    </section>
  );
}
