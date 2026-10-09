import { serverFetch } from "../core/server";

export const getCartByUserId = async (userId: string) => {
  return serverFetch(`/cart/user/${userId}`, true);
};
