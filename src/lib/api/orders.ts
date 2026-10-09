import { serverFetch } from "../core/server";

export const getAllOrders = async (params?: Record<string, any>) => {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") query.set(key, String(val));
    });
  }
  const qs = query.toString();
  return serverFetch(`/orders${qs ? `?${qs}` : ""}`, true);
};

export const getOrdersByUserId = async (userId: string) => {
  return serverFetch(`/orders?userId=${userId}`, true);
};

export const getOrderById = async (id: string) => {
  return serverFetch(`/orders/${id}`, true);
};

