import type { CustomerOrder } from "@/types/customerDashboard";

/**
 * Builds a one-file PDF invoice for a customer order, using jsPDF.
 *
 * The library is imported only when the button is clicked, so it never lands in
 * the page bundle. Everything drawn here comes from the order the page already
 * shows — no extra API call is needed.
 */

const TEXT: [number, number, number] = [17, 24, 39];
const MUTED: [number, number, number] = [107, 114, 128];
const LINE: [number, number, number] = [226, 232, 240];
const HEAD_FILL: [number, number, number] = [243, 244, 246];

interface InvoiceOptions {
  siteName: string;
  /** The site's own money formatter, so the PDF uses the right currency. */
  formatMoney: (amount: number) => string;
}

/** Keeps the file name free of characters Windows/macOS reject. */
function safeFilePart(text: string): string {
  return text.replace(/[^a-z0-9._-]+/gi, "-");
}

/** "foo" → "Standard Delivery", matching the label used on the page. */
function shippingLabel(method?: CustomerOrder["shippingMethod"]): string {
  switch (method) {
    case "free":
      return "Free Shipping";
    case "express":
      return "Express Delivery";
    default:
      return "Standard Delivery";
  }
}

export async function downloadOrderInvoicePdf(
  order: CustomerOrder,
  options: InvoiceOptions
): Promise<void> {
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const money = options.formatMoney;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 48;
  const right = pageWidth - 48;
  const bottom = pageHeight - 64;

  let y = 64;

  /** Starts a new page when the next block would not fit. */
  const ensureSpace = (needed: number) => {
    if (y + needed <= bottom) return;
    doc.addPage();
    y = 64;
  };

  /** A small grey heading above a value. */
  const fieldLabel = (text: string, x: number, align: "left" | "right" = "left") => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(text.toUpperCase(), x, y, { align });
  };

  const fieldValue = (text: string, x: number, align: "left" | "right" = "left") => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...TEXT);
    doc.text(text, x, y + 15, { align });
  };

  const sectionTitle = (text: string) => {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(text.toUpperCase(), left, y);
    y += 8;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.8);
    doc.line(left, y, right, y);
    y += 18;
  };

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...TEXT);
  doc.text(options.siteName, left, y);

  doc.setFontSize(14);
  doc.text("INVOICE", right, y, { align: "right" });

  y += 12;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(1);
  doc.line(left, y, right, y);

  // ── Order metadata ────────────────────────────────────────────────────────
  y += 32;
  fieldLabel("Order Number", left);
  fieldValue(order.orderNumber, left);

  fieldLabel("Order Date", left + 200);
  fieldValue(order.date, left + 200);

  fieldLabel("Status", right, "right");
  fieldValue(order.status, right, "right");

  y += 44;
  fieldLabel("Payment", left);
  fieldValue(`${order.paymentMethod} · ${order.paymentStatus}`, left);

  if (order.trackingNumber) {
    fieldLabel("Tracking", right, "right");
    fieldValue(order.trackingNumber, right, "right");
  }

  // ── Ship to / delivery ────────────────────────────────────────────────────
  y += 44;
  sectionTitle("Ship To");

  const addressLines = doc.splitTextToSize(order.shippingAddress || "Not provided", 240);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text(addressLines, left, y);

  const deliveryX = left + 290;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("Delivery method", deliveryX, y);
  doc.text("Estimated delivery", deliveryX, y + 30);
  if (order.carrier) doc.text("Carrier", deliveryX, y + 60);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...TEXT);
  doc.text(shippingLabel(order.shippingMethod), deliveryX, y + 15);
  doc.text(order.estimatedDelivery || "—", deliveryX, y + 45);
  if (order.carrier) doc.text(order.carrier, deliveryX, y + 75);

  y += Math.max(addressLines.length * 13, order.carrier ? 84 : 60) + 22;

  // ── Items table ───────────────────────────────────────────────────────────
  sectionTitle("Order Items");

  const colQty = left + 320;
  const colUnit = left + 410;
  const colTotal = right;

  const tableHeader = () => {
    ensureSpace(30);
    doc.setFillColor(...HEAD_FILL);
    doc.rect(left, y - 11, right - left, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("ITEM", left + 8, y + 3);
    doc.text("QTY", colQty, y + 3, { align: "right" });
    doc.text("UNIT PRICE", colUnit, y + 3, { align: "right" });
    doc.text("LINE TOTAL", colTotal - 8, y + 3, { align: "right" });
    y += 24;
  };

  tableHeader();

  order.items.forEach((item) => {
    const nameLines = doc.splitTextToSize(item.name, colQty - left - 60);
    const rowHeight = Math.max(22, nameLines.length * 12 + 10);
    ensureSpace(rowHeight + 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.text(nameLines, left + 8, y + 3);

    doc.text(String(item.quantity), colQty, y + 3, { align: "right" });
    doc.text(money(item.price), colUnit, y + 3, { align: "right" });
    doc.text(money(item.price * item.quantity), colTotal - 8, y + 3, { align: "right" });

    y += rowHeight;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(left, y - 6, right, y - 6);
  });

  // ── Total ─────────────────────────────────────────────────────────────────
  const discountLines = (order.couponDiscount ? 1 : 0) + (order.pointsDiscount ? 1 : 0);
  ensureSpace(80 + discountLines * 18);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(`${order.itemCount} item(s) in this order`, left, y + 12);

  // The code this order was bought with, named before the points because that is
  // the order the money came off in. Without this line the invoice total would
  // not add up to the items printed above it.
  if (order.couponDiscount) {
    doc.text(
      `Discount code${order.couponCode ? ` ${order.couponCode}` : ""}`,
      colUnit - 20,
      y + 30,
      { align: "right" }
    );
    doc.text(`-${money(order.couponDiscount)}`, right, y + 30, { align: "right" });
    y += 18;
  }

  // Loyalty points spent at checkout get their own line above the total.
  if (order.pointsDiscount) {
    doc.text(`Reward points (${order.pointsRedeemed ?? 0} pts)`, colUnit - 20, y + 30, {
      align: "right",
    });
    doc.text(`-${money(order.pointsDiscount)}`, right, y + 30, { align: "right" });
    y += 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...TEXT);
  doc.text("TOTAL", colUnit - 20, y + 12, { align: "right" });
  doc.setFontSize(14);
  doc.text(money(order.total), right, y + 12, { align: "right" });
  y += 36;

  // ── Timeline ──────────────────────────────────────────────────────────────
  const steps = (order.timeline || []).filter((step) => step.completed || step.date);
  if (steps.length > 0) {
    sectionTitle("Order Timeline");

    steps.forEach((step) => {
      ensureSpace(24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...TEXT);
      doc.text(step.title, left, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      if (step.date) doc.text(step.date, right, y, { align: "right" });

      doc.setFontSize(9);
      doc.text(step.description || "", left, y + 13, { align: "left" });
      y += 28;
    });
  }

  // ── Customer response ─────────────────────────────────────────────────────
  if (order.customerResponse) {
    ensureSpace(50);
    y += 4;
    sectionTitle("Your Response");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...TEXT);
    doc.text(`Reported: ${order.customerResponse.replace(/_/g, " ")}`, left, y);
    y += 15;

    if (order.customerResponseNote) {
      const noteLines = doc.splitTextToSize(order.customerResponseNote, right - left);
      doc.setTextColor(...MUTED);
      doc.text(noteLines, left, y);
      y += noteLines.length * 12;
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const generatedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.setDrawColor(...LINE);
  doc.line(left, pageHeight - 52, right, pageHeight - 52);
  doc.text(
    `${options.siteName} - invoice ${order.orderNumber} - generated ${generatedAt}`,
    left,
    pageHeight - 36
  );

  const fileName = `${safeFilePart(options.siteName)}-invoice-${safeFilePart(order.orderNumber)}.pdf`;
  doc.save(fileName);
}
