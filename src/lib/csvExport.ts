/**
 * CSV export for the dashboard overview pages.
 *
 * The output is written for a human opening the file in Excel / Numbers / Sheets:
 * - every section is a normal table: a heading, a header row, then data rows
 * - numbers are written as numbers (no quotes, no "$" inside the cell) so totals,
 *   sorting and charts work straight away; the unit lives in the column header
 * - charts are exported as their own clearly labelled block of numbers, because a
 *   CSV file is plain text and cannot hold a picture
 * - UTF-8 BOM so Excel shows non-ASCII characters (৳, ₹, é) correctly
 */

export type CsvValue = string | number | boolean | null | undefined;

/** Rounds money/percentages to 2 decimals and keeps them as real numbers. */
export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/**
 * Turns one value into a CSV cell.
 * Only quotes what actually needs quoting, so numbers survive as numbers.
 */
export function escapeCsvCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";

  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n") || text.includes("\r")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** Joins a 2D array of rows into CSV text. */
export function buildCsvString(rows: CsvValue[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}

/** Downloads CSV text in the browser. */
export function triggerCsvDownload(csvContent: string, filename: string): void {
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
// SECTIONED REPORT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

export interface CsvSection {
  /** Heading printed above the table, e.g. "Monthly revenue & orders". */
  title: string;
  /** Optional one-line explanation, e.g. "Chart data - select these columns to insert a chart". */
  note?: string;
  columns: string[];
  rows: CsvValue[][];
}

/** Text used under every chart block so the reader knows what to do with it. */
export const CHART_NOTE =
  "Chart data - select the table below and insert a chart in your spreadsheet to rebuild this graph.";

export interface ExportOptions {
  siteName?: string;
  /** ISO currency code used in column headers, e.g. "USD" or "BDT". */
  currency?: string;
}

/**
 * Builds the final CSV text:
 *   header block (report name + generated on + currency)
 *   blank line
 *   section 1..N, each separated by a blank line
 */
export function buildReportCsv(header: CsvValue[][], sections: CsvSection[]): string {
  const lines: string[] = [];
  const writeRow = (row: CsvValue[]) => lines.push(row.map(escapeCsvCell).join(","));

  header.forEach(writeRow);
  lines.push("");

  sections.forEach((section, index) => {
    writeRow([`${index + 1}. ${section.title}`]);
    if (section.note) writeRow([section.note]);

    writeRow(section.columns);
    if (section.rows.length === 0) {
      writeRow(["No data"]);
    } else {
      section.rows.forEach(writeRow);
    }

    lines.push("");
  });

  return `${lines.join("\r\n").trimEnd()}\r\n`;
}

function reportHeader(title: string, extraRows: CsvValue[][]): CsvValue[][] {
  const generatedOn = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return [[title], ["Generated on", generatedOn], ...extraRows];
}

function downloadName(siteName: string, reportName: string): string {
  const date = new Date().toISOString().split("T")[0];
  const site = siteName.trim().replace(/\s+/g, "_");
  return `${site}_${reportName}_${date}.csv`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN OVERVIEW
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
    grossProfit?: number;
    riderFeesPaid?: number;
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
    /** Loyalty points this order used up, and the points it will pay out. */
    pointsRedeemed?: number;
    pointsEarned?: number;
  }>;
}

/** Builds and downloads the admin overview CSV report. */
export function exportAdminOverviewCsv(
  data: AdminOverviewExportData,
  options: ExportOptions = {}
): void {
  const siteName = options.siteName || "Sparq";
  const currency = (options.currency || "USD").toUpperCase();

  // 1. Headline metric cards (values already formatted for display).
  const headlineRows: CsvValue[][] = data.stats.map((stat) => [
    stat.title,
    stat.value,
    stat.change || "",
  ]);

  // 2. Numeric financial indicators.
  const indicatorRows: CsvValue[][] = [
    ["Average order value", round2(data.kpis.avgOrderValue), `in ${currency}`],
    ["Fulfillment success rate", round2(data.kpis.deliverySuccessRate), "% of orders delivered"],
    ["Products in catalog", data.kpis.totalProducts, ""],
    ["Transactions logged", data.kpis.totalTransactions, ""],
  ];
  if (data.kpis.totalProfit !== undefined) {
    indicatorRows.push(["Total net profit", round2(data.kpis.totalProfit), "Revenue minus cost and rider fees"]);
  }
  if (data.kpis.totalCost !== undefined) {
    indicatorRows.push(["Total cost of goods", round2(data.kpis.totalCost), "Purchase cost"]);
  }
  // Rider fees are not a goods cost, so they get their own line: the store can
  // see what the parcels cost to move and that it came off the profit it kept.
  if (data.kpis.grossProfit !== undefined) {
    indicatorRows.push(["Gross profit", round2(data.kpis.grossProfit), "Before rider fees"]);
  }
  if (data.kpis.riderFeesPaid !== undefined) {
    indicatorRows.push([
      "Rider fees paid",
      round2(data.kpis.riderFeesPaid),
      `Paid for delivered jobs, taken off net profit (${currency})`,
    ]);
  }
  if (data.kpis.profitMargin !== undefined) {
    indicatorRows.push(["Overall profit margin", round2(data.kpis.profitMargin), "% of revenue"]);
  }

  // 3. Every profit period in one table instead of four near-identical tables.
  const profitRows: CsvValue[][] = [];
  const addProfitPeriod = (scope: string, points?: AdminOverviewExportData["monthlyProfitData"]) => {
    (points || []).forEach((point) => {
      profitRows.push([
        scope,
        point.label,
        round2(point.revenue),
        round2(point.cost),
        round2(point.profit),
        point.revenue > 0 ? round2((point.profit / point.revenue) * 100) : 0,
        point.orders,
      ]);
    });
  };
  addProfitPeriod("Monthly", data.monthlyProfitData);
  addProfitPeriod("Weekly", data.weeklyProfitData);
  addProfitPeriod("Daily", data.dailyProfitData);
  addProfitPeriod("Yearly", data.yearlyProfitData);

  // 4. Chart blocks.
  const revenueRows: CsvValue[][] = data.revenueData.map((point) => [
    point.month,
    round2(point.revenue),
    point.orders,
  ]);

  const categoryRows: CsvValue[][] = data.categoryData.map((item) => [
    item.name,
    round2(item.value),
    item.count ?? 0,
  ]);

  const statusRows: CsvValue[][] = data.orderStatusData.map((item) => [
    item.name,
    item.count ?? 0,
    round2(item.value),
    round2(item.amount ?? 0),
  ]);

  const paymentRows: CsvValue[][] = data.paymentMethodData.map((item) => [
    item.name,
    round2(item.value),
    round2(item.amount),
    item.count ?? 0,
  ]);

  // 5. Tables.
  const productRows: CsvValue[][] = data.topProducts.map((product, index) => {
    const units = product.unitsSold || 0;
    const price = product.price ?? (units > 0 ? product.revenue / units : 0);
    const cost = product.cost ?? (product.investPrice ?? 0) * units;
    const profit = product.profit ?? product.revenue - cost;

    return [
      index + 1,
      product.title,
      product.category,
      units,
      round2(price),
      round2(units > 0 ? cost / units : 0),
      round2(product.revenue),
      round2(profit),
      product.revenue > 0 ? round2((profit / product.revenue) * 100) : 0,
    ];
  });

  const orderRows: CsvValue[][] = data.recentOrders.map((order) => [
    order.id,
    order.customer,
    order.email,
    order.product,
    order.amount,
    order.status,
    order.date,
  ]);

  const sections: CsvSection[] = [
    {
      title: "Headline metrics",
      columns: ["Metric", "Value", "Change"],
      rows: headlineRows,
    },
    {
      title: "Financial indicators",
      columns: ["Metric", `Value`, "Note"],
      rows: indicatorRows,
    },
    {
      title: "Profit and loss by period",
      columns: [
        "Scope",
        "Period",
        `Revenue (${currency})`,
        `Cost (${currency})`,
        `Profit (${currency})`,
        "Margin (%)",
        "Orders",
      ],
      rows: profitRows,
    },
    {
      title: "Monthly revenue and orders",
      note: CHART_NOTE,
      columns: ["Month", `Revenue (${currency})`, "Orders"],
      rows: revenueRows,
    },
    {
      title: "Category distribution",
      note: CHART_NOTE,
      columns: ["Category", "Share (%)", "Products"],
      rows: categoryRows,
    },
    {
      title: "Order fulfillment pipeline",
      note: CHART_NOTE,
      columns: ["Status", "Orders", "Share (%)", `Value (${currency})`],
      rows: statusRows,
    },
    {
      title: "Payment channels",
      note: CHART_NOTE,
      columns: ["Method", "Share (%)", `Amount (${currency})`, "Transactions"],
      rows: paymentRows,
    },
    {
      title: "Top performing products",
      columns: [
        "Rank",
        "Product",
        "Category",
        "Units sold",
        `Price (${currency})`,
        `Cost per unit (${currency})`,
        `Revenue (${currency})`,
        `Profit (${currency})`,
        "Margin (%)",
      ],
      rows: productRows,
    },
    {
      title: "Recent orders",
      columns: ["Order", "Customer", "Email", "Items", "Amount", "Status", "Date"],
      rows: orderRows,
    },
  ];

  const csv = buildReportCsv(
    reportHeader(`${siteName} - Admin Overview Report`, [["Currency", currency]]),
    sections
  );

  triggerCsvDownload(csv, downloadName(siteName, "admin_overview"));
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER OVERVIEW
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
    /** Loyalty points this order used up, and the money they saved. */
    pointsRedeemed?: number;
    pointsDiscount?: number;
    /** Points this order will pay out once it is delivered. */
    pointsEarned?: number;
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

/** Builds and downloads the customer overview CSV report. */
export function exportCustomerOverviewCsv(
  data: CustomerOverviewExportData,
  options: ExportOptions = {}
): void {
  const siteName = options.siteName || "Sparq";
  const currency = (options.currency || "USD").toUpperCase();

  const statRows: CsvValue[][] = data.stats.map((stat) => [
    stat.title,
    stat.value,
    stat.change || "",
  ]);

  const spendingRows: CsvValue[][] = data.spendingData.map((item) => [
    item.month,
    round2(item.amount),
    item.orders,
  ]);

  const categoryRows: CsvValue[][] = data.categoryData.map((item) => [
    item.name,
    round2(item.value),
    round2(item.amount ?? 0),
  ]);

  const savingsRows: CsvValue[][] = data.spendingVsSavingsData.map((item) => [
    item.month,
    round2(item.spending),
    round2(item.savings),
  ]);

  const statusRows: CsvValue[][] = data.orderStatusData.map((item) => [
    item.name,
    round2(item.value),
  ]);

  const paymentRows: CsvValue[][] = data.paymentMethodData.map((item) => [
    item.name,
    round2(item.value),
    item.count ?? 0,
  ]);

  const orderRows: CsvValue[][] = data.recentOrders.map((order) => {
    const itemList = (order.items || [])
      .map((item) => `${item.name} x${item.quantity} @ ${round2(item.price)}`)
      .join(" | ");

    return [
      order.orderNumber,
      order.date,
      order.status,
      round2(order.total),
      order.pointsRedeemed ?? 0,
      round2(order.pointsDiscount ?? 0),
      order.pointsEarned ?? 0,
      order.itemCount,
      itemList,
      order.shippingAddress || "",
    ];
  });

  const wishlistRows: CsvValue[][] = data.wishlistItems.map((item) => [
    item.title,
    item.category || "",
    round2(item.price),
    item.originalPrice ? round2(item.originalPrice) : "",
    item.inStock === false ? "Out of stock" : "In stock",
    item.addedAt || "",
  ]);

  const transactionRows: CsvValue[][] = data.recentTransactions.map((item) => [
    item.invoiceNumber || "",
    item.orderNumber,
    item.paymentMethod,
    round2(item.amount),
    item.status,
    item.date,
  ]);

  const sections: CsvSection[] = [
    {
      title: "Shopping summary",
      columns: ["Metric", "Value", "Change"],
      rows: statRows,
    },
    {
      title: "Spending by month",
      note: CHART_NOTE,
      columns: ["Month", `Spending (${currency})`, "Orders"],
      rows: spendingRows,
    },
    {
      title: "Category affinity",
      note: CHART_NOTE,
      columns: ["Category", "Share (%)", `Amount (${currency})`],
      rows: categoryRows,
    },
    {
      title: "Spending versus savings",
      note: CHART_NOTE,
      columns: ["Month", `Spending (${currency})`, `Saved (${currency})`],
      rows: savingsRows,
    },
    {
      title: "Delivery status",
      note: CHART_NOTE,
      columns: ["Status", "Share (%)"],
      rows: statusRows,
    },
    {
      title: "Payment methods",
      note: CHART_NOTE,
      columns: ["Method", "Share (%)", "Transactions"],
      rows: paymentRows,
    },
    {
      title: "Recent orders",
      columns: [
        "Order",
        "Date",
        "Status",
        `Total (${currency})`,
        "Points used",
        `Points saved (${currency})`,
        "Points earned",
        "Items",
        "Item details",
        "Shipping address",
      ],
      rows: orderRows,
    },
    {
      title: "Wishlist",
      columns: [
        "Product",
        "Category",
        `Price (${currency})`,
        `Original price (${currency})`,
        "Availability",
        "Added",
      ],
      rows: wishlistRows,
    },
    {
      title: "Transactions",
      columns: [
        "Invoice",
        "Order",
        "Method",
        `Amount (${currency})`,
        "Status",
        "Date",
      ],
      rows: transactionRows,
    },
  ];

  const csv = buildReportCsv(
    reportHeader(`${siteName} - Customer Overview Report`, [
      ["Account", data.userName || "Customer"],
      ["Membership tier", data.membershipTier || ""],
      ["Reward points", data.rewardPoints ?? 0],
      ["Currency", currency],
    ]),
    sections
  );

  triggerCsvDownload(csv, downloadName(siteName, "customer_overview"));
}

// ─────────────────────────────────────────────────────────────────────────────
// RIDER OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export interface RiderOverviewExportData {
  riderName?: string;
  rangeDays?: number;
  stats: Array<{
    title: string;
    value: string;
    change?: string;
  }>;
  series: Array<{
    date: string;
    delivered: number;
    cancelled: number;
    earnings: number;
  }>;
  statusCounts: Record<string, number>;
  recent: Array<{
    orderNumber: string;
    customerName: string;
    city: string;
    fee: number;
    status: string;
    updatedAt: string;
  }>;
}

/** Builds and downloads the rider's own overview CSV report. */
export function exportRiderOverviewCsv(
  data: RiderOverviewExportData,
  options: ExportOptions = {}
): void {
  const siteName = options.siteName || "Sparq";
  const currency = (options.currency || "USD").toUpperCase();

  const statRows: CsvValue[][] = data.stats.map((stat) => [
    stat.title,
    stat.value,
    stat.change || "",
  ]);

  const seriesRows: CsvValue[][] = data.series.map((point) => [
    point.date,
    point.delivered,
    point.cancelled,
    round2(point.earnings),
  ]);

  const statusRows: CsvValue[][] = Object.entries(data.statusCounts).map(([status, count]) => [
    status.replace(/_/g, " "),
    count,
  ]);

  const recentRows: CsvValue[][] = data.recent.map((delivery) => [
    delivery.orderNumber,
    delivery.customerName,
    delivery.city,
    round2(delivery.fee),
    delivery.status.replace(/_/g, " "),
    delivery.updatedAt,
  ]);

  const sections: CsvSection[] = [
    {
      title: "Performance summary",
      columns: ["Metric", "Value", "Note"],
      rows: statRows,
    },
    {
      title: "Daily activity",
      note: CHART_NOTE,
      columns: [
        "Date",
        "Delivered",
        "Cancelled",
        `Earnings (${currency})`,
      ],
      rows: seriesRows,
    },
    {
      title: "Delivery pipeline",
      note: CHART_NOTE,
      columns: ["Stage", "Jobs"],
      rows: statusRows,
    },
    {
      title: "Recent deliveries",
      columns: [
        "Order",
        "Customer",
        "City",
        `Fee (${currency})`,
        "Status",
        "Last update",
      ],
      rows: recentRows,
    },
  ];

  const csv = buildReportCsv(
    reportHeader(`${siteName} - Rider Overview Report`, [
      ["Rider", data.riderName || "Rider"],
      ["Charted days", data.rangeDays ?? 0],
      ["Currency", currency],
    ]),
    sections
  );

  triggerCsvDownload(csv, downloadName(siteName, "rider_overview"));
}

// ─────────────────────────────────────────────────────────────────────────────
// TOP SELLING PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

export interface TopSellingExportItem {
  title: string;
  category: string;
  price: number;
  investPrice?: number;
  unitsSold: number;
  revenue: number;
  cost: number;
  profit: number;
}

export interface TopSellingExportData {
  period: "daily" | "weekly" | "monthly" | "yearly";
  metric: "units" | "earnings";
  daily: TopSellingExportItem[];
  weekly: TopSellingExportItem[];
  monthly: TopSellingExportItem[];
  yearly: TopSellingExportItem[];
}

const TOP_SELLING_COLUMNS = (currency: string) => [
  "Rank",
  "Product",
  "Category",
  `Unit price (${currency})`,
  `Cost per unit (${currency})`,
  "Units sold",
  `Revenue (${currency})`,
  `Cost (${currency})`,
  `Profit (${currency})`,
  "Margin (%)",
];

function topSellingRows(items: TopSellingExportItem[]): CsvValue[][] {
  return items.map((item, index) => [
    index + 1,
    item.title,
    item.category,
    round2(item.price ?? 0),
    round2(item.investPrice ?? 0),
    item.unitsSold,
    round2(item.revenue),
    round2(item.cost),
    round2(item.profit),
    item.revenue > 0 ? round2((item.profit / item.revenue) * 100) : 0,
  ]);
}

/** Builds and downloads the top-selling products CSV (all four periods). */
export function exportTopSellingCsv(
  data: TopSellingExportData,
  options: ExportOptions = {}
): void {
  const siteName = options.siteName || "Sparq";
  const currency = (options.currency || "USD").toUpperCase();
  const columns = TOP_SELLING_COLUMNS(currency);

  const sections: CsvSection[] = [
    { title: "Daily - last 24 hours", columns, rows: topSellingRows(data.daily) },
    { title: "Weekly - last 7 days", columns, rows: topSellingRows(data.weekly) },
    { title: "Monthly - last 30 days", columns, rows: topSellingRows(data.monthly) },
    { title: "Yearly - last 365 days", columns, rows: topSellingRows(data.yearly) },
  ];

  const csv = buildReportCsv(
    reportHeader(`${siteName} - Top Selling Products Report`, [
      ["Active period", data.period.toUpperCase()],
      ["Sorted by", data.metric === "units" ? "Units sold" : "Earnings"],
      ["Currency", currency],
    ]),
    sections
  );

  triggerCsvDownload(csv, downloadName(siteName, "top_selling_products"));
}

// ─────────────────────────────────────────────────────────────────────────────
// VENDOR SALES REPORT
// ─────────────────────────────────────────────────────────────────────────────

export interface VendorAnalyticsExportData {
  vendorName?: string;
  planName?: string;
  /** The window the API actually used, which is the request capped by the plan. */
  rangeDays: number;
  monthly: boolean;
  totals: {
    revenue: number;
    orders: number;
    units: number;
    avgOrderValue: number;
    inFlight: number;
    commission: number;
    commissionTaken: number;
    netPayout: number;
    fulfilmentRate: number;
    stopped: number;
    placed: number;
  };
  previous: { revenue: number; orders: number; revenueChange: number | null };
  series: Array<{ label: string; revenue: number; orders: number }>;
  statusCounts: Record<string, number>;
  topProducts: Array<{ title: string; units: number; revenue: number }>;
  recent: Array<{
    orderNumber: string;
    status: string;
    subtotal: number;
    units: number;
    city: string;
    placedAt: string;
  }>;
  /**
   * A plan with `limited` exports gets the numbers behind the charts only. The
   * per-product and per-order tables are the part the higher plans pay for.
   */
  full: boolean;
}

/** Builds and downloads one seller's own sales report. */
export function exportVendorAnalyticsCsv(
  data: VendorAnalyticsExportData,
  options: ExportOptions = {}
): void {
  const siteName = options.siteName || "Sparq";
  const currency = (options.currency || "USD").toUpperCase();
  const periodLabel = data.monthly ? "Months" : "Days";

  const totalRows: CsvValue[][] = [
    ["Revenue earned (delivered)", round2(data.totals.revenue), `in ${currency}`],
    ["Delivered orders", data.totals.orders, ""],
    ["Units sold", data.totals.units, ""],
    ["Average order value", round2(data.totals.avgOrderValue), `in ${currency}`],
    ["Value still on the way", round2(data.totals.inFlight), `in ${currency}`],
    ["Platform commission", round2(data.totals.commission), "% of earned revenue"],
    ["Commission taken", round2(data.totals.commissionTaken), `in ${currency}`],
    ["Net payout", round2(data.totals.netPayout), `in ${currency}`],
    ["Fulfilment rate", round2(data.totals.fulfilmentRate), "% of closed orders"],
    ["Rejected or cancelled", data.totals.stopped, ""],
    ["Orders placed in window", data.totals.placed, ""],
    ["Previous window revenue", round2(data.previous.revenue), `in ${currency}`],
    ["Revenue change", data.previous.revenueChange === null ? "" : round2(data.previous.revenueChange), "%"],
  ];

  const seriesRows: CsvValue[][] = data.series.map((point) => [
    point.label,
    round2(point.revenue),
    point.orders,
  ]);

  const statusRows: CsvValue[][] = Object.entries(data.statusCounts).map(([status, count]) => [
    status.replace(/_/g, " "),
    count,
  ]);

  const sections: CsvSection[] = [
    {
      title: "Sales summary",
      columns: ["Metric", "Value", "Note"],
      rows: totalRows,
    },
    {
      title: `Revenue by ${periodLabel.toLowerCase()}`,
      note: CHART_NOTE,
      columns: [periodLabel.slice(0, -1), `Revenue (${currency})`, "Delivered orders"],
      rows: seriesRows,
    },
    {
      title: "Order pipeline",
      note: CHART_NOTE,
      columns: ["Stage", "Orders"],
      rows: statusRows,
    },
  ];

  if (data.full) {
    sections.push({
      title: "Top products",
      columns: ["Rank", "Product", "Units sold", `Revenue (${currency})`],
      rows: data.topProducts.map((product, index) => [
        index + 1,
        product.title,
        product.units,
        round2(product.revenue),
      ]),
    });

    sections.push({
      title: "Recent orders",
      columns: [
        "Order",
        "Stage",
        `Subtotal (${currency})`,
        "Units",
        "City",
        "Placed",
      ],
      rows: data.recent.map((order) => [
        order.orderNumber,
        order.status.replace(/_/g, " "),
        round2(order.subtotal),
        order.units,
        order.city,
        order.placedAt,
      ]),
    });
  }

  const headerRows: CsvValue[][] = [
    ["Store", data.vendorName || "Store"],
    ["Plan", data.planName || ""],
    ["Window (days)", data.rangeDays],
    ["Currency", currency],
  ];
  if (!data.full) {
    headerRows.push([
      "Export level",
      "Summary only - the product and order tables need a plan with full exports",
    ]);
  }

  const csv = buildReportCsv(
    reportHeader(`${siteName} - Vendor Sales Report`, headerRows),
    sections
  );

  triggerCsvDownload(csv, downloadName(siteName, "vendor_sales_report"));
}

// ─────────────────────────────────────────────────────────────────────────────
// RIDER PAYOUTS
// ─────────────────────────────────────────────────────────────────────────────

export interface PayoutsExportData {
  /** "Last 30 days", "All time" — the window the board was showing. */
  rangeLabel: string;
  /** Set when the store filtered the board down to one rider. */
  riderName?: string;
  totals: {
    jobs: number;
    paid: number;
    sales: number;
    feeSharePct: number;
    avgPerJob: number;
    paidThisMonth: number;
    monthJobs: number;
  };
  outstanding: { jobs: number; amount: number };
  series: Array<{ label: string; jobs: number; paid: number; sales: number }>;
  byRider: Array<{ name: string; jobs: number; paid: number; lastAt?: string | null }>;
  records: Array<{
    orderNumber: string;
    riderName: string;
    city: string;
    items: number;
    orderTotal: number;
    fee: number;
    deliveredAt?: string | null;
    paidVia: string;
  }>;
  /** Said out loud because a filtered export is not the whole ledger. */
  recordNote?: string;
}

/**
 * The store's payout record as a spreadsheet.
 *
 * The graph is exported as its own numbered block, the way every other report
 * here does it, and the row list carries each fee against the sale it came out
 * of, so an accountant can check the deduction without asking the store what a
 * number means.
 */
export function exportPayoutsCsv(data: PayoutsExportData, options: ExportOptions = {}): void {
  const siteName = options.siteName || "Sparq";
  const currency = (options.currency || "USD").toUpperCase();

  const totalRows: CsvValue[][] = [
    ["Delivered jobs that paid a rider", round2(data.totals.jobs), ""],
    ["Rider fees paid", round2(data.totals.paid), `Currency ${currency}`],
    ["Delivered sales they came out of", round2(data.totals.sales), currency],
    [
      "Share of those sales paid to riders",
      round2(data.totals.feeSharePct),
      "% - this is the money off the profit",
    ],
    ["Average fee per job", round2(data.totals.avgPerJob), currency],
    ["Paid this month", round2(data.totals.paidThisMonth), `${data.totals.monthJobs} jobs`],
    [
      "Still owed on jobs on the road",
      round2(data.outstanding.amount),
      `${data.outstanding.jobs} jobs - promised, not spent, not in the total above`,
    ],
  ];

  const seriesRows: CsvValue[][] = data.series.map((point) => [
    point.label,
    point.jobs,
    round2(point.paid),
    round2(point.sales),
    point.sales > 0 ? round2((point.paid / point.sales) * 100) : 0,
  ]);

  const riderRows: CsvValue[][] = data.byRider.map((rider) => [
    rider.name,
    rider.jobs,
    round2(rider.paid),
    data.totals.paid > 0 ? round2((rider.paid / data.totals.paid) * 100) : 0,
    rider.lastAt ? String(rider.lastAt).slice(0, 10) : "",
  ]);

  const recordRows: CsvValue[][] = data.records.map((record) => [
    record.orderNumber,
    record.riderName,
    record.city || "",
    record.items,
    round2(record.orderTotal),
    round2(record.fee),
    record.orderTotal > 0 ? round2((record.fee / record.orderTotal) * 100) : 0,
    record.paidVia === "customer" ? "Customer confirmed" : "Delivery code",
    record.deliveredAt ? String(record.deliveredAt).replace("T", " ").slice(0, 16) : "",
  ]);

  const headerExtra: CsvValue[][] = [["Window", data.rangeLabel], ["Currency", currency]];
  if (data.riderName) headerExtra.push(["Rider", data.riderName]);
  if (data.recordNote) headerExtra.push(["Record rows", data.recordNote]);

  const sections: CsvSection[] = [
    {
      title: "Payout totals",
      columns: ["Metric", "Value", "Note"],
      rows: totalRows,
    },
    {
      title: "Payout graph",
      note: CHART_NOTE,
      columns: ["Period", "Jobs", `Fees paid (${currency})`, `Sales (${currency})`, "Fees as % of sales"],
      rows: seriesRows,
    },
    {
      title: "Paid per rider",
      columns: ["Rider", "Jobs", `Paid (${currency})`, "Share of all fees (%)", "Last paid"],
      rows: riderRows,
    },
    {
      title: "Payout record - one row per delivered job",
      note: data.recordNote || "Every fee the store has paid, newest delivery first.",
      columns: [
        "Order",
        "Rider",
        "City",
        "Items",
        `Order total (${currency})`,
        `Rider fee (${currency})`,
        "Fee as % of order",
        "Confirmed by",
        "Delivered at",
      ],
      rows: recordRows,
    },
  ];

  const csv = buildReportCsv(
    reportHeader(`${siteName} - Rider Payout Record`, headerExtra),
    sections
  );

  triggerCsvDownload(csv, downloadName(siteName, "rider_payouts"));
}
