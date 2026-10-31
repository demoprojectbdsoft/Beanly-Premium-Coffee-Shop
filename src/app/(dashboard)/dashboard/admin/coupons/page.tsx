import React from "react";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { asCoupon, asCouponList, getCoupon, getCoupons } from "@/lib/api/coupons";
import { getCategories } from "@/lib/api/categories";
import { getProducts } from "@/lib/api/products";
import { getSiteSettings } from "@/lib/api/siteSettings";
import type { Coupon } from "@/types";
import AdminCouponsClient, {
  type CouponCategoryOption,
  type CouponProductOption,
} from "./AdminCouponsClient";

export const dynamic = "force-dynamic";

/** The four readings of a code, and the two owners it can have. */
const STATUS_CHOICES = ["all", "live", "upcoming", "expired", "stopped"];
const OWNER_CHOICES = ["all", "admin", "vendor"];

/** One category row, read only for what the picker draws. */
type CategoryRow = { _id?: unknown; id?: unknown; name?: string };

const asCategoryOptions = (payload: unknown): CouponCategoryOption[] => {
  const rows = Array.isArray(payload)
    ? payload
    : (payload as { data?: unknown[] } | null)?.data;
  if (!Array.isArray(rows)) return [];

  return rows
    .map((raw) => {
      const row = raw as CategoryRow;
      return { _id: String(row._id ?? row.id ?? ""), name: row.name || "" };
    })
    .filter((option) => option._id && option.name);
};

/** One page of the catalogue, found by search because the store is large. */
type ProductRow = { _id?: unknown; id?: unknown; title?: string; price?: number };

const asProductOptions = (payload: unknown): CouponProductOption[] => {
  const rows = (payload as { data?: { products?: unknown[] } } | null)?.data?.products;
  if (!Array.isArray(rows)) return [];

  return rows
    .map((raw) => {
      const row = raw as ProductRow;
      return { _id: String(row._id ?? row.id ?? ""), title: row.title || "", price: Number(row.price) || 0 };
    })
    .filter((option) => option._id && option.title);
};

interface AdminCouponsPageProps {
  searchParams: Promise<{
    owner?: string;
    status?: string;
    search?: string;
    page?: string;
    edit?: string;
    pq?: string;
  }>;
}

/**
 * The store team's coupons board.
 *
 * The codes are read in one pass; the categories and the catalogue search the
 * editor offers are only read while an editor is open. Nothing about what a code
 * is worth is decided here — the board names the code and its limits, and the API
 * prices every basket with them.
 */
export default async function AdminCouponsPage({ searchParams }: AdminCouponsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const status = STATUS_CHOICES.includes(params?.status || "") ? params!.status! : "all";
  const owner = OWNER_CHOICES.includes(params?.owner || "") ? params!.owner! : "all";
  const search = params?.search?.trim().slice(0, 60) || "";
  const edit = params?.edit?.trim().slice(0, 64) || "";
  const productSearch = params?.pq?.trim().slice(0, 60) || "";
  const editorOpen = Boolean(edit);

  const [list, categoriesRes, productsRes, settingsRes] = await Promise.all([
    getCoupons({ owner, status, search, page, limit: 20 }),
    editorOpen ? getCategories() : Promise.resolve(null),
    // An empty term still asks for a page, so the picker is never a blank box.
    editorOpen ? getProducts({ search: productSearch || undefined, limit: 20 }) : Promise.resolve(null),
    getSiteSettings(),
  ]);

  const result = asCouponList(list);

  if (!result) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Coupons</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            The discount codes could not be read just now.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[var(--surface-alt)] p-2 text-[var(--foreground-muted)]">
              <Ticket className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">Nothing was changed</p>
              <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                Every code that was written is still written, and every order that
                used one still shows the discount it was given. Reload this board to
                read it again.
              </p>
              <Link
                href="/dashboard/admin/promotions"
                className="mt-3 inline-flex items-center gap-1 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
              >
                Featured promotions
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // The row the editor points at. It is normally already on the board, which is
  // the better read because the board also carries the names behind the code.
  let editing: Coupon | null =
    edit && edit !== "new" ? result.coupons.find((coupon) => coupon._id === edit) ?? null : null;

  if (edit && edit !== "new" && !editing) {
    const single = await getCoupon(edit).then(asCoupon);
    if (single?.ownerType === "admin") editing = single;
  }

  return (
    <AdminCouponsClient
      coupons={result.coupons}
      typeCounts={result.typeCounts}
      pagination={result.pagination}
      filters={{ status, owner, search, edit, productSearch }}
      editing={editing}
      categories={asCategoryOptions(categoriesRes)}
      products={asProductOptions(productsRes)}
      currency={settingsRes?.data?.currency || "BDT"}
    />
  );
}
