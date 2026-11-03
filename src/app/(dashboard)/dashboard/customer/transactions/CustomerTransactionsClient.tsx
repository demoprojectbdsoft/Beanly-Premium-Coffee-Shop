"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  Button,
  Input,
  Select,
  ListBox,
} from "@heroui/react";
import {
  CreditCard,
  Download,
  Search,
  Plus,
  Trash2,
  ShieldCheck,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  Filter,
  RotateCcw,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "react-toastify";
import { CustomerTransaction, SavedPaymentCard } from "@/types/customerDashboard";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { downloadTransactionReceiptPdf } from "@/lib/transactionReceiptPdf";

const STATUS_OPTIONS = [
  { key: "all", label: "All Statuses" },
  { key: "Completed", label: "Completed" },
  { key: "Pending", label: "Pending" },
  { key: "Failed", label: "Failed" },
];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "amount_desc", label: "Amount: High to Low" },
  { key: "amount_asc", label: "Amount: Low to High" },
];

interface CustomerTransactionsClientProps {
  initialTransactions?: CustomerTransaction[];
  initialSavedCards?: SavedPaymentCard[];
}

export default function CustomerTransactionsClient({
  initialTransactions = [],
  initialSavedCards = [],
}: CustomerTransactionsClientProps) {
  const { settings: siteSettings, formatPrice } = useSiteSettings();
  const siteName = siteSettings.siteName || "Sparq";
  const [transactions, setTransactions] = useState<CustomerTransaction[]>(initialTransactions);
  const [savedCards, setSavedCards] = useState<SavedPaymentCard[]>(initialSavedCards);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  // Which row is building its PDF, so the button can show a spinner and the
  // other rows cannot start a second download at the same time.
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // New card form state
  const [cardHolder, setCardHolder] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // ── Compute Real Metrics from DB Transactions ──
  const totalPaid = transactions
    .filter((tx) => tx.status === "Completed")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const settledCount = transactions.filter((tx) => tx.status === "Completed").length;

  const pendingTotal = transactions
    .filter((tx) => tx.status === "Pending")
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const pendingCount = transactions.filter((tx) => tx.status === "Pending").length;

  // ── Filter and Sort using HeroUI values ──
  const filteredTransactions = useMemo(() => {
    let result = transactions.filter((tx) => {
      const matchesStatus =
        statusFilter === "all" ||
        tx.status.toLowerCase() === statusFilter.toLowerCase();

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        tx.orderNumber.toLowerCase().includes(q) ||
        tx.invoiceNumber.toLowerCase().includes(q) ||
        tx.paymentMethod.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });

    result.sort((a, b) => {
      switch (sortOrder) {
        case "oldest":
          return a.id.localeCompare(b.id);
        case "amount_desc":
          return (b.amount || 0) - (a.amount || 0);
        case "amount_asc":
          return (a.amount || 0) - (b.amount || 0);
        case "newest":
        default:
          return 0; // Natural descending order
      }
    });

    return result;
  }, [transactions, statusFilter, searchQuery, sortOrder]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setSortOrder("newest");
  };

  const handleDownloadInvoice = async (tx: CustomerTransaction) => {
    // One PDF at a time: jsPDF is loaded on demand, and a second click while it
    // is still loading would build the same file twice.
    if (downloadingId) return;

    setDownloadingId(tx.id);
    try {
      await downloadTransactionReceiptPdf(tx, {
        siteName,
        formatPrice,
      });
      toast.success(`Receipt ${tx.invoiceNumber} downloaded.`);
    } catch (err) {
      console.error("Failed to build transaction receipt PDF:", err);
      toast.error("Could not create the PDF receipt. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSetDefaultCard = (id: string) => {
    setSavedCards((prev) =>
      prev.map((card) => ({
        ...card,
        isDefault: card.id === id,
      }))
    );
    toast.success("Default payment card updated.");
  };

  const handleDeleteCard = (id: string) => {
    setSavedCards((prev) => prev.filter((c) => c.id !== id));
    toast.info("Payment card removed.");
  };

  const handleAddCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !cardHolder) {
      toast.error("Please fill in card details");
      return;
    }

    const newCard: SavedPaymentCard = {
      id: `card-${Date.now()}`,
      brand: "visa",
      last4: cardNumber.slice(-4) || "9999",
      expMonth: cardExp.split("/")[0] || "12",
      expYear: cardExp.split("/")[1] || "28",
      holderName: cardHolder,
      isDefault: savedCards.length === 0,
    };

    setSavedCards((prev) => [...prev, newCard]);
    setIsAddCardOpen(false);
    setCardHolder("");
    setCardNumber("");
    setCardExp("");
    setCardCvv("");
    toast.success("New payment method added securely!");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all" || sortOrder !== "newest";

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/customer" className="hover:text-primary transition-colors">
              Customer Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-bold">Transactions</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Transactions &amp;{" "}
            <span className="text-gradient-primary">
              Invoices
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            View your actual billing history, payment settlements, and receipts.
          </p>
        </div>

        <button
          onClick={() => setIsAddCardOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Payment Method</span>
        </button>
      </div>

      {/* ── Real Dynamic Financial Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Paid */}
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--foreground-muted)]">
              Total Paid (Settled)
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {formatPrice(totalPaid)}
          </p>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {settledCount} {settledCount === 1 ? "settled payment" : "settled payments"}
          </p>
        </div>

        {/* Pending Settlements */}
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--foreground-muted)]">
              Pending / COD
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {formatPrice(pendingTotal)}
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
            {pendingCount} pending settlement
          </p>
        </div>

        {/* Total Invoices */}
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--foreground-muted)]">
              Invoices Available
            </span>
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {transactions.length}
          </p>
          <p className="text-[11px] text-[var(--foreground-muted)]">PDF receipt ready</p>
        </div>

        {/* Saved Cards */}
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--foreground-muted)]">
              Saved Cards
            </span>
            <CreditCard className="w-4 h-4 text-secondary" />
          </div>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {savedCards.length}
          </p>
          <p className="text-[11px] text-primary font-semibold">
            Protected with 256-bit SSL
          </p>
        </div>
      </div>

      {/* ── Saved Payment Cards Manager ── */}
      {savedCards.length > 0 && (
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Saved Payment Cards
              </h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                Cards saved for rapid checkout
              </p>
            </div>
            <button
              onClick={() => setIsAddCardOpen(true)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Card</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {savedCards.map((card) => (
              <div
                key={card.id}
                className={`p-5 rounded-2xl border transition-all ${
                  card.isDefault
                    ? "border-primary/50 bg-primary/5 shadow-xs"
                    : "border-[var(--border-color)] bg-[var(--surface-alt)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black tracking-wider uppercase text-[var(--foreground)]">
                    {card.brand}
                  </span>
                  {card.isDefault ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Default
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetDefaultCard(card.id)}
                      className="text-[10px] font-semibold text-[var(--foreground-muted)] hover:text-primary transition-colors"
                    >
                      Set as Default
                    </button>
                  )}
                </div>

                <div className="my-4">
                  <p className="text-sm font-mono font-bold tracking-widest text-[var(--foreground)]">
                    •••• •••• •••• {card.last4}
                  </p>
                  <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
                    Expires {card.expMonth}/{card.expYear} • {card.holderName}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] text-[var(--foreground-muted)]">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span>Encrypted</span>
                  </div>
                  {!card.isDefault && (
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      className="text-[var(--foreground-muted)] hover:text-rose-600 p-1 cursor-pointer"
                      title="Remove card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Transaction Table & HeroUI v3 Toolbar ── */}
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Transaction History
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Receipts and invoices from your store purchases
            </p>
          </div>
        </div>

        {/* HeroUI v3 Toolbar: Search, Status Select, Sort Select */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]">
          {/* HeroUI Input Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] z-10" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice / order..."
              className="w-full pl-9 pr-8 h-10 bg-[var(--surface-elevated)] border border-[var(--border-color)] focus:border-primary rounded-xl text-xs text-[var(--foreground)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* HeroUI Select Status */}
          <div>
            <Select
              selectedKey={statusFilter}
              onSelectionChange={(key) => setStatusFilter(key ? String(key) : "all")}
            >
              <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--foreground)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="w-3.5 h-3.5 text-primary shrink-0" />
                  <Select.Value className="text-xs font-semibold truncate" />
                </div>
                <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[var(--foreground-muted)] shrink-0" />
              </Select.Trigger>
              <Select.Popover className="w-56 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50">
                <ListBox className="space-y-1 p-0">
                  {STATUS_OPTIONS.map((opt) => (
                    <ListBox.Item
                      key={opt.key}
                      id={opt.key}
                      textValue={opt.label}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-[var(--foreground)] hover:bg-primary/10 hover:text-primary cursor-pointer flex items-center justify-between data-[selected=true]:bg-primary data-[selected=true]:text-white font-semibold transition-colors"
                    >
                      {opt.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {/* HeroUI Select Sort */}
          <div>
            <Select
              selectedKey={sortOrder}
              onSelectionChange={(key) => setSortOrder(key ? String(key) : "newest")}
            >
              <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--foreground)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                <div className="flex items-center gap-2 truncate">
                  <ArrowUpDown className="w-3.5 h-3.5 text-primary shrink-0" />
                  <Select.Value className="text-xs font-semibold truncate" />
                </div>
                <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[var(--foreground-muted)] shrink-0" />
              </Select.Trigger>
              <Select.Popover className="w-56 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50">
                <ListBox className="space-y-1 p-0">
                  {SORT_OPTIONS.map((opt) => (
                    <ListBox.Item
                      key={opt.key}
                      id={opt.key}
                      textValue={opt.label}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-[var(--foreground)] hover:bg-primary/10 hover:text-primary cursor-pointer flex items-center justify-between data-[selected=true]:bg-primary data-[selected=true]:text-white font-semibold transition-colors"
                    >
                      {opt.label}
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-[var(--foreground-muted)]">
            <span>
              Showing{" "}
              <strong className="text-[var(--foreground)] font-bold">
                {filteredTransactions.length}
              </strong>{" "}
              of {transactions.length} transactions
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 text-primary hover:underline font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          </div>
        )}

        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--surface-alt)] flex items-center justify-center text-[var(--foreground-muted)]">
              <Receipt className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[var(--foreground)]">
              No transactions found
            </p>
            <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto">
              {searchQuery || statusFilter !== "all"
                ? "No transactions matched your search or filter."
                : "Your transaction history will be displayed here once you complete orders."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--foreground-muted)] uppercase tracking-wider font-semibold">
                  <th className="pb-3 pl-2">Invoice / Ref</th>
                  <th className="pb-3">Order Number</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Payment Method</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 pr-2 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-[var(--surface-alt)]/60 dark:hover:bg-[var(--surface-alt)]/40 transition-colors"
                  >
                    <td className="py-3.5 pl-2 font-mono font-bold text-[var(--foreground)]">
                      {tx.invoiceNumber}
                    </td>
                    <td className="py-3.5 font-semibold text-[var(--foreground)]">
                      {tx.orderNumber}
                    </td>
                    <td className="py-3.5 text-[var(--foreground-muted)]">
                      {tx.date}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                        <CreditCard className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 font-bold text-[var(--foreground)]">
                      {formatPrice(tx.amount)}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          tx.status === "Completed"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                            : tx.status === "Pending"
                            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoice(tx)}
                        disabled={downloadingId !== null}
                        aria-label={`Download receipt ${tx.invoiceNumber} as PDF`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--surface-alt)] text-[11px] font-semibold text-[var(--foreground)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {downloadingId === tx.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Card Modal ── */}
      {isAddCardOpen && (
        /* The overlay scrolls, and the card starts at the top while the screen
           is shorter than the form: centred content that overflows a fixed
           layer loses its header, and there is no way to scroll back to it. */
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 sm:items-center bg-[var(--surface)]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] dark:border-[var(--border-color)] rounded-3xl max-w-md w-full min-w-0 p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 my-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Add Payment Method
              </h3>
              <button
                onClick={() => setIsAddCardOpen(false)}
                className="text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] dark:hover:text-[var(--foreground)] text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCardSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[var(--foreground)]">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)] focus:border-primary focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[var(--foreground)]">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="4242 •••• •••• 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 pl-9 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)] focus:border-primary focus:outline-none"
                  />
                  <CreditCard className="w-4 h-4 text-[var(--foreground-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--foreground)]">
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="08/28"
                    maxLength={5}
                    value={cardExp}
                    onChange={(e) => setCardExp(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)] focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-[var(--foreground)]">
                    CVC / CVV
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="•••"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)] focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setIsAddCardOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-alt)] font-semibold text-[var(--foreground)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-md shadow-primary/20 cursor-pointer"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
