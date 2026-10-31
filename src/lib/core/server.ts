"use server";

import { redirect } from "next/navigation";
import { getToken } from "./session";

const API_URL: string = process.env.NEXT_PUBLIC_API_URL as string;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** Reads the body as JSON when the API sent JSON, otherwise there is nothing to return. */
const readJson = async (res: Response) => {
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }

  return null;
};

/** Redirects unauthenticated / forbidden users, and surfaces API errors as throws. */
const handleResponse = async (res: Response) => {
  if (res.status === 401) redirect("/auth/login");
  if (res.status === 403) redirect("/forbidden");

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `Request failed with status ${res.status}`);
  }

  return readJson(res);
};

/** Bearer header for the current session, or an empty object when there is none. */
const authHeaders = async (): Promise<HeadersInit> => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Read-only request, used by `lib/api`.
 *
 * Never throws: a transport failure or a 401/403 resolves to null so pages can
 * render an empty state instead of crashing the render.
 */
export const serverFetch = async (path: string, requireAuth: boolean = false) => {
  try {
    const headers = requireAuth ? await authHeaders() : {};

    const res = await fetch(`${API_URL}${path}`, {
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

/**
 * Write request, used by `lib/action`. Mutations always require a session, so
 * a missing token redirects to the login page before the request is sent.
 *
 * `explainForbidden` is for the desks where a 403 is an answer rather than a
 * break-in: a plan limit or a suspended shop has a reason the seller needs to
 * read, so it comes back as a failed result instead of the forbidden page.
 */
export const serverMutation = async (
  path: string,
  data: unknown = "",
  method: HttpMethod = "POST",
  options?: { explainForbidden?: boolean }
) => {
  const token = await getToken();
  if (!token) redirect("/auth/login");

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (options?.explainForbidden && res.status === 403) {
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        message: body?.message || "This action is not allowed right now",
      };
    }

    return await handleResponse(res);
  } catch (err) {
    console.error("fetch failed:", (err as Error).message);
    return { success: false, message: (err as Error).message };
  }
};
