import { serverFetch } from "../core/server";

export const getUserById = async (userId: string) => {
  return serverFetch(`/users/${userId}`, true);
};

export const getUsers = async (query?: string) => {
  return serverFetch(`/users${query ? `?${query}` : ""}`, true);
};

/**
 * The signed-in account's approved roles and the dashboard it is currently on.
 *
 * Reads straight from the store API rather than the session cookie, because the
 * cookie can lag behind an admin approval by one request. The switcher calls
 * this every time it opens so a role added mid-session surfaces immediately.
 */
export const getMyRoles = async () => {
  return serverFetch("/users/me/roles", true);
};

/** Narrowing helper so a null read becomes an empty payload. */
export const asRoles = (
  payload: unknown
): {
  roles: string[];
  activeRole: string;
  vendorStatus?: string;
  riderStatus?: string;
} => {
  const data = (payload as { data?: any } | null)?.data;
  return {
    roles: Array.isArray(data?.roles) ? data.roles.map((r: string) => String(r).toLowerCase()) : [],
    activeRole: String(data?.activeRole || "customer").toLowerCase(),
    vendorStatus: data?.vendorStatus || "none",
    riderStatus: data?.riderStatus || "none",
  };
};
