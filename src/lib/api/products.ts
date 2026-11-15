import { serverFetch } from "../core/server";
import { withQuery } from "../core/query";

/**
 * The catalogue has two shapes.
 *
 * A shop page sees the public row: the price a buyer pays and nothing about what
 * the store paid. A desk asks for the admin shape, which also carries cost,
 * margin, the stored prices and the rows a shopper cannot reach. The admin calls
 * send the caller's token, because the API answers that shape to an admin only.
 */
interface ProductReadOptions {
  admin?: boolean;
}

// Filter/sort/pagination params are forwarded as-is; empty values are dropped.
export const getProducts = async (
  params?: Record<string, string | number | boolean | undefined>,
  options?: ProductReadOptions
): Promise<any> => {
  const query = options?.admin ? { ...params, mode: "admin" } : params;
  return serverFetch(withQuery("/products", query), Boolean(options?.admin));
};

export const getProductBySlug = async (
  slug: string,
  options?: ProductReadOptions
): Promise<any> => {
  return serverFetch(
    withQuery(`/products/${slug}`, options?.admin ? { mode: "admin" } : undefined),
    Boolean(options?.admin)
  );
};
