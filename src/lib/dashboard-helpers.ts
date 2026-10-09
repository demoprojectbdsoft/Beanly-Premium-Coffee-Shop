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
import {
  SpendingDataPoint,
  CustomerSpendingVsSavings,
  CategoryPurchaseData,
  CustomerOrderStatusItem,
  CustomerPaymentMethodItem,
  CustomerOrder,
  CustomerTransaction,
} from "@/types/customerDashboard";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PALETTE = [
  "#0284c7", // Sky blue
  "#2563eb", // Royal blue
  "#6366f1", // Indigo
  "#38bdf8", // Light sky
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#10b981", // Emerald
  "#f59e0b", // Amber
];

/**
 * Generate last N month labels in chronological order ending at current month
 */
function getLastNMonths(n: number = 8): string[] {
  const current = new Date();
  const months: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
    months.push(MONTH_NAMES[d.getMonth()]);
  }
  return months;
}

/**
 * Returns the ISO week number (1-52) for a given date
 */
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN DASHBOARD AGGREGATION
// ─────────────────────────────────────────────────────────────────────────────

export interface RawOrder {
  _id?: string;
  id?: string;
  totalAmount?: number;
  subtotal?: number;
  shippingFee?: number;
  orderStatus?: string;
  paymentMethod?: string;
  createdAt?: string;
  updatedAt?: string;
  userId?: any;
  items?: Array<{
    productId?: any;
    title?: string;
    price?: number;
    quantity?: number;
    image?: string;
  }>;
  shippingAddress?: {
    fullName?: string;
    city?: string;
    address?: string;
    postalCode?: string;
  };
}

export interface RawProduct {
  _id?: string;
  id?: string;
  title?: string;
  price?: number;
  originalPrice?: number;
  investPrice?: number;   // cost/purchase price for profit tracking
  image?: string;
  rating?: number;
  reviewCount?: number;
  stockQuantity?: number;
  inStock?: boolean;
  categoryId?: any;
  categories?: string[];
  specifications?: any;
}

export interface RawUser {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: string;
}

export interface RawTransaction {
  _id?: string;
  id?: string;
  orderId?: any;
  userId?: any;
  method?: string;
  amount?: number;
  status?: string;
  reference?: string;
  createdAt?: string;
}

