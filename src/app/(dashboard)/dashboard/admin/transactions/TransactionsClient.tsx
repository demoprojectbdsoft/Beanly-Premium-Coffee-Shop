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
  Pagination,
} from "@heroui/react";
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  User as UserIcon,
  ShoppingBag,
  DollarSign,
  Calendar,
  Copy,
  Check,
  ShieldCheck,
  Building,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import { Transaction } from "@/types";
import { useSiteSettings } from "@/context/SiteSettingsContext";

const FILTER_TABS = ["All", "Success", "Pending", "Failed"];
const METHOD_OPTIONS = ["all", "cod", "bkash", "rocket", "nagad"];
const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "amount_desc", label: "Amount: High to Low" },
  { key: "amount_asc", label: "Amount: Low to High" },
];

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface TransactionsClientProps {
  initialTransactions: Transaction[];
  pagination: PaginationMeta;
}

export default function TransactionsClient({
  initialTransactions = [],
  pagination,
}: TransactionsClientProps) {
  const { formatPrice } = useSiteSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);

  useEffect(() => {
    setTransactions(Array.isArray(initialTransactions) ? initialTransactions : []);
  }, [initialTransactions]);

  const currentTab = searchParams.get("status")
    ? (searchParams.get("status")!.charAt(0).toUpperCase() + searchParams.get("status")!.slice(1).toLowerCase())
    : "All";
  const currentMethod = searchParams.get("method") || "all";
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
        if (
          val === undefined ||
          val === "" ||
          (key === "status" && val.toLowerCase() === "all") ||
          (key === "method" && val.toLowerCase() === "all")
        ) {
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
        router.push(`/dashboard/admin/transactions${qs ? `?${qs}` : ""}`, { scroll: false });
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
      router.push("/dashboard/admin/transactions", { scroll: false });
    });
  };

  // Read-only Modal State
  const [selectedTrans, setSelectedTrans] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);

  // Status Badge
  const getStatusBadge = (status?: string) => {
    const s = (status || "pending").toLowerCase();
    switch (s) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
            <CheckCircle2 className="w-3 h-3" />
            Success
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
    }
  };

  // Open Detail Modal
  const handleOpenDetail = (trans: Transaction) => {
    setSelectedTrans(trans);
    setIsDetailOpen(true);
    setCopiedRef(false);
  };

  // Copy Reference
  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRef(true);
      toast.info("Transaction reference copied!");
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const { page, limit, total, totalPages } = pagination || {
    page: 1,
    limit: 10,
    total: transactions.length,
    totalPages: 1,
  };
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);

  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

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
            <span className="text-primary">Transactions</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Payment{" "}
            <span className="text-primary">
              Transactions
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Read-only ledger of all gateway settlements, COD orders, and wallet transaction logs.
          </p>
        </div>

        <div className="text-xs font-semibold text-[var(--foreground-muted)]">
          Total transactions: <span className="font-extrabold text-[var(--foreground)]">{total}</span>
        </div>
      </div>

      {/* ── Toolbar: Status Tabs, Method Filter, Search, Sort ── */}
      <div className="space-y-4 bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border-color)] shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {FILTER_TABS.map((tab) => {
              const isActive = currentTab.toLowerCase() === tab.toLowerCase();
              return (
                <button
                  key={tab}
                  onClick={() => updateParams({ status: tab === "All" ? undefined : tab.toLowerCase() })}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-white shadow-xs font-bold"
                      : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)]/80 hover:text-[var(--foreground)] border border-[var(--border-color)]"
                  }`}
                >
                  <span>{tab}</span>
                </button>
              );
            })}
          </div>

          {/* Payment Method Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] border border-[var(--border-color)]/60 dark:border-[var(--border-color)] text-xs">
            {METHOD_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => updateParams({ method: m === "all" ? undefined : m })}
                className={`px-2.5 py-1 rounded-lg uppercase text-[10px] font-bold transition-all cursor-pointer ${
                  currentMethod === m
                    ? "bg-[var(--surface-elevated)] dark:bg-[var(--accent)] text-[var(--on-accent)] shadow-2xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:hover:text-[var(--foreground)]"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Search, Sort & Reset Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border-color)]">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] z-10" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search reference, order, customer..."
                className="w-full pl-9 pr-4 h-10 bg-[var(--surface-alt)] dark:bg-[var(--surface)] border border-[var(--border-color)] rounded-xl text-xs"
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
            {/* Sort Select */}
            <div className="w-52">
              <Select
                aria-label="Sort Transactions"
                selectedKey={currentSort}
                onSelectionChange={(key) => updateParams({ sort: key ? String(key) : "newest" })}
              >
                <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-semibold text-[var(--foreground-secondary)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                  <Select.Value className="text-xs font-semibold truncate" />
                  <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[var(--foreground-muted)] shrink-0" />
                </Select.Trigger>
                <Select.Popover className="w-52 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50">
                  <ListBox>
                    {SORT_OPTIONS.map((opt) => (
                      <ListBox.Item
                        key={opt.key}
                        id={opt.key}
                        textValue={opt.label}
                        className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10 dark:hover:bg-[var(--surface)] text-[var(--foreground)] cursor-pointer flex items-center justify-between"
                      >
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {(currentSearch || currentTab !== "All" || currentMethod !== "all" || currentSort !== "newest") && (
              <Button
                size="sm"
                onPress={handleResetFilters}
                className="h-10 px-3 rounded-xl bg-[var(--surface-alt)] text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:hover:text-[var(--foreground)] text-xs font-semibold cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Transactions Table ── */}
      {isPending ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[var(--foreground-muted)]">Loading transactions...</p>
        </Card>
      ) : transactions.length === 0 ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <CreditCard className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              No transactions found
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              {currentSearch
                ? "No transactions matched your keyword or filter criteria."
                : "Transactions will appear here automatically when orders are placed."}
            </p>
          </div>
          {(currentSearch || currentTab !== "All" || currentMethod !== "all") && (
            <Button
              onPress={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--surface-alt)]/80 dark:bg-[var(--surface-alt)]/40 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="py-3.5 px-4">Reference</th>
                  <th className="py-3.5 px-4">Order ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 text-xs">
                {transactions.map((t) => {
                  const id = t._id || t.id || "";
                  const ref = t.reference || `REF-${id.slice(-8)}`;
                  const orderId =
                    typeof t.orderId === "object"
                      ? t.orderId?._id || ""
                      : t.orderId || "";
                  const shortOrderId = orderId ? `#${orderId.slice(-8).toUpperCase()}` : "N/A";
                  const customerName =
                    typeof t.userId === "object" ? t.userId?.name || "Customer" : "Customer";
                  const customerEmail =
                    typeof t.userId === "object" ? t.userId?.email || "" : "";
                  const dateStr = t.createdAt
                    ? new Date(t.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Recent";

                  return (
                    <tr
                      key={id}
                      onClick={() => handleOpenDetail(t)}
                      className="hover:bg-[var(--surface-alt)]/80 dark:hover:bg-[var(--surface)]/40 transition-colors cursor-pointer group"
                    >
                      {/* Reference */}
                      <td className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                        {ref}
                      </td>

                      {/* Order ID */}
                      <td className="py-3.5 px-4 font-mono text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] whitespace-nowrap">
                        {shortOrderId}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[var(--surface-alt)] border border-[var(--border-color)] flex items-center justify-center font-bold text-[11px] text-[var(--foreground)] shrink-0">
                            {customerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 max-w-[160px]">
                            <p className="font-bold text-[var(--foreground)] truncate">
                              {customerName}
                            </p>
                            {customerEmail && (
                              <p className="text-[11px] text-[var(--foreground-muted)] truncate">
                                {customerEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-[var(--surface-alt)] text-[var(--foreground)] text-[11px] font-semibold uppercase">
                          <CreditCard className="w-3 h-3 text-primary" />
                          {t.method}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-[var(--foreground)]">
                        {formatPrice(t.amount)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {getStatusBadge(t.status)}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-[var(--foreground-muted)] whitespace-nowrap text-[11px]">
                        {dateStr}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          onPress={() => handleOpenDetail(t)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 dark:hover:bg-[var(--accent)]/10 text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-alt)]/40 dark:bg-[var(--surface-elevated)]/40">
              <Pagination className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--foreground-muted)]">
                <Pagination.Summary className="text-xs">
                  Showing <span className="text-[var(--foreground)] font-bold">{startItem}–{endItem}</span> of{" "}
                  <span className="text-primary font-bold">{total}</span> transactions
                </Pagination.Summary>

                <Pagination.Content className="flex items-center gap-1">
                  <Pagination.Item>
                    <Pagination.Previous
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-primary/10 dark:hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      isDisabled={page === 1 || isPending}
                      onPress={() => updateParams({ page: String(page - 1) })}
                    >
                      <Pagination.PreviousIcon />
                      <span>Prev</span>
                    </Pagination.Previous>
                  </Pagination.Item>

                  {getPageNumbers().map((p, i) =>
                    p === "ellipsis" ? (
                      <Pagination.Item key={`ellipsis-${i}`}>
                        <Pagination.Ellipsis className="px-2 text-[var(--foreground-muted)] select-none text-xs" />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={p}>
                        <Pagination.Link
                          isActive={p === page}
                          isDisabled={isPending}
                          onPress={() => updateParams({ page: String(p) })}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            p === page
                              ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm shadow-primary/30"
                              : "hover:bg-primary/10 dark:hover:bg-[var(--surface)] text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)]"
                          }`}
                        >
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    )
                  )}

                  <Pagination.Item>
                    <Pagination.Next
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-primary/10 dark:hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      isDisabled={page === totalPages || isPending}
                      onPress={() => updateParams({ page: String(page + 1) })}
                    >
                      <span>Next</span>
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </div>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════
          TRANSACTION DETAIL MODAL (HeroUI v3 Modal - Read Only)
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90dvh] overflow-y-auto text-[var(--foreground)]">
              {selectedTrans && (
                <>
                  <Modal.Header className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                    <Modal.Heading className="text-base font-extrabold text-[var(--foreground)] flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-primary" />
                      Transaction Ledger Entry
                    </Modal.Heading>
                    <Modal.CloseTrigger className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer p-1 rounded-lg">
                      ✕
                    </Modal.CloseTrigger>
                  </Modal.Header>

                  <Modal.Body className="space-y-5">
                    {/* Amount & Status Banner */}
                    <div className="p-5 bg-gradient-to-br from-primary/10 via-[var(--surface-alt)] to-[var(--surface-elevated)] rounded-2xl border border-[var(--border-color)] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[var(--foreground-muted)] block">
                          Transaction Amount
                        </span>
                        <span className="text-3xl font-black text-[var(--foreground)]">
                          {formatPrice(selectedTrans.amount)}
                        </span>
                      </div>
                      <div>{getStatusBadge(selectedTrans.status)}</div>
                    </div>

                    {/* Reference Box with Copy */}
                    <div className="p-3.5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)] flex items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">
                          Payment Reference Code
                        </span>
                        <span className="font-mono font-bold text-[var(--foreground)]">
                          {selectedTrans.reference}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(selectedTrans.reference)}
                        className="p-1.5 rounded-lg bg-[var(--surface-elevated)] dark:bg-[var(--foreground-muted)] border border-[var(--border-color)] dark:border-[var(--border-color)] text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] hover:text-primary cursor-pointer transition-colors"
                        title="Copy Reference"
                      >
                        {copiedRef ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Associated Order */}
                    <div className="p-4 bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-color)] space-y-2 text-xs">
                      <h4 className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                        Associated Order
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] pt-1">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">
                            Order Reference ID
                          </span>
                          <span className="font-mono font-bold text-[var(--foreground)]">
                            {typeof selectedTrans.orderId === "object"
                              ? selectedTrans.orderId?._id || "N/A"
                              : selectedTrans.orderId || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">
                            Order Status
                          </span>
                          <span className="font-semibold text-[var(--foreground)] capitalize">
                            {typeof selectedTrans.orderId === "object"
                              ? selectedTrans.orderId?.orderStatus || "Confirmed"
                              : "Confirmed"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div className="p-4 bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-color)] space-y-2 text-xs">
                      <h4 className="font-bold text-[var(--foreground)] flex items-center gap-1.5">
                        <UserIcon className="w-4 h-4 text-primary" />
                        Customer Information
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] pt-1">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">
                            Name
                          </span>
                          <span className="font-bold text-[var(--foreground)]">
                            {typeof selectedTrans.userId === "object"
                              ? selectedTrans.userId?.name || "Customer"
                              : "Customer"}
                          </span>
                        </div>
                        {typeof selectedTrans.userId === "object" && selectedTrans.userId?.email && (
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] block">
                              Email
                            </span>
                            <span className="text-[var(--foreground)]">
                              {selectedTrans.userId.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Method & Timestamps */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                          Payment Method
                        </span>
                        <p className="font-bold text-[var(--foreground)] uppercase">
                          {selectedTrans.method}
                        </p>
                      </div>

                      <div className="p-3.5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)] space-y-1">
                        <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)]">
                          Date Settled
                        </span>
                        <p className="font-medium text-[var(--foreground)]">
                          {selectedTrans.createdAt
                            ? new Date(selectedTrans.createdAt).toLocaleString()
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                  </Modal.Body>

                  <Modal.Footer className="flex items-center justify-end pt-4 border-t border-[var(--border-color)]">
                    <Button
                      onPress={() => setIsDetailOpen(false)}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white text-xs font-bold shadow-md shadow-primary/25 cursor-pointer transition-all"
                    >
                      Close
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
