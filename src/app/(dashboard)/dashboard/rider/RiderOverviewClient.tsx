"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, Chip } from "@heroui/react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  FileText,
  Inbox,
  Navigation,
  PackageCheck,
  PieChart as PieIcon,
  Timer,
  Wallet,
  XCircle,
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
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { exportRiderOverviewCsv } from "@/lib/csvExport";
import { downloadRiderOverviewPdf } from "@/lib/dashboardPdf";
import {
  DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_STYLES,
  expiredDeliveryIds,
  formatDayLabel,
  formatDistance,
  formatMinutes,
  formatMoment,
} from "@/lib/rider";
import DeliveryActions from "@/components/dashboard/rider/DeliveryActions";
import type {
  DeliveryRecord,
  DeliveryStatus,
  DeliveryStatusCounts,
  RiderSeriesPoint,
  RiderStatCardData,
  RiderStats,
} from "@/types/delivery";

const ICON_MAP: Record<string, typeof PackageCheck> = {
  PackageCheck,
  CheckCircle2,
  Navigation,
  Inbox,
  XCircle,
  Wallet,
  CalendarDays,
  Timer,
};

const STATUS_COLORS: Record<DeliveryStatus, string> = {
  assigned: "#f59e0b",
  accepted: "#0ea5e9",
  picked_up: "#6366f1",
  out_for_delivery: "#2563eb",
  delivered: "#10b981",
  cancelled: "#ef4444",
  declined: "#94a3b8",
};

const RANGE_CHOICES = [7, 14, 30, 90];

interface RiderOverviewClientProps {
  riderName: string;
  stats: RiderStats;
  statusCounts: DeliveryStatusCounts;
  series: RiderSeriesPoint[];
  recent: DeliveryRecord[];
  range: { days: number; from: string; to: string };
  cards: RiderStatCardData[];
  days: number;
}

