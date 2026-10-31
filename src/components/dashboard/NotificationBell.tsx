"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  loadMyFeed,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/action/notifications";
import {
  forgetLegacyStoreReadKeys,
  isStoreActivitySeen,
  markStoreActivitiesSeen,
} from "@/lib/activityReads";
import { formatOrderDateTime, formatTimeAgo } from "@/lib/dateTime";
import {
  NOTIFICATION_CENTRE_HREF,
  NOTIFICATION_EMPTY,
  NOTIFICATION_FALLBACK_ICON,
  NOTIFICATION_ICONS,
  NOTIFICATION_PANEL_TITLE,
  notificationHref,
  type NotificationView,
} from "@/lib/notifications";

/** How often the bell asks for new lines while the dashboard is open. */
const POLL_MS = 60_000;
/** How many lines the panel shows; the notifications page has the full list. */
const PANEL_LIMIT = 8;

/** One line as the panel draws it, whichever feed it came from. */
interface BellItem {
  id: string;
  title: string;
  detail?: string;
  createdAt: string;
  href: string;
  icon: LucideIcon;
  /** The server's read mark. Only a personal line ever carries one. */
  read: boolean;
}

export interface NotificationBellProps {
  /** Which side of the app the bell is standing in; decides the copy and links. */
  view: NotificationView;
}

/**
 * The dashboard notification bell, for every role.
 *
 * The panel, the dots, the polling and the relative labels are the same
 * everywhere; the API decides whose lines come back, and says whether they are
 * shared. A shared line's read mark is kept on this device (the list belongs to
 * the whole team), while a personal line's is the server's, so it clears on
 * every device the account is signed in on.
 */
