"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ticket, X } from "lucide-react";
import { toast } from "react-toastify";
import type { Coupon, CouponDraft } from "@/types";
import {
  blankCouponDraft,
  couponDraftFrom,
  couponPayload,
  validateCouponDraft,
} from "@/lib/couponDraft";
import { createVendorCoupon, updateVendorCoupon } from "@/lib/action/vendorCoupons";
import { formatPrice } from "@/lib/currency";

/**
 * Composing or editing one code.
 *
 * Nothing here decides what the code is worth. The numbers typed into this form
 * are the seller's intention; the API is what applies them, and it re-reads the
 * prices at checkout. The draft's shape is checked in `lib/couponDraft`, which
 * the store team's desk shares, so a typo does not cost a round trip.
 */

export interface CouponProductOption {
  _id: string;
  title: string;
  /** Carried through from the listings read; a missing status is not archived. */
  vendorProductStatus?: string;
  price: number;
}

interface VendorCouponFormProps {
  /** Null means a brand new code. */
  coupon: Coupon | null;
  products: CouponProductOption[];
  currency: string;
  onDone: () => void;
}

const inputClass =
  "h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35";
const labelClass =
  "mb-1 block text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]";

export default function VendorCouponForm({
  coupon,
  products,
  currency,
  onDone,
}: VendorCouponFormProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CouponDraft>(
    coupon ? couponDraftFrom(coupon) : blankCouponDraft()
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CouponDraft>(key: K, value: CouponDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  /** Everything the seller can only do to their own shop. */
  const pickable = useMemo(
    () =>
      products
        .filter((product) => product.vendorProductStatus !== "archived")
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title)),
    [products]
  );

  const chosen = new Set(draft.productIds);

  const toggleProduct = (id: string) => {
    const next = chosen.has(id)
      ? [...chosen].filter((current) => current !== id)
      : [...chosen, id];
    set("productIds", next);
  };

  const numberField = (key: keyof CouponDraft, fallback: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(event.target.value);
    set(key, Number.isFinite(raw) ? raw : fallback);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const problem = validateCouponDraft(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSaving(true);

    // A seller narrows a code by product only; whole-category codes are the
    // store team's tool, so this field stays empty here.
    const payload: CouponDraft = { ...couponPayload(draft), categoryIds: [] };

    try {
      const res = coupon
        ? await updateVendorCoupon(coupon._id, payload)
        : await createVendorCoupon(payload);

      if (res?.success === false) {
        toast.error(res.message || "The code could not be saved");
        return;
      }

      toast.success(coupon ? "Coupon updated" : "Coupon created");
      router.refresh();
      onDone();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const percent = draft.discountType === "percentage";

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-[var(--surface-alt)] p-2 text-[var(--foreground-muted)]">
            <Ticket className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold text-[var(--foreground)]">
              {coupon ? `Editing ${coupon.code}` : "New discount code"}
            </p>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              {coupon
                ? "Changing a code that has already been used leaves the orders that quoted it untouched."
                : "Shoppers type this at checkout. It costs one of your plan's coupon slots while it runs."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDone}
          className="rounded-lg p-1.5 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="coupon-code">
            Code
          </label>
          <input
            id="coupon-code"
            value={draft.code}
            onChange={(event) => set("code", event.target.value.toUpperCase())}
            placeholder="DIWALI25"
            className={`${inputClass} font-mono uppercase tracking-widest`}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="coupon-title">
            Label for your own list
          </label>
          <input
            id="coupon-title"
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder="Festival push"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="coupon-description">
          Note (only you see this)
        </label>
        <input
          id="coupon-description"
          value={draft.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="What this code was for, so next month you remember"
          className={inputClass}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <span className={labelClass}>Kind of discount</span>
          <div className="flex gap-1.5">
            {(["percentage", "fixed"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => set("discountType", choice)}
                className={`flex-1 rounded-xl px-2 py-2 text-[11px] font-bold transition-colors cursor-pointer ${
                  draft.discountType === choice
                    ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                    : "border border-[var(--border-color)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]"
                }`}
              >
                {choice === "percentage" ? "%" : "Flat"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="coupon-value">
            {percent ? "Percentage off" : "Amount off"}
          </label>
          <input
            id="coupon-value"
            type="number"
            min={0}
            step={percent ? 1 : 0.01}
            value={draft.discountValue}
            onChange={numberField("discountValue", 0)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="coupon-min">
            Minimum spend
          </label>
          <input
            id="coupon-min"
            type="number"
            min={0}
            step={0.01}
            value={draft.minOrderAmount}
            onChange={numberField("minOrderAmount", 0)}
            className={inputClass}
          />
          <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
            0 means no minimum. Checked against the items this code covers.
          </p>
        </div>
      </div>

      {percent && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="coupon-cap">
              Largest discount
            </label>
            <input
              id="coupon-cap"
              type="number"
              min={0}
              step={0.01}
              value={draft.maxDiscountAmount}
              onChange={numberField("maxDiscountAmount", 0)}
              className={inputClass}
            />
            <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
              {draft.maxDiscountAmount > 0
                ? `${formatPrice(draft.maxDiscountAmount, currency)} is the most this code can give on one order.`
                : "0 means the percentage is not capped."}
            </p>
          </div>

          <div className="flex items-end">
            <p className="rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              A percentage is taken off the items this code covers, never off the
              delivery fee.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="coupon-start">
            Runs from
          </label>
          <input
            id="coupon-start"
            type="datetime-local"
            value={draft.startDate}
            onChange={(event) => set("startDate", event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="coupon-end">
            Until
          </label>
          <input
            id="coupon-end"
            type="datetime-local"
            value={draft.endDate}
            onChange={(event) => set("endDate", event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="coupon-total">
            Total uses
          </label>
          <input
            id="coupon-total"
            type="number"
            min={0}
            step={1}
            value={draft.totalUsageLimit}
            onChange={numberField("totalUsageLimit", 0)}
            className={inputClass}
          />
          <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
            {draft.totalUsageLimit > 0
              ? `The code stops after ${draft.totalUsageLimit} order${draft.totalUsageLimit === 1 ? "" : "s"}.`
              : "0 means as many orders as want it."}
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="coupon-per-customer">
            Uses per shopper
          </label>
          <input
            id="coupon-per-customer"
            type="number"
            min={0}
            step={1}
            value={draft.perCustomerLimit}
            onChange={numberField("perCustomerLimit", 0)}
            className={inputClass}
          />
          <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
            {draft.perCustomerLimit > 0
              ? `Each account may use it ${draft.perCustomerLimit} time${draft.perCustomerLimit === 1 ? "" : "s"}.`
              : "0 means no limit per account."}
          </p>
        </div>
      </div>

      <div>
        <span className={labelClass}>Which of your products</span>
        <p className="mb-2 text-[10px] text-[var(--foreground-muted)]">
          {chosen.size === 0
            ? "Leave it alone and the code discounts anything you sell."
            : `${chosen.size} named. Only those items count towards this code.`}
        </p>

        {pickable.length === 0 ? (
          <p className="rounded-xl bg-[var(--surface-alt)] px-3 py-2 text-[10px] text-[var(--foreground-muted)]">
            You have no listings to name yet, so this code covers your whole shop.
          </p>
        ) : (
          <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-2">
            {pickable.map((product) => (
              <label
                key={product._id}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1 text-[11px] text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={chosen.has(product._id)}
                  onChange={() => toggleProduct(product._id)}
                  className="h-3.5 w-3.5 accent-[var(--brand-flat)]"
                />
                <span className="min-w-0 flex-1 truncate">{product.title}</span>
                <span className="shrink-0 text-[10px] text-[var(--foreground-muted)]">
                  {formatPrice(product.price, currency)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-[11px] font-semibold text-[var(--foreground)] cursor-pointer">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(event) => set("isActive", event.target.checked)}
          className="h-3.5 w-3.5 accent-[var(--brand-flat)]"
        />
        Live as soon as it starts
      </label>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3.5 py-2 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs disabled:opacity-60 cursor-pointer"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {coupon ? "Save changes" : "Create code"}
        </button>
      </div>
    </form>
  );
}
