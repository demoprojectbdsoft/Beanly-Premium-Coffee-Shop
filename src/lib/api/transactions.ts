import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";

export const getTransactions = async (params?: Record<string, any>) => {
  return serverFetch(withQuery("/transactions", params), true);
};

/* The ledger endpoint answers with 10 rows unless a limit is asked for, so the
 * customer's own history is requested in full (1000 is the API's ceiling). */
export const getTransactionsByUserId = async (userId: string) => {
  return serverFetch(withQuery("/transactions", { userId, limit: 1000 }), true);
};

export const getTransactionsByOrderId = async (orderId: string) => {
  return serverFetch(withQuery("/transactions", { orderId }), true);
};
