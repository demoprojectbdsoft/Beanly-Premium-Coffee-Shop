"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  Check,
  ExternalLink,
  FileText,
  History,
  Loader2,
  MapPin,
  Play,
  Store,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import type { VendorApplicationDetail } from "@/types/vendor";
import { getVendorStatusStyle } from "@/lib/vendorStatus";
import { formatOrderDateTime } from "@/lib/dateTime";
import { reviewVendorApplication } from "@/lib/action/vendor";

/**
 * One application, and the two decisions that end it.
 *
 * A decision is never a single click on the list: it opens a confirmation that
 * asks for the note the applicant will read. Rejecting cannot be confirmed
 * without a reason, because that reason is the only thing the applicant gets
 * to act on before applying again.
 */

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  premium: "Premium",
  advanced: "Advanced",
};

type ReviewMode = "approve" | "reject" | "under_review" | null;

interface VendorReviewClientProps {
  detail: VendorApplicationDetail;
}

function value(input?: string | number | null): string {
  const text = input === null || input === undefined ? "" : String(input).trim();
  return text || "—";
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Store;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
      <h2 className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
        <Icon className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]">
        {label}
      </span>
      <span className="min-w-0 text-right text-[11px] font-medium text-[var(--foreground)] break-words">
        {children}
      </span>
    </div>
  );
}

