import type { jsPDF } from "jspdf";
import { getCurrencySymbol } from "./currency";
import type {
  AdminOverviewExportData,
  CustomerOverviewExportData,
  RiderOverviewExportData,
  VendorAnalyticsExportData,
} from "./csvExport";

/**
 * Analytics PDF reports for the dashboards.
 *
 * A CSV file can only hold text, so charts need a different container: this
 * module draws them directly on an A4 page (bars, lines, donuts) from the same
 * numbers the dashboard shows on screen.
 *
 * jsPDF is imported on click, so it never reaches the page bundle.
 */

// ── Colours and layout constants ────────────────────────────────────────────

const TEXT: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [226, 232, 240];
const PANEL: [number, number, number] = [248, 250, 252];
const WHITE: [number, number, number] = [255, 255, 255];

const PALETTE: [number, number, number][] = [
  [37, 99, 235],
  [16, 185, 129],
  [245, 158, 11],
  [239, 68, 68],
  [139, 92, 246],
  [14, 165, 233],
  [236, 72, 153],
  [132, 204, 22],
];

export interface PdfOptions {
  siteName?: string;
  currency?: string;
}

// ── Small number helpers ────────────────────────────────────────────────────

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** 1234567 -> "1.2M" for chart axis labels. */
function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${round(value / 1_000_000, 1)}M`;
  if (abs >= 1_000) return `${round(value / 1_000, 1)}k`;
  return String(round(value, 0));
}

/** Rounds a maximum up to a friendly axis value (10, 25, 50, 100, ...). */
function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const step = magnitude / 2;
  return Math.ceil(max / step) * step;
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(0, maxChars - 1))}…`;
}

interface Slice {
  label: string;
  value: number;
}

interface TableColumn {
  label: string;
  width: number;
  align?: "left" | "right";
}

// ── Report writer ───────────────────────────────────────────────────────────

class PdfReport {
  private doc: jsPDF;
  private y = 62;
  private page = 1;

  private readonly left = 44;
  private readonly pageWidth: number;
  private readonly pageHeight: number;
  private readonly contentWidth: number;
  private readonly bottom: number;
  private readonly reportTitle: string;
  private readonly footerText: string;

  constructor(doc: jsPDF, options: { reportTitle: string; footerText: string }) {
    this.doc = doc;
    this.pageWidth = doc.internal.pageSize.getWidth();
    this.pageHeight = doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - this.left * 2;
    this.bottom = this.pageHeight - 62;
    this.reportTitle = options.reportTitle;
    this.footerText = options.footerText;
  }

  // ── Page flow ─────────────────────────────────────────────────────────────

  private newPage(): void {
    this.doc.addPage();
    this.page += 1;
    this.y = 62;
    this.runningHeader();
  }

  private runningHeader(): void {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(...MUTED);
    this.doc.text(this.reportTitle, this.left, 36);
    this.doc.text(`Page ${this.page}`, this.pageWidth - this.left, 36, { align: "right" });
    this.doc.setDrawColor(...LINE);
    this.doc.setLineWidth(0.8);
    this.doc.line(this.left, 44, this.pageWidth - this.left, 44);
  }

  /** Starts a new page when the next block does not fit. */
  private ensure(height: number): void {
    if (this.y + height > this.bottom) this.newPage();
  }

  space(height: number): void {
    this.y += height;
  }

  // ── Text blocks ───────────────────────────────────────────────────────────

  title(text: string, subtitle?: string): void {
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(19);
    this.doc.setTextColor(...TEXT);
    this.doc.text(text, this.left, this.y);

    this.y += 20;
    if (subtitle) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(9);
      this.doc.setTextColor(...MUTED);
      this.doc.text(subtitle, this.left, this.y);
      this.y += 14;
    }

