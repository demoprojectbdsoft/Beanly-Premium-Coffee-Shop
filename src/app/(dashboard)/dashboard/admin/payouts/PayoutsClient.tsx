"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip } from "@heroui/react";
import {
  BarChart3,
  Banknote,
  Boxes,
  Download,
  FileText,
  Link2,
  Loader2,
  Percent,
  PieChart as PieIcon,
  Receipt,
  Share2,
  SlidersHorizontal,
  Truck,
  Wallet,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "react-toastify";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import AppSelect from "@/components/shared/AppSelect";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { formatOrderDate, formatOrderDateTime } from "@/lib/dateTime";
import { getAdminPayouts } from "@/lib/api/deliveries";
import { exportPayoutsCsv, type PayoutsExportData } from "@/lib/csvExport";
import { downloadPayoutsPdf } from "@/lib/dashboardPdf";
import type { PayoutRange, PayoutRecord, PayoutsFeed } from "@/types/delivery";

/**
 * The store's payout record.
 *
 * A fee is only a number until it is put beside the sale it was taken out of, so
 * the board draws the two together: what left as the riders' pay, and what the
 * delivered orders were worth. Every row is one job that reached the door —
 * nothing is paid out later by hand, so this list cannot fall behind the money
 * the overview already treats as spent.
 */

interface PayoutsClientProps {
  feed: PayoutsFeed;
  filters: {
    range: PayoutRange;
    riderId: string;
    sort: string;
    page: number;
    limit: number;
  };
}

const RANGE_CHOICES: Array<{ key: PayoutRange; label: string; exportLabel: string }> = [
  { key: "30", label: "30 days", exportLabel: "Last 30 days" },
  { key: "90", label: "90 days", exportLabel: "Last 90 days" },
  { key: "365", label: "1 year", exportLabel: "Last 12 months" },
  { key: "all", label: "All time", exportLabel: "All time" },
];

// An export walks the ledger a page at a time, bounded so a store with years of
// deliveries cannot ask the browser to hold the whole history at once.
const EXPORT_PAGE_SIZE = 200;
const EXPORT_MAX_PAGES = 5;

const RIDER_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#0ea5e9", "#ec4899", "#84cc16"];

/** "2026-03-14" reads "Mar 14", "2026-03" reads "Mar 26" — parsed, never a Date. */
function bucketLabel(label: string): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const [year, month, day] = label.split("-");
  const name = months[Number(month) - 1] || month;
  return day ? `${name} ${Number(day)}` : `${name} ${String(year).slice(2)}`;
}

/** How the hand-over was confirmed decides whether the rider was paid. */
function paidViaLabel(paidVia: string): string {
  return paidVia === "customer" ? "Customer confirmed" : "Delivery code";
}

