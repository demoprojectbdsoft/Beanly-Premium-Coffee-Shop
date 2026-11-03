"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Package,
  CreditCard,
  Truck,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  FileText,
  Activity,
  ArrowRight,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "react-toastify";

import {
  StatCardItem,
  RevenueDataPoint,
  CategoryDataPoint,
  OrderStatusDataPoint,
  PaymentMethodDataPoint,
  TopProductItem,
  AdminKPIs,
  RecentOrder,
  ProfitDataPoint,
  TopSellingByPeriod,
  TopSellingPeriodItem,
} from "@/types/adminDashboard";
import { exportAdminOverviewCsv, exportTopSellingCsv } from "@/lib/csvExport";
import { downloadAdminOverviewPdf } from "@/lib/dashboardPdf";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import { useSiteSettings } from "@/context/SiteSettingsContext";

interface OverviewClientProps {
  stats: StatCardItem[];
  revenueData: RevenueDataPoint[];
  categoryData: CategoryDataPoint[];
  orderStatusData: OrderStatusDataPoint[];
  paymentMethodData: PaymentMethodDataPoint[];
  topProducts: TopProductItem[];
  recentOrders: RecentOrder[];
  kpis: AdminKPIs;
  dailyProfitData: ProfitDataPoint[];
  weeklyProfitData: ProfitDataPoint[];
  monthlyProfitData: ProfitDataPoint[];
  yearlyProfitData: ProfitDataPoint[];
  topSellingByPeriod: TopSellingByPeriod;
}

const ICON_MAP: Record<string, any> = {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  Package,
  CreditCard,
};

