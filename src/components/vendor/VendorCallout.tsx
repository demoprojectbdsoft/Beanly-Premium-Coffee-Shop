import React from "react";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import type { VendorApplication } from "@/types/vendor";
import { getVendorStatusStyle } from "@/lib/vendorStatus";

/**
 * The conversion banner on the customer dashboard.
 *
 * It is the one place a signed-in customer is told they can sell, and it says
 * exactly where they stand: no application yet, one in review, or one that was
 * rejected and can be fixed and sent again. A vendor never sees it, because
 * this banner is rendered by the customer page only.
 */
export default function VendorCallout({
  application,
}: {
  application: VendorApplication | null;
}) {
  const status = application?.status;
  const style = application ? getVendorStatusStyle(status) : null;
  const StatusIcon = style?.icon;

  const copy = () => {
    if (!application) {
      return {
        title: "Sell on the marketplace",
        text: "Open a store with the account you already use. Your orders, wallet, wishlist and addresses stay exactly as they are.",
        cta: "Become a Vendor",
        href: "/become-a-vendor/apply",
      };
    }

    if (status === "rejected") {
      return {
        title: "Your vendor application was not approved",
        text:
          application.rejectionReason ||
          "Open your application to read the reason, fix it and send it again.",
        cta: "Read the reason",
        href: "/become-a-vendor/status",
      };
    }

    if (status === "cancelled") {
      return {
        title: "Your vendor application was withdrawn",
        text: "You can pick it up again whenever you are ready — your earlier answers are still there.",
        cta: "Continue application",
        href: "/become-a-vendor/apply",
      };
    }

    return {
      title: "Your vendor application is with the store team",
      text: "You will be emailed at the decision. Open the application to see its history and reference.",
      cta: "View application",
      href: "/become-a-vendor/status",
    };
  };

  const content = copy();

  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-[var(--on-grad-text)] shadow-xs">
            <Store className="w-4 h-4" />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold text-[var(--foreground)]">{content.title}</p>
              {style && StatusIcon && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                >
                  <StatusIcon className="w-2.5 h-2.5" />
                  {style.label}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
              {content.text}
            </p>
          </div>
        </div>

        <Link
          href={content.href}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--brand-flat)]/30 px-3.5 py-2 text-[11px] font-bold text-[var(--brand-flat)] transition-colors hover:bg-[var(--brand-flat)]/10"
        >
          {content.cta}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}
