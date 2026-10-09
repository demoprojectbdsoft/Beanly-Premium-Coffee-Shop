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
} from "@/types/adminDashboard";
import { exportAdminOverviewCsv } from "@/lib/csvExport";

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
}

const ICON_MAP: Record<string, any> = {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  Package,
  CreditCard,
};

const TIMEFRAMES = ["Last 30 Days", "Last 6 Months", "This Year", "All Time"];

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
}: OverviewClientProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("This Year");
  const [revenueMetric, setRevenueMetric] = useState<"both" | "revenue" | "orders">("both");
  const [profitTimeframe, setProfitTimeframe] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");

  const profitChartData = {
    daily: dailyProfitData,
    weekly: weeklyProfitData,
    monthly: monthlyProfitData,
    yearly: yearlyProfitData,
  }[profitTimeframe];

  /**
   * Handles exporting all Admin Overview data:
   * - Key Stat Cards & KPIs
   * - Monthly Revenue & Order Volume (Graph 1)
   * - Category Share & Catalog Distribution (Graph 2)
   * - Order Fulfillment Pipeline (Graph 3)
   * - Payment Gateways & Revenue Flow (Graph 4)
   * - Top Performing Products Matrix
   * - Recent Store Orders Table
   * 
   * Formats into a clean, UTF-8 BOM enabled CSV file with robust escaping to prevent broken data.
   */
  const handleExportAnalytics = () => {
    try {
      toast.info("Generating store performance & sales CSV report...");
      
      // Execute the CSV export with all live data points and current timeframe
      exportAdminOverviewCsv({
        timeframe: selectedTimeframe,
        stats,
        kpis,
        revenueData,
        categoryData,
        orderStatusData,
        paymentMethodData,
        topProducts,
        recentOrders,
      });

      toast.success("Admin Overview CSV report exported successfully!");
    } catch (error) {
      console.error("Failed to export admin overview CSV:", error);
      toast.error("Failed to export CSV report. Please try again.");
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
            <span className="text-xs text-gray-400">• Updated Just Now</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Admin{" "}
            <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Overview
            </span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Real-time store performance, sales velocity, catalog distribution &amp; revenue pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100 dark:bg-gray-800 p-1 rounded-xl border border-slate-200 dark:border-gray-700 text-xs">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  selectedTimeframe === tf
                    ? "bg-white dark:bg-gray-900 text-sky-600 dark:text-sky-400 shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportAnalytics}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Analytics</span>
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
              className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sky-500/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  {stat.title}
                </span>
                <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50/50 to-indigo-50 dark:from-sky-950/30 dark:via-blue-950/20 dark:to-indigo-950/30 border border-sky-100 dark:border-sky-900/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Avg. Order Value</p>
            <p className="text-sm font-extrabold text-gray-900 dark:text-white">${kpis.avgOrderValue.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Fulfillment Success</p>
            <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">{kpis.deliverySuccessRate}%</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Active Catalog</p>
            <p className="text-sm font-extrabold text-gray-900 dark:text-white">{kpis.totalProducts} Products</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <CreditCard className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Transactions Logged</p>
            <p className="text-sm font-extrabold text-gray-900 dark:text-white">{kpis.totalTransactions} Events</p>
          </div>
        </div>
      </div>

      {/* ── Profit & Loss Analytics Chart ── */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Profit &amp; Loss Analytics
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Revenue vs. cost vs. net profit breakdown by period
            </p>
          </div>

          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-gray-800 p-1 rounded-xl text-xs self-start sm:self-auto">
            {(["daily", "weekly", "monthly", "yearly"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setProfitTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                  profitTimeframe === tf
                    ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500">Total Revenue</p>
            <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
              ${kpis.totalProfit != null
                ? (profitChartData?.reduce((s, d) => s + d.revenue, 0) ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : "0.00"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Total Cost</p>
            <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
              ${(profitChartData?.reduce((s, d) => s + d.cost, 0) ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
            <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
              ${kpis.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="ml-1.5 text-xs font-semibold text-gray-400">({kpis.profitMargin}%)</span>
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
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.22} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
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
                tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px",
                  color: "#fff",
                  fontSize: "12px",
                  boxShadow: "0 20px 40px -10px rgba(0,0,0,0.4)",
                }}
                formatter={(value: any, name: any) => [
                  `$${Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
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
              {/* Sell Price line — blue, thick */}
              <Line
                type="monotone"
                dataKey="revenue"
                name="revenue"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#0284c7", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#0284c7", strokeWidth: 2, stroke: "#fff" }}
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
            <div className="w-8 h-0.5 bg-sky-500 rounded" />
            <span className="font-semibold text-gray-600 dark:text-gray-300">Sell Price (Revenue)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-rose-500 rounded" style={{ borderTop: "2px dashed #ef4444", background: "none" }} />
            <span className="font-semibold text-gray-600 dark:text-gray-300">Invest Price (Cost)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-emerald-500 rounded" />
            <span className="font-semibold text-gray-600 dark:text-gray-300">Net Profit</span>
          </div>
          <span className="ml-auto text-[10px] text-gray-400">
            * Products without an invest price contribute $0 cost
          </span>
        </div>
      </div>

      {/* ── Charts Grid Row 1: Graph 1 (Revenue Velocity) & Graph 2 (Category Share) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRAPH 1: Monthly Revenue Velocity & Order Volume (Area Chart) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Revenue Analytics &amp; Sales Velocity
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Monthly gross revenue trend ($ USD) and order throughput
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-gray-800 p-1 rounded-lg text-xs self-start sm:self-auto">
              <button
                onClick={() => setRevenueMetric("both")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  revenueMetric === "both" ? "bg-white dark:bg-gray-900 text-sky-600 shadow-xs" : "text-gray-500"
                }`}
              >
                All Metrics
              </button>
              <button
                onClick={() => setRevenueMetric("revenue")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  revenueMetric === "revenue" ? "bg-white dark:bg-gray-900 text-sky-600 shadow-xs" : "text-gray-500"
                }`}
              >
                Revenue Only
              </button>
              <button
                onClick={() => setRevenueMetric("orders")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  revenueMetric === "orders" ? "bg-white dark:bg-gray-900 text-indigo-600 shadow-xs" : "text-gray-500"
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
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
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
                  tickFormatter={(val) => (val >= 1000 ? `$${val / 1000}k` : `$${val}`)}
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
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "14px",
                    color: "#fff",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                  }}
                  formatter={(value: any, name: any) => [
                    String(name) === "revenue"
                      ? `$${Number(value ?? 0).toLocaleString()}`
                      : `${Number(value ?? 0)} Orders`,
                    String(name) === "revenue" ? "Revenue ($)" : "Orders Processed",
                  ]}
                />
                {(revenueMetric === "both" || revenueMetric === "revenue") && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke="#0284c7"
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
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray={revenueMetric === "both" ? "4 4" : undefined}
                    fillOpacity={1}
                    fill="url(#adminOrdersGlow)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-gray-800 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500" />
                <span className="text-gray-600 dark:text-gray-300 font-semibold">Gross Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-gray-600 dark:text-gray-300 font-semibold">Order Count</span>
              </div>
            </div>
            <Link
              href="/dashboard/admin/orders"
              className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* GRAPH 2: Category Share & Catalog Distribution (Donut Chart) */}
        <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <PieIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Category Share
                </h3>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val: ValueType | undefined) => [`${Number(val ?? 0)}%`, "Market Share"]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                {categoryData.length}
              </span>
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Categories</span>
            </div>
          </div>

          <div className="space-y-2 text-xs max-h-40 overflow-y-auto pr-1">
            {categoryData.map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[140px]">
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {cat.count !== undefined && (
                    <span className="text-[11px] text-gray-400">({cat.count} prods)</span>
                  )}
                  <span className="font-bold text-gray-900 dark:text-white">
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
        <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Truck className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Order Fulfillment Pipeline
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, _name: any, item: any) => [
                    `${Number(val ?? 0)}% (${item?.payload?.count ?? 0} orders - $${Number(item?.payload?.amount ?? 0).toLocaleString()})`,
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

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-100 dark:border-gray-800 text-center text-xs">
            {orderStatusData.map((st, i) => (
              <div key={i} className="p-2 rounded-xl bg-slate-50 dark:bg-gray-800/50">
                <p className="text-[10px] text-gray-400 uppercase font-semibold">{st.name}</p>
                <p className="font-extrabold text-gray-900 dark:text-white mt-0.5">{st.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* GRAPH 4: Payment Gateways & Revenue Flow (Donut / Bar) */}
        <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Payment Channels &amp; Gateway Flow
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                bKash, Nagad, Rocket, COD &amp; Card settlements
              </p>
            </div>
            <Link
              href="/dashboard/admin/transactions"
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
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
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, _n: any, item: any) => [
                    `$${Number(item?.payload?.amount ?? 0).toLocaleString()} (${Number(val ?? 0)}% - ${item?.payload?.count ?? 0} payments)`,
                    "Volume",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-gray-900 dark:text-white">
                ${(totalPaymentAmount >= 1000 ? `${(totalPaymentAmount / 1000).toFixed(1)}k` : totalPaymentAmount.toFixed(0))}
              </span>
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Settled</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {paymentMethodData.map((pm, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-gray-800/40">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: pm.color }} />
                <div className="truncate">
                  <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{pm.name}</p>
                  <p className="text-[10px] text-gray-400">{pm.value}% • ${pm.amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Top Performing Products Matrix (Graph 5 / Cards) ── */}
      {topProducts.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Top Performing &amp; Trending Products
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Best-selling items ranked by live volume &amp; revenue contribution
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/admin/products"
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>Manage Products</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {topProducts.map((p, idx) => (
              <div
                key={p.id || idx}
                className="group p-4 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 hover:border-sky-500/30 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="relative w-full h-28 mb-3 bg-white dark:bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center p-2">
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        className="object-contain p-2 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Package className="w-10 h-10 text-slate-300 dark:text-gray-600" />
                    )}
                    <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-sky-600 text-white shadow-xs">
                      #{idx + 1}
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
                    {p.category}
                  </p>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white line-clamp-2 mt-0.5">
                    {p.title}
                  </h4>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-gray-700/60 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400">Sold</span>
                    <p className="font-black text-gray-900 dark:text-white">{p.unitsSold} units</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400">Revenue</span>
                    <p className="font-black text-emerald-600 dark:text-emerald-400">${p.revenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Orders Table ── */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Recent Store Orders
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Live orders received across your customer accounts
            </p>
          </div>
          <Link
            href="/dashboard/admin/orders"
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>View All ({recentOrders.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 uppercase tracking-wider font-semibold">
                <th className="pb-3 pl-2">Order ID</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Item Details</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 pr-2 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-gray-400">
                    No orders found in database.
                  </td>
                </tr>
              ) : (
                recentOrders.map((order, i) => (
                  <tr
                    key={order.id || i}
                    className="hover:bg-slate-50/70 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3.5 pl-2 font-bold text-sky-600 dark:text-sky-400 font-mono">
                      {order.id}
                    </td>
                    <td className="py-3.5">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        {order.customer}
                      </p>
                      <p className="text-[10px] text-gray-400">{order.email}</p>
                    </td>
                    <td className="py-3.5 text-gray-600 dark:text-gray-300 max-w-[220px] truncate">
                      {order.product}
                    </td>
                    <td className="py-3.5 font-bold text-gray-900 dark:text-white">
                      {order.amount}
                    </td>
                    <td className="py-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                          order.status === "Completed" || order.status === "Delivered"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40"
                            : order.status === "Processing" || order.status === "Shipped"
                            ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/40"
                            : order.status === "Pending"
                            ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3.5 pr-2 text-right text-gray-400">
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
