import React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getRequiredRole } from "@/lib/core/session";
import { asPromotionList, getMyPromotions } from "@/lib/api/vendorPromotions";
import { asSubscription, getMySubscription } from "@/lib/api/vendorSubscription";
import { asProductList, getMyProducts } from "@/lib/api/vendorProducts";
import { getSiteSettings } from "@/lib/api/siteSettings";
import VendorPromotionsClient from "./VendorPromotionsClient";

export const dynamic = "force-dynamic";

/** The three readings of a placement, which is what the tabs switch between. */
const STATUS_CHOICES = ["all", "live", "ended", "cancelled"];
const KIND_CHOICES = ["all", "product", "store"];

interface VendorPromotionsPageProps {
  searchParams: Promise<{
    status?: string;
    kind?: string;
    page?: string;
  }>;
}

/**
 * The seller's featured placements.
 *
 * The list, the plan allowance and the seller's own listings are read together
 * so the desk shows one moment: the "x of y slots used" line describes the same
 * instant as the rows beneath it, and the picker can only offer things this shop
 * actually sells.
 */
export default async function VendorPromotionsPage({ searchParams }: VendorPromotionsPageProps) {
  await getRequiredRole("vendor");

  const params = await searchParams;
  const page = Math.max(1, Number(params?.page) || 1);
  const status = STATUS_CHOICES.includes(params?.status || "") ? params!.status! : "all";
  const kind = KIND_CHOICES.includes(params?.kind || "") ? params!.kind! : "all";

  const [list, subscription, catalogue, settingsRes] = await Promise.all([
    getMyPromotions({ status, kind, page, limit: 20 }),
    getMySubscription().then(asSubscription),
    getMyProducts({ status: "all", limit: 100 }).then(asProductList),
    getSiteSettings(),
  ]);

  const result = asPromotionList(list);

  if (!result) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Promotions</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Your featured placements could not be read just now.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-[var(--surface-alt)] p-2 text-[var(--foreground-muted)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">No placements to show</p>
              <p className="mt-1 max-w-md text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                Nothing was changed and nothing is lost — every shelf you booked is still booked.
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
    <VendorPromotionsClient
      placements={result.promotions}
      stateCounts={result.stateCounts}
      pagination={result.pagination}
      filters={{ status, kind }}
      allowance={{
        planName: subscription?.plan.name || "Free",
        limit: subscription?.plan.featuredProducts ?? 0,
        used: subscription?.usage.featuredProducts ?? 0,
        durationDays: subscription?.plan.featuredDurationDays ?? 0,
        isLive: subscription?.isLive ?? false,
      }}
      products={(catalogue?.products ?? [])
        .filter((product) =>
          ["published", "out_of_stock"].includes(product.vendorProductStatus || "")
        )
        .map((product) => ({
          _id: product._id,
          title: product.title,
          image: product.image || "",
          price: product.price,
          vendorProductStatus: product.vendorProductStatus || "",
        }))}
      currency={settingsRes?.data?.currency || "BDT"}
    />
  );
}
