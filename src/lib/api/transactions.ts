import { serverFetch } from "../core/server";

export const getTransactions = async (params?: Record<string, any>) => {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") query.set(key, String(val));
    });
  }
  const qs = query.toString();
  return serverFetch(`/transactions${qs ? `?${qs}` : ""}`, true);
};

export const getTransactionsByUserId = async (userId: string) => {
  return serverFetch(`/transactions?userId=${userId}`, true);
};

export const getTransactionsByOrderId = async (orderId: string) => {
  return serverFetch(`/transactions?orderId=${orderId}`, true);
};
