import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { asPromotionList, getPromotions } from "@/lib/api/promotions";
import { getAllStores, asStoreList } from "@/lib/api/vendorStore";
import { getProducts } from "@/lib/api/products";
import { getCategories } from "@/lib/api/categories";
import { getSubCategories } from "@/lib/api/subCategories";
import { getSiteSettings } from "@/lib/api/siteSettings";
import AdminPromotionsClient, {
  type GrantProductOption,
  type GrantStoreOption,
} from "./AdminPromotionsClient";

export const dynamic = "force-dynamic";

/** The four readings of a placement, and the two things one can lift. */
const STATUS_CHOICES = ["all", "live", "ended", "cancelled"];
const KIND_CHOICES = ["all", "product", "store"];
/** Which picker the panel is showing, so the read is only made when needed. */
const PANEL_CHOICES = ["", "product", "store"];

/** One row of the catalogue, read only for the fields the picker draws. */
type ProductRow = {
  _id?: unknown;
  id?: unknown;
  title?: string;
  image?: string;
  price?: number;
  isFeatured?: boolean;
  sellCount?: number;
  vendorId?: unknown;
  storeId?: unknown;
  seller?: { name?: string };
  vendorProductStatus?: string;
};

/** One page of the catalogue as the picker needs it, platform stock included. */
const asProductOptions = (payload: unknown): GrantProductOption[] => {
  const rows = (payload as { data?: { products?: unknown[] } } | null)?.data?.products;
  if (!Array.isArray(rows)) return [];

  return rows
    .map((raw) => {
      const row = raw as ProductRow;
      // The shop is read from the populated store row (or the seller join). A
      // row without either is the store's own stock, which this board cannot
      // lift from here.
      const storeName =
        row.seller?.name ||
        (row.storeId && typeof row.storeId === "object"
          ? (row.storeId as { name?: string }).name || ""
          : "");

      return {
        _id: String(row._id ?? row.id ?? ""),
        title: row.title || "",
        image: row.image || "",
        price: Number(row.price) || 0,
        isFeatured: Boolean(row.isFeatured),
        sellCount: Number(row.sellCount) || 0,
        sellerName: storeName,
        // `vendorId` / `storeId` are what tell a seller's listing from the
        // store's own stock, which the board cannot lift from here.
        sellerOwned: Boolean(row.vendorId || row.storeId || row.vendorProductStatus),
      };
    })
    .filter((option) => option._id && option.title);
};

const asStoreOptions = (payload: unknown): GrantStoreOption[] => {
  const list = asStoreList(payload);
  return (list?.stores ?? [])
    .map((store) => ({
      _id: store._id,
      userId: store.userId,
      name: store.name,
      slug: store.slug,
      logo: store.logo || "",
      ownerName: store.ownerName || "",
      productCount: store.productCount ?? 0,
      isFeatured: Boolean(store.isFeatured),
    }))
    // A shop whose seller account cannot be read has nothing to grant to: a
    // placement belongs to an account, so the row is left off the picker.
    .filter((store) => store.userId && store.name);
};

interface AdminPromotionsPageProps {
  searchParams: Promise<{
    status?: string;
    kind?: string;
    page?: string;
    panel?: string;
    search?: string;
    category?: string;
    subCategory?: string;
  }>;
}

/**
 * The store team's promotions board.
 *
 * The placements and, only while a picker is open, the shelves that could be
 * lifted are read in the same pass. Nothing about a grant is decided in the
 * browser: the board names what to lift and for how many days, and the API
 * works out whose shop it belongs to.
 */
export default async function AdminPromotionsPage({ searchParams }: AdminPromotionsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const status = STATUS_CHOICES.includes(params?.status || "") ? params!.status! : "all";
  const kind = KIND_CHOICES.includes(params?.kind || "") ? params!.kind! : "all";
  const panel = PANEL_CHOICES.includes(params?.panel || "") ? params!.panel! : "";
  const search = params?.search?.trim() || "";
  // Category and subcategory narrow the product picker only; the store picker
  // searches shops and would have nothing to do with either.
  const category = panel === "product" ? params?.category?.trim() || "" : "";
  const subCategory = panel === "product" ? params?.subCategory?.trim() || "" : "";

  const [list, productsRes, storesRes, settingsRes, categoriesRes, subCategoriesRes] =
    await Promise.all([
      getPromotions({ status, kind, page, limit: 20 }),
      panel === "product"
        ? getProducts({
            search: search || undefined,
            category: category || undefined,
            subCategory: subCategory || undefined,
            limit: 20,
          })
        : Promise.resolve(null),
      panel === "store"
        ? getAllStores({ search: search || undefined, status: "active", limit: 20 })
        : Promise.resolve(null),
      getSiteSettings(),
      panel === "product" ? getCategories() : Promise.resolve(null),
      panel === "product" ? getSubCategories() : Promise.resolve(null),
    ]);

  const result = asPromotionList(list);

  if (!result) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Featured promotions</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            The placements could not be read just now.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[var(--surface-alt)] p-2 text-[var(--foreground-muted)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">Nothing was changed</p>
              <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                Every placement that was granted is still granted, and every date is still the
                date it was given. Reload this board to read it again.
              </p>
              <Link
                href="/dashboard/admin/vendors"
                className="mt-3 inline-flex items-center gap-1 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
              >
                Vendor applications
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <AdminPromotionsClient
      placements={result.promotions}
      stateCounts={result.stateCounts}
      pagination={result.pagination}
      filters={{ status, kind, panel, search, category, subCategory }}
      products={asProductOptions(productsRes)}
      stores={asStoreOptions(storesRes)}
      categories={((categoriesRes as { data?: unknown[] } | null)?.data ?? []) as {
        _id?: string;
        id?: string;
        name: string;
        slug: string;
      }[]}
      subCategories={((subCategoriesRes as { data?: unknown[] } | null)?.data ?? []) as {
        _id?: string;
        id?: string;
        categoryId: string;
        name: string;
        slug: string;
      }[]}
      currency={settingsRes?.data?.currency || "BDT"}
    />
  );
}
