"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
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
  Shield,
  Search,
  RotateCcw,
  Eye,
  Calendar,
  CalendarPlus,
  ShoppingBag,
  X,
  AlertCircle,
  Clock,
  Loader2,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Mail,
  Send,
  History,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  adminExtendWarranty,
  adminUpdateClaim,
  emailWarrantyCustomer,
} from "@/lib/action/warranty";
import ImageGalleryModal from "@/components/shared/ImageGalleryModal";
import WarrantyStatusBadge from "@/components/shared/WarrantyStatusBadge";
import { formatOrderDate } from "@/lib/dateTime";
import {
  closedReasonText,
  extensionSlotsLeft,
  extensionUsageText,
  formatWarrantyDuration,
  hasWarrantyCoverage,
  isExtendableWarrantyType,
  MAX_WARRANTY_EXTENSIONS,
  totalCoverageMonths,
  WARRANTY_TYPE_OPTIONS,
  warrantyTypeInfo,
  warrantyTypeLabel,
} from "@/lib/warranty";
import type { NormalizedAdminWarranty } from "@/types";

/**
 * Every status the admin can look at. "Claims" is first and is the default
 * view: a warranty nobody has claimed needs no admin work, so it only shows up
 * under "All". "claimed" is a group the server understands — every record that
 * reached claim_submitted, under_review or resolved.
 */
const STATUS_FILTER_OPTIONS = [
  { label: "Claims", value: "claimed" },
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Claim Submitted", value: "claim_submitted" },
  { label: "Under Review", value: "under_review" },
  { label: "Resolved", value: "resolved" },
  { label: "Expired", value: "expired" },
];

/**
 * The warranty types, plus a first entry that clears the filter. Taken from the
 * shared catalog, so a type added there shows up here with no change.
 */
const WARRANTY_TYPE_FILTER_OPTIONS = [
  { label: "All warranty types", value: "all" },
  ...WARRANTY_TYPE_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
  })),
];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "expiry_near", label: "Expiry (Soonest)" },
];

/**
 * The three actions an admin can take on a claim. Each one carries its own icon
 * and colour so the buttons read as different decisions at a glance.
 */
const CLAIM_ACTIONS = [
  {
    id: "mark_under_review",
    label: "Mark Under Review",
    hint: "Let the customer know you are checking it",
    icon: ClipboardCheck,
    className:
      "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/30",
  },
  {
    id: "resolve",
    label: "Resolve Claim",
    hint: "Approve and close the claim",
    icon: CheckCircle2,
    className:
      "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20",
  },
  {
    id: "reject",
    label: "Reject Claim",
    hint: "Decline the claim",
    icon: XCircle,
    className:
      "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20",
  },
] as const;

type ClaimActionId = (typeof CLAIM_ACTIONS)[number]["id"];

type WarrantyItem = NormalizedAdminWarranty;

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminWarrantiesClientProps {
  initialWarranties: WarrantyItem[];
  pagination: PaginationMeta;
}

/** Short "#A1B2C3" form of an order id, the same one the table shows. */
function shortOrderNumber(orderId: string): string {
  return `#${orderId.slice(-6).toUpperCase()}`;
}

/**
 * Builds the email the admin starts from, so the claim details are already on
 * the page instead of being retyped by hand.
 *
 * Everything is optional: a warranty with no claim yet still gets a short,
 * sensible message.
 */
function buildEmailDraft(warranty: WarrantyItem) {
  const firstName = (warranty.userName || "there").split(" ")[0];
  const product = warranty.productTitle || "your product";
  const order = shortOrderNumber(warranty.orderId);

  const subject = warranty.claimReason
    ? `Your warranty claim - ${product}`
    : `About your warranty - ${product}`;

  const lines = [
    `Hi ${firstName},`,
    "",
    `We are writing about the warranty for ${product} on order ${order}.`,
  ];

  // What the customer originally told us.
  if (warranty.claimReason) {
    lines.push("", `What you reported: ${warranty.claimReason}`);
  }
  if (warranty.claimDescription) {
    lines.push("", `Your description: "${warranty.claimDescription}"`);
  }

  // The coverage itself, so the customer can check it against the message.
  lines.push(
    "",
    `Coverage: ${warrantyTypeLabel(warranty.warrantyType)}, valid until ${formatOrderDate(
      warranty.expiryDate
    )}.`
  );

  lines.push("", "Please reply to this email if you have any questions.", "", "Thanks,", "Sparq Support");

  return { subject, message: lines.join("\n") };
}