    this.doc.setDrawColor(...LINE);
    this.doc.setLineWidth(1);
    this.doc.line(this.left, this.y, this.pageWidth - this.left, this.y);
    this.y += 22;
  }

  heading(text: string): void {
    this.ensure(46);
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(...TEXT);
    this.doc.text(text, this.left, this.y);

    this.y += 7;
    this.doc.setDrawColor(...LINE);
    this.doc.setLineWidth(0.8);
    this.doc.line(this.left, this.y, this.pageWidth - this.left, this.y);
    this.y += 14;
  }

  caption(text: string): void {
    this.doc.setFont("helvetica", "normal");
    this.doc.setFontSize(8);
    this.doc.setTextColor(...MUTED);
    this.doc.text(text, this.left, this.y);
    this.y += 12;
  }

  /** Coloured square + label, used above every chart. */
  legend(items: Array<{ label: string; color: [number, number, number] }>): void {
    this.ensure(20);
    let x = this.left;
    const rowY = this.y;

    items.forEach((item) => {
      this.doc.setFillColor(...item.color);
      this.doc.rect(x, rowY - 6, 8, 8, "F");

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(...MUTED);
      this.doc.text(item.label, x + 12, rowY);

      x += 12 + this.doc.getTextWidth(item.label) + 18;
    });

    this.y += 16;
  }

  // ── Metric tiles ──────────────────────────────────────────────────────────

  /** Draws metric cards, 4 per row. `value` is already formatted for display. */
  tiles(items: Array<{ label: string; value: string; note?: string }>): void {
    const perRow = 4;
    const gap = 10;
    const tileWidth = (this.contentWidth - gap * (perRow - 1)) / perRow;
    const tileHeight = 52;

    for (let index = 0; index < items.length; index += perRow) {
      this.ensure(tileHeight + gap);
      const row = items.slice(index, index + perRow);

      row.forEach((item, column) => {
        const x = this.left + column * (tileWidth + gap);

        this.doc.setFillColor(...PANEL);
        this.doc.setDrawColor(...LINE);
        this.doc.setLineWidth(0.6);
        this.doc.roundedRect(x, this.y, tileWidth, tileHeight, 6, 6, "FD");

        this.doc.setFont("helvetica", "normal");
        this.doc.setFontSize(7);
        this.doc.setTextColor(...MUTED);
        this.doc.text(truncate(item.label.toUpperCase(), 26), x + 10, this.y + 15);

        this.doc.setFont("helvetica", "bold");
        this.doc.setFontSize(13);
        this.doc.setTextColor(...TEXT);
        this.doc.text(truncate(item.value, 16), x + 10, this.y + 33);

        if (item.note) {
          this.doc.setFont("helvetica", "normal");
          this.doc.setFontSize(7);
          this.doc.setTextColor(...MUTED);
          this.doc.text(truncate(item.note, 24), x + 10, this.y + 45);
        }
      });

      this.y += tileHeight + gap;
    }
  }

  // ── Tables ────────────────────────────────────────────────────────────────

  private tableHeader(columns: TableColumn[]): void {
    this.doc.setFillColor(...PANEL);
    this.doc.rect(this.left, this.y - 9, this.contentWidth, 18, "F");

    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(7);
    this.doc.setTextColor(...MUTED);

    let x = this.left;
    columns.forEach((column) => {
      const align = column.align === "right" ? "right" : "left";
      const textX = align === "right" ? x + column.width - 6 : x + 6;
      this.doc.text(truncate(column.label.toUpperCase(), 30), textX, this.y + 2, { align });
      x += column.width;
    });

    this.y += 20;
  }

  table(columns: TableColumn[], rows: string[][], emptyText = "No data available."): void {
    this.ensure(60);
    this.tableHeader(columns);

    if (rows.length === 0) {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(9);
      this.doc.setTextColor(...MUTED);
      this.doc.text(emptyText, this.left + 6, this.y + 2);
      this.y += 26;
      return;
    }

    rows.forEach((row, rowIndex) => {
      // Wrap each cell so long product names do not run into the next column.
      const wrapped = row.map((cell, columnIndex) =>
        this.doc.splitTextToSize(cell, columns[columnIndex].width - 12)
      );
      const lineCount = Math.max(...wrapped.map((lines) => lines.length));
      const rowHeight = lineCount * 9 + 8;

      if (this.y + rowHeight > this.bottom) {
        this.newPage();
        this.tableHeader(columns);
      }

      if (rowIndex % 2 === 1) {
        this.doc.setFillColor(...PANEL);
        this.doc.rect(this.left, this.y - 8, this.contentWidth, rowHeight, "F");
      }

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(...TEXT);

      let x = this.left;
      wrapped.forEach((lines, columnIndex) => {
        const column = columns[columnIndex];
        const align = column.align === "right" ? "right" : "left";
        const textX = align === "right" ? x + column.width - 6 : x + 6;
        this.doc.text(lines, textX, this.y, { align });
        x += column.width;
      });

      this.y += rowHeight;
    });

    this.y += 8;
  }

  // ── Charts ────────────────────────────────────────────────────────────────

  private gridlines(x: number, y: number, width: number, height: number, max: number, format: (value: number) => string): void {
    const steps = 4;

    for (let step = 0; step <= steps; step += 1) {
      const value = (max / steps) * step;
      const lineY = y + height - (height / steps) * step;

      this.doc.setDrawColor(...LINE);
      this.doc.setLineWidth(0.5);
      this.doc.line(x, lineY, x + width, lineY);

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...MUTED);
      this.doc.text(format(value), x - 6, lineY + 2, { align: "right" });
    }
  }

  /** Bars only — all bars share one scale, so they can be compared directly. */
  bars(options: {
    labels: string[];
    series: Array<{ label: string; color: [number, number, number]; values: number[] }>;
    format?: (value: number) => string;
    height?: number;
  }): void {
    const height = options.height ?? 150;
    const format = options.format ?? ((value: number) => compact(value));
    this.ensure(height + 30);

    const leftGutter = 40;
    const bottomGutter = 20;
    const plotX = this.left + leftGutter;
    const plotY = this.y;
    const plotWidth = this.contentWidth - leftGutter;
    const plotHeight = height - bottomGutter;

    const maxValue = Math.max(
      0,
      ...options.series.flatMap((series) => series.values.map((value) => (Number.isFinite(value) ? value : 0)))
    );
    const max = niceMax(maxValue);

    if (maxValue <= 0) {
      this.caption("No data to plot.");
      return;
    }

    this.gridlines(plotX, plotY, plotWidth, plotHeight, max, format);

    const groupWidth = plotWidth / Math.max(1, options.labels.length);
    const barWidth = Math.min(16, (groupWidth * 0.7) / options.series.length);
    const gap = 2;

    options.labels.forEach((label, labelIndex) => {
      const groupCenter = plotX + groupWidth * labelIndex + groupWidth / 2;
      const totalWidth = options.series.length * barWidth + gap * (options.series.length - 1);
      let barX = groupCenter - totalWidth / 2;

      options.series.forEach((series) => {
        const value = Number.isFinite(series.values[labelIndex]) ? series.values[labelIndex] : 0;
        const barHeight = max > 0 ? (value / max) * plotHeight : 0;

        this.doc.setFillColor(...series.color);
        this.doc.rect(barX, plotY + plotHeight - barHeight, barWidth, barHeight, "F");

        barX += barWidth + gap;
      });

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...MUTED);
      this.doc.text(truncate(label, 7), groupCenter, plotY + plotHeight + 12, { align: "center" });
    });

    this.y += height + 8;
  }

  /** Bars on the left axis with a line on its own right axis (e.g. revenue + orders). */
  barsWithLine(options: {
    labels: string[];
    bar: { label: string; color: [number, number, number]; values: number[] };
    line: { label: string; color: [number, number, number]; values: number[] };
    formatBar?: (value: number) => string;
    height?: number;
  }): void {
    const height = options.height ?? 155;
    const formatBar = options.formatBar ?? ((value: number) => compact(value));
    this.ensure(height + 30);

    const leftGutter = 40;
    const rightGutter = 26;
    const bottomGutter = 20;
    const plotX = this.left + leftGutter;
    const plotY = this.y;
    const plotWidth = this.contentWidth - leftGutter - rightGutter;
    const plotHeight = height - bottomGutter;

    const barMax = niceMax(Math.max(0, ...options.bar.values));
    const lineMax = niceMax(Math.max(0, ...options.line.values));

    this.gridlines(plotX, plotY, plotWidth, plotHeight, barMax, formatBar);

    const groupWidth = plotWidth / Math.max(1, options.labels.length);
    const barWidth = Math.min(22, groupWidth * 0.55);

    const points: Array<{ x: number; y: number }> = [];

    options.labels.forEach((label, index) => {
      const center = plotX + groupWidth * index + groupWidth / 2;
      const value = Number.isFinite(options.bar.values[index]) ? options.bar.values[index] : 0;
      const barHeight = barMax > 0 ? (value / barMax) * plotHeight : 0;

      this.doc.setFillColor(...options.bar.color);
      this.doc.rect(center - barWidth / 2, plotY + plotHeight - barHeight, barWidth, barHeight, "F");

      const lineValue = Number.isFinite(options.line.values[index]) ? options.line.values[index] : 0;
      points.push({
        x: center,
        y: plotY + plotHeight - (lineMax > 0 ? (lineValue / lineMax) * plotHeight : 0),
      });

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(...MUTED);
      this.doc.text(truncate(label, 7), center, plotY + plotHeight + 12, { align: "center" });
    });

    // The orders line, drawn segment by segment.
    this.doc.setDrawColor(...options.line.color);
    this.doc.setLineWidth(1.4);
    for (let index = 1; index < points.length; index += 1) {
      this.doc.line(points[index - 1].x, points[index - 1].y, points[index].x, points[index].y);
    }
    points.forEach((point) => {
      this.doc.setFillColor(...options.line.color);
      this.doc.circle(point.x, point.y, 1.8, "F");
    });

    this.y += height + 8;
  }

  /** Horizontal bars — the easiest way to read ranked shares. */
  horizontalBars(options: {
    rows: Array<{ label: string; value: number; note?: string }>;
    format?: (value: number) => string;
  }): void {
    const rowHeight = 20;
    const format = options.format ?? ((value: number) => String(round(value, 1)));
    this.ensure(options.rows.length * rowHeight + 10);

    const labelWidth = 108;
    const valueWidth = 62;
    const barX = this.left + labelWidth;
    const barWidth = this.contentWidth - labelWidth - valueWidth;
    const max = Math.max(1, ...options.rows.map((row) => row.value));

    options.rows.forEach((row) => {
      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(...TEXT);
      this.doc.text(truncate(row.label, 22), this.left, this.y + 9);

      this.doc.setFillColor(...LINE);
      this.doc.rect(barX, this.y + 2, barWidth, 9, "F");

      this.doc.setFillColor(...PALETTE[0]);
      this.doc.rect(barX, this.y + 2, (row.value / max) * barWidth, 9, "F");

      this.doc.setFont("helvetica", "bold");
      this.doc.setFontSize(8);
      this.doc.setTextColor(...MUTED);
      const text = row.note ? `${format(row.value)} (${row.note})` : format(row.value);
      this.doc.text(text, this.left + this.contentWidth, this.y + 9, { align: "right" });

      this.y += rowHeight;
    });

    this.y += 6;
  }

  /** Donut chart. Slices are drawn as thin triangles, which jsPDF fills reliably. */
  donut(options: { size?: number; slices: Slice[]; format?: (value: number) => string }): void {
    const size = options.size ?? 140;
    const format = options.format ?? ((value: number) => String(round(value, 1)));
    this.ensure(size + 16);

    const total = options.slices.reduce((sum, slice) => sum + Math.max(0, slice.value), 0);
    if (total <= 0) {
      this.caption("No data to plot.");
      return;
    }

    const centerX = this.left + size / 2;
    const centerY = this.y + size / 2;
    const outer = size / 2 - 4;
    const inner = outer * 0.55;

    let angle = -Math.PI / 2;

    options.slices.forEach((slice, index) => {
      const sweep = (Math.max(0, slice.value) / total) * Math.PI * 2;
      const color = PALETTE[index % PALETTE.length];
      this.doc.setFillColor(...color);

      const steps = Math.max(2, Math.ceil(sweep / 0.04));
      for (let step = 0; step < steps; step += 1) {
        const start = angle + (sweep / steps) * step;
        const end = angle + (sweep / steps) * (step + 1);

        this.doc.triangle(
          centerX,
          centerY,
          centerX + Math.cos(start) * outer,
          centerY + Math.sin(start) * outer,
          centerX + Math.cos(end) * outer,
          centerY + Math.sin(end) * outer,
          "F"
        );
      }

      angle += sweep;
    });

    // Punch the middle out so it becomes a donut.
    this.doc.setFillColor(...WHITE);
    this.doc.circle(centerX, centerY, inner, "F");
    this.doc.setFont("helvetica", "bold");
    this.doc.setFontSize(11);
    this.doc.setTextColor(...TEXT);
    this.doc.text(format(total), centerX, centerY + 4, { align: "center" });

    // Legend on the right.
    const legendX = this.left + size + 26;
    let legendY = this.y + 14;

    options.slices.forEach((slice, index) => {
      const share = total > 0 ? (slice.value / total) * 100 : 0;

      this.doc.setFillColor(...PALETTE[index % PALETTE.length]);
      this.doc.rect(legendX, legendY - 6, 8, 8, "F");

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(8);
      this.doc.setTextColor(...TEXT);
      this.doc.text(truncate(slice.label, 24), legendX + 14, legendY);

      this.doc.setTextColor(...MUTED);
      this.doc.text(`${round(share, 1)}%`, this.left + this.contentWidth, legendY, { align: "right" });

      legendY += 15;
    });

    this.y += size + 14;
  }

  // ── Finish ────────────────────────────────────────────────────────────────

  save(filename: string): void {
    const totalPages = this.doc.getNumberOfPages();
    const generatedAt = new Date().toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    for (let page = 1; page <= totalPages; page += 1) {
      this.doc.setPage(page);
      this.doc.setDrawColor(...LINE);
      this.doc.setLineWidth(0.8);
      this.doc.line(this.left, this.pageHeight - 46, this.pageWidth - this.left, this.pageHeight - 46);

      this.doc.setFont("helvetica", "normal");
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...MUTED);
      this.doc.text(`${this.footerText} · generated ${generatedAt}`, this.left, this.pageHeight - 32);
      this.doc.text(`Page ${page} of ${totalPages}`, this.pageWidth - this.left, this.pageHeight - 32, {
        align: "right",
      });
    }

    this.doc.save(filename);
  }
}

