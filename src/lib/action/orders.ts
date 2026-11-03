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

/**
 * What the customer says about an order. Three answers, and all three stay
 * changeable: a parcel reported missing can still turn up, and a hand-over
 * confirmed in the moment can be corrected the next day.
 *
 * "received" is the customer's own version of reading the code at the door: it
 * settles the order as delivered and books the rider's fee, so it is only
 * offered once the parcel has actually left the store.
 */
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