export default function PayoutsClient({ feed, filters }: PayoutsClientProps) {
  const router = useRouter();
  const { settings, currencySymbol, formatPrice } = useSiteSettings();

  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const { range, riderId, sort, page, limit } = filters;
  const { totals, outstanding, series, byRider, records, pagination } = feed;

  const chartData = useMemo(
    () => series.map((point) => ({ ...point, label: bucketLabel(point.label) })),
    [series]
  );

  // The donut shows the seven riders the store paid most, and folds the rest into
  // one slice instead of cutting the chart in half with a long tail.
  const riderSlices = useMemo(() => {
    const top = byRider.slice(0, 7).map((rider, index) => ({
      name: rider.name || "A rider",
      value: rider.paid,
      color: RIDER_COLORS[index % RIDER_COLORS.length],
    }));
    const rest = byRider.slice(7);

    if (rest.length > 0) {
      top.push({
        name: `${rest.length} other rider${rest.length === 1 ? "" : "s"}`,
        value: rest.reduce((sum, rider) => sum + rider.paid, 0),
        color: "#94a3b8",
      });
    }

    return top.filter((slice) => slice.value > 0);
  }, [byRider]);

  const selectedRider = byRider.find((rider) => rider.riderId === riderId);
  const rangeLabel =
    RANGE_CHOICES.find((choice) => choice.key === range)?.exportLabel || "Selected window";

  const go = (next: {
    page?: number;
    range?: PayoutRange;
    riderId?: string;
    sort?: string;
    limit?: string;
  }) => {
    const params = new URLSearchParams();
    const nextRange = next.range ?? range;
    const nextRiderId = next.riderId ?? riderId;
    const nextSort = next.sort ?? sort;
    const nextLimit = next.limit ?? String(limit);
    const nextPage = next.page ?? 1;

    if (nextRange !== "365") params.set("range", nextRange);
    if (nextRiderId) params.set("riderId", nextRiderId);
    if (nextSort !== "newest") params.set("sort", nextSort);
    if (nextLimit !== "20") params.set("limit", nextLimit);
    if (nextPage > 1) params.set("page", String(nextPage));

    const query = params.toString();
    router.push(query ? `/dashboard/admin/payouts?${query}` : "/dashboard/admin/payouts");
  };

  /**
   * Every row of the ledger, in the order the board is showing it.
   *
   * The page only carries twenty rows, but an export that quietly disagreed with
   * the tiles above it would be worse than no export at all, so the record is
   * gathered a page at a time and falls back to what is on screen if a read fails.
   */
  const gatherRecords = async (): Promise<{ rows: PayoutRecord[]; truncated: boolean }> => {
    if (pagination.total <= records.length && page === 1) {
      return { rows: records, truncated: false };
    }

    const collected: PayoutRecord[] = [];
    const pages = Math.min(
      Math.max(1, Math.ceil(pagination.total / EXPORT_PAGE_SIZE)),
      EXPORT_MAX_PAGES
    );

    for (let index = 1; index <= pages; index += 1) {
      const res = await getAdminPayouts({
        range,
        sort,
        page: index,
        limit: EXPORT_PAGE_SIZE,
        ...(riderId ? { riderId } : {}),
      });

      const rows: PayoutRecord[] = res?.data?.records ?? [];
      collected.push(...rows);
      if (rows.length < EXPORT_PAGE_SIZE) break;
    }

    return {
      rows: collected.length > 0 ? collected : records,
      truncated: collected.length < pagination.total,
    };
  };

  // One payload feeds both exports, so the CSV and the PDF can never disagree.
  const buildReport = async (): Promise<PayoutsExportData> => {
    const { rows, truncated } = await gatherRecords();

    return {
      rangeLabel,
      ...(selectedRider ? { riderName: selectedRider.name } : {}),
      totals,
      outstanding,
      series,
      byRider,
      records: rows,
      ...(truncated
        ? {
            recordNote: `Exported ${rows.length} of ${pagination.total} paid jobs in this window, in the order the board was sorted.`,
          }
        : {}),
    };
  };

  const exportOptions = { siteName: settings.siteName, currency: settings.currency };

  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    toast.info("Collecting the payout record...");
    try {
      const report = await buildReport();
      exportPayoutsCsv(report, exportOptions);
      toast.success("Rider payouts CSV exported successfully!");
    } catch (error) {
      console.error("Failed to export payouts CSV:", error);
      toast.error("Failed to export CSV. Please try again.");
    } finally {
      setIsExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    toast.info("Building your PDF report with charts...");
    try {
      const report = await buildReport();
      await downloadPayoutsPdf(report, exportOptions);
      toast.success("PDF report downloaded!");
    } catch (error) {
      console.error("Failed to export payouts PDF:", error);
      toast.error("Failed to build the PDF report. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const tiles = [
    {
      label: "Rider fees paid",
      value: formatPrice(totals.paid),
      note: `${totals.jobs} delivered job${totals.jobs === 1 ? "" : "s"}`,
      icon: Banknote,
      tone: "text-rose-600 dark:text-rose-400",
    },
    {
      label: "Taken off the profit",
      value: `${totals.feeSharePct}%`,
      note: "of the delivered sales below",
      icon: Percent,
      tone: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Delivered sales",
      value: formatPrice(totals.sales),
      note: "what the fees came out of",
      icon: Receipt,
      tone: "text-[var(--brand-flat)]",
    },
    {
      label: "Average per job",
      value: formatPrice(totals.avgPerJob),
      note: "the fee the store set",
      icon: Share2,
      tone: "text-indigo-600 dark:text-indigo-400",
    },
    {
      label: "Paid this month",
      value: formatPrice(totals.paidThisMonth),
      note: `${totals.monthJobs} job${totals.monthJobs === 1 ? "" : "s"} closed this month`,
      icon: Wallet,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Still owed",
      value: formatPrice(outstanding.amount),
      note: `${outstanding.jobs} job${outstanding.jobs === 1 ? "" : "s"} on the road`,
      icon: Truck,
      tone: "text-sky-600 dark:text-sky-400",
    },
  ];

  const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
  const to = Math.min(pagination.page * pagination.limit, pagination.total);
  const hasFilters = Boolean(riderId) || sort !== "newest" || range !== "365" || limit !== 20;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary">Rider Payouts</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Rider <span className="text-gradient-primary">Payout Record</span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1 max-w-2xl">
            Every fee a delivered job paid a rider, and the share of the sale it was
            deducted from. A fee is booked the moment the parcel is handed over — by the
            customer&apos;s code or the customer&apos;s own answer — so this record is the
            same money the overview has already taken off Net Profit.
          </p>
          {selectedRider && (
            <div className="inline-flex items-center gap-2 mt-2 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-bold text-primary">
              <Truck className="w-3.5 h-3.5" />
              Filtered to {selectedRider.name || "one rider"}
              <button
                onClick={() => go({ riderId: "", page: 1 })}
                className="hover:text-[var(--foreground)] cursor-pointer"
              >
                clear
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--surface-alt)] p-1 rounded-lg text-xs">
            {RANGE_CHOICES.map((choice) => (
              <button
                key={choice.key}
                onClick={() => go({ range: choice.key, page: 1 })}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  choice.key === range
                    ? "bg-[var(--surface)] text-primary shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {choice.label}
              </button>
            ))}
          </div>

          <Button
            onPress={handleExportPdf}
            isDisabled={isExportingPdf}
            className="bg-[var(--surface-alt)] text-[var(--foreground)] text-xs font-bold h-10 px-4 rounded-xl border border-[var(--border-color)] cursor-pointer disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              {isExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {isExportingPdf ? "Building PDF..." : "Export PDF"}
            </span>
          </Button>

          <Button
            onPress={handleExportCsv}
            isDisabled={isExportingCsv}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 h-10 px-4 rounded-xl cursor-pointer disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              {isExportingCsv ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isExportingCsv ? "Collecting..." : "Export CSV"}
            </span>
          </Button>
        </div>
      </div>

      {/* ── What the money did ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {tiles.map((tile) => (
          <Card
            key={tile.label}
            className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-4 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                {tile.label}
              </span>
              <tile.icon className={`w-4 h-4 shrink-0 ${tile.tone}`} />
            </div>
            <p className="text-xl font-extrabold text-[var(--foreground)] mt-1 truncate">
              {tile.value}
            </p>
            <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">{tile.note}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--surface-alt)]/60 border border-[var(--border-color)]">
        <p className="text-[11px] text-[var(--foreground-muted)]">
          <span className="font-bold text-[var(--foreground)]">Still owed is not spent.</span>{" "}
          Fees on jobs still on the road are promised, and only enter the total above when
          the parcel reaches the door.
        </p>
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] text-[var(--foreground)] text-[11px] font-bold shrink-0 hover:text-primary transition-colors"
        >
          <Link2 className="w-3.5 h-3.5" />
          See it cut Net Profit
        </Link>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Fees Paid &amp; Delivered Sales
              </h3>
            </div>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              {rangeLabel} · each bar is what left as the riders&apos; pay, the line is the
              sale it was deducted from
            </p>
          </div>

          {chartData.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center gap-2">
              <Boxes className="w-8 h-8 text-[var(--foreground-muted)]" />
              <p className="text-xs text-[var(--foreground-muted)] max-w-sm">
                No job has paid a rider in this window. Complete a delivery and the payout
                appears here on the same day.
              </p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -14, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    yAxisId="fees"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(value) => `${currencySymbol}${Math.round(Number(value))}`}
                  />
                  <YAxis
                    yAxisId="sales"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(value) => `${currencySymbol}${Math.round(Number(value))}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-elevated)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "14px",
                      color: "var(--foreground)",
                      fontSize: "12px",
                    }}
                    formatter={(value: ValueType | undefined, name: NameType | undefined) => [
                      `${currencySymbol}${Number(value ?? 0).toFixed(2)}`,
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    yAxisId="fees"
                    dataKey="paid"
                    name="Rider fees paid"
                    fill="#ef4444"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={26}
                  />
                  <Line
                    yAxisId="sales"
                    type="monotone"
                    dataKey="sales"
                    name="Delivered sales"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={{ r: 2.5 }}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <PieIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Where It Went</h3>
            </div>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              Share of all fees, by rider
            </p>
          </div>

          {riderSlices.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center gap-2">
              <Truck className="w-8 h-8 text-[var(--foreground-muted)]" />
              <p className="text-xs text-[var(--foreground-muted)]">
                Nobody has been paid in this window yet.
              </p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riderSlices}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {riderSlices.map((slice) => (
                      <Cell key={slice.name} fill={slice.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--surface-elevated)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "14px",
                      color: "var(--foreground)",
                      fontSize: "12px",
                    }}
                    formatter={(value: ValueType | undefined, name: NameType | undefined) => [
                      `${currencySymbol}${Number(value ?? 0).toFixed(2)}`,
                      String(name),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* ── Per rider, clickable into the filter ── */}
      <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 pb-4">
          <h3 className="text-base font-bold text-[var(--foreground)]">Paid Per Rider</h3>
          <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
            Pick a row to read the whole board for that rider alone.
          </p>
        </div>

        {byRider.length === 0 ? (
          <p className="px-6 pb-6 text-xs text-[var(--foreground-muted)]">
            No rider has closed a delivery in this window.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-alt)] text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3 font-bold">Rider</th>
                  <th className="px-4 py-3 font-bold text-right">Jobs</th>
                  <th className="px-4 py-3 font-bold text-right">Paid</th>
                  <th className="px-4 py-3 font-bold text-right">Share of fees</th>
                  <th className="px-6 py-3 font-bold">Last paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {byRider.map((rider) => (
                  <tr
                    key={rider.riderId}
                    className="hover:bg-[var(--surface-alt)]/60 transition-colors"
                  >
                    <td className="px-6 py-3.5">
                      <button
                        onClick={() =>
                          go({
                            riderId: rider.riderId === riderId ? "" : rider.riderId,
                            page: 1,
                          })
                        }
                        className={`font-semibold cursor-pointer transition-colors hover:text-primary ${
                          rider.riderId === riderId ? "text-primary" : "text-[var(--foreground)]"
                        }`}
                      >
                        {rider.name || "A rider"}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right text-[var(--foreground)]">
                      {rider.jobs}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-[var(--foreground)]">
                      {formatPrice(rider.paid)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[var(--foreground-muted)]">
                      {totals.paid > 0 ? `${Math.round((rider.paid / totals.paid) * 1000) / 10}%` : "—"}
                    </td>
                    <td className="px-6 py-3.5 text-[var(--foreground-muted)]">
                      {rider.lastAt ? formatOrderDate(rider.lastAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── The record ── */}
      <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl shadow-xs overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-6 pb-4">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">Payout Record</h3>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              One line per delivered job — the fee on the right is what came off the profit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
            <AppSelect
              size="sm"
              ariaLabel="Filter payouts by rider"
              value={riderId || "all"}
              onChange={(next) => go({ riderId: next === "all" ? "" : next, page: 1 })}
              options={[
                { value: "all", label: "Every rider" },
                ...byRider.map((rider) => ({
                  value: rider.riderId,
                  label: rider.name || "A rider",
                })),
              ]}
            />
            <AppSelect
              size="sm"
              ariaLabel="Sort payouts"
              value={sort}
              onChange={(next) => go({ sort: next, page: 1 })}
              options={[
                { value: "newest", label: "Newest first" },
                { value: "oldest", label: "Oldest first" },
                { value: "fee_desc", label: "Highest fee" },
              ]}
            />
            <AppSelect
              size="sm"
              ariaLabel="Rows per page"
              value={String(limit)}
              onChange={(next) => go({ limit: next, page: 1 })}
              options={[
                { value: "20", label: "20 rows" },
                { value: "50", label: "50 rows" },
                { value: "100", label: "100 rows" },
              ]}
            />
            {hasFilters && (
              <Button
                size="sm"
                onPress={() => router.push("/dashboard/admin/payouts")}
                className="h-9 text-[11px] font-bold rounded-xl bg-[var(--surface-alt)] text-[var(--foreground)] border border-[var(--border-color)]"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {records.length === 0 ? (
          <div className="p-10 flex flex-col items-center text-center gap-3">
            <Receipt className="w-10 h-10 text-[var(--foreground-muted)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">Nothing paid yet</p>
            <p className="text-xs text-[var(--foreground-muted)] max-w-md">
              A payout is recorded when a rider hands the parcel over and the customer
              confirms it. Assign a rider from an order to start one.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-alt)] text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3 font-bold">Order</th>
                  <th className="px-4 py-3 font-bold">Rider</th>
                  <th className="px-4 py-3 font-bold">City</th>
                  <th className="px-4 py-3 font-bold text-right">Sale</th>
                  <th className="px-4 py-3 font-bold text-right">Fee paid</th>
                  <th className="px-4 py-3 font-bold text-right">Off the sale</th>
                  <th className="px-4 py-3 font-bold">Confirmed by</th>
                  <th className="px-6 py-3 font-bold">Delivered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {records.map((record) => (
                  <tr key={record._id} className="hover:bg-[var(--surface-alt)]/60 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-[var(--foreground)] whitespace-nowrap">
                      <Link
                        href={`/track-order/${record.orderId}`}
                        className="hover:text-primary transition-colors"
                      >
                        {record.orderNumber}
                      </Link>
                      <span className="block text-[10px] font-medium text-[var(--foreground-muted)]">
                        {record.items} item{record.items === 1 ? "" : "s"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[var(--foreground)]">
                      {record.riderName || "A rider"}
                    </td>
                    <td className="px-4 py-3.5 text-[var(--foreground-muted)]">
                      {record.city || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[var(--foreground)]">
                      {formatPrice(record.orderTotal)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatPrice(record.fee)}
                    </td>
                    <td className="px-4 py-3.5 text-right text-[var(--foreground-muted)]">
                      {record.orderTotal > 0
                        ? `${Math.round((record.fee / record.orderTotal) * 1000) / 10}%`
                        : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <Chip
                        size="sm"
                        className={`border text-[10px] font-bold ${
                          record.paidVia === "customer"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                            : "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25"
                        }`}
                      >
                        {paidViaLabel(record.paidVia)}
                      </Chip>
                    </td>
                    <td className="px-6 py-3.5 text-[var(--foreground-muted)] whitespace-nowrap">
                      {record.deliveredAt ? formatOrderDateTime(record.deliveredAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pager ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--surface-alt)]/40">
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Showing <span className="font-bold text-[var(--foreground)]">{from}</span>–
            <span className="font-bold text-[var(--foreground)]">{to}</span> of{" "}
            <span className="font-bold text-[var(--foreground)]">{pagination.total}</span> paid
            job{pagination.total === 1 ? "" : "s"}
          </p>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              isDisabled={pagination.page <= 1}
              onPress={() => go({ page: pagination.page - 1 })}
              className="h-8 text-[11px] font-bold rounded-lg bg-[var(--surface)] border border-[var(--border-color)] text-[var(--foreground)]"
            >
              Previous
            </Button>
            <span className="text-[11px] font-bold text-[var(--foreground-muted)] px-1">
              {pagination.page} / {Math.max(1, pagination.totalPages)}
            </span>
            <Button
              size="sm"
              isDisabled={pagination.page >= pagination.totalPages}
              onPress={() => go({ page: pagination.page + 1 })}
              className="h-8 text-[11px] font-bold rounded-lg bg-[var(--surface)] border border-[var(--border-color)] text-[var(--foreground)]"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
