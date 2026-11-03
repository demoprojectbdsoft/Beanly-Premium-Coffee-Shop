"use client";

import React, { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Input,
  Button,
  Select,
  ListBox,
  Modal,
  TextArea,
} from "@heroui/react";
import {
  Mail,
  Search,
  RotateCcw,
  Trash2,
  Eye,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Reply,
  User,
  Loader2,
  Send,
  Clock,
} from "lucide-react";
import { toast } from "react-toastify";
import { deleteMessage, replyToMessage } from "@/lib/action/message";
import { formatOrderDate, formatOrderDateTime } from "@/lib/dateTime";

/** The shape the backend returns for one stored contact message. */
interface MessageItem {
  _id: string;
  name: string;
  email: string;
  department: string;
  subject: string;
  body: string;
  sentTo: string;
  status: "sent" | "failed";
  error: string;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminMessagesClientProps {
  initialMessages: MessageItem[];
  pagination: PaginationMeta;
}

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "sent", label: "Emailed" },
  { key: "failed", label: "Not emailed" },
];

/** The orders the list can be shown in. "newest" matches the API default. */
const SORT_OPTIONS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "name", label: "Sender (A–Z)" },
  { key: "subject", label: "Subject (A–Z)" },
];

/** "General & Business" or "Customer Support" — the department the visitor picked. */
function departmentLabel(value: string): string {
  return value === "contact" ? "General & Business" : "Customer Support";
}

/**
 * The reply the admin starts from: a greeting, a short line, and the visitor's
 * own message quoted underneath, so nothing has to be retyped.
 */
function buildReplyDraft(item: MessageItem) {
  const firstName = (item.name || "there").split(" ")[0];
  const quoted = item.body
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");

  return {
    subject: `Re: ${item.subject || "Your message"}`,
    message: [
      `Hi ${firstName},`,
      "",
      "Thanks for getting in touch.",
      "",
      "--- Your message ---",
      quoted,
    ].join("\n"),
  };
}

