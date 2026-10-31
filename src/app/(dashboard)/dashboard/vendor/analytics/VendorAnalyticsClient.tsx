"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Download,
  FileText,
  Package,
  ShoppingCart,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "react-toastify";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { VendorAnalyticsReport } from "@/types/vendor";
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

  const chartData = useMemo(
    () =>
      report.series.map((point) => ({
        label: formatBucketLabel(point.label, report.monthly),
        revenue: point.revenue,
        orders: point.orders,
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
    full: report.plan.exports === "full",
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

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] px-3 py-2 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:cursor-wait disabled:opacity-60"
          >
            <FileText className="h-3.5 w-3.5" />
            {isExportingPdf ? "Building..." : "Export PDF"}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2 text-[11px] font-bold text-[var(--on-grad-text)] transition-opacity hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
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
        <Tile
          label="Net payout"
          value={formatPrice(totals.netPayout, currency, { showDecimals: false })}
          icon={Wallet}
          highlight
          note="What is yours after commission"
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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ── Pipeline ── */}
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

          {report.plan.exports === "limited" && (
            <p className="mt-3 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              Your plan exports the totals and the chart data. Per-product and per-order tables come
              with full exports.
            </p>
          )}
        </section>
      </div>

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

      {/* ── Settlement note ── */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-alt)] p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-[var(--foreground)]">How this window settles</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
          {formatPrice(totals.revenue, currency, { showDecimals: false })} earned ·{" "}
          {totals.commission}% platform commission is {formatPrice(totals.commissionTaken, currency)},
          leaving <span className="font-bold text-[var(--foreground)]">{formatPrice(totals.netPayout, currency)}</span>{" "}
          for your shop. {formatPrice(totals.inFlight, currency, { showDecimals: false })} worth of
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
