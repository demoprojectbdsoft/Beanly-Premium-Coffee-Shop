import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, FileSearch } from "lucide-react";
import { getUserSession } from "@/lib/core/session";
import { hasRole } from "@/lib/core/roles";
import { asRiderApplication, getMyRiderApplication } from "@/lib/api/rider";
import { getRiderStatusLabel } from "@/lib/riderStatus";
import RiderApplicationStatus from "@/components/rider/RiderApplicationStatus";

export const dynamic = "force-dynamic";

/**
 * The rider applicant's own file.
 *
 * An open application no longer pauses sign-in, so the applicant can return
 * here any time to read the state and the reviewer's note. An approved rider is
 * sent straight to the rider dashboard instead.
 */
export default async function RiderApplicationStatusPage() {
  const user = await getUserSession();
  if (!user) {
    redirect("/auth/login?callbackUrl=%2Fbecome-a-rider%2Fstatus");
  }
  if (hasRole(user, "rider")) {
    redirect("/dashboard/rider");
  }

  const application = asRiderApplication(await getMyRiderApplication());

  return (
    <div className="py-8 space-y-5">
      <header className="space-y-2">
        <Link
          href="/become-a-rider"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Become a rider
        </Link>

        <h1 className="text-2xl font-bold text-[var(--foreground)]">Your rider application</h1>
        <p className="max-w-2xl text-xs text-[var(--foreground-muted)]">
          {application
            ? `Current state: ${getRiderStatusLabel(application.status)}.`
            : "This account has not applied to deliver yet."}
        </p>
      </header>

      {application ? (
        <RiderApplicationStatus application={application} />
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
            href="/become-a-rider/apply"
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