export default function AdminMessagesClient({
  initialMessages = [],
  pagination,
}: AdminMessagesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Rows deleted in this visit. The list itself always comes from the server,
  // so a new filter or a refresh needs no extra syncing.
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const visibleMessages = (Array.isArray(initialMessages) ? initialMessages : []).filter(
    (item) => !removedIds.includes(item._id)
  );
  const [selected, setSelected] = useState<MessageItem | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const [toDelete, setToDelete] = useState<MessageItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reply composer. It opens on top of the details modal with the greeting and
  // the visitor's own words already in the box.
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replySubject, setReplySubject] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  const currentStatus = searchParams.get("status") || "all";
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const [searchInput, setSearchInput] = useState(currentSearch);

  /** Rewrites the URL, which makes the server component fetch the new page. */
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, value);
      });

      // Any filter change starts again from page 1, unless the page was asked for.
      if (!("page" in updates)) params.delete("page");

      const qs = params.toString();
      startTransition(() => {
        router.push(`/dashboard/admin/messages${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateParams({ search: searchInput.trim() });
  };

  const handleReset = () => {
    setSearchInput("");
    startTransition(() => {
      router.push("/dashboard/admin/messages", { scroll: false });
    });
  };

  const openMessage = (item: MessageItem) => {
    setSelected(item);
    setIsViewOpen(true);
  };

  /** Opens the composer with a subject and message already written. */
  const openReply = (item: MessageItem) => {
    const draft = buildReplyDraft(item);
    setReplySubject(draft.subject);
    setReplyMessage(draft.message);
    setIsReplyOpen(true);
  };

  const handleSendReply = async () => {
    if (!selected || isSendingReply) return;

    if (!replySubject.trim()) {
      toast.warning("Add a subject for the email.");
      return;
    }
    if (!replyMessage.trim()) {
      toast.warning("Write a message before sending.");
      return;
    }

    setIsSendingReply(true);
    try {
      const res = await replyToMessage(selected._id, {
        subject: replySubject.trim(),
        message: replyMessage.trim(),
      });

      if (res?.success !== false) {
        toast.success(`Reply sent to ${selected.email}`);
        setIsReplyOpen(false);
      } else {
        toast.error(res?.message || "The email could not be sent");
      }
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setIsSendingReply(false);
    }
  };

  const promptDelete = (item: MessageItem) => {
    setToDelete(item);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete) return;

    setIsDeleting(true);
    try {
      const res = await deleteMessage(toDelete._id);
      if (res?.success !== false) {
        toast.success("Message deleted");
        setRemovedIds((prev) => [...prev, toDelete._id]);
        setIsDeleteOpen(false);
        setToDelete(null);
        if (selected?._id === toDelete._id) {
          setIsViewOpen(false);
          setSelected(null);
        }
        router.refresh();
      } else {
        toast.error(res?.message || "Could not delete the message");
      }
    } catch {
      toast.error("Could not delete the message");
    } finally {
      setIsDeleting(false);
    }
  };

  const { page, limit, total, totalPages } = pagination || {
    page: 1,
    limit: 10,
    total: visibleMessages.length,
    totalPages: 1,
  };
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);
  const hasFilters =
    Boolean(currentSearch) || currentStatus !== "all" || currentSort !== "newest";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary">Messages</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Contact <span className="text-primary">Messages</span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Every message written on the contact page. Open one to read it in full and
            answer it by email without leaving this screen.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary self-start sm:self-auto">
          Total Messages: <span className="font-extrabold">{total}</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-4 md:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 border-b border-[var(--border-color)]">
          <span className="text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider mr-1">
            Delivery:
          </span>
          {STATUS_TABS.map((tab) => {
            const isActive = currentStatus === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => updateParams({ status: tab.key === "all" ? undefined : tab.key })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-white shadow-xs font-bold"
                    : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border-color)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] z-10" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email or subject..."
                className="w-full pl-9 pr-4 h-10 bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl text-xs"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs cursor-pointer shrink-0"
            >
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Sorting stays in the URL, like every other filter, so a
                refresh or a shared link keeps the same order. */}
            <div className="w-40">
              <Select
                aria-label="Sort messages"
                selectedKey={currentSort}
                onSelectionChange={(key) => updateParams({ sort: String(key) })}
              >
                <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-xs font-semibold flex items-center justify-between gap-2">
                  <Select.Value className="truncate" />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="w-52 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl">
                  <ListBox>
                    {SORT_OPTIONS.map((opt) => (
                      <ListBox.Item
                        key={opt.key}
                        id={opt.key}
                        textValue={opt.label}
                        className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10"
                      >
                        {opt.label}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {hasFilters && (
              <Button
                size="sm"
                onPress={handleReset}
                className="h-10 px-3 rounded-xl bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] text-xs font-semibold cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── List ── */}
      {isPending ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[var(--foreground-muted)]">Loading messages...</p>
        </Card>
      ) : visibleMessages.length === 0 ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Mail className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--foreground)]">No messages yet</h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              {hasFilters
                ? "Nothing matched these filters."
                : "Messages sent through the contact page will appear here."}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--surface-alt)]/80 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="py-3.5 px-4">From</th>
                  <th className="py-3.5 px-4">Message</th>
                  <th className="py-3.5 px-4">Delivery</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 text-xs">
                {visibleMessages.map((item) => (
                  <tr
                    key={item._id}
                    onClick={() => openMessage(item)}
                    className="hover:bg-[var(--surface-alt)]/70 transition-colors cursor-pointer"
                  >
                    {/* Sender */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[var(--foreground)] truncate max-w-[160px]">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-[var(--foreground-muted)] truncate max-w-[160px]">
                        {item.email}
                      </p>
                    </td>

                    {/* Subject + preview */}
                    <td className="py-3.5 px-4 max-w-[280px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[var(--surface-alt)] text-[var(--foreground-muted)]">
                          {item.department === "contact" ? "General" : "Support"}
                        </span>
                        <p className="font-semibold text-[var(--foreground)] truncate">
                          {item.subject || "(no subject)"}
                        </p>
                      </div>
                      <p className="text-[var(--foreground-muted)] truncate mt-0.5">{item.body}</p>
                    </td>

                    {/* Did the email copy go out? */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {item.status === "sent" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Emailed
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400"
                          title={item.error}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Not emailed
                        </span>
                      )}
                      {item.status === "sent" && item.sentTo && (
                        <p className="text-[10px] text-[var(--foreground-muted)] truncate max-w-[140px]">
                          {item.sentTo}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[11px] text-[var(--foreground-muted)] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatOrderDate(item.createdAt)}
                      </span>
                    </td>

                    <td
                      className="py-3.5 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() => openMessage(item)}
                          className="w-8 h-8 rounded-lg text-[var(--foreground-muted)] hover:text-primary hover:bg-primary/10 cursor-pointer"
                          aria-label="Read message"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() => promptDelete(item)}
                          className="w-8 h-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                          aria-label="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Footer ── */}
          <div className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-alt)]/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[var(--foreground-muted)]">
              Showing{" "}
              <span className="font-bold text-[var(--foreground)]">
                {startItem}–{endItem}
              </span>{" "}
              of <span className="font-bold text-[var(--foreground)]">{total}</span> messages
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={page <= 1}
                  onPress={() => updateParams({ page: String(page - 1) })}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Previous
                </Button>
                <span className="text-xs font-bold px-2">
                  {page} / {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={page >= totalPages}
                  onPress={() => updateParams({ page: String(page + 1) })}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════
          MESSAGE DETAILS MODAL
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isViewOpen} onOpenChange={setIsViewOpen}>
        <Modal.Backdrop
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsViewOpen(false);
          }}
        >
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90dvh] overflow-y-auto text-[var(--foreground)]">
              {selected && (
                <>
                  <Modal.Header className="border-b border-[var(--border-color)] pb-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <Modal.Heading className="text-base font-bold truncate">
                          {selected.subject || "(no subject)"}
                        </Modal.Heading>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          {departmentLabel(selected.department)}
                        </p>
                      </div>
                    </div>
                  </Modal.Header>

                  <Modal.Body className="space-y-4">
                    {/* Sender */}
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-[var(--surface-alt)]">
                      <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate">{selected.name}</p>
                        <a
                          href={`mailto:${selected.email}`}
                          className="text-[11px] text-primary hover:underline truncate block"
                        >
                          {selected.email}
                        </a>
                      </div>
                    </div>

                    {/* Every stored detail, so nothing has to be guessed */}
                    <div className="rounded-2xl border border-[var(--border-color)] divide-y divide-[var(--border-color)]/70 text-xs">
                      <div className="flex gap-3 p-3">
                        <span className="w-24 shrink-0 font-bold text-[var(--foreground-muted)]">
                          From
                        </span>
                        <span className="min-w-0 break-words">{selected.name}</span>
                      </div>
                      <div className="flex gap-3 p-3">
                        <span className="w-24 shrink-0 font-bold text-[var(--foreground-muted)]">
                          Email
                        </span>
                        <a
                          href={`mailto:${selected.email}`}
                          className="min-w-0 break-all text-primary hover:underline"
                        >
                          {selected.email}
                        </a>
                      </div>
                      <div className="flex gap-3 p-3">
                        <span className="w-24 shrink-0 font-bold text-[var(--foreground-muted)]">
                          Department
                        </span>
                        <span className="min-w-0">{departmentLabel(selected.department)}</span>
                      </div>
                      <div className="flex gap-3 p-3">
                        <span className="w-24 shrink-0 font-bold text-[var(--foreground-muted)]">
                          Subject
                        </span>
                        <span className="min-w-0 break-words">
                          {selected.subject || "(no subject)"}
                        </span>
                      </div>
                      <div className="flex gap-3 p-3">
                        <span className="w-24 shrink-0 font-bold text-[var(--foreground-muted)]">
                          Received
                        </span>
                        <span className="min-w-0 inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          {formatOrderDateTime(selected.createdAt)}
                        </span>
                      </div>
                      <div className="flex gap-3 p-3">
                        <span className="w-24 shrink-0 font-bold text-[var(--foreground-muted)]">
                          Delivery
                        </span>
                        <span className="min-w-0">
                          {selected.status === "sent" ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              Email copy sent to {selected.sentTo}
                            </span>
                          ) : (
                            <span className="inline-flex items-start gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              <span>
                                Email copy was not sent
                                {selected.error && (
                                  <span className="block font-normal text-[var(--foreground-muted)]">
                                    {selected.error}
                                  </span>
                                )}
                              </span>
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="flex gap-3 p-3">
                        <span className="w-24 shrink-0 font-bold text-[var(--foreground-muted)]">
                          Message ID
                        </span>
                        <span className="min-w-0 break-all font-mono text-[11px] text-[var(--foreground-muted)]">
                          {selected._id}
                        </span>
                      </div>
                    </div>

                    {/* The message itself */}
                    <div className="space-y-1.5">
                      <p className="text-xs font-bold">Message</p>
                      <div className="p-4 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)]/70 text-xs leading-relaxed whitespace-pre-wrap">
                        {selected.body}
                      </div>
                    </div>
                  </Modal.Body>

                  <Modal.Footer className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border-color)]">
                    <Button
                      onPress={() => setIsViewOpen(false)}
                      className="px-4 h-9 rounded-xl bg-[var(--surface-alt)] text-[var(--foreground)] font-bold text-xs cursor-pointer"
                    >
                      Close
                    </Button>
                    <Button
                      onPress={() => openReply(selected)}
                      className="px-4 h-9 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>Reply by email</span>
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ════════════════════════════════════════════════════════
          REPLY MODAL
          Sits above the details modal, like the warranty screen. The subject and
          the visitor's own words are already in the box, so the admin only
          writes the answer.
      ════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isReplyOpen}
        onOpenChange={(open) => {
          // A send in flight must not be dismissed half way.
          if (!isSendingReply) setIsReplyOpen(open);
        }}
      >
        <Modal.Backdrop isDismissable={!isSendingReply}>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl max-h-[90dvh] overflow-y-auto text-[var(--foreground)]">
              {selected && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-4">
                    <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold">Reply by email</h2>
                      <p className="text-[10px] font-semibold text-[var(--foreground-muted)] truncate">
                        To: {selected.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[var(--foreground)]">Subject</label>
                    <Input
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                      className="bg-[var(--surface-alt)]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[var(--foreground)]">Message</label>
                    <TextArea
                      rows={12}
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      className="bg-[var(--surface-alt)]"
                    />
                  </div>

                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    Sent from the store address to this visitor. Their reply comes back to the
                    store inbox, not to this screen.
                  </p>

                  <div className="flex items-center justify-end gap-2 border-t border-[var(--border-color)] pt-4">
                    <Button
                      isDisabled={isSendingReply}
                      onPress={() => setIsReplyOpen(false)}
                      className="h-10 px-4 rounded-xl bg-[var(--surface-alt)] text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button
                      isDisabled={isSendingReply}
                      onPress={handleSendReply}
                      className="h-10 px-5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      {isSendingReply ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {isSendingReply ? "Sending..." : "Send Email"}
                    </Button>
                  </div>
                </div>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ════════════════════════════════════════════════════════
          DELETE CONFIRMATION
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <Modal.Backdrop
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeleteOpen(false);
          }}
        >
          <Modal.Container size="sm">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-extrabold">Delete this message?</h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  It will be removed from the dashboard for good. The email copy in your
                  mailbox is not affected.
                </p>
                {toDelete && (
                  <div className="p-3 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)]/70 text-left mt-2">
                    <p className="text-xs font-bold truncate">{toDelete.name}</p>
                    <p className="text-[11px] text-[var(--foreground-muted)] truncate">
                      {toDelete.subject || "(no subject)"}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <Button
                  onPress={() => setIsDeleteOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] text-[var(--foreground)] font-bold text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleConfirmDelete}
                  isDisabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? "Deleting..." : "Yes, delete"}</span>
                </Button>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
