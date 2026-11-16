"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  Eye,
  FileText,
  Heart,
  Lock,
  MousePointerClick,
  Package,
  ShoppingCart,
  TriangleAlert,
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
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "react-toastify";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { VendorAnalyticsReport, EngagementProductRow } from "@/types/vendor";
import type { VendorAnalyticsExportData } from "@/lib/csvExport";
import { exportVendorAnalyticsCsv } from "@/lib/csvExport";
import { downloadVendorAnalyticsPdf } from "@/lib/dashboardPdf";
import { getVendorOrderStatusStyle } from "@/lib/vendorOrderStatus";
import { formatOrderDate } from "@/lib/dateTime";
import { formatPrice, getCurrencySymbol } from "@/lib/currency";

/**
 * The seller's sales report.
 *
 * Revenue is counted when a group is delivered, so the money on this page is
 * money the shop has actually earned; anything still packed or on the way is
 * reported beside it as its own number. Every figure comes from the API, already
 * capped by the vendor's plan — the screen only decides how to draw them.
 */

interface VendorAnalyticsClientProps {
  report: VendorAnalyticsReport;
  /** The window the URL asked for, which the plan may have shortened. */
  requestedRange: number;
  vendorName: string;
  currency: string;
  siteName: string;
}

const RANGE_CHOICES = [7, 30, 90, 365];

/**
 * What the next rungs add, in the words the page would use for them.
 *
 * Kept beside the report so the teaser and the real section describe the same
 * figures — a vendor reading "product clicks" here finds product clicks below
 * once the plan reaches Advanced.
 */
const PREMIUM_ADDS = [
  "90 days of history instead of 30",
  "Units sold and average order value",
  "Net payout after platform commission",
  "Profit and loss against the cost you record",
  "Fulfilment rate, with rejected and cancelled counts",
  "The order pipeline by stage",
  "Top 10 products instead of 3",
  "CSV report export",
];

const ADVANCED_ADDS = [
  "A full year of history instead of 90 days",
  "Product views and product clicks",
  "Which of your products sit on the most wishlists",
  "Money still on the way and the commission split",
  "CSV + PDF report export",
];

/** The pipeline is drawn in fulfilment order, not alphabetically. */
const PIPELINE_ORDER = [
  "pending",
  "accepted",
  "processing",
  "ready_for_shipment",
  "shipped",
  "delivered",
  "rejected",
  "cancelled",
];