export default function NotificationBell({ view }: NotificationBellProps) {
  const [items, setItems] = useState<BellItem[]>([]);
  const [shared, setShared] = useState(false);
  // A personal feed's unread total covers lines the panel never loaded, so it
  // comes from the API; a shared feed has no such total and counts its head.
  const [serverUnread, setServerUnread] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  // How far this device's clock is ahead of the API clock. Every "3m ago"
  // below is computed against the API clock, via this offset.
  const [clockOffset, setClockOffset] = useState(0);
  // Ticks the labels, so a line shown as "just now" ages without a reload.
  const [now, setNow] = useState(() => Date.now());
  const wrapRef = useRef<HTMLDivElement>(null);

  const isUnread = (item: BellItem) =>
    shared ? !isStoreActivitySeen(item.id, item.createdAt) : !item.read;

  const unreadCount = shared ? items.filter(isUnread).length : serverUnread;

  /** The head of the feed, plus the API clock that stamped the lines. */
  const load = useCallback(async () => {
    const feed = await loadMyFeed(PANEL_LIMIT);

    // A failed read is not an empty feed: keep the lines already on screen.
    if (!feed.ok) return;

    setShared(feed.shared);
    setServerUnread(feed.unreadCount);
    setItems(
      feed.items.map((line) => ({
        id: line._id,
        title: line.title,
        detail: line.detail,
        createdAt: line.createdAt,
        href: notificationHref(line, view),
        icon: NOTIFICATION_ICONS[line.type] || NOTIFICATION_FALLBACK_ICON,
        read: Boolean(line.readAt),
      }))
    );

    // The API hands over its own clock with the lines. Remember the gap once,
    // so a device with a wrong system time still shows the real "3m ago".
    const serverMs = new Date(feed.serverTime).getTime();
    if (!Number.isNaN(serverMs)) setClockOffset(Date.now() - serverMs);
  }, [view]);

  // The bell lives in the dashboard navbar, so it refreshes itself instead of
  // asking every page to hand it a list. The first read goes through a timer
  // like the later ones, so nothing is set while the effect body is running.
  useEffect(() => {
    const firstLoad = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), POLL_MS);

    // Coming back to the tab is the moment the reader expects fresh lines.
    const onFocus = () => void load();
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(firstLoad);
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  // The relative labels age on their own; without this a line stays "just now"
  // for as long as the dashboard is left open.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // A shared feed's read state is per device, so it has to be shared between
  // tabs. Re-rendering the same lines is enough: each dot is judged from the
  // device at render time.
  useEffect(() => {
    if (!shared) return;

    forgetLegacyStoreReadKeys();

    const onStorage = (event: StorageEvent) => {
      if (!event.key || !event.key.startsWith("sparq:activities:")) return;
      setItems((lines) => lines.map((line) => ({ ...line })));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [shared]);

  // A menu should close the way every other menu on the site closes.
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  const hasUnread = unreadCount > 0;
  // Labels are measured on the API clock, not on this device's clock.
  const nowMs = now - clockOffset;

  /** Clears one dot here and, for a personal line, on the server too. */
  const readOne = (item: BellItem) => {
    if (!isUnread(item)) return;

    if (shared) {
      markStoreActivitiesSeen([item.id]);
      setItems((lines) => lines.map((line) => ({ ...line })));
      return;
    }

    setItems((lines) =>
      lines.map((line) => (line.id === item.id ? { ...line, read: true } : line))
    );
    setServerUnread((count) => Math.max(0, count - 1));
    void markNotificationRead(item.id).catch(() => void load());
  };

  const readAll = () => {
    if (shared) {
      // Only the head of the list is on screen, so only its dots can go here;
      // the page's own button writes the watermark that covers everything.
      markStoreActivitiesSeen(items.filter(isUnread).map((line) => line.id));
      setItems((lines) => lines.map((line) => ({ ...line })));
      return;
    }

    setItems((lines) => lines.map((line) => ({ ...line, read: true })));
    setServerUnread(0);
    void markAllNotificationsRead().catch(() => void load());
  };

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    // Opening reads nothing by itself: each line has its own dot to clear.
    if (next) {
      setNow(Date.now());
      void load();
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={
          hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications, nothing unread"
        }
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="w-9 h-9 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] hover:border-[var(--brand-flat)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-flat)]/35 transition-all relative shadow-2xs cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[var(--surface-elevated)]" />
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={NOTIFICATION_PANEL_TITLE[view]}
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border-color)]">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[var(--foreground)]">
                {NOTIFICATION_PANEL_TITLE[view]}
              </p>
              <p className="text-[10px] font-semibold text-[var(--foreground-muted)]">
                {items.length === 0
                  ? "Nothing yet"
                  : hasUnread
                    ? `${unreadCount} unread of ${items.length}`
                    : "All read"}
              </p>
            </div>

            {hasUnread && (
              <button
                type="button"
                onClick={readAll}
                className="shrink-0 text-[10px] font-bold text-[var(--brand-flat)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-flat)]/35 rounded px-1 py-0.5 cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-[var(--foreground-muted)]">
              {NOTIFICATION_EMPTY[view]}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-[var(--border-color)]/60">
              {items.map((item) => {
                const Icon = item.icon;
                // Each line stands alone: only its own click clears its dot.
                const unread = isUnread(item);

                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      role="menuitem"
                      onClick={() => {
                        readOne(item);
                        setIsOpen(false);
                      }}
                      className="flex gap-3 px-4 py-3 hover:bg-[var(--surface-alt)] transition-colors"
                    >
                      <span className="mt-0.5 w-7 h-7 shrink-0 rounded-lg border border-[var(--border-color)] bg-[var(--surface-alt)] flex items-center justify-center text-[var(--brand-flat)]">
                        <Icon className="w-3.5 h-3.5" />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={`block text-xs leading-snug truncate ${
                            unread ? "font-bold" : "font-semibold"
                          } text-[var(--foreground)]`}
                        >
                          {item.title}
                        </span>
                        {item.detail && (
                          <span className="block text-[11px] text-[var(--foreground-muted)] truncate">
                            {item.detail}
                          </span>
                        )}
                        <span
                          className="block text-[10px] text-[var(--foreground-muted)] mt-0.5"
                          title={formatOrderDateTime(item.createdAt)}
                        >
                          {formatTimeAgo(item.createdAt, nowMs)}
                        </span>
                      </span>

                      {unread && (
                        <span
                          aria-hidden="true"
                          className="mt-1.5 w-1.5 h-1.5 shrink-0 rounded-full bg-red-500"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="px-4 py-2.5 border-t border-[var(--border-color)] bg-[var(--surface-alt)]/40">
            <Link
              href={NOTIFICATION_CENTRE_HREF[view]}
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-[var(--brand-flat)] hover:underline"
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
