import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";

export const getAllOrders = async (params?: Record<string, any>) => {
  return serverFetch(withQuery("/orders", params), true);
};

/*
 * A customer's whole history, not just the first page.
 *
 * The list endpoint answers with 20 rows when no `limit` is sent, which used to
 * stop the dashboard's totals and the order screen at the twentieth order. The
 * cap is asked for explicitly; 1000 is the most the API allows.
 */
export const getOrdersByUserId = async (userId: string) => {
  return serverFetch(withQuery("/orders", { userId, limit: 1000 }), true);
};

export const getOrderById = async (id: string) => {
  return serverFetch(`/orders/${id}`, true);
};