// ── Helpers used by both reports ────────────────────────────────────────────

function safeFilePart(text: string): string {
  return text.replace(/[^a-z0-9._-]+/gi, "-");
}

/** Keeps a donut readable: top 6 slices plus an aggregated "Other". */
function limitedSlices(items: Slice[], limit = 6): Slice[] {
  if (items.length <= limit) return items;

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((sum, item) => sum + item.value, 0);

  return rest > 0 ? [...head, { label: "Other", value: rest }] : head;
}

// ── Admin overview report ───────────────────────────────────────────────────

export async function downloadAdminOverviewPdf(
  data: AdminOverviewExportData,
  options: PdfOptions = {}
): Promise<void> {
  const { jsPDF: JsPdf } = await import("jspdf");

  const siteName = options.siteName || "Sparq";
  const currency = (options.currency || "USD").toUpperCase();
  const symbol = getCurrencySymbol(currency);
  const money = (value: number) => `${symbol}${compact(value)}`;

  const doc = new JsPdf({ unit: "pt", format: "a4" });
  const report = new PdfReport(doc, {
    reportTitle: `${siteName} - Admin Overview Report`,
    footerText: `${siteName} · Admin overview`,
  });

  report.title(`${siteName} - Admin Overview`, `Store performance report · Currency ${currency}`);

  report.heading("Headline metrics");
  report.tiles(
    data.stats.slice(0, 8).map((stat) => ({
      label: stat.title,
      value: stat.value,
      note: stat.change,
    }))
  );

  report.heading("Financial indicators");
  const indicatorRows: string[][] = [
    ["Average order value", `${symbol}${round(data.kpis.avgOrderValue, 2)}`],
    ["Fulfillment success rate", `${round(data.kpis.deliverySuccessRate, 1)}%`],
    ["Products in catalog", String(data.kpis.totalProducts)],
    ["Transactions logged", String(data.kpis.totalTransactions)],
  ];
  if (data.kpis.totalProfit !== undefined) {
    indicatorRows.push(["Total net profit", `${symbol}${round(data.kpis.totalProfit, 2)}`]);
  }
  if (data.kpis.totalCost !== undefined) {
    indicatorRows.push(["Total cost of goods", `${symbol}${round(data.kpis.totalCost, 2)}`]);
  }
  if (data.kpis.profitMargin !== undefined) {
    indicatorRows.push(["Overall profit margin", `${round(data.kpis.profitMargin, 1)}%`]);
  }

  report.table(
    [
      { label: "Metric", width: 260 },
      { label: "Value", width: 247, align: "right" },
    ],
    indicatorRows
  );

  // ── Chart 1: revenue and orders ──
  if (data.revenueData.length > 0) {
    report.heading("Monthly revenue and orders");
    report.legend([
      { label: "Revenue", color: PALETTE[0] },
      { label: "Orders", color: PALETTE[2] },
    ]);
    report.barsWithLine({
      labels: data.revenueData.map((point) => point.month),
      bar: { label: "Revenue", color: PALETTE[0], values: data.revenueData.map((p) => p.revenue) },
      line: { label: "Orders", color: PALETTE[2], values: data.revenueData.map((p) => p.orders) },
      formatBar: money,
    });
  }

  // ── Chart 2: profit and loss ──
  const profitPoints = data.monthlyProfitData ?? [];
  if (profitPoints.length > 0) {
    report.heading("Profit and loss by month");
    report.legend([
      { label: "Revenue", color: PALETTE[0] },
      { label: "Cost", color: PALETTE[3] },
      { label: "Profit", color: PALETTE[1] },
    ]);
    report.bars({
      labels: profitPoints.map((point) => point.label),
      series: [
        { label: "Revenue", color: PALETTE[0], values: profitPoints.map((p) => p.revenue) },
        { label: "Cost", color: PALETTE[3], values: profitPoints.map((p) => p.cost) },
        { label: "Profit", color: PALETTE[1], values: profitPoints.map((p) => p.profit) },
      ],
      format: money,
    });

    report.table(
      [
        { label: "Month", width: 120 },
        { label: `Revenue (${currency})`, width: 100, align: "right" },
        { label: `Cost (${currency})`, width: 95, align: "right" },
        { label: `Profit (${currency})`, width: 95, align: "right" },
        { label: "Margin", width: 50, align: "right" },
        { label: "Orders", width: 47, align: "right" },
      ],
      profitPoints.map((point) => [
        point.label,
        String(round(point.revenue, 2)),
        String(round(point.cost, 2)),
        String(round(point.profit, 2)),
        `${point.revenue > 0 ? round((point.profit / point.revenue) * 100, 1) : 0}%`,
        String(point.orders),
      ])
    );
  }

  // ── Chart 3: category distribution ──
  if (data.categoryData.length > 0) {
    report.heading("Category distribution");
    report.donut({
      slices: limitedSlices(data.categoryData.map((item) => ({ label: item.name, value: item.value }))),
      format: (value) => `${round(value, 1)}%`,
    });
  }

  // ── Chart 4: order pipeline ──
  if (data.orderStatusData.length > 0) {
    report.heading("Order fulfillment pipeline");
    report.horizontalBars({
      rows: data.orderStatusData.map((item) => ({
        label: item.name,
        value: item.count ?? 0,
        note: `${round(item.value, 1)}%`,
      })),
      format: (value) => `${round(value, 0)} orders`,
    });
  }

  // ── Chart 5: payment channels ──
  if (data.paymentMethodData.length > 0) {
    report.heading("Payment channels");
    report.horizontalBars({
      rows: data.paymentMethodData.map((item) => ({
        label: item.name,
        value: item.amount,
        note: `${round(item.value, 1)}%`,
      })),
      format: money,
    });
  }

  // ── Tables ──
  if (data.topProducts.length > 0) {
    report.heading("Top performing products");
    report.table(
      [
        { label: "#", width: 24 },
        { label: "Product", width: 170 },
        { label: "Category", width: 96 },
        { label: "Units", width: 44, align: "right" },
        { label: `Revenue (${currency})`, width: 90, align: "right" },
        { label: `Profit (${currency})`, width: 83, align: "right" },
      ],
      data.topProducts.slice(0, 12).map((product, index) => {
        const units = product.unitsSold || 0;
        const cost = product.cost ?? (product.investPrice ?? 0) * units;
        const profit = product.profit ?? product.revenue - cost;

        return [
          String(index + 1),
          product.title,
          product.category,
          String(units),
          String(round(product.revenue, 2)),
          String(round(profit, 2)),
        ];
      })
    );
  }

  if (data.recentOrders.length > 0) {
    report.heading("Recent orders");
    report.table(
      [
        { label: "Order", width: 84 },
        { label: "Customer", width: 90 },
        { label: "Items", width: 112 },
        { label: "Amount", width: 56, align: "right" },
        { label: "Pts Used", width: 46, align: "right" },
        { label: "Pts Earned", width: 52, align: "right" },
        { label: "Status", width: 56 },
      ],
      data.recentOrders.slice(0, 20).map((order) => [
        order.id,
        order.customer,
        order.product,
        order.amount,
        order.pointsRedeemed ? `-${order.pointsRedeemed}` : "-",
        order.pointsEarned ? `+${order.pointsEarned}` : "-",
        order.status,
      ])
    );
  }

  report.save(
    `${safeFilePart(siteName)}-admin-overview-${new Date().toISOString().split("T")[0]}.pdf`
  );
}

