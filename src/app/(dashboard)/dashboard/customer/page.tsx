import React from "react";
import CustomerOverviewClient from "./CustomerOverviewClient";
import { getUserSession } from "@/lib/core/session";
import { getOrdersByUserId } from "@/lib/api/orders";
import { getWishlistByUserId } from "@/lib/api/wishlist";
import { getTransactionsByUserId } from "@/lib/api/transactions";
import { aggregateCustomerDashboard } from "@/lib/dashboard-helpers";
import {
  CustomerOrder,
  CustomerOrderItem,
  CustomerWishlistItem,
  CustomerTransaction,
} from "@/types/customerDashboard";

export const dynamic = "force-dynamic";

function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapOrderStatus(status: string): CustomerOrder["status"] {
  const s = (status || "").toLowerCase();
  if (s === "shipped") return "Shipped";
  if (s === "delivered" || s === "completed") return "Delivered";
  if (s === "cancelled") return "Cancelled";
  if (s === "refunded") return "Refunded";
  return "Processing";
}

function mapPaymentMethod(method: string): string {
  switch ((method || "").toLowerCase()) {
    case "bkash":
      return "bKash";
    case "nagad":
      return "Nagad";
    case "rocket":
      return "Rocket";
    case "cod":
      return "Cash on Delivery";
    default:
      return capitalizeFirst(method || "Unknown");
  }
}

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

function buildTimeline(
  status: string,
  createdAt?: string,
  updatedAt?: string
): CustomerOrder["timeline"] {
  const createdTime = formatTimelineDate(createdAt);
  const updatedTime = formatTimelineDate(updatedAt) || createdTime;
  const s = (status || "").toLowerCase();

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

  const isShipped = ["shipped", "delivered", "completed"].includes(s);
  const isDelivered = s === "delivered" || s === "completed";
  const isProcessing = ["processing", "confirmed", "shipped", "delivered", "completed"].includes(s);

  return [
    {
      title: "Order Placed",
      date: createdTime,
      completed: true,
      description: "Order received and confirmed.",
    },
    {
      title: "Processing",
      date: isProcessing ? (isShipped ? createdTime : updatedTime) : "",
      completed: isShipped || isDelivered,
      current: s === "processing" || s === "confirmed",
      description: "Order verified, packed, and prepared for dispatch.",
    },
    {
      title: "Shipped",
      date: isShipped ? updatedTime : "",
      completed: isDelivered,
      current: s === "shipped",
      description: isShipped
        ? "Package handed over to courier and in transit."
        : "Courier will pick up package once packed.",
    },
    {
      title: "Delivered",
      date: isDelivered ? updatedTime : "",
      completed: isDelivered,
      current: false,
      description: isDelivered
        ? "Package successfully delivered to your shipping address."
        : "Package will be delivered to your doorstep.",
    },
  ];
}

