import React from "react";
import CustomerOrdersClient from "./CustomerOrdersClient";
import { CustomerOrder, CustomerOrderItem, CustomerWarranty } from "@/types/customerDashboard";
import { getUserSession } from "@/lib/core/session";
import { getOrdersByUserId } from "@/lib/api/orders";
import { getMyWarranties } from "@/lib/api/warranty";
import { formatOrderDate, formatOrderMoment } from "@/lib/dateTime";
import { isProductOutOfStock } from "@/lib/stock";

// ── Helpers ──────────────────────────────────────────────────────────────────

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Map a backend orderStatus string to the CustomerOrder status union */
function mapOrderStatus(status: string): CustomerOrder["status"] {
  const s = (status || "").toLowerCase();
  if (s === "confirmed") return "Confirmed";
  if (s === "shipped") return "Shipped";
  if (s === "delivered") return "Delivered";
  if (s === "cancelled") return "Cancelled";
  return "Processing";
}

/** Map backend paymentMethod to a human-readable label */
function mapPaymentMethod(method: string): string {
  switch ((method || "").toLowerCase()) {
    case "bkash":  return "bKash";
    case "nagad":  return "Nagad";
    case "rocket": return "Rocket";
    case "cod":    return "Cash on Delivery";
    default:       return capitalizeFirst(method || "Unknown");
  }
}

/** Format timestamp for timeline step */
function formatTimelineDate(dateValue?: string | Date): string {
  return formatOrderMoment(dateValue);
}

/** Build a CustomerWarranty record from a raw server warranty document. */
function normalizeCustomerWarranty(w: any): CustomerWarranty {
  const productId =
    w?.productId?._id?.toString?.() ||
    w?.productId?.id?.toString?.() ||
    w?.productId?.toString?.() ||
    "";
  const orderId =
    w?.orderId?._id?.toString?.() ||
    w?.orderId?.id?.toString?.() ||
    w?.orderId?.toString?.() ||
    "";

  return {
    id: w._id?.toString?.() || w.id?.toString?.() || "",
    productId,
    orderId,
    activationDate: w.activationDate,
    expiryDate: w.expiryDate,
    status: w.status,
    // Why it is closed, when it is: date, rejected or void.
    closedReason: w.closedReason,
    // The terms copied onto the record at delivery.
    warrantyType: w.warrantyType,
    warrantyPeriodMonths: w.warrantyPeriodMonths,
    warrantyTerms: w.warrantyTerms,
    // Oldest first, so the dialog can read them like a timeline.
    extensions: Array.isArray(w.extensions) ? w.extensions : [],
    claimProblem: w.claimProblem,
    claimReason: w.claimReason,
    claimDescription: w.claimDescription,
    claimImages: Array.isArray(w.claimImages) ? w.claimImages : [],
    claimAdminNote: w.claimAdminNote,
    resolutionDetails: w.resolutionDetails,
    product: {
      id: productId,
      title: w?.productId?.title,
      slug: w?.productId?.slug,
      image: w?.productId?.image,
      price: w?.productId?.price,
      // The product's current terms win, but the copy saved on the warranty is
      // used when the product was edited or deleted.
      warrantyPeriodMonths:
        w?.productId?.warrantyPeriodMonths ?? w?.warrantyPeriodMonths,
      warrantyType: w?.productId?.warrantyType ?? w?.warrantyType,
      warrantyTerms: w?.productId?.warrantyTerms ?? w?.warrantyTerms,
    },
    order: {
      id: orderId,
      orderNumber: w?.orderId?.orderNumber,
      orderStatus: w?.orderId?.orderStatus,
    },
  };
}

/** Build complete tracking timeline for all status updates using DB timestamps */
function buildTimeline(
  status: string,
  createdAt?: string,
  updatedAt?: string
): CustomerOrder["timeline"] {
  const createdTime = formatTimelineDate(createdAt);
  const updatedTime = formatTimelineDate(updatedAt) || createdTime;
  const s = (status || "").toLowerCase();

  // Cancelled Order Timeline
  if (s === "cancelled") {
    return [
      {
        title: "Order Placed",
        date: createdTime,
        completed: true,
        description: "Your order was received and confirmed.",
      },
      {
        title: "Order Cancelled",
        date: updatedTime,
        completed: true,
        current: true,
        description: "This order was cancelled.",
      },
    ];
  }

  // Status progression flags
  const isConfirmed  = ["confirmed", "processing", "shipped", "delivered"].includes(s);
  const isProcessing = ["processing", "shipped", "delivered"].includes(s);
  const isShipped    = ["shipped", "delivered"].includes(s);
  const isDelivered  = s === "delivered";

  return [
    {
      title: "Order Placed",
      date: createdTime,
      completed: true,
      description: "Order received and payment verified.",
    },
    {
      title: "Confirmed",
      date: isConfirmed ? (isProcessing ? createdTime : updatedTime) : "",
      completed: isProcessing || isShipped || isDelivered,
      current: s === "confirmed",
      description: "Your order has been confirmed and is queued for processing.",
    },
    {
      title: "Processing",
      date: isProcessing ? (isShipped ? createdTime : updatedTime) : "",
      completed: isShipped || isDelivered,
      current: s === "processing",
      description: "Order is being packed and prepared for dispatch.",
    },
    {
      title: "Shipped",
      date: isShipped ? updatedTime : "",
      completed: isDelivered,
      current: s === "shipped",
      description: isShipped
        ? "Package is in transit with the carrier."
        : "Carrier will pick up the package once packed.",
    },
    {
      title: "Delivered",
      date: isDelivered ? updatedTime : "",
      completed: isDelivered,
      current: false,
      description: isDelivered
        ? "Package successfully delivered to your address."
        : "Package will be delivered to your doorstep.",
    },
  ];
}

