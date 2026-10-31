import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Crown,
  ExternalLink,
  Globe,
  MapPin,
  Package,
  ShoppingBag,
  Star,
  Store,
} from "lucide-react";
import { asStore, getPublicStoreBySlug } from "@/lib/api/stores";
import { getProducts } from "@/lib/api/products";
import StoreShelf from "./StoreShelf";

export const dynamic = "force-dynamic";

interface StorePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}

const SORT_KEYS = ["", "featured", "rating", "price_asc", "price_desc"];

/**
 * A seller's storefront.
 *
 * The shop row and its first shelf of products are both read before render, so
 * the page arrives complete. A slug that does not answer — never existed,
 * hidden, suspended, closed — is the same `not-found` either way; the API
 * refuses to tell shoppers which shops exist behind a wrong link, and this
 * page repeats that silence rather than inventing its own.
 */
export default async function StorePage({ params, searchParams }: StorePageProps) {
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

  return (
    <section className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* ── Back to discovery ── */}
      <nav className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
        <Link href="/stores" className="inline-flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" />
          All shops
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--foreground)]">{store.name}</span>
      </nav>

      {/* ── Banner ── */}
      <div className="rounded-3xl overflow-hidden border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="relative h-36 md:h-48 bg-brand-gradient">
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
        </div>

        <div className="px-5 md:px-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12">
            <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-md overflow-hidden flex items-center justify-center shrink-0">
              {store.logo ? (
                <Image
                  src={store.logo}
                  alt={`${store.name} logo`}
                  fill
                  sizes="96px"
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
                {store.isFeatured && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-300/60 dark:border-amber-600/50 text-[10px] font-extrabold uppercase tracking-wider">
                    <Crown className="w-3 h-3" /> Featured shop
                  </span>
                )}
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

            <div className="flex items-center gap-2 sm:pb-1">
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

          {/* The platform's cached counters — the only numbers here that carry weight */}
          <div className="flex items-center gap-5 md:gap-8 mt-5 pt-5 border-t border-[var(--border-color)] flex-wrap">
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-extrabold text-[var(--foreground)]">
                {store.rating > 0 ? store.rating.toFixed(1) : "—"}
              </span>
              <span className="text-[11px] text-[var(--foreground-muted)]">
                {store.reviewCount > 0
                  ? `${store.reviewCount.toLocaleString()} review${store.reviewCount === 1 ? "" : "s"}`
                  : "no reviews yet"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--foreground-muted)]">
              <ShoppingBag className="w-3.5 h-3.5" />
              {store.completedOrders.toLocaleString()} completed {store.completedOrders === 1 ? "order" : "orders"}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--foreground-muted)]">
              <Package className="w-3.5 h-3.5" />
              {store.productCount.toLocaleString()} {store.productCount === 1 ? "product" : "products"} on the shelf
            </div>
          </div>
        </div>
      </div>

      {/* ── The shelf ── */}
      <div>
        <h2 className="text-lg md:text-xl font-bold text-[var(--foreground)] mb-4">
          What {store.name} sells
        </h2>
        <StoreShelf
          storeSlug={store.slug}
          initialProducts={products}
          initialPagination={pagination}
          initialFilters={{ search: shelfSearch, sort: shelfSort }}
        />
      </div>
    </section>
  );
}