export default async function CustomerDashboardPage() {
  const user = await getUserSession();
  const userName = user?.name || "Customer";

  let rawOrders: any[] = [];
  let wishlistItems: CustomerWishlistItem[] = [];
  let rawTransactions: any[] = [];

  if (user?.id) {
    try {
      const [ordersRes, wishlistRes, transRes] = await Promise.allSettled([
        getOrdersByUserId(user.id),
        getWishlistByUserId(user.id),
        getTransactionsByUserId(user.id),
      ]);

      if (ordersRes.status === "fulfilled") {
        rawOrders = Array.isArray(ordersRes.value?.data?.orders)
          ? ordersRes.value.data.orders
          : Array.isArray(ordersRes.value?.data)
          ? ordersRes.value.data
          : Array.isArray(ordersRes.value)
          ? ordersRes.value
          : [];
      }

      if (wishlistRes.status === "fulfilled") {
        const rawWishlist =
          wishlistRes.value?.data?.items ||
          (Array.isArray(wishlistRes.value?.data) ? wishlistRes.value.data : []);

        wishlistItems = rawWishlist
          .filter((item: any) => item?.productId)
          .map((item: any) => {
            const p = item.productId;
            return {
              id: item._id,
              productId: p._id || p.id,
              title: p.title || "Product",
              slug: p.slug || "",
              price: p.price ?? 0,
              originalPrice: p.originalPrice,
              image: p.image || (Array.isArray(p.additionalImages) && p.additionalImages[0]) || "",
              inStock: p.inStock ?? true,
              rating: p.rating || 5,
              category: p.category?.name || p.categoryId?.name || "Electronics",
              addedAt: item.createdAt
                ? new Date(item.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "",
              ownerId: p.ownerId || p.userId,
            };
          });
      }

      if (transRes.status === "fulfilled") {
        rawTransactions = Array.isArray(transRes.value?.data?.transactions)
          ? transRes.value.data.transactions
          : Array.isArray(transRes.value?.data)
          ? transRes.value.data
          : Array.isArray(transRes.value)
          ? transRes.value
          : [];
      }
    } catch (err) {
      console.error("Failed to fetch customer data:", err);
    }
  }

  // Aggregate stats & 4+ graph data points
  const aggregated = aggregateCustomerDashboard(
    rawOrders,
    wishlistItems,
    rawTransactions,
    user
  );

  // Format real customer orders for the overview order list & tracking modal
  const customerOrders: CustomerOrder[] = rawOrders.map((order: any): CustomerOrder => {
    const items: CustomerOrderItem[] = (order.items || []).map((item: any, idx: number) => {
      const prod = typeof item.productId === "object" && item.productId !== null ? item.productId : null;
      const image =
        item.image ||
        prod?.image ||
        (Array.isArray(prod?.additionalImages) && prod.additionalImages[0]) ||
        "";
      const slug =
        prod?.slug ||
        (item.title || prod?.title || `item-${idx}`).toLowerCase().replace(/\s+/g, "-");

      return {
        id: item._id || `${order._id}-${idx}`,
        name: item.title || prod?.title || `Item #${idx + 1}`,
        slug,
        image,
        price: item.price ?? prod?.price ?? 0,
        quantity: item.quantity ?? 1,
      };
    });

    const orderIdStr: string = order._id?.toString() || order.id || "";
    const shortId = orderIdStr.slice(-6).toUpperCase();
    const shippingAddr = order.shippingAddress
      ? `${order.shippingAddress.address || ""}, ${order.shippingAddress.city || ""} - ${order.shippingAddress.postalCode || ""}`
      : "Default Shipping Address";

    return {
      id: orderIdStr,
      orderNumber: `#ORD-${shortId}`,
      date: order.createdAt
        ? new Date(order.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Recent",
      status: mapOrderStatus(order.orderStatus || "processing"),
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

  // Format real transactions
  const customerTransactions: CustomerTransaction[] = rawTransactions.map((tx: any, idx: number) => {
    const txId = tx._id?.toString() || tx.id || `tx-${idx}`;
    const orderObj = typeof tx.orderId === "object" ? tx.orderId : null;
    const orderIdStr = orderObj?._id?.toString() || tx.orderId || "";
    const orderNum = `#ORD-${(orderIdStr || txId).slice(-6).toUpperCase()}`;

    return {
      id: txId,
      orderId: orderIdStr,
      orderNumber: orderNum,
      date: tx.createdAt
        ? new Date(tx.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "Recent",
      amount: tx.amount ?? 0,
      status: tx.status === "success" ? "Completed" : tx.status === "pending" ? "Pending" : "Failed",
      paymentMethod: mapPaymentMethod(tx.method),
      cardLast4: tx.reference?.slice(-4) || "••••",
      type: "Payment",
      invoiceNumber: `INV-${new Date().getFullYear()}-${txId.slice(-4).toUpperCase()}`,
    };
  });

  return (
    <CustomerOverviewClient
      stats={aggregated.stats}
      spendingData={aggregated.spendingData}
      spendingVsSavingsData={aggregated.spendingVsSavingsData}
      categoryData={aggregated.categoryData}
      orderStatusData={aggregated.orderStatusData}
      paymentMethodData={aggregated.paymentMethodData}
      recentOrders={customerOrders}
      wishlistItems={wishlistItems}
      recentTransactions={customerTransactions}
      userName={userName}
      rewardPoints={aggregated.rewardPoints}
      membershipTier={aggregated.membershipTier}
    />
  );
}