// ── Customer overview report ────────────────────────────────────────────────

export async function downloadCustomerOverviewPdf(
  data: CustomerOverviewExportData,
  options: PdfOptions = {}
): Promise<void> {
  const { jsPDF: JsPdf } = await import("jspdf");

  const siteName = options.siteName || "Sparq";
  const currency = (options.currency || "USD").toUpperCase();
  const symbol = getCurrencySymbol(currency);
  const money = (value: number) => `${symbol}${compact(value)}`;

  const doc = new JsPdf({ unit: "pt", format: "a4" });
  const report = new PdfReport(doc, {
    reportTitle: `${siteName} - Customer Overview Report`,
    footerText: `${siteName} · Customer overview`,
  });

  report.title(
    `${siteName} - Shopping Report`,
    `${data.userName || "Customer"} · ${data.membershipTier || "Member"} · ${data.rewardPoints ?? 0} points`
  );

  report.heading("Shopping summary");
  report.tiles(
    data.stats.slice(0, 8).map((stat) => ({
      label: stat.title,
      value: stat.value,
      note: stat.change,
    }))
  );

  // ── Chart 1: spending by month ──
  if (data.spendingData.length > 0) {
    report.heading("Spending by month");
    report.legend([
      { label: "Spending", color: PALETTE[0] },
      { label: "Orders", color: PALETTE[2] },
    ]);
    report.barsWithLine({
      labels: data.spendingData.map((point) => point.month),
      bar: { label: "Spending", color: PALETTE[0], values: data.spendingData.map((p) => p.amount) },
      line: { label: "Orders", color: PALETTE[2], values: data.spendingData.map((p) => p.orders) },
      formatBar: money,
    });
  }

  // ── Chart 2: spending versus savings ──
  if (data.spendingVsSavingsData.length > 0) {
    report.heading("Spending versus savings");
    report.legend([
      { label: "Spending", color: PALETTE[0] },
      { label: "Saved", color: PALETTE[1] },
    ]);
    report.bars({
      labels: data.spendingVsSavingsData.map((point) => point.month),
      series: [
        {
          label: "Spending",
          color: PALETTE[0],
          values: data.spendingVsSavingsData.map((p) => p.spending),
        },
        {
          label: "Saved",
          color: PALETTE[1],
          values: data.spendingVsSavingsData.map((p) => p.savings),
        },
      ],
      format: money,
    });
  }

  // ── Chart 3: category affinity ──
  if (data.categoryData.length > 0) {
    report.heading("Category affinity");
    report.donut({
      slices: limitedSlices(data.categoryData.map((item) => ({ label: item.name, value: item.value }))),
      format: (value) => `${round(value, 1)}%`,
    });
  }

  // ── Chart 4: delivery status ──
  if (data.orderStatusData.length > 0) {
    report.heading("Delivery status");
    report.horizontalBars({
      rows: data.orderStatusData.map((item) => ({ label: item.name, value: item.value })),
      format: (value) => `${round(value, 1)}%`,
    });
  }

  // ── Chart 5: payment methods ──
  if (data.paymentMethodData.length > 0) {
    report.heading("Payment methods");
    report.donut({
      slices: limitedSlices(data.paymentMethodData.map((item) => ({ label: item.name, value: item.value }))),
      format: (value) => `${round(value, 1)}%`,
    });
  }

  // ── Tables ──
  if (data.recentOrders.length > 0) {
    report.heading("Recent orders");
    report.table(
      [
        { label: "Order", width: 84 },
        { label: "Date", width: 62 },
        { label: "Status", width: 54 },
        { label: `Total (${currency})`, width: 60, align: "right" },
        { label: "Pts Used", width: 42, align: "right" },
        { label: "Pts Saved", width: 52, align: "right" },
        { label: "Pts Earned", width: 48, align: "right" },
        { label: "Item details", width: 105 },
      ],
      data.recentOrders.slice(0, 20).map((order) => [
        order.orderNumber,
        order.date,
        order.status,
        String(round(order.total, 2)),
        order.pointsRedeemed ? String(order.pointsRedeemed) : "-",
        order.pointsDiscount ? `-${round(order.pointsDiscount, 2)}` : "-",
        order.pointsEarned ? `+${order.pointsEarned}` : "-",
        (order.items || []).map((item) => `${item.name} x${item.quantity}`).join(", ") || "-",
      ])
    );
  }

  if (data.recentTransactions.length > 0) {
    report.heading("Transactions");
    report.table(
      [
        { label: "Invoice", width: 100 },
        { label: "Order", width: 110 },
        { label: "Method", width: 95 },
        { label: `Amount (${currency})`, width: 80, align: "right" },
        { label: "Status", width: 70 },
        { label: "Date", width: 52 },
      ],
      data.recentTransactions.slice(0, 20).map((item) => [
        item.invoiceNumber || "-",
        item.orderNumber,
        item.paymentMethod,
        String(round(item.amount, 2)),
        item.status,
        item.date,
      ])
    );
  }

  if (data.wishlistItems.length > 0) {
    report.heading("Wishlist");
    report.table(
      [
        { label: "Product", width: 230 },
        { label: "Category", width: 100 },
        { label: `Price (${currency})`, width: 85, align: "right" },
        { label: "Availability", width: 92 },
      ],
      data.wishlistItems.slice(0, 20).map((item) => [
        item.title,
        item.category || "-",
        String(round(item.price, 2)),
        item.inStock === false ? "Out of stock" : "In stock",
      ])
    );
  }

  report.save(
    `${safeFilePart(siteName)}-customer-overview-${new Date().toISOString().split("T")[0]}.pdf`
  );
}