export default function AdminWarrantiesClient({
  initialWarranties = [],
  pagination,
}: AdminWarrantiesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [warranties, setWarranties] = useState<WarrantyItem[]>(initialWarranties);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Which action button was clicked, so only that one shows a spinner while
  // every other button stays locked.
  const [pendingAction, setPendingAction] = useState<ClaimActionId | null>(null);

  // Action state
  const [adminNote, setAdminNote] = useState("");
  const [resolution, setResolution] = useState("");

  // Extension state. Kept apart from the claim fields above: extending the
  // coverage is about the calendar, not about a claim decision.
  const [extendMonths, setExtendMonths] = useState("6");
  const [extendReason, setExtendReason] = useState("");
  const [isExtending, setIsExtending] = useState(false);

  // Gallery state
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Email composer state. It opens on top of the details modal and starts from
  // the claim, so the admin only edits what needs changing.
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  useEffect(() => {
    setWarranties(Array.isArray(initialWarranties) ? initialWarranties : []);
  }, [initialWarranties]);

  // No status in the URL means the page opens on claims, so the first entry is
  // highlighted without adding a parameter just to say so.
  const currentStatusParam = searchParams.get("status") || "claimed";
  // "all" is not sent to the server: it only gives the select something to show
  // while no warranty type has been picked.
  const currentWarrantyTypeParam = searchParams.get("warrantyType") || "all";
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        // "all" is a real choice, not an empty one: it has to stay in the URL,
        // because a missing status means the page falls back to claims only.
        if (val === undefined || val === "") {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });

      if (!("page" in updates)) {
        params.delete("page");
      }

      const qs = params.toString();
      startTransition(() => {
        router.push(`/dashboard/admin/warranties${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateParams({ search: searchInput.trim() });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    startTransition(() => {
      router.push("/dashboard/admin/warranties", { scroll: false });
    });
  };

  const openWarrantyModal = (warranty: WarrantyItem) => {
    setSelectedWarranty(warranty);
    setAdminNote(warranty.claimAdminNote || "");
    setResolution(warranty.resolutionDetails || "");
    // A fresh form for every record, so an extension typed for one warranty is
    // never accidentally sent for another.
    setExtendMonths("6");
    setExtendReason("");
    setIsModalOpen(true);
  };

  const handleAdminAction = async (action: ClaimActionId) => {
    if (!selectedWarranty) return;

    // Guard against double submits: the dropdown is disabled while saving, but a
    // fast double click could still land here.
    if (isSubmitting) return;

    if ((action === "resolve" || action === "reject") && !resolution.trim() && !adminNote.trim()) {
      toast.warning("Please provide resolution details or an admin note.");
      return;
    }

    setIsSubmitting(true);
    setPendingAction(action);
    try {
      const res = await adminUpdateClaim(selectedWarranty.id, {
        action,
        adminNote: adminNote.trim() || undefined,
        resolution: resolution.trim() || undefined,
      });

      if (res?.success !== false) {
        toast.success(`Warranty updated: ${action.replace(/_/g, " ")}`);
        const updated = res.data ?? res;

        setWarranties((prev) =>
          prev.map((w) => (w.id === selectedWarranty.id ? { ...w, ...updated } : w))
        );
        setSelectedWarranty((prev) => (prev ? { ...prev, ...updated } : null));

        if (action === "resolve" || action === "reject") {
          setIsModalOpen(false);
        }
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to update warranty");
      }
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setIsSubmitting(false);
      setPendingAction(null);
    }
  };

  /**
   * Adds months to the coverage. The server counts them from whichever is later
   * — the stored expiry date or today — so a lapsed record gains real months
   * instead of months already in the past.
   */
  const handleExtend = async () => {
    if (!selectedWarranty || isExtending) return;

    const months = Number(extendMonths);
    // The same limits the API enforces, checked here so the message is instant.
    if (!Number.isInteger(months) || months < 1) {
      toast.warning("Add at least one month.");
      return;
    }
    if (months > 60) {
      toast.warning("At most 60 months can be added at a time.");
      return;
    }
    if (!extendReason.trim()) {
      toast.warning("Give a reason — the customer is emailed it.");
      return;
    }

    setIsExtending(true);
    try {
      const res = await adminExtendWarranty(selectedWarranty.id, {
        months,
        reason: extendReason.trim(),
      });

      if (res?.success !== false) {
        toast.success(`Coverage extended by ${formatWarrantyDuration(months)}`);
        const updated = res.data ?? res;

        setWarranties((prev) =>
          prev.map((w) => (w.id === selectedWarranty.id ? { ...w, ...updated } : w))
        );
        setSelectedWarranty((prev) => (prev ? { ...prev, ...updated } : null));

        setExtendMonths("6");
        setExtendReason("");
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to extend the warranty");
      }
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setIsExtending(false);
    }
  };

  /** Opens the composer with subject and message already filled in. */
  const openEmailModal = () => {
    if (!selectedWarranty) return;
    const draft = buildEmailDraft(selectedWarranty);
    setEmailSubject(draft.subject);
    setEmailMessage(draft.message);
    setIsEmailOpen(true);
  };

  const handleSendEmail = async () => {
    if (!selectedWarranty || isSendingEmail) return;

    if (!emailSubject.trim()) {
      toast.warning("Add a subject for the email.");
      return;
    }
    if (!emailMessage.trim()) {
      toast.warning("Write a message before sending.");
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await emailWarrantyCustomer(selectedWarranty.id, {
        subject: emailSubject.trim(),
        message: emailMessage.trim(),
      });

      if (res?.success !== false) {
        toast.success(`Email sent to ${selectedWarranty.userEmail || "the customer"}`);
        setIsEmailOpen(false);
      } else {
        toast.error(res?.message || "The email could not be sent");
      }
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const { page, limit, total, totalPages } = pagination || { page: 1, limit: 10, total: 0, totalPages: 1 };
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);

  // A claim can only be moved while it is open. A record with no claim, or one
  // already resolved/rejected, is read-only.
  const claimActionBlockedReason = !selectedWarranty
    ? ""
    : !(
          selectedWarranty.claimReason ||
          selectedWarranty.claimDescription ||
          selectedWarranty.claimProblem
        )
      ? "No claim has been submitted for this warranty yet."
      : selectedWarranty.status === "resolved"
        ? "This claim is already resolved."
        : selectedWarranty.status === "expired"
          ? "This claim is closed, so no further action can be taken."
          : "";
  const canActOnClaim = claimActionBlockedReason === "";

  // Extending is about the calendar, not the claim, so it has its own rules.
  const hasCoverage = selectedWarranty
    ? hasWarrantyCoverage(
        selectedWarranty.warrantyType,
        selectedWarranty.warrantyPeriodMonths
      )
    : false;
  // Only an Extended warranty may be lengthened: the other types cover exactly
  // the period they were sold with. The server refuses the same thing.
  const extendableType = isExtendableWarrantyType(selectedWarranty?.warrantyType);
  // How many extensions this record has used, and how many it may still take.
  const usedExtensions = selectedWarranty?.extensions?.length || 0;
  const slotsLeft = selectedWarranty
    ? extensionSlotsLeft(selectedWarranty.extensions, selectedWarranty.extensionsLeft)
    : 0;
  const extendBlockedReason = !selectedWarranty
    ? ""
    : !hasCoverage
      ? "This item was sold without warranty coverage, so there is nothing to extend."
      : !extendableType
        ? "Only an Extended warranty can be extended. This coverage runs for the period it was sold with."
        : selectedWarranty.closedReason === "void"
          ? "The order was cancelled or returned, so this warranty can never be extended."
          : slotsLeft === 0
            ? `This warranty has used all ${MAX_WARRANTY_EXTENSIONS} extensions it is allowed.`
            : "";
  const canExtend = extendBlockedReason === "";
  // The form is only worth showing while another extension is possible, so a
  // record that used all its slots keeps just the history. Anything that is not
  // an Extended warranty hides the section completely.
  const showExtensionHistory = !!selectedWarranty?.extensions?.length;
  const showExtendSection = canExtend || (extendableType && showExtensionHistory);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/admin" className="hover:text-primary transition-colors">Admin Dashboard</Link>
            <span>/</span>
            <span className="text-primary">Warranties</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Warranty <span className="text-primary">Claims</span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Process customer claims. The page opens on claimed records — pick{" "}
            <span className="font-semibold text-[var(--foreground)]">All</span> to
            include warranties that have not been used.
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
          {currentStatusParam === "claimed" ? "Claimed Records" : "Total Records"}:{" "}
          <span className="font-extrabold">{total}</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-4 md:p-5 shadow-xs">
        {/* One wrapping row, the same shape the products screen uses: the search
            box takes whatever room is left and the selects keep a fixed width, so
            nothing ends up stacked on one side of the card. */}
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px] max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] z-10" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by ID, product, or email..."
                className="w-full pl-9 h-10 bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl text-xs"
              />
            </div>
            <Button type="submit" size="sm" className="h-10 px-4 rounded-xl bg-primary text-white font-bold text-xs">Search</Button>
          </form>

          <div className="w-40">
            <Select
              aria-label="Status"
              selectedKey={currentStatusParam}
              onSelectionChange={(key) => updateParams({ status: String(key) })}
            >
              <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-xs font-semibold flex items-center justify-between gap-2">
                <Select.Value className="truncate" />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover className="w-52 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl">
                <ListBox>
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label} className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10">
                      {opt.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="w-48">
            <Select
              aria-label="Warranty type"
              selectedKey={currentWarrantyTypeParam}
              onSelectionChange={(key) =>
                // "all" clears the filter instead of being sent to the API.
                updateParams({
                  warrantyType: String(key) === "all" ? undefined : String(key),
                })
              }
            >
              <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-xs font-semibold flex items-center justify-between gap-2">
                <Select.Value className="truncate" />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover className="w-60 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl">
                <ListBox>
                  {WARRANTY_TYPE_FILTER_OPTIONS.map((opt) => (
                    <ListBox.Item key={opt.value} id={opt.value} textValue={opt.label} className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10">
                      {opt.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="w-40">
            <Select
              aria-label="Sort"
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
                    <ListBox.Item key={opt.key} id={opt.key} textValue={opt.label} className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10">
                      {opt.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {(currentSearch || currentStatusParam !== "claimed" || currentWarrantyTypeParam !== "all") && (
            <Button size="sm" onPress={handleResetFilters} className="h-10 px-3 rounded-xl bg-[var(--surface-alt)] text-xs font-semibold">
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      {isPending ? (
        <Card className="p-12 text-center border border-[var(--border-color)]">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-xs font-semibold text-[var(--foreground-muted)]">Loading records...</p>
        </Card>
      ) : warranties.length === 0 ? (
        <Card className="p-12 text-center border border-[var(--border-color)]">
          <Shield className="w-12 h-12 mx-auto text-[var(--foreground-muted)] mb-4 opacity-20" />
          <h3 className="text-base font-bold">
            {currentStatusParam === "claimed" ? "No claims so far" : "No records found"}
          </h3>
          <p className="text-xs text-[var(--foreground-muted)] mt-1">
            {currentStatusParam === "claimed"
              ? "Nothing has been claimed yet. Pick All to see the warranties that are still waiting to be used."
              : "Try adjusting your filters or search terms."}
          </p>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-[var(--border-color)] p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-alt)] border-b border-[var(--border-color)] text-[var(--foreground-muted)] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Warranty ID</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Warranty Type</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Expiry</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60">
                {warranties.map((w) => (
                  <tr key={w.id} className="hover:bg-[var(--surface-alt)]/50 cursor-pointer transition-colors" onClick={() => openWarrantyModal(w)}>
                    <td className="py-3 px-4 font-mono font-bold text-[var(--foreground-muted)]">#{w.id.slice(-6).toUpperCase()}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 max-w-[180px]">
                        <div className="w-8 h-8 rounded bg-[var(--surface-alt)] border border-[var(--border-color)] shrink-0 overflow-hidden flex items-center justify-center p-1">
                          {w.productImage ? <img src={w.productImage} className="object-contain" alt="" /> : <ShoppingBag className="w-4 h-4 text-[var(--foreground-muted)]" />}
                        </div>
                        <span className="font-bold truncate">{w.productTitle || "Product"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="font-semibold">{warrantyTypeLabel(w.warrantyType)}</p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">
                        {formatWarrantyDuration(w.warrantyPeriodMonths)}
                        {/* A quick sign that this record has been extended. */}
                        {!!w.extensions?.length && (
                          <span className="font-bold text-primary">
                            {" "}· +{w.extensions.length} ext
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold">{w.userName || "Customer"}</p>
                      {/* Plain text here; the detail modal has the email button. */}
                      <p className="text-[10px] text-[var(--foreground-muted)]">
                        {w.userEmail || "—"}
                      </p>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-[var(--foreground-muted)]" />
                        {formatOrderDate(w.expiryDate)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center"><WarrantyStatusBadge status={w.status} size="sm" /></td>
                    <td className="py-3 px-4 text-right">
                      <Button isIconOnly size="sm" variant="ghost" className="h-8 w-8 rounded-lg" onPress={() => openWarrantyModal(w)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-[var(--surface-alt)]/30 border-t border-[var(--border-color)] flex items-center justify-between">
             <p className="text-[10px] font-bold text-[var(--foreground-muted)] uppercase tracking-widest">
              Showing {startItem}-{endItem} of {total}
            </p>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button size="sm" isDisabled={page <= 1} onPress={() => updateParams({ page: String(page - 1) })}>Prev</Button>
                <Button size="sm" isDisabled={page >= totalPages} onPress={() => updateParams({ page: String(page + 1) })}>Next</Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Detail Modal ── */}
      <Modal
        isOpen={isModalOpen && !isGalleryOpen && !isEmailOpen}
        onOpenChange={(open) => {
          // The image gallery and the email composer open on top of this modal,
          // which hides it. That "closed" event must be ignored, otherwise
          // closing the child would also wipe the details modal.
          if (!isGalleryOpen && !isEmailOpen) setIsModalOpen(open);
        }}
      >
        {/*
          No onClick on Modal.Backdrop: it wraps the dialog, so clicks inside
          bubble up and close it. Outside-click dismissal is built in, and we
          keep it off while an action is being saved.
        */}
        <Modal.Backdrop isDismissable={!isSubmitting}>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] rounded-3xl p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
              {selectedWarranty && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-primary/10 text-primary"><Shield className="w-5 h-5" /></div>
                      <div>
                        <h2 className="text-lg font-bold">Warranty Details</h2>
                        <p className="text-[10px] font-mono font-bold text-[var(--foreground-muted)] uppercase">Record: {selectedWarranty.id}</p>
                      </div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[var(--surface-alt)] rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)]/60">
                      <p className="text-[10px] font-bold uppercase text-[var(--foreground-muted)] mb-2">Customer & Order</p>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">{(selectedWarranty.userName || "C").charAt(0)}</div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{selectedWarranty.userName}</p>
                          <p className="text-[10px] text-[var(--foreground-muted)] truncate">
                            {selectedWarranty.userEmail || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--foreground-muted)]">Order:</span>
                        <span className="font-bold text-primary">#{selectedWarranty.orderId.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)]/60">
                      <p className="text-[10px] font-bold uppercase text-[var(--foreground-muted)] mb-2">Product & Status</p>
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-[var(--border-color)] flex items-center justify-center p-1 shrink-0">
                          {selectedWarranty.productImage ? <img src={selectedWarranty.productImage} className="object-contain" alt="" /> : <ShoppingBag className="w-4 h-4 text-slate-300" />}
                        </div>
                        <p className="text-xs font-bold truncate">{selectedWarranty.productTitle}</p>
                      </div>
                      <div className="flex items-center justify-between"><WarrantyStatusBadge status={selectedWarranty.status} /></div>
                    </div>
                  </div>

                  {/* Warranty coverage, so the admin can judge the claim in one glance. */}
                  <div className="p-4 rounded-2xl bg-[var(--surface-alt)] border border-[var(--border-color)]/60 space-y-3">
                    <p className="text-[10px] font-bold uppercase text-[var(--foreground-muted)]">Warranty Coverage</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[10px] text-[var(--foreground-muted)]">Type</p>
                        <p className="text-xs font-bold">{warrantyTypeLabel(selectedWarranty.warrantyType)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--foreground-muted)]">Duration</p>
                        <p className="text-xs font-bold">
                          {formatWarrantyDuration(
                            totalCoverageMonths(
                              selectedWarranty.warrantyPeriodMonths,
                              selectedWarranty.extensions
                            )
                          )}
                          {/* The extras are named, so the longer duration is
                              never a surprise. */}
                          {usedExtensions > 0 && (
                            <span className="font-semibold text-[var(--foreground-muted)]">
                              {" "}(+{formatWarrantyDuration(
                                totalCoverageMonths(0, selectedWarranty.extensions)
                              )} extended)
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[var(--foreground-muted)]">Expires</p>
                        <p className="text-xs font-bold">{formatOrderDate(selectedWarranty.expiryDate)}</p>
                      </div>
                    </div>
                    <p className="text-[11px] leading-relaxed text-[var(--foreground-muted)] whitespace-pre-line">
                      {selectedWarranty.warrantyTerms || "No terms were saved on this record."}
                    </p>
                    {/* Who the customer should turn to, straight from the shared
                        catalog, so the wording matches the emails. */}
                    <p className="text-[11px] text-[var(--foreground-muted)]">
                      <span className="font-semibold text-[var(--foreground)]">
                        Covered by {warrantyTypeInfo(selectedWarranty.warrantyType).coveredBy}.
                      </span>{" "}
                      {warrantyTypeInfo(selectedWarranty.warrantyType).customerAction}
                    </p>
                    {/* "Expired" hides three different stories; say which one. */}
                    {selectedWarranty.status === "expired" && (
                      <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        {closedReasonText(selectedWarranty)}
                      </p>
                    )}
                  </div>

                  {(selectedWarranty.claimReason ||
                    selectedWarranty.claimDescription) && (
                    <div className="space-y-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4" />
                        <h3 className="text-sm font-bold">Customer Claim Information</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase text-amber-600/60 dark:text-amber-400/60">Reason</p>
                          <p className="text-xs font-bold mt-0.5">{selectedWarranty.claimReason}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase text-amber-600/60 dark:text-amber-400/60">Description</p>
                          <p className="text-xs leading-relaxed mt-1">{selectedWarranty.claimDescription}</p>
                        </div>
                        {selectedWarranty.claimImages && selectedWarranty.claimImages.length > 0 && (
                          <div>
                            <p className="text-[10px] font-bold uppercase text-amber-600/60 dark:text-amber-400/60 mb-2">Images ({selectedWarranty.claimImages.length})</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedWarranty.claimImages.map((img: string, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setGalleryImages(selectedWarranty.claimImages!);
                                    setGalleryIndex(idx);
                                    setIsGalleryOpen(true);
                                  }}
                                  className="w-14 h-14 rounded-lg overflow-hidden border border-amber-500/20 hover:border-amber-500/50 transition-all"
                                >
                                  <img src={img} className="w-full h-full object-cover" alt="" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 border-t border-[var(--border-color)] pt-6">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" /> Admin Actions
                      </h3>
                      {/* Opens the composer with the claim already filled in. */}
                      <span title={selectedWarranty.userEmail ? `Email ${selectedWarranty.userEmail}` : "This customer has no email address on file"}>
                        <Button
                          isDisabled={!selectedWarranty.userEmail || isSendingEmail}
                          onPress={openEmailModal}
                          className="h-9 px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-xs font-bold flex items-center gap-1.5"
                        >
                          <Mail className="w-3.5 h-3.5" /> Email Customer
                        </Button>
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[var(--foreground)]">Internal Admin Note</label>
                        <TextArea
                          placeholder="Private notes for staff..."
                          value={adminNote}
                          onChange={(e) => setAdminNote(e.target.value)}
                          className="bg-[var(--surface-alt)]"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-[var(--foreground)]">Resolution Details</label>
                        <TextArea
                          placeholder="Visible to the customer upon resolution/rejection..."
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                          className="bg-[var(--surface-alt)]"
                        />
                      </div>

                      {/* One button per action, each with its icon and colour.
                          All of them lock while a request is in flight, so two
                          actions (for example resolve and reject) can never
                          race each other. */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {CLAIM_ACTIONS.map((action) => {
                          const Icon = action.icon;
                          const isPending = pendingAction === action.id;
                          return (
                            // The hint lives on the wrapper because HeroUI Button
                            // does not accept a title attribute.
                            <span key={action.id} title={action.hint}>
                              <Button
                                isDisabled={isSubmitting || !canActOnClaim}
                                onPress={() => handleAdminAction(action.id)}
                                className={`h-10 px-4 rounded-xl border text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${action.className}`}
                              >
                                {isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Icon className="w-4 h-4" />
                                )}
                                {action.label}
                              </Button>
                            </span>
                          );
                        })}
                        {isSubmitting && (
                          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--foreground-muted)]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" /> Saving...
                          </span>
                        )}
                      </div>
                      {!canActOnClaim && (
                        <p className="text-[11px] font-semibold text-[var(--foreground-muted)]">
                          {claimActionBlockedReason}
                        </p>
                      )}
                    </div>

                    {/* Extending is deliberately separate from the four claim
                        buttons: it changes the calendar, not the claim, and it is
                        the only fix for a warranty that simply ran out.

                        It is also a feature of the Extended warranty alone, so a
                        manufacturer, seller or "other" record never sees this
                        section. Inside it, the form appears while a slot is free
                        and the history stays once they are all used. */}
                    {showExtendSection && (
                      <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
                        <h4 className="text-xs font-bold flex items-center gap-2">
                          {canExtend ? (
                            <>
                              <CalendarPlus className="w-4 h-4 text-primary" /> Extend Coverage
                            </>
                          ) : (
                            <>
                              <History className="w-4 h-4 text-primary" /> Extension History
                            </>
                          )}
                          {/* The count, so nobody has to guess how many tries are left. */}
                          <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-[var(--foreground-muted)]">
                            {extensionUsageText(usedExtensions)}
                          </span>
                        </h4>

                        {canExtend && (
                          <div className="flex flex-wrap items-end gap-2">
                            <div className="flex flex-col gap-1 w-28">
                              <label className="text-[11px] font-semibold text-[var(--foreground)]">
                                Extra months
                              </label>
                              <Input
                                type="number"
                                min="1"
                                max="60"
                                step="1"
                                value={extendMonths}
                                disabled={isExtending}
                                onChange={(e) => setExtendMonths(e.target.value)}
                                className="bg-[var(--surface-alt)]"
                              />
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                              <label className="text-[11px] font-semibold text-[var(--foreground)]">
                                Reason (the customer sees this)
                              </label>
                              <Input
                                value={extendReason}
                                disabled={isExtending}
                                placeholder="e.g. Repair took three weeks, so we added a month"
                                maxLength={500}
                                onChange={(e) => setExtendReason(e.target.value)}
                                className="bg-[var(--surface-alt)]"
                              />
                            </div>
                            <Button
                              isDisabled={isExtending}
                              onPress={handleExtend}
                              className="h-10 px-4 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2"
                            >
                              {isExtending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <CalendarPlus className="w-4 h-4" />
                              )}
                              Extend
                            </Button>
                          </div>
                        )}

                        {/* Reached only together with the history, because the
                            whole section is hidden when there is neither. */}
                        {!canExtend && (
                          <p className="text-[11px] font-semibold text-[var(--foreground-muted)]">
                            {extendBlockedReason}
                          </p>
                        )}

                        {/* Every extension already granted, oldest first, so the
                            extra months can always be explained. */}
                        {showExtensionHistory && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase text-[var(--foreground-muted)] flex items-center gap-1.5">
                              <History className="w-3 h-3" />
                              Extension history ({usedExtensions} of {MAX_WARRANTY_EXTENSIONS})
                            </p>
                            {(selectedWarranty.extensions || []).map((entry, i) => (
                              <div
                                key={i}
                                className="p-2.5 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)]"
                              >
                                <p className="text-[11px] font-bold">
                                  +{formatWarrantyDuration(entry.months)} — {formatOrderDate(entry.previousExpiryDate)} → {formatOrderDate(entry.newExpiryDate)}
                                </p>
                                {entry.reason && (
                                  <p className="text-[11px] leading-relaxed mt-1 whitespace-pre-line">
                                    {entry.reason}
                                  </p>
                                )}
                                <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                                  {entry.extendedBy ? `${entry.extendedBy} · ` : ""}
                                  {formatOrderDate(entry.createdAt)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ── Email Modal ── */}
      {/*
        Sits above the details modal. The subject and message are pre-filled from
        the claim, so the admin edits instead of typing everything again.
      */}
      <Modal
        isOpen={isEmailOpen}
        onOpenChange={(open) => {
          // A send in flight must not be dismissed half way.
          if (!isSendingEmail) setIsEmailOpen(open);
        }}
      >
        <Modal.Backdrop isDismissable={!isSendingEmail}>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] rounded-3xl p-6 shadow-2xl max-h-[90dvh] overflow-y-auto">
              {selectedWarranty && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-primary/10 text-primary"><Mail className="w-5 h-5" /></div>
                      <div className="min-w-0">
                        <h2 className="text-lg font-bold">Email Customer</h2>
                        <p className="text-[10px] font-semibold text-[var(--foreground-muted)] truncate">
                          To: {selectedWarranty.userEmail || "no email address on file"}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setIsEmailOpen(false)} className="p-2 hover:bg-[var(--surface-alt)] rounded-xl transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[var(--foreground)]">Subject</label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="bg-[var(--surface-alt)]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[var(--foreground)]">Message</label>
                    <TextArea
                      rows={12}
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      className="bg-[var(--surface-alt)]"
                    />
                  </div>

                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    Sent from the store address to this customer. Their reply goes to
                    the store inbox, not back to this screen.
                  </p>

                  <div className="flex items-center justify-end gap-2 border-t border-[var(--border-color)] pt-4">
                    <Button
                      isDisabled={isSendingEmail}
                      onPress={() => setIsEmailOpen(false)}
                      className="h-10 px-4 rounded-xl bg-[var(--surface-alt)] text-xs font-bold"
                    >
                      Cancel
                    </Button>
                    <Button
                      isDisabled={isSendingEmail || !selectedWarranty.userEmail}
                      onPress={handleSendEmail}
                      className="h-10 px-5 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-2"
                    >
                      {isSendingEmail ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {isSendingEmail ? "Sending..." : "Send Email"}
                    </Button>
                  </div>
                </div>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={galleryImages}
        initialIndex={galleryIndex}
        productTitle="Claim Evidence"
      />
    </div>
  );
}
