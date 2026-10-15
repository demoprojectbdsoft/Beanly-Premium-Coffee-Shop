import React from "react";
import CustomerOrdersClient from "./CustomerOrdersClient";
import { CustomerOrder, CustomerOrderItem } from "@/types/customerDashboard";
import { getUserSession } from "@/lib/core/session";
import { getOrdersByUserId } from "@/lib/api/orders";

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
  if (!dateValue) return "";
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

      orders = rawOrders.map((order: any): CustomerOrder => {
        const items: CustomerOrderItem[] = (order.items || []).map(
          (item: any, idx: number) => {
            const prod =
              typeof item.productId === "object" && item.productId !== null
                ? item.productId
                : null;

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

            return {
              id: item._id || `${order._id}-${idx}`,
              name: item.title || prod?.title || `Item #${idx + 1}`,
              slug,
              image,
              price: item.price ?? prod?.price ?? 0,
              quantity: item.quantity ?? 1,
            };
          }
        );

        const orderIdStr: string = order._id?.toString() || order.id || "";
        const shortId = orderIdStr.slice(-6).toUpperCase();

        const shippingAddr = order.shippingAddress
          ? `${order.shippingAddress.address}, ${order.shippingAddress.city} - ${order.shippingAddress.postalCode}`
          : "N/A";

        const status = mapOrderStatus(order.orderStatus || "processing");

        return {
          id: orderIdStr,
          orderNumber: `#ORD-${shortId}`,
          date: order.createdAt
            ? new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "",
          status,
          rawStatus: order.orderStatus,
          customerResponse: order.customerResponse || null,
          customerResponseNote: order.customerResponseNote || "",
          customerResponseAt: order.customerResponseAt || null,
          paymentStatus: "Paid",
          paymentMethod: mapPaymentMethod(order.paymentMethod),
          total: order.totalAmount ?? 0,
          itemCount: items.length,
          items,
          shippingAddress: shippingAddr,
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
