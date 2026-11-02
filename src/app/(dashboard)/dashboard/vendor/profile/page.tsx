import React from "react";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { getRequiredRole } from "@/lib/core/session";
import { asApplication, getMyVendorApplication } from "@/lib/api/vendor";
import { asStore, getMyStore } from "@/lib/api/vendorStore";
import StoreProfileClient from "./StoreProfileClient";

export const dynamic = "force-dynamic";

/**
 * The seller's own profile.
 *
 * Like every other role screen, this is the whole file the application wizard
 * collected — the person behind the shop, the storefront, the business address
 * and the verification upload — and every one of those answers can be changed
 * here. The storefront the buyers see is the same record: the API writes the
 * file and mirrors it onto the store row, so a save cannot leave the two
 * describing different shops.
 */

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border-color)] py-2 last:border-0">
      <span className="text-[11px] text-[var(--foreground-muted)]">{label}</span>
      <span className="max-w-[60%] break-words text-right text-[11px] font-semibold text-[var(--foreground)]">
        {value?.trim() ? value : "—"}
      </span>
    </div>
  );
}

/** The record's timestamp, as the day the seller signed the file. */
function asDay(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function VendorStoreProfilePage() {
  await getRequiredRole("vendor");

  const [storeResponse, applicationResponse] = await Promise.all([
    getMyStore().catch(() => null),
    getMyVendorApplication().catch(() => null),
  ]);

  const store = asStore(storeResponse);
  const application = asApplication(applicationResponse);

  if (!store) {
    return (
      <div className="space-y-5">
        <header>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Store profile</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            The details buyers and the store team see.
          </p>
        </header>

        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-6 text-center shadow-2xs">
          <Store className="mx-auto h-6 w-6 text-[var(--foreground-muted)]" />
          <p className="mt-2 text-xs font-semibold text-[var(--foreground)]">
            Your store row is not ready yet
          </p>
          <p className="mt-1 text-[11px] text-[var(--foreground-muted)]">
            It is created the moment your application is approved. Check the application status for
            the latest decision.
          </p>
          <Link
            href="/become-a-vendor/status"
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
          >
            View application
            <ArrowRight className="h-3 w-3" />
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StoreProfileClient store={store} application={application} />

      {application && (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Application record
          </h2>
          <Row label="Reference" value={application.reference} />
          <Row
            label="Status"
            value={application.status.replace("_", " ").replace(/^./, (letter) => letter.toUpperCase())}
          />
          <Row label="Applied" value={asDay(application.submittedAt)} />
          <Row
            label="Plan"
            value={`${application.selectedPlan} · ${application.billingCycle}`}
          />
          {application.reviewNotes ? (
            <Row label="Reviewer note" value={application.reviewNotes} />
          ) : null}
          {application.rejectionReason ? (
            <Row label="Rejection reason" value={application.rejectionReason} />
          ) : null}
          <p className="mt-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
            The plan is bought, not typed — change it on the{" "}
            <Link
              href="/dashboard/vendor/subscription"
              className="font-semibold text-primary hover:underline"
            >
              Plan &amp; Billing
            </Link>{" "}
            desk.
          </p>
        </section>
      )}
    </div>
  );
}