export default function VendorReviewClient({ detail }: VendorReviewClientProps) {
  const { application, applicant, store } = detail;
  const router = useRouter();

  const [mode, setMode] = useState<ReviewMode>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const style = getVendorStatusStyle(application.status);
  const StatusIcon = style.icon;
  const decided = application.status === "approved" || application.status === "rejected";

  const address = application.businessAddress || {};
  const verification = application.verification || {};
  const socials = application.storeInfo?.socialLinks || {};
  const socialEntries = Object.entries(socials).filter(([, link]) => Boolean(link));

  const hasCoords =
    typeof address.latitude === "number" && typeof address.longitude === "number";

  const confirm = async () => {
    if (!mode || saving) return;

    if (mode === "reject" && reason.trim().length < 3) {
      toast.warning("Give a reason — the applicant is shown it.");
      return;
    }

    setSaving(true);
    try {
      const res = await reviewVendorApplication(application._id, {
        action: mode,
        reason: mode === "reject" ? reason.trim() : undefined,
        notes: notes.trim() || undefined,
      });

      if (res?.success === false) {
        toast.error(res.message || "The application could not be updated");
        return;
      }

      toast.success(
        mode === "approve"
          ? "Approved — the account is now a vendor"
          : mode === "reject"
            ? "Rejected — the applicant keeps their customer account"
            : "Moved to review"
      );

      setMode(null);
      setReason("");
      setNotes("");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/dashboard/admin/vendors"
            className="mb-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3 w-3" />
            All applications
          </Link>
          <h1 className="truncate text-lg font-bold text-[var(--foreground)]">
            {application.storeInfo?.name || "Unnamed store"}
          </h1>
          <p className="font-mono text-[11px] text-[var(--foreground-muted)]">
            {application.reference} · submitted {formatOrderDateTime(application.submittedAt) || "—"}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}
        >
          <StatusIcon className="h-3 w-3" />
          {style.label}
        </span>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-5">
          <Panel title="Store" icon={Store}>
            <div className="mb-3 flex items-start gap-3">
              {application.storeInfo?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={application.storeInfo.logo}
                  alt={application.storeInfo.name}
                  className="h-12 w-12 shrink-0 rounded-xl border border-[var(--border-color)] object-cover"
                />
              ) : (
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]">
                  <Store className="h-5 w-5 text-[var(--foreground-muted)]" />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[var(--foreground)]">
                  {value(application.storeInfo?.name)}
                </p>
                <p className="truncate text-[10px] text-[var(--foreground-muted)]">
                  {value(application.storeInfo?.category)}
                </p>
              </div>
            </div>

            {application.storeInfo?.description && (
              <p className="mb-2 whitespace-pre-line rounded-xl bg-[var(--surface-alt)] p-2.5 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                {application.storeInfo.description}
              </p>
            )}

            <Row label="Link">{`/${value(application.storeInfo?.slug)}`}</Row>
            <Row label="Email">{value(application.storeInfo?.email)}</Row>
            <Row label="Phone">{value(application.storeInfo?.phone)}</Row>
            <Row label="Website">
              {application.storeInfo?.website ? (
                <a
                  href={application.storeInfo.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--brand-flat)] hover:underline"
                >
                  <span className="max-w-[180px] truncate">{application.storeInfo.website}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                "—"
              )}
            </Row>
            {socialEntries.length > 0 && (
              <Row label="Social">
                <span className="inline-flex flex-wrap justify-end gap-2">
                  {socialEntries.map(([network, link]) => (
                    <a
                      key={network}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="capitalize text-[var(--brand-flat)] hover:underline"
                    >
                      {network}
                    </a>
                  ))}
                </span>
              </Row>
            )}
          </Panel>

          <Panel title="Applicant account" icon={UserRound}>
            <div className="mb-3 flex items-start gap-3">
              {applicant?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={applicant.image}
                  alt={applicant.name}
                  className="h-10 w-10 shrink-0 rounded-full border border-[var(--border-color)] object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-alt)] text-xs font-bold text-[var(--foreground-muted)]">
                  {(applicant?.name || application.personalInfo?.fullName || "?")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-[var(--foreground)]">
                  {value(applicant?.name || application.personalInfo?.fullName)}
                </p>
                <p className="truncate text-[10px] text-[var(--foreground-muted)]">
                  {value(applicant?.email || application.personalInfo?.email)}
                </p>
              </div>
            </div>

            <Row label="Phone">
              {value(applicant?.phone || application.personalInfo?.phone)}
            </Row>
            <Row label="Account role">
              <span className="capitalize">{value(applicant?.role)}</span>
            </Row>
            <Row label="Account status">
              <span className="capitalize">{value(applicant?.status)}</span>
            </Row>
            <p className="mt-2 rounded-lg bg-[var(--surface-alt)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              Approval converts this one account in place. Orders, reviews, wishlist, wallet and
              addresses stay exactly as they are.
            </p>
          </Panel>

          <Panel title="Business address" icon={MapPin}>
            <Row label="Country">{value(address.country)}</Row>
            <Row label="Division">{value(address.division)}</Row>
            <Row label="City">{value(address.city)}</Row>
            <Row label="Area">{value(address.area)}</Row>
            <Row label="Street">{value(address.address)}</Row>
            <Row label="Postal code">{value(address.postalCode)}</Row>
            {hasCoords && (
              <Row label="Map">
                <a
                  href={`https://www.google.com/maps?q=${address.latitude},${address.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--brand-flat)] hover:underline"
                >
                  Open pin
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Row>
            )}
          </Panel>

          <Panel title="Verification" icon={FileText}>
            <Row label="Business type">{value(verification.businessType)}</Row>
            <Row label="Registration">{value(verification.registrationNumber)}</Row>
            <Row label="Document">
              {verification.documentUrl ? (
                <a
                  href={verification.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--brand-flat)] hover:underline"
                >
                  View file
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                "—"
              )}
            </Row>
            {verification.notes && (
              <p className="mt-2 whitespace-pre-line rounded-xl bg-[var(--surface-alt)] p-2.5 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                {verification.notes}
              </p>
            )}
          </Panel>

          <Panel title="History" icon={History}>
            {application.history?.length ? (
              <ol className="space-y-2.5">
                {application.history.map((event, index) => {
                  const eventStyle = getVendorStatusStyle(event.status);
                  return (
                    <li key={`${event.status}-${event.at}-${index}`} className="flex gap-2.5">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${eventStyle.dot}`} />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-[var(--foreground)]">
                          {eventStyle.label}
                          <span className="ml-2 font-normal text-[var(--foreground-muted)]">
                            {formatOrderDateTime(event.at) || "—"}
                          </span>
                        </p>
                        {event.note && (
                          <p className="text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                            {event.note}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-[11px] text-[var(--foreground-muted)]">No events recorded yet.</p>
            )}
          </Panel>
        </div>

        {/* Decision panel */}
        <aside className="space-y-3 lg:sticky lg:top-4">
          <Panel title="Subscription" icon={BadgeCheck}>
            <Row label="Plan">
              {PLAN_LABELS[application.selectedPlan] || application.selectedPlan}
            </Row>
            <Row label="Billing">
              <span className="capitalize">{application.billingCycle}</span>
            </Row>
            <p className="mt-2 rounded-lg bg-[var(--surface-alt)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              {application.selectedPlan === "free"
                ? "The Free plan activates on approval. No checkout is needed."
                : "A paid plan is activated after the vendor completes the demo checkout with their existing sign-in."}
            </p>
          </Panel>

          {decided ? (
            <Panel title="Decision" icon={BadgeCheck}>
              <Row label="Reviewed">{formatOrderDateTime(application.reviewedAt) || "—"}</Row>
              <Row label="Outcome">
                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}>
                  <StatusIcon className="h-2.5 w-2.5" />
                  {style.label}
                </span>
              </Row>
              {application.status === "rejected" && (
                <>
                  <Row label="Reason">{value(application.rejectionReason)}</Row>
                  <p className="mt-2 rounded-lg bg-[var(--surface-alt)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                    The applicant keeps the customer role and may resubmit a corrected
                    application.
                  </p>
                </>
              )}
              {application.status === "approved" && store && (
                <>
                  <Row label="Store status">
                    <span className="capitalize">{value(store.status)}</span>
                  </Row>
                  <Row label="Store link">{`/${value(store.slug)}`}</Row>
                  <p className="mt-2 rounded-lg bg-[var(--surface-alt)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                    The account now carries the vendor role, and can still shop as a customer.
                  </p>
                </>
              )}
              {application.reviewNotes && (
                <p className="mt-2 whitespace-pre-line rounded-lg bg-[var(--surface-alt)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                  {application.reviewNotes}
                </p>
              )}
            </Panel>
          ) : mode ? (
            <Panel
              title={
                mode === "approve"
                  ? "Confirm approval"
                  : mode === "reject"
                    ? "Confirm rejection"
                    : "Start review"
              }
              icon={mode === "reject" ? Ban : mode === "approve" ? Check : Play}
            >
              {mode === "approve" && (
                <p className="mb-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                  This creates the store, grants the vendor role on the existing account and keeps
                  every customer record.
                </p>
              )}
              {mode === "reject" && (
                <>
                  <p className="mb-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                    The account stays a customer and is shown this reason. It is required.
                  </p>
                  <textarea
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    rows={3}
                    placeholder="What must be fixed before applying again?"
                    className="mb-2 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
                  />
                </>
              )}
              {mode === "under_review" && (
                <p className="mb-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                  The applicant stays signed out while the documents are checked.
                </p>
              )}

              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                placeholder="Internal note (optional)"
                className="mb-3 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
              />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={confirm}
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs transition-opacity disabled:opacity-60 cursor-pointer"
                >
                  {saving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : mode === "reject" ? (
                    <Ban className="h-3.5 w-3.5" />
                  ) : mode === "approve" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  {saving ? "Saving" : mode === "approve" ? "Approve" : mode === "reject" ? "Reject" : "Move to review"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-60 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              </div>
            </Panel>
          ) : (
            <Panel title="Decision" icon={BadgeCheck}>
              {application.status === "under_review" ? (
                <p className="mb-3 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                  This application is being checked. Approve it, or reject it with a reason the
                  applicant can act on.
                </p>
              ) : (
                <p className="mb-3 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                  Open a decision to confirm it. Rejections require a reason.
                </p>
              )}

              <div className="space-y-2">
                {application.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => setMode("under_review")}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Start review
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMode("approve")}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve store
                </button>
                <button
                  type="button"
                  onClick={() => setMode("reject")}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-[11px] font-semibold text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10 cursor-pointer"
                >
                  <Ban className="h-3.5 w-3.5" />
                  Reject application
                </button>
              </div>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}
