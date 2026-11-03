"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Chip,
  Badge,
} from "@heroui/react";
import {
  DollarSign,
  ShoppingBag,
  CreditCard,
  Heart,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Package,
  Truck,
  Clock,
  ChevronRight,
  ShoppingCart,
  Trash2,
  ShieldCheck,
  MoreVertical,
  Calendar,
  Tag,
  Download,
  FileText,
  Activity,
  Award,
  Wallet,
  PieChart as PieIcon,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";
import SuspendedAccountModal from "@/components/shared/SuspendedAccountModal";
import { addToCart } from "@/lib/action/cart";
import OrderStatusBadge from "@/components/shared/OrderStatusBadge";
import {
  SpendingDataPoint,
  CustomerSpendingVsSavings,
  CategoryPurchaseData,
  CustomerOrderStatusItem,
  CustomerPaymentMethodItem,
  CustomerOrder,
  CustomerWishlistItem,
  CustomerTransaction,
} from "@/types/customerDashboard";
import { exportCustomerOverviewCsv } from "@/lib/csvExport";
import { downloadCustomerOverviewPdf } from "@/lib/dashboardPdf";
import { useSiteSettings } from "@/context/SiteSettingsContext";

export interface CustomerStatCard {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  iconName: "DollarSign" | "ShoppingBag" | "Heart" | "Sparkles" | string;
}

interface CustomerOverviewClientProps {
  stats: CustomerStatCard[];
  spendingData: SpendingDataPoint[];
  spendingVsSavingsData: CustomerSpendingVsSavings[];
  categoryData: CategoryPurchaseData[];
  orderStatusData: CustomerOrderStatusItem[];
  paymentMethodData?: CustomerPaymentMethodItem[];
  recentOrders: CustomerOrder[];
  wishlistItems: CustomerWishlistItem[];
  recentTransactions: CustomerTransaction[];
  userName: string;
  rewardPoints?: number;
  membershipTier?: string;
}

const ICON_MAP: Record<string, any> = {
  DollarSign,
  ShoppingBag,
  Heart,
  Sparkles,
};

export default function CustomerOverviewClient({
  stats,
  spendingData,
  spendingVsSavingsData,
  categoryData,
  orderStatusData,
  paymentMethodData = [],
  recentOrders,
  wishlistItems: initialWishlist,
  recentTransactions,
  userName,
  rewardPoints = 0,
  membershipTier = "Bronze Member",
}: CustomerOverviewClientProps) {
  const [wishlist, setWishlist] = useState(initialWishlist);
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState<CustomerOrder | null>(null);
  const [activeSpendingView, setActiveSpendingView] = useState<"both" | "spending" | "orders">("both");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showSuspendedAlert, setShowSuspendedAlert] = useState(false);
  const { settings, formatPrice, currencySymbol } = useSiteSettings();

  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const userRole = ((user as { role?: string })?.role || "").toLowerCase();
  const isSuspended = ((user as { status?: string })?.status || "").toLowerCase() === "suspended";

  const handleAddToCart = async (item: CustomerWishlistItem) => {
    if (isSuspended) {
      setShowSuspendedAlert(true);
      return;
    }

    if (!user) {
      toast.info("Please log in to add items to your cart", {
        icon: <span>🔒</span>,
      });
      router.push("/auth/login");
      return;
    }

    if (userRole === "admin" || userRole === "demoadmin") {
      toast.warning(
        userRole === "demoadmin"
          ? "Demo admin cannot add products to cart!"
          : "Admin cannot add products to cart!"
      );
      return;
    }
    if (user?.id && (item as any)?.ownerId && user.id === (item as any).ownerId) {
      toast.warning("You cannot add your own product to cart!");
      return;
    }

    try {
      const res = await addToCart(item.productId, 1);
      if (res?.success !== false) {
        toast.success(`"${item.title}" added to your cart!`);
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else {
        toast.error(res?.message || "Failed to add to cart");
      }
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  const handleRemoveWishlist = (id: string) => {
    setWishlist((prev) => prev.filter((item) => item.id !== id));
    toast.info("Item removed from wishlist");
  };

  // One payload feeds both the CSV and the PDF, so the reports can never disagree.
  const overviewReport = {
    userName,
    membershipTier,
    rewardPoints,
    stats,
    spendingData,
    categoryData,
    spendingVsSavingsData,
    orderStatusData,
    paymentMethodData,
    recentOrders,
    wishlistItems: wishlist,
    recentTransactions,
  };

  const exportOptions = { siteName: settings.siteName, currency: settings.currency };

  /** Writes every table to a clean CSV file. */
  const handleExportReport = () => {
    try {
      toast.info("Generating your customer account & shopping CSV report...");
      exportCustomerOverviewCsv(overviewReport, exportOptions);
      toast.success("Customer Overview CSV report exported successfully!");
    } catch (error) {
      console.error("Failed to export customer overview CSV:", error);
      toast.error("Failed to export CSV report. Please try again.");
    }
  };

  /** The same numbers, drawn as charts, in one PDF. */
  const handleExportPdf = async () => {
    setIsExportingPdf(true);
    toast.info("Building your PDF report with charts...");
    try {
      await downloadCustomerOverviewPdf(overviewReport, exportOptions);
      toast.success("PDF report downloaded!");
    } catch (error) {
      console.error("Failed to export customer overview PDF:", error);
      toast.error("Failed to build the PDF report. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const totalSpentAll = spendingData.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <>
    <SuspendedAccountModal
      isOpen={showSuspendedAlert}
      onOpenChange={setShowSuspendedAlert}
      message="Your account has been suspended. You are not allowed to add items to the cart. Please contact support for assistance."
    />

    <div className="space-y-8">
      {/* ── Page Header / Welcome ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live Shopping Hub
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Award className="w-3 h-3" />
              {membershipTier}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Customer{" "}
            <span className="text-gradient-primary">
              Overview
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Welcome back, <span className="font-bold text-[var(--foreground)]">{userName}</span>. Here is your real-time shopping activity &amp; savings performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* <Link
            href="/dashboard/customer/analytics"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[var(--surface-alt)] hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--foreground-muted)] text-xs font-bold text-[var(--foreground-secondary)] transition-colors"
          >
            <Activity className="w-4 h-4 text-primary" />
            <span>Detailed Analytics</span>
          </Link> */}

          <Button
            onClick={handleExportPdf}
            isDisabled={isExportingPdf}
            className="self-start sm:self-auto bg-[var(--surface-alt)] text-[var(--foreground)] text-xs font-bold transition-all cursor-pointer h-10 px-4 rounded-xl flex items-center gap-2 border border-[var(--border-color)]"
          >
            <FileText className="w-4 h-4" />
            <span>{isExportingPdf ? "Building PDF..." : "Export PDF"}</span>
          </Button>

          <Button
            onClick={handleExportReport}
            className="self-start sm:self-auto bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all cursor-pointer h-10 px-4 rounded-xl flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* ── Metric Stat Cards (4 Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, idx) => {
          const IconComponent = ICON_MAP[stat.iconName] || ShoppingBag;
          return (
            <Card
              key={idx}
              className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--foreground-muted)]">
                  {stat.title}
                </span>
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:bg-primary group-hover:text-white transition-colors">
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
            </Card>
          );
        })}
      </div>

      {/* ── Charts Grid Row 1: Graph 1 (Spending Activity) & Graph 2 (Category Breakdown) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRAPH 1: Monthly Spending Activity (Area Chart) */}
        <Card className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Spending Activity &amp; Order Velocity
                </h3>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                Monthly spending timeline ($ USD) and order volume
              </p>
            </div>

            <div className="flex items-center gap-1 bg-[var(--surface-alt)] p-1 rounded-lg text-xs self-start sm:self-auto">
              <button
                onClick={() => setActiveSpendingView("both")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  activeSpendingView === "both" ? "bg-[var(--surface)] text-primary shadow-xs" : "text-[var(--foreground-muted)]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveSpendingView("spending")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  activeSpendingView === "spending" ? "bg-[var(--surface)] text-primary shadow-xs" : "text-[var(--foreground-muted)]"
                }`}
              >
                Spent ({currencySymbol})
              </button>
              <button
                onClick={() => setActiveSpendingView("orders")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  activeSpendingView === "orders" ? "bg-[var(--surface)] text-primary shadow-xs" : "text-[var(--foreground-muted)]"
                }`}
              >
                Orders
              </button>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendingData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="customerSpendingGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--primary-hover)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="customerOrdersGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
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
                  tickFormatter={(val) => `${currencySymbol}${val}`}
                />
                {activeSpendingView === "both" && (
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
                  }}
                  formatter={(value: any, name: any) => [
                    String(name) === "amount"
                      ? `${currencySymbol}${Number(value ?? 0).toLocaleString()}`
                      : `${Number(value ?? 0)} Orders`,
                    String(name) === "amount" ? "Spent" : "Orders Placed",
                  ]}
                />
                {(activeSpendingView === "both" || activeSpendingView === "spending") && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="amount"
                    name="amount"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#customerSpendingGlow)"
                  />
                )}
                {(activeSpendingView === "both" || activeSpendingView === "orders") && (
                  <Area
                    yAxisId={activeSpendingView === "both" ? "right" : "left"}
                    type="monotone"
                    dataKey="orders"
                    name="orders"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    strokeDasharray={activeSpendingView === "both" ? "4 4" : undefined}
                    fillOpacity={1}
                    fill="url(#customerOrdersGlow)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-[var(--foreground-muted)] font-semibold">Net Spend</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[var(--accent)]" />
                <span className="text-[var(--foreground-muted)] font-semibold">Orders Count</span>
              </div>
            </div>
            <Link
              href="/dashboard/customer/orders"
              className="font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>Order History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* GRAPH 2: Category Purchase Breakdown (Donut Chart) */}
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <PieIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Category Affinity
              </h3>
            </div>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              Distribution of your purchases by category
            </p>
          </div>

          <div className="h-52 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
                    `${currencySymbol}${Number(item?.payload?.amount ?? 0).toFixed(2)} (${Number(val ?? 0)}%)`,
                    "Share",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-[var(--foreground)]">
                {categoryData.length}
              </span>
              <span className="text-[10px] text-[var(--foreground-muted)] uppercase font-bold">Categories</span>
            </div>
          </div>

          <div className="space-y-2 text-xs max-h-36 overflow-y-auto pr-1">
            {categoryData.map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-1 rounded-lg hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--surface)]/40">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-[var(--foreground-muted)] font-medium truncate max-w-[130px]">
                    {cat.name}
                  </span>
                </div>
                <span className="font-bold text-[var(--foreground)]">
                  {cat.value}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Charts Grid Row 2: Graph 3 (Spending vs Savings) & Graph 4 (Order Fulfillment & Gateways) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRAPH 3: Spending vs Promo Savings (Dual Bar Chart) */}
        <Card className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Monthly Spending vs. Unlocked Savings
                </h3>
              </div>
              <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                Comparison of net checkout spend vs coupon &amp; deal discounts saved
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-primary" />
                <span className="text-[var(--foreground-muted)]">Spent ({currencySymbol})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span className="text-[var(--foreground-muted)]">Saved ({currencySymbol})</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendingVsSavingsData} barGap={6}>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-elevated)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "var(--foreground)",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, name: any) => [
                    `$${Number(val ?? 0).toLocaleString()}`,
                    String(name) === "spending" ? "Spent" : "Savings",
                  ]}
                />
                <Bar dataKey="spending" name="spending" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="savings" name="savings" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* GRAPH 4: Order Fulfillment Journey & Delivery Status */}
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Order Delivery Journey
              </h3>
            </div>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              Fulfillment rate &amp; active shipments
            </p>
          </div>

          <div className="h-52 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {orderStatusData.map((entry, index) => (
                    <Cell key={`status-cell-${index}`} fill={entry.color} />
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
                  formatter={(val: ValueType | undefined) => [`${Number(val ?? 0)}%`, "Proportion"]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                {orderStatusData.find((s) => s.name === "Delivered")?.value || 0}%
              </span>
              <span className="text-[10px] text-[var(--foreground-muted)] uppercase font-bold">Delivered</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {orderStatusData.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-1 rounded-lg hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--surface)]/40">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[var(--foreground-muted)] font-medium">
                    {item.name}
                  </span>
                </div>
                <span className="font-bold text-[var(--foreground)]">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── GRAPH 5 / Payment Channels Row (Bonus real-time insight) ── */}
      {paymentMethodData.length > 0 && (
        <div className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--foreground)]">Preferred Payment Methods</h4>
              <p className="text-xs text-[var(--foreground-muted)]">Your most frequent checkout settlement channels</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {paymentMethodData.map((pm, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)]/60 border border-[var(--border-color)] text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pm.color }} />
                <span className="font-bold text-[var(--foreground)]">{pm.name}</span>
                <span className="text-[11px] font-semibold text-[var(--foreground-muted)]">({pm.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Orders Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-[var(--foreground)]">
              Recent Orders &amp; Live Tracking
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Track active dispatches and view complete purchase history
            </p>
          </div>
          <Link
            href="/dashboard/customer/orders"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All Orders ({recentOrders.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-8 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-[var(--foreground-muted)] mx-auto" />
            <p className="text-sm font-bold text-[var(--foreground)]">No orders placed yet</p>
            <p className="text-xs text-[var(--foreground-muted)] max-w-sm mx-auto">
              Start shopping to experience high-speed dispatch, rewards points, and live tracking.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:bg-primary-hover transition-colors"
            >
              <span>Explore Products</span>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentOrders.slice(0, 3).map((order) => {
              const isShipped = order.status === "Shipped";

              return (
                <Card
                  key={order.id}
                  className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                    <div>
                      <span className="text-xs font-bold font-mono text-primary">
                        {order.orderNumber}
                      </span>
                      <p className="text-[11px] text-[var(--foreground-muted)]">{order.date}</p>
                    </div>

                    <OrderStatusBadge status={order.status} size="sm" pulse={isShipped} />
                  </div>

                  {/* Order item preview */}
                  <div className="space-y-2">
                    {order.items.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg bg-[var(--surface-alt)] shrink-0 overflow-hidden flex items-center justify-center p-1 border border-[var(--border-color)]/60 dark:border-[var(--border-color)]">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-contain p-1"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-[var(--foreground-muted)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[var(--foreground)] truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-[var(--foreground-muted)]">
                            Qty: {item.quantity} • {formatPrice(item.price)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-[11px] font-semibold text-primary">
                        +{order.items.length - 2} more item(s)
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[var(--foreground-muted)] block">Total Amount</span>
                      <span className="text-sm font-extrabold text-[var(--foreground)]">
                        {formatPrice(order.total)}
                      </span>
                      {Boolean(order.pointsDiscount) && (
                        <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {order.pointsRedeemed} pts saved {formatPrice(order.pointsDiscount || 0)}
                        </span>
                      )}
                    </div>

                    <Button
                      onClick={() => setSelectedOrderForTracking(order)}
                      className="text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all h-8 px-3 rounded-lg"
                    >
                      <Truck className="w-3.5 h-3.5 mr-1" />
                      <span>Track Order</span>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Wishlist Quick Preview & Recent Transactions Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wishlist Preview */}
        <Card className="lg:col-span-2 bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Heart className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Saved in Wishlist ({wishlist.length})
              </h3>
            </div>
            <Link
              href="/dashboard/customer/wishlist"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>View Full Wishlist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {wishlist.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--foreground-muted)]">
              <Heart className="w-8 h-8 text-[var(--foreground-muted)] mx-auto mb-2" />
              Your wishlist is empty. Tap the heart icon on any product to save it here!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wishlist.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] hover:border-primary/30 transition-all"
                >
                  <div className="relative w-14 h-14 rounded-lg bg-[var(--surface-elevated)] shrink-0 overflow-hidden flex items-center justify-center p-1 border border-[var(--border-color)]/60 dark:border-[var(--border-color)]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-contain p-1"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-[var(--foreground-muted)]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[var(--foreground)] truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-extrabold text-[var(--foreground)]">
                        {formatPrice(item.price)}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-[10px] text-[var(--foreground-muted)] line-through">
                          {formatPrice(item.originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleAddToCart(item)}
                    className="p-2 h-8 w-8 min-w-8 rounded-lg bg-primary hover:bg-primary-hover text-white shrink-0 cursor-pointer shadow-xs"
                    aria-label="Add to Cart"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Transactions List */}
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-[var(--foreground)]">
                Recent Settlements
              </h3>
            </div>
            <Link
              href="/dashboard/customer/transactions"
              className="text-xs font-bold text-primary hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentTransactions.slice(0, 3).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--surface-alt)]/70 dark:bg-[var(--surface-alt)]/40 border border-[var(--border-color)]"
              >
                <div>
                  <p className="text-xs font-bold text-[var(--foreground)] font-mono">
                    {tx.orderNumber}
                  </p>
                  <p className="text-[10px] text-[var(--foreground-muted)]">{tx.paymentMethod} • {tx.date}</p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-black text-[var(--foreground)]">
                    {formatPrice(tx.amount)}
                  </p>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <p className="text-xs text-[var(--foreground-muted)] text-center py-4">No transactions recorded</p>
            )}
          </div>

          <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
            <span className="text-[var(--foreground-muted)]">Lifetime Checkout Total</span>
            <span className="font-extrabold text-primary">{formatPrice(totalSpentAll)}</span>
          </div>
        </Card>
      </div>

      {/* ── Interactive Order Tracking Modal ── */}
      {selectedOrderForTracking && (
        /* Scrolls, and sits at the top of a short screen: a centred timeline
           longer than the viewport loses its first steps behind the top edge. */
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 sm:items-center bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[var(--surface)] border border-[var(--border-color)] rounded-3xl p-4 sm:p-6 max-w-lg w-full min-w-0 my-auto shadow-2xl space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-[var(--foreground)]">
                    Tracking {selectedOrderForTracking.orderNumber}
                  </h3>
                </div>
                <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                  Placed on {selectedOrderForTracking.date} • Total {formatPrice(selectedOrderForTracking.total)}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrderForTracking(null)}
                className="w-8 h-8 rounded-full bg-[var(--surface-alt)] hover:bg-[var(--surface-alt)] text-[var(--foreground-muted)] font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Timeline progression */}
            <div className="space-y-4 relative pl-6 border-l-2 border-primary/30 ml-2">
              {selectedOrderForTracking.timeline.map((step, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                      step.completed
                        ? "bg-primary border-primary text-white"
                        : step.current
                        ? "bg-[var(--surface)] border-primary animate-pulse"
                        : "bg-[var(--surface)] border-[var(--border-color)]"
                    }`}
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-[var(--foreground)]">
                        {step.title}
                      </h5>
                      {step.date && (
                        <span className="text-[10px] text-[var(--foreground-muted)] font-semibold">{step.date}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-alt)] text-xs text-[var(--foreground-muted)] space-y-1">
              <p className="font-semibold text-[var(--foreground)]">Delivery Address:</p>
              <p className="text-[11px] text-[var(--foreground-muted)]">{selectedOrderForTracking.shippingAddress}</p>
            </div>

            <Button
              onClick={() => setSelectedOrderForTracking(null)}
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold text-xs h-10 rounded-xl"
            >
              Close Tracker
            </Button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
