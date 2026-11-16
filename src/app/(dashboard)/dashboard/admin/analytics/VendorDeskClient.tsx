"use client";

import React from "react";
import Link from "next/link";
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
import { AlertTriangle, CreditCard, HandCoins, ShoppingBag, Store } from "lucide-react";
import type { VendorDeskReport } from "@/types/vendorDesk";
import { useSiteSettings } from "@/context/SiteSettingsContext";

/**
 * What the sellers bring in.
 *
 * The page already shows what customers spent. This section shows the other two
 * streams the marketplace lives on: the subscription a seller pays to keep the
 * shop open, and the commission taken out of every sale they make. Both are
 * drawn against the sales themselves, because a month where sales fall but
 * subscriptions hold is a different month from one where neither moved.
 */

interface VendorDeskClientProps {
  report: VendorDeskReport;
  months: number;
}

const MONTH_CHOICES = [3, 6, 12];

function money(value: number, symbol: string) {
  return `${symbol}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function Tile({
  label,
  value,
  note,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Store;
  tone?: "brand" | "emerald" | "amber" | "rose";
}) {
  const tones: Record<string, string> = {
    brand: "bg-[var(--brand-flat)]/10 text-[var(--brand-flat)]",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  };

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
          {label}
        </p>
        <span className={`rounded-lg p-1.5 ${tones[tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 text-xl font-extrabold tracking-tight text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-[11px] text-[var(--foreground-muted)]">{note}</p>
    </div>
  );
}

export default function VendorDeskClient({ report, months }: VendorDeskClientProps) {
  const { currencySymbol } = useSiteSettings();
  const { totals, series, plans, topVendors } = report;

  return (
    <section className="space-y-5 border-t border-[var(--border-color)] pt-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <header>
          <h2 className="text-lg font-bold text-[var(--foreground)]">Seller earnings</h2>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Subscriptions and commission collected from sellers over the last {months} months,
            against the sales that earned them.
          </p>
        </header>

        <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-alt)] p-1">
          {MONTH_CHOICES.map((choice) => (
            <Link
              key={choice}
              href={`/dashboard/admin/analytics?months=${choice}`}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                choice === months
                  ? "bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-2xs"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {choice}mo
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Subscription income"
          value={money(totals.subscriptionIncome, currencySymbol)}
          note={`${totals.activePlans} live plan${totals.activePlans === 1 ? "" : "s"} · ${money(
            totals.monthlyRecurring,
            currencySymbol
          )} a month`}
          icon={CreditCard}
          tone="emerald"
        />
        <Tile
          label="Seller sales"
          value={money(totals.vendorSales, currencySymbol)}
          note={`${totals.vendorOrders} order${totals.vendorOrders === 1 ? "" : "s"} placed with sellers`}
          icon={ShoppingBag}
        />
        <Tile
          label="Commission earned"
          value={money(totals.commissionEarned, currencySymbol)}
          note="Taken at each seller's own plan rate"
          icon={HandCoins}
          tone="amber"
        />
        <Tile
          label="Sellers on the books"
          value={String(totals.vendors)}
          note={
            totals.expiringSoon > 0 || totals.inGrace > 0
              ? `${totals.expiringSoon} ending this week · ${totals.inGrace} in grace`
              : "Every live plan is paid up"
          }
          icon={totals.expiringSoon > 0 ? AlertTriangle : Store}
          tone={totals.expiringSoon > 0 ? "rose" : "brand"}
        />
      </div>

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-lg bg-[var(--brand-flat)]/10 p-1.5 text-[var(--brand-flat)]">
            <CreditCard className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">Money in, month by month</h3>
            <p className="text-[11px] text-[var(--foreground-muted)]">
              Seller sales on the left axis; subscription income and commission on the right.
            </p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
              />
              <YAxis
                yAxisId="left"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(value) =>
                  value >= 1000 ? `${currencySymbol}${(value / 1000).toFixed(0)}k` : `${currencySymbol}${value}`
                }
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(value) =>
                  value >= 1000 ? `${currencySymbol}${(value / 1000).toFixed(0)}k` : `${currencySymbol}${value}`
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-elevated)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "var(--foreground)",
                  fontSize: "12px",
                }}
                formatter={(value: unknown, name: unknown) => [
                  money(Number(value ?? 0), currencySymbol),
                  String(name) === "sales"
                    ? "Seller sales"
                    : String(name) === "subscriptions"
                      ? "Subscriptions"
                      : "Commission",
                ]}
              />
              <Legend
                formatter={(value) =>
                  value === "sales"
                    ? "Seller sales"
                    : value === "subscriptions"
                      ? "Subscriptions"
                      : "Commission"
                }
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              />
              <Bar
                yAxisId="left"
                dataKey="sales"
                name="sales"
                fill="var(--brand-flat)"
                opacity={0.25}
                radius={[6, 6, 0, 0]}
                barSize={26}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="subscriptions"
                name="subscriptions"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="commission"
                name="commission"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Plans: where the sellers actually are. */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-[var(--foreground)]">Plans in use</h3>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Sellers per plan, and what each rung collected in this window.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="pb-2 pl-1">Plan</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Sellers</th>
                  <th className="pb-2 pr-1 text-right">Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-[var(--foreground-muted)]">
                      No plans have been set up yet.
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id}>
                      <td className="py-2.5 pl-1 font-semibold text-[var(--foreground)]">{plan.name}</td>
                      <td className="py-2.5 text-right text-[var(--foreground-muted)]">
                        {money(plan.price, currencySymbol)}
                      </td>
                      <td className="py-2.5 text-right font-bold text-[var(--foreground)]">{plan.vendors}</td>
                      <td className="py-2.5 pr-1 text-right font-mono text-[var(--foreground)]">
                        {money(plan.income, currencySymbol)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Link
            href="/dashboard/admin/vendor-plans"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
          >
            Manage plans
          </Link>
        </div>

        {/* Who is selling. */}
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-5 shadow-2xs">
          <h3 className="text-sm font-bold text-[var(--foreground)]">Top sellers</h3>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            Ranked by the sales they rang up in this window.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[10px] uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="pb-2 pl-1">Store</th>
                  <th className="pb-2">Plan</th>
                  <th className="pb-2 text-right">Orders</th>
                  <th className="pb-2 text-right">Sales</th>
                  <th className="pb-2 pr-1 text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {topVendors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[var(--foreground-muted)]">
                      No seller has rung up a sale in this window.
                    </td>
                  </tr>
                ) : (
                  topVendors.map((vendor) => (
                    <tr key={vendor.id}>
                      <td className="py-2.5 pl-1 font-semibold text-[var(--foreground)]">
                        <Link href={`/dashboard/admin/vendors/${vendor.id}`} className="hover:underline">
                          {vendor.store || "Unnamed store"}
                        </Link>
                      </td>
                      <td className="py-2.5 text-[var(--foreground-muted)]">{vendor.plan}</td>
                      <td className="py-2.5 text-right text-[var(--foreground)]">{vendor.orders}</td>
                      <td className="py-2.5 text-right font-mono text-[var(--foreground)]">
                        {money(vendor.sales, currencySymbol)}
                      </td>
                      <td className="py-2.5 pr-1 text-right font-mono text-emerald-600 dark:text-emerald-400">
                        {money(vendor.commission, currencySymbol)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
