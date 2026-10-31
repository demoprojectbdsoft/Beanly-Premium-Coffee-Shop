"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Package,
  Search,
  Sparkles,
  Store,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import type { FeaturedPlacement, PromotionKind, PromotionState } from "@/types";
import type { VendorPagination } from "@/types/vendor";
import { formatPrice } from "@/lib/currency";
import {
  getPromotionStateStyle,
  promotionEndWords,
  promotionSourceWords,
  promotionWindowWords,
} from "@/lib/promotionWords";
import { grantPromotion, revokePromotion, runPromotionSweep } from "@/lib/action/promotions";

/**
 * The store team's promotions board.
 *
 * Two things happen here and nothing else: a dated placement is granted, and a
 * placement that is running is pulled back. Every row keeps its end date, so a
 * favour done this afternoon is dark by itself next month — which is why the
 * board has no switch for "featured", only grants with a window.
 *
 * The days are typed here and checked again by the API. Which shop a product
 * belongs to is never sent: the row being lifted decides that, so a grant
 * cannot park one seller's goods on another seller's shelf.
 */

/** One row of the product picker — enough to recognise the listing and no more. */
export interface GrantProductOption {
  _id: string;
  title: string;
  image: string;
  price: number;
  isFeatured: boolean;
  /** False for the store's own stock, which this board cannot lift. */
  sellerOwned: boolean;
}

/** One row of the shop picker. `userId` is what a store grant is made to. */
export interface GrantStoreOption {
  _id: string;
  userId: string;
  name: string;
  slug: string;
  logo: string;
  ownerName: string;
  productCount: number;
  isFeatured: boolean;
}

interface AdminPromotionsClientProps {
  placements: FeaturedPlacement[];
  stateCounts: Record<string, number>;
  pagination: VendorPagination;
  filters: { status: string; kind: string; panel: string; search: string };
  products: GrantProductOption[];
  stores: GrantStoreOption[];
  currency: string;
}

const STATE_TABS: { key: PromotionState | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Running" },
  { key: "ended", label: "Lapsed" },
  { key: "cancelled", label: "Pulled back" },
];

const KIND_TABS: { key: "all" | PromotionKind; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "product", label: "Products" },
  { key: "store", label: "Storefronts" },
];

/** The windows a grant usually wants, with the free-text box beside them. */
const DAY_PRESETS = [7, 14, 30, 60, 90];

/** The API's own bound, kept here only to stop a click that would be refused. */
const MAX_DAYS = 365;