export function aggregateAdminDashboard(
  rawOrders: RawOrder[] = [],
  rawProducts: RawProduct[] = [],
  rawUsers: RawUser[] = [],
  rawTransactions: RawTransaction[] = [],
  rawCategories: any[] = []
) {
  const orders = Array.isArray(rawOrders) ? rawOrders : [];
  const products = Array.isArray(rawProducts) ? rawProducts : [];
  const users = Array.isArray(rawUsers) ? rawUsers : [];
  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];
  const categories = Array.isArray(rawCategories) ? rawCategories : [];

  // 1. Total Gross Revenue & Delivered Revenue
  let totalRevenue = 0;
  let deliveredOrdersCount = 0;
  let processingOrdersCount = 0;
  const activeCustomers = users.filter((u) => (u.role || "").toLowerCase() !== "admin");
  const activeCustomersCount = activeCustomers.length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newThisMonth = activeCustomers.filter(
    (u) => u.createdAt && new Date(u.createdAt).getTime() >= thirtyDaysAgo.getTime()
  ).length;

  // Monthly breakdown map: Month Name -> { revenue, orders }
  const monthList = getLastNMonths(8);
  const monthlyDataMap: Record<string, { revenue: number; orders: number }> = {};
  monthList.forEach((m) => {
    monthlyDataMap[m] = { revenue: 0, orders: 0 };
  });

  // Order status map
  const statusCounts: Record<string, { count: number; amount: number }> = {
    Delivered: { count: 0, amount: 0 },
    Shipped: { count: 0, amount: 0 },
    Processing: { count: 0, amount: 0 },
    Pending: { count: 0, amount: 0 },
    Cancelled: { count: 0, amount: 0 },
  };

  // Payment method map
  const paymentCounts: Record<string, { count: number; amount: number }> = {
    bKash: { count: 0, amount: 0 },
    Nagad: { count: 0, amount: 0 },
    Rocket: { count: 0, amount: 0 },
    "Cash on Delivery": { count: 0, amount: 0 },
    Card: { count: 0, amount: 0 },
  };

  // Product sales counter (with cost/profit tracking)
  const productSalesMap: Record<string, {
    title: string; image: string; category: string;
    price: number; investPrice?: number;
    unitsSold: number; revenue: number; cost: number; profit: number;
  }> = {};

  // Build product lookup map for investPrice
  const productMap: Record<string, RawProduct> = {};
  rawProducts.forEach((p) => {
    const pid = p._id?.toString() || p.id?.toString() || "";
    if (pid) productMap[pid] = p;
  });

  // Profit time-series: daily (last 30 days), weekly (last 12 weeks), monthly (last 12 months), yearly (last 5 years)
  const now = new Date();

  // Daily map (last 30 days)
  const dailyMap: Record<string, { revenue: number; cost: number; profit: number; orders: number }> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    dailyMap[key] = { revenue: 0, cost: 0, profit: 0, orders: 0 };
  }

  // Weekly map (last 12 weeks)
  const weeklyMap: Record<string, { revenue: number; cost: number; profit: number; orders: number }> = {};
  for (let i = 11; i >= 0; i--) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - i * 7);
    const key = `W${getWeekNumber(weekStart)}`;
    weeklyMap[key] = { revenue: 0, cost: 0, profit: 0, orders: 0 };
  }

  // Monthly map (last 12 months)
  const monthlyProfitMap: Record<string, { revenue: number; cost: number; profit: number; orders: number }> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = MONTH_NAMES[d.getMonth()];
    monthlyProfitMap[key] = { revenue: 0, cost: 0, profit: 0, orders: 0 };
  }

  // Yearly map (last 5 years)
  const yearlyMap: Record<string, { revenue: number; cost: number; profit: number; orders: number }> = {};
  for (let i = 4; i >= 0; i--) {
    const yr = String(now.getFullYear() - i);
    yearlyMap[yr] = { revenue: 0, cost: 0, profit: 0, orders: 0 };
  }

  orders.forEach((order) => {
    const amt = Number(order.totalAmount ?? 0);
    const st = (order.orderStatus || "processing").toLowerCase();

    // Sum revenue (excluding cancelled)
    if (st !== "cancelled") {
      totalRevenue += amt;
    }

    if (st === "delivered" || st === "completed") {
      deliveredOrdersCount++;
      statusCounts.Delivered.count++;
      statusCounts.Delivered.amount += amt;
    } else if (st === "shipped") {
      statusCounts.Shipped.count++;
      statusCounts.Shipped.amount += amt;
    } else if (st === "processing") {
      processingOrdersCount++;
      statusCounts.Processing.count++;
      statusCounts.Processing.amount += amt;
    } else if (st === "cancelled") {
      statusCounts.Cancelled.count++;
      statusCounts.Cancelled.amount += amt;
    } else {
      statusCounts.Pending.count++;
      statusCounts.Pending.amount += amt;
    }

    // Payment method mapping
    const pm = (order.paymentMethod || "").toLowerCase();
    if (pm === "bkash") {
      paymentCounts.bKash.count++;
      paymentCounts.bKash.amount += amt;
    } else if (pm === "nagad") {
      paymentCounts.Nagad.count++;
      paymentCounts.Nagad.amount += amt;
    } else if (pm === "rocket") {
      paymentCounts.Rocket.count++;
      paymentCounts.Rocket.amount += amt;
    } else if (pm === "cod" || pm.includes("cash")) {
      paymentCounts["Cash on Delivery"].count++;
      paymentCounts["Cash on Delivery"].amount += amt;
    } else {
      paymentCounts.Card.count++;
      paymentCounts.Card.amount += amt;
    }

    // Monthly aggregation
    if (order.createdAt) {
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) {
        const m = MONTH_NAMES[d.getMonth()];
        if (monthlyDataMap[m]) {
          monthlyDataMap[m].revenue += amt;
          monthlyDataMap[m].orders += 1;
        }
      }
    }

    // Item sales (with cost/profit tracking)
    if (Array.isArray(order.items)) {
      order.items.forEach((item) => {
        const pid = typeof item.productId === "object" ? item.productId?._id || item.productId?.id : item.productId;
        const key = pid ? String(pid) : item.title || "Product";
        const qty = Number(item.quantity ?? 1);
        const itemPrice = Number(item.price ?? 0);
        const prodCat =
          typeof item.productId === "object"
            ? item.productId?.categoryId?.name || item.productId?.category?.name || "Electronics"
            : "Electronics";

        // Try to get investPrice from populated productId or productMap
        const populatedProd = typeof item.productId === "object" ? item.productId : null;
        const investPriceRaw =
          populatedProd?.investPrice ??
          (pid ? productMap[String(pid)]?.investPrice : undefined);
        const investPrice = investPriceRaw != null ? Number(investPriceRaw) : undefined;
        const itemCost = investPrice != null ? investPrice * qty : 0;
        const itemProfit = (itemPrice * qty) - itemCost;

        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            title: item.title || "Product Item",
            image: item.image || "",
            category: prodCat,
            price: itemPrice,
            investPrice,
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }
        productSalesMap[key].unitsSold += qty;
        productSalesMap[key].revenue += qty * itemPrice;
        productSalesMap[key].cost += itemCost;
        productSalesMap[key].profit += itemProfit;
      });
    }

    // Profit time-series bucketing
    if (order.createdAt && st !== "cancelled") {
      const orderDate = new Date(order.createdAt);
      if (!isNaN(orderDate.getTime())) {
        const itemsRevenue = Array.isArray(order.items)
          ? order.items.reduce((s, it) => s + Number(it.price ?? 0) * Number(it.quantity ?? 1), 0)
          : Number(order.totalAmount ?? 0);
        const itemsCost = Array.isArray(order.items)
          ? order.items.reduce((s, it) => {
              const pid = typeof it.productId === "object" ? it.productId?._id || it.productId?.id : it.productId;
              const populatedProd = typeof it.productId === "object" ? it.productId : null;
              const ip = populatedProd?.investPrice ?? (pid ? productMap[String(pid)]?.investPrice : undefined);
              return s + (ip != null ? Number(ip) * Number(it.quantity ?? 1) : 0);
            }, 0)
          : 0;
        const itemsProfit = itemsRevenue - itemsCost;

        // Daily
        const dayKey = `${orderDate.getMonth() + 1}/${orderDate.getDate()}`;
        const cutoff30 = new Date(now); cutoff30.setDate(cutoff30.getDate() - 29);
        if (orderDate >= cutoff30 && dailyMap[dayKey]) {
          dailyMap[dayKey].revenue += itemsRevenue;
          dailyMap[dayKey].cost += itemsCost;
          dailyMap[dayKey].profit += itemsProfit;
          dailyMap[dayKey].orders += 1;
        }

        // Weekly
        const wk = `W${getWeekNumber(orderDate)}`;
        const cutoff12w = new Date(now); cutoff12w.setDate(cutoff12w.getDate() - 83);
        if (orderDate >= cutoff12w && weeklyMap[wk]) {
          weeklyMap[wk].revenue += itemsRevenue;
          weeklyMap[wk].cost += itemsCost;
          weeklyMap[wk].profit += itemsProfit;
          weeklyMap[wk].orders += 1;
        }

        // Monthly
        const mKey = MONTH_NAMES[orderDate.getMonth()];
        const cutoff12m = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        if (orderDate >= cutoff12m && monthlyProfitMap[mKey] !== undefined) {
          monthlyProfitMap[mKey].revenue += itemsRevenue;
          monthlyProfitMap[mKey].cost += itemsCost;
          monthlyProfitMap[mKey].profit += itemsProfit;
          monthlyProfitMap[mKey].orders += 1;
        }

        // Yearly
        const yrKey = String(orderDate.getFullYear());
        if (yearlyMap[yrKey]) {
          yearlyMap[yrKey].revenue += itemsRevenue;
          yearlyMap[yrKey].cost += itemsCost;
          yearlyMap[yrKey].profit += itemsProfit;
          yearlyMap[yrKey].orders += 1;
        }
      }
    }
  });

  // Calculate Category Breakdown from real database catalog
  const categoryCountMap: Record<string, number> = {};
  products.forEach((p) => {
    let catName = "Other";
    if (p.categoryId && typeof p.categoryId === "object" && p.categoryId.name) {
      catName = p.categoryId.name;
    } else if (p.categories && p.categories[0]) {
      catName = p.categories[0];
    } else if (p.specifications?.Category || p.specifications?.category) {
      catName = p.specifications.Category || p.specifications.category;
    }
    categoryCountMap[catName] = (categoryCountMap[catName] || 0) + 1;
  });

  const totalCatalogProducts = products.length;
  let categoryData: CategoryDataPoint[] = totalCatalogProducts > 0
    ? Object.entries(categoryCountMap).map(([name, count], idx) => ({
        name,
        value: Math.round((count / totalCatalogProducts) * 100),
        count,
        color: PALETTE[idx % PALETTE.length],
      }))
    : [];

  // Monthly Revenue Data points
  const revenueData: RevenueDataPoint[] = monthList.map((m) => {
    const val = monthlyDataMap[m];
    return {
      month: m,
      revenue: Math.round(val.revenue),
      orders: val.orders,
    };
  });

  // Order Status Data points (Graph 3)
  const totalOrdersCount = orders.length || 1;
  const statusColors: Record<string, string> = {
    Delivered: "#10b981",
    Shipped: "#0284c7",
    Processing: "#6366f1",
    Pending: "#f59e0b",
    Cancelled: "#ef4444",
  };

  const orderStatusData: OrderStatusDataPoint[] = Object.entries(statusCounts)
    .filter(([_, item]) => item.count > 0)
    .map(([name, item]) => ({
      name,
      value: Math.round((item.count / totalOrdersCount) * 100),
      count: item.count,
      amount: item.amount,
      color: statusColors[name] || "#64748b",
    }));

  // Payment Method Data points (Graph 4)
  const totalPaymentOrders = Object.values(paymentCounts).reduce((acc, curr) => acc + curr.count, 0) || 1;
  const paymentMethodData: PaymentMethodDataPoint[] = Object.entries(paymentCounts)
    .filter(([_, item]) => item.count > 0)
    .map(([name, item], idx) => ({
      name,
      value: Math.round((item.count / totalPaymentOrders) * 100),
      count: item.count,
      amount: item.amount,
      color: PALETTE[idx % PALETTE.length],
    }));

  // Top Products
  let topProducts: TopProductItem[] = Object.entries(productSalesMap)
    .map(([id, p]) => ({
      id,
      title: p.title,
      image: p.image,
      category: p.category,
      price: p.price,
      investPrice: p.investPrice,
      unitsSold: p.unitsSold,
      revenue: Math.round(p.revenue * 100) / 100,
      cost: Math.round(p.cost * 100) / 100,
      profit: Math.round(p.profit * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Recent Orders for the Table
  const recentOrders: RecentOrder[] = orders.slice(0, 7).map((ord) => {
    const id = ord._id?.toString() || ord.id || "";
    const shortId = `#ORD-${id.slice(-5).toUpperCase()}`;
    const custName = ord.shippingAddress?.fullName || ord.userId?.name || "Customer";
    const custEmail = ord.userId?.email || "customer@example.com";
    const firstItem = ord.items?.[0]?.title || "Electronic Item";
    const moreItems = (ord.items?.length || 1) > 1 ? ` +${ord.items!.length - 1} more` : "";
    const amtStr = `$${Number(ord.totalAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    let st: RecentOrder["status"] = "Processing";
    const rawSt = (ord.orderStatus || "").toLowerCase();
    if (rawSt === "delivered" || rawSt === "completed") st = "Completed";
    else if (rawSt === "shipped") st = "Shipped";
    else if (rawSt === "cancelled") st = "Cancelled";
    else if (rawSt === "pending") st = "Pending";

    const dateStr = ord.createdAt
      ? new Date(ord.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "Recent";

    return {
      id: shortId,
      customer: custName,
      email: custEmail,
      product: `${firstItem}${moreItems}`,
      amount: amtStr,
      status: st,
      date: dateStr,
    };
  });

  // Profit time-series arrays
  const dailyProfitData: ProfitDataPoint[] = Object.entries(dailyMap).map(([label, v]) => ({
    label,
    revenue: Math.round(v.revenue * 100) / 100,
    cost: Math.round(v.cost * 100) / 100,
    profit: Math.round(v.profit * 100) / 100,
    orders: v.orders,
  }));

  const weeklyProfitData: ProfitDataPoint[] = Object.entries(weeklyMap).map(([label, v]) => ({
    label,
    revenue: Math.round(v.revenue * 100) / 100,
    cost: Math.round(v.cost * 100) / 100,
    profit: Math.round(v.profit * 100) / 100,
    orders: v.orders,
  }));

  const monthlyProfitData: ProfitDataPoint[] = Object.entries(monthlyProfitMap).map(([label, v]) => ({
    label,
    revenue: Math.round(v.revenue * 100) / 100,
    cost: Math.round(v.cost * 100) / 100,
    profit: Math.round(v.profit * 100) / 100,
    orders: v.orders,
  }));

  const yearlyProfitData: ProfitDataPoint[] = Object.entries(yearlyMap).map(([label, v]) => ({
    label,
    revenue: Math.round(v.revenue * 100) / 100,
    cost: Math.round(v.cost * 100) / 100,
    profit: Math.round(v.profit * 100) / 100,
    orders: v.orders,
  }));

  // Overall profit / cost totals
  const totalProfit = topProducts.reduce((s, p) => s + (p.profit || 0), 0) +
    Object.values(productSalesMap)
      .filter((_, i) => i >= 5)
      .reduce((s, p) => s + (p.profit || 0), 0);
  const totalCost = Object.values(productSalesMap).reduce((s, p) => s + (p.cost || 0), 0);
  const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100 * 10) / 10 : 0;

  // Key Performance Indicators (KPIs)
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;
  const deliverySuccessRate = orders.length > 0 ? Math.round((deliveredOrdersCount / orders.length) * 100) : 0;

  const kpis: AdminKPIs = {
    avgOrderValue,
    deliverySuccessRate,
    totalProducts: products.length,
    totalTransactions: transactions.length || orders.length,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
    profitMargin,
  };

  // Stat Cards
  const stats: StatCardItem[] = [
    {
      title: "Total Revenue",
      value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: `From ${orders.length} total orders`,
      isPositive: true,
      iconName: "DollarSign",
    },
    {
      title: "Net Profit",
      value: `$${Math.max(0, totalProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: totalProfit >= 0 ? `${profitMargin}% profit margin` : `Loss: $${Math.abs(totalProfit).toFixed(2)}`,
      isPositive: totalProfit >= 0,
      iconName: "TrendingUp",
    },
    {
      title: "Orders Processed",
      value: `${orders.length.toLocaleString()}`,
      change: `${processingOrdersCount} currently in processing`,
      isPositive: true,
      iconName: "ShoppingBag",
    },
    {
      title: "Active Customers",
      value: `${activeCustomersCount.toLocaleString()}`,
      change: newThisMonth > 0 ? `+${newThisMonth} new this month` : `${activeCustomersCount} registered`,
      isPositive: true,
      iconName: "Users",
    },
  ];

  return {
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
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER DASHBOARD AGGREGATION
// ─────────────────────────────────────────────────────────────────────────────

export function aggregateCustomerDashboard(
  rawOrders: RawOrder[] = [],
  rawWishlist: any[] = [],
  rawTransactions: any[] = [],
  user: any = null
) {
  const orders = Array.isArray(rawOrders) ? rawOrders : [];
  const wishlist = Array.isArray(rawWishlist) ? rawWishlist : [];
  const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];

  let totalSpent = 0;
  let totalSaved = 0;
  let inTransitCount = 0;
  let deliveredCount = 0;
  let processingCount = 0;

  const monthList = getLastNMonths(8);
  const spendingMap: Record<string, { spending: number; savings: number; orders: number }> = {};
  monthList.forEach((m) => {
    spendingMap[m] = { spending: 0, savings: 0, orders: 0 };
  });

  const categoryMap: Record<string, { count: number; amount: number }> = {};
  const statusMap: Record<string, number> = {
    Delivered: 0,
    "Shipped / In Transit": 0,
    Processing: 0,
    Cancelled: 0,
  };

  const paymentMap: Record<string, { count: number; amount: number }> = {};

  orders.forEach((ord) => {
    const amt = Number(ord.totalAmount ?? 0);
    const st = (ord.orderStatus || "processing").toLowerCase();

    if (st !== "cancelled") {
      totalSpent += amt;
    }

    if (st === "delivered" || st === "completed") {
      deliveredCount++;
      statusMap.Delivered++;
    } else if (st === "shipped") {
      inTransitCount++;
      statusMap["Shipped / In Transit"]++;
    } else if (st === "cancelled") {
      statusMap.Cancelled++;
    } else {
      processingCount++;
      statusMap.Processing++;
    }

    // Payment method
    const pm = (ord.paymentMethod || "COD").toUpperCase();
    if (!paymentMap[pm]) paymentMap[pm] = { count: 0, amount: 0 };
    paymentMap[pm].count++;
    paymentMap[pm].amount += amt;

    let orderSavings = 0;
    // Items & Savings from database prices
    if (Array.isArray(ord.items)) {
      ord.items.forEach((item) => {
        const itemPrice = Number(item.price ?? 0);
        const qty = Number(item.quantity ?? 1);
        const prod = typeof item.productId === "object" ? item.productId : null;
        const origPrice = Number(prod?.originalPrice ?? itemPrice);
        const diff = Math.max(0, origPrice - itemPrice) * qty;
        totalSaved += diff;
        orderSavings += diff;

        const catName = prod?.categoryId?.name || prod?.category?.name || "Electronics";
        if (!categoryMap[catName]) categoryMap[catName] = { count: 0, amount: 0 };
        categoryMap[catName].count += qty;
        categoryMap[catName].amount += itemPrice * qty;
      });
    }

    // Monthly breakdown
    if (ord.createdAt) {
      const d = new Date(ord.createdAt);
      if (!isNaN(d.getTime())) {
        const m = MONTH_NAMES[d.getMonth()];
        if (spendingMap[m]) {
          spendingMap[m].spending += amt;
          spendingMap[m].savings += orderSavings;
          spendingMap[m].orders += 1;
        }
      }
    }
  });

  // Calculate Reward points: user.points from db or 1 pt per dollar spent
  const rewardPoints = user?.points !== undefined && user?.points !== null ? Number(user.points) : Math.floor(totalSpent);
  const membershipTier =
    rewardPoints >= 10000
      ? "Diamond Tier"
      : rewardPoints >= 4000
      ? "Platinum Tier"
      : rewardPoints >= 1000
      ? "Gold Tier"
      : "Silver Tier";

  // Spending data (Graph 1)
  const spendingData: SpendingDataPoint[] = monthList.map((m) => {
    const val = spendingMap[m];
    return {
      month: m,
      amount: Math.round(val.spending),
      orders: val.orders,
    };
  });

  // Spending vs Savings (Graph 2) - strictly real database savings
  const spendingVsSavingsData: CustomerSpendingVsSavings[] = monthList.map((m) => {
    const val = spendingMap[m];
    return {
      month: m,
      spending: Math.round(val.spending),
      savings: Math.round(val.savings),
      orders: val.orders,
    };
  });

  // Category Purchase Breakdown (Graph 3)
  const totalCatAmount = Object.values(categoryMap).reduce((acc, curr) => acc + curr.amount, 0);
  let categoryData: CategoryPurchaseData[] = totalCatAmount > 0
    ? Object.entries(categoryMap).map(([name, item], idx) => ({
        name,
        value: Math.round((item.amount / totalCatAmount) * 100),
        amount: item.amount,
        color: PALETTE[idx % PALETTE.length],
      }))
    : [];

  // Order Status Distribution (Graph 4)
  const totalOrders = orders.length || 1;
  const orderStatusData: CustomerOrderStatusItem[] = [
    { name: "Delivered", value: Math.round((deliveredCount / totalOrders) * 100), color: "#10b981" },
    { name: "Shipped / In Transit", value: Math.round((inTransitCount / totalOrders) * 100), color: "#0284c7" },
    { name: "Processing", value: Math.round((processingCount / totalOrders) * 100), color: "#6366f1" },
  ].filter((s) => s.value > 0);

  // Payment Method Data (Graph 5)
  const totalPmCount = Object.values(paymentMap).reduce((acc, curr) => acc + curr.count, 0);
  let paymentMethodData: CustomerPaymentMethodItem[] = totalPmCount > 0
    ? Object.entries(paymentMap).map(([name, item], idx) => ({
        name,
        value: Math.round((item.count / totalPmCount) * 100),
        count: item.count,
        amount: item.amount,
        color: PALETTE[idx % PALETTE.length],
      }))
    : [];

  // Stat Cards
  const stats: Array<{
    title: string;
    value: string;
    change: string;
    isPositive: boolean;
    iconName: "DollarSign" | "ShoppingBag" | "Heart" | "Sparkles";
  }> = [
    {
      title: "Total Orders",
      value: `${orders.length} Orders`,
      change: inTransitCount > 0 ? `+${inTransitCount} active in transit` : `${deliveredCount} delivered safely`,
      isPositive: true,
      iconName: "ShoppingBag",
    },
    {
      title: "Total Spent",
      value: `$${totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: totalSaved > 0 ? `Saved $${totalSaved.toFixed(2)} with deals` : "No promotions applied",
      isPositive: true,
      iconName: "DollarSign",
    },
    {
      title: "Wishlist Items",
      value: `${wishlist.length} Items`,
      change: wishlist.length > 0 ? `${wishlist.length} saved product(s)` : "Your wishlist is empty",
      isPositive: true,
      iconName: "Heart",
    },
    {
      title: "Reward Points",
      value: `${rewardPoints.toLocaleString()} pts`,
      change: membershipTier,
      isPositive: true,
      iconName: "Sparkles",
    },
  ];

  return {
    stats,
    spendingData,
    spendingVsSavingsData,
    categoryData,
    orderStatusData,
    paymentMethodData,
    totalSpent,
    totalSaved,
    rewardPoints,
    membershipTier,
  };
}
