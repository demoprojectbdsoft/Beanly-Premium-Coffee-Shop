"use client";

import React from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  CreditCard,
  CheckCircle2,
  Activity,
  ArrowRight,
  Layers,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

import { StatCardItem, AdminKPIs, RecentOrder } from "@/types/adminDashboard";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import { useSiteSettings } from "@/context/SiteSettingsContext";

/**
 * The morning-page view of the store: how many orders, how much money, how
 * healthy the flow is and what arrived a moment ago. The charts, the product
 * rankings and the report exports live on the analytics desk, so nothing here
 * has to be read as a trend.
 */
interface OverviewClientProps {
  stats: StatCardItem[];
  kpis: AdminKPIs;
  recentOrders: RecentOrder[];
}

const ICON_MAP: Record<string, LucideIcon> = {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  Package,
  CreditCard,
};

export default function OverviewClient({ stats, kpis, recentOrders }: OverviewClientProps) {
  const { currencySymbol } = useSiteSettings();

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
            Today&apos;s counts, the health of the store and the orders that just came in.
          </p>
        </div>

        <Link
          href="/dashboard/admin/analytics"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-xs font-bold shadow-xs hover:opacity-95 transition-all self-start sm:self-auto"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Open analytics</span>
        </Link>
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
