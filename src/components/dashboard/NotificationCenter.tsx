"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Pagination } from "@heroui/react";
import { ArrowDownWideNarrow, CheckCheck, Inbox, Loader2, Search, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "react-toastify";

import AppSelect from "@/components/shared/AppSelect";

import {
  loadFeedPage,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/action/notifications";
import {
  isSeenInSnapshot,
  markStoreActivitiesSeen,
  markStoreActivitiesSeenUntil,
  storeReadSnapshot,
  type StoreReadSnapshot,
} from "@/lib/activityReads";
import { formatOrderDateTime, formatTimeAgo } from "@/lib/dateTime";
import {
  NOTIFICATION_EMPTY,
  NOTIFICATION_FALLBACK_ICON,
  NOTIFICATION_ICONS,
  NOTIFICATION_PAGE_COPY,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_ORDER,
  notificationHref,
  type NotificationView,
} from "@/lib/notifications";
import type { NotificationItem, NotificationPage, NotificationTypeCounts } from "@/types";

/** How many lines one page holds; the pager prints the same number. */
const PAGE_SIZE = 20;

/** How long typing pauses before the search is sent to the API. */
const SEARCH_DEBOUNCE_MS = 300;

type SortKey = "newest" | "oldest" | "unread";

/** One line as the list draws it, whichever feed it came from. */
interface Row {
  id: string;
  title: string;
  detail?: string;
  createdAt: string;
  href: string;
  icon: LucideIcon;
  /** The server's read mark. Only a personal line ever carries one. */
  read: boolean;
}

function toRows(items: NotificationItem[], view: NotificationView): Row[] {
  return items.map((line) => ({
    id: line._id,
    title: line.title,
    detail: line.detail,
    createdAt: line.createdAt,
    // The route is built here, not stored, so an old line still opens the
    // right page after a rename.
    href: notificationHref(line, view),
    icon: NOTIFICATION_ICONS[line.type] || NOTIFICATION_FALLBACK_ICON,
    read: Boolean(line.readAt),
  }));
}

export interface NotificationCenterProps {
  /** Which side of the app this page belongs to; decides the copy and the links. */
  view: NotificationView;
  /** The first page, rendered on the server so the screen is never blank. */
  initial: NotificationPage;
}

/**
 * The notifications page, for every role.
 *
 * One component draws all four screens: the store team's shared board and each
 * account's own feed. Search, the type chips, the order, the unread switch and
 * the pager work the same way everywhere; only the rows behind them differ, and
 * so does the read mark — a personal line is marked on the server (so it clears
 * on every device), a shared line on this device (because the list is shared
 * and one admin's read must not clear everybody's dot). The API says which with
 * `shared`, so nothing here asks the caller to choose a mode.
 */
export default function NotificationCenter({ view, initial }: NotificationCenterProps) {
  const copy = NOTIFICATION_PAGE_COPY[view];

  const initialRows = useMemo(() => toRows(initial.items, view), [initial, view]);

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [total, setTotal] = useState<number>(initial.total);
  const [page, setPage] = useState<number>(initial.pagination.page);
  const [totalPages, setTotalPages] = useState<number>(
    Math.max(1, initial.pagination.totalPages)
  );
  const [unreadCount, setUnreadCount] = useState<number>(initial.unreadCount);
  const [typeCounts, setTypeCounts] = useState<NotificationTypeCounts>(initial.typeCounts);
  const [serverTime, setServerTime] = useState<string>(initial.serverTime);
  const [shared, setShared] = useState<boolean>(initial.shared);

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarking, setIsMarking] = useState(false);

  // A shared feed's read state lives on this device, so it is read after the
  // first paint — never during it, where the server has no such thing to render.
  const [snapshot, setSnapshot] = useState<StoreReadSnapshot | null>(null);
  const [now, setNow] = useState(() => Date.now());
  // How far this device's clock is ahead of the API clock, measured from the
  // page the server rendered and again on every fetch. Every "3m ago" below is
  // computed against the API clock, via this offset.
  const [clockOffset, setClockOffset] = useState(() => {
    const serverMs = new Date(initial.serverTime).getTime();
    return Number.isNaN(serverMs) ? 0 : Date.now() - serverMs;
  });
  const isFirstLoad = useRef(true);

  /** Searches on a pause, so a word in progress is not one request per letter. */
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  /** Reads this device's shared lines, now and whenever another tab changes them. */
  useEffect(() => {
    if (!shared) return;

    const timer = setTimeout(() => setSnapshot(storeReadSnapshot()), 0);
    const onStorage = (event: StorageEvent) => {
      if (!event.key || !event.key.startsWith("sparq:activities:")) return;
      setSnapshot(storeReadSnapshot());
    };

    window.addEventListener("storage", onStorage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", onStorage);
    };
  }, [shared]);

  /** Keeps the "3m ago" labels ageing while the page is left open. */
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  /** Pulls one page with the filters as they stand. */
  const fetchPage = useCallback(
    async (nextPage: number) => {
      setIsLoading(true);
      try {
        const res = await loadFeedPage({
          page: nextPage,
          limit: PAGE_SIZE,
          search: query || undefined,
          type: type || undefined,
          // A shared list has no per-person read mark, so "unread first" and the
          // unread switch mean nothing to it; the API ignores them either way.
          sort,
          unread: unreadOnly ? "true" : undefined,
        });

        if (!res.ok) {
          toast.error("Could not load the feed");
          return;
        }

        setRows(toRows(res.items, view));
        setTotal(res.total);
        setTotalPages(Math.max(1, res.pagination.totalPages));
        setUnreadCount(res.unreadCount);
        setTypeCounts(res.typeCounts);
        setServerTime(res.serverTime);
        setShared(res.shared);
        setSnapshot(storeReadSnapshot());
        setPage(nextPage);

        // The offset is measured again per page, so a long-open tab cannot let
        // the labels drift away from the clock that stamped them.
        const serverMs = new Date(res.serverTime).getTime();
        if (!Number.isNaN(serverMs)) setClockOffset(Date.now() - serverMs);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load the feed");
      } finally {
        setIsLoading(false);
      }
    },
    [view, query, type, sort, unreadOnly]
  );

  // A filter change always starts over at page one; the first render is the
  // server's page and is not fetched again.
  useEffect(() => {
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    void fetchPage(1);
  }, [fetchPage]);

  // Every label is measured on the API clock that stamped the lines, so a
  // device with a wrong system time cannot shift them.
  const nowMs = now - clockOffset;

  const isUnread = (row: Row) =>
    shared ? !isSeenInSnapshot(snapshot, row.id, row.createdAt) : !row.read;

  const pageUnread = rows.filter(isUnread).length;
  const shownUnread = shared ? pageUnread : unreadCount;
  const hasUnread = shownUnread > 0;

  /** Clears one dot here and, for a personal line, on the server too. */
  const readOne = (row: Row) => {
    if (!isUnread(row)) return;

    if (shared) {
      markStoreActivitiesSeen([row.id]);
      setSnapshot(storeReadSnapshot());
      return;
    }

    setRows((lines) => lines.map((line) => (line.id === row.id ? { ...line, read: true } : line)));
    setUnreadCount((count) => Math.max(0, count - 1));
    void markNotificationRead(row.id).catch(() => void fetchPage(page));
  };

  const readAll = async () => {
    if (shared) {
      // One watermark instead of a list: it also covers lines this page never
      // loaded, which is what "all" means.
      markStoreActivitiesSeenUntil(serverTime);
      setSnapshot(storeReadSnapshot());
      return;
    }

    setIsMarking(true);
    try {
      const res = await markAllNotificationsRead();
      if (res?.success === false) {
        toast.error(res?.message || "Could not mark the notifications as read");
        return;
      }

      toast.success("All notifications marked as read");
      // The unread-only view is now empty, so the list has to be asked again.
      void fetchPage(1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not mark the notifications as read");
    } finally {
      setIsMarking(false);
    }
  };

  /** The chips, in the order their labels are written, with their own counts. */
  const chips = useMemo(
    () =>
      NOTIFICATION_TYPE_ORDER.filter((key) => (typeCounts[key] || 0) > 0).map((key) => ({
        key,
        label: NOTIFICATION_TYPE_LABELS[key],
        count: typeCounts[key] || 0,
      })),
    [typeCounts]
  );

  const pageNumbers = useMemo<(number | "ellipsis")[]>(() => {
    if (totalPages <= 1) return [];

    const pages: (number | "ellipsis")[] = [1];
    if (page > 3) pages.push("ellipsis");

    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }

    if (page < totalPages - 2) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  const startItem = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const endItem = Math.min(page * PAGE_SIZE, total);

  // Both lists order the same way; only a personal feed can sort unread first,
  // because only it has a read mark to sort by.
  const sortOptions: { key: SortKey; label: string }[] = shared
    ? [
        { key: "newest", label: "Newest first" },
        { key: "oldest", label: "Oldest first" },
      ]
    : [
        { key: "newest", label: "Newest first" },
        { key: "oldest", label: "Oldest first" },
        { key: "unread", label: "Unread first" },
      ];

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[var(--foreground)]">{copy.title}</h1>
          <p className="mt-1 text-xs text-[var(--foreground-muted)]">
            {copy.description}{" "}
            {total > 0 && (
              <span className="font-semibold">
                {hasUnread
                  ? `${shownUnread} unread${shared ? " on this page" : ""}`
                  : "All caught up"}
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={readAll}
          disabled={!hasUnread || isMarking}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3.5 py-2 text-xs font-bold text-[var(--foreground)] hover:border-[var(--brand-flat)]/50 hover:text-[var(--brand-flat)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <CheckCheck className="w-3.5 h-3.5" />
          {isMarking ? "Marking..." : "Mark all as read"}
        </button>
      </div>

      {/* ── Search, order and the unread switch ── */}
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 shadow-2xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--foreground-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or detail..."
              aria-label="Search notifications"
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-xs text-[var(--foreground)] outline-none focus:border-[var(--brand-flat)] placeholder:text-[var(--foreground-muted)] transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <AppSelect
              size="sm"
              ariaLabel="Sort notifications"
              icon={<ArrowDownWideNarrow />}
              value={sort}
              onChange={(next) => setSort(next as SortKey)}
              options={sortOptions.map((option) => ({
                value: option.key,
                label: option.label,
              }))}
            />

            {!shared && (
              <button
                type="button"
                onClick={() => setUnreadOnly((value) => !value)}
                aria-pressed={unreadOnly}
                className={`px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  unreadOnly
                    ? "bg-brand-gradient text-[var(--on-grad-text)] border-transparent shadow-xs"
                    : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border-color)] hover:text-[var(--foreground)]"
                }`}
              >
                Unread only
              </button>
            )}
          </div>
        </div>

        {/* ── Type chips ── */}
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setType("")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                type === ""
                  ? "bg-[var(--brand-flat)]/12 text-[var(--brand-flat)] border-[var(--brand-flat)]/35"
                  : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border-color)] hover:text-[var(--foreground)]"
              }`}
            >
              All
            </button>

            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => setType(type === chip.key ? "" : chip.key)}
                aria-pressed={type === chip.key}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  type === chip.key
                    ? "bg-[var(--brand-flat)]/12 text-[var(--brand-flat)] border-[var(--brand-flat)]/35"
                    : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border-color)] hover:text-[var(--foreground)]"
                }`}
              >
                {chip.label}
                <span className="ml-1 opacity-70">{chip.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── The list ── */}
      <div className={isLoading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-color)] bg-[var(--surface-alt)]/40 px-6 py-14 text-center">
            <span className="mx-auto w-12 h-12 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--foreground-muted)]">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Inbox className="w-5 h-5" />}
            </span>
            <p className="mt-3 text-sm font-bold text-[var(--foreground)]">
              {isLoading ? "Loading..." : "Nothing here"}
            </p>
            <p className="mt-1 text-xs text-[var(--foreground-muted)]">
              {query || type || unreadOnly
                ? "No line matches these filters. Try a wider search."
                : NOTIFICATION_EMPTY[view]}
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {rows.map((row) => {
              const Icon = row.icon;
              const unread = isUnread(row);

              // The same card for every line. When a line has no screen to open
              // it is drawn as a plain button, so clicking only clears the dot —
              // never a jump to a page that has nothing to do with the news.
              const shell = `flex items-start gap-3 rounded-2xl border p-4 transition-colors w-full text-left ${
                unread
                  ? "border-[var(--brand-flat)]/35 bg-[var(--brand-flat)]/[0.04] hover:bg-[var(--brand-flat)]/[0.08]"
                  : "border-[var(--border-color)] bg-[var(--surface-elevated)] hover:bg-[var(--surface-alt)]"
              }`;
              const body = (
                <>
                  <span className="w-9 h-9 shrink-0 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] flex items-center justify-center text-[var(--brand-flat)]">
                    <Icon className="w-4 h-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={`min-w-0 flex-1 truncate text-sm ${
                          unread ? "font-bold" : "font-semibold"
                        } text-[var(--foreground)]`}
                      >
                        {row.title}
                      </span>
                      {unread && (
                        <span
                          aria-label="Unread"
                          className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500"
                        />
                      )}
                    </span>

                    {row.detail && (
                      <span className="mt-0.5 block text-xs text-[var(--foreground-muted)]">
                        {row.detail}
                      </span>
                    )}

                    <span
                      className="mt-1 block text-[11px] font-semibold text-[var(--foreground-muted)]"
                      title={formatOrderDateTime(row.createdAt)}
                    >
                      {formatTimeAgo(row.createdAt, nowMs)}
                    </span>
                  </span>
                </>
              );

              return (
                <li key={row.id}>
                  {row.href ? (
                    <Link
                      href={row.href}
                      onClick={() => readOne(row)}
                      className={shell}
                    >
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => readOne(row)}
                      aria-disabled="true"
                      title="This update has no page to open"
                      className={`${shell} cursor-default`}
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Pager ── */}
      {total > 0 && (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-4 py-3">
          <Pagination className="w-full flex flex-col sm:flex-row items-center justify-between gap-3 text-[var(--foreground-muted)]">
            <Pagination.Summary className="text-xs">
              Showing{" "}
              <span className="text-[var(--foreground)] font-bold">
                {startItem}–{endItem}
              </span>{" "}
              of <span className="text-[var(--brand-flat)] font-bold">{total}</span> lines
            </Pagination.Summary>

            {totalPages > 1 && (
              <Pagination.Content className="flex items-center gap-1">
                <Pagination.Item>
                  <Pagination.Previous
                    className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-[var(--brand-flat)]/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    isDisabled={page === 1 || isLoading}
                    onPress={() => void fetchPage(page - 1)}
                  >
                    <Pagination.PreviousIcon />
                    <span>Prev</span>
                  </Pagination.Previous>
                </Pagination.Item>

                {pageNumbers.map((item, index) =>
                  item === "ellipsis" ? (
                    <Pagination.Item key={`ellipsis-${index}`}>
                      <Pagination.Ellipsis className="px-2 text-[var(--foreground-muted)] select-none text-xs" />
                    </Pagination.Item>
                  ) : (
                    <Pagination.Item key={item}>
                      <Pagination.Link
                        isActive={item === page}
                        isDisabled={isLoading}
                        onPress={() => void fetchPage(item)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                          item === page
                            ? "bg-brand-gradient text-[var(--on-grad-text)] shadow-xs"
                            : "hover:bg-[var(--brand-flat)]/10 text-[var(--foreground-muted)]"
                        }`}
                      >
                        {item}
                      </Pagination.Link>
                    </Pagination.Item>
                  )
                )}

                <Pagination.Item>
                  <Pagination.Next
                    className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-[var(--brand-flat)]/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                    isDisabled={page === totalPages || isLoading}
                    onPress={() => void fetchPage(page + 1)}
                  >
                    <span>Next</span>
                    <Pagination.NextIcon />
                  </Pagination.Next>
                </Pagination.Item>
              </Pagination.Content>
            )}
          </Pagination>
        </div>
      )}
    </div>
  );
}
