import React from "react";
import OverviewClient from "./OverviewClient";
import { getAllOrders } from "@/lib/api/orders";
import { getProducts } from "@/lib/api/products";
import { getUsers } from "@/lib/api/user";
import { getTransactions } from "@/lib/api/transactions";
import { getCategories } from "@/lib/api/categories";
import { aggregateAdminDashboard } from "@/lib/dashboard-helpers";

export const dynamic = "force-dynamic";

async function getAdminDashboardData() {
  try {
    const [ordersRes, productsRes, usersRes, transRes, catRes] = await Promise.allSettled([
      getAllOrders({ limit: 1000 }),
      getProducts({ limit: 1000 }),
      getUsers("limit=1000"),
      getTransactions({ limit: 1000 }),
      getCategories(),
    ]);

    const orders =
      ordersRes.status === "fulfilled"
        ? Array.isArray(ordersRes.value?.data?.orders)
          ? ordersRes.value.data.orders
          : Array.isArray(ordersRes.value?.data)
          ? ordersRes.value.data
          : Array.isArray(ordersRes.value)
          ? ordersRes.value
          : []
        : [];

    const products =
      productsRes.status === "fulfilled"
        ? Array.isArray(productsRes.value?.data?.products)
          ? productsRes.value.data.products
          : Array.isArray(productsRes.value?.products)
          ? productsRes.value.products
          : Array.isArray(productsRes.value?.data)
          ? productsRes.value.data
          : []
        : [];

    const users =
      usersRes.status === "fulfilled"
        ? Array.isArray(usersRes.value?.data?.users)
          ? usersRes.value.data.users
          : Array.isArray(usersRes.value?.data)
          ? usersRes.value.data
          : []
        : [];

    const transactions =
      transRes.status === "fulfilled"
        ? Array.isArray(transRes.value?.data?.transactions)
          ? transRes.value.data.transactions
          : Array.isArray(transRes.value?.data)
          ? transRes.value.data
          : []
        : [];

    const categories =
      catRes.status === "fulfilled"
        ? Array.isArray(catRes.value?.data)
          ? catRes.value.data
          : Array.isArray(catRes.value)
          ? catRes.value
          : []
        : [];

    return aggregateAdminDashboard(orders, products, users, transactions, categories);
  } catch (error) {
    console.error("Failed to fetch admin dashboard real-time data:", error);
    return aggregateAdminDashboard([], [], [], [], []);
  }
}

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();

  return (
    <OverviewClient
      stats={data.stats}
      revenueData={data.revenueData}
      categoryData={data.categoryData}
      orderStatusData={data.orderStatusData}
      paymentMethodData={data.paymentMethodData}
      topProducts={data.topProducts}
      recentOrders={data.recentOrders}
      kpis={data.kpis}
      dailyProfitData={data.dailyProfitData}
      weeklyProfitData={data.weeklyProfitData}
      monthlyProfitData={data.monthlyProfitData}
      yearlyProfitData={data.yearlyProfitData}
    />
  );
}