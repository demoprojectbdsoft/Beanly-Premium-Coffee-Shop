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
  CheckCircle2,
  Clock,
  ChevronRight,
  ShoppingCart,
  Trash2,
  ShieldCheck,
  MoreVertical,
  Calendar,
  Tag,
  Download,
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
  const [showSuspendedAlert, setShowSuspendedAlert] = useState(false);

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

    if (userRole === "admin") {
      toast.warning("Admin cannot add products to cart!");
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

  /**
   * Handles exporting all Customer Overview data:
   * - Customer Profile (Name, Tier, Reward Points)
   * - Key Shopping Stat Cards
   * - Monthly Spending Activity & Order Velocity (Graph 1)
   * - Category Affinity Distribution (Graph 2)
   * - Monthly Spending vs Promo Savings (Graph 3)
   * - Order Delivery Journey & Status (Graph 4)
   * - Preferred Payment Methods (Graph 5)
   * - Recent Orders & Purchased Items Table
   * - Saved Wishlist Items
   * - Settlements & Transactions Table
   * 
   * Formats into a clean, UTF-8 BOM enabled CSV file with robust escaping to prevent data issues.
   */
  const handleExportReport = () => {
    try {
      toast.info("Generating your customer account & shopping CSV report...");

      // Execute the CSV export with all live customer data points
      exportCustomerOverviewCsv({
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
      });

      toast.success("Customer Overview CSV report exported successfully!");
    } catch (error) {
      console.error("Failed to export customer overview CSV:", error);
      toast.error("Failed to export CSV report. Please try again.");
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
              Live Shopping Hub
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Award className="w-3 h-3" />
              {membershipTier}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Customer{" "}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              Overview
            </span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Welcome back, <span className="font-bold text-gray-900 dark:text-white">{userName}</span>. Here is your real-time shopping activity &amp; savings performance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* <Link
            href="/dashboard/customer/analytics"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Activity className="w-4 h-4 text-sky-500" />
            <span>Detailed Analytics</span>
          </Link> */}

          <Button
            onClick={handleExportReport}
            className="self-start sm:self-auto bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all cursor-pointer h-10 px-4 rounded-xl flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export Report</span>
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
            </Card>
          );
        })}
      </div>

      {/* ── Charts Grid Row 1: Graph 1 (Spending Activity) & Graph 2 (Category Breakdown) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GRAPH 1: Monthly Spending Activity (Area Chart) */}
        <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Spending Activity &amp; Order Velocity
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Monthly spending timeline ($ USD) and order volume
              </p>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-gray-800 p-1 rounded-lg text-xs self-start sm:self-auto">
              <button
                onClick={() => setActiveSpendingView("both")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  activeSpendingView === "both" ? "bg-white dark:bg-gray-900 text-sky-600 shadow-xs" : "text-gray-500"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveSpendingView("spending")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  activeSpendingView === "spending" ? "bg-white dark:bg-gray-900 text-sky-600 shadow-xs" : "text-gray-500"
                }`}
              >
                Spent ($)
              </button>
              <button
                onClick={() => setActiveSpendingView("orders")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  activeSpendingView === "orders" ? "bg-white dark:bg-gray-900 text-indigo-600 shadow-xs" : "text-gray-500"
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
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
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
                  tickFormatter={(val) => `$${val}`}
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
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "14px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(value: any, name: any) => [
                    String(name) === "amount"
                      ? `$${Number(value ?? 0).toLocaleString()}`
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
                    stroke="#0284c7"
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

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-gray-800 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500" />
                <span className="text-gray-600 dark:text-gray-300 font-semibold">Net Spend</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-500" />
                <span className="text-gray-600 dark:text-gray-300 font-semibold">Orders Count</span>
              </div>
            </div>
            <Link
              href="/dashboard/customer/orders"
              className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>Order History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>

        {/* GRAPH 2: Category Purchase Breakdown (Donut Chart) */}
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <PieIcon className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Category Affinity
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, _n: any, item: any) => [
                    `$${Number(item?.payload?.amount ?? 0).toFixed(2)} (${Number(val ?? 0)}%)`,
                    "Share",
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-gray-900 dark:text-white">
                {categoryData.length}
              </span>
              <span className="text-[10px] text-gray-400 uppercase font-bold">Categories</span>
            </div>
          </div>

          <div className="space-y-2 text-xs max-h-36 overflow-y-auto pr-1">
            {categoryData.map((cat, i) => (
              <div key={i} className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800/40">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-gray-600 dark:text-gray-300 font-medium truncate max-w-[130px]">
                    {cat.name}
                  </span>
                </div>
                <span className="font-bold text-gray-800 dark:text-gray-200">
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
        <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Monthly Spending vs. Unlocked Savings
                </h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Comparison of net checkout spend vs coupon &amp; deal discounts saved
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-sky-600" />
                <span className="text-gray-600 dark:text-gray-300">Spent ($)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span className="text-gray-600 dark:text-gray-300">Saved ($)</span>
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
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                  formatter={(val: any, name: any) => [
                    `$${Number(val ?? 0).toLocaleString()}`,
                    String(name) === "spending" ? "Spent" : "Savings",
                  ]}
                />
                <Bar dataKey="spending" name="spending" fill="#0284c7" radius={[6, 6, 0, 0]} />
                <Bar dataKey="savings" name="savings" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* GRAPH 4: Order Fulfillment Journey & Delivery Status */}
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Truck className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Order Delivery Journey
              </h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
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
              <span className="text-[10px] text-gray-400 uppercase font-bold">Delivered</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            {orderStatusData.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800/40">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600 dark:text-gray-300 font-medium">
                    {item.name}
                  </span>
                </div>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── GRAPH 5 / Payment Channels Row (Bonus real-time insight) ── */}
      {paymentMethodData.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/40">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">Preferred Payment Methods</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">Your most frequent checkout settlement channels</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {paymentMethodData.map((pm, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200/60 dark:border-gray-700/60 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pm.color }} />
                <span className="font-bold text-gray-800 dark:text-gray-200">{pm.name}</span>
                <span className="text-[11px] font-semibold text-gray-400">({pm.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Orders Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Recent Orders &amp; Live Tracking
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Track active dispatches and view complete purchase history
            </p>
          </div>
          <Link
            href="/dashboard/customer/orders"
            className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>View All Orders ({recentOrders.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-8 text-center space-y-3">
            <ShoppingBag className="w-10 h-10 text-gray-400 mx-auto" />
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No orders placed yet</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Start shopping to experience high-speed dispatch, rewards points, and live tracking.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-xs hover:bg-sky-700 transition-colors"
            >
              <span>Explore Products</span>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentOrders.slice(0, 3).map((order) => {
              const isShipped = order.status === "Shipped";
              const isDelivered = order.status === "Delivered";
              const isProcessing = order.status === "Processing";

              return (
                <Card
                  key={order.id}
                  className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800">
                    <div>
                      <span className="text-xs font-bold font-mono text-sky-600 dark:text-sky-400">
                        {order.orderNumber}
                      </span>
                      <p className="text-[11px] text-gray-400">{order.date}</p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        isDelivered
                          ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40"
                          : isShipped
                          ? "bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/50 dark:border-sky-800/40"
                          : isProcessing
                          ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/40"
                          : "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40"
                      }`}
                    >
                      {isShipped && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />}
                      {isDelivered && <CheckCircle2 className="w-3 h-3" />}
                      {order.status}
                    </span>
                  </div>

                  {/* Order item preview */}
                  <div className="space-y-2">
                    {order.items.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-lg bg-slate-100 dark:bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center p-1 border border-slate-200/60 dark:border-gray-700">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-contain p-1"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {item.name}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Qty: {item.quantity} • ${item.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {order.items.length > 2 && (
                      <p className="text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                        +{order.items.length - 2} more item(s)
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Total Amount</span>
                      <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                        ${order.total.toFixed(2)}
                      </span>
                    </div>

                    <Button
                      onClick={() => setSelectedOrderForTracking(order)}
                      className="text-xs font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60 hover:bg-sky-500 hover:text-white transition-all h-8 px-3 rounded-lg"
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
        <Card className="lg:col-span-2 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <Heart className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Saved in Wishlist ({wishlist.length})
              </h3>
            </div>
            <Link
              href="/dashboard/customer/wishlist"
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
            >
              <span>View Full Wishlist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {wishlist.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              <Heart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              Your wishlist is empty. Tap the heart icon on any product to save it here!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {wishlist.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 hover:border-sky-500/30 transition-all"
                >
                  <div className="relative w-14 h-14 rounded-lg bg-white dark:bg-gray-800 shrink-0 overflow-hidden flex items-center justify-center p-1 border border-slate-200/60 dark:border-gray-700">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-contain p-1"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs font-extrabold text-gray-900 dark:text-white">
                        ${item.price.toFixed(2)}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-[10px] text-gray-400 line-through">
                          ${item.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    onClick={() => handleAddToCart(item)}
                    className="p-2 h-8 w-8 min-w-8 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shrink-0 cursor-pointer shadow-xs"
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
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Recent Settlements
              </h3>
            </div>
            <Link
              href="/dashboard/customer/transactions"
              className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
            >
              View All
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentTransactions.slice(0, 3).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/70 dark:bg-gray-800/40 border border-slate-100 dark:border-gray-800"
              >
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 font-mono">
                    {tx.orderNumber}
                  </p>
                  <p className="text-[10px] text-gray-400">{tx.paymentMethod} • {tx.date}</p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-black text-gray-900 dark:text-white">
                    ${tx.amount.toFixed(2)}
                  </p>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No transactions recorded</p>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-gray-400">Lifetime Checkout Total</span>
            <span className="font-extrabold text-sky-600 dark:text-sky-400">${totalSpentAll.toFixed(2)}</span>
          </div>
        </Card>
      </div>

      {/* ── Interactive Order Tracking Modal ── */}
      {selectedOrderForTracking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-sky-600" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Tracking {selectedOrderForTracking.orderNumber}
                  </h3>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Placed on {selectedOrderForTracking.date} • Total ${selectedOrderForTracking.total.toFixed(2)}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrderForTracking(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 text-gray-600 dark:text-gray-300 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Timeline progression */}
            <div className="space-y-4 relative pl-6 border-l-2 border-sky-500/30 ml-2">
              {selectedOrderForTracking.timeline.map((step, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 ${
                      step.completed
                        ? "bg-sky-500 border-sky-500 text-white"
                        : step.current
                        ? "bg-white dark:bg-gray-900 border-sky-500 animate-pulse"
                        : "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
                    }`}
                  />
                  <div>
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-gray-900 dark:text-white">
                        {step.title}
                      </h5>
                      {step.date && (
                        <span className="text-[10px] text-gray-400 font-semibold">{step.date}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-gray-800/50 text-xs text-gray-600 dark:text-gray-300 space-y-1">
              <p className="font-semibold text-gray-800 dark:text-gray-200">Delivery Address:</p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{selectedOrderForTracking.shippingAddress}</p>
            </div>

            <Button
              onClick={() => setSelectedOrderForTracking(null)}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-10 rounded-xl"
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
