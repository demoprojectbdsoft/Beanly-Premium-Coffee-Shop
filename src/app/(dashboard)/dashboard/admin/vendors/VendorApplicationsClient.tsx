"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Search,
  Store,
} from "lucide-react";
import type { VendorApplication, VendorPagination } from "@/types/vendor";
import { getVendorStatusStyle } from "@/lib/vendorStatus";
import { formatOrderDate } from "@/lib/dateTime";

/**
 * The review queue table.
 *
 * The store team reads this to decide one thing: which application to open
 * next. Everything else — the documents, the history, the approve and reject
 * buttons — lives on the review screen, so a decision is never one mis-click
 * away from a list.
 */

interface VendorApplicationsClientProps {
  applications: VendorApplication[];
  typeCounts: Record<string, number>;
  pagination: VendorPagination;
  filters: { status: string; search: string; limit: number };
}

const FILTER_TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "under_review", label: "Under review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "cancelled", label: "Withdrawn" },
];

export default function VendorApplicationsClient({
  applications,
  typeCounts,
  pagination,
  filters,
}: VendorApplicationsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);

  const go = (next: { page?: number; search?: string; status?: string }) => {
    const params = new URLSearchParams();
    const nextSearch = (next.search ?? search).trim();
    const nextStatus = next.status ?? filters.status;
    const page = next.page ?? 1;

    if (nextSearch) params.set("search", nextSearch);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    router.push(query ? `/dashboard/admin/vendors?${query}` : "/dashboard/admin/vendors");
  };

  const waiting = (typeCounts.pending || 0) + (typeCounts.under_review || 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Vendor applications</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Approval grants the vendor role on the applicant&apos;s existing account — no second
            user is ever created.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] shadow-2xs">
          <Inbox className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
          {waiting} waiting for a decision
        </span>
      </header>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTER_TABS.map((tab) => {
            const active = filters.status === tab.key;
            const count = tab.key === "all" ? pagination.total : typeCounts[tab.key] || 0;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => go({ status: tab.key, page: 1 })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                    : "text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded px-1 text-[9px] font-bold ${
                    active ? "bg-white/20" : "bg-[var(--surface-alt)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            go({ search, page: 1 });
          }}
          className="relative w-full sm:w-64"
        >
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Store, name, email, reference"
            className="h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] pl-9 pr-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
          />
        </form>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="hidden grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr_auto] gap-3 border-b border-[var(--border-color)] bg-[var(--surface-alt)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)] lg:grid">
          <span>Store</span>
          <span>Applicant</span>
          <span>Plan</span>
          <span>Submitted</span>
          <span className="text-right">Status</span>
        </div>

        {applications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Store className="h-6 w-6 text-[var(--foreground-muted)]" />
            <p className="text-xs font-semibold text-[var(--foreground)]">No applications here</p>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              {filters.search
                ? "Nothing matches that search. Try the reference or the store name."
                : "A new application appears the moment a customer submits one."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-color)]">
            {applications.map((application) => {
              const style = getVendorStatusStyle(application.status);
              const StatusIcon = style.icon;

              return (
                <li key={application._id}>
                  <Link
                    href={`/dashboard/admin/vendors/${application._id}`}
                    className="grid gap-2 px-4 py-3 transition-colors hover:bg-[var(--surface-alt)]/70 lg:grid-cols-[1.4fr_1.2fr_0.8fr_0.8fr_auto] lg:items-center lg:gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[var(--foreground)]">
                        {application.storeInfo?.name || "Unnamed store"}
                      </p>
                      <p className="font-mono text-[10px] text-[var(--foreground-muted)]">
                        {application.reference}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-[var(--foreground)]">
                        {application.personalInfo?.fullName || "—"}
                      </p>
                      <p className="truncate text-[10px] text-[var(--foreground-muted)]">
                        {application.personalInfo?.email || "—"}
                      </p>
                    </div>

                    <p className="text-[11px] capitalize text-[var(--foreground-muted)]">
                      {application.selectedPlan} · {application.billingCycle}
                    </p>

                    <p className="text-[11px] text-[var(--foreground-muted)]">
                      {formatOrderDate(application.submittedAt) || "—"}
                    </p>

                    <div className="flex items-center justify-between gap-2 lg:justify-end">
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${style.badge}`}
                      >
                        <StatusIcon className="h-2.5 w-2.5" />
                        {style.label}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-[var(--foreground-muted)]" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Paging */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-2.5 shadow-2xs">
          <p className="text-[10px] text-[var(--foreground-muted)]">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} applications
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go({ page: pagination.page - 1 })}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => go({ page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