// ── Page Component ────────────────────────────────────────────────────────────

export default async function CustomerOrdersPage() {
  const user = await getUserSession();
  let orders: CustomerOrder[] = [];

  if (user?.id) {
    try {
      const res = await getOrdersByUserId(user.id);
      const rawOrders: any[] = Array.isArray(res?.data?.orders)
        ? res.data.orders
        : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
        ? res
        : [];

      // Fetch every warranty belonging to this user. `/warranties/mine` scopes
      // the query by the caller's token, unlike the admin-only list endpoint.
      // Paged because the API caps `limit` at 100.
      const warrantyByOrderProduct: Record<string, CustomerWarranty> = {};
      try {
        const PAGE_SIZE = 100;
        const MAX_PAGES = 10;
        for (let page = 1; page <= MAX_PAGES; page++) {
          const wRes = await getMyWarranties({ limit: PAGE_SIZE, page });
          const rawWarranties: any[] = Array.isArray(wRes?.data?.warranties)
            ? wRes.data.warranties
            : [];
          for (const w of rawWarranties) {
            const warranty = normalizeCustomerWarranty(w);
            // Keyed by order + product: the same product bought on two orders
            // must never share a single warranty record.
            if (warranty.orderId && warranty.productId) {
              warrantyByOrderProduct[`${warranty.orderId}:${warranty.productId}`] = warranty;
            }
          }
          const totalPages = Number(wRes?.data?.pagination?.totalPages ?? 1);
          if (rawWarranties.length < PAGE_SIZE || page >= totalPages) break;
        }
      } catch (err) {
        console.error("Failed to fetch warranties:", err);
      }

      orders = rawOrders.map((order: any): CustomerOrder => {
        const orderIdStr: string = order._id?.toString() || order.id || "";

        const items: CustomerOrderItem[] = (order.items || []).map(
          (item: any, idx: number) => {
            const prod =
              typeof item.productId === "object" && item.productId !== null
                ? item.productId
                : null;

            const prodId =
              prod?._id?.toString() ||
              prod?.id?.toString() ||
              (item.productId?._id ? item.productId._id.toString() : "") ||
              (typeof item.productId === "string"
                ? item.productId
                : item.productId?.toString?.() || "");

            const image =
              item.image ||
              prod?.image ||
              (Array.isArray(prod?.additionalImages) && prod.additionalImages[0]) ||
              "";

            const slug =
              prod?.slug ||
              (item.title || prod?.title || `item-${idx}`)
                .toLowerCase()
                .replace(/\s+/g, "-");

            // A product with no stock count is not tracked, so it is always available.
            const inStock = prod ? !isProductOutOfStock(prod) : true;

            return {
              id: item._id || `${order._id}-${idx}`,
              productId: prodId,
              name: item.title || prod?.title || `Item #${idx + 1}`,
              slug,
              image,
              price: item.price ?? prod?.price ?? 0,
              quantity: item.quantity ?? 1,
              inStock,
              stockQuantity: prod?.stockQuantity,
              warranty: prodId ? warrantyByOrderProduct[`${orderIdStr}:${prodId}`] : undefined,
            };
          }
        );

        const shortId = orderIdStr.slice(-6).toUpperCase();

        const shippingAddr =
          order.shippingAddress && order.shippingAddress.address
            ? `${order.shippingAddress.address}, ${order.shippingAddress.city || ""} - ${order.shippingAddress.postalCode || ""}`
            : "Digital Delivery / N/A";

        const status = mapOrderStatus(order.orderStatus || "processing");

        return {
          id: orderIdStr,
          orderNumber: `#ORD-${shortId}`,
          date: formatOrderDate(order.createdAt),
          // Kept raw so the client can sort by the real timestamp.
          createdAt: order.createdAt,
          status,
          rawStatus: order.orderStatus,
          customerResponse: order.customerResponse || null,
          customerResponseNote: order.customerResponseNote || "",
          customerResponseAt: order.customerResponseAt || null,
          paymentStatus: "Paid",
          paymentMethod: mapPaymentMethod(order.paymentMethod),
          total: order.totalAmount ?? 0,
          pointsRedeemed: order.pointsRedeemed ?? 0,
          pointsDiscount: order.pointsDiscount ?? 0,
          couponCode: order.couponCode || "",
          couponDiscount: order.couponDiscount ?? 0,
          pointsEarned: order.pointsEarned ?? 0,
          itemCount: items.length,
          items,
          shippingAddress: shippingAddr,
          shippingMethod: order.shippingMethod,
          estimatedDelivery: order.estimatedDelivery,
          timeline: buildTimeline(
            order.orderStatus || "processing",
            order.createdAt,
            order.updatedAt
          ),
        };
      });
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    }
  }

  return <CustomerOrdersClient initialOrders={orders} />;
}
