/**
 * CSV Export Utility for Electro Dashboard Overview Pages
 * 
 * This module handles data transformation, sanitization, and export to CSV format.
 * Features:
 * - Proper escaping of commas, quotes, and newlines to prevent CSV malformation/breakage.
 * - UTF-8 Byte Order Mark (BOM: \uFEFF) support for seamless compatibility with Microsoft Excel,
 *   Apple Numbers, and Google Sheets.
 * - Structured multi-section CSV formatting for Stat Cards, Graphs/Charts, and Tables.
 */

/**
 * Escapes and sanitizes a single cell value for CSV format.
 * Handles null, undefined, strings containing quotes, commas, newlines, etc.
 *
 * @param value - Any raw cell value (string, number, boolean, null, undefined)
 * @returns Formatted CSV safe string
 */
export function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const str = String(value);

  // If the string contains double quotes, commas, or newlines, wrap in quotes and escape quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  // If it's a simple alphanumeric or numeric string, quote it if it starts with special characters
  return `"${str}"`;
}

/**
 * Converts a 2D array of rows into a sanitized CSV string.
 *
 * @param rows - 2D array representing CSV rows and columns
 * @returns Properly delimited CSV text
 */
export function buildCsvString(rows: (string | number | boolean | null | undefined)[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

/**
 * Triggers a browser download for the generated CSV text.
 * Prepends UTF-8 BOM to guarantee proper Unicode character rendering in Excel/Spreadsheet applications.
 *
 * @param csvContent - The raw CSV string
 * @param filename - The filename for the downloaded file (e.g. "admin_overview.csv")
 */
export function triggerCsvDownload(csvContent: string, filename: string): void {
  // UTF-8 Byte Order Mark (BOM) prevents character encoding issues in Excel
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN OVERVIEW CSV EXPORTER
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminOverviewExportData {
  timeframe?: string;
  stats: Array<{
    title: string;
    value: string;
    change?: string;
    isPositive?: boolean;
  }>;
  kpis: {
    avgOrderValue: number;
    deliverySuccessRate: number;
    totalProducts: number;
    totalTransactions: number;
    totalProfit?: number;
    totalCost?: number;
    profitMargin?: number;
  };
  dailyProfitData?: Array<{
    label: string;
    revenue: number;
    cost: number;
    profit: number;
    orders: number;
  }>;
  weeklyProfitData?: Array<{
    label: string;
    revenue: number;
    cost: number;
    profit: number;
    orders: number;
  }>;
  monthlyProfitData?: Array<{
    label: string;
    revenue: number;
    cost: number;
    profit: number;
    orders: number;
  }>;
  yearlyProfitData?: Array<{
    label: string;
    revenue: number;
    cost: number;
    profit: number;
    orders: number;
  }>;
  revenueData: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  categoryData: Array<{
    name: string;
    value: number;
    count?: number;
  }>;
  orderStatusData: Array<{
    name: string;
    value: number;
    count?: number;
    amount?: number;
  }>;
  paymentMethodData: Array<{
    name: string;
    value: number;
    amount: number;
    count?: number;
  }>;
  topProducts: Array<{
    id?: string;
    title: string;
    category: string;
    price?: number;
    investPrice?: number;
    unitsSold: number;
    revenue: number;
    cost?: number;
    profit?: number;
  }>;
  recentOrders: Array<{
    id: string;
    customer: string;
    email: string;
    product: string;
    amount: string;
    status: string;
    date: string;
  }>;
}

/**
 * Generates and downloads a comprehensive CSV report containing:
 * 1. Store Overview & Header Metadata
 * 2. Key Metrics, KPIs, Total Profit & Margin
 * 3. Monthly Profit & Loss Performance Analytics
 * 4. Weekly Profit & Loss Performance Analytics
 * 5. Daily Profit & Loss Performance Analytics
 * 6. Yearly Profit & Loss Performance Analytics
 * 7. Monthly Revenue & Order Volume Analytics (Graph 1)
 * 8. Category Market Share & Catalog Distribution (Graph 2)
 * 9. Order Fulfillment Pipeline (Graph 3)
 * 10. Payment Channels & Gateway Flow (Graph 4)
 * 11. Top Performing Products & Profitability Matrix
 * 12. Recent Store Orders Table
 */
export function exportAdminOverviewCsv(data: AdminOverviewExportData): void {
  const dateStr = new Date().toISOString().split("T")[0];
  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  const rows: (string | number | boolean | null | undefined)[][] = [];

  // ── SECTION 1: HEADER & METADATA ──
  rows.push(["ELECTRO E-COMMERCE - ADMIN OVERVIEW & STORE ANALYTICS REPORT"]);
  rows.push(["Generated On", timestamp]);
  rows.push(["Data Scope", "Live Real-Time Store Performance & Financial Summary"]);
  rows.push([]); // Blank separator row

  // ── SECTION 2: STAT CARDS & CORE KPIS & PROFIT/LOSS SUMMARY ──
  rows.push(["=== 1. KEY PERFORMANCE INDICATORS & FINANCIAL SUMMARY ==="]);
  rows.push(["Metric Title", "Current Value", "Trend / Note"]);
  data.stats.forEach((s) => {
    rows.push([s.title, s.value, s.change || "Live Real-Time"]);
  });
  
  // Profit & Loss Key Metrics
  if (data.kpis.totalProfit !== undefined) {
    rows.push(["Total Net Profit", `$${data.kpis.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Revenue minus Invest Cost"]);
  }
  if (data.kpis.totalCost !== undefined) {
    rows.push(["Total Invest / COGS", `$${data.kpis.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Total Product Purchase Cost"]);
  }
  if (data.kpis.profitMargin !== undefined) {
    rows.push(["Overall Profit Margin", `${data.kpis.profitMargin.toFixed(1)}%`, "Profit / Revenue Ratio"]);
  }

  // Additional Admin KPIs
  rows.push(["Average Order Value (AOV)", `$${data.kpis.avgOrderValue.toFixed(2)}`, "Live Store Metric"]);
  rows.push(["Fulfillment Success Rate", `${data.kpis.deliverySuccessRate}%`, "Completed Shipments"]);
  rows.push(["Active Catalog Products", `${data.kpis.totalProducts} items`, "In Store Inventory"]);
  rows.push(["Total Transactions Logged", `${data.kpis.totalTransactions} events`, "Payment Records"]);
  rows.push([]);

  // ── SECTION 3: MONTHLY PROFIT & LOSS BREAKDOWN ──
  rows.push(["=== 2. MONTHLY PROFIT & LOSS PERFORMANCE ==="]);
  rows.push(["Month / Period", "Gross Selling Revenue ($ USD)", "Total Invest Cost ($ USD)", "Net Profit / Loss ($ USD)", "Profit Margin (%)", "Orders Count"]);
  if (data.monthlyProfitData && data.monthlyProfitData.length > 0) {
    data.monthlyProfitData.forEach((item) => {
      const margin = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : "0.0";
      rows.push([
        item.label,
        item.revenue.toFixed(2),
        item.cost.toFixed(2),
        item.profit.toFixed(2),
        `${margin}%`,
        item.orders,
      ]);
    });
  } else {
    rows.push(["No monthly profit data available", "$0.00", "$0.00", "$0.00", "0.0%", 0]);
  }
  rows.push([]);

  // ── SECTION 4: WEEKLY PROFIT & LOSS BREAKDOWN ──
  rows.push(["=== 3. WEEKLY PROFIT & LOSS PERFORMANCE ==="]);
  rows.push(["Week Period", "Gross Selling Revenue ($ USD)", "Total Invest Cost ($ USD)", "Net Profit / Loss ($ USD)", "Profit Margin (%)", "Orders Count"]);
  if (data.weeklyProfitData && data.weeklyProfitData.length > 0) {
    data.weeklyProfitData.forEach((item) => {
      const margin = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : "0.0";
      rows.push([
        item.label,
        item.revenue.toFixed(2),
        item.cost.toFixed(2),
        item.profit.toFixed(2),
        `${margin}%`,
        item.orders,
      ]);
    });
  } else {
    rows.push(["No weekly profit data available", "$0.00", "$0.00", "$0.00", "0.0%", 0]);
  }
  rows.push([]);

  // ── SECTION 5: DAILY PROFIT & LOSS BREAKDOWN ──
  rows.push(["=== 4. DAILY PROFIT & LOSS PERFORMANCE (LAST 7 DAYS) ==="]);
  rows.push(["Date / Day", "Gross Selling Revenue ($ USD)", "Total Invest Cost ($ USD)", "Net Profit / Loss ($ USD)", "Profit Margin (%)", "Orders Count"]);
  if (data.dailyProfitData && data.dailyProfitData.length > 0) {
    data.dailyProfitData.forEach((item) => {
      const margin = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : "0.0";
      rows.push([
        item.label,
        item.revenue.toFixed(2),
        item.cost.toFixed(2),
        item.profit.toFixed(2),
        `${margin}%`,
        item.orders,
      ]);
    });
  } else {
    rows.push(["No daily profit data available", "$0.00", "$0.00", "$0.00", "0.0%", 0]);
  }
  rows.push([]);

  // ── SECTION 6: YEARLY PROFIT & LOSS BREAKDOWN ──
  rows.push(["=== 5. YEARLY PROFIT & LOSS PERFORMANCE ==="]);
  rows.push(["Year", "Gross Selling Revenue ($ USD)", "Total Invest Cost ($ USD)", "Net Profit / Loss ($ USD)", "Profit Margin (%)", "Orders Count"]);
  if (data.yearlyProfitData && data.yearlyProfitData.length > 0) {
    data.yearlyProfitData.forEach((item) => {
      const margin = item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : "0.0";
      rows.push([
        item.label,
        item.revenue.toFixed(2),
        item.cost.toFixed(2),
        item.profit.toFixed(2),
        `${margin}%`,
        item.orders,
      ]);
    });
  } else {
    rows.push(["No yearly profit data available", "$0.00", "$0.00", "$0.00", "0.0%", 0]);
  }
  rows.push([]);

  // ── SECTION 7: GRAPH 1 - MONTHLY SALES & ORDER VELOCITY ──
  rows.push(["=== 6. MONTHLY SALES REVENUE & ORDER VOLUME ==="]);
  rows.push(["Month", "Gross Revenue ($ USD)", "Orders Processed"]);
  if (data.revenueData && data.revenueData.length > 0) {
    data.revenueData.forEach((item) => {
      rows.push([item.month, item.revenue.toFixed(2), item.orders]);
    });
  } else {
    rows.push(["No monthly revenue data available", 0, 0]);
  }
  rows.push([]);

  // ── SECTION 8: GRAPH 2 - CATEGORY SHARE & CATALOG DISTRIBUTION ──
  rows.push(["=== 7. CATEGORY DISTRIBUTION & MARKET SHARE ==="]);
  rows.push(["Category Name", "Market Share (%)", "Products Count"]);
  if (data.categoryData && data.categoryData.length > 0) {
    data.categoryData.forEach((cat) => {
      rows.push([cat.name, `${cat.value}%`, cat.count ?? "N/A"]);
    });
  } else {
    rows.push(["No category data available", "0%", 0]);
  }
  rows.push([]);

  // ── SECTION 9: GRAPH 3 - ORDER FULFILLMENT PIPELINE ──
  rows.push(["=== 8. ORDER FULFILLMENT PIPELINE ==="]);
  rows.push(["Fulfillment Status", "Order Count", "Share (%)", "Total Value ($ USD)"]);
  if (data.orderStatusData && data.orderStatusData.length > 0) {
    data.orderStatusData.forEach((st) => {
      rows.push([st.name, st.count ?? 0, `${st.value}%`, `$${(st.amount ?? 0).toLocaleString()}`]);
    });
  } else {
    rows.push(["No status data available", 0, "0%", "$0"]);
  }
  rows.push([]);

  // ── SECTION 10: GRAPH 4 - PAYMENT GATEWAY FLOW ──
  rows.push(["=== 9. PAYMENT GATEWAYS & REVENUE FLOW ==="]);
  rows.push(["Payment Channel", "Volume Share (%)", "Settled Amount ($ USD)", "Transactions Count"]);
  if (data.paymentMethodData && data.paymentMethodData.length > 0) {
    data.paymentMethodData.forEach((pm) => {
      rows.push([pm.name, `${pm.value}%`, `$${pm.amount.toLocaleString()}`, pm.count ?? "N/A"]);
    });
  } else {
    rows.push(["No payment gateway data available", "0%", "$0", 0]);
  }
  rows.push([]);

  // ── SECTION 11: TOP PERFORMING PRODUCTS & PROFITABILITY MATRIX ──
  rows.push(["=== 10. TOP PERFORMING PRODUCTS & PROFITABILITY MATRIX ==="]);
  rows.push(["Rank", "Product Title", "Category", "Units Sold", "Selling Price ($)", "Invest Price ($)", "Total Revenue ($)", "Total Invest Cost ($)", "Net Profit / Loss ($)", "Profit Margin (%)"]);
  if (data.topProducts && data.topProducts.length > 0) {
    data.topProducts.forEach((p, idx) => {
      const price = p.price ?? (p.unitsSold > 0 ? p.revenue / p.unitsSold : 0);
      const investPrice = p.investPrice ?? (p.cost !== undefined && p.unitsSold > 0 ? p.cost / p.unitsSold : 0);
      const cost = p.cost ?? (investPrice * p.unitsSold);
      const profit = p.profit ?? (p.revenue - cost);
      const margin = p.revenue > 0 ? ((profit / p.revenue) * 100).toFixed(1) : "0.0";

      rows.push([
        `#${idx + 1}`,
        p.title,
        p.category,
        p.unitsSold,
        `$${price.toFixed(2)}`,
        `$${investPrice.toFixed(2)}`,
        `$${p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `$${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${margin}%`,
      ]);
    });
  } else {
    rows.push(["-", "No top products recorded", "-", 0, "$0.00", "$0.00", "$0.00", "$0.00", "$0.00", "0.0%"]);
  }
  rows.push([]);

  // ── SECTION 12: RECENT STORE ORDERS TABLE ──
  rows.push(["=== 11. RECENT STORE ORDERS TABLE ==="]);
  rows.push(["Order ID", "Customer Name", "Customer Email", "Purchased Items", "Amount", "Status", "Order Date"]);
  if (data.recentOrders && data.recentOrders.length > 0) {
    data.recentOrders.forEach((o) => {
      rows.push([o.id, o.customer, o.email, o.product, o.amount, o.status, o.date]);
    });
  } else {
    rows.push(["-", "No recent orders", "-", "-", "-", "-", "-"]);
  }

  // Build CSV and initiate download
  const csvText = buildCsvString(rows);
  triggerCsvDownload(csvText, `electro_admin_overview_${dateStr}.csv`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER OVERVIEW CSV EXPORTER
// ─────────────────────────────────────────────────────────────────────────────

export interface CustomerOverviewExportData {
  userName: string;
  membershipTier?: string;
  rewardPoints?: number;
  stats: Array<{
    title: string;
    value: string;
    change?: string;
    isPositive?: boolean;
  }>;
  spendingData: Array<{
    month: string;
    amount: number;
    orders: number;
  }>;
  categoryData: Array<{
    name: string;
    value: number;
    amount?: number;
  }>;
  spendingVsSavingsData: Array<{
    month: string;
    spending: number;
    savings: number;
  }>;
  orderStatusData: Array<{
    name: string;
    value: number;
  }>;
  paymentMethodData: Array<{
    name: string;
    value: number;
    count?: number;
  }>;
  recentOrders: Array<{
    orderNumber: string;
    date: string;
    status: string;
    total: number;
    itemCount: number;
    items?: Array<{
      name: string;
      quantity: number;
      price: number;
    }>;
    shippingAddress?: string;
  }>;
  wishlistItems: Array<{
    title: string;
    price: number;
    originalPrice?: number;
    category?: string;
    inStock?: boolean;
    addedAt?: string;
  }>;
  recentTransactions: Array<{
    id?: string;
    orderNumber: string;
    invoiceNumber?: string;
    paymentMethod: string;
    amount: number;
    status: string;
    date: string;
  }>;
}

/**
 * Generates and downloads a comprehensive CSV report containing:
 * 1. Customer Account Profile & Header Metadata
 * 2. Key Metrics & Shopping Stat Cards
 * 3. Monthly Spending Activity & Order Velocity (Graph 1)
 * 4. Category Affinity Breakdown (Graph 2)
 * 5. Monthly Spending vs Promo Savings (Graph 3)
 * 6. Order Delivery Status Distribution (Graph 4)
 * 7. Preferred Payment Methods (Graph 5)
 * 8. Recent Orders & Purchased Items Summary Table
 * 9. Wishlist Saved Products List
 * 10. Settlement & Transaction History Table
 */
export function exportCustomerOverviewCsv(data: CustomerOverviewExportData): void {
  const dateStr = new Date().toISOString().split("T")[0];
  const timestamp = new Date().toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "medium",
  });

  const rows: (string | number | boolean | null | undefined)[][] = [];

  // ── SECTION 1: HEADER & PROFILE METADATA ──
  rows.push(["ELECTRO E-COMMERCE - CUSTOMER OVERVIEW & SHOPPING REPORT"]);
  rows.push(["Account Owner", data.userName || "Customer"]);
  rows.push(["Membership Tier", data.membershipTier || "Standard Member"]);
  rows.push(["Reward Points Balance", data.rewardPoints ?? 0]);
  rows.push(["Export Date", timestamp]);
  rows.push([]); // Blank separator

  // ── SECTION 2: STAT CARDS & KEY METRICS ──
  rows.push(["=== 1. SHOPPING STAT CARDS & KEY METRICS ==="]);
  rows.push(["Metric Title", "Value", "Trend / Note"]);
  data.stats.forEach((s) => {
    rows.push([s.title, s.value, s.change || "N/A"]);
  });
  rows.push([]);

  // ── SECTION 3: GRAPH 1 - MONTHLY SPENDING ACTIVITY ──
  rows.push(["=== 2. MONTHLY SPENDING ACTIVITY & ORDER COUNT (GRAPH 1) ==="]);
  rows.push(["Month", "Net Spending ($ USD)", "Orders Placed"]);
  if (data.spendingData && data.spendingData.length > 0) {
    data.spendingData.forEach((item) => {
      rows.push([item.month, item.amount, item.orders]);
    });
  } else {
    rows.push(["No spending history recorded", 0, 0]);
  }
  rows.push([]);

  // ── SECTION 4: GRAPH 2 - CATEGORY AFFINITY ──
  rows.push(["=== 3. CATEGORY AFFINITY & PURCHASE SHARE (GRAPH 2) ==="]);
  rows.push(["Category", "Purchase Share (%)", "Estimated Amount ($ USD)"]);
  if (data.categoryData && data.categoryData.length > 0) {
    data.categoryData.forEach((c) => {
      rows.push([c.name, `${c.value}%`, c.amount ? `$${c.amount.toFixed(2)}` : "N/A"]);
    });
  } else {
    rows.push(["No category purchase data available", "0%", "$0.00"]);
  }
  rows.push([]);

  // ── SECTION 5: GRAPH 3 - SPENDING VS SAVINGS ──
  rows.push(["=== 4. MONTHLY SPENDING VS UNLOCKED SAVINGS (GRAPH 3) ==="]);
  rows.push(["Month", "Net Checkout Spend ($ USD)", "Discounts / Promo Saved ($ USD)"]);
  if (data.spendingVsSavingsData && data.spendingVsSavingsData.length > 0) {
    data.spendingVsSavingsData.forEach((item) => {
      rows.push([item.month, item.spending, item.savings]);
    });
  } else {
    rows.push(["No spending vs savings data", 0, 0]);
  }
  rows.push([]);

  // ── SECTION 6: GRAPH 4 - ORDER DELIVERY JOURNEY ──
  rows.push(["=== 5. ORDER DELIVERY JOURNEY & STATUS SHARE (GRAPH 4) ==="]);
  rows.push(["Delivery Status", "Share (%)"]);
  if (data.orderStatusData && data.orderStatusData.length > 0) {
    data.orderStatusData.forEach((st) => {
      rows.push([st.name, `${st.value}%`]);
    });
  } else {
    rows.push(["No delivery status data", "0%"]);
  }
  rows.push([]);

  // ── SECTION 7: GRAPH 5 - PREFERRED PAYMENT CHANNELS ──
  rows.push(["=== 6. PREFERRED PAYMENT METHODS (GRAPH 5) ==="]);
  rows.push(["Payment Channel", "Usage Share (%)", "Transactions Count"]);
  if (data.paymentMethodData && data.paymentMethodData.length > 0) {
    data.paymentMethodData.forEach((pm) => {
      rows.push([pm.name, `${pm.value}%`, pm.count ?? "N/A"]);
    });
  } else {
    rows.push(["No payment method data", "0%", 0]);
  }
  rows.push([]);

  // ── SECTION 8: RECENT ORDERS TABLE ──
  rows.push(["=== 7. RECENT ORDERS & ITEM DETAILS TABLE ==="]);
  rows.push(["Order Number", "Date", "Status", "Total Amount ($ USD)", "Items Count", "Items Summary", "Shipping Address"]);
  if (data.recentOrders && data.recentOrders.length > 0) {
    data.recentOrders.forEach((order) => {
      const itemsSummary = (order.items || [])
        .map((it) => `${it.name} (Qty: ${it.quantity}, $${it.price.toFixed(2)})`)
        .join("; ");
      rows.push([
        order.orderNumber,
        order.date,
        order.status,
        `$${order.total.toFixed(2)}`,
        order.itemCount,
        itemsSummary || "N/A",
        order.shippingAddress || "N/A",
      ]);
    });
  } else {
    rows.push(["-", "No recent orders", "-", "$0.00", 0, "-", "-"]);
  }
  rows.push([]);

  // ── SECTION 9: WISHLIST ITEMS ──
  rows.push(["=== 8. SAVED WISHLIST ITEMS ==="]);
  rows.push(["Product Title", "Category", "Current Price ($ USD)", "Original Price ($ USD)", "Availability", "Date Added"]);
  if (data.wishlistItems && data.wishlistItems.length > 0) {
    data.wishlistItems.forEach((w) => {
      rows.push([
        w.title,
        w.category || "Electronics",
        `$${w.price.toFixed(2)}`,
        w.originalPrice ? `$${w.originalPrice.toFixed(2)}` : "N/A",
        w.inStock === false ? "Out of Stock" : "In Stock",
        w.addedAt || "Recent",
      ]);
    });
  } else {
    rows.push(["No wishlist items saved", "-", "$0.00", "-", "-", "-"]);
  }
  rows.push([]);

  // ── SECTION 10: RECENT TRANSACTIONS / SETTLEMENTS ──
  rows.push(["=== 9. RECENT SETTLEMENTS & TRANSACTIONS TABLE ==="]);
  rows.push(["Invoice Number", "Order Reference", "Payment Method", "Settled Amount ($ USD)", "Transaction Status", "Date"]);
  if (data.recentTransactions && data.recentTransactions.length > 0) {
    data.recentTransactions.forEach((tx) => {
      rows.push([
        tx.invoiceNumber || "N/A",
        tx.orderNumber,
        tx.paymentMethod,
        `$${tx.amount.toFixed(2)}`,
        tx.status,
        tx.date,
      ]);
    });
  } else {
    rows.push(["-", "No transactions logged", "-", "$0.00", "-", "-"]);
  }

  // Build CSV and initiate download
  const csvText = buildCsvString(rows);
  triggerCsvDownload(csvText, `Customer_Shopping_Report_${dateStr}.csv`);
}