export default function AdminPromotionsClient({
  placements,
  stateCounts,
  pagination,
  filters,
  products,
  stores,
  currency,
}: AdminPromotionsClientProps) {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState("");
  const [draftSearch, setDraftSearch] = useState(filters.search);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [sweeping, setSweeping] = useState(false);

  const panel = filters.panel as "" | PromotionKind;

  const go = (next: {
    page?: number;
    status?: string;
    kind?: string;
    panel?: string;
    search?: string;
  }) => {
    const params = new URLSearchParams();
    const nextStatus = next.status ?? filters.status;
    const nextKind = next.kind ?? filters.kind;
    const nextPanel = next.panel ?? filters.panel;
    const nextSearch = (next.search ?? filters.search).trim();
    const page = next.page ?? 1;

    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (nextKind && nextKind !== "all") params.set("kind", nextKind);
    if (nextPanel) params.set("panel", nextPanel);
    if (nextSearch) params.set("search", nextSearch);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    router.push(query ? `/dashboard/admin/promotions?${query}` : "/dashboard/admin/promotions");
  };

  // The picker is a query param rather than local state, because its list is
  // read on the server: a refresh keeps the panel open on the same search.
  const openPanel = (next: PromotionKind) => {
    setDraftSearch("");
    go({ panel: next, search: "", page: 1 });
  };
  const closePanel = () => go({ panel: "", search: "", page: 1 });

  const grant = async (target: { label: string; draft: { kind: PromotionKind; productId?: string; vendorId?: string } }) => {
    if (busyId) return;

    setBusyId(target.draft.productId || target.draft.vendorId || "");
    try {
      const res = await grantPromotion({ ...target.draft, days, reason });
      if (res?.success === false) {
        // The API says what is in the way — the shelf is already booked, the
        // listing is the store's own stock, the seller has no shop — so the
        // board repeats that instead of a blunt failure.
        toast.error(res.message || "The placement could not be granted");
        return;
      }
      toast.success(`${target.label} is featured for ${days} day${days === 1 ? "" : "s"}`);
      setReason("");
      closePanel();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setBusyId(null);
    }
  };

  const revoke = async (placement: FeaturedPlacement) => {
    if (busyId) return;

    setBusyId(placement._id);
    try {
      const res = await revokePromotion(placement._id, revokeReason);
      if (res?.success === false) {
        toast.error(res.message || "The placement could not be ended");
        return;
      }
      toast.success("Placement ended — the shelf is dark again");
      setRevokingId(null);
      setRevokeReason("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Brings the board back in line with the clock.
   *
   * The scheduled job runs this every night; the button is for the moment
   * somebody notices a shelf that should have gone dark hours ago.
   */
  const sweep = async () => {
    if (sweeping) return;

    setSweeping(true);
    try {
      const res = await runPromotionSweep();
      if (res?.success === false) {
        toast.error(res.message || "The sweep could not be run");
        return;
      }
      const closed = Number((res as { data?: { expired?: number } })?.data?.expired) || 0;
      toast.success(
        closed === 0
          ? "Nothing had lapsed — the board already matches the clock"
          : `${closed} placement${closed === 1 ? "" : "s"} closed and the shelves dimmed`
      );
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setSweeping(false);
    }
  };

  const panelOptions =
    panel === "product"
      ? products.map((product) => ({
          key: product._id,
          image: product.image,
          title: product.title,
          subtitle: `${formatPrice(product.price, currency)} · ${
            product.sellerOwned ? "A seller's listing" : "The store's own stock"
          }${product.isFeatured ? " · already on the shelves" : ""}`,
          blocked: !product.sellerOwned,
          blockedNote: "Feature it from the Products desk — it has no seller behind it",
          label: product.title,
          draft: { kind: "product" as PromotionKind, productId: product._id },
        }))
      : stores.map((store) => ({
          key: store.userId,
          image: store.logo,
          title: store.name,
          subtitle: `${store.ownerName || "The seller"} · ${store.productCount} listing${
            store.productCount === 1 ? "" : "s"
          }${store.isFeatured ? " · already featured" : ""}`,
          blocked: false,
          blockedNote: "",
          label: store.name,
          draft: { kind: "store" as PromotionKind, vendorId: store.userId },
        }));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Featured promotions</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Every shelf this board lifts comes with an end date, and only this desk can grant one.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={sweep}
            disabled={sweeping}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] shadow-2xs transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            {sweeping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
            Run the sweep
          </button>

          {panel !== "store" && (
            <button
              type="button"
              onClick={() => openPanel("store")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] shadow-2xs transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
            >
              <Store className="h-3.5 w-3.5" />
              Feature a shop
            </button>
          )}

          {panel !== "product" && (
            <button
              type="button"
              onClick={() => openPanel("product")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Feature a product
            </button>
          )}
        </div>
      </header>

      {/* The picker */}
      {panel && (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold text-[var(--foreground)]">
                {panel === "product" ? "Choose the listing to pin" : "Choose the shop to lift"}
              </p>
              <p className="mt-0.5 max-w-2xl text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                {panel === "product"
                  ? "The seller the product belongs to is read from the row, never typed here. The store's own stock is listed but cannot be granted from this board — it has no dated placement behind it."
                  : "Only an active shop can be lifted, and a seller cannot feature their own storefront from their desk. This is the one place that decision is made."}
              </p>
            </div>
            <button
              type="button"
              onClick={closePanel}
              className="rounded-lg border border-[var(--border-color)] p-1.5 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] cursor-pointer"
              aria-label="Close the picker"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* The window being bought */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Days
            </span>
            {DAY_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDays(preset)}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  days === preset
                    ? "border-[var(--brand-flat)] bg-[var(--surface-alt)] text-[var(--foreground)]"
                    : "border-[var(--border-color)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]"
                }`}
              >
                {preset}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={MAX_DAYS}
              value={days}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next)) setDays(Math.max(1, Math.min(MAX_DAYS, Math.round(next))));
              }}
              className="h-8 w-20 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-2 text-[11px] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
              aria-label="Days the placement runs"
            />
          </div>

          <div className="mt-2">
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 200))}
              placeholder="Why, for the note the seller reads (optional)"
              className="h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
            />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              go({ search: draftSearch, page: 1 });
            }}
            className="relative mt-3"
          >
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-muted)]" />
            <input
              value={draftSearch}
              onChange={(event) => setDraftSearch(event.target.value)}
              placeholder={panel === "product" ? "Search the catalogue" : "Search by shop, slug or category"}
              className="h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] pl-9 pr-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
            />
          </form>

          {panelOptions.length === 0 ? (
            <p className="mt-3 rounded-xl bg-[var(--surface-alt)] px-3 py-4 text-center text-[11px] text-[var(--foreground-muted)]">
              {filters.search
                ? "Nothing matches that search. The list is one page at a time — try fewer words."
                : panel === "product"
                  ? "The catalogue could not be read just now, so nothing was changed."
                  : "No active shop is on the marketplace yet."}
            </p>
          ) : (
            <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto pr-1">
              {panelOptions.map((option) => (
                <li
                  key={option.key}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-color)] px-3 py-2"
                >
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[var(--border-color)] bg-[var(--surface-alt)]">
                    {option.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={option.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        {panel === "product" ? (
                          <Package className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
                        ) : (
                          <Building2 className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
                        )}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-[var(--foreground)]">
                      {option.title}
                    </span>
                    <span className="block truncate text-[10px] text-[var(--foreground-muted)]">
                      {option.subtitle}
                    </span>
                  </span>

                  {option.blocked ? (
                    <span className="rounded-lg bg-[var(--surface-alt)] px-2 py-1 text-[9px] font-semibold text-[var(--foreground-muted)]">
                      {option.blockedNote}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => grant({ label: option.label, draft: option.draft })}
                      disabled={busyId !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient px-2.5 py-1.5 text-[10px] font-bold text-[var(--on-grad-text)] shadow-xs cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busyId === option.key && <Loader2 className="h-3 w-3 animate-spin" />}
                      Feature for {days} day{days === 1 ? "" : "s"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-[var(--foreground-muted)]">
            <Wand2 className="h-3 w-3" />
            A grant is a placement like any other: it holds no slot the shop paid for, and the
            daily sweep turns it off when its date passes.
          </p>
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
            <p className="text-xs font-semibold text-[var(--foreground)]">No placements to show</p>
            <p className="max-w-sm text-[11px] text-[var(--foreground-muted)]">
              {filters.status !== "all" || filters.kind !== "all"
                ? "Nothing matches this view."
                : "Nothing is featured yet. Lift a shelf from the buttons above, or wait for a seller to buy one from their plan."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {placements.map((placement) => {
              const style = getPromotionStateStyle(placement.state);
              const isStore = placement.kind === "store";
              const revoking = revokingId === placement._id;

              return (
                <li key={placement._id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-3">
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
                          <Package className="h-4 w-4 text-[var(--foreground-muted)]" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[11px] font-bold text-[var(--foreground)]">
                          {isStore
                            ? placement.store?.name || "A shop with no row"
                            : placement.product?.title || "A listing that is gone"}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-lg border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                        >
                          {style.label}
                        </span>
                        <span className="rounded-md bg-[var(--surface-alt)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                          {isStore ? "Storefront" : "Product"}
                        </span>
                      </div>

                      <p className="mt-1 truncate text-[10px] text-[var(--foreground-muted)]">
                        {placement.vendorName || "No seller named"}
                        {placement.store?.slug && ` · /${placement.store.slug}`}
                      </p>

                      <p className="mt-0.5 truncate text-[10px] text-[var(--foreground-muted)]">
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
                        {promotionSourceWords(placement, "staff")}
                        {placement.endedReason && ` · ${placement.endedReason}`}
                      </p>
                    </div>

                    {placement.state === "live" && !revoking && (
                      <button
                        type="button"
                        onClick={() => {
                          setRevokingId(placement._id);
                          setRevokeReason("");
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2 py-1.5 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] cursor-pointer"
                      >
                        End now
                      </button>
                    )}
                  </div>

                  {revoking && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[var(--surface-alt)] p-2.5">
                      <input
                        value={revokeReason}
                        onChange={(event) => setRevokeReason(event.target.value.slice(0, 200))}
                        placeholder="Why it is being pulled back — the seller reads this"
                        className="h-8 min-w-40 flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--surface)] px-2.5 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
                      />
                      <button
                        type="button"
                        onClick={() => setRevokingId(null)}
                        className="rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] cursor-pointer"
                      >
                        Keep it up
                      </button>
                      <button
                        type="button"
                        onClick={() => revoke(placement)}
                        disabled={busyId !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                      >
                        {busyId === placement._id && <Loader2 className="h-3 w-3 animate-spin" />}
                        End this placement
                      </button>
                      <p className="w-full text-[9px] text-[var(--foreground-muted)]">
                        Leaving the box empty records the API&apos;s own reason, so the row is never
                        closed without one.
                      </p>
                    </div>
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
