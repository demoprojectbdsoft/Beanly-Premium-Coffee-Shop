import React from "react";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { getRequiredRole } from "@/lib/core/session";
import { asApplication, getMyVendorApplication } from "@/lib/api/vendor";
import { asStore, getMyStore } from "@/lib/api/vendorStore";
import StoreProfileClient from "./StoreProfileClient";

export const dynamic = "force-dynamic";

/**
 * The store as the marketplace currently holds it.
 *
 * The editable half is the store row itself — the same row the public
 * storefront will read — so a change saved here is what buyers see. The
 * verification details below stay read-only: they are part of the application
 * the store team approved, and an edit would need a fresh review.
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

export default async function VendorStoreProfilePage() {
  await getRequiredRole("vendor");

  const [storeResponse, applicationResponse] = await Promise.all([
    getMyStore(),
    getMyVendorApplication(),
  ]);

  const store = asStore(storeResponse);
  const application = asApplication(applicationResponse);
  const verification = application?.verification;
  const personal = application?.personalInfo;

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
      <StoreProfileClient store={store} />

      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
        <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          Verification on file
        </h2>
        <Row label="Business type" value={verification?.businessType} />
        <Row label="Registration" value={verification?.registrationNumber} />
        <Row label="Document" value={verification?.documentUrl} />
        <Row label="Account email" value={personal?.email} />
        <Row label="Account phone" value={personal?.phone} />
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
          These come from the application the store team approved. To change them, contact support so
          the update can be reviewed.
        </p>
      </section>
    </div>
  );
}
