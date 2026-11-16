import { getAllOrders } from "@/lib/api/orders";
import { getProducts } from "@/lib/api/products";
import { getUsers } from "@/lib/api/user";
import { getTransactions } from "@/lib/api/transactions";
import { getCategories } from "@/lib/api/categories";
import { getSiteSettings } from "@/lib/api/siteSettings";
import { getAdminPayouts } from "@/lib/api/deliveries";
import { getCurrencySymbol } from "@/lib/currency";
import { aggregateAdminDashboard } from "@/lib/dashboard-helpers";

/**
 * Everything the admin money pages are built from, in one place.
 *
 * The overview (counts and the latest orders) and the analytics desk (charts,
 * rankings and the report exports) read the same aggregate, so the figures on
 * the two pages can never drift apart.
 */
export async function getAdminDashboardData() {
  try {
    const [ordersRes, productsRes, usersRes, transRes, catRes, settingsRes, payoutsRes] = await Promise.allSettled([
      getAllOrders({ limit: 1000 }),
      // The overview costs every sold line, so it needs the admin shape.
      getProducts({ limit: 1000 }, { admin: true }),
      getUsers("limit=1000"),
      getTransactions({ limit: 1000 }),
      getCategories(),
      getSiteSettings(),
      // The riders' money, for the one expense the product margins cannot see.
      // `all` because the board's totals cover every order it has ever counted.
      getAdminPayouts({ range: "all", limit: 1 }),
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

    const settings = settingsRes.status === "fulfilled" ? settingsRes.value?.data : null;
    const currencySymbol = getCurrencySymbol(settings?.currency || "USD");

    /*
     * A missing ledger is read as zero rather than guessed at from the orders:
     * the fee lives on the delivery, and an order row cannot tell whether the
     * job carrying it was ever closed at a door.
     */
    const riderFeesPaid =
      payoutsRes.status === "fulfilled"
        ? Number(payoutsRes.value?.data?.totals?.paid ?? 0) || 0
        : 0;

    return aggregateAdminDashboard(
      orders,
      products,
      users,
      transactions,
      categories,
      currencySymbol,
      riderFeesPaid
    );
  } catch (error) {
    console.error("Failed to fetch admin dashboard real-time data:", error);
    return aggregateAdminDashboard([], [], [], [], [], "$");
  }
}
