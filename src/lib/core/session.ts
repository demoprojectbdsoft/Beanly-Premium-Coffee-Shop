"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "../auth";

type Role = "admin" | "customer" | "user";

export const getUserSession = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user ?? null;
};

export const getToken = async (): Promise<string | null> => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.session?.token ?? null;
};

export const getRequiredRole = async (role: Role) => {
  const user = await getUserSession();

  if (!user) {
    redirect("/auth/login");
  }

  if (user.role !== role) {
    redirect("/forbidden");
  }

  return user;
};