import React from "react";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { getRequiredRole } from "@/lib/core/session";
import { asCouponList } from "@/lib/api/coupons";
import { getMyCoupons } from "@/lib/api/vendorCoupons";
import { asSubscription, getMySubscription } from "@/lib/api/vendorSubscription";
import { asProductList, getMyProducts } from "@/lib/api/vendorProducts";
import { getSiteSettings } from "@/lib/api/siteSettings";
import VendorCouponsClient from "./VendorCouponsClient";

export const dynamic = "force-dynamic";

/** The four readings of a code, which is what the tabs switch between. */
const STATUS_CHOICES = ["all", "live", "upcoming", "expired", "stopped"];

interface VendorCouponsPageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
}

/**
 * The seller's discount codes.
 *
 * The list, the plan allowance and the products a code may name are read
 * together so the desk shows one moment: the "x of y used" line describes the
 * same instant as the rows beneath it, and the product picker can only offer
 * things this seller actually sells.
 */
export default async function VendorCouponsPage({ searchParams }: VendorCouponsPageProps) {
  await getRequiredRole("vendor");

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const status = STATUS_CHOICES.includes(params?.status || "") ? params!.status! : "all";
  const search = params?.search?.trim().slice(0, 60) || "";

  const [list, subscription, catalogue, settingsRes] = await Promise.all([
    getMyCoupons({ status, search, page, limit: 20 }),
    getMySubscription().then(asSubscription),
    getMyProducts({ status: "all", limit: 100 }).then(asProductList),
    getSiteSettings(),
  ]);

  const result = asCouponList(list);

  if (!result) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Coupons</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Your discount codes could not be read just now.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[var(--surface-alt)] p-2 text-[var(--foreground-muted)]">
              <Ticket className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">No codes to show</p>
              <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                Nothing was changed and nothing is lost — every code you saved is still there.
                Reload this page to read the list again.
              </p>
              <Link
                href="/dashboard/vendor/subscription"
                className="mt-3 inline-flex items-center gap-1 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
              >
                Plan &amp; billing
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <VendorCouponsClient
      coupons={result.coupons}
      typeCounts={result.typeCounts}
      pagination={result.pagination}
      filters={{ status, search }}
      allowance={{
        planName: subscription?.plan.name || "Free",
        limit: subscription?.plan.activeCoupons ?? 0,
        used: subscription?.usage.activeCoupons ?? 0,
        isLive: subscription?.isLive ?? false,
      }}
      products={(catalogue?.products ?? []).map((product) => ({
        _id: product._id,
        title: product.title,
        vendorProductStatus: product.vendorProductStatus,
        price: product.price,
      }))}
      currency={settingsRes?.data?.currency || "BDT"}
    />
  );
}
