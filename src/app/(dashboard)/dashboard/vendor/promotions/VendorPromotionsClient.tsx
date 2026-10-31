"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  Sparkles,
  Store,
  TriangleAlert,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import type { FeaturedPlacement, PromotionState } from "@/types";
import type { VendorPagination } from "@/types/vendor";
import { formatPrice } from "@/lib/currency";
import { getPromotionStateStyle, promotionEndWords, promotionSourceWords, promotionWindowWords } from "@/lib/promotionWords";
import { cancelMyPromotion, featureMyProduct } from "@/lib/action/vendorPromotions";

/**
 * The seller's featured placements.
 *
 * The allowance sits above the table because it is the number that explains why
 * "Feature a product" may refuse: only a running placement holds a shelf, and a
 * row that has ended or been cancelled is already out of the count.
 *
 * Nothing here decides how long a placement runs or what it costs — the plan
 * says the window and the API says the rest. A store placement is never bought
 * from this desk either: being a featured *shop* is the store team's grant, and
 * it arrives here as a row the seller can count down but not write.
 */

interface VendorPromotionsClientProps {
  placements: FeaturedPlacement[];
  stateCounts: Record<string, number>;
  pagination: VendorPagination;
  filters: { status: string; kind: string };
  allowance: {
    planName: string;
    limit: number;
    used: number;
    /** How long one placement stays up on this plan. */
    durationDays: number;
    isLive: boolean;
  };
  /** The seller's own buyable listings — all a placement can lift. */
  products: FeatureProductOption[];
  currency: string;
}

/**
 * One row of the picker: enough of a listing to recognise it and see what it
 * costs, and nothing else, because the API re-reads the product before it books
 * the shelf.
 */
export interface FeatureProductOption {
  _id: string;
  title: string;
  image: string;
  price: number;
  vendorProductStatus: string;
}

const STATE_TABS: { key: PromotionState | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "On the shelves" },
  { key: "ended", label: "Ended" },
  { key: "cancelled", label: "Cancelled" },
];

const KIND_TABS: { key: "all" | "product" | "store"; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "product", label: "Products" },
  { key: "store", label: "Storefront" },
];