// ── Rider overview report ───────────────────────────────────────────────────

export async function downloadRiderOverviewPdf(
  data: RiderOverviewExportData,
  options: PdfOptions = {}
): Promise<void> {
  const { jsPDF: JsPdf } = await import("jspdf");

  const siteName = options.siteName || "Sparq";
  const currency = (options.currency || "USD").toUpperCase();
  const symbol = getCurrencySymbol(currency);
  const money = (value: number) => `${symbol}${compact(value)}`;

  const doc = new JsPdf({ unit: "pt", format: "a4" });
  const report = new PdfReport(doc, {
    reportTitle: `${siteName} - Rider Overview Report`,
    footerText: `${siteName} · Rider overview`,
  });

  report.title(
    `${siteName} - Rider Overview`,
    `${data.riderName || "Rider"} · last ${data.rangeDays ?? 0} days · currency ${currency}`
  );

  report.heading("Performance");
  report.tiles(
    data.stats.slice(0, 8).map((stat) => ({
      label: stat.title,
      value: stat.value,
      note: stat.change,
    }))
  );

  // ── Chart 1: earnings and delivered jobs ──
  if (data.series.length > 0) {
    report.heading("Earnings and delivered jobs");
    report.legend([
      { label: "Earnings", color: PALETTE[1] },
      { label: "Delivered", color: PALETTE[0] },
    ]);
    report.barsWithLine({
      labels: data.series.map((point) => point.date.slice(5)),
      bar: { label: "Earnings", color: PALETTE[1], values: data.series.map((p) => p.earnings) },
      line: { label: "Delivered", color: PALETTE[0], values: data.series.map((p) => p.delivered) },
      formatBar: money,
    });
  }

  // ── Chart 2: which stage the jobs are in ──
  const stageSlices: Slice[] = Object.entries(data.statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ label: status.replace(/_/g, " "), value: count }));

  if (stageSlices.length > 0) {
    report.heading("Delivery pipeline");
    report.donut({
      slices: limitedSlices(stageSlices),
      format: (value) => String(round(value, 0)),
    });
  }

  // ── Table ──
  if (data.recent.length > 0) {
    report.heading("Recent deliveries");
    report.table(
      [
        { label: "Order", width: 82 },
        { label: "Customer", width: 116 },
        { label: "City", width: 90 },
        { label: `Fee (${currency})`, width: 62, align: "right" },
        { label: "Status", width: 90 },
        { label: "Updated", width: 67 },
      ],
      data.recent.slice(0, 20).map((delivery) => [
        delivery.orderNumber,
        delivery.customerName || "-",
        delivery.city || "-",
        String(round(delivery.fee, 2)),
        delivery.status.replace(/_/g, " "),
        delivery.updatedAt,
      ])
    );
  }

  report.save(
    `${safeFilePart(siteName)}-rider-overview-${new Date().toISOString().split("T")[0]}.pdf`
  );
}

