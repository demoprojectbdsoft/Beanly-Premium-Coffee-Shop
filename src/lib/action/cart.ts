"use server";

import { serverMutation, serverFetch } from "../core/server";
import { getUserSession } from "../core/session";

export const addToCart = async (productId: string, quantity = 1) => {
  const user = await getUserSession();
  if (!user?.id) return { success: false, message: "Please log in to add items to your cart" };
  return serverMutation("/cart", { userId: user.id, productId, quantity });
};

export const updateCartItem = async (productId: string, quantity: number) => {
  const user = await getUserSession();
  if (!user?.id) return null;
  return serverMutation(`/cart/${productId}`, { userId: user.id, quantity }, "PATCH");
};

export const removeFromCart = async (productId: string) => {
  const user = await getUserSession();
  if (!user?.id) return null;
  return serverMutation(`/cart/${productId}`, { userId: user.id }, "DELETE");
};

export const clearCart = async () => {
  const user = await getUserSession();
  if (!user?.id) return null;
  return serverMutation("/cart", { userId: user.id }, "DELETE");
};

export const isCarted = async (productId: string) => {
  const user = await getUserSession();
  if (!user?.id) return { isCarted: false, isInCart: false };
  const res = await serverFetch(`/cart/is-carted?userId=${user.id}&productId=${productId}`, true);
  return res?.data || { isCarted: false, isInCart: false };
};

export const isInCart = isCarted;