export default function RiderOverviewClient({
  riderName,
  stats,
  statusCounts,
  series,
  recent,
  range,
  cards,
  days,
}: RiderOverviewClientProps) {
  const { settings, currencySymbol, formatPrice } = useSiteSettings();
  const router = useRouter();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // The answer windows that have already closed. Resolved after mount so the
  // render itself stays pure — the clock only matters once we are on the client,
  // and reading it during render would let the server and the browser disagree
  // about which offers are still open.
  const [expiredIds, setExpiredIds] = useState<string[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpiredIds(expiredDeliveryIds(recent));
  }, [recent]);

  const chartData = useMemo(
    () => series.map((point) => ({ ...point, label: formatDayLabel(point.date) })),
    [series]
  );

  const pipeline = useMemo(
    () =>
      (Object.entries(statusCounts) as Array<[DeliveryStatus, number]>)
        .filter(([, count]) => count > 0)
        .map(([status, count]) => ({
          name: DELIVERY_STATUS_LABELS[status],
          value: count,
          color: STATUS_COLORS[status],
        })),
    [statusCounts]
  );

  // One payload feeds both exports, so the CSV and the PDF can never disagree.
  const report = {
    riderName,
    rangeDays: range.days,
    stats: cards.map((card) => ({
      title: card.title,
      value: card.value,
      change: card.change,
    })),
    series,
    statusCounts,
    recent: recent.map((delivery) => ({
      orderNumber: delivery.orderNumber,
      customerName: delivery.customerName,
      city: delivery.city,
      fee: delivery.fee,
      status: delivery.status,
      updatedAt: formatMoment(delivery.updatedAt),
    })),
  };

  const exportOptions = { siteName: settings.siteName, currency: settings.currency };

  const handleExportCsv = () => {
    try {
      toast.info("Generating your rider report...");
      exportRiderOverviewCsv(report, exportOptions);
      toast.success("Rider overview CSV exported successfully!");
    } catch (error) {
      console.error("Failed to export rider overview CSV:", error);
      toast.error("Failed to export CSV. Please try again.");
    }
  };

  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    toast.info("Building your PDF report with charts...");
    try {
      await downloadRiderOverviewPdf(report, exportOptions);
      toast.success("PDF report downloaded!");
    } catch (error) {
      console.error("Failed to export rider overview PDF:", error);
      toast.error("Failed to build the PDF report. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live Delivery Desk
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {stats.active} on the road
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Rider <span className="text-gradient-primary">Overview</span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Welcome back, <span className="font-bold text-[var(--foreground)]">{riderName}</span>. Here is
            your real delivery performance, {formatDayLabel(range.from)} – {formatDayLabel(range.to)}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--surface-alt)] p-1 rounded-lg text-xs">
            {RANGE_CHOICES.map((choice) => (
              <Link
                key={choice}
                href={`/dashboard/rider?days=${choice}`}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  choice === days
                    ? "bg-[var(--surface)] text-primary shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {choice}d
              </Link>
            ))}
          </div>

          <Button
            onClick={handleExportPdf}
            isDisabled={isExportingPdf}
            className="bg-[var(--surface-alt)] text-[var(--foreground)] text-xs font-bold h-10 px-4 rounded-xl flex items-center gap-2 border border-[var(--border-color)] cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>{isExportingPdf ? "Building PDF..." : "Export PDF"}</span>
          </Button>

          <Button
            onClick={handleExportCsv}
            className="bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 h-10 px-4 rounded-xl flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* ── Eight metric cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = ICON_MAP[card.iconName] || PackageCheck;
          return (
            <Card
              key={card.title}
              className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-4 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--foreground-muted)]">{card.title}</span>
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl font-black text-[var(--foreground)] tracking-tight">
                  {card.value}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className={`inline-flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-md ${
                      card.isPositive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {card.isPositive ? (
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 mr-0.5" />
                    )}
                    {card.change}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
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
                Earnings &amp; Delivered Jobs
              </h3>
            </div>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              Daily fees ({currencySymbol} {settings.currency}) against jobs handed over
            </p>
          </div>

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
                  yAxisId="money"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  tickFormatter={(value) => `${currencySymbol}${Math.round(Number(value))}`}
                />
                <YAxis
                  yAxisId="jobs"
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
                    String(name).toLowerCase().includes("earning")
                      ? `${currencySymbol}${Number(value ?? 0).toFixed(2)}`
                      : `${Number(value ?? 0)} jobs`,
                    String(name),
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  yAxisId="money"
                  dataKey="earnings"
                  name="Earnings"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={26}
                />
                <Line
                  yAxisId="jobs"
                  type="monotone"
                  dataKey="delivered"
                  name="Delivered"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 2.5 }}
                  activeDot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <PieIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Delivery Pipeline</h3>
            </div>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              Every job you have held, by stage
            </p>
          </div>

          {pipeline.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-center gap-2">
              <PackageCheck className="w-8 h-8 text-[var(--foreground-muted)]" />
              <p className="text-xs text-[var(--foreground-muted)]">
                No deliveries yet. Assigned jobs will appear here.
              </p>
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pipeline}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {pipeline.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
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
                      `${Number(value ?? 0)} jobs`,
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

      {/* ── Recent deliveries ── */}
      <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl shadow-xs overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-6 pb-4">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">Recent Deliveries</h3>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              The last {recent.length} job{recent.length === 1 ? "" : "s"} that moved
            </p>
          </div>
          <Link
            href="/dashboard/rider/deliveries"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
          >
            View all deliveries
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="px-6 pb-8 pt-2 flex flex-col items-center text-center gap-2">
            <Inbox className="w-8 h-8 text-[var(--foreground-muted)]" />
            <p className="text-xs text-[var(--foreground-muted)]">
              Nothing here yet. When the store assigns you a delivery it lands in your requests.
            </p>
            <Link
              href="/dashboard/rider/requests"
              className="text-xs font-bold text-primary hover:underline"
            >
              Open delivery requests
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-alt)] text-[var(--foreground-muted)] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3 font-bold">Order</th>
                  <th className="px-4 py-3 font-bold">Customer</th>
                  <th className="px-4 py-3 font-bold">Drop-off</th>
                  <th className="px-4 py-3 font-bold">Fee</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Assigned by</th>
                  <th className="px-4 py-3 font-bold">Last update</th>
                  <th className="px-6 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {recent.map((delivery) => {
                  const distance = formatDistance(delivery.distanceKm);
                  return (
                    <tr key={delivery._id} className="hover:bg-[var(--surface-alt)]/60 transition-colors">
                      <td className="px-6 py-3.5 font-bold text-[var(--foreground)] whitespace-nowrap">
                        {delivery.orderNumber}
                        <span className="block text-[10px] font-medium text-[var(--foreground-muted)]">
                          {delivery.items} item{delivery.items === 1 ? "" : "s"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[var(--foreground)]">
                        <span className="font-semibold">{delivery.customerName || "Customer"}</span>
                        <span className="block text-[10px] text-[var(--foreground-muted)]">
                          {delivery.customerPhone || "No phone"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[var(--foreground-muted)]">
                        {delivery.city || "—"}
                        {distance && (
                          <span className="block text-[10px] font-semibold text-[var(--foreground)]">
                            {distance}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-[var(--foreground)] whitespace-nowrap">
                        {formatPrice(delivery.fee)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Chip
                          size="sm"
                          className={`border text-[10px] font-bold ${DELIVERY_STATUS_STYLES[delivery.status]}`}
                        >
                          {DELIVERY_STATUS_LABELS[delivery.status]}
                        </Chip>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="block font-semibold text-[var(--foreground)]">
                          {delivery.assignedBy?.name || "The store"}
                        </span>
                        <span className="block text-[10px] text-[var(--foreground-muted)]">
                          {formatMoment(delivery.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-[var(--foreground-muted)] whitespace-nowrap">
                        {formatMoment(delivery.updatedAt)}
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center justify-end">
                          <DeliveryActions
                            delivery={delivery}
                            expired={expiredIds.includes(delivery._id)}
                            compact
                            onChanged={() => router.refresh()}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Clock note: the average is what customers feel. ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Success rate
          </p>
          <p className="text-xl font-black text-[var(--foreground)] mt-1">{stats.successRate}%</p>
          <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
            {stats.completed} delivered of {stats.completed + stats.cancelled} finished
          </p>
        </Card>
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Average hand-over
          </p>
          <p className="text-xl font-black text-[var(--foreground)] mt-1">
            {formatMinutes(stats.avgDeliveryMinutes)}
          </p>
          <p className="text-[11px] text-[var(--foreground-muted)] mt-1">From accepting the job</p>
        </Card>
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
            Earned in this range
          </p>
          <p className="text-xl font-black text-[var(--foreground)] mt-1">
            {formatPrice(stats.earningsInWindow)}
          </p>
          <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
            Last {range.days} days of delivered fees
          </p>
        </Card>
      </div>
    </div>
  );
}
