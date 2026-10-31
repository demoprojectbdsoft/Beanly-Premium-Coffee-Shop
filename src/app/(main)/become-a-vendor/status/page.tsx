import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, FileSearch } from "lucide-react";
import { getUserSession } from "@/lib/core/session";
import { isVendorRole } from "@/lib/core/roles";
import { asApplication, getMyVendorApplication } from "@/lib/api/vendor";
import { getVendorStatusLabel } from "@/lib/vendorStatus";
import VendorApplicationStatus from "@/components/vendor/VendorApplicationStatus";

export const dynamic = "force-dynamic";

/**
 * The applicant's own file.
 *
 * It is reached after a decision — a rejected or withdrawn applicant can sign
 * in again and read the reason here — and straight after submitting, while the
 * session created before the application still lives. Once that session ends, a
 * pending applicant cannot sign in at all, which is the restriction the API
 * enforces on every provider.
 */
export default async function VendorApplicationStatusPage() {
  const user = await getUserSession();
  if (!user) {
    redirect("/auth/login?callbackUrl=%2Fbecome-a-vendor%2Fstatus");
  }
  if (isVendorRole(user)) {
    redirect("/dashboard/vendor");
  }

  const application = asApplication(await getMyVendorApplication());

  return (
    <div className="py-8 space-y-5">
      <header className="space-y-2">
        <Link
          href="/become-a-vendor"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Become a vendor
        </Link>

        <h1 className="text-2xl font-bold text-[var(--foreground)]">Your vendor application</h1>
        <p className="max-w-2xl text-xs text-[var(--foreground-muted)]">
          {application
            ? `Current state: ${getVendorStatusLabel(application.status)}.`
            : "This account has not applied to sell yet."}
        </p>
      </header>

      {application ? (
        <VendorApplicationStatus application={application} />
      ) : (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-8 text-center shadow-2xs">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-flat)]/12 text-[var(--brand-flat)]">
            <FileSearch className="w-5 h-5" />
          </span>
          <h2 className="mt-4 text-sm font-bold text-[var(--foreground)]">No application yet</h2>
          <p className="mx-auto mt-1 max-w-md text-[11px] text-[var(--foreground-muted)]">
            Open the six-step form and your name, email and phone will already be filled in from
            this account.
          </p>
          <Link
            href="/become-a-vendor/apply"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2 text-xs font-bold text-[var(--on-grad-text)] shadow-xs transition-all hover:shadow-md"
          >
            Start an application
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      )}
    </div>
  );
}