// ── Vendor sales report ─────────────────────────────────────────────────────

/**
 * One seller's own sales report.
 *
 * The numbers arrive already folded from the vendor's fulfilment groups, so the
 * report can only ever describe the shop that asked for it. The product and
 * order tables are written only when the plan carries full exports, exactly like
 * the screen.
 */
export async function downloadVendorAnalyticsPdf(
  data: VendorAnalyticsExportData,
  options: PdfOptions = {}
): Promise<void> {
  const { jsPDF: JsPdf } = await import("jspdf");

  const siteName = options.siteName || "Sparq";
  const currency = (options.currency || "USD").toUpperCase();
  const symbol = getCurrencySymbol(currency);
  const money = (value: number) => `${symbol}${compact(value)}`;

  const doc = new JsPdf({ unit: "pt", format: "a4" });
  const report = new PdfReport(doc, {
    reportTitle: `${siteName} - Vendor Sales Report`,
    footerText: `${siteName} · Vendor sales`,
  });

  report.title(
    `${siteName} - Vendor Sales`,
    `${data.vendorName || "Store"} · ${data.planName || "plan"} · last ${data.rangeDays} ${
      data.monthly ? "months" : "days"
    } · currency ${currency}`
  );

  report.heading("Sales");
  report.tiles([
    { label: "Revenue earned", value: money(data.totals.revenue), note: `in ${currency}` },
    { label: "Delivered orders", value: String(data.totals.orders) },
    { label: "Units sold", value: String(data.totals.units) },
    {
      label: "Average order",
      value: money(data.totals.avgOrderValue),
      note: `on ${data.totals.orders} order${data.totals.orders === 1 ? "" : "s"}`,
    },
    { label: "On the way", value: money(data.totals.inFlight) },
    {
      label: "Commission",
      value: money(data.totals.commissionTaken),
      note: `${round(data.totals.commission, 1)}% taken`,
    },
    { label: "Net payout", value: money(data.totals.netPayout) },
    {
      label: "Fulfilment rate",
      value: `${round(data.totals.fulfilmentRate, 0)}%`,
      note: `${data.totals.stopped} rejected or cancelled`,
    },
  ]);

  if (data.previous.revenue > 0 || data.previous.orders > 0) {
    report.caption(
      `Previous window: ${money(data.previous.revenue)} across ${data.previous.orders} order${
        data.previous.orders === 1 ? "" : "s"
      }${
        data.previous.revenueChange === null
          ? ""
          : ` · change ${data.previous.revenueChange > 0 ? "+" : ""}${round(data.previous.revenueChange, 1)}%`
      }`
    );
  }

  if (data.series.length > 0) {
    report.heading(data.monthly ? "Revenue by month" : "Revenue by day");
    report.legend([
      { label: "Revenue", color: PALETTE[1] },
      { label: "Delivered orders", color: PALETTE[0] },
    ]);
    report.barsWithLine({
      labels: data.series.map((point) => (data.monthly ? point.label : point.label.slice(5))),
      bar: {
        label: "Revenue",
        color: PALETTE[1],
        values: data.series.map((point) => point.revenue),
      },
      line: {
        label: "Delivered orders",
        color: PALETTE[0],
        values: data.series.map((point) => point.orders),
      },
      formatBar: money,
    });
  }

  const stageSlices: Slice[] = Object.entries(data.statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ label: status.replace(/_/g, " "), value: count }));

  if (stageSlices.length > 0) {
    report.heading("Order pipeline");
    report.donut({
      slices: limitedSlices(stageSlices),
      format: (value) => String(round(value, 0)),
    });
  }

  if (data.full && data.topProducts.length > 0) {
    report.heading("Top products");
    report.table(
      [
        { label: "Product", width: 230 },
        { label: "Units sold", width: 80, align: "right" },
        { label: `Revenue (${currency})`, width: 90, align: "right" },
      ],
      data.topProducts.map((product) => [
        product.title,
        String(product.units),
        String(round(product.revenue, 2)),
      ])
    );
  }

  if (data.full && data.recent.length > 0) {
    report.heading("Recent orders");
    report.table(
      [
        { label: "Order", width: 90 },
        { label: "Stage", width: 110 },
        { label: `Subtotal (${currency})`, width: 90, align: "right" },
        { label: "Units", width: 50, align: "right" },
        { label: "City", width: 60 },
      ],
      data.recent.map((order) => [
        order.orderNumber || "-",
        order.status.replace(/_/g, " "),
        String(round(order.subtotal, 2)),
        String(order.units),
        order.city || "-",
      ])
    );
  }

  report.save(
    `${safeFilePart(data.vendorName || siteName)}-vendor-sales-${
      new Date().toISOString().split("T")[0]
    }.pdf`
  );
}
