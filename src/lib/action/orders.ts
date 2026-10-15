"use server";

import { serverMutation, serverFetch } from "../core/server";
import { getUserSession } from "../core/session";
import { CreateOrderPayload } from "@/types";

export const createOrder = async (data: Omit<CreateOrderPayload, "userId">) => {
  const user = await getUserSession();
  if (!user?.id) return null;
  return serverMutation("/orders", { ...data, userId: user.id });
};

export const updateOrderStatus = async (id: string, orderStatus: string) => {
  return serverMutation(`/orders/${id}/status`, { orderStatus }, "PATCH");
};

export const submitCustomerOrderResponse = async (
  id: string,
  response: "received" | "not_received" | "cancelled",
  note?: string
) => {
  return serverMutation(`/orders/${id}/customer-response`, { response, note }, "PATCH");
};

export const getUserOrdersAction = async (userId: string) => {
  if (!userId) return [];
  const res = await serverFetch(`/orders?userId=${userId}`, true);
  return res?.data?.orders || res?.data || (Array.isArray(res) ? res : []);
};
