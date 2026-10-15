"use server";

import { redirect } from "next/navigation";
import { getToken } from "./session";

const Api: string = process.env.NEXT_PUBLIC_API_URL as string;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

const handleResponse = async (res: Response) => {
  if (res.status === 401) redirect("/auth/login");
  if (res.status === 403) redirect("/forbidden");

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed with status ${res.status}`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }

  return null;
};

export const serverFetch = async (path: string, requireAuth: boolean = false) => {
  const headers: HeadersInit = {};

  try {
    if (requireAuth) {
      const token = await getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const res = await fetch(`${Api}${path}`, {
      cache: "no-store",
      headers,
    });

    if (res.status === 401 || res.status === 403) {
      return null;
    }

    return await handleResponse(res);
  } catch (err) {
    console.error("serverFetch error for path", path, ":", (err as Error).message);
    return null;
  }
};

export const serverMutation = async (
  path: string,
  data: unknown = "",
  method: HttpMethod = "POST"
) => {
  const token = await getToken();
  if (!token) redirect("/auth/login");

  try {
    const res = await fetch(`${Api}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    return await handleResponse(res);
  } catch (err) {
    console.error("fetch failed:", (err as Error).message);
    return { success: false, message: (err as Error).message };
  }
};