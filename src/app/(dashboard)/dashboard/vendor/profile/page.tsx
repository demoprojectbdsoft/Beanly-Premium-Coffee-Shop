import React from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Globe, Mail, MapPin, Phone, Store } from "lucide-react";
import { getRequiredRole } from "@/lib/core/session";
import { asApplication, getMyVendorApplication } from "@/lib/api/vendor";
import { formatOrderDate } from "@/lib/dateTime";

export const dynamic = "force-dynamic";

/**
 * The store as the marketplace currently holds it.
 *
 * It is a read of the approved application, which is the source the store row
 * was created from. Editing is deliberately absent: a store profile change goes
 * through the store settings screen that arrives with the catalogue work, and a
 * half-editable copy here would let the two disagree.
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
  const application = asApplication(await getMyVendorApplication());

  const store = application?.storeInfo;
  const address = application?.businessAddress;
  const verification = application?.verification;

  const addressLine = [address?.address, address?.area, address?.city, address?.division]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Store profile</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            The details buyers and the store team see.
          </p>
        </div>

        <Link
          href="/contact"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)]"
        >
          Ask for a change
          <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--brand-flat)]">
              {store?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={store.logo} alt={store.name} className="h-full w-full object-cover" />
              ) : (
                <Store className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[var(--foreground)]">
                {store?.name || "Your store"}
              </p>
              <p className="flex items-center gap-1 text-[10px] text-[var(--foreground-muted)]">
                <BadgeCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                /store/{store?.slug || "—"}
              </p>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
            {store?.description || "No description yet."}
          </p>

          <div className="mt-3">
            <Row label="Category" value={store?.category} />
            <Row label="Store email" value={store?.email} />
            <Row label="Store phone" value={store?.phone} />
            <Row label="Website" value={store?.website} />
            <Row label="Approved on" value={formatOrderDate(application?.reviewedAt)} />
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
            <h2 className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
              <MapPin className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
              Business address
            </h2>
            <p className="mt-2 text-[11px] text-[var(--foreground)]">
              {addressLine || "No address on file."}
            </p>
            <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">
              {address?.postalCode ? `Postal code ${address.postalCode}` : "No postal code"}
            </p>
          </section>

          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
            <h2 className="text-xs font-bold text-[var(--foreground)]">Verification on file</h2>
            <div className="mt-2">
              <Row label="Business type" value={verification?.businessType} />
              <Row label="Registration" value={verification?.registrationNumber} />
              <Row label="Document" value={verification?.documentUrl} />
              <Row label="Notes" value={verification?.notes} />
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
            <h2 className="text-xs font-bold text-[var(--foreground)]">Contact on file</h2>
            <div className="mt-2 space-y-1.5 text-[11px] text-[var(--foreground-muted)]">
              <p className="flex items-center gap-1.5">
                <Mail className="h-3 w-3" />
                {application?.personalInfo?.email || "—"}
              </p>
              <p className="flex items-center gap-1.5">
                <Phone className="h-3 w-3" />
                {application?.personalInfo?.phone || "—"}
              </p>
              {store?.website && (
                <p className="flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  {store.website}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
