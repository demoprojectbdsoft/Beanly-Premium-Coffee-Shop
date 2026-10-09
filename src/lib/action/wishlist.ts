"use server";

import { serverFetch, serverMutation } from "../core/server";
import { getUserSession } from "../core/session";

export const addToWishlist = async (productId: string) => {
  const user = await getUserSession();
  if (!user?.id) return null;
  return serverMutation("/wishlist", { userId: user.id, productId });
};

export const removeFromWishlist = async (productId: string) => {
  const user = await getUserSession();
  if (!user?.id) return null;
  return serverMutation(`/wishlist/${productId}`, { userId: user.id }, "DELETE");
};

export const isWishlisted = async (productId: string) => {
  const user = await getUserSession();
  if (!user?.id) return { isWishlisted: false };
  const res = await serverFetch(`/wishlist/is-wishlisted?userId=${user.id}&productId=${productId}`, true);
  return res?.data || { isWishlisted: false };
};