/** "2026-10-31" -> "31 Oct", "2026-10" -> "Oct". Axis labels have no room for years. */
function formatBucketLabel(label: string, monthly: boolean): string {
  const parts = label.split("-");
  if (monthly) {
    const month = Number(parts[1]);
    if (!month) return label;
    return new Date(2000, month - 1, 1).toLocaleDateString("en-GB", { month: "short" });
  }
  const day = Number(parts[2]);
  const month = Number(parts[1]);
  if (!day || !month) return label;
  return new Date(2000, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function Tile({
  label,
  value,
  note,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string;
  note?: React.ReactNode;
  icon: typeof Wallet;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-2xs ${
        highlight
          ? "border-[var(--brand-flat)]/40 bg-[var(--surface-elevated)]"
          : "border-[var(--border-color)] bg-[var(--surface-elevated)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          {label}
        </p>
        <span className="rounded-lg bg-[var(--surface-alt)] p-1.5 text-[var(--foreground-muted)]">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 text-xl font-extrabold tracking-tight text-[var(--foreground)]">{value}</p>
      {note && <p className="mt-1 text-[11px] text-[var(--foreground-muted)]">{note}</p>}
    </div>
  );
}

/**
 * What the next plans add, next to what this one already has.
 *
 * The list is written from the plans themselves rather than from a fixed
 * sentence, so a rung an admin renames or downgrades stops being promised here
 * the moment it changes.
 */
function UpsellPanel({
  planName,
  groups,
}: {
  planName: string;
  groups: { title: string; items: string[] }[];
}) {
  return (
    <section className="rounded-2xl border border-dashed border-[var(--brand-flat)]/45 bg-[var(--surface-elevated)] p-5 shadow-2xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
            <Lock className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
            More than {planName} shows
          </h2>
          <p className="mt-0.5 text-[11px] text-[var(--foreground-muted)]">
            These are the figures a higher plan folds into the same page.
          </p>
        </div>

        <Link
          href="/dashboard/vendor/subscription"
          className="inline-flex items-center gap-1 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] transition-opacity hover:opacity-90"
        >
          See plans
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              {group.title}
            </p>
            <ul className="mt-2 space-y-1.5">
              {group.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--foreground-muted)]"
                >
                  <Lock className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/** One product row inside the engagement tables. */
function EngagementRow({
  row,
  rank,
  currency,
  byWishlist,
}: {
  row: EngagementProductRow;
  rank: number;
  currency: string;
  byWishlist?: boolean;
}) {
  const leading = byWishlist ? row.wishlists : row.views;
  const trailing = byWishlist ? row.views : row.clicks;

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="w-4 shrink-0 text-[11px] font-bold text-[var(--foreground-muted)]">
        {rank}
      </span>
      {row.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.image}
          alt=""
          className="h-9 w-9 shrink-0 rounded-lg border border-[var(--border-color)] object-cover"
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground-muted)]">
          <Package className="h-4 w-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11px] font-semibold text-[var(--foreground)]">
          {row.title}
        </span>
        <span className="block text-[10px] text-[var(--foreground-muted)]">
          {leading.toLocaleString()} {byWishlist ? "on wishlists" : "views"} · {trailing.toLocaleString()}{" "}
          {byWishlist ? "views" : "clicks"}
        </span>
      </span>
      <span className="shrink-0 text-[11px] font-bold text-[var(--foreground)]">
        {formatPrice(row.price, currency, { showDecimals: false })}
      </span>
    </li>
  );
}

export default function VendorAnalyticsClient({
  report,
  requestedRange,
  vendorName,
  currency,
  siteName,
}: VendorAnalyticsClientProps) {
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const symbol = getCurrencySymbol(currency);
  const { totals, previous } = report;
  const profit = report.profit;

  // The three export rungs: none on free, CSV on premium, CSV + PDF on advanced.
  // The deeper tables (per product, per order) are the top rung's reward.
  const canExportCsv = report.plan.exports === "csv" || report.plan.exports === "csv+pdf";
  const canExportPdf = report.plan.exports === "csv+pdf";

  // The plan decides how deep the page goes: Free reads the headline sales,
  // Premium adds the working detail, Advanced adds the traffic on top.
  const isAdvanced = report.level === "advanced";
  const isDetailed = isAdvanced || report.level === "detailed";

  const engagement = report.engagement;
  const clickRate =
    engagement && engagement.totals.views > 0
      ? Math.round((engagement.totals.clicks / engagement.totals.views) * 100)
      : 0;

  const chartData = useMemo(
    () =>
      report.series.map((point) => ({
        label: formatBucketLabel(point.label, report.monthly),
        revenue: point.revenue,
        orders: point.orders,
      })),
    [report.series, report.monthly]
  );

  // The P&L graph: gross profit per bucket, drawn on its own so the revenue
  // chart above keeps one job and this one answers a loss directly.
  const profitChartData = useMemo(
    () =>
      report.series.map((point) => ({
        label: formatBucketLabel(point.label, report.monthly),
        profit: point.profit ?? 0,
      })),
    [report.series, report.monthly]
  );

  const pipeline = useMemo(() => {
    const entries = Object.entries(report.statusCounts);
    const ordered = entries.sort((a, b) => {
      const indexA = PIPELINE_ORDER.indexOf(a[0]);
      const indexB = PIPELINE_ORDER.indexOf(b[0]);
      return (indexA === -1 ? 99 : indexA) - (indexB === -1 ? 99 : indexB);
    });
    const max = ordered.reduce((highest, [, count]) => Math.max(highest, count), 0);

    return ordered
      .filter(([, count]) => count > 0)
      .map(([status, count]) => {
        const style = getVendorOrderStatusStyle(status);
        return {
          status,
          label: style.label,
          dot: style.dot,
          badge: style.badge,
          count,
          share: max > 0 ? Math.round((count / max) * 100) : 0,
        };
      });
  }, [report.statusCounts]);

  // One payload feeds both exports, so the CSV and the PDF can never disagree.
  const exportData: VendorAnalyticsExportData = {
    vendorName,
    planName: report.plan.name,
    rangeDays: report.range,
    monthly: report.monthly,
    totals,
    previous,
    series: report.series,
    statusCounts: report.statusCounts,
    profit: report.profit,
    topProducts: report.topProducts.map((product) => ({
      title: product.title,
      units: product.units,
      revenue: product.revenue,
    })),
    recent: report.recent.map((order) => ({
      orderNumber: order.orderNumber || "-",
      status: order.status,
      subtotal: order.subtotal,
      units: order.units,
      city: order.city,
      placedAt: formatOrderDate(order.placedAt),
    })),
    full: canExportPdf,
  };

  const exportOptions = { siteName, currency };

  const handleExportCsv = () => {
    try {
      toast.info("Preparing your sales report...");
      exportVendorAnalyticsCsv(exportData, exportOptions);
      toast.success("Sales report exported!");
    } catch (error) {
      console.error("Failed to export vendor analytics CSV:", error);
      toast.error("Failed to export CSV. Please try again.");
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    toast.info("Building your PDF report with charts...");
    try {
      await downloadVendorAnalyticsPdf(exportData, exportOptions);
      toast.success("PDF report downloaded!");
    } catch (error) {
      console.error("Failed to export vendor analytics PDF:", error);
      toast.error("Failed to build the PDF report. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <header>
          <h1 className="text-lg font-bold text-[var(--foreground)]">Analytics</h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            {vendorName ? `${vendorName} · ` : ""}
            {totals.orders} delivered order{totals.orders === 1 ? "" : "s"} worth{" "}
            {formatPrice(totals.revenue, currency, { showDecimals: false })} in the last {report.range} days
          </p>
        </header>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-alt)] p-1">
            {RANGE_CHOICES.map((choice) => {
              const owned = choice <= report.maxRange;

              return (
                <Link
                  key={choice}
                  href={`/dashboard/vendor/analytics?range=${choice}`}
                  title={owned ? `Last ${choice} days` : `Not on the ${report.plan.name} plan`}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    choice === report.range
                      ? "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-2xs"
                      : owned
                        ? "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                        : "text-[var(--foreground-muted)]/50"
                  }`}
                >
                  {choice}d
                </Link>
              );
            })}
          </div>

          {canExportPdf ? (
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-wait disabled:opacity-60"
            >
              <FileText className="h-3.5 w-3.5" />
              {isExportingPdf ? "Building..." : "Export PDF"}
            </button>
          ) : (
            <Link
              href="/dashboard/vendor/subscription"
              title="PDF reports come with Advanced"
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <FileText className="h-3.5 w-3.5" />
              PDF on Advanced
            </Link>
          )}

          {canExportCsv ? (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] transition-opacity hover:opacity-90"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          ) : (
            <Link
              href="/dashboard/vendor/subscription"
              title="CSV reports start on Premium"
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border-color)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
            >
              <Download className="h-3.5 w-3.5" />
              CSV on Premium
            </Link>
          )}
        </div>
      </div>

      {/* ── Plan note: the window shown is the window owned ── */}
      {requestedRange > report.range && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-300/60 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            You asked for {requestedRange} days. The{" "}
            <span className="font-bold">{report.plan.name}</span> plan reads{" "}
            {report.maxRange} days back, so this report covers the last {report.range} days.{" "}
            <Link href="/dashboard/vendor/subscription" className="font-bold underline">
              See plans
            </Link>
          </p>
        </div>
      )}

      {/* ── Metric tiles ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Revenue earned"
          value={formatPrice(totals.revenue, currency, { showDecimals: false })}
          icon={Wallet}
          highlight
          note={
            previous.revenueChange === null ? (
              <>No delivered orders in the window before this one</>
            ) : (
              <span
                className={`inline-flex items-center gap-1 font-bold ${
                  previous.revenueChange >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {previous.revenueChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {Math.abs(previous.revenueChange)}% vs {formatPrice(previous.revenue, currency, { showDecimals: false })}
              </span>
            )
          }
        />
        <Tile
          label="Delivered orders"
          value={String(totals.orders)}
          icon={Package}
          note={`${totals.placed} placed in this window`}
        />
        {isDetailed && (
          <>
            <Tile
              label="Units sold"
              value={String(totals.units)}
              icon={ShoppingCart}
              note={
                totals.orders > 0
                  ? `${Math.round((totals.units / totals.orders) * 10) / 10} per order on average`
                  : "Nothing delivered yet"
              }
            />
            <Tile
              label="Average order"
              value={formatPrice(totals.avgOrderValue, currency)}
              icon={BarChart3}
              note={`Across ${totals.orders} delivered order${totals.orders === 1 ? "" : "s"}`}
            />
            <Tile
              label="Net payout"
              value={formatPrice(totals.netPayout, currency, { showDecimals: false })}
              icon={Wallet}
              highlight
              note="What is yours after commission and any delivery fee"
            />
            <Tile
              label="Fulfilment rate"
              value={`${totals.fulfilmentRate}%`}
              icon={Package}
              note={
                totals.stopped > 0
                  ? `${totals.stopped} rejected or cancelled in this window`
                  : "Nothing rejected or cancelled"
              }
            />
          </>
        )}
        {isAdvanced && (
          <>
            <Tile
              label="On the way"
              value={formatPrice(totals.inFlight, currency, { showDecimals: false })}
              icon={Package}
              note="Ready or shipped — not earned yet"
            />
            <Tile
              label="Platform commission"
              value={`${totals.commission}%`}
              icon={Wallet}
              note={`${formatPrice(totals.commissionTaken, currency)} taken on earned revenue`}
            />
          </>
        )}
      </div>

      {/* ── Revenue chart ── */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-[var(--surface-alt)] p-1.5 text-[var(--foreground-muted)]">
            <BarChart3 className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">
              Revenue and delivered orders
            </h2>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Per {report.monthly ? "month" : "day"} · bars are earned revenue, the line is orders
            </p>
          </div>
        </div>

        {totals.revenue === 0 && totals.placed === 0 ? (
          <div className="mt-6 flex h-64 flex-col items-center justify-center gap-2 text-center">
            <Package className="h-7 w-7 text-[var(--foreground-muted)]" />
            <p className="max-w-sm text-[11px] leading-relaxed text-[var(--foreground-muted)]">
              No orders in this window. As soon as a checkout contains something from your shop it
              lands on the order board, and this chart starts filling up.
            </p>
            <Link
              href="/dashboard/vendor/orders"
              className="text-[11px] font-bold text-[var(--foreground)] underline"
            >
              Open orders
            </Link>
          </div>
        ) : (
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="money"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(value) => `${symbol}${Math.round(Number(value))}`}
                />
                <YAxis
                  yAxisId="count"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  allowDecimals={false}
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
                    String(name).toLowerCase().includes("revenue")
                      ? formatPrice(Number(value ?? 0), currency)
                      : `${Number(value ?? 0)} order${Number(value ?? 0) === 1 ? "" : "s"}`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="money"
                  dataKey="revenue"
                  name="Revenue"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={26}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="orders"
                  name="Delivered orders"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── Profit and loss: the paid rungs' read, teaser on basic ── */}
      {profit ? (
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-[var(--surface-alt)] p-1.5 text-[var(--foreground-muted)]">
                <Wallet className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-[var(--foreground)]">Profit and loss</h2>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  Delivered revenue against the cost you recorded on each product
                </p>
              </div>
            </div>
            <span
              className={`whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-bold ${
                (profit.marginPercent ?? 0) >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              }`}
            >
              {profit.marginPercent === null ? "No margin yet" : `${profit.marginPercent}% margin`}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tile
              label="Cost of goods"
              value={formatPrice(profit.cost, currency, { showDecimals: false })}
              icon={ShoppingCart}
              note={`${totals.units} delivered unit${totals.units === 1 ? "" : "s"} priced`}
            />
            <Tile
              label="Gross profit"
              value={formatPrice(profit.profit, currency, { showDecimals: false })}
              icon={Wallet}
              highlight
              note={
                profit.previousProfit === null
                  ? "No delivered orders in the window before"
                  : `Previous window ${formatPrice(profit.previousProfit, currency, { showDecimals: false })}`
              }
            />
            <Tile
              label="Selling below cost"
              value={String(profit.losses.length)}
              icon={TriangleAlert}
              note={
                profit.losses.length > 0
                  ? "Products that earned less than they cost"
                  : "Nothing sold at a loss"
              }
            />
            <Tile
              label="Units without a cost"
              value={String(profit.missingCostUnits)}
              icon={Package}
              note="Counted at zero until you add a cost price"
            />
          </div>

          <div className="mt-5 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={profitChartData}
                margin={{ top: 10, right: 4, left: -18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(value) => `${symbol}${Math.round(Number(value))}`}
                />
                <ReferenceLine y={0} stroke="var(--border-color)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-elevated)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "14px",
                    color: "var(--foreground)",
                    fontSize: "12px",
                  }}
                  formatter={(value: ValueType | undefined) => [
                    formatPrice(Number(value ?? 0), currency),
                    "Gross profit",
                  ]}
                />
                <Bar dataKey="profit" name="Gross profit" radius={[6, 6, 0, 0]} maxBarSize={26}>
                  {profitChartData.map((point) => (
                    <Cell
                      key={point.label}
                      fill={point.profit >= 0 ? "#10b981" : "#f43f5e"}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {profit.missingCostUnits > 0 && (
            <p className="mt-3 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              {profit.missingCostUnits} delivered unit
              {profit.missingCostUnits === 1 ? " has" : "s have"} no cost price on their product, so{" "}
              {profit.missingCostUnits === 1 ? "it counts" : "they count"} as cost-free. Add an invest
              price on those listings to sharpen this report —{" "}
              <Link href="/dashboard/vendor/products" className="font-bold underline">
                open products
              </Link>
              .
            </p>
          )}

          {profit.losses.length > 0 && (
            <div className="mt-5 border-t border-[var(--border-color)] pt-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                Sold below cost this window
              </p>
              <ul className="mt-2 divide-y divide-[var(--border-color)]">
                {profit.losses.map((row) => (
                  <li
                    key={row.title}
                    className="flex items-center justify-between gap-3 py-2 text-[11px]"
                  >
                    <span className="min-w-0 flex-1 truncate font-semibold text-[var(--foreground)]">
                      {row.title}
                    </span>
                    <span className="text-[var(--foreground-muted)]">
                      {row.units} unit{row.units === 1 ? "" : "s"}
                    </span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      -{formatPrice(row.loss, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-[var(--brand-flat)]/45 bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="rounded-lg bg-[var(--surface-alt)] p-1.5 text-[var(--brand-flat)]">
              <Lock className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--foreground)]">Profit and loss</h2>
              <p className="mt-0.5 max-w-xl text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                Record a cost price on each product and this panel compares it with what those units
                earned: the cost of goods, your gross profit and margin, the graph across the window,
                and every listing that sold below cost. It comes with Premium and Advanced.
              </p>
              <Link
                href="/dashboard/vendor/subscription"
                className="mt-3 inline-flex items-center gap-1 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] transition-opacity hover:opacity-90"
              >
                See plans
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className={`grid grid-cols-1 gap-5 ${isDetailed ? "lg:grid-cols-2" : ""}`}>
        {/* ── Pipeline ── */}
        {isDetailed && (
          <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-[var(--foreground)]">Order pipeline</h2>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              What you were asked to do in this window, by stage
            </p>

            {pipeline.length === 0 ? (
              <p className="mt-6 text-[11px] text-[var(--foreground-muted)]">
                Nothing has been ordered from your shop in this window.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {pipeline.map((row) => (
                  <li key={row.status}>
                    <div className="flex items-center justify-between gap-3 text-[11px]">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.badge}`}>
                        {row.label}
                      </span>
                      <span className="font-bold text-[var(--foreground)]">{row.count}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-alt)]">
                      <div
                        className={`h-full rounded-full ${row.dot}`}
                        style={{ width: `${Math.max(row.share, 4)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* ── Top products ── */}
        <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-[var(--foreground)]">Top products</h2>
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Ranked by earned revenue in this window
              </p>
            </div>
            <span className="whitespace-nowrap rounded-lg bg-[var(--surface-alt)] px-2 py-1 text-[10px] font-bold text-[var(--foreground-muted)]">
              {report.level === "basic" ? "Top 3 on your plan" : `Top ${report.topProducts.length}`}
            </span>
          </div>

          {report.topProducts.length === 0 ? (
            <p className="mt-6 text-[11px] text-[var(--foreground-muted)]">
              No delivered sales to rank yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--border-color)]">
              {report.topProducts.map((product, index) => (
                <li key={`${product.title}-${index}`} className="flex items-center gap-3 py-2.5">
                  <span className="w-4 shrink-0 text-[11px] font-bold text-[var(--foreground-muted)]">
                    {index + 1}
                  </span>
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-lg border border-[var(--border-color)] object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground-muted)]">
                      <Package className="h-4 w-4" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-semibold text-[var(--foreground)]">
                      {product.title}
                    </span>
                    <span className="block text-[10px] text-[var(--foreground-muted)]">
                      {product.units} unit{product.units === 1 ? "" : "s"} sold
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-bold text-[var(--foreground)]">
                    {formatPrice(product.revenue, currency, { showDecimals: false })}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {!canExportPdf && (
            <p className="mt-3 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              {canExportCsv
                ? "Your CSV carries the totals, the chart data and the tables on this page. The PDF report comes with Advanced."
                : "Reporting exports start on Premium, where the CSV carries every table on this page. PDF joins them on Advanced."}
            </p>
          )}
        </section>
      </div>

      {/* ── Traffic: the advanced rung's own read ── */}
      {isAdvanced && engagement && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Tile
              label="Product views"
              value={engagement.totals.views.toLocaleString()}
              icon={Eye}
              note="Your listings opened in this window"
            />
            <Tile
              label="Product clicks"
              value={engagement.totals.clicks.toLocaleString()}
              icon={MousePointerClick}
              note={`${clickRate}% of views turned into a press`}
            />
            <Tile
              label="Wishlist saves"
              value={engagement.totals.wishlists.toLocaleString()}
              icon={Heart}
              highlight
              note="Kept for later right now"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-[var(--foreground)]">Most viewed</h2>
                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    Which listings people opened, and what they did next
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-lg bg-[var(--surface-alt)] px-2 py-1 text-[10px] font-bold text-[var(--foreground-muted)]">
                  Top {engagement.top.length}
                </span>
              </div>

              {engagement.top.length === 0 ? (
                <p className="mt-6 text-[11px] text-[var(--foreground-muted)]">
                  No traffic counted in this window yet. Views start the moment somebody opens a
                  listing of yours.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-[var(--border-color)]">
                  {engagement.top.map((row, index) => (
                    <EngagementRow
                      key={row.id}
                      row={row}
                      rank={index + 1}
                      currency={currency}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-1.5 text-sm font-bold text-[var(--foreground)]">
                    <Heart className="h-3.5 w-3.5 text-rose-500" />
                    On the most wishlists
                  </h2>
                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    Saved for later — demand that has not bought yet
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-lg bg-[var(--surface-alt)] px-2 py-1 text-[10px] font-bold text-[var(--foreground-muted)]">
                  {engagement.topWishlisted.length > 0
                    ? `Top ${engagement.topWishlisted.length}`
                    : "None yet"}
                </span>
              </div>

              {engagement.topWishlisted.length === 0 ? (
                <p className="mt-6 text-[11px] text-[var(--foreground-muted)]">
                  Nobody has saved one of your products yet. Wishlist saves appear here the moment a
                  shopper taps the heart.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-[var(--border-color)]">
                  {engagement.topWishlisted.map((row, index) => (
                    <EngagementRow
                      key={row.id}
                      row={row}
                      rank={index + 1}
                      currency={currency}
                      byWishlist
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </section>
      )}

      {/* ── What the next rung would add ── */}
      {!isDetailed && (
        <UpsellPanel
          planName={report.plan.name}
          groups={[
            { title: "Premium adds", items: PREMIUM_ADDS },
            { title: "Advanced adds", items: ADVANCED_ADDS },
          ]}
        />
      )}
      {isDetailed && !isAdvanced && (
        <UpsellPanel
          planName={report.plan.name}
          groups={[{ title: "Advanced adds", items: ADVANCED_ADDS }]}
        />
      )}

      {/* ── Recent orders ── */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] shadow-2xs">
        <div className="flex items-center justify-between gap-3 p-5 pb-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">Recent orders</h2>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              The {report.recent.length} group{report.recent.length === 1 ? "" : "s"} you moved last
            </p>
          </div>
          <Link
            href="/dashboard/vendor/orders"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--foreground)] underline"
          >
            All orders
          </Link>
        </div>

        {report.recent.length === 0 ? (
          <p className="px-5 pb-5 text-[11px] text-[var(--foreground-muted)]">
            Nothing placed in this window.
          </p>
        ) : (
          <div className="overflow-x-auto border-t border-[var(--border-color)]">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-[var(--surface-alt)] text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                <tr>
                  <th className="px-5 py-2.5 font-bold">Order</th>
                  <th className="px-4 py-2.5 font-bold">Stage</th>
                  <th className="px-4 py-2.5 font-bold">City</th>
                  <th className="px-4 py-2.5 font-bold">Units</th>
                  <th className="px-4 py-2.5 text-right font-bold">Your total</th>
                  <th className="px-4 py-2.5 font-bold">Placed</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {report.recent.map((order) => {
                  const style = getVendorOrderStatusStyle(order.status);

                  return (
                    <tr key={order.id} className="hover:bg-[var(--surface-alt)]/60">
                      <td className="px-5 py-3 font-bold text-[var(--foreground)]">
                        {order.orderNumber || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.badge}`}>
                          {style.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">{order.city || "—"}</td>
                      <td className="px-4 py-3 text-[var(--foreground-muted)]">{order.units}</td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--foreground)]">
                        {formatPrice(order.subtotal, currency, { showDecimals: false })}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--foreground-muted)]">
                        {formatOrderDate(order.placedAt)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Link
                          href={`/dashboard/vendor/orders/${order.id}`}
                          className="font-bold text-[var(--foreground)] underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Delivery fee: who pays the courier ── */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
        <div className="flex items-start gap-2">
          <span className="rounded-lg bg-[var(--surface-alt)] p-1.5 text-[var(--foreground-muted)]">
            <Truck className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-[var(--foreground)]">Delivery fee</h2>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              {report.delivery.covered
                ? `Your ${report.plan.name} plan includes last-mile delivery`
                : `On ${report.plan.name}, the courier is paid out of what the parcel earned`}
            </p>
          </div>
        </div>

        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Charged on delivered parcels
            </dt>
            <dd className="mt-1 text-sm font-bold text-[var(--foreground)]">
              {formatPrice(report.delivery.billed, currency)}
            </dd>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Taken from your income
            </dt>
            <dd className="mt-1 text-sm font-bold text-[var(--foreground)]">
              {formatPrice(report.delivery.deducted, currency)}
            </dd>
          </div>
          <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] p-3">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Carried by the store team
            </dt>
            <dd className="mt-1 text-sm font-bold text-[var(--foreground)]">
              {formatPrice(report.delivery.absorbed, currency)}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
          {report.delivery.covered
            ? "A paid plan bundles the delivery fee, so the store team pays the courier and nothing comes off this window. "
            : "The fee is taken from what its own lines earned and stops at that figure: a parcel that cost more to deliver than it made is the store team's loss, never a debt on your shop. "}
          {report.delivery.billed === 0
            ? "No delivery fee was charged on this window's parcels."
            : `${formatPrice(report.delivery.billed, currency, { showDecimals: false })} was charged across the parcels this window earned.`}
        </p>
      </section>

      {/* ── Settlement note ── */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-alt)] p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-[var(--foreground)]">How this window settles</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
          {formatPrice(totals.revenue, currency, { showDecimals: false })} earned ·{" "}
          {totals.commission}% platform commission is {formatPrice(totals.commissionTaken, currency)},
          leaving <span className="font-bold text-[var(--foreground)]">{formatPrice(totals.netPayout, currency)}</span>{" "}
          for your shop.
          {totals.deliveryFee > 0 &&
            ` The delivery fee took ${formatPrice(totals.deliveryFee, currency)} of that, with ${formatPrice(totals.deliveryFeeAbsorbed, currency)} carried by the store team.`}{" "}
          {formatPrice(totals.inFlight, currency, { showDecimals: false })} worth of
          groups are still on the way and are not counted here. Settlement runs on the schedule in{" "}
          <Link href="/dashboard/vendor/subscription" className="font-bold underline">
            Plan &amp; billing
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