export default function OverviewClient({
  stats,
  revenueData,
  categoryData,
  orderStatusData,
  paymentMethodData,
  topProducts,
  recentOrders,
  kpis,
  dailyProfitData,
  weeklyProfitData,
  monthlyProfitData,
  yearlyProfitData,
  topSellingByPeriod,
}: OverviewClientProps) {
  const { settings, currencySymbol, formatPrice } = useSiteSettings();
  const [revenueMetric, setRevenueMetric] = useState<"both" | "revenue" | "orders">("both");
  const [profitTimeframe, setProfitTimeframe] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [sellingPeriod, setSellingPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [sellingMetric, setSellingMetric] = useState<"units" | "earnings">("units");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const profitChartData = {
    daily: dailyProfitData,
    weekly: weeklyProfitData,
    monthly: monthlyProfitData,
    yearly: yearlyProfitData,
  }[profitTimeframe];

  // One payload feeds both the CSV and the PDF, so the reports can never disagree.
  const overviewReport = {
    stats,
    kpis,
    dailyProfitData,
    weeklyProfitData,
    monthlyProfitData,
    yearlyProfitData,
    revenueData,
    categoryData,
    orderStatusData,
    paymentMethodData,
    topProducts,
    recentOrders,
  };

  const exportOptions = { siteName: settings.siteName, currency: settings.currency };

  /** Writes every table to a clean CSV file. */
  const handleExportAnalytics = () => {
    try {
      toast.info("Generating store performance, profit & sales CSV report...");
      exportAdminOverviewCsv(overviewReport, exportOptions);
      toast.success("Admin Overview CSV report exported successfully!");
    } catch (error) {
      console.error("Failed to export admin overview CSV:", error);
      toast.error("Failed to export CSV report. Please try again.");
    }
  };

  /** The same numbers, drawn as charts, in one PDF. */
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    toast.info("Building the PDF report with charts...");
    try {
      await downloadAdminOverviewPdf(overviewReport, exportOptions);
      toast.success("PDF report downloaded!");
    } catch (error) {
      console.error("Failed to export admin overview PDF:", error);
      toast.error("Failed to build the PDF report. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const totalCategoryItems = categoryData.reduce((acc, c) => acc + (c.count || 0), 0);
  const totalPaymentAmount = paymentMethodData.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Real-Time Data
            </span>
            <span className="text-xs text-[var(--foreground-muted)]">• Updated Just Now</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Admin{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              Overview
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Real-time store performance, sales velocity, catalog distribution &amp; revenue pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-color)] text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            <span>{isExportingPdf ? "Building PDF..." : "Export PDF"}</span>
          </button>
          <button
            onClick={handleExportAnalytics}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-xs font-bold shadow-xs hover:opacity-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── Metric Stat Cards (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => {
          const IconComponent = ICON_MAP[stat.iconName] || DollarSign;
          return (
            <div
              key={idx}
              className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[var(--brand-flat)]/10 via-[var(--brand-flat)]/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--foreground-muted)]">
                  {stat.title}
                </span>
                <div className="p-2.5 rounded-xl bg-[var(--brand-flat)]/10 text-[var(--brand-flat)] border border-[var(--brand-flat)]/20 group-hover:bg-brand-gradient group-hover:text-[var(--on-grad-text)] group-hover:border-transparent transition-all shadow-2xs">
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl lg:text-3xl font-black text-[var(--foreground)] tracking-tight">
                  {stat.value}
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span
                    className={`inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded-md ${
                      stat.isPositive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {stat.isPositive ? (
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                    )}
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── KPI Highlight Banner ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--brand-flat)]/10 text-[var(--brand-flat)]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground-muted)]">Avg. Order Value</p>
            <p className="text-sm font-extrabold text-[var(--foreground)]">{currencySymbol}{kpis.avgOrderValue.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground-muted)]">Fulfillment Success</p>
            <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{kpis.deliverySuccessRate}%</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--brand-flat)]/10 text-[var(--brand-flat)]">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground-muted)]">Active Catalog</p>
            <p className="text-sm font-extrabold text-[var(--foreground)]">{kpis.totalProducts} Products</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-[var(--foreground-muted)]">Transactions Logged</p>
            <p className="text-sm font-extrabold text-[var(--foreground)]">{kpis.totalTransactions} Events</p>
          </div>
        </div>
      </div>

      {/* ── Profit & Loss Analytics Chart ── */}
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Profit &amp; Loss Analytics
              </h3>
            </div>
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              Revenue vs. cost vs. net profit breakdown by period
              {/*
                The per-period lines are product margins, so they cannot see the
                riders: a delivery fee belongs to the job, not to any line in the
                box. It is counted once, in the total, and the payout record
                behind it is its own page.
              */}
              {kpis.riderFeesPaid > 0 && (
                <>· rider fees come off the total, <Link href="/dashboard/admin/payouts" className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">see the payout record</Link></>
              )}
            </p>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-[var(--surface-alt)] p-1 rounded-xl text-xs self-start sm:self-auto">
            {(["daily", "weekly", "monthly", "yearly"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setProfitTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                  profitTimeframe === tf
                    ? "bg-[var(--surface-elevated)] text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Total Revenue</p>
            <p className="text-lg font-black text-[var(--foreground)] mt-0.5">
              ${kpis.totalProfit != null
                ? (profitChartData?.reduce((s, d) => s + d.revenue, 0) ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : "0.00"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Total Cost</p>
            <p className="text-lg font-black text-[var(--foreground)] mt-0.5">
              ${(profitChartData?.reduce((s, d) => s + d.cost, 0) ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          {/*
            What the parcels cost to move. The number arrives from the payout
            ledger rather than from these tiles, so it is the one line here a
            store cannot re-derive from the chart above it.
          */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Rider Fees Paid
            </p>
            <p className="text-lg font-black text-[var(--foreground)] mt-0.5">
              {currencySymbol}
              {kpis.riderFeesPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
              {kpis.riderFeesPaid > 0
                ? `${currencySymbol}${kpis.grossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} before it was taken off`
                : "No delivered job has paid a rider yet"}
            </p>
          </div>
          <div className={`p-3 rounded-xl border ${
            kpis.totalProfit >= 0
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40"
              : "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40"
          }`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${kpis.totalProfit >= 0 ? "text-emerald-500" : "text-amber-500"}`}>
              {kpis.totalProfit >= 0 ? "Net Profit" : "Net Loss"}
            </p>
            <p className="text-lg font-black text-[var(--foreground)] mt-0.5">
              ${kpis.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="ml-1.5 text-xs font-semibold text-[var(--foreground-muted)]">({kpis.profitMargin}%)</span>
            </p>
          </div>
        </div>

        {/* ── Line Chart: Sell Price vs Invest Price vs Profit ── */}
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={profitChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                {/* Sell Price (Revenue) gradient */}
                <linearGradient id="sellAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--primary-hover)" stopOpacity={0.0} />
                </linearGradient>
                {/* Invest Price (Cost) gradient */}
                <linearGradient id="investAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                </linearGradient>
                {/* Net Profit gradient */}
                <linearGradient id="profitAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
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
                tickFormatter={(v) => v >= 1000 ? `${currencySymbol}${(v / 1000).toFixed(1)}k` : `${currencySymbol}${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-elevated)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px",
                  color: "var(--foreground)",
                  fontSize: "12px",
                  boxShadow: "0 20px 40px -10px rgba(0,0,0,0.4)",
                }}
                formatter={(value: any, name: any) => [
                  `${currencySymbol}${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  String(name) === "revenue"
                    ? "💰 Sell Price (Revenue)"
                    : String(name) === "cost"
                    ? "🏷️ Invest Price (Cost)"
                    : "📈 Net Profit",
                ]}
                labelStyle={{ color: "#94a3b8", fontWeight: 600, marginBottom: 4 }}
              />
              <Legend
                formatter={(value) =>
                  value === "revenue"
                    ? "Sell Price (Revenue)"
                    : value === "cost"
                    ? "Invest Price (Cost)"
                    : "Net Profit"
                }
                wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              />
              {/* Sell Price line — gradient primary */}
              <Line
                type="monotone"
                dataKey="revenue"
                name="revenue"
                stroke="var(--primary)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "var(--primary-hover)", strokeWidth: 2, stroke: "#fff" }}
              />
              {/* Invest Price line — red, dashed */}
              <Line
                type="monotone"
                dataKey="cost"
                name="cost"
                stroke="#ef4444"
                strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#ef4444", strokeWidth: 2, stroke: "#fff" }}
              />
              {/* Net Profit line — emerald, dotted */}
              <Line
                type="monotone"
                dataKey="profit"
                name="profit"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend key */}
        <div className="flex flex-wrap items-center gap-5 text-xs pt-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-primary rounded" />
            <span className="font-semibold text-[var(--foreground-muted)]">Sell Price (Revenue)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-rose-500 rounded" style={{ borderTop: "2px dashed #ef4444", background: "none" }} />
            <span className="font-semibold text-[var(--foreground-muted)]">Invest Price (Cost)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-emerald-500 rounded" />
            <span className="font-semibold text-[var(--foreground-muted)]">Net Profit</span>
          </div>
          <span className="ml-auto text-[10px] text-[var(--foreground-muted)]">
            * Products without an invest price contribute $0 cost
          </span>
        </div>
      </div>

      {/* ── Charts Grid Row 1: Graph 1 (Revenue Velocity) & Graph 2 (Category Share) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRAPH 1: Monthly Revenue Velocity & Order Volume (Area Chart) */}
        <div className="lg:col-span-2 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Revenue Analytics &amp; Sales Velocity
                </h3>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                Monthly gross revenue trend ($ USD) and order throughput
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[var(--surface-alt)] p-1 rounded-lg text-xs self-start sm:self-auto">
              <button
                onClick={() => setRevenueMetric("both")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  revenueMetric === "both" ? "bg-[var(--surface-elevated)] text-primary shadow-xs" : "text-[var(--foreground-muted)]"
                }`}
              >
                All Metrics
              </button>
              <button
                onClick={() => setRevenueMetric("revenue")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  revenueMetric === "revenue" ? "bg-[var(--surface-elevated)] text-primary shadow-xs" : "text-[var(--foreground-muted)]"
                }`}
              >
                Revenue Only
              </button>
              <button
                onClick={() => setRevenueMetric("orders")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  revenueMetric === "orders" ? "bg-[var(--surface-elevated)] text-primary shadow-xs" : "text-[var(--foreground-muted)]"
                }`}
              >
                Orders
              </button>
            </div>
          </div>

          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminRevenueGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="var(--primary-hover)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="adminOrdersGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickFormatter={(val) => (val >= 1000 ? `${currencySymbol}${val / 1000}k` : `${currencySymbol}${val}`)}
                />
                {revenueMetric === "both" && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    tickFormatter={(val) => `${val} ord`}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-elevated)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "14px",
                    color: "var(--foreground)",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                  }}
                  formatter={(value: any, name: any) => [
                    String(name) === "revenue"
                      ? `${currencySymbol}${Number(value ?? 0).toLocaleString()}`
                      : `${Number(value ?? 0)} Orders`,
                    String(name) === "revenue" ? `Revenue (${currencySymbol})` : "Orders Processed",
                  ]}
                />
                {(revenueMetric === "both" || revenueMetric === "revenue") && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#adminRevenueGlow)"
                  />
                )}
                {(revenueMetric === "both" || revenueMetric === "orders") && (
                  <Area
                    yAxisId={revenueMetric === "both" ? "right" : "left"}
                    type="monotone"
                    dataKey="orders"
                    name="orders"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    strokeDasharray={revenueMetric === "both" ? "4 4" : undefined}
                    fillOpacity={1}
                    fill="url(#adminOrdersGlow)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-[var(--foreground-muted)] font-semibold">Gross Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary opacity-50" />
                <span className="text-[var(--foreground-muted)] font-semibold">Order Count</span>
              </div>
            </div>
            <Link
              href="/dashboard/admin/orders"
              className="font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* GRAPH 2: Category Share & Catalog Distribution (Donut Chart) */}
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <PieIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Category Share
                </h3>
              </div>
            </div>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              Distribution of products &amp; sales across departments
            </p>
          </div>

          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={82}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cat-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-elevated)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "var(--foreground)",
                    fontSize: "12px",
                  }}
                  formatter={(val: ValueType | undefined) => [`${Number(val ?? 0)}%`, "Market Share"]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-[var(--foreground)]">
                {categoryData.length}
              </span>
              <span className="text-[10px] uppercase font-bold text-[var(--foreground-muted)] tracking-wider">Categories</span>
            </div>
          </div>

          <div className="space-y-2 text-xs max-h-40 overflow-y-auto pr-1">
            {categoryData.map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[var(--surface-alt)]">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-[var(--foreground)] font-medium truncate max-w-[140px]">
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {cat.count !== undefined && (
                    <span className="text-[11px] text-[var(--foreground-muted)]">({cat.count} prods)</span>
                  )}
                  <span className="font-bold text-[var(--foreground)]">
                    {cat.value}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts Grid Row 2: Graph 3 (Fulfillment Pipeline) & Graph 4 (Payment Gateways) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GRAPH 3: Order Fulfillment Pipeline (Bar Chart) */}
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Order Fulfillment Pipeline
                </h3>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                Active workflow breakdown across all order statuses
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-800/40">
              {orderStatusData.find((s) => s.name === "Delivered")?.count || 0} Delivered
            </span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderStatusData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#64748b", fontSize: 12, fontWeight: 600 }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-elevated)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "var(--foreground)",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, _name: any, item: any) => [
                    `${Number(val ?? 0)}% (${item?.payload?.count ?? 0} orders - ${currencySymbol}${Number(item?.payload?.amount ?? 0).toLocaleString()})`,
                    "Fulfillment Share",
                  ]}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`status-bar-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-3 border-t border-[var(--border-color)] text-center text-xs">
            {orderStatusData.map((st, i) => (
              <div key={i} className="p-2 rounded-xl bg-[var(--surface-alt)]">
                <p className="text-[10px] text-[var(--foreground-muted)] uppercase font-semibold">{st.name}</p>
                <p className="font-extrabold text-[var(--foreground)] mt-0.5">{st.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* GRAPH 4: Payment Gateways & Revenue Flow (Donut / Bar) */}
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Payment Channels &amp; Gateway Flow
                </h3>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mt-1">
                bKash, Nagad, Rocket, COD &amp; Card settlements
              </p>
            </div>
            <Link
              href="/dashboard/admin/transactions"
              className="text-xs font-bold text-primary hover:underline"
            >
              Transactions
            </Link>
          </div>

          <div className="h-56 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`pm-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-elevated)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "var(--foreground)",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, _n: any, item: any) => [
                    `${currencySymbol}${Number(item?.payload?.amount ?? 0).toLocaleString()} (${Number(val ?? 0)}% - ${item?.payload?.count ?? 0} payments)`,
                    "Volume",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-[var(--foreground)]">
                {currencySymbol}{(totalPaymentAmount >= 1000 ? `${(totalPaymentAmount / 1000).toFixed(1)}k` : totalPaymentAmount.toFixed(0))}
              </span>
              <span className="text-[10px] text-[var(--foreground-muted)] font-semibold uppercase">Settled</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {paymentMethodData.map((pm, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-[var(--surface-alt)]">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pm.color }} />
                <div className="truncate">
                  <p className="font-bold text-[var(--foreground)] truncate">{pm.name}</p>
                  <p className="text-[10px] text-[var(--foreground-muted)]">{pm.value}% • {currencySymbol}{pm.amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top Performing Products Matrix (Graph 5 / Cards) ── */}
      {topProducts.length > 0 && (
        <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Top Performing &amp; Trending Products
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Best-selling items ranked by live volume &amp; revenue contribution
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/admin/products"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>Manage Products</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {topProducts.map((p, idx) => (
              <div
                key={p.id || idx}
                className="group p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] hover:border-primary/30 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative w-full h-28 mb-3 bg-[var(--surface-elevated)] rounded-lg overflow-hidden flex items-center justify-center p-2">
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        className="object-contain p-2 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Package className="w-10 h-10 text-[var(--foreground-muted)]" />
                    )}
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-brand-gradient text-[var(--on-grad-text)] shadow-xs">
                      #{idx + 1}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                    {p.category}
                  </p>
                  <h4 className="text-xs font-bold text-[var(--foreground)] line-clamp-2 mt-0.5">
                    {p.title}
                  </h4>
                </div>

                <div className="mt-3 pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--foreground-muted)]">Sold</span>
                    <p className="font-black text-[var(--foreground)]">{p.unitsSold} units</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[var(--foreground-muted)]">Revenue</span>
                    <p className="font-black text-emerald-600 dark:text-emerald-400">{currencySymbol}{p.revenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Most Selling & Most Earning Products Table ── */}
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Most Selling &amp; Most Earning Products
              </h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                Top 10 products ranked by sales volume or earnings per period
              </p>
            </div>
          </div>

          {/* Export CSV */}
          <button
            id="btn-export-top-selling-csv"
            onClick={() => {
              try {
                toast.info("Generating top selling products CSV...");
                exportTopSellingCsv({
                  period: sellingPeriod,
                  metric: sellingMetric,
                  daily: topSellingByPeriod.daily,
                  weekly: topSellingByPeriod.weekly,
                  monthly: topSellingByPeriod.monthly,
                  yearly: topSellingByPeriod.yearly,
                }, exportOptions);
                toast.success("CSV exported successfully!");
              } catch {
                toast.error("Failed to export CSV.");
              }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Period + Metric Tabs */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Period tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-alt)] w-fit">
            {(["daily", "weekly", "monthly", "yearly"] as const).map((p) => (
              <button
                key={p}
                id={`btn-top-selling-period-${p}`}
                onClick={() => setSellingPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer capitalize ${
                  sellingPeriod === p
                    ? "bg-[var(--surface-elevated)] text-primary shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] dark:hover:text-[var(--foreground-muted)]"
                }`}
              >
                {p === "daily" ? "Day" : p === "weekly" ? "Week" : p === "monthly" ? "Month" : "Year"}
              </button>
            ))}
          </div>

          {/* Metric tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-alt)] w-fit">
            {(["units", "earnings"] as const).map((m) => (
              <button
                key={m}
                id={`btn-top-selling-metric-${m}`}
                onClick={() => setSellingMetric(m)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  sellingMetric === m
                    ? "bg-[var(--surface-elevated)] text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] dark:hover:text-[var(--foreground-muted)]"
                }`}
              >
                {m === "units" ? "Most Sold" : "Most Earned"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {(() => {
          const raw = topSellingByPeriod[sellingPeriod];
          const items: TopSellingPeriodItem[] =
            sellingMetric === "units"
              ? [...raw].sort((a, b) => b.unitsSold - a.unitsSold)
              : [...raw].sort((a, b) => b.revenue - a.revenue);

          return (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--foreground-muted)] uppercase tracking-wider font-semibold">
                    <th className="pb-3 pl-2 w-8">#</th>
                    <th className="pb-3">Product</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3 text-right">Price</th>
                    <th className="pb-3 text-right">Units Sold</th>
                    <th className="pb-3 text-right">Revenue</th>
                    <th className="pb-3 text-right">Cost</th>
                    <th className="pb-3 text-right pr-2">Profit / Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-xs text-[var(--foreground-muted)]">
                        No order data for this period yet.
                      </td>
                    </tr>
                  ) : (
                    items.map((item, idx) => {
                      const profitMarginPct =
                        item.revenue > 0
                          ? Math.round((item.profit / item.revenue) * 100)
                          : null;
                      const isProfit = item.profit >= 0;

                      return (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-[var(--surface-alt)] transition-colors group"
                        >
                          {/* Rank */}
                          <td className="py-3.5 pl-2">
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black ${
                                idx === 0
                                  ? "bg-amber-400/20 text-amber-600 dark:text-amber-400"
                                  : idx === 1
                                  ? "bg-[var(--surface-alt)]/30 text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)]"
                                  : idx === 2
                                  ? "bg-orange-300/20 text-orange-600 dark:text-orange-400"
                                  : "bg-[var(--surface-alt)] text-[var(--foreground-muted)]"
                              }`}
                            >
                              {idx + 1}
                            </span>
                          </td>

                          {/* Product */}
                          <td className="py-3.5">
                            <div className="flex items-center gap-2.5">
                              {item.image ? (
                                <div className="relative w-8 h-8 rounded-lg overflow-hidden bg-[var(--surface-elevated)] border border-[var(--border-color)] shrink-0">
                                  <Image
                                    src={item.image}
                                    alt={item.title}
                                    fill
                                    className="object-contain p-0.5"
                                    unoptimized
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-[var(--surface-alt)] flex items-center justify-center shrink-0">
                                  <Package className="w-4 h-4 text-[var(--foreground-muted)]" />
                                </div>
                              )}
                              <span className="font-semibold text-[var(--foreground)] max-w-[180px] truncate">
                                {item.title}
                              </span>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                              {item.category}
                            </span>
                          </td>

                          {/* Price */}
                          <td className="py-3.5 text-right text-[var(--foreground)] font-mono">
                            {formatPrice(Number(item.price))}
                          </td>

                          {/* Units Sold */}
                          <td className="py-3.5 text-right">
                            <span className="font-black text-[var(--foreground)]">
                              {item.unitsSold.toLocaleString()}
                            </span>
                            <span className="text-[var(--foreground-muted)] ml-1">units</span>
                          </td>

                          {/* Revenue */}
                          <td className="py-3.5 text-right font-bold text-[var(--foreground)] font-mono">
                            {currencySymbol}{Number(item.revenue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Cost */}
                          <td className="py-3.5 text-right text-[var(--foreground-muted)] font-mono">
                            {item.cost > 0
                              ? `${currencySymbol}${Number(item.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : <span className="text-[var(--foreground-muted)]">—</span>
                            }
                          </td>

                          {/* Profit / Loss */}
                          <td className="py-3.5 pr-2 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span
                                className={`font-black font-mono ${
                                  isProfit
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {isProfit ? "+" : "-"}{currencySymbol}{Math.abs(item.profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              {profitMarginPct !== null && (
                                <span
                                  className={`text-[10px] font-semibold ${
                                    isProfit ? "text-emerald-500" : "text-rose-500"
                                  }`}
                                >
                                  {profitMarginPct}% margin
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* ── Recent Orders Table ── */}
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Recent Store Orders
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Live orders received across your customer accounts
            </p>
          </div>
          <Link
            href="/dashboard/admin/orders"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All ({recentOrders.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--foreground-muted)] uppercase tracking-wider font-semibold">
                <th className="pb-3 pl-2">Order ID</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Item Details</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-[var(--foreground-muted)]">
                    No orders found in database.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order, i) => (
                  <tr
                    key={order.id || i}
                    className="hover:bg-[var(--surface-alt)] transition-colors"
                  >
                    <td className="py-3.5 pl-2 font-bold text-primary font-mono">
                      {order.id}
                    </td>
                    <td className="py-3.5">
                      <p className="font-semibold text-[var(--foreground)]">
                        {order.customer}
                      </p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">{order.email}</p>
                    </td>
                    <td className="py-3.5 text-[var(--foreground-muted)] max-w-[220px] truncate">
                      {order.product}
                    </td>
                    <td className="py-3.5 font-bold text-[var(--foreground)]">
                      {order.amount}
                    </td>
                    <td className="py-3.5">
                      <OrderStatusBadge status={order.status} size="sm" showIcon={false} />
                    </td>
                    <td className="py-3.5 pr-2 text-right text-[var(--foreground-muted)]">
                      {order.date}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
