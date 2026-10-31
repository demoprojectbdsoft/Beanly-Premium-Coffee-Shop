"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Copy,
  Loader2,
  Store,
  Undo2,
} from "lucide-react";
import type { VendorApplication } from "@/types/vendor";
import { cancelVendorApplication } from "@/lib/action/vendor";
import { getVendorStatusStyle, isApplicationBlocking } from "@/lib/vendorStatus";
import { formatOrderDateTime } from "@/lib/dateTime";

/**
 * One application, shown to the person who submitted it.
 *
 * It answers four questions in order: what state am I in, what happens next,
 * what did the store team say, and what has happened so far. The withdraw
 * button is the applicant's one write here — everything else is a read.
 */

interface VendorApplicationStatusProps {
  application: VendorApplication;
}

export default function VendorApplicationStatus({ application }: VendorApplicationStatusProps) {
  const router = useRouter();
  const [withdrawing, setWithdrawing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const style = getVendorStatusStyle(application.status);
  const StatusIcon = style.icon;
  const blocking = isApplicationBlocking(application.status);
  const canReapply = application.status === "rejected" || application.status === "cancelled";
  const approved = application.status === "approved";

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(application.reference);
      toast.success("Reference copied");
    } catch {
      toast.error("Could not copy the reference");
    }
  };

  const handleWithdraw = async () => {
    if (withdrawing) return;

    setWithdrawing(true);
    try {
      const result = (await cancelVendorApplication()) as
        | { success?: boolean; message?: string }
        | null;

      if (result?.success === false) {
        toast.error(result.message || "The application could not be withdrawn.");
        return;
      }

      toast.success("Application withdrawn");
      setConfirming(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "The application could not be withdrawn."
      );
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* State */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}
            >
              <StatusIcon className="w-3 h-3" />
              {style.label}
            </span>
            <h1 className="text-lg font-bold text-[var(--foreground)]">
              {application.storeInfo.name}
            </h1>
            <p className="max-w-xl text-[11px] text-[var(--foreground-muted)]">
              {style.description}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
              Reference
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[var(--foreground)]">
                {application.reference}
              </span>
              <button
                type="button"
                onClick={copyReference}
                aria-label="Copy reference"
                className="rounded-md p-1 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] cursor-pointer"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
              Submitted
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--foreground)]">
              <CalendarClock className="w-3.5 h-3.5 text-[var(--brand-flat)]" />
              {formatOrderDateTime(application.submittedAt) || "—"}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
              Plan
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold capitalize text-[var(--foreground)]">
              <Building2 className="w-3.5 h-3.5 text-[var(--brand-flat)]" />
              {application.selectedPlan} · {application.billingCycle}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
              Store link
            </p>
            <p className="mt-1 flex items-center gap-1.5 truncate text-[11px] font-semibold text-[var(--foreground)]">
              <Store className="w-3.5 h-3.5 text-[var(--brand-flat)]" />
              /store/{application.storeInfo.slug}
            </p>
          </div>
        </div>
      </section>

      {/* The reviewer's words, when there are any */}
      {application.rejectionReason && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
            Why it was not approved
          </p>
          <p className="mt-1 text-[11px] text-rose-800 dark:text-rose-200">
            {application.rejectionReason}
          </p>
        </section>
      )}

      {application.reviewNotes && (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Note from the store team
          </p>
          <p className="mt-1 text-[11px] text-[var(--foreground)]">{application.reviewNotes}</p>
        </section>
      )}

      {/* What happens next */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          What happens next
        </p>

        <div className="mt-2 space-y-3">
          {blocking && (
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Sign-in is paused while the application is open. You will be emailed the moment the
              store team decides, and then you can sign in with the same password as before.
            </p>
          )}

          {approved && (
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Your store is live on the same account. Nothing from your customer history was
              touched — you can still shop from other vendors with this login.
            </p>
          )}

          {canReapply && (
            <p className="text-[11px] text-[var(--foreground-muted)]">
              You can apply again whenever you are ready. The new application reuses this
              reference, so the store team keeps the earlier review in the same file.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {approved && (
              <Link
                href="/dashboard/vendor"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2 text-xs font-bold text-[var(--on-grad-text)] shadow-xs transition-all hover:shadow-md"
              >
                Open the vendor dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            {canReapply && (
              <Link
                href="/become-a-vendor/apply"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2 text-xs font-bold text-[var(--on-grad-text)] shadow-xs transition-all hover:shadow-md"
              >
                Apply again
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}

            {blocking && !confirming && (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2 text-xs font-semibold text-[var(--foreground-muted)] transition-colors hover:border-rose-300 hover:text-rose-600 cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Withdraw application
              </button>
            )}

            {blocking && confirming && (
              <span className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-2">
                <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300">
                  Withdraw and give up this application?
                </span>
                <button
                  type="button"
                  onClick={handleWithdraw}
                  disabled={withdrawing}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-60 cursor-pointer"
                >
                  {withdrawing && <Loader2 className="w-3 h-3 animate-spin" />}
                  Yes, withdraw
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-lg px-2 py-1 text-[10px] font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  Keep it
                </button>
              </span>
            )}

            <Link
              href="/"
              className="rounded-xl px-3 py-2 text-xs font-semibold text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
            >
              Back to the store
            </Link>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          History
        </p>
        <ol className="mt-3 space-y-3">
          {[...application.history].reverse().map((event, index) => {
            const eventStyle = getVendorStatusStyle(event.status);
            return (
              <li key={`${event.status}-${event.at}-${index}`} className="flex gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${eventStyle.dot}`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[var(--foreground)]">
                    {eventStyle.label}
                  </p>
                  <p className="text-[10px] text-[var(--foreground-muted)]">
                    {formatOrderDateTime(event.at)}
                    {event.note ? ` · ${event.note}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
          {application.history.length === 0 && (
            <li className="text-[11px] text-[var(--foreground-muted)]">No events yet.</li>
          )}
        </ol>
      </section>
    </div>
  );
}