export default function VendorPromotionsClient({
  placements,
  stateCounts,
  pagination,
  filters,
  allowance,
  products,
  currency,
}: VendorPromotionsClientProps) {
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [pickSearch, setPickSearch] = useState("");
  const [pickedId, setPickedId] = useState<string>("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const atLimit = allowance.used >= allowance.limit;
  const canBuy = allowance.isLive && allowance.durationDays > 0 && allowance.limit > 0;

  const go = (next: { page?: number; status?: string; kind?: string }) => {
    const params = new URLSearchParams();
    const nextStatus = next.status ?? filters.status;
    const nextKind = next.kind ?? filters.kind;
    const page = next.page ?? 1;

    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextKind && nextKind !== "all") params.set("kind", nextKind);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    router.push(
      query ? `/dashboard/vendor/promotions?${query}` : "/dashboard/vendor/promotions"
    );
  };

  const options = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((product) => product.title.toLowerCase().includes(q));
  }, [pickSearch, products]);

  const feature = async () => {
    if (!pickedId || busyId) return;

    setBusyId(pickedId);
    try {
      const res = await featureMyProduct(pickedId);
      if (res?.success === false) {
        // The API names the reason — no slot left, a plan that ended, a shop
        // that is suspended — so the seller reads that instead of a guess.
        toast.error(res.message || "The product could not be featured");
        return;
      }
      toast.success(res?.message || "Your product is now featured");
      setPicking(false);
      setPickedId("");
      setPickSearch("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (placement: FeaturedPlacement) => {
    if (busyId) return;

    setBusyId(placement._id);
    try {
      const res = await cancelMyPromotion(placement._id);
      if (res?.success === false) {
        toast.error(res.message || "The placement could not be ended");
        return;
      }
      toast.success("Placement ended — the shelf is free again");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setBusyId(null);
    }
  };

  const usagePercent =
    allowance.limit > 0
      ? Math.min(100, Math.round((allowance.used / allowance.limit) * 100))
      : 100;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Promotions</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            The shelves your shop is paying for, and how long each one stays lit.
          </p>
        </div>

        {!picking && (
          <button
            type="button"
            onClick={() => setPicking(true)}
            disabled={!canBuy}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Feature a product
          </button>
        )}
      </header>

      {/* Plan allowance */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-[var(--foreground)]">
            {allowance.used} / {allowance.limit} Featured Slots Used
            <span className="ml-1.5 rounded-md bg-[var(--surface-alt)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              {allowance.planName}
            </span>
          </p>

          {atLimit ? (
            <Link
              href="/dashboard/vendor/subscription"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--brand-flat)] hover:underline"
            >
              <TriangleAlert className="h-3 w-3" />
              No shelf free — upgrade to pin more
            </Link>
          ) : (
            <Link
              href="/dashboard/vendor/subscription"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--foreground-muted)] hover:text-[var(--brand-flat)]"
            >
              Manage plan
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          )}
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
          <div
            className={`h-full rounded-full ${atLimit ? "bg-rose-500" : "bg-brand-gradient"}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
          {allowance.durationDays > 0
            ? `Each placement runs ${allowance.durationDays} day${allowance.durationDays === 1 ? "" : "s"} from the day you pin it, then comes off the shelves on its own. A row that ended or was cancelled is already out of the count.`
            : "Your plan states no featured window, so there is nothing to buy here yet."}
          {!allowance.isLive &&
            " Your subscription is not running, so new placements are refused until it is renewed."}
        </p>
      </section>

      {/* The picker */}
      {picking && (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-[var(--foreground)]">
                Choose the listing to pin
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                Only your own listings that buyers can reach are offered — a draft
                or an archived row would use a slot on something nobody can find.
                {allowance.durationDays > 0 &&
                  ` It stays up for ${allowance.durationDays} day${allowance.durationDays === 1 ? "" : "s"}.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPicking(false);
                setPickedId("");
              }}
              className="rounded-lg border border-[var(--border-color)] p-1.5 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] cursor-pointer"
              aria-label="Close the picker"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-muted)]" />
            <input
              value={pickSearch}
              onChange={(event) => setPickSearch(event.target.value)}
              placeholder="Search your listings"
              className="h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] pl-9 pr-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
            />
          </div>

          {options.length === 0 ? (
            <p className="mt-3 rounded-xl bg-[var(--surface-alt)] px-3 py-4 text-center text-[11px] text-[var(--foreground-muted)]">
              {products.length === 0
                ? "None of your listings is on sale right now, so there is nothing to feature. Publish one from the Products desk first."
                : "No listing matches that search."}
            </p>
          ) : (
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto pr-1">
              {options.map((product) => {
                const active = pickedId === product._id;
                return (
                  <li key={product._id}>
                    <button
                      type="button"
                      onClick={() => setPickedId(product._id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer ${
                        active
                          ? "border-[var(--brand-flat)] bg-[var(--surface-alt)]"
                          : "border-[var(--border-color)] hover:bg-[var(--surface-alt)]"
                      }`}
                    >
                      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface-alt)]">
                        {product.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.image}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center">
                            <Sparkles className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
                          </span>
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-semibold text-[var(--foreground)]">
                          {product.title}
                        </span>
                        <span className="block text-[10px] text-[var(--foreground-muted)]">
                          {formatPrice(product.price, currency)} ·{" "}
                          {product.vendorProductStatus === "out_of_stock"
                            ? "Out of stock — still buyable on request"
                            : "On sale"}
                        </span>
                      </span>

                      {active && (
                        <span className="rounded-md bg-brand-gradient px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--on-grad-text)]">
                          Picked
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPicking(false);
                setPickedId("");
              }}
              className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={feature}
              disabled={!pickedId || busyId !== null}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyId && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Feature it
              {allowance.durationDays > 0 && ` for ${allowance.durationDays} days`}
            </button>
          </div>
        </section>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATE_TABS.map((tab) => {
            const active = filters.status === tab.key;
            const count = tab.key === "all" ? pagination.total : stateCounts[tab.key] || 0;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => go({ status: tab.key, page: 1 })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                    : "text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded px-1 text-[9px] font-bold ${active ? "bg-white/20" : "bg-[var(--surface-alt)]"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          {KIND_TABS.map((tab) => {
            const active = filters.kind === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => go({ kind: tab.key, page: 1 })}
                className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? "border-[var(--brand-flat)] text-[var(--brand-flat)]"
                    : "border-[var(--border-color)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* The placements */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        {placements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Sparkles className="h-6 w-6 text-[var(--foreground-muted)]" />
            <p className="text-xs font-semibold text-[var(--foreground)]">No placements here</p>
            <p className="max-w-sm text-[11px] text-[var(--foreground-muted)]">
              {filters.status !== "all" || filters.kind !== "all"
                ? "Nothing matches this view."
                : "Pin one of your own listings and it joins the featured shelves for as long as your plan states. The store team can also lift your whole shop — that arrives here as a row you did not have to buy."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {placements.map((placement) => {
              const style = getPromotionStateStyle(placement.state);
              const isStore = placement.kind === "store";

              return (
                <li key={placement._id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]">
                    {isStore ? (
                      placement.store?.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={placement.store.logo}
                          alt={placement.store.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Store className="h-4 w-4 text-[var(--foreground-muted)]" />
                        </div>
                      )
                    ) : placement.product?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={placement.product.image}
                        alt={placement.product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Sparkles className="h-4 w-4 text-[var(--foreground-muted)]" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[11px] font-bold text-[var(--foreground)]">
                        {isStore
                          ? placement.store?.name || "Your storefront"
                          : placement.product?.title || "A listing you removed"}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-lg border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                      >
                        {style.label}
                      </span>
                      {isStore && (
                        <span className="rounded-md bg-[var(--surface-alt)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                          Store placement
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-[10px] text-[var(--foreground-muted)]">
                      {promotionWindowWords(placement)}
                      {placement.state === "live" && (
                        <>
                          {" · "}
                          <span className="font-semibold text-[var(--foreground)]">
                            {placement.daysRemaining} day{placement.daysRemaining === 1 ? "" : "s"}{" "}
                            left
                          </span>
                        </>
                      )}
                      {promotionEndWords(placement) && ` · ${promotionEndWords(placement)}`}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-[var(--foreground-muted)]">
                      {promotionSourceWords(placement)}
                      {placement.endedReason && ` · ${placement.endedReason}`}
                    </p>
                  </div>

                  {placement.state === "live" && (
                    <button
                      type="button"
                      onClick={() => cancel(placement)}
                      disabled={busyId === placement._id}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] disabled:opacity-50 cursor-pointer"
                    >
                      {busyId === placement._id && <Loader2 className="h-3 w-3 animate-spin" />}
                      End early
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-2.5 shadow-2xs">
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} placements
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go({ page: pagination.page - 1 })}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => go({ page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
